/* ===================================================================
   개념 위젯 (concept) — 통신 방식 · QoS · DDS 도메인 · 인터페이스 · 패키지 ·
   colcon · 런치 · rosbag2 · 실행기 · 라이프사이클 · ROS1 vs ROS2
   위젯: comm qos domain iface pkg colcon launch bag exec lifecycle ros1vs2
   CSS 접두어: wc-  (css/w-concept.css)
   =================================================================== */
(function () {
  'use strict';
  if (!window.Widgets || !window.RosUI || !window.ROS) return;

  /* ================================================== 공용 도우미 */
  const esc = s => RosUI.esc(s);
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (r, s) => r.querySelector(s);
  const $$ = (r, s) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = p => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /** SVG 요소 만들기 */
  function S(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  /** 같은 이름의 노드가 이미 있으면 _2, _3 … 을 붙인다 */
  function uniqName(base, ns) {
    const pre = (ns && ns !== '/' ? ns : '') + '/';
    if (!ROS.findNode(pre + base)) return base;
    let k = 2; while (ROS.findNode(pre + base + '_' + k)) k++;
    return base + '_' + k;
  }
  function copyText(text) {
    const ok = () => RosUI.toast('📋 복사했습니다');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, () => fallback());
    else fallback();
    function fallback() { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;left:-9999px'; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); ok(); } catch (_) {} t.remove(); }
  }
  function download(name, text, mime) {
    const b = new Blob([text], { type: mime || 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /** 로그 상자: {add(line, cls), clear()} */
  function LogBox(el, max) {
    max = max || 200;
    return {
      add(line, cls) {
        String(line).split('\n').forEach(l => {
          const d = document.createElement('div');
          const c = cls || (/\[(ERROR|FATAL)\]|Failed|error:/.test(l) ? 'err' : /\[WARN(ING)?\]/.test(l) ? 'warn' : '');
          if (c) d.className = c;
          d.textContent = l; el.appendChild(d);
        });
        while (el.childNodes.length > max) el.removeChild(el.firstChild);
        el.scrollTop = el.scrollHeight;
      },
      clear() { el.innerHTML = ''; }
    };
  }

  /* ---------------------------------------------- 코드 색칠 */
  const KW = {
    py: 'from|import|def|return|class|if|else|elif|for|in|while|try|except|finally|with|as|None|True|False|and|or|not|lambda|self|super|pass|raise|async|await|yield|is',
    cpp: 'int|char|void|return|class|public|private|protected|auto|const|using|namespace|if|else|for|while|new|true|false|nullptr|struct|override|this|std|include',
    cmake: 'cmake_minimum_required|project|find_package|add_executable|target_include_directories|target_compile_features|install|if|endif|set|ament_package|ament_target_dependencies|rosidl_generate_interfaces|ament_export_dependencies|ament_lint_auto_find_test_dependencies|add_compile_options|target_link_libraries|REQUIRED|DESTINATION|TARGETS|PUBLIC|DEPENDENCIES|OR|MATCHES',
    bash: 'source|export|cd|mkdir|colcon|ros2|echo|sudo|apt|rm|ls|build|run|launch',
    msg: 'bool|byte|char|float32|float64|int8|uint8|int16|uint16|int32|uint32|int64|uint64|string|wstring',
    ini: '', yaml: 'true|false', xml: '', txt: ''
  };
  const KWRE = {};
  function hiLine(line, lang) {
    if (lang === 'txt') return esc(line);
    if (lang === 'xml') {
      return esc(line).replace(/(&lt;!--.*?--&gt;)|(&lt;[?\/]?[\w:-]+)|(&quot;.*?&quot;)|(\/?&gt;|\?&gt;)/g,
        (m, c, tag, str, close) => c ? `<span class="cm">${c}</span>` : tag ? `<span class="kw">${tag}</span>` : str ? `<span class="str">${str}</span>` : `<span class="kw">${close}</span>`);
    }
    if (lang === 'yaml') {
      const m = line.match(/^(\s*(?:-\s+)*)([\w./-]+)(:)(\s.*|)$/);
      if (m) return esc(m[1]) + `<span class="kw">${esc(m[2])}</span>:` + gen(m[4], lang);
    }
    if (lang === 'ini' && /^\s*\[.*\]\s*$/.test(line)) return `<span class="kw">${esc(line)}</span>`;
    if (lang === 'cpp' && /^\s*#/.test(line)) return `<span class="kw">${esc(line)}</span>`;
    return gen(line, lang);
  }
  function gen(line, lang) {
    if (!KWRE[lang]) KWRE[lang] = KW[lang] ? new RegExp('^(?:' + KW[lang] + ')$') : /^\b$/;
    const kw = KWRE[lang];
    const cmt = lang === 'cpp' ? '\\/\\/.*$' : '#.*$';
    const re = new RegExp(`(${cmt})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_][\\w]*)|([\\s\\S])`, 'g');
    let out = '', m;
    while ((m = re.exec(line))) {
      if (m[1]) out += `<span class="cm">${esc(m[1])}</span>`;
      else if (m[2]) out += `<span class="str">${esc(m[2])}</span>`;
      else if (m[3]) out += `<span class="num">${esc(m[3])}</span>`;
      else if (m[4]) {
        if (kw.test(m[4])) out += `<span class="kw">${m[4]}</span>`;
        else if (line[re.lastIndex] === '(' && (lang === 'py' || lang === 'cpp')) out += `<span class="fn">${m[4]}</span>`;
        else out += esc(m[4]);
      } else out += esc(m[5]);
    }
    return out;
  }
  /** 코드 블록 HTML. hl: 강조할 줄 — 줄 번호(1부터) 또는 그 줄에 들어 있는 글자 */
  function codeHTML(text, lang, hl, opts) {
    const hit = (l, i) => (hl || []).some(h => typeof h === 'number' ? h === i + 1 : l.includes(h));
    const lines = String(text).replace(/\n$/, '').split('\n');
    const body = lines.map((l, i) => `<span class="wc-ln${hit(l, i) ? ' wc-hl' : ''}">${hiLine(l, lang) || ' '}</span>`).join('');
    return `<pre class="code wc-code${opts && opts.cls ? ' ' + opts.cls : ''}"${opts && opts.label ? ` data-lang="${esc(opts.label)}"` : ''}><code>${body}</code></pre>`;
  }

  /* ---------------------------------------------- SVG 위를 나는 점 */
  function Flyer(layer) {
    const list = [];
    function pos(pts, p) {
      if (pts.length === 2) return [pts[0][0] + (pts[1][0] - pts[0][0]) * p, pts[0][1] + (pts[1][1] - pts[0][1]) * p];
      let L = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
      let t = p * L;
      for (let i = 0; i < seg.length; i++) { if (t <= seg[i] || i === seg.length - 1) { const q = seg[i] ? t / seg[i] : 1; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * q, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * q]; } t -= seg[i]; }
      return pts[pts.length - 1];
    }
    return {
      /** o = {pts:[[x,y],…], dur(초), delay, cls, r, label, lcls, fade, onDone, lost} */
      add(o) {
        const g = S('g', { class: 'wc-fly' }, layer);
        S('circle', { r: o.r || 7, class: o.cls || 's-blue' }, g);
        if (o.label) S('text', { class: 't-xs t-b t-c ' + (o.lcls || ''), y: -13 }, g, o.label);
        g.style.opacity = 0;
        const f = { o, g, t: -(o.delay || 0) };
        list.push(f);
        return f;
      },
      tick(dt) {
        for (let i = list.length - 1; i >= 0; i--) {
          const f = list[i]; f.t += dt;
          if (f.t < 0) continue;
          const p = Math.min(1, f.t / (f.o.dur || 0.6));
          const [x, y] = pos(f.o.pts, ease(p));
          let op = 1;
          if (f.o.lost && p > 0.55) op = Math.max(0, 1 - (p - 0.55) / 0.45);
          if (f.o.fade && p > 0.7) op = Math.max(0, 1 - (p - 0.7) / 0.3);
          f.g.setAttribute('transform', `translate(${x.toFixed(1)},${(y + (f.o.lost && p > 0.55 ? (p - 0.55) * 60 : 0)).toFixed(1)})`);
          f.g.style.opacity = op;
          if (p >= 1) { list.splice(i, 1); f.g.remove(); if (f.o.onDone) try { f.o.onDone(); } catch (e) { console.error(e); } }
        }
      },
      clear() { list.forEach(f => f.g.remove()); list.length = 0; },
      get size() { return list.length; }
    };
  }
  /** SVG 상자(노드) 그리기 → {g, t1, t2} */
  function box(parent, x, y, w, h, cls, title, sub, opts) {
    opts = opts || {};
    const g = S('g', { class: 'wc-box ' + (opts.gcls || '') }, parent);
    S('rect', { x, y, width: w, height: h, rx: opts.rx != null ? opts.rx : 12, class: cls }, g);
    const t1 = S('text', { x: x + w / 2, y: y + (sub != null ? h / 2 - 9 : h / 2), class: 't-c t-b ' + (opts.t1cls || 't-sm') }, g, title);
    const t2 = sub != null ? S('text', { x: x + w / 2, y: y + h / 2 + 11, class: 't-c t-xs t-mu ' + (opts.t2cls || '') }, g, sub) : null;
    return { g, t1, t2, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
  }
  function line(parent, x1, y1, x2, y2, cls) { return S('line', { x1, y1, x2, y2, class: cls || 'ln' }, parent); }
  /** 화살표 머리(marker) 정의 */
  function defs(svg) {
    const d = S('defs', null, svg);
    [['wc-a', 'mk'], ['wc-a-blue', 'mk-blue'], ['wc-a-teal', 'mk-teal'], ['wc-a-orange', 'mk-orange'], ['wc-a-green', 'mk-green'], ['wc-a-red', 'mk-red'], ['wc-a-purple', 'mk-purple']].forEach(([id, c]) => {
      const m = S('marker', { id: id + '-' + svg._wcid, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, d);
      S('path', { d: 'M0,0 L10,5 L0,10 z', class: c }, m);
    });
    return d;
  }
  let svgSeq = 0;
  function newSvg(parent, cls) {
    const svg = S('svg', { class: 'dg ' + (cls || '') }, parent);
    svg._wcid = ++svgSeq;
    return svg;
  }
  const mk = (svg, c) => `url(#wc-a${c ? '-' + c : ''}-${svg._wcid})`;
  function arrowLine(parent, svg, x1, y1, x2, y2, cls, color) {
    const l = line(parent, x1, y1, x2, y2, cls);
    l.setAttribute('marker-end', mk(svg, color));
    return l;
  }

  /** 위젯 + (선택) 떠 있는 창 보기 등록 */
  function mount(name, icon, title, view, meta) {
    meta = meta || {};
    Widgets.register(name, (el, o) => {
      const body = RosUI.frame(el, icon, title, meta.tag);
      body.classList.add('wc');
      if (meta.view) { const hd = el.querySelector('.w-head'); if (hd) hd.insertAdjacentHTML('beforeend', RosUI.popoutBtn(meta.view, o)); }
      return view(body, o || {}, el);
    }, { title });
    if (meta.view) RosUI.registerView(meta.view, (body, opts) => { body.classList.add('wc', 'wc-win'); return view(body, opts || {}, body); }, { title, icon, w: meta.w || 760, h: meta.h || 560 });
  }
  /** 너비가 좁은지 (모바일) */
  const isNarrow = el => (el.clientWidth || 800) < 560;
  /** 좁음/넓음이 바뀔 때 fn 호출 */
  function onWidth(el, fn) {
    let last = null;
    if (!window.ResizeObserver) return () => {};
    const ro = new ResizeObserver(() => { const n = isNarrow(el); if (last !== null && n !== last) fn(n); last = n; });
    ro.observe(el);
    return () => ro.disconnect();
  }
  const opt = (v, label, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${esc(label == null ? v : label)}</option>`;


  /* ==================================================================
     1) comm — 토픽 / 서비스 / 액션 한눈에 (실제 WebROS 노드 사용)
     ================================================================== */
  function commView(body, o, owner) {
    const MODES = { topic: '📨 토픽', service: '🔁 서비스', action: '🎯 액션' };
    let mode = MODES[o.mode] ? o.mode : 'topic';
    body.innerHTML = `<div class="wc-cm">
      <div class="w-row"><div class="w-seg wc-cm-mode">${Object.keys(MODES).map(m => `<button data-m="${m}">${MODES[m]}</button>`).join('')}</div></div>
      <div class="wc-cm-ctl"></div>
      <div class="wc-stage"></div>
      <div class="wc-cm-info"></div>
      <div class="wc-log wc-cm-log"></div>
    </div>`;
    const ctl = $(body, '.wc-cm-ctl'), stage = $(body, '.wc-stage'), info = $(body, '.wc-cm-info'), logEl = $(body, '.wc-cm-log');
    const log = LogBox(logEl, 80);
    let cur = null;
    const stopLoop = RosUI.loop(body, dt => { if (cur && cur.tick) cur.tick(dt); });
    const offW = onWidth(body, () => cur && cur.relayout && cur.relayout());
    function setMode(m) {
      if (cur) { try { cur.cleanup(); } catch (e) { console.error(e); } }
      mode = m;
      $$(body, '.wc-cm-mode button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
      ctl.innerHTML = ''; stage.innerHTML = ''; info.innerHTML = ''; log.clear();
      const env = { body, owner, ctl, stage, info, log };
      cur = m === 'topic' ? commTopic(env) : m === 'service' ? commService(env) : commAction(env);
    }
    $$(body, '.wc-cm-mode button').forEach(b => b.onclick = () => b.dataset.m !== mode && setMode(b.dataset.m));
    setMode(mode);
    return () => { stopLoop(); offW(); if (cur) cur.cleanup(); };
  }

  /* ---------------------------------------------- 토픽 */
  function commTopic(env) {
    const { body, owner, ctl, stage, info, log } = env;
    const TOPIC = '/demo_topic', TYPE = 'std_msgs/msg/String';
    const pubs = [], subs = [];
    let rate = 1, paused = false, svg, flyer, L = null, hub = null;
    ctl.innerHTML = `<div class="w-row">
        <div class="w-btns">
          <button class="btn small" data-a="p+">＋ 퍼블리셔</button><button class="btn small ghost" data-a="p-">－</button>
          <button class="btn small" data-a="s+">＋ 서브스크라이버</button><button class="btn small ghost" data-a="s-">－</button>
          <button class="btn small ghost" data-a="pause">⏸ 일시정지</button>
        </div>
        <label class="wc-slider">발행 주기 <input type="range" min="0.5" max="5" step="0.5" value="${rate}" data-a="rate"> <b class="w-out">${rate.toFixed(1)} Hz</b></label>
      </div>`;
    const offPub = ROS.on('pub', (topic, msg, pub) => {
      if (topic !== TOPIC || !L) return;
      const p = pubs.find(x => x.pub === pub);
      const from = p ? p.box : null;
      const a = from ? L.pubOut(from) : [hub.cx, -12];
      flyer.add({ pts: [a, L.hubIn()], dur: 0.55, cls: 's-blue', r: 7, fade: !subs.length && !(ROS.topic(TOPIC) || { subs: [] }).subs.length });
      if (p) { p.flash = 0.4; }
      if (!ROS.topic(TOPIC).subs.length) hub.flash = 0.6;
    });
    const offG = ROS.on('graph', () => updInfo());
    function mkPub() {
      const name = uniqName('demo_pub');
      const node = ROS.createNode(name, { owner, pkg: 'demo_widgets', exe: 'demo_pub' });
      const p = { node, name, pub: node.createPublisher(TYPE, TOPIC, 10), sent: 0, timer: null, flash: 0 };
      pubs.push(p); restartTimer(p);
      node.info(`퍼블리셔 시작: ${TOPIC}`);
      return p;
    }
    function restartTimer(p) {
      if (p.timer) p.timer.cancel();
      p.timer = p.node.createTimer(1 / rate, () => {
        if (paused) return;
        const data = `Hello ROS 2 from ${p.name}: ${++p.sent}`;
        p.pub.publish({ data });
      });
    }
    function mkSub() {
      const name = uniqName('demo_sub_' + (subs.length + 1));
      const node = ROS.createNode(name, { owner, pkg: 'demo_widgets', exe: 'demo_sub' });
      const s = { node, name, got: 0, shown: 0, last: '', flash: 0 };
      s.sub = node.createSubscription(TYPE, TOPIC, msg => {
        s.got++;
        if (!L || !s.box) { s.shown++; return; }
        flyer.add({ pts: [L.hubOut(), L.subIn(s.box)], dur: 0.55, delay: 0.5, cls: 's-teal', r: 7, onDone: () => { s.shown++; s.last = msg.data; s.flash = 0.4; } });
      }, 10);
      subs.push(s);
      return s;
    }
    function drop(list) { const x = list.pop(); if (x) { if (x.timer) x.timer.cancel(); x.node.destroy(); } }
    ctl.onclick = e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'p+' && pubs.length < 4) mkPub();
      else if (k === 'p-') drop(pubs);
      else if (k === 's+' && subs.length < 6) mkSub();
      else if (k === 's-') drop(subs);
      else if (k === 'pause') { paused = !paused; a.textContent = paused ? '▶ 다시 발행' : '⏸ 일시정지'; }
      else return;
      layout();
    };
    $(ctl, '[data-a=rate]').oninput = e => { rate = +e.target.value; e.target.nextElementSibling.textContent = rate.toFixed(1) + ' Hz'; pubs.forEach(restartTimer); };

    function layout() {
      stage.innerHTML = '';
      const narrow = isNarrow(body);
      svg = newSvg(stage, 'wc-cm-svg'); defs(svg);
      const lines = S('g', null, svg), boxes = S('g', null, svg), fl = S('g', null, svg);
      flyer = Flyer(fl);
      const np = Math.max(1, pubs.length), ns = Math.max(1, subs.length);
      let W, H;
      if (!narrow) {
        W = 800; H = Math.max(240, Math.max(np, ns) * 64 + 40);
        const col = (n, i) => H / 2 + (i - (n - 1) / 2) * 64;
        pubs.forEach((p, i) => { p.box = { x: 16, y: col(np, i) - 26, w: 200, h: 52 }; });
        subs.forEach((s, i) => { s.box = { x: 584, y: col(ns, i) - 26, w: 200, h: 52 }; });
        hub = { x: 318, y: H / 2 - 38, w: 164, h: 76 };
        L = { pubOut: b => [b.x + b.w, b.y + b.h / 2], hubIn: () => [hub.x, hub.y + hub.h / 2], hubOut: () => [hub.x + hub.w, hub.y + hub.h / 2], subIn: b => [b.x, b.y + b.h / 2] };
      } else {
        W = 400;
        const rows = Math.ceil(subs.length / 2) || 1;
        H = 90 + 130 + rows * 66 + 20;
        const rowX = (n, i, bw) => (W - n * bw - (n - 1) * 10) / 2 + i * (bw + 10);
        const pbw = pubs.length > 2 ? 120 : 175;
        pubs.forEach((p, i) => { p.box = { x: rowX(Math.min(pubs.length, 3), i % 3, pbw), y: 10 + Math.floor(i / 3) * 60, w: pbw, h: 52 }; });
        hub = { x: 110, y: 130, w: 180, h: 66 };
        subs.forEach((s, i) => { const r = Math.floor(i / 2), n = Math.min(2, subs.length - r * 2); s.box = { x: rowX(n, i % 2, 180), y: 250 + r * 66, w: 180, h: 52 }; });
        L = { pubOut: b => [b.x + b.w / 2, b.y + b.h], hubIn: () => [hub.x + hub.w / 2, hub.y], hubOut: () => [hub.x + hub.w / 2, hub.y + hub.h], subIn: b => [b.x + b.w / 2, b.y] };
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      hub.cx = hub.x + hub.w / 2;
      pubs.forEach(p => { const [x1, y1] = L.pubOut(p.box), [x2, y2] = L.hubIn(); arrowLine(lines, svg, x1, y1, x2, y2, 'ln-blue', 'blue'); p.b = box(boxes, p.box.x, p.box.y, p.box.w, p.box.h, 'blue', '/' + p.name, '', { gcls: 'wc-cm-n' }); });
      subs.forEach(s => { const [x1, y1] = L.hubOut(), [x2, y2] = L.subIn(s.box); arrowLine(lines, svg, x1, y1, x2, y2, 'ln-teal', 'teal'); s.b = box(boxes, s.box.x, s.box.y, s.box.w, s.box.h, 'teal', '/' + s.name, '', { gcls: 'wc-cm-n' }); });
      hub.b = box(boxes, hub.x, hub.y, hub.w, hub.h, 'orange', TOPIC, 'std_msgs/msg/String', { rx: 6, t1cls: 't-mono' });
      hub.t3 = S('text', { x: hub.cx, y: hub.y + hub.h + 14, class: 't-c t-xs t-mu' }, boxes, '');
      if (!pubs.length) S('text', { x: narrow ? W / 2 : 110, y: narrow ? 40 : H / 2, class: 't-c t-sm t-mu' }, boxes, '퍼블리셔 없음');
      if (!subs.length) S('text', { x: narrow ? W / 2 : 690, y: narrow ? 280 : H / 2, class: 't-c t-sm t-mu' }, boxes, '구독자 없음 → 메시지는 버려집니다');
      updInfo();
    }
    function updInfo() {
      const t = ROS.topic(TOPIC) || { pubs: [], subs: [] };
      const ext = t.subs.length - subs.length, extP = t.pubs.length - pubs.length;
      let tip;
      if (!pubs.length) tip = '퍼블리셔가 없으면 토픽에 아무것도 흐르지 않습니다. 구독자는 조용히 기다립니다.';
      else if (!subs.length && ext <= 0) tip = '💡 구독자가 없어도 퍼블리셔는 <b>계속 발행</b>합니다. 받는 쪽이 있는지 신경 쓰지 않는 <b>fire-and-forget</b> 방식이라, 메시지는 토픽까지 갔다가 그냥 사라집니다.';
      else if (pubs.length > 1) tip = '💡 한 토픽에 퍼블리셔 여러 개 · 구독자 여러 개가 붙을 수 있습니다 (<b>N:M</b>). 구독자는 누가 보냈는지 모르고 신경 쓰지도 않습니다.';
      else tip = '💡 메시지 하나가 <b>모든 구독자에게 각각 복사되어</b> 전달됩니다 (<b>1:N</b>). 퍼블리셔는 구독자가 몇 명인지 몰라도 됩니다.';
      if (hub && hub.t3) hub.t3.textContent = `퍼블리셔 ${t.pubs.length} · 구독 ${t.subs.length}${ext > 0 ? ` (외부 ${ext})` : ''}`;
      info.innerHTML = `<div class="wc-note">${tip}</div>
        <div class="wc-term"><div class="wc-cmd">$ ros2 topic info ${TOPIC}</div>Type: ${TYPE}
Publisher count: ${t.pubs.length}
Subscription count: ${t.subs.length}</div>
        <div class="w-help">터미널에서 <code>ros2 topic echo ${TOPIC}</code> 를 치면 여기서 오가는 메시지가 보이고, 구독자(외부)가 하나 늘어납니다. ${extP > 0 ? `<br>외부 퍼블리셔 ${extP}개가 이 토픽에 발행 중입니다 (위에서 떨어지는 점).` : ''}</div>`;
    }
    mkPub(); mkSub(); mkSub();
    layout();
    log.add(`[INFO] 노드 ${pubs.map(p => '/' + p.name).concat(subs.map(s => '/' + s.name)).join(', ')} 를 WebROS 에 만들었습니다. rqt_graph · ros2 node list 에서도 보입니다.`);
    return {
      relayout: layout,
      tick(dt) {
        if (!flyer) return;
        flyer.tick(dt);
        pubs.forEach(p => { if (p.b) { p.b.t2.textContent = `보냄 ${p.sent}${p.flash > 0 ? ' ●' : ''}`; p.b.g.classList.toggle('wc-flash', p.flash > 0); p.flash -= dt; } });
        subs.forEach(s => { if (s.b) { s.b.t2.textContent = `받음 ${s.shown}${s.last ? ' · #' + s.last.split(': ').pop() : ''}`; s.b.g.classList.toggle('wc-flash', s.flash > 0); s.flash -= dt; } });
        if (hub && hub.b) { hub.b.g.classList.toggle('wc-drop', hub.flash > 0); hub.flash = (hub.flash || 0) - dt; }
      },
      cleanup() { offPub(); offG(); pubs.forEach(p => p.node.destroy()); subs.forEach(s => s.node.destroy()); }
    };
  }

  /* ---------------------------------------------- 서비스 */
  function commService(env) {
    const { body, owner, ctl, stage, info, log } = env;
    const SRV = '/add_two_ints', TYPE = 'example_interfaces/srv/AddTwoInts';
    const clients = [];
    let server = null, procTime = 0.8, chain = Promise.resolve(), queue = 0, busy = null, svg, flyer, L, sbox;
    ctl.innerHTML = `<div class="w-row">
        <label>a <input class="w-in wc-num" type="number" value="2" data-k="a"></label>
        <label>b <input class="w-in wc-num" type="number" value="3" data-k="b"></label>
        <button class="btn small primary" data-a="send">📤 요청 보내기</button>
        <button class="btn small" data-a="all">모든 클라이언트가 동시에</button>
      </div>
      <div class="w-row">
        <div class="w-btns"><button class="btn small" data-a="c+">＋ 클라이언트</button><button class="btn small ghost" data-a="c-">－</button>
        <button class="btn small" data-a="srv">🔌 서버 끄기</button></div>
        <label class="wc-slider">서버 처리 시간 <input type="range" min="0" max="2.5" step="0.1" value="${procTime}" data-a="proc"> <b class="w-out">${procTime.toFixed(1)} s</b></label>
      </div>`;
    function startServer() {
      const node = ROS.createNode(uniqName('add_two_ints_server'), { owner, pkg: 'demo_nodes_py', exe: 'add_two_ints_server', out: l => log.add(l) });
      server = { node, done: 0 };
      server.srv = node.createService(TYPE, 'add_two_ints', (req, res) => {
        queue++;
        const p = chain.then(async () => {
          queue--; busy = req;
          node.info(`Incoming request\na: ${req.a} b: ${req.b}`);
          await sleep(procTime * 1000);
          res.sum = req.a + req.b; busy = null; server.done++;
          return res;
        });
        chain = p.catch(() => {});
        return p;
      });
    }
    function stopServer() { if (server) { server.node.destroy(); server = null; chain = Promise.resolve(); queue = 0; busy = null; } }
    function mkClient() {
      const name = uniqName('add_two_ints_client' + (clients.length ? '_' + (clients.length + 1) : ''));
      const node = ROS.createNode(name, { owner, pkg: 'demo_nodes_py', exe: 'add_two_ints_client', out: l => log.add(l) });
      const c = { node, name, cli: node.createClient(TYPE, 'add_two_ints'), state: 'idle', text: '대기' };
      clients.push(c);
    }
    async function send(c) {
      if (c.state === 'waiting' || c.state === 'nosrv') return;
      const a = Math.trunc(+$(ctl, '[data-k=a]').value || 0), b = Math.trunc(+$(ctl, '[data-k=b]').value || 0);
      if (!c.cli.isReady()) {
        c.state = 'nosrv'; c.text = '⏳ 서비스 기다리는 중…';
        while (!(await c.cli.waitForService(1))) { if (!c.node.alive) return; c.node.info('service not available, waiting again...'); }
        if (!c.node.alive) return;
      }
      c.state = 'waiting'; c.text = `⏳ ${a} + ${b} = ? (응답 기다림)`;
      flyer.add({ pts: [L.req(c.box), L.srvIn(c.box)], dur: 0.6, cls: 's-orange', label: `a=${a}, b=${b}`, lcls: 't-orange', onDone: () => {
        c.cli.call({ a, b }).then(r => {
          if (!L) return;
          flyer.add({ pts: [L.srvOut(c.box), L.res(c.box)], dur: 0.6, cls: 's-green', label: `sum=${r.sum}`, lcls: 't-green', onDone: () => {
            c.state = 'idle'; c.text = `✔ ${a} + ${b} = ${r.sum}`; c.flash = 0.5;
            c.node.info(`Result of add_two_ints: for ${a} + ${b} = ${r.sum}`);
          } });
        }).catch(e => { c.state = 'idle'; c.text = '✘ ' + e.message; c.node.error(e.message); });
      } });
    }
    ctl.onclick = e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'send') send(clients[0]);
      else if (k === 'all') clients.forEach(send);
      else if (k === 'c+' && clients.length < 4) { mkClient(); layout(); }
      else if (k === 'c-' && clients.length > 1) { clients.pop().node.destroy(); layout(); }
      else if (k === 'srv') { if (server) stopServer(); else startServer(); a.textContent = server ? '🔌 서버 끄기' : '🔌 서버 켜기'; layout(); }
    };
    $(ctl, '[data-a=proc]').oninput = e => { procTime = +e.target.value; e.target.nextElementSibling.textContent = procTime.toFixed(1) + ' s'; };
    const offCall = ROS.on('srvcall', (name, req, from) => {
      if (name !== SRV || !L || clients.some(c => c.node === from)) return;
      flyer.add({ pts: [[sbox.x + sbox.w / 2, -10], [sbox.x + sbox.w / 2, sbox.y]], dur: 0.5, cls: 's-orange', label: `외부 요청 a=${req.a}, b=${req.b}`, lcls: 't-orange' });
    });
    function layout() {
      stage.innerHTML = '';
      const narrow = isNarrow(body);
      svg = newSvg(stage, 'wc-cm-svg'); defs(svg);
      const lines = S('g', null, svg), boxes = S('g', null, svg);
      flyer = Flyer(S('g', null, svg));
      const n = clients.length;
      let W, H;
      if (!narrow) {
        W = 800; H = Math.max(230, n * 72 + 40);
        clients.forEach((c, i) => { c.box = { x: 16, y: H / 2 + (i - (n - 1) / 2) * 72 - 28, w: 230, h: 56 }; });
        sbox = { x: 560, y: H / 2 - 50, w: 224, h: 100 };
        L = {
          req: b => [b.x + b.w, b.y + b.h / 2 - 9], srvIn: b => [sbox.x, sbox.y + sbox.h / 2 - 9 + (b.y + b.h / 2 - H / 2) * 0.3],
          srvOut: b => [sbox.x, sbox.y + sbox.h / 2 + 9 + (b.y + b.h / 2 - H / 2) * 0.3], res: b => [b.x + b.w, b.y + b.h / 2 + 9]
        };
      } else {
        W = 400; H = 330;
        const bw = n > 2 ? 90 : 170;
        clients.forEach((c, i) => { c.box = { x: (W - n * bw - (n - 1) * 8) / 2 + i * (bw + 8), y: 10, w: bw, h: 64 }; });
        sbox = { x: 100, y: 220, w: 200, h: 96 };
        L = {
          req: b => [b.x + b.w / 2 - 12, b.y + b.h], srvIn: b => [sbox.x + sbox.w / 2 - 12 + (b.x + b.w / 2 - W / 2) * 0.4, sbox.y],
          srvOut: b => [sbox.x + sbox.w / 2 + 12 + (b.x + b.w / 2 - W / 2) * 0.4, sbox.y], res: b => [b.x + b.w / 2 + 12, b.y + b.h]
        };
      }
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      clients.forEach(c => {
        const r1 = L.req(c.box), r2 = L.srvIn(c.box), s1 = L.srvOut(c.box), s2 = L.res(c.box);
        arrowLine(lines, svg, r1[0], r1[1], r2[0], r2[1], 'ln-orange', 'orange');
        arrowLine(lines, svg, s1[0], s1[1], s2[0], s2[1], 'ln-green dash', 'green');
        c.b = box(boxes, c.box.x, c.box.y, c.box.w, c.box.h, 'purple', '/' + c.name, '', { gcls: 'wc-cm-n' });
      });
      sbox.b = box(boxes, sbox.x, sbox.y, sbox.w, sbox.h, server ? 'blue' : 'gray dash', server ? '/' + server.node.name : '(서버 없음)', '', { gcls: 'wc-cm-n' });
      sbox.t3 = S('text', { x: sbox.x + sbox.w / 2, y: sbox.y + sbox.h / 2 + 30, class: 't-c t-xs t-mu' }, boxes, '');
      S('text', { x: sbox.x + sbox.w / 2, y: sbox.y - 12, class: 't-c t-xs t-mono t-mu' }, boxes, `${SRV}  (AddTwoInts)`);
      info.innerHTML = `<div class="wc-note">💡 서비스는 <b>요청 1번 → 응답 1번</b>입니다. 서버는 하나, 클라이언트는 여럿일 수 있고, 서버는 요청을 받은 순서대로 처리합니다(단일 스레드 실행기). 서버가 없으면 클라이언트는 <code>wait_for_service()</code> 에서 <i>service not available, waiting again...</i> 을 찍으며 기다립니다.</div>
        <div class="wc-term"><div class="wc-cmd">$ ros2 service call ${SRV} ${TYPE} "{a: 2, b: 3}"</div>requester: making request: example_interfaces.srv.AddTwoInts_Request(a=2, b=3)

response:
example_interfaces.srv.AddTwoInts_Response(sum=5)</div>`;
    }
    startServer(); mkClient(); mkClient();
    layout();
    return {
      relayout: layout,
      tick(dt) {
        if (!flyer) return;
        flyer.tick(dt);
        clients.forEach(c => { if (c.b) { c.b.t2.textContent = c.text; c.b.g.classList.toggle('wc-wait', c.state !== 'idle'); c.b.g.classList.toggle('wc-flash', c.flash > 0); c.flash = (c.flash || 0) - dt; } });
        if (sbox && sbox.b) {
          sbox.b.t2.textContent = server ? (busy ? `⚙ 처리 중: ${busy.a} + ${busy.b}` : '요청 기다리는 중') : '클라이언트는 무한히 기다립니다';
          sbox.t3.textContent = server ? `대기열 ${Math.max(0, queue)} · 처리 완료 ${server.done}` : '';
          sbox.b.g.classList.toggle('wc-busy', !!busy);
        }
      },
      cleanup() { offCall(); stopServer(); clients.forEach(c => c.node.destroy()); L = null; }
    };
  }

  /* ---------------------------------------------- 액션 */
  function commAction(env) {
    const { body, owner, ctl, stage, info, log } = env;
    const ACT = '/fibonacci', TYPE = 'action_tutorials_interfaces/action/Fibonacci';
    const ST = ROS.STATUS, STN = ['UNKNOWN', 'ACCEPTED', 'EXECUTING', 'CANCELING', 'SUCCEEDED', 'CANCELED', 'ABORTED'];
    let stepMs = 700, svg, flyer, L = null, goal = null, status = '—', fb = [], result = null, parked = false;
    ctl.innerHTML = `<div class="w-row">
        <label>order <input class="w-in wc-num" type="number" min="1" max="25" value="8" data-k="order"></label>
        <button class="btn small primary" data-a="send">🎯 목표 보내기</button>
        <button class="btn small" data-a="cancel" disabled>✋ 취소</button>
        <label class="wc-slider">한 단계 시간 <input type="range" min="200" max="1500" step="100" value="${stepMs}" data-a="step"> <b class="w-out">${stepMs} ms</b></label>
      </div>`;
    const snode = ROS.createNode(uniqName('fibonacci_action_server'), { owner, pkg: 'action_tutorials_py', exe: 'fibonacci_action_server', out: l => log.add(l) });
    snode.createActionServer(TYPE, 'fibonacci', {
      async execute(gh) {
        snode.info('Executing goal...');
        const seq = [0, 1];
        for (let i = 1; i < gh.request.order; i++) {
          if (gh.isCancelRequested) { snode.info('Goal canceled'); gh.canceled({ sequence: seq }); return; }
          seq.push(seq[i] + seq[i - 1]);
          snode.info(`Feedback: [${seq.join(', ')}]`);
          gh.publishFeedback({ partial_sequence: seq.slice() });
          await sleep(stepMs);
          if (!snode.alive) return;
        }
        if (gh.isCancelRequested) { gh.canceled({ sequence: seq }); return; }
        snode.info('Goal succeeded');
        return { sequence: seq };
      }
    });
    const cnode = ROS.createNode(uniqName('fibonacci_action_client'), { owner, pkg: 'action_tutorials_py', exe: 'fibonacci_action_client', out: l => log.add(l) });
    const ac = cnode.createActionClient(TYPE, 'fibonacci');
    const btnSend = $(ctl, '[data-a=send]'), btnCancel = $(ctl, '[data-a=cancel]');
    $(ctl, '[data-a=step]').oninput = e => { stepMs = +e.target.value; e.target.nextElementSibling.textContent = stepMs + ' ms'; };
    function fly(lane, dir, label, cls, onDone) {
      if (!L) return;
      const y = L.lanes[lane];
      const pts = dir > 0 ? [[L.x1, y], [L.x2, y]] : [[L.x2, y], [L.x1, y]];
      flyer.add({ pts, dur: 0.6, cls: cls || (dir > 0 ? 's-orange' : 's-green'), label, lcls: dir > 0 ? 't-orange' : 't-green', onDone });
    }
    function setStatus(s) { status = s; fly('status', -1, s, 's-purple'); }
    const offGoal = ROS.on('agoal', (name, req, from) => {
      if (name !== ACT) return;
      if (from !== cnode) fly('send_goal', 1, `외부 목표 order=${req.order}`);
      setTimeout(() => setStatus('ACCEPTED'), 250);
      setTimeout(() => setStatus('EXECUTING'), 700);
    });
    const offFb = ROS.on('afb', (name, f) => { if (name === ACT) fly('feedback', -1, `[${f.partial_sequence.slice(-3).join(', ')}]`, 's-teal', () => { fb = f.partial_sequence.slice(); }); });
    const offRes = ROS.on('aresult', (name, st, r) => {
      if (name !== ACT) return;
      setTimeout(() => setStatus(STN[st]), 100);
    });
    btnSend.onclick = async () => {
      if (goal) return;
      const order = clamp(Math.trunc(+$(ctl, '[data-k=order]').value || 5), 1, 25);
      fb = []; result = null; status = '—'; btnSend.disabled = true;
      fly('send_goal', 1, `goal: order=${order}`, null, async () => {
        let g;
        try { g = await ac.sendGoal({ order }, {}); } catch (e) { cnode.error(e.message); btnSend.disabled = false; return; }
        goal = g;
        fly('send_goal', -1, 'accepted: true', null, () => {
          cnode.info('Goal accepted :)');
          btnCancel.disabled = false;
          fly('get_result', 1, 'get_result 요청', null, () => { parked = true; });
        });
        g.result.then(r => {
          const done = () => fly('get_result', -1, `${STN[r.status]} [${r.result.sequence.length}개]`, null, () => {
            parked = false; result = r; goal = null; btnSend.disabled = false; btnCancel.disabled = true;
            cnode.info(`Result: [${r.result.sequence.join(', ')}]  (status ${STN[r.status]})`);
          });
          if (parked) done(); else setTimeout(done, 700);
        });
      });
    };
    btnCancel.onclick = () => {
      if (!goal) return;
      btnCancel.disabled = true;
      fly('cancel_goal', 1, 'cancel 요청', null, () => {
        goal.cancel().then(ok => { fly('cancel_goal', -1, ok ? 'ERROR_NONE (수락)' : 'REJECTED', null); if (ok) setStatus('CANCELING'); cnode.info(ok ? 'Goal successfully canceled' : 'Goal failed to cancel'); });
      });
    };
    function layout() {
      stage.innerHTML = '';
      const narrow = isNarrow(body);
      svg = newSvg(stage, 'wc-cm-svg'); defs(svg);
      const g0 = S('g', null, svg);
      flyer = Flyer(S('g', null, svg));
      const W = narrow ? 420 : 800, H = 330;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const bw = narrow ? 92 : 170;
      const cb = box(g0, 8, 30, bw, H - 60, 'purple', '클라이언트', '', { t1cls: 't-sm' });
      const sb = box(g0, W - bw - 8, 30, bw, H - 60, 'blue', '서버', '', { t1cls: 't-sm' });
      cb.t1.setAttribute('y', 50); sb.t1.setAttribute('y', 50);
      S('text', { x: cb.cx, y: 70, class: 't-c t-xs t-mono t-mu' }, g0, narrow ? '' : '/' + cnode.name);
      S('text', { x: sb.cx, y: 70, class: 't-c t-xs t-mono t-mu' }, g0, narrow ? '' : '/' + snode.name);
      L = { x1: 8 + bw, x2: W - bw - 8, lanes: {} };
      const lanes = [['send_goal', '서비스', 'orange'], ['cancel_goal', '서비스', 'orange'], ['get_result', '서비스', 'orange'], ['feedback', '토픽', 'teal'], ['status', '토픽', 'purple']];
      lanes.forEach(([n, k, c], i) => {
        const y = 100 + i * 44 + (i >= 3 ? 12 : 0);
        L.lanes[n] = y;
        if (k === '서비스') { line(g0, L.x1, y, L.x2, y, 'ln-' + c); }
        else arrowLine(g0, svg, L.x2, y, L.x1 + 4, y, 'ln-' + (c === 'purple' ? 'purple' : 'teal') + ' dash', c);
        S('text', { x: (L.x1 + L.x2) / 2, y: y - 9, class: 't-c t-xs t-b t-mono' }, g0, `${ACT}/_action/${n}`);
        S('text', { x: (L.x1 + L.x2) / 2, y: y + 11, class: 't-c t-xs t-mu' }, g0, k === '서비스' ? (n === 'send_goal' ? '서비스: 목표 보내기 ↔ 수락 여부' : n === 'cancel_goal' ? '서비스: 취소 요청 ↔ 결과' : '서비스: 결과 요청 → (끝나면) 결과') : (n === 'feedback' ? '토픽: 진행 상황(피드백) 흐름' : '토픽: 목표 상태 변화'));
      });
      S('text', { x: W / 2, y: 16, class: 't-c t-sm t-b' }, g0, `액션 ${ACT} = 서비스 3개 + 토픽 2개`);
      L.park = S('circle', { r: 7, class: 's-orange wc-park', cx: L.x2 - 12, cy: L.lanes.get_result }, g0);
      L.stT = S('text', { x: cb.cx, y: H - 90, class: 't-c t-xs t-b t-purple' }, g0, '');
      L.fbT = S('text', { x: cb.cx, y: H - 70, class: 't-c t-xs t-teal' }, g0, '');
      L.rT = S('text', { x: cb.cx, y: H - 50, class: 't-c t-xs t-green t-b' }, g0, '');
      info.innerHTML = `<div class="wc-note">💡 액션 = <b>오래 걸리는 일</b>을 맡기는 방법입니다. ① 목표(goal)를 보내면 서버가 수락/거절하고 ② 진행 중에는 <b>피드백</b>이 흐르며 ③ 끝나면 <b>결과</b>를 받습니다. 도중에 <b>취소</b>할 수도 있습니다. 내부는 숨겨진 서비스 3개(send_goal · cancel_goal · get_result)와 토픽 2개(feedback · status)로 이루어져 있습니다.</div>
        <div class="wc-term"><div class="wc-cmd">$ ros2 action send_goal ${ACT} ${TYPE} "{order: 5}" --feedback</div><div class="wc-cmd">$ ros2 action info ${ACT}</div><div class="wc-cmd">$ ros2 topic list --include-hidden-topics</div>…
${ACT}/_action/feedback
${ACT}/_action/status</div>`;
    }
    layout();
    return {
      relayout: layout,
      tick(dt) {
        if (!flyer || !L) return;
        flyer.tick(dt);
        L.park.style.display = parked ? '' : 'none';
        L.stT.textContent = '상태: ' + status;
        L.fbT.textContent = fb.length ? 'fb: ' + fb.slice(-4).join(', ') : '';
        L.rT.textContent = result ? `결과 ${result.result.sequence.length}개 ✔` : '';
      },
      cleanup() { offGoal(); offFb(); offRes(); L = null; if (goal) goal.cancel(); snode.destroy(); cnode.destroy(); }
    };
  }
  mount('comm', '📡', 'ROS 2 통신 방식: 토픽 · 서비스 · 액션', commView);


  /* ==================================================================
     2) qos — QoS 실험실 (자체 시뮬레이션, 호환성 규칙은 ROS.qosCompat)
     ================================================================== */
  const QOS_PRESETS = {
    default: { label: '기본 (default)', pub: { reliability: 'reliable', durability: 'volatile', history: 'keep_last', depth: 10 }, sub: { reliability: 'reliable', durability: 'volatile', history: 'keep_last', depth: 10 }, loss: 10, latency: 80, rate: 5, proc: 50,
      note: '<code>rclpy.qos.qos_profile_default</code> 와 같습니다: RELIABLE · VOLATILE · KEEP_LAST(10). 손실이 있어도 재전송(ACK/NACK)으로 메우므로 모두 도착합니다.' },
    sensor: { label: '센서 (sensor_data)', pub: { reliability: 'best_effort', durability: 'volatile', history: 'keep_last', depth: 5 }, sub: { reliability: 'best_effort', durability: 'volatile', history: 'keep_last', depth: 5 }, loss: 15, latency: 40, rate: 15, proc: 20,
      note: '<code>qos_profile_sensor_data</code>: BEST_EFFORT · VOLATILE · KEEP_LAST(5). 카메라·라이다처럼 <b>최신 값이 중요</b>한 데이터는 잃어버린 것을 다시 보내느라 늦어지는 것보다 그냥 다음 것을 받는 편이 낫습니다.' },
    map: { label: '지도 (/map)', pub: { reliability: 'reliable', durability: 'transient_local', history: 'keep_last', depth: 1 }, sub: { reliability: 'reliable', durability: 'transient_local', history: 'keep_last', depth: 1 }, loss: 0, latency: 80, rate: 2, proc: 50, late: 6,
      note: '지도 서버(nav2 map_server)는 /map 을 <b>TRANSIENT_LOCAL · KEEP_LAST(1)</b> 로 한 번만 발행합니다. 나중에 켠 RViz 도 마지막 지도를 바로 받습니다("래치(latched)" 동작).' },
    tf_static: { label: '/tf_static', pub: { reliability: 'reliable', durability: 'transient_local', history: 'keep_last', depth: 100 }, sub: { reliability: 'reliable', durability: 'transient_local', history: 'keep_last', depth: 100 }, loss: 5, latency: 60, rate: 4, proc: 20, late: 8,
      note: '<code>/tf_static</code> 은 RELIABLE · TRANSIENT_LOCAL · KEEP_LAST(100) (tf2_ros 의 StaticBroadcasterQoS). 고정된 변환을 늦게 켠 노드도 모두 받습니다.' },
    mismatch: { label: '⚠ 호환 안 됨', pub: { reliability: 'best_effort', durability: 'volatile', history: 'keep_last', depth: 10 }, sub: { reliability: 'reliable', durability: 'volatile', history: 'keep_last', depth: 10 }, loss: 0, latency: 80, rate: 5, proc: 50,
      note: '발행자가 BEST_EFFORT 인데 구독자가 RELIABLE 을 <b>요구</b>하면 연결되지 않습니다. 구독자는 "제공(offered) ≥ 요구(requested)" 일 때만 연결됩니다.' },
    slow: { label: '🐢 느린 구독자', pub: { reliability: 'reliable', durability: 'volatile', history: 'keep_last', depth: 10 }, sub: { reliability: 'reliable', durability: 'volatile', history: 'keep_last', depth: 3 }, loss: 0, latency: 50, rate: 10, proc: 250,
      note: '구독 콜백이 발행보다 느리면 구독 큐(depth 3)가 넘쳐 <b>오래된 메시지부터 덮어써집니다</b>. RELIABLE 이어도 KEEP_LAST 큐가 작으면 받지 못하는 메시지가 생깁니다. depth 를 키우거나 KEEP_ALL 로 바꿔 보세요.' }
  };
  function qosView(body, o) {
    let P = JSON.parse(JSON.stringify(QOS_PRESETS[o.preset] || QOS_PRESETS.default));
    let presetKey = QOS_PRESETS[o.preset] ? o.preset : 'default';
    body.innerHTML = `<div class="wc-q">
      <div class="w-row wc-q-presets"><span class="small muted">프리셋</span><div class="w-seg">${Object.keys(QOS_PRESETS).map(k => `<button data-p="${k}">${QOS_PRESETS[k].label}</button>`).join('')}</div></div>
      <div class="wc-q-cfg">
        <div class="wc-card wc-q-side" data-side="pub"><div class="wc-card-h">📤 퍼블리셔 QoS <small>(제공 offered)</small></div></div>
        <div class="wc-card wc-q-side" data-side="sub"><div class="wc-card-h">📥 서브스크립션 QoS <small>(요구 requested)</small></div></div>
        <div class="wc-card wc-q-net"><div class="wc-card-h">🌐 네트워크 · 속도</div>
          <label class="wc-slider">손실률 <input type="range" min="0" max="60" step="5" data-n="loss"> <b class="w-out"></b></label>
          <label class="wc-slider">지연 <input type="range" min="10" max="500" step="10" data-n="latency"> <b class="w-out"></b></label>
          <label class="wc-slider">발행 주기 <input type="range" min="1" max="20" step="1" data-n="rate"> <b class="w-out"></b></label>
          <label class="wc-slider">구독 콜백 시간 <input type="range" min="0" max="600" step="10" data-n="proc"> <b class="w-out"></b></label>
        </div>
      </div>
      <div class="w-row">
        <button class="btn small" data-a="restart">⟲ 다시 시작</button>
        <button class="btn small" data-a="late">🕐 늦게 합류하는 구독자</button>
        <label class="small">합류 시점: <input class="w-in wc-num" type="number" min="1" max="40" value="8" data-a="lateN"> 번째 메시지 뒤</label>
        <button class="btn small ghost" data-a="pause">⏸</button>
      </div>
      <div class="wc-q-verdict"></div>
      <div class="wc-stage wc-q-stage"><canvas class="wc-q-cv"></canvas></div>
      <div class="wc-q-legend small"></div>
      <div class="wc-q-stats"></div>
      <div class="wc-note wc-q-note"></div>
      <details class="wc-det"><summary>호환성 표 · <code>ros2 topic info -v</code> · 파이썬 코드</summary><div class="wc-q-more"></div></details>
    </div>`;
    const cv = $(body, '.wc-q-cv');
    const sideHTML = side => `
      <label>Reliability <select class="w-in" data-s="${side}" data-k="reliability">${opt('reliable', 'RELIABLE')}${opt('best_effort', 'BEST_EFFORT')}</select></label>
      <label>Durability <select class="w-in" data-s="${side}" data-k="durability">${opt('volatile', 'VOLATILE')}${opt('transient_local', 'TRANSIENT_LOCAL')}</select></label>
      <label>History <select class="w-in" data-s="${side}" data-k="history">${opt('keep_last', 'KEEP_LAST')}${opt('keep_all', 'KEEP_ALL')}</select></label>
      <label>Depth <input class="w-in wc-num" type="number" min="1" max="100" data-s="${side}" data-k="depth"></label>`;
    $$(body, '.wc-q-side').forEach(el => el.insertAdjacentHTML('beforeend', sideHTML(el.dataset.side)));
    function syncForm() {
      $$(body, '[data-s]').forEach(el => { el.value = P[el.dataset.s][el.dataset.k]; if (el.dataset.k === 'depth') el.disabled = P[el.dataset.s].history === 'keep_all'; });
      const fmt = { loss: v => v + ' %', latency: v => v + ' ms', rate: v => v + ' Hz', proc: v => v + ' ms' };
      $$(body, '[data-n]').forEach(el => { el.value = P[el.dataset.n]; el.nextElementSibling.textContent = fmt[el.dataset.n](P[el.dataset.n]); });
      $$(body, '.wc-q-presets button').forEach(b => b.classList.toggle('on', b.dataset.p === presetKey));
    }
    $$(body, '[data-s]').forEach(el => el.onchange = () => {
      const s = P[el.dataset.s];
      s[el.dataset.k] = el.dataset.k === 'depth' ? clamp(Math.trunc(+el.value || 1), 1, 100) : el.value;
      presetKey = null; syncForm(); reset(false);
    });
    $$(body, '[data-n]').forEach(el => el.oninput = () => { P[el.dataset.n] = +el.value; presetKey = null; syncForm(); if (el.dataset.n === 'loss' || el.dataset.n === 'rate') updStatic(); });
    $$(body, '.wc-q-presets button').forEach(b => b.onclick = () => { presetKey = b.dataset.p; P = JSON.parse(JSON.stringify(QOS_PRESETS[presetKey])); if (P.late) $(body, '[data-a=lateN]').value = P.late; syncForm(); reset(!!P.late); });
    let paused = false;
    body.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'restart') reset(false);
      else if (a.dataset.a === 'late') reset(true);
      else if (a.dataset.a === 'pause') { paused = !paused; a.textContent = paused ? '▶' : '⏸'; }
    });

    /* ---------- 시뮬레이션 */
    let Sx;
    const HB = 100; // 하트비트/NACK 주기 (ms)
    function eff() {
      const pub = P.pub, sub = P.sub;
      const [ok, why] = ROS.qosCompat(pub, sub);
      return { ok, why, reliable: pub.reliability === 'reliable' && sub.reliability === 'reliable', latched: pub.durability === 'transient_local' && sub.durability === 'transient_local' };
    }
    function reset(late) {
      const n = late ? clamp(Math.trunc(+$(body, '[data-a=lateN]').value || 8), 1, 40) : 0;
      Sx = { t: 0, seq: 0, nextPub: 200, writer: [], flights: [], dead: [], queue: [], busy: null, recs: new Map(), joined: !late, joinAt: n, st: { pub: 0, recv: 0, lost: 0, over: 0, retx: 0, latSum: 0, latched: 0, before: 0 }, E: eff(), msg: '' };
      updStatic();
    }
    function rec(seq) { return Sx.recs.get(seq); }
    function send(seq, t, flags) {
      const lost = Math.random() * 100 < P.loss;
      Sx.flights.push({ seq, t0: t, t1: t + P.latency * (0.8 + Math.random() * 0.4), lost, retx: !!(flags && flags.retx), latched: !!(flags && flags.latched) });
      if (!(flags && flags.retx)) rec(seq).state = 'flight';
    }
    function step(dt) {
      const E = Sx.E;
      Sx.t += dt;
      const t = Sx.t;
      // 발행
      while (t >= Sx.nextPub) {
        const seq = ++Sx.seq;
        Sx.st.pub++;
        Sx.recs.set(seq, { seq, state: 'sent', pubT: Sx.nextPub });
        Sx.writer.push(seq);
        const wmax = P.pub.history === 'keep_all' ? 1000 : P.pub.depth;
        while (Sx.writer.length > wmax) Sx.writer.shift();
        if (!Sx.joined) { rec(seq).state = 'before'; Sx.st.before++; }
        else if (!E.ok) rec(seq).state = 'incompat';
        else send(seq, Sx.nextPub);
        if (!Sx.joined && seq >= Sx.joinAt) {
          Sx.joined = true; Sx.joinT = t;
          if (E.ok && E.latched) { Sx.writer.forEach(s => { rec(s).state = 'flight'; rec(s).latchedJoin = true; send(s, t, { latched: true }); }); Sx.msg = `구독자 합류! 퍼블리셔가 보관하던 최근 ${Sx.writer.length}개(depth)를 TRANSIENT_LOCAL 로 바로 받습니다.`; }
          else if (E.ok) Sx.msg = '구독자 합류! VOLATILE 이라 합류 전 메시지는 받지 못하고, 지금부터 받습니다.';
          else Sx.msg = '구독자가 합류했지만 QoS 가 호환되지 않아 연결되지 않습니다.';
        }
        Sx.nextPub += 1000 / P.rate;
      }
      // 네트워크
      for (let i = Sx.flights.length - 1; i >= 0; i--) {
        const f = Sx.flights[i];
        if (t < f.t1) continue;
        Sx.flights.splice(i, 1);
        const r = rec(f.seq); if (!r) continue;
        if (f.lost) {
          Sx.dead.push({ seq: f.seq, t, x: 0.5 + Math.random() * 0.3 });
          if (E.reliable) {
            Sx.st.retx++;
            // NACK 뒤 재전송: 그때 퍼블리셔 기록(history)에 아직 있어야 함
            setTimeoutSim(t + HB, () => {
              if (Sx.writer.includes(f.seq)) send(f.seq, Sx.t, { retx: true, latched: f.latched });
              else { r.state = 'gone'; Sx.st.lost++; }
            });
            r.state = 'retx';
          } else { r.state = 'lost'; Sx.st.lost++; }
          continue;
        }
        // 도착 → 구독 큐
        const qmax = P.sub.history === 'keep_all' ? 1000 : P.sub.depth;
        if (Sx.queue.length >= qmax) { const old = Sx.queue.shift(); rec(old).state = 'over'; Sx.st.over++; }
        Sx.queue.push(f.seq); r.state = 'queued'; r.latched = f.latched; r.arrT = t;
      }
      // 타이머(재전송)
      Sx.timers = (Sx.timers || []).filter(x => { if (t >= x.at) { x.fn(); return false; } return true; });
      // 콜백
      if (Sx.busy && t >= Sx.busy.end) {
        const r = rec(Sx.busy.seq); r.state = r.latched ? 'latched' : 'done';
        Sx.st.recv++; if (r.latched) Sx.st.latched++;
        Sx.st.latSum += t - r.pubT;
        Sx.busy = null;
      }
      if (!Sx.busy && Sx.queue.length) { const s = Sx.queue.shift(); Sx.busy = { seq: s, start: t, end: t + Math.max(1, P.proc) }; rec(s).state = 'proc'; }
    }
    function setTimeoutSim(at, fn) { (Sx.timers = Sx.timers || []).push({ at, fn }); }

    /* ---------- 그리기 */
    const STC = { done: 'green', latched: 'purple', lost: 'red', gone: 'red', over: 'orange', before: 'gray', incompat: 'gray', flight: 'blue', retx: 'yellow', queued: 'teal', proc: 'teal', sent: 'blue' };
    const STL = { done: '받음', latched: '받음(TRANSIENT_LOCAL)', lost: '잃어버림', gone: '재전송 불가(기록에서 밀려남)', over: '구독 큐에서 덮어써짐', before: '합류 전', incompat: '연결 안 됨', flight: '전송 중', retx: '재전송 대기' };
    $(body, '.wc-q-legend').innerHTML = Object.keys(STL).map(k => `<span class="wc-lg"><i class="wc-sw-${STC[k]}"></i>${STL[k]}</span>`).join('');
    function draw() {
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      const C = RosUI.colors();
      ctx.clearRect(0, 0, w, h);
      ctx.font = '12px ' + getComputedStyle(body).fontFamily;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const narrow = w < 520;
      const bw = narrow ? 92 : 150, top = 8, bh = h - 70;
      const px = 6, sx = w - bw - 6, nx1 = px + bw + 8, nx2 = sx - 8;
      const rr = (x, y, ww, hh, r, fill, stroke, dash) => { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, ww, hh, r) : ctx.rect(x, y, ww, hh); ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.setLineDash(dash || []); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]); } };
      // 퍼블리셔
      rr(px, top, bw, bh, 10, C.card2, C.blue);
      ctx.fillStyle = C.fg; ctx.font = 'bold 12.5px sans-serif'; ctx.fillText('퍼블리셔', px + bw / 2, top + 14);
      ctx.font = '11px sans-serif'; ctx.fillStyle = C.muted; ctx.fillText(`history ${P.pub.history === 'keep_all' ? 'KEEP_ALL' : 'depth ' + P.pub.depth}`, px + bw / 2, top + 30);
      cells(Sx.writer, px + 6, top + 42, bw - 12, bh - 50, C.blue, C);
      // 구독자
      const joined = Sx.joined;
      rr(sx, top, bw, bh, 10, C.card2, joined ? C.teal : C.gray, joined ? null : [5, 4]);
      ctx.fillStyle = C.fg; ctx.font = 'bold 12.5px sans-serif'; ctx.fillText('구독자', sx + bw / 2, top + 14);
      ctx.font = '11px sans-serif'; ctx.fillStyle = C.muted;
      if (!joined) { ctx.fillText('아직 없음', sx + bw / 2, top + 34); ctx.fillText(`#${Sx.joinAt} 뒤 합류`, sx + bw / 2, top + 50); }
      else {
        ctx.fillText(`큐 ${P.sub.history === 'keep_all' ? 'KEEP_ALL' : 'depth ' + P.sub.depth}`, sx + bw / 2, top + 30);
        cells(Sx.queue, sx + 6, top + 42, bw - 12, bh - 84, C.teal, C, P.sub.history === 'keep_all' ? 0 : P.sub.depth);
        // 콜백
        const by = top + bh - 36;
        rr(sx + 6, by, bw - 12, 28, 6, C.card, C.line);
        if (Sx.busy) {
          const p = clamp((Sx.t - Sx.busy.start) / (Sx.busy.end - Sx.busy.start), 0, 1);
          ctx.fillStyle = C.green; ctx.globalAlpha = 0.35; ctx.fillRect(sx + 7, by + 1, (bw - 14) * p, 26); ctx.globalAlpha = 1;
          ctx.fillStyle = C.fg; ctx.fillText(`콜백 #${Sx.busy.seq}`, sx + bw / 2, by + 14);
        } else { ctx.fillStyle = C.muted; ctx.fillText('콜백 쉬는 중', sx + bw / 2, by + 14); }
      }
      // 네트워크
      const ny = top + bh / 2;
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(nx1, ny); ctx.lineTo(nx2, ny); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.muted; ctx.font = '11px sans-serif';
      ctx.fillText(`네트워크 — 손실 ${P.loss}% · 지연 ${P.latency}ms · ${Sx.E.reliable ? 'RELIABLE (ACK/NACK 재전송)' : 'BEST_EFFORT (재전송 없음)'}`, (nx1 + nx2) / 2, top + 12);
      if (!Sx.E.ok && Sx.joined) {
        ctx.fillStyle = C.red; ctx.font = 'bold 13px sans-serif';
        ctx.fillText('✘ 호환되지 않는 QoS — 연결되지 않음', (nx1 + nx2) / 2, ny - 20);
        ctx.font = '11px sans-serif'; ctx.fillText(Sx.E.why, (nx1 + nx2) / 2, ny + 20);
      }
      Sx.flights.forEach(f => {
        const p = clamp((Sx.t - f.t0) / (f.t1 - f.t0), 0, 1);
        const x = nx1 + (nx2 - nx1) * (f.lost ? Math.min(p, 0.999) : p);
        const y = ny + (f.retx ? -14 : f.latched ? 14 : 0);
        if (f.lost && p > 0.5) return;
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fillStyle = f.latched ? C.purple : f.retx ? C.yellow : C.blue; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(f.seq, x, y + 0.5);
      });
      Sx.dead = Sx.dead.filter(d => Sx.t - d.t < 900);
      Sx.dead.forEach(d => {
        const a = 1 - (Sx.t - d.t) / 900;
        const x = nx1 + (nx2 - nx1) * d.x, y = ny + (Sx.t - d.t) / 18;
        ctx.globalAlpha = a; ctx.fillStyle = C.red; ctx.font = 'bold 15px sans-serif'; ctx.fillText('✕', x, y); ctx.font = '10px sans-serif'; ctx.fillText('#' + d.seq, x, y + 13); ctx.globalAlpha = 1;
      });
      if (Sx.msg && Sx.joinT != null && Sx.t - Sx.joinT < 5000) { ctx.fillStyle = C.purple; ctx.font = 'bold 12px sans-serif'; wrapText(ctx, Sx.msg, (nx1 + nx2) / 2, ny + 40, nx2 - nx1 - 10, 15); }
      // 순번 띠
      const sy = h - 52, cw = narrow ? 16 : 20;
      const nCells = Math.floor((w - 12) / (cw + 2));
      const last = Sx.seq, first = Math.max(1, last - nCells + 1);
      ctx.fillStyle = C.muted; ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('메시지 순번 (최근 → 오른쪽)', 6, sy - 8); ctx.textAlign = 'center';
      for (let s = first, i = 0; s <= last; s++, i++) {
        const r = rec(s); const x = 6 + i * (cw + 2);
        ctx.fillStyle = C[STC[r.state] || 'gray'] || C.gray;
        ctx.globalAlpha = r.state === 'before' || r.state === 'incompat' ? 0.35 : 1;
        ctx.fillRect(x, sy, cw, 22); ctx.globalAlpha = 1;
        if (r.state === 'gone') { ctx.strokeStyle = C.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 2, sy + 2); ctx.lineTo(x + cw - 2, sy + 20); ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.font = (cw < 18 ? 8 : 9.5) + 'px sans-serif'; ctx.fillText(s % 100, x + cw / 2, sy + 11.5);
      }
    }
    function cells(list, x, y, w, h, col, C, slots) {
      const cw = 30, ch = 18, per = Math.max(1, Math.floor(w / (cw + 3))), rows = Math.max(1, Math.floor(h / (ch + 3)));
      const max = per * rows;
      const items = list.length > max ? list.slice(-max + 1) : list.slice();
      const more = list.length > max;
      const n = slots ? Math.min(slots, max) : items.length + (more ? 1 : 0);
      for (let i = 0; i < Math.max(n, items.length + (more ? 1 : 0)) && i < max; i++) {
        const cx = x + (i % per) * (cw + 3), cy = y + Math.floor(i / per) * (ch + 3);
        const k = more ? i - 1 : i;
        if (more && i === 0) { ctx0(C, cx, cy, cw, ch, C.card, C.line, `+${list.length - max + 1}`); continue; }
        if (k < items.length) ctx0(C, cx, cy, cw, ch, col, null, '#' + items[k]);
        else ctx0(C, cx, cy, cw, ch, 'transparent', C.line, '');
      }
      function ctx0(C, x, y, w, h, fill, stroke, txt) {
        const ctx = cv.getContext('2d');
        ctx.fillStyle = fill; ctx.fillRect(x, y, w, h);
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
        if (txt) { ctx.fillStyle = fill === C.card ? C.fg : '#fff'; ctx.font = '10px sans-serif'; ctx.fillText(txt, x + w / 2, y + h / 2 + 0.5); }
      }
    }
    function wrapText(ctx, text, x, y, maxW, lh) {
      const words = text.split(' '); let line = '', yy = y;
      words.forEach(wd => { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = wd; yy += lh; } else line = t; });
      if (line) ctx.fillText(line, x, yy);
    }

    /* ---------- 정적 설명 */
    const U = s => String(s).toUpperCase();
    function prof(q, isSub) {
      return `QoS profile:
  Reliability: ${U(q.reliability)}
  History (Depth): UNKNOWN
  Durability: ${U(q.durability)}
  Lifespan: Infinite
  Deadline: Infinite
  Liveliness: AUTOMATIC
  Liveliness lease duration: Infinite`;
    }
    function updStatic() {
      const E = eff();
      if (Sx) Sx.E = E;
      const v = $(body, '.wc-q-verdict');
      v.className = 'wc-q-verdict ' + (E.ok ? 'ok' : 'bad');
      v.innerHTML = E.ok ? `✔ 호환됨 — 연결이 만들어집니다. 실제 전송 방식: <b>${E.reliable ? 'RELIABLE' : 'BEST_EFFORT'}</b>${E.latched ? ' · 늦게 온 구독자도 과거 메시지를 받음(TRANSIENT_LOCAL)' : ''}`
        : `✘ 호환되지 않음 — <b>${esc(E.why)}</b><br><code class="wc-warn">[WARN] [listener]: New publisher discovered on topic '/chatter', offering incompatible QoS. No messages will be received from it. Last incompatible policy: ${E.why.split(':')[0]}</code>`;
      const pre = presetKey && QOS_PRESETS[presetKey];
      $(body, '.wc-q-note').innerHTML = pre ? pre.note : '💡 설정을 바꿔 가며 어떤 메시지가 도착하고, 사라지고, 덮어써지는지 살펴보세요. 구독자는 <b>요구하는 것 ≤ 퍼블리셔가 제공하는 것</b>일 때만 연결됩니다.';
      const cell = (pr, sr, key) => { const [ok] = ROS.qosCompat(Object.assign({}, P.pub, { [key]: pr }), Object.assign({}, P.sub, { [key]: sr })); const curCell = P.pub[key] === pr && P.sub[key] === sr; return `<td class="c${curCell ? ' wc-cur' : ''}">${ok ? '<span class="ok">✔ 연결</span>' : '<span class="bad">✘ 안 됨</span>'}</td>`; };
      const mat = (key, a, b) => `<table class="tbl wc-q-mat"><tr><th>발행 ↓ / 구독 →</th><th class="c">${U(a)}</th><th class="c">${U(b)}</th></tr>
        <tr><th>${U(a)}</th>${cell(a, a, key)}${cell(a, b, key)}</tr><tr><th>${U(b)}</th>${cell(b, a, key)}${cell(b, b, key)}</tr></table>`;
      const py = (q, what) => `qos = QoSProfile(
    reliability=ReliabilityPolicy.${U(q.reliability)},
    durability=DurabilityPolicy.${U(q.durability)},
    history=HistoryPolicy.${U(q.history)},${q.history === 'keep_last' ? `\n    depth=${q.depth},` : ''}
)
${what}`;
      $(body, '.wc-q-more').innerHTML = `<div class="wc-grid2"><div><b>Reliability</b>${mat('reliability', 'best_effort', 'reliable')}</div><div><b>Durability</b>${mat('durability', 'volatile', 'transient_local')}</div></div>
        <div class="wc-term"><div class="wc-cmd">$ ros2 topic info /chatter --verbose</div>Type: std_msgs/msg/String

Publisher count: 1

Node name: talker
Node namespace: /
Topic type: std_msgs/msg/String
Endpoint type: PUBLISHER
${prof(P.pub)}

Subscription count: 1

Node name: listener
Node namespace: /
Topic type: std_msgs/msg/String
Endpoint type: SUBSCRIPTION
${prof(P.sub)}</div>
        <div class="w-help">History/Depth 는 DDS 디스커버리로 전달되지 않아 <code>UNKNOWN</code> 으로 보입니다. 호환성은 Reliability · Durability (그리고 Deadline · Liveliness) 로 판단합니다.</div>
        <div class="wc-grid2">${codeHTML('from rclpy.qos import QoSProfile, ReliabilityPolicy, DurabilityPolicy, HistoryPolicy\n\n' + py(P.pub, "self.pub = self.create_publisher(String, 'chatter', qos)"), 'py', [], { label: '퍼블리셔' })}${codeHTML(py(P.sub, "self.sub = self.create_subscription(\n    String, 'chatter', self.cb, qos)"), 'py', [], { label: '구독자' })}</div>
        <div class="w-help">미리 정의된 프로필: <code>qos_profile_sensor_data</code>, <code>qos_profile_system_default</code>, <code>qos_profile_services_default</code>, <code>qos_profile_parameters</code> (rclpy.qos). 명령줄에서는 <code>ros2 topic echo --qos-reliability best_effort --qos-durability transient_local /map</code> 처럼 바꿀 수 있습니다.</div>`;
      syncStats();
    }
    function syncStats() {
      if (!Sx) return;
      const s = Sx.st;
      $(body, '.wc-q-stats').innerHTML = `<span class="wc-pill">발행 <b>${s.pub}</b></span><span class="wc-pill ok">받음 <b>${s.recv}</b>${s.latched ? ` (과거 ${s.latched})` : ''}</span><span class="wc-pill bad">잃음 <b>${s.lost}</b></span><span class="wc-pill warn">덮어씀 <b>${s.over}</b></span><span class="wc-pill">재전송 <b>${s.retx}</b></span><span class="wc-pill">평균 지연 <b>${s.recv ? Math.round(s.latSum / s.recv) : 0} ms</b></span>`;
    }
    if (P.late) $(body, '[data-a=lateN]').value = P.late;
    syncForm(); reset(!!P.late);
    let acc = 0;
    const stop = RosUI.loop(body, dt => {
      if (!paused) { let ms = dt * 1000; while (ms > 0) { const d = Math.min(ms, 10); step(d); ms -= d; } }
      draw();
      acc += dt; if (acc > 0.25) { acc = 0; syncStats(); }
      if (Sx.seq > 400) reset(false);
    });
    return () => stop();
  }
  mount('qos', '📶', 'QoS 실험실 — 신뢰성 · 지속성 · 기록', qosView, { view: 'qos_lab', w: 900, h: 700 });


  /* ==================================================================
     3) domain — DDS 디스커버리 · ROS_DOMAIN_ID · 탐색 범위 · RMW
     ================================================================== */
  const RMWS = {
    rmw_fastrtps_cpp: { label: 'Fast DDS', dds: true, note: 'Jazzy 기본 RMW (eProsima Fast DDS)' },
    rmw_cyclonedds_cpp: { label: 'Cyclone DDS', dds: true, note: 'Eclipse Cyclone DDS — 설치: ros-jazzy-rmw-cyclonedds-cpp' },
    rmw_zenoh_cpp: { label: 'Zenoh', dds: false, note: 'DDS 가 아닌 Zenoh 프로토콜. 라우터(rmw_zenohd)로 서로를 찾습니다. Kilted 부터 Tier-1' }
  };
  function domainView(body, o) {
    const PCS = [
      { id: 'me', name: '💻 내 노트북', short: '노트북', nodes: ['/teleop_twist_keyboard', '/rviz2'] },
      { id: 'robot', name: '🍓 로봇 (Raspberry Pi)', short: '로봇', nodes: ['/robot_driver', '/lidar_node'] },
      { id: 'friend', name: '👩‍💻 친구 노트북', short: '친구', nodes: ['/talker', '/teleop_twist_keyboard'] }
    ];
    const PRE = {
      all0: { label: '모두 기본값', set: { me: [0, 'SYSTEM_DEFAULT'], robot: [0, 'SYSTEM_DEFAULT'], friend: [0, 'SYSTEM_DEFAULT'] }, note: '모두 ROS_DOMAIN_ID=0 이면 같은 Wi-Fi 의 <b>모든</b> ROS 2 노드가 서로 보입니다. 친구의 teleop 이 내 로봇을 움직일 수도 있어요! (실습실에서 흔한 사고)' },
      split: { label: '도메인 나누기', set: { me: [7, 'SUBNET'], robot: [7, 'SUBNET'], friend: [3, 'SUBNET'] }, note: '나와 로봇은 7번, 친구는 3번. 같은 네트워크에 있어도 <b>도메인이 다르면 서로 보이지 않습니다</b>. 조마다 다른 번호를 쓰는 것이 실습실의 기본 규칙입니다.' },
      local: { label: 'LOCALHOST', set: { me: [0, 'LOCALHOST'], robot: [0, 'SUBNET'], friend: [0, 'SUBNET'] }, note: '내 노트북만 <code>ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST</code>. 내 컴퓨터 안의 노드끼리만 통신하고 밖으로는 나가지 않습니다 (혼자 시뮬레이션할 때 좋음).' },
      zenoh: { label: 'Zenoh', set: { me: [0, 'SUBNET', 'rmw_zenoh_cpp'], robot: [0, 'SUBNET', 'rmw_zenoh_cpp'], friend: [0, 'SUBNET'] }, note: '나와 로봇은 <code>RMW_IMPLEMENTATION=rmw_zenoh_cpp</code>. Zenoh 는 멀티캐스트 대신 <b>라우터</b>를 통해 서로를 찾습니다. 라우터를 끄면 어떻게 될까요? DDS 를 쓰는 친구와는 서로 통신할 수 없습니다.' }
    };
    const st = {};
    PCS.forEach(p => { st[p.id] = { domain: 0, range: 'SYSTEM_DEFAULT', localhostOnly: false, rmw: 'rmw_fastrtps_cpp', net: true }; });
    let router = true, preKey = PRE[o.preset] ? o.preset : 'all0';
    function applyPre(k) {
      preKey = k;
      Object.entries(PRE[k].set).forEach(([id, [d, r, rmw]]) => Object.assign(st[id], { domain: d, range: r, localhostOnly: false, rmw: rmw || 'rmw_fastrtps_cpp', net: true }));
    }
    applyPre(preKey);
    body.innerHTML = `<div class="wc-d">
      <div class="w-row"><span class="small muted">상황</span><div class="w-seg wc-d-pre">${Object.keys(PRE).map(k => `<button data-p="${k}">${PRE[k].label}</button>`).join('')}</div>
        <label class="small wc-d-router"><input type="checkbox" checked data-g="router"> Zenoh 라우터 실행 중 <code>ros2 run rmw_zenoh_cpp rmw_zenohd</code></label></div>
      <div class="wc-stage wc-d-stage"></div>
      <div class="wc-note wc-d-note"></div>
      <div class="wc-d-pcs"></div>
      <details class="wc-det"><summary>포트 계산 · RMW 선택</summary><div class="wc-d-more"></div></details>
    </div>`;
    const stage = $(body, '.wc-d-stage'), pcsEl = $(body, '.wc-d-pcs');
    pcsEl.innerHTML = PCS.map(p => `<div class="wc-card wc-d-pc" data-pc="${p.id}">
        <div class="wc-card-h">${p.name}</div>
        <label>ROS_DOMAIN_ID <select class="w-in" data-k="domain">${Array.from({ length: 233 }, (_, i) => opt(i, i + (i > 101 && i < 215 ? ' ⚠' : ''))).join('')}</select></label>
        <label>ROS_AUTOMATIC_DISCOVERY_RANGE <select class="w-in" data-k="range">${['SYSTEM_DEFAULT', 'SUBNET', 'LOCALHOST', 'OFF'].map(v => opt(v)).join('')}</select></label>
        <label class="small"><input type="checkbox" data-k="localhostOnly"> ROS_LOCALHOST_ONLY=1 <span class="muted">(Jazzy 에서 deprecated)</span></label>
        <label>RMW_IMPLEMENTATION <select class="w-in" data-k="rmw">${Object.keys(RMWS).map(v => opt(v)).join('')}</select></label>
        <label class="small"><input type="checkbox" data-k="net"> 같은 공유기(서브넷)에 연결</label>
        <div class="wc-term wc-d-list"></div>
      </div>`).join('');
    function syncForm() {
      $$(body, '.wc-d-pc').forEach(c => {
        const s = st[c.dataset.pc];
        $$(c, '[data-k]').forEach(el => { if (el.type === 'checkbox') el.checked = !!s[el.dataset.k]; else el.value = s[el.dataset.k]; });
        $(c, '[data-k=range]').disabled = s.localhostOnly;
      });
      $$(body, '.wc-d-pre button').forEach(b => b.classList.toggle('on', b.dataset.p === preKey));
      $(body, '[data-g=router]').checked = router;
    }
    pcsEl.addEventListener('change', e => {
      const el = e.target.closest('[data-k]'); if (!el) return;
      const s = st[el.closest('[data-pc]').dataset.pc];
      s[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.dataset.k === 'domain' ? +el.value : el.value;
      preKey = null; syncForm(); update();
    });
    $(body, '[data-g=router]').onchange = e => { router = e.target.checked; update(); };
    $$(body, '.wc-d-pre button').forEach(b => b.onclick = () => { applyPre(b.dataset.p); syncForm(); update(); });

    /* ---------- 규칙 */
    const effRange = s => s.localhostOnly ? 'LOCALHOST' : (s.range === 'SYSTEM_DEFAULT' ? 'SUBNET' : s.range);
    /** a 와 b 가 서로를 찾을 수 있나 → [ok, 이유] */
    function canSee(a, b) {
      const A = st[a], B = st[b];
      const za = A.rmw === 'rmw_zenoh_cpp', zb = B.rmw === 'rmw_zenoh_cpp';
      if (za !== zb) return [false, 'RMW 다름 (Zenoh ↔ DDS)'];
      if (A.domain !== B.domain) return [false, `도메인 다름 (${A.domain} ≠ ${B.domain})`];
      if (za) {
        if (!router) return [false, 'Zenoh 라우터 없음'];
        if (a !== b && (!A.net || !B.net)) return [false, '네트워크 끊김'];
        return [true, 'Zenoh 라우터 경유'];
      }
      if (a === b) return effRange(A) === 'OFF' ? [false, '탐색 OFF'] : [true, ''];
      if (!A.net || !B.net) return [false, '네트워크 끊김'];
      if (effRange(A) !== 'SUBNET' || effRange(B) !== 'SUBNET') return [false, `탐색 범위 ${effRange(A) !== 'SUBNET' ? effRange(A) : effRange(B)}`];
      return [true, A.rmw !== B.rmw ? 'DDS 구현이 달라도 RTPS 로 통신(권장 X)' : ''];
    }

    /* ---------- 그림 */
    let svg, flyer, P = {}, links = [], acc = 0;
    function layout() {
      stage.innerHTML = '';
      const narrow = isNarrow(body);
      svg = newSvg(stage, 'wc-d-svg');
      const W = narrow ? 400 : 800, H = narrow ? 430 : 250;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const gl = S('g', null, svg), gb = S('g', null, svg);
      flyer = Flyer(S('g', null, svg));
      const bw = narrow ? 290 : 230, bh = narrow ? 120 : 128;
      const pos = narrow ? { me: [10, 10], robot: [10, 155], friend: [10, 300] } : { me: [10, 10], robot: [285, 10], friend: [560, 10] };
      if (!narrow) {
        S('text', { x: W / 2, y: H - 22, class: 't-c t-lg' }, gl, '📶');
        S('text', { x: W / 2, y: H - 5, class: 't-c t-xs t-mu' }, gl, 'Wi-Fi 공유기 (같은 서브넷)');
      }
      PCS.forEach(p => {
        const [x, y] = pos[p.id];
        P[p.id] = { x, y, w: bw, h: bh, cx: x + bw / 2, cy: y + bh / 2 };
        P[p.id].wire = narrow ? null : line(gl, x + bw / 2 + (p.id === 'robot' ? 0 : p.id === 'me' ? 60 : -60), y + bh, W / 2, H - 34, 'ln thin');
        const g = S('g', null, gb);
        P[p.id].rect = S('rect', { x, y, width: bw, height: bh, rx: 12, class: 'box' }, g);
        S('text', { x: x + bw / 2, y: y + 16, class: 't-c t-sm t-b' }, g, p.short);
        P[p.id].env = S('text', { x: x + bw / 2, y: y + 34, class: 't-c t-xs t-mono' }, g, '');
        P[p.id].env2 = S('text', { x: x + bw / 2, y: y + 49, class: 't-c t-xs t-mu' }, g, '');
        p.nodes.forEach((n, i) => {
          const ny = y + 70 + i * 24;
          S('rect', { x: x + 14, y: ny - 10, width: bw - 28, height: 20, rx: 10, class: 'blue' }, g);
          S('text', { x: x + bw / 2, y: ny, class: 't-c t-xs t-mono' }, g, n);
        });
        P[p.id].ring = S('circle', { cx: x + bw / 2, cy: y + bh / 2, r: 0, class: 'wc-d-ring' }, g);
      });
      links = [];
      const A = P.me, B = P.robot, C = P.friend;
      const defsL = narrow ? [
        ['me', 'robot', [[A.x + A.w, A.cy - 15], [345, A.cy - 15], [345, B.cy - 15], [B.x + B.w, B.cy - 15]], [345, (A.cy + B.cy) / 2 - 15]],
        ['robot', 'friend', [[B.x + B.w, B.cy + 15], [345, B.cy + 15], [345, C.cy + 15], [C.x + C.w, C.cy + 15]], [345, (B.cy + C.cy) / 2 + 15]],
        ['me', 'friend', [[A.x + A.w, A.cy + 25], [380, A.cy + 25], [380, C.cy + 35], [C.x + C.w, C.cy + 35]], [380, B.cy]]
      ] : [
        ['me', 'robot', [[A.x + A.w, A.cy], [B.x, B.cy]], [(A.x + A.w + B.x) / 2, A.cy - 26]],
        ['robot', 'friend', [[B.x + B.w, B.cy], [C.x, C.cy]], [(B.x + B.w + C.x) / 2, B.cy - 26]],
        ['me', 'friend', [[A.cx - 60, A.y + A.h], [A.cx - 60, H - 55], [C.cx + 60, H - 55], [C.cx + 60, C.y + C.h]], [W / 2 + 190, H - 64]]
      ];
      defsL.forEach(([a, b, pts, lp]) => {
        const el = S('polyline', { points: pts.map(q => q.join(',')).join(' '), class: 'ln thin dash wc-d-link' }, gl);
        const lab = S('text', { x: lp[0], y: lp[1], class: 't-c t-xs' }, gl, '');
        links.push({ a, b, pts, el, lab, short: narrow || a === 'me' && b !== 'friend' || a === 'robot' });
      });
      update();
    }
    function update() {
      const narrow = isNarrow(body);
      PCS.forEach(p => {
        const s = st[p.id], R = P[p.id];
        if (!R) return;
        R.env.textContent = `DOMAIN_ID=${s.domain}`;
        R.env2.textContent = `${RMWS[s.rmw].label} · ${s.rmw === 'rmw_zenoh_cpp' ? '라우터' : effRange(s)}`;
        R.rect.setAttribute('class', 'wc-d-dom' + (s.domain % 6));
        if (R.wire) R.wire.setAttribute('class', 'ln thin' + (s.net ? '' : ' dash'));
      });
      links.forEach(L => {
        const [ok, why] = canSee(L.a, L.b);
        L.ok = ok;
        L.el.setAttribute('class', ok ? 'ln-green wc-d-link' : 'ln thin dash wc-d-link');
        L.lab.textContent = narrow ? (ok ? '✔' : '✘') : ok ? (why ? '✔ ' + why : '✔ 서로 보임') : '✘ ' + why;
        L.lab.setAttribute('class', 't-c t-xs t-b ' + (ok ? 't-green' : 't-red'));
      });
      // ros2 node list
      $$(body, '.wc-d-pc').forEach(c => {
        const id = c.dataset.pc;
        const seen = [];
        PCS.forEach(q => { if (canSee(id, q.id)[0]) q.nodes.forEach(n => seen.push(n + (q.id !== id ? `   ← ${q.short}` : ''))); });
        const s = st[id];
        const extra = s.rmw === 'rmw_zenoh_cpp' && !router ? '\n(라우터가 없어 같은 컴퓨터 안에서도 못 찾음)' : effRange(s) === 'OFF' && s.rmw !== 'rmw_zenoh_cpp' ? '\n(탐색 OFF: 아무도 찾지 않음)' : '';
        $(c, '.wc-d-list').innerHTML = `<div class="wc-cmd">$ ros2 node list</div>${esc(seen.sort().join('\n') || '')}${esc(extra)}`;
      });
      const d = st.me.domain;
      $(body, '.wc-d-note').innerHTML = (preKey ? PRE[preKey].note : '💡 도메인 번호 · 탐색 범위 · 네트워크 · RMW 를 바꿔 보며 누가 누구를 볼 수 있는지 확인하세요.') + (st.me.localhostOnly ? '<br>⚠ <code>ROS_LOCALHOST_ONLY</code> 는 Jazzy 에서 deprecated 입니다. 대신 <code>export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST</code> 를 쓰세요.' : '');
      const port = (dd, k, p) => 7400 + 250 * dd + k + 2 * p;
      $(body, '.wc-d-more').innerHTML = `<p class="small">DDS(RTPS)는 도메인 번호로 UDP 포트를 정합니다: <b>포트 = 7400 + 250 × 도메인 + 오프셋</b> (PB=7400, DG=250, PG=2, d0=0, d1=10, d2=1, d3=11). 도메인이 다르면 포트가 달라서 서로의 메시지를 아예 듣지 못합니다.</p>
        <table class="tbl wc-d-ports"><tr><th>용도 (내 노트북, 도메인 ${d})</th><th>공식</th><th>포트</th></tr>
          <tr><td>디스커버리 멀티캐스트 (SPDP hello)</td><td class="w-out">7400 + 250·${d}</td><td class="w-out">${port(d, 0, 0)}</td></tr>
          <tr><td>사용자 데이터 멀티캐스트</td><td class="w-out">7400 + 250·${d} + 1</td><td class="w-out">${port(d, 1, 0)}</td></tr>
          <tr><td>디스커버리 유니캐스트 (참가자 p=0,1,2…)</td><td class="w-out">7400 + 250·${d} + 10 + 2p</td><td class="w-out">${port(d, 10, 0)}, ${port(d, 10, 1)}, ${port(d, 10, 2)}…</td></tr>
          <tr><td>사용자 데이터 유니캐스트</td><td class="w-out">7400 + 250·${d} + 11 + 2p</td><td class="w-out">${port(d, 11, 0)}, ${port(d, 11, 1)}, ${port(d, 11, 2)}…</td></tr></table>
        <p class="small">그래서 도메인은 <b>0~232</b> 만 쓸 수 있고(포트 ≤ 65535), 리눅스에서는 임시 포트(32768~60999)와 겹치지 않는 <b>0~101</b> 을 권장합니다(215~232 도 가능, ⚠ 표시는 피하세요). 한 도메인에 한 컴퓨터당 참가자는 약 120개까지입니다.</p>
        <div class="wc-rmw">${Object.entries(RMWS).map(([k, v]) => `<div class="wc-card"><div class="wc-card-h">${v.label}${k === 'rmw_fastrtps_cpp' ? ' <span class="wc-badge">Jazzy 기본</span>' : ''}</div><code>${k}</code><p class="small">${v.note}</p></div>`).join('')}</div>
        ${codeHTML(`export ROS_DOMAIN_ID=${d}
export ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET   # SUBNET | LOCALHOST | OFF | SYSTEM_DEFAULT
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp   # 바꾸면 ros2 daemon stop 후 다시 실행
# Zenoh: 먼저 라우터를 띄운 뒤 노드 실행
ros2 run rmw_zenoh_cpp rmw_zenohd
RMW_IMPLEMENTATION=rmw_zenoh_cpp ros2 run demo_nodes_cpp talker
ros2 doctor --report | grep middleware`, 'bash', [], { label: 'bash' })}
        <p class="small muted">서로 다른 DDS 구현(Fast DDS ↔ Cyclone DDS)끼리도 표준 RTPS 로 대개 통신되지만 공식적으로 보장되지 않으므로, 한 시스템에서는 같은 RMW 를 쓰는 것이 원칙입니다. <code>ROS_STATIC_PEERS</code> 로 멀티캐스트가 안 되는 네트워크에서 상대 IP 를 직접 지정할 수 있습니다.</p>`;
    }
    syncForm(); layout();
    const offW = onWidth(body, layout);
    const stop = RosUI.loop(body, dt => {
      if (!flyer) return;
      flyer.tick(dt);
      acc += dt;
      PCS.forEach(p => {
        const R = P[p.id]; if (!R) return;
        const s = st[p.id];
        // 컴퓨터 안의 파동(LOCALHOST 또는 내부 탐색)
        const ph = (acc + PCS.indexOf(p) * 0.5) % 2;
        const r = s.rmw !== 'rmw_zenoh_cpp' && effRange(s) !== 'OFF' ? ph * 60 : 0;
        R.ring.setAttribute('r', r.toFixed(1)); R.ring.style.opacity = r ? Math.max(0, 0.6 - ph * 0.3) : 0;
      });
      if (acc > 2) {
        acc = 0;
        links.forEach(L => {
          [[L.a, L.b, L.pts], [L.b, L.a, L.pts.slice().reverse()]].forEach(([from, to, pts]) => {
            const s = st[from];
            if (!s.net && s.rmw !== 'rmw_zenoh_cpp') return;
            if (s.rmw !== 'rmw_zenoh_cpp' && effRange(s) !== 'SUBNET') return; // 밖으로 hello 를 보내지 않음
            if (s.rmw === 'rmw_zenoh_cpp' && (!router || !s.net)) return;
            const ok = canSee(from, to)[0];
            flyer.add({ pts, dur: 1.1, delay: Math.random() * 0.4, cls: 'wc-d-dot' + (s.domain % 6), r: 6, label: s.rmw === 'rmw_zenoh_cpp' ? 'zenoh' : `hello D${s.domain}`, lost: !ok });
          });
        });
      }
    });
    return () => { stop(); offW(); };
  }
  mount('domain', '🌐', 'DDS 디스커버리와 ROS_DOMAIN_ID', domainView);


  /* ==================================================================
     4) iface — 인터페이스 탐색기 + 명령 만들기
     ================================================================== */
  const PRIMS = ROS.PRIM || new Set();
  function guessName(type) {
    const [pkg, kind, name] = type.split('/');
    const G = {
      'geometry_msgs/msg/Twist': '/turtle1/cmd_vel', 'std_msgs/msg/String': '/chatter', 'turtlesim/msg/Pose': '/turtle1/pose', 'turtlesim/msg/Color': '/turtle1/color_sensor',
      'turtlesim/srv/Spawn': '/spawn', 'turtlesim/srv/Kill': '/kill', 'turtlesim/srv/SetPen': '/turtle1/set_pen', 'turtlesim/srv/TeleportAbsolute': '/turtle1/teleport_absolute', 'turtlesim/srv/TeleportRelative': '/turtle1/teleport_relative',
      'std_srvs/srv/Empty': '/clear', 'example_interfaces/srv/AddTwoInts': '/add_two_ints', 'turtlesim/action/RotateAbsolute': '/turtle1/rotate_absolute',
      'action_tutorials_interfaces/action/Fibonacci': '/fibonacci', 'example_interfaces/action/Fibonacci': '/fibonacci', 'sensor_msgs/msg/LaserScan': '/scan', 'nav_msgs/msg/Odometry': '/odom', 'sensor_msgs/msg/Image': '/image_raw', 'sensor_msgs/msg/JointState': '/joint_states'
    };
    if (G[type]) return G[type];
    const snake = name.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    return '/' + (kind === 'msg' ? 'my_' + snake : snake);
  }
  /** 파이썬 repr 모양 (ros2 CLI 출력용) */
  function pyRepr(o, type, cls) {
    const f = ROS.fieldsOf(type);
    if (!f) return JSON.stringify(o);
    const nm = cls || type.replace(/#\d$/, '').replace(/\//g, '.');
    const prim = (v, t) => t === 'string' || t === 'wstring' ? `'${String(v)}'` : t === 'bool' ? (v ? 'True' : 'False') : (t === 'float32' || t === 'float64') ? (Number.isInteger(+v) ? (+v).toFixed(1) : String(+v)) : String(v);
    return nm + '(' + f.fields.map(fd => {
      const v = o ? o[fd.name] : undefined;
      let s;
      if (fd.array != null) s = '[' + (v || []).map(x => PRIMS.has(fd.type) ? prim(x, fd.type) : pyRepr(x, fd.type)).join(', ') + ']';
      else if (PRIMS.has(fd.type)) s = prim(v, fd.type);
      else s = pyRepr(v || {}, fd.type);
      return fd.name + '=' + s;
    }).join(', ') + ')';
  }
  function ifaceView(body, o) {
    const all = () => Object.keys(window.ROS_IFACES || {}).filter(t => t.split('/').length === 3).sort();
    let pre = o.type ? ROS.normType(o.type) : null;
    if (pre && !(window.ROS_IFACES || {})[pre]) { const alt = all().find(t => t.endsWith('/' + o.type.split('/').pop())); pre = alt || null; }
    let kind = pre ? pre.split('/')[1] : 'msg', sel = pre || 'geometry_msgs/msg/Twist';
    if (!(window.ROS_IFACES || {})[sel]) sel = all().find(t => t.split('/')[1] === kind) || all()[0];
    body.innerHTML = `<div class="wc-if">
      <div class="wc-if-side">
        <div class="w-seg wc-if-kind">${['msg', 'srv', 'action'].map(k => `<button data-k="${k}">${k}</button>`).join('')}</div>
        <input class="w-in wc-if-q" placeholder="🔍 검색 (예: Twist, pose)">
        <div class="wc-if-list"></div>
      </div>
      <div class="wc-if-main"></div>
    </div>`;
    const listEl = $(body, '.wc-if-list'), main = $(body, '.wc-if-main'), q = $(body, '.wc-if-q');
    function renderList() {
      $$(body, '.wc-if-kind button').forEach(b => { const n = all().filter(t => t.split('/')[1] === b.dataset.k).length; b.classList.toggle('on', b.dataset.k === kind); b.textContent = `${b.dataset.k} (${n})`; });
      const f = q.value.trim().toLowerCase();
      const items = all().filter(t => t.split('/')[1] === kind && (!f || t.toLowerCase().includes(f)));
      let lastPkg = '';
      listEl.innerHTML = items.map(t => { const [p, , n] = t.split('/'); const h = p !== lastPkg ? `<div class="wc-if-pkg">${esc(p)}</div>` : ''; lastPkg = p; return h + `<button class="wc-if-it${t === sel ? ' on' : ''}" data-t="${esc(t)}">${esc(n)}</button>`; }).join('') || '<div class="muted small">없음</div>';
      const on = $(listEl, '.on');
      if (on && !listEl._scrolled) { listEl._scrolled = true; requestAnimationFrame(() => { listEl.scrollTop = Math.max(0, on.offsetTop - listEl.offsetTop - 60); }); }
    }
    $$(body, '.wc-if-kind button').forEach(b => b.onclick = () => { kind = b.dataset.k; renderList(); });
    q.oninput = renderList;
    listEl.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; sel = b.dataset.t; renderList(); renderMain(); };

    /* ---------- 입력 폼 */
    const fixedArr = fd => fd.array > 0 && PRIMS.has(fd.type) ? '[' + Array(fd.array).fill(fd.type === 'string' ? "''" : fd.type === 'bool' ? 'false' : /float/.test(fd.type) ? '0.0' : '0').join(', ') + ']' : '[]';
    function formHTML(type, path, depth) {
      const f = ROS.fieldsOf(type);
      if (!f || !f.fields.length) return '<div class="muted small">(필드 없음)</div>';
      return f.fields.map(fd => {
        const p = path ? path + '.' + fd.name : fd.name;
        const tn = `<span class="wc-if-ty">${esc(fd.type.replace('/msg/', '/'))}${fd.array != null ? (fd.array > 0 ? `[${fd.array}]` : '[]') : ''}</span>`;
        if (fd.array != null) return `<label class="wc-if-f"><span>${esc(fd.name)} ${tn}</span><input class="w-in" data-p="${esc(p)}" data-arr="1" data-ty="${esc(fd.type)}" placeholder="[1, 2, 3]" value="${esc(fixedArr(fd))}"></label>`;
        if (PRIMS.has(fd.type)) {
          if (fd.type === 'bool') return `<label class="wc-if-f"><span>${esc(fd.name)} ${tn}</span><input type="checkbox" data-p="${esc(p)}" data-ty="bool"${fd.def ? ' checked' : ''}></label>`;
          const isStr = fd.type === 'string' || fd.type === 'wstring';
          return `<label class="wc-if-f"><span>${esc(fd.name)} ${tn}</span><input class="w-in" ${isStr ? '' : 'type="number" step="any"'} data-p="${esc(p)}" data-ty="${fd.type}" value="${esc(fd.def != null ? fd.def : isStr ? '' : 0)}"></label>`;
        }
        if (depth > 3) return `<div class="muted small">${esc(fd.name)}: (너무 깊어서 생략)</div>`;
        return `<fieldset class="wc-if-fs"><legend>${esc(fd.name)} ${tn}</legend>${formHTML(fd.type, p, depth + 1)}</fieldset>`;
      }).join('');
    }
    function readForm(root) {
      const o = {}; let err = null;
      $$(root, '[data-p]').forEach(el => {
        const path = el.dataset.p.split('.');
        let v;
        if (el.type === 'checkbox') v = el.checked;
        else if (el.dataset.arr) { try { v = ROS.parseYaml(el.value || '[]'); if (!Array.isArray(v)) throw new Error('배열이 아닙니다'); el.classList.remove('bad'); } catch (e) { el.classList.add('bad'); err = `${el.dataset.p}: ${e.message}`; v = []; } }
        else if (el.dataset.ty === 'string' || el.dataset.ty === 'wstring') v = el.value;
        else v = Number(el.value) || 0;
        let c = o; path.slice(0, -1).forEach(k => { c = c[k] = c[k] || {}; }); c[path[path.length - 1]] = v;
      });
      return { o, err };
    }

    /* ---------- 오른쪽 */
    function renderMain() {
      const t = sel; if (!t) { main.innerHTML = ''; return; }
      const k = t.split('/')[1];
      const part = k === 'msg' ? t : ROS.partType(t, 0);
      const show = ROS.showIface(t) || '';
      const name = guessName(t);
      const cmdName = k === 'msg' ? '토픽' : k === 'srv' ? '서비스' : '액션';
      main.innerHTML = `<div class="wc-if-title"><b class="w-out">${esc(t)}</b> <span class="wc-badge">${k === 'msg' ? '메시지' : k === 'srv' ? '서비스 (요청 --- 응답)' : '액션 (목표 --- 결과 --- 피드백)'}</span></div>
        <div class="wc-grid2">
          <div><div class="wc-sub">📜 정의</div><div class="wc-term"><div class="wc-cmd">$ ros2 interface show ${esc(t)}</div>${esc(show)}</div></div>
          <div><div class="wc-sub">🧩 기본값 (${k === 'msg' ? '메시지' : k === 'srv' ? '요청' : '목표'})</div><div class="wc-term"><div class="wc-cmd">$ ros2 interface proto ${esc(t)}</div>"${esc(ROS.toYaml(ROS.make(part), part))}
"</div></div>
        </div>
        <div class="wc-sub">🛠 명령 만들기 — 값을 채워 보세요</div>
        <div class="w-row"><label>${cmdName} 이름 <input class="w-in wc-if-name" value="${esc(name)}"></label>
          ${k === 'msg' ? `<label class="small"><input type="checkbox" class="wc-if-once" checked> --once</label>` : ''}
          ${k === 'action' ? `<label class="small"><input type="checkbox" class="wc-if-fb" checked> --feedback</label>` : ''}</div>
        <div class="wc-if-form">${formHTML(part, '', 0)}</div>
        <div class="wc-term wc-if-cmd"></div>
        <div class="w-btns"><button class="btn small" data-a="copy">📋 복사</button><button class="btn small primary" data-a="run"></button></div>
        <div class="wc-term wc-if-out" hidden></div>`;
      const nameEl = $(main, '.wc-if-name'), cmdEl = $(main, '.wc-if-cmd'), outEl = $(main, '.wc-if-out'), runB = $(main, '[data-a=run]');
      let cmd = '', msg = {};
      function build() {
        const r = readForm($(main, '.wc-if-form'));
        msg = ROS.make(part, r.o);
        const flow = ROS.toFlow(msg, part).replace(/"/g, '\\"');
        const nm = nameEl.value.trim() || name;
        if (k === 'msg') cmd = `ros2 topic pub${$(main, '.wc-if-once').checked ? ' --once' : ' -r 1'} ${nm} ${t} "${flow}"`;
        else if (k === 'srv') cmd = `ros2 service call ${nm} ${t} "${flow}"`;
        else cmd = `ros2 action send_goal ${nm} ${t} "${flow}"${$(main, '.wc-if-fb').checked ? ' --feedback' : ''}`;
        cmdEl.innerHTML = `<div class="wc-cmd">$ ${esc(cmd)}</div>${r.err ? `<span class="bad">⚠ ${esc(r.err)}</span>` : ''}`;
        // 실행 버튼
        if (k === 'msg') { runB.textContent = '📤 WebROS 에 한 번 발행'; runB.disabled = false; runB.title = ''; }
        else if (k === 'srv') { const s = ROS.serviceList().find(x => x.name === nm); runB.textContent = '🔁 서비스 호출'; runB.disabled = !s || s.type !== t; runB.title = s ? '' : `${nm} 서비스가 WebROS 에 없습니다`; }
        else { const a = ROS.actionList().find(x => x.name === nm); runB.textContent = '🎯 목표 보내기'; runB.disabled = !a || a.type !== t; runB.title = a ? '' : `${nm} 액션 서버가 WebROS 에 없습니다`; }
        if (runB.disabled) { const cand = (k === 'srv' ? ROS.serviceList() : k === 'action' ? ROS.actionList() : []).filter(x => x.type === t).map(x => x.name); runB.title += cand.length ? ` (있는 것: ${cand.join(', ')})` : ' — 먼저 해당 노드를 실행하세요'; }
      }
      main.oninput = build; main.onchange = build;
      main.onclick = async e => {
        const b = e.target.closest('[data-a]'); if (!b) return;
        if (b.dataset.a === 'copy') copyText(cmd);
        else if (b.dataset.a === 'run' && !b.disabled) {
          const nm = nameEl.value.trim() || name;
          outEl.hidden = false;
          if (k === 'msg') { ROS.publishOnce(nm, t, msg); outEl.textContent = `publisher: beginning loop\npublishing #1: ${t.replace(/\//g, '.').replace('.msg.', '.msg.')}(${Object.keys(msg).map(k2 => k2 + '=…').join(', ')})\n\n→ ${nm} 에 한 번 발행했습니다. (ros2 topic echo ${nm} 로 확인)`; }
          else if (k === 'srv') {
            outEl.textContent = `waiting for service to become available...\nrequester: making request: ${t.replace(/\//g, '.')}_Request(...)\n`;
            try { const r = await ROS.callService(nm, t, msg); outEl.textContent += `\nresponse:\n${ROS.toYaml(r, ROS.partType(t, 1))}`; } catch (err) { outEl.textContent += '\n✘ ' + err.message; }
          } else {
            outEl.textContent = 'Waiting for an action server to become available...\nSending goal:\n' + ROS.toYaml(msg, part).split('\n').map(l => '     ' + l).join('\n') + '\n';
            try {
              const g = await ROS.sendGoal(nm, msg, { feedback: fb => { if ($(main, '.wc-if-fb').checked) outEl.textContent += '\nFeedback:\n' + ROS.toYaml(fb, ROS.partType(t, 2)).split('\n').map(l => '    ' + l).join('\n'); outEl.scrollTop = outEl.scrollHeight; } });
              if (!g.accepted) { outEl.textContent += '\nGoal was rejected.'; return; }
              outEl.textContent += `\nGoal accepted with ID: ${g.goalId.replace(/-/g, '')}\n`;
              const r = await g.result;
              const SN = ['UNKNOWN', 'ACCEPTED', 'EXECUTING', 'CANCELING', 'SUCCEEDED', 'CANCELED', 'ABORTED'];
              outEl.textContent += `\nResult:\n${ROS.toYaml(r.result, ROS.partType(t, 1)).split('\n').map(l => '    ' + l).join('\n')}\n\nGoal finished with status: ${SN[r.status]}`;
              outEl.scrollTop = outEl.scrollHeight;
            } catch (err) { outEl.textContent += '\n✘ ' + err.message; }
          }
        }
      };
      build();
    }
    const offG = ROS.on('graph', () => { const n = $(main, '.wc-if-name'); if (n) n.dispatchEvent(new Event('input', { bubbles: true })); });
    renderList(); renderMain();
    return () => offG();
  }
  mount('iface', '🧩', '인터페이스 탐색기 (msg · srv · action)', ifaceView, { view: 'iface_explorer', w: 900, h: 640 });


  /* ==================================================================
     5) pkg — 패키지 구조 탐색기 (ament_python / ament_cmake / 인터페이스)
     ================================================================== */
  const XML_HEAD = `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">`;
  const LICENSE_TXT = `
                                 Apache License
                           Version 2.0, January 2004
                        http://www.apache.org/licenses/

   TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
   … (라이선스 전문, 약 200줄)`;
  const LINT_HDR = `# Copyright 2015 Open Source Robotics Foundation, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# … (라이선스 머리말 생략)
`;
  const PKG_KINDS = {
    python: {
      label: '🐍 파이썬 (ament_python)', root: 'my_package',
      cmd: 'ros2 pkg create --build-type ament_python --license Apache-2.0 --node-name my_node my_package',
      after: 'cd ~/ros2_ws && colcon build --packages-select my_package\nsource install/setup.bash\nros2 run my_package my_node',
      files: [
        { p: 'package.xml', lang: 'xml', hl: ['format="3"', '<name>', '<license>', '<depend>', '<build_type>'], text: `${XML_HEAD}
  <name>my_package</name>
  <version>0.0.0</version>
  <description>TODO: Package description</description>
  <maintainer email="user@todo.todo">user</maintainer>
  <license>Apache-2.0</license>

  <!-- 직접 추가: 코드에서 import 하는 패키지 -->
  <depend>rclpy</depend>
  <depend>std_msgs</depend>

  <test_depend>ament_copyright</test_depend>
  <test_depend>ament_flake8</test_depend>
  <test_depend>ament_pep257</test_depend>
  <test_depend>python3-pytest</test_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>`, note: `<b>패키지 명세서(매니페스트)</b>입니다. <code>format="3"</code> 형식이며 이름·버전·관리자·라이선스와 <b>의존성</b>을 적습니다.
          <ul><li><code>&lt;depend&gt;</code>: 빌드·실행 모두에 필요한 패키지. <code>import rclpy</code> 를 하면 <code>rclpy</code> 를 적어야 합니다 (<code>--dependencies rclpy std_msgs</code> 옵션을 주면 자동으로 들어갑니다).</li>
          <li><code>&lt;test_depend&gt;</code>: 테스트(<code>colcon test</code>)에만 필요.</li>
          <li><code>&lt;export&gt;&lt;build_type&gt;ament_python</code>: colcon 이 이 줄을 보고 <b>setup.py 방식으로</b> 빌드합니다. (C++ 패키지는 <code>&lt;buildtool_depend&gt;ament_cmake&lt;/buildtool_depend&gt;</code> + <code>ament_cmake</code>)</li></ul>
          의존성을 설치할 때는 <code>rosdep install --from-paths src -y --ignore-src</code> 가 이 파일을 읽습니다.` },
        { p: 'setup.py', lang: 'py', hl: ['package_name = ', 'data_files', "'resource/'", "'share/' + package_name",'entry_points', 'console_scripts', 'my_node = my_package'], text: `from setuptools import find_packages, setup

package_name = 'my_package'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='user',
    maintainer_email='user@todo.todo',
    description='TODO: Package description',
    license='Apache-2.0',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'my_node = my_package.my_node:main'
        ],
    },
)`, note: `파이썬 패키지를 <b>어떻게 설치할지</b> 적는 파일입니다.
          <ul><li><code>data_files</code>: 파이썬 코드가 아닌 파일을 <code>install/my_package/share/…</code> 로 복사합니다. <b>런치 파일</b>을 추가했다면 여기에 <code>(os.path.join('share', package_name, 'launch'), glob('launch/*'))</code> 줄을 넣어야 <code>ros2 launch</code> 가 찾습니다.</li>
          <li><code>entry_points → console_scripts</code>: <b><code>ros2 run my_package my_node</code> 의 실행 파일 이름</b>을 정합니다. 형식은 <code>'실행파일이름 = 파이썬모듈:함수'</code>. 새 노드 파일을 만들면 여기에 한 줄 추가하고 다시 빌드하세요.</li>
          <li><code>package.xml</code> 과 이름·버전·라이선스가 같아야 합니다.</li></ul>` },
        { p: 'setup.cfg', lang: 'ini', hl: ['script_dir', 'install_scripts'], text: `[develop]
script_dir=$base/lib/my_package
[install]
install_scripts=$base/lib/my_package`, note: `실행 파일을 <code>install/my_package/<b>lib/my_package</b>/my_node</code> 에 설치하라는 설정입니다. <code>ros2 run</code> 은 바로 이 <code>lib/&lt;패키지&gt;/</code> 폴더에서 실행 파일을 찾으므로 <b>지우면 안 됩니다</b>.` },
        { p: 'resource/my_package', lang: 'txt', hl: [], text: '', note: `<b>빈 파일</b>입니다. 설치될 때 <code>share/ament_index/resource_index/packages/my_package</code> 로 복사되어, <code>ros2 pkg list</code> 같은 도구가 "이런 패키지가 설치되어 있다"는 것을 알게 하는 <b>표시(marker)</b> 역할을 합니다.` },
        { p: 'my_package/__init__.py', lang: 'py', hl: [], text: '', note: '이 폴더가 <b>파이썬 모듈(패키지)</b>임을 알리는 빈 파일입니다. 패키지 이름과 같은 이름의 폴더 안에 노드 코드를 넣습니다.' },
        { p: 'my_package/my_node.py', lang: 'py', hl: ['def main', '__name__'], text: `def main():
    print('Hi from my_package.')


if __name__ == '__main__':
    main()`, note: '<code>--node-name my_node</code> 옵션이 만든 <b>노드 뼈대</b>입니다. setup.py 의 <code>my_package.my_node:main</code> 이 바로 이 파일의 <code>main()</code> 함수를 가리킵니다. 처음에는 print 만 하므로, 아래 "rclpy 노드 예시"처럼 바꿔 씁니다.',
          alt: { label: 'rclpy 노드 예시', hl: ['import rclpy', 'class MyNode', 'super().__init__', 'create_publisher', 'create_timer', 'rclpy.init', 'rclpy.spin(', 'try_shutdown'], text: `import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')
        self.pub = self.create_publisher(String, 'chatter', 10)
        self.timer = self.create_timer(0.5, self.on_timer)
        self.count = 0

    def on_timer(self):
        msg = String()
        msg.data = f'Hello ROS 2: {self.count}'
        self.pub.publish(msg)
        self.get_logger().info(f'Publishing: "{msg.data}"')
        self.count += 1


def main(args=None):
    rclpy.init(args=args)
    node = MyNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()`, note: '<code>Node</code> 를 상속한 클래스에서 퍼블리셔·타이머를 만들고, <code>main()</code> 에서 <code>rclpy.init → spin → shutdown</code> 순서로 실행합니다. <code>rclpy</code> · <code>std_msgs</code> 를 import 하므로 package.xml 에 <code>&lt;depend&gt;</code> 가 있어야 합니다.' } },
        { p: 'test/test_copyright.py', lang: 'py', hl: [], text: LINT_HDR + `
from ament_copyright.main import main
import pytest


# Remove the \`skip\` decorator once the source file(s) have a copyright header
@pytest.mark.skip(reason='No copyright header has been placed in the generated source file.')
@pytest.mark.copyright
@pytest.mark.linter
def test_copyright():
    rc = main(argv=['.', 'test'])
    assert rc == 0, 'Found errors'`, note: '<b>린터 테스트</b> 3종(copyright · flake8 · pep257)입니다. <code>colcon test --packages-select my_package</code> 로 실행하면 코드 스타일(PEP 8)·독스트링·저작권 머리말을 검사합니다. 입문 단계에서는 그대로 두면 됩니다.' },
        { p: 'test/test_flake8.py', lang: 'py', hl: [], text: LINT_HDR + `
from ament_flake8.main import main_with_errors
import pytest


@pytest.mark.flake8
@pytest.mark.linter
def test_flake8():
    rc, errors = main_with_errors(argv=[])
    assert rc == 0, \\
        'Found %d code style errors / warnings:\\n' % len(errors) + \\
        '\\n'.join(errors)`, note: 'flake8 으로 파이썬 코드 스타일을 검사합니다.' },
        { p: 'test/test_pep257.py', lang: 'py', hl: [], text: LINT_HDR + `
from ament_pep257.main import main
import pytest


@pytest.mark.linter
@pytest.mark.pep257
def test_pep257():
    rc = main(argv=['.', 'test'])
    assert rc == 0, 'Found code style errors / warnings'`, note: 'PEP 257 독스트링 규칙을 검사합니다.' },
        { p: 'LICENSE', lang: 'txt', hl: [], text: LICENSE_TXT, note: '<code>--license Apache-2.0</code> 옵션으로 라이선스 전문이 자동으로 들어갑니다. package.xml · setup.py 의 license 값과 같아야 합니다. (<code>ros2 pkg create --license ?</code> 로 고를 수 있는 목록을 볼 수 있습니다)' }
      ]
    },
    cmake: {
      label: '⚙ C++ (ament_cmake)', root: 'my_package',
      cmd: 'ros2 pkg create --build-type ament_cmake --license Apache-2.0 --node-name my_node my_package',
      after: 'cd ~/ros2_ws && colcon build --packages-select my_package\nsource install/setup.bash\nros2 run my_package my_node',
      files: [
        { p: 'CMakeLists.txt', lang: 'cmake', hl: ['project(', 'find_package(ament_cmake', 'add_executable', 'install(TARGETS', 'DESTINATION', 'ament_package()'], text: `cmake_minimum_required(VERSION 3.8)
project(my_package)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# find dependencies
find_package(ament_cmake REQUIRED)
# uncomment the following section in order to fill in
# further dependencies manually.
# find_package(<dependency> REQUIRED)

add_executable(my_node src/my_node.cpp)
target_include_directories(my_node PUBLIC
  $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>
  $<INSTALL_INTERFACE:include>)
target_compile_features(my_node PUBLIC c_std_99 cxx_std_17)  # Require C99 and C++17

install(TARGETS my_node
  DESTINATION lib/\${PROJECT_NAME})

if(BUILD_TESTING)
  find_package(ament_lint_auto REQUIRED)
  # the following line skips the linter which checks for copyrights
  # comment the line when a copyright and license is added to all source files
  set(ament_cmake_copyright_FOUND TRUE)
  # the following line skips cpplint (only works in a git repo)
  # comment the line when this package is in a git repo and when
  # a copyright and license is added to all source files
  set(ament_cmake_cpplint_FOUND TRUE)
  ament_lint_auto_find_test_dependencies()
endif()

ament_package()`, note: `C++ 패키지의 <b>빌드 설명서</b>(CMake)입니다.
          <ul><li><code>find_package(… REQUIRED)</code>: 의존 패키지 찾기 — package.xml 의 의존성과 짝을 맞춥니다.</li>
          <li><code>add_executable(my_node src/my_node.cpp)</code>: 소스를 컴파일해 실행 파일을 만듭니다.</li>
          <li><code>install(TARGETS … DESTINATION lib/\${PROJECT_NAME})</code>: <b>이 줄이 없으면 <code>ros2 run</code> 이 실행 파일을 찾지 못합니다</b>.</li>
          <li><code>ament_package()</code>: 항상 맨 끝. ament 인덱스·환경 설정 파일을 만듭니다.</li></ul>`,
          alt: { label: 'rclcpp 의존성 추가', hl: ['find_package(rclcpp', 'find_package(std_msgs', 'ament_target_dependencies'], text: `cmake_minimum_required(VERSION 3.8)
project(my_package)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(my_node src/my_node.cpp)
target_compile_features(my_node PUBLIC c_std_99 cxx_std_17)
ament_target_dependencies(my_node rclcpp std_msgs)

install(TARGETS my_node
  DESTINATION lib/\${PROJECT_NAME})

ament_package()`, note: 'rclcpp 노드를 만들려면 <code>find_package(rclcpp REQUIRED)</code> 로 찾고 <code>ament_target_dependencies()</code> 로 실행 파일에 연결합니다. (Kilted 부터는 <code>target_link_libraries(my_node PUBLIC rclcpp::rclcpp \${std_msgs_TARGETS})</code> 방식을 권장)' } },
        { p: 'package.xml', lang: 'xml', hl: ['<buildtool_depend>', '<depend>', '<build_type>'], text: `${XML_HEAD}
  <name>my_package</name>
  <version>0.0.0</version>
  <description>TODO: Package description</description>
  <maintainer email="user@todo.todo">user</maintainer>
  <license>Apache-2.0</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <depend>rclcpp</depend>
  <depend>std_msgs</depend>

  <test_depend>ament_lint_auto</test_depend>
  <test_depend>ament_lint_common</test_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>`, note: 'C++ 패키지는 <code>&lt;buildtool_depend&gt;ament_cmake&lt;/buildtool_depend&gt;</code> 와 <code>&lt;build_type&gt;ament_cmake</code> 를 씁니다. <code>&lt;depend&gt;rclcpp</code> 줄은 <code>--dependencies rclcpp std_msgs</code> 를 주면 자동으로 들어갑니다. CMakeLists 의 <code>find_package</code> 와 짝을 맞추세요.' },
        { p: 'include/my_package/', dir: true, note: '다른 패키지에 공개할 <b>헤더(.hpp)</b>를 넣는 폴더입니다. 처음에는 비어 있습니다. <code>#include "my_package/xxx.hpp"</code> 처럼 패키지 이름 폴더를 한 번 더 두는 것이 관례입니다.' },
        { p: 'src/my_node.cpp', lang: 'cpp', hl: ['int main', 'printf'], text: `#include <cstdio>

int main(int argc, char ** argv)
{
  (void) argc;
  (void) argv;

  printf("hello world my_package package\\n");
  return 0;
}`, note: '<code>--node-name my_node</code> 가 만든 뼈대입니다. 아직 ROS 코드가 없으니 아래 "rclcpp 노드 예시"처럼 바꿔 씁니다.',
          alt: { label: 'rclcpp 노드 예시', hl: ['rclcpp/rclcpp.hpp', 'std_msgs/msg/string.hpp', 'public rclcpp::Node', 'create_publisher', 'create_wall_timer', 'rclcpp::init', 'rclcpp::spin', 'rclcpp::shutdown'], text: `#include <chrono>
#include <memory>
#include <string>

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

using namespace std::chrono_literals;

class MyNode : public rclcpp::Node
{
public:
  MyNode()
  : Node("my_node"), count_(0)
  {
    pub_ = create_publisher<std_msgs::msg::String>("chatter", 10);
    timer_ = create_wall_timer(500ms, [this]() {
        auto msg = std_msgs::msg::String();
        msg.data = "Hello ROS 2: " + std::to_string(count_++);
        RCLCPP_INFO(get_logger(), "Publishing: '%s'", msg.data.c_str());
        pub_->publish(msg);
      });
  }

private:
  rclcpp::Publisher<std_msgs::msg::String>::SharedPtr pub_;
  rclcpp::TimerBase::SharedPtr timer_;
  size_t count_;
};

int main(int argc, char ** argv)
{
  rclcpp::init(argc, argv);
  rclcpp::spin(std::make_shared<MyNode>());
  rclcpp::shutdown();
  return 0;
}`, note: '<code>rclcpp::Node</code> 를 상속하고 <code>rclcpp::init → spin → shutdown</code> 순서로 실행합니다. CMakeLists 에 rclcpp · std_msgs 의존성을 추가해야 컴파일됩니다.' } },
        { p: 'LICENSE', lang: 'txt', hl: [], text: LICENSE_TXT, note: '<code>--license Apache-2.0</code> 로 생성된 라이선스 전문입니다.' }
      ]
    },
    interfaces: {
      label: '🧩 인터페이스 (msg · srv)', root: 'tutorial_interfaces',
      cmd: 'ros2 pkg create --build-type ament_cmake --license Apache-2.0 tutorial_interfaces\ncd tutorial_interfaces && mkdir msg srv',
      after: 'cd ~/ros2_ws && colcon build --packages-select tutorial_interfaces\nsource install/setup.bash\nros2 interface show tutorial_interfaces/msg/Num',
      files: [
        { p: 'CMakeLists.txt', lang: 'cmake', hl: ['rosidl_default_generators', 'rosidl_generate_interfaces', '.msg"', '.srv"', 'DEPENDENCIES'], text: `cmake_minimum_required(VERSION 3.8)
project(tutorial_interfaces)

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

find_package(ament_cmake REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(\${PROJECT_NAME}
  "msg/Num.msg"
  "msg/Sphere.msg"
  "srv/AddThreeInts.srv"
  DEPENDENCIES geometry_msgs # Add packages that above messages depend on, in this case geometry_msgs for Sphere.msg
)

ament_package()`, note: `<code>rosidl_generate_interfaces()</code> 가 .msg/.srv 파일을 읽어 <b>C++ 헤더 · 파이썬 클래스 · DDS 타입 지원 코드</b>를 자동으로 만들어 줍니다. 새 파일을 추가하면 여기에도 적어야 합니다. 다른 패키지의 타입(여기서는 <code>geometry_msgs/Point</code>)을 쓰면 <code>DEPENDENCIES</code> 에 적습니다.<br>⚠ 인터페이스는 <b>반드시 ament_cmake 패키지</b>에서 만들어야 합니다(파이썬 패키지에서는 생성 불가). 노드와 인터페이스를 다른 패키지로 나누는 것이 관례입니다.` },
        { p: 'package.xml', lang: 'xml', hl: ['rosidl_default_generators', 'rosidl_default_runtime', 'rosidl_interface_packages', '<depend>geometry_msgs'], text: `${XML_HEAD}
  <name>tutorial_interfaces</name>
  <version>0.0.0</version>
  <description>TODO: Package description</description>
  <maintainer email="user@todo.todo">user</maintainer>
  <license>Apache-2.0</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

  <depend>geometry_msgs</depend>
  <buildtool_depend>rosidl_default_generators</buildtool_depend>
  <exec_depend>rosidl_default_runtime</exec_depend>
  <member_of_group>rosidl_interface_packages</member_of_group>

  <test_depend>ament_lint_auto</test_depend>
  <test_depend>ament_lint_common</test_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>`, note: `인터페이스 패키지에 꼭 필요한 세 줄:
          <ul><li><code>&lt;buildtool_depend&gt;rosidl_default_generators</code>: 빌드할 때 코드 생성기 사용</li>
          <li><code>&lt;exec_depend&gt;rosidl_default_runtime</code>: 실행할 때 필요한 런타임</li>
          <li><code>&lt;member_of_group&gt;rosidl_interface_packages</code>: "나는 인터페이스 패키지"라는 표시</li></ul>` },
        { p: 'msg/Num.msg', lang: 'msg', hl: ['num'], text: 'int64 num', note: '가장 단순한 메시지: <code>타입 이름</code> 한 줄이 필드 하나입니다. 파일 이름(<b>Num</b>)이 타입 이름이 되며, 반드시 <b>대문자로 시작하는 CamelCase</b> 여야 합니다. → <code>tutorial_interfaces/msg/Num</code>' },
        { p: 'msg/Sphere.msg', lang: 'msg', hl: ['geometry_msgs/Point'], text: `geometry_msgs/Point center
float64 radius`, note: '다른 메시지를 필드로 넣을 수 있습니다(<code>패키지/타입</code>). 그래서 CMakeLists 의 DEPENDENCIES 와 package.xml 에 <code>geometry_msgs</code> 가 필요합니다. 기본 타입: bool, byte, char, float32/64, int8~64, uint8~64, string, 배열 <code>int32[]</code>, 고정 길이 <code>float64[9]</code>, 상한 <code>string&lt;=10</code>.' },
        { p: 'srv/AddThreeInts.srv', lang: 'msg', hl: ['---'], text: `int64 a
int64 b
int64 c
---
int64 sum`, note: '서비스는 <code>---</code> 를 기준으로 <b>위는 요청(Request), 아래는 응답(Response)</b>입니다. 액션(.action)은 <code>---</code> 두 개로 목표 / 결과 / 피드백을 나눕니다 (<code>action/</code> 폴더, <code>&lt;depend&gt;action_msgs&lt;/depend&gt;</code> 추가).' },
        { p: 'include/tutorial_interfaces/', dir: true, note: '<code>ros2 pkg create</code> 가 만든 빈 폴더입니다. 인터페이스 패키지에서는 쓰지 않으므로 지워도 됩니다.' },
        { p: 'src/', dir: true, note: '빈 폴더입니다. 인터페이스 패키지에는 소스 코드가 없습니다.' },
        { p: 'LICENSE', lang: 'txt', hl: [], text: LICENSE_TXT, note: '라이선스 전문입니다.' }
      ]
    }
  };
  function pkgView(body, o) {
    let kind = PKG_KINDS[o.kind] ? o.kind : 'python', cur = null, useAlt = false;
    body.innerHTML = `<div class="wc-pk">
      <div class="w-row"><div class="w-seg wc-pk-kind">${Object.keys(PKG_KINDS).map(k => `<button data-k="${k}">${PKG_KINDS[k].label}</button>`).join('')}</div></div>
      <div class="wc-pk-cmd"></div>
      <div class="wc-pk-main"><div class="wc-pk-tree"></div><div class="wc-pk-view"></div></div>
      <div class="wc-pk-after"></div>
    </div>`;
    function tree() {
      const K = PKG_KINDS[kind];
      // 경로 → 트리
      const root = { name: K.root + '/', kids: {}, dir: true };
      K.files.forEach(f => {
        const parts = f.p.replace(/\/$/, '').split('/');
        let n = root;
        parts.forEach((pt, i) => {
          const last = i === parts.length - 1;
          const isDir = !last || f.dir;
          n.kids[pt] = n.kids[pt] || { name: pt + (isDir ? '/' : ''), kids: {}, dir: isDir, path: parts.slice(0, i + 1).join('/') + (isDir ? '/' : '') };
          if (last) n.kids[pt].file = f;
          n = n.kids[pt];
        });
      });
      const rows = [];
      const walk = (n, pre, isLast, depth) => {
        if (depth >= 0) rows.push({ n, pre: pre + (depth ? (isLast ? '└── ' : '├── ') : '') });
        const ks = Object.values(n.kids).sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
        ks.forEach((k, i) => walk(k, depth > 0 ? pre + (isLast ? '    ' : '│   ') : '', i === ks.length - 1, depth + 1));
      };
      rows.push({ n: root, pre: '' });
      const ks = Object.values(root.kids).sort((a, b) => (b.dir - a.dir) || a.name.localeCompare(b.name));
      ks.forEach((k, i) => walk(k, '', i === ks.length - 1, 1));
      $(body, '.wc-pk-tree').innerHTML = rows.map(r => {
        const f = r.n.file;
        const ic = r.n.dir ? '📁' : /\.py$/.test(r.n.name) ? '🐍' : /\.xml$/.test(r.n.name) ? '📋' : /\.(cpp|hpp)$/.test(r.n.name) ? '⚙' : /\.(msg|srv|action)$/.test(r.n.name) ? '🧩' : /CMakeLists/.test(r.n.name) ? '🛠' : '📄';
        return `<div class="wc-pk-row${f ? ' click' : ''}${f && cur === f ? ' on' : ''}" ${f ? `data-f="${esc(f.p)}"` : ''}><span class="wc-pk-pre">${esc(r.pre)}</span>${ic} ${esc(r.n.name)}</div>`;
      }).join('');
    }
    function view() {
      const f = cur, v = $(body, '.wc-pk-view');
      if (!f) { v.innerHTML = '<div class="muted">← 파일을 눌러 보세요</div>'; return; }
      const src = useAlt && f.alt ? f.alt : f;
      v.innerHTML = `<div class="wc-pk-vh"><b class="w-out">${esc(PKG_KINDS[kind].root + '/' + f.p)}</b>${f.alt ? `<div class="w-seg wc-pk-alt"><button data-alt="0" class="${useAlt ? '' : 'on'}">생성된 파일</button><button data-alt="1" class="${useAlt ? 'on' : ''}">${esc(f.alt.label)}</button></div>` : ''}</div>
        ${f.dir ? '<div class="wc-term">(빈 폴더)</div>' : codeHTML(src.text || '(빈 파일)', src.text ? f.lang : 'txt', src.hl, { label: f.lang === 'txt' ? '' : f.lang })}
        <div class="wc-note">${src.note || f.note}</div>`;
    }
    function render() {
      const K = PKG_KINDS[kind];
      $$(body, '.wc-pk-kind button').forEach(b => b.classList.toggle('on', b.dataset.k === kind));
      $(body, '.wc-pk-cmd').innerHTML = `<div class="wc-term"><div class="wc-cmd">$ cd ~/ros2_ws/src</div>${K.cmd.split('\n').map(c => `<div class="wc-cmd">$ ${esc(c)}</div>`).join('')}</div>`;
      $(body, '.wc-pk-after').innerHTML = `<div class="small muted">빌드하고 써 보기</div><div class="wc-term">${K.after.split('\n').map(c => `<div class="wc-cmd">$ ${esc(c)}</div>`).join('')}</div>`;
      tree(); view();
    }
    body.addEventListener('click', e => {
      const k = e.target.closest('[data-k]'); if (k && k.closest('.wc-pk-kind')) { kind = k.dataset.k; cur = PKG_KINDS[kind].files[0]; useAlt = false; render(); return; }
      const r = e.target.closest('[data-f]'); if (r) { cur = PKG_KINDS[kind].files.find(f => f.p === r.dataset.f); useAlt = false; tree(); view(); return; }
      const a = e.target.closest('[data-alt]'); if (a) { useAlt = a.dataset.alt === '1'; view(); }
    });
    cur = PKG_KINDS[kind].files.find(f => f.p === o.file) || PKG_KINDS[kind].files[0];
    render();
  }
  mount('pkg', '📦', 'ROS 2 패키지 구조 살펴보기', pkgView);


  /* ==================================================================
     6) colcon — 워크스페이스 빌드 시뮬레이터 + 오버레이/언더레이
     ================================================================== */
  const CB_PKGS = [
    { n: 'my_interfaces', type: 'ament_cmake', deps: [], t: 3.4, what: 'msg/srv 정의 (코드 생성이 오래 걸림)', exe: null },
    { n: 'my_robot_description', type: 'ament_cmake', deps: [], t: 0.9, what: 'URDF · 메시', exe: null },
    { n: 'my_robot_driver', type: 'ament_cmake', deps: ['my_interfaces'], t: 2.3, what: 'C++ 모터 드라이버 노드', exe: 'driver_node' },
    { n: 'my_robot_bringup', type: 'ament_python', deps: ['my_robot_driver', 'my_robot_description'], t: 1.1, what: '런치 · 설정 파일', exe: null },
    { n: 'my_utils', type: 'ament_python', deps: [], t: 1.3, what: '독립 파이썬 도구', exe: 'plot_tool' }
  ];
  function colconView(body, o) {
    const byN = {}; CB_PKGS.forEach(p => { byN[p.n] = p; });
    const st = { installed: new Set(), sym: false, workers: 4, mode: 'all', target: 'my_robot_bringup', bug: o.error === '1' || o.error === 'true', running: null, builtOnce: false, sh: { under: false, over: false } };
    body.innerHTML = `<div class="wc-cb">
      <div class="w-row">
        <label>대상 <select class="w-in" data-k="mode">${opt('all', '전체 (src/ 모두)')}${opt('select', '--packages-select')}${opt('upto', '--packages-up-to')}</select></label>
        <select class="w-in" data-k="target">${CB_PKGS.map(p => opt(p.n, p.n, st.target)).join('')}</select>
        <label class="small"><input type="checkbox" data-k="sym"> --symlink-install</label>
        <label class="small">--parallel-workers <select class="w-in" data-k="workers">${[1, 2, 3, 4].map(n => opt(n, n, 4)).join('')}</select></label>
      </div>
      <div class="w-row">
        <button class="btn small primary" data-a="build">▶ colcon build</button>
        <label class="small"><input type="checkbox" data-k="bug"${st.bug ? ' checked' : ''}> 💥 driver_node.cpp 에 오타 넣기</label>
        <button class="btn small" data-a="fix" hidden>🔧 오타 고치기</button>
        <button class="btn small ghost" data-a="clean">🧹 rm -rf build install log</button>
      </div>
      <div class="wc-term wc-cb-cmd"></div>
      <div class="wc-cb-main">
        <div class="wc-cb-dag"></div>
        <div class="wc-cb-gantt"></div>
      </div>
      <div class="wc-log wc-cb-log"></div>
      <div class="wc-grid2 wc-cb-bottom"><div class="wc-cb-tree"></div><div class="wc-cb-layers"></div></div>
    </div>`;
    const log = LogBox($(body, '.wc-cb-log'), 300);
    function cmdLine() {
      const parts = ['colcon build'];
      if (st.sym) parts.push('--symlink-install');
      if (st.mode === 'select') parts.push('--packages-select ' + st.target);
      if (st.mode === 'upto') parts.push('--packages-up-to ' + st.target);
      if (st.workers !== 4) parts.push('--parallel-workers ' + st.workers);
      return parts.join(' ');
    }
    function selection() {
      if (st.mode === 'all') return CB_PKGS.map(p => p.n);
      if (st.mode === 'select') return [st.target];
      const out = new Set(); const add = n => { if (out.has(n)) return; out.add(n); byN[n].deps.forEach(add); }; add(st.target);
      return CB_PKGS.map(p => p.n).filter(n => out.has(n));
    }
    function syncForm() {
      $(body, '[data-k=mode]').value = st.mode; $(body, '[data-k=target]').value = st.target; $(body, '[data-k=target]').disabled = st.mode === 'all';
      $(body, '[data-k=sym]').checked = st.sym; $(body, '[data-k=workers]').value = st.workers; $(body, '[data-k=bug]').checked = st.bug;
      $(body, '[data-a=fix]').hidden = !st.bug;
      $(body, '.wc-cb-cmd').innerHTML = `<div class="wc-cmd">$ cd ~/ros2_ws</div><div class="wc-cmd">$ ${esc(cmdLine())}</div>`;
      $(body, '[data-a=build]').disabled = !!st.running;
    }
    body.addEventListener('change', e => {
      const el = e.target.closest('[data-k]'); if (!el) return;
      const k = el.dataset.k;
      st[k] = el.type === 'checkbox' ? el.checked : k === 'workers' ? +el.value : el.value;
      syncForm(); if (!st.running) drawDag(null);
    });
    body.addEventListener('click', e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'build') build();
      else if (a.dataset.a === 'fix') { st.bug = false; syncForm(); log.add('# driver_node.cpp 12번째 줄 끝에 ; 를 붙였습니다. 다시 빌드해 보세요.', 'ok'); }
      else if (a.dataset.a === 'clean') { if (st.running) return; st.installed.clear(); st.builtOnce = false; st.sh.over = false; log.clear(); log.add('$ rm -rf build/ install/ log/'); drawDag(null); drawGantt(null, 0); drawTree(); drawLayers(); }
      else if (a.dataset.a === 'src-u') { st.sh.under = true; term('source /opt/ros/jazzy/setup.bash', ''); }
      else if (a.dataset.a === 'src-o') {
        if (!st.builtOnce) term('source install/setup.bash', 'bash: install/setup.bash: No such file or directory');
        else { st.sh.over = true; st.sh.under = true; term('source install/setup.bash', ''); }
      } else if (a.dataset.a === 'run') runCmd();
      else if (a.dataset.a === 'newterm') { st.sh = { under: false, over: false }; tlines = []; term(null); }
      drawLayers();
    });

    /* ---------- 빌드 일정 계산 */
    function schedule() {
      const sel = selection(), selSet = new Set(sel);
      const jobs = {}; sel.forEach(n => { jobs[n] = { n, state: 'pending', start: null, end: null }; });
      const ev = []; // {t, line}
      let t = 0, failed = null;
      const W = st.workers;
      const running = [];
      const depsIn = n => byN[n].deps.filter(d => selSet.has(d));
      const missing = n => byN[n].deps.filter(d => !selSet.has(d) && !st.installed.has(d));
      let guard = 0;
      while (guard++ < 100) {
        // 시작
        if (!failed) {
          for (const n of sel) {
            if (running.length >= W) break;
            const j = jobs[n];
            if (j.state !== 'pending') continue;
            if (depsIn(n).every(d => jobs[d].state === 'done')) {
              j.state = 'run'; j.start = t;
              const miss = byN[n].type === 'ament_cmake' ? missing(n) : [];
              const bug = st.bug && n === 'my_robot_driver';
              j.fail = miss.length ? { at: 0.5, code: 1, miss } : bug ? { at: 1.6, code: 2 } : null;
              j.end = t + (j.fail ? j.fail.at : byN[n].t * (st.sym && byN[n].type === 'ament_python' ? 0.8 : 1));
              running.push(j);
              ev.push({ t, line: `Starting >>> ${n}`, n, s: 'run' });
            }
          }
        }
        if (!running.length) break;
        running.sort((a, b) => a.end - b.end);
        const j = running.shift();
        t = j.end;
        if (j.fail) {
          j.state = 'fail'; failed = j;
          const err = j.fail.miss ? `CMake Error at CMakeLists.txt:12 (find_package):
  By not providing "Find${j.fail.miss[0]}.cmake" in CMAKE_MODULE_PATH this project
  has asked CMake to find a package configuration file provided by
  "${j.fail.miss[0]}", but CMake did not find one.

  Could not find a package configuration file provided by "${j.fail.miss[0]}"
  with any of the following names:

    ${j.fail.miss[0]}Config.cmake
    ${j.fail.miss[0]}-config.cmake` : `/home/user/ros2_ws/src/my_robot_driver/src/driver_node.cpp: In constructor 'DriverNode::DriverNode()':
/home/user/ros2_ws/src/my_robot_driver/src/driver_node.cpp:12:48: error: expected ';' before 'timer_'
   12 |     RCLCPP_INFO(get_logger(), "driver started")
      |                                                ^
      |                                                ;
   13 |     timer_ = create_wall_timer(100ms, [this]() {on_timer();});
      |     ~~~~~~
gmake[2]: *** [CMakeFiles/driver_node.dir/build.make:76: CMakeFiles/driver_node.dir/src/driver_node.cpp.o] Error 1
gmake[1]: *** [CMakeFiles/Makefile2:137: CMakeFiles/driver_node.dir/all] Error 2
gmake: *** [Makefile:146: all] Error 2`;
          ev.push({ t, line: `--- stderr: ${j.n}\n${err}\n---\nFailed   <<< ${j.n} [${(j.end - j.start).toFixed(2)}s, exited with code ${j.fail.code}]`, n: j.n, s: 'fail' });
          running.forEach(r => { r.state = 'abort'; r.end = t; ev.push({ t, line: `Aborted  <<< ${r.n} [${(t - r.start).toFixed(2)}s]`, n: r.n, s: 'abort' }); });
          running.length = 0;
          break;
        }
        j.state = 'done';
        ev.push({ t, line: `Finished <<< ${j.n} [${(j.end - j.start).toFixed(2)}s]`, n: j.n, s: 'done' });
      }
      const total = t;
      const done = sel.filter(n => jobs[n].state === 'done'), fail = sel.filter(n => jobs[n].state === 'fail'), ab = sel.filter(n => jobs[n].state === 'abort'), np = sel.filter(n => jobs[n].state === 'pending');
      const pl = (k, w) => `${k} package${k === 1 ? '' : 's'} ${w}`;
      let sum = `\nSummary: ${pl(done.length, 'finished')} [${(total + 0.3).toFixed(1)}s]`;
      if (fail.length) sum += `\n  ${pl(fail.length, 'failed')}: ${fail.join(' ')}`;
      if (ab.length) sum += `\n  ${pl(ab.length, 'aborted')}: ${ab.join(' ')}`;
      if (fail.length) sum += `\n  ${pl(fail.length, 'had stderr output')}: ${fail.join(' ')}`;
      if (np.length) sum += `\n  ${pl(np.length, 'not processed')}`;
      ev.push({ t: total + 0.3, line: sum, end: true });
      return { jobs, ev, total: total + 0.3, sel };
    }

    /* ---------- 실행 (애니메이션) */
    function build() {
      if (st.running) return;
      log.clear(); log.add('$ ' + cmdLine());
      if (st.mode !== 'all' && st.mode === 'select' && byN[st.target].deps.some(d => !st.installed.has(d))) log.add(`# 주의: --packages-select 는 의존 패키지(${byN[st.target].deps.join(', ')})를 빌드하지 않습니다. 이미 install/ 에 있어야 합니다.`, 'warn');
      const sc = schedule();
      st.running = { sc, t: 0, i: 0 };
      syncForm();
    }
    function tickBuild(dt) {
      const R = st.running; if (!R) return;
      R.t += dt;
      while (R.i < R.sc.ev.length && R.sc.ev[R.i].t <= R.t) {
        const e = R.sc.ev[R.i++];
        log.add(e.line);
        if (e.end) {
          Object.values(R.sc.jobs).forEach(j => { if (j.state === 'done') st.installed.add(j.n); });
          st.builtOnce = st.builtOnce || st.installed.size > 0;
          st.lastSym = st.sym;
          st.running = null; syncForm(); drawTree(); drawLayers();
          drawDag(R.sc, R.t); drawGantt(R.sc, R.t);
          return;
        }
      }
      drawDag(R.sc, R.t); drawGantt(R.sc, R.t);
    }

    /* ---------- 그림: 의존성 그래프 */
    function stateAt(sc, n, t) {
      if (!sc) return st.installed.has(n) ? 'inst' : (selection().includes(n) ? 'sel' : 'off');
      const j = sc.jobs[n]; if (!j) return st.installed.has(n) ? 'inst' : 'off';
      if (j.start == null || t < j.start) return j.state === 'pending' && t >= sc.total ? 'np' : 'wait';
      if (t < j.end) return 'run';
      return j.state;
    }
    const COL = { off: 'gray', sel: 'box', wait: 'box', run: 'yellow', done: 'green', fail: 'red', abort: 'orange', np: 'gray', inst: 'teal' };
    const LBL = { off: '빌드 안 함', sel: '빌드 예정', wait: '대기', run: '빌드 중…', done: '완료', fail: '실패', abort: '중단됨', np: '처리 안 됨', inst: 'install/ 에 있음' };
    function drawDag(sc, t) {
      const el = $(body, '.wc-cb-dag');
      const pos = { my_interfaces: [10, 12], my_robot_description: [10, 92], my_utils: [10, 172], my_robot_driver: [205, 12], my_robot_bringup: [400, 52] };
      let s = `<svg class="dg wc-cb-svg" viewBox="0 0 590 232">`;
      const svgId = 'wccb' + (++svgSeq);
      s += `<defs><marker id="${svgId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="mk"/></marker></defs>`;
      CB_PKGS.forEach(p => p.deps.forEach(d => {
        const [x1, y1] = pos[d], [x2, y2] = pos[p.n];
        s += `<line x1="${x1 + 180}" y1="${y1 + 30}" x2="${x2 - 2}" y2="${y2 + 30}" class="ln" marker-end="url(#${svgId})"/>`;
      }));
      CB_PKGS.forEach(p => {
        const [x, y] = pos[p.n]; const k = stateAt(sc, p.n, t);
        s += `<g class="${k === 'run' ? 'pulse' : ''}"><rect x="${x}" y="${y}" width="180" height="60" rx="10" class="${COL[k]}${k === 'off' || k === 'np' ? ' dash' : ''}"/>
          <text x="${x + 90}" y="${y + 16}" class="t-c t-xs t-b t-mono">${p.n}</text>
          <text x="${x + 90}" y="${y + 33}" class="t-c t-xs t-mu">${p.type} · ${esc(p.what.split(' (')[0])}</text>
          <text x="${x + 90}" y="${y + 49}" class="t-c t-xs t-b">${LBL[k]}</text></g>`;
      });
      s += `<text x="295" y="224" class="t-c t-xs t-mu">화살표: A → B = "B 는 A 에 의존" (A 를 먼저 빌드)</text></svg>`;
      el.innerHTML = s;
    }
    function drawGantt(sc, t) {
      const el = $(body, '.wc-cb-gantt');
      if (!sc) { el.innerHTML = `<div class="small muted">▶ colcon build 를 누르면 패키지가 <b>의존성 순서대로, 가능한 것은 동시에</b> 빌드되는 모습이 여기 보입니다. 워커(worker) 수가 동시에 빌드할 수 있는 최대 개수입니다.</div>`; return; }
      const T = Math.max(sc.total, 1);
      el.innerHTML = `<div class="small muted">시간 → (전체 ${sc.total.toFixed(1)}s, 워커 ${st.workers}개)</div>` + sc.sel.map(n => {
        const j = sc.jobs[n];
        if (j.start == null || t < j.start) return `<div class="wc-cb-row"><span>${n}</span><div class="wc-cb-track"></div></div>`;
        const e = Math.min(t, j.end), k = stateAt(sc, n, t);
        return `<div class="wc-cb-row"><span>${n}</span><div class="wc-cb-track"><i class="wc-cb-bar wc-sw-${COL[k] === 'box' ? 'gray' : COL[k]}" style="left:${(j.start / T * 100).toFixed(2)}%;width:${Math.max(0.5, (e - j.start) / T * 100).toFixed(2)}%"></i></div></div>`;
      }).join('') + `<div class="wc-cb-now" style="left:calc(130px + (100% - 130px) * ${Math.min(1, t / T).toFixed(3)})"></div>`;
    }
    /* ---------- 폴더 */
    function drawTree() {
      const el = $(body, '.wc-cb-tree');
      if (!st.builtOnce) { el.innerHTML = `<div class="wc-sub">📁 ~/ros2_ws</div><div class="wc-term">~/ros2_ws/
└── src/            ← 소스 코드 (내가 작성)
    ${CB_PKGS.map(p => p.n + '/').join('\n    ')}</div><div class="small muted">아직 빌드하지 않아 build/ install/ log/ 가 없습니다.</div>`; return; }
      const inst = CB_PKGS.filter(p => st.installed.has(p.n));
      const py = inst.find(p => p.type === 'ament_python'), cc = inst.find(p => p.exe && p.type === 'ament_cmake');
      const sym = st.lastSym;
      el.innerHTML = `<div class="wc-sub">📁 ~/ros2_ws — 빌드 후</div><div class="wc-term">~/ros2_ws/
├── src/        ← 소스 코드 (내가 작성, git 으로 관리)
├── build/      ← 중간 산출물 (CMake 캐시 · .o 파일)
│   ${inst.map(p => p.n + '/').join('\n│   ')}
├── install/    ← 설치 결과 = 실제로 쓰는 곳
│   ├── setup.bash        (언더레이까지 함께 설정)
│   ├── local_setup.bash  (이 워크스페이스만)
${cc ? `│   ├── ${cc.n}/lib/${cc.n}/${cc.exe}\n` : ''}${py ? `│   ├── ${py.n}/lib/python3.12/site-packages/${py.n}/${sym ? '  → (심볼릭 링크: build/ → src/)' : '  (복사본)'}\n│   ├── ${py.n}/share/${py.n}/launch/${sym ? '  → src/ 로 링크' : '  (복사본)'}\n` : ''}│   └── … (${inst.length}개 패키지)
└── log/        ← 빌드 로그
    ├── latest_build → build_${new Date().toISOString().slice(0, 10)}_…
    └── build_…/${inst[0] ? inst[0].n : ''}/stdout_stderr.log</div>
      <div class="small">${sym ? '✔ <b>--symlink-install</b>: 파이썬 코드 · 런치 · 설정 파일이 src/ 로 링크되어 <b>고친 뒤 다시 빌드하지 않아도</b> 바로 반영됩니다 (C++ 는 여전히 다시 빌드, setup.py 의 entry_points 를 바꿨을 때도 다시 빌드).' : '💡 기본 빌드는 파일을 install/ 로 <b>복사</b>합니다. 파이썬 파일을 고칠 때마다 다시 빌드해야 하므로, 개발 중에는 <code>--symlink-install</code> 을 많이 씁니다.'}</div>`;
    }
    /* ---------- 오버레이 / 언더레이 */
    let tlines = [];
    function term(cmd, out) {
      if (cmd != null) { tlines.push('$ ' + cmd); if (out) tlines.push(out); }
      tlines = tlines.slice(-12);
      const t = $(body, '.wc-cb-t'); if (t) { t.textContent = tlines.join('\n') || '(새 터미널)'; t.scrollTop = t.scrollHeight; }
    }
    function runCmd() {
      const c = 'ros2 run my_robot_driver driver_node';
      if (!st.sh.under) return term(c, 'ros2: command not found');
      if (!st.sh.over || !st.installed.has('my_robot_driver')) return term(c, "Package 'my_robot_driver' not found");
      term(c, `[INFO] [${ROS.graph.stampStr()}] [driver_node]: driver started`);
    }
    function drawLayers() {
      const el = $(body, '.wc-cb-layers');
      const U = st.sh.under, O = st.sh.over;
      el.innerHTML = `<div class="wc-sub">🥞 오버레이 · 언더레이</div>
        <div class="wc-cb-stack">
          <div class="wc-cb-ly over${O ? ' on' : ''}"><b>오버레이</b> <code>~/ros2_ws/install</code><small>${st.installed.size ? [...st.installed].join(', ') : '(비어 있음)'}</small></div>
          <div class="wc-cb-ly under${U ? ' on' : ''}"><b>언더레이</b> <code>/opt/ros/jazzy</code><small>rclpy, rclcpp, turtlesim, rviz2, nav2 … (apt 로 설치)</small></div>
        </div>
        <div class="small">위 층이 아래 층을 덮습니다. 같은 이름의 패키지가 있으면 <b>오버레이 것이 이깁니다</b>. <code>install/setup.bash</code> 는 빌드할 때 활성화돼 있던 언더레이까지 함께 설정하고, <code>local_setup.bash</code> 는 이 워크스페이스만 설정합니다.</div>
        <div class="w-btns"><button class="btn tiny" data-a="src-u">source /opt/ros/jazzy/setup.bash</button><button class="btn tiny" data-a="src-o">source install/setup.bash</button><button class="btn tiny" data-a="run">ros2 run my_robot_driver driver_node</button><button class="btn tiny ghost" data-a="newterm">새 터미널</button></div>
        <div class="wc-term wc-cb-t"></div>
        <div class="small muted">💡 빌드한 그 터미널이 아니라 <b>새 터미널</b>에서 source 하는 것이 안전합니다. 매번 치기 귀찮다면 <code>~/.bashrc</code> 에 <code>source /opt/ros/jazzy/setup.bash</code> 를 넣어 둡니다.</div>`;
      term(null);
    }
    syncForm(); drawDag(null); drawGantt(null, 0); drawTree(); drawLayers();
    const stop = RosUI.loop(body, dt => tickBuild(dt));
    return () => stop();
  }
  mount('colcon', '🔨', 'colcon 빌드 시뮬레이터 · 워크스페이스', colconView);


  /* ==================================================================
     7) launch — 런치 파일 해부 + 실제 실행 (ROS.run)
     ================================================================== */
  const MIMIC_REMAP = ['--ros-args', '-r', '__node:=mimic', '-r', '/input/pose:=/turtlesim1/turtle1/pose', '-r', '/output/cmd_vel:=/turtlesim2/turtle1/cmd_vel'];
  const LAUNCH_PRESETS = {
    turtles: {
      label: '🐢 거북이 둘 + mimic', file: 'turtlesim_mimic_launch',
      hl: ['Node(', 'namespace', 'name', 'remappings', "('/", '<node', '<remap', 'node:', 'remap:', 'from:'],
      py: `from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package='turtlesim',
            namespace='turtlesim1',
            executable='turtlesim_node',
            name='sim'
        ),
        Node(
            package='turtlesim',
            namespace='turtlesim2',
            executable='turtlesim_node',
            name='sim'
        ),
        Node(
            package='turtlesim',
            executable='mimic',
            name='mimic',
            remappings=[
                ('/input/pose', '/turtlesim1/turtle1/pose'),
                ('/output/cmd_vel', '/turtlesim2/turtle1/cmd_vel'),
            ]
        )
    ])`,
      xml: `<launch>
  <node pkg="turtlesim" exec="turtlesim_node" name="sim" namespace="turtlesim1"/>
  <node pkg="turtlesim" exec="turtlesim_node" name="sim" namespace="turtlesim2"/>
  <node pkg="turtlesim" exec="mimic" name="mimic">
    <remap from="/input/pose" to="/turtlesim1/turtle1/pose"/>
    <remap from="/output/cmd_vel" to="/turtlesim2/turtle1/cmd_vel"/>
  </node>
</launch>`,
      yaml: `launch:
- node:
    pkg: turtlesim
    exec: turtlesim_node
    name: sim
    namespace: turtlesim1
- node:
    pkg: turtlesim
    exec: turtlesim_node
    name: sim
    namespace: turtlesim2
- node:
    pkg: turtlesim
    exec: mimic
    name: mimic
    remap:
    - from: /input/pose
      to: /turtlesim1/turtle1/pose
    - from: /output/cmd_vel
      to: /turtlesim2/turtle1/cmd_vel`,
      note: '같은 실행 파일(turtlesim_node)을 <b>네임스페이스</b>만 바꿔 두 번 띄우고, <b>mimic</b> 노드의 토픽 이름을 <b>리매핑</b>해 거북이1의 움직임을 거북이2가 따라 하게 만듭니다. 실행 후 "거북이1 움직이기"를 눌러 보세요.',
      run: () => [['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__node:=sim', '-r', '__ns:=/turtlesim1']], ['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__node:=sim', '-r', '__ns:=/turtlesim2']], ['turtlesim', 'mimic', MIMIC_REMAP]],
      graph: { nodes: ['/turtlesim1/sim', '/mimic', '/turtlesim2/sim'], topics: ['/turtlesim1/turtle1/cmd_vel', '/turtlesim1/turtle1/pose', '/turtlesim2/turtle1/cmd_vel'], edges: [['/turtlesim1/turtle1/cmd_vel', '/turtlesim1/sim'], ['/turtlesim1/sim', '/turtlesim1/turtle1/pose'], ['/turtlesim1/turtle1/pose', '/mimic'], ['/mimic', '/turtlesim2/turtle1/cmd_vel'], ['/turtlesim2/turtle1/cmd_vel', '/turtlesim2/sim']] },
      drive: '/turtlesim1/turtle1/cmd_vel'
    },
    remap: {
      label: '🔀 리매핑', file: 'remap_launch',
      hl: ['remappings', "('chatter'", '<remap', 'remap:', 'from:'],
      py: `from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package='demo_nodes_py',
            executable='talker',
            remappings=[('chatter', 'my_chatter')],
        ),
        Node(
            package='demo_nodes_py',
            executable='listener',
            remappings=[('chatter', 'my_chatter')],
        ),
    ])`,
      xml: `<launch>
  <node pkg="demo_nodes_py" exec="talker">
    <remap from="chatter" to="my_chatter"/>
  </node>
  <node pkg="demo_nodes_py" exec="listener">
    <remap from="chatter" to="my_chatter"/>
  </node>
</launch>`,
      yaml: `launch:
- node:
    pkg: demo_nodes_py
    exec: talker
    remap:
    - from: chatter
      to: my_chatter
- node:
    pkg: demo_nodes_py
    exec: listener
    remap:
    - from: chatter
      to: my_chatter`,
      note: '코드는 그대로 두고 <b>토픽 이름만 바꿔</b> 연결합니다(리매핑). 명령줄에서는 <code>ros2 run demo_nodes_py talker --ros-args -r chatter:=my_chatter</code> 와 같습니다. 한쪽만 리매핑하면 두 노드는 서로 다른 토픽을 써서 연결이 끊어집니다.',
      run: () => [['demo_nodes_py', 'talker', ['--ros-args', '-r', 'chatter:=my_chatter']], ['demo_nodes_py', 'listener', ['--ros-args', '-r', 'chatter:=my_chatter']]],
      graph: { nodes: ['/talker', '/listener'], topics: ['/my_chatter'], edges: [['/talker', '/my_chatter'], ['/my_chatter', '/listener']] }
    },
    params: {
      label: '⚙ 파라미터 · 인자', file: 'params_launch', args: { background_r: '200' },
      hl: ['DeclareLaunchArgument', 'LaunchConfiguration', 'parameters', "'background_", '<arg', '<param', 'arg:', 'param:', '$(var'],
      py: `from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    background_r = LaunchConfiguration('background_r')
    return LaunchDescription([
        DeclareLaunchArgument(
            'background_r', default_value='200',
            description='배경색 빨강 성분 (0~255)'),
        Node(
            package='turtlesim',
            executable='turtlesim_node',
            name='sim',
            parameters=[{
                'background_r': background_r,
                'background_g': 86,
                'background_b': 255,
            }],
        ),
    ])`,
      xml: `<launch>
  <arg name="background_r" default="200" description="배경색 빨강 성분 (0~255)"/>
  <node pkg="turtlesim" exec="turtlesim_node" name="sim">
    <param name="background_r" value="$(var background_r)"/>
    <param name="background_g" value="86"/>
    <param name="background_b" value="255"/>
  </node>
</launch>`,
      yaml: `launch:
- arg:
    name: background_r
    default: "200"
    description: 배경색 빨강 성분 (0~255)
- node:
    pkg: turtlesim
    exec: turtlesim_node
    name: sim
    param:
    - name: background_r
      value: $(var background_r)
    - name: background_g
      value: 86
    - name: background_b
      value: 255`,
      note: '<code>DeclareLaunchArgument</code> 로 런치 <b>인자</b>를 선언하고 <code>LaunchConfiguration</code> 으로 값을 꺼내 노드 <b>파라미터</b>로 넘깁니다. 실행할 때 <code>background_r:=50</code> 처럼 바꿀 수 있고, <code>ros2 launch … --show-args</code> 로 인자 목록을 볼 수 있습니다. 파라미터가 많으면 <code>parameters=[\'config/params.yaml\']</code> 처럼 YAML 파일을 넘깁니다.',
      run: a => [['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__node:=sim', '-p', 'background_r:=' + clamp(Math.trunc(+a.background_r || 0), 0, 255), '-p', 'background_g:=86', '-p', 'background_b:=255']]],
      graph: { nodes: ['/sim'], topics: ['/turtle1/cmd_vel', '/turtle1/pose'], edges: [['/turtle1/cmd_vel', '/sim'], ['/sim', '/turtle1/pose']] },
      drive: '/turtle1/cmd_vel'
    },
    ns: {
      label: '🗂 네임스페이스 그룹', file: 'namespace_launch',
      hl: ['GroupAction', 'PushRosNamespace', '<group', 'push_ros_namespace', 'group:', 'namespace:'],
      py: `from launch import LaunchDescription
from launch.actions import GroupAction
from launch_ros.actions import Node, PushRosNamespace


def generate_launch_description():
    robots = []
    for name in ['robot1', 'robot2']:
        robots.append(GroupAction([
            PushRosNamespace(name),
            Node(package='demo_nodes_py', executable='talker'),
            Node(package='demo_nodes_py', executable='listener'),
        ]))
    return LaunchDescription(robots)`,
      xml: `<launch>
  <group>
    <push_ros_namespace namespace="robot1"/>
    <node pkg="demo_nodes_py" exec="talker"/>
    <node pkg="demo_nodes_py" exec="listener"/>
  </group>
  <group>
    <push_ros_namespace namespace="robot2"/>
    <node pkg="demo_nodes_py" exec="talker"/>
    <node pkg="demo_nodes_py" exec="listener"/>
  </group>
</launch>`,
      yaml: `launch:
- group:
    children:
    - push_ros_namespace:
        namespace: robot1
    - node:
        pkg: demo_nodes_py
        exec: talker
    - node:
        pkg: demo_nodes_py
        exec: listener
- group:
    children:
    - push_ros_namespace:
        namespace: robot2
    - node:
        pkg: demo_nodes_py
        exec: talker
    - node:
        pkg: demo_nodes_py
        exec: listener`,
      note: '<code>GroupAction</code> + <code>PushRosNamespace</code> 로 묶인 노드는 모두 같은 <b>네임스페이스</b>에 들어갑니다. 상대 이름(<code>chatter</code>)은 <code>/robot1/chatter</code> 가 되므로 로봇 두 대가 서로 섞이지 않습니다. (절대 이름 <code>/chatter</code> 는 네임스페이스의 영향을 받지 않습니다)',
      run: () => ['robot1', 'robot2'].flatMap(r => [['demo_nodes_py', 'talker', ['--ros-args', '-r', '__ns:=/' + r]], ['demo_nodes_py', 'listener', ['--ros-args', '-r', '__ns:=/' + r]]]),
      graph: { nodes: ['/robot1/talker', '/robot1/listener', '/robot2/talker', '/robot2/listener'], topics: ['/robot1/chatter', '/robot2/chatter'], edges: [['/robot1/talker', '/robot1/chatter'], ['/robot1/chatter', '/robot1/listener'], ['/robot2/talker', '/robot2/chatter'], ['/robot2/chatter', '/robot2/listener']] }
    },
    include: {
      label: '📎 다른 런치 포함', file: 'include_launch',
      hl: ['IncludeLaunchDescription', 'PythonLaunchDescriptionSource', 'FindPackageShare', 'multisim', '<include', 'include:', 'file:'],
      py: `from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    return LaunchDescription([
        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(PathJoinSubstitution([
                FindPackageShare('turtlesim'), 'launch', 'multisim.launch.py'
            ]))
        ),
        Node(
            package='turtlesim',
            executable='mimic',
            remappings=[
                ('/input/pose', '/turtlesim1/turtle1/pose'),
                ('/output/cmd_vel', '/turtlesim2/turtle1/cmd_vel'),
            ],
        ),
    ])`,
      xml: `<launch>
  <include file="$(find-pkg-share turtlesim)/launch/multisim.launch.py"/>
  <node pkg="turtlesim" exec="mimic">
    <remap from="/input/pose" to="/turtlesim1/turtle1/pose"/>
    <remap from="/output/cmd_vel" to="/turtlesim2/turtle1/cmd_vel"/>
  </node>
</launch>`,
      yaml: `launch:
- include:
    file: $(find-pkg-share turtlesim)/launch/multisim.launch.py
- node:
    pkg: turtlesim
    exec: mimic
    remap:
    - from: /input/pose
      to: /turtlesim1/turtle1/pose
    - from: /output/cmd_vel
      to: /turtlesim2/turtle1/cmd_vel`,
      note: '<code>IncludeLaunchDescription</code> 으로 <b>다른 패키지의 런치 파일</b>(여기서는 turtlesim 의 <code>multisim.launch.py</code>: 네임스페이스가 다른 turtlesim 두 개)을 통째로 불러오고, 노드를 더합니다. 큰 로봇 시스템은 이렇게 작은 런치 파일을 조립해 만듭니다. 인자는 <code>launch_arguments={\'x\': \'1\'}.items()</code> 로 넘깁니다.',
      run: () => [['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__ns:=/turtlesim1']], ['turtlesim', 'turtlesim_node', ['--ros-args', '-r', '__ns:=/turtlesim2']], ['turtlesim', 'mimic', MIMIC_REMAP]],
      graph: { nodes: ['/turtlesim1/turtlesim', '/mimic', '/turtlesim2/turtlesim'], topics: ['/turtlesim1/turtle1/cmd_vel', '/turtlesim1/turtle1/pose', '/turtlesim2/turtle1/cmd_vel'], edges: [['/turtlesim1/turtle1/cmd_vel', '/turtlesim1/turtlesim'], ['/turtlesim1/turtlesim', '/turtlesim1/turtle1/pose'], ['/turtlesim1/turtle1/pose', '/mimic'], ['/mimic', '/turtlesim2/turtle1/cmd_vel'], ['/turtlesim2/turtle1/cmd_vel', '/turtlesim2/turtlesim']] },
      drive: '/turtlesim1/turtle1/cmd_vel'
    }
  };
  function launchView(body, o, owner) {
    let key = LAUNCH_PRESETS[o.preset] ? o.preset : 'turtles', fmt = 'py', procs = [], largs = {}, driveT = null;
    body.innerHTML = `<div class="wc-la">
      <div class="w-row"><div class="w-seg wc-la-pre">${Object.keys(LAUNCH_PRESETS).map(k => `<button data-p="${k}">${LAUNCH_PRESETS[k].label}</button>`).join('')}</div></div>
      <div class="wc-la-main">
        <div class="wc-la-code"><div class="w-seg wc-la-fmt"><button data-f="py">Python</button><button data-f="xml">XML</button><button data-f="yaml">YAML</button></div><div class="wc-la-src"></div></div>
        <div class="wc-la-right"><div class="wc-sub">실행하면 생기는 그래프</div><div class="wc-stage wc-la-graph"></div><div class="wc-note wc-la-note"></div></div>
      </div>
      <div class="wc-term wc-la-cmd"></div>
      <div class="w-row wc-la-args"></div>
      <div class="w-row"><button class="btn small primary" data-a="run">▶ 실행</button><button class="btn small" data-a="stop" disabled>■ 종료 (Ctrl+C)</button><button class="btn small ghost" data-a="drive" hidden>🐢 거북이1 움직이기</button><span class="small muted wc-la-st"></span></div>
      <div class="wc-log wc-la-log"></div>
    </div>`;
    const log = LogBox($(body, '.wc-la-log'), 300);
    const P = () => LAUNCH_PRESETS[key];
    function cmd() {
      const a = Object.entries(largs).map(([k, v]) => ` ${k}:=${v}`).join('');
      return `ros2 launch ${P().file}.${fmt === 'py' ? 'py' : fmt}${a}`;
    }
    function render() {
      $$(body, '.wc-la-pre button').forEach(b => b.classList.toggle('on', b.dataset.p === key));
      $$(body, '.wc-la-fmt button').forEach(b => b.classList.toggle('on', b.dataset.f === fmt));
      const p = P();
      $(body, '.wc-la-src').innerHTML = codeHTML(p[fmt], fmt === 'py' ? 'py' : fmt, p.hl, { label: `${p.file}.${fmt}` });
      $(body, '.wc-la-note').innerHTML = p.note;
      $(body, '.wc-la-args').innerHTML = p.args ? Object.keys(p.args).map(k => `<label>런치 인자 <code>${k}</code> <input class="w-in wc-num" type="number" min="0" max="255" data-arg="${k}" value="${esc(largs[k] != null ? largs[k] : p.args[k])}"></label>`).join('') + ' <span class="small muted">(기본값 200 — 바꾸면 명령에 <code>k:=v</code> 가 붙습니다)</span>' : '';
      updCmd(); drawGraph();
    }
    function updCmd() { $(body, '.wc-la-cmd').innerHTML = `<div class="wc-cmd">$ ${esc(cmd())}</div>`; }
    body.addEventListener('input', e => { const a = e.target.closest('[data-arg]'); if (!a) return; const d = P().args[a.dataset.arg]; if (a.value === '' || a.value === d) delete largs[a.dataset.arg]; else largs[a.dataset.arg] = a.value; updCmd(); });
    body.addEventListener('click', e => {
      const p = e.target.closest('[data-p]'); if (p) { if (procs.length) stop(); key = p.dataset.p; largs = {}; render(); return; }
      const f = e.target.closest('[data-f]'); if (f) { fmt = f.dataset.f; render(); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 'run') run(); else if (a.dataset.a === 'stop') stop(); else if (a.dataset.a === 'drive') drive();
    });

    /* ---------- 그래프 그림 (rqt_graph 풍) */
    let gEls = {};
    function drawGraph() {
      const g = P().graph, el = $(body, '.wc-la-graph');
      const narrow = isNarrow(body) || el.clientWidth < 420;
      // 순위(rank) = 가장 긴 경로
      const ids = g.nodes.concat(g.topics);
      const rank = {}; ids.forEach(i => { rank[i] = 0; });
      for (let k = 0; k < ids.length; k++) g.edges.forEach(([a, b]) => { if (rank[b] < rank[a] + 1) rank[b] = rank[a] + 1; });
      const cols = {}; ids.forEach(i => { (cols[rank[i]] = cols[rank[i]] || []).push(i); });
      const nR = Object.keys(cols).length, maxC = Math.max(...Object.values(cols).map(c => c.length));
      const CW = narrow ? 190 : 200, RH = 56;
      const W = narrow ? Math.max(1, maxC) * CW + 20 : nR * CW + 20, H = narrow ? nR * 70 + 20 : Math.max(1, maxC) * RH + 30;
      const pos = {};
      Object.entries(cols).forEach(([r, list]) => list.forEach((id, i) => {
        pos[id] = narrow ? [10 + CW / 2 + i * CW + (maxC - list.length) * CW / 2, 30 + r * 70] : [10 + CW / 2 + r * CW, 20 + RH / 2 + i * RH + (maxC - list.length) * RH / 2];
      }));
      const nsOf = id => { const p = id.split('/'); return p.length > 2 ? p[1] : ''; };
      const nss = [...new Set(g.nodes.map(nsOf).filter(Boolean))];
      const nsCls = id => { const k = nss.indexOf(nsOf(id)); return k < 0 ? 'blue' : ['purple', 'teal', 'orange'][k % 3]; };
      const sid = 'wcla' + (++svgSeq);
      let s = `<svg class="dg wc-la-svg" viewBox="0 0 ${W} ${H}"><defs><marker id="${sid}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="mk"/></marker></defs>`;
      const hw = id => g.nodes.includes(id) ? 88 : 90, hh = 17;
      g.edges.forEach(([a, b]) => {
        const [x1, y1] = pos[a], [x2, y2] = pos[b];
        const ex = narrow ? x2 : x2 - hw(b), ey = narrow ? y2 - hh : y2;
        const sx = narrow ? x1 : x1 + hw(a), sy = narrow ? y1 + hh : y1;
        s += `<line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" class="ln" marker-end="url(#${sid})"/>`;
      });
      ids.forEach(id => {
        const [x, y] = pos[id], isN = g.nodes.includes(id);
        s += isN ? `<g data-g="${esc(id)}"><ellipse cx="${x}" cy="${y}" rx="${hw(id)}" ry="${hh}" class="${nsCls(id)} wc-la-n"/><text x="${x}" y="${y}" class="t-c t-xs t-b t-mono">${esc(id)}</text></g>`
          : `<g data-g="${esc(id)}"><rect x="${x - hw(id)}" y="${y - hh + 3}" width="${hw(id) * 2}" height="${hh * 2 - 6}" rx="4" class="box wc-la-t"/><text x="${x}" y="${y}" class="t-c t-xs t-mono">${esc(id)}</text></g>`;
      });
      s += `</svg>`;
      el.innerHTML = s + `<div class="small muted">⬭ 노드 · ▭ 토픽 · 색 = 네임스페이스. 실행 중인 노드는 굵게 표시됩니다.</div>`;
      gEls = {}; $$(el, '[data-g]').forEach(x => { gEls[x.dataset.g] = x; });
      liveGraph();
    }
    const counts = {};
    function liveGraph() {
      Object.entries(gEls).forEach(([id, e]) => {
        if (P().graph.nodes.includes(id)) e.classList.toggle('wc-live', !!ROS.findNode(id));
        else { const t = ROS.topic(id); const c = t ? t.count : 0; e.classList.toggle('wc-live', !!(t && (t.pubs.length || t.subs.length))); e.classList.toggle('wc-flow', c !== counts[id] && !!t); counts[id] = c; }
      });
    }

    /* ---------- 실행 / 종료 */
    function run() {
      if (procs.length) return;
      log.clear();
      log.add('$ ' + cmd());
      log.add(`[INFO] [launch]: All log files can be found below /home/user/.ros/log/${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}-webros-${Math.floor(Math.random() * 90000 + 10000)}`);
      log.add('[INFO] [launch]: Default logging verbosity is set to INFO');
      const list = P().run(Object.assign({}, P().args || {}, largs));
      const cnt = {};
      list.forEach(([pkg, exe, argv]) => {
        const k = (cnt[exe] = (cnt[exe] || 0) + 1), label = `${exe}-${procs.length + 1}`;
        try {
          const p = ROS.run(pkg, exe, argv, { out: l => log.add(`[${label}] ${l}`) });
          p.label = label;
          p.nodes.forEach(n => { n.owner = owner; });
          log.add(`[INFO] [${label}]: process started with pid [${p.pid}]`);
          p.done.then(code => { log.add(`[INFO] [${label}]: process has finished cleanly [pid ${p.pid}]`); procs = procs.filter(x => x !== p); if (!procs.length) ended(); });
          procs.push(p);
        } catch (e) { log.add(`[ERROR] [launch]: ${pkg}/${exe}: ${e.message}`); }
      });
      if (procs.length) { $(body, '[data-a=run]').disabled = true; $(body, '[data-a=stop]').disabled = false; $(body, '[data-a=drive]').hidden = !P().drive; $(body, '.wc-la-st').textContent = `실행 중: 프로세스 ${procs.length}개 — 터미널에서 ros2 node list 로 확인해 보세요`; }
    }
    function stop() {
      if (!procs.length) return;
      log.add('^C[WARNING] [launch]: user interrupted with ctrl-c (SIGINT)');
      procs.slice().forEach(p => p.stop(0));
    }
    function ended() {
      if (driveT) { clearInterval(driveT); driveT = null; }
      $(body, '[data-a=run]').disabled = false; $(body, '[data-a=stop]').disabled = true; $(body, '[data-a=drive]').hidden = true; $(body, '.wc-la-st').textContent = '';
    }
    function drive() {
      if (driveT) return;
      let n = 0;
      const topic = P().drive;
      log.add(`$ ros2 topic pub -r 10 ${topic} geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}"   (3초)`);
      driveT = setInterval(() => { ROS.publishOnce(topic, 'geometry_msgs/msg/Twist', { linear: { x: 2.0 }, angular: { z: 1.8 } }); if (++n >= 30) { clearInterval(driveT); driveT = null; } }, 100);
    }
    render();
    const offW = onWidth(body, drawGraph);
    const iv = setInterval(() => { if (!body.isConnected) return; liveGraph(); }, 400);
    return () => { clearInterval(iv); offW(); if (driveT) clearInterval(driveT); procs.slice().forEach(p => p.stop(0)); };
  }
  mount('launch', '🚀', '런치 파일 해부 · 실행', launchView);


  /* ==================================================================
     8) bag — rosbag2 녹화 / 재생 (ROS.bag)
     ================================================================== */
  function bagView(body, o, owner) {
    if (!ROS.bag) { body.innerHTML = '<div class="muted">ROS.bag 을 찾을 수 없습니다.</div>'; return; }
    const HIDE = new Set(['/rosout', '/parameter_events']);
    const chosen = new Set(), known = new Set();
    let rec = null, play = null, sel = null, rate = 1, loop = false, recT0 = 0, playT0 = 0, tsProc = null;
    body.innerHTML = `<div class="wc-bg">
      <div class="wc-bg-cols">
        <div class="wc-card"><div class="wc-card-h">● 녹화 <small>ros2 bag record</small></div>
          <div class="wc-bg-topics"></div>
          <div class="w-row"><label class="small">이름(-o) <input class="w-in wc-bg-name" style="width:15em"></label></div>
          <div class="w-btns"><button class="btn small primary" data-a="rec">● 녹화</button><button class="btn small" data-a="stoprec" disabled>■ 정지</button><span class="wc-bg-recst small"></span></div>
          <div class="wc-bg-empty"></div>
        </div>
        <div class="wc-card"><div class="wc-card-h">▶ 재생 <small>ros2 bag play</small></div>
          <div class="wc-bg-list"></div>
          <div class="w-row"><label class="small">--rate <select class="w-in" data-k="rate">${opt(0.5, '0.5×')}${opt(1, '1×', 1)}${opt(2, '2×')}</select></label><label class="small"><input type="checkbox" data-k="loop"> --loop</label></div>
          <div class="w-btns"><button class="btn small primary" data-a="play" disabled>▶ 재생</button><button class="btn small" data-a="stopplay" disabled>■ 정지</button><button class="btn small ghost" data-a="export" disabled>⬇ JSON 내보내기</button><label class="btn small ghost wc-bg-imp">⬆ JSON 불러오기<input type="file" accept=".json,application/json" hidden></label></div>
        </div>
      </div>
      <div class="wc-term wc-bg-cmd"></div>
      <div class="wc-stage wc-bg-tl"><canvas></canvas></div>
      <div class="wc-grid2"><div class="wc-term wc-bg-info"></div><div class="wc-log wc-bg-log"></div></div>
    </div>`;
    const log = LogBox($(body, '.wc-bg-log'), 200);
    const cv = $(body, '.wc-bg-tl canvas');
    const nameEl = $(body, '.wc-bg-name');
    const stamp = () => { const d = new Date(), p = n => String(n).padStart(2, '0'); return `rosbag2_${d.getFullYear()}_${p(d.getMonth() + 1)}_${p(d.getDate())}-${p(d.getHours())}_${p(d.getMinutes())}_${p(d.getSeconds())}`; };
    nameEl.value = stamp();
    function topics() {
      const list = ROS.topicList().filter(t => t.type && (t.pubs > 0 || t.subs > 0));
      const el = $(body, '.wc-bg-topics');
      list.forEach(t => { if (!known.has(t.name)) { known.add(t.name); if (!HIDE.has(t.name) && !/\/_action\//.test(t.name)) chosen.add(t.name); } });
      el.innerHTML = list.length ? list.map(t => `<label class="wc-bg-t"><input type="checkbox" data-t="${esc(t.name)}"${chosen.has(t.name) ? ' checked' : ''}${rec ? ' disabled' : ''}> <code>${esc(t.name)}</code> <small class="muted">${esc(t.type)}</small></label>`).join('') : '<div class="muted small">토픽이 없습니다</div>';
      const useful = list.filter(t => !HIDE.has(t.name));
      $(body, '.wc-bg-empty').innerHTML = useful.length ? '' : `<div class="wc-note">녹화할 토픽이 없습니다. turtlesim 을 켜고 거북이를 움직여 보세요.
        <div class="w-btns" style="margin-top:6px"><button class="btn small" data-a="ts">🐢 turtlesim 실행</button></div></div>`;
      if (ROS.findNode('/turtlesim') || useful.some(t => /cmd_vel/.test(t.name))) $(body, '.wc-bg-empty').innerHTML += `<div class="wc-bg-pad"><span class="small muted">/turtle1/cmd_vel 보내기 (또는 터미널에서 <code>ros2 run turtlesim turtle_teleop_key</code>)</span>
        <div class="wc-bg-keys"><button class="btn tiny" data-mv="0,2">▲</button><button class="btn tiny" data-mv="2,0">◀</button><button class="btn tiny" data-mv="-2,0">▶</button><button class="btn tiny" data-mv="0,-2">▼</button></div></div>`;
      updCmd();
    }
    function updCmd() {
      const nm = nameEl.value.trim() || 'my_bag';
      const tl = [...chosen].filter(t => known.has(t));
      $(body, '.wc-bg-cmd').innerHTML = `<div class="wc-cmd">$ ros2 bag record -o ${esc(nm)} ${esc(tl.join(' ') || '--all')}</div>` + (sel ? `<div class="wc-cmd">$ ros2 bag info ${esc(sel)}</div><div class="wc-cmd">$ ros2 bag play ${esc(sel)}${rate !== 1 ? ' --rate ' + rate : ''}${loop ? ' --loop' : ''}</div>` : '');
    }
    function bags() {
      const names = ROS.bag.list();
      if (!sel || !ROS.bag.bags[sel]) sel = names[names.length - 1] || null;
      $(body, '.wc-bg-list').innerHTML = names.length ? names.map(n => { const b = ROS.bag.bags[n]; return `<label class="wc-bg-b"><input type="radio" name="wcbg${svgSeq}" data-b="${esc(n)}"${n === sel ? ' checked' : ''}> <code>${esc(n)}</code> <small class="muted">${b.msgs.length}개${b.recording ? ' · 녹화 중' : ''}</small></label>`; }).join('') : '<div class="muted small">아직 bag 이 없습니다. 먼저 녹화하세요.</div>';
      const ok = sel && ROS.bag.bags[sel] && !ROS.bag.bags[sel].recording;
      $(body, '[data-a=play]').disabled = !ok || !!play; $(body, '[data-a=export]').disabled = !ok;
      $(body, '.wc-bg-info').innerHTML = sel ? `<div class="wc-cmd">$ ros2 bag info ${esc(sel)}</div>${esc(ROS.bag.info(sel) || '')}` : '<span class="muted">bag 을 고르면 정보가 보입니다</span>';
      updCmd();
    }
    body.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.t) { if (t.checked) chosen.add(t.dataset.t); else chosen.delete(t.dataset.t); updCmd(); }
      else if (t.dataset.b) { sel = t.dataset.b; bags(); }
      else if (t.dataset.k === 'rate') { rate = +t.value; updCmd(); }
      else if (t.dataset.k === 'loop') { loop = t.checked; updCmd(); }
      else if (t.type === 'file' && t.files[0]) {
        const f = t.files[0]; t.value = '';
        f.text().then(txt => {
          const j = JSON.parse(txt);
          if (!j || !j.topics || !Array.isArray(j.msgs)) throw new Error('rosbag JSON 형식이 아닙니다');
          let nm = j.name || f.name.replace(/\.json$/, ''); while (ROS.bag.bags[nm]) nm += '_1';
          ROS.bag.bags[nm] = { name: nm, topics: j.topics, msgs: j.msgs, start: j.start, end: j.end, recording: false, stop() { return this; } };
          sel = nm; bags(); log.add(`[INFO] ${nm} 을(를) 불러왔습니다 (${j.msgs.length}개 메시지)`);
        }).catch(err => log.add('[ERROR] ' + err.message));
      }
    });
    nameEl.oninput = updCmd;
    body.addEventListener('click', e => {
      const mv = e.target.closest('[data-mv]');
      if (mv) { const [x, z] = mv.dataset.mv.split(',').map(Number); ROS.publishOnce('/turtle1/cmd_vel', 'geometry_msgs/msg/Twist', { linear: { x }, angular: { z } }); return; }
      const a = e.target.closest('[data-a]'); if (!a) return;
      const k = a.dataset.a;
      if (k === 'ts') {
        try { tsProc = ROS.run('turtlesim', 'turtlesim_node', [], { out: l => log.add(l) }); tsProc.nodes.forEach(n => { n.owner = owner; }); } catch (err) { log.add('[ERROR] ' + err.message); }
      } else if (k === 'rec') {
        const list = [...chosen].filter(t => known.has(t));
        if (!list.length) { RosUI.toast('녹화할 토픽을 하나 이상 고르세요'); return; }
        let nm = nameEl.value.trim() || stamp();
        if (ROS.bag.bags[nm]) { nm = nm + '_' + Math.floor(Math.random() * 100); nameEl.value = nm; }
        log.clear(); log.add(`$ ros2 bag record -o ${nm} ${list.join(' ')}`);
        rec = ROS.bag.record(list, nm, { out: l => log.add(l) });
        recT0 = performance.now();
        a.disabled = true; $(body, '[data-a=stoprec]').disabled = false;
        sel = nm; topics(); bags();
      } else if (k === 'stoprec') {
        if (!rec) return;
        rec.stop(); log.add(`[INFO] [rosbag2_recorder]: Recording stopped\n[INFO] [rosbag2_cpp]: Writing remaining messages from cache to the bag. It may take a while\n[INFO] [rosbag2_recorder]: Event publisher thread: Exiting`);
        rec = null; a.disabled = true; $(body, '[data-a=rec]').disabled = false; $(body, '.wc-bg-recst').textContent = '';
        nameEl.value = stamp(); topics(); bags();
      } else if (k === 'play') {
        if (play || !sel) return;
        log.add(`$ ros2 bag play ${sel}${rate !== 1 ? ' --rate ' + rate : ''}${loop ? ' --loop' : ''}`);
        try {
          play = ROS.bag.play(sel, { rate, loop }, { out: l => log.add(l), done: () => { play = null; log.add('[INFO] [rosbag2_player]: Playback finished'); bags(); $(body, '[data-a=stopplay]').disabled = true; } });
          play.node.owner = owner; play._name = sel;
          playT0 = performance.now();
          $(body, '[data-a=stopplay]').disabled = false; bags();
        } catch (err) { log.add('[ERROR] ' + err.message); }
      } else if (k === 'stopplay') { if (play) { play.stop(); play = null; log.add('[INFO] [rosbag2_player]: 재생을 멈췄습니다'); } a.disabled = true; bags(); }
      else if (k === 'export') {
        const b = ROS.bag.bags[sel]; if (!b) return;
        download(sel + '.json', JSON.stringify({ name: b.name, topics: b.topics, start: b.start, end: b.end, msgs: b.msgs }, null, 1));
      }
    });

    /* ---------- 타임라인 */
    function drawTL() {
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      const C = RosUI.colors();
      ctx.clearRect(0, 0, w, h);
      const b = sel && ROS.bag.bags[sel];
      ctx.font = '12px sans-serif'; ctx.textBaseline = 'middle';
      if (!b) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('녹화한 bag 의 메시지가 시간축 위에 표시됩니다', w / 2, h / 2); return; }
      const tps = Object.keys(b.topics);
      const end = b.recording ? ROS.graph.nowSec() : (b.end || b.start + 1);
      const dur = Math.max(0.5, end - b.start);
      const lw = Math.min(170, w * 0.35), x0 = lw + 6, x1 = w - 10;
      const rh = Math.max(16, Math.min(28, (h - 26) / Math.max(1, tps.length)));
      const cols = [C.blue, C.teal, C.orange, C.purple, C.green, C.red];
      tps.forEach((t, i) => {
        const y = 8 + i * rh + rh / 2;
        ctx.fillStyle = C.fg; ctx.textAlign = 'right'; ctx.fillText(t.length > 24 ? '…' + t.slice(-23) : t, lw, y);
        ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
      });
      const idx = {}; tps.forEach((t, i) => { idx[t] = i; });
      const n = b.msgs.length, step = n > 3000 ? Math.ceil(n / 3000) : 1;
      for (let k = 0; k < n; k += step) {
        const m = b.msgs[k], i = idx[m.topic]; if (i == null) continue;
        const x = x0 + (m.t - b.start) / dur * (x1 - x0), y = 8 + i * rh + rh / 2;
        ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(x - 0.75, y - rh * 0.32, 1.5, rh * 0.64);
      }
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('0 s', x0, h - 8); ctx.textAlign = 'right'; ctx.fillText(dur.toFixed(1) + ' s', x1, h - 8);
      if (play && sel === play._name) {
        const first = b.msgs.length ? b.msgs[0].t : b.start;
        const span = b.msgs.length ? b.msgs[b.msgs.length - 1].t - first + 0.05 : 0.05;
        let el = (performance.now() - playT0) / 1000 * rate; if (loop && span > 0) el %= span;
        const x = x0 + (first - b.start + el) / dur * (x1 - x0);
        ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, 2); ctx.lineTo(x, h - 16); ctx.stroke();
      }
      if (b.recording) { ctx.fillStyle = C.red; ctx.textAlign = 'center'; ctx.fillText('● REC', (x0 + x1) / 2, h - 8); }
    }
    let acc = 0;
    const offG = ROS.on('graph', () => { if (!rec) topics(); });
    topics(); bags();
    const stop = RosUI.loop(body, dt => {
      drawTL();
      acc += dt;
      if (acc > 0.5) {
        acc = 0;
        if (rec) { $(body, '.wc-bg-recst').textContent = `● ${((performance.now() - recT0) / 1000).toFixed(1)}s · ${rec.msgs.length}개`; bags(); }
      }
    });
    return () => { stop(); offG(); if (rec) rec.stop(); if (play) play.stop(); if (tsProc) tsProc.stop(); };
  }
  mount('bag', '🎞', 'rosbag2 녹화 · 재생', bagView, { view: 'rosbag', w: 820, h: 640 });


  /* ==================================================================
     9) exec — 실행기(Executor) · 콜백 그룹 타임라인 (순수 시뮬레이션)
     ================================================================== */
  const EX_CB = {
    timer: { label: '타이머', color: 'orange' },
    sub: { label: '구독', color: 'blue' },
    srv: { label: '서비스', color: 'purple' },
    cli: { label: '응답(클라이언트)', color: 'teal' }
  };
  const EX_GROUPS = { A: '기본 그룹 (MutuallyExclusive)', B: 'MutuallyExclusive 그룹 2', R: 'Reentrant 그룹' };
  const EX_PRESETS = {
    single: { label: '① 단일 스레드', c: { multi: false, threads: 2, g: { timer: 'A', sub: 'A', srv: 'A', cli: 'A' }, sync: false } },
    multiSame: { label: '② 멀티스레드 + 기본 그룹', c: { multi: true, threads: 2, g: { timer: 'A', sub: 'A', srv: 'A', cli: 'A' }, sync: false } },
    multiSplit: { label: '③ 멀티스레드 + 그룹 나누기', c: { multi: true, threads: 3, g: { timer: 'A', sub: 'R', srv: 'B', cli: 'A' }, sync: false } },
    deadlock: { label: '④ 교착 상태 재현', c: { multi: false, threads: 2, g: { timer: 'A', sub: 'A', srv: 'A', cli: 'A' }, sync: true } },
    fixed: { label: '⑤ 교착 해결', c: { multi: true, threads: 2, g: { timer: 'A', sub: 'A', srv: 'B', cli: 'B' }, sync: true } }
  };
  function execSim(c) {
    const T = 6000, dt = 5;
    const jobs = [], ready = [], future = [], arr = { timer: [], sub: [], srv: [] };
    const nTh = c.multi ? c.threads : 1;
    const running = Array(nTh).fill(null);
    const st = { missed: 0, dropped: 0 };
    let nT = c.timerP, nS = 120, nV = 700, seq = 0, dead = null;
    const mk = (cb, t, extra) => { const j = Object.assign({ id: ++seq, cb, ready: t, g: c.g[cb], start: null, end: null, segs: [], remain: cb === 'timer' ? (c.sync ? 150 : c.timerD) : cb === 'sub' ? c.subD : cb === 'srv' ? c.srvD : 30 }, extra || {}); jobs.push(j); return j; };
    const blockedBy = g => running.some(j => j && j.g === g);
    for (let t = 0; t <= T; t += dt) {
      // 도착
      if (t >= nT) { nT += c.timerP; arr.timer.push(t); if (ready.some(j => j.cb === 'timer')) st.missed++; else ready.push(mk('timer', t, { phase: 'pre' })); }
      if (t >= nS) { nS += c.subP; arr.sub.push(t); const q = ready.filter(j => j.cb === 'sub'); if (q.length >= 10) { ready.splice(ready.indexOf(q[0]), 1); q[0].dropped = true; st.dropped++; } ready.push(mk('sub', t)); }
      if (t >= nV) { nV += 2000; arr.srv.push(t); ready.push(mk('srv', t)); }
      for (let i = future.length - 1; i >= 0; i--) if (future[i].ready <= t) { ready.push(future[i]); future.splice(i, 1); }
      // 배정
      for (let th = 0; th < nTh; th++) {
        if (running[th]) continue;
        const k = ready.findIndex(j => j.g === 'R' || !blockedBy(j.g));
        if (k < 0) break;
        const j = ready.splice(k, 1)[0];
        j.start = t; j.th = th; running[th] = j;
        j.segs.push({ th, s: t, e: null, k: 'run' });
      }
      // 진행
      for (let th = 0; th < nTh; th++) {
        const j = running[th]; if (!j) continue;
        if (j.blocked) {
          if (!dead && t - j.blockT > 1200) {
            const need = ready.concat(future).find(x => x.parent === j || (x.cb === 'srv' && x.fromTimer === j));
            const why = !need ? '' : (nTh === 1 ? 'thread' : (need.g !== 'R' && blockedBy(need.g)) ? 'group' : 'thread');
            dead = { t: j.blockT, why, need: need ? need.cb : '' };
          }
          continue;
        }
        j.remain -= dt;
        if (j.remain > 0) continue;
        const seg = j.segs[j.segs.length - 1]; seg.e = t + dt;
        if (j.cb === 'timer' && c.sync && j.phase === 'pre') {
          j.phase = 'wait'; j.blocked = true; j.blockT = t + dt;
          j.segs.push({ th, s: t + dt, e: null, k: 'wait' });
          future.push(mk('srv', t + 15, { fromTimer: j }));
          continue;
        }
        running[th] = null; j.end = t + dt;
        if (j.cb === 'srv' && j.fromTimer) future.push(mk('cli', t + 15, { parent: j.fromTimer }));
        if (j.cb === 'cli' && j.parent) {
          const p = j.parent; p.blocked = false; p.phase = 'post'; p.remain = Math.max(10, c.timerD - 150);
          const ws = p.segs[p.segs.length - 1]; ws.e = t + dt;
          p.segs.push({ th: p.th, s: t + dt, e: null, k: 'run' });
        }
      }
    }
    jobs.forEach(j => j.segs.forEach(s => { if (s.e == null) s.e = T; }));
    return { T, jobs, arr, st, dead, nTh };
  }
  function execView(body, o) {
    const pre = EX_PRESETS[o.preset] ? o.preset : 'single';
    let C = Object.assign({ timerP: 1000, timerD: 800, subP: 250, subD: 60, srvD: 200 }, JSON.parse(JSON.stringify(EX_PRESETS[pre].c)));
    let preKey = pre, R = null, t0 = performance.now(), speed = 1;
    body.innerHTML = `<div class="wc-ex">
      <div class="w-row"><div class="w-seg wc-ex-pre">${Object.keys(EX_PRESETS).map(k => `<button data-p="${k}">${EX_PRESETS[k].label}</button>`).join('')}</div></div>
      <div class="wc-ex-cfg">
        <div class="wc-card"><div class="wc-card-h">실행기 (Executor)</div>
          <div class="w-seg wc-ex-type"><button data-x="0">SingleThreadedExecutor</button><button data-x="1">MultiThreadedExecutor</button></div>
          <label class="small">스레드 수 <select class="w-in" data-k="threads">${[2, 3, 4].map(n => opt(n)).join('')}</select></label>
          <label class="small"><input type="checkbox" data-k="sync"> 타이머 콜백 안에서 서비스를 <b>동기 호출</b> <code>client.call()</code></label>
        </div>
        <div class="wc-card"><div class="wc-card-h">콜백 그룹</div>
          ${['timer', 'sub', 'srv', 'cli'].map(k => `<label class="small wc-ex-g"><i class="wc-sw-${EX_CB[k].color}"></i>${EX_CB[k].label} <select class="w-in" data-g="${k}">${Object.entries(EX_GROUPS).map(([v, l]) => opt(v, l)).join('')}</select></label>`).join('')}
        </div>
        <div class="wc-card"><div class="wc-card-h">콜백 시간</div>
          <label class="wc-slider">타이머 주기 <input type="range" min="500" max="2000" step="100" data-n="timerP"> <b class="w-out"></b></label>
          <label class="wc-slider">타이머 콜백 <input type="range" min="100" max="1500" step="50" data-n="timerD"> <b class="w-out"></b></label>
          <label class="wc-slider">메시지 간격 <input type="range" min="100" max="1000" step="50" data-n="subP"> <b class="w-out"></b></label>
          <label class="wc-slider">구독 콜백 <input type="range" min="20" max="400" step="10" data-n="subD"> <b class="w-out"></b></label>
          <label class="wc-slider">서비스 콜백 <input type="range" min="50" max="800" step="25" data-n="srvD"> <b class="w-out"></b></label>
        </div>
      </div>
      <div class="wc-ex-verdict"></div>
      <div class="wc-stage wc-ex-stage"><canvas></canvas></div>
      <div class="w-row"><button class="btn small" data-a="replay">⟲ 다시 재생</button><label class="small">속도 <select class="w-in" data-k="speed">${opt(0.5, '0.5×')}${opt(1, '1×', 1)}${opt(2, '2×')}</select></label><span class="wc-ex-stats small"></span></div>
      <details class="wc-det"><summary>이 설정의 rclpy 코드</summary><div class="wc-ex-code"></div></details>
    </div>`;
    const cv = $(body, '.wc-ex-stage canvas');
    function sync() {
      $$(body, '.wc-ex-pre button').forEach(b => b.classList.toggle('on', b.dataset.p === preKey));
      $$(body, '.wc-ex-type button').forEach(b => b.classList.toggle('on', +b.dataset.x === (C.multi ? 1 : 0)));
      $(body, '[data-k=threads]').value = C.threads; $(body, '[data-k=threads]').disabled = !C.multi;
      $(body, '[data-k=sync]').checked = C.sync;
      $$(body, '[data-g]').forEach(s => { s.value = C.g[s.dataset.g]; s.closest('label').style.opacity = s.dataset.g === 'cli' && !C.sync ? 0.5 : 1; });
      $$(body, '[data-n]').forEach(r => { r.value = C[r.dataset.n]; r.nextElementSibling.textContent = C[r.dataset.n] + ' ms'; });
    }
    function rerun() {
      R = execSim(C); t0 = performance.now();
      const v = $(body, '.wc-ex-verdict');
      const g = C.g, allSame = (!C.sync ? ['timer', 'sub', 'srv'] : ['timer', 'sub', 'srv', 'cli']).every(k => g[k] === 'A');
      let cls = 'ok', msg;
      if (R.dead) {
        cls = 'bad';
        msg = `💀 <b>교착 상태(deadlock)!</b> 타이머 콜백이 <code>client.call()</code> 로 응답을 기다리며 스레드를 붙잡고 있는데, ${R.dead.why === 'thread' ? `응답을 처리할 <b>남는 스레드가 없습니다</b>${C.multi ? '' : ' (SingleThreadedExecutor 는 스레드가 1개)'}` : `응답을 처리할 ${EX_CB[R.dead.need] ? EX_CB[R.dead.need].label : ''} 콜백이 <b>타이머와 같은 MutuallyExclusive 그룹</b>이라 실행될 수 없습니다`}. 둘 다 영원히 기다립니다.<br>해결: ① <code>MultiThreadedExecutor</code> + 서비스·클라이언트를 <b>다른 콜백 그룹</b>에 넣기 ② 콜백 안에서는 <code>call_async()</code> 와 콜백(future.add_done_callback)을 쓰기.`;
      } else if (!C.multi) msg = '🧵 스레드가 하나라 콜백이 <b>한 번에 하나씩</b>만 실행됩니다. 느린 타이머 콜백이 도는 동안 구독 메시지와 서비스 요청은 큐에서 기다립니다(▲ 도착 → 실행까지의 가는 선).';
      else if (allSame) { cls = 'warn'; msg = `⚠ 스레드는 ${C.threads}개지만 모든 콜백이 노드의 <b>기본 콜백 그룹(MutuallyExclusive)</b>에 있어 여전히 한 번에 하나씩 실행됩니다. 흔한 오해! 병렬로 돌리려면 콜백 그룹을 나누세요.`; }
      else msg = `✔ 서로 다른 그룹의 콜백은 <b>다른 스레드에서 동시에</b> 실행됩니다. 같은 MutuallyExclusive 그룹 안에서는 여전히 하나씩, Reentrant 그룹은 같은 콜백끼리도 겹쳐 실행될 수 있습니다(공유 데이터는 lock 으로 보호해야 함).`;
      if (C.sync && !R.dead) msg += '<br>✔ 동기 호출이 성공했습니다: 서비스·응답 콜백이 다른 스레드/그룹에서 실행될 수 있었기 때문입니다.';
      v.className = 'wc-ex-verdict ' + cls; v.innerHTML = msg;
      // 통계
      const s = {};
      ['timer', 'sub', 'srv'].forEach(k => { const js = R.jobs.filter(j => j.cb === k && j.start != null); const w = js.map(j => j.start - j.ready); s[k] = { n: js.length, avg: w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0, max: w.length ? Math.max(...w) : 0 }; });
      $(body, '.wc-ex-stats').innerHTML = ['timer', 'sub', 'srv'].map(k => `${EX_CB[k].label} 대기 평균 <b>${Math.round(s[k].avg)}</b> / 최대 <b>${Math.round(s[k].max)}</b> ms`).join(' · ') + (R.st.missed ? ` · 놓친 타이머 ${R.st.missed}` : '') + (R.st.dropped ? ` · 버린 메시지 ${R.st.dropped}` : '');
      // 코드
      const grp = k => C.g[k] === 'A' ? '' : `, callback_group=self.${C.g[k] === 'B' ? 'group_b' : 'group_r'}`;
      const ex = C.multi ? `MultiThreadedExecutor(num_threads=${C.threads})` : 'SingleThreadedExecutor()';
      $(body, '.wc-ex-code').innerHTML = codeHTML(`import rclpy
from rclpy.node import Node
from rclpy.executors import ${C.multi ? 'MultiThreadedExecutor' : 'SingleThreadedExecutor'}
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup, ReentrantCallbackGroup
from std_msgs.msg import String
from std_srvs.srv import Trigger


class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')
        self.group_b = MutuallyExclusiveCallbackGroup()
        self.group_r = ReentrantCallbackGroup()
        self.timer = self.create_timer(${(C.timerP / 1000).toFixed(1)}, self.on_timer${grp('timer')})
        self.sub = self.create_subscription(String, 'data', self.on_msg, 10${grp('sub')})
        self.srv = self.create_service(Trigger, 'compute', self.on_srv${grp('srv')})
        self.cli = self.create_client(Trigger, 'compute'${grp('cli')})

    def on_timer(self):  # 약 ${C.timerD} ms 걸림
${C.sync ? `        res = self.cli.call(Trigger.Request())  # 동기 호출: 응답이 올 때까지 이 스레드가 멈춤
        self.get_logger().info(res.message)` : `        heavy_work()`}


def main():
    rclpy.init()
    node = MyNode()
    executor = ${ex}
    executor.add_node(node)
    executor.spin()`, 'py', ['callback_group=', 'Executor(', 'self.cli.call'], { label: 'python' });
    }
    body.addEventListener('click', e => {
      const p = e.target.closest('[data-p]'); if (p) { preKey = p.dataset.p; C = Object.assign({}, C, JSON.parse(JSON.stringify(EX_PRESETS[preKey].c))); sync(); rerun(); return; }
      const x = e.target.closest('[data-x]'); if (x) { C.multi = x.dataset.x === '1'; preKey = null; sync(); rerun(); return; }
      const a = e.target.closest('[data-a]'); if (a && a.dataset.a === 'replay') t0 = performance.now();
    });
    body.addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.g) C.g[t.dataset.g] = t.value;
      else if (t.dataset.k === 'threads') C.threads = +t.value;
      else if (t.dataset.k === 'sync') C.sync = t.checked;
      else if (t.dataset.k === 'speed') { speed = +t.value; return; }
      else return;
      preKey = null; sync(); rerun();
    });
    body.addEventListener('input', e => { const t = e.target; if (!t.dataset.n) return; C[t.dataset.n] = +t.value; t.nextElementSibling.textContent = t.value + ' ms'; preKey = null; sync(); rerun(); });

    function draw() {
      const { w, h, ctx } = RosUI.fitCanvas(cv);
      const K = RosUI.colors();
      ctx.clearRect(0, 0, w, h);
      if (!R) return;
      const now = Math.min(R.T, (performance.now() - t0) * speed);
      const lw = w < 500 ? 62 : 92, x0 = lw, x1 = w - 8;
      const X = t => x0 + t / R.T * (x1 - x0);
      const rows = [['timer', '타이머 ▲'], ['sub', '구독 ▲'], ['srv', '서비스 ▲']];
      const ah = 20, th = Math.max(26, Math.min(40, (h - 3 * ah - 40) / R.nTh));
      ctx.font = (w < 500 ? 10.5 : 12) + 'px sans-serif'; ctx.textBaseline = 'middle';
      // 눈금
      ctx.strokeStyle = K.line; ctx.lineWidth = 1; ctx.fillStyle = K.muted; ctx.textAlign = 'center';
      for (let s = 0; s <= R.T; s += 1000) { const x = X(s); ctx.beginPath(); ctx.moveTo(x, 4); ctx.lineTo(x, h - 16); ctx.stroke(); ctx.fillText(s / 1000 + 's', x, h - 7); }
      // 도착 행
      rows.forEach(([k, label], i) => {
        const y = 10 + i * ah + ah / 2;
        ctx.fillStyle = K.muted; ctx.textAlign = 'right'; ctx.fillText(label, lw - 6, y);
        const col = K[EX_CB[k].color];
        R.jobs.filter(j => j.cb === k && !j.fromTimer && j.ready <= now).forEach(j => {
          const x = X(j.ready);
          ctx.fillStyle = j.dropped ? K.red : col;
          ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x - 5, y + 5); ctx.lineTo(x + 5, y + 5); ctx.closePath(); ctx.fill();
          const e = j.start != null ? Math.min(now, j.start) : now;
          if (e - j.ready > 20) { ctx.strokeStyle = col; ctx.globalAlpha = 0.5; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(X(e), y); ctx.stroke(); ctx.globalAlpha = 1; }
        });
      });
      // 스레드 행
      const ty0 = 10 + 3 * ah + 8;
      for (let t = 0; t < R.nTh; t++) {
        const y = ty0 + t * th;
        ctx.fillStyle = K.card2; ctx.fillRect(x0, y + 2, x1 - x0, th - 4);
        ctx.fillStyle = K.fg; ctx.textAlign = 'right'; ctx.fillText(`스레드 ${t + 1}`, lw - 6, y + th / 2);
      }
      R.jobs.forEach(j => j.segs.forEach(s => {
        if (s.s > now) return;
        const e = Math.min(s.e, now), y = ty0 + s.th * th;
        const xa = X(s.s), xb = Math.max(xa + 1.5, X(e));
        if (s.k === 'wait') {
          ctx.fillStyle = K.red; ctx.globalAlpha = 0.18; ctx.fillRect(xa, y + 4, xb - xa, th - 8); ctx.globalAlpha = 1;
          ctx.strokeStyle = K.red; ctx.lineWidth = 1;
          ctx.save(); ctx.beginPath(); ctx.rect(xa, y + 4, xb - xa, th - 8); ctx.clip();
          for (let x = xa - th; x < xb; x += 8) { ctx.beginPath(); ctx.moveTo(x, y + th - 4); ctx.lineTo(x + th - 8, y + 4); ctx.stroke(); }
          ctx.restore();
          if (xb - xa > 70) { ctx.fillStyle = K.red; ctx.textAlign = 'left'; ctx.fillText('call() 응답 대기…', xa + 4, y + th / 2); }
          return;
        }
        ctx.fillStyle = K[EX_CB[j.cb].color]; ctx.fillRect(xa, y + 4, xb - xa, th - 8);
        if (xb - xa > 34) { ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(EX_CB[j.cb].label.replace('(클라이언트)', ''), xa + 3, y + th / 2); }
      }));
      if (R.dead && now > R.dead.t + 1200) {
        ctx.fillStyle = K.red; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('💀 DEADLOCK — 아무것도 진행되지 않습니다', (x0 + x1) / 2, ty0 + R.nTh * th + 2 > h - 20 ? ty0 - 4 : ty0 + R.nTh * th + 6);
      }
      // 재생 막대
      ctx.strokeStyle = K.fg; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(now), 2); ctx.lineTo(X(now), h - 16); ctx.stroke();
    }
    sync(); rerun();
    const stop = RosUI.loop(body, () => draw());
    return () => stop();
  }
  mount('exec', '🧵', '실행기(Executor)와 콜백 그룹', execView, { view: 'executor', w: 900, h: 680 });


  /* ==================================================================
     10) lifecycle — 관리형(라이프사이클) 노드 상태 기계
         node.lifecycle = { state, stateId, available(), transitions(), trigger(name) }
     ================================================================== */
  (function addLifecycleIfaces() {
    const D = window.ROS_IFACES = window.ROS_IFACES || {};
    const def = (k, v) => { if (D[k] == null) D[k] = v; };
    def('lifecycle_msgs/msg/State', `# Primary state definitions as depicted in:
# http://design.ros2.org/articles/node_lifecycle.html
uint8 PRIMARY_STATE_UNKNOWN = 0
uint8 PRIMARY_STATE_UNCONFIGURED = 1
uint8 PRIMARY_STATE_INACTIVE = 2
uint8 PRIMARY_STATE_ACTIVE = 3
uint8 PRIMARY_STATE_FINALIZED = 4
# Temporary intermediate states.
uint8 TRANSITION_STATE_CONFIGURING = 10
uint8 TRANSITION_STATE_CLEANINGUP = 11
uint8 TRANSITION_STATE_SHUTTINGDOWN = 12
uint8 TRANSITION_STATE_ACTIVATING = 13
uint8 TRANSITION_STATE_DEACTIVATING = 14
uint8 TRANSITION_STATE_ERRORPROCESSING = 15

# The state id value from the above definitions.
uint8 id
# A text label of the state.
string label`);
    def('lifecycle_msgs/msg/Transition', `uint8 TRANSITION_CREATE = 0
uint8 TRANSITION_CONFIGURE = 1
uint8 TRANSITION_CLEANUP = 2
uint8 TRANSITION_ACTIVATE = 3
uint8 TRANSITION_DEACTIVATE = 4
uint8 TRANSITION_UNCONFIGURED_SHUTDOWN  = 5
uint8 TRANSITION_INACTIVE_SHUTDOWN = 6
uint8 TRANSITION_ACTIVE_SHUTDOWN = 7
uint8 TRANSITION_DESTROY = 8

# The transition id from above definitions.
uint8 id
# A text label of the transition.
string label`);
    def('lifecycle_msgs/msg/TransitionDescription', `# The transition id and label of this description.
Transition transition
# The current state from which this transition transitions.
State start_state
# The desired target state of this transition.
State goal_state`);
    def('lifecycle_msgs/msg/TransitionEvent', `# The time point at which this event occurred.
uint64 timestamp
# The id and label of this transition event.
Transition transition
# The starting state from which this event transitioned.
State start_state
# The end state of this transition event.
State goal_state`);
    def('lifecycle_msgs/srv/ChangeState', `# The requested transition.
Transition transition
---
# Indicates whether the service was able to initiate the state transition
bool success`);
    def('lifecycle_msgs/srv/GetState', `---
# The current state-machine state of the node.
State current_state`);
    def('lifecycle_msgs/srv/GetAvailableStates', `---
State[] available_states`);
    def('lifecycle_msgs/srv/GetAvailableTransitions', `---
TransitionDescription[] available_transitions`);
  })();
  const LC_ST = { unknown: 0, unconfigured: 1, inactive: 2, active: 3, finalized: 4, configuring: 10, cleaningup: 11, shuttingdown: 12, activating: 13, deactivating: 14, errorprocessing: 15 };
  const LC_TR = [
    { id: 1, label: 'configure', from: 'unconfigured', via: 'configuring', to: 'inactive', cb: 'on_configure' },
    { id: 2, label: 'cleanup', from: 'inactive', via: 'cleaningup', to: 'unconfigured', cb: 'on_cleanup' },
    { id: 3, label: 'activate', from: 'inactive', via: 'activating', to: 'active', cb: 'on_activate' },
    { id: 4, label: 'deactivate', from: 'active', via: 'deactivating', to: 'inactive', cb: 'on_deactivate' },
    { id: 5, label: 'shutdown', from: 'unconfigured', via: 'shuttingdown', to: 'finalized', cb: 'on_shutdown', key: 'unconfigured_shutdown' },
    { id: 6, label: 'shutdown', from: 'inactive', via: 'shuttingdown', to: 'finalized', cb: 'on_shutdown', key: 'inactive_shutdown' },
    { id: 7, label: 'shutdown', from: 'active', via: 'shuttingdown', to: 'finalized', cb: 'on_shutdown', key: 'active_shutdown' }
  ];
  function lifecycleView(body, o, owner) {
    let lastHtml = '', node = null, listener = null, lc = null, anim = null, cfgResult = 'SUCCESS', pubCount = 0, recvCount = 0, lastMsg = '';
    body.innerHTML = `<div class="wc-lc">
      <div class="wc-stage wc-lc-stage"></div>
      <div class="w-row wc-lc-btns">
        ${['configure', 'activate', 'deactivate', 'cleanup', 'shutdown'].map(t => `<button class="btn small" data-t="${t}">${t}</button>`).join('')}
        <button class="btn small ghost" data-a="recreate" hidden>🔄 노드 다시 만들기</button>
        <label class="small">on_configure() 결과 <select class="w-in" data-k="cfg">${opt('SUCCESS')}${opt('FAILURE')}${opt('ERROR')}</select></label>
      </div>
      <div class="wc-lc-pub"></div>
      <div class="wc-grid2"><div class="wc-term wc-lc-cli"></div><div class="wc-log wc-lc-log"></div></div>
      <div class="wc-note small">💡 라이프사이클 노드는 <b>설정(configure) → 활성화(activate)</b> 단계를 밖에서 조종할 수 있는 노드입니다. 드라이버·센서처럼 "준비가 끝난 뒤에만 데이터를 내보내야 하는" 노드에 씁니다. Nav2 는 <code>lifecycle_manager</code> 가 모든 노드를 차례로 configure → activate 합니다.
        <br>명령: <code>ros2 lifecycle nodes</code> · <code>ros2 lifecycle get /lc_talker</code> · <code>ros2 lifecycle list /lc_talker</code> · <code>ros2 lifecycle set /lc_talker activate</code> · <code>ros2 service call /lc_talker/change_state lifecycle_msgs/srv/ChangeState "{transition: {id: 3}}"</code></div>
    </div>`;
    const log = LogBox($(body, '.wc-lc-log'), 150);
    const cliEl = $(body, '.wc-lc-cli');
    let cliLines = [];
    const cli = (c, out) => { cliLines.push('$ ' + c); if (out) cliLines.push(out); cliLines = cliLines.slice(-14); cliEl.textContent = cliLines.join('\n'); cliEl.scrollTop = cliEl.scrollHeight; };
    $(body, '[data-k=cfg]').onchange = e => { cfgResult = e.target.value; };

    function create() {
      const name = uniqName('lc_talker');
      node = ROS.createNode(name, { owner, pkg: 'lifecycle', exe: 'lifecycle_talker', out: l => log.add(l) });
      listener = listener && listener.alive ? listener : ROS.createNode(uniqName('lc_listener'), { owner, pkg: 'lifecycle', exe: 'lifecycle_listener', out: l => log.add(l) });
      let state = 'unconfigured', pub = null, timer = null, count = 0, warned = false;
      const evPub = node.createPublisher('lifecycle_msgs/msg/TransitionEvent', '~/transition_event', 10);
      const S2 = s => ({ id: LC_ST[s], label: s });
      const avail = () => LC_TR.filter(t => t.from === state);
      function doCallback(tr) {
        const n = node;
        if (tr.cb === 'on_configure') {
          n.info('on_configure() is called.');
          if (cfgResult !== 'SUCCESS') return cfgResult;
          pub = n.createPublisher('std_msgs/msg/String', 'lifecycle_chatter', 10); pub.activated = false; warned = false;
          timer = n.createTimer(1.0, () => {
            const data = 'Lifecycle HelloWorld #' + (++count);
            if (!pub.activated) {
              n.info('Lifecycle publisher is currently inactive. Messages are not published.');
              if (!warned) { warned = true; n.warn("Trying to publish message on the topic '/lifecycle_chatter', but the publisher is not activated"); }
            } else { n.info(`Lifecycle publisher is active. Publishing: [${data}]`); pub.publish({ data }); pubCount++; }
          });
        } else if (tr.cb === 'on_activate') { pub.activated = true; n.info('on_activate() is called.'); }
        else if (tr.cb === 'on_deactivate') { pub.activated = false; warned = false; n.info('on_deactivate() is called.'); }
        else if (tr.cb === 'on_cleanup') { if (timer) timer.cancel(); if (pub) pub.destroy(); timer = null; pub = null; n.info('on cleanup is called.'); }
        else if (tr.cb === 'on_shutdown') { if (timer) timer.cancel(); if (pub) pub.destroy(); timer = null; pub = null; n.info(`on shutdown is called from state ${state}.`); }
        return 'SUCCESS';
      }
      function emit(tr, from, to) { evPub.publish({ timestamp: Math.floor(ROS.graph.nowSec() * 1e9), transition: { id: tr.id, label: tr.key || tr.label }, start_state: S2(from), goal_state: S2(to) }); }
      function find(name) {
        const k = String(name == null ? '' : name).trim().toLowerCase();
        return avail().find(t => t.label === k || t.key === k || String(t.id) === k);
      }
      /** 전이 실행 → true/false (상태는 곧바로 바뀌고, 그림은 전이 상태를 잠깐 보여 줌) */
      function trigger(name) {
        const tr = find(name);
        if (!tr) { lc.lastResult = 'invalid'; return false; }
        const from = state;
        state = tr.via; emit(tr, from, tr.via);
        const r = doCallback(tr);
        let path;
        if (r === 'SUCCESS') { state = tr.to; path = [from, tr.via, tr.to]; }
        else if (r === 'FAILURE') { state = from; path = [from, tr.via, from]; node.warn(`${tr.cb}() 이 FAILURE 를 반환했습니다 → ${from} 로 돌아갑니다`); }
        else { node.error(`${tr.cb}() 에서 ERROR → ErrorProcessing`); node.info('on_error() is called.'); state = 'unconfigured'; if (timer) timer.cancel(); if (pub) pub.destroy(); timer = null; pub = null; path = [from, tr.via, 'errorprocessing', 'unconfigured']; }
        emit(tr, path[path.length - 2], state);
        lc.lastResult = r.toLowerCase();
        anim = { path, t: 0 };
        refresh();
        return r === 'SUCCESS';
      }
      lc = {
        get state() { return state; }, get stateId() { return LC_ST[state]; },
        available: () => avail().map(t => t.label),
        transitions: () => avail().map(t => ({ id: t.id, label: t.key || t.label, start: t.from, goal: t.via })),
        trigger, lastResult: null
      };
      node.lifecycle = lc;
      // 표준 라이프사이클 서비스
      node.createService('lifecycle_msgs/srv/GetState', '~/get_state', (req, res) => { res.current_state = S2(state); return res; });
      node.createService('lifecycle_msgs/srv/ChangeState', '~/change_state', (req, res) => { const t = req.transition || {}; res.success = trigger(t.label || (t.id ? LC_TR.find(x => x.id === t.id && x.from === state) || {} : {}).label || t.id); return res; });
      node.createService('lifecycle_msgs/srv/GetAvailableStates', '~/get_available_states', (req, res) => { res.available_states = Object.keys(LC_ST).map(S2); return res; });
      node.createService('lifecycle_msgs/srv/GetAvailableTransitions', '~/get_available_transitions', (req, res) => { res.available_transitions = avail().map(t => ({ transition: { id: t.id, label: t.key || t.label }, start_state: S2(t.from), goal_state: S2(t.via) })); return res; });
      node.createService('lifecycle_msgs/srv/GetAvailableTransitions', '~/get_transition_graph', (req, res) => { res.available_transitions = LC_TR.map(t => ({ transition: { id: t.id, label: t.key || t.label }, start_state: S2(t.from), goal_state: S2(t.via) })); return res; });
      if (!listener._wcSubs) {
        listener._wcSubs = true;
        listener.createSubscription('std_msgs/msg/String', '/lifecycle_chatter', m => { recvCount++; lastMsg = m.data; listener.info('data_callback: ' + m.data); }, 10);
      }
      listener.createSubscription('lifecycle_msgs/msg/TransitionEvent', `/${node.name}/transition_event`, m => listener.info(`notify_callback: Transition from state ${m.start_state.label} to ${m.goal_state.label}`), 10);
      pubCount = 0; recvCount = 0; lastMsg = '';
      log.add(`[INFO] 라이프사이클 노드 /${node.name} 를 만들었습니다 (상태: unconfigured). 터미널에서 ros2 lifecycle nodes 로 확인해 보세요.`);
      cliLines = []; cli('ros2 lifecycle get /' + node.name, 'unconfigured [1]');
    }

    /* ---------- 그림 */
    let svg, E = {};
    function layout() {
      const stage = $(body, '.wc-lc-stage'); stage.innerHTML = '';
      svg = newSvg(stage, 'wc-lc-svg'); defs(svg);
      svg.setAttribute('viewBox', '0 0 820 345');
      const g = S('g', null, svg);
      E = {};
      const R = (k, x, y, w, h, cls, label, sub) => { const b = box(g, x, y, w, h, cls, label, sub, { rx: k.length > 12 || ['configuring', 'activating', 'cleaningup', 'deactivating', 'shuttingdown', 'errorprocessing'].includes(k) ? 16 : 10, t1cls: 't-sm' }); E[k] = b; return b; };
      const A = (x1, y1, x2, y2, cls, col) => E['ar' + Object.keys(E).length] = arrowLine(g, svg, x1, y1, x2, y2, cls || 'ln', col);
      // 전이 화살표
      A(170, 138, 333, 138); A(485, 138, 648, 138); A(335, 162, 172, 162); A(650, 162, 487, 162);
      line(g, 252, 116, 252, 138, 'ln thin'); line(g, 567, 116, 567, 138, 'ln thin'); line(g, 252, 162, 252, 184, 'ln thin'); line(g, 567, 162, 567, 184, 'ln thin');
      [['configure', 300, 129], ['activate', 615, 129], ['cleanup', 300, 172], ['deactivate', 615, 172]].forEach(([t, x, y]) => S('text', { x, y, class: 't-c t-xs t-mono t-mu' }, g, t));
      A(95, 178, 205, 242, 'ln dash thin'); A(410, 178, 410, 242, 'ln dash thin'); A(725, 178, 615, 242, 'ln dash thin'); A(410, 274, 410, 296);
      A(95, 72, 95, 120, 'ln-red thin', 'red');
      // 상태
      R('unconfigured', 20, 122, 150, 56, 'blue', 'Unconfigured', '[1]');
      R('inactive', 335, 122, 150, 56, 'blue', 'Inactive', '[2]');
      R('active', 650, 122, 150, 56, 'blue', 'Active', '[3]');
      R('finalized', 335, 296, 150, 44, 'gray', 'Finalized', '[4]');
      R('configuring', 185, 84, 135, 32, 'yellow', 'Configuring');
      R('activating', 500, 84, 135, 32, 'yellow', 'Activating');
      R('cleaningup', 185, 184, 135, 32, 'yellow', 'CleaningUp');
      R('deactivating', 500, 184, 135, 32, 'yellow', 'Deactivating');
      R('shuttingdown', 185, 242, 450, 32, 'yellow', 'ShuttingDown  (shutdown: 어느 주 상태에서나)');
      R('errorprocessing', 20, 40, 150, 32, 'red', 'ErrorProcessing');
      S('text', { x: 95, y: 20, class: 't-c t-xs t-red' }, g, '콜백이 ERROR 를 내면');
      S('text', { x: 725, y: 106, class: 't-c t-xs t-mu' }, g, '이 상태에서만 발행 📤');
      S('text', { x: 725, y: 196, class: 't-c t-xs t-mu' }, g, '');
      E.tag = S('text', { x: 410, y: 30, class: 't-c t-sm t-b' }, g, '');
    }
    function visState() {
      if (anim) { const i = Math.min(anim.path.length - 1, Math.floor(anim.t / 0.5)); return anim.path[i]; }
      return lc ? lc.state : 'unconfigured';
    }
    function refresh() {
      const av = lc ? lc.available() : [];
      $$(body, '[data-t]').forEach(b => { b.disabled = !av.includes(b.dataset.t) || !!anim; b.classList.toggle('primary', av.includes(b.dataset.t)); });
      $(body, '[data-a=recreate]').hidden = !(lc && lc.state === 'finalized');
    }
    body.addEventListener('click', e => {
      const b = e.target.closest('[data-t]');
      if (b && lc) {
        const ok = lc.trigger(b.dataset.t);
        cli(`ros2 lifecycle set /${node.name} ${b.dataset.t}`, ok ? 'Transitioning successful' : 'Transitioning failed');
        cli(`ros2 lifecycle get /${node.name}`, `${lc.state} [${lc.stateId}]`);
        return;
      }
      const a = e.target.closest('[data-a=recreate]');
      if (a) { if (node) node.destroy(); create(); refresh(); }
    });
    layout(); create(); refresh();
    const stop = RosUI.loop(body, dt => {
      if (anim) { anim.t += dt; if (anim.t > anim.path.length * 0.5) { anim = null; refresh(); } }
      const v = visState();
      Object.entries(E).forEach(([k, b]) => { if (b && b.g) b.g.classList.toggle('wc-lc-cur', k === v); });
      if (E.tag) E.tag.textContent = `/${node ? node.name : 'lc_talker'} — 현재 상태: ${v}`;
      const act = lc && lc.state === 'active';
      const html = `<span class="wc-pill ${act ? 'ok' : ''}">📤 /lifecycle_chatter ${act ? '발행 중 (Active)' : lc && (lc.state === 'inactive') ? '퍼블리셔는 있지만 비활성 — 보내지 않음' : '퍼블리셔 없음'}</span><span class="wc-pill">보낸 메시지 <b>${pubCount}</b></span><span class="wc-pill">/lc_listener 받은 메시지 <b>${recvCount}</b></span>${lastMsg ? `<span class="wc-pill"><code>${esc(lastMsg)}</code></span>` : ''}`;
      if (html !== lastHtml) { lastHtml = html; $(body, '.wc-lc-pub').innerHTML = html; }
    });
    return () => { stop(); if (node) node.destroy(); if (listener) listener.destroy(); };
  }
  mount('lifecycle', '♻', '라이프사이클(관리형) 노드', lifecycleView, { view: 'lifecycle', w: 860, h: 640 });


  /* ==================================================================
     11) ros1vs2 — ROS 1 (마스터) vs ROS 2 (분산 탐색)
     ================================================================== */
  const R12_ROWS = [
    ['노드 찾기 (디스커버리)', '<b>roscore(ROS Master)</b> 에 등록하고 물어봄 — 중앙 서버', '<b>DDS 분산 탐색</b>(SPDP/SEDP) — 중앙 서버 없음', '마스터가 죽으면 ROS 1 은 새 연결을 만들 수 없습니다. ROS 2 는 모든 참가자가 서로에게 직접 "hello" 를 보냅니다(ROS_DOMAIN_ID 로 그룹 구분).'],
    ['통신 프로토콜', 'TCPROS / UDPROS (자체)', '<b>DDS / RTPS</b> 산업 표준 (Fast DDS 기본, Cyclone DDS, Zenoh 선택)', 'RMW(ROS MiddleWare) 층 덕분에 <code>RMW_IMPLEMENTATION</code> 만 바꾸면 통신 구현을 교체할 수 있습니다.'],
    ['QoS', '없음 (TCP 신뢰성, 큐 크기 정도)', 'Reliability · Durability · History · Deadline · Liveliness …', '무선·센서 환경에 맞게 "잃어도 최신 값" 또는 "절대 잃지 않기" 를 고를 수 있습니다.'],
    ['빌드 도구', 'catkin (<code>catkin_make</code>) · devel 공간', 'ament + <b>colcon</b> · install 공간', 'ROS 2 는 devel 공간이 없고 <code>--symlink-install</code> 로 비슷한 개발 편의를 얻습니다.'],
    ['클라이언트 라이브러리', 'rospy · roscpp 가 따로 구현', '공통 C 코어 <b>rcl</b> 위에 rclpy · rclcpp', '언어마다 동작이 달라지는 문제를 줄였습니다.'],
    ['런치', 'roslaunch (XML)', 'ros2 launch (<b>Python</b> · XML · YAML)', '조건·반복·이벤트 처리를 파이썬으로 쓸 수 있습니다.'],
    ['파라미터', '마스터 안의 전역 파라미터 서버', '<b>노드마다</b> 파라미터 (ros2 param)', '노드가 자기 파라미터를 선언(declare)하고 변경 콜백으로 검사합니다.'],
    ['노드 수명 관리', '없음', '<b>라이프사이클(관리형) 노드</b>', 'configure → activate 순서를 밖에서 조종합니다 (Nav2 가 사용).'],
    ['실행 모델', '노드 1개 = 프로세스 1개', '한 프로세스에 여러 노드(<b>컴포넌트</b>) · 실행기(Executor)', '같은 프로세스 안에서는 복사 없는 통신(intra-process)이 가능합니다.'],
    ['보안', '없음', '<b>SROS2</b> (DDS-Security: 인증 · 암호화 · 접근 제어)', '<code>ros2 security</code> 명령으로 키와 권한 파일을 만듭니다.'],
    ['실시간', '어려움', '실시간 친화 설계 (메모리 할당 제어, 실행기 선택)', 'RTOS 용 <b>micro-ROS</b> 로 마이크로컨트롤러까지 연결됩니다.'],
    ['지원 OS', 'Ubuntu 중심', 'Ubuntu · Windows · macOS · RTOS', 'Jazzy 는 Ubuntu 24.04 가 Tier-1 입니다.'],
    ['버전', '마지막 배포판 Noetic — <b>2025년 5월 지원 종료</b>', '<b>Jazzy Jalisco</b> (LTS, 2029년 5월까지) · Kilted Kaiju (2025.5)', '새 프로젝트는 ROS 2 로 시작합니다. 옛 코드는 <code>ros1_bridge</code> 로 잠시 연결할 수 있습니다.']
  ];
  function ros1vs2View(body) {
    body.innerHTML = `<div class="wc-r1">
      <div class="w-row"><button class="btn small" data-a="master">💀 roscore 끄기</button><button class="btn small primary" data-a="add">＋ 새 listener 노드 실행</button><button class="btn small ghost" data-a="reset">↺ 처음부터</button></div>
      <div class="wc-r1-panels"><div class="wc-card"><div class="wc-card-h">ROS 1 — 마스터 방식</div><div class="wc-r1-s1"></div><div class="wc-r1-m1 small"></div></div>
        <div class="wc-card"><div class="wc-card-h">ROS 2 — 분산 탐색 (DDS)</div><div class="wc-r1-s2"></div><div class="wc-r1-m2 small"></div></div></div>
      <table class="tbl wc-r1-tbl"><thead><tr><th>항목</th><th>ROS 1</th><th>ROS 2</th></tr></thead><tbody>
        ${R12_ROWS.map((r, i) => `<tr class="wc-r1-row" data-i="${i}"><td><b>${r[0]}</b> <span class="muted">▸</span></td><td>${r[1]}</td><td>${r[2]}</td></tr><tr class="wc-r1-more" data-m="${i}" hidden><td colspan="3">💡 ${r[3]}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
    let master = true, nodes1, nodes2, f1, f2, acc = 0, tt = 0;
    const P1 = [[110, 240], [270, 240], [190, 285]], PN = [[110, 200], [270, 200], [190, 265]];
    /** 두 상자(100×40) 가장자리 사이 선분 */
    function edge(a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const k = 1 / Math.max(1e-6, Math.hypot(dx / 52, dy / 22));
      return [[a.x + dx * k, a.y + dy * k], [b.x - dx * k, b.y - dy * k]];
    }
    const L = {};
    function setup() {
      [['.wc-r1-s1', 1], ['.wc-r1-s2', 2]].forEach(([sel, k]) => {
        const el = $(body, sel); el.innerHTML = '';
        const svg = newSvg(el, 'wc-r1-svg'); defs(svg);
        svg.setAttribute('viewBox', '0 0 380 312');
        L[k] = { svg, gl: S('g', null, svg), gb: S('g', null, svg), gf: S('g', null, svg) };
      });
      f1 = Flyer(L[1].gf); f2 = Flyer(L[2].gf);
    }
    function reset() {
      master = true; $(body, '[data-a=master]').textContent = '💀 roscore 끄기';
      if (f1) f1.clear(); if (f2) f2.clear();
      nodes1 = [{ name: '/talker', x: 70, y: 150, pub: true, ok: true, reg: true }, { name: '/listener', x: 310, y: 150, ok: true, reg: true }];
      nodes2 = [{ name: '/talker', x: 70, y: 110, pub: true, ok: true }, { name: '/listener', x: 310, y: 110, ok: true }];
      draw(); msg();
    }
    function draw() {
      [1, 2].forEach(k => {
        const { svg, gl, gb } = L[k];
        gl.innerHTML = ''; gb.innerHTML = '';
        const list = k === 1 ? nodes1 : nodes2, talker = list[0];
        if (k === 1) {
          box(gb, 120, 14, 140, 56, master ? 'purple' : 'gray dash', 'roscore', master ? 'ROS Master :11311' : '✘ 종료됨');
          list.forEach(n => { if (n.reg) line(gl, n.x, n.y - 20, 190, 70, 'ln thin dash'); });
        } else S('text', { x: 190, y: 30, class: 't-c t-sm t-mu' }, gb, '마스터 없음 — 서로 직접 찾음');
        list.slice(1).forEach(n => { if (n.ok) { const [p, q] = edge(talker, n); arrowLine(gl, svg, p[0], p[1], q[0], q[1], k === 1 ? 'ln-blue' : 'ln-teal', k === 1 ? 'blue' : 'teal'); } });
        list.forEach(n => {
          box(gb, n.x - 50, n.y - 20, 100, 40, n.ok ? (n.pub ? 'blue' : 'teal') : n.err ? 'red' : 'gray', n.name, n.err ? '마스터 연결 실패' : null, { rx: 20, t1cls: 't-xs t-mono' });
          if (k === 2) n.ring = S('circle', { cx: n.x, cy: n.y, r: 0, class: 'wc-d-ring' }, gb);
        });
      });
    }
    function msg() {
      $(body, '.wc-r1-m1').innerHTML = master ? '노드는 시작할 때 마스터(XML-RPC)에 자신을 <b>등록</b>하고, 상대 주소를 받은 뒤 서로 <b>직접</b> TCPROS 로 연결합니다.' : '⚠ 마스터가 없습니다. <b>이미 연결된</b> talker→listener 는 계속 통신하지만, 새 노드는 <code>ERROR: Unable to communicate with master!</code> 로 시작하지 못합니다.';
      $(body, '.wc-r1-m2').innerHTML = '모든 노드가 멀티캐스트로 "hello"(SPDP)를 보내 서로를 찾고(SEDP 로 토픽 정보 교환), 맞는 토픽끼리 바로 연결합니다. <b>한 곳이 죽어도 나머지는 계속 동작</b>합니다.';
    }
    function add() {
      const k = nodes1.length - 2; if (k >= 3) { RosUI.toast('노드는 3개까지 추가할 수 있습니다'); return; }
      const name = '/listener_' + (k + 2);
      const [x, y] = P1[k];
      const n1 = { name, x, y, ok: false, reg: false };
      nodes1.push(n1);
      const [x2, y2] = PN[k];
      const n2 = { name, x: x2, y: y2, ok: false };
      nodes2.push(n2);
      draw();
      // ROS 1: 마스터에 등록
      if (master) {
        f1.add({ pts: [[x, y - 20], [190, 70]], dur: 0.7, cls: 's-purple', label: 'registerSubscriber', lcls: 't-purple', onDone: () => {
          if (!master) { n1.err = true; draw(); return; }
          f1.add({ pts: [[190, 70], [x, y - 20]], dur: 0.7, cls: 's-purple', label: '퍼블리셔 = /talker', lcls: 't-purple', onDone: () => { n1.reg = true; n1.ok = true; draw(); } });
        } });
      } else {
        f1.add({ pts: [[x, y - 20], [190, 70]], dur: 0.7, cls: 's-red', label: '마스터?', lost: true, onDone: () => { n1.err = true; draw(); } });
      }
      // ROS 2: 스스로 찾음
      setTimeout(() => { n2.hello = 1; }, 50);
      setTimeout(() => { n2.ok = true; draw(); }, 1300);
    }
    body.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (a) {
        if (a.dataset.a === 'master') { master = !master; a.textContent = master ? '💀 roscore 끄기' : '▶ roscore 다시 켜기'; draw(); msg(); }
        else if (a.dataset.a === 'add') add();
        else if (a.dataset.a === 'reset') reset();
        return;
      }
      const r = e.target.closest('[data-i]');
      if (r) { const m = $(body, `[data-m="${r.dataset.i}"]`); m.hidden = !m.hidden; r.querySelector('.muted').textContent = m.hidden ? '▸' : '▾'; }
    });
    setup(); reset();
    const stop = RosUI.loop(body, dt => {
      if (f1) f1.tick(dt); if (f2) f2.tick(dt);
      acc += dt; tt += dt;
      nodes2.forEach((n, i) => { if (!n.ring) return; const ph = (tt * 0.8 + i * 0.3) % 1.6; n.ring.setAttribute('r', (ph * 55).toFixed(1)); n.ring.style.opacity = Math.max(0, 0.5 - ph * 0.3); });
      if (acc > 0.8) {
        acc = 0;
        const t1 = nodes1[0], t2 = nodes2[0];
        nodes1.slice(1).forEach(n => { if (n.ok) f1.add({ pts: edge(t1, n), dur: 0.6, cls: 's-blue', r: 5 }); });
        nodes2.slice(1).forEach(n => { if (n.ok) f2.add({ pts: edge(t2, n), dur: 0.6, cls: 's-teal', r: 5 }); });
      }
    });
    return () => stop();
  }
  mount('ros1vs2', '⚖', 'ROS 1 vs ROS 2', ros1vs2View);
})();
