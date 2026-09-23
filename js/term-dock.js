/* ===================================================================
   하단 고정 도크 — 강좌 화면 아래에 붙어 있고, 장을 옮겨도 그대로 유지
   탭: 🖥️ 터미널(여러 개) · 🐍 파이썬 rclpy 실습기(여러 개)
   높이 조절 · 접기/펼치기 (Ctrl+`)
   =================================================================== */
(function () {
  'use strict';
  const KEY = 'r2:dock';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let st = { open: false, h: 280, max: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} };

  const tabs = [];   // { id, kind: 'term'|'py', no, pane, term?, py?, clean? }
  let cur = null, seq = 0, nTerm = 0, nPy = 0, el = null;

  function build() {
    const center = document.getElementById('center');
    if (!center || el) return;
    el = document.createElement('div');
    el.id = 'termDock';
    el.className = 'tdock';
    el.innerHTML = `<div class="tdock-grip" title="끌어서 높이 조절"></div>
      <div class="tdock-head">
        <button class="tdock-toggle" title="펼치기/접기 (Ctrl+\`)"><span class="tdock-arrow">▲</span> 실습 도크</button>
        <div class="tdock-tabs" role="tablist"></div>
        <button class="tdock-btn wide" data-a="term" title="새 터미널 (Ctrl+Shift+\`)">＋🖥️</button>
        <button class="tdock-btn wide" data-a="py" title="새 파이썬(rclpy) 실습기">＋🐍</button>
        <span class="spacer"></span>
        <span class="tdock-hint">본문의 ▶ 버튼은 이 도크에서 실행됩니다</span>
        <button class="tdock-btn" data-a="max" title="크게/작게">⤢</button>
        <button class="tdock-btn" data-a="min" title="접기">▁</button>
      </div>
      <div class="tdock-body"></div>`;
    center.appendChild(el);
    el.querySelector('.tdock-toggle').onclick = () => setOpen(!st.open);
    el.querySelector('[data-a=term]').onclick = () => { const t = addTab('term'); setOpen(true); select(t); };
    el.querySelector('[data-a=py]').onclick = () => { const t = addTab('py'); setOpen(true); select(t); };
    el.querySelector('[data-a=min]').onclick = () => setOpen(false);
    el.querySelector('[data-a=max]').onclick = () => { st.max = !st.max; save(); apply(); };
    el.querySelector('.tdock-tabs').addEventListener('click', e => {
      const x = e.target.closest('[data-close]'); if (x) { e.stopPropagation(); closeTab(+x.dataset.close); return; }
      const b = e.target.closest('[data-tab]'); if (b) { setOpen(true); select(tabs.find(t => t.id === +b.dataset.tab)); }
    });
    const grip = el.querySelector('.tdock-grip');
    grip.addEventListener('pointerdown', e => {
      if (!st.open) return;
      grip.setPointerCapture(e.pointerId);
      const sy = e.clientY, sh = el.querySelector('.tdock-body').offsetHeight;
      const mv = ev => { st.h = Math.round(Math.max(140, Math.min(center.clientHeight * 0.85, sh + (sy - ev.clientY)))); st.max = false; apply(); };
      const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); save(); window.dispatchEvent(new Event('resize')); };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
    });
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && (e.key === '`' || e.code === 'Backquote')) {
        e.preventDefault();
        if (e.shiftKey) { const t = addTab('term'); setOpen(true); select(t); } else setOpen(!st.open);
      }
    });
    setInterval(renderTabs, 700);
    if (st.open) addTab('term');
    apply();
  }

  function addTab(kind) {
    const id = ++seq;
    const pane = document.createElement('div'); pane.className = 'tdock-pane ' + kind;
    el.querySelector('.tdock-body').appendChild(pane);
    const t = { id, kind, pane };
    if (kind === 'py') {
      t.no = ++nPy;
      const host = document.createElement('div'); host.className = 'tdock-py'; pane.appendChild(host);
      t.clean = RosUI.views.pylab.fn(host, { ex: 'blank', file: 'main', with: 'none', key: 'dock-py-' + t.no });
      host.classList.add('pl-dock');
      t.py = host._pylab;
    } else {
      t.no = ++nTerm;
      t.term = Term.create(pane, { dock: true });
    }
    tabs.push(t);
    if (!cur) select(t); else renderTabs();
    return t;
  }
  function closeTab(id) {
    const i = tabs.findIndex(t => t.id === id); if (i < 0) return;
    const t = tabs[i];
    if (t.term) { if (t.term.fg) t.term.fg.stop(); t.term.bg.forEach(p => p.stop()); Term.terms.delete(t.term); }
    if (typeof t.clean === 'function') { try { t.clean(); } catch (e) { console.error(e); } }
    t.pane.remove();
    tabs.splice(i, 1);
    if (cur === t) { cur = null; if (tabs.length) select(tabs[Math.min(i, tabs.length - 1)]); }
    if (!tabs.some(x => x.kind === 'term')) nTerm = 0;
    if (!tabs.some(x => x.kind === 'py')) nPy = 0;
    if (!tabs.length) setOpen(false);
    renderTabs();
  }
  function select(t) {
    if (!t) return;
    cur = t;
    tabs.forEach(x => x.pane.classList.toggle('on', x === t));
    renderTabs();
    if (st.open && t.term) setTimeout(() => { if (!t.term.fg || !t.term.fg.keys) t.term.inp.focus({ preventScroll: true }); t.term.out.scrollTop = t.term.out.scrollHeight; }, 20);
    if (t.kind === 'py') setTimeout(() => { const cm = t.pane.querySelector('.CodeMirror'); if (cm && cm.CodeMirror) cm.CodeMirror.refresh(); }, 30);
  }
  function renderTabs() {
    if (!el) return;
    const box = el.querySelector('.tdock-tabs');
    const html = tabs.map(t => {
      let busy, label, tip = '';
      if (t.kind === 'term') { busy = t.term.fg || t.term.bg.length; label = t.term.fg && t.term.lastCmd ? t.term.lastCmd : `터미널 ${t.no}`; tip = t.term.lastCmd || ''; }
      else { busy = t.py && t.py.running; label = `파이썬 ${t.no}`; }
      const icon = t.kind === 'py' ? '🐍' : '🖥️';
      return `<button class="tdock-tab${t === cur ? ' on' : ''} k-${t.kind}" data-tab="${t.id}" title="${esc(tip)}">${busy ? '<i class="tdock-dot"></i>' : ''}<span>${icon} ${esc(label.length > 24 ? label.slice(0, 23) + '…' : label)}</span><b data-close="${t.id}" title="닫기 (실행 중인 것도 멈춥니다)">×</b></button>`;
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
    if (st.open && !tabs.length) addTab('term');
    apply();
    if (st.open && cur) select(cur);
  }
  function flash() { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }

  /** 명령을 도크 터미널에서 실행 (현재 탭이 터미널이면 그것, 아니면 첫 터미널, 없으면 새로) */
  function run(text, opts) {
    build();
    if (!el) return false;
    let t = opts && opts.newTab ? null : (cur && cur.kind === 'term' ? cur : tabs.find(x => x.kind === 'term'));
    if (!t) t = addTab('term');
    setOpen(true); select(t);
    const term = t.term;
    if (term.fg) { term.print('(실행 중인 명령을 멈추고 새 명령을 실행합니다 — 동시에 돌리려면 ＋🖥️ 로 터미널을 하나 더 여세요)', 'muted'); term.interrupt(); }
    term.execScript(text);
    flash();
    return true;
  }
  /** 파이썬 코드를 도크의 🐍 탭에 넣고 실행. withV 가 화면 이름이면 오른쪽 고정 화면도 연다 */
  function runPy(code, withV) {
    build();
    if (!el) return false;
    let t = cur && cur.kind === 'py' ? cur : tabs.find(x => x.kind === 'py');
    if (!t) t = addTab('py');
    setOpen(true); select(t);
    if (!t.py) return false;
    if (t.py.running) t.py.stop();
    t.py.setCode(code);
    setTimeout(() => t.py.run(), t.py.running ? 400 : 30);
    if (withV && !/^(none|term)$/.test(withV) && window.SideDock && RosUI.views[withV]) SideDock.open(withV);
    flash();
    return true;
  }

  window.TermDock = { build, run, runPy, addTab, open: () => setOpen(true), close: () => setOpen(false), get tabs() { return tabs; }, get current() { return cur && cur.term; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
