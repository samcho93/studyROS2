/* ===================================================================
   하단 고정 터미널 (도크) — 강좌 화면 아래에 붙어 있고, 장을 옮겨도 그대로 유지
   탭으로 터미널을 여러 개 열 수 있음 · 높이 조절 · 접기/펼치기 (Ctrl+`)
   =================================================================== */
(function () {
  'use strict';
  const KEY = 'r2:dock';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let st = { open: false, h: 280, max: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} };

  const tabs = [];   // { id, no, pane, term }
  let cur = null, seq = 0, el = null;

  function build() {
    const center = document.getElementById('center');
    if (!center || el) return;
    el = document.createElement('div');
    el.id = 'termDock';
    el.className = 'tdock';
    el.innerHTML = `<div class="tdock-grip" title="끌어서 높이 조절"></div>
      <div class="tdock-head">
        <button class="tdock-toggle" title="터미널 펼치기/접기 (Ctrl+\`)"><span class="tdock-arrow">▲</span> 🖥️ 터미널</button>
        <div class="tdock-tabs" role="tablist"></div>
        <button class="tdock-btn" data-a="new" title="새 터미널 (Ctrl+Shift+\`)">＋</button>
        <span class="spacer"></span>
        <span class="tdock-hint">명령 코드의 ▶ 버튼은 이 터미널에서 실행됩니다</span>
        <button class="tdock-btn" data-a="max" title="크게/작게">⤢</button>
        <button class="tdock-btn" data-a="min" title="접기">▁</button>
      </div>
      <div class="tdock-body"></div>`;
    center.appendChild(el);
    el.querySelector('.tdock-toggle').onclick = () => setOpen(!st.open);
    el.querySelector('[data-a=new]').onclick = () => { const t = addTab(); setOpen(true); select(t); };
    el.querySelector('[data-a=min]').onclick = () => setOpen(false);
    el.querySelector('[data-a=max]').onclick = () => { st.max = !st.max; save(); apply(); };
    el.querySelector('.tdock-tabs').addEventListener('click', e => {
      const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(+x.dataset.close); return; }
      const b = e.target.closest('[data-tab]'); if (b) { setOpen(true); select(tabs.find(t => t.id === +b.dataset.tab)); }
    });
    // 높이 조절
    const grip = el.querySelector('.tdock-grip');
    grip.addEventListener('pointerdown', e => {
      if (!st.open) return;
      grip.setPointerCapture(e.pointerId);
      const sy = e.clientY, sh = el.querySelector('.tdock-body').offsetHeight;
      const mv = ev => { st.h = Math.round(Math.max(120, Math.min(center.clientHeight * 0.85, sh + (sy - ev.clientY)))); st.max = false; apply(); };
      const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); save(); window.dispatchEvent(new Event('resize')); };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
    });
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        if (e.shiftKey) { const t = addTab(); setOpen(true); select(t); } else setOpen(!st.open);
      }
    });
    // 탭 이름에 실행 중 표시
    setInterval(renderTabs, 700);
    if (st.open) { addTab(); apply(); } else apply();
  }

  function addTab() {
    const no = ++seq;
    const pane = document.createElement('div'); pane.className = 'tdock-pane';
    el.querySelector('.tdock-body').appendChild(pane);
    const term = Term.create(pane, { dock: true });
    const t = { id: no, no, pane, term };
    tabs.push(t);
    if (!cur) select(t); else renderTabs();
    return t;
  }
  function closeTab(id) {
    const i = tabs.findIndex(t => t.id === id); if (i < 0) return;
    const t = tabs[i];
    if (t.term.fg) t.term.fg.stop();
    t.term.bg.forEach(p => p.stop());
    Term.terms.delete(t.term);
    t.pane.remove();
    tabs.splice(i, 1);
    if (cur === t) { cur = null; if (tabs.length) select(tabs[Math.min(i, tabs.length - 1)]); }
    if (!tabs.length) { seq = 0; setOpen(false); }
    renderTabs();
  }
  function select(t) {
    if (!t) return;
    cur = t;
    tabs.forEach(x => x.pane.classList.toggle('on', x === t));
    renderTabs();
    if (st.open) setTimeout(() => { if (!t.term.fg || !t.term.fg.keys) t.term.inp.focus({ preventScroll: true }); t.term.out.scrollTop = t.term.out.scrollHeight; }, 20);
  }
  function renderTabs() {
    if (!el) return;
    const box = el.querySelector('.tdock-tabs');
    const html = tabs.map(t => {
      const busy = t.term.fg || t.term.bg.length;
      const label = t.term.fg && t.term.lastCmd ? t.term.lastCmd : `터미널 ${t.no}`;
      return `<button class="tdock-tab${t === cur ? ' on' : ''}" data-tab="${t.id}" title="${esc(t.term.lastCmd || '')}">${busy ? '<i class="tdock-dot"></i>' : ''}<span>${esc(label.length > 26 ? label.slice(0, 25) + '…' : label)}</span><b data-close="${t.id}" title="닫기 (실행 중인 명령도 멈춥니다)">×</b></button>`;
    }).join('');
    if (box._h !== html) { box.innerHTML = html; box._h = html; }
  }
  function apply() {
    if (!el) return;
    el.classList.toggle('open', st.open);
    el.classList.toggle('max', st.open && st.max);
    el.querySelector('.tdock-body').style.height = st.open ? (st.max ? '' : st.h + 'px') : '0px';
    el.querySelector('.tdock-arrow').textContent = st.open ? '▼' : '▲';
    window.dispatchEvent(new Event('resize'));
  }
  function setOpen(v) {
    st.open = !!v; save();
    if (st.open && !tabs.length) addTab();
    apply();
    if (st.open && cur) select(cur);
  }

  /** 명령을 도크 터미널에서 실행 (없으면 만들고, 접혀 있으면 펼침) */
  function run(text, opts) {
    build();
    if (!el) return false;
    let t = cur;
    if (opts && opts.newTab || !t) t = addTab();
    setOpen(true); select(t);
    const term = t.term;
    if (term.fg) { term.print('(실행 중인 명령을 멈추고 새 명령을 실행합니다 — 동시에 돌리려면 ＋ 로 터미널을 하나 더 여세요)', 'muted'); term.interrupt(); }
    term.execScript(text);
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    return true;
  }

  window.TermDock = { build, run, addTab, open: () => setOpen(true), close: () => setOpen(false), get tabs() { return tabs; }, get current() { return cur && cur.term; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
