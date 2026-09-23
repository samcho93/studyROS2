/* ===================================================================
   실행 파일 등록소 + 기본 패키지
   ros2 run / ros2 launch 가 여기서 실행 파일을 찾습니다.
   (turtlesim, demo_nodes, tf2_ros, teleop, rqt 도구, rosbag2 …)
   =================================================================== */
(function () {
  'use strict';
  const M = ROS.math;

  /* ================================================== --ros-args 해석 */
  /** argv → { rest:[일반 인자], remap:{}, params:{}, name, ns, paramFiles:[] } */
  function parseRosArgs(argv) {
    const out = { rest: [], remap: {}, params: {}, name: null, ns: null, paramFiles: [], logLevel: null };
    let inRos = false;
    for (let i = 0; i < argv.length; i++) {
      const a = argv[i];
      if (a === '--ros-args') { inRos = true; continue; }
      if (a === '--') { inRos = false; continue; }
      if (!inRos) { out.rest.push(a); continue; }
      if (a === '-r' || a === '--remap') { rm(argv[++i]); continue; }
      if (a === '-p' || a === '--param') { const kv = String(argv[++i] || ''); const k = kv.indexOf(':='); if (k > 0) out.params[kv.slice(0, k)] = pval(kv.slice(k + 2)); continue; }
      if (a === '--params-file') { out.paramFiles.push(argv[++i]); continue; }
      if (a === '--log-level') { out.logLevel = argv[++i]; continue; }
      if (a.includes(':=')) rm(a);
    }
    function rm(kv) {
      kv = String(kv || ''); const k = kv.indexOf(':='); if (k < 0) return;
      const from = kv.slice(0, k), to = kv.slice(k + 2);
      if (from === '__node' || from === '__name') out.name = to;
      else if (from === '__ns') out.ns = to;
      else out.remap[from] = to;
    }
    return out;
  }
  function pval(s) {
    s = String(s).trim().replace(/^['"]|['"]$/g, '');
    if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
    if (/^[-+]?\d+$/.test(s)) return parseInt(s, 10);
    if (/^[-+]?(\d+\.\d*|\.\d+|\d+)(e[-+]?\d+)?$/i.test(s)) return parseFloat(s);
    if (/^\[.*\]$/.test(s)) { try { return ROS.parseYaml(s); } catch (_) {} }
    return s;
  }

  /** --params-file 로 준 YAML 에서 이 노드의 ros__parameters 를 꺼낸다 */
  function fileParams(files, name, ns) {
    const out = {};
    (files || []).forEach(f => {
      const V = window.Term && Term.VFS; if (!V) return;
      const path = V.norm(f, Term.active ? Term.active.cwd : Term.WS);
      const txt = V.read(path); if (txt == null) return;
      let y; try { y = ROS.parseYaml(txt); } catch (_) { return; }
      const fq = ((ns && ns !== '/' ? ns : '') + '/' + name).replace(/\/+/g, '/');
      ['/**', '**', name, '/' + name, fq, fq.slice(1)].forEach(k => { const b = y && y[k]; if (b && b.ros__parameters) Object.assign(out, b.ros__parameters); });
    });
    return out;
  }
  ROS.fileParams = fileParams;

  /* ================================================== 프로세스 */
  let pidSeq = 1000;
  /** 실행 파일 하나 실행 → proc { pid, nodes, stop(), done } */
  function run(pkg, exe, argv, io) {
    io = io || {};
    const P = ROS.pkgs[pkg];
    if (!P) throw new Error(`Package '${pkg}' not found`);
    const fn = P.exes && P.exes[exe];
    if (!fn) throw new Error(`No executable found`);
    const args = parseRosArgs(argv || []);
    const wins = [];
    let finish;
    const proc = { pid: ++pidSeq, pkg, exe, nodes: [], done: new Promise(r => { finish = r; }), stopped: false };
    const ctx = {
      argv: args.rest, args, pkg, exe, proc,
      out: io.out || (l => console.log(l)), err: io.err || io.out || (l => console.warn(l)),
      openView(name, viewOpts, winOpts) { const w = RosUI.openView(name, Object.assign({}, winOpts || {}, { viewOpts, onClose: () => { if (winOpts && winOpts.closeStops !== false && !proc.stopped) proc.stop(); } })); if (w) wins.push(w); return w; },
      node(defName, extra) { const nm = args.name || defName; const n = ROS.createNode(nm, Object.assign({ namespace: args.ns || '/', remap: args.remap, params: Object.assign(fileParams(args.paramFiles, nm, args.ns), args.params), out: ctx.out, pkg, exe }, extra || {})); proc.nodes.push(n); return n; },
      exit(code) { proc.stop(code); },
      keys: null // 터미널이 키 입력을 넘겨 줄 함수 (teleop 용)
    };
    let r;
    try { r = fn(ctx) || {}; } catch (e) { proc.nodes.forEach(n => n.destroy()); throw e; }
    (r.nodes || []).forEach(n => { if (!proc.nodes.includes(n)) proc.nodes.push(n); });
    proc.keys = r.keys || null;
    proc.stop = (code) => {
      if (proc.stopped) return; proc.stopped = true;
      try { r.stop && r.stop(); } catch (e) { console.error(e); }
      proc.nodes.forEach(n => n.destroy());
      wins.forEach(w => w.close());
      finish(code || 0);
    };
    if (r.oneshot) setTimeout(() => proc.stop(0), 0);
    return proc;
  }
  /** 여러 실행 파일 묶음 (런치) */
  function runMany(ctx, list) {
    const procs = [];
    list.forEach(([pkg, exe, argv, label]) => {
      try {
        const p = run(pkg, exe, argv || [], { out: l => ctx.out(`[${label || exe}-${procs.length + 1}] ${l}`) });
        ctx.out(`[INFO] [${label || exe}-${procs.length + 1}]: process started with pid [${p.pid}]`);
        procs.push(p);
      } catch (e) { ctx.out(`[ERROR] [launch]: ${pkg}/${exe}: ${e.message}`); }
    });
    return {
      nodes: procs.flatMap(p => p.nodes), procs,
      keys: (procs.find(p => p.keys) || {}).keys,
      stop() { procs.forEach((p, i) => { p.stop(); }); ctx.out('[INFO] [launch]: 모든 프로세스를 종료했습니다'); }
    };
  }
  function launch(pkg, file, largs, io) {
    const P = ROS.pkgs[pkg];
    if (!P) throw new Error(`Package '${pkg}' not found`);
    const fn = P.launch && P.launch[file];
    if (!fn) throw new Error(`file '${file}' was not found in the share directory of package '${pkg}'`);
    let finish;
    const proc = { pid: ++pidSeq, pkg, exe: file, nodes: [], done: new Promise(r => { finish = r; }), stopped: false };
    const ctx = { largs: largs || {}, out: io.out || console.log, err: io.err || io.out || console.warn, pkg, proc };
    ctx.out(`[INFO] [launch]: All log files can be found below /home/user/.ros/log/${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}`);
    ctx.out(`[INFO] [launch]: Default logging verbosity is set to INFO`);
    const r = fn(ctx) || {};
    proc.nodes = r.nodes || [];
    proc.keys = r.keys || null;
    proc.stop = () => { if (proc.stopped) return; proc.stopped = true; try { r.stop && r.stop(); } catch (e) { console.error(e); } proc.nodes.forEach(n => n.destroy()); finish(0); };
    return proc;
  }
  ROS.parseRosArgs = parseRosArgs;
  ROS.run = run; ROS.runMany = runMany; ROS.launch = launch;

  /* ================================================== demo_nodes */
  function talker(style) {
    return ctx => {
      const n = ctx.node('talker');
      const pub = n.createPublisher('std_msgs/msg/String', 'chatter', 10);
      let i = style === 'py' ? 0 : 1;
      n.createTimer(1.0, () => {
        const data = 'Hello World: ' + i++;
        n.info(style === 'py' ? `Publishing: "${data}"` : `Publishing: '${data}'`);
        pub.publish({ data });
      });
      return { nodes: [n] };
    };
  }
  function listener() {
    return ctx => {
      const n = ctx.node('listener');
      n.createSubscription('std_msgs/msg/String', 'chatter', m => n.info(`I heard: [${m.data}]`), 10);
      return { nodes: [n] };
    };
  }
  function addServer(ctx) {
    const n = ctx.node('add_two_ints_server');
    n.createService('example_interfaces/srv/AddTwoInts', 'add_two_ints', (req, res) => { n.info(`Incoming request\na: ${req.a} b: ${req.b}`); res.sum = req.a + req.b; return res; });
    return { nodes: [n] };
  }
  function addClient(ctx) {
    const n = ctx.node('add_two_ints_client');
    const cli = n.createClient('example_interfaces/srv/AddTwoInts', 'add_two_ints');
    const a = +(ctx.argv[0] || 2), b = +(ctx.argv[1] || 3);
    (async () => {
      while (!(await cli.waitForService(1))) { if (!n.alive) return; n.info('service not available, waiting again...'); }
      const r = await cli.call({ a, b });
      n.info(`Result of add_two_ints: for ${a} + ${b} = ${r.sum}`);
      setTimeout(() => ctx.exit(0), 50);
    })();
    return { nodes: [n] };
  }
  const demo = style => ({
    desc: style === 'py' ? 'rclpy 데모 노드 (talker/listener/서비스)' : 'rclcpp 데모 노드 (talker/listener/서비스)',
    exes: { talker: talker(style), listener: listener(), add_two_ints_server: addServer, add_two_ints_client: addClient }
  });
  ROS.registerPkg('demo_nodes_py', demo('py'));
  ROS.registerPkg('demo_nodes_cpp', demo('cpp'));

  ROS.registerPkg('examples_rclpy_minimal_publisher', {
    desc: '공식 튜토리얼: 최소 퍼블리셔',
    exes: {
      publisher_member_function(ctx) {
        const n = ctx.node('minimal_publisher'); const pub = n.createPublisher('std_msgs/msg/String', 'topic', 10); let i = 0;
        n.createTimer(0.5, () => { const data = 'Hello World: ' + i++; pub.publish({ data }); n.info(`Publishing: "${data}"`); });
        return { nodes: [n] };
      }
    }
  });
  ROS.registerPkg('examples_rclpy_minimal_subscriber', {
    desc: '공식 튜토리얼: 최소 서브스크라이버',
    exes: { subscriber_member_function(ctx) { const n = ctx.node('minimal_subscriber'); n.createSubscription('std_msgs/msg/String', 'topic', m => n.info(`I heard: "${m.data}"`), 10); return { nodes: [n] }; } }
  });

  /* ---------------------------------------------- action_tutorials */
  ROS.registerPkg('action_tutorials_py', {
    desc: '액션 튜토리얼: 피보나치 수열',
    exes: {
      fibonacci_action_server(ctx) {
        const n = ctx.node('fibonacci_action_server');
        n.createActionServer('action_tutorials_interfaces/action/Fibonacci', 'fibonacci', {
          async execute(gh) {
            n.info('Executing goal...');
            const seq = [0, 1];
            for (let i = 1; i < gh.request.order; i++) {
              if (gh.isCancelRequested) { n.info('Goal canceled'); gh.canceled({ sequence: seq }); return; }
              seq.push(seq[i] + seq[i - 1]);
              n.info(`Feedback: [${seq.join(', ')}]`);
              gh.publishFeedback({ partial_sequence: seq.slice() });
              await ROS.sleep(1000);
              if (!n.alive) return;
            }
            return { sequence: seq };
          }
        });
        return { nodes: [n] };
      },
      fibonacci_action_client(ctx) {
        const n = ctx.node('fibonacci_action_client');
        const ac = n.createActionClient('action_tutorials_interfaces/action/Fibonacci', 'fibonacci');
        (async () => {
          if (!(await ac.waitForServer(3))) { n.error('Action server not available'); ctx.exit(1); return; }
          const g = await ac.sendGoal({ order: +(ctx.argv[0] || 10) }, { feedback: fb => n.info(`Received feedback: [${fb.partial_sequence.join(', ')}]`) });
          if (!g.accepted) { n.info('Goal rejected :('); ctx.exit(1); return; }
          n.info('Goal accepted :)');
          const r = await g.result;
          n.info(`Result: [${r.result.sequence.join(', ')}]`);
          setTimeout(() => ctx.exit(0), 50);
        })();
        return { nodes: [n] };
      }
    }
  });

  /* ================================================== turtlesim */
  const TS = { W: 11.088889, SCALE: 500 / 11.088889 };
  const TURTLE_COLORS = ['#3a9d23', '#d4a017', '#c0392b', '#8e44ad', '#16a085', '#2c7be5', '#e67e22', '#7f8c8d'];
  /** turtlesim 노드 한 개 = 시뮬레이터 상태. 여러 화면(view)이 같은 sim 을 그릴 수 있다. */
  function createTurtlesim(ctx, opts) {
    opts = opts || {};
    const n = opts.node || ROS.createNode(opts.name || 'turtlesim', { owner: opts.owner, out: opts.out, remap: opts.remap, params: opts.params, namespace: opts.ns, pkg: 'turtlesim', exe: 'turtlesim_node' });
    const bg = { r: n.declareParameter('background_r', 69, { description: 'Red channel of the background color', type: 'integer', range: [0, 255] }), g: n.declareParameter('background_g', 86, { description: 'Green channel of the background color', type: 'integer' }), b: n.declareParameter('background_b', 255, { description: 'Blue channel of the background color', type: 'integer' }) };
    n.declareParameter('holonomic', false, { description: 'If true, then turtles will be holonomic' });
    const pen = document.createElement('canvas'); pen.width = 500; pen.height = 500;
    const pctx = pen.getContext('2d'); pctx.lineCap = 'round';
    const sim = { node: n, turtles: new Map(), pen, bg, frame: 0, seq: 0 };
    n.onSetParameters(list => { for (const p of list) { if (/^background_[rgb]$/.test(p.name)) { const v = +p.value; if (!Number.isInteger(v) || v < 0 || v > 255) return { successful: false, reason: 'Parameter {' + p.name + '} doesn\'t comply with integer range.' }; } } return { successful: true }; });
    ROS.on('param', (node, name, value) => { if (node === n && /^background_[rgb]$/.test(name)) sim.bg = { r: n.getParameter('background_r'), g: n.getParameter('background_g'), b: n.getParameter('background_b') }; });
    function clearPen() { pctx.clearRect(0, 0, 500, 500); sim.bg = { r: n.getParameter('background_r'), g: n.getParameter('background_g'), b: n.getParameter('background_b') }; }
    clearPen();
    function spawn(name, x, y, th) {
      if (sim.turtles.has(name)) return null;
      const t = { name, x, y, th, lin: 0, ang: 0, lastCmd: 0, pen: { r: 179, g: 184, b: 255, w: 3, off: false }, color: TURTLE_COLORS[sim.seq++ % TURTLE_COLORS.length], rot: null, rotV: 0, cleanup: [] };
      const ns = name;
      const cmd = n.createSubscription('geometry_msgs/msg/Twist', ns + '/cmd_vel', m => { t.lin = m.linear.x; t.linY = m.linear.y; t.ang = m.angular.z; t.lastCmd = performance.now(); if (t.rot) { t.rot.cancelled = 'cmd'; } }, 1);
      t.posePub = n.createPublisher('turtlesim/msg/Pose', ns + '/pose', 1);
      t.colPub = n.createPublisher('turtlesim/msg/Color', ns + '/color_sensor', 1);
      const s1 = n.createService('turtlesim/srv/SetPen', ns + '/set_pen', req => { t.pen = { r: req.r, g: req.g, b: req.b, w: req.width, off: !!req.off }; return {}; });
      const s2 = n.createService('turtlesim/srv/TeleportAbsolute', ns + '/teleport_absolute', req => { move(t, req.x, req.y, req.theta, true); t.lin = t.ang = 0; return {}; });
      const s3 = n.createService('turtlesim/srv/TeleportRelative', ns + '/teleport_relative', req => { const th = M.normAngle(t.th + req.angular); move(t, t.x + Math.cos(th) * req.linear, t.y + Math.sin(th) * req.linear, th, true); return {}; });
      const as = n.createActionServer('turtlesim/action/RotateAbsolute', ns + '/rotate_absolute', {
        goal: () => { if (t.rot) { n.warn('Rotation goal received before a previous goal finished. Aborting previous goal'); t.rot.cancelled = 'abort'; } return true; },
        async execute(gh) {
          const start = t.th; const rot = t.rot = { target: gh.request.theta, cancelled: null };
          while (n.alive && sim.turtles.get(name) === t) {
            const rem = M.normAngle(rot.target - t.th);
            if (rot.cancelled === 'abort' || rot.cancelled === 'cmd') { if (t.rot === rot) t.rot = null; t.rotV = 0; gh.abort({ delta: M.normAngle(t.th - start) }); return; }
            if (gh.isCancelRequested) { t.rot = null; t.rotV = 0; n.info('Rotation goal canceled'); gh.canceled({ delta: M.normAngle(t.th - start) }); return; }
            if ((rot.k = (rot.k || 0) + 1) % 6 === 1) gh.publishFeedback({ remaining: rem });
            if (Math.abs(rem) < 0.02) { t.th = rot.target; t.rot = null; t.rotV = 0; n.info('Rotation goal completed successfully'); return { delta: M.normAngle(t.th - start) }; }
            t.rotV = rem > 0 ? 1 : -1;
            await ROS.sleep(16);
          }
          gh.abort({});
        }
      });
      t.cleanup = [cmd, t.posePub, t.colPub, s1, s2, s3, as];
      sim.turtles.set(name, t);
      n.info(`Spawning turtle [${name}] at x=[${x.toFixed(6)}], y=[${y.toFixed(6)}], theta=[${th.toFixed(6)}]`);
      return t;
    }
    function kill(name) { const t = sim.turtles.get(name); if (!t) return false; t.cleanup.forEach(c => c.destroy()); sim.turtles.delete(name); return true; }
    function toPx(x, y) { return [x * TS.SCALE, 500 - y * TS.SCALE]; }
    function move(t, nx, ny, nth, teleport) {
      let clamped = false;
      const cx = Math.max(0, Math.min(TS.W, nx)), cy = Math.max(0, Math.min(TS.W, ny));
      if (cx !== nx || cy !== ny) clamped = true;
      if (!t.pen.off && (!teleport || true)) {
        const [x1, y1] = toPx(t.x, t.y), [x2, y2] = toPx(cx, cy);
        if (x1 !== x2 || y1 !== y2) { pctx.strokeStyle = `rgb(${t.pen.r},${t.pen.g},${t.pen.b})`; pctx.lineWidth = t.pen.w; pctx.beginPath(); pctx.moveTo(x1, y1); pctx.lineTo(x2, y2); pctx.stroke(); }
      }
      if (clamped && !t._wallWarnAt || (clamped && performance.now() - t._wallWarnAt > 1000)) { if (clamped) { t._wallWarnAt = performance.now(); n.warn(`Oh no! I hit the wall! (Clamping from [x=${nx.toFixed(6)}, y=${ny.toFixed(6)}])`); } }
      t.x = cx; t.y = cy; t.th = M.normAngle(nth);
    }
    // 서비스
    n.createService('std_srvs/srv/Empty', 'clear', () => { n.info('Clearing turtlesim.'); clearPen(); return {}; });
    n.createService('std_srvs/srv/Empty', 'reset', () => { n.info('Resetting turtlesim.'); [...sim.turtles.keys()].forEach(kill); sim.seq = 0; clearPen(); spawn('turtle1', TS.W / 2, TS.W / 2, 0); return {}; });
    n.createService('turtlesim/srv/Spawn', 'spawn', req => {
      let name = req.name || '';
      if (!name) { let k = 1; while (sim.turtles.has('turtle' + k)) k++; name = 'turtle' + k; }
      if (sim.turtles.has(name)) { n.error(`A turtle named [${name}] already exists`); throw new Error(`A turtle named [${name}] already exists`); }
      spawn(name, req.x, req.y, req.theta);
      return { name };
    });
    n.createService('turtlesim/srv/Kill', 'kill', req => { if (!kill(req.name)) { n.error(`Tried to kill turtle [${req.name}], which does not exist`); throw new Error(`Tried to kill turtle [${req.name}], which does not exist`); } return {}; });
    n.info('Starting turtlesim with node name ' + n.fqn);
    spawn('turtle1', TS.W / 2, TS.W / 2, 0);
    // 물리 갱신 (62.5 Hz)
    const DT = 0.016;
    n.createTimer(DT, () => {
      sim.frame++;
      const now = performance.now();
      const holo = !!n.getParameter('holonomic');
      sim.turtles.forEach(t => {
        if (now - t.lastCmd > 1000) { t.lin = 0; t.ang = 0; t.linY = 0; }
        let ang = t.ang;
        if (t.rot) ang = t.rotV * 1.0;
        const th = M.normAngle(t.th + ang * DT);
        const vy = holo ? (t.linY || 0) : 0;
        const nx = t.x + (Math.cos(t.th) * t.lin - Math.sin(t.th) * vy) * DT, ny = t.y + (Math.sin(t.th) * t.lin + Math.cos(t.th) * vy) * DT;
        move(t, nx, ny, th);
        t.posePub.publish({ x: t.x, y: t.y, theta: t.th, linear_velocity: t.lin, angular_velocity: ang });
        if (sim.frame % 4 === 0) { const [px, py] = toPx(t.x, t.y); const d = pctx.getImageData(Math.max(0, Math.min(499, px)), Math.max(0, Math.min(499, py)), 1, 1).data; t.colPub.publish(d[3] ? { r: d[0], g: d[1], b: d[2] } : { r: sim.bg.r, g: sim.bg.g, b: sim.bg.b }); }
      });
    });
    sim.spawn = spawn; sim.kill = kill; sim.toPx = toPx; sim.clearPen = clearPen;
    n.turtlesim = sim;
    return sim;
  }
  ROS.createTurtlesim = createTurtlesim;
  ROS.TS = TS;
  /** 페이지에 있는 turtlesim (없으면 null) */
  ROS.findTurtlesim = () => { const n = ROS.nodes().find(x => x.turtlesim); return n ? n.turtlesim : null; };

  /* ---------------------------------------------- turtle_teleop_key */
  const TELEOP_HELP = `Reading from keyboard
---------------------------
Use arrow keys to move the turtle.
Use G|B|V|C|D|E|R|T keys to rotate to absolute orientations. 'F' to cancel a rotation.
'Q' to quit.`;
  function teleopKey(ctx) {
    const n = ctx.node('teleop_turtle');
    const pub = n.createPublisher('geometry_msgs/msg/Twist', 'turtle1/cmd_vel', 1);
    const ac = n.createActionClient('turtlesim/action/RotateAbsolute', 'turtle1/rotate_absolute');
    let goal = null;
    ctx.out(TELEOP_HELP);
    const ROT = { g: 0, t: 0.7854, r: 1.5708, e: 2.3562, d: 3.1416, c: -2.3562, v: -1.5708, b: -0.7854 };
    const keys = (key) => {
      const k = key.toLowerCase();
      const L = 2.0, A = 2.0;
      if (key === 'ArrowUp') pub.publish({ linear: { x: L, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
      else if (key === 'ArrowDown') pub.publish({ linear: { x: -L, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
      else if (key === 'ArrowLeft') pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: A } });
      else if (key === 'ArrowRight') pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: -A } });
      else if (k in ROT) { ac.sendGoal({ theta: ROT[k] }, {}).then(g => { goal = g; g.result.then(r => { if (r.status === ROS.STATUS.SUCCEEDED) n.info(`Rotation goal completed successfully`); }); }).catch(e => n.error(e.message)); }
      else if (k === 'f') { if (goal) goal.cancel().then(() => n.info('Rotation goal canceled')); }
      else if (k === 'q') { ctx.exit(0); }
      else return false;
      return true;
    };
    return { nodes: [n], keys };
  }
  function drawSquare(ctx) {
    const n = ctx.node('draw_square');
    const pub = n.createPublisher('geometry_msgs/msg/Twist', 'turtle1/cmd_vel', 1);
    let pose = null, state = 'reset', goal = null, side = 0;
    n.createSubscription('turtlesim/msg/Pose', 'turtle1/pose', m => { pose = m; }, 1);
    const reset = n.createClient('std_srvs/srv/Empty', 'reset');
    reset.waitForService(2).then(ok => { if (ok) reset.call({}).then(() => { state = 'forward'; }); });
    n.createTimer(0.016, () => {
      if (!pose || state === 'reset') return;
      if (!goal) goal = { x: pose.x + Math.cos(pose.theta) * 2, y: pose.y + Math.sin(pose.theta) * 2, th: M.normAngle(pose.theta + Math.PI / 2) };
      if (state === 'forward') {
        const d = Math.hypot(goal.x - pose.x, goal.y - pose.y);
        if (d < 0.05) { state = 'turn'; pub.publish({ linear: { x: 0 }, angular: { z: 0 } }); return; }
        pub.publish({ linear: { x: Math.min(1.0, d * 2), y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
      } else {
        const e = M.normAngle(goal.th - pose.theta);
        if (Math.abs(e) < 0.01) { state = 'forward'; goal = null; side++; return; }
        pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: Math.sign(e) * Math.min(1.5, Math.abs(e) * 3) } });
      }
    });
    return { nodes: [n] };
  }
  function mimic(ctx) {
    const n = ctx.node('mimic');
    const pub = n.createPublisher('geometry_msgs/msg/Twist', 'output/cmd_vel', 1);
    n.createSubscription('turtlesim/msg/Pose', 'input/pose', p => pub.publish({ linear: { x: p.linear_velocity, y: 0, z: 0 }, angular: { x: 0, y: 0, z: p.angular_velocity } }), 1);
    return { nodes: [n] };
  }
  ROS.registerPkg('turtlesim', {
    desc: '거북이 시뮬레이터 (ROS 입문 표준 예제)',
    exes: {
      turtlesim_node(ctx) {
        const sim = createTurtlesim(ctx, { name: ctx.args.name || 'turtlesim', out: ctx.out, remap: ctx.args.remap, params: ctx.args.params, ns: ctx.args.ns });
        ctx.proc.nodes.push(sim.node);
        ctx.openView('turtlesim', { sim: sim.node.fqn }, { title: 'TurtleSim' });
        return { nodes: [sim.node] };
      },
      turtle_teleop_key: teleopKey,
      draw_square: drawSquare,
      mimic
    },
    launch: {
      'multisim.launch.py'(ctx) {
        return ROS.runMany(ctx, [['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__ns:=/turtlesim1']], ['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__ns:=/turtlesim2']]]);
      }
    }
  });

  /* ================================================== teleop_twist_keyboard */
  const TTK_HELP = `
This node takes keypresses from the keyboard and publishes them
as Twist/TwistStamped messages. It works best with a US keyboard layout.
---------------------------
Moving around:
   u    i    o
   j    k    l
   m    ,    .

For Holonomic mode (strafing), hold down the shift key:
---------------------------
   U    I    O
   J    K    L
   M    <    >

t : up (+z)
b : down (-z)

anything else : stop

q/z : increase/decrease max speeds by 10%
w/x : increase/decrease only linear speed by 10%
e/c : increase/decrease only angular speed by 10%

CTRL-C to quit
`;
  ROS.registerPkg('teleop_twist_keyboard', {
    desc: '키보드로 /cmd_vel 발행',
    exes: {
      teleop_twist_keyboard(ctx) {
        const n = ctx.node('teleop_twist_keyboard');
        const pub = n.createPublisher('geometry_msgs/msg/Twist', 'cmd_vel', 10);
        let speed = 0.5, turn = 1.0;
        ctx.out(TTK_HELP); ctx.out(`currently:\tspeed ${speed}\tturn ${turn} `);
        const MOVE = { i: [1, 0, 0, 0], o: [1, 0, 0, -1], j: [0, 0, 0, 1], l: [0, 0, 0, -1], u: [1, 0, 0, 1], ',': [-1, 0, 0, 0], '.': [-1, 0, 0, 1], m: [-1, 0, 0, -1], O: [1, -1, 0, 0], I: [1, 0, 0, 0], J: [0, 1, 0, 0], L: [0, -1, 0, 0], U: [1, 1, 0, 0], '<': [-1, 0, 0, 0], '>': [-1, -1, 0, 0], M: [-1, 1, 0, 0], t: [0, 0, 1, 0], b: [0, 0, -1, 0] };
        const SP = { q: [1.1, 1.1], z: [0.9, 0.9], w: [1.1, 1], x: [0.9, 1], e: [1, 1.1], c: [1, 0.9] };
        const keys = key => {
          const map = { ArrowUp: 'i', ArrowDown: ',', ArrowLeft: 'j', ArrowRight: 'l' };
          const k = map[key] || key;
          if (MOVE[k]) { const [x, y, z, th] = MOVE[k]; pub.publish({ linear: { x: x * speed, y: y * speed, z: z * speed }, angular: { x: 0, y: 0, z: th * turn } }); }
          else if (SP[k]) { speed = +(speed * SP[k][0]).toFixed(3); turn = +(turn * SP[k][1]).toFixed(3); ctx.out(`currently:\tspeed ${speed}\tturn ${turn} `); }
          else if (k.length === 1) pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } });
          else return false;
          return true;
        };
        return { nodes: [n], keys };
      }
    }
  });

  /* ================================================== tf2_ros */
  function tfMsg(parent, child, t, q) { return { header: { stamp: ROS.graph.now(), frame_id: parent }, child_frame_id: child, transform: { translation: t, rotation: q } }; }
  ROS.tfMsg = tfMsg;
  ROS.registerPkg('tf2_ros', {
    desc: 'TF2 도구: static_transform_publisher, tf2_echo, tf2_monitor',
    exes: {
      static_transform_publisher(ctx) {
        const a = ctx.argv; const o = { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0, qx: null, qy: null, qz: null, qw: null, 'frame-id': null, 'child-frame-id': null };
        const pos = [];
        for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[++i]; } else pos.push(a[i]); }
        if (pos.length === 8 || pos.length === 9) {
          ctx.out('[WARN] [static_transform_publisher]: Old-style arguments are deprecated; see --help for new-style arguments');
          [o.x, o.y, o.z] = pos; if (pos.length === 8) { [o.yaw, o.pitch, o.roll] = pos.slice(3, 6); o['frame-id'] = pos[6]; o['child-frame-id'] = pos[7]; } else { [o.qx, o.qy, o.qz, o.qw] = pos.slice(3, 7); o['frame-id'] = pos[7]; o['child-frame-id'] = pos[8]; }
        }
        if (!o['frame-id'] || !o['child-frame-id']) { ctx.err('usage: static_transform_publisher [--x X] [--y Y] [--z Z] [--qx QX --qy QY --qz QZ --qw QW] [--roll ROLL] [--pitch PITCH] [--yaw YAW] --frame-id FRAME_ID --child-frame-id CHILD_FRAME_ID'); return { oneshot: true }; }
        const q = o.qx != null ? { x: +o.qx, y: +o.qy, z: +o.qz, w: +o.qw } : M.rpyToQ(+o.roll, +o.pitch, +o.yaw);
        const n = ctx.node('static_transform_publisher_' + Math.random().toString(36).slice(2, 10));
        const pub = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static');
        pub.publish({ transforms: [tfMsg(o['frame-id'], o['child-frame-id'], { x: +o.x, y: +o.y, z: +o.z }, q)] });
        ctx.out(`[INFO] [${n.name}]: Spinning until stopped - publishing transform\ntranslation: ('${(+o.x).toFixed(6)}', '${(+o.y).toFixed(6)}', '${(+o.z).toFixed(6)}')\nrotation: ('${q.x.toFixed(6)}', '${q.y.toFixed(6)}', '${q.z.toFixed(6)}', '${q.w.toFixed(6)}')\nfrom '${o['frame-id']}' to '${o['child-frame-id']}'`);
        return { nodes: [n] };
      },
      tf2_echo(ctx) {
        const [target, source] = ctx.argv;
        if (!target || !source) { ctx.err('Usage: tf2_echo source_frame target_frame [echo_rate]'); return { oneshot: true }; }
        const n = ctx.node('tf2_echo');
        const rate = +(ctx.argv[2] || 1);
        let warned = 0;
        const echo = () => {
          try {
            const T = ROS.graph.tf.lookup(target, source);
            const rpy = M.qToRpy(T.q);
            const f = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);
            ctx.out(`At time ${ROS.graph.stampStr()}\n- Translation: [${f(T.t.x)}, ${f(T.t.y)}, ${f(T.t.z)}]\n- Rotation: in Quaternion [${f(T.q.x)}, ${f(T.q.y)}, ${f(T.q.z)}, ${f(T.q.w)}]\n- Rotation: in RPY (radian) [${rpy.map(f).join(', ')}]\n- Rotation: in RPY (degree) [${rpy.map(r => f(M.deg(r))).join(', ')}]`);
          } catch (e) { if (warned++ < 3 || warned % 5 === 0) ctx.out(`[INFO] [tf2_echo]: Waiting for transform ${target} ->  ${source}: Invalid frame ID "${target}" passed to canTransform argument target_frame - frame does not exist`); }
        };
        n.createTimer(1 / Math.max(0.1, rate), echo);
        return { nodes: [n] };
      },
      tf2_monitor(ctx) {
        const n = ctx.node('tf2_monitor');
        n.createTimer(1.0, () => {
          const fr = ROS.graph.tf.frames;
          const lines = ['RESULTS: for all Frames', '', 'Frames:'];
          Object.entries(fr).forEach(([c, v]) => lines.push(`Frame: ${c}, published by <${v.auth}> ${v.static ? '(static)' : ''}, parent: ${v.parent}`));
          ctx.out(lines.join('\n'));
        });
        return { nodes: [n] };
      }
    }
  });
  ROS.registerPkg('tf2_tools', {
    desc: 'TF 트리를 그림으로 (view_frames)',
    exes: {
      view_frames(ctx) {
        ctx.out('[INFO] [view_frames]: Listening to tf data for 5.0 seconds...');
        setTimeout(() => {
          const stamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '_');
          ctx.out(`[INFO] [view_frames]: Generating graph in frames.pdf file...\n[INFO] [view_frames]: Result:tf2_msgs.srv.FrameGraph_Response(frame_yaml="...")\n→ frames_${stamp}.pdf 대신 창으로 보여 줍니다.`);
          ctx.openView('tftree_view', {}, { title: 'view_frames — TF 트리', closeStops: false });
          ctx.exit(0);
        }, 1200);
        return {};
      }
    }
  });

  /* ================================================== rqt / rviz 도구 (화면은 js/w/*.js 가 등록) */
  const guiExe = (view, title, nodeName, vopts) => ctx => {
    const n = ctx.node(nodeName, { hidden: false });
    ctx.openView(view, Object.assign({ argv: ctx.argv }, vopts || {}), { title });
    return { nodes: [n] };
  };
  ROS.registerPkg('rqt_graph', { desc: '노드 · 토픽 연결 그래프', exes: { rqt_graph: guiExe('graph', 'rqt_graph — Node Graph', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });
  ROS.registerPkg('rqt_plot', { desc: '숫자 토픽 실시간 그래프', exes: { rqt_plot: ctx => { const n = ctx.node('rqt_gui_py_node_' + Math.floor(Math.random() * 9999)); ctx.openView('plot', { topic: ctx.argv.join(',') }, { title: 'rqt_plot' }); return { nodes: [n] }; } } });
  ROS.registerPkg('rqt_console', { desc: '/rosout 로그 보기', exes: { rqt_console: guiExe('console', 'rqt_console', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });
  ROS.registerPkg('rqt_topic', { desc: '토픽 모니터', exes: { rqt_topic: guiExe('topics', 'rqt_topic — Topic Monitor', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });
  ROS.registerPkg('rqt_reconfigure', { desc: '파라미터 바꾸기', exes: { rqt_reconfigure: guiExe('params', 'rqt_reconfigure', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });
  ROS.registerPkg('rqt_service_caller', { desc: '서비스 호출 GUI', exes: { rqt_service_caller: guiExe('srvcaller', 'rqt_service_caller', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });
  ROS.registerPkg('rqt', { desc: 'rqt 플러그인 모음', exes: { rqt: guiExe('rqt', 'rqt', 'rqt_gui_py_node_' + Math.floor(Math.random() * 9999)) } });

  /* ================================================== turtle_tf2 데모 (TF 튜토리얼) */
  function tfBroadcaster(ctx, turtle) {
    const n = ctx.node(`${turtle}_tf2_broadcaster`);
    const tb = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    n.createSubscription('turtlesim/msg/Pose', `/${turtle}/pose`, p => tb.publish({ transforms: [tfMsg('world', turtle, { x: p.x, y: p.y, z: 0 }, M.yawToQ(p.theta))] }), 1);
    return n;
  }
  ROS.registerPkg('turtle_tf2_py', {
    desc: 'TF2 튜토리얼: 거북이가 거북이를 따라가기',
    exes: {
      turtle_tf2_broadcaster(ctx) { return { nodes: [tfBroadcaster(ctx, ctx.args.params.turtlename || 'turtle1')] }; },
      turtle_tf2_listener(ctx) {
        const n = ctx.node('listener');
        const target = n.declareParameter('target_frame', 'turtle1');
        const pub = n.createPublisher('geometry_msgs/msg/Twist', 'turtle2/cmd_vel', 1);
        const spawner = n.createClient('turtlesim/srv/Spawn', 'spawn');
        let spawned = false;
        spawner.waitForService(2).then(ok => ok && spawner.call({ x: 4, y: 2, theta: 0, name: 'turtle2' }).then(r => { spawned = true; n.info(`Successfully spawned ${r.name}`); }).catch(() => { spawned = true; }));
        n.createTimer(0.1, () => {
          if (!spawned) return;
          let T; try { T = ROS.graph.tf.lookup('turtle2', n.getParameter('target_frame')); } catch (e) { n.info(`Could not transform turtle2 to ${n.getParameter('target_frame')}: ${e.message}`); return; }
          const scaleRot = 1.0, scaleFwd = 0.5;
          pub.publish({ linear: { x: scaleFwd * Math.hypot(T.t.x, T.t.y), y: 0, z: 0 }, angular: { x: 0, y: 0, z: scaleRot * Math.atan2(T.t.y, T.t.x) } });
        });
        return { nodes: [n] };
      },
      fixed_frame_tf2_broadcaster(ctx) {
        const n = ctx.node('fixed_frame_tf2_broadcaster');
        const tb = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
        n.createTimer(0.1, () => tb.publish({ transforms: [tfMsg('turtle1', 'carrot1', { x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: 0, w: 1 })] }));
        return { nodes: [n] };
      },
      dynamic_frame_tf2_broadcaster(ctx) {
        const n = ctx.node('dynamic_frame_tf2_broadcaster');
        const tb = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
        n.createTimer(0.1, () => { const x = ROS.graph.nowSec() * Math.PI; tb.publish({ transforms: [tfMsg('turtle1', 'carrot1', { x: 10 * Math.sin(x / 10) * 0 + 2 * Math.sin(x / 5), y: 2 * Math.cos(x / 5), z: 0 }, { x: 0, y: 0, z: 0, w: 1 })] }); });
        return { nodes: [n] };
      }
    },
    launch: {
      'turtle_tf2_demo.launch.py'(ctx) {
        const r = ROS.runMany(ctx, [
          ['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__node:=sim']],
          ['turtle_tf2_py', 'turtle_tf2_broadcaster', ['--ros-args', '-r', '__node:=broadcaster1', '-p', 'turtlename:=turtle1']],
          ['turtle_tf2_py', 'turtle_tf2_broadcaster', ['--ros-args', '-r', '__node:=broadcaster2', '-p', 'turtlename:=turtle2']],
          ['turtle_tf2_py', 'turtle_tf2_listener', ['--ros-args', '-p', 'target_frame:=' + (ctx.largs.target_frame || 'turtle1')]]
        ]);
        return r;
      },
      'turtle_tf2_fixed_frame_demo.launch.py'(ctx) {
        return ROS.runMany(ctx, [
          ['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__node:=sim']],
          ['turtle_tf2_py', 'turtle_tf2_broadcaster', ['--ros-args', '-r', '__node:=broadcaster1', '-p', 'turtlename:=turtle1']],
          ['turtle_tf2_py', 'turtle_tf2_broadcaster', ['--ros-args', '-r', '__node:=broadcaster2', '-p', 'turtlename:=turtle2']],
          ['turtle_tf2_py', 'turtle_tf2_listener', ['--ros-args', '-p', 'target_frame:=carrot1']],
          ['turtle_tf2_py', 'fixed_frame_tf2_broadcaster', []]
        ]);
      }
    }
  });

  /* ================================================== rosbag2 (메모리 녹화) */
  const bags = {};
  ROS.bag = {
    bags,
    /** topics: 배열 또는 'all' */
    record(topics, name, io) {
      name = name || 'rosbag2_' + new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '_');
      const n = ROS.createNode('rosbag2_recorder', { out: io && io.out });
      const bag = { name, topics: {}, msgs: [], start: ROS.graph.nowSec(), end: null, recording: true };
      const subs = {};
      const want = t => topics === 'all' || (Array.isArray(topics) && topics.includes(t));
      const attach = () => ROS.topicList().forEach(t => {
        if (subs[t.name] || !want(t.name) || !t.type || t.name === '/rosout' && topics === 'all' && false) return;
        if (t.name === '/parameter_events' && topics === 'all') return;
        subs[t.name] = n.createSubscription(t.type, t.name, m => { bag.msgs.push({ t: ROS.graph.nowSec(), topic: t.name, msg: m }); }, { depth: 100 });
        bag.topics[t.name] = t.type;
        if (io && io.out) io.out(`[INFO] [${Math.floor(ROS.graph.nowSec())}] [rosbag2_recorder]: Subscribed to topic '${t.name}'`);
      });
      attach();
      const off = ROS.on('graph', attach);
      bag.stop = () => { if (!bag.recording) return bag; bag.recording = false; bag.end = ROS.graph.nowSec(); off(); n.destroy(); bags[name] = bag; return bag; };
      bags[name] = bag;
      if (io && io.out) io.out(`[INFO] [rosbag2_recorder]: Press SPACE for pausing/resuming\n[INFO] [rosbag2_storage]: Opened database '${name}/${name}_0.mcap' for READ_WRITE.\n[INFO] [rosbag2_recorder]: Listening for topics...\n[INFO] [rosbag2_recorder]: Recording...`);
      return bag;
    },
    info(name) {
      const b = bags[name]; if (!b) return null;
      const end = b.end || ROS.graph.nowSec(), dur = end - b.start;
      const counts = {}; b.msgs.forEach(m => counts[m.topic] = (counts[m.topic] || 0) + 1);
      const d = s => new Date(s * 1000).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      const size = JSON.stringify(b.msgs).length;
      return `Files:             ${name}_0.mcap\nBag size:          ${(size / 1024).toFixed(1)} KiB\nStorage id:        mcap\nDuration:          ${dur.toFixed(9)}s\nStart:             ${d(b.start)} (${b.start.toFixed(9)})\nEnd:               ${d(end)} (${end.toFixed(9)})\nMessages:          ${b.msgs.length}\nTopic information: ` +
        Object.entries(b.topics).map(([t, ty], i) => `${i ? '                   ' : ''}Topic: ${t} | Type: ${ty} | Count: ${counts[t] || 0} | Serialization Format: cdr`).join('\n');
    },
    play(name, opts, io) {
      opts = opts || {};
      const b = bags[name]; if (!b) throw new Error(`bag '${name}' 을 찾을 수 없습니다`);
      const n = ROS.createNode('rosbag2_player', { out: io && io.out });
      const pubs = {};
      Object.entries(b.topics).forEach(([t, ty]) => { if (!opts.topics || opts.topics.includes(t)) pubs[t] = n.createPublisher(ty, (opts.remap && opts.remap[t]) || t, 10); });
      const rate = +opts.rate || 1;
      let stopped = false, timers = [];
      const t0 = b.msgs.length ? b.msgs[0].t : 0;
      const go = () => {
        timers = b.msgs.map(m => setTimeout(() => { if (!stopped && pubs[m.topic]) pubs[m.topic].publish(m.msg); }, (m.t - t0) * 1000 / rate));
        const last = b.msgs.length ? (b.msgs[b.msgs.length - 1].t - t0) * 1000 / rate : 0;
        timers.push(setTimeout(() => { if (stopped) return; if (opts.loop) go(); else { h.stop(); if (io && io.done) io.done(); } }, last + 50));
      };
      const h = { stop() { stopped = true; timers.forEach(clearTimeout); n.destroy(); }, node: n };
      if (io && io.out) io.out(`[INFO] [rosbag2_player]: Set rate to ${rate}\n[INFO] [rosbag2_player]: Adding keyboard callbacks.\n[INFO] [rosbag2_player]: Press SPACE for Pause/Resume\n[INFO] [rosbag2_player]: Playback until timestamp: -1`);
      go();
      return h;
    },
    list() { return Object.keys(bags); }
  };
})();
