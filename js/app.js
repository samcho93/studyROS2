/* ===================================================================
   컴퓨터 구조 강좌 — 앱 (목차 · 문서 · 역할/보기 전환 · 진도 · 퀴즈)
   =================================================================== */
(function () {
  'use strict';
  const { esc, expand, videoCard } = window.Render;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const store = {
    get(k, d) { try { const v = localStorage.getItem('r2:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('r2:' + k, JSON.stringify(v)); } catch (_) {} }
  };

  const params = new URLSearchParams(location.search);
  const state = {
    role: params.get('role') || store.get('role', 'student'),
    view: params.get('view') || null,
    id: 'home',
    done: store.get('done', {})
  };
  if (!['student', 'teacher'].includes(state.role)) state.role = 'student';
  if (!state.view) state.view = state.role === 'teacher' ? 'slides' : 'doc';

  /* ------------------------------------------------ 공용 UI --- */
  function toast(msg, ms = 1800) {
    const t = $('#toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.add('hidden'), ms);
  }
  function modal(title, html) {
    $('#modalTitle').textContent = title; $('#modalBody').innerHTML = html; $('#modal').classList.remove('hidden');
  }
  $('#modalClose').onclick = () => { $('#modal').classList.add('hidden'); $('#modalBody').innerHTML = ''; };
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal') $('#modalClose').click(); });
  window.App = { toast, modal, store, state };

  /* ------------------------------------------------ 테마 --- */
  function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); store.set('theme', t); try { localStorage.setItem('r2:theme', t); } catch (_) {} }
  (function () {
    let t = null; try { t = localStorage.getItem('r2:theme'); } catch (_) {}
    if (t && t.startsWith('"')) t = JSON.parse(t);
    if (!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
  $('#themeBtn').onclick = () => {
    const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('r2:theme', t); } catch (_) {}
  };

  /* ------------------------------------------------ 역할 · 보기 --- */
  function setRole(r, silent) {
    state.role = r; store.set('role', r);
    document.body.classList.toggle('is-teacher', r === 'teacher');
    $$('.role-switch button').forEach(b => b.classList.toggle('on', b.dataset.role === r));
    $('#navFootRole').textContent = r === 'teacher' ? '🧑‍🏫 강사용 보기' : '🎓 학생용 보기';
    const u = new URL(location.href); u.searchParams.set('role', r); history.replaceState(null, '', u);
    if (!silent) { setView(r === 'teacher' ? 'slides' : 'doc'); toast(r === 'teacher' ? '🧑‍🏫 강사용: 슬라이드 · 판서 · 노트' : '🎓 학생용: 문서 보기'); }
  }
  function setView(v) {
    const lesson = Course.lessons[state.id];
    if (v === 'slides' && !lesson) v = 'doc';
    state.view = v;
    $$('.view-switch button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    $('#docView').classList.toggle('hidden', v !== 'doc');
    $('#slideView').classList.toggle('hidden', v !== 'slides');
    document.body.classList.toggle('in-slides', v === 'slides');
    if (v === 'slides') Slides.mount($('#slideView'), lesson, { role: state.role, onDoc: () => setView('doc') });
    else Slides.unmount();
  }
  $$('.role-switch button').forEach(b => b.onclick = () => setRole(b.dataset.role));
  $$('.view-switch button').forEach(b => b.onclick = () => setView(b.dataset.view));

  /* ------------------------------------------------ 목차 --- */
  function renderNav(filter) {
    const q = (filter || '').trim().toLowerCase();
    const html = Course.parts.map(p => {
      const items = p.items.map(id => {
        const l = Course.info(id); if (!l) return '';
        if (q) {
          const full = Course.lessons[id];
          const hay = (l.title + ' ' + (l.summary || '') + ' ' + (full ? JSON.stringify(full.sections || []) + JSON.stringify(full.terms || []) : '')).toLowerCase();
          if (!hay.includes(q)) return '';
        }
        return `<a class="nav-item${state.id === id ? ' on' : ''}${l.missing ? ' missing' : ''}" href="#${id}" title="${esc(l.summary || '')}">
          <span class="ni-icon">${l.icon || '•'}</span>
          <span class="ni-text"><span class="ni-no">${/^ch/.test(id) ? id.slice(2) : ''}</span>${esc(l.title)}</span>
        </a>`;
      }).join('');
      return items ? `<div class="nav-part"><div class="nav-part-title">${esc(p.title)}</div>${items}</div>` : '';
    }).join('');
    $('#navTree').innerHTML = html || '<div class="muted small pad">검색 결과가 없습니다.</div>';
    const chs = Course.order().filter(id => /^ch/.test(id));
    const n = chs.filter(id => state.done[id]).length;
    $('#progressText').textContent = `${n} / ${chs.length}`;
    $('#progressBar').style.width = (100 * n / chs.length) + '%';
  }
  $('#navSearch').addEventListener('input', e => renderNav(e.target.value));
  $('#navTree').addEventListener('click', () => { if (innerWidth < 900) document.body.classList.add('nav-collapsed'); });
  $('#navCloseBtn').onclick = () => document.body.classList.add('nav-collapsed');
  $('#navOpenBtn').onclick = () => document.body.classList.remove('nav-collapsed');
  if (innerWidth < 900) document.body.classList.add('nav-collapsed');

  /* ------------------------------------------------ 페이지들 --- */
  function crumb(html) { $('#crumb').innerHTML = html; }

  function homeHtml() {
    const cards = Course.parts.filter(p => p.id !== 'px').map(p => `<div class="hpart"><h3 class="hpart-t">${esc(p.title)}</h3><div class="hcards">${p.items.map(id => {
      const l = Course.info(id);
      return `<a class="hcard${state.done[id] ? ' done' : ''}" href="#${id}">
        <div class="hc-top"><span class="hc-icon">${l.icon}</span><span class="hc-no">CH ${id.slice(2)}</span>${state.done[id] ? '<span class="hc-done">✓ 완료</span>' : ''}</div>
        <div class="hc-title">${esc(l.title)}</div>
        <div class="hc-sum">${esc(l.summary || '')}</div>
      </a>`;
    }).join('')}</div></div>`).join('');
    return `<div class="home">
      <section class="hero">
        <div class="hero-text">
          <div class="hero-kicker">설치 없이 브라우저에서 바로 실습하는</div>
          <h1>ROS 2<br><span class="grad">쉽게 배우기</span></h1>
          <p>노드 · 토픽 · 서비스 · 액션부터 TF, URDF, RViz, Nav2, MoveIt 2 까지.
          이 페이지 안에 <b>진짜처럼 동작하는 ROS 2 그래프</b>가 들어 있어서 <code>ros2</code> 명령, turtlesim, rclpy 파이썬 코드를 바로 실행해 볼 수 있습니다.
          배운 코드는 실제 Ubuntu + ROS 2 Jazzy 에서도 그대로 동작합니다.</p>
          <div class="hero-btns">
            <a class="btn primary" href="#ch00">🎓 0장부터 시작하기</a>
            <a class="btn" href="#lab">🧪 실습실 바로 가기</a>
            <button class="btn" data-go-role="teacher">🧑‍🏫 강사용(슬라이드 · 판서)</button>
          </div>
        </div>
        <div class="hero-art">${heroSvg()}</div>
      </section>

      <section class="feature-row">
        <div class="feat"><div class="fi">🖥️</div><b>브라우저 터미널</b><span>ros2 node/topic/service/action/param/bag · colcon build</span></div>
        <div class="feat"><div class="fi">🐍</div><b>rclpy 실행</b><span>파이썬 노드를 Pyodide 로 실행 — 실제 코드 그대로</span></div>
        <div class="feat"><div class="fi">🐢</div><b>시뮬레이터</b><span>turtlesim · 이동 로봇 · SLAM/Nav2 · 로봇팔 · Go2</span></div>
        <div class="feat"><div class="fi">🧰</div><b>ROS 도구</b><span>rqt_graph · rqt_plot · RViz · TF · rosbag2 · rosbridge</span></div>
      </section>

      <div class="try-now">
        <div class="try-h"><b>🐢 지금 바로 해 보기</b> <span class="muted small">버튼을 눌러 명령을 실행하고, 거북이를 방향 버튼으로 움직여 보세요</span></div>
        <div class="code-run" style="justify-content:flex-start;margin:6px 0"><button class="btn tiny" data-sh="ros2 node list">▶ ros2 node list</button><button class="btn tiny" data-sh="ros2 topic list -t">▶ ros2 topic list -t</button><button class="btn tiny" data-sh="ros2 topic echo /turtle1/pose --once">▶ ros2 topic echo /turtle1/pose --once</button><button class="btn tiny" data-sh='ros2 topic pub /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}" -r 1'>▶ 원 그리기 (topic pub)</button></div>
        <div class="widget" data-w="lab" data-o='${esc(JSON.stringify({ with: 'turtlesim', h: '380' }))}'></div>
      </div>

      <h2 class="home-h">📚 강좌 구성</h2>
      ${cards}

      <h2 class="home-h">🔗 함께 보는 로봇 강좌</h2>
      <div class="cards c3">
        <a class="card blue sister" href="https://samcho93.github.io/studySOArm101/" target="_blank" rel="noopener"><div class="ci">🦾</div><b>SO-ARM101 로봇팔</b><p>조립 · 서보 · LeRobot 모방학습 · ros2_control · MoveIt 2. 이 강좌 17장과 연결됩니다.</p></a>
        <a class="card orange sister" href="https://samcho93.github.io/studyGo2/" target="_blank" rel="noopener"><div class="ci">🐕</div><b>Unitree Go2 사족보행</b><p>SDK2 · WebRTC · MuJoCo 시뮬레이터 · unitree_ros2. 이 강좌 18장과 연결됩니다.</p></a>
        <a class="card teal sister" href="https://samcho93.github.io/studyOpenCV/" target="_blank" rel="noopener"><div class="ci">👁️</div><b>OpenCV 영상 처리</b><p>이미지 처리 · 특징점 · 딥러닝 검출. 19장 비전 노드의 기초입니다.</p></a>
      </div>

      <h2 class="home-h">🧑‍🏫 학생용 · 강사용</h2>
      <div class="role-table">
        <div class="rt"><h3>🎓 학생용 <code>student.html</code></h3>
          <ul><li>그림 · 도표가 풍부한 문서형 강좌</li><li>터미널 · 파이썬 · 시뮬레이터로 직접 실습</li><li>확인 퀴즈 즉시 채점 · 학습 진도 저장</li><li>유튜브 추천 영상 · 용어 사전 · 명령어 치트시트</li></ul></div>
        <div class="rt"><h3>🧑‍🏫 강사용 <code>teacher.html</code></h3>
          <ul><li>16:9 PPT 슬라이드 (전체 화면) — 슬라이드 안에서도 실습 위젯 동작</li><li><b>판서</b>: 펜 · 형광펜 · 지우개 · 레이저 포인터 · 빈 칠판</li><li>강의 노트 · 퀴즈 정답 공개 · 수업 타이머</li><li>🖥 발표자 창 (노트 + 다음 슬라이드)</li></ul></div>
      </div>
      <div class="box tip"><b>⌨ 슬라이드 단축키</b> — <kbd>←</kbd><kbd>→</kbd> 이동 · <kbd>F</kbd> 전체 화면 · <kbd>P</kbd> 펜 · <kbd>H</kbd> 형광펜 · <kbd>E</kbd> 지우개 · <kbd>L</kbd> 레이저 · <kbd>W</kbd> 빈 칠판 · <kbd>Esc</kbd> 판서 끄기 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> 되돌리기 · <kbd>G</kbd> 목록 · <kbd>N</kbd> 노트 · <kbd>B</kbd> 화면 가리기</div>
    </div>`;
  }

  function heroSvg() {
    const N = [[70, 70, '/camera'], [70, 230, '/lidar'], [285, 150, '/planner'], [285, 290, '/motor']];
    return `<svg class="dg hero-svg" viewBox="0 0 360 330" role="img" aria-label="ROS 2 노드와 토픽 그림">
      <defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent2)"/></linearGradient></defs>
      <rect x="10" y="10" width="340" height="310" rx="26" fill="url(#hg)" opacity=".12"/>
      <path d="M118,78 C170,80 190,120 236,142" class="ln-teal thick moving" fill="none"/>
      <path d="M118,226 C170,224 190,178 236,160" class="ln-teal thick moving" fill="none"/>
      <path d="M285,178 L285,262" class="ln-orange thick moving" fill="none"/>
      <rect x="150" y="96" width="92" height="26" rx="6" class="green"/><text x="196" y="109" class="t-xs t-c t-mono">/image</text>
      <rect x="150" y="186" width="92" height="26" rx="6" class="green"/><text x="196" y="199" class="t-xs t-c t-mono">/scan</text>
      <rect x="292" y="208" width="62" height="24" rx="6" class="green"/><text x="323" y="220" class="t-xs t-c t-mono">/cmd_vel</text>
      ${N.map(([x, y, t]) => `<ellipse cx="${x}" cy="${y}" rx="${t.length * 5.4 + 16}" ry="24" class="blue"/><text x="${x}" y="${y}" class="t-sm t-c t-mono t-b">${t}</text>`).join('')}
    </svg>`;
  }

  function lessonHtml(l) {
    const teacher = state.role === 'teacher';
    const secs = (l.sections || []);
    const toc = secs.map((s, i) => `<a href="#${l.id}:s${i + 1}" data-sec="${i + 1}">${i + 1}. ${esc(s.title)}</a>`).join('');
    const quiz = (l.quiz || []).map((q, i) => `
      <div class="quiz" data-answer="${q.answer}">
        <div class="qq"><span class="qn">Q${i + 1}</span> ${q.q}</div>
        <div class="qopts">${q.options.map((o, j) => `<button class="qopt" data-i="${j}"><b>${'①②③④⑤⑥'[j]}</b> ${o}</button>`).join('')}</div>
        <div class="qexp hidden">💡 ${q.explain || ''}</div>
        ${teacher ? `<div class="teacher-answer">🔑 정답: ${'①②③④⑤⑥'[q.answer]}</div>` : ''}
      </div>`).join('');
    const vids = (l.videos || []).map(v => videoCard(v)).join('');
    const terms = (l.terms || []).map(([t, d]) => `<div class="term"><dt>${esc(t)}</dt><dd>${d}</dd></div>`).join('');
    const idx = Course.order().indexOf(l.id);
    const next = Course.info(Course.order()[idx + 1]);
    return `<article class="lesson">
      <header class="l-head">
        <div class="l-kicker"><span class="l-no">CHAPTER ${esc(l.no || l.id.slice(2))}</span>${l.level ? `<span class="chip">${esc(l.level)}</span>` : ''}${l.time ? `<span class="chip">⏱ ${esc(l.time)}</span>` : ''}</div>
        <h1><span class="l-icon">${l.icon || ''}</span>${esc(l.title)}</h1>
        ${l.subtitle ? `<p class="l-sub">${l.subtitle}</p>` : ''}
        ${teacher ? `<div class="teacher-bar"><button class="btn primary small" data-act="to-slides">🖼️ 이 장을 슬라이드로 수업하기</button>${l.teacher && l.teacher.flow ? `<details class="tflow"><summary>🗒 수업 흐름 보기</summary><div>${l.teacher.flow}</div></details>` : ''}</div>` : ''}
      </header>
      ${l.goals ? `<div class="goals"><div class="goals-h">🎯 이 장에서 배울 것</div><ol>${l.goals.map(g => `<li>${g}</li>`).join('')}</ol></div>` : ''}
      ${toc ? `<nav class="l-toc">${toc}${vids ? `<a href="#${l.id}:videos">🎬 영상</a>` : ''}${quiz ? `<a href="#${l.id}:quiz">✅ 퀴즈</a>` : ''}</nav>` : ''}
      ${secs.map((s, i) => `<section class="l-sec" id="${l.id}-s${i + 1}"><h2><span class="sn">${i + 1}</span>${esc(s.title)}</h2>${expand(s.html, l)}</section>`).join('')}
      ${vids ? `<section class="l-sec" id="${l.id}-videos"><h2><span class="sn">🎬</span>유튜브로 더 알아보기</h2><p class="muted">이론을 영상으로 확인해 보세요. 썸네일을 누르면 유튜브가 새 창으로 열리고, <b>▶ 여기서 보기</b>를 누르면 이 페이지에서 재생됩니다.</p><div class="vgrid">${vids}</div></section>` : ''}
      ${l.summary ? `<section class="l-sec"><h2><span class="sn">📌</span>핵심 정리</h2><ul class="summary">${l.summary.map(s => `<li>${s}</li>`).join('')}</ul></section>` : ''}
      ${terms ? `<section class="l-sec"><h2><span class="sn">📖</span>핵심 용어</h2><dl class="terms">${terms}</dl></section>` : ''}
      ${quiz ? `<section class="l-sec" id="${l.id}-quiz"><h2><span class="sn">✅</span>확인 퀴즈</h2><div class="quizzes">${quiz}</div><div class="quiz-score muted" id="quizScore"></div></section>` : ''}
      <div class="l-foot">
        <button class="btn ${state.done[l.id] ? '' : 'primary'}" data-act="done">${state.done[l.id] ? '✓ 학습 완료됨 (취소)' : '✓ 이 장 학습 완료'}</button>
        ${next ? `<a class="btn ghost" href="#${Course.order()[idx + 1]}">다음: ${next.icon || ''} ${esc(next.title)} ▶</a>` : ''}
      </div>
    </article>`;
  }

  function videosHtml() {
    let html = `<article class="lesson"><header class="l-head"><h1><span class="l-icon">🎬</span>추천 영상 모음</h1>
      <p class="l-sub">각 장에 연결된 유튜브 영상을 한곳에 모았습니다. 이론을 배운 뒤 영상으로 실제 모습과 실무 사례를 확인하세요.</p></header>
      <input class="nav-search vfilter" type="search" placeholder="영상 검색 (예: 캐시, RISC-V, 반도체)">`;
    Course.order().filter(id => /^ch/.test(id)).forEach(id => {
      const l = Course.lessons[id]; if (!l || !l.videos || !l.videos.length) return;
      html += `<section class="l-sec vsec"><h2><span class="sn">${l.icon}</span><a href="#${id}">${esc(l.title)}</a></h2><div class="vgrid">${l.videos.map(v => videoCard(v)).join('')}</div></section>`;
    });
    return html + '</article>';
  }

  function glossaryHtml() {
    const all = [];
    Course.order().forEach(id => { const l = Course.lessons[id]; (l && l.terms || []).forEach(([t, d]) => all.push({ t, d, id, ch: l })); });
    all.sort((a, b) => a.t.localeCompare(b.t, 'ko'));
    return `<article class="lesson"><header class="l-head"><h1><span class="l-icon">📖</span>용어 사전</h1>
      <p class="l-sub">강좌 전체에 나오는 핵심 용어 ${all.length}개를 가나다 · ABC 순으로 모았습니다.</p></header>
      <input class="nav-search gfilter" type="search" placeholder="용어 검색">
      <dl class="terms glossary">${all.map(x => `<div class="term" data-k="${esc((x.t + ' ' + x.d).toLowerCase())}"><dt>${esc(x.t)}</dt><dd>${x.d} <a class="gch" href="#${x.id}">${x.ch.icon} ${x.id.slice(2)}장</a></dd></div>`).join('')}</dl></article>`;
  }

  /* ------------------------------------------------ 코드 블록 실행 버튼 --- */
  function decorateCode(root) {
    root.querySelectorAll('pre.code:not([data-deco])').forEach(pre => {
      pre.dataset.deco = '1';
      if (pre.closest('.slide')) return;
      const run = pre.dataset.run;
      const bar = document.createElement('div'); bar.className = 'code-run';
      bar.innerHTML = (run === 'sh' ? '<button class="btn tiny primary" data-coderun="sh" title="이 페이지의 터미널에서 실행">▶ 터미널에서 실행</button>' : '') +
        (run === 'py' ? `<button class="btn tiny primary" data-coderun="py" data-with="${esc(pre.dataset.with || 'graph')}" title="파이썬 실습기 창에서 실행">▶ 실습기에서 실행</button>` : '') +
        '<button class="btn tiny ghost" data-coderun="copy">⧉ 복사</button>';
      pre.after(bar);
    });
  }
  window.App.decorateCode = decorateCode;

  /* ------------------------------------------------ 실습실 · 치트시트 --- */
  function labHtml() {
    return `<article class="lesson labpage"><header class="l-head"><h1><span class="l-icon">🧪</span>ROS 2 실습실</h1>
      <p class="l-sub">터미널 · 파이썬 편집기 · 시뮬레이터 · 그래프를 한 화면에서. 모두 같은 ROS 2 그래프에 붙어 있습니다. 창을 더 띄우려면 터미널에서 <code>rqt_graph</code>, <code>rviz2</code>, <code>rqt</code> 를 입력하세요.</p></header>
      <div class="labpage-grid">
        <div class="labpage-cell"><div class="lp-h">🖥️ 터미널 <span class="spacer"></span><button class="btn tiny ghost" data-lpopen="term">⧉ 새 터미널 창</button></div><div class="lp-b lp-term" id="lpTerm"></div></div>
        <div class="labpage-cell"><div class="lp-h">🖼️ 화면 <select class="w-in lp-view"><option value="turtlesim">turtlesim</option><option value="graph">rqt_graph</option><option value="bot">이동 로봇 (bot)</option><option value="rviz">RViz</option><option value="arm">SO-ARM101</option><option value="go2">Go2</option><option value="plot">rqt_plot</option><option value="topics">토픽 모니터</option></select></div><div class="lp-b" id="lpView"></div></div>
      </div>
      <div class="labpage-cell"><div class="lp-h">🐍 파이썬 (rclpy)</div><div class="lp-b" id="lpPy"></div></div>
      <div class="box tip"><b>💡 해 볼 것</b> — ① 터미널: <code>ros2 run turtlesim turtle_teleop_key</code> 후 터미널을 클릭하고 방향키 ② 파이썬 예제 "거북이 원 그리기" 실행 ③ <code>ros2 pkg create --build-type ament_python --node-name my_node my_pkg</code> → <code>nano ~/ros2_ws/src/my_pkg/my_pkg/my_node.py</code> → <code>colcon build</code> → <code>source install/setup.bash</code> → <code>ros2 run my_pkg my_node</code></div>
    </article>`;
  }
  function mountLab(root) {
    const term = Term.create(root.querySelector('#lpTerm'), {});
    const holder = root.querySelector('.labpage');
    let clean = null;
    const show = v => { if (typeof clean === 'function') clean(); const host = root.querySelector('#lpView'); host.innerHTML = ''; const d = document.createElement('div'); d.style.flex = '1'; host.appendChild(d); clean = RosUI.sideView(v, d, {}); };
    root.querySelector('.lp-view').onchange = e => show(e.target.value);
    root.querySelector('[data-lpopen]').onclick = () => RosUI.openView('term', {});
    show('turtlesim');
    const d = document.createElement('div'); root.querySelector('#lpPy').appendChild(d); const pyClean = RosUI.views.pylab.fn(d, { ex: 'turtle_circle', with: 'none', key: 'lab' });
    holder._cleanup = () => { if (typeof clean === 'function') clean(); if (typeof pyClean === 'function') pyClean(); if (term.fg) term.fg.stop(); term.bg.forEach(p => p.stop()); Term.terms.delete(term); };
  }
  const CHEAT = [
    ['🚀 실행', [['ros2 run turtlesim turtlesim_node', '패키지의 실행 파일 실행'], ['ros2 run turtlesim turtle_teleop_key', '키보드로 거북이 조종 (터미널 클릭 후 방향키)'], ['ros2 launch turtle_tf2_py turtle_tf2_demo.launch.py', '런치 파일로 여러 노드 실행'], ['ros2 run turtlesim turtlesim_node --ros-args -r __node:=my_turtle', '노드 이름 바꿔 실행 (리매핑)'], ['ros2 run turtlesim turtlesim_node --ros-args -p background_r:=200', '파라미터 주고 실행']]],
    ['🧩 노드', [['ros2 node list', '실행 중인 노드 목록'], ['ros2 node info /turtlesim', '노드의 토픽 · 서비스 · 액션']]],
    ['📡 토픽', [['ros2 topic list -t', '토픽 목록 (타입 포함)'], ['ros2 topic echo /turtle1/pose', '토픽 내용 보기 (Ctrl+C 로 멈춤)'], ['ros2 topic info /turtle1/cmd_vel -v', '발행자 · 구독자 · QoS'], ['ros2 topic hz /turtle1/pose', '발행 주기 측정'], ['ros2 topic pub /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}" -r 1', '1 Hz 로 계속 발행'], ['ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}}"', '한 번만 발행']]],
    ['🔁 서비스', [['ros2 service list -t', '서비스 목록 (타입 포함)'], ["ros2 service call /spawn turtlesim/srv/Spawn \"{x: 2, y: 2, theta: 0.2, name: ''}\"", '거북이 소환'], ['ros2 service call /clear std_srvs/srv/Empty', '그림 지우기'], ['ros2 service type /spawn', '서비스 타입']]],
    ['🎯 액션', [['ros2 action list -t', '액션 목록'], ['ros2 action info /turtle1/rotate_absolute', '액션 서버 · 클라이언트'], ['ros2 action send_goal /turtle1/rotate_absolute turtlesim/action/RotateAbsolute "{theta: 1.57}" --feedback', '목표 보내기 + 피드백 보기']]],
    ['🎛️ 파라미터', [['ros2 param list', '모든 노드의 파라미터'], ['ros2 param get /turtlesim background_g', '값 읽기'], ['ros2 param set /turtlesim background_r 150', '값 바꾸기 (turtlesim 은 /clear 후 반영)'], ['ros2 param dump /turtlesim', 'YAML 로 출력']]],
    ['📦 인터페이스 · 패키지', [['ros2 interface show geometry_msgs/msg/Twist', '메시지 정의 보기'], ['ros2 interface list -m', '메시지 목록'], ['ros2 interface proto turtlesim/srv/Spawn', '빈 요청 YAML 만들기'], ['ros2 pkg list', '패키지 목록'], ['ros2 pkg executables turtlesim', '패키지의 실행 파일']]],
    ['🏗️ 작업 공간', [['cd ~/ros2_ws/src', 'src 폴더로 이동'], ['ros2 pkg create --build-type ament_python --license Apache-2.0 --node-name my_node my_pkg', '파이썬 패키지 만들기'], ['cd ~/ros2_ws && colcon build', '빌드 (작업 공간 최상위에서!)'], ['source install/setup.bash', '빌드 결과를 현재 터미널에 등록'], ['ros2 run my_pkg my_node', '내 노드 실행'], ['tree ~/ros2_ws/src', '폴더 구조 보기']]],
    ['🧭 TF · 도구', [['ros2 run tf2_ros static_transform_publisher --x 1 --y 0 --z 0 --yaw 0 --frame-id world --child-frame-id robot', '정적 변환 발행'], ['ros2 run tf2_ros tf2_echo world robot', '두 좌표계 사이 변환 보기'], ['ros2 run tf2_tools view_frames', 'TF 트리 그림'], ['rqt_graph', '노드 그래프 창'], ['rviz2', 'RViz 창'], ['rqt', 'rqt 도구 모음'], ['ros2 doctor --report', '환경 점검']]],
    ['💾 rosbag2', [['ros2 bag record -a -o my_bag', '모든 토픽 녹화 (Ctrl+C 로 끝)'], ['ros2 bag info my_bag', '녹화 정보'], ['ros2 bag play my_bag -r 2.0', '2배속 재생']]]
  ];
  function cheatHtml() {
    return `<article class="lesson"><header class="l-head"><h1><span class="l-icon">📋</span>ROS 2 명령어 치트시트</h1><p class="l-sub">파란 명령을 누르면 아래 터미널에서 바로 실행됩니다. (실제 ROS 2 Jazzy 에서도 같은 명령입니다)</p></header>
      <div class="widget" data-w="lab" data-o='${esc(JSON.stringify({ with: 'turtlesim', h: '320' }))}'></div>
      <div class="cheat">${CHEAT.map(([t, rows]) => `<div class="cheat-card"><h3>${t}</h3>${rows.map(([c, d]) => `<div class="cheat-row"><code>${esc(c)}</code><span>${d}</span></div>`).join('')}</div>`).join('')}</div></article>`;
  }

  /* ------------------------------------------------ 라우팅 --- */
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)) || 'home';
    const [id, sub] = h.split(':');
    const target = Course.info(id) || id === 'home' ? id : 'home';
    const changed = target !== state.id || !$('#content').firstChild;
    state.id = target;
    if (changed) {
      const content = $('#content');
      Widgets.unmountAll(content);
      const l = Course.lessons[target];
      if (target === 'home') { content.innerHTML = homeHtml(); crumb('🏠 처음 화면'); }
      else if (target === 'videos') { content.innerHTML = videosHtml(); crumb('🎬 추천 영상 모음'); }
      else if (target === 'lab') { content.innerHTML = labHtml(); crumb('🧪 ROS 2 실습실'); }
      else if (target === 'cheatsheet') { content.innerHTML = cheatHtml(); crumb('📋 명령어 치트시트'); }
      else if (target === 'glossary') { content.innerHTML = glossaryHtml(); crumb('📖 용어 사전'); }
      else if (l) { content.innerHTML = lessonHtml(l); crumb(`<span class="muted">CH ${esc(l.no || target.slice(2))}</span> ${l.icon || ''} ${esc(l.title)}`); }
      else { const o = Course.info(target); content.innerHTML = `<article class="lesson"><h1>${o.icon} ${esc(o.title)}</h1><p class="muted">준비 중인 장입니다.</p></article>`; crumb(esc(o.title)); }
      Widgets.mountAll(content);
      decorateCode(content);
      if (target === 'lab') mountLab(content);
      content.scrollTop = 0;
      renderNav($('#navSearch').value);
      const hasL = !!l;
      $('.view-switch').classList.toggle('hidden', !hasL);
      const order = Course.order(); const i = order.indexOf(target);
      $('#prevBtn').disabled = i <= 0; $('#nextBtn').disabled = i < 0 || i >= order.length - 1;
      setView(hasL ? state.view : 'doc');
      document.title = (l ? l.title + ' · ' : '') + 'ROS 2 쉽게 배우기';
    }
    if (sub && state.view === 'doc') {
      const el = sub === 'videos' || sub === 'quiz' ? document.getElementById(`${id}-${sub}`) : document.getElementById(`${id}-${sub}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
    }
  }
  window.addEventListener('hashchange', route);
  $('#prevBtn').onclick = () => { const o = Course.order(); const i = o.indexOf(state.id); if (i > 0) location.hash = o[i - 1]; };
  $('#nextBtn').onclick = () => { const o = Course.order(); const i = o.indexOf(state.id); if (i >= 0 && i < o.length - 1) location.hash = o[i + 1]; };
  window.App.go = id => { location.hash = id; };
  window.App.setView = setView;

  /* ------------------------------------------------ 문서 안의 동작 --- */
  $('#content').addEventListener('click', e => {
    const t = e.target;
    const opt = t.closest('.qopt');
    if (opt) {
      const qz = opt.closest('.quiz'); if (qz.classList.contains('answered')) return;
      const ans = +qz.dataset.answer, i = +opt.dataset.i;
      qz.classList.add('answered', i === ans ? 'right' : 'wrong');
      $$('.qopt', qz).forEach(b => { const j = +b.dataset.i; if (j === ans) b.classList.add('correct'); else if (j === i) b.classList.add('chosen'); });
      $('.qexp', qz).classList.remove('hidden');
      const all = $$('.quiz', $('#content')), done = all.filter(q => q.classList.contains('answered')), right = all.filter(q => q.classList.contains('right'));
      const sc = $('#quizScore');
      if (sc) sc.innerHTML = done.length === all.length ? `🏁 ${all.length}문제 중 <b>${right.length}</b>문제 정답! ${right.length === all.length ? '완벽해요 🎉' : '틀린 문제의 해설을 다시 읽어 보세요.'} <button class="btn tiny ghost" data-act="quiz-reset">다시 풀기</button>` : `${done.length} / ${all.length} 문제 풀이`;
      return;
    }
    const act = t.closest('[data-act]');
    if (act) {
      const a = act.dataset.act;
      if (a === 'done') { state.done[state.id] = !state.done[state.id]; if (!state.done[state.id]) delete state.done[state.id]; store.set('done', state.done); act.outerHTML = `<button class="btn ${state.done[state.id] ? '' : 'primary'}" data-act="done">${state.done[state.id] ? '✓ 학습 완료됨 (취소)' : '✓ 이 장 학습 완료'}</button>`; renderNav($('#navSearch').value); if (state.done[state.id]) toast('🎉 학습 완료! 진도에 기록했어요'); }
      else if (a === 'to-slides') setView('slides');
      else if (a === 'quiz-reset') { const c = $('#content').scrollTop; $('#content').innerHTML = lessonHtml(Course.lessons[state.id]); Widgets.mountAll($('#content')); $('#content').scrollTop = c; }
      return;
    }
    const emb = t.closest('.vembed');
    if (emb) { openVideo(emb.dataset.yt, emb.closest('.vcard').querySelector('.vtitle').textContent); return; }
    const sh = t.closest('[data-sh]');
    if (sh) { Term.runInTerminal(sh.dataset.sh); return; }
    const cr = t.closest('[data-coderun]');
    if (cr) {
      const pre = cr.parentElement.previousElementSibling; const code = pre ? pre.textContent : '';
      if (cr.dataset.coderun === 'sh') Term.runInTerminal(code.replace(/^\s*\$\s?/gm, ''));
      else if (cr.dataset.coderun === 'py') RosUI.openView('pylab', { viewOpts: { code, with: cr.dataset.with || 'graph', key: 'code:' + state.id } });
      else if (cr.dataset.coderun === 'copy' && navigator.clipboard) navigator.clipboard.writeText(code).then(() => toast('코드를 복사했습니다'));
      return;
    }
    const cc = t.closest('.cheat-row code');
    if (cc) { Term.runInTerminal(cc.textContent); return; }
    const role = t.closest('[data-go-role]');
    if (role) { setRole(role.dataset.goRole, true); location.hash = 'ch00'; setTimeout(() => setView('slides'), 0); }
  });
  $('#content').addEventListener('input', e => {
    if (e.target.classList.contains('gfilter')) { const q = e.target.value.trim().toLowerCase(); $$('.glossary .term').forEach(d => d.classList.toggle('hidden', q && !d.dataset.k.includes(q))); }
    if (e.target.classList.contains('vfilter')) { const q = e.target.value.trim().toLowerCase(); $$('.vsec .vcard').forEach(d => d.classList.toggle('hidden', q && !d.textContent.toLowerCase().includes(q))); $$('.vsec').forEach(s => s.classList.toggle('hidden', !$$('.vcard:not(.hidden)', s).length)); }
  });
  function openVideo(id, title) {
    modal(title, `<div class="yt-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0" title="${esc(title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div><p class="muted small">재생되지 않으면 <a href="https://www.youtube.com/watch?v=${id}" target="_blank" rel="noopener">유튜브에서 직접 보기 ↗</a></p>`);
  }
  window.App.openVideo = openVideo;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('#modal').classList.contains('hidden')) { $('#modalClose').click(); e.stopPropagation(); }
  }, true);

  /* ------------------------------------------------ 시작 --- */
  setRole(state.role, true);
  route();
})();
