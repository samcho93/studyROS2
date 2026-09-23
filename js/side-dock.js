/* ===================================================================
   오른쪽 고정 화면 (사이드 도크) — turtlesim · rqt_graph · 로봇 시뮬레이터 등을
   강좌 본문 오른쪽에 붙여 두고, 장을 옮겨도 그대로 유지
   =================================================================== */
(function () {
  'use strict';
  const KEY = 'r2:side';
  const VIEWS = [
    ['turtlesim', '🐢 turtlesim'], ['graph', '🕸️ rqt_graph'], ['plot', '📈 rqt_plot'], ['topics', '📡 토픽 모니터'],
    ['bot', '🤖 이동 로봇 (bot)'], ['rviz', '🧭 RViz'], ['arm', '🦾 SO-ARM101'], ['go2', '🐕 Go2'], ['teleop', '🎮 조이스틱']
  ];
  let st = { open: false, view: 'turtlesim', w: 440 };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (_) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (_) {} };
  let el = null, clean = null, shown = null;

  function build() {
    const dv = document.getElementById('docView');
    if (!dv || el) return;
    el = document.createElement('aside');
    el.id = 'sideDock'; el.className = 'sdock';
    el.innerHTML = `<div class="sdock-grip" title="끌어서 너비 조절"></div>
      <div class="sdock-head"><select class="w-in sdock-sel" title="오른쪽에 고정할 화면">${VIEWS.map(([k, t]) => `<option value="${k}">${t}</option>`).join('')}</select>
        <span class="spacer"></span><button class="sdock-btn" data-a="close" title="닫기 (위쪽 🐢 화면 버튼으로 다시 열기)">✕</button></div>
      <div class="sdock-body"></div>`;
    dv.appendChild(el);
    el.querySelector('.sdock-sel').onchange = e => show(e.target.value);
    el.querySelector('[data-a=close]').onclick = () => setOpen(false);
    const grip = el.querySelector('.sdock-grip');
    grip.addEventListener('pointerdown', e => {
      grip.setPointerCapture(e.pointerId);
      const sx = e.clientX, sw = el.offsetWidth;
      const mv = ev => { st.w = Math.round(Math.max(280, Math.min(dv.clientWidth * 0.7, sw + (sx - ev.clientX)))); el.style.width = st.w + 'px'; };
      const up = () => { grip.removeEventListener('pointermove', mv); grip.removeEventListener('pointerup', up); save(); window.dispatchEvent(new Event('resize')); };
      grip.addEventListener('pointermove', mv); grip.addEventListener('pointerup', up);
    });
    // 위쪽 막대에 켜기/끄기 버튼
    const vs = document.querySelector('.topbar .view-switch');
    if (vs && !document.getElementById('sideBtn')) {
      const b = document.createElement('button');
      b.id = 'sideBtn'; b.className = 'btn ghost small side-btn'; b.title = '오른쪽에 turtlesim 등 화면 고정 (장을 옮겨도 유지)'; b.textContent = '🐢 화면';
      b.onclick = () => setOpen(!st.open);
      vs.parentNode.insertBefore(b, vs);
    }
    apply();
  }
  function show(view) {
    if (!el) build();
    if (clean && shown === view) return;
    if (typeof clean === 'function') { try { clean(); } catch (e) { console.error(e); } }
    clean = null;
    const body = el.querySelector('.sdock-body');
    body.innerHTML = '';
    const d = document.createElement('div'); d.className = 'sdock-view'; body.appendChild(d);
    st.view = view; save(); shown = view;
    el.querySelector('.sdock-sel').value = view;
    clean = RosUI.sideView(view, d, { inWindow: true });
  }
  function apply() {
    if (!el) return;
    el.classList.toggle('open', st.open);
    el.style.width = st.w + 'px';
    const b = document.getElementById('sideBtn'); if (b) b.classList.toggle('on', st.open);
    if (st.open && !shown) show(st.view);
    window.dispatchEvent(new Event('resize'));
  }
  function setOpen(v, view) {
    build();
    st.open = !!v; save();
    if (view) show(view);
    apply();
  }
  /** 화면을 열고 (필요하면) 종류를 바꾼다 */
  function open(view) { setOpen(true, view && view !== shown ? view : null); }

  window.SideDock = { build, open, close: () => setOpen(false), show, get view() { return shown; }, get isOpen() { return st.open; }, VIEWS };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
