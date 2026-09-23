/* ===================================================================
   모바일 로봇 (webbot) — Gazebo-lite 시뮬레이터 · slam_toolbox-lite · Nav2-lite
   위젯: bot (차동 구동 로봇 시뮬레이터), odom (오도메트리 드리프트 실험)
   보기: bot   패키지: webbot_sim, slam_toolbox, nav2_bringup, nav2_map_server
   다른 파일(rviz.js)이 쓸 수 있게 ROS.webbot 으로 내보냅니다.
   =================================================================== */
(function () {
  'use strict';
  if (!window.ROS || !window.RosUI) return;
  const M = ROS.math;
  const IF = window.ROS_IFACES || (window.ROS_IFACES = {});
  const quiet = () => {};
  const SQ2 = Math.SQRT2;

  /* ================================================== 추가 인터페이스 */
  const addIf = (k, v) => { if (!IF[k]) IF[k] = v; };
  addIf('nav2_msgs/action/Spin', `float32 target_yaw
builtin_interfaces/Duration time_allowance
---
builtin_interfaces/Duration total_elapsed_time
---
float32 angular_distance_traveled`);
  addIf('nav2_msgs/action/BackUp', `geometry_msgs/Point target
float32 speed
builtin_interfaces/Duration time_allowance
---
builtin_interfaces/Duration total_elapsed_time
---
float32 distance_traveled`);
  addIf('nav2_msgs/srv/ClearEntireCostmap', `std_msgs/Empty request
---
std_msgs/Empty response`);
  addIf('slam_toolbox/srv/SaveMap', `std_msgs/String name
---
int8 RESULT_SUCCESS=0
int8 RESULT_NO_MAP_RECEIEVD=1
int8 RESULT_UNDEFINED_FAILURE=-1
int8 result`);
  addIf('slam_toolbox/srv/Reset', `bool pause_new_measurements
---
int8 RESULT_SUCCESS=0
int8 result`);

  /* ================================================== 공용 도우미 */
  const BOT = { radius: 0.105, wheelR: 0.033, wheelSep: 0.160, maxV: 0.5, maxW: 2.5, accV: 1.2, accW: 6.0, scanN: 360, rMin: 0.12, rMax: 3.5, scanX: -0.032, scanZ: 0.172 };
  function randn() { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  const hdr = f => ({ stamp: ROS.graph.now(), frame_id: f });
  const dur = s => ({ sec: Math.floor(Math.max(0, s)), nanosec: Math.floor((Math.max(0, s) % 1) * 1e9) });
  const durSec = d => d ? (+d.sec || 0) + (+d.nanosec || 0) / 1e9 : 0;
  const p2T = p => ({ t: { x: p.x, y: p.y, z: 0 }, q: M.yawToQ(p.th) });
  const T2p = T => ({ x: T.t.x, y: T.t.y, th: M.qToYaw(T.q) });
  const tfMsg = (parent, child, t, q) => ({ header: { stamp: ROS.graph.now(), frame_id: parent }, child_frame_id: child, transform: { translation: t, rotation: q } });
  function lookup(target, source) { try { return ROS.graph.tf.lookup(target, source); } catch (_) { return null; } }
  function lookupPose(target, source) { const T = lookup(target, source); return T ? T2p(T) : null; }
  function poseMsg(frame, p) { return { header: hdr(frame), pose: { position: { x: p.x, y: p.y, z: 0 }, orientation: M.yawToQ(p.th) } }; }
  function uniqueName(base) { if (!ROS.findNode('/' + base)) return base; let k = 2; while (ROS.findNode('/' + base + '_' + k)) k++; return base + '_' + k; }
  /** 이 노드가 발행한 TF 프레임을 노드가 사라질 때 버퍼에서 지운다 */
  function tfCleanup(n) {
    const prev = n.onDestroy;
    n.onDestroy = () => { try { prev && prev(); } catch (_) {} const fr = ROS.graph.tf.frames; Object.keys(fr).forEach(k => { if (fr[k].auth === n.fqn) delete fr[k]; }); };
  }
  function findWith(key) { const n = ROS.nodes().find(x => x.alive && x[key]); return n ? n[key] : null; }
  const findSim = () => findWith('webbot');
  const findSlam = () => findWith('webbotSlam');
  const findMapSrv = () => findWith('webbotMapSrv');
  const findAmcl = () => findWith('webbotAmcl');
  const findNav = () => findWith('webbotNav');

  /* ================================================== 세계 (world) */
  function walls(x0, y0, x1, y1) { const h = 0.05; return [[x0 - h, y0 - h, x1 + h, y0 + h], [x0 - h, y1 - h, x1 + h, y1 + h], [x0 - h, y0 - h, x0 + h, y1 + h], [x1 - h, y0 - h, x1 + h, y1 + h]]; }
  function seg(x0, y0, x1, y1, t) { t = t || 0.08; return [Math.min(x0, x1) - t / 2, Math.min(y0, y1) - t / 2, Math.max(x0, x1) + t / 2, Math.max(y0, y1) + t / 2]; }
  // 로봇은 항상 (0,0) 에서 +x 를 보고 출발 → world 좌표 = 처음 odom 좌표 = map 좌표
  const WORLDS = {
    room: {
      label: '방', desc: '6 × 4 m 거실 (탁자 · 소파 · 기둥 · 칸막이)', bounds: [-1.5, -2, 4.5, 2],
      boxes: [...walls(-1.5, -2, 4.5, 2), [1.2, 0.6, 1.9, 1.2], [3.3, 1.0, 4.45, 1.95], seg(2.3, -2, 2.3, -0.9, 0.1), [-1.45, 1.3, -0.8, 1.95]],
      circles: [[2.9, -0.1, 0.18], [0.9, -1.2, 0.15]],
      goal: [3.6, -1.3, 0]
    },
    maze: {
      label: '미로', desc: '5 × 4 칸 미로 (한 칸 1 m)', bounds: [-0.5, -0.5, 4.5, 3.5],
      boxes: [...walls(-0.5, -0.5, 4.5, 3.5), seg(0.5, -0.5, 0.5, 1.5), seg(0.5, 1.5, 2.5, 1.5), seg(2.5, -0.5, 2.5, 0.5), seg(3.5, 0.5, 4.5, 0.5), seg(3.5, 1.5, 3.5, 3.5), seg(-0.5, 2.5, 0.5, 2.5), seg(1.5, 2.5, 1.5, 3.5)],
      circles: [],
      goal: [4, 3, 1.57]
    },
    warehouse: {
      label: '창고', desc: '8 × 6 m 물류 창고 (선반 · 기둥 · 팔레트)', bounds: [-1, -3, 7, 3],
      boxes: [...walls(-1, -3, 7, 3), [1, 1.1, 3, 1.6], [4, 1.1, 6, 1.6], [1, -1.6, 3, -1.1], [4, -1.6, 6, -1.1], [0.6, 2.5, 6.2, 2.95], [0.6, -2.95, 6.2, -2.5], [-0.9, 1.8, -0.4, 2.4], [6.3, -0.5, 6.9, 0.1]],
      circles: [[3.5, 1.35, 0.15], [3.5, -1.35, 0.15], [5.2, 0.55, 0.12]],
      goal: [6.3, 2.0, 0]
    }
  };

  /* ---------------------------------------------- 광선 · 충돌 */
  function rayBox(ox, oy, dx, dy, b) {
    let t0 = -Infinity, t1 = Infinity;
    if (Math.abs(dx) < 1e-12) { if (ox < b[0] || ox > b[2]) return Infinity; } else { let a = (b[0] - ox) / dx, c = (b[2] - ox) / dx; if (a > c) { const t = a; a = c; c = t; } if (a > t0) t0 = a; if (c < t1) t1 = c; }
    if (Math.abs(dy) < 1e-12) { if (oy < b[1] || oy > b[3]) return Infinity; } else { let a = (b[1] - oy) / dy, c = (b[3] - oy) / dy; if (a > c) { const t = a; a = c; c = t; } if (a > t0) t0 = a; if (c < t1) t1 = c; }
    if (t1 < t0 || t1 < 0) return Infinity;
    return t0 >= 0 ? t0 : Infinity;
  }
  function rayCircle(ox, oy, dx, dy, c) {
    const fx = ox - c[0], fy = oy - c[1], b = fx * dx + fy * dy, cc = fx * fx + fy * fy - c[2] * c[2], disc = b * b - cc;
    if (disc < 0) return Infinity;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : Infinity;
  }
  function cast(ox, oy, dx, dy, boxes, circles, maxR) {
    let r = maxR;
    for (let i = 0; i < boxes.length; i++) { const t = rayBox(ox, oy, dx, dy, boxes[i]); if (t < r) r = t; }
    for (let i = 0; i < circles.length; i++) { const t = rayCircle(ox, oy, dx, dy, circles[i]); if (t < r) r = t; }
    return r;
  }
  function collides(x, y, rad, boxes, circles) {
    for (const b of boxes) { const cx = Math.max(b[0], Math.min(x, b[2])), cy = Math.max(b[1], Math.min(y, b[3])); if ((x - cx) ** 2 + (y - cy) ** 2 < rad * rad) return true; }
    for (const c of circles) { if ((x - c[0]) ** 2 + (y - c[1]) ** 2 < (rad + c[2]) ** 2) return true; }
    return false;
  }
  function pointIn(x, y, boxes, circles, pad) {
    for (const b of boxes) if (x >= b[0] - pad && x <= b[2] + pad && y >= b[1] - pad && y <= b[3] + pad) return true;
    for (const c of circles) if ((x - c[0]) ** 2 + (y - c[1]) ** 2 <= (c[2] + pad) ** 2) return true;
    return false;
  }

  /* ---------------------------------------------- 격자 지도 */
  function gridFor(world, margin, res) {
    res = res || 0.05; margin = margin == null ? 0.5 : margin;
    const [x0, y0, x1, y1] = world.bounds;
    const ox = +(x0 - margin).toFixed(3), oy = +(y0 - margin).toFixed(3);
    const W = Math.ceil((x1 - x0 + 2 * margin) / res), H = Math.ceil((y1 - y0 + 2 * margin) / res);
    return { res, ox, oy, W, H, data: new Int8Array(W * H).fill(-1) };
  }
  /** 세계의 정적 구조로 미리 만든 지도 (turtlebot3_world.yaml 같은 것) */
  function rasterize(world, extra) {
    const g = gridFor(world, 0.5);
    const boxes = world.boxes.concat(extra || []), [x0, y0, x1, y1] = world.bounds;
    for (let j = 0; j < g.H; j++) for (let i = 0; i < g.W; i++) {
      const x = g.ox + (i + 0.5) * g.res, y = g.oy + (j + 0.5) * g.res;
      let v = -1;
      if (pointIn(x, y, boxes, world.circles, g.res * 0.5)) v = 100;
      else if (x > x0 && x < x1 && y > y0 && y < y1) v = 0;
      g.data[j * g.W + i] = v;
    }
    return g;
  }
  function gridMsg(g, frame) {
    return { header: hdr(frame || 'map'), info: { map_load_time: ROS.graph.now(), resolution: g.res, width: g.W, height: g.H, origin: { position: { x: g.ox, y: g.oy, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } }, data: Array.from(g.data) };
  }
  function gridFromMsg(m) {
    const inf = m.info || {};
    return { res: +inf.resolution || 0.05, ox: inf.origin ? +inf.origin.position.x : 0, oy: inf.origin ? +inf.origin.position.y : 0, W: +inf.width | 0, H: +inf.height | 0, data: Int8Array.from(m.data || []), frame: (m.header && m.header.frame_id) || 'map' };
  }
  function cloneGrid(g) { return { res: g.res, ox: g.ox, oy: g.oy, W: g.W, H: g.H, data: Int8Array.from(g.data) }; }

  /* 저장된 지도 (map_saver_cli · 💾 지도 저장) — 브라우저 메모리 */
  const MAPS = {};
  function mapBase(p) { return String(p || 'map').replace(/^.*[\\/]/, '').replace(/\.(ya?ml|pgm)$/i, '') || 'map'; }
  function mapYaml(name, g) {
    return `image: ${name}.pgm\nmode: trinary\nresolution: ${g.res.toFixed(3)}\norigin: [${g.ox.toFixed(3)}, ${g.oy.toFixed(3)}, 0]\nnegate: 0\noccupied_thresh: 0.65\nfree_thresh: 0.25`;
  }
  function saveMap(path, g) {
    const name = mapBase(path);
    const sim = findSim();
    MAPS[name] = { name, grid: cloneGrid(g), world: sim ? sim.worldName : null, at: Date.now(), yaml: mapYaml(name, g), path: String(path || name) };
    return MAPS[name];
  }

  /* ================================================== robot_state_publisher (webbot URDF) */
  const URDF_JOINTS = [
    { name: 'base_joint', type: 'fixed', parent: 'base_footprint', child: 'base_link', xyz: [0, 0, 0.010], rpy: [0, 0, 0] },
    { name: 'wheel_left_joint', type: 'continuous', parent: 'base_link', child: 'wheel_left_link', xyz: [0, 0.08, 0.023], rpy: [-1.5708, 0, 0] },
    { name: 'wheel_right_joint', type: 'continuous', parent: 'base_link', child: 'wheel_right_link', xyz: [0, -0.08, 0.023], rpy: [-1.5708, 0, 0] },
    { name: 'caster_back_joint', type: 'fixed', parent: 'base_link', child: 'caster_back_link', xyz: [-0.081, 0, -0.004], rpy: [0, 0, 0] },
    { name: 'imu_joint', type: 'fixed', parent: 'base_link', child: 'imu_link', xyz: [-0.032, 0, 0.068], rpy: [0, 0, 0] },
    { name: 'scan_joint', type: 'fixed', parent: 'base_link', child: 'base_scan', xyz: [-0.032, 0, 0.172], rpy: [0, 0, 0] }
  ];
  const WEBBOT_URDF = `<?xml version="1.0" ?>
<robot name="webbot">
  <material name="body"><color rgba="0.23 0.42 0.80 1.0"/></material>
  <material name="dark"><color rgba="0.15 0.16 0.19 1.0"/></material>
  <material name="light"><color rgba="0.75 0.77 0.80 1.0"/></material>

  <link name="base_footprint"/>
  <joint name="base_joint" type="fixed">
    <parent link="base_footprint"/><child link="base_link"/>
    <origin xyz="0 0 0.010" rpy="0 0 0"/>
  </joint>
  <link name="base_link">
    <visual>
      <origin xyz="-0.032 0 0.060" rpy="0 0 0"/>
      <geometry><cylinder radius="0.100" length="0.090"/></geometry>
      <material name="body"/>
    </visual>
    <visual>
      <origin xyz="-0.032 0 0.125" rpy="0 0 0"/>
      <geometry><cylinder radius="0.090" length="0.010"/></geometry>
      <material name="light"/>
    </visual>
  </link>
  <joint name="wheel_left_joint" type="continuous">
    <parent link="base_link"/><child link="wheel_left_link"/>
    <origin xyz="0 0.08 0.023" rpy="-1.5708 0 0"/><axis xyz="0 0 1"/>
  </joint>
  <link name="wheel_left_link">
    <visual><geometry><cylinder radius="0.033" length="0.018"/></geometry><material name="dark"/></visual>
  </link>
  <joint name="wheel_right_joint" type="continuous">
    <parent link="base_link"/><child link="wheel_right_link"/>
    <origin xyz="0 -0.08 0.023" rpy="-1.5708 0 0"/><axis xyz="0 0 1"/>
  </joint>
  <link name="wheel_right_link">
    <visual><geometry><cylinder radius="0.033" length="0.018"/></geometry><material name="dark"/></visual>
  </link>
  <joint name="caster_back_joint" type="fixed">
    <parent link="base_link"/><child link="caster_back_link"/>
    <origin xyz="-0.081 0 -0.004" rpy="0 0 0"/>
  </joint>
  <link name="caster_back_link">
    <visual><geometry><sphere radius="0.012"/></geometry><material name="light"/></visual>
  </link>
  <joint name="imu_joint" type="fixed">
    <parent link="base_link"/><child link="imu_link"/>
    <origin xyz="-0.032 0 0.068" rpy="0 0 0"/>
  </joint>
  <link name="imu_link"/>
  <joint name="scan_joint" type="fixed">
    <parent link="base_link"/><child link="base_scan"/>
    <origin xyz="-0.032 0 0.172" rpy="0 0 0"/>
  </joint>
  <link name="base_scan">
    <visual>
      <origin xyz="0 0 -0.012" rpy="0 0 0"/>
      <geometry><cylinder radius="0.035" length="0.035"/></geometry>
      <material name="dark"/>
    </visual>
  </link>
</robot>`;
  function createRsp(o) {
    o = o || {};
    const n = ROS.createNode(o.name || 'robot_state_publisher', { owner: o.owner, out: o.out || quiet, pkg: 'robot_state_publisher', exe: 'robot_state_publisher' });
    n.declareParameter('robot_description', WEBBOT_URDF, { description: '로봇 모델 (URDF XML)' });
    n.declareParameter('publish_frequency', 20.0, { description: '움직이는 관절 TF 발행 주기 [Hz]' });
    ['base_footprint', 'base_link', 'caster_back_link', 'imu_link', 'base_scan', 'wheel_left_link', 'wheel_right_link'].forEach(l => n.info(`got segment ${l}`));
    const tfs = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static');
    const tf = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    tfCleanup(n);
    const jq = j => M.rpyToQ(j.rpy[0], j.rpy[1], j.rpy[2]);
    const jt = j => ({ x: j.xyz[0], y: j.xyz[1], z: j.xyz[2] });
    tfs.publish({ transforms: URDF_JOINTS.filter(j => j.type === 'fixed').map(j => tfMsg(j.parent, j.child, jt(j), jq(j))) });
    n.createSubscription('sensor_msgs/msg/JointState', 'joint_states', m => {
      const out = [];
      URDF_JOINTS.filter(j => j.type !== 'fixed').forEach(j => {
        const k = (m.name || []).indexOf(j.name); if (k < 0) return;
        const a = +(m.position || [])[k] || 0;
        out.push(tfMsg(j.parent, j.child, jt(j), M.qMul(jq(j), { x: 0, y: 0, z: Math.sin(a / 2), w: Math.cos(a / 2) })));
      });
      if (out.length) tf.publish({ transforms: out });
    }, 10);
    return n;
  }

  /* ================================================== 시뮬레이터 (/webbot) */
  function createSim(o) {
    o = o || {};
    const n = ROS.createNode(o.name || 'webbot', { owner: o.owner, out: o.out || quiet, remap: o.remap, params: o.params, namespace: o.ns, pkg: 'webbot_sim', exe: 'sim_node' });
    let wname = String(n.declareParameter('world', WORLDS[o.world] ? o.world : 'room', { description: '세계: room | maze | warehouse (바꾸면 로봇이 출발점으로 돌아갑니다)' }));
    if (!WORLDS[wname]) wname = 'room';
    n.declareParameter('odom_noise', 0.04, { description: '바퀴 엔코더 잡음 (이동량 대비 비율)' });
    n.declareParameter('wheel_bias', 0.003, { description: '왼쪽/오른쪽 바퀴 반지름 차이 (비율) — 방향이 조금씩 틀어집니다' });
    n.declareParameter('scan_noise', 0.01, { description: 'LiDAR 거리 잡음 표준편차 [m]' });
    const S = {
      node: n, worldName: wname, world: WORLDS[wname], extra: [],
      pose: { x: 0, y: 0, th: 0 }, odom: { x: 0, y: 0, th: 0 }, v: 0, w: 0, cmd: { v: 0, w: 0 }, cmdAt: 0,
      wheel: { l: 0, r: 0 }, wv: { l: 0, r: 0 }, scan: null, scanPose: null, bumped: false, bumpT: 0,
      trail: [], trailOdom: [], version: 0, tick: 0, dist: 0, created: performance.now()
    };
    const P = {
      odom: n.createPublisher('nav_msgs/msg/Odometry', 'odom', 10),
      tf: n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100),
      tfs: n.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static'),
      scan: n.createPublisher('sensor_msgs/msg/LaserScan', 'scan', 10),
      js: n.createPublisher('sensor_msgs/msg/JointState', 'joint_states', 10),
      imu: n.createPublisher('sensor_msgs/msg/Imu', 'imu', 10),
      gt: n.createPublisher('geometry_msgs/msg/PoseStamped', 'ground_truth', 10)
    };
    tfCleanup(n);
    n.createSubscription('geometry_msgs/msg/Twist', 'cmd_vel', m => {
      m = ROS.make('geometry_msgs/msg/Twist', m);
      S.cmd.v = M.clamp(+m.linear.x || 0, -BOT.maxV, BOT.maxV);
      S.cmd.w = M.clamp(+m.angular.z || 0, -BOT.maxW, BOT.maxW);
      S.cmdAt = performance.now();
    }, 10);
    n.createService('std_srvs/srv/Empty', 'reset_world', () => { S.reset(); n.info('세계를 처음 상태로 되돌렸습니다 (reset_world)'); return {}; });
    P.tfs.publish({ transforms: [
      tfMsg('base_footprint', 'base_link', { x: 0, y: 0, z: 0.010 }, { x: 0, y: 0, z: 0, w: 1 }),
      tfMsg('base_link', 'base_scan', { x: BOT.scanX, y: 0, z: BOT.scanZ }, { x: 0, y: 0, z: 0, w: 1 }),
      tfMsg('base_link', 'imu_link', { x: -0.032, y: 0, z: 0.068 }, { x: 0, y: 0, z: 0, w: 1 })
    ] });

    S.obstacles = () => ({ boxes: S.world.boxes.concat(S.extra), circles: S.world.circles });
    S.reset = () => {
      S.pose = { x: 0, y: 0, th: 0 }; S.odom = { x: 0, y: 0, th: 0 }; S.v = S.w = 0; S.cmd = { v: 0, w: 0 };
      S.wheel = { l: 0, r: 0 }; S.trail = []; S.trailOdom = []; S.dist = 0; S.bumped = false; S.resets = (S.resets || 0) + 1;
    };
    S.setWorld = name => {
      if (!WORLDS[name]) return false;
      S.worldName = name; S.world = WORLDS[name]; S.extra = []; S.reset(); S.version++;
      if (n.getParameter('world') !== name) { const p = n.params.get('world'); if (p) p.value = name; }
      n.info(`세계를 '${name}' (${WORLDS[name].desc}) 로 바꿨습니다`);
      return true;
    };
    S.toggleObstacle = (x, y) => {
      const k = S.extra.findIndex(b => x >= b[0] - 0.05 && x <= b[2] + 0.05 && y >= b[1] - 0.05 && y <= b[3] + 0.05);
      if (k >= 0) { S.extra.splice(k, 1); return 'removed'; }
      const b = [x - 0.15, y - 0.15, x + 0.15, y + 0.15];
      if (collides(S.pose.x, S.pose.y, BOT.radius + 0.02, [b], [])) return 'robot';
      S.extra.push(b); return 'added';
    };
    n.onSetParameters(list => {
      for (const p of list) if (p.name === 'world' && !WORLDS[p.value]) return { successful: false, reason: `알 수 없는 세계 '${p.value}' (room | maze | warehouse)` };
      return { successful: true };
    });
    const offParam = ROS.on('param', (node, name, value) => { if (node === n && name === 'world' && value !== S.worldName) S.setWorld(value); });
    const prevD = n.onDestroy; n.onDestroy = () => { offParam(); prevD && prevD(); };

    function doScan() {
      const p = S.pose, noise = +n.getParameter('scan_noise') || 0;
      const sx = p.x + BOT.scanX * Math.cos(p.th), sy = p.y + BOT.scanX * Math.sin(p.th);
      const N = BOT.scanN, inc = 2 * Math.PI / N, ranges = new Array(N);
      const { boxes, circles } = S.obstacles();
      for (let i = 0; i < N; i++) {
        const a = p.th + i * inc;
        let r = cast(sx, sy, Math.cos(a), Math.sin(a), boxes, circles, BOT.rMax + 0.5);
        if (r > BOT.rMax) r = Infinity;
        else { r = Math.max(BOT.rMin, r + noise * randn()); if (Math.random() < 0.003) r = Infinity; }
        ranges[i] = r;
      }
      S.scan = ranges; S.scanPose = { x: sx, y: sy, th: p.th }; S.scanT = performance.now();
      P.scan.publish({ header: hdr('base_scan'), angle_min: 0, angle_max: 2 * Math.PI - inc, angle_increment: inc, time_increment: 0, scan_time: 0.2, range_min: BOT.rMin, range_max: BOT.rMax, ranges, intensities: [] });
    }
    let lastT = performance.now(), accOdom = 0, accGt = 0, accScan = 0;
    function step() {
      S.tick++;
      const now = performance.now(), DT = Math.min(0.06, Math.max(0.001, (now - lastT) / 1000)); lastT = now;
      accOdom += DT; accGt += DT; accScan += DT;
      S.v += M.clamp(S.cmd.v - S.v, -BOT.accV * DT, BOT.accV * DT);
      S.w += M.clamp(S.cmd.w - S.w, -BOT.accW * DT, BOT.accW * DT);
      if (Math.abs(S.v) < 1e-4) S.v = 0; if (Math.abs(S.w) < 1e-4) S.w = 0;
      const p = S.pose, mid = p.th + S.w * DT / 2;
      const nx = p.x + S.v * Math.cos(mid) * DT, ny = p.y + S.v * Math.sin(mid) * DT;
      let vAct = S.v;
      if (S.v !== 0) {
        const { boxes, circles } = S.obstacles();
        if (collides(nx, ny, BOT.radius, boxes, circles)) {
          vAct = 0; S.v = 0;
          if (!S.bumped || now - S.bumpT > 2000) n.warn('충돌! 로봇이 장애물에 부딪혀 멈췄습니다');
          S.bumped = true; S.bumpT = now;
        }
      }
      if (S.bumped && now - S.bumpT > 600) S.bumped = false;
      if (vAct !== 0) { p.x = nx; p.y = ny; S.dist += Math.abs(vAct * DT); }
      p.th = M.normAngle(p.th + S.w * DT);
      // 바퀴: 실제 반지름은 조금씩 다르다(wheel_bias) → 엔코더로 계산한 odom 이 틀어짐
      const bias = +n.getParameter('wheel_bias') || 0, noise = +n.getParameter('odom_noise') || 0;
      const rl = BOT.wheelR * (1 + bias / 2), rr = BOT.wheelR * (1 - bias / 2);
      const ds = vAct * DT, dth = S.w * DT;
      const dL = ds - dth * BOT.wheelSep / 2, dR = ds + dth * BOT.wheelSep / 2;
      const aL = dL / rl, aR = dR / rr;
      S.wheel.l += aL; S.wheel.r += aR; S.wv.l = aL / DT; S.wv.r = aR / DT;
      const mL = aL * (1 + noise * randn()), mR = aR * (1 + noise * randn());
      const eL = mL * BOT.wheelR, eR = mR * BOT.wheelR, eds = (eL + eR) / 2, edth = (eR - eL) / BOT.wheelSep;
      const o2 = S.odom, om = o2.th + edth / 2;
      o2.x += eds * Math.cos(om); o2.y += eds * Math.sin(om); o2.th = M.normAngle(o2.th + edth);
      // 발행
      if (accOdom >= 0.039) {
        accOdom = 0;
        const q = M.yawToQ(o2.th);
        P.odom.publish({ header: hdr('odom'), child_frame_id: 'base_footprint',
          pose: { pose: { position: { x: o2.x, y: o2.y, z: 0 }, orientation: q }, covariance: [1e-5, 0, 0, 0, 0, 0, 0, 1e-5, 0, 0, 0, 0, 0, 0, 1e12, 0, 0, 0, 0, 0, 0, 1e12, 0, 0, 0, 0, 0, 0, 1e12, 0, 0, 0, 0, 0, 0, 1e-3] },
          twist: { twist: { linear: { x: vAct, y: 0, z: 0 }, angular: { x: 0, y: 0, z: S.w } }, covariance: new Array(36).fill(0) } });
        P.tf.publish({ transforms: [tfMsg('odom', 'base_footprint', { x: o2.x, y: o2.y, z: 0 }, q)] });
        P.js.publish({ header: hdr(''), name: ['wheel_left_joint', 'wheel_right_joint'], position: [S.wheel.l, S.wheel.r], velocity: [S.wv.l, S.wv.r], effort: [] });
        P.imu.publish({ header: hdr('imu_link'), orientation: M.yawToQ(p.th), orientation_covariance: [0.0025, 0, 0, 0, 0.0025, 0, 0, 0, 0.0025], angular_velocity: { x: 0, y: 0, z: S.w + 0.002 * randn() }, angular_velocity_covariance: new Array(9).fill(0), linear_acceleration: { x: 0.05 * randn(), y: 0.05 * randn(), z: 9.81 }, linear_acceleration_covariance: new Array(9).fill(0) });
      }
      if (accGt >= 0.099) {
        accGt = 0;
        P.gt.publish(poseMsg('odom', p));
        const last = S.trail[S.trail.length - 1];
        if (!last || Math.hypot(last[0] - p.x, last[1] - p.y) > 0.02) {
          S.trail.push([p.x, p.y]); S.trailOdom.push([o2.x, o2.y]);
          if (S.trail.length > 3000) { S.trail.splice(0, 500); S.trailOdom.splice(0, 500); }
        }
      }
      if (accScan >= 0.199) { accScan = 0; doScan(); }
    }
    n.createTimer(0.02, step);
    doScan();
    n.info(`webbot 시뮬레이터 시작: 세계 '${wname}' — ${WORLDS[wname].desc}`);
    n.webbot = S;
    return S;
  }

  /* ================================================== slam_toolbox (온라인 비동기 매핑) */
  const L_OCC = 0.85, L_FREE = -0.4, L_MIN = -2.5, L_MAX = 3.5;
  function createSlam(o) {
    o = o || {};
    const n = ROS.createNode(o.name || 'slam_toolbox', { owner: o.owner, out: o.out || quiet, params: o.params, namespace: o.ns, pkg: 'slam_toolbox', exe: 'async_slam_toolbox_node' });
    n.declareParameter('mode', 'mapping', { description: 'mapping | localization' });
    n.declareParameter('odom_frame', 'odom'); n.declareParameter('map_frame', 'map'); n.declareParameter('base_frame', 'base_footprint');
    n.declareParameter('scan_topic', '/scan');
    n.declareParameter('resolution', 0.05, { description: '지도 한 칸 크기 [m]', read_only: true });
    n.declareParameter('max_laser_range', 3.5, { description: '지도에 쓸 최대 레이저 거리 [m]' });
    n.declareParameter('map_update_interval', 1.0, { description: '/map 발행 주기 [s]' });
    n.declareParameter('transform_publish_period', 0.05, { description: 'map→odom TF 발행 주기 [s]' });
    const st = { node: n, grid: null, lo: null, version: 0, scans: 0, simVersion: -1, T: null, paused: false, warned: false };
    const mapPub = n.createPublisher('nav_msgs/msg/OccupancyGrid', 'map', { depth: 1, durability: 'transient_local' });
    const metaPub = n.createPublisher('nav_msgs/msg/MapMetaData', 'map_metadata', { depth: 1, durability: 'transient_local' });
    const tfPub = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    tfCleanup(n);
    n.info('Node using stack size 40000000');
    n.info('Using solver plugin solver_plugins::CeresSolver');
    n.info('CeresSolver: Using SCHUR_JACOBI preconditioner.');
    function alloc(S) {
      st.grid = gridFor(S.world, 1.0, 0.05);
      st.lo = new Float32Array(st.grid.W * st.grid.H);
      st.simVersion = S.version; st.scans = 0; st.version++;
    }
    st.reset = () => { const S = findSim(); if (S) alloc(S); else { st.grid = null; st.lo = null; } st.version++; };
    function integrate(m) {
      const S = findSim();
      if (!S) { if (!st.warned) { st.warned = true; n.warn('Failed to compute odom pose — webbot 시뮬레이터(/webbot)가 없습니다'); } return; }
      st.warned = false;
      if (!st.grid || st.simVersion !== S.version) alloc(S);
      if (st.paused || !S.scanPose) return;
      const g = st.grid, lo = st.lo, res = g.res, W = g.W, H = g.H;
      const sp = S.scanPose, maxR = Math.min(+n.getParameter('max_laser_range') || 3.5, +m.range_max || 3.5);
      const c0x = Math.floor((sp.x - g.ox) / res), c0y = Math.floor((sp.y - g.oy) / res);
      const rs = m.ranges || [], inc = +m.angle_increment || (2 * Math.PI / rs.length), a0 = +m.angle_min || 0;
      for (let i = 0; i < rs.length; i++) {
        let r = rs[i];
        if (r == null || Number.isNaN(r) || r < (+m.range_min || 0)) continue;
        const hit = Number.isFinite(r) && r <= maxR;
        const d = hit ? r : maxR;
        const a = sp.th + a0 + i * inc;
        const c1x = Math.floor((sp.x + Math.cos(a) * d - g.ox) / res), c1y = Math.floor((sp.y + Math.sin(a) * d - g.oy) / res);
        // Bresenham
        let x = c0x, y = c0y; const dx = Math.abs(c1x - x), dy = -Math.abs(c1y - y), sx = x < c1x ? 1 : -1, sy = y < c1y ? 1 : -1; let err = dx + dy;
        for (let k = 0; k < 400; k++) {
          const last = x === c1x && y === c1y;
          if (x >= 0 && y >= 0 && x < W && y < H) {
            const idx = y * W + x;
            lo[idx] = Math.max(L_MIN, Math.min(L_MAX, lo[idx] + (last && hit ? L_OCC : L_FREE)));
          }
          if (last) break;
          const e2 = 2 * err;
          if (e2 >= dy) { err += dy; x += sx; }
          if (e2 <= dx) { err += dx; y += sy; }
        }
      }
      const data = g.data;
      for (let i = 0; i < lo.length; i++) { const l = lo[i]; data[i] = l > 0.5 ? 100 : l < -0.3 ? 0 : -1; }
      st.scans++; st.version++;
      // map→odom = (map→base 실제에 가까운 추정) · (odom→base)⁻¹
      st.T = M.tMul(p2T({ x: S.pose.x + 0.004 * randn(), y: S.pose.y + 0.004 * randn(), th: S.pose.th + 0.002 * randn() }), M.tInv(p2T(S.odom)));
    }
    n.createSubscription('sensor_msgs/msg/LaserScan', 'scan', integrate, 'sensor_data');
    let lastMap = 0, lastTf = 0;
    n.createTimer(0.05, () => {
      const now = performance.now();
      if (st.T && now - lastTf >= (+n.getParameter('transform_publish_period') || 0.05) * 1000 - 5) {
        lastTf = now;
        const S = findSim();
        if (S) st.T = M.tMul(p2T(S.pose), M.tInv(p2T(S.odom)));
        tfPub.publish({ transforms: [tfMsg('map', 'odom', st.T.t, st.T.q)] });
      }
      if (st.grid && now - lastMap >= (+n.getParameter('map_update_interval') || 1) * 1000 - 5) {
        lastMap = now;
        const msg = gridMsg(st.grid, 'map');
        mapPub.publish(msg); metaPub.publish(msg.info);
      }
    });
    n.createService('slam_toolbox/srv/SaveMap', 'slam_toolbox/save_map', req => {
      if (!st.grid) return { result: 1 };
      const name = (req.name && req.name.data) || 'map';
      saveMap(name, st.grid);
      n.info(`Saved map to ${name}.yaml / ${name}.pgm`);
      return { result: 0 };
    });
    n.createService('slam_toolbox/srv/Reset', 'slam_toolbox/reset', req => { st.reset(); st.paused = !!req.pause_new_measurements; n.info('Resetting the map'); return { result: 0 }; });
    n.webbotSlam = st;
    return st;
  }

  /* ================================================== map_server */
  function createMapServer(o) {
    o = o || {};
    const n = ROS.createNode('map_server', { owner: o.owner, out: o.out || quiet, pkg: 'nav2_map_server', exe: 'map_server' });
    n.declareParameter('yaml_filename', o.yaml || 'map.yaml');
    n.declareParameter('topic_name', 'map'); n.declareParameter('frame_id', 'map');
    const st = { node: n, grid: null, version: 0, label: o.label || '', auto: !!o.auto, world: o.world || null };
    const pub = n.createPublisher('nav_msgs/msg/OccupancyGrid', 'map', { depth: 1, durability: 'transient_local' });
    st.setGrid = (g, label, world) => {
      st.grid = cloneGrid(g); st.version++; if (label) st.label = label; if (world) st.world = world;
      n.info(`Read map ${n.getParameter('yaml_filename')}: ${g.W} X ${g.H} map @ ${g.res} m/cell`);
      pub.publish(gridMsg(st.grid, 'map'));
    };
    n.createService('std_srvs/srv/Empty', 'map_server/reload', () => { if (st.grid) pub.publish(gridMsg(st.grid, 'map')); return {}; });
    if (o.grid) st.setGrid(o.grid);
    n.webbotMapSrv = st;
    return st;
  }

  /* ================================================== amcl (간소화) */
  // 진짜 AMCL 은 파티클 필터로 LiDAR 와 지도를 맞춰 위치를 추정합니다.
  // 여기서는 "추정 오차"만 흉내 냅니다: 로봇이 움직일 때마다 오차가 줄어들고(수렴), 너무 틀리면 잃어버립니다.
  function createAmcl(o) {
    o = o || {};
    const n = ROS.createNode('amcl', { owner: o.owner, out: o.out || quiet, pkg: 'nav2_amcl', exe: 'amcl' });
    n.declareParameter('set_initial_pose', true); n.declareParameter('global_frame_id', 'map'); n.declareParameter('odom_frame_id', 'odom'); n.declareParameter('base_frame_id', 'base_footprint');
    n.declareParameter('update_min_d', 0.1, { description: '이만큼 움직여야 필터를 갱신 [m]' });
    n.declareParameter('update_min_a', 0.15, { description: '이만큼 돌아야 필터를 갱신 [rad]' });
    n.declareParameter('max_particles', 2000); n.declareParameter('min_particles', 500);
    const st = { node: n, err: { x: 0, y: 0, th: 0 }, last: null, lost: false, simVersion: -1, updates: 0 };
    const tfPub = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    const posePub = n.createPublisher('geometry_msgs/msg/PoseWithCovarianceStamped', 'amcl_pose', { depth: 1, durability: 'transient_local' });
    tfCleanup(n);
    n.createSubscription('geometry_msgs/msg/PoseWithCovarianceStamped', 'initialpose', m => {
      m = ROS.make('geometry_msgs/msg/PoseWithCovarianceStamped', m);
      const S = findSim(); if (!S) return;
      const fr = (m.header && m.header.frame_id) || 'map';
      let p = { x: m.pose.pose.position.x, y: m.pose.pose.position.y, th: M.qToYaw(m.pose.pose.orientation) };
      if (fr !== 'map') { const T = lookup('map', fr); if (!T) { n.warn(`initialpose 의 frame '${fr}' 를 map 으로 바꿀 수 없습니다`); return; } p = T2p(M.tMul(T, p2T(p))); }
      st.err = { x: p.x - S.pose.x, y: p.y - S.pose.y, th: M.normAngle(p.th - S.pose.th) };
      st.lost = false; st.last = Object.assign({}, S.odom);
      n.info(`initialPoseReceived`);
      n.info(`Setting pose (${ROS.graph.nowSec().toFixed(6)}): ${p.x.toFixed(3)} ${p.y.toFixed(3)} ${p.th.toFixed(3)}`);
      publishPose(S);
    }, 10);
    function est(S) { return { x: S.pose.x + st.err.x, y: S.pose.y + st.err.y, th: M.normAngle(S.pose.th + st.err.th) }; }
    function publishPose(S) {
      const e = est(S), s = Math.hypot(st.err.x, st.err.y) + 0.03;
      const cov = new Array(36).fill(0); cov[0] = s * s; cov[7] = s * s; cov[35] = (Math.abs(st.err.th) + 0.02) ** 2;
      posePub.publish({ header: hdr('map'), pose: { pose: { position: { x: e.x, y: e.y, z: 0 }, orientation: M.yawToQ(e.th) }, covariance: cov } });
    }
    st.estimate = () => { const S = findSim(); return S ? est(S) : null; };
    n.createTimer(0.05, () => {
      const S = findSim(); if (!S) return;
      if (st.simVersion !== S.version) { st.simVersion = S.version; st.err = { x: 0, y: 0, th: 0 }; st.last = Object.assign({}, S.odom); st.lost = false; }
      if (!st.last) st.last = Object.assign({}, S.odom);
      const moved = Math.hypot(S.odom.x - st.last.x, S.odom.y - st.last.y) > (+n.getParameter('update_min_d') || 0.1) || Math.abs(M.normAngle(S.odom.th - st.last.th)) > (+n.getParameter('update_min_a') || 0.15);
      if (moved) {
        st.last = Object.assign({}, S.odom); st.updates++;
        const e = Math.hypot(st.err.x, st.err.y);
        if (e < 1.0 && Math.abs(st.err.th) < 0.9) { st.err.x *= 0.55; st.err.y *= 0.55; st.err.th *= 0.55; if (st.lost) { st.lost = false; n.info('위치 추정이 다시 수렴했습니다'); } }
        else if (!st.lost) { st.lost = true; n.warn('추정 위치가 실제와 너무 달라 수렴하지 못합니다 — RViz 의 2D Pose Estimate 로 다시 알려 주세요'); }
        publishPose(S);
      }
      const T = M.tMul(p2T(est(S)), M.tInv(p2T(S.odom)));
      tfPub.publish({ transforms: [tfMsg('map', 'odom', T.t, T.q)] });
    });
    n.info('Configuring'); n.info('initTransforms'); n.info('initPubSub'); n.info('Subscribed to map topic.');
    n.webbotAmcl = st;
    return st;
  }

  /* ================================================== Nav2-lite */
  function makeHeap() {
    const ids = [], fs = [];
    return {
      get size() { return ids.length; },
      push(f, id) { ids.push(id); fs.push(f); let i = ids.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (fs[p] <= fs[i]) break; [fs[p], fs[i]] = [fs[i], fs[p]]; [ids[p], ids[i]] = [ids[i], ids[p]]; i = p; } },
      pop() {
        const top = ids[0], lf = fs.pop(), li = ids.pop();
        if (ids.length) {
          ids[0] = li; fs[0] = lf; let i = 0; const n = ids.length;
          for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < n && fs[l] < fs[m]) m = l; if (r < n && fs[r] < fs[m]) m = r; if (m === i) break; [fs[m], fs[i]] = [fs[i], fs[m]]; [ids[m], ids[i]] = [ids[i], ids[m]]; i = m; }
        }
        return top;
      }
    };
  }
  /** 코스트맵(0 빈칸 … 252 팽창, 253 내접, 254 장애물, 255 모름) 위 A* */
  function astar(cost, W, H, si, gi, allowUnknown) {
    const N = W * H, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const gx = gi % W, gy = (gi / W) | 0;
    const hf = i => { const dx = Math.abs(i % W - gx), dy = Math.abs(((i / W) | 0) - gy); return dx + dy + (SQ2 - 2) * Math.min(dx, dy); };
    const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1], DC = [1, 1, 1, 1, SQ2, SQ2, SQ2, SQ2];
    const heap = makeHeap();
    g[si] = 0; heap.push(hf(si), si);
    let expanded = 0;
    while (heap.size) {
      const i = heap.pop();
      if (closed[i]) continue;
      closed[i] = 1; expanded++;
      if (i === gi) break;
      const x = i % W, y = (i / W) | 0, ci = cost[i];
      const escaping = i === si || (ci >= 253 && ci !== 255);
      for (let k = 0; k < 8; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (closed[j]) continue;
        let c = cost[j];
        if (c === 255) { if (!allowUnknown) continue; c = 60; }
        else if (c === 254) continue;
        else if (c === 253) { if (!escaping) continue; c = 252; }
        const ng = g[i] + DC[k] * (1 + 3 * c / 252);
        if (ng < g[j]) { g[j] = ng; came[j] = i; heap.push(ng + hf(j), j); }
      }
    }
    if (!closed[gi]) return null;
    const out = []; let c = gi, guard = 0;
    while (c !== -1 && guard++ < N) { out.push(c); if (c === si) break; c = came[c]; }
    out.reverse();
    return { cells: out, expanded };
  }
  function smoothPath(pts) {
    if (pts.length < 3) return pts;
    const orig = pts.map(p => p.slice()), p = pts.map(q => q.slice());
    for (let it = 0; it < 30; it++) for (let i = 1; i < p.length - 1; i++) for (let d = 0; d < 2; d++) p[i][d] += 0.1 * (orig[i][d] - p[i][d]) + 0.3 * (p[i - 1][d] + p[i + 1][d] - 2 * p[i][d]);
    return p;
  }
  function pathLen(pts, from) { let s = 0; for (let i = Math.max(1, from || 0); i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; }

  function createNav(o) {
    o = o || {};
    const out = o.out || quiet;
    const mk = (name, ns, pkg, exe) => ROS.createNode(name, { owner: o.owner, out, namespace: ns || '/', pkg, exe });
    const cs = mk('controller_server', '/', 'nav2_controller', 'controller_server');
    const lc = mk('local_costmap', '/local_costmap', 'nav2_costmap_2d', 'nav2_costmap_2d');
    const ps = mk('planner_server', '/', 'nav2_planner', 'planner_server');
    const gc = mk('global_costmap', '/global_costmap', 'nav2_costmap_2d', 'nav2_costmap_2d');
    const bs = mk('behavior_server', '/', 'nav2_behaviors', 'behavior_server');
    const bt = mk('bt_navigator', '/', 'nav2_bt_navigator', 'bt_navigator');
    const lm = mk('lifecycle_manager_navigation', '/', 'nav2_lifecycle_manager', 'lifecycle_manager');
    const nodes = [cs, lc, ps, gc, bs, bt, lm];
    // 파라미터 (ros2 param set 으로 바꿀 수 있음)
    cs.declareParameter('controller_frequency', 20.0);
    cs.declareParameter('FollowPath.plugin', 'nav2_regulated_pure_pursuit_controller::RegulatedPurePursuitController');
    cs.declareParameter('FollowPath.desired_linear_vel', 0.3, { description: '최대 직진 속도 [m/s]' });
    cs.declareParameter('FollowPath.lookahead_dist', 0.45, { description: '앞을 내다보는 거리 (pure pursuit) [m]' });
    cs.declareParameter('FollowPath.rotate_to_heading_min_angle', 0.785, { description: '이보다 방향이 많이 틀어지면 제자리 회전 [rad]' });
    cs.declareParameter('general_goal_checker.xy_goal_tolerance', 0.10, { description: '도착 판정 거리 [m]' });
    cs.declareParameter('general_goal_checker.yaw_goal_tolerance', 0.25, { description: '도착 판정 각도 [rad]' });
    lc.declareParameter('robot_radius', 0.105); lc.declareParameter('rolling_window', true); lc.declareParameter('width', 3); lc.declareParameter('height', 3);
    gc.declareParameter('robot_radius', 0.105, { description: '로봇 반지름 [m] (내접 영역)' });
    gc.declareParameter('resolution', 0.05);
    gc.declareParameter('plugins', ['static_layer', 'obstacle_layer', 'inflation_layer']);
    gc.declareParameter('inflation_layer.inflation_radius', 0.45, { description: '장애물 둘레를 부풀리는 거리 [m]' });
    gc.declareParameter('inflation_layer.cost_scaling_factor', 3.0, { description: '비용이 줄어드는 빠르기' });
    gc.declareParameter('obstacle_layer.enabled', true, { description: 'LiDAR 로 본 장애물을 코스트맵에 넣기' });
    gc.declareParameter('publish_frequency', 1.0);
    ps.declareParameter('expected_planner_frequency', 20.0);
    ps.declareParameter('GridBased.plugin', 'nav2_navfn_planner/NavfnPlanner');
    ps.declareParameter('GridBased.use_astar', true);
    ps.declareParameter('GridBased.allow_unknown', true, { description: '모르는 칸(-1)도 지나가도 되는지' });
    bs.declareParameter('behavior_plugins', ['spin', 'backup', 'drive_on_heading', 'wait']);
    bt.declareParameter('global_frame', 'map'); bt.declareParameter('robot_base_frame', 'base_link');
    bt.declareParameter('default_nav_to_pose_bt_xml', 'navigate_to_pose_w_replanning_and_recovery.xml');
    lm.declareParameter('autostart', true);
    lm.declareParameter('node_names', ['controller_server', 'smoother_server', 'planner_server', 'behavior_server', 'bt_navigator', 'waypoint_follower', 'velocity_smoother']);

    const st = {
      nodes, map: null, mapVer: 0, obst: [], lethal: null, dist: null, cost: null, costVer: 0, costDirty: false,
      plan: [], planVer: 0, goal: null, state: 'idle', phase: '대기 중 — 목표를 기다립니다', recoveries: 0, token: 0,
      t0: 0, lastPlanT: 0, pathIdx: 0, progress: null, scan: null, errorMsg: '', recGoal: null, lastCmd: { v: 0, w: 0 }, dead: false
    };
    const cmdPub = cs.createPublisher('geometry_msgs/msg/Twist', '/cmd_vel', 10);
    const bsCmd = bs.createPublisher('geometry_msgs/msg/Twist', '/cmd_vel', 10);
    const planPub = ps.createPublisher('nav_msgs/msg/Path', '/plan', 1);
    const costPub = gc.createPublisher('nav_msgs/msg/OccupancyGrid', 'costmap', { depth: 1, durability: 'transient_local' });
    const twist = (v, w) => ({ linear: { x: v, y: 0, z: 0 }, angular: { x: 0, y: 0, z: w } });
    function drive(v, w) { st.lastCmd = { v, w }; cmdPub.publish(twist(v, w)); }
    function stopRobot() { drive(0, 0); }
    const robotPose = () => lookupPose('map', 'base_footprint');

    /* ---------- 코스트맵 */
    gc.createSubscription('nav_msgs/msg/OccupancyGrid', '/map', m => { st.map = gridFromMsg(m); st.mapVer++; st.costDirty = true; }, { depth: 1, durability: 'transient_local' });
    gc.createSubscription('sensor_msgs/msg/LaserScan', '/scan', m => {
      if (!st.map || !gc.getParameter('obstacle_layer.enabled')) { if (st.obst.length) { st.obst = []; st.costDirty = true; } return; }
      const T = lookup('map', (m.header && m.header.frame_id) || 'base_scan'); if (!T) return;
      const yaw = M.qToYaw(T.q), c = Math.cos(yaw), s = Math.sin(yaw), pts = [];
      const rs = m.ranges || [], inc = +m.angle_increment, a0 = +m.angle_min;
      for (let i = 0; i < rs.length; i++) {
        const r = rs[i]; if (!Number.isFinite(r) || r > 2.5 || r < (+m.range_min || 0)) continue;
        const a = a0 + i * inc, lx = r * Math.cos(a), ly = r * Math.sin(a);
        pts.push([T.t.x + c * lx - s * ly, T.t.y + s * lx + c * ly]);
      }
      st.obst = pts; st.costDirty = true;
    }, 'sensor_data');
    gc.createService('nav2_msgs/srv/ClearEntireCostmap', 'clear_entirely_global_costmap', () => { st.obst = []; st.costDirty = true; gc.info('Received request to clear entirely the global_costmap'); return {}; });
    lc.createService('nav2_msgs/srv/ClearEntireCostmap', 'clear_entirely_local_costmap', () => ({}));
    function buildCost() {
      const g = st.map; if (!g || !g.W || !g.H) return;
      st.costDirty = false;
      const W = g.W, H = g.H, N = W * H, res = g.res;
      if (!st.lethal || st.lethal.length !== N) { st.lethal = new Uint8Array(N); st.dist = new Float32Array(N); st.cost = new Uint8Array(N); }
      const leth = st.lethal, dist = st.dist, cost = st.cost;
      for (let i = 0; i < N; i++) leth[i] = g.data[i] >= 65 ? 1 : 0;
      for (const p of st.obst) { const x = Math.floor((p[0] - g.ox) / res), y = Math.floor((p[1] - g.oy) / res); if (x >= 0 && y >= 0 && x < W && y < H) leth[y * W + x] = 1; }
      for (let i = 0; i < N; i++) dist[i] = leth[i] ? 0 : 1e9;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; let d = dist[i]; if (!d) continue;
        if (x > 0 && dist[i - 1] + 1 < d) d = dist[i - 1] + 1;
        if (y > 0) { if (dist[i - W] + 1 < d) d = dist[i - W] + 1; if (x > 0 && dist[i - W - 1] + SQ2 < d) d = dist[i - W - 1] + SQ2; if (x < W - 1 && dist[i - W + 1] + SQ2 < d) d = dist[i - W + 1] + SQ2; }
        dist[i] = d;
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; let d = dist[i]; if (!d) continue;
        if (x < W - 1 && dist[i + 1] + 1 < d) d = dist[i + 1] + 1;
        if (y < H - 1) { if (dist[i + W] + 1 < d) d = dist[i + W] + 1; if (x < W - 1 && dist[i + W + 1] + SQ2 < d) d = dist[i + W + 1] + SQ2; if (x > 0 && dist[i + W - 1] + SQ2 < d) d = dist[i + W - 1] + SQ2; }
        dist[i] = d;
      }
      const rIns = +gc.getParameter('robot_radius') || 0.105, rInf = +gc.getParameter('inflation_layer.inflation_radius') || 0.45, k = +gc.getParameter('inflation_layer.cost_scaling_factor') || 3;
      for (let i = 0; i < N; i++) {
        let c;
        if (leth[i]) c = 254;
        else { const d = dist[i] * res; c = d <= rIns ? 253 : d <= rInf ? Math.max(1, Math.round(252 * Math.exp(-k * (d - rIns)))) : 0; }
        if (c === 0 && g.data[i] < 0) c = 255;
        cost[i] = c;
      }
      st.costVer++;
    }
    st.buildCost = buildCost;
    gc.createTimer(0.25, () => { if (st.costDirty) buildCost(); });
    gc.createTimer(1.0, () => {
      if (!st.cost || !st.map) return;
      const g = st.map, data = new Array(st.cost.length);
      for (let i = 0; i < data.length; i++) { const c = st.cost[i]; data[i] = c === 255 ? -1 : c === 254 ? 100 : c === 253 ? 99 : Math.round(c * 97 / 252); }
      costPub.publish({ header: hdr('map'), info: { map_load_time: ROS.graph.now(), resolution: g.res, width: g.W, height: g.H, origin: { position: { x: g.ox, y: g.oy, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } }, data });
    });
    const cellOf = (x, y) => { const g = st.map, i = Math.floor((x - g.ox) / g.res), j = Math.floor((y - g.oy) / g.res); return i < 0 || j < 0 || i >= g.W || j >= g.H ? -1 : j * g.W + i; };
    st.costAt = (x, y) => { if (!st.cost) return 0; const i = cellOf(x, y); return i < 0 ? 255 : st.cost[i]; };

    /* ---------- 경로 계획 (planner_server) */
    function makePlan(from, to) {
      if (!st.map) return { err: '지도(/map)가 없습니다' };
      if (st.costDirty || !st.cost) buildCost();
      const g = st.map, si = cellOf(from.x, from.y), gi = cellOf(to.x, to.y);
      if (si < 0) return { err: '로봇이 지도 밖에 있습니다' };
      if (gi < 0) return { err: '목표가 지도 밖에 있습니다', code: 'goal' };
      const gcst = st.cost[gi];
      if (gcst === 254 || gcst === 253) return { err: '목표가 장애물(또는 로봇이 들어갈 수 없는 팽창 영역) 안에 있습니다', code: 'goal' };
      const r = astar(st.cost, g.W, g.H, si, gi, !!ps.getParameter('GridBased.allow_unknown'));
      if (!r) return { err: '목표까지 가는 길을 찾지 못했습니다' };
      let pts = r.cells.filter((_, k) => k % 2 === 0 || k === r.cells.length - 1).map(c => [g.ox + (c % g.W + 0.5) * g.res, g.oy + (((c / g.W) | 0) + 0.5) * g.res]);
      pts[0] = [from.x, from.y]; pts.push([to.x, to.y]);
      pts = smoothPath(pts);
      return { pts, expanded: r.expanded };
    }
    function publishPlan() {
      const poses = st.plan.map((p, i) => { const q = st.plan[Math.min(i + 1, st.plan.length - 1)], th = i < st.plan.length - 1 ? Math.atan2(q[1] - p[1], q[0] - p[0]) : (st.goal ? st.goal.th : 0); return poseMsg('map', { x: p[0], y: p[1], th }); });
      planPub.publish({ header: hdr('map'), poses });
    }
    function setPlan(pts) { st.plan = pts || []; st.planVer++; st.pathIdx = 0; publishPlan(); }

    /* ---------- 결과 */
    function finish(state, msg) {
      st.state = state; stopRobot();
      if (state === 'succeeded') { st.phase = '목표 도착 ✅'; bt.info('Goal succeeded'); }
      else if (state === 'failed') { st.errorMsg = msg; st.phase = '실패: ' + msg; bt.warn('Goal failed: ' + msg); }
      else if (state === 'canceled') { st.phase = '취소됨'; bt.info('Goal canceled'); }
      setPlan([]);
      if (st.recGoal) { try { st.recGoal.cancel(); } catch (_) {} st.recGoal = null; }
    }
    st.cancel = () => { st.token++; if (['planning', 'following', 'rotating', 'recovery'].includes(st.state)) finish('canceled'); };

    /* ---------- 복구 동작 (behavior_server) */
    const spinAc = bt.createActionClient('nav2_msgs/action/Spin', 'spin');
    const backAc = bt.createActionClient('nav2_msgs/action/BackUp', 'backup');
    const MAX_REC = 6;
    async function recover(reason, front) {
      const token = st.token;
      st.state = 'recovery'; stopRobot();
      st.recoveries++;
      if (st.recoveries > MAX_REC) { finish('failed', `복구 동작을 ${MAX_REC}번 해도 길을 찾지 못했습니다`); return; }
      bt.warn(`${reason} → 복구 동작 #${st.recoveries}`);
      st.phase = '복구: 코스트맵 지우기 (ClearCostmap)'; st.obst = []; st.costDirty = true;
      await ROS.sleep(350);
      if (token !== st.token || st.dead) return;
      const backup = front || st.recoveries % 2 === 0;
      st.phase = backup ? '복구: 뒤로 물러나기 (BackUp 0.20 m)' : '복구: 제자리 회전 (Spin 90°)';
      try {
        const g = backup ? await backAc.sendGoal({ target: { x: 0.2, y: 0, z: 0 }, speed: 0.1, time_allowance: dur(4) }) : await spinAc.sendGoal({ target_yaw: 1.57, time_allowance: dur(8) });
        st.recGoal = g;
        if (g.accepted) await g.result;
      } catch (e) { await ROS.sleep(300); }
      st.recGoal = null;
      if (token !== st.token || st.dead) return;
      st.phase = '복구: 잠깐 기다리기 (Wait)';
      await ROS.sleep(500);
      if (token !== st.token || st.dead) return;
      st.state = 'planning'; st.phase = '경로 다시 계획 중';
    }
    const odomPose = () => lookupPose('odom', 'base_footprint');
    bs.createActionServer('nav2_msgs/action/Spin', 'spin', {
      async execute(gh) {
        const target = +gh.request.target_yaw || 1.57, allow = durSec(gh.request.time_allowance) || 10;
        bs.info(`Turning ${target.toFixed(2)} for spin behavior.`);
        let prev = odomPose(), done = 0; const t0 = performance.now();
        while (bs.alive) {
          const el = (performance.now() - t0) / 1000;
          if (gh.isCancelRequested) { bsCmd.publish(twist(0, 0)); gh.canceled({ total_elapsed_time: dur(el) }); return; }
          const p = odomPose();
          if (p && prev) { done += Math.abs(M.normAngle(p.th - prev.th)); prev = p; } else prev = p;
          gh.publishFeedback({ angular_distance_traveled: done });
          if (done >= Math.abs(target) - 0.04) { bsCmd.publish(twist(0, 0)); bs.info('spin completed successfully'); return { total_elapsed_time: dur(el) }; }
          if (el > allow) { bsCmd.publish(twist(0, 0)); bs.warn('Exceeded time allowance before reaching the Spin goal - Exiting Spin'); gh.abort({ total_elapsed_time: dur(el) }); return; }
          bsCmd.publish(twist(0, Math.sign(target) * 1.0));
          await ROS.sleep(50);
        }
      }
    });
    bs.createActionServer('nav2_msgs/action/BackUp', 'backup', {
      async execute(gh) {
        const dist = Math.abs(+gh.request.target.x || 0.2), speed = Math.abs(+gh.request.speed || 0.1), allow = durSec(gh.request.time_allowance) || 10;
        bs.info(`Running backup`);
        const start = odomPose(); const t0 = performance.now();
        while (bs.alive) {
          const el = (performance.now() - t0) / 1000, p = odomPose();
          const d = p && start ? Math.hypot(p.x - start.x, p.y - start.y) : 0;
          if (gh.isCancelRequested) { bsCmd.publish(twist(0, 0)); gh.canceled({ total_elapsed_time: dur(el) }); return; }
          gh.publishFeedback({ distance_traveled: d });
          if (d >= dist - 0.01) { bsCmd.publish(twist(0, 0)); bs.info('backup completed successfully'); return { total_elapsed_time: dur(el) }; }
          if (el > allow) { bsCmd.publish(twist(0, 0)); bs.warn('Exceeded time allowance before reaching the DriveOnHeading goal - Exiting DriveOnHeading'); gh.abort({ total_elapsed_time: dur(el) }); return; }
          bsCmd.publish(twist(-speed, 0));
          await ROS.sleep(50);
        }
      }
    });

    /* ---------- 컨트롤러 (Regulated Pure Pursuit 간소화) */
    cs.createSubscription('sensor_msgs/msg/LaserScan', '/scan', m => { st.scan = m; }, 'sensor_data');
    function frontBlocked() {
      const m = st.scan; if (!m || !m.ranges) return false;
      const rs = m.ranges, inc = +m.angle_increment || 0.01745, a0 = +m.angle_min || 0;
      for (let i = 0; i < rs.length; i++) { const a = M.normAngle(a0 + i * inc); if (Math.abs(a) < 0.55 && Number.isFinite(rs[i]) && rs[i] < 0.2) return true; }
      return false;
    }
    function planAhead(p) {
      const r = makePlan(p, st.goal);
      if (r.err) return r;
      setPlan(r.pts); st.lastPlanT = performance.now();
      return r;
    }
    function tick() {
      if (!['planning', 'following', 'rotating'].includes(st.state)) return;
      const now = performance.now();
      if (!st.map) { st.phase = '/map 을 기다리는 중 (map_server 또는 slam_toolbox 필요)'; return; }
      const p = robotPose();
      if (!p) { st.phase = 'TF map → base_footprint 를 기다리는 중 (amcl 또는 slam_toolbox 필요)'; return; }
      const goal = st.goal;
      if (st.state === 'planning') {
        const r = planAhead(p);
        if (r.err) { if (r.code === 'goal') finish('failed', r.err); else recover(r.err); return; }
        ps.info(`Computed path: ${r.pts.length} poses, ${pathLen(r.pts).toFixed(2)} m (A*: ${r.expanded} cells expanded)`);
        st.state = 'following'; st.phase = '경로를 따라가는 중'; st.progress = { x: p.x, y: p.y, t: now };
        return;
      }
      const dGoal = Math.hypot(goal.x - p.x, goal.y - p.y);
      if (st.state === 'following') {
        if (dGoal < (+cs.getParameter('general_goal_checker.xy_goal_tolerance') || 0.10)) { st.state = 'rotating'; st.phase = '목표 방향으로 돌기'; stopRobot(); return; }
        // 1 Hz 로 다시 계획 (navigate_to_pose_w_replanning_and_recovery)
        let blockedPlan = false;
        if (st.cost && st.map) for (let k = st.pathIdx; k < Math.min(st.plan.length, st.pathIdx + 25); k++) { const c = st.costAt(st.plan[k][0], st.plan[k][1]); if (c === 254) { blockedPlan = true; break; } }
        if (blockedPlan || now - st.lastPlanT > 1000) {
          const r = planAhead(p);
          if (r.err) { if (r.code === 'goal') finish('failed', r.err); else recover(r.err); return; }
        }
        if (st.lastCmd.v > 0.02 && frontBlocked()) { recover('앞이 막혔습니다', true); return; }
        if (Math.hypot(p.x - st.progress.x, p.y - st.progress.y) > 0.2) st.progress = { x: p.x, y: p.y, t: now };
        else if (now - st.progress.t > 8000) { st.progress.t = now; recover('8초 동안 앞으로 나아가지 못했습니다 (progress checker)'); return; }
        // 가장 가까운 경로 점 → 앞쪽 lookahead 점
        const pl = st.plan; if (!pl.length) return;
        let best = st.pathIdx, bd = Infinity;
        for (let k = st.pathIdx; k < Math.min(pl.length, st.pathIdx + 60); k++) { const d = Math.hypot(pl[k][0] - p.x, pl[k][1] - p.y); if (d < bd) { bd = d; best = k; } }
        st.pathIdx = best;
        const L = +cs.getParameter('FollowPath.lookahead_dist') || 0.45;
        let tgt = pl[pl.length - 1];
        for (let k = best; k < pl.length; k++) if (Math.hypot(pl[k][0] - p.x, pl[k][1] - p.y) >= L) { tgt = pl[k]; break; }
        const dx = tgt[0] - p.x, dy = tgt[1] - p.y, c = Math.cos(-p.th), s = Math.sin(-p.th);
        const lx = c * dx - s * dy, ly = s * dx + c * dy, ang = Math.atan2(ly, lx);
        if (Math.abs(ang) > (+cs.getParameter('FollowPath.rotate_to_heading_min_angle') || 0.785)) { drive(0, Math.sign(ang) * 1.0); return; }
        const d2 = Math.max(1e-6, lx * lx + ly * ly), curv = 2 * ly / d2;
        let v = +cs.getParameter('FollowPath.desired_linear_vel') || 0.3;
        const remain = pathLen(pl, best) + bd;
        if (remain < 0.6) v *= Math.max(0.3, remain / 0.6);            // 목표 근처에서 감속
        const rad = 1 / Math.max(1e-6, Math.abs(curv)); if (rad < 0.9) v *= Math.max(0.35, rad / 0.9); // 급커브 감속
        if (st.costAt(p.x, p.y) > 120 && st.costAt(p.x, p.y) !== 255) v *= 0.7; // 장애물 근처 감속
        drive(v, M.clamp(v * curv, -1.8, 1.8));
        st.phase = '경로를 따라가는 중';
        return;
      }
      if (st.state === 'rotating') {
        const e = M.normAngle(goal.th - p.th);
        if (Math.abs(e) < (+cs.getParameter('general_goal_checker.yaw_goal_tolerance') || 0.25)) { finish('succeeded'); return; }
        drive(0, M.clamp(1.6 * e, -1.0, 1.0) || 0);
        if (Math.abs(1.6 * e) < 0.35) drive(0, Math.sign(e) * 0.35);
      }
    }
    cs.createTimer(0.05, tick);

    /* ---------- bt_navigator: /navigate_to_pose */
    const nav = bt.createActionServer('nav2_msgs/action/NavigateToPose', 'navigate_to_pose', {
      goal: () => true,
      async execute(gh) {
        const req = gh.request, fr = String((req.pose.header && req.pose.header.frame_id) || 'map').replace(/^\//, '');
        let g = { x: +req.pose.pose.position.x, y: +req.pose.pose.position.y, th: M.qToYaw(req.pose.pose.orientation) };
        if (fr !== 'map') { const T = lookup('map', fr); if (!T) { bt.error(`목표의 frame '${fr}' 를 map 으로 바꿀 수 없습니다`); gh.abort({ error_code: 3, error_msg: `Could not transform goal from ${fr} to map` }); return; } g = T2p(M.tMul(T, p2T(g))); }
        if (st.state === 'recovery' && st.recGoal) { try { st.recGoal.cancel(); } catch (_) {} }
        const token = ++st.token;
        st.goal = g; st.recoveries = 0; st.errorMsg = ''; st.t0 = performance.now(); st.state = 'planning'; st.phase = '경로 계획 중';
        const p0 = robotPose();
        bt.info(`Begin navigating from current location (${p0 ? p0.x.toFixed(2) : '?'}, ${p0 ? p0.y.toFixed(2) : '?'}) to (${g.x.toFixed(2)}, ${g.y.toFixed(2)})`);
        while (bt.alive) {
          await ROS.sleep(100);
          if (!bt.alive) return;
          if (st.token !== token) { gh.canceled({ error_code: 0, error_msg: 'preempted by a new goal' }); return; }
          if (gh.isCancelRequested) { finish('canceled'); gh.canceled({ error_code: 0, error_msg: '' }); return; }
          const p = robotPose() || { x: 0, y: 0, th: 0 };
          const remain = st.plan.length ? pathLen(st.plan, st.pathIdx) + Math.hypot(p.x - st.plan[Math.min(st.pathIdx, st.plan.length - 1)][0], p.y - st.plan[Math.min(st.pathIdx, st.plan.length - 1)][1]) : Math.hypot(g.x - p.x, g.y - p.y);
          st.remaining = st.state === 'succeeded' ? 0 : remain;
          const el = (performance.now() - st.t0) / 1000;
          gh.publishFeedback({ current_pose: poseMsg('map', p), navigation_time: dur(el), estimated_time_remaining: dur(remain / 0.25), number_of_recoveries: st.recoveries, distance_remaining: st.remaining });
          if (st.state === 'succeeded') return { error_code: 0, error_msg: '' };
          if (st.state === 'failed') { gh.abort({ error_code: 204, error_msg: st.errorMsg }); return; }
          if (st.state === 'canceled' || st.state === 'idle') { gh.canceled({ error_code: 0, error_msg: '' }); return; }
        }
      }
    });
    const selfAc = bt.createActionClient('nav2_msgs/action/NavigateToPose', 'navigate_to_pose');
    bt.createSubscription('geometry_msgs/msg/PoseStamped', '/goal_pose', m => {
      m = ROS.make('geometry_msgs/msg/PoseStamped', m);
      bt.info(`Received goal pose on /goal_pose → navigate_to_pose`);
      selfAc.sendGoal({ pose: m }).catch(e => bt.error(e.message));
    }, 10);

    /* ---------- lifecycle 로그 */
    ['controller_server', 'smoother_server', 'planner_server', 'behavior_server', 'bt_navigator', 'waypoint_follower', 'velocity_smoother'].forEach(nm => { lm.info(`Configuring ${nm}`); lm.info(`Activating ${nm}`); });
    lm.info('Managed nodes are active');
    lm.info('Creating bond timer...');
    bt.info('Creating navigation plugin navigate_to_pose');
    setTimeout(() => { if (lm.alive && !lookup('map', 'odom')) lm.warn('TF map → odom 가 아직 없습니다. amcl(localization_launch.py) 이나 slam_toolbox 를 함께 실행하세요.'); if (lm.alive && !findSim()) lm.warn('webbot 시뮬레이터(/webbot)가 없습니다: ros2 launch webbot_sim world.launch.py'); }, 2500);
    const onEnd = () => { st.dead = true; };
    bt.onDestroy = onEnd;
    st.nav = nav;
    bt.webbotNav = st;
    return st;
  }

  /* ================================================== 조종 패드 (teleop) */
  function teleopPad(host, opts) {
    opts = opts || {};
    const topic = opts.topic || '/cmd_vel', V = opts.v || 0.3, WV = opts.w || 1.2;
    let node = null, pub = null, was = false, seen = false;
    const held = new Set();
    const pad = document.createElement('div');
    pad.className = 'wm-pad';
    pad.innerHTML = `<button type="button" data-k="f" title="앞으로 (W, ↑)">▲</button><button type="button" data-k="l" title="왼쪽으로 돌기 (A, ←)">◀</button><button type="button" data-k="x" title="정지 (Space)">■</button><button type="button" data-k="r" title="오른쪽으로 돌기 (D, →)">▶</button><button type="button" data-k="b" title="뒤로 (S, ↓)">▼</button>`;
    host.appendChild(pad);
    function ensure() {
      if (!node || !node.alive) { node = ROS.createNode(uniqueName(opts.name || 'teleop_pad'), { owner: opts.owner || host, out: quiet, pkg: 'teleop_twist_keyboard', exe: 'teleop_twist_keyboard' }); pub = node.createPublisher('geometry_msgs/msg/Twist', topic, 10); }
    }
    function send() {
      if (host.isConnected) seen = true; else if (seen) { api.stop(); return; }
      const f = (held.has('f') ? 1 : 0) - (held.has('b') ? 1 : 0), t = (held.has('l') ? 1 : 0) - (held.has('r') ? 1 : 0);
      const moving = !!(f || t);
      if (!moving && !was) return;
      ensure();
      pub.publish({ linear: { x: f * V, y: 0, z: 0 }, angular: { x: 0, y: 0, z: t * WV } });
      was = moving;
    }
    const iv = setInterval(send, 100);
    const mark = () => pad.querySelectorAll('button').forEach(b => b.classList.toggle('on', held.has(b.dataset.k)));
    pad.querySelectorAll('button').forEach(b => {
      const k = b.dataset.k;
      b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (k === 'x') held.clear(); else held.add(k); try { b.setPointerCapture(e.pointerId); } catch (_) {} mark(); send(); if (opts.onUse) opts.onUse(); });
      const up = () => { if (!held.has(k)) return; held.delete(k); mark(); send(); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
    });
    const KEYS = { w: 'f', arrowup: 'f', s: 'b', arrowdown: 'b', a: 'l', arrowleft: 'l', d: 'r', arrowright: 'r' };
    const api = {
      el: pad,
      /** 키 입력 처리 → 처리했으면 true */
      key(e, down) {
        const key = String(e.key || '').toLowerCase();
        if (key === ' ' || key === 'x') { if (down) { held.clear(); mark(); send(); } return true; }
        const k = KEYS[key]; if (!k) return false;
        if (down) held.add(k); else held.delete(k);
        mark(); send(); return true;
      },
      release() { held.clear(); mark(); send(); },
      stop() { clearInterval(iv); held.clear(); if (node && node.alive) { if (was && pub) pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }); node.destroy(); } pad.remove(); }
    };
    return api;
  }

  /* ================================================== 그리기 도우미 */
  function mapImage(cache, grid, key, kind, C) {
    const k = key + '|' + kind + '|' + (C.dark ? 'd' : 'l');
    if (cache.key === k && cache.cv) return cache.cv;
    const W = grid.W, H = grid.H;
    const cv = cache.cv && cache.cv.width === W && cache.cv.height === H ? cache.cv : document.createElement('canvas');
    cv.width = W; cv.height = H;
    const cx = cv.getContext('2d'), id = cx.createImageData(W, H), d = id.data;
    const free = C.dark ? [52, 62, 78, 255] : [255, 255, 255, 255], occ = C.dark ? [236, 240, 246, 255] : [22, 28, 40, 255];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const v = grid.data[j * W + i], o = ((H - 1 - j) * W + i) * 4;
      let c;
      if (kind === 'cost') {
        if (v === 254) c = [210, 40, 190, 210]; else if (v === 253) c = [0, 190, 230, 170]; else if (v === 0 || v === 255) c = [0, 0, 0, 0];
        else { const t = v / 252; c = [Math.round(255 * t), Math.round(70 + 60 * (1 - t)), Math.round(255 * (1 - t)), Math.round(50 + 110 * t)]; }
      } else c = v < 0 ? [0, 0, 0, 0] : v >= 65 ? occ : v <= 25 ? free : [free[0] * 0.6 + occ[0] * 0.4, free[1] * 0.6 + occ[1] * 0.4, free[2] * 0.6 + occ[2] * 0.4, 255];
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = c[3];
    }
    cx.putImageData(id, 0, 0);
    cache.key = k; cache.cv = cv;
    return cv;
  }
  function drawRobot(ctx, V, p, fill, stroke, alpha) {
    const s = V.s, x = V.ox + p.x * s, y = V.oy - p.y * s, r = BOT.radius * s;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.translate(x, y); ctx.rotate(-p.th);
    ctx.fillStyle = '#111827';
    ctx.fillRect(-0.033 * s, -0.095 * s, 0.066 * s, 0.022 * s); ctx.fillRect(-0.033 * s, 0.073 * s, 0.066 * s, 0.022 * s);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke();
    ctx.beginPath(); ctx.arc(BOT.scanX * s, 0, 0.035 * s, 0, Math.PI * 2); ctx.fillStyle = '#1f2937'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, 0.018 * s); ctx.beginPath(); ctx.moveTo(0.0, 0); ctx.lineTo(0.085 * s, 0); ctx.stroke();
    ctx.restore();
  }
  function poseArrow(ctx, V, x, y, th, len, color, width) {
    const px = V.ox + x * V.s, py = V.oy - y * V.s, l = Math.max(18, len * V.s);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 3;
    RosUI.arrow(ctx, px, py, px + Math.cos(th) * l, py - Math.sin(th) * l, 10);
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  function pill(ctx, x, y, text, bg, fg, align) {
    ctx.font = '600 11.5px ' + (RosUI.css('--sans') || 'sans-serif');
    const w = ctx.measureText(text).width + 14;
    const x0 = align === 'right' ? x - w : x;
    ctx.fillStyle = bg; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x0, y, w, 20, 10); else ctx.rect(x0, y, w, 20);
    ctx.fill(); ctx.fillStyle = fg; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText(text, x0 + 7, y + 10.5);
    return w;
  }
  function alpha(col, a) {
    col = String(col || '').trim();
    if (col[0] === '#') { let h = col.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
    const m = col.match(/rgba?\(([^)]+)\)/); if (m) { const p = m[1].split(',').map(s => s.trim()); return `rgba(${p[0]},${p[1]},${p[2]},${a})`; }
    return col;
  }

  function drawTrail(ctx, V, pts, color, dash, width) {
    if (pts.length < 2) return;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
    ctx.beginPath(); pts.forEach((p, i) => { const x = V.ox + p[0] * V.s, y = V.oy - p[1] * V.s; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
  }
  function legend(ctx, pn, items, C) {
    ctx.font = '11px ' + (RosUI.css('--sans') || 'sans-serif'); ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    let x = pn.x + 8; const y = pn.y + pn.h - 12;
    items.forEach(([label, col, dash]) => {
      const tw = ctx.measureText(label).width;
      if (x + tw + 26 > pn.x + pn.w - 60) return;
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2.5; ctx.setLineDash(dash ? [5, 4] : []);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.fg; ctx.fillText(label, x + 18, y);
      x += tw + 30;
    });
  }
  function scaleBar(ctx, pn, C) {
    const s = pn.V.s, x = pn.x + pn.w - 10 - s, y = pn.y + pn.h - 12;
    ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y); ctx.lineTo(x + s, y); ctx.lineTo(x + s, y - 4); ctx.stroke();
    ctx.fillStyle = C.fg; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1 m', x + s / 2, y - 9); ctx.textAlign = 'left';
  }

  /* ================================================== 보기: bot */
  const MODES = { drive: '🚗 주행', slam: '🗺 SLAM', nav: '🧭 내비게이션' };
  function botView(el, o) {
    o = o || {};
    const inWin = !!o.inWindow, slide = !!(el.closest && el.closest('.slide'));
    const H = +o.h || (slide ? 330 : 400);
    const own = { sim: null, rsp: null, slam: null, mapsrv: null, amcl: null, nav: null, gui: null };
    let S = findSim();
    if (!S) { S = createSim({ owner: el, world: o.world }); own.sim = S.node; if (!ROS.findNode('/robot_state_publisher')) own.rsp = createRsp({ owner: el }); }
    let mode = MODES[o.mode] ? o.mode : 'drive';
    const wantTeleop = o.teleop != null ? /^(1|true|yes|on)$/i.test(String(o.teleop)) : mode !== 'nav';
    let showRays = /^(1|true|yes|on)$/i.test(String(o.lidar || ''));
    let tool = mode === 'nav' ? 'goal' : 'none', layout = 'auto', drag = null, lastGoal = null, navMsg = '';
    let showCost = true;

    el.innerHTML = `<div class="wm-bot${inWin ? ' wm-win' : ''}">
      <div class="wm-bar">
        <div class="w-seg wm-seg-world" title="세계 고르기">${Object.keys(WORLDS).map(k => `<button type="button" data-world="${k}">${WORLDS[k].label}</button>`).join('')}</div>
        <div class="w-seg wm-seg-mode" title="무엇을 실행할지">${Object.keys(MODES).map(k => `<button type="button" data-mode="${k}">${MODES[k]}</button>`).join('')}</div>
        <span class="wm-sp"></span>
        <span class="wm-pop"></span>
      </div>
      <div class="wm-bar wm-tools"></div>
      <div class="wm-stage" tabindex="0" style="${inWin ? '' : `height:${H}px`}"><canvas class="wm-cv"></canvas><div class="wm-kbd">⌨ 클릭 후 W A S D / 화살표로 운전</div></div>
      <div class="wm-status"></div>
      <div class="w-help wm-help"></div>
    </div>`;
    const root = el.querySelector('.wm-bot'), stage = el.querySelector('.wm-stage'), cv = el.querySelector('.wm-cv');
    const toolsEl = el.querySelector('.wm-tools'), statusEl = el.querySelector('.wm-status'), helpEl = el.querySelector('.wm-help'), popEl = el.querySelector('.wm-pop');
    let pad = null;
    if (wantTeleop) pad = teleopPad(stage, { owner: el, name: 'teleop_pad', onUse: () => stage.focus({ preventScroll: true }) });
    stage.classList.toggle('has-pad', !!pad);

    function gui() {
      if (!own.gui || !own.gui.alive) {
        own.gui = ROS.createNode(uniqueName('webbot_gui'), { owner: el, out: quiet, pkg: 'webbot_sim', exe: 'webbot_gui' });
        own.gui._ip = own.gui.createPublisher('geometry_msgs/msg/PoseWithCovarianceStamped', '/initialpose', 10);
      }
      return own.gui;
    }
    const destroy = k => { const v = own[k]; if (!v) return; (Array.isArray(v) ? v : [v]).forEach(n => n && n.alive && n.destroy()); own[k] = null; };
    function effMode() { return findNav() ? 'nav' : findSlam() ? 'slam' : 'drive'; }
    function savedMapFor(S) { const m = MAPS.map; return m && m.world === S.worldName ? m : null; }
    function ensureMode(m, byUser) {
      mode = m;
      if (m !== 'slam') destroy('slam');
      if (m !== 'nav') { destroy('nav'); destroy('mapsrv'); destroy('amcl'); }
      if (m === 'slam') { if (!findSlam()) own.slam = createSlam({ owner: el }).node; }
      if (m === 'nav') {
        if (!findSlam()) {
          if (!findMapSrv()) { const sv = savedMapFor(S); own.mapsrv = createMapServer({ owner: el, grid: sv ? sv.grid : rasterize(S.world), yaml: sv ? 'map.yaml' : `webbot_${S.worldName}.yaml`, label: sv ? '💾 저장한 SLAM 지도 (map.yaml)' : '미리 만든 지도', auto: !sv, world: S.worldName }).node; }
          if (!findAmcl()) own.amcl = createAmcl({ owner: el }).node;
        }
        if (!findNav()) own.nav = createNav({ owner: el }).nodes;
        tool = 'goal';
      } else if (tool === 'goal' || tool === 'pose') tool = 'none';
      const other = effMode();
      if (other !== m && byUser) RosUI.toast(`터미널에서 실행한 ${other === 'nav' ? 'Nav2' : 'slam_toolbox'} 가 아직 돌고 있습니다 — 터미널에서 Ctrl+C 로 끄세요`);
      renderBars();
    }
    function renderBars() {
      const em = effMode();
      root.querySelectorAll('[data-world]').forEach(b => b.classList.toggle('on', b.dataset.world === S.worldName));
      root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === em));
      popEl.innerHTML = inWin ? '' : RosUI.popoutBtn('bot', { mode: em });
      const hasNav = !!findNav(), hasSlam = !!findSlam(), hasAmcl = !!findAmcl();
      let h = '';
      if (hasNav) h += `<div class="w-seg" title="지도를 클릭할 때 할 일">
          <button type="button" data-tool="goal" title="지도에서 클릭(끌면 방향) → /navigate_to_pose 목표">🎯 Nav2 Goal</button>
          ${hasAmcl ? `<button type="button" data-tool="pose" title="로봇이 실제로 있는 곳을 알려 주기 → /initialpose">📍 2D Pose Estimate</button>` : ''}
          <button type="button" data-tool="obst" title="클릭해서 상자 놓기/치우기">🧱 장애물</button></div>
          <button type="button" class="btn tiny" data-act="cancel">⏹ 목표 취소</button>`;
      else h += `<button type="button" class="btn tiny${tool === 'obst' ? ' primary' : ''}" data-act="obst" title="클릭해서 상자 놓기/치우기">🧱 장애물 놓기</button>`;
      if (hasSlam) h += `<button type="button" class="btn tiny" data-act="save" title="map_saver_cli -f ~/map 과 같음">💾 지도 저장</button><button type="button" class="btn tiny" data-act="clearmap">🗑 지도 지우기</button>`;
      h += `<button type="button" class="btn tiny" data-act="reset" title="로봇을 출발점으로 (reset_world)">↺ 처음으로</button>`;
      h += `<label class="wm-chk"><input type="checkbox" data-act="rays"${showRays ? ' checked' : ''}> 레이저 광선</label>`;
      if (hasNav) h += `<label class="wm-chk"><input type="checkbox" data-act="cost"${showCost ? ' checked' : ''}> 코스트맵</label>`;
      if (hasNav || hasSlam || findMapSrv()) h += `<div class="w-seg wm-seg-lay" title="화면 배치"><button type="button" data-lay="auto">자동</button><button type="button" data-lay="split">나란히</button><button type="button" data-lay="overlay">겹쳐서</button></div>`;
      toolsEl.innerHTML = h;
      toolsEl.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === tool));
      toolsEl.querySelectorAll('[data-lay]').forEach(b => b.classList.toggle('on', b.dataset.lay === layout));
      cv.style.touchAction = tool === 'none' ? 'pan-y' : 'none';
      cv.style.cursor = tool === 'none' ? 'default' : 'crosshair';
      helpEl.innerHTML = em === 'nav'
        ? '🎯 지도를 <b>클릭</b>(끌면 도착 방향)하면 RViz 의 <b>Nav2 Goal</b> 처럼 <code>/navigate_to_pose</code> 목표를 보냅니다. 🧱 로 길을 막으면 코스트맵이 바뀌고 경로를 다시 계획합니다. 터미널: <code>ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose "{pose: {header: {frame_id: map}, pose: {position: {x: 1.0, y: 0.5}}}}" --feedback</code>'
        : em === 'slam'
          ? '🗺 로봇을 몰고 다니며 지도를 그려 보세요. <b>회색</b>=아직 모름(-1), <b>흰색</b>=빈 곳(0), <b>검정</b>=벽(100). 다 그렸으면 💾 <b>지도 저장</b> → 🧭 내비게이션에서 그 지도를 씁니다. (터미널: <code>ros2 run nav2_map_server map_saver_cli -f ~/map</code>)'
          : '🚗 화면을 클릭한 뒤 <b>W A S D</b>(또는 화살표 · 아래 버튼)로 운전하세요. <b style="color:var(--c-green)">초록</b>=실제 경로, <b style="color:var(--c-orange)">주황</b>=바퀴 오도메트리(/odom)로 추정한 경로 — 오래 달릴수록 벌어집니다. 터미널: <code>ros2 topic echo /odom</code>, <code>ros2 run teleop_twist_keyboard teleop_twist_keyboard</code>';
    }
    renderBars();
    ensureMode(mode);
    const offGraph = ROS.on('graph', () => { clearTimeout(offGraph._t); offGraph._t = setTimeout(() => { if (el.isConnected) renderBars(); }, 120); });

    root.addEventListener('click', e => {
      const b = e.target.closest('button, input'); if (!b || !root.contains(b)) return;
      if (b.dataset.world) { if (S.worldName !== b.dataset.world) S.setWorld(b.dataset.world); worldChanged(); return; }
      if (b.dataset.mode) { ensureMode(b.dataset.mode, true); return; }
      if (b.dataset.tool) { tool = tool === b.dataset.tool ? 'none' : b.dataset.tool; renderBars(); return; }
      if (b.dataset.lay) { layout = b.dataset.lay; renderBars(); return; }
      const a = b.dataset.act;
      if (a === 'obst') { tool = tool === 'obst' ? 'none' : 'obst'; renderBars(); }
      else if (a === 'reset') { S.reset(); S.extra = []; const nv = findNav(); if (nv) nv.cancel(); }
      else if (a === 'cancel') { if (lastGoal) lastGoal.cancel(); else { const nv = findNav(); if (nv) nv.cancel(); } }
      else if (a === 'save') { const sl = findSlam(); if (sl && sl.grid) { const m = saveMap('map', sl.grid); RosUI.toast(`💾 ~/map.yaml · ~/map.pgm 저장 (${m.grid.W}×${m.grid.H} 칸, 0.05 m/칸) — 🧭 내비게이션에서 이 지도를 씁니다`); navMsg = '💾 지도를 저장했습니다: ~/map.yaml'; } else RosUI.toast('아직 지도가 없습니다. 로봇을 조금 움직여 보세요.'); }
      else if (a === 'clearmap') { const sl = findSlam(); if (sl) sl.reset(); }
      else if (a === 'rays') showRays = b.checked;
      else if (a === 'cost') showCost = b.checked;
    });

    /** 세계가 바뀌면(버튼 · ros2 param set /webbot world maze) 미리 만든 지도와 목표를 새로 */
    let seenVer = S.version;
    function worldChanged() {
      if (seenVer === S.version) return;
      seenVer = S.version;
      const ms = findMapSrv();
      if (ms && (ms.auto || ms.world !== S.worldName)) { const sv = savedMapFor(S); ms.setGrid(sv ? sv.grid : rasterize(S.world), sv ? '💾 저장한 SLAM 지도 (map.yaml)' : '미리 만든 지도', S.worldName); ms.auto = !sv; }
      const nv = findNav(); if (nv) nv.cancel();
      lastGoal = null; navMsg = '';
      renderBars();
    }
    /* ---------- 키보드 */
    stage.addEventListener('keydown', e => { if (pad && pad.key(e, true)) e.preventDefault(); });
    stage.addEventListener('keyup', e => { if (pad && pad.key(e, false)) e.preventDefault(); });
    stage.addEventListener('blur', () => { if (pad) pad.release(); });

    /* ---------- 화면 배치 · 좌표 */
    let panes = [];
    function mapSource() {
      const sl = findSlam(); if (sl && sl.grid) return { grid: sl.grid, key: 's' + sl.version, label: 'slam_toolbox 가 그리는 중' };
      const ms = findMapSrv(); if (ms && ms.grid) return { grid: ms.grid, key: 'm' + ms.version, label: ms.label || 'map_server' };
      const nv = findNav(); if (nv && nv.map) return { grid: nv.map, key: 'n' + nv.mapVer, label: '/map' };
      return null;
    }
    function layoutPanes(w, h, hasMap) {
      const b = S.world.bounds, pad = 0.35, bw = b[2] - b[0] + 2 * pad, bh = b[3] - b[1] + 2 * pad;
      const fit = (x, y, pw, ph, kind) => { const s = Math.min((pw - 8) / bw, (ph - 30) / bh); return { x, y, w: pw, h: ph, kind, V: { s, ox: x + pw / 2 - (b[0] + b[2]) / 2 * s, oy: y + 26 + (ph - 26) / 2 + (b[1] + b[3]) / 2 * s } }; };
      if (!hasMap) return [fit(0, 0, w, h, 'world')];
      let lay = layout;
      if (lay === 'auto') lay = w >= 560 || h >= 520 ? 'split' : 'overlay';
      if (lay === 'overlay') return [fit(0, 0, w, h, 'both')];
      if (w / h >= 1.15) return [fit(0, 0, w / 2, h, 'world'), fit(w / 2, 0, w / 2, h, 'map')];
      return [fit(0, 0, w, h / 2, 'world'), fit(0, h / 2, w, h / 2, 'map')];
    }
    function toWorld(ev) {
      const r = cv.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
      const pn = panes.find(p => px >= p.x && px <= p.x + p.w && py >= p.y && py <= p.y + p.h) || panes[0];
      if (!pn) return null;
      return { x: (px - pn.V.ox) / pn.V.s, y: (pn.V.oy - py) / pn.V.s };
    }
    cv.addEventListener('pointerdown', e => {
      stage.focus({ preventScroll: true });
      if (tool === 'none' || e.button !== 0) return;
      const w = toWorld(e); if (!w) return;
      if (tool === 'obst') {
        const r = S.toggleObstacle(w.x, w.y);
        if (r === 'robot') RosUI.toast('로봇 위에는 상자를 놓을 수 없습니다');
        return;
      }
      drag = { x: w.x, y: w.y, th: 0, moved: false, tool };
      try { cv.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    cv.addEventListener('pointermove', e => {
      if (!drag) return;
      const w = toWorld(e); if (!w) return;
      if (Math.hypot(w.x - drag.x, w.y - drag.y) > 0.08) { drag.th = Math.atan2(w.y - drag.y, w.x - drag.x); drag.moved = true; }
    });
    cv.addEventListener('pointerup', () => {
      if (!drag) return;
      const d = drag; drag = null;
      if (!d.moved) { const p = lookupPose('map', 'base_footprint'); d.th = p ? Math.atan2(d.y - p.y, d.x - p.x) : 0; }
      if (d.tool === 'goal') sendGoal(d);
      else if (d.tool === 'pose') {
        const g = gui();
        const cov = new Array(36).fill(0); cov[0] = 0.25; cov[7] = 0.25; cov[35] = 0.0685;
        g._ip.publish({ header: hdr('map'), pose: { pose: { position: { x: d.x, y: d.y, z: 0 }, orientation: M.yawToQ(d.th) }, covariance: cov } });
        navMsg = `📍 /initialpose 발행: (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${M.deg(d.th).toFixed(0)}°)`;
        tool = 'goal'; renderBars();
      }
    });
    cv.addEventListener('pointercancel', () => { drag = null; });
    function sendGoal(d) {
      if (!ROS.graph.actions.has('/navigate_to_pose')) { RosUI.toast('Nav2(bt_navigator)가 실행 중이 아닙니다 — 🧭 내비게이션을 누르세요'); return; }
      const goal = { pose: { header: hdr('map'), pose: { position: { x: d.x, y: d.y, z: 0 }, orientation: M.yawToQ(d.th) } } };
      navMsg = `🎯 목표 전송: (${d.x.toFixed(2)}, ${d.y.toFixed(2)}, ${M.deg(d.th).toFixed(0)}°)`;
      ROS.sendGoal('/navigate_to_pose', goal, {}).then(g => {
        lastGoal = g;
        if (!g.accepted) { navMsg = '목표가 거절되었습니다'; return; }
        g.result.then(r => {
          if (lastGoal === g) lastGoal = null;
          const st = r.status;
          navMsg = st === ROS.STATUS.SUCCEEDED ? '✅ 결과: SUCCEEDED' : st === ROS.STATUS.CANCELED ? '⏹ 결과: CANCELED' : `❌ 결과: ABORTED — ${r.result.error_msg || ''}`;
        });
      }).catch(e => { navMsg = '오류: ' + e.message; });
    }

    /* ---------- 그리기 */
    const imgCache = {}, costCache = {};
    function drawWorld(ctx, V, C, faint) {
      const w = S.world, s = V.s;
      ctx.save();
      ctx.globalAlpha = faint ? 0.35 : 1;
      ctx.fillStyle = C.dark ? '#5b6678' : '#7b8494';
      w.boxes.forEach(b => ctx.fillRect(V.ox + b[0] * s, V.oy - b[3] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s));
      w.circles.forEach(c => { ctx.beginPath(); ctx.arc(V.ox + c[0] * s, V.oy - c[1] * s, c[2] * s, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = C.orange;
      S.extra.forEach(b => { ctx.fillRect(V.ox + b[0] * s, V.oy - b[3] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s); ctx.strokeStyle = alpha('#000', 0.3); ctx.lineWidth = 1; ctx.strokeRect(V.ox + b[0] * s, V.oy - b[3] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s); });
      ctx.restore();
    }
    function drawFloor(ctx, pn, C) {
      const V = pn.V, b = S.world.bounds, s = V.s;
      ctx.fillStyle = C.dark ? '#1d2531' : '#eef2f7';
      ctx.fillRect(V.ox + b[0] * s, V.oy - b[3] * s, (b[2] - b[0]) * s, (b[3] - b[1]) * s);
      ctx.strokeStyle = alpha(C.muted, 0.18); ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.ceil(b[0]); x <= b[2]; x++) { ctx.moveTo(V.ox + x * s, V.oy - b[1] * s); ctx.lineTo(V.ox + x * s, V.oy - b[3] * s); }
      for (let y = Math.ceil(b[1]); y <= b[3]; y++) { ctx.moveTo(V.ox + b[0] * s, V.oy - y * s); ctx.lineTo(V.ox + b[2] * s, V.oy - y * s); }
      ctx.stroke();
    }
    function drawScan(ctx, V, sp, C, rays) {
      if (!S.scan || !sp) return;
      const N = S.scan.length, inc = 2 * Math.PI / N, s = V.s, x0 = V.ox + sp.x * s, y0 = V.oy - sp.y * s;
      if (rays) {
        ctx.strokeStyle = alpha(C.red, 0.13); ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < N; i += 2) { const r = Number.isFinite(S.scan[i]) ? S.scan[i] : BOT.rMax, a = sp.th + i * inc; ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * r * s, y0 - Math.sin(a) * r * s); }
        ctx.stroke();
      }
      ctx.fillStyle = C.red;
      const d = Math.max(2, Math.min(3.5, s * 0.03));
      for (let i = 0; i < N; i++) { const r = S.scan[i]; if (!Number.isFinite(r)) continue; const a = sp.th + i * inc; ctx.fillRect(x0 + Math.cos(a) * r * s - d / 2, y0 - Math.sin(a) * r * s - d / 2, d, d); }
    }
    function drawGrid(ctx, V, img, g) {
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, V.ox + g.ox * V.s, V.oy - (g.oy + g.H * g.res) * V.s, g.W * g.res * V.s, g.H * g.res * V.s);
      ctx.restore();
    }
    function render() {
      if (!S.node.alive) { const s2 = findSim(); if (s2) { S = s2; seenVer = S.version; renderBars(); } }
      if (S.version !== seenVer) worldChanged();
      const C = RosUI.colors();
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      if (!S.node.alive) {
        ctx.fillStyle = C.card2; ctx.fillRect(0, 0, w, h); ctx.fillStyle = C.muted; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('시뮬레이터(/webbot)가 종료되었습니다.', w / 2, h / 2 - 8); ctx.fillText('↺ 처음으로 를 누르면 다시 시작합니다.', w / 2, h / 2 + 14); ctx.textAlign = 'left';
        return;
      }
      const src = mapSource(), nv = findNav(), am = findAmcl();
      panes = layoutPanes(w, h, !!src);
      const est = lookupPose('map', 'base_footprint');
      panes.forEach(pn => {
        const V = pn.V;
        ctx.save(); ctx.beginPath(); ctx.rect(pn.x, pn.y, pn.w, pn.h); ctx.clip();
        ctx.fillStyle = pn.kind === 'world' ? C.card2 : (C.dark ? '#262d38' : '#c9d0da');
        ctx.fillRect(pn.x, pn.y, pn.w, pn.h);
        if (pn.kind === 'world' || pn.kind === 'both') drawFloor(ctx, pn, C);
        if (pn.kind !== 'world' && src) {
          drawGrid(ctx, V, mapImage(imgCache, src.grid, src.key, 'map', C), src.grid);
          if (nv && showCost && nv.cost && nv.map) drawGrid(ctx, V, mapImage(costCache, { W: nv.map.W, H: nv.map.H, data: nv.cost }, 'c' + nv.costVer, 'cost', C), nv.map);
        }
        if (pn.kind === 'world') drawWorld(ctx, V, C, false);
        if (pn.kind === 'both') drawWorld(ctx, V, C, true);
        if (pn.kind !== 'map') {
          drawTrail(ctx, V, S.trail, C.green, null, 2.5);
          drawTrail(ctx, V, S.trailOdom, C.orange, [6, 4], 2);
          drawScan(ctx, V, S.scanPose, C, showRays);
          if (pn.kind === 'world') { const op = S.odom; ctx.save(); ctx.globalAlpha = 0.9; poseArrow(ctx, V, op.x, op.y, op.th, 0.25, C.orange, 2); ctx.restore(); }
          drawRobot(ctx, V, S.pose, C.blue, C.dark ? '#dbeafe' : '#1e3a8a', 1);
        }
        if (pn.kind !== 'world') {
          if (nv && nv.plan.length > 1) drawTrail(ctx, V, nv.plan, C.purple, null, 3);
          if (nv && nv.goal && ['planning', 'following', 'rotating', 'recovery'].includes(nv.state)) poseArrow(ctx, V, nv.goal.x, nv.goal.y, nv.goal.th, 0.35, C.green, 3);
          if (est) {
            // 추정 위치에서 본 LiDAR — 추정이 틀리면 벽과 어긋나 보입니다
            const sp = { x: est.x + BOT.scanX * Math.cos(est.th), y: est.y + BOT.scanX * Math.sin(est.th), th: est.th };
            if (pn.kind === 'map') drawScan(ctx, V, sp, C, false);
            if (am) { const e = Math.hypot(am.err.x, am.err.y) + 0.05; ctx.fillStyle = alpha(C.accent, 0.15); ctx.strokeStyle = alpha(C.accent, 0.6); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(V.ox + est.x * V.s, V.oy - est.y * V.s, e * V.s, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
            if (pn.kind === 'map') drawRobot(ctx, V, est, alpha(C.accent, 0.85), C.dark ? '#fff' : '#1e1b4b', 1);
            else { ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = C.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(V.ox + est.x * V.s, V.oy - est.y * V.s, BOT.radius * V.s + 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
          }
        }
        if (drag && pn.kind !== 'world' || drag && panes.length === 1) poseArrow(ctx, V, drag.x, drag.y, drag.th, 0.4, drag.tool === 'pose' ? C.accent : C.green, 3);
        // 이름표 · 범례
        const title = pn.kind === 'world' ? '🌍 Gazebo — 실제 세계 (ground truth)' : pn.kind === 'map' ? `🧭 map 프레임 — ${src ? src.label : ''}` : `🌍 + 🧭 ${src ? src.label : ''}`;
        pill(ctx, pn.x + 8, pn.y + 6, title, alpha(C.card, 0.9), C.fg);
        if (pn.kind === 'world') legend(ctx, pn, [['실제 경로', C.green], ['오도메트리 추정', C.orange, true], ['LiDAR', C.red]], C);
        else if (pn.kind === 'map') legend(ctx, pn, [['추정 위치', C.accent], ['LiDAR', C.red], ...(nv ? [['/plan', C.purple]] : [])], C);
        else legend(ctx, pn, [['실제', C.green], ['오도메트리', C.orange, true], ...(nv ? [['/plan', C.purple]] : [])], C);
        scaleBar(ctx, pn, C);
        if (S.bumped && pn.kind !== 'map') pill(ctx, pn.x + pn.w - 8, pn.y + 6, '💥 충돌!', C.red, '#fff', 'right');
        ctx.restore();
      });
      if (panes.length === 2) { ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.beginPath(); if (panes[1].x > 0) { ctx.moveTo(panes[1].x, 0); ctx.lineTo(panes[1].x, h); } else { ctx.moveTo(0, panes[1].y); ctx.lineTo(w, panes[1].y); } ctx.stroke(); }
    }
    let lastStatus = 0;
    function status() {
      if (!S.node.alive) { statusEl.innerHTML = ''; return; }
      const e = Math.hypot(S.odom.x - S.pose.x, S.odom.y - S.pose.y), ea = Math.abs(M.deg(M.normAngle(S.odom.th - S.pose.th)));
      const parts = [`<span><b>/cmd_vel</b> v=${S.cmd.v.toFixed(2)} m/s · ω=${S.cmd.w.toFixed(2)} rad/s</span>`, `<span title="/odom 과 실제 위치의 차이">오도메트리 오차 <b>${e.toFixed(2)} m</b>, ${ea.toFixed(1)}°</span>`];
      const sl = findSlam(); if (sl) parts.push(`<span>🗺 스캔 ${sl.scans}개 반영 · ${sl.grid ? sl.grid.W + '×' + sl.grid.H : '-'} 칸</span>`);
      const am = findAmcl(); if (am) { const ae = Math.hypot(am.err.x, am.err.y); parts.push(`<span class="${am.lost ? 'bad' : ''}">📍 amcl 추정 오차 ${ae.toFixed(2)} m${am.lost ? ' (위치 잃음!)' : ''}</span>`); }
      const nv = findNav();
      if (nv) {
        const cls = nv.state === 'succeeded' ? 'ok' : nv.state === 'failed' ? 'bad' : nv.state === 'recovery' ? 'warn' : '';
        parts.push(`<span class="wm-nav ${cls}">🧭 <b>${RosUI.esc(nv.phase)}</b>${['following', 'rotating', 'planning', 'recovery'].includes(nv.state) && nv.remaining != null ? ` · 남은 거리 ${nv.remaining.toFixed(2)} m` : ''} · 복구 ${nv.recoveries}회</span>`);
      }
      if (navMsg) parts.push(`<span class="muted">${RosUI.esc(navMsg)}</span>`);
      statusEl.innerHTML = parts.join('');
    }
    const stopLoop = RosUI.loop(stage, () => {
      render();
      const now = performance.now();
      if (now - lastStatus > 200) { lastStatus = now; status(); }
    });
    // 시뮬레이터가 꺼졌을 때 ↺ 로 다시 시작
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-act="reset"]'); if (!b || S.node.alive) return;
      S = createSim({ owner: el, world: S.worldName }); own.sim = S.node; if (!ROS.findNode('/robot_state_publisher')) own.rsp = createRsp({ owner: el }); renderBars();
    }, true);
    return () => {
      stopLoop(); offGraph(); clearTimeout(offGraph._t);
      if (pad) pad.stop();
      ['nav', 'amcl', 'mapsrv', 'slam', 'gui', 'rsp', 'sim'].forEach(destroy);
    };
  }
  RosUI.registerView('bot', botView, { title: 'Gazebo — webbot', icon: '🤖', w: 860, h: 600 });
  Widgets.register('bot', (el, o) => {
    const body = RosUI.frame(el, '🤖', 'webbot 시뮬레이터 — Gazebo-lite', '직접 해 보기');
    return botView(body, o || {});
  }, { title: 'webbot 차동 구동 로봇 시뮬레이터' });

  /* ================================================== 위젯: odom (오도메트리 드리프트) */
  Widgets.register('odom', (el, o) => {
    const body = RosUI.frame(el, '📐', '바퀴 오도메트리는 왜 틀어질까? (UMBmark 정사각형 시험)', '개념 실험');
    const slide = !!el.closest('.slide');
    const H = +o.h || (slide ? 300 : 340);
    body.innerHTML = `<div class="wm-odom">
      <div class="wm-odom-main">
        <div class="wm-odom-stage" style="height:${H}px"><canvas></canvas></div>
        <div class="wm-odom-ctl">
          <label><span>바퀴 미끄러짐 · 엔코더 잡음</span><input type="range" data-k="noise" min="0" max="10" step="0.5" value="2"><b></b></label>
          <label><span>바퀴 반지름 오차 (양쪽 모두)</span><input type="range" data-k="rad" min="-5" max="5" step="0.5" value="1"><b></b></label>
          <label><span>왼쪽·오른쪽 바퀴 크기 차이</span><input type="range" data-k="bias" min="0" max="3" step="0.1" value="0.5"><b></b></label>
          <div class="w-btns"><button type="button" class="btn small" data-a="restart">↺ 다시</button><button type="button" class="btn small" data-a="speed">⏩ ×4</button><button type="button" class="btn small" data-a="pause">⏸ 멈춤</button></div>
          <div class="wm-odom-read"></div>
        </div>
      </div>
      <div class="w-help">로봇은 <b style="color:var(--c-orange)">오도메트리(바퀴 회전으로 계산한 위치)</b>만 믿고 2 m 정사각형을 돕니다. 로봇 스스로는 매번 완벽한 정사각형을 그렸다고 생각하지만,
      <b style="color:var(--c-green)">실제 경로</b>는 바퀴 크기 오차와 미끄러짐 때문에 조금씩 틀어지고, 그 오차는 <b>계속 쌓입니다</b>.
      그래서 LiDAR 로 주변(지도)과 맞춰 보는 <b>SLAM · AMCL</b> 이 <code>map → odom</code> 변환으로 이 오차를 바로잡습니다.</div>
    </div>`;
    const cv = body.querySelector('canvas'), stage = body.querySelector('.wm-odom-stage'), read = body.querySelector('.wm-odom-read');
    const val = k => +body.querySelector(`[data-k="${k}"]`).value;
    const R = 0.033, B = 0.16, SIDE = 2;
    let T, Od, trT, trO, wp, state, laps, lapErr, speed = 1, paused = false, simT, view;
    const CORNERS = [[SIDE, 0], [SIDE, SIDE], [0, SIDE], [0, 0]];
    function restart() {
      T = { x: 0, y: 0, th: 0 }; Od = { x: 0, y: 0, th: 0 }; trT = [[0, 0]]; trO = [[0, 0]]; wp = 0; state = 'turn'; laps = 0; lapErr = []; simT = 0;
      view = { x0: -0.6, y0: -0.6, x1: SIDE + 0.6, y1: SIDE + 0.6 };
    }
    restart();
    function labels() {
      body.querySelector('[data-k="noise"] + b').textContent = val('noise').toFixed(1) + ' %';
      body.querySelector('[data-k="rad"] + b').textContent = (val('rad') > 0 ? '+' : '') + val('rad').toFixed(1) + ' %';
      body.querySelector('[data-k="bias"] + b').textContent = val('bias').toFixed(1) + ' %';
    }
    labels();
    body.addEventListener('input', labels);
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'restart') restart();
      if (b.dataset.a === 'speed') { speed = speed === 1 ? 4 : 1; b.textContent = speed === 1 ? '⏩ ×4' : '▶ ×1'; }
      if (b.dataset.a === 'pause') { paused = !paused; b.textContent = paused ? '▶ 계속' : '⏸ 멈춤'; }
    });
    function stepSim(dt) {
      // 오도메트리 위치를 기준으로 다음 꼭짓점을 향해 (로봇이 아는 것은 오도메트리뿐)
      const tgt = CORNERS[wp];
      let v = 0, w = 0;
      const dx = tgt[0] - Od.x, dy = tgt[1] - Od.y, d = Math.hypot(dx, dy), want = Math.atan2(dy, dx), e = M.normAngle(want - Od.th);
      if (state === 'turn') { if (Math.abs(e) < 0.01) state = 'go'; else w = M.clamp(3 * e, -1.5, 1.5); if (Math.abs(w) < 0.2 && w) w = Math.sign(w) * 0.2; }
      if (state === 'go') {
        if (d < 0.01) { wp = (wp + 1) % 4; state = 'turn'; if (wp === 0) { laps++; lapErr.push(Math.hypot(T.x, T.y)); } }
        else { v = Math.min(0.4, d * 2 + 0.05); w = M.clamp(2 * e, -0.8, 0.8); }
      }
      const noise = val('noise') / 100, rad = val('rad') / 100, bias = val('bias') / 100;
      // 명령 → 바퀴 회전 (명목 반지름으로 계산) → 실제 이동 (실제 반지름 + 미끄러짐)
      const wL = (v - w * B / 2) / R, wR = (v + w * B / 2) / R;
      const rL = R * (1 + rad) * (1 + bias / 2), rR = R * (1 + rad) * (1 - bias / 2);
      const sL = wL * dt * rL * (1 + noise * randn()), sR = wR * dt * rR * (1 + noise * randn());
      const ds = (sL + sR) / 2, dth = (sR - sL) / B;
      T.x += ds * Math.cos(T.th + dth / 2); T.y += ds * Math.sin(T.th + dth / 2); T.th = M.normAngle(T.th + dth);
      // 엔코더가 읽은 회전 × 명목 반지름 = 오도메트리
      const oL = wL * dt * R, oR = wR * dt * R, ods = (oL + oR) / 2, odth = (oR - oL) / B;
      Od.x += ods * Math.cos(Od.th + odth / 2); Od.y += ods * Math.sin(Od.th + odth / 2); Od.th = M.normAngle(Od.th + odth);
      simT += dt;
      const lt = trT[trT.length - 1]; if (Math.hypot(lt[0] - T.x, lt[1] - T.y) > 0.015) { trT.push([T.x, T.y]); trO.push([Od.x, Od.y]); if (trT.length > 8000) { trT.splice(0, 1000); trO.splice(0, 1000); } }
    }
    const stop = RosUI.loop(stage, (dt) => {
      if (!paused) { const n = Math.round(speed * 4); for (let i = 0; i < n; i++) stepSim(dt / 4); }
      const C = RosUI.colors(); const { w, h, ctx } = RosUI.fitCanvas(cv);
      // 화면 범위: 실제 경로가 밖으로 나가면 부드럽게 넓힘
      const want = { x0: Math.min(-0.6, T.x - 0.4), y0: Math.min(-0.6, T.y - 0.4), x1: Math.max(SIDE + 0.6, T.x + 0.4), y1: Math.max(SIDE + 0.6, T.y + 0.4) };
      ['x0', 'y0'].forEach(k => { view[k] = Math.min(view[k], view[k] + (want[k] - view[k]) * 0.1); });
      ['x1', 'y1'].forEach(k => { view[k] = Math.max(view[k], view[k] + (want[k] - view[k]) * 0.1); });
      const s = Math.min(w / (view.x1 - view.x0), (h - 24) / (view.y1 - view.y0));
      const V = { s, ox: w / 2 - (view.x0 + view.x1) / 2 * s, oy: 4 + (h - 24) / 2 + (view.y0 + view.y1) / 2 * s };
      const X = x => V.ox + x * s, Y = y => V.oy - y * s;
      ctx.fillStyle = C.card2; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = alpha(C.muted, 0.15); ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.ceil(view.x0 * 2) / 2; x <= view.x1; x += 0.5) { ctx.moveTo(X(x), 0); ctx.lineTo(X(x), h); }
      for (let y = Math.ceil(view.y0 * 2) / 2; y <= view.y1; y += 0.5) { ctx.moveTo(0, Y(y)); ctx.lineTo(w, Y(y)); }
      ctx.stroke();
      ctx.setLineDash([3, 5]); ctx.strokeStyle = alpha(C.muted, 0.7); ctx.lineWidth = 1.5; ctx.strokeRect(X(0), Y(SIDE), SIDE * s, SIDE * s); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.fillText('명령한 경로: 2 m 정사각형', X(0) + 4, Y(SIDE) - 6);
      ctx.beginPath(); ctx.arc(X(0), Y(0), 6, 0, Math.PI * 2); ctx.strokeStyle = C.fg; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = C.fg; ctx.fillText('출발', X(0) + 9, Y(0) + 14);
      drawTrail(ctx, V, trO, C.orange, [6, 4], 2.5);
      drawTrail(ctx, V, trT, C.green, null, 2.5);
      // 오차 선
      ctx.setLineDash([2, 3]); ctx.strokeStyle = C.red; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(Od.x), Y(Od.y)); ctx.lineTo(X(T.x), Y(T.y)); ctx.stroke(); ctx.setLineDash([]);
      const err = Math.hypot(T.x - Od.x, T.y - Od.y);
      if (err > 0.05) { ctx.fillStyle = C.red; ctx.font = '600 11px sans-serif'; ctx.fillText(`오차 ${err.toFixed(2)} m`, (X(Od.x) + X(T.x)) / 2 + 6, (Y(Od.y) + Y(T.y)) / 2); }
      poseArrow(ctx, V, Od.x, Od.y, Od.th, 0.3, C.orange, 2);
      drawRobot(ctx, V, T, C.green, C.dark ? '#fff' : '#14532d', 1);
      legend(ctx, { x: 0, y: 0, w: w + 60, h }, [['실제 경로 (ground truth)', C.green], ['로봇이 믿는 경로 (/odom)', C.orange, true], ['누적 오차', C.red, true]], C);
      if (Math.random() < 0.2 || paused) {
        const ang = Math.abs(M.deg(M.normAngle(T.th - Od.th)));
        read.innerHTML = `<div>바퀴 수 <b>${laps}</b> · 달린 시간 ${simT.toFixed(0)} s</div><div>지금 오차 <b class="bad">${err.toFixed(2)} m</b>, 방향 ${ang.toFixed(1)}°</div>` +
          (lapErr.length ? `<div class="wm-laps">${lapErr.slice(-8).map((e, i) => `<span title="${lapErr.length - Math.min(8, lapErr.length) + i + 1}바퀴째">${lapErr.length - Math.min(8, lapErr.length) + i + 1}바퀴: ${e.toFixed(2)} m</span>`).join('')}</div><div class="muted small">로봇은 매번 “출발점에 돌아왔다”고 생각합니다.</div>` : '<div class="muted small">한 바퀴 돌면 출발점과의 실제 거리를 기록합니다.</div>');
      }
    });
    return () => stop();
  }, { title: '오도메트리 드리프트 실험' });

  /* ================================================== 패키지 (ros2 run / ros2 launch) */
  const pidN = () => 20000 + Math.floor(Math.random() * 9000);
  /** 런치 도우미: [[label, (out) => nodes[]], ...] */
  function launchNodes(ctx, list) {
    const nodes = [];
    list.forEach(([label, fac], i) => {
      const tag = `${label}-${i + 1}`;
      const out = l => ctx.out(`[${tag}] ${l}`);
      try {
        const ns = fac(out) || [];
        ctx.out(`[INFO] [${tag}]: process started with pid [${pidN()}]`);
        ns.forEach(n => n && nodes.push(n));
      } catch (e) { ctx.out(`[ERROR] [${tag}]: ${e.message}`); }
    });
    return nodes;
  }
  const truthy = v => /^(1|true|yes|on)$/i.test(String(v));
  function mapFromArg(arg, out, world) {
    const S = findSim();
    if (arg) {
      const name = mapBase(arg), m = MAPS[name];
      if (m) return { grid: m.grid, yaml: m.path.endsWith('.yaml') ? m.path : m.path + '.yaml', label: `💾 ${name}.yaml` };
      out(`[ERROR] [map_io]: Failed processing YAML file ${arg} at position (-1:-1) for reason: bad file: ${arg}`);
      out(`[WARN] (WebROS) 저장된 지도 '${name}' 가 없어 현재 세계의 미리 만든 지도를 씁니다. 먼저 map_saver_cli -f ~/${name} 로 저장해 보세요.`);
    }
    const w = WORLDS[world] || (S ? S.world : WORLDS.room), wn = WORLDS[world] ? world : S ? S.worldName : 'room';
    return { grid: rasterize(w), yaml: `webbot_${wn}.yaml`, label: '미리 만든 지도', auto: true, world: wn };
  }
  function startLocalization(ctx, largs) {
    return launchNodes(ctx, [
      ['map_server', out => { if (findMapSrv()) { out('[WARN] map_server 가 이미 실행 중입니다'); return []; } const m = mapFromArg(largs.map, out, largs.world); return [createMapServer({ out, grid: m.grid, yaml: m.yaml, label: m.label, auto: m.auto, world: m.world }).node]; }],
      ['amcl', out => { if (findAmcl()) { out('[WARN] amcl 이 이미 실행 중입니다'); return []; } return [createAmcl({ out }).node]; }],
      ['lifecycle_manager', out => { out('[INFO] [lifecycle_manager_localization]: Configuring map_server'); out('[INFO] [lifecycle_manager_localization]: Activating amcl'); out('[INFO] [lifecycle_manager_localization]: Managed nodes are active'); return []; }]
    ]);
  }
  function startNavigation(ctx) {
    if (findNav()) { ctx.out('[WARN] [launch]: Nav2 (bt_navigator) 가 이미 실행 중입니다'); return []; }
    let st = null;
    const ns = launchNodes(ctx, [['nav2', out => { st = createNav({ out }); return st.nodes; }]]);
    return ns;
  }

  ROS.registerPkg('webbot_sim', {
    desc: '브라우저용 차동 구동 로봇(webbot) 시뮬레이터 — Gazebo-lite',
    exes: {
      sim_node(ctx) {
        const world = ctx.args.params.world || ctx.argv.find(a => WORLDS[a]) || 'room';
        if (findSim()) {
          ctx.out('[WARN] [webbot]: 이미 /webbot 시뮬레이터가 실행 중입니다 — 그 시뮬레이터의 창을 엽니다');
          ctx.openView('bot', { mode: 'drive' }, { title: 'Gazebo — webbot', closeStops: true });
          return {};
        }
        ctx.out('[INFO] [gzserver]: Gazebo multi-robot simulator, version 11.10.2 (WebROS lite)');
        const S = createSim({ name: ctx.args.name || 'webbot', out: ctx.out, remap: ctx.args.remap, params: Object.assign({}, ctx.args.params, { world }), ns: ctx.args.ns, world });
        ctx.out(`[INFO] [spawn_entity]: Spawn status: SpawnEntity: Successfully spawned entity [webbot]`);
        ctx.out(`[INFO] [webbot]: 발행: /odom /tf /tf_static /scan /imu /joint_states /ground_truth   구독: /cmd_vel`);
        ctx.openView('bot', { mode: 'drive', teleop: '1' }, { title: `Gazebo — webbot (${S.worldName})` });
        return { nodes: [S.node] };
      },
      robot_state_publisher(ctx) { return { nodes: [createRsp({ out: ctx.out })] }; }
    },
    launch: {
      'world.launch.py'(ctx) {
        const world = WORLDS[ctx.largs.world] ? ctx.largs.world : 'room';
        if (ctx.largs.world && !WORLDS[ctx.largs.world]) ctx.out(`[WARN] [launch]: 알 수 없는 world:=${ctx.largs.world} → room 을 씁니다 (room | maze | warehouse)`);
        const r = ROS.runMany(ctx, [['webbot_sim', 'sim_node', ['--ros-args', '-p', 'world:=' + world], 'gzserver']]);
        const rsp = launchNodes(ctx, [['robot_state_publisher', out => ROS.findNode('/robot_state_publisher') ? [] : [createRsp({ out })]]]);
        r.nodes.push(...rsp);
        return r;
      }
    },
    files: {
      'launch/world.launch.py': `from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node

def generate_launch_description():
    world = LaunchConfiguration('world', default='room')   # room | maze | warehouse
    return LaunchDescription([
        DeclareLaunchArgument('world', default_value='room'),
        Node(package='webbot_sim', executable='sim_node', name='webbot',
             parameters=[{'world': world}], output='screen'),
        Node(package='robot_state_publisher', executable='robot_state_publisher',
             parameters=[{'robot_description': open('webbot.urdf').read()}]),
    ])`
    }
  });

  ROS.registerPkg('slam_toolbox', {
    desc: '2D SLAM (지도 만들기 + 위치 추정) — 간소화판',
    exes: {
      async_slam_toolbox_node(ctx) {
        if (findSlam()) { ctx.out('[WARN] [slam_toolbox]: slam_toolbox 가 이미 실행 중입니다'); return { oneshot: true }; }
        const st = createSlam({ name: ctx.args.name || 'slam_toolbox', out: ctx.out, params: ctx.args.params });
        if (!findSim()) ctx.out('[WARN] [slam_toolbox]: /scan 을 보내는 로봇이 없습니다. 먼저 다른 터미널에서 ros2 launch webbot_sim world.launch.py 를 실행하세요 (또는 이 페이지의 bot 위젯).');
        else ctx.out('[INFO] [slam_toolbox]: Registering sensor: [Custom Described Lidar]');
        return { nodes: [st.node] };
      },
      sync_slam_toolbox_node(ctx) { return ROS.pkgs.slam_toolbox.exes.async_slam_toolbox_node(ctx); }
    },
    launch: {
      'online_async_launch.py'(ctx) { return ROS.runMany(ctx, [['slam_toolbox', 'async_slam_toolbox_node', ['--ros-args', '-p', 'use_sim_time:=' + (ctx.largs.use_sim_time || 'false')]]]); },
      'online_sync_launch.py'(ctx) { return ROS.runMany(ctx, [['slam_toolbox', 'sync_slam_toolbox_node', []]]); }
    }
  });

  ROS.registerPkg('nav2_map_server', {
    desc: 'Nav2 지도 서버 · 지도 저장 도구',
    exes: {
      map_saver_cli(ctx) {
        let path = 'map';
        for (let i = 0; i < ctx.argv.length; i++) if (ctx.argv[i] === '-f') path = ctx.argv[++i] || 'map';
        const shown = path.replace(/^~/, '/home/user');
        const n = ROS.createNode('map_saver', { out: ctx.out, pkg: 'nav2_map_server', exe: 'map_saver_cli' });
        ctx.proc.nodes.push(n);
        n.info('\n\tmap_saver lifecycle node launched. \n\tWaiting on external lifecycle transitions to activate\n\tSee https://design.ros2.org/articles/node_lifecycle.html for more information.');
        n.info('Creating'); n.info('Configuring');
        n.info(`Saving map from 'map' topic to '${shown}' file`);
        n.warn('Free threshold unspecified. Setting it to default value: 0.250000');
        n.warn('Occupied threshold unspecified. Setting it to default value: 0.650000');
        let done = false;
        n.createSubscription('nav_msgs/msg/OccupancyGrid', 'map', m => {
          if (done) return; done = true;
          const g = gridFromMsg(m);
          ctx.out(`[WARN] [map_io]: Image format unspecified. Setting it to: pgm`);
          ctx.out(`[INFO] [map_io]: Received a ${g.W} X ${g.H} map @ ${g.res.toFixed(2)} m/pix`);
          ctx.out(`[INFO] [map_io]: Writing map occupancy data to ${shown}.pgm`);
          ctx.out(`[INFO] [map_io]: Writing map metadata to ${shown}.yaml`);
          ctx.out(`[INFO] [map_io]: Map saved`);
          const saved = saveMap(path, g);
          n.info('Map saved successfully');
          ctx.out(`# ${shown}.yaml (브라우저 메모리에 저장됨)\n${saved.yaml}`);
          n.info('Destroying');
          setTimeout(() => ctx.exit(0), 30);
        }, { depth: 1, durability: 'transient_local' });
        setTimeout(() => { if (!done && n.alive) { n.error('Failed to spin map subscription'); n.info('Destroying'); ctx.exit(1); } }, 2500);
        return { nodes: [n] };
      },
      map_server(ctx) {
        if (findMapSrv()) { ctx.out('[WARN] [map_server]: map_server 가 이미 실행 중입니다'); return { oneshot: true }; }
        const m = mapFromArg(ctx.args.params.yaml_filename, ctx.out);
        const st = createMapServer({ out: ctx.out, grid: m.grid, yaml: m.yaml, label: m.label, auto: m.auto, world: m.world });
        return { nodes: [st.node] };
      }
    }
  });
  ROS.registerPkg('nav2_amcl', { desc: '파티클 필터 위치 추정 (간소화)', exes: { amcl(ctx) { return { nodes: [createAmcl({ out: ctx.out }).node] }; } } });

  ROS.registerPkg('nav2_bringup', {
    desc: 'Nav2 실행 묶음 (localization · navigation · rviz)',
    launch: {
      'navigation_launch.py'(ctx) { return { nodes: startNavigation(ctx) }; },
      'localization_launch.py'(ctx) { return { nodes: startLocalization(ctx, ctx.largs) }; },
      'bringup_launch.py'(ctx) {
        let nodes = [];
        if (truthy(ctx.largs.slam)) nodes = launchNodes(ctx, [['slam_toolbox', out => findSlam() ? [] : [createSlam({ out }).node]]]);
        else nodes = startLocalization(ctx, ctx.largs);
        return { nodes: nodes.concat(startNavigation(ctx)) };
      },
      'rviz_launch.py'(ctx) {
        try { const p = ROS.run('rviz2', 'rviz2', ['-d', 'nav2_default_view.rviz'], { out: l => ctx.out('[rviz2-1] ' + l) }); return { nodes: p.nodes, stop() { p.stop(); } }; }
        catch (e) { ctx.out('[ERROR] [launch]: rviz2 를 찾을 수 없습니다'); return {}; }
      },
      'tb3_simulation_launch.py'(ctx) {
        const world = WORLDS[ctx.largs.world] ? ctx.largs.world : 'room';
        const procs = [];
        if (!findSim()) procs.push(ROS.run('webbot_sim', 'sim_node', ['--ros-args', '-p', 'world:=' + world], { out: l => ctx.out('[gzserver-1] ' + l) }));
        const nodes = [];
        if (!ROS.findNode('/robot_state_publisher')) nodes.push(...launchNodes(ctx, [['robot_state_publisher', out => [createRsp({ out })]]]));
        nodes.push(...(truthy(ctx.largs.slam) ? launchNodes(ctx, [['slam_toolbox', out => findSlam() ? [] : [createSlam({ out }).node]]]) : startLocalization(ctx, Object.assign({ world }, ctx.largs))));
        nodes.push(...startNavigation(ctx));
        if (ROS.pkgs.rviz2 && ctx.largs.use_rviz !== 'False' && ctx.largs.use_rviz !== 'false') { try { procs.push(ROS.run('rviz2', 'rviz2', ['-d', 'nav2_default_view.rviz'], { out: l => ctx.out('[rviz2-9] ' + l) })); } catch (_) {} }
        return { nodes: nodes.concat(...procs.map(p => p.nodes)), stop() { procs.forEach(p => p.stop()); } };
      }
    }
  });

  /* ================================================== 내보내기 */
  ROS.webbot = {
    BOT, WORLDS, MAPS, URDF: WEBBOT_URDF,
    createSim, createRsp, createSlam, createMapServer, createAmcl, createNav, teleopPad,
    findSim, findSlam, findMapSrv, findAmcl, findNav,
    rasterize, gridMsg, gridFromMsg, saveMap, astar, cast, collides
  };
})();
