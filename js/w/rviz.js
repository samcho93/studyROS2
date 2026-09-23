/* ===================================================================
   RViz2-lite — 캔버스 2D 로 그리는 간단한 3D 뷰어 (직교 투영 · 궤도 카메라)
   Displays: Grid, TF, LaserScan, Map, Costmap, Path, Odometry, Marker(Array), RobotModel, Pose
   Tools: Interact, 2D Pose Estimate(/initialpose), 2D Goal Pose(/goal_pose → Nav2)
   위젯: rviz   보기: rviz   패키지: rviz2 (ros2 run rviz2 rviz2)
   =================================================================== */
(function () {
  'use strict';
  if (!window.ROS || !window.RosUI) return;
  const M = ROS.math;
  const IF = window.ROS_IFACES || (window.ROS_IFACES = {});
  if (!IF['visualization_msgs/msg/MarkerArray']) IF['visualization_msgs/msg/MarkerArray'] = 'Marker[] markers';
  const quiet = () => {};
  const esc = RosUI.esc;

  /* ================================================== 수학 */
  function Tm(T) {
    const { x, y, z, w } = T.q;
    return { R: [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)], t: [T.t.x, T.t.y, T.t.z] };
  }
  const ap = (m, x, y, z) => { const R = m.R; return [R[0] * x + R[1] * y + R[2] * z + m.t[0], R[3] * x + R[4] * y + R[5] * z + m.t[1], R[6] * x + R[7] * y + R[8] * z + m.t[2]]; };
  const rv = (m, x, y, z) => { const R = m.R; return [R[0] * x + R[1] * y + R[2] * z, R[3] * x + R[4] * y + R[5] * z, R[6] * x + R[7] * y + R[8] * z]; };
  const poseT = p => ({ t: { x: +p.position.x || 0, y: +p.position.y || 0, z: +p.position.z || 0 }, q: normQ(p.orientation) });
  function normQ(q) { q = q || {}; let x = +q.x || 0, y = +q.y || 0, z = +q.z || 0, w = q.w == null ? 1 : +q.w; const n = Math.hypot(x, y, z, w) || 1; if (Math.hypot(x, y, z, w) < 1e-9) { x = y = z = 0; w = 1; } return { x: x / n, y: y / n, z: z / n, w: w / n }; }
  function rgbaStr(c, a, k) { k = k == null ? 1 : k; return `rgba(${Math.round(M.clamp(c[0] * k, 0, 1) * 255)},${Math.round(M.clamp(c[1] * k, 0, 1) * 255)},${Math.round(M.clamp(c[2] * k, 0, 1) * 255)},${a == null ? (c[3] == null ? 1 : c[3]) : a})`; }

  /* ================================================== URDF (보이는 모양만) */
  function parseUrdf(xml) {
    const doc = new DOMParser().parseFromString(String(xml), 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('URDF XML 을 읽을 수 없습니다');
    const robot = doc.documentElement;
    const nums = (s, n, d) => { const a = String(s == null ? '' : s).trim().split(/\s+/).map(Number).filter(v => !Number.isNaN(v)); while (a.length < n) a.push(d); return a; };
    const mats = {};
    Array.from(robot.children).filter(e => e.tagName === 'material').forEach(m => { const c = m.getElementsByTagName('color')[0]; if (c) mats[m.getAttribute('name')] = nums(c.getAttribute('rgba'), 4, 1); });
    const vis = [], links = [];
    Array.from(robot.children).filter(e => e.tagName === 'link').forEach(l => {
      const name = l.getAttribute('name'); links.push(name);
      Array.from(l.children).filter(e => e.tagName === 'visual').forEach(v => {
        const o = Array.from(v.children).find(e => e.tagName === 'origin');
        const xyz = nums(o && o.getAttribute('xyz'), 3, 0), rpy = nums(o && o.getAttribute('rpy'), 3, 0);
        const g = Array.from(v.children).find(e => e.tagName === 'geometry');
        const ge = g && Array.from(g.children)[0]; if (!ge) return;
        const mat = Array.from(v.children).find(e => e.tagName === 'material');
        let col = null;
        if (mat) { const c = mat.getElementsByTagName('color')[0]; col = c ? nums(c.getAttribute('rgba'), 4, 1) : mats[mat.getAttribute('name')] || null; }
        const geom = { type: ge.tagName };
        if (ge.tagName === 'box') geom.size = nums(ge.getAttribute('size'), 3, 0.1);
        else if (ge.tagName === 'cylinder') { geom.r = +ge.getAttribute('radius') || 0.05; geom.len = +ge.getAttribute('length') || 0.1; }
        else if (ge.tagName === 'sphere') geom.r = +ge.getAttribute('radius') || 0.05;
        else if (ge.tagName === 'mesh') geom.file = ge.getAttribute('filename');
        vis.push({ link: name, T: { t: { x: xyz[0], y: xyz[1], z: xyz[2] }, q: M.rpyToQ(rpy[0], rpy[1], rpy[2]) }, geom, color: col || [0.75, 0.75, 0.78, 1] });
      });
    });
    return { vis, links, name: robot.getAttribute('name') || '' };
  }

  /* ================================================== 보기 */
  const DISPLAYS = [
    { k: 'grid', name: 'Grid', icon: '▦' },
    { k: 'tf', name: 'TF', icon: '⟂' },
    { k: 'robot', name: 'RobotModel', icon: '🤖' },
    { k: 'map', name: 'Map', icon: '🗺', type: 'nav_msgs/msg/OccupancyGrid', topic: '/map', qos: { depth: 1, durability: 'transient_local' } },
    { k: 'costmap', name: 'Map (costmap)', icon: '🟪', type: 'nav_msgs/msg/OccupancyGrid', topic: '/global_costmap/costmap', qos: { depth: 1, durability: 'transient_local' } },
    { k: 'scan', name: 'LaserScan', icon: '✺', type: 'sensor_msgs/msg/LaserScan', topic: '/scan', qos: 'sensor_data' },
    { k: 'path', name: 'Path', icon: '〰', type: 'nav_msgs/msg/Path', topic: '/plan', qos: 10 },
    { k: 'odom', name: 'Odometry', icon: '➶', type: 'nav_msgs/msg/Odometry', topic: '/odom', qos: 10 },
    { k: 'pose', name: 'Pose', icon: '➤', type: 'geometry_msgs/msg/PoseStamped', topic: '/goal_pose', qos: 10 },
    { k: 'markers', name: 'Marker', icon: '◆', type: 'visualization_msgs/msg/Marker', topic: '/visualization_marker', qos: 100 }
  ];
  const DEFAULT_ON = ['grid', 'tf', 'robot', 'map', 'scan', 'path', 'odom', 'pose', 'markers'];
  const ALIAS = { markers: 'markers', marker: 'markers', robotmodel: 'robot', robot: 'robot', laser: 'scan', scan: 'scan', laserscan: 'scan', odometry: 'odom', odom: 'odom', map: 'map', costmap: 'costmap', path: 'path', plan: 'path', tf: 'tf', grid: 'grid', pose: 'pose', goal: 'pose' };

  function rvizView(el, o) {
    o = o || {};
    const inWin = !!o.inWindow, slide = !!(el.closest && el.closest('.slide'));
    const H = +o.h || (slide ? 330 : 420);
    const owned = [];
    let teleop = null, teleTopic = null;
    const W = ROS.webbot;

    /* ---------- 함께 띄우기 (with=bot|slam|nav|turtle) */
    const withs = String(o.with || '').toLowerCase();
    let camHint = null;
    if (/bot|slam|nav/.test(withs) && W) {
      if (!W.findSim()) { const S = W.createSim({ owner: el, world: o.world }); owned.push(S.node); if (!ROS.findNode('/robot_state_publisher')) owned.push(W.createRsp({ owner: el })); }
      if (/slam/.test(withs) && !W.findSlam()) owned.push(W.createSlam({ owner: el }).node);
      if (/nav/.test(withs)) {
        const S = W.findSim();
        if (!W.findSlam() && !W.findMapSrv()) { const sv = W.MAPS.map && W.MAPS.map.world === S.worldName ? W.MAPS.map : null; owned.push(W.createMapServer({ owner: el, grid: sv ? sv.grid : W.rasterize(S.world), label: sv ? '💾 map.yaml' : '미리 만든 지도', auto: !sv, world: S.worldName }).node); }
        if (!W.findSlam() && !W.findAmcl()) owned.push(W.createAmcl({ owner: el }).node);
        if (!W.findNav()) owned.push(...W.createNav({ owner: el }).nodes);
      }
      teleTopic = '/cmd_vel';
      const b = W.findSim().world.bounds; camHint = { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, span: Math.max(b[2] - b[0], b[3] - b[1]) + 1 };
    } else if (/turtle/.test(withs) && ROS.createTurtlesim) {
      if (!ROS.findTurtlesim()) owned.push(ROS.createTurtlesim(null, { owner: el, out: quiet }).node);
      if (!ROS.findNode('/turtle1_tf2_broadcaster')) {
        const bn = ROS.createNode('turtle1_tf2_broadcaster', { owner: el, out: quiet, pkg: 'turtle_tf2_py', exe: 'turtle_tf2_broadcaster' });
        const tb = bn.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
        bn.createSubscription('turtlesim/msg/Pose', '/turtle1/pose', p => tb.publish({ transforms: [{ header: { stamp: ROS.graph.now(), frame_id: 'world' }, child_frame_id: 'turtle1', transform: { translation: { x: p.x, y: p.y, z: 0 }, rotation: M.yawToQ(p.theta) } }] }), 1);
        bn.onDestroy = () => { const f = ROS.graph.tf.frames; if (f.turtle1 && f.turtle1.auth === bn.fqn) delete f.turtle1; };
        owned.push(bn);
      }
      teleTopic = '/turtle1/cmd_vel';
      camHint = { x: 5.5, y: 5.5, span: 12 };
    }
    if (!camHint && W && W.findSim()) { const b = W.findSim().world.bounds; camHint = { x: (b[0] + b[2]) / 2, y: (b[1] + b[3]) / 2, span: Math.max(b[2] - b[0], b[3] - b[1]) + 1 }; }
    else if (!camHint && ROS.findTurtlesim && ROS.findTurtlesim() && o.fixed === 'world') camHint = { x: 5.5, y: 5.5, span: 12 };
    const reqFixed = o.fixed || (/turtle/.test(withs) ? 'world' : /bot/.test(withs) && !/slam|nav/.test(withs) ? 'odom' : 'map');

    /* ---------- 상태 */
    const on = {};
    if (o.show) { String(o.show).split(/[,\s|]+/).forEach(s => { const k = ALIAS[s.toLowerCase()]; if (k) on[k] = true; }); on.grid = true; }
    else DEFAULT_ON.forEach(k => { on[k] = true; });
    const topic = {}; DISPLAYS.forEach(d => { if (d.topic) topic[d.k] = d.topic; });
    if (o.scan) topic.scan = o.scan;
    const data = { scan: null, map: null, costmap: null, path: null, odom: [], pose: null, markers: new Map() };
    const rx = {}; // 받은 시각 · 개수
    let fixedUser = null, fixed = reqFixed, fixedOk = false;
    const cam = { yaw: -2.35, pitch: 0.85, scale: 0, f: [0, 0, 0], mode: String(o.view || '3d').toLowerCase() === '2d' ? '2d' : '3d' };
    if (camHint) { cam.f = [camHint.x, camHint.y, 0]; }
    let tool = 'interact', drag = null, nav = { text: '', cls: '' };
    let robot = { src: null, model: null, err: '' };

    const node = ROS.createNode(ROS.findNode('/rviz2') ? 'rviz2_' + Math.floor(Math.random() * 9000 + 1000) : 'rviz2', { owner: el, out: quiet, pkg: 'rviz2', exe: 'rviz2' });
    const pubInit = node.createPublisher('geometry_msgs/msg/PoseWithCovarianceStamped', '/initialpose', 10);
    const pubGoal = node.createPublisher('geometry_msgs/msg/PoseStamped', '/goal_pose', 10);
    const subs = {};

    el.innerHTML = `<div class="wr-root${inWin ? ' wr-win' : ''}">
      <div class="wr-top">
        <div class="w-seg wr-tools">
          <button type="button" data-tool="interact" title="끌기: 회전 · 오른쪽/Shift 끌기: 이동 · 휠: 확대">🖐 Interact</button>
          <button type="button" data-tool="pose" title="바닥을 누르고 끌어 방향 → /initialpose">📍 2D Pose Estimate</button>
          <button type="button" data-tool="goal" title="바닥을 누르고 끌어 방향 → /goal_pose (Nav2)">🎯 2D Goal Pose</button>
        </div>
        <div class="w-seg wr-cam"><button type="button" data-cam="3d" title="궤도 카메라 (Orbit)">3D</button><button type="button" data-cam="2d" title="위에서 내려다보기 (TopDownOrtho)">2D</button></div>
        <button type="button" class="btn tiny ghost" data-act="home" title="시점 초기화 (더블클릭)">⟲ 시점</button>
        <button type="button" class="btn tiny" data-act="side">☰ Displays</button>
        <span class="wr-sp"></span>
        ${inWin ? '' : RosUI.popoutBtn('rviz', Object.assign({}, o, { with: '' }))}
      </div>
      <div class="wr-main">
        <div class="wr-side">
          <div class="wr-sec">Global Options</div>
          <label class="wr-ff">Fixed Frame <select class="wr-fixed"></select></label>
          <div class="wr-sec">Displays</div>
          <div class="wr-list"></div>
        </div>
        <div class="wr-view" tabindex="0" style="${inWin ? '' : `height:${H}px`}"><canvas class="wr-cv"></canvas></div>
      </div>
      <div class="wr-status"></div>
    </div>`;
    const root = el.querySelector('.wr-root'), view = el.querySelector('.wr-view'), cv = el.querySelector('.wr-cv');
    const listEl = el.querySelector('.wr-list'), fixedSel = el.querySelector('.wr-fixed'), statusEl = el.querySelector('.wr-status');
    if (teleTopic && W && W.teleopPad) teleop = W.teleopPad(view, { owner: el, topic: teleTopic, name: 'teleop_pad', v: teleTopic === '/cmd_vel' ? 0.3 : 2.0, w: teleTopic === '/cmd_vel' ? 1.2 : 2.0, onUse: () => view.focus({ preventScroll: true }) });

    /* ---------- 구독 */
    function subscribe(k) {
      if (subs[k]) { subs[k].destroy(); delete subs[k]; }
      data[k] = k === 'odom' ? [] : k === 'markers' ? new Map() : null;
      rx[k] = { n: 0, t: 0 };
      if (!on[k] && k !== 'markers') return;
      const d = DISPLAYS.find(x => x.k === k); if (!d || !d.type) return;
      const tp = topic[k];
      if (k === 'markers') {
        if (subs.markersArr) { subs.markersArr.destroy(); delete subs.markersArr; }
        if (!on[k]) return;
        const add = m => {
          m = ROS.make('visualization_msgs/msg/Marker', m);
          const key = (m.ns || '') + '/' + m.id;
          if (m.action === 3) data.markers.clear();
          else if (m.action === 2) data.markers.delete(key);
          else data.markers.set(key, m);
        };
        subs[k] = node.createSubscription(d.type, tp, m => { add(m); rx[k].n++; rx[k].t = performance.now(); }, d.qos);
        subs.markersArr = node.createSubscription('visualization_msgs/msg/MarkerArray', tp + '_array', m => { (m.markers || []).forEach(add); rx[k].n++; rx[k].t = performance.now(); }, d.qos);
        return;
      }
      subs[k] = node.createSubscription(d.type, tp, (m, info) => {
        m = ROS.make(d.type, m);
        rx[k].n++; rx[k].t = performance.now(); if (info && info.latched) rx[k].latched = true;
        if (k === 'map' || k === 'costmap') { m._ver = (data[k] && data[k]._ver || 0) + 1; data[k] = m; }
        else if (k === 'odom') {
          const p = m.pose.pose, arr = data.odom, last = arr[arr.length - 1];
          const yaw = M.qToYaw(normQ(p.orientation));
          if (!last || last.frame !== m.header.frame_id || Math.hypot(p.position.x - last.x, p.position.y - last.y) > 0.1 || Math.abs(M.normAngle(yaw - last.yaw)) > 0.12) {
            arr.push({ frame: m.header.frame_id, x: +p.position.x, y: +p.position.y, z: +p.position.z, yaw, T: poseT(p) }); if (arr.length > 100) arr.shift();
          }
        } else data[k] = m;
      }, d.qos);
    }
    function subscribeAll() { DISPLAYS.forEach(d => { if (d.type) subscribe(d.k); }); }
    subscribeAll();

    /* ---------- Displays 목록 */
    function topicsOf(type) { const s = new Set(ROS.topicList().filter(t => t.type === type).map(t => t.name)); return [...s].sort(); }
    let listSig = '';
    function renderList(force) {
      const sig = DISPLAYS.map(d => d.type ? topicsOf(d.type).join(',') : '').join('|') + Object.keys(on).filter(k => on[k]).join(',');
      if (!force && sig === listSig) return;
      listSig = sig;
      listEl.innerHTML = DISPLAYS.map(d => {
        let sel = '';
        if (d.type) {
          const opts = topicsOf(d.type); if (!opts.includes(topic[d.k])) opts.unshift(topic[d.k]);
          sel = `<select class="wr-topic" data-topic="${d.k}" title="Topic">${opts.map(t => `<option${t === topic[d.k] ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
        }
        return `<div class="wr-disp${on[d.k] ? ' on' : ''}" data-k="${d.k}"><label><input type="checkbox" data-disp="${d.k}"${on[d.k] ? ' checked' : ''}><span class="wr-ic">${d.icon}</span>${esc(d.name)}<i class="wr-dot" data-dot="${d.k}"></i></label>${sel}<div class="wr-dst" data-dst="${d.k}"></div></div>`;
      }).join('');
    }
    renderList(true);
    listEl.addEventListener('change', e => {
      const c = e.target.closest('[data-disp]'), s = e.target.closest('[data-topic]');
      if (c) { on[c.dataset.disp] = c.checked; c.closest('.wr-disp').classList.toggle('on', c.checked); if (DISPLAYS.find(d => d.k === c.dataset.disp).type) subscribe(c.dataset.disp); }
      if (s) { topic[s.dataset.topic] = s.value; subscribe(s.dataset.topic); }
    });
    fixedSel.addEventListener('change', () => { fixedUser = fixedSel.value; fixed = fixedUser; data.odom = []; });
    let frameSig = '';
    function updateFixed() {
      const fr = ROS.graph.tf.list().sort();
      const want = fixedUser || reqFixed;
      if (fr.includes(want)) { fixed = want; fixedOk = true; }
      else if (!fixedUser && fr.length) {
        const frames = ROS.graph.tf.frames, roots = fr.filter(f => !frames[f]);
        fixed = ['map', 'odom', 'world'].find(f => fr.includes(f)) || roots[0] || fr[0]; fixedOk = 'auto';
      } else { fixed = want; fixedOk = false; }
      const all = [...new Set([fixed, ...fr])];
      const sig = all.join(',') + '|' + fixed;
      if (sig !== frameSig) { frameSig = sig; fixedSel.innerHTML = all.map(f => `<option${f === fixed ? ' selected' : ''}>${esc(f)}</option>`).join(''); }
    }
    updateFixed();

    /* ---------- 도구 · 카메라 버튼 */
    function syncTop() {
      root.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === tool));
      root.querySelectorAll('[data-cam]').forEach(b => b.classList.toggle('on', b.dataset.cam === cam.mode));
      cv.style.cursor = tool === 'interact' ? 'grab' : 'crosshair';
    }
    function home() {
      cam.scale = 0;
      if (camHint) cam.f = [camHint.x, camHint.y, 0]; else cam.f = [0, 0, 0];
      if (cam.mode === '3d') { cam.yaw = -2.35; cam.pitch = 0.85; }
    }
    syncTop();
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
      if (b.dataset.tool) { tool = b.dataset.tool; syncTop(); view.focus({ preventScroll: true }); }
      if (b.dataset.cam) { cam.mode = b.dataset.cam; if (cam.mode === '3d') { cam.yaw = -2.35; cam.pitch = 0.85; } syncTop(); }
      if (b.dataset.act === 'home') home();
      if (b.dataset.act === 'side') root.classList.toggle('side-open');
    });

    /* ---------- 카메라 */
    let CAM = null;
    function camera(w, h) {
      const yaw = cam.mode === '2d' ? -Math.PI / 2 : cam.yaw, pitch = cam.mode === '2d' ? Math.PI / 2 : cam.pitch;
      const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
      const f = [-cp * cy, -cp * sy, -sp], r = [-sy, cy, 0], u = [-cy * sp, -sy * sp, cp];
      if (!cam.scale) cam.scale = Math.min(w, h) / (camHint ? camHint.span : 8) * (cam.mode === '2d' ? 1 : 1.15);
      const s = cam.scale, F = cam.f, cx = w / 2, cyy = h / 2;
      CAM = {
        f, r, u, s, w, h, yaw, pitch, sp,
        P(p) { const dx = p[0] - F[0], dy = p[1] - F[1], dz = p[2] - F[2]; return [cx + s * (dx * r[0] + dy * r[1]), cyy - s * (dx * u[0] + dy * u[1] + dz * u[2]), dx * f[0] + dy * f[1] + dz * f[2]]; },
        ground(sx, sy2) {
          const a = (sx - cx) / s, b = -(sy2 - cyy) / s;
          const P0 = [F[0] + r[0] * a + u[0] * b, F[1] + r[1] * a + u[1] * b, F[2] + u[2] * b];
          if (Math.abs(f[2]) < 0.05) return null;
          const t = -P0[2] / f[2];
          return [P0[0] + f[0] * t, P0[1] + f[1] * t];
        }
      };
      return CAM;
    }

    /* ---------- 마우스 · 터치 */
    const pts = new Map();
    let gesture = null;
    function local(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      view.focus({ preventScroll: true });
      const p = local(e);
      pts.set(e.pointerId, p);
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      if ((tool === 'pose' || tool === 'goal') && e.button === 0 && pts.size === 1 && CAM) {
        const g = CAM.ground(p[0], p[1]);
        if (g) { drag = { x: g[0], y: g[1], th: 0, tool, moved: false }; e.preventDefault(); return; }
      }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; gesture = { kind: 'pinch', d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], scale: cam.scale }; drag = null; return; }
      const pan = e.button === 2 || e.button === 1 || e.shiftKey || cam.mode === '2d';
      gesture = { kind: pan ? 'pan' : 'rot', last: p };
      cv.style.cursor = 'grabbing';
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const p = local(e); pts.set(e.pointerId, p);
      if (drag && CAM) { const g = CAM.ground(p[0], p[1]); if (g && Math.hypot(g[0] - drag.x, g[1] - drag.y) > 0.05) { drag.th = Math.atan2(g[1] - drag.y, g[0] - drag.x); drag.moved = true; } return; }
      if (!gesture) return;
      if (gesture.kind === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        cam.scale = M.clamp(gesture.scale * d / Math.max(1, gesture.d), 5, 3000);
        panBy(m[0] - gesture.m[0], m[1] - gesture.m[1]); gesture.m = m;
        return;
      }
      const dx = p[0] - gesture.last[0], dy = p[1] - gesture.last[1]; gesture.last = p;
      if (gesture.kind === 'rot') { cam.yaw -= dx * 0.008; cam.pitch = M.clamp(cam.pitch + dy * 0.008, 0.08, Math.PI / 2 - 0.001); }
      else panBy(dx, dy);
    });
    function panBy(dx, dy) {
      if (!CAM) return;
      const s = cam.scale, fg = [-Math.cos(CAM.yaw), -Math.sin(CAM.yaw)], k = 1 / Math.max(0.25, Math.sin(CAM.pitch));
      cam.f[0] -= CAM.r[0] * dx / s; cam.f[1] -= CAM.r[1] * dx / s;
      cam.f[0] += fg[0] * dy / s * k; cam.f[1] += fg[1] * dy / s * k;
    }
    const endPtr = e => {
      pts.delete(e.pointerId);
      if (drag && pts.size === 0) { finishTool(drag); drag = null; }
      if (pts.size < 2 && gesture && gesture.kind === 'pinch') gesture = null;
      if (!pts.size) { gesture = null; syncTop(); }
    };
    cv.addEventListener('pointerup', endPtr); cv.addEventListener('pointercancel', e => { drag = null; endPtr(e); });
    cv.addEventListener('dblclick', () => home());
    view.addEventListener('wheel', e => {
      if (document.activeElement !== view && !view.contains(document.activeElement)) return; // 먼저 클릭해야 확대 (문서 스크롤 방해 X)
      e.preventDefault();
      cam.scale = M.clamp(cam.scale * Math.exp(-e.deltaY * 0.0015), 5, 3000);
    }, { passive: false });
    view.addEventListener('keydown', e => { if (teleop && teleop.key(e, true)) e.preventDefault(); if (e.key === 'Escape') { tool = 'interact'; drag = null; syncTop(); } });
    view.addEventListener('keyup', e => { if (teleop && teleop.key(e, false)) e.preventDefault(); });
    view.addEventListener('blur', () => { if (teleop) teleop.release(); });

    function finishTool(d) {
      const q = M.yawToQ(d.th), stamp = ROS.graph.now();
      if (d.tool === 'pose') {
        const cov = new Array(36).fill(0); cov[0] = 0.25; cov[7] = 0.25; cov[35] = 0.06853891909122467;
        pubInit.publish({ header: { stamp, frame_id: fixed }, pose: { pose: { position: { x: d.x, y: d.y, z: 0 }, orientation: q }, covariance: cov } });
        nav = { text: `📍 /initialpose (${fixed}) x=${d.x.toFixed(2)} y=${d.y.toFixed(2)} θ=${M.deg(d.th).toFixed(0)}°`, cls: '' };
      } else {
        const msg = { header: { stamp, frame_id: fixed }, pose: { position: { x: d.x, y: d.y, z: 0 }, orientation: q } };
        pubGoal.publish(msg);
        nav = { text: `🎯 /goal_pose (${fixed}) x=${d.x.toFixed(2)} y=${d.y.toFixed(2)} θ=${M.deg(d.th).toFixed(0)}°`, cls: '' };
        // /goal_pose 를 듣는 bt_navigator 가 없으면 액션으로 직접 (Nav2 Goal)
        const listeners = ((ROS.topic('/goal_pose') || { subs: [] }).subs || []).filter(sb => !/^rviz2/.test(sb.node.name));
        if (!listeners.length && ROS.graph.actions.has('/navigate_to_pose')) {
          ROS.sendGoal('/navigate_to_pose', { pose: msg }, {}).catch(err => { nav = { text: err.message, cls: 'bad' }; });
        } else if (!listeners.length) nav.text += ' — 받는 노드가 없습니다 (Nav2 미실행)';
      }
      tool = 'interact'; syncTop();
    }

    /* ---------- Nav2 상태 (액션 이벤트) */
    const offs = [];
    offs.push(ROS.on('agoal', name => { if (name === '/navigate_to_pose') nav = { text: '🧭 Nav2: 목표 수락 — 이동 중', cls: '' }; }));
    offs.push(ROS.on('afb', (name, fb) => { if (name === '/navigate_to_pose') nav = { text: `🧭 Nav2: 남은 거리 ${(+fb.distance_remaining).toFixed(2)} m · 복구 ${fb.number_of_recoveries}회`, cls: '' }; }));
    offs.push(ROS.on('aresult', (name, st, r) => { if (name === '/navigate_to_pose') nav = st === ROS.STATUS.SUCCEEDED ? { text: '✅ Nav2: 목표 도착 (SUCCEEDED)', cls: 'ok' } : st === ROS.STATUS.CANCELED ? { text: '⏹ Nav2: 취소됨 (CANCELED)', cls: '' } : { text: `❌ Nav2: 실패 (ABORTED) ${r && r.error_msg ? '— ' + r.error_msg : ''}`, cls: 'bad' }; }));
    let listT = null;
    offs.push(ROS.on('graph', () => { clearTimeout(listT); listT = setTimeout(() => { if (el.isConnected) renderList(); }, 150); }));

    /* ---------- TF 조회 (프레임마다 캐시) */
    let tfc = new Map();
    function T(frame) {
      frame = String(frame || '').replace(/^\//, '');
      if (!frame) frame = fixed;
      if (tfc.has(frame)) return tfc.get(frame);
      let m = null;
      if (frame === fixed) m = Tm(M.tIdent());
      else { try { m = Tm(ROS.graph.tf.lookup(fixed, frame)); } catch (_) { m = null; } }
      tfc.set(frame, m);
      return m;
    }

    /* ---------- 지도 이미지 */
    const imgs = {};
    function gridImage(k, m, kind) {
      const key = m._ver + '|' + kind;
      const c = imgs[k] || (imgs[k] = {});
      if (c.key === key && c.cv) return c.cv;
      const Wd = +m.info.width | 0, Hd = +m.info.height | 0; if (!Wd || !Hd) return null;
      const cvs = c.cv || document.createElement('canvas'); cvs.width = Wd; cvs.height = Hd;
      const x = cvs.getContext('2d'), id = x.createImageData(Wd, Hd), d = id.data, src = m.data || [];
      for (let i = 0; i < Wd * Hd; i++) {
        const v = src[i] == null ? -1 : src[i], o = i * 4; let col;
        if (kind === 'costmap') {
          if (v === 100) col = [230, 40, 210, 220]; else if (v === 99) col = [0, 200, 240, 190]; else if (v <= 0) col = [0, 0, 0, 0];
          else { const t = v / 98; col = [Math.round(255 * t), Math.round(60 + 80 * (1 - t)), Math.round(255 * (1 - t)), Math.round(60 + 120 * t)]; }
        } else col = v < 0 ? [112, 137, 134, 255] : v >= 65 ? [0, 0, 0, 255] : v <= 25 ? [254, 254, 254, 255] : [Math.round(254 - v * 2.5), Math.round(254 - v * 2.5), Math.round(254 - v * 2.5), 255];
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = col[3];
      }
      x.putImageData(id, 0, 0);
      c.key = key; c.cv = cvs;
      return cvs;
    }
    function drawGrid(ctx, dpr, k, m, kind, alpha) {
      const img = gridImage(k, m, kind); if (!img) return false;
      const Tf = T(m.header.frame_id); if (!Tf) return false;
      const inf = m.info, res = +inf.resolution, O = Tm(poseT(inf.origin));
      const o0 = ap(O, 0, 0, 0), ou = ap(O, res, 0, 0), ov = ap(O, 0, res, 0);
      const p0 = CAM.P(ap(Tf, o0[0], o0[1], o0[2])), pu = CAM.P(ap(Tf, ou[0], ou[1], ou[2])), pv = CAM.P(ap(Tf, ov[0], ov[1], ov[2]));
      ctx.save();
      ctx.setTransform(dpr * (pu[0] - p0[0]), dpr * (pu[1] - p0[1]), dpr * (pv[0] - p0[0]), dpr * (pv[1] - p0[1]), dpr * p0[0], dpr * p0[1]);
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha;
      ctx.drawImage(img, 0, 0);
      ctx.restore();
      return true;
    }

    /* ---------- 3D 도형 (화가 알고리즘) */
    let solids = [];
    function shade(n) { const L = [CAM.f[0] * 0.5, CAM.f[1] * 0.5, CAM.f[2] * 0.5 - 0.85]; const ln = Math.hypot(...L); return 0.5 + 0.5 * Math.max(0, -(n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ln); }
    function face(ps3, n, col) {
      if (n[0] * CAM.f[0] + n[1] * CAM.f[1] + n[2] * CAM.f[2] > 0.001) return;
      const pr = ps3.map(p => CAM.P(p));
      solids.push({ d: pr.reduce((a, p) => a + p[2], 0) / pr.length, pr, fill: rgbaStr(col, col[3], shade(n)) });
    }
    function addBox(m, sx, sy, sz, col) {
      const hx = sx / 2, hy = sy / 2, hz = sz / 2;
      const c = [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, hy, -hz], [-hx, hy, -hz], [-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]].map(p => ap(m, p[0], p[1], p[2]));
      [[[0, 1, 2, 3], [0, 0, -1]], [[4, 5, 6, 7], [0, 0, 1]], [[0, 1, 5, 4], [0, -1, 0]], [[2, 3, 7, 6], [0, 1, 0]], [[1, 2, 6, 5], [1, 0, 0]], [[0, 3, 7, 4], [-1, 0, 0]]]
        .forEach(([ix, n]) => face(ix.map(i => c[i]), rv(m, n[0], n[1], n[2]), col));
    }
    function addCyl(m, r, len, col) {
      const N = 18, h = len / 2, bot = [], top = [];
      for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; bot.push(ap(m, r * Math.cos(a), r * Math.sin(a), -h)); top.push(ap(m, r * Math.cos(a), r * Math.sin(a), h)); }
      for (let i = 0; i < N; i++) { const j = (i + 1) % N, a = (i + 0.5) / N * Math.PI * 2; face([bot[i], bot[j], top[j], top[i]], rv(m, Math.cos(a), Math.sin(a), 0), col); }
      face(top, rv(m, 0, 0, 1), col); face(bot.slice().reverse(), rv(m, 0, 0, -1), col);
    }
    function addSphere(p, r, col) { const pr = CAM.P(p); solids.push({ d: pr[2], sphere: true, pr, r: r * CAM.s, col }); }
    function flushSolids(ctx) {
      solids.sort((a, b) => b.d - a.d);
      solids.forEach(sd => {
        if (sd.sphere) {
          const [x, y] = sd.pr, r = Math.max(1.5, sd.r);
          const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
          g.addColorStop(0, rgbaStr(sd.col, sd.col[3], 1.25)); g.addColorStop(1, rgbaStr(sd.col, sd.col[3], 0.6));
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          return;
        }
        ctx.fillStyle = sd.fill; ctx.strokeStyle = sd.fill; ctx.lineWidth = 0.6;
        ctx.beginPath(); sd.pr.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      solids = [];
    }
    function line3(ctx, a, b) { const p = CAM.P(a), q = CAM.P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
    function arrow3(ctx, a, b, col, w) {
      const p = CAM.P(a), q = CAM.P(b); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = w || 2;
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (L < 3) { ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, Math.PI * 2); ctx.fill(); return; }
      RosUI.arrow(ctx, p[0], p[1], q[0], q[1], Math.min(12, Math.max(6, L * 0.35)));
    }
    function label(ctx, x, y, text, C, col) {
      ctx.font = '600 11px ' + FONT_MONO;
      ctx.lineWidth = 3; ctx.strokeStyle = C.dark ? 'rgba(20,24,30,.85)' : 'rgba(255,255,255,.9)'; ctx.strokeText(text, x, y);
      ctx.fillStyle = col || C.fg; ctx.fillText(text, x, y);
    }

    /* ---------- 그리기 */
    let FONT_MONO = 'monospace', FONT_SANS = 'sans-serif';
    let fpsN = 0, fpsT = performance.now(), fps = 0;
    function render() {
      const C = RosUI.colors();
      const { w, h, ctx, dpr } = RosUI.fitCanvas(cv);
      tfc = new Map();
      FONT_MONO = RosUI.css('--mono') || 'monospace'; FONT_SANS = RosUI.css('--sans') || 'sans-serif';
      updateFixed();
      camera(w, h);
      ctx.fillStyle = C.dark ? '#23272e' : '#dde3ea'; ctx.fillRect(0, 0, w, h);
      const ok = !!T(fixed) && fixedOk !== false;
      // 지도 (바닥)
      if (on.map && data.map) drawGrid(ctx, dpr, 'map', data.map, 'map', 0.85);
      if (on.costmap && data.costmap) drawGrid(ctx, dpr, 'costmap', data.costmap, 'costmap', 0.75);
      // 격자 (고정 프레임 기준 1 m)
      if (on.grid) {
        const N = 10, gc = C.dark ? 'rgba(160,170,185,.28)' : 'rgba(90,100,115,.35)', c0 = [Math.round(cam.f[0]), Math.round(cam.f[1])];
        ctx.strokeStyle = gc; ctx.lineWidth = 1;
        for (let i = -N; i <= N; i++) { line3(ctx, [c0[0] + i, c0[1] - N, 0], [c0[0] + i, c0[1] + N, 0]); line3(ctx, [c0[0] - N, c0[1] + i, 0], [c0[0] + N, c0[1] + i, 0]); }
      }
      // 경로
      if (on.path && data.path && data.path.poses && data.path.poses.length > 1) {
        const Tf = T(data.path.header.frame_id);
        if (Tf) { ctx.strokeStyle = C.purple; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); data.path.poses.forEach((ps, i) => { const p = CAM.P(ap(Tf, +ps.pose.position.x, +ps.pose.position.y, +ps.pose.position.z + 0.01)); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.stroke(); }
      }
      // 오도메트리 화살표
      if (on.odom) data.odom.forEach((a, i) => {
        const Tf = T(a.frame); if (!Tf) return;
        const m = Tm(a.T), p0 = ap(m, 0, 0, 0), p1 = ap(m, 0.3, 0, 0);
        arrow3(ctx, ap(Tf, ...p0), ap(Tf, ...p1), `rgba(255,${60 + Math.round(i * 1.2)},40,${0.35 + 0.65 * i / Math.max(1, data.odom.length - 1)})`, 2);
      });
      // 로봇 모델 · 마커 (입체)
      if (on.robot) drawRobot();
      if (on.markers) drawMarkers(ctx, C, 'solid');
      flushSolids(ctx);
      if (on.markers) drawMarkers(ctx, C, 'flat');
      // LiDAR
      if (on.scan && data.scan) {
        const m = data.scan, Tf = T(m.header.frame_id);
        if (Tf) {
          ctx.fillStyle = '#ff4040';
          const rs = m.ranges || [], inc = +m.angle_increment, a0 = +m.angle_min, lo = +m.range_min, hi = +m.range_max, sz = M.clamp(CAM.s * 0.025, 2, 4);
          for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (!Number.isFinite(r) || r < lo || r > hi) continue; const a = a0 + i * inc, p = CAM.P(ap(Tf, r * Math.cos(a), r * Math.sin(a), 0)); ctx.fillRect(p[0] - sz / 2, p[1] - sz / 2, sz, sz); }
        }
      }
      // Pose (/goal_pose)
      if (on.pose && data.pose) {
        const Tf = T(data.pose.header.frame_id);
        if (Tf) { const m = Tm(poseT(data.pose.pose)); arrow3(ctx, ap(Tf, ...ap(m, 0, 0, 0.02)), ap(Tf, ...ap(m, 0.5, 0, 0.02)), C.green, 4); }
      }
      // TF
      if (on.tf) drawTF(ctx, C);
      // 도구 미리보기
      if (drag) arrow3(ctx, [drag.x, drag.y, 0.02], [drag.x + Math.cos(drag.th) * 0.6, drag.y + Math.sin(drag.th) * 0.6, 0.02], drag.tool === 'pose' ? '#22c55e' : '#a855f7', 4);
      // HUD
      gizmo(ctx, C, h);
      ctx.font = '600 11.5px ' + FONT_SANS; ctx.textBaseline = 'alphabetic';
      if (!ok) { ctx.fillStyle = C.red; ctx.fillText(`⚠ Fixed Frame [${fixed}] 가 TF 에 없습니다`, 10, 18); }
      else label(ctx, 10, 18, `Fixed Frame: ${fixed}${fixedOk === 'auto' ? ' (자동)' : ''}`, C);
      if (tool !== 'interact') { ctx.textAlign = 'center'; label(ctx, w / 2, h - 12, tool === 'goal' ? '🎯 바닥을 누른 채 끌어서 목표 방향을 정하세요' : '📍 로봇이 실제로 있는 곳을 누르고 끌어서 방향을 정하세요', C, C.accent); ctx.textAlign = 'left'; }
      if (document.activeElement !== view && !view.contains(document.activeElement)) { ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.fillText('클릭하면 휠 확대 · 키보드 조종', w - 10, 16); ctx.textAlign = 'left'; }
      fpsN++; const now = performance.now(); if (now - fpsT > 1000) { fps = fpsN * 1000 / (now - fpsT); fpsN = 0; fpsT = now; }
    }
    function gizmo(ctx, C, h) {
      const o = [34, h - 34], L = 20;
      const ax = [[1, 0, 0, '#ef4444', 'x'], [0, 1, 0, '#22c55e', 'y'], [0, 0, 1, '#3b82f6', 'z']];
      ax.forEach(([x, y, z, col, n]) => {
        const sx = x * CAM.r[0] + y * CAM.r[1], sy = -(x * CAM.u[0] + y * CAM.u[1] + z * CAM.u[2]);
        ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(o[0], o[1]); ctx.lineTo(o[0] + sx * L, o[1] + sy * L); ctx.stroke();
        if (Math.hypot(sx, sy) > 0.2) { ctx.fillStyle = col; ctx.font = '700 10px sans-serif'; ctx.fillText(n, o[0] + sx * (L + 6) - 3, o[1] + sy * (L + 6) + 3); }
      });
    }
    function drawTF(ctx, C) {
      const frames = ROS.graph.tf.frames, all = ROS.graph.tf.list(), now = performance.now();
      const L = M.clamp(34 / CAM.s, 0.04, 3);
      const labels = [];
      all.forEach(f => {
        const m = T(f); if (!m) return;
        const rec = frames[f], stale = rec && !rec.static && now - rec.at > 5000;
        const o = ap(m, 0, 0, 0);
        if (rec) { const pm = T(rec.parent); if (pm) { const po = ap(pm, 0, 0, 0); const a2 = CAM.P(o), b2 = CAM.P(po); if (Math.hypot(a2[0] - b2[0], a2[1] - b2[1]) > 10) { ctx.save(); ctx.setLineDash([4, 4]); arrow3(ctx, o, po, 'rgba(234,179,8,.7)', 1.2); ctx.restore(); } } }
        ctx.globalAlpha = stale ? 0.3 : 1;
        [[L, 0, 0, '#ef4444'], [0, L, 0, '#22c55e'], [0, 0, L, '#3b82f6']].forEach(([x, y, z, col]) => { ctx.strokeStyle = col; ctx.lineWidth = 2.5; line3(ctx, o, ap(m, x, y, z)); });
        ctx.globalAlpha = 1;
        const p = CAM.P(o);
        const near = labels.find(l => Math.hypot(l.x - p[0], l.y - p[1]) < 14);
        if (near) near.names.push(f); else labels.push({ x: p[0], y: p[1], names: [f], stale });
      });
      labels.forEach(l => {
        const t = l.names.length > 3 ? `${l.names.slice(0, 2).join(', ')} +${l.names.length - 2}` : l.names.join(', ');
        label(ctx, l.x + 6, l.y - 6, t + (l.stale ? ' (멈춤)' : ''), C, l.stale ? C.muted : C.fg);
      });
    }
    function drawRobot() {
      const rsp = ROS.findNode('/robot_state_publisher');
      const src = rsp ? rsp.getParameter('robot_description') : null;
      if (src !== robot.src) {
        robot.src = src; robot.model = null; robot.err = '';
        if (src) { try { robot.model = parseUrdf(src); } catch (e) { robot.err = e.message; } }
      }
      if (!robot.model) return;
      robot.missing = 0;
      robot.model.vis.forEach(v => {
        const lm = T(v.link); if (!lm) { robot.missing++; return; }
        const vm = v.m || (v.m = Tm(v.T)), m = { R: mul3(lm.R, vm.R), t: ap(lm, vm.t[0], vm.t[1], vm.t[2]) };
        const g = v.geom;
        if (g.type === 'box') addBox(m, g.size[0], g.size[1], g.size[2], v.color);
        else if (g.type === 'cylinder') addCyl(m, g.r, g.len, v.color);
        else if (g.type === 'sphere') addSphere(m.t, g.r, v.color);
      });
    }
    function drawMarkers(ctx, C, pass) {
      data.markers.forEach(mk => {
        const Tf = T(mk.header && mk.header.frame_id); if (!Tf) return;
        const pm = Tm(poseT(mk.pose)), m = { R: mul3(Tf.R, pm.R), t: ap(Tf, ...pm.t) };
        const col = [+mk.color.r || 0, +mk.color.g || 0, +mk.color.b || 0, mk.color.a == null ? 1 : +mk.color.a];
        const sc = mk.scale || { x: 1, y: 1, z: 1 }, type = +mk.type;
        const P3 = p => ap(m, +p.x || 0, +p.y || 0, +p.z || 0);
        if (pass === 'solid') {
          if (type === 1) addBox(m, +sc.x, +sc.y, +sc.z, col);
          else if (type === 2) addSphere(m.t, (+sc.x || 0.1) / 2, col);
          else if (type === 3) addCyl(m, (+sc.x || 0.1) / 2, +sc.z || 0.1, col);
          else if (type === 6 || type === 7) (mk.points || []).forEach(p => type === 6 ? addBox({ R: m.R, t: P3(p) }, +sc.x, +sc.y || +sc.x, +sc.z || +sc.x, col) : addSphere(P3(p), (+sc.x || 0.05) / 2, col));
          return;
        }
        const cs = rgbaStr(col);
        if (type === 0) {
          const pts = mk.points || [];
          if (pts.length >= 2) arrow3(ctx, P3(pts[0]), P3(pts[1]), cs, Math.max(2, (+sc.x || 0.05) * CAM.s));
          else arrow3(ctx, ap(m, 0, 0, 0), ap(m, +sc.x || 1, 0, 0), cs, Math.max(2, (+sc.y || 0.1) * CAM.s));
        } else if (type === 4 || type === 5) {
          const pts = (mk.points || []).map(p => CAM.P(P3(p)));
          ctx.strokeStyle = cs; ctx.lineWidth = Math.max(1.5, (+sc.x || 0.02) * CAM.s); ctx.lineJoin = 'round'; ctx.beginPath();
          if (type === 4) pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          else for (let i = 0; i + 1 < pts.length; i += 2) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); }
          ctx.stroke();
        } else if (type === 8) {
          ctx.fillStyle = cs; const sz = Math.max(2, (+sc.x || 0.05) * CAM.s);
          (mk.points || []).forEach(p => { const q = CAM.P(P3(p)); ctx.fillRect(q[0] - sz / 2, q[1] - sz / 2, sz, sz); });
        } else if (type === 9) {
          const q = CAM.P(m.t), fs = M.clamp((+sc.z || 0.2) * CAM.s, 10, 48);
          ctx.font = `600 ${fs}px ${FONT_SANS}`; ctx.textAlign = 'center';
          ctx.lineWidth = 3; ctx.strokeStyle = C.dark ? 'rgba(0,0,0,.6)' : 'rgba(255,255,255,.7)'; ctx.strokeText(String(mk.text || ''), q[0], q[1]);
          ctx.fillStyle = cs; ctx.fillText(String(mk.text || ''), q[0], q[1]); ctx.textAlign = 'left';
        }
      });
    }
    function mul3(A, B) { const o = new Array(9); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return o; }

    /* ---------- 상태 표시 (0.5 초마다) */
    function dispStatus(k) {
      if (!on[k]) return ['off', ''];
      const r = rx[k] || { n: 0, t: 0 }, age = performance.now() - r.t;
      if (k === 'grid') return ['ok', '1 m 칸 · ' + fixed + ' 기준'];
      if (k === 'tf') { const n = ROS.graph.tf.list().length; return n ? ['ok', `프레임 ${n}개`] : ['warn', 'TF 없음']; }
      if (k === 'robot') {
        if (robot.err) return ['err', robot.err];
        if (!robot.model) return ['warn', '/robot_state_publisher 의 robot_description 파라미터가 없습니다'];
        const mesh = robot.model.vis.filter(v => v.geom.type === 'mesh').length;
        return [robot.missing ? 'warn' : 'ok', `${robot.model.name} · 링크 ${robot.model.links.length}개${robot.missing ? ` · TF 없는 모양 ${robot.missing}개` : ''}${mesh ? ` · mesh ${mesh}개 생략` : ''}`];
      }
      const t = ROS.topic(topic[k]);
      if (!t || !t.pubs.length) return r.n ? ['warn', '발행자가 사라졌습니다'] : ['warn', `${topic[k]} 발행자 없음`];
      if (k === 'map' || k === 'costmap') {
        if (t.pubs.some(p => p.qos.durability !== 'transient_local')) return ['err', 'QoS 불일치: 발행자 VOLATILE ↔ RViz TRANSIENT_LOCAL'];
        const m = data[k]; if (!m) return ['warn', '메시지를 기다리는 중'];
        if (!T(m.header.frame_id)) return ['err', `프레임 [${m.header.frame_id}] → [${fixed}] 변환 없음`];
        return ['ok', `${m.info.width}×${m.info.height} · ${(+m.info.resolution).toFixed(2)} m/칸`];
      }
      if (!r.n) return k === 'pose' ? ['ok', '아직 목표 없음'] : ['warn', '메시지 없음'];
      const hz = ROS.hz(topic[k]);
      let extra = '';
      if (k === 'scan' && data.scan) { if (!T(data.scan.header.frame_id)) return ['err', `프레임 [${data.scan.header.frame_id}] → [${fixed}] 변환 없음`]; extra = `${(data.scan.ranges || []).filter(Number.isFinite).length}점`; }
      if (k === 'path' && data.path) extra = `${(data.path.poses || []).length} poses`;
      if (k === 'odom') extra = `화살표 ${data.odom.length}/100`;
      if (k === 'markers') { extra = `마커 ${data.markers.size}개`; if ([...data.markers.values()].some(mk => !(+mk.color.a))) return ['warn', extra + ' · color.a = 0 인 마커는 투명해서 안 보입니다']; }
      return [age > 3000 && k !== 'pose' && k !== 'markers' ? 'warn' : 'ok', `${extra}${hz ? ` · ${hz.toFixed(1)} Hz` : ''}`];
    }
    function status() {
      DISPLAYS.forEach(d => {
        const [lv, text] = dispStatus(d.k);
        const dot = listEl.querySelector(`[data-dot="${d.k}"]`), st = listEl.querySelector(`[data-dst="${d.k}"]`);
        if (dot) dot.className = 'wr-dot ' + lv;
        if (st && st.textContent !== text) st.textContent = text;
      });
      const ok = !!T(fixed) && fixedOk !== false;
      statusEl.innerHTML = `<span class="${ok ? 'ok' : 'bad'}">${ok ? '● Global Status: OK' : `● Fixed Frame [${esc(fixed)}] 없음`}</span><span>프레임 ${ROS.graph.tf.list().length}개</span><span>${fps.toFixed(0)} fps</span>${nav.text ? `<span class="${nav.cls}">${esc(nav.text)}</span>` : ''}`;
    }
    let lastS = 0, narrow = null;
    const stop = RosUI.loop(view, () => {
      const nw = root.clientWidth < 640;
      if (nw !== narrow) { narrow = nw; root.classList.toggle('narrow', nw); }
      render();
      const now = performance.now();
      if (now - lastS > 500) { lastS = now; status(); }
    });

    return () => {
      stop(); offs.forEach(f => f()); clearTimeout(listT);
      if (teleop) teleop.stop();
      node.destroy();
      owned.forEach(n => n && n.alive && n.destroy());
    };
  }

  RosUI.registerView('rviz', rvizView, { title: 'RViz2', icon: '🧭', w: 900, h: 620 });
  Widgets.register('rviz', (el, o) => {
    const body = RosUI.frame(el, '🧭', 'RViz2 — 3D 시각화 도구', '직접 해 보기');
    return rvizView(body, o || {});
  }, { title: 'RViz2 시각화' });

  ROS.registerPkg('rviz2', {
    desc: '3D 시각화 도구 (RViz2-lite)',
    exes: {
      rviz2(ctx) {
        let cfg = null;
        for (let i = 0; i < ctx.argv.length; i++) if (ctx.argv[i] === '-d' || ctx.argv[i] === '--display-config') cfg = ctx.argv[++i];
        ctx.out('[INFO] [rviz2]: Stereo is NOT SUPPORTED');
        ctx.out('[INFO] [rviz2]: OpenGl version: 4.6 (GLSL 4.6) — WebROS 는 캔버스로 그립니다');
        if (cfg) ctx.out(`[INFO] [rviz2]: 설정 파일 '${cfg}' 은(는) 무시하고 기본 Displays 를 씁니다`);
        const fixed = ctx.args.params.fixed_frame || (/nav2/.test(cfg || '') ? 'map' : null);
        ctx.openView('rviz', fixed ? { fixed } : {}, { title: 'RViz2' + (cfg ? ` — ${cfg.replace(/^.*[\\/]/, '')}` : '') });
        return { nodes: [] };
      }
    }
  });
})();
