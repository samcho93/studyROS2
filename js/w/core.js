/* ===================================================================
   핵심 위젯 · 화면 — turtlesim, teleop, rqt_graph, rqt_plot, rqt 도구, 터미널, 파이썬 실습기
   =================================================================== */
(function () {
  'use strict';
  const { esc, fitCanvas, loop, colors, registerView, frame } = RosUI;
  const M = ROS.math;

  /* ================================================== turtlesim 화면 */
  function drawTurtle(ctx, x, y, th, color, s) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-th); ctx.scale(s, s);
    // 다리
    ctx.fillStyle = '#6b8e23';
    [[6, -9], [6, 9], [-7, -9], [-7, 9]].forEach(([lx, ly]) => { ctx.beginPath(); ctx.ellipse(lx, ly, 4, 3, 0, 0, Math.PI * 2); ctx.fill(); });
    // 꼬리 · 머리
    ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-16, -2); ctx.lineTo(-16, 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13, 0, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(15, -2, 1.1, 0, 7); ctx.arc(15, 2, 1.1, 0, 7); ctx.fill();
    // 등딱지
    ctx.fillStyle = color; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(-3, 0); ctx.lineTo(-5, 8); ctx.moveTo(5, -8); ctx.lineTo(3, 0); ctx.lineTo(5, 8); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke();
    ctx.restore();
  }
  function tsView(el, o) {
    o = o || {};
    el.classList.add('ts-host');
    el.innerHTML = `<div class="ts-bar"><span class="ts-name mono"></span><span class="spacer"></span>
      <button class="btn tiny ghost" data-a="spawn" title="/spawn 서비스 호출">➕ spawn</button>
      <button class="btn tiny ghost" data-a="clear" title="/clear 서비스 호출">🧹 clear</button>
      <button class="btn tiny ghost" data-a="reset" title="/reset 서비스 호출">↺ reset</button></div>
      <div class="ts-stage" tabindex="0" title="클릭한 뒤 방향키로 turtle1 을 움직일 수 있어요"><canvas></canvas><div class="ts-off hidden"><p>turtlesim 노드가 꺼져 있습니다</p><button class="btn small primary" data-a="start">▶ ros2 run turtlesim turtlesim_node</button></div></div>
      ${o.teleop === '0' ? '' : `<div class="ts-pad"><button data-k="ArrowUp" title="앞으로">▲</button><button data-k="ArrowLeft" title="왼쪽 회전">⟲</button><button data-k="ArrowDown" title="뒤로">▼</button><button data-k="ArrowRight" title="오른쪽 회전">⟳</button><span class="ts-info mono small"></span></div>`}`;
    const cv = el.querySelector('canvas'), stage = el.querySelector('.ts-stage'), off = el.querySelector('.ts-off');
    let sim = null, ownNode = null, teleNode = null, telePub = null;
    const findSim = () => {
      if (o.sim) { const n = ROS.findNode(o.sim); if (n && n.turtlesim) return n.turtlesim; }
      return ROS.findTurtlesim();
    };
    const start = () => { const s = ROS.createTurtlesim(null, { owner: el, name: o.name || 'turtlesim' }); ownNode = s.node; return s; };
    sim = findSim();
    if (!sim && o.start !== '0') sim = start();
    const pub = (lin, ang) => {
      if (!teleNode || !teleNode.alive) { teleNode = ROS.createNode('teleop_turtle', { owner: el }); telePub = teleNode.createPublisher('geometry_msgs/msg/Twist', (o.turtle || 'turtle1') + '/cmd_vel', 1); }
      telePub.publish({ linear: { x: lin, y: 0, z: 0 }, angular: { x: 0, y: 0, z: ang } });
    };
    const KEYS = { ArrowUp: [2, 0], ArrowDown: [-2, 0], ArrowLeft: [0, 2], ArrowRight: [0, -2] };
    let held = null, holdT = null;
    const press = k => { if (!KEYS[k]) return; pub(...KEYS[k]); held = k; clearInterval(holdT); holdT = setInterval(() => held && pub(...KEYS[held]), 120); };
    const release = () => { held = null; clearInterval(holdT); };
    el.querySelectorAll('.ts-pad [data-k]').forEach(b => {
      b.addEventListener('pointerdown', e => { e.preventDefault(); press(b.dataset.k); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, release));
    });
    stage.addEventListener('keydown', e => { if (KEYS[e.key]) { e.preventDefault(); if (held !== e.key) press(e.key); } });
    stage.addEventListener('keyup', e => { if (KEYS[e.key]) release(); });
    stage.addEventListener('blur', release);
    const call = (name, type, req) => { const s = sim || findSim(); if (!s) return; ROS.callService(s.node.ns === '/' ? name : s.node.ns + name, type, req).catch(e => RosUI.toast(e.message)); };
    el.querySelector('.ts-bar').addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'clear') call('/clear', 'std_srvs/srv/Empty', {});
      if (a.dataset.a === 'reset') call('/reset', 'std_srvs/srv/Empty', {});
      if (a.dataset.a === 'spawn') call('/spawn', 'turtlesim/srv/Spawn', { x: 1 + Math.random() * 9, y: 1 + Math.random() * 9, theta: (Math.random() - 0.5) * 6, name: '' });
    });
    off.querySelector('[data-a=start]').onclick = () => { sim = start(); };
    const stop = loop(el, () => {
      if (!sim || !sim.node.alive) sim = findSim();
      off.classList.toggle('hidden', !!(sim && sim.node.alive));
      const W = stage.clientWidth; const size = Math.max(120, Math.min(W, o.inWindow ? stage.clientHeight : 520));
      cv.style.width = size + 'px'; cv.style.height = size + 'px';
      const { ctx } = fitCanvas(cv, size, size);
      const k = size / 500;
      if (!sim || !sim.node.alive) { ctx.fillStyle = '#4556ff'; ctx.fillRect(0, 0, size, size); return; }
      const bg = sim.bg;
      ctx.fillStyle = `rgb(${bg.r},${bg.g},${bg.b})`; ctx.fillRect(0, 0, size, size);
      ctx.drawImage(sim.pen, 0, 0, size, size);
      sim.turtles.forEach(t => { const [px, py] = sim.toPx(t.x, t.y); drawTurtle(ctx, px * k, py * k, t.th, t.color, Math.max(0.7, k * 1.25)); });
      el.querySelector('.ts-name').textContent = sim.node.fqn + ' · 거북이 ' + sim.turtles.size + '마리';
      const t1 = sim.turtles.get(o.turtle || 'turtle1');
      const info = el.querySelector('.ts-info');
      if (info) info.textContent = t1 ? `x=${t1.x.toFixed(2)} y=${t1.y.toFixed(2)} θ=${t1.th.toFixed(2)}` : '';
    });
    return () => { stop(); release(); if (teleNode) teleNode.destroy(); if (ownNode && !ownNode.keep) ownNode.destroy(); };
  }
  registerView('turtlesim', tsView, { title: 'TurtleSim', icon: '🐢', w: 520, h: 600 });
  Widgets.register('turtlesim', (el, o) => {
    const body = frame(el, '🐢', 'turtlesim — 거북이 시뮬레이터', 'ROS 2 노드');
    body.classList.add('ts-wbody');
    return tsView(body, o);
  }, { title: 'turtlesim' });

  /* ================================================== teleop (가상 조이스틱) */
  function teleopView(el, o) {
    const topic = o.topic || '/turtle1/cmd_vel';
    const LMAX = +o.lin || 2.0, AMAX = +o.ang || 2.0;
    el.classList.add('tp-host');
    el.innerHTML = `<div class="tp-wrap"><div class="tp-joy" title="끌어서 조종"><div class="tp-knob"></div><span class="tp-lbl t">앞</span><span class="tp-lbl b">뒤</span><span class="tp-lbl l">⟲</span><span class="tp-lbl r">⟳</span></div>
      <div class="tp-side"><div class="mono small">발행 토픽 <b>${esc(topic)}</b><br>geometry_msgs/msg/Twist · 10 Hz</div>
      <pre class="tp-msg mono"></pre><div class="w-help">조이스틱을 끌거나, 여기를 클릭한 뒤 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>·방향키.</div></div></div>`;
    const node = ROS.createNode(o.node || 'teleop_joy', { owner: el });
    const pub = node.createPublisher('geometry_msgs/msg/Twist', topic, 10);
    const joy = el.querySelector('.tp-joy'), knob = el.querySelector('.tp-knob'), pre = el.querySelector('.tp-msg');
    let v = [0, 0], active = false, keys = new Set();
    const setKnob = () => { knob.style.transform = `translate(${-v[1] / AMAX * 42}px, ${-v[0] / LMAX * 42}px)`; };
    const fromPt = e => { const r = joy.getBoundingClientRect(); let dx = (e.clientX - r.left - r.width / 2) / (r.width / 2 - 14), dy = (e.clientY - r.top - r.height / 2) / (r.height / 2 - 14); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } v = [+(-dy * LMAX).toFixed(2), +(-dx * AMAX).toFixed(2)]; setKnob(); };
    joy.addEventListener('pointerdown', e => { active = true; joy.setPointerCapture(e.pointerId); fromPt(e); });
    joy.addEventListener('pointermove', e => { if (active) fromPt(e); });
    ['pointerup', 'pointercancel'].forEach(ev => joy.addEventListener(ev, () => { active = false; v = [0, 0]; setKnob(); pub.publish({ linear: { x: 0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0 } }); }));
    el.tabIndex = 0;
    const K = { w: [1, 0], arrowup: [1, 0], s: [-1, 0], arrowdown: [-1, 0], a: [0, 1], arrowleft: [0, 1], d: [0, -1], arrowright: [0, -1] };
    el.addEventListener('keydown', e => { const k = e.key.toLowerCase(); if (K[k]) { e.preventDefault(); keys.add(k); } });
    el.addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); if (!keys.size && !active) { v = [0, 0]; setKnob(); } });
    el.addEventListener('blur', () => { keys.clear(); });
    const iv = setInterval(() => {
      if (!el.isConnected) return;
      if (keys.size) { let l = 0, a = 0; keys.forEach(k => { l += K[k][0]; a += K[k][1]; }); v = [Math.sign(l) * LMAX * 0.8, Math.sign(a) * AMAX * 0.8]; setKnob(); }
      if (active || keys.size) pub.publish({ linear: { x: v[0], y: 0, z: 0 }, angular: { x: 0, y: 0, z: v[1] } });
      pre.textContent = `linear:\n  x: ${v[0].toFixed(2)}\nangular:\n  z: ${v[1].toFixed(2)}`;
    }, 100);
    return () => { clearInterval(iv); node.destroy(); };
  }
  registerView('teleop', teleopView, { title: 'teleop — 가상 조이스틱', icon: '🎮', w: 420, h: 260 });
  Widgets.register('teleop', (el, o) => teleopView(frame(el, '🎮', '가상 조이스틱 (teleop)', 'Twist 발행'), o), { title: '가상 조이스틱' });

  /* ================================================== rqt_graph */
  function graphView(el, o) {
    o = o || {};
    el.classList.add('rg-host');
    el.innerHTML = `<div class="rg-bar"><select class="w-in rg-mode"><option value="all">Nodes/Topics (all)</option><option value="nodes">Nodes only</option></select>
      <label><input type="checkbox" class="rg-debug" ${o.hide === '0' ? '' : 'checked'}> Hide Debug</label>
      <label><input type="checkbox" class="rg-dead" checked> Dead sinks</label>
      <span class="spacer"></span><span class="muted small rg-count"></span><button class="btn tiny ghost" data-a="refresh" title="새로 고침">⟳</button></div>
      <div class="rg-svg"></div><div class="rg-info mono small hidden"></div>`;
    const box = el.querySelector('.rg-svg'), info = el.querySelector('.rg-info');
    const flash = new Map(); // topic → 시각
    let selected = null;
    const build = () => {
      const hideDbg = el.querySelector('.rg-debug').checked, mode = el.querySelector('.rg-mode').value, dead = el.querySelector('.rg-dead').checked;
      const nodes = ROS.nodes().filter(n => !(hideDbg && /^\/_|rqt_gui|_ros2cli|rosbag2|static_transform_publisher|^\/launch_ros/.test(n.fqn) && false) && !(hideDbg && /(^|\/)(_ros2cli_|rqt_gui_py_node|rosbridge_proxy)/.test(n.fqn)));
      const skip = t => hideDbg && /^\/(rosout|parameter_events)$|\/_action\/|^\/tf_static$/.test(t) && !/^\/tf_static$/.test(t) || (hideDbg && /^\/(rosout|parameter_events)$/.test(t));
      const topics = new Map();
      nodes.forEach(n => {
        n.pubs.forEach(p => { if (skip(p.topic)) return; const t = topics.get(p.topic) || { pubs: new Set(), subs: new Set() }; t.pubs.add(n.fqn); topics.set(p.topic, t); });
        n.subs.forEach(s => { if (skip(s.topic)) return; const t = topics.get(s.topic) || { pubs: new Set(), subs: new Set() }; t.subs.add(n.fqn); topics.set(s.topic, t); });
      });
      if (!dead) [...topics].forEach(([k, t]) => { if (!t.subs.size || !t.pubs.size) topics.delete(k); });
      // 층 나누기 (가장 긴 경로)
      const layer = new Map(); nodes.forEach(n => layer.set(n.fqn, 0));
      for (let it = 0; it < 6; it++) topics.forEach(t => t.pubs.forEach(p => t.subs.forEach(s => { if (s !== p && layer.get(s) <= layer.get(p)) layer.set(s, Math.min(8, layer.get(p) + 1)); })));
      const items = [];
      nodes.forEach(n => items.push({ id: n.fqn, kind: 'node', col: (layer.get(n.fqn) || 0) * 2, label: n.fqn }));
      if (mode === 'all') topics.forEach((t, k) => { const c = t.pubs.size ? Math.max(...[...t.pubs].map(p => layer.get(p) || 0)) * 2 + 1 : ((t.subs.size ? Math.min(...[...t.subs].map(s => layer.get(s) || 0)) : 0) * 2 - 1); items.push({ id: k, kind: 'topic', col: Math.max(0, c), label: k }); });
      const cols = new Map(); items.forEach(i => { if (!cols.has(i.col)) cols.set(i.col, []); cols.get(i.col).push(i); });
      const colKeys = [...cols.keys()].sort((a, b) => a - b);
      const CW = 190, RH = 58, PADX = 20, PADY = 24;
      let maxRows = 1; colKeys.forEach((c, ci) => { const arr = cols.get(c).sort((a, b) => a.label.localeCompare(b.label)); maxRows = Math.max(maxRows, arr.length); arr.forEach((it, r) => { it.x = PADX + ci * CW; it.r = r; }); });
      const H = PADY * 2 + maxRows * RH;
      colKeys.forEach(c => { const arr = cols.get(c); const off = (H - arr.length * RH) / 2; arr.forEach((it, r) => { it.y = off + r * RH + RH / 2; }); });
      const W = PADX * 2 + Math.max(1, colKeys.length) * CW - 30;
      const pos = new Map(items.map(i => [i.id, i]));
      const edges = [];
      if (mode === 'all') topics.forEach((t, k) => { t.pubs.forEach(p => edges.push([p, k, k])); t.subs.forEach(s => edges.push([k, s, k])); });
      else topics.forEach((t, k) => t.pubs.forEach(p => t.subs.forEach(s => { if (p !== s) edges.push([p, s, k]); })));
      const w = it => it.kind === 'node' ? Math.min(176, Math.max(90, it.label.length * 7.4 + 20)) : Math.min(176, Math.max(80, it.label.length * 7 + 16));
      const now = performance.now();
      let svg = `<svg class="dg rg" viewBox="0 0 ${W} ${H}" style="min-width:${Math.min(W, 900)}px">`;
      edges.forEach(([a, b, tp]) => {
        const A = pos.get(a), B = pos.get(b); if (!A || !B) return;
        const x1 = A.x + w(A), y1 = A.y, x2 = B.x, y2 = B.y;
        const hot = now - (flash.get(tp) || 0) < 400;
        const back = x2 <= x1;
        const d = back ? `M${x1},${y1} C${x1 + 60},${y1 - 50} ${x2 - 60},${y2 - 50} ${x2},${y2}` : `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2 - 2},${y2}`;
        svg += `<path d="${d}" class="rg-e ${hot ? 'hot' : ''}" marker-end="url(#arr${hot ? '-teal' : ''})"/>`;
        if (mode === 'nodes') svg += `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}" class="t-xs t-c t-mu">${esc(tp)}</text>`;
      });
      items.forEach(it => {
        const ww = w(it), sel = selected === it.id ? ' sel' : '';
        const lbl = it.label.length > 24 ? '…' + it.label.slice(-23) : it.label;
        if (it.kind === 'node') svg += `<g class="rg-n${sel}" data-id="${esc(it.id)}" data-k="node"><ellipse cx="${it.x + ww / 2}" cy="${it.y}" rx="${ww / 2}" ry="19"/><text x="${it.x + ww / 2}" y="${it.y}" class="t-sm t-c">${esc(lbl)}</text><title>${esc(it.id)}</title></g>`;
        else { const hot = now - (flash.get(it.id) || 0) < 400; svg += `<g class="rg-t${sel}${hot ? ' hot' : ''}" data-id="${esc(it.id)}" data-k="topic"><rect x="${it.x}" y="${it.y - 16}" width="${ww}" height="32" rx="3"/><text x="${it.x + ww / 2}" y="${it.y}" class="t-sm t-c">${esc(lbl)}</text><title>${esc(it.id)} [${esc(ROS.topicType(it.id) || '')}]</title></g>`; }
      });
      if (!items.length) svg += `<text x="${W / 2}" y="${H / 2}" class="t-c t-mu">실행 중인 노드가 없습니다 — 터미널에서 ros2 run … 을 해 보세요</text>`;
      svg += '</svg>';
      box.innerHTML = svg;
      el.querySelector('.rg-count').textContent = `노드 ${nodes.length} · 토픽 ${topics.size}`;
    };
    const showInfo = (id, k) => {
      selected = id;
      if (k === 'node') { const n = ROS.findNode(id); info.textContent = n ? `${n.fqn}\n  발행: ${n.pubs.filter(p => !/rosout|parameter_events/.test(p.topic)).map(p => p.topic).join(', ') || '-'}\n  구독: ${n.subs.map(s => s.topic).join(', ') || '-'}\n  서비스: ${n.srvs.map(s => s.name).join(', ') || '-'}\n  액션: ${n.asrvs.map(a => a.name).join(', ') || '-'}` : ''; }
      else { const t = ROS.topic(id); const ty = ROS.topicType(id); info.textContent = `${id}  [${ty}]  ${ROS.hz(id).toFixed(1)} Hz\n` + (t && t.last ? ROS.toYaml(t.last, ty).split('\n').slice(0, 12).join('\n') : '(아직 메시지 없음)'); }
      info.classList.remove('hidden'); build();
    };
    box.addEventListener('click', e => { const g = e.target.closest('[data-id]'); if (g) showInfo(g.dataset.id, g.dataset.k); else { selected = null; info.classList.add('hidden'); build(); } });
    el.querySelector('.rg-bar').addEventListener('change', build);
    el.querySelector('[data-a=refresh]').onclick = build;
    let pending = false;
    const sched = () => { if (pending) return; pending = true; setTimeout(() => { pending = false; if (el.isConnected) build(); }, 120); };
    const off1 = ROS.on('graph', sched);
    let lastFlash = 0;
    const off2 = ROS.on('pub', (t) => { if (/rosout|parameter_events/.test(t)) return; const now = performance.now(); if (now - (flash.get(t) || 0) > 300) { flash.set(t, now); if (now - lastFlash > 250) { lastFlash = now; sched(); } } });
    build();
    const iv = setInterval(() => { if (el.isConnected && selected) { const k = ROS.findNode(selected) ? 'node' : 'topic'; if (k === 'topic') showInfo(selected, k); } }, 1000);
    return () => { off1(); off2(); clearInterval(iv); };
  }
  registerView('graph', graphView, { title: 'rqt_graph', icon: '🕸️', w: 820, h: 460 });
  Widgets.register('graph', (el, o) => { const b = frame(el, '🕸️', 'rqt_graph — 노드와 토픽 연결 그래프', '실시간'); return graphView(b, o); }, { title: 'rqt_graph' });

  /* ================================================== rqt_plot */
  function plotView(el, o) {
    o = o || {};
    el.classList.add('rp-host');
    el.innerHTML = `<div class="rp-bar"><input class="w-in rp-in" placeholder="/turtle1/pose/x" list="rp-dl-${Math.random().toString(36).slice(2, 7)}"><datalist></datalist><button class="btn tiny" data-a="add">＋ 추가</button><button class="btn tiny ghost" data-a="pause">⏸</button><button class="btn tiny ghost" data-a="clear">지우기</button><span class="spacer"></span><span class="rp-legend small"></span></div><div class="rp-cv"><canvas></canvas></div>`;
    const dl = el.querySelector('datalist'); dl.id = el.querySelector('.rp-in').getAttribute('list');
    const node = ROS.createNode('rqt_plot_' + Math.floor(Math.random() * 1e4), { owner: el, hidden: true });
    const series = []; let paused = false;
    const PAL = ['blue', 'orange', 'green', 'purple', 'red', 'teal', 'yellow'];
    const subs = {};
    function add(path) {
      path = path.trim(); if (!path || series.find(s => s.path === path)) return;
      // 가장 긴 토픽 접두 찾기
      const topics = ROS.topicList().map(t => t.name).sort((a, b) => b.length - a.length);
      const tp = topics.find(t => path === t || path.startsWith(t + '/'));
      const s = { path, topic: tp || path.split('/').slice(0, -1).join('/'), field: tp ? path.slice(tp.length + 1) : path.split('/').pop(), pts: [], color: PAL[series.length % PAL.length] };
      series.push(s); attach(s); legend();
    }
    function attach(s) {
      const ty = ROS.topicType(s.topic); if (!ty || s.sub) return;
      s.sub = node.createSubscription(ty, s.topic, m => { if (paused) return; let v = m; (s.field || '').split('/').filter(Boolean).forEach(k => { v = v == null ? v : v[/^\d+$/.test(k) ? +k : k]; }); if (typeof v === 'boolean') v = +v; if (typeof v === 'number') { s.pts.push([performance.now(), v]); if (s.pts.length > 2000) s.pts.shift(); } }, 'sensor_data');
    }
    const offG = ROS.on('graph', () => { series.forEach(attach); dl.innerHTML = ROS.topicList().map(t => `<option value="${esc(t.name)}/">`).join(''); });
    function legend() { el.querySelector('.rp-legend').innerHTML = series.map((s, i) => `<span class="rp-lg" data-i="${i}" title="눌러서 지우기"><i style="background:var(--c-${s.color})"></i>${esc(s.path)} ✕</span>`).join(' '); }
    el.querySelector('.rp-legend').addEventListener('click', e => { const l = e.target.closest('[data-i]'); if (!l) return; const s = series.splice(+l.dataset.i, 1)[0]; if (s && s.sub) s.sub.destroy(); legend(); });
    el.querySelector('.rp-bar').addEventListener('click', e => { const a = e.target.closest('[data-a]'); if (!a) return; if (a.dataset.a === 'add') { add(el.querySelector('.rp-in').value); el.querySelector('.rp-in').value = ''; } if (a.dataset.a === 'pause') { paused = !paused; a.textContent = paused ? '▶' : '⏸'; } if (a.dataset.a === 'clear') series.forEach(s => s.pts = []); });
    el.querySelector('.rp-in').addEventListener('keydown', e => { if (e.key === 'Enter') { add(e.target.value); e.target.value = ''; } });
    String(o.topic || '').split(/[,\s]+/).filter(Boolean).forEach(add);
    dl.innerHTML = ROS.topicList().map(t => `<option value="${esc(t.name)}/">`).join('');
    const cv = el.querySelector('canvas'), host = el.querySelector('.rp-cv');
    const WIN = +(o.window || 10) * 1000;
    const stop = loop(el, () => {
      const { ctx, w, h } = fitCanvas(cv, host.clientWidth, host.clientHeight);
      const C = colors(); ctx.clearRect(0, 0, w, h);
      const now = performance.now(); let lo = Infinity, hi = -Infinity;
      series.forEach(s => s.pts.forEach(([t, v]) => { if (now - t < WIN) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }));
      if (!isFinite(lo)) { lo = -1; hi = 1; }
      if (hi - lo < 1e-6) { hi += 0.5; lo -= 0.5; }
      const pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
      const L = 46, B = 20;
      ctx.strokeStyle = C.line; ctx.fillStyle = C.muted; ctx.font = '11px ' + RosUI.css('--mono'); ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { const y = 8 + (h - B - 8) * i / 4; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(w - 6, y); ctx.stroke(); ctx.fillText((hi - (hi - lo) * i / 4).toFixed(2), 2, y + 4); }
      for (let s = 0; s <= WIN / 1000; s += 2) { const x = L + (w - L - 6) * (1 - s * 1000 / WIN); ctx.fillText(`-${s}s`, x - 10, h - 5); }
      series.forEach(s => { ctx.strokeStyle = C[s.color]; ctx.lineWidth = 2; ctx.beginPath(); let st = false; s.pts.forEach(([t, v]) => { if (now - t > WIN) return; const x = L + (w - L - 6) * (1 - (now - t) / WIN), y = 8 + (h - B - 8) * (hi - v) / (hi - lo); if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }); ctx.stroke(); });
      if (!series.length) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('위 칸에 /토픽/필드 를 입력하세요 (예: /turtle1/pose/x)', w / 2, h / 2); ctx.textAlign = 'left'; }
    });
    return () => { stop(); offG(); node.destroy(); };
  }
  registerView('plot', plotView, { title: 'rqt_plot', icon: '📈', w: 720, h: 380 });
  Widgets.register('plot', (el, o) => { const b = frame(el, '📈', 'rqt_plot — 숫자 토픽 그래프', '실시간'); return plotView(b, o); }, { title: 'rqt_plot' });

  /* ================================================== rqt_console */
  function consoleView(el, o) {
    el.classList.add('rc-host');
    el.innerHTML = `<div class="rp-bar"><select class="w-in rc-lv"><option value="10">DEBUG+</option><option value="20" selected>INFO+</option><option value="30">WARN+</option><option value="40">ERROR+</option></select><input class="w-in rc-f" placeholder="노드 · 내용 필터"><span class="spacer"></span><button class="btn tiny ghost" data-a="clear">지우기</button></div><div class="rc-list mono"></div>`;
    const list = el.querySelector('.rc-list'); const logs = [];
    const LV = { 10: 'DEBUG', 20: 'INFO', 30: 'WARN', 40: 'ERROR', 50: 'FATAL' };
    const node = ROS.createNode('rqt_console_' + Math.floor(Math.random() * 1e4), { owner: el, hidden: true });
    node.createSubscription('rcl_interfaces/msg/Log', '/rosout', m => { logs.push(m); if (logs.length > 500) logs.shift(); render(); }, { depth: 1000, durability: 'transient_local' });
    let rt = null;
    const render = () => { if (rt) return; rt = setTimeout(() => { rt = null; const lv = +el.querySelector('.rc-lv').value, f = el.querySelector('.rc-f').value.toLowerCase(); list.innerHTML = logs.filter(m => m.level >= lv && (!f || (m.name + ' ' + m.msg).toLowerCase().includes(f))).slice(-200).reverse().map(m => `<div class="rc-row lv${m.level}"><span class="rc-lvl">${LV[m.level] || m.level}</span><span class="rc-node">${esc(m.name)}</span><span class="rc-msg">${esc(m.msg)}</span><span class="rc-t muted">${m.stamp.sec}.${String(m.stamp.nanosec).padStart(9, '0').slice(0, 3)}</span></div>`).join('') || '<div class="muted pad">로그가 없습니다</div>'; }, 100); };
    el.querySelector('.rp-bar').addEventListener('input', render); el.querySelector('.rp-bar').addEventListener('change', render);
    el.querySelector('[data-a=clear]').onclick = () => { logs.length = 0; render(); };
    render();
    return () => node.destroy();
  }
  registerView('console', consoleView, { title: 'rqt_console', icon: '📜', w: 760, h: 380 });

  /* ================================================== 토픽 모니터 (rqt_topic) */
  function topicsView(el, o) {
    el.classList.add('rt2-host');
    el.innerHTML = `<div class="rt2-list"></div>`;
    const box = el.querySelector('.rt2-list'); const open = new Set(o && o.topic ? [o.topic] : []);
    const render = () => {
      const L = ROS.topicList().filter(t => !/^\/(rosout|parameter_events)$/.test(t.name));
      box.innerHTML = `<table class="tbl rt2"><thead><tr><th>토픽</th><th>타입</th><th class="c">Hz</th><th class="c">pub/sub</th></tr></thead><tbody>${L.map(t => {
        const T = ROS.topic(t.name); const on = open.has(t.name);
        return `<tr data-t="${esc(t.name)}" class="${on ? 'on' : ''}"><td class="mono">${on ? '▾' : '▸'} ${esc(t.name)}</td><td class="mono small">${esc(t.type || '')}</td><td class="c mono">${ROS.hz(t.name).toFixed(1)}</td><td class="c">${t.pubs}/${t.subs}</td></tr>${on ? `<tr class="rt2-val"><td colspan="4"><pre class="mono">${T && T.last ? esc(ROS.toYaml(T.last, t.type).split('\n').slice(0, 40).join('\n')) : '(메시지 없음)'}</pre></td></tr>` : ''}`;
      }).join('') || '<tr><td colspan="4" class="muted">토픽이 없습니다</td></tr>'}</tbody></table>`;
    };
    box.addEventListener('click', e => { const r = e.target.closest('tr[data-t]'); if (!r) return; const t = r.dataset.t; if (open.has(t)) open.delete(t); else open.add(t); render(); });
    render(); const iv = setInterval(() => el.isConnected && render(), 500);
    return () => clearInterval(iv);
  }
  registerView('topics', topicsView, { title: 'rqt_topic — Topic Monitor', icon: '📡', w: 720, h: 420 });
  Widgets.register('echo', (el, o) => topicsView(frame(el, '📡', '토픽 모니터 (rqt_topic)', '실시간'), o), { title: '토픽 모니터' });

  /* ================================================== 파라미터 (rqt_reconfigure) */
  function paramsView(el, o) {
    el.classList.add('rq-host');
    el.innerHTML = `<div class="rq-grid"><div class="rq-nodes"></div><div class="rq-params"></div></div>`;
    let sel = o && o.node || null;
    const render = () => {
      const nodes = ROS.nodes().filter(n => !/_ros2cli_|rqt_/.test(n.fqn));
      if (!sel || !ROS.findNode(sel)) sel = nodes[0] && nodes[0].fqn;
      el.querySelector('.rq-nodes').innerHTML = nodes.map(n => `<button class="rq-n ${n.fqn === sel ? 'on' : ''}" data-n="${esc(n.fqn)}">${esc(n.fqn)}</button>`).join('') || '<div class="muted small pad">노드 없음</div>';
      const n = sel && ROS.findNode(sel);
      el.querySelector('.rq-params').innerHTML = n ? [...n.params.values()].map(p => {
        const inp = p.type === 'bool' ? `<input type="checkbox" data-p="${esc(p.name)}" ${p.value ? 'checked' : ''}>` : p.type === 'integer' || p.type === 'double' ? `<input class="w-in" type="number" step="${p.type === 'integer' ? 1 : 0.1}" data-p="${esc(p.name)}" value="${p.value}">` : `<input class="w-in" data-p="${esc(p.name)}" value="${esc(Array.isArray(p.value) ? JSON.stringify(p.value) : p.value)}">`;
        return `<label class="rq-row"><span class="mono">${esc(p.name)}</span>${inp}<small class="muted">${p.type}${p.desc && p.desc.description ? ' · ' + esc(p.desc.description) : ''}</small></label>`;
      }).join('') : '';
    };
    el.addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (b) { sel = b.dataset.n; render(); } });
    el.addEventListener('change', e => {
      const i = e.target.closest('[data-p]'); if (!i) return; const n = ROS.findNode(sel); if (!n) return;
      const p = n.params.get(i.dataset.p); let v = i.type === 'checkbox' ? i.checked : i.value;
      if (p.type === 'integer') v = parseInt(v, 10); else if (p.type === 'double') v = parseFloat(v);
      const [r] = n.setParameters([{ name: p.name, value: v }]);
      RosUI.toast(r.successful ? `✓ ${p.name} = ${v}` : `✗ ${r.reason}`); render();
    });
    render(); const off = ROS.on('graph', () => el.isConnected && !el.contains(document.activeElement) && render());
    const off2 = ROS.on('param', () => el.isConnected && !el.contains(document.activeElement) && render());
    return () => { off(); off2(); };
  }
  registerView('params', paramsView, { title: 'rqt_reconfigure', icon: '🎛️', w: 640, h: 380 });
  Widgets.register('params', (el, o) => paramsView(frame(el, '🎛️', '파라미터 바꾸기 (rqt_reconfigure)', '실시간'), o), { title: '파라미터' });

  /* ================================================== 서비스 호출기 */
  function srvView(el, o) {
    el.classList.add('rs-host');
    el.innerHTML = `<div class="w-row"><select class="w-in rs-sel"></select><button class="btn tiny primary" data-a="call">Call</button></div><textarea class="w-in rs-req mono" rows="5"></textarea><pre class="rs-res mono"></pre>`;
    const sel = el.querySelector('.rs-sel'), req = el.querySelector('.rs-req'), res = el.querySelector('.rs-res');
    const fill = () => { const cur = sel.value; sel.innerHTML = ROS.serviceList().map(s => `<option value="${esc(s.name)}" data-t="${esc(s.type)}">${esc(s.name)}  [${esc(s.type)}]</option>`).join(''); if (cur) sel.value = cur; if (!sel.value && o && o.srv) sel.value = o.srv; };
    const tmpl = () => { const o2 = sel.selectedOptions[0]; if (!o2) return; const t = o2.dataset.t; req.value = ROS.toYaml(ROS.make(ROS.partType(t, 0)), ROS.partType(t, 0)).replace(/^\{\}$/, ''); };
    sel.onchange = tmpl;
    el.querySelector('[data-a=call]').onclick = async () => {
      const o2 = sel.selectedOptions[0]; if (!o2) return; res.textContent = '호출 중…';
      try { const y = req.value.trim() ? ROS.parseYaml(req.value) : {}; const r = await ROS.callService(sel.value, o2.dataset.t, y); res.textContent = ROS.toYaml(r, ROS.partType(o2.dataset.t, 1)) || '(빈 응답)'; } catch (e) { res.textContent = '오류: ' + e.message; }
    };
    fill(); tmpl(); const off = ROS.on('graph', () => { if (el.isConnected) { const had = sel.value; fill(); if (!had) tmpl(); } });
    return off;
  }
  registerView('srvcaller', srvView, { title: 'rqt_service_caller', icon: '📞', w: 600, h: 420 });

  /* ================================================== rqt (탭 모음) */
  registerView('rqt', (el, o) => {
    el.classList.add('rqt-host');
    const TABS = [['graph', 'Node Graph'], ['topics', 'Topic Monitor'], ['plot', 'Plot'], ['console', 'Console'], ['srvcaller', 'Service Caller'], ['params', 'Dynamic Reconfigure']];
    el.innerHTML = `<div class="w-seg rqt-tabs">${TABS.map(([k, t], i) => `<button data-t="${k}" class="${i ? '' : 'on'}">${t}</button>`).join('')}</div><div class="rqt-body"></div>`;
    let cleanup = null;
    const show = k => { if (cleanup) cleanup(); const b = el.querySelector('.rqt-body'); b.innerHTML = ''; const d = document.createElement('div'); d.className = 'rqt-pane'; b.appendChild(d); cleanup = RosUI.views[k].fn(d, { inWindow: true }); el.querySelectorAll('.rqt-tabs button').forEach(x => x.classList.toggle('on', x.dataset.t === k)); };
    el.querySelector('.rqt-tabs').onclick = e => { const b = e.target.closest('[data-t]'); if (b) show(b.dataset.t); };
    show('graph');
    return () => cleanup && cleanup();
  }, { title: 'rqt', icon: '🧰', w: 860, h: 520 });

  /* ================================================== 터미널 위젯 */
  Widgets.register('term', (el, o) => {
    const body = frame(el, '🖥️', '터미널 — ros2 명령 실습', 'bash · ROS 2 Jazzy');
    body.classList.add('term-wbody');
    const chips = String(o.chips || o.hint || '').split(';').map(s => s.trim()).filter(Boolean);
    if (chips.length) body.insertAdjacentHTML('beforeend', `<div class="term-chips">${chips.map(c => `<button class="term-chip mono" data-cmd="${esc(c)}" title="눌러서 실행">▶ ${esc(c)}</button>`).join('')}</div>`);
    const host = document.createElement('div'); host.className = 'term-box'; host.style.height = (+o.h || 300) + 'px'; body.appendChild(host);
    const t = Term.create(host, { quiet: o.quiet === '1' });
    body.addEventListener('click', e => { const c = e.target.closest('[data-cmd]'); if (c) { if (t.fg) t.interrupt(); t.exec(c.dataset.cmd, true); } });
    if (o.run) setTimeout(() => t.execScript(String(o.run).split(';').join('\n')), 200);
    return () => { if (t.fg) t.fg.stop(); t.bg.forEach(p => p.stop()); Term.terms.delete(t); };
  }, { title: '터미널' });

  /* ================================================== 파이썬 실습기 (pylab) */
  const SIDE = {
    turtlesim: (el) => tsView(el, {}),
    graph: (el) => graphView(el, {}),
    term: (el) => { const t = Term.create(el, { quiet: true }); t.print('💡 여기서 ros2 topic list, ros2 service call … 로 파이썬 노드와 대화해 보세요', 'muted'); return () => { if (t.fg) t.fg.stop(); Term.terms.delete(t); }; },
    none: () => null
  };
  function sideView(name, el, o) {
    if (SIDE[name]) return SIDE[name](el);
    if (RosUI.views[name]) return RosUI.views[name].fn(el, Object.assign({ inWindow: false, compact: true }, o || {}));
    return null;
  }
  function pylabView(el, o) {
    o = o || {};
    const EX = window.PY_EXAMPLES || {};
    const ex = EX[o.ex] || EX.talker || { code: '' };
    const withV = o.with || ex.with || 'graph';
    const key = 'r2:py:' + (o.key || o.ex || 'scratch');
    let saved = null; try { saved = localStorage.getItem(key); } catch (_) {}
    el.classList.add('pl-host');
    el.innerHTML = `<div class="pl-bar">
        <select class="w-in pl-ex" title="예제 불러오기">${Object.values(EX).map(e => `<option value="${e.id}" ${e.id === (o.ex || 'talker') ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select>
        <button class="btn tiny primary" data-a="run" title="Ctrl+Enter">▶ 실행</button><button class="btn tiny" data-a="stop" disabled>■ 정지 (Ctrl+C)</button>
        <span class="spacer"></span><span class="pl-st muted small"></span>
        <button class="btn tiny ghost" data-a="reset" title="예제 원래 코드로">↺</button><button class="btn tiny ghost" data-a="copy" title="코드 복사">⧉</button>
      </div>
      <div class="pl-grid ${withV === 'none' ? 'solo' : ''}"><div class="pl-left"><div class="pl-ed"></div><div class="pl-out mono" tabindex="0"></div></div>${withV === 'none' ? '' : '<div class="pl-side"></div>'}</div>
      ${ex.desc ? `<div class="w-help pl-desc">💡 ${esc(ex.desc)}</div>` : ''}`;
    const outEl = el.querySelector('.pl-out'), st = el.querySelector('.pl-st');
    const print = (s, cls) => { const d = document.createElement('div'); d.className = 'pl-l' + (cls ? ' ' + cls : (/^\[(WARN)\]/.test(s) ? ' warn' : /^\[(ERROR|FATAL)\]|^Traceback|Error:/.test(s) ? ' err' : '')); d.textContent = s; outEl.appendChild(d); while (outEl.childNodes.length > 800) outEl.removeChild(outEl.firstChild); outEl.scrollTop = outEl.scrollHeight; };
    let run = null;
    const runBtn = el.querySelector('[data-a=run]'), stopBtn = el.querySelector('[data-a=stop]');
    const ed = PyROS.createEditor(el.querySelector('.pl-ed'), o.code != null ? o.code : saved != null ? saved : ex.code, { onRun: () => doRun() });
    ed.onChange(() => { try { localStorage.setItem(key, ed.get()); } catch (_) {} });
    function doRun() {
      if (run) { run.stop(); }
      outEl.innerHTML = '';
      print('$ python3 ' + (o.file || o.ex || 'main') + '.py', 'cmd');
      runBtn.disabled = true; stopBtn.disabled = false; st.textContent = '실행 중…';
      const r = run = PyROS.run(ed.get(), { filename: (o.file || o.ex || 'main') + '.py', out: s => print(s), err: s => print(s, 'err'), onStatus: s => { st.textContent = s || '실행 중…'; if (s) print('⏳ ' + s, 'muted'); } });
      r.done.then(res => { if (run === r) { run = null; runBtn.disabled = false; stopBtn.disabled = true; st.textContent = { ok: '✓ 끝', error: '✗ 오류', stopped: '■ 멈춤', killed: '■ 강제 종료' }[res] || res; } });
    }
    runBtn.onclick = doRun;
    // 하단 도크 등에서 코드 넣고 실행할 때 쓰는 손잡이
    el._pylab = {
      setCode(code) { ed.set(code); try { localStorage.setItem(key, code); } catch (_) {} },
      getCode: () => ed.get(), run: doRun, stop: () => run && run.stop(),
      get running() { return !!run; }
    };
    stopBtn.onclick = () => run && run.stop();
    outEl.addEventListener('keydown', e => { if (e.ctrlKey && e.key === 'c' && !getSelection().toString()) run && run.stop(); });
    el.querySelector('[data-a=reset]').onclick = () => { const e2 = EX[el.querySelector('.pl-ex').value]; if (e2 && confirm('예제 원래 코드로 되돌릴까요? (고친 내용은 사라집니다)')) ed.set(e2.code); };
    el.querySelector('[data-a=copy]').onclick = () => navigator.clipboard && navigator.clipboard.writeText(ed.get()).then(() => RosUI.toast('코드를 복사했습니다'));
    el.querySelector('.pl-ex').onchange = e => { const e2 = EX[e.target.value]; if (!e2) return; if (run) run.stop(); ed.set(e2.code); try { localStorage.setItem(key, e2.code); } catch (_) {} const d = el.querySelector('.pl-desc'); if (d) d.textContent = '💡 ' + (e2.desc || ''); };
    let sideClean = null;
    const side = el.querySelector('.pl-side');
    if (side) sideClean = sideView(withV, side, o);
    print(`▶ 실행 을 누르면 rclpy 코드가 브라우저 안의 ROS 2 그래프에서 돌아갑니다. (처음 실행은 Pyodide 를 내려받느라 조금 걸려요)`, 'muted');
    return () => { if (run) run.stop(); if (typeof sideClean === 'function') sideClean(); };
  }
  registerView('pylab', pylabView, { title: '파이썬 rclpy 실습기', icon: '🐍', w: 980, h: 620 });
  Widgets.register('pylab', (el, o) => { const b = frame(el, '🐍', '파이썬 rclpy 실습기', 'Python · rclpy'); return pylabView(b, o); }, { title: '파이썬 실습기' });

  /* ================================================== 실습 묶음 (lab) : 터미널 + 화면들 */
  function labView(el, o) {
    o = o || {};
    const parts = String(o.with || 'turtlesim').split(',').map(s => s.trim()).filter(Boolean);
    el.classList.add('lab-host');
    el.innerHTML = `<div class="lab-grid n${parts.length + 1}"><div class="lab-cell lab-term"></div>${parts.map(p => `<div class="lab-cell" data-v="${esc(p)}"></div>`).join('')}</div>`;
    const t = Term.create(el.querySelector('.lab-term'), {});
    const cl = parts.map(p => sideView(p, el.querySelector(`[data-v="${p}"]`), o));
    if (o.run) setTimeout(() => t.execScript(String(o.run).split(';').join('\n')), 200);
    return () => { if (t.fg) t.fg.stop(); t.bg.forEach(p => p.stop()); Term.terms.delete(t); cl.forEach(c => typeof c === 'function' && c()); };
  }
  registerView('lab', labView, { title: '실습 — 터미널 + 화면', icon: '🧪', w: 1000, h: 560 });
  Widgets.register('lab', (el, o) => { const b = frame(el, '🧪', o.title || '실습 — 터미널과 함께', '직접 해 보기'); if (o.h) b.style.setProperty('--lab-h', (+o.h) + 'px'); return labView(b, o); }, { title: '실습' });

  /* ================================================== 연계 강좌 페이지 붙이기 (embed) */
  Widgets.register('embed', (el, o) => {
    const url = String(o.url || '');
    const ok = /^https:\/\/samcho93\.github\.io\//.test(url);
    const body = frame(el, o.icon || '🔗', esc(o.title || '연계 강좌'), '연계 강좌');
    if (!ok) { body.textContent = '⚠ 허용되지 않은 주소입니다'; return; }
    const h = Math.max(240, +o.h || 520);
    body.classList.add('emb-body');
    body.innerHTML = `<div class="emb-bar"><span class="mono small muted">${esc(url.replace('https://', ''))}</span><span class="spacer"></span><a class="btn tiny ghost" href="${esc(url)}" target="_blank" rel="noopener">↗ 새 탭에서 열기</a></div>
      <div class="emb-frame" style="height:${h}px"><button class="btn primary emb-load">▶ 여기에서 불러오기</button><p class="muted small">${esc(o.desc || '다른 강좌의 시뮬레이터를 이 페이지 안에 띄웁니다. (처음 불러올 때 몇 MB 를 내려받을 수 있어요)')}</p></div>`;
    const fr = body.querySelector('.emb-frame');
    const load = () => { fr.innerHTML = `<iframe src="${esc(url)}" title="${esc(o.title || url)}" loading="lazy" allow="fullscreen; gamepad; serial" allowfullscreen></iframe>`; };
    body.querySelector('.emb-load').onclick = load;
    if (o.auto === '1') load();
  }, { title: '연계 강좌 붙이기' });

  RosUI.sideView = sideView;
})();
