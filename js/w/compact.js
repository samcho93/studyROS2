/* ===================================================================
   문서 보기에서는 본문 안 터미널 · turtlesim · 실습 · 파이썬 실습기를 크게 넣지 않고
   "실습 카드"로 바꾼다 — 실제 실행은 하단 고정 도크(터미널 · 🐍)와 오른쪽 고정 화면에서.
   (슬라이드에서는 도크가 안 보이므로 원래 위젯 그대로. inline=1 옵션이면 항상 원래 위젯)
   =================================================================== */
(function () {
  'use strict';
  const esc = Widgets.esc;
  const VIEW_LABEL = { turtlesim: '🐢 turtlesim', graph: '🕸️ rqt_graph', plot: '📈 rqt_plot', topics: '📡 토픽 모니터', bot: '🤖 이동 로봇', rviz: '🧭 RViz', arm: '🦾 SO-ARM101', go2: '🐕 Go2', teleop: '🎮 조이스틱' };
  const compactOK = (el, o) => !el.closest('.slide') && !el.closest('.rwin') && o.inline !== '1' && window.TermDock && window.SideDock && document.getElementById('docView') && el.closest('#content');

  /** 카드가 화면에 들어오면 오른쪽 고정 화면을 그 종류로 연다 */
  function watch(el, view) {
    if (!view || !RosUI.views[view] || typeof IntersectionObserver === 'undefined') return () => {};
    const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) SideDock.autoOpen(view); }); }, { threshold: 0.6 });
    io.observe(el);
    return () => io.disconnect();
  }
  function chipsHtml(o) {
    const list = String(o.chips || o.hint || '').split(';').map(s => s.trim()).filter(Boolean);
    const run = String(o.run || '').split(';').map(s => s.trim()).filter(Boolean);
    let h = '';
    if (run.length) h += `<button class="btn tiny primary cw-run" data-cmds="${esc(run.join('\n'))}">▶ 실행: ${esc(run.length > 1 ? run[0] + ' …' : run[0])}</button>`;
    h += list.map(c => `<button class="term-chip mono cw-chip" data-cmds="${esc(c)}" title="하단 터미널에서 실행">▶ ${esc(c)}</button>`).join('');
    return h;
  }
  function card(el, icon, title, text, bodyHtml, views) {
    el.classList.add('cw');
    el.innerHTML = `<div class="cw-card"><div class="cw-ic">${icon}</div><div class="cw-main">
      <div class="cw-t">${title}</div><div class="cw-d">${text}</div>
      <div class="cw-acts">${bodyHtml}</div></div></div>`;
    el.addEventListener('click', e => {
      const c = e.target.closest('[data-cmds]'); if (c) { TermDock.run(c.dataset.cmds); return; }
      const v = e.target.closest('[data-view]'); if (v) { SideDock.open(v.dataset.view); return; }
      const t = e.target.closest('[data-a=term]'); if (t) { TermDock.open(); return; }
      const nt = e.target.closest('[data-a=newterm]'); if (nt) { TermDock.run('', { newTab: true }); return; }
      const inl = e.target.closest('[data-a=inline]'); if (inl) { inl.closest('.cw').dispatchEvent(new CustomEvent('cw-inline')); }
    });
  }
  const viewBtns = views => views.filter(v => RosUI.views[v]).map(v => `<button class="btn tiny" data-view="${v}" title="오른쪽 고정 화면에 띄우기">${VIEW_LABEL[v] || v} → 오른쪽</button>`).join('');

  function wrap(name, make) {
    const orig = Widgets.get(name);
    if (!orig) return;
    Widgets.register(name, (el, o) => {
      if (!compactOK(el, o)) return orig(el, o);
      let cleanup = make(el, o);
      // "여기에 펼치기" 를 누르면 원래 위젯으로
      el.addEventListener('cw-inline', () => { if (typeof cleanup === 'function') cleanup(); el.classList.remove('cw'); el.innerHTML = ''; const c = orig(el, o); el._cleanup = c; });
      return () => { if (typeof cleanup === 'function') cleanup(); };
    }, Widgets.meta[name]);
  }

  // 터미널 위젯 → 명령 칩 카드
  wrap('term', (el, o) => {
    card(el, '🖥️', '터미널 실습', '아래 <b>실습 도크의 터미널</b>에서 실행됩니다. 버튼을 누르거나 직접 입력해 보세요. (<kbd>Ctrl</kbd>+<kbd>`</kbd> 펼치기)',
      chipsHtml(o) + `<button class="btn tiny ghost" data-a="term">🖥️ 터미널 열기</button><button class="btn tiny ghost" data-a="newterm" title="새 터미널 탭">＋ 새 터미널</button>`);
    return () => {};
  });

  // turtlesim 위젯 → 오른쪽 고정 화면
  wrap('turtlesim', (el, o) => {
    card(el, '🐢', 'turtlesim', '거북이는 <b>오른쪽 고정 화면</b>에 있습니다. 이 부분까지 읽으면 자동으로 열려요. 방향 버튼 · spawn · clear 도 거기서.',
      viewBtns(['turtlesim']) + `<button class="btn tiny ghost" data-a="term">🖥️ 터미널 열기</button><button class="btn tiny ghost" data-a="inline" title="이 자리에 turtlesim 을 펼치기">⤓ 여기에 펼치기</button>`);
    // 노드가 없으면 만들어 두기 (오른쪽 화면이 곧 같은 sim 을 그림)
    if (o.start !== '0' && !ROS.findTurtlesim()) ROS.createTurtlesim(null, { name: 'turtlesim' }).node.keep = true;
    return watch(el, 'turtlesim');
  });

  // lab 위젯 (터미널 + 화면) → 칩 + 오른쪽 화면
  wrap('lab', (el, o) => {
    const views = String(o.with || 'turtlesim').split(',').map(s => s.trim()).filter(Boolean);
    const main = views.find(v => RosUI.views[v]);
    if (views.includes('turtlesim') && !ROS.findTurtlesim()) ROS.createTurtlesim(null, { name: 'turtlesim' }).node.keep = true;
    card(el, '🧪', esc(o.title || '실습'), `아래 <b>실습 도크의 터미널</b>에서 명령을 실행하고, 결과는 <b>오른쪽 고정 화면</b>${main ? `(${VIEW_LABEL[main] || main})` : ''}에서 봅니다.`,
      chipsHtml(o) + viewBtns(views) + `<button class="btn tiny ghost" data-a="term">🖥️ 터미널 열기</button><button class="btn tiny ghost" data-a="inline" title="이 자리에 터미널과 화면을 펼치기">⤓ 여기에 펼치기</button>`);
    return watch(el, main);
  });

  // 파이썬 실습기 → 코드 미리보기 + 도크에서 실행
  wrap('pylab', (el, o) => {
    const EX = window.PY_EXAMPLES || {};
    const ex = EX[o.ex] || EX.talker;
    const withV = o.with || ex.with || 'graph';
    const code = o.code || ex.code;
    card(el, '🐍', `파이썬 실습 — ${esc(ex.title)}`, (ex.desc ? esc(ex.desc) + '<br>' : '') + '▶ 를 누르면 아래 <b>실습 도크의 🐍 탭</b>에 코드가 들어가 실행됩니다. 거기서 고쳐서 다시 실행해 보세요.',
      `<button class="btn tiny primary" data-py="1">▶ 파이썬 실행</button>${viewBtns(withV === 'none' || withV === 'term' ? [] : [withV])}<details class="cw-code"><summary>코드 보기 (${code.split('\n').length}줄)</summary><pre class="code" data-lang="Python"><code>${esc(code)}</code></pre></details>`);
    el.querySelector('[data-py]').onclick = () => TermDock.runPy(code, withV);
    return watch(el, withV === 'none' || withV === 'term' ? null : withV);
  });
})();
