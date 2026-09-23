/* ===================================================================
   슬라이드(PPT) 보기 — 16:9 무대, 단계별 보이기, 판서, 노트, 타이머, 발표자 창
   =================================================================== */
(function () {
  'use strict';
  const { esc, expand, buildSlides } = window.Render;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const BOARD_COLORS = ['#ffffff', '#1f4d3a', '#15181d'];
  let deck = null;
  const chan = 'BroadcastChannel' in window ? new BroadcastChannel('r2-deck') : null;

  class Deck {
    constructor(root, lesson, opts) {
      this.root = root; this.l = lesson; this.role = opts.role; this.opts = opts;
      this.teacher = opts.role === 'teacher';
      this.slides = buildSlides(lesson);
      this.key = 'r2:slide:' + lesson.id;
      let i = 0; try { i = +localStorage.getItem(this.key) || 0; } catch (_) {}
      if (opts.start != null) i = opts.start;
      this.i = Math.max(0, Math.min(i, this.slides.length - 1));
      this.step = 0;
      this.board = false;
      this.boardColor = +(sessionStorage.getItem('r2:boardColor') || 0);
      this.shell();
      this.ink = new Ink.Ink($('.stage', root), { onChange: () => this.syncInk() });
      this.syncInk();
      this.go(this.i, 0);
      this.ro = new ResizeObserver(() => this.fit()); this.ro.observe($('.deck-wrap', root));
      this.onKey = e => this.key_(e); document.addEventListener('keydown', this.onKey);
      this.onFs = () => { this.root.querySelector('.deck').classList.toggle('is-fs', document.fullscreenElement === $('.deck', this.root)); setTimeout(() => this.fit(), 50); };
      document.addEventListener('fullscreenchange', this.onFs);
      this.timerTick = setInterval(() => this.renderTimer(), 500);
    }

    shell() {
      const t = this.teacher;
      this.root.innerHTML = `<div class="deck${t ? ' is-teacher' : ''}">
        <div class="deck-bar">
          <button class="btn tiny ghost" data-act="first" title="처음 슬라이드 (Home)">⏮</button>
          <button class="icon-btn" data-act="prev" title="이전 (←)">◀</button>
          <span class="deck-count"></span>
          <button class="icon-btn" data-act="next" title="다음 (→ / Space)">▶</button>
          <input class="deck-slider" type="range" min="1" max="${this.slides.length}" value="1" title="끌어서 이동">
          <span class="deck-name"></span>
          <span class="spacer"></span>
          ${t ? `<span class="deck-timer" data-act="timer" title="수업 타이머 — 클릭: 시작/일시정지 (T)">⏱ <b>00:00</b></span>
          <button class="btn tiny ghost" data-act="timer-reset" title="타이머 초기화">↺</button>
          <button class="btn tiny ghost" data-act="notes" title="강의 노트 보이기/숨기기 (N)">🗒 노트</button>
          <button class="btn tiny ghost" data-act="presenter" title="발표자 창 — 노트 · 다음 슬라이드 · 타이머 (다른 모니터용)">🖥 발표자 창</button>` : ''}
          <button class="btn tiny ghost" data-act="grid" title="슬라이드 목록 (G)">▦ 목록</button>
          <button class="btn tiny ghost" data-act="doc" title="문서로 보기">📄 문서</button>
          <button class="btn tiny primary" data-act="fs" title="전체 화면 (F)">⛶ 전체 화면</button>
        </div>
        ${Ink.toolbarHtml()}
        <div class="deck-main">
          <div class="deck-wrap">
            <div class="stage-box">
              <div class="stage">
                <div class="slide"></div>
                <div class="board hidden"></div>
              </div>
              <div class="blackout hidden"><span>화면 가림 — B 키로 돌아가기</span></div>
            </div>
            <button class="edge edge-prev" data-act="prev" title="이전" aria-label="이전"></button>
            <button class="edge edge-next" data-act="next" title="다음" aria-label="다음"></button>
            <div class="fs-nav">
              <button data-act="prev" title="이전 (←)">◀</button><span class="fs-count"></span><button data-act="next" title="다음 (→)">▶</button>
              <button data-act="grid" title="목록 (G)">▦</button><button data-act="black" title="화면 가리기 (B)">◼</button><button data-act="fs" title="전체 화면 끝내기 (Esc)">✕</button>
            </div>
            <div class="grid-overlay hidden"></div>
          </div>
          ${t ? '<div class="notes-pane"><div class="notes-head">🗒 강의 노트 <span class="muted notes-next"></span></div><div class="notes-body"></div></div>' : ''}
        </div>
      </div>`;
      if (t && localStorage.getItem('r2:notesHidden') === '1') $('.deck', this.root).classList.add('notes-hidden');
      this.root.addEventListener('click', this.onClick = e => this.click(e));
      $('.deck-slider', this.root).addEventListener('input', e => this.go(+e.target.value - 1, 0));
    }

    fit() {
      const wrap = $('.deck-wrap', this.root), box = $('.stage-box', this.root), stage = $('.stage', this.root);
      if (!wrap.clientWidth) return;
      const pad = document.fullscreenElement ? 0 : 16;
      const s = Math.min((wrap.clientWidth - pad * 2) / 1280, (wrap.clientHeight - pad * 2) / 720);
      box.style.width = 1280 * s + 'px'; box.style.height = 720 * s + 'px';
      stage.style.transform = `scale(${s})`;
    }

    render() {
      const s = this.slides[this.i];
      const slide = $('.slide', this.root);
      Widgets.unmountAll(slide);
      slide.className = `slide kind-${s.kind}${s.layout ? ' layout-' + s.layout : ''}`;
      slide.innerHTML = s.kind === 'content' ? `${s.title && s.layout !== 'center' && !s.notitle ? `<h2 class="s-h">${s.title}</h2>` : ''}<div class="s-body">${expand(s.html, this.l, { slide: true })}</div>` : expand(s.html, this.l, { slide: true });
      slide.insertAdjacentHTML('beforeend', `<div class="s-foot"><span>${this.l.icon || ''} ${esc(this.l.title)}</span><span>${this.i + 1} / ${this.slides.length}</span></div>`);
      Widgets.mountAll(slide);
      this.steps = $$('.step', slide);
      if (!this.teacher) this.step = this.steps.length; // 학생용은 한 번에 모두
      this.applySteps();
      this.ink.setKey(`${this.l.id}@${this.i}${this.board ? '#board' : ''}`);
      $('.deck-count', this.root).textContent = `${this.i + 1} / ${this.slides.length}`;
      $('.fs-count', this.root).textContent = `${this.i + 1} / ${this.slides.length}`;
      $('.deck-slider', this.root).value = this.i + 1;
      $('.deck-name', this.root).innerHTML = esc(stripTags(s.title || ''));
      if (this.teacher) {
        $('.notes-body', this.root).innerHTML = s.notes || '<span class="muted">(노트 없음)</span>';
        const n = this.slides[this.i + 1];
        $('.notes-next', this.root).textContent = n ? `· 다음: ${stripTags(n.title || '')}` : '· 마지막 슬라이드';
      }
      try { localStorage.setItem(this.key, this.i); } catch (_) {}
      this.broadcast();
      this.fit();
    }
    applySteps() {
      this.steps.forEach((el, k) => el.classList.toggle('step-hidden', k >= this.step));
      this.broadcast();
    }

    go(i, step) {
      i = Math.max(0, Math.min(this.slides.length - 1, i));
      this.i = i; this.step = step === 'end' ? 999 : (step || 0);
      this.render();
      if (this.step === 999) { this.step = this.steps.length; this.applySteps(); }
    }
    next() { if (this.teacher && this.step < this.steps.length) { this.step++; this.applySteps(); return; } if (this.i < this.slides.length - 1) this.go(this.i + 1, 0); }
    prev() { if (this.teacher && this.step > 0) { this.step--; this.applySteps(); return; } if (this.i > 0) this.go(this.i - 1, 'end'); }

    toggleBoard(on) {
      this.board = on == null ? !this.board : on;
      const b = $('.board', this.root);
      b.classList.toggle('hidden', !this.board);
      b.style.background = BOARD_COLORS[this.boardColor];
      $('.deck', this.root).classList.toggle('board-on', this.board);
      this.ink.setKey(`${this.l.id}@${this.i}${this.board ? '#board' : ''}`);
      if (this.board && !this.ink.active) this.ink.setTool('pen');
      if (this.board && this.boardColor > 0 && ['#111111'].includes(this.ink.prefs.color)) this.ink.setColor('#ffffff');
      if (this.board && this.boardColor === 0 && this.ink.prefs.color === '#ffffff') this.ink.setColor('#111111');
      this.syncInk();
    }

    syncInk() {
      Ink.syncToolbar(this.root, this.ink);
      $('.deck', this.root).classList.toggle('inking', this.ink.active);
      const b = $('[data-ink-act="board"]', this.root); if (b) b.classList.toggle('on', this.board);
    }

    click(e) {
      const t = e.target;
      const tool = t.closest('[data-ink-tool]'); if (tool) { this.ink.setTool(tool.dataset.inkTool); return; }
      const col = t.closest('[data-ink-color]'); if (col) { this.ink.setColor(col.dataset.inkColor); return; }
      const sz = t.closest('[data-ink-size]'); if (sz) { this.ink.setSize(sz.dataset.inkSize); return; }
      const ia = t.closest('[data-ink-act]');
      if (ia) {
        const a = ia.dataset.inkAct;
        if (a === 'undo') this.ink.undo();
        else if (a === 'redo') this.ink.redoOne();
        else if (a === 'clear') this.ink.clear();
        else if (a === 'clear-all') { if (confirm('이 장의 모든 슬라이드 판서를 지울까요?')) this.ink.clearPrefix(this.l.id + '@'); }
        else if (a === 'board') this.toggleBoard();
        else if (a === 'board-color') { this.boardColor = (this.boardColor + 1) % BOARD_COLORS.length; sessionStorage.setItem('r2:boardColor', this.boardColor); if (!this.board) this.toggleBoard(true); else this.toggleBoard(true); }
        return;
      }
      const rv = t.closest('.s-reveal');
      if (rv) { const q = rv.closest('.s-quiz'); const a = +q.dataset.answer; $$('.s-opts li', q).forEach(li => li.classList.toggle('correct', +li.dataset.i === a)); $('.s-explain', q).classList.remove('hidden'); rv.remove(); return; }
      const sopt = t.closest('.s-opts li');
      if (sopt && !this.ink.active) { sopt.classList.toggle('picked'); return; }
      const act = t.closest('[data-act]'); if (!act) return;
      const a = act.dataset.act;
      if (a === 'next') this.next();
      else if (a === 'prev') this.prev();
      else if (a === 'first') this.go(0);
      else if (a === 'grid') this.toggleGrid();
      else if (a === 'fs') this.toggleFs();
      else if (a === 'doc') this.opts.onDoc && this.opts.onDoc();
      else if (a === 'notes') { const d = $('.deck', this.root); d.classList.toggle('notes-hidden'); localStorage.setItem('r2:notesHidden', d.classList.contains('notes-hidden') ? '1' : '0'); setTimeout(() => this.fit(), 30); }
      else if (a === 'presenter') window.open('presenter.html', 'r2-presenter', 'width=1100,height=720');
      else if (a === 'timer') timer.toggle();
      else if (a === 'timer-reset') timer.reset();
      else if (a === 'black') $('.blackout', this.root).classList.toggle('hidden');
      else if (a === 'goto') { this.toggleGrid(false); this.go(+act.dataset.i, 0); }
    }

    toggleGrid(force) {
      const g = $('.grid-overlay', this.root);
      const show = force == null ? g.classList.contains('hidden') : force;
      if (show) {
        g.innerHTML = `<div class="grid-head"><b>슬라이드 목록</b> <span class="muted">— 클릭하면 이동 (G / Esc 닫기)</span></div><div class="grid-list">${this.slides.map((s, k) => `
          <button class="thumb${k === this.i ? ' on' : ''}" data-act="goto" data-i="${k}"><div class="thumb-stage"><div class="slide kind-${s.kind}${s.layout ? ' layout-' + s.layout : ''}">${s.kind === 'content' ? `${s.title && s.layout !== 'center' && !s.notitle ? `<h2 class="s-h">${s.title}</h2>` : ''}<div class="s-body">${expand(s.html, this.l, { slide: true })}</div>` : expand(s.html, this.l, { slide: true })}</div></div><span class="thumb-cap">${k + 1}. ${esc(stripTags(s.title || ''))}</span></button>`).join('')}</div>`;
        g.classList.remove('hidden');
        $$('.thumb-stage', g).forEach(t => t.style.setProperty('--ts', t.clientWidth / 1280));
        const on = $('.thumb.on', g); if (on) on.scrollIntoView({ block: 'center' });
      } else { g.classList.add('hidden'); g.innerHTML = ''; }
    }

    toggleFs() {
      const d = $('.deck', this.root);
      if (document.fullscreenElement) document.exitFullscreen();
      else if (d.requestFullscreen) d.requestFullscreen().catch(() => {});
    }

    key_(e) {
      if (this.root.classList.contains('hidden')) return;
      if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]') && !e.target.classList.contains('deck-slider')) return;
      if (!$('#modal').classList.contains('hidden')) return;
      const k = e.key, ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (k === 'z' || k === 'Z')) { e.preventDefault(); if (e.shiftKey) this.ink.redoOne(); else this.ink.undo(); return; }
      if (ctrl && (k === 'y' || k === 'Y')) { e.preventDefault(); this.ink.redoOne(); return; }
      if (ctrl || e.altKey) return;
      const gridOpen = !$('.grid-overlay', this.root).classList.contains('hidden');
      const map = {
        ArrowRight: () => this.next(), PageDown: () => this.next(), ' ': () => this.next(),
        ArrowLeft: () => this.prev(), PageUp: () => this.prev(), Backspace: () => this.prev(),
        Home: () => this.go(0), End: () => this.go(this.slides.length - 1),
        f: () => this.toggleFs(), g: () => this.toggleGrid(),
        b: () => $('.blackout', this.root).classList.toggle('hidden'), '.': () => $('.blackout', this.root).classList.toggle('hidden'),
        n: () => this.teacher && $('[data-act="notes"]', this.root).click(),
        t: () => this.teacher && timer.toggle(),
        p: () => this.ink.setTool('pen'), h: () => this.ink.setTool('hl'), e: () => this.ink.setTool('eraser'),
        l: () => this.ink.setTool(this.ink.prefs.tool === 'laser' ? 'none' : 'laser'), i: () => this.ink.setTool('line'), x: () => this.ink.setTool('rect'),
        c: () => this.ink.clear(), w: () => this.toggleBoard(),
        Escape: () => { if (gridOpen) this.toggleGrid(false); else if (this.board) this.toggleBoard(false); else if (this.ink.active) this.ink.setTool('none'); }
      };
      const fn = map[k] || map[k.toLowerCase && k.toLowerCase()];
      if (fn) { if (k === 'Escape' && document.fullscreenElement && !this.ink.active && !gridOpen && !this.board) return; e.preventDefault(); fn(); }
    }

    broadcast() {
      if (!chan) return;
      chan.postMessage({ type: 'state', lesson: this.l.id, i: this.i, step: this.step, steps: (this.steps || []).length, timer: timer.value() });
    }

    renderTimer() {
      if (!this.teacher) return;
      const el = $('.deck-timer b', this.root); if (!el) return;
      el.textContent = fmt(timer.value());
      $('.deck-timer', this.root).classList.toggle('running', timer.running());
    }

    destroy() {
      this.ink.destroy(); this.ro.disconnect();
      document.removeEventListener('keydown', this.onKey);
      document.removeEventListener('fullscreenchange', this.onFs);
      this.root.removeEventListener('click', this.onClick);
      clearInterval(this.timerTick);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      Widgets.unmountAll(this.root);
      this.root.innerHTML = '';
    }
  }

  /* 수업 타이머 — 장을 바꿔도 이어서 흐른다 */
  const timer = {
    get() { try { return JSON.parse(sessionStorage.getItem('r2:timer')) || { acc: 0, start: null }; } catch (_) { return { acc: 0, start: null }; } },
    set(v) { sessionStorage.setItem('r2:timer', JSON.stringify(v)); },
    value() { const t = this.get(); return t.acc + (t.start ? Date.now() - t.start : 0); },
    running() { return !!this.get().start; },
    toggle() { const t = this.get(); if (t.start) { t.acc += Date.now() - t.start; t.start = null; } else t.start = Date.now(); this.set(t); },
    reset() { this.set({ acc: 0, start: this.get().start ? Date.now() : null }); }
  };
  const fmt = ms => { const s = Math.floor(ms / 1000); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  const stripTags = s => String(s).replace(/<[^>]*>/g, '');

  if (chan) chan.onmessage = e => {
    const m = e.data || {};
    if (m.type === 'hello' && deck) deck.broadcast();
    if (m.type === 'cmd' && deck) {
      if (m.cmd === 'next') deck.next();
      else if (m.cmd === 'prev') deck.prev();
      else if (m.cmd === 'go') deck.go(m.i, 0);
      else if (m.cmd === 'timer') timer.toggle();
      else if (m.cmd === 'timer-reset') timer.reset();
      else if (m.cmd === 'black') $('.blackout', deck.root).classList.toggle('hidden');
    }
  };

  window.Slides = {
    mount(root, lesson, opts) {
      if (deck && deck.l === lesson && deck.root === root && deck.role === opts.role) { deck.fit(); return deck; }
      this.unmount();
      if (!lesson) return null;
      deck = new Deck(root, lesson, opts);
      return deck;
    },
    unmount() { if (deck) { deck.destroy(); deck = null; } },
    get current() { return deck; },
    timer, fmt
  };
})();
