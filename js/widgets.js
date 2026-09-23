/* ===================================================================
   위젯 등록소 — 문서/슬라이드의 <div class="widget" data-w="종류" data-o='{옵션}'> 에 붙는다.
   각 위젯 파일(js/w/*.js)이 Widgets.register('이름', fn, {title}) 으로 자신을 등록한다.
   fn(el, opts) 은 el 안에 화면을 만들고, 필요하면 정리 함수를 돌려준다.
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const W = {};
  const META = {};
  const head = (icon, title, tag) => `<div class="w-head"><span>${icon}</span><span>${title}</span><span class="spacer"></span>${tag === false ? '' : `<span class="w-tag">${tag || '직접 해 보기'}</span>`}</div>`;

  function register(name, fn, meta) { W[name] = fn; META[name] = meta || {}; }

  function mountAll(root) {
    root.querySelectorAll('.widget[data-w]:not([data-mounted])').forEach(el => {
      el.dataset.mounted = '1';
      const fn = W[el.dataset.w];
      if (!fn) { el.innerHTML = `<div class="w-body">⚠ 알 수 없는 위젯: ${esc(el.dataset.w)}</div>`; return; }
      let o = {}; try { o = JSON.parse(el.dataset.o || '{}'); } catch (_) {}
      // 슬라이드 썸네일 안에서는 무거운 위젯을 만들지 않는다
      if (el.closest('.thumb')) { el.innerHTML = `<div class="w-body w-thumb">🕹 ${esc((META[el.dataset.w] || {}).title || el.dataset.w)}</div>`; return; }
      try { const c = fn(el, o); if (typeof c === 'function') el._cleanup = c; } catch (e) { console.error(e); el.innerHTML = `<div class="w-body">⚠ 위젯 오류: ${esc(e.message)}</div>`; }
    });
  }
  /** root 안 위젯들의 정리 함수 호출 (페이지 · 슬라이드 바뀔 때) */
  function unmountAll(root) {
    if (!root) return;
    const list = [root, ...root.querySelectorAll('*')].filter(e => typeof e._cleanup === 'function');
    list.forEach(e => { const f = e._cleanup; e._cleanup = null; try { f(); } catch (err) { console.error(err); } });
  }
  window.Widgets = { register, mountAll, unmountAll, head, esc, get list() { return Object.keys(W); }, meta: META };
})();
