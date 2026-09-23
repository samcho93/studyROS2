/* ===================================================================
   판서 — 슬라이드 위에 펜 · 형광펜 · 지우개 · 레이저 포인터로 그리기
   좌표는 슬라이드 논리 크기(1280×720) 기준으로 저장한다.
   =================================================================== */
(function () {
  'use strict';
  const W = 1280, H = 720, RES = 2;           // 캔버스 내부 해상도 = 논리 크기 × RES
  const LS = 'r2:ink:';

  const COLORS = [['#e53935', '빨강'], ['#1e63e9', '파랑'], ['#12a150', '초록'], ['#ffb300', '노랑'], ['#8e24aa', '보라'], ['#111111', '검정'], ['#ffffff', '흰색']];
  const SIZES = [[2, '가늘게'], [4, '보통'], [8, '굵게'], [16, '아주 굵게']];
  const TOOLS = [
    ['none', '👆', '선택', '판서 끄기 — 슬라이드 조작 (Esc)'],
    ['pen', '🖊', '펜', '펜 (P)'],
    ['hl', '🖍', '형광펜', '형광펜 (H)'],
    ['line', '📏', '직선', '직선 · Shift 누르면 수평/수직 (I)'],
    ['rect', '▭', '상자', '네모 상자 (X)'],
    ['eraser', '🧽', '지우개', '선 지우개 (E)'],
    ['laser', '🔴', '레이저', '레이저 포인터 — 잠시 후 사라짐 (L)']
  ];

  class Ink {
    constructor(host, opts) {
      this.host = host;
      this.opts = opts || {};
      this.canvas = document.createElement('canvas');
      this.canvas.className = 'ink-canvas';
      this.canvas.width = W * RES; this.canvas.height = H * RES;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.scale(RES, RES);
      host.appendChild(this.canvas);
      this.prefs = Object.assign({ tool: 'none', color: '#e53935', size: 4 }, load('prefs', {}));
      if (this.prefs.tool !== 'none') this.prefs.tool = 'none'; // 처음에는 항상 선택 모드
      this.strokes = [];
      this.redo = [];
      this.key = null;
      this.laser = [];
      this.cur = null;
      this.bind();
      this.apply();
    }

    /** 슬라이드가 바뀔 때: 그 슬라이드의 판서를 불러온다 */
    setKey(key) {
      if (this.key) this.save();
      this.key = key;
      this.strokes = load(key, []);
      this.redo = [];
      this.draw();
    }
    save() { if (this.key) save(this.key, this.strokes); }

    setTool(t) { this.prefs.tool = t; this.apply(); save('prefs', this.prefs); this.opts.onChange && this.opts.onChange(); }
    setColor(c) { this.prefs.color = c; if (['none', 'eraser', 'laser'].includes(this.prefs.tool)) this.prefs.tool = 'pen'; this.apply(); save('prefs', this.prefs); this.opts.onChange && this.opts.onChange(); }
    setSize(s) { this.prefs.size = +s; if (['none', 'laser'].includes(this.prefs.tool)) this.prefs.tool = 'pen'; this.apply(); save('prefs', this.prefs); this.opts.onChange && this.opts.onChange(); }
    get active() { return this.prefs.tool !== 'none'; }
    apply() {
      const t = this.prefs.tool;
      this.canvas.classList.toggle('on', t !== 'none');
      this.canvas.dataset.tool = t;
    }
    undo() { if (this.strokes.length) { this.redo.push(this.strokes.pop()); this.draw(); this.save(); } }
    redoOne() { if (this.redo.length) { this.strokes.push(this.redo.pop()); this.draw(); this.save(); } }
    clear() { if (!this.strokes.length) return; this.redo = this.strokes.slice().reverse(); this.strokes = []; this.draw(); this.save(); }
    clearPrefix(prefix) {
      try { Object.keys(localStorage).filter(k => k.startsWith(LS + prefix)).forEach(k => localStorage.removeItem(k)); } catch (_) {}
      this.strokes = []; this.redo = []; this.draw();
    }

    pos(e) {
      const r = this.canvas.getBoundingClientRect();
      return [+((e.clientX - r.left) * W / r.width).toFixed(1), +((e.clientY - r.top) * H / r.height).toFixed(1), e.pressure && e.pointerType === 'pen' ? +e.pressure.toFixed(2) : 0.5];
    }

    bind() {
      const c = this.canvas;
      c.addEventListener('pointerdown', e => {
        if (!this.active || e.button > 0 && e.pointerType === 'mouse') return;
        e.preventDefault();
        c.setPointerCapture(e.pointerId);
        const p = this.pos(e), t = this.prefs.tool;
        if (t === 'eraser') { this.erasing = true; this.eraseAt(p); return; }
        if (t === 'laser') { this.laserOn = true; this.laser.push({ p, t: performance.now() }); this.anim(); return; }
        this.cur = { tool: t, color: this.prefs.color, size: this.prefs.size, pts: [p] };
        if (t === 'line' || t === 'rect') this.cur.pts.push(p);
      });
      c.addEventListener('pointermove', e => {
        if (!this.active) return;
        const t = this.prefs.tool;
        if (t === 'laser') {
          if (this.laserOn || e.pointerType === 'mouse') { this.laser.push({ p: this.pos(e), t: performance.now(), trail: this.laserOn }); this.anim(); }
          return;
        }
        if (this.erasing) { this.eraseAt(this.pos(e)); return; }
        if (!this.cur) return;
        let evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
        if (!evs.length) evs = [e];
        if (this.cur.tool === 'line' || this.cur.tool === 'rect') {
          let p = this.pos(e);
          if (this.cur.tool === 'line' && e.shiftKey) { const s = this.cur.pts[0]; if (Math.abs(p[0] - s[0]) > Math.abs(p[1] - s[1])) p[1] = s[1]; else p[0] = s[0]; }
          this.cur.pts[1] = p;
        } else evs.forEach(ev => this.cur.pts.push(this.pos(ev)));
        this.draw();
      });
      const end = () => {
        if (this.erasing) { this.erasing = false; this.save(); }
        this.laserOn = false;
        if (this.cur) {
          if (this.cur.pts.length === 1) this.cur.pts.push([this.cur.pts[0][0] + 0.1, this.cur.pts[0][1] + 0.1, 0.5]);
          this.strokes.push(this.cur); this.cur = null; this.redo = []; this.draw(); this.save();
        }
      };
      c.addEventListener('pointerup', end);
      c.addEventListener('pointercancel', end);
      c.addEventListener('pointerleave', e => { if (this.prefs.tool === 'laser' && e.pointerType === 'mouse') this.anim(); });
    }

    eraseAt(p) {
      const r = 14;
      const before = this.strokes.length;
      this.strokes = this.strokes.filter(s => {
        if (s.tool === 'rect') {
          const [a, b] = s.pts, x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
          const nearX = (Math.abs(p[0] - x0) < r || Math.abs(p[0] - x1) < r) && p[1] > y0 - r && p[1] < y1 + r;
          const nearY = (Math.abs(p[1] - y0) < r || Math.abs(p[1] - y1) < r) && p[0] > x0 - r && p[0] < x1 + r;
          return !(nearX || nearY);
        }
        for (let i = 0; i < s.pts.length; i++) {
          const q = s.pts[i];
          if (Math.hypot(q[0] - p[0], q[1] - p[1]) < r + s.size) return false;
          if (i && s.tool === 'line') { if (distSeg(p, s.pts[0], s.pts[1]) < r + s.size) return false; }
        }
        return true;
      });
      if (this.strokes.length !== before) this.draw();
    }

    anim() {
      if (this.raf) return;
      const tick = () => {
        const now = performance.now();
        this.laser = this.laser.filter(l => now - l.t < (l.trail ? 900 : 60));
        this.draw();
        this.raf = this.laser.length ? requestAnimationFrame(tick) : 0;
      };
      this.raf = requestAnimationFrame(tick);
    }

    draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, W, H);
      const all = this.cur ? this.strokes.concat([this.cur]) : this.strokes;
      all.forEach(s => stroke(ctx, s));
      // 레이저
      const now = performance.now();
      const pts = this.laser;
      if (pts.length) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        for (let i = 1; i < pts.length; i++) {
          if (!pts[i].trail) continue;
          const a = 1 - (now - pts[i].t) / 900;
          ctx.strokeStyle = `rgba(255,40,40,${Math.max(0, a) * 0.7})`;
          ctx.lineWidth = 6 * Math.max(0.3, a);
          ctx.beginPath(); ctx.moveTo(pts[i - 1].p[0], pts[i - 1].p[1]); ctx.lineTo(pts[i].p[0], pts[i].p[1]); ctx.stroke();
        }
        const last = pts[pts.length - 1].p;
        const g = ctx.createRadialGradient(last[0], last[1], 0, last[0], last[1], 16);
        g.addColorStop(0, 'rgba(255,60,60,1)'); g.addColorStop(0.4, 'rgba(255,0,0,.75)'); g.addColorStop(1, 'rgba(255,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(last[0], last[1], 16, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    destroy() { this.save(); cancelAnimationFrame(this.raf); this.canvas.remove(); }
  }

  function distSeg(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy || 1;
    let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L; t = Math.max(0, Math.min(1, t));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }

  /** 선 하나 그리기 (발표자 창 미리보기에서도 사용) */
  function stroke(ctx, s) {
    const pts = s.pts; if (!pts || !pts.length) return;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = s.color;
    if (s.tool === 'hl') { ctx.globalAlpha = 0.35; ctx.lineWidth = s.size * 4 + 8; ctx.lineCap = 'butt'; ctx.globalCompositeOperation = 'multiply'; }
    else ctx.lineWidth = s.size;
    if (s.tool === 'rect') { const [a, b] = pts; ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore(); return; }
    if (s.tool === 'line') { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.stroke(); ctx.restore(); return; }
    if (s.tool === 'pen' && pts.some(p => p[2] !== 0.5)) {
      // 펜 압력 반영: 구간별 굵기
      for (let i = 1; i < pts.length; i++) {
        ctx.lineWidth = s.size * (0.4 + pts[i][2] * 1.2);
        ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      }
      ctx.restore(); return;
    }
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const l = pts[pts.length - 1]; ctx.lineTo(l[0], l[1]);
    ctx.stroke();
    ctx.restore();
  }

  function load(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (_) { return d; } }
  function save(k, v) {
    try {
      if (Array.isArray(v) && !v.length) localStorage.removeItem(LS + k);
      else localStorage.setItem(LS + k, JSON.stringify(v));
    } catch (_) { /* 저장 공간 부족 등 — 판서는 화면에 그대로 남는다 */ }
  }

  function toolbarHtml() {
    return `<div class="ink-bar" role="toolbar" aria-label="판서 도구">
      <span class="ib-label">✏️ 판서</span>
      <span class="ib-group">${TOOLS.map(([k, ic, n, t]) => `<button class="ib-btn" data-ink-tool="${k}" title="${t}">${ic}<span>${n}</span></button>`).join('')}</span>
      <span class="ib-sep"></span>
      <span class="ib-group">${COLORS.map(([c, n]) => `<button class="ib-sw" data-ink-color="${c}" title="${n}" style="--sw:${c}"></button>`).join('')}</span>
      <span class="ib-sep"></span>
      <span class="ib-group">${SIZES.map(([s, n]) => `<button class="ib-btn ib-size" data-ink-size="${s}" title="${n}"><i style="--d:${Math.min(18, s + 3)}px"></i></button>`).join('')}</span>
      <span class="ib-sep"></span>
      <button class="ib-btn" data-ink-act="undo" title="되돌리기 (Ctrl+Z)">↶</button>
      <button class="ib-btn" data-ink-act="redo" title="다시 하기 (Ctrl+Y)">↷</button>
      <button class="ib-btn" data-ink-act="clear" title="이 슬라이드 판서 지우기 (C)">🗑<span>지우기</span></button>
      <button class="ib-btn" data-ink-act="clear-all" title="이 장의 모든 판서 지우기">🗑<span>모두</span></button>
      <span class="ib-sep"></span>
      <button class="ib-btn" data-ink-act="board" title="빈 칠판 펼치기/접기 (W)">⬜<span>칠판</span></button>
      <button class="ib-btn" data-ink-act="board-color" title="칠판 색 바꾸기 (흰색 · 초록 · 검정)">🎨</button>
    </div>`;
  }

  function syncToolbar(root, ink) {
    root.querySelectorAll('[data-ink-tool]').forEach(b => b.classList.toggle('on', b.dataset.inkTool === ink.prefs.tool));
    root.querySelectorAll('[data-ink-color]').forEach(b => b.classList.toggle('on', b.dataset.inkColor === ink.prefs.color));
    root.querySelectorAll('[data-ink-size]').forEach(b => b.classList.toggle('on', +b.dataset.inkSize === ink.prefs.size));
  }

  window.Ink = { Ink, stroke, toolbarHtml, syncToolbar, load, W, H };
})();
