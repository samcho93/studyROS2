/* ===================================================================
   URDF 위젯 그룹 (js/w/urdf.js)
   - URDFKit: 작은 XML 파서(줄 번호 오류) · URDF 해석 · 정기구학 · 프리셋 · check_urdf · xacro 변환
   - robot_state_publisher / joint_state_publisher(_gui) 노드 로직 (createRSP / createJSP)
   - 위젯 'urdf' + 보기 'urdf', 'jsp_gui'
   - 패키지: robot_state_publisher, joint_state_publisher(_gui), urdf_tutorial, so_arm101_description
   3D 그리기는 js/w/arm.js 의 window.W3D 를 씁니다(arm.js 가 먼저 로드됨).
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = v => { const x = +(+v).toFixed(6); return String(Object.is(x, -0) ? 0 : x); };

  /* ================================================== 작은 XML 파서 (줄/열 정보) */
  function xmlError(src, at, msg) {
    const pre = src.slice(0, at);
    const line = pre.split('\n').length, col = at - pre.lastIndexOf('\n');
    const e = new Error(msg); e.line = line; e.col = col; e.xml = true; return e;
  }
  function parseXML(src) {
    src = String(src == null ? '' : src);
    const doc = { tag: '#doc', attrs: {}, children: [], line: 0 };
    const stack = [doc];
    const lineAt = at => src.slice(0, at).split('\n').length;
    let i = 0;
    while (i < src.length) {
      const lt = src.indexOf('<', i);
      if (lt < 0) { const rest = src.slice(i).trim(); if (rest && stack.length === 1) throw xmlError(src, i, `태그 밖에 글자가 있습니다: "${rest.slice(0, 20)}"`); break; }
      const text = src.slice(i, lt).trim();
      if (text && stack.length === 1) throw xmlError(src, i + src.slice(i).search(/\S/), `태그 밖에 글자가 있습니다: "${text.slice(0, 20)}"`);
      i = lt;
      if (src.startsWith('<!--', i)) { const e = src.indexOf('-->', i + 4); if (e < 0) throw xmlError(src, i, '주석(<!-- … -->)이 닫히지 않았습니다'); i = e + 3; continue; }
      if (src.startsWith('<?', i)) { const e = src.indexOf('?>', i + 2); if (e < 0) throw xmlError(src, i, '<?xml … ?> 선언이 닫히지 않았습니다'); i = e + 2; continue; }
      if (src.startsWith('<![CDATA[', i)) { const e = src.indexOf(']]>', i); if (e < 0) throw xmlError(src, i, 'CDATA 가 닫히지 않았습니다'); i = e + 3; continue; }
      if (src.startsWith('<!', i)) { const e = src.indexOf('>', i); if (e < 0) throw xmlError(src, i, '<! … > 가 닫히지 않았습니다'); i = e + 1; continue; }
      if (src.startsWith('</', i)) {
        const m = /^<\/\s*([A-Za-z_][\w:.-]*)\s*>/.exec(src.slice(i, i + 200));
        if (!m) throw xmlError(src, i, '닫는 태그 모양이 잘못되었습니다 (예: </link>)');
        const top = stack[stack.length - 1];
        if (stack.length === 1) throw xmlError(src, i, `여는 태그 없이 </${m[1]}> 가 나왔습니다`);
        if (top.tag !== m[1]) throw xmlError(src, i, `닫는 태그 </${m[1]}> 가 ${top.line}행의 <${top.tag}> 와 짝이 맞지 않습니다`);
        stack.pop(); i += m[0].length; continue;
      }
      // 여는 태그
      const start = i;
      i++;
      const nm = /^[A-Za-z_][\w:.-]*/.exec(src.slice(i, i + 100));
      if (!nm) throw xmlError(src, start, "'<' 다음에 태그 이름이 와야 합니다");
      i += nm[0].length;
      const el = { tag: nm[0], attrs: {}, children: [], line: lineAt(start) };
      let closed = false;
      for (;;) {
        while (i < src.length && /\s/.test(src[i])) i++;
        if (i >= src.length) throw xmlError(src, start, `<${el.tag}> 태그가 '>' 로 끝나지 않았습니다`);
        if (src.startsWith('/>', i)) { i += 2; closed = true; break; }
        if (src[i] === '>') { i++; break; }
        if (src[i] === '<') throw xmlError(src, i, `<${el.tag}> 태그가 '>' 로 끝나지 않았습니다`);
        const an = /^[A-Za-z_][\w:.-]*/.exec(src.slice(i, i + 100));
        if (!an) throw xmlError(src, i, `<${el.tag}> 안의 속성 이름이 잘못되었습니다: '${src[i]}'`);
        i += an[0].length;
        while (/\s/.test(src[i])) i++;
        if (src[i] !== '=') throw xmlError(src, i, `속성 ${an[0]} 다음에 '=' 가 필요합니다 (예: ${an[0]}="…")`);
        i++; while (/\s/.test(src[i])) i++;
        const q = src[i];
        if (q !== '"' && q !== "'") throw xmlError(src, i, `속성 ${an[0]} 의 값은 따옴표로 감싸야 합니다`);
        const e = src.indexOf(q, i + 1);
        if (e < 0 || src.slice(i + 1, e).includes('<')) throw xmlError(src, i, `속성 ${an[0]} 의 따옴표가 닫히지 않았습니다`);
        if (an[0] in el.attrs) throw xmlError(src, i, `속성 ${an[0]} 가 두 번 나왔습니다`);
        el.attrs[an[0]] = src.slice(i + 1, e);
        i = e + 1;
      }
      stack[stack.length - 1].children.push(el);
      if (!closed) stack.push(el);
    }
    if (stack.length > 1) { const top = stack[stack.length - 1]; const e = new Error(`${top.line}행의 <${top.tag}> 가 닫히지 않았습니다 (</${top.tag}> 필요)`); e.line = top.line; e.col = 1; e.xml = true; throw e; }
    return doc;
  }
  const kids = (el, tag) => el.children.filter(c => c.tag === tag);
  const kid = (el, tag) => el.children.find(c => c.tag === tag);

  /* ================================================== URDF 해석 */
  const JTYPES = ['revolute', 'continuous', 'prismatic', 'fixed', 'floating', 'planar'];
  function nums(s, n, what, line, errs) {
    const a = String(s == null ? '' : s).trim().split(/\s+/).filter(Boolean).map(Number);
    if (a.length !== n || a.some(v => !Number.isFinite(v))) { errs.push({ msg: `${what}: 숫자 ${n}개가 필요합니다 ("${s}")`, line }); return null; }
    return a;
  }
  function parseOrigin(el, errs) {
    const o = { xyz: [0, 0, 0], rpy: [0, 0, 0] };
    if (!el) return o;
    if (el.attrs.xyz != null) o.xyz = nums(el.attrs.xyz, 3, '<origin xyz>', el.line, errs) || o.xyz;
    if (el.attrs.rpy != null) o.rpy = nums(el.attrs.rpy, 3, '<origin rpy>', el.line, errs) || o.rpy;
    return o;
  }
  function parseColor(el, errs) {
    const c = el && kid(el, 'color');
    if (!c) return null;
    const a = nums(c.attrs.rgba, 4, '<color rgba>', c.line, errs);
    return a;
  }
  /** text → { model, errors:[{msg,line}], warnings:[] } */
  function parseURDF(text) {
    const errors = [], warnings = [];
    let doc;
    try { doc = parseXML(text); } catch (e) { return { model: null, errors: [{ msg: 'XML 오류: ' + e.message, line: e.line, col: e.col }], warnings }; }
    const robot = doc.children.find(c => c.tag === 'robot');
    if (!robot) return { model: null, errors: [{ msg: "Could not find the 'robot' element in the xml file — 맨 바깥 태그는 <robot name=\"…\"> 이어야 합니다", line: (doc.children[0] || {}).line || 1 }], warnings };
    const model = { name: robot.attrs.name || '', links: new Map(), joints: [], materials: {}, root: null, children: {}, parentOf: {}, line: robot.line };
    if (!robot.attrs.name) errors.push({ msg: 'No name given for the robot. — <robot name="…"> 로 이름을 주세요', line: robot.line });
    kids(robot, 'material').forEach(m => { const c = parseColor(m, errors); if (m.attrs.name && c) model.materials[m.attrs.name] = c; });
    const known = new Set(['link', 'joint', 'material', 'gazebo', 'transmission', 'ros2_control', 'xacro:property', 'xacro:macro']);
    robot.children.forEach(c => { if (!known.has(c.tag) && !c.tag.startsWith('xacro:')) warnings.push({ msg: `알 수 없는 태그 <${c.tag}> 는 무시합니다`, line: c.line }); if (c.tag.startsWith('xacro:')) warnings.push({ msg: `<${c.tag}> 는 xacro 문법입니다 — 먼저 xacro 로 URDF 를 만들어야 합니다`, line: c.line }); });
    kids(robot, 'link').forEach(l => {
      const name = l.attrs.name;
      if (!name) { errors.push({ msg: 'No name given for the link. — <link name="…">', line: l.line }); return; }
      if (model.links.has(name)) { errors.push({ msg: `link '${name}' is not unique. — 같은 이름의 링크가 두 개입니다`, line: l.line }); return; }
      const link = { name, visuals: [], line: l.line };
      kids(l, 'visual').forEach(v => {
        const g = kid(v, 'geometry');
        const vis = { origin: parseOrigin(kid(v, 'origin'), errors), rgba: null, matName: null, line: v.line };
        if (!g || !g.children.length) { errors.push({ msg: `link '${name}' 의 <visual> 에 <geometry> 가 없습니다`, line: v.line }); return; }
        const s = g.children[0];
        vis.type = s.tag;
        if (s.tag === 'box') { vis.size = nums(s.attrs.size, 3, '<box size>', s.line, errors); if (!vis.size) return; }
        else if (s.tag === 'cylinder') { vis.radius = +s.attrs.radius; vis.length = +s.attrs.length; if (!(vis.radius > 0) || !(vis.length > 0)) { errors.push({ msg: '<cylinder> 에는 radius 와 length 가 필요합니다', line: s.line }); return; } }
        else if (s.tag === 'sphere') { vis.radius = +s.attrs.radius; if (!(vis.radius > 0)) { errors.push({ msg: '<sphere> 에는 radius 가 필요합니다', line: s.line }); return; } }
        else if (s.tag === 'mesh') { vis.filename = s.attrs.filename || ''; vis.scale = s.attrs.scale ? nums(s.attrs.scale, 3, '<mesh scale>', s.line, errors) : [1, 1, 1]; warnings.push({ msg: `mesh(${vis.filename}) 는 브라우저에서 불러올 수 없어 작은 상자로 대신 그립니다`, line: s.line }); }
        else { errors.push({ msg: `알 수 없는 geometry <${s.tag}> (box · cylinder · sphere · mesh 중 하나)`, line: s.line }); return; }
        const m = kid(v, 'material');
        if (m) {
          vis.matName = m.attrs.name || null;
          const c = parseColor(m, errors);
          if (c) { vis.rgba = c; if (m.attrs.name && !model.materials[m.attrs.name]) model.materials[m.attrs.name] = c; }
        }
        link.visuals.push(vis);
      });
      model.links.set(name, link);
    });
    // material 이름 참조 해석 (정의가 뒤에 와도 됨)
    model.links.forEach(l => l.visuals.forEach(v => { if (!v.rgba && v.matName) { if (model.materials[v.matName]) v.rgba = model.materials[v.matName]; else warnings.push({ msg: `material '${v.matName}' 의 색(rgba)이 정의되지 않았습니다`, line: v.line }); } }));
    if (!model.links.size && !errors.length) errors.push({ msg: 'No link elements found in urdf file — <link> 가 하나 이상 있어야 합니다', line: robot.line });
    const jnames = new Set();
    kids(robot, 'joint').forEach(j => {
      const name = j.attrs.name, type = j.attrs.type;
      if (!name) { errors.push({ msg: 'unnamed joint found — <joint name="…">', line: j.line }); return; }
      if (jnames.has(name)) { errors.push({ msg: `joint '${name}' is not unique.`, line: j.line }); return; }
      jnames.add(name);
      if (!JTYPES.includes(type)) { errors.push({ msg: `Joint [${name}] has no known type [${type || ''}] — revolute · continuous · prismatic · fixed 중 하나`, line: j.line }); return; }
      const P = kid(j, 'parent'), C = kid(j, 'child');
      if (!P || !P.attrs.link) { errors.push({ msg: `Parent link not found for joint [${name}] — <parent link="…"/> 가 필요합니다`, line: j.line }); return; }
      if (!C || !C.attrs.link) { errors.push({ msg: `Child link not found for joint [${name}] — <child link="…"/> 가 필요합니다`, line: j.line }); return; }
      const jt = { name, type, parent: P.attrs.link, child: C.attrs.link, line: j.line, lower: 0, upper: 0, velocity: 0, effort: 0, axis: [1, 0, 0], hasLimit: false };
      const o = parseOrigin(kid(j, 'origin'), errors); jt.xyz = o.xyz; jt.rpy = o.rpy;
      const ax = kid(j, 'axis');
      if (ax && ax.attrs.xyz != null) { const a = nums(ax.attrs.xyz, 3, '<axis xyz>', ax.line, errors); if (a) { const n = Math.hypot(a[0], a[1], a[2]); if (n < 1e-9) errors.push({ msg: `Joint [${name}] 의 axis 가 0 벡터입니다`, line: ax.line }); else jt.axis = a.map(v => v / n); } }
      const lim = kid(j, 'limit');
      if (lim) { jt.hasLimit = true; jt.lower = +(lim.attrs.lower || 0); jt.upper = +(lim.attrs.upper || 0); jt.velocity = +(lim.attrs.velocity || 0); jt.effort = +(lim.attrs.effort || 0); }
      if ((type === 'revolute' || type === 'prismatic') && !lim) errors.push({ msg: `Joint [${name}] is of type ${type.toUpperCase()} but it does not specify limits — <limit lower upper effort velocity/> 가 필요합니다`, line: j.line });
      if (lim && jt.lower > jt.upper) errors.push({ msg: `Joint [${name}] 의 limit 에서 lower(${jt.lower}) > upper(${jt.upper}) 입니다`, line: lim.line });
      if (type === 'floating' || type === 'planar') warnings.push({ msg: `${type} 조인트 [${name}] 는 이 시뮬레이터에서 fixed 처럼 다룹니다`, line: j.line });
      model.joints.push(jt);
    });
    // 트리 구성
    model.joints.forEach(j => {
      if (!model.links.has(j.parent)) { errors.push({ msg: `Failed to find parent link [${j.parent}] for joint [${j.name}]`, line: j.line }); return; }
      if (!model.links.has(j.child)) { errors.push({ msg: `Failed to find child link [${j.child}] for joint [${j.name}]`, line: j.line }); return; }
      if (model.parentOf[j.child]) { errors.push({ msg: `link '${j.child}' 의 부모 조인트가 두 개입니다 ([${model.parentOf[j.child].name}], [${j.name}]) — URDF 는 나무(tree) 구조여야 합니다`, line: j.line }); return; }
      model.parentOf[j.child] = j;
      (model.children[j.parent] = model.children[j.parent] || []).push(j);
    });
    if (!errors.length) {
      const roots = [...model.links.keys()].filter(l => !model.parentOf[l]);
      if (roots.length > 1) errors.push({ msg: `Two root links found: [${roots[0]}] and [${roots[1]}] — 링크는 조인트로 모두 이어져야 합니다`, line: model.links.get(roots[1]).line });
      else if (!roots.length) errors.push({ msg: 'No root link found. The robot xml is not a valid tree. (순환 구조)', line: robot.line });
      else model.root = roots[0];
      if (model.root) { // 순환 검사
        const seen = new Set(); const st = [model.root];
        while (st.length) { const l = st.pop(); seen.add(l); (model.children[l] || []).forEach(j => st.push(j.child)); }
        if (seen.size !== model.links.size) errors.push({ msg: 'The robot xml is not a valid tree (순환 또는 떨어진 링크가 있습니다)', line: robot.line });
      }
    }
    return { model: errors.length ? null : model, errors, warnings };
  }
  function movable(model) { return model ? model.joints.filter(j => j.type === 'revolute' || j.type === 'continuous' || j.type === 'prismatic') : []; }

  /* ================================================== 행렬 (열 우선 16개, SO101 과 같은 배치) */
  const MX = {
    I: () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    mul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; },
    rpyXyz(rpy, xyz) {
      const cr = Math.cos(rpy[0]), sr = Math.sin(rpy[0]), cp = Math.cos(rpy[1]), sp = Math.sin(rpy[1]), cy = Math.cos(rpy[2]), sy = Math.sin(rpy[2]);
      return [cy * cp, sy * cp, -sp, 0, cy * sp * sr - sy * cr, sy * sp * sr + cy * cr, cp * sr, 0, cy * sp * cr + sy * sr, sy * sp * cr - cy * sr, cp * cr, 0, xyz[0], xyz[1], xyz[2], 1];
    },
    axisAngle(a, t) {
      const [x, y, z] = a, c = Math.cos(t), s = Math.sin(t), C = 1 - c;
      return [c + x * x * C, y * x * C + z * s, z * x * C - y * s, 0, x * y * C - z * s, c + y * y * C, z * y * C + x * s, 0, x * z * C + y * s, y * z * C - x * s, c + z * z * C, 0, 0, 0, 0, 1];
    },
    trans(v) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, v[0], v[1], v[2], 1]; },
    xf(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; },
    dir(m, v) { return [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]]; },
    pos(m) { return [m[12], m[13], m[14]]; },
    toQuat(m) {
      const m00 = m[0], m01 = m[4], m02 = m[8], m10 = m[1], m11 = m[5], m12 = m[9], m20 = m[2], m21 = m[6], m22 = m[10];
      const tr = m00 + m11 + m22; let x, y, z, w, s;
      if (tr > 0) { s = Math.sqrt(tr + 1) * 2; w = s / 4; x = (m21 - m12) / s; y = (m02 - m20) / s; z = (m10 - m01) / s; }
      else if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; w = (m21 - m12) / s; x = s / 4; y = (m01 + m10) / s; z = (m02 + m20) / s; }
      else if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; w = (m02 - m20) / s; x = (m01 + m10) / s; y = s / 4; z = (m12 + m21) / s; }
      else { s = Math.sqrt(1 + m22 - m00 - m11) * 2; w = (m10 - m01) / s; x = (m02 + m20) / s; y = (m12 + m21) / s; z = s / 4; }
      return { x, y, z, w };
    }
  };
  function jointMotion(j, v) {
    v = v || 0;
    if (j.type === 'revolute' || j.type === 'continuous') return MX.axisAngle(j.axis, v);
    if (j.type === 'prismatic') return MX.trans([j.axis[0] * v, j.axis[1] * v, j.axis[2] * v]);
    return MX.I();
  }
  /** 부모 링크 → 자식 링크 변환 (조인트 값 포함) */
  function jointLocal(j, v) { return MX.mul(MX.rpyXyz(j.rpy, j.xyz), jointMotion(j, v)); }
  /** 모든 링크의 root 기준 변환 { links:{}, joints:{name: 조인트 원점(움직이기 전) 변환} } */
  function fk(model, q) {
    const links = {}, joints = {};
    if (!model || !model.root) return { links, joints };
    links[model.root] = MX.I();
    const st = [model.root];
    while (st.length) {
      const l = st.pop();
      (model.children[l] || []).forEach(j => {
        const o = MX.mul(links[l], MX.rpyXyz(j.rpy, j.xyz));
        joints[j.name] = o;
        links[j.child] = MX.mul(o, jointMotion(j, q ? q[j.name] : 0));
        st.push(j.child);
      });
    }
    return { links, joints };
  }
  function defaultPos(j) { if (j.type === 'continuous') return 0; if (j.lower <= 0 && j.upper >= 0) return 0; return (j.lower + j.upper) / 2; }

  /* ================================================== 프리셋 URDF */
  const MAT = (name, rgba) => `  <material name="${name}">\n    <color rgba="${rgba}"/>\n  </material>\n`;
  function presetBox() {
    return `<?xml version="1.0"?>
<!-- 가장 단순한 URDF: 링크 하나 -->
<robot name="box_bot">
  <link name="base_link">
    <visual>
      <origin xyz="0 0 0.1" rpy="0 0 0"/>
      <geometry>
        <box size="0.6 0.4 0.2"/>
      </geometry>
      <material name="blue">
        <color rgba="0.2 0.4 0.9 1"/>
      </material>
    </visual>
  </link>
</robot>
`;
  }
  function presetTwoLink() {
    return `<?xml version="1.0"?>
<!-- 관절 두 개짜리 팔: revolute 조인트 + fixed 조인트(tool0) -->
<robot name="two_link_arm">
${MAT('gray', '0.6 0.6 0.65 1')}${MAT('orange', '1.0 0.55 0.1 1')}${MAT('blue', '0.2 0.4 0.9 1')}
  <link name="base_link">
    <visual>
      <origin xyz="0 0 0.05" rpy="0 0 0"/>
      <geometry><cylinder radius="0.08" length="0.1"/></geometry>
      <material name="gray"/>
    </visual>
  </link>

  <joint name="joint1" type="revolute">
    <parent link="base_link"/>
    <child link="link1"/>
    <origin xyz="0 0 0.1" rpy="0 0 0"/>
    <axis xyz="0 0 1"/>
    <limit lower="-3.14" upper="3.14" effort="10" velocity="1.0"/>
  </joint>

  <link name="link1">
    <visual>
      <origin xyz="0 0 0.15" rpy="0 0 0"/>
      <geometry><box size="0.05 0.05 0.3"/></geometry>
      <material name="orange"/>
    </visual>
  </link>

  <joint name="joint2" type="revolute">
    <parent link="link1"/>
    <child link="link2"/>
    <origin xyz="0 0 0.3" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
    <limit lower="-2.0" upper="2.0" effort="10" velocity="1.0"/>
  </joint>

  <link name="link2">
    <visual>
      <origin xyz="0 0 0.125" rpy="0 0 0"/>
      <geometry><box size="0.04 0.04 0.25"/></geometry>
      <material name="blue"/>
    </visual>
  </link>

  <joint name="tool_joint" type="fixed">
    <parent link="link2"/>
    <child link="tool0"/>
    <origin xyz="0 0 0.25" rpy="0 0 0"/>
  </joint>

  <link name="tool0">
    <visual>
      <geometry><sphere radius="0.025"/></geometry>
      <material name="gray"/>
    </visual>
  </link>
</robot>
`;
  }
  /** urdf_tutorial 의 R2D2 를 단계별로 (1:myfirst 2:multipleshapes 3:origins 4:materials 5:visual 6:flexible 7:physics 8:macroed) */
  function presetR2D2(stage) {
    stage = stage || 6;
    const names = { 1: 'myfirst', 2: 'multipleshapes', 3: 'origins', 4: 'materials', 5: 'visual', 6: 'flexible', 7: 'physics', 8: 'macroed' };
    const flex = stage >= 6;
    const mat = stage >= 4;
    const m = n => mat ? `\n      <material name="${n}"/>` : '';
    let s = `<?xml version="1.0"?>\n<!-- urdf_tutorial: ${String(stage).padStart(2, '0')}-${names[stage]}${stage >= 8 ? '.urdf.xacro (xacro 전개 결과)' : '.urdf'} (간소화) -->\n<robot name="${names[stage]}">\n`;
    if (mat) s += MAT('blue', '0 0 0.8 1') + MAT('black', '0 0 0 1') + MAT('white', '1 1 1 1');
    s += `
  <link name="base_link">
    <visual>
      <geometry>
        <cylinder length="0.6" radius="0.2"/>
      </geometry>${m('blue')}
    </visual>
  </link>
`;
    if (stage === 1) return s + '\n</robot>\n';
    const leg = side => {
      const y = side === 'right' ? -0.22 : 0.22;
      let t = `
  <link name="${side}_leg">
    <visual>
      <geometry>
        <box size="0.6 0.1 0.2"/>
      </geometry>${stage >= 3 ? '\n      <origin rpy="0 1.57075 0" xyz="0 0 -0.3"/>' : ''}${m('white')}
    </visual>
  </link>

  <joint name="base_to_${side}_leg" type="fixed">
    <parent link="base_link"/>
    <child link="${side}_leg"/>${stage >= 3 ? `\n    <origin xyz="0 ${y} 0.25"/>` : ''}
  </joint>
`;
      if (stage >= 5) {
        t += `
  <link name="${side}_base">
    <visual>
      <geometry>
        <box size="0.4 0.1 0.1"/>
      </geometry>${m('white')}
    </visual>
  </link>

  <joint name="${side}_base_joint" type="fixed">
    <parent link="${side}_leg"/>
    <child link="${side}_base"/>
    <origin xyz="0 0 -0.6"/>
  </joint>
`;
        ['front', 'back'].forEach(fb => {
          t += `
  <link name="${side}_${fb}_wheel">
    <visual>
      <origin rpy="1.57075 0 0" xyz="0 0 0"/>
      <geometry>
        <cylinder length="0.1" radius="0.035"/>
      </geometry>${m('black')}
    </visual>
  </link>

  <joint name="${side}_${fb}_wheel_joint" type="${flex ? 'continuous' : 'fixed'}">${flex ? '\n    <axis rpy="0 0 0" xyz="0 1 0"/>' : ''}
    <parent link="${side}_base"/>
    <child link="${side}_${fb}_wheel"/>
    <origin rpy="0 0 0" xyz="${fb === 'front' ? '0.133333333333' : '-0.133333333333'} 0 -0.085"/>
  </joint>
`;
        });
      }
      return t;
    };
    s += leg('right');
    if (stage >= 4) s += leg('left');
    if (stage >= 5) {
      s += `
  <joint name="gripper_extension" type="${flex ? 'prismatic' : 'fixed'}">
    <parent link="base_link"/>
    <child link="gripper_pole"/>${flex ? '\n    <limit effort="1000.0" lower="-0.38" upper="0" velocity="0.5"/>' : ''}
    <origin rpy="0 0 0" xyz="0.19 0 0.2"/>
  </joint>

  <link name="gripper_pole">
    <visual>
      <geometry>
        <cylinder length="0.2" radius="0.01"/>
      </geometry>
      <origin rpy="0 1.57075 0" xyz="0.1 0 0"/>${m('white')}
    </visual>
  </link>
`;
      ['left', 'right'].forEach(side => {
        const sg = side === 'left' ? 1 : -1;
        s += `
  <joint name="${side}_gripper_joint" type="${flex ? 'revolute' : 'fixed'}">${flex ? `\n    <axis xyz="0 0 ${sg}"/>\n    <limit effort="1000.0" lower="0.0" upper="0.548" velocity="0.5"/>` : ''}
    <origin rpy="0 0 0" xyz="0.2 ${sg * 0.01} 0"/>
    <parent link="gripper_pole"/>
    <child link="${side}_gripper"/>
  </joint>

  <link name="${side}_gripper">
    <visual>
      <!-- 원본은 mesh(l_finger.dae) — 여기서는 상자로 대신 -->
      <origin rpy="0 0 ${sg * 0.3}" xyz="0.04 ${sg * 0.012} 0"/>
      <geometry>
        <box size="0.08 0.015 0.02"/>
      </geometry>${m('white')}
    </visual>
  </link>

  <joint name="${side}_tip_joint" type="fixed">
    <parent link="${side}_gripper"/>
    <child link="${side}_tip"/>
    <origin xyz="0.08 ${sg * 0.024} 0"/>
  </joint>

  <link name="${side}_tip">
    <visual>
      <origin rpy="0 0 ${-sg * 0.3}" xyz="0.025 ${-sg * 0.008} 0"/>
      <geometry>
        <box size="0.05 0.012 0.02"/>
      </geometry>${m('black')}
    </visual>
  </link>
`;
      });
      s += `
  <link name="head">
    <visual>
      <geometry>
        <sphere radius="0.2"/>
      </geometry>${m('white')}
    </visual>
  </link>

  <joint name="head_swivel" type="${flex ? 'continuous' : 'fixed'}">
    <parent link="base_link"/>
    <child link="head"/>${flex ? '\n    <axis xyz="0 0 1"/>' : ''}
    <origin xyz="0 0 0.3"/>
  </joint>

  <link name="box">
    <visual>
      <geometry>
        <box size="0.08 0.08 0.08"/>
      </geometry>${m('blue')}
    </visual>
  </link>

  <joint name="tobox" type="fixed">
    <parent link="head"/>
    <child link="box"/>
    <origin xyz="0.1814 0 0.1414"/>
  </joint>
`;
    }
    return s + '\n</robot>\n';
  }
  function presetDiffbot() {
    const wheel = side => {
      const y = side === 'left' ? 0.13 : -0.13;
      return `
  <joint name="${side}_wheel_joint" type="continuous">
    <parent link="base_link"/>
    <child link="${side}_wheel"/>
    <origin xyz="0 ${y} 0" rpy="0 0 0"/>
    <axis xyz="0 1 0"/>
  </joint>

  <link name="${side}_wheel">
    <visual>
      <origin xyz="0 0 0" rpy="1.5708 0 0"/>
      <geometry><cylinder radius="0.05" length="0.03"/></geometry>
      <material name="black"/>
    </visual>
    <visual>
      <!-- 바퀴가 도는 게 보이도록 붙인 표시 -->
      <origin xyz="0.025 0 0" rpy="0 0 0"/>
      <geometry><box size="0.04 0.032 0.01"/></geometry>
      <material name="white"/>
    </visual>
  </link>
`;
    };
    return `<?xml version="1.0"?>
<!-- 작은 차동 구동 로봇: 바퀴 두 개(continuous) + 캐스터 + 라이다 + 카메라 -->
<robot name="diffbot">
${MAT('blue', '0.15 0.35 0.85 1')}${MAT('black', '0.1 0.1 0.1 1')}${MAT('white', '0.95 0.95 0.95 1')}${MAT('red', '0.85 0.2 0.2 1')}${MAT('gray', '0.55 0.55 0.6 1')}
  <!-- 바닥에 붙은 기준 프레임 -->
  <link name="base_footprint"/>

  <joint name="base_joint" type="fixed">
    <parent link="base_footprint"/>
    <child link="base_link"/>
    <origin xyz="0 0 0.05" rpy="0 0 0"/>
  </joint>

  <link name="base_link">
    <visual>
      <origin xyz="-0.03 0 0.03" rpy="0 0 0"/>
      <geometry><box size="0.30 0.22 0.08"/></geometry>
      <material name="blue"/>
    </visual>
  </link>
${wheel('left')}${wheel('right')}
  <joint name="caster_joint" type="fixed">
    <parent link="base_link"/>
    <child link="caster_link"/>
    <origin xyz="-0.14 0 -0.025" rpy="0 0 0"/>
  </joint>

  <link name="caster_link">
    <visual>
      <geometry><sphere radius="0.025"/></geometry>
      <material name="gray"/>
    </visual>
  </link>

  <joint name="laser_joint" type="fixed">
    <parent link="base_link"/>
    <child link="laser_link"/>
    <origin xyz="0.02 0 0.09" rpy="0 0 0"/>
  </joint>

  <link name="laser_link">
    <visual>
      <geometry><cylinder radius="0.035" length="0.04"/></geometry>
      <material name="red"/>
    </visual>
  </link>

  <joint name="camera_joint" type="fixed">
    <parent link="base_link"/>
    <child link="camera_link"/>
    <origin xyz="0.125 0 0.05" rpy="0 0 0"/>
  </joint>

  <link name="camera_link">
    <visual>
      <geometry><box size="0.02 0.08 0.025"/></geometry>
      <material name="white"/>
    </visual>
  </link>
</robot>
`;
  }
  /** SO-ARM101 URDF — window.SO101 의 조인트/형상 데이터로 생성 (메시는 상자로 근사) */
  function presetSO101() {
    const K = window.SO101;
    if (!K) return presetTwoLink();
    const f = a => a.map(num).join(' ');
    let s = `<?xml version="1.0"?>
<!-- SO-ARM101 (so101_new_calib.urdf 수치) — STL 메시 대신 상자로 근사한 버전 -->
<robot name="so101_new_calib">
${MAT('print', '1.0 0.82 0.12 1')}${MAT('servo', '0.12 0.12 0.14 1')}`;
    const links = K.LINK_ORDER.concat([K.TOOL.child]);
    links.forEach(name => {
      const shapes = K.LINK_SHAPES[name] || [];
      if (!shapes.length) { s += `\n  <link name="${name}"/>\n`; return; }
      s += `\n  <link name="${name}">\n` + shapes.map(sh => `    <visual>
      <origin xyz="${f(sh.pos)}" rpy="0 0 0"/>
      <geometry><box size="${f(sh.size)}"/></geometry>
      <material name="${sh.mat}"/>
    </visual>`).join('\n') + '\n  </link>\n';
    });
    K.JOINTS.forEach(j => {
      s += `
  <joint name="${j.name}" type="revolute">
    <parent link="${j.parent}"/>
    <child link="${j.child}"/>
    <origin xyz="${f(j.xyz)}" rpy="${f(j.rpy)}"/>
    <axis xyz="0 0 1"/>
    <limit lower="${num(j.lower)}" upper="${num(j.upper)}" effort="10" velocity="10"/>
  </joint>
`;
    });
    const T = K.TOOL;
    s += `
  <joint name="${T.name}" type="fixed">
    <parent link="${T.parent}"/>
    <child link="${T.child}"/>
    <origin xyz="${f(T.xyz)}" rpy="${f(T.rpy)}"/>
  </joint>
</robot>
`;
    return s;
  }
  const PRESETS = {
    box: { ko: '상자', fn: presetBox },
    two_link: { ko: '2관절 팔', fn: presetTwoLink },
    r2d2: { ko: 'R2D2', fn: () => presetR2D2(6) },
    diffbot: { ko: '차동 구동', fn: presetDiffbot },
    so101: { ko: 'SO-ARM101', fn: presetSO101 }
  };
  const TUTORIAL_FILES = ['urdf/01-myfirst.urdf', 'urdf/02-multipleshapes.urdf', 'urdf/03-origins.urdf', 'urdf/04-materials.urdf', 'urdf/05-visual.urdf', 'urdf/06-flexible.urdf', 'urdf/07-physics.urdf', 'urdf/08-macroed.urdf.xacro'];
  /** 'urdf/03-origins.urdf' · 'so101' · 'r2d2' · 실제 XML → URDF 문자열 (없으면 null) */
  function resolveModel(v) {
    if (v == null) return null;
    v = String(v).trim();
    if (!v) return null;
    if (v.startsWith('<')) return v;
    const base = v.replace(/^.*\//, '').replace(/^\$\(.*\)$/, '');
    if (PRESETS[base]) return PRESETS[base].fn();
    if (/so[-_]?(arm)?101/i.test(v)) return presetSO101();
    if (/diffbot/i.test(v)) return presetDiffbot();
    const m = /(?:^|\/)0?([1-8])-[\w.-]+/.exec(v);
    if (m) return presetR2D2(+m[1]);
    return null;
  }

  /* ================================================== check_urdf · xacro 로 보기 · XML 쓰기 */
  function checkUrdf(model) {
    const out = [`robot name is: ${model.name}`, '---------- Successfully Parsed XML ---------------'];
    const ch = l => (model.children[l] || []).map(j => j.child);
    out.push(`root Link: ${model.root} has ${ch(model.root).length} child(ren)`);
    const rec = (l, ind) => ch(l).forEach((c, i) => { out.push(`${ind}child(${i + 1}):  ${c}`); rec(c, ind + '    '); });
    rec(model.root, '    ');
    return out.join('\n');
  }
  const PI_RX = [[Math.PI, 'PI'], [Math.PI / 2, 'PI/2'], [Math.PI / 4, 'PI/4']];
  function xacroNum(v) {
    for (const [val, nm] of PI_RX) { if (Math.abs(Math.abs(v) - val) < 2e-4 && Math.abs(v) > 1e-6) return `\${${v < 0 ? '-' : ''}${nm}}`; }
    return num(v);
  }
  function geomXml(v, xa) {
    const n = xa ? xacroNum : num;
    if (v.type === 'box') return `<box size="${v.size.map(num).join(' ')}"/>`;
    if (v.type === 'cylinder') return `<cylinder radius="${num(v.radius)}" length="${num(v.length)}"/>`;
    if (v.type === 'sphere') return `<sphere radius="${num(v.radius)}"/>`;
    return `<mesh filename="${esc(v.filename)}"/>`;
  }
  function visualXml(v, ind, xa) {
    const n = xa ? xacroNum : num;
    const org = (v.origin.xyz.some(x => x) || v.origin.rpy.some(x => x)) ? `${ind}  <origin xyz="${v.origin.xyz.map(num).join(' ')}" rpy="${v.origin.rpy.map(n).join(' ')}"/>\n` : '';
    const mat = v.matName ? `${ind}  <material name="${v.matName}"/>\n` : v.rgba ? `${ind}  <material name=""><color rgba="${v.rgba.join(' ')}"/></material>\n` : '';
    return `${ind}<visual>\n${org}${ind}  <geometry>${geomXml(v, xa)}</geometry>\n${mat}${ind}</visual>`;
  }
  function jointXml(j, ind, xa) {
    const n = xa ? xacroNum : num;
    let s = `${ind}<joint name="${j.name}" type="${j.type}">\n${ind}  <parent link="${j.parent}"/>\n${ind}  <child link="${j.child}"/>\n${ind}  <origin xyz="${j.xyz.map(num).join(' ')}" rpy="${j.rpy.map(n).join(' ')}"/>\n`;
    if (j.type !== 'fixed') s += `${ind}  <axis xyz="${j.axis.map(num).join(' ')}"/>\n`;
    if (j.hasLimit) s += `${ind}  <limit lower="${num(j.lower)}" upper="${num(j.upper)}" effort="${num(j.effort)}" velocity="${num(j.velocity)}"/>\n`;
    return s + `${ind}</joint>`;
  }
  /** 같은 모양 링크를 macro 로 묶은 xacro (교육용 보기) */
  function toXacro(model) {
    const L = [`<?xml version="1.0"?>`, `<!-- xacro 로 쓰면: 숫자는 property, 반복되는 모양은 macro 로 한 번만 적습니다.`, `     빌드: xacro ${model.name}.urdf.xacro > ${model.name}.urdf -->`,
      `<robot name="${model.name}" xmlns:xacro="http://www.ros.org/wiki/xacro">`, '', `  <xacro:property name="PI" value="3.14159265"/>`];
    Object.entries(model.materials).forEach(([n, c]) => L.push(`  <material name="${n}"><color rgba="${c.join(' ')}"/></material>`));
    const sig = l => l.visuals.map(v => visualXml(v, '', true)).join('|');
    const groups = {};
    model.links.forEach(l => { if (l.visuals.length) { const s = sig(l); (groups[s] = groups[s] || []).push(l.name); } });
    const macroOf = {};
    let mi = 0;
    Object.entries(groups).forEach(([s, names]) => {
      if (names.length < 2) return;
      const common = names[0].replace(/^(left|right|l|r)_/, '').replace(/^(front|back)_/, '').replace(/[^\w]/g, '_');
      const mname = (common || 'part' + (++mi)) + '_link';
      names.forEach(n => macroOf[n] = mname);
      const l = model.links.get(names[0]);
      L.push('', `  <!-- ${names.join(', ')} 는 모양이 같습니다 → macro 하나 -->`, `  <xacro:macro name="${mname}" params="name">`, `    <link name="\${name}">`);
      l.visuals.forEach(v => L.push(visualXml(v, '      ', true)));
      L.push('    </link>', '  </xacro:macro>');
    });
    L.push('');
    model.links.forEach(l => {
      if (macroOf[l.name]) { L.push(`  <xacro:${macroOf[l.name]} name="${l.name}"/>`); return; }
      if (!l.visuals.length) { L.push(`  <link name="${l.name}"/>`); return; }
      L.push(`  <link name="${l.name}">`); l.visuals.forEach(v => L.push(visualXml(v, '    ', true))); L.push('  </link>');
    });
    L.push('');
    model.joints.forEach(j => L.push(jointXml(j, '  ', true)));
    L.push('</robot>');
    return L.join('\n');
  }

  /* ================================================== robot_state_publisher */
  const RSPS = new Set();
  function purgeTF(fqn, keep) {
    const fr = ROS.graph.tf.frames;
    Object.keys(fr).forEach(c => { if (fr[c].auth === fqn && !(keep && keep.has(c))) delete fr[c]; });
  }
  /** node 에 robot_state_publisher 동작을 붙인다. → 컨트롤러 {model, q, text, error, setUrdf(), on()} */
  function createRSP(node, text) {
    const c = { node, text: '', model: null, error: null, warnings: [], q: {}, stamp: 0, ev: {} };
    c.on = (e, f) => { (c.ev[e] = c.ev[e] || []).push(f); return () => { c.ev[e] = c.ev[e].filter(x => x !== f); }; };
    const emit = (e, a) => (c.ev[e] || []).slice().forEach(f => { try { f(a); } catch (er) { console.error(er); } });
    c.alive = () => node.alive;
    node.declareParameter('robot_description', '', { description: 'The original robot description in URDF format', type: 'string' });
    node.declareParameter('publish_frequency', 20.0, { description: 'The frequency at which fixed transforms will be republished to the network.' });
    node.declareParameter('ignore_timestamp', false, { description: 'Whether to accept all joint states no matter what the timestamp' });
    node.declareParameter('frame_prefix', '', { description: 'The prefix to apply to all frame IDs' });
    const tfPub = node.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100);
    const tfsPub = node.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static');
    const descPub = node.createPublisher('std_msgs/msg/String', 'robot_description', 'latched');
    const pre = f => (node.getParameter('frame_prefix') || '') + f;
    const tsOf = (j, v) => { const M = jointLocal(j, v); return { header: { stamp: ROS.graph.now(), frame_id: pre(j.parent) }, child_frame_id: pre(j.child), transform: { translation: { x: M[12], y: M[13], z: M[14] }, rotation: MX.toQuat(M) } }; };
    function publishStatic() { if (!c.model) return; const fx = c.model.joints.filter(j => !movable(c.model).includes(j)); tfsPub.kept.length = 0; if (fx.length) tfsPub.publish({ transforms: fx.map(j => tsOf(j, 0)) }); }
    function publishMovable(names) {
      if (!c.model) return;
      const mv = movable(c.model).filter(j => !names || names.includes(j.name));
      if (mv.length) tfPub.publish({ transforms: mv.map(j => tsOf(j, c.q[j.name] || 0)) });
    }
    c.publishMovable = publishMovable;
    let internal = false;
    c.setUrdf = (t) => {
      const r = parseURDF(t);
      c.warnings = r.warnings;
      if (!r.model) { c.error = r.errors[0]; emit('error', r); return r; }
      c.text = t; c.model = r.model; c.error = null;
      const q = {};
      movable(r.model).forEach(j => { q[j.name] = j.name in c.q ? c.q[j.name] : defaultPos(j); });
      c.q = q;
      const p = node.params.get('robot_description');
      if (p && p.value !== t) { internal = true; p.value = t; try { ROS.graph.ev.emit('param', node, 'robot_description', t); } finally { internal = false; } }
      purgeTF(node.fqn, new Set([...r.model.links.keys()].map(pre)));
      descPub.publish({ data: t });
      publishStatic(); publishMovable();
      emit('model', r);
      return r;
    };
    node.onSetParameters(list => {
      for (const p of list) if (p.name === 'robot_description' && !internal) { const r = parseURDF(p.value); if (!r.model) return { successful: false, reason: 'Failed to parse robot description: ' + r.errors[0].msg }; }
      return { successful: true };
    });
    const off = ROS.on('param', (n, name, v) => { if (n === node && name === 'robot_description' && !internal && v !== c.text) { node.info('robot_description 이 바뀌어 모델을 다시 읽습니다'); c.setUrdf(v); } });
    node.createSubscription('sensor_msgs/msg/JointState', 'joint_states', m => {
      if (!c.model) return;
      const got = [];
      (m.name || []).forEach((n, i) => { if (n in c.q && Number.isFinite(m.position[i])) { c.q[n] = m.position[i]; got.push(n); } });
      c.stamp = performance.now();
      if (got.length) publishMovable(got);
      emit('joints', got);
    }, 10);
    // 고정 조인트는 주기적으로 다시 알림 (늦게 온 구독자는 transient_local 로 받음)
    const prevDestroy = node.onDestroy;
    node.onDestroy = () => { off(); RSPS.delete(c); purgeTF(node.fqn); if (prevDestroy) prevDestroy(); };
    RSPS.add(c);
    if (text) c.setUrdf(text);
    return c;
  }
  /** 노드 없이 이 화면 안에서만 쓰는 모델 (비활성 위젯용) */
  function createLocalRSP(text) {
    const c = { node: null, local: true, text: '', model: null, error: null, warnings: [], q: {}, ev: {} };
    c.on = (e, f) => { (c.ev[e] = c.ev[e] || []).push(f); return () => { c.ev[e] = c.ev[e].filter(x => x !== f); }; };
    const emit = (e, a) => (c.ev[e] || []).slice().forEach(f => { try { f(a); } catch (er) { console.error(er); } });
    c.alive = () => true;
    c.setUrdf = t => {
      const r = parseURDF(t); c.warnings = r.warnings;
      if (!r.model) { c.error = r.errors[0]; emit('error', r); return r; }
      c.text = t; c.model = r.model; c.error = null;
      const q = {}; movable(r.model).forEach(j => { q[j.name] = j.name in c.q ? c.q[j.name] : defaultPos(j); }); c.q = q;
      emit('model', r); return r;
    };
    if (text) c.setUrdf(text);
    return c;
  }
  /* ---- 한 페이지에서 ROS 노드(robot_state_publisher)는 하나만 (위젯 · 런치 · 터미널 실행 공용)
     ACTIVE = { rsp, alive(), deactivate() } */
  let ACTIVE = null;
  function claim(h) {
    if (ACTIVE && ACTIVE !== h && ACTIVE.rsp !== h.rsp && ACTIVE.alive()) { const a = ACTIVE; ACTIVE = null; try { a.deactivate(); } catch (e) { console.error(e); } }
    ACTIVE = h;
  }
  function nodeHandle(rsp, nodes) {
    return { rsp, alive: () => nodes.some(n => n.alive), deactivate() { nodes.forEach(n => n.destroy()); } };
  }
  function findRSP() { return [...RSPS].reverse().find(c => c.alive() && c.model); }

  /* ================================================== joint_state_publisher(_gui) */
  const JSPS = new Set();
  function createJSP(node, rsp) {
    const c = { node, rsp, pos: {}, ev: {} };
    c.on = (e, f) => { (c.ev[e] = c.ev[e] || []).push(f); return () => { c.ev[e] = c.ev[e].filter(x => x !== f); }; };
    const emit = e => (c.ev[e] || []).slice().forEach(f => { try { f(); } catch (er) { console.error(er); } });
    if (node) {
      node.declareParameter('rate', 10, { description: 'The rate at which to publish updates to the /joint_states topic', type: 'integer' });
      node.declareParameter('publish_default_positions', true, {});
    }
    const pub = node ? node.createPublisher('sensor_msgs/msg/JointState', 'joint_states', 10) : null;
    c.joints = () => movable(rsp.model);
    c.sync = () => { const p = {}; c.joints().forEach(j => { p[j.name] = j.name in c.pos ? c.pos[j.name] : (j.name in rsp.q ? rsp.q[j.name] : defaultPos(j)); }); c.pos = p; emit('model'); };
    c.publish = () => { const js = c.joints(); if (!js.length) return; if (!pub) { js.forEach(j => { rsp.q[j.name] = c.pos[j.name] || 0; }); return; } pub.publish({ header: { stamp: ROS.graph.now(), frame_id: '' }, name: js.map(j => j.name), position: js.map(j => c.pos[j.name] || 0), velocity: [], effort: [] }); };
    c.set = (n, v) => { c.pos[n] = v; c.publish(); };
    c.center = () => { c.joints().forEach(j => c.pos[j.name] = defaultPos(j)); c.publish(); emit('values'); };
    c.randomize = () => { c.joints().forEach(j => { const lo = j.type === 'continuous' ? -Math.PI : j.lower, hi = j.type === 'continuous' ? Math.PI : j.upper; c.pos[j.name] = lo + Math.random() * (hi - lo); }); c.publish(); emit('values'); };
    const offM = rsp.on('model', () => c.sync());
    c.sync();
    c.alive = () => node ? node.alive : true;
    c.destroyLocal = offM;
    if (!node) { c.publish(); return c; }
    node.createTimer(1 / Math.max(1, node.getParameter('rate') || 10), c.publish);
    const prev = node.onDestroy;
    node.onDestroy = () => { offM(); JSPS.delete(c); if (prev) prev(); };
    JSPS.add(c);
    return c;
  }

  /* ================================================== 3D 그리기 */
  function rgbaOf(v) { const c = v.rgba || [0.7, 0.7, 0.72, 1]; return [c[0] * 255, c[1] * 255, c[2] * 255, c[3] == null ? 1 : c[3]]; }
  function robotFaces(W, model, F, out) {
    model.links.forEach(l => {
      const M = F.links[l.name]; if (!M) return;
      l.visuals.forEach(v => {
        const G = MX.mul(M, MX.rpyXyz(v.origin.rpy, v.origin.xyz));
        const col = rgbaOf(v);
        if (v.type === 'box') W.box(G, v.size, col, out);
        else if (v.type === 'cylinder') W.cylinder(G, v.radius, v.length, col, out);
        else if (v.type === 'sphere') W.sphere(G, v.radius, col, out);
        else W.box(G, [0.04, 0.04, 0.04], [150, 150, 160, 1], out);
      });
    });
  }
  function bounds(model, F) {
    const pts = [];
    model.links.forEach(l => { const M = F.links[l.name]; if (!M) return; pts.push(MX.pos(M)); l.visuals.forEach(v => { const G = MX.mul(M, MX.rpyXyz(v.origin.rpy, v.origin.xyz)); const r = v.type === 'box' ? Math.hypot(...v.size) / 2 : v.type === 'cylinder' ? Math.hypot(v.radius, v.length / 2) : v.radius || 0.03; const p = MX.pos(G); pts.push([p[0] - r, p[1] - r, p[2] - r], [p[0] + r, p[1] + r, p[2] + r]); }); });
    if (!pts.length) return { c: [0, 0, 0], r: 0.5 };
    const lo = [0, 1, 2].map(k => Math.min(...pts.map(p => p[k]))), hi = [0, 1, 2].map(k => Math.max(...pts.map(p => p[k])));
    return { c: lo.map((v, k) => (v + hi[k]) / 2), r: Math.max(0.12, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2), floor: Math.min(0, lo[2]) };
  }

  /* ================================================== 조인트 슬라이더 패널 (jsp_gui) */
  function sliderPanel(box, jsp) {
    let sig = '';
    const unit = j => j.type === 'prismatic' ? 'm' : 'rad';
    const range = j => j.type === 'continuous' ? [-Math.PI, Math.PI] : [j.lower, j.upper];
    function build() {
      const js = jsp.joints();
      sig = js.map(j => j.name + j.lower + j.upper + j.type).join('|');
      if (!js.length) { box.innerHTML = '<div class="muted small wu-nojs">움직이는 조인트(revolute · continuous · prismatic)가 없습니다. fixed 조인트만 있으면 슬라이더도 없습니다.</div>'; return; }
      box.innerHTML = js.map(j => { const [lo, hi] = range(j); return `<label class="wu-sl" data-j="${esc(j.name)}"><span class="wu-sl-n" title="${esc(j.type)}">${esc(j.name)} <i>${j.type}</i></span><input type="range" min="${lo}" max="${hi}" step="${(hi - lo) / 400}" value="${jsp.pos[j.name] || 0}"><b class="w-out">0.00</b></label>`; }).join('') +
        `<div class="w-btns wu-slb"><button class="btn tiny" data-a="rand">Randomize</button><button class="btn tiny" data-a="center">Center</button></div>`;
      box.querySelectorAll('.wu-sl').forEach(l => {
        const n = l.dataset.j, inp = l.querySelector('input');
        inp.addEventListener('input', () => { jsp.set(n, +inp.value); show(); });
      });
      box.querySelector('[data-a=rand]').onclick = () => jsp.randomize();
      box.querySelector('[data-a=center]').onclick = () => jsp.center();
      show();
    }
    function show(fromOutside) {
      box.querySelectorAll('.wu-sl').forEach(l => {
        const n = l.dataset.j, j = jsp.joints().find(x => x.name === n); if (!j) return;
        const v = jsp.pos[n] || 0;
        if (fromOutside) l.querySelector('input').value = v;
        l.querySelector('b').textContent = (v >= 0 ? ' ' : '') + v.toFixed(2) + ' ' + unit(j) + (j.type === 'prismatic' ? '' : ` (${Math.round(v * 180 / Math.PI)}°)`);
      });
    }
    build();
    const o1 = jsp.on('model', () => { const js = jsp.joints(); const s = js.map(j => j.name + j.lower + j.upper + j.type).join('|'); if (s !== sig) build(); else show(true); });
    const o2 = jsp.on('values', () => show(true));
    return () => { o1(); o2(); };
  }

  /* ================================================== URDF 편집기 + 뷰어 */
  function buildUrdf(root, o, owner) {
    const W = window.W3D;
    o = o || {};
    let preset = PRESETS[o.model] ? o.model : (o.attach ? null : 'r2d2');
    // 처음엔 노드 없는 로컬 모델 → 아래에서 (페이지에 ROS 담당이 없으면) 활성화
    let rsp = o.attach ? o.attach.rsp : createLocalRSP(PRESETS[preset].fn());
    let jsp = o.attach ? o.attach.jsp : createJSP(null, rsp);
    let own = [], offs = [], attachUsed = false;
    const inst = { rsp: null, active: false, alive: () => inst.active, deactivate };
    root.classList.add('wu-root');
    if (o.inWindow) root.classList.add('wu-inwin');
    root.innerHTML = `
      <div class="w-row wu-bar">
        <div class="w-seg wu-models">${Object.entries(PRESETS).map(([k, p]) => `<button data-m="${k}" class="${k === preset ? 'on' : ''}">${p.ko}</button>`).join('')}</div>
        <span class="spacer"></span>
        <label class="small"><input type="checkbox" data-t="frames" checked> 좌표축</label>
        <label class="small"><input type="checkbox" data-t="axes" checked> 관절 축</label>
        <label class="small"><input type="checkbox" data-t="names"> 이름</label>
      </div>
      <div class="wu-main">
        <div class="wu-left">
          <div class="w-seg wu-tabs"><button data-tab="urdf" class="on">URDF</button><button data-tab="xacro">xacro</button><button data-tab="check">check_urdf</button></div>
          <div class="wu-pane" data-p="urdf"><div class="wu-ed"><pre class="wu-gut"></pre><textarea class="wu-ta" spellcheck="false" wrap="off" aria-label="URDF XML"></textarea></div></div>
          <div class="wu-pane" data-p="xacro" hidden><pre class="wu-pre wu-xacro"></pre></div>
          <div class="wu-pane" data-p="check" hidden><pre class="wu-pre wu-check"></pre></div>
          <div class="wu-msg"></div>
        </div>
        <div class="wu-right">
          <div class="wu-cv-wrap"><canvas class="wu-cv"></canvas>
            <div class="wu-legend"><span class="wt-x">x</span><span class="wt-y">y</span><span class="wt-z">z</span><span class="wu-ax">⟲ 관절 축</span></div>
            <div class="wu-cvbtn"><button class="btn tiny ghost" data-a="fit" title="화면에 맞추기">⤢</button></div>
            <div class="wu-hint">끌어서 회전 · 누른 뒤 휠로 확대</div>
          </div>
          <div class="wu-state"></div>
          <div class="wu-jsp-h"></div>
          <div class="wu-jsp"></div>
        </div>
      </div>
      <div class="w-help wu-info"></div>`;
    const $ = s => root.querySelector(s);
    const ta = $('.wu-ta'), gut = $('.wu-gut'), msg = $('.wu-msg'), cv = $('.wu-cv'), info = $('.wu-info');
    const show = { frames: true, axes: true, names: false };
    ta.value = rsp.text || '';
    let errLine = 0;
    function gutter() {
      const n = ta.value.split('\n').length;
      let s = ''; for (let i = 1; i <= n; i++) s += (i === errLine ? `<b>${i}</b>` : i) + '\n';
      gut.innerHTML = s; gut.scrollTop = ta.scrollTop;
    }
    ta.addEventListener('scroll', () => { gut.scrollTop = ta.scrollTop; });
    function showResult(r) {
      if (r && r.errors && r.errors.length) {
        const e = r.errors[0]; errLine = e.line || 0;
        msg.className = 'wu-msg bad';
        msg.innerHTML = `⛔ <b>${e.line ? `${e.line}행${e.col ? ' ' + e.col + '열' : ''}` : ''}</b> ${esc(e.msg)}${r.errors.length > 1 ? ` <span class="muted">(외 ${r.errors.length - 1}개)</span>` : ''} <button class="btn tiny ghost" data-a="goto">그 줄로</button><div class="small muted">마지막으로 성공한 모델을 계속 보여 줍니다.</div>`;
        const g = msg.querySelector('[data-a=goto]');
        if (g) g.onclick = () => { const lines = ta.value.split('\n'); const at = lines.slice(0, (e.line || 1) - 1).join('\n').length + (e.line > 1 ? 1 : 0); ta.focus(); ta.setSelectionRange(at, at + (lines[(e.line || 1) - 1] || '').length); ta.scrollTop = Math.max(0, (e.line - 4) * 17); };
      } else {
        errLine = 0;
        const w = (rsp.warnings || []);
        const m = rsp.model;
        msg.className = 'wu-msg ok';
        msg.innerHTML = m ? `✅ 해석 성공: 링크 ${m.links.size}개 · 조인트 ${m.joints.length}개 (움직이는 조인트 ${movable(m).length}개)` + (w.length ? `<div class="small wu-warn">⚠ ${w.slice(0, 2).map(x => `${x.line ? x.line + '행: ' : ''}${esc(x.msg)}`).join('<br>⚠ ')}</div>` : '') : '';
      }
      gutter();
      const m = rsp.model;
      if (m) {
        $('.wu-check').textContent = `$ check_urdf ${m.name || 'robot'}.urdf\n` + checkUrdf(m);
        $('.wu-xacro').textContent = toXacro(m);
        if (!rsp.node) info.innerHTML = '이 위젯은 지금 <b>미리보기</b>입니다 (ROS 노드 없음). 한 페이지에서 ROS 노드 /robot_state_publisher 는 URDF 위젯 하나만 가집니다 — 여러 로봇의 TF 와 /joint_states 가 섞이지 않게 하려는 것입니다.';
        else info.innerHTML = `노드 <code>${esc(rsp.node.fqn)}</code> 의 파라미터 <code>robot_description</code> 에 이 URDF(${rsp.text.length}자)가 들어 있습니다. 터미널: <code>ros2 param get ${esc(rsp.node.fqn)} robot_description</code> · 고정 조인트 → <code>/tf_static</code>, 움직이는 조인트 → <code>/tf</code>`;
      }
    }
    let tmr = null;
    ta.addEventListener('input', () => { gutter(); clearTimeout(tmr); tmr = setTimeout(() => { const r = rsp.setUrdf(ta.value); showResult(r); if (r.model) fit(); }, 350); });
    ta.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.setRangeText('  ', s, ta.selectionEnd, 'end'); ta.dispatchEvent(new Event('input')); } });
    root.querySelectorAll('.wu-models button').forEach(b => b.onclick = () => {
      root.querySelectorAll('.wu-models button').forEach(x => x.classList.toggle('on', x === b));
      preset = b.dataset.m; ta.value = PRESETS[preset].fn();
      jsp.pos = {}; const r = rsp.setUrdf(ta.value); showResult(r); fit();
    });
    root.querySelectorAll('.wu-tabs button').forEach(b => b.onclick = () => {
      root.querySelectorAll('.wu-tabs button').forEach(x => x.classList.toggle('on', x === b));
      root.querySelectorAll('.wu-pane').forEach(p => p.hidden = p.dataset.p !== b.dataset.tab);
    });
    root.querySelectorAll('[data-t]').forEach(c => c.onchange = () => { show[c.dataset.t] = c.checked; });
    /* ---- ROS 활성/비활성 전환 */
    const stateEl = $('.wu-state'), jspH = $('.wu-jsp-h');
    function renderState() {
      if (inst.active) {
        stateEl.className = 'wu-state on';
        stateEl.innerHTML = `<span class="wu-dot">●</span> ROS 실행 중: <code>${esc(rsp.node ? rsp.node.fqn : '/robot_state_publisher')}</code> · <code>${esc(jsp.node ? jsp.node.fqn : '/joint_state_publisher_gui')}</code>`;
        jspH.innerHTML = '<b>joint_state_publisher_gui</b> <span class="muted small">→ /joint_states → robot_state_publisher → /tf</span>';
      } else {
        stateEl.className = 'wu-state off';
        stateEl.innerHTML = `<span class="wu-dot">○</span> 미리보기 <span class="muted small">(ROS 노드 없음)</span> <button class="btn tiny primary" data-a="act">▶ 이 모델을 ROS 로 실행 (robot_state_publisher)</button>`;
        stateEl.querySelector('[data-a=act]').onclick = activate;
        jspH.innerHTML = '<b>관절 슬라이더</b> <span class="muted small">(이 화면에서만 — /joint_states 발행 안 함)</span>';
      }
    }
    function bind(r, j) {
      offs.forEach(f => f()); offs = [];
      rsp = r; jsp = j;
      offs.push(rsp.on('model', res => { if (document.activeElement !== ta && ta.value !== rsp.text) { ta.value = rsp.text; } showResult(res); }));
      offs.push(sliderPanel($('.wu-jsp'), jsp));
      renderState();
      showResult(rsp.error ? { errors: [rsp.error] } : null);
    }
    const copyQ = (dst, src) => Object.keys(dst).forEach(k => { if (k in src) dst[k] = src[k]; });
    function activate() {
      let r, j;
      if (o.attach && !attachUsed && o.attach.rsp.alive()) {
        attachUsed = true; r = o.attach.rsp; j = o.attach.jsp; own = [r.node, j.node];
        inst.rsp = r; inst.active = true;
        if (ACTIVE && ACTIVE.rsp === r) ACTIVE = inst; else claim(inst);
      } else {
        inst.rsp = {}; claim(inst);
        const rn = ROS.createNode('robot_state_publisher', { owner, pkg: 'robot_state_publisher', exe: 'robot_state_publisher' });
        const jn = ROS.createNode('joint_state_publisher_gui', { owner, pkg: 'joint_state_publisher_gui', exe: 'joint_state_publisher_gui' });
        r = createRSP(rn, rsp.text || PRESETS[preset || 'r2d2'].fn());
        copyQ(r.q, rsp.q);
        j = createJSP(jn, r); copyQ(j.pos, jsp.pos);
        if (jsp.destroyLocal && !jsp.node) jsp.destroyLocal();
        own = [rn, jn]; inst.rsp = r; inst.active = true;
        j.publish();
      }
      bind(r, j);
    }
    function deactivate() {
      if (!inst.active) return;
      inst.active = false; inst.rsp = null;
      if (ACTIVE === inst) ACTIVE = null;
      const lr = createLocalRSP(rsp.text); copyQ(lr.q, rsp.q);
      const lj = createJSP(null, lr); copyQ(lj.pos, jsp.pos); lj.publish();
      own.forEach(n => n.destroy()); own = []; // rsp 노드가 없어지며 자기 TF 프레임도 지움
      bind(lr, lj);
    }
    // 카메라
    const cam = W.cam({ yaw: 0.65, el: 0.45, fit: 0.6 });
    let floor = 0;
    function fit() { if (!rsp.model) return; const b = bounds(rsp.model, fk(rsp.model, rsp.q)); cam.target = b.c; cam.fit = b.r * 1.15; cam.zoom = 1; floor = b.floor; }
    fit();
    offs.push(W.orbit(cv, cam));
    $('[data-a=fit]').onclick = fit;
    // 첫 URDF 위젯(또는 런치가 연 창)이 ROS 를 맡고, 나머지는 미리보기
    if (o.attach || !(ACTIVE && ACTIVE.alive())) activate(); else bind(rsp, jsp);
    const stop = RosUI.loop(root, () => {
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      const C = RosUI.colors();
      cam.w = w; cam.h = h;
      const P = W.projector(cam);
      ctx.clearRect(0, 0, w, h);
      const model = rsp.model;
      W.grid(ctx, P, cam.target, Math.max(0.5, cam.fit * 2), cam.fit > 0.5 ? 0.25 : 0.1, C.line, floor);
      if (!model) { ctx.fillStyle = C.muted; ctx.font = '14px sans-serif'; ctx.fillText('URDF 를 해석하지 못했습니다', 12, 24); return; }
      const F = fk(model, rsp.q);
      const faces = [];
      robotFaces(W, model, F, faces);
      W.drawFaces(ctx, P, faces, { edge: C.dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.22)' });
      const L = Math.max(0.04, cam.fit * 0.18);
      if (show.axes) movable(model).forEach(j => {
        const M = F.joints[j.name]; if (!M) return;
        const p = MX.pos(M), d = MX.dir(M, j.axis);
        const a = P(p), b = P([p[0] + d[0] * L * 1.3, p[1] + d[1] * L * 1.3, p[2] + d[2] * L * 1.3]);
        ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 2.5; ctx.setLineDash(j.type === 'prismatic' ? [5, 3] : []);
        RosUI.arrow(ctx, a.x, a.y, b.x, b.y, 8); ctx.setLineDash([]);
        if (j.type !== 'prismatic') { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 1.5); ctx.stroke(); }
      });
      if (show.frames) Object.entries(F.links).forEach(([n, M]) => W.axes(ctx, P, M, L, C, { label: show.names ? n : '', thin: true }));
      else if (show.names) Object.entries(F.links).forEach(([n, M]) => { const p = P(MX.pos(M)); ctx.fillStyle = C.fg; ctx.font = '11px sans-serif'; ctx.fillText(n, p.x + 4, p.y - 4); });
    });
    return () => {
      stop(); offs.forEach(f => f()); clearTimeout(tmr);
      if (ACTIVE === inst) ACTIVE = null;
      inst.active = false;
      if (attachUsed) { if (own.some(n => n.alive)) ACTIVE = nodeHandle(rsp, own); } // 런치가 만든 노드는 런치가 정리
      else own.forEach(n => n.destroy());
      if (jsp && !jsp.node && jsp.destroyLocal) jsp.destroyLocal();
    };
  }

  /* ---------------------------------------------- jsp_gui 창 (슬라이더만) */
  function buildJspGui(root, o) {
    const jsp = o.jsp;
    root.classList.add('wu-root', 'wu-jspwin');
    if (!jsp) { root.innerHTML = '<div class="w-body muted">joint_state_publisher_gui 가 없습니다.</div>'; return; }
    root.innerHTML = `<div class="w-help" style="margin:0 0 8px">슬라이더를 움직이면 <code>${esc(jsp.node.fqn)}</code> 가 <code>/joint_states</code> 를 발행합니다.</div><div class="wu-jsp"></div>`;
    return sliderPanel(root.querySelector('.wu-jsp'), jsp);
  }

  /* ================================================== 등록 */
  if (window.Widgets) Widgets.register('urdf', (el, o) => {
    const body = RosUI.frame(el, '🦿', 'URDF 편집기 · 뷰어 (robot_state_publisher)');
    return buildUrdf(body, o, el);
  }, { title: 'URDF 편집기 · 뷰어' });
  if (window.RosUI) {
    RosUI.registerView('urdf', (el, o) => buildUrdf(el, o, el), { title: 'URDF 뷰어 — robot_state_publisher', icon: '🦿', w: 900, h: 600 });
    RosUI.registerView('jsp_gui', (el, o) => buildJspGui(el, o), { title: 'Joint State Publisher', icon: '🎚', w: 380, h: 420 });
  }

  /* ================================================== 패키지 */
  const logSegments = (n, c) => { if (c.model) [...c.model.links.keys()].forEach(l => n.info(`got segment ${l}`)); };
  function abortRSP(ctx, what) {
    ctx.out(`terminate called after throwing an instance of 'std::runtime_error'\n  what():  ${what}`);
    ctx.out('[ros2run]: Aborted');
    return { oneshot: true };
  }
  function openV(name, viewOpts, winOpts) { return window.RosUI && RosUI.views[name] ? RosUI.openView(name, Object.assign({}, winOpts || {}, { viewOpts })) : null; }
  let pidSeq = 4200;

  /** urdf_tutorial / so_arm101_description 의 display.launch.py */
  function displayLaunch(ctx, text, label) {
    const tag = (nm, i) => l => ctx.out(`[${nm}-${i}] ${l}`);
    const pids = [++pidSeq, ++pidSeq, ++pidSeq];
    ctx.out(`[INFO] [robot_state_publisher-1]: process started with pid [${pids[0]}]`);
    ctx.out(`[INFO] [joint_state_publisher_gui-2]: process started with pid [${pids[1]}]`);
    const rn = ROS.createNode('robot_state_publisher', { out: tag('robot_state_publisher', 1), pkg: 'robot_state_publisher', exe: 'robot_state_publisher' });
    let jn = null;
    const handle = { rsp: null, alive: () => rn.alive, deactivate() { rn.destroy(); if (jn) jn.destroy(); } };
    claim(handle); // 페이지의 URDF 위젯은 미리보기로 물러남
    const rsp = createRSP(rn, text); handle.rsp = rsp;
    if (!rsp.model) { tag('robot_state_publisher', 1)(`[ERROR] [robot_state_publisher]: Failed to parse robot description: ${rsp.error ? rsp.error.msg : ''}`); }
    logSegments(rn, rsp);
    jn = ROS.createNode('joint_state_publisher_gui', { out: tag('joint_state_publisher_gui', 2), pkg: 'joint_state_publisher_gui', exe: 'joint_state_publisher_gui' });
    const jsp = createJSP(jn, rsp);
    jn.info('Centering');
    const wins = [];
    wins.push(openV('urdf', { attach: { rsp, jsp } }, { title: `joint_state_publisher_gui + 모델 — ${label}` }));
    if (window.RosUI && RosUI.views.rviz) {
      ctx.out(`[INFO] [rviz2-3]: process started with pid [${pids[2]}]`);
      wins.push(openV('rviz', { fixed: 'base_link', show: 'tf,robot' }, { title: 'RViz2' }));
    } else ctx.out('[WARN] [launch]: rviz2 화면이 준비되지 않아 URDF 뷰어만 엽니다');
    return { nodes: [rn, jn], stop() { wins.forEach(w => w && w.close()); } };
  }
  const DISPLAY_PY = `import os
from ament_index_python.packages import get_package_share_path
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.conditions import IfCondition, UnlessCondition
from launch.substitutions import Command, LaunchConfiguration
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue


def generate_launch_description():
    urdf_tutorial_path = get_package_share_path('urdf_tutorial')
    default_model_path = urdf_tutorial_path / 'urdf/01-myfirst.urdf'
    default_rviz_config_path = urdf_tutorial_path / 'rviz/urdf.rviz'

    gui_arg = DeclareLaunchArgument(name='gui', default_value='true', choices=['true', 'false'],
                                    description='Flag to enable joint_state_publisher_gui')
    model_arg = DeclareLaunchArgument(name='model', default_value=str(default_model_path),
                                      description='Absolute path to robot urdf file')
    rviz_arg = DeclareLaunchArgument(name='rvizconfig', default_value=str(default_rviz_config_path),
                                     description='Absolute path to rviz config file')

    robot_description = ParameterValue(Command(['xacro ', LaunchConfiguration('model')]),
                                       value_type=str)

    robot_state_publisher_node = Node(
        package='robot_state_publisher',
        executable='robot_state_publisher',
        parameters=[{'robot_description': robot_description}]
    )

    joint_state_publisher_gui_node = Node(
        condition=IfCondition(LaunchConfiguration('gui')),
        package='joint_state_publisher_gui',
        executable='joint_state_publisher_gui'
    )

    rviz_node = Node(
        package='rviz2',
        executable='rviz2',
        name='rviz2',
        output='screen',
        arguments=['-d', LaunchConfiguration('rvizconfig')],
    )

    return LaunchDescription([
        gui_arg, model_arg, rviz_arg,
        joint_state_publisher_gui_node,
        robot_state_publisher_node,
        rviz_node
    ])
`;
  if (window.ROS && ROS.registerPkg) {
    ROS.registerPkg('robot_state_publisher', {
      desc: 'URDF(robot_description) + /joint_states → /tf, /tf_static',
      exes: {
        robot_state_publisher(ctx) {
          const raw = ctx.args.params.robot_description;
          const text = resolveModel(raw);
          if (raw == null || raw === '') return abortRSP(ctx, 'robot_description parameter must not be empty');
          if (!text) return abortRSP(ctx, `Failed to parse robot description: '${String(raw).slice(0, 60)}' 는 URDF 가 아닙니다 (예: -p robot_description:=urdf/06-flexible.urdf 또는 so101)`);
          const r = parseURDF(text);
          if (!r.model) return abortRSP(ctx, `Failed to parse robot description: ${r.errors[0].msg}${r.errors[0].line ? ` (line ${r.errors[0].line})` : ''}`);
          const n = ctx.node('robot_state_publisher');
          const h = { rsp: null, alive: () => n.alive, deactivate() { n.info('다른 URDF 가 robot_state_publisher 를 맡아 이 노드를 끝냅니다'); ctx.exit(0); } };
          claim(h);
          const c = createRSP(n, text); h.rsp = c;
          logSegments(n, c);
          return { nodes: [n] };
        }
      }
    });
    const jspExe = gui => ctx => {
      const n = ctx.node(gui ? 'joint_state_publisher_gui' : 'joint_state_publisher');
      let jsp = null, win = null, t = null, warned = 0;
      const tryAttach = () => {
        const rsp = findRSP();
        if (!rsp) { if (warned++ % 5 === 0) n.info('Waiting for robot_description to be published on the robot_description topic...'); return false; }
        jsp = createJSP(n, rsp);
        if (gui) { n.info('Centering'); win = ctx.openView('jsp_gui', { jsp }, { title: 'Joint State Publisher' }); }
        return true;
      };
      if (!tryAttach()) t = setInterval(() => { if (!n.alive || tryAttach()) clearInterval(t); }, 1000);
      return { nodes: [n], stop() { clearInterval(t); } };
    };
    ROS.registerPkg('joint_state_publisher_gui', { desc: '슬라이더로 /joint_states 발행 (robot_description 을 읽음)', exes: { joint_state_publisher_gui: jspExe(true) } });
    ROS.registerPkg('joint_state_publisher', { desc: '기본 관절 값으로 /joint_states 발행', exes: { joint_state_publisher: jspExe(false) } });
    const files = {}; TUTORIAL_FILES.forEach((f, i) => { files[f] = presetR2D2(i + 1); }); files['launch/display.launch.py'] = DISPLAY_PY;
    ROS.registerPkg('urdf_tutorial', {
      desc: 'URDF 튜토리얼 (R2D2): display.launch.py model:=urdf/01-myfirst.urdf … 08-macroed.urdf.xacro',
      launch: {
        'display.launch.py'(ctx) {
          const model = ctx.largs.model || 'urdf/01-myfirst.urdf';
          const text = resolveModel(model);
          if (!text) { ctx.out(`[ERROR] [launch]: Caught exception in launch (see debug for traceback): file not found: ${model}\n  사용할 수 있는 모델: ${TUTORIAL_FILES.join(', ')}`); return { nodes: [] }; }
          return displayLaunch(ctx, text, String(model).replace(/^.*\//, ''));
        }
      },
      files
    });
    ROS.registerPkg('so_arm101_description', {
      desc: 'SO-ARM101 URDF 와 표시용 런치 (display.launch.py)',
      launch: { 'display.launch.py'(ctx) { return displayLaunch(ctx, presetSO101(), 'so101_new_calib.urdf'); } },
      files: { 'urdf/so101_new_calib.urdf': presetSO101(), 'launch/display.launch.py': DISPLAY_PY.replace(/urdf_tutorial/g, 'so_arm101_description').replace('urdf/01-myfirst.urdf', 'urdf/so101_new_calib.urdf') }
    });
  }

  window.URDFKit = { parseXML, parseURDF, fk, jointLocal, movable, defaultPos, MX, PRESETS, presetR2D2, presetSO101, resolveModel, checkUrdf, toXacro, createRSP, createLocalRSP, createJSP, findRSP, active: () => ACTIVE, RSPS, JSPS, purgeTF, TUTORIAL_FILES };
})();
