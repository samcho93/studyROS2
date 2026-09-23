/* ===================================================================
   Unitree Go2 + ROS 2 — 브라우저 안의 가벼운 4족 보행 시뮬레이터
   · 노드 /go2_driver (pkg go2_sim): /cmd_vel 구독 → /odom /tf /joint_states /imu /sportmodestate /scan 발행
     서비스 /go2/stand_up /go2/stand_down /go2/sit /go2/hello (std_srvs/srv/Trigger)
     (실물과 같은 모양의) /api/sport/request (unitree_api/msg/Request) 도 받아 줍니다.
   · 선택: studyGo2 의 MuJoCo 시뮬레이터(iframe)와 postMessage 로 연동
   위젯/보기: go2   패키지: go2_sim (go2_driver, go2.launch.py)
   =================================================================== */
(function () {
  'use strict';
  const M = ROS.math;
  const esc = RosUI.esc;
  const clamp = M.clamp;

  /* ================================================== 인터페이스 (unitree_api) */
  const IF = window.ROS_IFACES;
  IF['unitree_api/msg/RequestIdentity'] = 'int64 id\nint64 api_id';
  IF['unitree_api/msg/RequestLease'] = 'int64 id';
  IF['unitree_api/msg/RequestPolicy'] = 'int32 priority\nbool noreply';
  IF['unitree_api/msg/RequestHeader'] = 'RequestIdentity identity\nRequestLease lease\nRequestPolicy policy';
  IF['unitree_api/msg/Request'] = `# 고수준(sport) 명령 요청 — SportClient 가 내부에서 만들어 /api/sport/request 로 보냅니다
RequestHeader header   # header.identity.api_id = 1008 (Move) …
string parameter       # JSON 문자열, 예: '{"x": 0.3, "y": 0.0, "z": 0.0}'
uint8[] binary`;

  /** SportClient API ID (unitree_sdk2 sport_api.hpp 와 같은 번호) */
  const API = { Damp: 1001, BalanceStand: 1002, StopMove: 1003, StandUp: 1004, StandDown: 1005, RecoveryStand: 1006, Euler: 1007, Move: 1008, Sit: 1009, RiseSit: 1010, SpeedLevel: 1015, Hello: 1016, Stretch: 1017 };
  const API_NAME = {}; Object.keys(API).forEach(k => { API_NAME[API[k]] = k; });

  /* ================================================== 로봇 치수 · 기구학 */
  const LEGS = ['FR', 'FL', 'RR', 'RL'];              // SDK 모터 순서 (LowState.motor_state 0~11)
  const URDF_LEGS = ['FL', 'FR', 'RL', 'RR'];          // go2_description URDF 순서
  const JOINTS = ['hip', 'thigh', 'calf'];
  const JOINT_NAMES = URDF_LEGS.flatMap(l => JOINTS.map(j => `${l}_${j}_joint`));
  const HIP = { FR: [0.1934, -0.0465], FL: [0.1934, 0.0465], RR: [-0.1934, -0.0465], RL: [-0.1934, 0.0465] };
  const LAT = 0.0955;                                  // hip → thigh 옆 간격
  const L1 = 0.213, L2 = 0.213;                        // thigh, calf 길이 [m]
  const STAND_H = 0.32;
  const MODE_NAME = { 0: 'idle', 1: 'balanceStand', 2: 'pose', 3: 'locomotion', 5: 'lieDown', 6: 'jointLock', 7: 'damping', 8: 'recoveryStand', 10: 'sit' };
  const MODE_KO = { up: '서기', walk: '걷기', down: '엎드림', sit: '앉기', hello: '인사', damp: '댐핑(힘 빠짐)' };

  /** 두 링크 다리 역기구학. x: 앞(+), z: 아래(+) 방향 [m] → [thigh, calf] (Go2 부호: thigh +, calf −) */
  function ik(x, z) {
    let d = Math.hypot(x, z);
    const k = clamp(d, 0.07, L1 + L2 - 1e-4) / (d || 1);
    x *= k; z *= k; d = Math.hypot(x, z);
    const c2 = clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1);
    const calf = -Math.acos(c2);
    const alpha = Math.atan2(-x, z);
    const beta = Math.atan2(L2 * Math.sin(calf), L1 + L2 * Math.cos(calf));
    return [alpha - beta, calf];
  }
  /** 정기구학 → [무릎x, 무릎z, 발x, 발z] (x 앞, z 아래) */
  function fk(th, ca) {
    const kx = -L1 * Math.sin(th), kz = L1 * Math.cos(th);
    return [kx, kz, kx - L2 * Math.sin(th + ca), kz + L2 * Math.cos(th + ca)];
  }
  /** 몸통 높이 h, 코 들림 pitch(+) 일 때 hip(hx) 아래 땅 위 점(hx+fx, lift) 에 발을 두는 관절각 */
  function legIK(hx, h, pitch, fx, lift) {
    const c = Math.cos(pitch), s = Math.sin(pitch);
    const hipX = hx * c, hipZ = h + hx * s;
    const vx = (hx + fx) - hipX, vz = lift - hipZ;
    const bx = vx * c + vz * s, bz = -vx * s + vz * c;
    return ik(bx, -bz);
  }

  /* ================================================== 방(월드) */
  const ROOM = { x0: -1.5, x1: 6.5, y0: -3, y1: 3 };
  const BOXES = [
    { x0: 2.9, x1: 4.3, y0: 1.9, y1: 2.8, label: '소파' },
    { x0: 1.6, x1: 2.5, y0: -2.3, y1: -1.4, label: '테이블' },
    { x0: 5.6, x1: 6.3, y0: 0.6, y1: 1.6, label: '상자' }
  ];
  const CIRCLES = [{ x: 4.8, y: -0.8, r: 0.28, label: '기둥' }];
  const BODY_R = 0.3;

  function collides(x, y) {
    if (x - BODY_R < ROOM.x0 || x + BODY_R > ROOM.x1 || y - BODY_R < ROOM.y0 || y + BODY_R > ROOM.y1) return true;
    for (const b of BOXES) { const cx = clamp(x, b.x0, b.x1), cy = clamp(y, b.y0, b.y1); if (Math.hypot(x - cx, y - cy) < BODY_R) return true; }
    for (const c of CIRCLES) if (Math.hypot(x - c.x, y - c.y) < BODY_R + c.r) return true;
    return false;
  }
  function raycast(ox, oy, a, maxR) {
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = maxR;
    const slab = (x0, x1, y0, y1, inside) => {
      let tmin = -Infinity, tmax = Infinity;
      if (Math.abs(dx) < 1e-9) { if (ox < x0 || ox > x1) return; } else { const t1 = (x0 - ox) / dx, t2 = (x1 - ox) / dx; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2)); }
      if (Math.abs(dy) < 1e-9) { if (oy < y0 || oy > y1) return; } else { const t1 = (y0 - oy) / dy, t2 = (y1 - oy) / dy; tmin = Math.max(tmin, Math.min(t1, t2)); tmax = Math.min(tmax, Math.max(t1, t2)); }
      if (tmax < Math.max(tmin, 0)) return;
      const t = inside ? tmax : tmin;
      if (t > 0 && t < best) best = t;
    };
    slab(ROOM.x0, ROOM.x1, ROOM.y0, ROOM.y1, true);
    BOXES.forEach(b => slab(b.x0, b.x1, b.y0, b.y1, false));
    CIRCLES.forEach(c => {
      const fx = ox - c.x, fy = oy - c.y, b = fx * dx + fy * dy, cc = fx * fx + fy * fy - c.r * c.r, disc = b * b - cc;
      if (disc < 0) return; const t = -b - Math.sqrt(disc); if (t > 0 && t < best) best = t;
    });
    return best;
  }

  /* ================================================== 시뮬레이터 + 드라이버 노드 */
  function createGo2Sim(node, opts) {
    opts = opts || {};
    const P = {
      max_vx: node.declareParameter('max_vx', 1.0, { description: '최대 전진 속도 [m/s] (Go2 실물 공식 최대는 더 높지만 안전하게 제한)' }),
      max_vy: node.declareParameter('max_vy', 0.6, { description: '최대 옆걸음 속도 [m/s]' }),
      max_vyaw: node.declareParameter('max_vyaw', 1.5, { description: '최대 회전 속도 [rad/s]' }),
      cmd_timeout: node.declareParameter('cmd_timeout', 0.5, { description: '/cmd_vel 이 이 시간(초)보다 오래되면 정지 (워치독)' }),
      publish_scan: node.declareParameter('publish_scan', opts.scan !== false, { description: 'L1 LiDAR 의 수평 단면을 /scan 으로 발행' }),
      odom_frame: node.declareParameter('odom_frame', 'odom', { description: '오도메트리 좌표계', read_only: true }),
      base_frame: node.declareParameter('base_frame', 'base_link', { description: '로봇 몸통 좌표계', read_only: true })
    };
    node.onSetParameters(list => { for (const p of list) if (/^max_|cmd_timeout/.test(p.name) && !(+p.value >= 0)) return { successful: false, reason: '0 이상이어야 합니다' }; return { successful: true }; });
    node.onDestroy = () => { if (sim.link) sim.link.close(); };
    const sim = {
      node, mode: 'up', x: 0, y: 0, yaw: 0, vx: 0, vy: 0, wz: 0, ax: 0,
      cmd: { vx: 0, vy: 0, wz: 0, t: -1e9 }, timedOut: true,
      h: 0.09, pitch: 0, roll: 0, phase: 0, amp: 0, trans: 1.6, modeT: 0,
      q: {}, lift: {}, foot: {}, trail: [], scan: null, ext: null, link: null, frame: 0, lastWarn: 0, clamped: false,
      P
    };
    LEGS.forEach(l => { sim.q[l] = [0, 1.25, -2.70]; sim.lift[l] = 0; sim.foot[l] = [0, 0]; });
    const pOdom = node.createPublisher('nav_msgs/msg/Odometry', 'odom', 10);
    const pTf = node.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    const pTfs = node.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static');
    const pJs = node.createPublisher('sensor_msgs/msg/JointState', 'joint_states', 10);
    const pImu = node.createPublisher('sensor_msgs/msg/Imu', 'imu', 'sensor_data');
    const pSms = node.createPublisher('unitree_go/msg/SportModeState', 'sportmodestate', 10);
    let pScan = null;
    const ensureScan = () => { const want = !!node.getParameter('publish_scan'); if (want && !pScan) pScan = node.createPublisher('sensor_msgs/msg/LaserScan', 'scan', 'sensor_data'); if (!want && pScan) { pScan.destroy(); pScan = null; sim.scan = null; } };
    ensureScan();
    ROS.on('param', (n, name) => { if (n === node && name === 'publish_scan') ensureScan(); });
    pTfs.publish({ transforms: [ROS.tfMsg('base_link', 'utlidar_lidar', { x: 0.28, y: 0, z: 0.05 }, { x: 0, y: 0, z: 0, w: 1 }), ROS.tfMsg('base_link', 'imu', { x: -0.02557, y: 0, z: 0.04232 }, { x: 0, y: 0, z: 0, w: 1 })] });

    function warn(text) { const now = performance.now(); if (now - sim.lastWarn > 2000) { sim.lastWarn = now; node.warn(text); } }
    function setCmd(vx, vy, wz, src) {
      const lim = sim.link && sim.link.connected ? sim.link.limits : { vx: node.getParameter('max_vx'), vy: node.getParameter('max_vy'), vyaw: node.getParameter('max_vyaw') };
      const c = { vx: clamp(+vx || 0, -lim.vx, lim.vx), vy: clamp(+vy || 0, -lim.vy, lim.vy), wz: clamp(+wz || 0, -lim.vyaw, lim.vyaw) };
      sim.clamped = c.vx !== (+vx || 0) || c.vy !== (+vy || 0) || c.wz !== (+wz || 0);
      const moving = Math.abs(c.vx) + Math.abs(c.vy) + Math.abs(c.wz) > 1e-4;
      if (moving && sim.mode !== 'up' && !(sim.link && sim.link.connected)) { warn(`현재 모드(${MODE_KO[sim.mode]})에서는 ${src} 명령을 무시합니다 — 먼저 /go2/stand_up 을 호출하세요`); return; }
      if (sim.timedOut && moving) node.info(`${src} 수신 → 보행 시작 (vx=${c.vx.toFixed(2)}, vy=${c.vy.toFixed(2)}, vyaw=${c.wz.toFixed(2)})`);
      sim.cmd = Object.assign(c, { t: performance.now() }); sim.timedOut = false;
    }
    node.createSubscription('geometry_msgs/msg/Twist', 'cmd_vel', m => setCmd(m.linear.x, m.linear.y, m.angular.z, '/cmd_vel'), 10);
    // 실물 unitree_ros2 와 같은 경로: /api/sport/request (unitree_api/msg/Request)
    node.createSubscription('unitree_api/msg/Request', '/api/sport/request', m => {
      const id = +m.header.identity.api_id, name = API_NAME[id];
      let p = {}; try { p = m.parameter ? JSON.parse(m.parameter) : {}; } catch (_) { node.warn(`parameter JSON 을 읽을 수 없습니다: ${m.parameter}`); }
      if (!name) { node.warn(`지원하지 않는 api_id ${id}`); return; }
      if (name === 'Move') setCmd(p.x, p.y, p.z, 'Move(1008)');
      else if (name === 'StopMove') { sim.cmd = { vx: 0, vy: 0, wz: 0, t: performance.now() }; }
      else { const r = command(name); node.info(`/api/sport/request api_id=${id} (${name}) → ${r.message}`); }
    }, 10);

    /** 모드 명령 (서비스 · api 요청 · 버튼 공용) → {success, message} */
    function command(name) {
      const fwd = sim.link && sim.link.connected;
      const was = sim.mode;
      const go = (m, msg) => { if (sim.mode !== m) { sim.mode = m; sim.trans = m === 'damp' ? 0.4 : 1.4; sim.modeT = 0; } if (fwd) sim.link.sport(name === 'StandUp' && was === 'sit' ? 'RiseSit' : name); return { success: true, message: msg + (fwd ? ' (MuJoCo 로 전달)' : '') }; };
      const stop = () => { sim.cmd = { vx: 0, vy: 0, wz: 0, t: -1e9 }; };
      switch (name) {
        case 'StandUp': case 'RecoveryStand': case 'BalanceStand': case 'RiseSit':
          if (sim.mode === 'up' && !fwd) return { success: true, message: '이미 서 있습니다' };
          return go('up', '일어섭니다');
        case 'StandDown': stop(); return go('down', '엎드립니다');
        case 'Damp': stop(); return go('damp', '모든 관절 댐핑 — 주저앉습니다');
        case 'Sit':
          if (sim.mode !== 'up' && !fwd) return { success: false, message: `서 있을 때만 앉을 수 있습니다 (현재: ${MODE_KO[sim.mode]})` };
          stop(); return go('sit', '앉습니다');
        case 'Hello': case 'Stretch':
          if (sim.mode !== 'up' && !fwd) return { success: false, message: `서 있을 때만 인사할 수 있습니다 (현재: ${MODE_KO[sim.mode]})` };
          stop(); sim.helloEnd = 4.0; return go('hello', '앞발을 들어 인사합니다');
        default: return { success: false, message: `${name} 은(는) 이 시뮬레이터에서 지원하지 않습니다` };
      }
    }
    sim.command = command;
    const trig = (srv, name) => node.createService('std_srvs/srv/Trigger', srv, (req, res) => { const r = command(name); res.success = r.success; res.message = r.message; (r.success ? node.info.bind(node) : node.warn.bind(node))(`${srv}: ${r.message}`); return res; });
    trig('/go2/stand_up', 'StandUp'); trig('/go2/stand_down', 'StandDown'); trig('/go2/sit', 'Sit'); trig('/go2/hello', 'Hello');

    /* ---------- 한 단계 (50 Hz) */
    const DT = 0.02;
    function targetPose(t) {
      const q = {}, lift = {}, foot = {};
      let h = STAND_H, pitch = 0;
      const m = sim.mode;
      if (m === 'down' || m === 'damp') {
        h = 0.093; LEGS.forEach(l => { q[l] = m === 'damp' ? [l[1] === 'R' ? -0.1 : 0.1, 1.1, -2.72] : [0, 1.25, -2.70]; lift[l] = 0; });
        return { h, pitch, q, lift };
      }
      if (m === 'sit') {
        const zr = 0.10, zf = 0.30; pitch = Math.asin((zf - zr) / (2 * HIP.FR[0])); h = (zr + zf) / 2;
        LEGS.forEach(l => { const hx = HIP[l][0]; const [th, ca] = legIK(hx, h, pitch, hx > 0 ? 0.03 : 0.06, 0); q[l] = [0, th, ca]; lift[l] = 0; });
        return { h, pitch, q, lift };
      }
      if (m === 'hello') {
        const zr = 0.22, zf = 0.33; pitch = Math.asin((zf - zr) / (2 * HIP.FR[0])); h = (zr + zf) / 2;
        LEGS.forEach(l => { const hx = HIP[l][0]; const [th, ca] = legIK(hx, h, pitch, hx > 0 ? 0.04 : -0.02, 0); q[l] = [0, th, ca]; lift[l] = 0; });
        const w = Math.sin(t * 2 * Math.PI * 1.4);
        q.FR = [-0.25, -0.55 + 0.35 * w, -1.05 - 0.25 * w]; lift.FR = 0.15;
        return { h, pitch, q, lift };
      }
      // 서기 / 걷기 — 트롯(대각 다리 쌍) 보행
      const T = 1 / 2.2;
      const vxb = sim.vx, vyb = sim.vy, wz = sim.wz;
      h = STAND_H - 0.006 * sim.amp * Math.abs(Math.sin(sim.phase * 4 * Math.PI));
      pitch = clamp(-sim.ax * 0.025, -0.08, 0.08);
      LEGS.forEach(l => {
        const [hx, hy] = HIP[l];
        const p = (sim.phase + (l === 'FR' || l === 'RL' ? 0 : 0.5)) % 1;
        const sx = (vxb - wz * hy) * T / 2, sy = (vyb + wz * hx) * T / 2;
        let off, lf = 0;
        if (p < 0.5) off = 0.5 - p / 0.5;
        else { const u = (p - 0.5) / 0.5; off = -0.5 + (1 - Math.cos(Math.PI * u)) / 2; lf = 0.08 * Math.sin(Math.PI * u); }
        off *= sim.amp; lf *= sim.amp;
        const fx = sx * off, fy = sy * off;
        const [th, ca] = legIK(hx, h, pitch, fx, lf);
        const hip = Math.atan2(fy, h - lf);
        q[l] = [hip, th, ca]; lift[l] = lf; foot[l] = [fx, fy];
      });
      return { h, pitch, q, lift, foot };
    }

    function step() {
      const now = performance.now();
      sim.frame++;
      const ext = sim.ext && now - sim.ext.at < 1000 ? sim.ext : null;
      const age = (now - sim.cmd.t) / 1000;
      if (!sim.timedOut && age > node.getParameter('cmd_timeout')) {
        sim.timedOut = true;
        if (Math.abs(sim.cmd.vx) + Math.abs(sim.cmd.vy) + Math.abs(sim.cmd.wz) > 1e-4) node.warn(`/cmd_vel 이 ${node.getParameter('cmd_timeout')} 초 넘게 오지 않아 정지합니다 (워치독)`);
        sim.cmd = { vx: 0, vy: 0, wz: 0, t: sim.cmd.t };
      }
      if (ext) {
        const pvx = sim.vx;
        sim.x = ext.x; sim.y = ext.y; sim.yaw = ext.yaw; sim.vx = ext.vx; sim.vy = ext.vy; sim.wz = ext.wz;
        sim.ax = (sim.vx - pvx) / DT;
        if (ext.modeKey) sim.mode = ext.modeKey;
      } else {
        const up = sim.mode === 'up' && sim.trans <= 0.4;
        const c = up ? sim.cmd : { vx: 0, vy: 0, wz: 0 };
        const app = (v, t, a) => v + clamp(t - v, -a * DT, a * DT);
        const pvx = sim.vx;
        sim.vx = app(sim.vx, c.vx, 1.5); sim.vy = app(sim.vy, c.vy, 1.2); sim.wz = app(sim.wz, c.wz, 4);
        sim.ax = (sim.vx - pvx) / DT;
        const cy = Math.cos(sim.yaw), sy = Math.sin(sim.yaw);
        const nx = sim.x + (sim.vx * cy - sim.vy * sy) * DT, ny = sim.y + (sim.vx * sy + sim.vy * cy) * DT;
        if (!collides(nx, ny)) { sim.x = nx; sim.y = ny; }
        else if (!collides(nx, sim.y)) sim.x = nx;
        else if (!collides(sim.x, ny)) sim.y = ny;
        else { sim.vx = sim.vy = 0; warn('장애물에 막혔습니다 — 방향을 바꾸세요'); }
        sim.yaw = M.normAngle(sim.yaw + sim.wz * DT);
      }
      // 보행 위상
      const moving = Math.abs(sim.vx) + Math.abs(sim.vy) + Math.abs(sim.wz) * 0.3 > 0.02 && sim.mode === 'up';
      sim.amp = clamp(sim.amp + (moving ? 4 : -3) * DT, 0, 1);
      if (sim.amp > 0) sim.phase = (sim.phase + DT * 2.2) % 1;
      sim.modeT += DT;
      if (sim.mode === 'hello' && !ext) { sim.helloEnd -= DT; if (sim.helloEnd <= 0) { sim.mode = 'up'; sim.trans = 1.0; } }
      const tp = targetPose(sim.modeT);
      const tau = sim.trans > 0 ? 0.28 : 0.012;
      sim.trans = Math.max(0, sim.trans - DT);
      const k = 1 - Math.exp(-DT / tau);
      sim.h += (tp.h - sim.h) * k; sim.pitch += (tp.pitch - sim.pitch) * k;
      LEGS.forEach(l => {
        const tq = ext && ext.q ? ext.q[l] : tp.q[l];
        const kk = ext && ext.q ? 1 : k;
        for (let j = 0; j < 3; j++) sim.q[l][j] += (tq[j] - sim.q[l][j]) * kk;
        sim.lift[l] = tp.lift[l] || 0; sim.foot[l] = (tp.foot && tp.foot[l]) || [0, 0];
      });
      if (ext) { if (ext.h != null) sim.h = ext.h; if (ext.pitch != null) sim.pitch = ext.pitch; }
      if (sim.frame % 5 === 0) { sim.trail.push([sim.x, sim.y]); if (sim.trail.length > 400) sim.trail.shift(); }
      publish(ext);
    }

    function modeCode() {
      if (sim.ext && sim.ext.mode != null && performance.now() - sim.ext.at < 1000) return sim.ext.mode;
      if (sim.mode === 'up') return sim.amp > 0.05 ? 3 : (sim.trans > 0 ? 8 : 1);
      return { down: 5, sit: 10, hello: 2, damp: 7 }[sim.mode] || 0;
    }
    sim.modeCode = modeCode;

    function publish(ext) {
      const stamp = ROS.graph.now();
      const q = M.rpyToQ(0, -sim.pitch, sim.yaw);         // ROS: pitch + 는 코가 내려감
      const odomF = node.getParameter('odom_frame'), baseF = node.getParameter('base_frame');
      pOdom.publish({
        header: { stamp, frame_id: odomF }, child_frame_id: baseF,
        pose: { pose: { position: { x: sim.x, y: sim.y, z: sim.h }, orientation: q }, covariance: new Array(36).fill(0) },
        twist: { twist: { linear: { x: sim.vx, y: sim.vy, z: 0 }, angular: { x: 0, y: 0, z: sim.wz } }, covariance: new Array(36).fill(0) }
      });
      pTf.publish({ transforms: [ROS.tfMsg(odomF, baseF, { x: sim.x, y: sim.y, z: sim.h }, q)] });
      if (sim.frame % 2 === 0) {
        const pos = [], vel = [];
        URDF_LEGS.forEach(l => { for (let j = 0; j < 3; j++) { pos.push(+sim.q[l][j].toFixed(4)); vel.push(0); } });
        pJs.publish({ header: { stamp, frame_id: '' }, name: JOINT_NAMES.slice(), position: pos, velocity: vel, effort: new Array(12).fill(0) });
      }
      pImu.publish({
        header: { stamp, frame_id: 'imu' }, orientation: q, orientation_covariance: new Array(9).fill(0),
        angular_velocity: { x: 0, y: 0, z: sim.wz }, angular_velocity_covariance: new Array(9).fill(0),
        linear_acceleration: { x: sim.ax, y: sim.vx * sim.wz, z: 9.81 + (sim.amp ? 0.6 * Math.sin(sim.phase * 4 * Math.PI) : 0) }, linear_acceleration_covariance: new Array(9).fill(0)
      });
      if (sim.frame % 2 === 1) {
        const cy = Math.cos(sim.yaw), sy = Math.sin(sim.yaw);
        const ff = LEGS.map(l => sim.mode === 'hello' && l === 'FR' ? 0 : (sim.lift[l] > 0.005 ? 0 : Math.round(sim.amp > 0.05 ? 150 : 75)));
        pSms.publish({ mode: modeCode(), body_height: sim.h, position: [sim.x, sim.y, sim.h], velocity: [sim.vx * cy - sim.vy * sy, sim.vx * sy + sim.vy * cy, 0], yaw_speed: sim.wz, foot_force: ff });
      }
      if (pScan && sim.frame % 5 === 0) {
        const N = 180, maxR = 8, ranges = new Array(N);
        const lx = sim.x + 0.28 * Math.cos(sim.yaw), ly = sim.y + 0.28 * Math.sin(sim.yaw);
        for (let i = 0; i < N; i++) { const a = -Math.PI + i * 2 * Math.PI / N; const r = raycast(lx, ly, sim.yaw + a, maxR + 1); ranges[i] = r > maxR ? Infinity : +(r + (Math.random() - 0.5) * 0.01).toFixed(3); }
        sim.scan = { lx, ly, yaw: sim.yaw, ranges, N };
        pScan.publish({ header: { stamp, frame_id: 'utlidar_lidar' }, angle_min: -Math.PI, angle_max: Math.PI - 2 * Math.PI / N, angle_increment: 2 * Math.PI / N, time_increment: 0, scan_time: 0.1, range_min: 0.05, range_max: maxR, ranges, intensities: [] });
      }
    }
    node.createTimer(DT, step);
    node.info('Go2 driver started — /cmd_vel 대기 중 (max vx=' + P.max_vx + ' m/s, vy=' + P.max_vy + ' m/s, vyaw=' + P.max_vyaw + ' rad/s)');
    sim.trans = 1.6; sim.mode = 'up';
    node.go2 = sim;
    return sim;
  }
  ROS.createGo2Sim = createGo2Sim;
  const findSim = fqn => { const n = ROS.nodes().find(x => x.go2 && (!fqn || x.fqn === fqn)); return n ? n.go2 : null; };

  /* ================================================== studyGo2 MuJoCo 연동 (postMessage) */
  const GO2_ORIGIN = 'https://samcho93.github.io';
  const SIM_URL = GO2_ORIGIN + '/studyGo2/sim/index.html?embed=1';
  const SIM_TAB = GO2_ORIGIN + '/studyGo2/sim/';
  const COURSE_URL = GO2_ORIGIN + '/studyGo2/';
  const PLAY_URL = GO2_ORIGIN + '/studyGo2/tools/playground.html';
  const SAFE = { vx: 0.5, vy: 0.3, vyaw: 1.0 };        // studyGo2 PROTOCOL §4.1

  /** iframe 하나와 주고받는 연결. sim(드라이버)의 /cmd_vel 과 서비스를 Move/StandUp… 으로 전달 */
  function createLink(sim, box, url, cb) {
    const origin = new URL(url, location.href).origin;
    const link = { connected: false, hello: null, limits: Object.assign({}, SAFE), closed: false, lastMove: null, standTimer: 0 };
    let id = 1;
    const iframe = document.createElement('iframe');
    iframe.src = url; iframe.title = 'Go2 MuJoCo 시뮬레이터'; iframe.className = 'wg2-iframe'; iframe.setAttribute('allow', 'fullscreen');
    box.appendChild(iframe);
    const send = msg => { if (link.closed || !iframe.contentWindow) return false; try { iframe.contentWindow.postMessage({ channel: 'studygo2', msg }, origin); return true; } catch (e) { return false; } };
    link.send = send;
    link.sport = (method, args) => {
      send({ id: id++, type: 'call', api: 'sport', method, args: args || [] });
      cb.log(`→ sport.${method}(${(args || []).map(v => (+v).toFixed(2)).join(', ')})`, 'out');
      if (method === 'StandUp' || method === 'RecoveryStand' || method === 'RiseSit') { clearTimeout(link.standTimer); link.standTimer = setTimeout(() => send({ id: id++, type: 'call', api: 'sport', method: 'BalanceStand', args: [] }), 1500); }
    };
    link.estop = () => { send({ type: 'estop' }); cb.log('→ estop (Damp)', 'bad'); };
    const onMsg = e => {
      if (e.source !== iframe.contentWindow) return;
      const d = e.data; if (!d || d.channel !== 'studygo2' || !d.msg) return;
      const m = d.msg;
      if (m.type === 'hello') {
        link.hello = m; link.connected = true;
        if (m.limits) link.limits = { vx: Math.min(SAFE.vx, +m.limits.vx || SAFE.vx), vy: Math.min(SAFE.vy, +m.limits.vy || SAFE.vy), vyaw: Math.min(SAFE.vyaw, +m.limits.vyaw || SAFE.vyaw) };
        send({ id: id++, type: 'subscribe', topic: 'sportmodestate', hz: 20 });
        if (!m.topics || m.topics.includes('lowstate')) send({ id: id++, type: 'subscribe', topic: 'lowstate', hz: 20 });
        cb.status('ok', `연결됨 — backend: ${m.backend || 'sim'}, 속도 한계 vx ${link.limits.vx} · vy ${link.limits.vy} · vyaw ${link.limits.vyaw}`);
        sim.node.info('MuJoCo 시뮬레이터와 연결되었습니다 (studyGo2 protocol v' + (m.protocol || 1) + ')');
      } else if (m.type === 'state') {
        if (m.topic === 'sportmodestate') onSport(m.data);
        else if (m.topic === 'lowstate') onLow(m.data);
      } else if (m.type === 'error') cb.log(`${m.level || 'error'}: ${m.message}`, m.level === 'warn' || m.level === 'info' ? 'warn' : 'bad');
      else if (m.type === 'watchdog') cb.log(`워치독: ${m.action} (하트비트 공백 ${m.gap_ms} ms)`, 'warn');
      else if (m.type === 'estopped') cb.log(`비상정지됨 (${m.reason})`, 'bad');
      else if (m.type === 'result' && m.code) cb.log(`결과 code ${m.code}`, 'warn');
    };
    window.addEventListener('message', onMsg);
    const MODE_KEY = { 1: 'up', 3: 'up', 0: 'up', 8: 'up', 6: 'up', 5: 'down', 7: 'damp', 10: 'sit', 2: 'hello' };
    function onSport(s) {
      if (!s) return;
      const e = sim.ext = sim.ext || {};
      const rpy = (s.imu_state && s.imu_state.rpy) || [0, 0, 0];
      const pos = s.position || [0, 0, 0], v = s.velocity || [0, 0, 0];
      const yaw = rpy[2], cy = Math.cos(yaw), sy = Math.sin(yaw);
      if (!link.origin0) link.origin0 = { x: pos[0], y: pos[1] };                   // MuJoCo 원점 → 방 안 시작점
      e.x = pos[0] - link.origin0.x; e.y = pos[1] - link.origin0.y; e.yaw = yaw;
      e.vx = v[0] * cy + v[1] * sy; e.vy = -v[0] * sy + v[1] * cy; e.wz = +s.yaw_speed || 0;
      e.h = +s.body_height || pos[2] || STAND_H; e.pitch = -(rpy[1] || 0);
      e.mode = s.mode; e.modeKey = MODE_KEY[s.mode] || 'up';
      e.at = performance.now();
    }
    function onLow(s) {
      if (!s || !Array.isArray(s.motor_state) || s.motor_state.length < 12) return;
      const e = sim.ext = sim.ext || { at: 0 };
      const q = {};
      LEGS.forEach((l, i) => { q[l] = [0, 1, 2].map(j => +s.motor_state[i * 3 + j].q || 0); });
      e.q = q; e.lowAt = performance.now();
    }
    // 하트비트 150 ms (워치독: 500 ms 없으면 StopMove) + /cmd_vel → Move ~10 Hz
    const hb = setInterval(() => {
      if (!box.isConnected || !sim.node.alive) { link.close(); return; }
      send({ type: 'heartbeat' });
    }, 150);
    const mv = setInterval(() => {
      if (!link.connected) return;
      const c = sim.cmd, fresh = !sim.timedOut;
      const moving = fresh && Math.abs(c.vx) + Math.abs(c.vy) + Math.abs(c.wz) > 1e-3;
      if (moving) { link.lastMove = [c.vx, c.vy, c.wz]; send({ id: id++, type: 'call', api: 'sport', method: 'Move', args: [+c.vx.toFixed(3), +c.vy.toFixed(3), +c.wz.toFixed(3)] }); cb.moving(link.lastMove); }
      else if (link.lastMove) { link.lastMove = null; link.sport('StopMove'); cb.moving(null); }
      if (sim.ext && sim.ext.lowAt && performance.now() - sim.ext.lowAt > 1500) sim.ext.q = null;
    }, 100);
    const slow = setTimeout(() => { if (!link.connected && !link.closed) cb.status('wait', '아직 불러오는 중입니다 — 첫 실행은 물리 엔진(WASM)과 로봇 모델(약 10 MB)을 내려받아 시간이 걸립니다. 준비되면 자동으로 연결됩니다.'); }, 10000);
    link.close = () => {
      if (link.closed) return;
      if (link.connected) send({ id: id++, type: 'call', api: 'sport', method: 'StopMove', args: [] });
      link.closed = true; link.connected = false;
      clearInterval(hb); clearInterval(mv); clearTimeout(slow); clearTimeout(link.standTimer);
      window.removeEventListener('message', onMsg);
      iframe.remove();
      if (sim.link === link) sim.link = null;
      sim.ext = null;
    };
    cb.status('wait', 'MuJoCo 시뮬레이터 불러오는 중…');
    return link;
  }

  /* ================================================== 화면 (위젯 · 창 공용) */
  const PAD = [['↖', 1, 0, 1], ['↑', 1, 0, 0], ['↗', 1, 0, -1], ['←', 0, 0, 1], ['■', 0, 0, 0], ['→', 0, 0, -1], ['⇠', 0, 1, 0], ['↓', -1, 0, 0], ['⇢', 0, -1, 0]];
  const REAL_CMDS = `# ① 이 페이지의 /go2_driver 를 터미널에서 (실제 ROS 2 와 같은 명령)
ros2 topic pub -r 10 /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.3}, angular: {z: 0.5}}"
ros2 service call /go2/stand_down std_srvs/srv/Trigger
ros2 service call /go2/stand_up std_srvs/srv/Trigger
ros2 topic echo /sportmodestate --once
ros2 topic hz /joint_states          # 12 관절: FL/FR/RL/RR × hip/thigh/calf
ros2 run tf2_ros tf2_echo odom base_link

# ② 실제 Go2 + unitree_ros2 (Humble, CycloneDDS 0.10.x)
source ~/unitree_ros2/setup.sh       # RMW_IMPLEMENTATION=rmw_cyclonedds_cpp + CYCLONEDDS_URI(유선 인터페이스)
ros2 topic list                      # /sportmodestate /lowstate /lowcmd /api/sport/request /utlidar/cloud …
ros2 topic echo /lf/sportmodestate --once
# 실물에는 /cmd_vel 이 없습니다. 고수준 명령은 unitree_api/msg/Request 를 /api/sport/request 로:
ros2 topic pub --once /api/sport/request unitree_api/msg/Request \\
  "{header: {identity: {api_id: 1008}}, parameter: '{\\"x\\": 0.3, \\"y\\": 0.0, \\"z\\": 0.0}'}"   # Move
ros2 topic pub --once /api/sport/request unitree_api/msg/Request "{header: {identity: {api_id: 1005}}}"   # StandDown
#   (이 페이지의 /go2_driver 도 /api/sport/request 를 받으므로 위 명령을 여기 터미널에서도 시험할 수 있습니다)

# ③ /cmd_vel 로 쓰고 싶다면: cmd_vel → Request 변환 노드를 두거나, 커뮤니티 드라이버 go2_ros2_sdk 사용
#    (Nav2 · teleop_twist_keyboard 가 그대로 붙습니다. 실물 속도 제한 · 비상정지는 노드 안에서 직접!)
ros2 run teleop_twist_keyboard teleop_twist_keyboard`;

  function go2View(el, opts) {
    opts = opts || {};
    const owner = opts.owner || el;
    const slide = !!el.closest('.slide');
    const root = document.createElement('div');
    root.className = 'wg2' + (opts.inWindow ? ' wg2-win' : '');
    root.tabIndex = 0;
    const allowedMj = (() => { try { return new URL(opts.simurl || SIM_URL, location.href).origin === location.origin; } catch (_) { return false; } })();
    root.innerHTML = `
      <div class="wg2-stage">
        <div class="wg2-pane"><canvas class="wg2-cv-top"></canvas><span class="wg2-cap">위에서 본 방 · odom</span></div>
        <div class="wg2-pane wg2-pside"><canvas class="wg2-cv-side"></canvas><span class="wg2-cap">오른쪽에서 본 다리 · 12 관절</span></div>
        <div class="wg2-dead" hidden><div>⚠ <b>/go2_driver</b> 노드가 종료되었습니다.</div><button class="btn small primary" data-a="restart">드라이버 다시 시작</button></div>
      </div>
      <div class="wg2-mjwrap" hidden>
        <div class="wg2-mjbar"><span class="wg2-dot"></span><span class="wg2-mjst small">—</span><span class="spacer"></span><button class="btn tiny" data-a="estop" title="Damp — 모든 관절 힘 빼기">🛑 비상정지</button></div>
        <div class="wg2-mjbox"></div>
        <div class="wg2-mjlog"></div>
      </div>
      <div class="wg2-ctrl">
        <div class="wg2-padwrap">
          <div class="wg2-pad">${PAD.map((p, i) => `<button class="wg2-k${i === 4 ? ' stop' : ''}" data-i="${i}" title="${['앞+왼쪽 회전', '앞으로', '앞+오른쪽 회전', '왼쪽 회전', '정지', '오른쪽 회전', '왼쪽 옆걸음', '뒤로', '오른쪽 옆걸음'][i]}">${p[0]}</button>`).join('')}</div>
          <div class="wg2-keys small muted">클릭 후 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>/화살표 · <kbd>Q</kbd><kbd>E</kbd> 옆걸음 · <kbd>Space</kbd> 정지</div>
        </div>
        <div class="wg2-right">
          <div class="wg2-modes">
            <button class="btn small" data-srv="/go2/stand_up">🧍 일어서기</button>
            <button class="btn small" data-srv="/go2/stand_down">🛏 엎드리기</button>
            <button class="btn small" data-srv="/go2/sit">🪑 앉기</button>
            <button class="btn small" data-srv="/go2/hello">👋 인사</button>
          </div>
          <div class="wg2-row">
            <label>속도 <input type="range" min="0.1" max="1" step="0.05" value="0.5" class="wg2-spd"><b class="wg2-spdv w-out">0.50</b></label>
            <label title="Go2 머리의 Unitree L1 4D LiDAR 를 수평 단면(2D)으로 흉내 낸 /scan"><input type="checkbox" class="wg2-scan"> /scan <span class="muted small">(L1 LiDAR 2D 단면)</span></label>
          </div>
          <div class="wg2-stat w-out"></div>
        </div>
      </div>
      <div class="wg2-mjctl">
        <button class="btn small wg2-mjbtn">🦾 MuJoCo 실사 시뮬레이터 연동</button>
        <a class="btn small ghost" href="${COURSE_URL}" target="_blank" rel="noopener">🐕 Go2 강좌</a>
        <a class="btn small ghost" href="${PLAY_URL}" target="_blank" rel="noopener">🐍 Python Playground</a>
        ${opts.inWindow ? '' : RosUI.popoutBtn('go2', {})}
      </div>
      <div class="wg2-note" hidden></div>
      <div class="wg2-log w-out"></div>
      <details class="wg2-det"><summary>실제 ROS 2 명령으로는? (터미널 · unitree_ros2 · /api/sport/request)</summary>
        <pre class="wg2-pre">${esc(REAL_CMDS)}</pre>
        <div class="w-help">실물 Go2 의 내부 통신은 <b>CycloneDDS</b> 입니다. DDS 토픽 <code>rt/sportmodestate</code> 는 ROS 2 에서 <code>/sportmodestate</code> 로 보이고,
        <code>unitree_go</code> · <code>unitree_api</code> 메시지 패키지를 빌드해야 <code>ros2 topic echo</code> 로 읽을 수 있습니다. 머리의 <b>Unitree L1 4D LiDAR</b> 는 <code>/utlidar/cloud</code>
        (<code>sensor_msgs/msg/PointCloud2</code>) 로 나옵니다 — 이 시뮬레이터의 <code>/scan</code> 은 그 수평 단면만 흉내 낸 것입니다.</div>
      </details>`;
    el.appendChild(root);
    const $ = s => root.querySelector(s);
    const cvTop = $('.wg2-cv-top'), cvSide = $('.wg2-cv-side');
    const logEl = $('.wg2-log'), statEl = $('.wg2-stat');
    const logLines = [];
    const addLog = (line, cls) => { logLines.push(`<div class="${cls || ''}">${esc(line)}</div>`); while (logLines.length > (slide ? 2 : 4)) logLines.shift(); logEl.innerHTML = logLines.join(''); };

    /* ---- 드라이버 찾기/만들기 */
    let sim = null, own = false, logOff = null;
    function attach() {
      sim = opts.sim ? findSim(opts.sim) : null;
      if (!sim && opts.attach !== '0') sim = findSim('/go2_driver');
      own = false;
      if (!sim) {
        const n = ROS.createNode('go2_driver', { owner, pkg: 'go2_sim', exe: 'go2_driver', out: (l, lv) => addLog(l, lv === 'WARN' || lv === 'ERROR' ? 'warn' : '') });
        sim = createGo2Sim(n, { scan: opts.scan !== '0' });
        own = true;
      } else addLog(`기존 ${sim.node.fqn} 노드에 연결했습니다`);
      if (logOff) logOff();
      logOff = own ? null : ROS.on('log', ({ node, line, level }) => { if (sim && node === sim.node.fqn) addLog(line, level === 'WARN' || level === 'ERROR' ? 'warn' : ''); });
      $('.wg2-scan').checked = !!sim.node.getParameter('publish_scan');
      $('.wg2-dead').hidden = true;
    }
    attach();

    /* ---- 텔레옵 노드: 누르고 있는 동안 10 Hz 로 /cmd_vel 발행 */
    const tele = ROS.createNode('go2_teleop', { owner, pkg: 'go2_sim', exe: 'go2_teleop' });
    const pubCmd = tele.createPublisher('geometry_msgs/msg/Twist', '/cmd_vel', 10);
    const clients = {};
    ['/go2/stand_up', '/go2/stand_down', '/go2/sit', '/go2/hello'].forEach(s => { clients[s] = tele.createClient('std_srvs/srv/Trigger', s); });
    let held = null, keysDown = new Set(), sentZero = true;
    const speed = () => +$('.wg2-spd').value;
    function currentCmd() {
      if (held) return held;
      if (!keysDown.size) return null;
      let vx = 0, vy = 0, wz = 0;
      keysDown.forEach(k => { if (k === 'w' || k === 'arrowup') vx += 1; if (k === 's' || k === 'arrowdown') vx -= 1; if (k === 'a' || k === 'arrowleft') wz += 1; if (k === 'd' || k === 'arrowright') wz -= 1; if (k === 'q') vy += 1; if (k === 'e') vy -= 1; });
      return [vx, vy, wz];
    }
    function sendCmd() {
      const c = currentCmd();
      const lim = sim && sim.link && sim.link.connected ? sim.link.limits : { vx: 1.0, vy: 0.6, vyaw: 1.5 };
      if (c && (c[0] || c[1] || c[2])) {
        pubCmd.publish({ linear: { x: c[0] * speed() * lim.vx, y: c[1] * speed() * lim.vy, z: 0 }, angular: { x: 0, y: 0, z: c[2] * speed() * lim.vyaw } });
        sentZero = false;
      } else if (!sentZero) { pubCmd.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }); sentZero = true; }
    }
    tele.createTimer(0.1, sendCmd);
    root.querySelectorAll('.wg2-k').forEach(b => {
      const p = PAD[+b.dataset.i];
      const down = e => { e.preventDefault(); root.focus({ preventScroll: true }); held = p[1] || p[2] || p[3] ? [p[1], p[2], p[3]] : null; b.classList.add('on'); sendCmd(); };
      const up = () => { if (!b.classList.contains('on')) return; held = null; b.classList.remove('on'); sendCmd(); };
      b.addEventListener('pointerdown', down); b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
    });
    const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    root.addEventListener('keydown', e => {
      if (e.target.closest('input,textarea,select')) return;
      const k = e.key.toLowerCase();
      if (KEYS.has(k)) { e.preventDefault(); if (!keysDown.has(k)) { keysDown.add(k); sendCmd(); } }
      else if (k === ' ') { e.preventDefault(); keysDown.clear(); held = null; sendCmd(); }
    });
    root.addEventListener('keyup', e => { const k = e.key.toLowerCase(); if (keysDown.delete(k)) sendCmd(); });
    root.addEventListener('blur', () => { keysDown.clear(); held = null; });
    root.addEventListener('pointerdown', e => { if (!e.target.closest('input,button,a,summary,pre,iframe')) root.focus({ preventScroll: true }); });

    root.querySelectorAll('[data-srv]').forEach(b => b.onclick = async () => {
      const s = b.dataset.srv;
      try { const r = await clients[s].call({}); addLog(`ros2 service call ${s} → success=${r.success}: ${r.message}`, r.success ? 'ok' : 'warn'); }
      catch (e) { addLog(`${s}: ${e.message}`, 'warn'); }
    });
    $('.wg2-spd').oninput = () => { $('.wg2-spdv').textContent = speed().toFixed(2); };
    $('.wg2-scan').onchange = e => { if (sim) sim.node.setParameters([{ name: 'publish_scan', value: e.target.checked }]); };
    $('[data-a=restart]').onclick = () => attach();

    /* ---- MuJoCo 연동 */
    const mjWrap = $('.wg2-mjwrap'), mjBtn = $('.wg2-mjbtn'), note = $('.wg2-note');
    const mjLog = [];
    let link = null;
    const cbs = {
      status(kind, text) { $('.wg2-dot').className = 'wg2-dot ' + kind; $('.wg2-mjst').textContent = text; },
      log(text, cls) { mjLog.push(`<div class="${cls || ''}">${esc(text)}</div>`); while (mjLog.length > 3) mjLog.shift(); $('.wg2-mjlog').innerHTML = mjLog.join(''); },
      moving() {}
    };
    function mjOn() {
      if (!allowedMj) {
        note.hidden = false;
        note.innerHTML = `<b>ℹ MuJoCo 연동은 배포된 사이트(<code>${GO2_ORIGIN}</code>)에서 동작합니다.</b><br>
          studyGo2 시뮬레이터는 보안을 위해 <b>같은 출처(same-origin)</b> 의 페이지가 보낸 <code>postMessage</code> 만 받습니다. 지금 페이지의 출처는 <code>${esc(location.origin)}</code> 이라 연결할 수 없습니다
          (다른 탭과 이어 주는 <code>BroadcastChannel('studygo2-sim')</code> 도 같은 출처 전용입니다).<br>
          시뮬레이터만 따로 보려면: <a href="${SIM_TAB}" target="_blank" rel="noopener">studyGo2 시뮬레이터 새 탭으로 열기 ↗</a>`;
        mjBtn.classList.toggle('on');
        if (!mjBtn.classList.contains('on')) note.hidden = true;
        return;
      }
      if (link) return;
      mjWrap.hidden = false; mjBtn.classList.add('on'); mjBtn.textContent = '🦾 MuJoCo 연동 끄기';
      link = sim.link = createLink(sim, $('.wg2-mjbox'), opts.simurl || SIM_URL, cbs);
      addLog('MuJoCo 연동: /cmd_vel → sport.Move, /go2/* 서비스 → StandUp/StandDown/Sit/Hello 로 전달합니다');
    }
    function mjOff() { if (link) link.close(); link = null; mjWrap.hidden = true; mjBtn.classList.remove('on'); mjBtn.textContent = '🦾 MuJoCo 실사 시뮬레이터 연동'; }
    mjBtn.onclick = () => (link ? mjOff() : mjOn());
    $('[data-a=estop]').onclick = () => { if (link) link.estop(); if (sim) sim.command('Damp'); };
    if (opts.mujoco === '1' || opts.mujoco === 1) mjOn();

    /* ---- 그리기 */
    function drawTop(C) {
      const { w, h, ctx } = RosUI.fitCanvas(cvTop);
      const m = 0.25, W = ROOM.x1 - ROOM.x0 + 2 * m, H = ROOM.y1 - ROOM.y0 + 2 * m;
      const s = Math.min(w / W, h / H), ox = (w - W * s) / 2, oy = (h - H * s) / 2;
      const X = x => ox + (x - ROOM.x0 + m) * s, Y = y => oy + (ROOM.y1 + m - y) * s;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.card2; ctx.fillRect(X(ROOM.x0), Y(ROOM.y1), (ROOM.x1 - ROOM.x0) * s, (ROOM.y1 - ROOM.y0) * s);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.ceil(ROOM.x0); x <= ROOM.x1; x++) { ctx.moveTo(X(x), Y(ROOM.y0)); ctx.lineTo(X(x), Y(ROOM.y1)); }
      for (let y = Math.ceil(ROOM.y0); y <= ROOM.y1; y++) { ctx.moveTo(X(ROOM.x0), Y(y)); ctx.lineTo(X(ROOM.x1), Y(y)); }
      ctx.stroke();
      // odom 원점 축
      ctx.lineWidth = 2; ctx.strokeStyle = C.red; ctx.fillStyle = C.red; RosUI.arrow(ctx, X(0), Y(0), X(0.6), Y(0), 6);
      ctx.strokeStyle = C.green; ctx.fillStyle = C.green; RosUI.arrow(ctx, X(0), Y(0), X(0), Y(0.6), 6);
      ctx.fillStyle = C.muted; ctx.font = '10px sans-serif'; ctx.fillText('odom', X(0) + 3, Y(0) + 12);
      ctx.strokeStyle = C.fg; ctx.lineWidth = 3; ctx.strokeRect(X(ROOM.x0), Y(ROOM.y1), (ROOM.x1 - ROOM.x0) * s, (ROOM.y1 - ROOM.y0) * s);
      ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
      BOXES.forEach(b => { ctx.fillStyle = C.gray; ctx.globalAlpha = 0.55; ctx.fillRect(X(b.x0), Y(b.y1), (b.x1 - b.x0) * s, (b.y1 - b.y0) * s); ctx.globalAlpha = 1; ctx.fillStyle = C.fg; ctx.fillText(b.label, X((b.x0 + b.x1) / 2), Y((b.y0 + b.y1) / 2) + 4); });
      CIRCLES.forEach(c => { ctx.fillStyle = C.gray; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), c.r * s, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = C.fg; ctx.fillText(c.label, X(c.x), Y(c.y) + 4); });
      ctx.textAlign = 'left';
      if (!sim) return;
      // 궤적
      if (sim.trail.length > 1) { ctx.strokeStyle = C.accent; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); sim.trail.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)))); ctx.lineTo(X(sim.x), Y(sim.y)); ctx.stroke(); ctx.globalAlpha = 1; }
      // LiDAR
      const sc = sim.scan;
      if (sc && sim.node.getParameter('publish_scan')) {
        ctx.strokeStyle = C.red; ctx.globalAlpha = 0.07; ctx.lineWidth = 1; ctx.beginPath();
        const pts = [];
        for (let i = 0; i < sc.N; i++) { const r = sc.ranges[i]; const a = sc.yaw - Math.PI + i * 2 * Math.PI / sc.N; const rr = Number.isFinite(r) ? r : 8; const px = sc.lx + rr * Math.cos(a), py = sc.ly + rr * Math.sin(a); if (i % 2 === 0) { ctx.moveTo(X(sc.lx), Y(sc.ly)); ctx.lineTo(X(px), Y(py)); } if (Number.isFinite(r)) pts.push([px, py]); }
        ctx.stroke(); ctx.globalAlpha = 1; ctx.fillStyle = C.red;
        pts.forEach(([x, y]) => ctx.fillRect(X(x) - 1.5, Y(y) - 1.5, 3, 3));
      }
      // 로봇
      const cy = Math.cos(sim.yaw), sy = Math.sin(sim.yaw);
      const P = (bx, by) => [X(sim.x + bx * cy - by * sy), Y(sim.y + bx * sy + by * cy)];
      const poly = (pts, fill, stroke) => { ctx.beginPath(); pts.forEach((p, i) => { const [a, b] = P(p[0], p[1]); i ? ctx.lineTo(a, b) : ctx.moveTo(a, b); }); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); } };
      LEGS.forEach(l => {
        const [hx, hy] = HIP[l]; const q = sim.q[l];
        const f = fk(q[1], q[2]); const side = hy > 0 ? 1 : -1;
        const fx = hx + f[2] * 1, fy = hy + side * LAT + Math.sin(q[0]) * f[3];
        const [a, b] = P(hx, hy + side * LAT), [c, d] = P(fx, fy);
        ctx.strokeStyle = C.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.stroke();
        ctx.fillStyle = sim.lift[l] > 0.01 ? C.orange : C.blue; ctx.beginPath(); ctx.arc(c, d, Math.max(2.5, 0.035 * s), 0, 7); ctx.fill();
      });
      poly([[0.24, 0.095], [0.24, -0.095], [-0.24, -0.095], [-0.24, 0.095]], C.dark ? '#3a4454' : '#d7dde6', C.fg);
      poly([[0.24, 0.07], [0.33, 0.05], [0.33, -0.05], [0.24, -0.07]], C.fg, null);
      const [lx, ly] = P(0.28, 0); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(lx, ly, 3, 0, 7); ctx.fill();
      // 명령 속도 화살표
      const c = sim.cmd; if (!sim.timedOut && Math.abs(c.vx) + Math.abs(c.vy) > 0.01) {
        const [a, b] = P(0, 0), [e, f] = P(c.vx * 1.2, c.vy * 1.2);
        ctx.strokeStyle = C.green; ctx.fillStyle = C.green; ctx.lineWidth = 2.5; RosUI.arrow(ctx, a, b, e, f, 7);
      }
      if (!sim.timedOut && Math.abs(c.wz) > 0.02) { const [a, b] = P(0, 0); ctx.strokeStyle = C.green; ctx.lineWidth = 2; ctx.beginPath(); const r = 0.42 * s, a0 = -sim.yaw; if (c.wz > 0) ctx.arc(a, b, r, a0 - 0.2, a0 - 0.2 - c.wz * 0.9, true); else ctx.arc(a, b, r, a0 + 0.2, a0 + 0.2 - c.wz * 0.9); ctx.stroke(); }
      ctx.fillStyle = C.muted; ctx.font = '11px ' + 'monospace';
      ctx.fillText(`x ${sim.x.toFixed(2)}  y ${sim.y.toFixed(2)}  θ ${M.deg(sim.yaw).toFixed(0)}°`, 6, h - 6);
    }
    function drawSide(C) {
      const { w, h, ctx } = RosUI.fitCanvas(cvSide);
      ctx.clearRect(0, 0, w, h);
      const gy = h - 22, s = Math.min(w / 0.95, (gy - 26) / 0.5), cx = w / 2;
      ctx.fillStyle = C.card2; ctx.fillRect(0, gy, w, h - gy);
      ctx.strokeStyle = C.muted; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
      // 땅 무늬 (걸을 때 흘러감)
      const off = ((sim ? sim.x * Math.cos(sim.yaw) + sim.y * Math.sin(sim.yaw) : 0) * s) % 20;
      ctx.strokeStyle = C.line; ctx.beginPath(); for (let x = -off; x < w + 20; x += 20) { ctx.moveTo(x, gy + 2); ctx.lineTo(x - 8, gy + 10); } ctx.stroke();
      if (!sim) return;
      const p = sim.pitch, c = Math.cos(p), sn = Math.sin(p);
      const W = (bx, bz) => [cx + (bx * c - bz * sn) * s, gy - (sim.h + bx * sn + bz * c) * s];
      const leg = (l, near) => {
        const hx = HIP[l][0], q = sim.q[l];
        const f = fk(q[1], q[2]);
        const H = W(hx, 0), K = W(hx + f[0], -f[1]), F = W(hx + f[2], -f[3]);
        ctx.globalAlpha = near ? 1 : 0.35;
        ctx.lineCap = 'round';
        ctx.strokeStyle = near ? C.blue : C.gray; ctx.lineWidth = near ? 7 : 5; ctx.beginPath(); ctx.moveTo(H[0], H[1]); ctx.lineTo(K[0], K[1]); ctx.stroke();
        ctx.strokeStyle = near ? C.teal : C.gray; ctx.lineWidth = near ? 5 : 4; ctx.beginPath(); ctx.moveTo(K[0], K[1]); ctx.lineTo(F[0], F[1]); ctx.stroke();
        ctx.fillStyle = C.purple; ctx.beginPath(); ctx.arc(H[0], H[1], near ? 5 : 4, 0, 7); ctx.fill();
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(K[0], K[1], near ? 4.5 : 3.5, 0, 7); ctx.fill();
        ctx.fillStyle = sim.lift[l] > 0.01 || F[1] < gy - 4 ? C.orange : C.fg; ctx.beginPath(); ctx.arc(F[0], F[1], near ? 4.5 : 3.5, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        return { H, K, F };
      };
      leg('FL', false); leg('RL', false);
      // 몸통
      const body = [[-0.25, -0.045], [0.25, -0.045], [0.25, 0.06], [-0.25, 0.06]].map(([a, b]) => W(a, b));
      ctx.fillStyle = C.dark ? '#3a4454' : '#d7dde6'; ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5;
      ctx.beginPath(); body.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.closePath(); ctx.fill(); ctx.stroke();
      const head = [[0.25, -0.035], [0.33, -0.02], [0.33, 0.05], [0.25, 0.06]].map(([a, b]) => W(a, b));
      ctx.fillStyle = C.fg; ctx.beginPath(); head.forEach((pt, i) => (i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]))); ctx.closePath(); ctx.fill();
      const Ld = W(0.3, 0.075); ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(Ld[0], Ld[1], 3.5, 0, 7); ctx.fill();
      const fr = leg('FR', true); leg('RR', true);
      // 라벨
      ctx.font = '10.5px sans-serif'; ctx.fillStyle = C.muted;
      ctx.fillText('L1 LiDAR', Ld[0] - 16, Ld[1] - 7);
      ctx.fillStyle = C.purple; ctx.fillText('hip·thigh', fr.H[0] + 7, fr.H[1] - 3);
      ctx.fillStyle = C.orange; ctx.fillText('calf', fr.K[0] + 7, fr.K[1] + 3);
      // 관절 값
      ctx.font = '10px monospace'; ctx.fillStyle = C.muted;
      const rows = LEGS.map(l => `${l} ${sim.q[l].map(v => (v >= 0 ? ' ' : '') + v.toFixed(2)).join(' ')}`);
      if (h > 170) { ctx.fillText('     hip  thigh  calf', 6, 13); rows.forEach((r, i) => ctx.fillText(r, 6, 25 + i * 11)); }
      const mc = sim.modeCode();
      ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right'; ctx.fillStyle = C.accent;
      ctx.fillText(`mode ${mc} · ${MODE_NAME[mc] || ''}`, w - 6, 14); ctx.textAlign = 'left';
    }
    let statT = 0;
    const stopLoop = RosUI.loop(root, (dt) => {
      if (sim && !sim.node.alive) { $('.wg2-dead').hidden = false; if (link) mjOff(); sim = null; }
      const C = RosUI.colors();
      drawTop(C); drawSide(C);
      statT += dt;
      if (statT > 0.2 && sim) {
        statT = 0;
        const hz = ROS.hz('/cmd_vel');
        statEl.innerHTML = `<span>모드 <b>${MODE_KO[sim.mode === 'up' && sim.amp > 0.05 ? 'walk' : sim.mode]}</b></span>` +
          `<span>v <b>${sim.vx.toFixed(2)}</b>, <b>${sim.vy.toFixed(2)}</b> m/s · ω <b>${sim.wz.toFixed(2)}</b></span>` +
          `<span>/cmd_vel <b>${hz ? hz.toFixed(0) + ' Hz' : sim.timedOut ? '— (정지)' : '…'}</b>${sim.clamped ? ' <em class="warn">제한됨</em>' : ''}</span>` +
          (sim.link && sim.link.connected ? '<span class="ok">● MuJoCo</span>' : '');
      }
    });
    return () => { stopLoop(); if (link) mjOff(); if (logOff) logOff(); tele.destroy(); if (own && sim) sim.node.destroy(); };
  }

  RosUI.registerView('go2', go2View, { title: 'Unitree Go2 — go2_sim', icon: '🐕', w: 920, h: 700 });
  Widgets.register('go2', (el, o) => {
    const body = RosUI.frame(el, '🐕', 'Unitree Go2 + ROS 2 — 4족 보행 시뮬레이터');
    return go2View(body, Object.assign({}, o, { owner: el }));
  }, { title: 'Unitree Go2 + ROS 2' });

  /* ================================================== 패키지 go2_sim */
  ROS.registerPkg('go2_sim', {
    desc: 'Unitree Go2 4족 보행 로봇 시뮬레이터 (/cmd_vel → 트롯 보행, /odom /joint_states /imu /sportmodestate /scan)',
    exes: {
      go2_driver(ctx) {
        const n = ctx.node('go2_driver');
        const sim = createGo2Sim(n, { scan: ctx.args.params.publish_scan !== false });
        if (!ctx.argv.includes('--headless')) ctx.openView('go2', { sim: n.fqn }, { title: 'Go2 — ' + n.fqn });
        return { nodes: [n], stop() { if (sim.link) sim.link.close(); } };
      }
    },
    launch: {
      'go2.launch.py'(ctx) {
        const argv = ['--ros-args'];
        if (ctx.largs.publish_scan != null) argv.push('-p', 'publish_scan:=' + ctx.largs.publish_scan);
        if (ctx.largs.max_vx != null) argv.push('-p', 'max_vx:=' + ctx.largs.max_vx);
        return ROS.runMany(ctx, [['go2_sim', 'go2_driver', argv.length > 1 ? argv : []]]);
      }
    },
    files: {
      'launch/go2.launch.py': `from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        DeclareLaunchArgument('publish_scan', default_value='true'),
        DeclareLaunchArgument('max_vx', default_value='1.0'),
        Node(
            package='go2_sim',
            executable='go2_driver',
            name='go2_driver',
            output='screen',
            parameters=[{
                'publish_scan': LaunchConfiguration('publish_scan'),
                'max_vx': LaunchConfiguration('max_vx'),
                'max_vy': 0.6,
                'max_vyaw': 1.5,
                'cmd_timeout': 0.5,
            }],
        ),
    ])
`
    }
  });

  // 테스트용 (node 에서 순수 로직 확인)
  ROS._go2 = { ik, fk, legIK, raycast, collides, JOINT_NAMES, API };
})();
