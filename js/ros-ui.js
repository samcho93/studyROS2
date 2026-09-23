/* ===================================================================
   RosUI — 떠 있는 창(turtlesim · rqt_graph · rviz2 …), 캔버스 도우미, 공용 보기(view)
   터미널에서 `ros2 run turtlesim turtlesim_node` 하면 실제 ROS 처럼 새 창이 뜹니다.
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let zTop = 1000, winSeq = 0;
  const wins = new Set();

  /* ------------------------------------------------ 떠 있는 창 */
  function win(opts) {
    const id = ++winSeq;
    const n = wins.size;
    const w = Math.min(opts.w || 560, innerWidth - 24), h = Math.min(opts.h || 420, innerHeight - 24);
    const x = opts.x != null ? opts.x : Math.max(8, Math.min(innerWidth - w - 8, 80 + n * 36 + (innerWidth > 1200 ? 300 : 0)));
    const y = opts.y != null ? opts.y : Math.max(8, Math.min(innerHeight - h - 8, 70 + n * 30));
    const el = document.createElement('div');
    el.className = 'rwin';
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++zTop}`;
    el.innerHTML = `<div class="rwin-head"><span class="rwin-ic">${opts.icon || '🪟'}</span><b class="rwin-t">${esc(opts.title || '창')}</b><span class="spacer"></span>
      <button class="rwin-b" data-a="max" title="크게/작게">□</button><button class="rwin-b close" data-a="close" title="닫기">✕</button></div><div class="rwin-body"></div>`;
    document.body.appendChild(el);
    const body = el.querySelector('.rwin-body');
    const api = {
      id, el, body, closed: false,
      close() { if (api.closed) return; api.closed = true; wins.delete(api); try { api._cleanup && api._cleanup(); } catch (e) { console.error(e); } try { opts.onClose && opts.onClose(); } catch (e) { console.error(e); } el.remove(); },
      setTitle(t) { el.querySelector('.rwin-t').textContent = t; },
      focus() { el.style.zIndex = ++zTop; }
    };
    wins.add(api);
    el.addEventListener('pointerdown', () => api.focus(), true);
    el.querySelector('[data-a=close]').onclick = () => api.close();
    el.querySelector('[data-a=max]').onclick = () => { el.classList.toggle('max'); window.dispatchEvent(new Event('resize')); };
    // 끌어서 옮기기
    const hd = el.querySelector('.rwin-head');
    hd.addEventListener('pointerdown', e => {
      if (e.target.closest('button') || el.classList.contains('max')) return;
      const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
      hd.setPointerCapture(e.pointerId);
      const mv = ev => { el.style.left = Math.max(-w + 80, Math.min(innerWidth - 60, ox + ev.clientX - sx)) + 'px'; el.style.top = Math.max(0, Math.min(innerHeight - 30, oy + ev.clientY - sy)) + 'px'; };
      const up = () => { hd.removeEventListener('pointermove', mv); hd.removeEventListener('pointerup', up); };
      hd.addEventListener('pointermove', mv); hd.addEventListener('pointerup', up);
    });
    if (opts.content) { const c = opts.content(body, api); if (typeof c === 'function') api._cleanup = c; }
    return api;
  }
  function closeAll() { [...wins].forEach(w => w.close()); }

  /* ------------------------------------------------ 캔버스 */
  /** 부모 크기에 맞춰 고해상도 캔버스 크기를 맞춘다. {w,h,ctx,dpr} */
  function fitCanvas(cv, cssW, cssH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    const w = Math.max(10, Math.round(cssW || r.width)), h = Math.max(10, Math.round(cssH || r.height));
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h, ctx, dpr };
  }
  /** el 이 문서에 붙어 있는 동안만 도는 애니메이션 루프 (정지 함수 반환) */
  function loop(el, fn) {
    let alive = true, last = performance.now(), started = false;
    const tick = t => {
      if (!alive) return;
      if (started && !el.isConnected) { alive = false; return; }
      if (el.isConnected) started = true;
      const dt = Math.min(0.1, (t - last) / 1000); last = t;
      if (el.isConnected && el.offsetParent !== null) { try { fn(dt, t); } catch (e) { console.error(e); alive = false; } }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { alive = false; };
  }
  /** CSS 변수 값 (테마 색) */
  function css(name, el) { return getComputedStyle(el || document.documentElement).getPropertyValue(name).trim(); }
  function colors() {
    const g = n => css(n);
    return { fg: g('--fg'), muted: g('--muted'), line: g('--line'), card: g('--card'), card2: g('--card2'), bg: g('--bg'), accent: g('--accent'), accent2: g('--accent2'),
      blue: g('--c-blue') || '#3b82f6', teal: g('--c-teal') || '#14b8a6', orange: g('--c-orange') || '#f97316', purple: g('--c-purple') || '#8b5cf6', red: g('--c-red') || '#ef4444', green: g('--c-green') || '#22c55e', yellow: g('--c-yellow') || '#eab308', gray: g('--c-gray') || '#94a3b8',
      dark: document.documentElement.getAttribute('data-theme') === 'dark' };
  }
  function arrow(ctx, x1, y1, x2, y2, head = 9) {
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - head * Math.cos(a - 0.4), y2 - head * Math.sin(a - 0.4)); ctx.lineTo(x2 - head * Math.cos(a + 0.4), y2 - head * Math.sin(a + 0.4)); ctx.closePath(); ctx.fill();
  }

  /* ------------------------------------------------ 보기(view) 등록소
     view(el, opts) → cleanup. 위젯에도, 떠 있는 창에도 같은 보기를 쓴다. */
  const views = {};
  function registerView(name, fn, meta) { views[name] = Object.assign({ fn }, meta || {}); }
  function openView(name, opts) {
    const v = views[name];
    if (!v) { console.warn('view 없음', name); return null; }
    return win(Object.assign({ title: v.title || name, icon: v.icon, w: v.w, h: v.h }, opts || {}, { content: (body, w) => v.fn(body, Object.assign({ inWindow: true, win: w }, (opts && opts.viewOpts) || {})) }));
  }

  /* ------------------------------------------------ 작은 도우미 */
  function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function fmt(v, d = 3) { return (Math.abs(v) < 1e-9 ? 0 : v).toFixed(d); }
  function toast(msg) { if (window.App && App.toast) App.toast(msg); else console.log(msg); }
  /** 위젯 공통 틀: 머리 + 몸통 (몸통 요소 반환) */
  function frame(el, icon, title, tag) {
    el.innerHTML = Widgets.head(icon, title, tag) + '<div class="w-body"></div>';
    return el.querySelector('.w-body');
  }
  /** 이 위젯을 떠 있는 창으로 다시 열기 버튼 */
  function popoutBtn(name, opts) { return `<button class="btn tiny ghost" data-popout="${esc(name)}" data-popopts="${esc(JSON.stringify(opts || {}))}" title="새 창으로 띄우기">⧉ 창으로</button>`; }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-popout]'); if (!b) return;
    let o = {}; try { o = JSON.parse(b.dataset.popopts || '{}'); } catch (_) {}
    openView(b.dataset.popout, { viewOpts: o });
  });

  window.RosUI = { win, closeAll, fitCanvas, loop, css, colors, arrow, views, registerView, openView, h, esc, fmt, toast, frame, popoutBtn, wins };
})();
