/* ===================================================================
   공용 렌더링 — 문서/슬라이드/발표자 창이 함께 쓰는 함수
   =================================================================== */
(function () {
  'use strict';

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** 유튜브 주소 → 영상 id (검색 주소면 null) */
  function ytId(url) {
    const m = String(url || '').match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function ytList(url) {
    const m = String(url || '').match(/[?&]list=([\w-]+)/);
    return m ? m[1] : null;
  }

  /** 그림: figs[name] 은 문자열(SVG/HTML) 또는 { svg|html, caption, wide } */
  function figure(lesson, name, opts) {
    const f = lesson && lesson.figs && lesson.figs[name];
    if (!f) return `<div class="fig-missing">⚠ 그림 "${esc(name)}" 없음</div>`;
    const body = typeof f === 'string' ? f : (f.svg || f.html || '');
    const cap = typeof f === 'string' ? '' : (f.caption || '');
    const cls = ['fig'];
    if (f.wide) cls.push('wide');
    if (opts && opts.slide) cls.push('in-slide');
    return `<figure class="${cls.join(' ')}" data-fig="${esc(name)}">${body}${cap && !(opts && opts.nocap) ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;
  }

  /** {{fig:name}} · {{fig:name|nocap}} · {{widget:type|key=value|key2=value}} 치환 */
  function expand(html, lesson, opts) {
    return String(html || '')
      .replace(/\{\{fig:([\w-]+)(\|nocap)?\}\}/g, (_, n, nc) => figure(lesson, n, Object.assign({}, opts, { nocap: !!nc })))
      .replace(/\{\{widget:([\w-]+)((?:\|[^}|]*)*)\}\}/g, (_, type, rest) => {
        const o = {};
        rest.split('|').filter(Boolean).forEach(kv => { const i = kv.indexOf('='); if (i > 0) o[kv.slice(0, i).trim()] = kv.slice(i + 1).trim(); else o[kv.trim()] = true; });
        return `<div class="widget" data-w="${esc(type)}" data-o="${esc(JSON.stringify(o))}"></div>`;
      });
  }

  function videoCard(v, opts) {
    const id = ytId(v.url), list = ytList(v.url);
    const search = /results\?search_query=/.test(v.url || '');
    const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
    const lang = v.lang === 'en' ? '<span class="vbadge en">영어</span>' : v.lang === 'ko' ? '<span class="vbadge ko">한국어</span>' : '';
    const kind = search ? '<span class="vbadge search">🔎 검색</span>' : list && !id ? '<span class="vbadge list">▤ 재생목록</span>' : '';
    const min = v.min ? `<span class="vmin">${esc(v.min)}</span>` : '';
    const from = opts && opts.from ? `<div class="vfrom">${esc(opts.from)}</div>` : '';
    return `<div class="vcard${search ? ' is-search' : ''}">
      <a class="vthumb" href="${esc(v.url)}" target="_blank" rel="noopener" title="유튜브에서 보기">
        ${thumb ? `<img loading="lazy" src="${thumb}" alt="">` : `<div class="vph">${search ? '🔎' : '▶'}</div>`}
        ${min}<span class="vplay">▶</span>
      </a>
      <div class="vbody">
        ${from}
        <a class="vtitle" href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>
        <div class="vmeta">${v.channel ? `<span>📺 ${esc(v.channel)}</span>` : ''}${lang}${kind}</div>
        ${v.desc ? `<div class="vdesc">${v.desc}</div>` : ''}
        ${id ? `<button class="btn tiny ghost vembed" data-yt="${id}">▶ 여기서 보기</button>` : ''}
      </div>
    </div>`;
  }

  /* ------------------------------------------------ 슬라이드 목록 만들기 --- */
  function buildSlides(l) {
    const out = [];
    out.push({
      kind: 'title', title: l.title,
      html: `<div class="s-title">
        <div class="s-chap">${esc(l.no ? 'CHAPTER ' + l.no : '')}</div>
        <div class="s-icon">${l.icon || ''}</div>
        <h1>${esc(l.title)}</h1>
        ${l.subtitle ? `<p class="s-sub">${l.subtitle}</p>` : ''}
        <div class="s-course">ROS 2 쉽게 배우기</div>
      </div>`,
      notes: l.teacher && l.teacher.intro || '이번 장의 주제를 소개하고 학생들의 사전 경험을 물어봅니다.'
    });
    if (l.goals && l.goals.length) {
      out.push({
        kind: 'goals', title: '학습 목표',
        html: `<h2>🎯 학습 목표</h2><ol class="s-goals">${l.goals.map(g => `<li>${g}</li>`).join('')}</ol>`,
        notes: (l.teacher && l.teacher.flow) ? '<b>수업 흐름</b><br>' + l.teacher.flow : '이번 시간이 끝나면 할 수 있어야 할 것들을 먼저 보여 줍니다.'
      });
    }
    (l.slides || []).forEach(s => out.push(Object.assign({ kind: 'content' }, s)));
    if (l.videos && l.videos.length) {
      const vs = l.videos.filter(v => ytId(v.url)).slice(0, 4);
      if (vs.length) {
        out.push({
          kind: 'videos', title: '함께 보면 좋은 영상',
          html: `<h2>🎬 함께 보면 좋은 영상</h2><div class="s-videos">${vs.map(v => `<a class="s-video" href="${esc(v.url)}" target="_blank" rel="noopener"><img src="https://i.ytimg.com/vi/${ytId(v.url)}/mqdefault.jpg" alt=""><span>${esc(v.title)}</span><small>${esc(v.channel || '')}</small></a>`).join('')}</div>`,
          notes: '영상 썸네일을 클릭하면 새 창에서 열립니다. 수업 시간이 부족하면 과제로 제시하세요.'
        });
      }
    }
    (l.quiz || []).forEach((q, i) => {
      out.push({
        kind: 'quiz', title: `퀴즈 ${i + 1}`,
        html: `<h2>✅ 확인 퀴즈 ${i + 1} / ${l.quiz.length}</h2>
          <div class="s-quiz" data-answer="${q.answer}">
            <p class="s-q">${q.q}</p>
            <ol class="s-opts">${q.options.map((o, j) => `<li data-i="${j}"><b>${'①②③④⑤⑥'[j]}</b> ${o}</li>`).join('')}</ol>
            <div class="s-explain hidden">💡 ${q.explain || ''}</div>
            <button class="btn small s-reveal">정답 공개</button>
          </div>`,
        notes: `정답: ${'①②③④⑤⑥'[q.answer]} — ${q.explain || ''}`
      });
    });
    if (l.summary && l.summary.length) {
      out.push({
        kind: 'summary', title: '정리',
        html: `<h2>📌 오늘 배운 내용</h2><ul class="s-summary">${l.summary.map(s => `<li>${s}</li>`).join('')}</ul>`,
        notes: '핵심 내용을 학생이 직접 말해 보도록 하고, 다음 장을 예고합니다.'
      });
    }
    return out;
  }

  window.Render = { esc, ytId, ytList, figure, expand, videoCard, buildSlides };
})();
