// 강의 콘텐츠 검증: node tools/validate.mjs [ch03 ...] [--net]
//  - 필수 항목, 그림/위젯 참조, 퀴즈 정답 범위, HTML/SVG 태그 짝 검사
//  - --net : 유튜브 영상 주소가 실제로 있는지 oEmbed 로 확인
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const net = args.includes('--net');
const only = args.filter(a => !a.startsWith('--'));

const WIDGETS = ['term', 'turtlesim', 'lab', 'teleop', 'graph', 'plot', 'echo', 'params', 'pylab', 'comm', 'qos', 'domain', 'iface', 'pkg', 'colcon', 'launch', 'bag', 'exec', 'lifecycle', 'ros1vs2', 'bridge', 'tftree', 'urdf', 'rviz', 'bot', 'odom', 'ctrl', 'arm', 'go2', 'microros', 'vision', 'embed'];
const VOID = new Set(['br', 'hr', 'img', 'input', 'meta', 'link', 'col', 'area', 'base', 'wbr', 'source', 'track', 'param', 'embed']);

const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/course.js'), 'utf8'), ctx, { filename: 'course.js' });

const files = fs.readdirSync(path.join(root, 'lessons')).filter(f => /^ch\d+\.js$/.test(f)).filter(f => !only.length || only.includes(f.replace('.js', '')));
let errors = 0, warns = 0;
const err = (id, m) => { errors++; console.log(`  ✗ [${id}] ${m}`); };
const warn = (id, m) => { warns++; console.log(`  ⚠ [${id}] ${m}`); };

function checkTags(id, where, html) {
  // 태그 짝 검사 (SVG 포함). 주석과 <script> 는 없다고 가정
  const stack = [];
  const re = /<\/?([a-zA-Z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
  let m;
  const s = String(html).replace(/<!--[\s\S]*?-->/g, '');
  while ((m = re.exec(s))) {
    const full = m[0], name = m[1].toLowerCase(), selfClose = m[3] === '/';
    if (full.startsWith('</')) {
      const top = stack.pop();
      if (top !== name) { err(id, `${where}: 태그 짝이 맞지 않음 — </${name}> 를 만났지만 열린 태그는 <${top || '없음'}> (근처: "${s.slice(Math.max(0, m.index - 60), m.index + 20).replace(/\s+/g, ' ')}")`); return; }
    } else if (!selfClose && !VOID.has(name)) stack.push(name);
  }
  if (stack.length) err(id, `${where}: 닫히지 않은 태그 <${stack.join('>, <')}>`);
  if (/<text[^>]*>[^<]*&(?!amp;|lt;|gt;|quot;|#\d+;|#x[\da-f]+;|nbsp;)/i.test(s)) warn(id, `${where}: SVG text 안에 이스케이프되지 않은 & 가 있을 수 있음`);
}

function refs(id, where, html, l) {
  for (const m of String(html).matchAll(/\{\{fig:([\w-]+)/g)) if (!l.figs || !l.figs[m[1]]) err(id, `${where}: 없는 그림 {{fig:${m[1]}}}`);
  for (const m of String(html).matchAll(/\{\{widget:([\w-]+)/g)) if (!WIDGETS.includes(m[1])) err(id, `${where}: 없는 위젯 {{widget:${m[1]}}} (사용 가능: ${WIDGETS.join(', ')})`);
  if (/\{\{(?!fig:|widget:)/.test(html)) warn(id, `${where}: 알 수 없는 {{ }} 표기`);
}

const videos = [];
for (const f of files) {
  const id = f.replace('.js', '');
  console.log(`● ${f}`);
  try { vm.runInContext(fs.readFileSync(path.join(root, 'lessons', f), 'utf8'), ctx, { filename: f }); }
  catch (e) { err(id, `스크립트 오류: ${e.message}`); continue; }
  const l = ctx.Course.lessons[id];
  if (!l) { err(id, 'Course.lesson({ id: "' + id + '" }) 로 등록되지 않음'); continue; }
  for (const k of ['title', 'goals', 'sections', 'quiz', 'slides', 'videos', 'terms', 'summary']) if (!l[k] || (Array.isArray(l[k]) && !l[k].length)) err(id, `필수 항목 없음: ${k}`);
  if ((l.sections || []).length < 4) warn(id, `절(section)이 ${l.sections.length}개 — 4개 이상 권장`);
  if ((l.slides || []).length < 8) warn(id, `슬라이드가 ${(l.slides || []).length}장 — 8장 이상 권장`);
  if ((l.quiz || []).length < 3) warn(id, '퀴즈 3문제 이상 권장');
  const figCount = Object.keys(l.figs || {}).length;
  if (figCount < 3) warn(id, `그림(figs) ${figCount}개 — 3개 이상 권장`);
  for (const [n, fg] of Object.entries(l.figs || {})) {
    const body = typeof fg === 'string' ? fg : (fg.svg || fg.html);
    if (!body) err(id, `그림 ${n}: 내용 없음`); else checkTags(id, `figs.${n}`, body);
    if (/<svg/.test(body) && !/class="dg[ "]/.test(body)) warn(id, `그림 ${n}: <svg class="dg"> 클래스 권장`);
    if (/<svg/.test(body) && !/viewBox=/.test(body)) err(id, `그림 ${n}: viewBox 필요`);
  }
  (l.sections || []).forEach((s, i) => { if (!s.title) err(id, `sections[${i}] 제목 없음`); checkTags(id, `sections[${i}]`, s.html); refs(id, `sections[${i}]`, s.html, l); });
  (l.slides || []).forEach((s, i) => {
    if (!s.title) err(id, `slides[${i}] 제목 없음`);
    if (!s.notes) warn(id, `slides[${i}] 강의 노트(notes) 없음`);
    checkTags(id, `slides[${i}]`, s.html); refs(id, `slides[${i}]`, s.html, l);
    const text = String(s.html).replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
    if (text.length > 520) warn(id, `slides[${i}] "${s.title}" 글자가 많음 (${text.length}자) — 슬라이드 넘침 주의`);
  });
  (l.quiz || []).forEach((q, i) => {
    if (!q.q || !Array.isArray(q.options) || q.options.length < 2) err(id, `quiz[${i}] 형식 오류`);
    else if (!(q.answer >= 0 && q.answer < q.options.length)) err(id, `quiz[${i}] answer 범위 오류`);
    if (!q.explain) warn(id, `quiz[${i}] 해설(explain) 없음`);
  });
  (l.terms || []).forEach((t, i) => { if (!Array.isArray(t) || t.length !== 2) err(id, `terms[${i}] 는 ['용어', '설명'] 형식`); });
  (l.videos || []).forEach((v, i) => {
    if (!v.title || !v.url) err(id, `videos[${i}] title/url 필요`);
    else if (!/^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(v.url)) err(id, `videos[${i}] 유튜브 주소가 아님: ${v.url}`);
    else videos.push({ id, i, v });
  });
  if (l.teacher && typeof l.teacher !== 'object') err(id, 'teacher 는 { intro, flow } 객체');
  console.log(`  - 절 ${l.sections.length} · 그림 ${figCount} · 슬라이드 ${l.slides.length} · 퀴즈 ${l.quiz.length} · 영상 ${l.videos.length} · 용어 ${l.terms.length}`);
}

if (net) {
  console.log(`\n● 유튜브 영상 확인 (${videos.length}개)`);
  const seen = new Map();
  for (const { id, i, v } of videos) {
    if (/results\?search_query=/.test(v.url)) continue;
    if (seen.has(v.url)) warn(id, `videos[${i}] 다른 곳과 같은 영상: ${v.url} (${seen.get(v.url)})`);
    seen.set(v.url, id);
    try {
      const r = await fetch('https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(v.url));
      if (r.status !== 200) err(id, `videos[${i}] 영상 없음/비공개 (HTTP ${r.status}): ${v.url} — "${v.title}"`);
      else { const j = await r.json(); console.log(`  ✓ ${v.url}  ${j.title}  — ${j.author_name}`); }
    } catch (e) { warn(id, `videos[${i}] 확인 실패: ${e.message}`); }
  }
}

console.log(`\n${errors ? '✗' : '✓'} 오류 ${errors} · 경고 ${warns}`);
process.exit(errors ? 1 : 0);
