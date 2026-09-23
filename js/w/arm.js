/* ===================================================================
   팔 · TF · 제어 위젯 그룹 (js/w/arm.js)
   - window.W3D : 의존성 없는 작은 3D 그리기 도우미 (궤도 카메라, 축, 상자/원통/구)
   - 위젯 'tftree' + 보기 'tftree_view'(view_frames), 'tftree'
   - 위젯 'arm'   + 보기 'arm'  : SO-ARM101 ROS 2 시뮬레이터 (ros2_control · JTC · MoveIt-lite)
   - 위젯 'ctrl'  + 보기 'ctrl' : ros2_control 개념 (한 관절 + PID)
   - 패키지 so_arm101_bringup (sim.launch.py, moveit.launch.py)
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const f3 = v => (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3);

  /* ================================================== W3D */
  const W3D = (function () {
    const I = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const mul = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; };
    const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
    const pos = m => [m[12], m[13], m[14]];
    function fromTQ(T) {
      const { x, y, z, w } = T.q, t = T.t;
      return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, t.x, t.y, t.z, 1];
    }
    function inv(m) { // 강체 변환의 역
      const r = [m[0], m[4], m[8], 0, m[1], m[5], m[9], 0, m[2], m[6], m[10], 0, 0, 0, 0, 1];
      const t = pos(m);
      r[12] = -(r[0] * t[0] + r[4] * t[1] + r[8] * t[2]); r[13] = -(r[1] * t[0] + r[5] * t[1] + r[9] * t[2]); r[14] = -(r[2] * t[0] + r[6] * t[1] + r[10] * t[2]);
      return r;
    }
    function cam(o) { return Object.assign({ yaw: 0.6, el: 0.5, zoom: 1, target: [0, 0, 0], fit: 1, w: 300, h: 200 }, o || {}); }
    function scaleOf(c) { return Math.min(c.w, c.h) / (2 * c.fit) * c.zoom; }
    /** 카메라 → 투영 함수 P([x,y,z]) = {x, y, depth(클수록 가까움)} (오른손 좌표계, z 위) */
    function projector(c) {
      const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), ce = Math.cos(c.el), se = Math.sin(c.el), s = scaleOf(c), t = c.target;
      const P = p => { const dx = p[0] - t[0], dy = p[1] - t[1], dz = p[2] - t[2]; return { x: c.w / 2 + (-sy * dx + cy * dy) * s, y: c.h / 2 - (-se * cy * dx - se * sy * dy + ce * dz) * s, depth: ce * cy * dx + ce * sy * dy + se * dz }; };
      P.scale = s; P.cam = c;
      return P;
    }
    /** 화면 이동(px) → 월드 이동 벡터 (화면 평면 안) */
    function screenToWorld(c, mx, my) {
      const cy = Math.cos(c.yaw), sy = Math.sin(c.yaw), ce = Math.cos(c.el), se = Math.sin(c.el), s = scaleOf(c);
      const r = [-sy, cy, 0], u = [-se * cy, -se * sy, ce];
      return [0, 1, 2].map(k => (mx * r[k] - my * u[k]) / s);
    }
    /** 캔버스에 궤도 조작(끌기 회전 · 휠 확대)을 붙인다. hooks.down(x,y,e) 가 true 면 그 끌기는 hooks 가 처리 */
    function orbit(cv, c, hooks) {
      hooks = hooks || {};
      cv.style.touchAction = 'none';
      let drag = null, armed = false;
      const xy = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      const down = e => {
        const [x, y] = xy(e);
        armed = true;
        drag = { hook: !!(hooks.down && hooks.down(x, y, e)), lx: x, ly: y };
        try { cv.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      };
      const move = e => {
        const [x, y] = xy(e);
        if (!drag) { if (hooks.hover) hooks.hover(x, y); return; }
        const dx = x - drag.lx, dy = y - drag.ly; drag.lx = x; drag.ly = y;
        if (drag.hook) { if (hooks.move) hooks.move(x, y, dx, dy, e); return; }
        c.yaw -= dx * 0.01; c.el = clamp(c.el + dy * 0.01, -0.35, Math.PI / 2);
        if (hooks.orbit) hooks.orbit();
      };
      const up = () => { if (drag && drag.hook && hooks.up) hooks.up(); drag = null; };
      // 페이지 스크롤을 빼앗지 않도록: 캔버스를 한 번 누른 뒤(또는 Ctrl) 에만 휠로 확대
      const wheel = e => { if (!armed && !e.ctrlKey) return; e.preventDefault(); c.zoom = clamp(c.zoom * Math.exp(-e.deltaY * 0.0012), 0.2, 10); };
      const leave = () => { armed = false; };
      cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
      cv.addEventListener('wheel', wheel, { passive: false }); cv.addEventListener('pointerleave', leave);
      return () => { cv.removeEventListener('pointerleave', leave); cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('pointercancel', up); cv.removeEventListener('wheel', wheel); };
    }
    /* ---- 도형 → 면 목록 */
    function box(G, size, col, out) {
      const [a, b, c] = size.map(v => v / 2);
      const v = [[-a, -b, -c], [a, -b, -c], [a, b, -c], [-a, b, -c], [-a, -b, c], [a, -b, c], [a, b, c], [-a, b, c]].map(p => xf(G, p));
      [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]].forEach(f => out.push({ pts: f.map(i => v[i]), col }));
    }
    function cylinder(G, r, l, col, out, n) {
      n = n || 16;
      const lo = [], hi = [];
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; lo.push(xf(G, [r * Math.cos(a), r * Math.sin(a), -l / 2])); hi.push(xf(G, [r * Math.cos(a), r * Math.sin(a), l / 2])); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; out.push({ pts: [lo[i], lo[j], hi[j], hi[i]], col, noEdge: true }); }
      out.push({ pts: lo, col }); out.push({ pts: hi, col });
    }
    function sphere(G, r, col, out) {
      const la = 7, lo = 12, P = [];
      for (let i = 0; i <= la; i++) { const th = i / la * Math.PI; const row = []; for (let j = 0; j < lo; j++) { const ph = j / lo * Math.PI * 2; row.push(xf(G, [r * Math.sin(th) * Math.cos(ph), r * Math.sin(th) * Math.sin(ph), r * Math.cos(th)])); } P.push(row); }
      for (let i = 0; i < la; i++) for (let j = 0; j < lo; j++) { const k = (j + 1) % lo; out.push({ pts: [P[i][j], P[i][k], P[i + 1][k], P[i + 1][j]], col, noEdge: true }); }
    }
    const LIGHT = (() => { const v = [0.35, -0.45, 0.82]; const n = Math.hypot(...v); return v.map(x => x / n); })();
    function drawFaces(ctx, P, faces, o) {
      o = o || {};
      const alpha = o.alpha == null ? 1 : o.alpha;
      const list = faces.map(f => {
        const pp = f.pts.map(P);
        let d = 0; pp.forEach(p => d += p.depth);
        const a = f.pts[0], b = f.pts[1], c = f.pts[2];
        const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
        const nl = Math.hypot(n[0], n[1], n[2]) || 1;
        const sh = 0.5 + 0.5 * Math.abs((n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]) / nl);
        return { pp, d: d / pp.length, f, sh };
      }).sort((x, y) => x.d - y.d);
      ctx.save(); ctx.lineJoin = 'round';
      list.forEach(({ pp, f, sh }) => {
        ctx.beginPath(); ctx.moveTo(pp[0].x, pp[0].y); for (let i = 1; i < pp.length; i++) ctx.lineTo(pp[i].x, pp[i].y); ctx.closePath();
        const c = f.col;
        ctx.fillStyle = o.ghost ? o.ghost : `rgba(${Math.round(c[0] * sh)},${Math.round(c[1] * sh)},${Math.round(c[2] * sh)},${(c[3] == null ? 1 : c[3]) * alpha})`;
        ctx.fill();
        if (!f.noEdge && o.edge) { ctx.strokeStyle = o.edge; ctx.lineWidth = 0.6; ctx.stroke(); }
      });
      ctx.restore();
    }
    function label(ctx, x, y, text, C, o) {
      o = o || {};
      ctx.save();
      ctx.font = o.font || '600 11px sans-serif';
      ctx.lineWidth = 3; ctx.strokeStyle = C.card || '#fff'; ctx.lineJoin = 'round';
      ctx.strokeText(text, x, y); ctx.fillStyle = o.color || C.fg; ctx.fillText(text, x, y);
      ctx.restore();
    }
    /** 좌표축 (x 빨강 · y 초록 · z 파랑) */
    function axes(ctx, P, M, L, C, o) {
      o = o || {};
      const O = P(pos(M));
      const ends = [[L, 0, 0], [0, L, 0], [0, 0, L]].map(v => P(xf(M, v)));
      const cols = [C.red, C.green, C.blue];
      const order = [0, 1, 2].sort((a, b) => ends[a].depth - ends[b].depth);
      ctx.save();
      ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
      ctx.lineWidth = o.thin ? 1.8 : 2.6;
      order.forEach(k => { ctx.strokeStyle = cols[k]; ctx.fillStyle = cols[k]; RosUI.arrow(ctx, O.x, O.y, ends[k].x, ends[k].y, o.thin ? 5 : 7); });
      ctx.restore();
      if (o.label) label(ctx, O.x + 5, O.y + 13, o.label, C, { color: o.labelColor });
      return O;
    }
    function grid(ctx, P, center, ext, step, color, z) {
      z = z || 0;
      const cx = Math.round(center[0] / step) * step, cy = Math.round(center[1] / step) * step;
      const n = Math.ceil(ext / step);
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1;
      for (let i = -n; i <= n; i++) {
        const a = P([cx + i * step, cy - n * step, z]), b = P([cx + i * step, cy + n * step, z]);
        const c = P([cx - n * step, cy + i * step, z]), d = P([cx + n * step, cy + i * step, z]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
      }
      ctx.restore();
    }
    function line(ctx, P, a, b, color, width, dash) {
      const A = P(a), B = P(b);
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width || 1.5; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); ctx.restore();
    }
    function hexRgb(c, a) {
      c = String(c || '').trim();
      let m = /^#([0-9a-f]{6})$/i.exec(c);
      if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a == null ? 1 : a]; }
      m = /^#([0-9a-f]{3})$/i.exec(c);
      if (m) { const s = m[1]; return [parseInt(s[0] + s[0], 16), parseInt(s[1] + s[1], 16), parseInt(s[2] + s[2], 16), a == null ? 1 : a]; }
      m = /rgba?\(([^)]+)\)/.exec(c);
      if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], a == null ? (p[3] == null ? 1 : p[3]) : a]; }
      return [128, 128, 128, a == null ? 1 : a];
    }
    return { I, mul, xf, pos, inv, fromTQ, cam, projector, screenToWorld, orbit, box, cylinder, sphere, drawFaces, axes, grid, line, label, hexRgb };
  })();
  window.W3D = W3D;

  /* ================================================== TF 수신 빈도 추적 (view_frames 용) */
  const TFSTAT = {};
  if (window.ROS && ROS.on) ROS.on('pub', (topic, msg) => {
    if (topic !== '/tf') return;
    const now = performance.now();
    (msg.transforms || []).forEach(ts => { const c = String(ts.child_frame_id || '').replace(/^\//, ''); const a = TFSTAT[c] = TFSTAT[c] || []; a.push(now); if (a.length > 40) a.shift(); });
  });
  function tfRate(child) {
    const a = (TFSTAT[child] || []).filter(t => performance.now() - t < 3000);
    if (a.length < 2) return 0;
    return (a.length - 1) / ((a[a.length - 1] - a[0]) / 1000);
  }

  /** 지금 TF 버퍼의 나무 → SVG 문자열 */
  function tfTreeSVG(opts) {
    opts = opts || {};
    const fr = ROS.graph.tf.frames;
    const kids = {}, all = new Set();
    Object.keys(fr).sort().forEach(c => { const v = fr[c]; all.add(c); all.add(v.parent); (kids[v.parent] = kids[v.parent] || []).push(c); });
    const roots = [...all].filter(f => !fr[f]).sort();
    if (!roots.length) return '<div class="wt-empty">TF 프레임이 아직 없습니다. <code>/tf</code> · <code>/tf_static</code> 을 발행하는 노드를 실행해 보세요.<br>예: <code>ros2 run tf2_ros static_transform_publisher --frame-id world --child-frame-id robot</code></div>';
    const SLOT = 150, LV = 96, BH = 30;
    const pos = {};
    let leaf = 0, maxD = 0;
    const place = (f, d, seen) => {
      if (seen.has(f) || d > 30) return 0; seen.add(f);
      maxD = Math.max(maxD, d);
      const ks = kids[f] || [];
      let x;
      if (!ks.length) x = leaf++;
      else { const xs = ks.map(k => place(k, d + 1, seen)); x = (xs[0] + xs[xs.length - 1]) / 2; }
      pos[f] = { x, d };
      return x;
    };
    const seen = new Set();
    roots.forEach(r => { place(r, 0, seen); leaf += 0.3; });
    const W = Math.max(SLOT, leaf * SLOT), H = (maxD + 1) * LV - (LV - BH) + 20;
    const X = f => 10 + pos[f].x * SLOT + SLOT / 2 - 10, Y = f => 10 + pos[f].d * LV;
    const hl = opts.highlight || new Set();
    let s = `<svg class="wt-svg" viewBox="0 0 ${W} ${H}" style="max-width:${Math.max(W, 280)}px" xmlns="http://www.w3.org/2000/svg">`;
    Object.keys(fr).forEach(c => {
      const v = fr[c]; if (!pos[c] || !pos[v.parent]) return;
      const x1 = X(v.parent), y1 = Y(v.parent) + BH, x2 = X(c), y2 = Y(c);
      const rate = tfRate(c);
      const age = (performance.now() - v.at) / 1000;
      s += `<path class="wt-edge${v.static ? ' st' : ''}${hl.has(c) && hl.has(v.parent) ? ' hl' : ''}" d="M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2 - 5}"/>`;
      s += `<path class="wt-ah" d="M${x2 - 4},${y2 - 9} L${x2},${y2 - 2} L${x2 + 4},${y2 - 9}Z"/>`;
      const mx = (x1 + x2) / 2 + (x2 >= x1 ? 4 : -4), my = (y1 + y2) / 2;
      const anchor = x2 > x1 + 2 ? 'start' : x2 < x1 - 2 ? 'end' : 'start';
      const lx = anchor === 'start' ? mx + 4 : mx - 4;
      s += `<text class="wt-el" x="${lx}" y="${my - 6}" text-anchor="${anchor}">${esc(v.auth)}</text>`;
      s += `<text class="wt-el mu" x="${lx}" y="${my + 7}" text-anchor="${anchor}">${v.static ? 'static' : (rate ? rate.toFixed(1) + ' Hz' : (age > 2 ? `${age.toFixed(0)}s 전` : '—'))}</text>`;
    });
    Object.keys(pos).forEach(f => {
      const w = Math.min(SLOT - 16, Math.max(64, f.length * 7.4 + 18));
      const x = X(f), y = Y(f);
      const isRoot = !fr[f];
      s += `<g class="wt-node${hl.has(f) ? ' hl' : ''}${isRoot ? ' root' : ''}"><rect x="${x - w / 2}" y="${y}" width="${w}" height="${BH}" rx="15"/><text x="${x}" y="${y + BH / 2 + 1}" text-anchor="middle">${esc(f)}</text></g>`;
    });
    return s + '</svg>';
  }

  /* ---------------------------------------------- view_frames 창 */
  function buildTfView(root, o) {
    root.classList.add('wt-view');
    root.innerHTML = `<div class="w-row wt-vbar"><b>🌳 TF 트리</b><span class="muted small">— <code>ros2 run tf2_tools view_frames</code> 결과(frames.pdf)를 창으로 봅니다 · 1초마다 새로 그림</span></div>
      <div class="wt-tree"></div>
      <details class="wt-det" open><summary>프레임 목록</summary><div class="tbl-wrap"><table class="tbl wt-tbl"><thead><tr><th>frame</th><th>parent</th><th>broadcaster</th><th>종류</th><th>rate</th><th>최근</th></tr></thead><tbody></tbody></table></div></details>`;
    const tree = root.querySelector('.wt-tree'), tb = root.querySelector('tbody');
    const draw = () => {
      tree.innerHTML = tfTreeSVG();
      const fr = ROS.graph.tf.frames;
      tb.innerHTML = Object.keys(fr).sort().map(c => { const v = fr[c]; const r = tfRate(c); const age = (performance.now() - v.at) / 1000; return `<tr><td><code>${esc(c)}</code></td><td><code>${esc(v.parent)}</code></td><td>${esc(v.auth)}</td><td>${v.static ? '<span class="wt-badge st">static</span>' : '<span class="wt-badge dy">dynamic</span>'}</td><td>${v.static ? '—' : r.toFixed(1) + ' Hz'}</td><td>${age.toFixed(1)} s 전</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">프레임 없음</td></tr>';
    };
    draw();
    const t = setInterval(() => { if (!root.isConnected) { clearInterval(t); return; } draw(); }, 1000);
    return () => clearInterval(t);
  }

  /* ================================================== tftree 위젯 */
  const RNG = { x: [-2, 2, 0.01], y: [-2, 2, 0.01], z: [-1, 1, 0.01], roll: [-180, 180, 1], pitch: [-180, 180, 1], yaw: [-180, 180, 1] };
  const UNIT = { x: 'm', y: 'm', z: 'm', roll: '°', pitch: '°', yaw: '°' };
  const TF_PRESETS = {
    robot: {
      ko: '모바일 로봇', root: 'map', fit: 2.2, center: [1.0, 0.4, 0.2], L: 0.3, grid: [4, 0.5],
      frames: [
        { child: 'odom', parent: 'map', node: 'amcl', pkg: 'nav2_amcl', exe: 'amcl', v: { x: 0.4, y: -0.3, yaw: 8 }, edit: ['x', 'y', 'yaw'], note: '위치 추정(AMCL·SLAM)이 오도메트리의 누적 오차를 보정' },
        { child: 'base_link', parent: 'odom', node: 'diff_drive_controller', pkg: 'diff_drive_controller', exe: 'diff_drive_controller', v: { x: 1.2, y: 0.6, yaw: 30 }, edit: ['x', 'y', 'yaw'], rng: { x: [-3, 3, 0.01], y: [-3, 3, 0.01] }, note: '바퀴 회전으로 계산한 로봇 위치 (연속적이지만 오차가 쌓임)' },
        { child: 'laser', parent: 'base_link', node: 'static_transform_publisher_laser', pkg: 'tf2_ros', exe: 'static_transform_publisher', static: true, v: { x: 0.1, z: 0.18 }, edit: ['x', 'z', 'yaw'], note: '라이다가 로봇 어디에 달려 있나 (고정)' },
        { child: 'camera_link', parent: 'base_link', node: 'static_transform_publisher_camera', pkg: 'tf2_ros', exe: 'static_transform_publisher', static: true, v: { x: 0.2, z: 0.12 }, edit: ['x', 'z', 'pitch'], note: '카메라 몸체 위치 (고정)' },
        { child: 'camera_optical', parent: 'camera_link', node: 'static_transform_publisher_camera', pkg: 'tf2_ros', exe: 'static_transform_publisher', static: true, v: { roll: -90, yaw: -90 }, edit: [], note: '광학 좌표계: z 앞 · x 오른쪽 · y 아래 (REP-103), rpy = (-90°, 0, -90°)' }
      ],
      point: { frame: 'laser', target: 'map', r: 1.5, a: 25, rmax: 4, what: '라이다가 본 장애물' },
      echo: ['map', 'laser'],
      anim(v, t) { const b = v.base_link; b.x = 1.0 + Math.cos(t * 0.35) * 1.1; b.y = 0.3 + Math.sin(t * 0.35) * 1.1; b.yaw = ((t * 0.35 * R2D + 90 + 180) % 360) - 180; v.odom.x = 0.4 + 0.05 * Math.sin(t * 0.2); }
    },
    turtle: {
      ko: '거북이 (turtle_tf2)', root: 'world', fit: 6.2, center: [5.5, 5.5, 0], L: 0.9, grid: [5.6, 1],
      frames: [
        { child: 'turtle1', parent: 'world', node: 'turtle1_tf2_broadcaster', pkg: 'turtle_tf2_py', exe: 'turtle_tf2_broadcaster', v: { x: 5.5, y: 5.5, yaw: 0 }, edit: ['x', 'y', 'yaw'], rng: { x: [0, 11, 0.05], y: [0, 11, 0.05] }, note: 'turtle1/pose → world→turtle1' },
        { child: 'turtle2', parent: 'world', node: 'turtle2_tf2_broadcaster', pkg: 'turtle_tf2_py', exe: 'turtle_tf2_broadcaster', v: { x: 2, y: 3, yaw: 45 }, edit: ['x', 'y', 'yaw'], rng: { x: [0, 11, 0.05], y: [0, 11, 0.05] }, note: 'turtle2/pose → world→turtle2' },
        { child: 'carrot1', parent: 'turtle1', node: 'fixed_frame_tf2_broadcaster', pkg: 'turtle_tf2_py', exe: 'fixed_frame_tf2_broadcaster', v: { y: 2 }, edit: ['x', 'y'], rng: { x: [-3, 3, 0.05], y: [-3, 3, 0.05] }, note: 'turtle1 에 붙은 당근(움직이는 부모를 따라감)' }
      ],
      point: { frame: 'turtle1', target: 'turtle2', r: 0, a: 0, rmax: 3, what: 'turtle1 의 위치' },
      echo: ['turtle2', 'turtle1'],
      anim(v, t, dt) {
        const a = v.turtle1; a.x = 5.5 + 2.8 * Math.cos(t * 0.3); a.y = 5.5 + 2.8 * Math.sin(t * 0.3); a.yaw = ((t * 0.3 * R2D + 90 + 180) % 360) - 180;
        // turtle2 는 tf 로 turtle1 을 따라감 (turtle_tf2_listener 와 같은 계산)
        try {
          const T = ROS.graph.tf.lookup('turtle2', 'turtle1');
          const b = v.turtle2, th = b.yaw * D2R;
          const lin = 0.5 * Math.hypot(T.t.x, T.t.y), ang = 1.0 * Math.atan2(T.t.y, T.t.x);
          b.x = clamp(b.x + Math.cos(th) * lin * dt, 0, 11); b.y = clamp(b.y + Math.sin(th) * lin * dt, 0, 11); b.yaw = ROS.math.normAngle(th + ang * dt) * R2D;
        } catch (_) {}
      }
    },
    arm: {
      ko: '로봇 팔', root: 'world', fit: 0.38, center: [0.15, 0, 0.18], L: 0.06, grid: [0.5, 0.05],
      frames: [
        { child: 'base_link', parent: 'world', node: 'static_transform_publisher_arm', pkg: 'tf2_ros', exe: 'static_transform_publisher', static: true, v: {}, edit: ['x', 'y'], rng: { x: [-0.3, 0.3, 0.005], y: [-0.3, 0.3, 0.005] }, note: '로봇을 책상 어디에 놓았나' },
        { child: 'shoulder_link', parent: 'base_link', node: 'arm_tf_broadcaster', pkg: 'tf_playground', exe: 'arm_tf_broadcaster', v: { z: 0.08, yaw: 20 }, edit: ['yaw'], note: 'joint1 (허리 회전: z 축)' },
        { child: 'upper_arm_link', parent: 'shoulder_link', node: 'arm_tf_broadcaster', pkg: 'tf_playground', exe: 'arm_tf_broadcaster', v: { z: 0.06, pitch: -45 }, edit: ['pitch'], note: 'joint2 (어깨: y 축)' },
        { child: 'forearm_link', parent: 'upper_arm_link', node: 'arm_tf_broadcaster', pkg: 'tf_playground', exe: 'arm_tf_broadcaster', v: { x: 0.22, pitch: 75 }, edit: ['pitch'], note: 'joint3 (팔꿈치: y 축)' },
        { child: 'tool0', parent: 'forearm_link', node: 'static_transform_publisher_arm', pkg: 'tf2_ros', exe: 'static_transform_publisher', static: true, v: { x: 0.18 }, edit: ['x'], rng: { x: [0.05, 0.3, 0.005] }, note: '공구 끝(TCP): 고정 조인트 → /tf_static' }
      ],
      point: { frame: 'tool0', target: 'base_link', r: 0.05, a: 0, rmax: 0.2, what: '공구 앞 5 cm 의 점' },
      echo: ['base_link', 'tool0'],
      anim(v, t) { v.shoulder_link.yaw = 40 * Math.sin(t * 0.6); v.upper_arm_link.pitch = -45 + 20 * Math.sin(t * 0.9); v.forearm_link.pitch = 75 + 25 * Math.sin(t * 1.1); }
    }
  };
  const tfOf = v => ({ t: { x: v.x || 0, y: v.y || 0, z: v.z || 0 }, q: ROS.math.rpyToQ((v.roll || 0) * D2R, (v.pitch || 0) * D2R, (v.yaw || 0) * D2R) });

  function buildTfTree(root, o, owner) {
    const W = W3D;
    let pk = TF_PRESETS[o.preset] ? o.preset : 'robot';
    let S = null; // 현재 프리셋 상태
    root.classList.add('wt-root');
    if (o.inWindow) root.classList.add('wt-inwin');
    root.innerHTML = `
      <div class="w-row wt-bar">
        <div class="w-seg wt-pre">${Object.entries(TF_PRESETS).map(([k, p]) => `<button data-p="${k}">${p.ko}</button>`).join('')}</div>
        <div class="w-seg wt-camseg"><button data-c="3d" class="on">3D</button><button data-c="top">위에서</button></div>
        <button class="btn tiny" data-a="anim">▶ 움직이기</button>
        <span class="spacer"></span>
        ${o.inWindow ? '' : `<button class="btn tiny ghost" data-a="vf" title="view_frames 창으로 TF 나무 보기">🌳 view_frames</button>`}
      </div>
      <div class="wt-main">
        <div class="wt-cvwrap"><canvas class="wt-cv"></canvas>
          <div class="wt-legend"><span class="wt-x">x</span><span class="wt-y">y</span><span class="wt-z">z</span><span class="wt-ln">— /tf</span><span class="wt-ln st">┄ /tf_static</span></div>
          <div class="wt-hint">끌어서 회전 · 누른 뒤 휠로 확대</div>
        </div>
        <div class="wt-side">
          <div class="w-seg wt-tabs"><button data-t="sl" class="on">변환 조절</button><button data-t="echo">tf2_echo</button><button data-t="pt">점 변환</button><button data-t="tree">트리</button></div>
          <div class="wt-pane" data-p="sl"></div>
          <div class="wt-pane" data-p="echo" hidden>
            <div class="w-row wt-echo-sel"><label>target <select class="w-in wt-tg"></select></label><button class="btn tiny ghost" data-a="swap" title="바꾸기">⇄</button><label>source <select class="w-in wt-sc"></select></label></div>
            <pre class="wt-term"></pre>
            <div class="w-help">target 좌표계에서 본 source 좌표계의 위치·자세입니다. 화면의 <b class="wt-hlc">굵은 화살표</b>가 이 변환입니다.</div>
          </div>
          <div class="wt-pane" data-p="pt" hidden></div>
          <div class="wt-pane" data-p="tree" hidden><div class="wt-tree"></div><div class="w-help">동그라미 = 프레임(좌표계), 화살표 = 부모 → 자식 변환 · 글자 = 발행 노드(broadcaster)와 빈도</div></div>
        </div>
      </div>`;
    const $ = s => root.querySelector(s);
    const cv = $('.wt-cv');
    const cam = W.cam({ yaw: 0.6, el: 0.55 });
    const offOrbit = W.orbit(cv, cam, { orbit() { setCamSeg('3d'); } });
    let animOn = false, tAnim = 0, tab = 'sl';
    function setCamSeg(m) { root.querySelectorAll('.wt-camseg button').forEach(b => b.classList.toggle('on', b.dataset.c === m)); }
    root.querySelectorAll('.wt-camseg button').forEach(b => b.onclick = () => {
      setCamSeg(b.dataset.c);
      if (b.dataset.c === 'top') { cam.yaw = -Math.PI / 2; cam.el = Math.PI / 2; } else { cam.yaw = 0.6; cam.el = 0.55; }
    });
    $('[data-a=anim]').onclick = () => { animOn = !animOn; $('[data-a=anim]').textContent = animOn ? '⏸ 멈추기' : '▶ 움직이기'; $('[data-a=anim]').classList.toggle('primary', animOn); };
    const vf = $('[data-a=vf]'); if (vf) vf.onclick = () => RosUI.openView('tftree_view', { title: 'view_frames — TF 트리' });
    root.querySelectorAll('.wt-tabs button').forEach(b => b.onclick = () => {
      tab = b.dataset.t;
      root.querySelectorAll('.wt-tabs button').forEach(x => x.classList.toggle('on', x === b));
      root.querySelectorAll('.wt-pane').forEach(p => p.hidden = p.dataset.p !== tab);
      refreshSide(true);
    });

    /* ---- 노드 만들기 */
    function start(key) {
      stopNodes();
      pk = key;
      const P = TF_PRESETS[pk];
      root.querySelectorAll('.wt-pre button').forEach(b => b.classList.toggle('on', b.dataset.p === pk));
      const pb = root.querySelector('[data-popout]'); if (pb) pb.dataset.popopts = JSON.stringify({ preset: pk });
      const v = {};
      P.frames.forEach(f => { v[f.child] = Object.assign({ x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 }, f.v); });
      const groups = {};
      P.frames.forEach(f => { (groups[f.node] = groups[f.node] || { name: f.node, pkg: f.pkg, exe: f.exe, frames: [] }).frames.push(f); });
      S = { P, v, groups, nodes: [], pt: { r: P.point.r, a: P.point.a }, echo: P.echo.slice() };
      Object.values(groups).forEach(g => {
        const n = ROS.createNode(g.name, { owner, pkg: g.pkg, exe: g.exe });
        g.node = n;
        const st = g.frames.filter(f => f.static), dy = g.frames.filter(f => !f.static);
        if (st.length) { g.spub = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf_static', 'tf_static'); g.pubStatic = () => (g.spub.kept.length = 0, g.spub.publish({ transforms: st.map(f => { const T = tfOf(v[f.child]); return ROS.tfMsg(f.parent, f.child, T.t, T.q); }) })); g.pubStatic(); }
        if (dy.length) { const pub = n.createPublisher('tf2_msgs/msg/TFMessage', '/tf', 100); g.pubDyn = () => pub.publish({ transforms: dy.map(f => { const T = tfOf(v[f.child]); return ROS.tfMsg(f.parent, f.child, T.t, T.q); }) }); g.pubDyn(); n.createTimer(0.05, g.pubDyn); }
        if (g.exe === 'static_transform_publisher') st.forEach(f => n.info(`Spinning until stopped - publishing transform from '${f.parent}' to '${f.child}'`));
        S.nodes.push(n);
      });
      cam.target = P.center.slice(); cam.fit = P.fit; cam.zoom = 1;
      buildSliders(); buildPoint(); refreshSide(true);
    }
    function stopNodes() {
      if (!S) return;
      S.nodes.forEach(n => { const fq = n.fqn; n.destroy(); if (window.URDFKit) URDFKit.purgeTF(fq); else { const fr = ROS.graph.tf.frames; Object.keys(fr).forEach(c => { if (fr[c].auth === fq) delete fr[c]; }); } });
      S = null;
    }
    function frameOwner(child) { return S.P.frames.find(f => f.child === child); }
    function changed(child) { const f = frameOwner(child); const g = S.groups[f.node]; if (f.static) g.pubStatic(); else g.pubDyn(); }

    function buildSliders() {
      const box = $('.wt-pane[data-p=sl]');
      box.innerHTML = S.P.frames.map(f => `<div class="wt-fr" data-f="${f.child}">
          <div class="wt-frh"><b>${esc(f.parent)} → ${esc(f.child)}</b><span class="wt-badge ${f.static ? 'st' : 'dy'}">${f.static ? '/tf_static' : '/tf'}</span><span class="muted small">/${esc(f.node)}</span></div>
          <div class="muted small">${esc(f.note || '')}</div>
          ${f.edit.map(k => { const r = (f.rng && f.rng[k]) || RNG[k]; return `<label class="wt-sl"><span>${k}</span><input type="range" data-k="${k}" min="${r[0]}" max="${r[1]}" step="${r[2]}" value="${S.v[f.child][k]}"><b class="w-out"></b></label>`; }).join('')}
        </div>`).join('') + `<div class="w-help">슬라이더를 움직이면 해당 노드가 <code>/tf</code>(동적, 20 Hz) 또는 <code>/tf_static</code>(고정, 한 번 + 바뀔 때)에 발행합니다. 터미널에서 <code>ros2 topic echo /tf</code> 로 확인해 보세요.</div>`;
      box.querySelectorAll('.wt-fr').forEach(fe => {
        const ch = fe.dataset.f;
        fe.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { S.v[ch][inp.dataset.k] = +inp.value; changed(ch); showSl(); }));
      });
      showSl();
    }
    function showSl(sync) {
      root.querySelectorAll('.wt-fr').forEach(fe => {
        const ch = fe.dataset.f;
        fe.querySelectorAll('.wt-sl').forEach(l => { const inp = l.querySelector('input'), k = inp.dataset.k; if (sync && document.activeElement !== inp) inp.value = S.v[ch][k]; l.querySelector('b').textContent = (UNIT[k] === 'm' ? (+S.v[ch][k]).toFixed(2) : Math.round(S.v[ch][k])) + ' ' + UNIT[k]; });
      });
    }
    function buildPoint() {
      const P = S.P.point, box = $('.wt-pane[data-p=pt]');
      box.innerHTML = `<div class="small"><b>${esc(P.what)}</b>: <code>${esc(P.frame)}</code> 좌표계에서 측정한 점을 <code>${esc(P.target)}</code> 좌표계로 바꿉니다.</div>
        <label class="wt-sl"><span>거리</span><input type="range" data-k="r" min="0" max="${P.rmax}" step="${P.rmax / 200}" value="${S.pt.r}"><b class="w-out"></b></label>
        <label class="wt-sl"><span>각도</span><input type="range" data-k="a" min="-180" max="180" step="1" value="${S.pt.a}"><b class="w-out"></b></label>
        <pre class="wt-term wt-ptout"></pre>
        <pre class="wt-code">point = PointStamped()
point.header.frame_id = '${esc(P.frame)}'
point.point.x, point.point.y = …   # 센서가 준 값
p_${esc(P.target)} = tf_buffer.transform(point, '${esc(P.target)}')</pre>`;
      box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { S.pt[inp.dataset.k] = +inp.value; refreshSide(); }));
      if (!S.ptPub) { const n = S.nodes[0]; S.ptPub = n.createPublisher('geometry_msgs/msg/PointStamped', '/detected_point', 10); }
    }
    function fillSelect(sel, list, val) {
      const cur = [...sel.options].map(o => o.value).join('|');
      if (cur !== list.join('|')) sel.innerHTML = list.map(f => `<option>${esc(f)}</option>`).join('');
      if (list.includes(val)) sel.value = val;
    }
    $('.wt-tg').onchange = e => { S.echo[0] = e.target.value; refreshSide(true); };
    $('.wt-sc').onchange = e => { S.echo[1] = e.target.value; refreshSide(true); };
    $('[data-a=swap]').onclick = () => { S.echo.reverse(); refreshSide(true); };
    function pointResult() {
      const P = S.P.point;
      const p = { x: S.pt.r * Math.cos(S.pt.a * D2R), y: S.pt.r * Math.sin(S.pt.a * D2R), z: 0 };
      try {
        const T = ROS.graph.tf.lookup(P.target, P.frame);
        const r = ROS.math.qRot(T.q, p);
        return { p, T, out: { x: r.x + T.t.x, y: r.y + T.t.y, z: r.z + T.t.z } };
      } catch (e) { return { p, err: e.message }; }
    }
    let lastSide = 0;
    function refreshSide(force) {
      if (!S) return;
      const now = performance.now();
      if (!force && now - lastSide < 400) return;
      lastSide = now;
      const tf = ROS.graph.tf;
      if (tab === 'echo') {
        const list = tf.list().sort();
        fillSelect($('.wt-tg'), list, S.echo[0]); fillSelect($('.wt-sc'), list, S.echo[1]);
        const [tg, sc] = S.echo;
        let s = `$ ros2 run tf2_ros tf2_echo ${tg} ${sc}\n`;
        try {
          const T = tf.lookup(tg, sc); const rpy = ROS.math.qToRpy(T.q);
          s += `At time ${ROS.graph.stampStr()}\n- Translation: [${f3(T.t.x)}, ${f3(T.t.y)}, ${f3(T.t.z)}]\n- Rotation: in Quaternion [${f3(T.q.x)}, ${f3(T.q.y)}, ${f3(T.q.z)}, ${f3(T.q.w)}]\n- Rotation: in RPY (radian) [${rpy.map(f3).join(', ')}]\n- Rotation: in RPY (degree) [${rpy.map(r => f3(r * R2D)).join(', ')}]`;
        } catch (e) { s += `[INFO] [tf2_echo]: Waiting for transform ${tg} ->  ${sc}: ${e.message}`; }
        $('.wt-pane[data-p=echo] .wt-term').textContent = s;
      } else if (tab === 'pt') {
        const P = S.P.point, r = pointResult();
        root.querySelectorAll('.wt-pane[data-p=pt] .wt-sl').forEach(l => { const k = l.querySelector('input').dataset.k; l.querySelector('b').textContent = k === 'r' ? S.pt.r.toFixed(2) + ' m' : Math.round(S.pt.a) + '°'; });
        let s = `p_${P.frame}  = (${f3(r.p.x)}, ${f3(r.p.y)}, ${f3(r.p.z)})\n`;
        if (r.err) s += '변환 실패: ' + r.err;
        else {
          const yaw = ROS.math.qToYaw(r.T.q) * R2D;
          s += `T(${P.target} ← ${P.frame}): t = (${f3(r.T.t.x)}, ${f3(r.T.t.y)}, ${f3(r.T.t.z)}), yaw ≈ ${yaw.toFixed(1)}°\n`;
          s += `p_${P.target} = R·p + t = (${f3(r.out.x)}, ${f3(r.out.y)}, ${f3(r.out.z)})\n`;
          s += `경로: ${tf.chain(P.frame).join(' → ')}${tf.chain(P.target).length > 1 ? '  /  ' + tf.chain(P.target).join(' → ') : ''}`;
          if (S.ptPub) S.ptPub.publish({ header: { stamp: ROS.graph.now(), frame_id: P.frame }, point: r.p });
        }
        $('.wt-ptout').textContent = s;
      } else if (tab === 'tree') {
        $('.wt-tree').innerHTML = tfTreeSVG({ highlight: new Set(tf.chain(S.echo[0]).concat(tf.chain(S.echo[1]))) });
      }
    }
    root.querySelectorAll('.wt-pre button').forEach(b => b.onclick = () => start(b.dataset.p));
    start(pk);

    let slT = 0;
    const stop = RosUI.loop(root, (dt, t) => {
      if (!S) return;
      if (animOn) { tAnim += dt; S.P.anim(S.v, tAnim, dt); if ((slT += dt) > 0.1) { slT = 0; showSl(true); } }
      refreshSide();
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      const C = RosUI.colors();
      cam.w = w; cam.h = h;
      const P = W.projector(cam);
      ctx.clearRect(0, 0, w, h);
      const pre = S.P;
      W.grid(ctx, P, pre.center, pre.grid[0], pre.grid[1], C.line, 0);
      const tf = ROS.graph.tf;
      // 같은 나무(root)에 있는 모든 프레임
      const M = {};
      tf.list().forEach(f => { const r = tf.toRoot(f); if (r.root === pre.root) M[f] = W.fromTQ(r.T); });
      if (!M[pre.root]) M[pre.root] = W.I();
      // 몸체
      const faces = [];
      if (pk === 'robot' && M.base_link) {
        W.box(W.mul(M.base_link, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -0.02, 0, 0.08, 1]), [0.42, 0.32, 0.12], W.hexRgb(C.blue, 0.55), faces);
        [-0.17, 0.17].forEach(y => W.cylinder(W.mul(M.base_link, [1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, y, 0.05, 1]), 0.05, 0.03, [60, 60, 66, 0.8], faces, 12));
        if (M.laser) W.cylinder(M.laser, 0.04, 0.04, W.hexRgb(C.red, 0.7), faces, 12);
        if (M.camera_link) W.box(M.camera_link, [0.03, 0.1, 0.03], [80, 80, 90, 0.8], faces);
      }
      if (pk === 'turtle') ['turtle1', 'turtle2'].forEach((n, i) => { if (M[n]) { W.cylinder(W.mul(M[n], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0.1, 1]), 0.45, 0.2, i ? [212, 160, 23, 0.6] : [58, 157, 35, 0.6], faces, 14); W.sphere(W.mul(M[n], [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0.5, 0, 0.15, 1]), 0.14, i ? [212, 160, 23, 0.8] : [58, 157, 35, 0.8], faces); } });
      if (pk === 'arm') {
        if (M.base_link) W.cylinder(W.mul(M.base_link, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0.04, 1]), 0.05, 0.08, [120, 125, 135, 0.7], faces, 14);
      }
      W.drawFaces(ctx, P, faces, { edge: C.dark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.18)' });
      if (pk === 'arm') [['shoulder_link', 'upper_arm_link'], ['upper_arm_link', 'forearm_link'], ['forearm_link', 'tool0']].forEach(([a, b]) => { if (M[a] && M[b]) W.line(ctx, P, W.pos(M[a]), W.pos(M[b]), C.dark ? 'rgba(250,200,60,.75)' : 'rgba(230,160,20,.8)', 9); });
      // 부모-자식 연결선
      Object.keys(M).forEach(f => {
        const fr = tf.frames[f]; if (!fr || !M[fr.parent]) return;
        W.line(ctx, P, W.pos(M[fr.parent]), W.pos(M[f]), C.gray, 1.3, fr.static ? [4, 4] : null);
      });
      // echo 강조 화살표
      const [tg, sc] = S.echo;
      if (M[tg] && M[sc] && tg !== sc) {
        const a = P(W.pos(M[tg])), b = P(W.pos(M[sc]));
        ctx.save(); ctx.strokeStyle = C.purple; ctx.fillStyle = C.purple; ctx.lineWidth = 3.5; ctx.globalAlpha = 0.8; RosUI.arrow(ctx, a.x, a.y, b.x, b.y, 11); ctx.restore();
      }
      // 축
      Object.keys(M).forEach(f => W.axes(ctx, P, M[f], pre.L * (f === pre.root ? 1.4 : 1), C, { label: f, labelColor: (f === tg || f === sc) ? C.purple : C.fg }));
      // 점 변환
      if (tab === 'pt' && M[pre.point.frame]) {
        const r = pointResult();
        const wp = W.xf(M[pre.point.frame], [r.p.x, r.p.y, r.p.z]);
        W.line(ctx, P, W.pos(M[pre.point.frame]), wp, C.purple, 1.6, [5, 4]);
        const q = P(wp);
        ctx.fillStyle = C.purple; ctx.beginPath(); ctx.arc(q.x, q.y, 6, 0, Math.PI * 2); ctx.fill();
        if (!r.err) W.label(ctx, q.x + 8, q.y - 8, `${pre.point.target}: (${r.out.x.toFixed(2)}, ${r.out.y.toFixed(2)}, ${r.out.z.toFixed(2)})`, C, { color: C.purple });
      }
    });
    return () => { stop(); offOrbit(); stopNodes(); };
  }

  /* ================================================== SO-ARM101 시뮬레이터 (ros2_control 흉내) */
  const K = window.SO101;
  const JN = K ? K.JOINTS.map(j => j.name) : [];
  const SIMS = new Set();
  ROS_IFACES['controller_manager_msgs/msg/ControllerState'] = `# (간소화)
string name
string state
string type
string[] claimed_interfaces`;
  ROS_IFACES['controller_manager_msgs/srv/ListControllers'] = `---
controller_manager_msgs/ControllerState[] controller`;
  const durSec = d => (d ? (+d.sec || 0) + (+d.nanosec || 0) * 1e-9 : 0);
  const secDur = s => ({ sec: Math.floor(s), nanosec: Math.round((s - Math.floor(s)) * 1e9) % 1000000000 });

  /** 궤적 보간: 3차 에르미트 (속도가 없으면 이웃 기울기로 추정) */
  function makeInterp(q0, times, pos, vels) {
    const T = [0].concat(times), X = [q0].concat(pos);
    if (times.length && times[0] <= 1e-6) { T.shift(); X.shift(); }
    const n = T.length;
    const V = X.map((_, i) => {
      if (vels && vels[i - (T.length - times.length)] && vels[i - (T.length - times.length)].length) return vels[i - (T.length - times.length)];
      if (i === 0 || i === n - 1) return X[i].map(() => 0);
      return X[i].map((x, k) => { const s1 = (x - X[i - 1][k]) / Math.max(1e-6, T[i] - T[i - 1]), s2 = (X[i + 1][k] - x) / Math.max(1e-6, T[i + 1] - T[i]); return s1 * s2 <= 0 ? 0 : (s1 + s2) / 2; });
    });
    return t => {
      if (t <= T[0]) return X[0].slice();
      if (t >= T[n - 1]) return X[n - 1].slice();
      let i = 0; while (i < n - 2 && t > T[i + 1]) i++;
      const h = T[i + 1] - T[i], s = (t - T[i]) / h, s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
      return X[i].map((x, k) => h00 * x + h10 * h * V[i][k] + h01 * X[i + 1][k] + h11 * h * V[i + 1][k]);
    };
  }

  function createArmSim(opts) {
    opts = opts || {};
    const mk = (name, pkg, exe) => ROS.createNode(name, { owner: opts.owner, out: opts.out, pkg, exe });
    const cm = mk('controller_manager', 'controller_manager', 'ros2_control_node');
    const armN = mk('arm_controller', 'joint_trajectory_controller', 'joint_trajectory_controller');
    const gripN = mk('gripper_controller', 'position_controllers', 'gripper_action_controller');
    const jsbN = mk('joint_state_broadcaster', 'joint_state_broadcaster', 'joint_state_broadcaster');
    const rspN = mk('robot_state_publisher', 'robot_state_publisher', 'robot_state_publisher');
    const start = (K.POSES.rest || K.POSES.home).q.slice();
    const sim = {
      nodes: [cm, armN, gripN, jsbN, rspN], q: start.slice(), cmd: start.slice(), vel: [0, 0, 0, 0, 0, 0],
      traj: null, grip: null, cube: { p: [0.20, 0.08, 0.0125], size: 0.025, held: false, off: null },
      ev: {}, logs: [], alive: () => cm.alive, t: 0
    };
    sim.on = (e, f) => { (sim.ev[e] = sim.ev[e] || []).push(f); return () => { sim.ev[e] = (sim.ev[e] || []).filter(x => x !== f); }; };
    const emit = (e, a) => (sim.ev[e] || []).slice().forEach(f => { try { f(a); } catch (er) { console.error(er); } });
    sim.emit = emit;
    cm.declareParameter('update_rate', 50, { description: '제어 루프 주기 (Hz)', type: 'integer', read_only: true });
    armN.declareParameter('joints', JN.slice(), { description: '이 컨트롤러가 움직이는 관절', read_only: true });
    armN.declareParameter('command_interfaces', ['position'], { read_only: true });
    armN.declareParameter('state_interfaces', ['position', 'velocity'], { read_only: true });
    armN.declareParameter('constraints.goal_time', 0.8, { description: '목표 시간 이후 허용 여유 (s)' });
    gripN.declareParameter('joint', 'gripper', { read_only: true });
    jsbN.declareParameter('joints', JN.slice(), { read_only: true });
    const urdf = window.URDFKit ? URDFKit.presetSO101() : '';
    if (window.URDFKit) sim.rsp = URDFKit.createRSP(rspN, urdf);
    const js = jsbN.createPublisher('sensor_msgs/msg/JointState', '/joint_states', 10);
    cm.createService('controller_manager_msgs/srv/ListControllers', '~/list_controllers', (req, res) => {
      res.controller = [
        { name: 'joint_state_broadcaster', state: 'active', type: 'joint_state_broadcaster/JointStateBroadcaster', claimed_interfaces: [] },
        { name: 'arm_controller', state: 'active', type: 'joint_trajectory_controller/JointTrajectoryController', claimed_interfaces: JN.map(n => n + '/position') },
        { name: 'gripper_controller', state: 'active', type: 'position_controllers/GripperActionController', claimed_interfaces: ['gripper/position'] }
      ];
      return res;
    });
    const logs = [
      [cm, "Loading hardware 'SO101System' (mock_components/GenericSystem)"], [cm, "Successful 'configure' of hardware 'SO101System'"], [cm, "Successful 'activate' of hardware 'SO101System'"],
      [cm, "Loading controller 'joint_state_broadcaster'"], [cm, "Loading controller 'arm_controller'"], [cm, "Loading controller 'gripper_controller'"],
      [armN, 'Action status changes will be monitored @ 20.00 Hz.'], [cm, 'Configured and activated all the controllers']
    ];
    logs.forEach(([n, t]) => n.info(t));

    /* ---- 궤적 불러오기 (액션 · 토픽 공용) */
    function validate(tr) {
      const names = tr.joint_names || [];
      if (!names.length) return 'Empty joint names parameter';
      const bad = names.filter(n => !JN.includes(n));
      if (bad.length) return `Incoming joint ${bad[0]} doesn't match the controller's joints.`;
      if (!(tr.points || []).length) return 'Empty trajectory received';
      for (let i = 0; i < tr.points.length; i++) {
        const p = tr.points[i];
        if ((p.positions || []).length !== names.length) return `Mismatch between joint_names size (${names.length}) and positions (${(p.positions || []).length}) at point #${i}.`;
        if (i && durSec(p.time_from_start) < durSec(tr.points[i - 1].time_from_start)) return `Time between points ${i - 1} and ${i} is not strictly increasing, it is ${durSec(tr.points[i - 1].time_from_start)} and ${durSec(p.time_from_start)} respectively`;
      }
      return null;
    }
    function load(tr, gh) {
      const names = tr.joint_names;
      const idx = names.map(n => JN.indexOf(n));
      let clampWarn = false;
      const pos = tr.points.map(p => p.positions.map((v, k) => { const J = K.JOINTS[idx[k]]; const c = clamp(+v, J.lower, J.upper); if (Math.abs(c - v) > 1e-6) clampWarn = true; return c; }));
      if (clampWarn) armN.warn('관절 한계를 넘는 값이 있어 URDF limit 로 잘랐습니다');
      const times = tr.points.map(p => durSec(p.time_from_start));
      const vels = tr.points.map(p => p.velocities || []);
      if (times[times.length - 1] < 0.05) times[times.length - 1] = 0.05;
      if (sim.traj) { sim.traj.preempted = true; }
      sim.traj = { names, idx, pos, times, T: times[times.length - 1], t0: performance.now() / 1000, f: makeInterp(idx.map(i => sim.cmd[i]), times, pos, vels.every(v => v.length === names.length) ? vels : null), gh, desired: idx.map(i => sim.cmd[i]) };
      emit('traj', sim.traj);
      return sim.traj;
    }
    sim.load = load;
    armN.createActionServer('control_msgs/action/FollowJointTrajectory', '~/follow_joint_trajectory', {
      goal: req => { armN.info('Received new action goal'); const e = validate(req.trajectory || {}); if (e) { armN.error(e); return false; } armN.info('Accepted new action goal'); return true; },
      async execute(gh) {
        const tr = load(gh.request.trajectory, gh);
        const goalTime = +armN.getParameter('constraints.goal_time') || 0.8;
        let lastFb = 0;
        while (cm.alive) {
          await ROS.sleep(20);
          if (tr.preempted) { armN.info('Goal preempted by a new goal'); gh.abort({ error_code: -5, error_string: 'Goal preempted' }); return; }
          const now = performance.now() / 1000, t = now - tr.t0;
          const act = tr.idx.map(i => sim.q[i]);
          if (now - lastFb > 0.1) {
            lastFb = now;
            gh.publishFeedback({ header: { stamp: ROS.graph.now(), frame_id: '' }, joint_names: tr.names, desired: { positions: tr.desired.slice(), time_from_start: secDur(Math.min(t, tr.T)) }, actual: { positions: act, time_from_start: secDur(t) }, error: { positions: tr.desired.map((d, k) => d - act[k]), time_from_start: secDur(t) } });
          }
          if (gh.isCancelRequested) { if (sim.traj === tr) { sim.traj = null; sim.cmd = sim.q.slice(); } armN.info('Canceling active action goal because cancel callback received.'); gh.canceled({ error_code: 0, error_string: 'canceled' }); emit('trajdone', { tr, status: 'canceled' }); return; }
          if (t >= tr.T) {
            const err = Math.max(...tr.pos[tr.pos.length - 1].map((p, k) => Math.abs(p - act[k])));
            if (err < 0.02 || t > tr.T + goalTime) break;
          }
        }
        if (!cm.alive) return;
        if (sim.traj === tr) sim.traj = null;
        armN.info('Goal reached, success!');
        emit('trajdone', { tr, status: 'succeeded' });
        return { error_code: 0, error_string: '' };
      }
    });
    armN.createSubscription('trajectory_msgs/msg/JointTrajectory', '~/joint_trajectory', m => { const e = validate(m); if (e) { armN.error(e); return; } load(m, null); }, 10);

    const GRIP_HOLD = 0.32;
    gripN.createActionServer('control_msgs/action/GripperCommand', '~/gripper_cmd', {
      async execute(gh) {
        const J = K.JOINTS[5];
        const target = clamp(+gh.request.position, J.lower, J.upper);
        const closing = target < sim.q[5];
        if (!closing && sim.cube.held) { sim.cube.held = false; gripN.info('물체를 놓았습니다'); }
        sim.cmd[5] = target;
        sim.grip = { target, closing };
        const t0 = performance.now();
        let stalled = false;
        while (cm.alive && performance.now() - t0 < 3000) {
          await ROS.sleep(40);
          gh.publishFeedback({ position: sim.q[5], reached_goal: false });
          if (gh.isCancelRequested) { sim.cmd[5] = sim.q[5]; gh.canceled({ position: sim.q[5], reached_goal: false }); return; }
          if (sim.cube.held && closing && sim.q[5] <= GRIP_HOLD + 0.01) { stalled = true; gripN.info('물체를 잡았습니다 (stall)'); break; }
          if (Math.abs(sim.q[5] - target) < 0.02) break;
        }
        sim.grip = null;
        return { position: sim.q[5], reached_goal: !stalled };
      }
    });

    /* ---- 하드웨어 루프 (update_rate) */
    const VMAX = [2.2, 2.2, 2.2, 2.8, 3.5, 4.0];
    const DT = 0.02;
    cm.createTimer(DT, () => {
      const now = performance.now() / 1000;
      sim.t += DT;
      const tr = sim.traj;
      if (tr) { const d = tr.f(now - tr.t0); tr.desired = d; tr.idx.forEach((i, k) => { if (!(i === 5 && sim.grip)) sim.cmd[i] = d[k]; }); }
      for (let i = 0; i < 6; i++) {
        const e = sim.cmd[i] - sim.q[i];
        const v = clamp(e * 14, -VMAX[i], VMAX[i]);
        sim.q[i] += v * DT; sim.vel[i] = v;
      }
      const c = sim.cube;
      if (!c.held && sim.grip && sim.grip.closing && sim.q[5] <= GRIP_HOLD + 0.03) { // 집게가 상자에 닿음 → 잡기
        const Tt = K.forward(sim.q).tool, tcp = K.matPos(Tt);
        if (Math.hypot(tcp[0] - c.p[0], tcp[1] - c.p[1], tcp[2] - c.p[2]) < 0.03) { c.held = true; c.off = W3D.xf(W3D.inv(Tt), c.p); }
      }
      if (c.held && sim.q[5] < GRIP_HOLD) { sim.q[5] = GRIP_HOLD; sim.vel[5] = 0; }
      if (c.held && c.off) c.p = W3D.xf(K.forward(sim.q).tool, c.off);
      else if (c.p[2] > c.size / 2 + 1e-4) { c.vz = (c.vz || 0) - 9.8 * DT; c.p[2] = Math.max(c.size / 2, c.p[2] + c.vz * DT); if (c.p[2] <= c.size / 2) c.vz = 0; }
      js.publish({ header: { stamp: ROS.graph.now(), frame_id: '' }, name: JN, position: sim.q.slice(), velocity: sim.vel.slice(), effort: [] });
      emit('tick');
    });
    sim.stop = () => sim.nodes.forEach(n => n.destroy());
    const prev = cm.onDestroy;
    cm.onDestroy = () => { SIMS.delete(sim); sim.nodes.forEach(n => n.destroy()); if (prev) prev(); };
    SIMS.add(sim);
    return sim;
  }
  function findSim() { return [...SIMS].find(s => s.alive()); }

  /* ---------------------------------------------- 팔 화면 */
  const JCOL = ['#3b82f6', '#f97316', '#22c55e', '#ef4444', '#8b5cf6', '#14b8a6'];
  const SIM_URL = 'https://samcho93.github.io/studySOArm101/sim/index.html', COURSE_URL = 'https://samcho93.github.io/studySOArm101/';
  function buildArm(root, o, owner) {
    if (!K || !window.RobotCanvas) { root.innerHTML = '<div class="w-body">⚠ SO101 기구학 스크립트를 불러오지 못했습니다.</div>'; return; }
    let sim = (o.sim && o.sim.alive()) ? o.sim : (findSim() || null);
    let ownSim = false;
    if (!sim) { sim = createArmSim({ owner }); ownSim = true; }
    let mode = ['joint', 'moveit', 'traj'].includes(o.mode) ? o.mode : 'joint';
    root.classList.add('wa-root');
    if (o.inWindow) root.classList.add('wa-inwin');
    root.innerHTML = `
      <div class="w-row wa-bar">
        <div class="w-seg wa-modes"><button data-m="joint">관절 제어</button><button data-m="moveit">MoveIt 계획</button><button data-m="traj">궤적 편집</button></div>
        <label class="small"><input type="checkbox" data-t="tf"> TF 축</label>
        <span class="spacer"></span>
        <a class="btn tiny" href="${SIM_URL}" target="_blank" rel="noopener">🦾 SO-ARM101 3D 시뮬레이터 열기</a>
        <a class="btn tiny ghost" href="${COURSE_URL}" target="_blank" rel="noopener">SO-ARM101 강좌</a>
        ${o.inWindow ? '' : RosUI.popoutBtn('arm', { mode })}
      </div>
      <div class="wa-main">
        <div class="wa-view"><canvas class="wa-cv"></canvas>
          <div class="wa-status"></div>
          <div class="wa-hint">끌어서 회전 · 누른 뒤 휠로 확대</div>
        </div>
        <div class="wa-side"></div>
      </div>
      <div class="wa-log"></div>`;
    const $ = s => root.querySelector(s);
    const cv = $('.wa-cv'), side = $('.wa-side'), logEl = $('.wa-log'), status = $('.wa-status');
    const rc = new RobotCanvas(cv, {});
    const cam = W3D.cam({ yaw: -0.75, el: 0.42, fit: 0.24, target: [0.12, 0, 0.12] });
    let showTF = false;
    $('[data-t=tf]').onchange = e => { showTF = e.target.checked; };
    const logs = [];
    function log(t, cls) { logs.push({ t, cls }); if (logs.length > 6) logs.shift(); logEl.innerHTML = logs.map(l => `<div class="${l.cls || ''}">${esc(l.t)}</div>`).join(''); }
    log(`/controller_manager · /arm_controller · /gripper_controller · /joint_state_broadcaster · /robot_state_publisher ${ownSim ? '노드를 만들었습니다' : '(이미 실행 중인 시뮬레이터에 연결)'}`, 'muted');

    /* ---- 모드별 노드와 액션 클라이언트 */
    let ui = null, uiShared = false, uiName = '', modeCleanup = null;
    const clients = {};
    function dropUi() {
      if (!ui) return;
      if (uiShared) Object.values(clients).forEach(c => { try { c.destroy(); } catch (_) {} }); else ui.destroy();
      ui = null;
    }
    function uiNode(name) {
      dropUi();
      uiName = name;
      // 같은 시뮬레이터의 /move_group 은 하나만: 이미 있으면(런치 · 다른 위젯) 그 노드를 함께 씀
      uiShared = name === 'move_group' && !!(sim.moveGroup && sim.moveGroup.alive);
      ui = uiShared ? sim.moveGroup : ROS.createNode(name, { owner, pkg: name === 'move_group' ? 'moveit_ros_move_group' : 'so_arm101_bringup', exe: name });
      if (name === 'move_group' && !uiShared) sim.moveGroup = ui;
      clients.fjt = ui.createActionClient('control_msgs/action/FollowJointTrajectory', '/arm_controller/follow_joint_trajectory');
      clients.grip = ui.createActionClient('control_msgs/action/GripperCommand', '/gripper_controller/gripper_cmd');
      clients.topic = ui.createPublisher('trajectory_msgs/msg/JointTrajectory', '/arm_controller/joint_trajectory', 10);
      return ui;
    }
    let active = null; // 진행 중인 목표 {g, T, t0, label}
    const ensureUi = () => { if (!ui || !ui.alive || (uiShared && !sim.moveGroup.alive)) uiNode(uiName); };
    async function sendTraj(names, points, label, onFb) {
      ensureUi();
      if (active && active.g) { try { await active.g.cancel(); } catch (_) {} }
      const T = durSec(points[points.length - 1].time_from_start);
      let g;
      try { g = await clients.fjt.sendGoal({ trajectory: { joint_names: names, points } }, { feedback: fb => { if (onFb) onFb(fb); if (active && active.g === g) active.fb = fb; } }); }
      catch (e) { log('⛔ ' + e.message, 'bad'); return { status: -1 }; }
      if (!g.accepted) { log('⛔ 목표가 거절되었습니다 (/arm_controller 로그 확인)', 'bad'); return { status: -1 }; }
      active = { g, T, t0: performance.now(), label };
      log(`▶ ${label}: FollowJointTrajectory 목표 수락 (${points.length}점, ${T.toFixed(1)} s)`);
      const r = await g.result;
      if (active && active.g === g) active = null;
      const st = r.status === ROS.STATUS.SUCCEEDED ? '성공(SUCCEEDED)' : r.status === ROS.STATUS.CANCELED ? '취소(CANCELED)' : '중단(ABORTED)';
      log(`■ ${label}: 결과 ${st} · error_code ${r.result.error_code}`, r.status === ROS.STATUS.SUCCEEDED ? 'ok' : 'bad');
      return r;
    }
    async function gripper(pos, label) {
      ensureUi();
      try {
        const g = await clients.grip.sendGoal({ position: pos, max_effort: 5.0 });
        const r = await g.result;
        log(`✋ ${label || 'gripper_cmd'}: position ${r.result.position.toFixed(2)} rad · reached_goal ${r.result.reached_goal}`);
        return r;
      } catch (e) { log('⛔ ' + e.message, 'bad'); return null; }
    }
    const pt = (q, t) => ({ positions: q.slice(), time_from_start: secDur(t) });
    function poseGoal(q, T, label) { return sendTraj(JN, [pt(q, T)], label); }

    /* ---- 관절 모드 */
    function modeJoint() {
      uiNode('so101_joint_gui');
      side.innerHTML = `<div class="wa-h">관절 슬라이더 <span class="muted small">→ <code>/arm_controller/joint_trajectory</code></span></div>
        ${K.JOINTS.map((j, i) => `<label class="wa-sl" data-i="${i}"><span><b>${j.name}</b><i>${j.ko}</i></span><input type="range" min="${(j.lower * R2D).toFixed(1)}" max="${(j.upper * R2D).toFixed(1)}" step="0.5" value="${(sim.q[i] * R2D).toFixed(1)}"><b class="w-out"></b></label>`).join('')}
        <div class="wa-h">자세 프리셋 <span class="muted small">→ FollowJointTrajectory 액션 (1.5 s)</span></div>
        <div class="w-btns">${Object.entries(K.POSES).map(([k, p]) => `<button class="btn tiny" data-pose="${k}">${esc(p.ko)}</button>`).join('')}</div>
        <div class="w-btns" style="margin-top:6px"><button class="btn tiny" data-g="open">✋ 그리퍼 열기</button><button class="btn tiny" data-g="close">✊ 그리퍼 닫기</button></div>
        <div class="wa-tcp small"></div>`;
      const held = new Set();
      side.querySelectorAll('.wa-sl').forEach(l => {
        const i = +l.dataset.i, inp = l.querySelector('input');
        let lastSend = 0, pend = null;
        const send = () => { const q = sim.cmd.slice(); q[i] = +inp.value * D2R; clients.topic.publish({ header: { stamp: ROS.graph.now(), frame_id: '' }, joint_names: [JN[i]], points: [pt([q[i]], 0.25)] }); lastSend = performance.now(); };
        inp.addEventListener('pointerdown', () => held.add(i)); inp.addEventListener('pointerup', () => setTimeout(() => held.delete(i), 300));
        inp.addEventListener('focus', () => held.add(i)); inp.addEventListener('blur', () => held.delete(i));
        inp.addEventListener('input', () => { held.add(i); clearTimeout(pend); if (performance.now() - lastSend > 70) send(); else pend = setTimeout(send, 70); });
      });
      side.querySelectorAll('[data-pose]').forEach(b => b.onclick = () => poseGoal(K.POSES[b.dataset.pose].q, 1.5, `자세 '${K.POSES[b.dataset.pose].ko}'`));
      side.querySelector('[data-g=open]').onclick = () => gripper(1.4, '그리퍼 열기');
      side.querySelector('[data-g=close]').onclick = () => gripper(0.0, '그리퍼 닫기');
      let tt = 0;
      const off = sim.on('tick', () => {
        if ((tt++ % 3)) return;
        side.querySelectorAll('.wa-sl').forEach(l => { const i = +l.dataset.i; const inp = l.querySelector('input'); if (!held.has(i)) inp.value = (sim.q[i] * R2D).toFixed(1); l.querySelector('b.w-out').textContent = (sim.q[i] * R2D).toFixed(1) + '°'; });
        const F = K.forward(sim.q), p = K.matPos(F.tool), r = K.matToRpy(F.tool);
        side.querySelector('.wa-tcp').innerHTML = `TCP(gripper_frame_link) = (${(p[0] * 100).toFixed(1)}, ${(p[1] * 100).toFixed(1)}, ${(p[2] * 100).toFixed(1)}) cm · rpy (${r.map(v => (v * R2D).toFixed(0)).join(', ')})°<br><span class="muted">터미널: <code>ros2 topic echo /joint_states</code></span>`;
      });
      return off;
    }

    /* ---- MoveIt-lite */
    const mv = { target: null, plan: null, down: true, busy: false, drag: false };
    function planTo(target, label) {
      const t0 = performance.now();
      const qs = sim.q.slice();
      let r = K.inverse(target, qs, mv.down ? { approach: [0, 0, -1], iterations: 220 } : { iterations: 220 });
      let note = '';
      if (!r.converged && mv.down) { r = K.inverse(target, qs, { iterations: 220 }); note = ' (아래 방향 제약을 풀고 풀었습니다)'; }
      const time = performance.now() - t0;
      if (!r.converged) return { ok: false, time, why: `IK 해가 없습니다 — 도달할 수 없는 위치입니다 (오차 ${(r.error * 1000).toFixed(0)} mm)` };
      const qg = r.q.slice(); qg[5] = qs[5];
      const dmax = Math.max(...qg.slice(0, 5).map((v, i) => Math.abs(v - qs[i])));
      const T = Math.max(1.0, dmax / 0.9 * 1.4);
      const N = 20, pts = [];
      for (let i = 0; i <= N; i++) { const s = i / N, sm = s * s * s * (10 - 15 * s + 6 * s * s); pts.push({ q: qs.map((v, k) => v + (qg[k] - v) * sm), t: s * T }); }
      for (let i = 0; i < pts.length; i++) {
        const F = K.forward(pts[i].q);
        const low = K.LINK_ORDER.slice(2).concat(['gripper_frame_link']).find(l => K.matPos(F.links[l])[2] < -0.003);
        if (low) return { ok: false, time: performance.now() - t0, why: `충돌: waypoint ${i} 에서 ${low} 가 바닥(z<0) 아래로 내려갑니다` };
      }
      return { ok: true, q: qg, qs, pts, T, time: performance.now() - t0, err: r.error, note, label, target: target.slice(), tcp: pts.map(p => K.matPos(K.forward(p.q).tool)), shown: performance.now() };
    }
    async function execPlan(pl) {
      if (!pl || !pl.ok) return null;
      mv.plan = pl;
      return sendTraj(JN, pl.pts.slice(1).map(p => pt(p.q, p.t)), pl.label || 'MoveIt 실행');
    }
    function showPlan(pl) {
      const box = side.querySelector('.wa-plan');
      if (!box) return;
      if (!pl) { box.innerHTML = '<span class="muted">아직 계획이 없습니다. 목표를 정하고 <b>계획</b>을 눌러 보세요.</span>'; return; }
      if (!pl.ok) { box.innerHTML = `<div class="bad">⛔ 계획 실패 (${pl.time.toFixed(1)} ms)</div><div class="small">${esc(pl.why)}</div>`; return; }
      box.innerHTML = `<div class="ok">✅ 계획 성공${esc(pl.note)} — planning time <b>${pl.time.toFixed(1)} ms</b> · IK 오차 ${(pl.err * 1000).toFixed(2)} mm · waypoint ${pl.pts.length}개 · 예상 ${pl.T.toFixed(2)} s</div>
        <table class="tbl wa-dtbl"><thead><tr><th>관절</th><th>현재</th><th>목표</th><th>Δ</th></tr></thead><tbody>${JN.slice(0, 5).map((n, i) => `<tr><td>${n}</td><td>${(pl.qs[i] * R2D).toFixed(1)}°</td><td>${(pl.q[i] * R2D).toFixed(1)}°</td><td><b>${((pl.q[i] - pl.qs[i]) * R2D).toFixed(1)}°</b></td></tr>`).join('')}</tbody></table>`;
    }
    function modeMoveit() {
      uiNode('move_group');
      ui.declareParameter('planning_group', 'arm'); ui.declareParameter('planner_id', 'RRTConnect (여기서는 관절 공간 보간 + IK)');
      if (!mv.target) { const p = K.matPos(K.forward(sim.q).tool); mv.target = [0.22, 0.05, 0.08]; if (p[2] > 0.02) mv.target = [+(p[0]).toFixed(3), +(p[1]).toFixed(3), +(p[2]).toFixed(3)]; }
      side.innerHTML = `<div class="wa-h">목표 위치 (planning group: <code>arm</code>) <span class="muted small">— 초록 공을 끌거나 숫자 입력</span></div>
        <div class="w-row wa-xyz">${['x', 'y', 'z'].map((a, k) => `<label>${a} <input class="w-in" type="number" step="0.5" data-k="${k}" value="${(mv.target[k] * 100).toFixed(1)}"> cm</label>`).join('')}</div>
        <div class="w-row"><label class="small"><input type="checkbox" data-a="down" ${mv.down ? 'checked' : ''}> 그리퍼를 아래로 향하게</label><button class="btn tiny ghost" data-a="here">현재 TCP 로</button></div>
        <div class="w-btns"><button class="btn small" data-a="plan">🧭 계획(Plan)</button><button class="btn small primary" data-a="exec">▶ 실행(Execute)</button><button class="btn small" data-a="pe">계획 + 실행</button></div>
        <div class="wa-plan small"></div>
        <div class="wa-h">집어서 옮기기 데모</div>
        <div class="w-btns"><button class="btn small" data-a="pick">📦 Pick &amp; Place</button><button class="btn tiny ghost" data-a="cube">상자 제자리</button></div>
        <div class="w-help">흐름: <b>move_group</b> 이 IK 로 목표 관절값을 구하고(계획) → 궤적을 <code>/arm_controller/follow_joint_trajectory</code> 액션으로 보냅니다(실행). 충돌 검사는 바닥(z&lt;0)만 합니다.</div>`;
      const inputs = side.querySelectorAll('.wa-xyz input');
      inputs.forEach(inp => inp.addEventListener('input', () => { const v = +inp.value; if (Number.isFinite(v)) { mv.target[+inp.dataset.k] = v / 100; mv.plan = null; showPlan(null); } }));
      mv.syncInputs = () => inputs.forEach(inp => { if (document.activeElement !== inp) inp.value = (mv.target[+inp.dataset.k] * 100).toFixed(1); });
      side.querySelector('[data-a=down]').onchange = e => { mv.down = e.target.checked; };
      side.querySelector('[data-a=here]').onclick = () => { mv.target = K.matPos(K.forward(sim.q).tool); mv.syncInputs(); };
      side.querySelector('[data-a=plan]').onclick = () => { mv.plan = planTo(mv.target, 'MoveIt 실행'); showPlan(mv.plan); if (mv.plan.ok) ui.info(`Motion plan was computed successfully. (${mv.plan.time.toFixed(1)} ms)`); else ui.warn('Unable to solve the planning problem'); };
      side.querySelector('[data-a=exec]').onclick = () => { if (!mv.plan || !mv.plan.ok) { log('먼저 계획(Plan)을 성공시켜 주세요', 'bad'); return; } const p = mv.plan; if (Math.max(...p.qs.map((v, i) => Math.abs(v - sim.q[i]))) > 0.05) { log('로봇이 계획 시작 자세에서 벗어나 다시 계획합니다'); mv.plan = planTo(mv.target, 'MoveIt 실행'); showPlan(mv.plan); } execPlan(mv.plan).then(() => { mv.plan = null; showPlan(null); }); };
      side.querySelector('[data-a=pe]').onclick = () => { mv.plan = planTo(mv.target, 'MoveIt 실행'); showPlan(mv.plan); if (mv.plan.ok) execPlan(mv.plan).then(() => { mv.plan = null; showPlan(null); }); };
      side.querySelector('[data-a=pick]').onclick = pickPlace;
      side.querySelector('[data-a=cube]').onclick = () => { if (!sim.cube.held) { sim.cube.p = [0.20, 0.08, 0.0125]; } };
      showPlan(mv.plan);
      return () => {};
    }
    async function pickPlace() {
      if (mv.busy) return;
      mv.busy = true;
      const btn = side.querySelector('[data-a=pick]'); if (btn) btn.disabled = true;
      try {
        const c = sim.cube.p.slice();
        const A = [0.20, 0.08], B = [0.18, -0.10];
        const dst = Math.hypot(c[0] - A[0], c[1] - A[1]) < 0.03 ? B : A;
        const step = async (xyz, label) => { mv.target = xyz; mv.syncInputs && mv.syncInputs(); const pl = planTo(xyz, label); showPlan(pl); if (!pl.ok) { log('⛔ ' + label + ': ' + pl.why, 'bad'); throw new Error('plan'); } const r = await execPlan(pl); if (!r || r.status !== ROS.STATUS.SUCCEEDED) throw new Error('exec'); };
        log('📦 Pick & Place 시작: 열기 → 접근 → 내려가기 → 잡기 → 들기 → 옮기기 → 놓기');
        await gripper(1.3, '그리퍼 열기');
        await step([c[0], c[1], 0.09], '① 상자 위로 접근');
        await step([c[0], c[1], 0.016], '② 내려가기');
        await gripper(0.0, '③ 잡기');
        await step([c[0], c[1], 0.10], '④ 들어 올리기');
        await step([dst[0], dst[1], 0.10], '⑤ 옮기기');
        await step([dst[0], dst[1], 0.02], '⑥ 내려놓기');
        await gripper(1.3, '⑦ 놓기');
        await step([dst[0], dst[1], 0.10], '⑧ 빠지기');
        await poseGoal(K.POSES.home.q, 1.5, '⑨ 홈 자세');
        log('✅ Pick & Place 완료', 'ok');
      } catch (e) { if (e.message !== 'plan' && e.message !== 'exec') log('⛔ ' + e.message, 'bad'); else log('Pick & Place 를 멈췄습니다', 'bad'); }
      mv.busy = false; if (btn && btn.isConnected) btn.disabled = false;
    }

    /* ---- 궤적 편집 */
    const tj = { rows: null, rec: null };
    function exampleRows() {
      const d = q => q.map(v => +(v * R2D).toFixed(1));
      return [{ q: d(K.POSES.home.q), t: 2 }, { q: d(K.POSES.ready.q), t: 4 }, { q: d(K.POSES.pick.q), t: 6 }, { q: d(K.POSES.extended.q), t: 8 }, { q: d(K.POSES.rest.q), t: 10 }];
    }
    function goalFromRows() {
      return { joint_names: JN, points: tj.rows.map(r => ({ positions: r.q.map(v => +(v * D2R).toFixed(4)), time_from_start: secDur(+r.t) })) };
    }
    function cmdText() {
      const g = goalFromRows();
      const pts = g.points.map(p => `{positions: [${p.positions.join(', ')}], time_from_start: {sec: ${p.time_from_start.sec}${p.time_from_start.nanosec ? ', nanosec: ' + p.time_from_start.nanosec : ''}}}`).join(', ');
      return `ros2 action send_goal /arm_controller/follow_joint_trajectory control_msgs/action/FollowJointTrajectory "{trajectory: {joint_names: [${JN.join(', ')}], points: [${pts}]}}" --feedback`;
    }
    function modeTraj() {
      uiNode('trajectory_editor');
      if (!tj.rows) tj.rows = exampleRows();
      side.innerHTML = `<div class="wa-h">웨이포인트 (각도 °, 시간 s) <span class="muted small">→ JointTrajectory</span></div>
        <div class="wa-tw"><table class="tbl wa-ttbl"><thead><tr><th>#</th>${JN.map((n, i) => `<th title="${n}" style="color:${JCOL[i]}">${n.replace('shoulder_', 'sh_').replace('wrist_', 'wr_').replace('elbow_', 'el_')}</th>`).join('')}<th>t</th><th></th></tr></thead><tbody></tbody></table></div>
        <div class="w-btns"><button class="btn tiny" data-a="add">＋ 현재 자세 추가</button><button class="btn tiny ghost" data-a="ex">예제</button><button class="btn tiny ghost" data-a="clr">비우기</button><span class="spacer"></span><button class="btn small primary" data-a="send">▶ 목표 보내기</button><button class="btn small" data-a="cancel">■ 취소</button></div>
        <canvas class="wa-plot"></canvas>
        <details class="wa-cmd"><summary>터미널 명령으로 보기</summary><pre class="wa-pre"></pre></details>`;
      const tb = side.querySelector('tbody');
      function renderRows() {
        tb.innerHTML = tj.rows.map((r, i) => `<tr data-r="${i}"><td>${i + 1}</td>${r.q.map((v, k) => `<td><input class="w-in wa-num" type="number" step="1" data-k="${k}" value="${v}"></td>`).join('')}<td><input class="w-in wa-num" type="number" step="0.5" min="0" data-k="t" value="${r.t}"></td><td><button class="btn tiny ghost" data-del="${i}" title="삭제">✕</button></td></tr>`).join('') || `<tr><td colspan="9" class="muted">웨이포인트가 없습니다</td></tr>`;
        tb.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const r = tj.rows[+inp.closest('tr').dataset.r]; const v = +inp.value; if (!Number.isFinite(v)) return; if (inp.dataset.k === 't') r.t = v; else r.q[+inp.dataset.k] = v; side.querySelector('.wa-pre').textContent = cmdText(); }));
        tb.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { tj.rows.splice(+b.dataset.del, 1); renderRows(); });
        side.querySelector('.wa-pre').textContent = cmdText();
      }
      renderRows();
      side.querySelector('[data-a=add]').onclick = () => { const last = tj.rows.length ? +tj.rows[tj.rows.length - 1].t : 0; tj.rows.push({ q: sim.q.map(v => +(v * R2D).toFixed(1)), t: last + 2 }); renderRows(); };
      side.querySelector('[data-a=ex]').onclick = () => { tj.rows = exampleRows(); renderRows(); };
      side.querySelector('[data-a=clr]').onclick = () => { tj.rows = []; renderRows(); };
      side.querySelector('[data-a=cancel]').onclick = () => { if (active && active.g) active.g.cancel(); };
      side.querySelector('[data-a=send]').onclick = () => {
        if (!tj.rows.length) { log('웨이포인트를 하나 이상 넣어 주세요', 'bad'); return; }
        const g = goalFromRows();
        tj.rec = { t0: performance.now(), samples: [], wp: g.points.map(p => ({ t: durSec(p.time_from_start), q: p.positions })), T: durSec(g.points[g.points.length - 1].time_from_start), on: true };
        sendTraj(g.joint_names, g.points, '궤적 편집기').then(() => { if (tj.rec) tj.rec.on = false; });
      };
      const off = sim.on('tick', () => { const r = tj.rec; if (r && r.on) { r.samples.push({ t: (performance.now() - r.t0) / 1000, q: sim.q.slice() }); if (r.samples.length > 3000) r.samples.shift(); } });
      return off;
    }
    function drawPlot() {
      const pc = side.querySelector('.wa-plot'); if (!pc) return;
      const { w, h, ctx } = RosUI.fitCanvas(pc);
      const C = RosUI.colors();
      ctx.clearRect(0, 0, w, h);
      const L = 34, R = 8, T = 8, B = 18;
      const r = tj.rec;
      const Tmax = Math.max(2, r ? Math.max(r.T + 1, r.samples.length ? r.samples[r.samples.length - 1].t : 0) : (tj.rows.length ? +tj.rows[tj.rows.length - 1].t + 1 : 4));
      const X = t => L + (w - L - R) * t / Tmax, Y = v => T + (h - T - B) * (1 - (v + 120) / 240);
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = '10px sans-serif';
      [-90, 0, 90].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(v + '°', 4, Y(v) + 3); });
      for (let s = 0; s <= Tmax; s += Tmax > 12 ? 4 : 2) { ctx.fillText(s + 's', X(s) - 6, h - 4); }
      if (!r) { ctx.fillText('▶ 목표 보내기를 누르면 관절 위치를 시간에 따라 그립니다', L + 6, T + 14); return; }
      for (let k = 0; k < 6; k++) {
        ctx.strokeStyle = JCOL[k]; ctx.lineWidth = 1.8; ctx.beginPath();
        r.samples.forEach((s, i) => { const x = X(s.t), y = Y(s.q[k] * R2D); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
        ctx.fillStyle = JCOL[k];
        r.wp.forEach(p => { ctx.beginPath(); ctx.arc(X(p.t), Y(p.q[k] * R2D), 3, 0, Math.PI * 2); ctx.fill(); });
      }
      if (r.on && r.samples.length) { const x = X(r.samples[r.samples.length - 1].t); ctx.strokeStyle = C.fg; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, h - B); ctx.stroke(); ctx.setLineDash([]); }
    }

    function setMode(m) {
      mode = m;
      if (modeCleanup) { try { modeCleanup(); } catch (_) {} modeCleanup = null; }
      root.querySelectorAll('.wa-modes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      const pb = root.querySelector('[data-popout]'); if (pb) pb.dataset.popopts = JSON.stringify({ mode: m });
      modeCleanup = m === 'joint' ? modeJoint() : m === 'moveit' ? modeMoveit() : modeTraj();
      root.classList.toggle('wa-m-traj', m === 'traj');
    }
    root.querySelectorAll('.wa-modes button').forEach(b => b.onclick = () => setMode(b.dataset.m));
    setMode(mode);

    /* ---- 캔버스 조작: 궤도 + 목표 공 끌기 */
    let PJ = null;
    const offOrbit = W3D.orbit(cv, cam, {
      down(x, y) {
        if (mode !== 'moveit' || !mv.target || !PJ) return false;
        const p = PJ(mv.target);
        if (Math.hypot(p.x - x, p.y - y) < 16) { mv.drag = true; return true; }
        return false;
      },
      move(x, y, dx, dy) {
        const d = W3D.screenToWorld(cam, dx, dy);
        mv.target = [clamp(mv.target[0] + d[0], -0.45, 0.45), clamp(mv.target[1] + d[1], -0.45, 0.45), clamp(mv.target[2] + d[2], 0.0, 0.45)];
        mv.plan = null; showPlan(null); mv.syncInputs && mv.syncInputs();
      },
      up() { mv.drag = false; },
      hover(x, y) { if (mode === 'moveit' && mv.target && PJ) { const p = PJ(mv.target); cv.style.cursor = Math.hypot(p.x - x, p.y - y) < 16 ? 'grab' : ''; } }
    });

    let plotT = 0;
    const stop = RosUI.loop(root, (dt) => {
      if (!sim.alive()) {
        if (o.sim) { status.textContent = '시뮬레이터가 종료되었습니다'; return; }
        sim = createArmSim({ owner }); ownSim = true; setMode(mode);
      }
      const r = cv.getBoundingClientRect();
      if (Math.round(r.width) !== rc.w || Math.round(r.height) !== rc.h) rc.resize();
      const C = RosUI.colors();
      cam.w = rc.w; cam.h = rc.h;
      const P = W3D.projector(cam); PJ = P;
      rc.project = P;
      rc.palette.grid = C.line;
      rc.palette.ghost = C.dark ? 'rgba(120,200,255,0.28)' : 'rgba(40,120,220,0.22)';
      rc.palette.edge = C.dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)';
      const ctx = rc.ctx;
      rc.clear();
      rc.drawGrid(0.3, 0.05);
      // 원점 축
      W3D.axes(ctx, P, W3D.I(), 0.05, C, { label: 'base_link', thin: true, alpha: 0.8 });
      // 상자
      const cube = sim.cube, cf = [];
      if (mode === 'moveit' || cube.held || Math.hypot(cube.p[0] - 0.2, cube.p[1] - 0.08) > 0.01) {
        let G = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, cube.p[0], cube.p[1], cube.p[2], 1];
        if (cube.held) { const Tt = K.forward(sim.q).tool; G = Tt.slice(); const p = cube.p; G[12] = p[0]; G[13] = p[1]; G[14] = p[2]; }
        W3D.box(G, [cube.size, cube.size, cube.size], [220, 60, 60, 1], cf);
        const sh = P([cube.p[0], cube.p[1], 0]);
        ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 10, 5, 0, 0, Math.PI * 2); ctx.fill();
        W3D.drawFaces(ctx, P, cf, { edge: 'rgba(0,0,0,.3)' });
      }
      // 계획 미리보기 (고스트 + TCP 경로)
      if (mode === 'moveit' && mv.plan && mv.plan.ok) {
        const pl = mv.plan;
        ctx.save(); ctx.strokeStyle = C.teal; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath();
        pl.tcp.forEach((p, i) => { const s = P(p); if (i) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); }); ctx.stroke(); ctx.restore();
        const ph = ((performance.now() - pl.shown) / 1000) % (pl.T + 0.8);
        const s = Math.min(1, ph / pl.T);
        const k = Math.min(pl.pts.length - 1, Math.floor(s * (pl.pts.length - 1)));
        const a = pl.pts[k], b = pl.pts[Math.min(pl.pts.length - 1, k + 1)], u = s * (pl.pts.length - 1) - k;
        rc.drawRobot(a.q.map((v, i) => v + (b.q[i] - v) * u), { ghost: true, alpha: 0.9 });
      }
      if (mode === 'traj' && tj.rows && tj.rows.length) {
        ctx.save(); ctx.fillStyle = C.purple; ctx.strokeStyle = C.purple; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath();
        tj.rows.forEach((row, i) => { const p = P(K.matPos(K.forward(row.q.map(v => v * D2R)).tool)); if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y); }); ctx.stroke(); ctx.setLineDash([]);
        tj.rows.forEach((row, i) => { const p = P(K.matPos(K.forward(row.q.map(v => v * D2R)).tool)); ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill(); W3D.label(ctx, p.x + 6, p.y - 5, String(i + 1), C, { color: C.purple }); });
        ctx.restore();
      }
      const fk = rc.drawRobot(sim.q);
      rc.drawTool(fk, C.green);
      if (showTF) Object.entries(fk.links).forEach(([n, M]) => W3D.axes(ctx, P, M, 0.035, C, { label: n.replace('_so101_v1', ''), thin: true }));
      // 목표 공 (interactive marker)
      if (mode === 'moveit' && mv.target) {
        const t = mv.target, s = P(t), g = P([t[0], t[1], 0]);
        ctx.save(); ctx.strokeStyle = C.green; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(g.x, g.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.beginPath(); ctx.ellipse(g.x, g.y, 8, 4, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = mv.drag ? 0.95 : 0.75; ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1; ctx.strokeStyle = C.card; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        W3D.axes(ctx, P, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, t[0], t[1], t[2], 1], 0.03, C, { thin: true });
        W3D.label(ctx, s.x + 12, s.y - 10, `목표 (${(t[0] * 100).toFixed(0)}, ${(t[1] * 100).toFixed(0)}, ${(t[2] * 100).toFixed(0)}) cm`, C, { color: C.green });
      }
      // 상태 표시
      if (active) { const el = (performance.now() - active.t0) / 1000; status.innerHTML = `<b>/arm_controller</b> 실행 중 · ${esc(active.label)} · ${Math.min(el, active.T).toFixed(1)} / ${active.T.toFixed(1)} s`; status.className = 'wa-status on'; }
      else { status.innerHTML = `<b>/arm_controller</b> 대기 중 (active)`; status.className = 'wa-status'; }
      if (mode === 'traj' && (plotT += dt) > 0.05) { plotT = 0; drawPlot(); }
    });
    return () => { stop(); offOrbit(); if (modeCleanup) modeCleanup(); dropUi(); if (ownSim && !o.sim) sim.stop(); };
  }

  /* ================================================== ros2_control 개념: 한 관절 + PID */
  const CTRL = {
    position: { ko: '위치', unit: 'rad', tr: [-3.1, 3.1, 0.01], t0: 1.0, g: { p: [0, 40, 0.1, 8], i: [0, 20, 0.1, 2], d: [0, 3, 0.01, 0.6] }, type: 'effort_controllers/JointGroupPositionController (PID)' },
    velocity: { ko: '속도', unit: 'rad/s', tr: [-10, 10, 0.1], t0: 3.0, g: { p: [0, 3, 0.01, 0.5], i: [0, 10, 0.05, 2], d: [0, 0.2, 0.002, 0] }, type: 'velocity PID → effort' },
    effort: { ko: '힘(토크)', unit: 'N·m', tr: [-2, 2, 0.01], t0: 0.3, g: null, type: 'forward_command_controller (그대로 전달)' }
  };
  function buildCtrl(root, o, owner) {
    let mode = CTRL[o.ctrl] ? o.ctrl : (CTRL[o.mode] ? o.mode : 'position');
    const S = { th: 0, w: 0, u: 0, I: 0, eP: 0, r: CTRL[mode].t0, gains: {}, grav: o.gravity === 'true' || o.gravity === '1', J: 0.02, b: 0.05, fc: 0.08, mgl: 0.6, tmax: 2.0, kick: 0, hist: [], t: 0, lastCmdFrom: '' };
    Object.keys(CTRL).forEach(m => { if (CTRL[m].g) S.gains[m] = { p: CTRL[m].g.p[3], i: CTRL[m].g.i[3], d: CTRL[m].g.d[3] }; });
    root.classList.add('wa-root', 'wc2-root');
    if (o.inWindow) root.classList.add('wa-inwin');
    root.innerHTML = `
      <div class="w-row wa-bar">
        <div class="w-seg wa-cmodes">${Object.entries(CTRL).map(([k, c]) => `<button data-m="${k}">${c.ko} 제어</button>`).join('')}</div>
        <label class="small"><input type="checkbox" data-a="grav" ${S.grav ? 'checked' : ''}> 중력</label>
        <button class="btn tiny" data-a="step">⎍ 스텝</button><button class="btn tiny" data-a="kick">💥 외란</button><button class="btn tiny ghost" data-a="reset">↺ 리셋</button>
        <span class="spacer"></span>${o.inWindow ? '' : RosUI.popoutBtn('ctrl', { ctrl: mode })}
      </div>
      <div class="wa-cmain">
        <canvas class="wa-joint"></canvas>
        <div class="wa-cplot"><canvas class="wa-plot2"></canvas><div class="wa-plegend small"><span class="lg-r">— 목표 r</span><span class="lg-y">— 실제</span><span class="lg-u">— 명령 u (N·m)</span></div></div>
      </div>
      <div class="wa-csl"></div>
      <div class="wa-flow"></div>`;
    const $ = s => root.querySelector(s);
    let nodes = {};
    function makeNodes() {
      Object.values(nodes).forEach(n => n && n.destroy());
      const cm = ROS.createNode('controller_manager', { owner, pkg: 'controller_manager', exe: 'ros2_control_node' });
      cm.declareParameter('update_rate', 100, { description: '제어 루프 주기 (Hz)', type: 'integer', read_only: true });
      const cn = ROS.createNode(`forward_${mode}_controller`, { owner, pkg: 'forward_command_controller', exe: 'forward_command_controller' });
      cn.declareParameter('joints', ['joint1'], { read_only: true });
      cn.declareParameter('interface_name', mode === 'position' ? 'position' : mode, { read_only: true });
      if (CTRL[mode].g) ['p', 'i', 'd'].forEach(k => cn.declareParameter(`gains.joint1.${k}`, S.gains[mode][k], { description: `PID ${k.toUpperCase()} 이득` }));
      cn.onSetParameters(list => { for (const p of list) if (/^gains\./.test(p.name) && !(+p.value >= 0)) return { successful: false, reason: '이득은 0 이상이어야 합니다' }; return { successful: true }; });
      cn.createSubscription('std_msgs/msg/Float64MultiArray', '~/commands', m => {
        if (!(m.data || []).length) { cn.warn('commands 의 data 가 비어 있습니다'); return; }
        if (m.data.length !== 1) cn.warn(`Size of input data (${m.data.length}) is not equal to number of joints (1)`);
        const r = CTRL[mode].tr; S.r = clamp(+m.data[0], r[0], r[1]); syncSl(); S.lastCmdFrom = 'topic';
      }, 10);
      const jsb = ROS.createNode('joint_state_broadcaster', { owner, pkg: 'joint_state_broadcaster', exe: 'joint_state_broadcaster' });
      const js = jsb.createPublisher('sensor_msgs/msg/JointState', '/joint_states', 10);
      nodes = { cm, cn, jsb };
      cm.info(`Loading controller 'forward_${mode}_controller'`); cm.info(`Configured and activated forward_${mode}_controller`);
      let k = 0;
      cm.createTimer(0.01, () => {
        update(0.01);
        if (++k % 2 === 0) js.publish({ header: { stamp: ROS.graph.now(), frame_id: '' }, name: ['joint1'], position: [S.th], velocity: [S.w], effort: [S.u] });
      });
    }
    const offP = ROS.on('param', (n, name, v) => { const m = /^gains\.joint1\.([pid])$/.exec(name); if (nodes.cn && n === nodes.cn && m) { S.gains[mode][m[1]] = +v; syncSl(); } });
    function update(dt) {
      // 제어기 (100 Hz)
      const g = S.gains[mode];
      if (mode === 'position') {
        const e = S.r - S.th;
        S.I = clamp(S.I + e * dt, -3, 3);
        S.u = g.p * e + g.i * S.I - g.d * S.w; S.eP = e;
      } else if (mode === 'velocity') {
        const e = S.r - S.w;
        S.I = clamp(S.I + e * dt, -5, 5);
        S.u = g.p * e + g.i * S.I + g.d * (e - S.eP) / dt; S.eP = e;
      } else { S.u = S.r; S.eP = 0; }
      S.u = clamp(S.u, -S.tmax, S.tmax);
      // 물리 (1 ms 부분 단계)
      for (let i = 0; i < 10; i++) {
        const h = dt / 10;
        const fr = S.b * S.w + S.fc * Math.tanh(S.w / 0.02);
        const gr = S.grav ? S.mgl * Math.sin(S.th) : 0;
        const kick = S.kick > 0 ? 1.2 : 0;
        const a = (S.u - fr - gr + kick) / S.J;
        S.w += a * h; S.th += S.w * h;
        if (S.kick > 0) S.kick -= h;
      }
      S.t += dt;
      S.hist.push({ t: S.t, r: S.r, y: mode === 'velocity' ? S.w : S.th, u: S.u }); if (S.hist.length > 900) S.hist.shift();
    }
    function slidersHtml() {
      const c = CTRL[mode];
      let s = `<label class="wa-sl2"><span>목표 r <i>(${c.unit})</i></span><input type="range" data-k="r" min="${c.tr[0]}" max="${c.tr[1]}" step="${c.tr[2]}" value="${S.r}"><b class="w-out"></b></label>`;
      if (c.g) ['p', 'i', 'd'].forEach(k => { const gg = c.g[k]; s += `<label class="wa-sl2"><span>K${k} <i>gains.joint1.${k}</i></span><input type="range" data-k="${k}" min="${gg[0]}" max="${gg[1]}" step="${gg[2]}" value="${S.gains[mode][k]}"><b class="w-out"></b></label>`; });
      else s += '<div class="muted small wa-sl2">힘 제어: 제어기가 없이 명령 토크를 그대로 모터에 줍니다. 마찰 · 중력 때문에 원하는 위치에 멈추지 않는 것을 보세요.</div>';
      return s;
    }
    function buildSl() {
      const box = $('.wa-csl');
      box.innerHTML = slidersHtml();
      box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => {
        const k = inp.dataset.k, v = +inp.value;
        if (k === 'r') { S.r = v; S.lastCmdFrom = 'slider'; }
        else { S.gains[mode][k] = v; if (nodes.cn) nodes.cn.setParameters([{ name: `gains.joint1.${k}`, value: v }]); }
        syncSl(true);
      }));
      syncSl();
    }
    function syncSl(noInput) {
      $('.wa-csl').querySelectorAll('label').forEach(l => {
        const inp = l.querySelector('input'); if (!inp) return; const k = inp.dataset.k;
        const v = k === 'r' ? S.r : S.gains[mode][k];
        if (!noInput && document.activeElement !== inp) inp.value = v;
        l.querySelector('b').textContent = (+v).toFixed(k === 'r' ? 2 : (k === 'd' ? 3 : 2));
      });
    }
    function setMode(m) {
      mode = m; S.I = 0; S.eP = 0; S.r = CTRL[m].t0; S.hist = [];
      root.querySelectorAll('.wa-cmodes button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      const pb = root.querySelector('[data-popout]'); if (pb) pb.dataset.popopts = JSON.stringify({ ctrl: m });
      const prev = nodes.cn ? nodes.cn.name : null;
      makeNodes();
      if (prev && prev !== nodes.cn.name) nodes.cm.info(`Switching controllers: deactivate [${prev}] → activate [${nodes.cn.name}]`);
      buildSl();
    }
    root.querySelectorAll('.wa-cmodes button').forEach(b => b.onclick = () => setMode(b.dataset.m));
    $('[data-a=grav]').onchange = e => { S.grav = e.target.checked; };
    $('[data-a=step]').onclick = () => { S.r = Math.abs(S.r) > 1e-3 ? 0 : CTRL[mode].t0; syncSl(); };
    $('[data-a=kick]').onclick = () => { S.kick = 0.12; };
    $('[data-a=reset]').onclick = () => { S.th = 0; S.w = 0; S.I = 0; S.hist = []; };
    setMode(mode);

    const flow = $('.wa-flow');
    let ft = 0;
    function drawFlow() {
      const c = CTRL[mode], topic = `/forward_${mode}_controller/commands`;
      const law = mode === 'position' ? `u = Kp·e + Ki·∫e − Kd·ω<br>e = r − θ = <b>${(S.r - S.th).toFixed(3)}</b>` : mode === 'velocity' ? `u = Kp·e + Ki·∫e + Kd·ė<br>e = r − ω = <b>${(S.r - S.w).toFixed(3)}</b>` : 'u = r (그대로 전달)';
      flow.innerHTML = `
        <div class="wa-fb src"><div class="wa-ft">① 명령 토픽</div><code>${topic}</code><div>std_msgs/Float64MultiArray</div><div>data: [<b>${S.r.toFixed(2)}</b>] ${c.unit}</div></div>
        <div class="wa-fa">→</div>
        <div class="wa-fb cm"><div class="wa-ft">② controller_manager <span class="muted">update_rate 100 Hz</span></div>
          <div class="wa-rw"><span>read()</span><span>update()</span><span>write()</span></div>
          <div class="wa-fb ctl"><div class="wa-ft">forward_${mode}_controller</div><div class="small muted">${esc(c.type)}</div><div class="small">${law}</div></div></div>
        <div class="wa-fa">→</div>
        <div class="wa-fb hw"><div class="wa-ft">③ hardware_interface <span class="muted">(SimSystem)</span></div>
          <div class="wa-if cmd">command: <code>joint1/effort</code> = <b>${S.u.toFixed(3)}</b> N·m${Math.abs(S.u) >= S.tmax - 1e-6 ? ' <span class="bad">(포화)</span>' : ''}</div>
          <div class="wa-if st">state: <code>joint1/position</code> = <b>${S.th.toFixed(3)}</b> rad</div>
          <div class="wa-if st">state: <code>joint1/velocity</code> = <b>${S.w.toFixed(3)}</b> rad/s</div></div>
        <div class="wa-fa">→</div>
        <div class="wa-fb mot"><div class="wa-ft">④ 모터 + 부하</div><div class="small">J·α = u − b·ω − 마찰${S.grav ? ' − mgl·sinθ' : ''}</div><div class="small muted">J=${S.J} · b=${S.b} · τmax=${S.tmax}</div></div>
        <div class="wa-fback small">↩ state interface → <code>joint_state_broadcaster</code> → <code>/joint_states</code> · 터미널: <code>ros2 topic pub --once ${topic} std_msgs/msg/Float64MultiArray "{data: [${(-S.r || 0.5).toFixed(1)}]}"</code></div>`;
    }
    const jc = $('.wa-joint'), pc = $('.wa-plot2');
    const stop = RosUI.loop(root, dt => {
      if ((ft += dt) > 0.12) { ft = 0; drawFlow(); }
      const C = RosUI.colors();
      // 관절 그림
      let { w, h, ctx } = RosUI.fitCanvas(jc);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2 - (S.grav ? -4 : 0), R = Math.min(w, h) * 0.36;
      const ang = th => Math.PI / 2 - th; // θ=0 → 아래
      const pt = (th, r) => [cx + Math.cos(ang(th)) * r, cy + Math.sin(ang(th)) * r];
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
      if (mode === 'position') { const [tx, ty] = pt(S.r, R); ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore(); ctx.fillStyle = C.red; ctx.font = '11px sans-serif'; ctx.fillText('목표', tx + 4, ty); }
      const [lx, ly] = pt(S.th, R);
      ctx.strokeStyle = C.blue; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(lx, ly); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = C.blue; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gray; ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.card; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); const [ix, iy] = pt(S.th, 12); ctx.lineTo(ix, iy); ctx.stroke();
      if (Math.abs(S.u) > 0.01) { ctx.strokeStyle = C.orange; ctx.fillStyle = C.orange; ctx.lineWidth = 3; const a0 = ang(S.th), sgn = S.u > 0 ? -1 : 1, len = Math.min(1.4, Math.abs(S.u) / S.tmax * 1.4 + 0.15); ctx.beginPath(); ctx.arc(cx, cy, 22, a0, a0 + sgn * len, sgn < 0); ctx.stroke(); }
      if (S.grav) { ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.fillText('↓ g', w - 30, 16); }
      ctx.fillStyle = C.fg; ctx.font = '600 12px sans-serif';
      ctx.fillText(`θ = ${S.th.toFixed(2)} rad`, 8, h - 24); ctx.fillText(`ω = ${S.w.toFixed(2)} rad/s`, 8, h - 8);
      // 그래프
      ({ w, h, ctx } = RosUI.fitCanvas(pc));
      ctx.clearRect(0, 0, w, h);
      const L = 36, Rm = 34, T = 8, B = 16, span = 8;
      const hs = S.hist; if (!hs.length) return;
      const tEnd = hs[hs.length - 1].t, t0 = tEnd - span;
      const vals = hs.filter(p => p.t >= t0);
      let lo = Math.min(...vals.map(p => Math.min(p.r, p.y))), hi = Math.max(...vals.map(p => Math.max(p.r, p.y)));
      if (hi - lo < 0.5) { const m = (hi + lo) / 2; lo = m - 0.25; hi = m + 0.25; }
      const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
      const X = t => L + (w - L - Rm) * (t - t0) / span, Y = v => T + (h - T - B) * (1 - (v - lo) / (hi - lo)), YU = u => T + (h - T - B) * (1 - (u + S.tmax) / (2 * S.tmax));
      ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.fillStyle = C.muted; ctx.font = '10px sans-serif';
      [lo + pad, (lo + hi) / 2, hi - pad].forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - Rm, Y(v)); ctx.stroke(); ctx.fillText(v.toFixed(2), 2, Y(v) + 3); });
      ctx.fillStyle = C.orange; [-S.tmax, 0, S.tmax].forEach(u => ctx.fillText(u.toFixed(1), w - Rm + 4, YU(u) + 3));
      const plotLine = (key, col, lw, dash, yf) => { ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lw; if (dash) ctx.setLineDash(dash); ctx.beginPath(); vals.forEach((p, i) => { const x = X(p.t), y = (yf || Y)(p[key]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore(); };
      plotLine('u', C.orange, 1.2, null, YU);
      plotLine('r', C.red, 1.8, [6, 4]);
      plotLine('y', C.blue, 2.2);
      ctx.fillStyle = C.muted; ctx.fillText(`${mode === 'velocity' ? 'ω (rad/s)' : 'θ (rad)'} · 최근 ${span} s`, L + 4, T + 10);
    });
    return () => { stop(); offP(); Object.values(nodes).forEach(n => n && n.destroy()); };
  }

  /* ================================================== 등록 */
  if (window.Widgets) {
    Widgets.register('tftree', (el, o) => buildTfTree(RosUI.frame(el, '🌐', 'TF 놀이터 — 좌표계 나무와 변환'), o || {}, el), { title: 'TF 놀이터' });
    Widgets.register('arm', (el, o) => buildArm(RosUI.frame(el, '🦾', 'SO-ARM101 ROS 2 시뮬레이터'), o || {}, el), { title: 'SO-ARM101 ROS 2 시뮬레이터' });
    Widgets.register('ctrl', (el, o) => buildCtrl(RosUI.frame(el, '🎛', 'ros2_control — 한 관절 PID 제어'), o || {}, el), { title: 'ros2_control 한 관절' });
  }
  if (window.RosUI) {
    RosUI.registerView('tftree_view', (el, o) => buildTfView(el, o || {}), { title: 'view_frames — TF 트리', icon: '🌳', w: 760, h: 520 });
    RosUI.registerView('tftree', (el, o) => buildTfTree(el, o || {}, el), { title: 'TF 놀이터', icon: '🌐', w: 920, h: 600 });
    RosUI.registerView('arm', (el, o) => buildArm(el, o || {}, el), { title: 'SO-ARM101 — ros2_control 시뮬레이터', icon: '🦾', w: 940, h: 620 });
    RosUI.registerView('ctrl', (el, o) => buildCtrl(el, o || {}, el), { title: 'ros2_control — 한 관절', icon: '🎛', w: 860, h: 640 });
  }

  /* ================================================== 패키지 */
  if (window.ROS && ROS.registerPkg && K) {
    const simExe = defMode => ctx => {
      const mode = ctx.args.params.mode || defMode;
      // 페이지에 이미 SO-ARM101 시뮬레이터(arm 위젯)가 있으면 그 컨트롤러 묶음을 함께 씀 (중복 /arm_controller 방지)
      const existing = findSim();
      if (existing) {
        ctx.out('[INFO] [so101_sim]: 이미 실행 중인 /controller_manager 에 연결합니다 (컨트롤러를 새로 만들지 않음)');
        let mg = null;
        if (mode === 'moveit' && !(existing.moveGroup && existing.moveGroup.alive) && !ROS.findNode('/move_group')) { mg = ROS.createNode('move_group', { out: ctx.out, pkg: 'moveit_ros_move_group', exe: 'move_group' }); mg.info('You can start planning now!'); existing.moveGroup = mg; ctx.proc.nodes.push(mg); }
        ctx.openView('arm', { sim: existing, mode }, { title: `SO-ARM101 — ${mode === 'moveit' ? 'MoveIt' : 'ros2_control'} 시뮬레이터` });
        return { nodes: mg ? [mg] : [] };
      }
      const sim = createArmSim({ out: ctx.out });
      ctx.proc.nodes.push(...sim.nodes);
      if (mode === 'moveit') {
        const n = ROS.createNode('move_group', { out: ctx.out, pkg: 'moveit_ros_move_group', exe: 'move_group' });
        n.info('Loading robot model \'so101_new_calib\'...'); n.info('Planning pipelines: ompl'); n.info('You can start planning now!');
        sim.nodes.push(n); ctx.proc.nodes.push(n); sim.moveGroup = n;
      }
      ctx.openView('arm', { sim, mode }, { title: `SO-ARM101 — ${mode === 'moveit' ? 'MoveIt' : 'ros2_control'} 시뮬레이터` });
      return { nodes: sim.nodes.slice(), stop() { sim.stop(); } };
    };
    const SIM_PY = `from launch import LaunchDescription
from launch.substitutions import Command, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    robot_description = Command(['xacro ', PathJoinSubstitution(
        [FindPackageShare('so_arm101_description'), 'urdf', 'so101_new_calib.urdf'])])
    controllers = PathJoinSubstitution(
        [FindPackageShare('so_arm101_bringup'), 'config', 'controllers.yaml'])

    return LaunchDescription([
        Node(package='controller_manager', executable='ros2_control_node',
             parameters=[{'robot_description': robot_description}, controllers]),
        Node(package='robot_state_publisher', executable='robot_state_publisher',
             parameters=[{'robot_description': robot_description}]),
        Node(package='controller_manager', executable='spawner',
             arguments=['joint_state_broadcaster']),
        Node(package='controller_manager', executable='spawner',
             arguments=['arm_controller']),
        Node(package='controller_manager', executable='spawner',
             arguments=['gripper_controller']),
    ])
`;
    const CTRL_YAML = `controller_manager:
  ros__parameters:
    update_rate: 50  # Hz
    joint_state_broadcaster:
      type: joint_state_broadcaster/JointStateBroadcaster
    arm_controller:
      type: joint_trajectory_controller/JointTrajectoryController
    gripper_controller:
      type: position_controllers/GripperActionController

arm_controller:
  ros__parameters:
    joints: [shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll, gripper]
    command_interfaces: [position]
    state_interfaces: [position, velocity]

gripper_controller:
  ros__parameters:
    joint: gripper
`;
    ROS.registerPkg('so_arm101_bringup', {
      desc: 'SO-ARM101 시뮬레이터 (ros2_control + joint_trajectory_controller + MoveIt-lite)',
      exes: { so101_sim: simExe('joint') },
      launch: {
        'sim.launch.py'(ctx) { ctx.out('[INFO] [spawner-3]: Configured and activated joint_state_broadcaster'); const r = ROS.runMany(ctx, [['so_arm101_bringup', 'so101_sim', ['--ros-args', '-p', 'mode:=' + (ctx.largs.mode || 'joint')], 'ros2_control_node']]); ctx.out('[INFO] [spawner-4]: Configured and activated arm_controller'); ctx.out('[INFO] [spawner-5]: Configured and activated gripper_controller'); return r; },
        'moveit.launch.py'(ctx) { const r = ROS.runMany(ctx, [['so_arm101_bringup', 'so101_sim', ['--ros-args', '-p', 'mode:=moveit'], 'move_group']]); ctx.out('[INFO] [spawner-4]: Configured and activated arm_controller'); return r; }
      },
      files: { 'launch/sim.launch.py': SIM_PY, 'config/controllers.yaml': CTRL_YAML }
    });
  }

  window.ArmSim = { create: createArmSim, find: findSim, sims: SIMS, tfTreeSVG };
})();
