/* ===================================================================
   PyROS — 브라우저에서 rclpy 파이썬 노드 실행 (메인 스레드 쪽)
   파이썬은 Web Worker(Pyodide) 안에서 돌고, 여기서는 워커가 보낸 요청을
   WebROS 그래프(노드 · 토픽 · 서비스 · 액션 · 파라미터)로 옮겨 준다.
   실행 하나 = 워커 하나 = 실제 ROS 의 "프로세스" 하나.
   =================================================================== */
(function () {
  'use strict';
  const base = (() => { const s = document.currentScript && document.currentScript.src; return s ? s.replace(/js\/pyros\.js.*$/, '') : ''; })();
  const WORKER_URL = base + 'js/pyros-worker.js';
  const PY_BASE = base + 'py/';
  const VER = '10';
  let spare = null;   // 미리 데워 둔 워커
  let mode = null;    // 'jspi' | 'async'

  function ifacesJson() {
    const out = {};
    Object.keys(window.ROS_IFACES || {}).forEach(t => {
      const f = ROS.iface(t); if (!f) return;
      out[t] = { kind: f.kind, parts: f.parts.map(p => ({ fields: p.fields.map(x => [x.name, x.type, x.array, x.def === undefined ? null : x.def]), consts: p.consts.map(c => [c.name, c.type, c.value]) })) };
    });
    return out;
  }

  /** 워커 하나 만들고 초기화 (Promise → {w, ready}) */
  function makeWorker(onStatus) {
    let w;
    try { w = new Worker(WORKER_URL + '?v=' + VER); } catch (e) { return Promise.reject(new Error('Web Worker 를 만들 수 없습니다. file:// 이 아니라 http 서버(start.bat 또는 GitHub Pages)로 열어 주세요.')); }
    const ent = { w, listeners: new Set(), ready: null };
    w.onmessage = e => ent.listeners.forEach(f => f(e.data));
    w.onerror = e => ent.listeners.forEach(f => f({ type: 'fatal', error: e.message || '워커 오류' }));
    ent.ready = new Promise((res, rej) => {
      const f = m => {
        if (m.type === 'status' && onStatus) onStatus(m.text);
        if (m.type === 'ready') { ent.listeners.delete(f); mode = m.mode; ent.info = m; res(ent); }
        if (m.type === 'fatal') { ent.listeners.delete(f); rej(new Error(m.error)); }
      };
      ent.listeners.add(f);
    });
    w.postMessage({ type: 'init', pyBase: PY_BASE, ver: VER, ifaces: ifacesJson(), forceAsync: /[?&]pymode=async/.test(location.search) });
    return Promise.resolve(ent);
  }
  function getWorker(onStatus) {
    if (spare) { const s = spare; spare = null; s.ready.then(() => onStatus && onStatus('')).catch(() => {}); return s.ready; }
    return makeWorker(onStatus).then(e => e.ready);
  }
  function warmSpare() { if (!spare) makeWorker(null).then(e => { spare = e; e.ready.catch(() => { spare = null; }); }).catch(() => {}); }

  /* ================================================== 실행 */
  let runSeq = 0;
  const runs = new Set();
  /**
   * code 실행. opts = { filename, entry, argv, rosArgs, out(line), err(line), onExit(status), onStatus(text) }
   * 반환: { stop(), done: Promise<status>, nodes }
   */
  function run(code, opts) {
    opts = opts || {};
    const out = opts.out || (s => console.log(s)), err = opts.err || (s => console.warn(s));
    const id = ++runSeq;
    const R = { id, nodes: new Map(), pubs: new Map(), subs: new Map(), srvs: new Map(), clis: new Map(), ases: new Map(), acs: new Map(), goals: new Map(), cgoals: new Map(), stopped: false, ent: null };
    let finish; R.done = new Promise(r => { finish = r; });
    const status = s => { if (opts.onStatus) opts.onStatus(s); else if (s) out('⏳ ' + s); };
    const send = ev => { if (R.ent && !R.dead) R.ent.w.postMessage({ type: 'ev', ev }); };
    let offGraph = null;
    const pushGraph = () => send({
      kind: 'graph',
      services: ROS.serviceList().map(s => [s.name, s.type]),
      actions: ROS.actionList().map(a => [a.name, a.type]),
      topics: ROS.topicList().map(t => [t.name, t.type, t.pubs, t.subs]),
      nodes: ROS.nodes().map(n => n.fqn)
    });
    const ra = opts.rosArgs || {};
    function onOp(op) {
      const n = R.nodes.get(op.nid);
      switch (op.op) {
        case 'init': break;
        case 'shutdown': R.nodes.forEach(x => x.destroy()); R.nodes.clear(); break;
        case 'node': {
          const node = ROS.createNode(op.name, { namespace: op.ns, remap: Object.assign({}, op.remap || {}), out: s => out(s), lang: 'py', pkg: opts.pkg || 'python3', exe: opts.filename });
          node.pyRun = R; node._pynid = op.nid;
          node.setParametersAsync = list => Promise.all(list.map(({ name, value }) => new Promise(res => { const rid = 'p' + Math.random().toString(36).slice(2); R.pendParam.set(rid, res); send({ kind: 'param_set', nid: op.nid, name, value, rid }); setTimeout(() => { if (R.pendParam.has(rid)) { R.pendParam.delete(rid); res({ successful: false, reason: '응답 없음 (노드가 바쁘거나 spin 중이 아닙니다)' }); } }, 3000); })));
          node.onSetParameters(list => { list.forEach(p => { if (!node._fromPy) send({ kind: 'param_set', nid: op.nid, name: p.name, value: p.value }); }); return { successful: true }; });
          R.nodes.set(op.nid, node); break;
        }
        case 'node_destroy': if (n) { n.destroy(); R.nodes.delete(op.nid); } break;
        case 'log': { const node = n || [...R.nodes.values()][0]; if (node && node.alive) node.log(op.level, op.msg); else out(`[${op.level}] [${ROS.graph.stampStr()}] [${op.name}]: ${op.msg}`); break; }
        case 'param_decl': if (n) { n.declareParameter(op.name, op.value, Object.assign({ type: op.type }, op.desc || {})); const p = n.params.get(op.name); if (p) { p.value = op.value; p.type = op.type; } } break;
        case 'param_set': if (n) { const p = n.params.get(op.name); if (p) { p.value = op.value; p.type = op.type || p.type; if (n._pev) n._pev.publish({ stamp: ROS.graph.now(), node: n.fqn, new_parameters: [], changed_parameters: [op.name], deleted_parameters: [] }); ROS.graph.ev.emit('param', n, op.name, op.value); } } break;
        case 'param_res': { const f = R.pendParam.get(op.rid); if (f) { R.pendParam.delete(op.rid); f({ successful: !!op.successful, reason: op.reason || '' }); } break; }
        case 'pub_create': if (n) R.pubs.set(op.pid, n.createPublisher(op.type, op.topic, op.qos)); break;
        case 'pub': { const p = R.pubs.get(op.pid); if (p) p.publish(op.msg); break; }
        case 'sub_create': if (n) R.subs.set(op.sid, n.createSubscription(op.type, op.topic, m => send({ kind: 'msg', sid: op.sid, msg: m }), op.qos)); break;
        case 'srv_create': if (n) {
          const pend = new Map();
          R.srvs.set(op.ssid, { srv: n.createService(op.type, op.name, req => new Promise((res, rej) => { const rid = 'r' + Math.random().toString(36).slice(2); pend.set(rid, { res, rej }); R.pendSrv.set(rid, pend); send({ kind: 'srv_req', ssid: op.ssid, rid, req }); })) });
        } break;
        case 'srv_resp': { const pend = R.pendSrv.get(op.rid); if (pend) { const p = pend.get(op.rid); pend.delete(op.rid); R.pendSrv.delete(op.rid); if (op.error) p.rej(new Error(op.error)); else p.res(op.res); } break; }
        case 'cli_create': if (n) R.clis.set(op.cid, n.createClient(op.type, op.name)); break;
        case 'cli_call': {
          ROS.callService(op.name, op.type, op.req).then(res => send({ kind: 'cli_res', rid: op.rid, res }), e => send({ kind: 'cli_res', rid: op.rid, error: e.message }));
          break;
        }
        case 'as_create': if (n) {
          R.ases.set(op.asid, n.createActionServer(op.type, op.name, {
            execute: gh => new Promise(resolve => {
              const gid = 'g' + Math.random().toString(36).slice(2);
              R.goals.set(gid, { gh, resolve });
              const iv = setInterval(() => { if (!R.goals.has(gid)) return clearInterval(iv); if (gh.isCancelRequested && !R.goals.get(gid).cxl) { R.goals.get(gid).cxl = true; send({ kind: 'as_cancel', gid }); } }, 50);
              send({ kind: 'as_goal', asid: op.asid, gid, goal: gh.request, goal_id: gh.goalId });
            })
          }));
        } break;
        case 'as_fb': { const g = R.goals.get(op.gid); if (g) g.gh.publishFeedback(op.fb); break; }
        case 'as_done': { const g = R.goals.get(op.gid); if (g) { R.goals.delete(op.gid); const st = op.status; if (st === 4) g.gh.succeed(op.result || {}); else if (st === 5) g.gh.canceled(op.result || {}); else g.gh.abort(op.result || {}); g.resolve(); } break; }
        case 'ac_create': if (n) R.acs.set(op.acid, n.createActionClient(op.type, op.name)); break;
        case 'ac_goal': {
          ROS.sendGoal(op.name, op.goal, { feedback: fb => send({ kind: 'ac_fb', gid: op.gid, fb }) }).then(g => {
            R.cgoals.set(op.gid, g);
            send({ kind: 'ac_accept', gid: op.gid, accepted: g.accepted, goal_id: g.goalId });
            g.result.then(r => send({ kind: 'ac_result', gid: op.gid, status: r.status, result: r.result }));
          }, e => { err('액션 목표 전송 실패: ' + e.message); send({ kind: 'ac_accept', gid: op.gid, accepted: false }); });
          break;
        }
        case 'ac_cancel': { const g = R.cgoals.get(op.gid); if (g) g.cancel().then(ok => send({ kind: 'ac_cancel_res', gid: op.gid, ok })); break; }
        case 'ep_destroy': {
          const m = { pub: R.pubs, sub: R.subs, cli: R.clis, as: R.ases, ac: R.acs }[op.kind];
          if (op.kind === 'srv') { const s = R.srvs.get(op.id); if (s) { s.srv.destroy(); R.srvs.delete(op.id); } }
          else if (m) { const x = m.get(op.id); if (x) { x.destroy(); m.delete(op.id); } }
          break;
        }
      }
    }
    R.pendSrv = new Map(); R.pendParam = new Map();
    function cleanup(st) {
      if (R.cleaned) return; R.cleaned = true;
      if (offGraph) offGraph();
      R.nodes.forEach(n => n.destroy()); R.nodes.clear();
      R.goals.forEach(g => { try { g.gh.abort({}); g.resolve(); } catch (_) {} }); R.goals.clear();
      runs.delete(R);
      finish(st);
      if (opts.onExit) opts.onExit(st);
    }
    runs.add(R);
    getWorker(status).then(ent => {
      if (R.stopped) { ent.w.terminate(); cleanup('stopped'); return; }
      R.ent = ent;
      if (ent.info && ent.info.mode === 'async' && !run._warned) { run._warned = true; out('ℹ 이 브라우저는 JSPI 를 지원하지 않아 "비동기 변환" 모드로 실행합니다. (Chrome/Edge 최신 버전이면 실제 rclpy 와 똑같이 동작)'); }
      ent.listeners.add(m => {
        if (m.type === 'stdout') String(m.text).split('\n').forEach(l => out(l));
        else if (m.type === 'stderr') String(m.text).split('\n').forEach(l => err(l));
        else if (m.type === 'op') { try { onOp(m.op); } catch (e) { console.error(e, m.op); err('[내부 오류] ' + e.message); } }
        else if (m.type === 'done') {
          const st = m.status;
          if (st === 'stopped') out('[INFO] KeyboardInterrupt — 프로그램을 멈췄습니다');
          else if (st === 'ok' && opts.showExit !== false) out('');
          R.dead = true; ent.w.terminate();
          cleanup(st);
        }
        else if (m.type === 'fatal') { err('Python 실행기 오류: ' + m.error); R.dead = true; ent.w.terminate(); cleanup('error'); }
      });
      pushGraph();
      offGraph = ROS.on('graph', pushGraph);
      ent.w.postMessage({ type: 'run', code, filename: opts.filename || 'main.py', entry: opts.entry || null, argv: opts.argv || [opts.filename || 'main.py'], rosArgs: { remap: ra.remap || {}, params: ra.params || {}, name: ra.name || null, ns: ra.ns || null } });
      warmSpare();
    }).catch(e => { err('❌ ' + e.message); cleanup('error'); });
    return {
      done: R.done, run: R,
      stop() {
        if (R.stopped) return; R.stopped = true;
        if (!R.ent) return;
        R.ent.w.postMessage({ type: 'cancel' });
        setTimeout(() => { if (!R.cleaned) { out('[INFO] 응답이 없어 파이썬 프로세스를 강제로 종료했습니다 (무한 루프?)'); R.dead = true; R.ent.w.terminate(); cleanup('killed'); } }, 1500);
      }
    };
  }

  /* ================================================== 코드 편집기 (CodeMirror 5, 없으면 textarea) */
  const CM_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/';
  let cmLoad = null;
  function loadCM() {
    if (window.CodeMirror) return Promise.resolve(true);
    if (cmLoad) return cmLoad;
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = CM_BASE + 'codemirror.min.css'; document.head.appendChild(css);
    const js = src => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    cmLoad = js(CM_BASE + 'codemirror.min.js')
      .then(() => Promise.all(['mode/python/python.min.js', 'mode/yaml/yaml.min.js', 'mode/xml/xml.min.js', 'mode/clike/clike.min.js', 'mode/cmake/cmake.min.js', 'addon/edit/matchbrackets.min.js'].map(p => js(CM_BASE + p))))
      .then(() => true).catch(() => false);
    return cmLoad;
  }
  function modeFor(path) {
    if (/\.py$/.test(path)) return 'python';
    if (/\.(ya?ml)$/.test(path)) return 'yaml';
    if (/\.(xml|urdf|xacro|launch)$/.test(path)) return 'xml';
    if (/\.(cpp|hpp|h|c|cc)$/.test(path)) return 'text/x-c++src';
    if (/CMakeLists\.txt$/.test(path)) return 'cmake';
    return 'python';
  }
  /** el 안에 편집기 → { get(), set(s), focus(), onChange(fn), onSave(fn) } */
  function createEditor(el, text, opts) {
    opts = opts || {};
    el.classList.add('py-ed');
    const ta = document.createElement('textarea'); ta.value = text || ''; ta.spellcheck = false; ta.className = 'py-ta';
    el.appendChild(ta);
    const api = { cm: null, get: () => api.cm ? api.cm.getValue() : ta.value, set: s => { if (api.cm) api.cm.setValue(s); else ta.value = s; }, focus: () => api.cm ? api.cm.focus() : ta.focus(), _chg: [], _save: [] };
    api.onChange = f => api._chg.push(f); api.onSave = f => api._save.push(f);
    ta.addEventListener('input', () => api._chg.forEach(f => f()));
    ta.addEventListener('keydown', e => {
      if (e.key === 'Tab') { e.preventDefault(); const s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '    ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 4; }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); api._save.forEach(f => f()); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); opts.onRun && opts.onRun(); }
    });
    loadCM().then(ok => {
      if (!ok || !el.isConnected && !opts.detached) return;
      api.cm = CodeMirror.fromTextArea(ta, {
        mode: opts.mode || modeFor(opts.path || '.py'), lineNumbers: true, indentUnit: 4, tabSize: 4, indentWithTabs: false, matchBrackets: true, lineWrapping: false, viewportMargin: 50,
        extraKeys: { Tab: cm => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    ', 'end'), 'Ctrl-S': () => api._save.forEach(f => f()), 'Cmd-S': () => api._save.forEach(f => f()), 'Ctrl-Enter': () => opts.onRun && opts.onRun(), 'Cmd-Enter': () => opts.onRun && opts.onRun() }
      });
      api.cm.on('change', () => api._chg.forEach(f => f()));
      setTimeout(() => api.cm.refresh(), 30);
      el._cm = api.cm;
    });
    return api;
  }
  /** 가상 파일 편집 창 (터미널 nano) */
  function openEditor(o) {
    let ed = null, dirty = false;
    const w = RosUI.win({
      title: '📝 ' + o.title, icon: '', w: 760, h: 520,
      content(body) {
        body.classList.add('py-edwin');
        body.innerHTML = `<div class="py-edbar"><button class="btn tiny primary" data-a="save">💾 저장 (Ctrl+S)</button>${/\.py$/.test(o.path) ? '<button class="btn tiny" data-a="run">▶ 저장 후 python3 로 실행</button>' : ''}<span class="py-edst muted small"></span></div><div class="py-edhost"></div>`;
        ed = createEditor(body.querySelector('.py-edhost'), o.read(), { path: o.path });
        const st = body.querySelector('.py-edst');
        const save = () => { o.write(ed.get()); dirty = false; st.textContent = '저장했습니다 ' + new Date().toLocaleTimeString(); };
        ed.onSave(save); ed.onChange(() => { dirty = true; st.textContent = '● 수정됨'; });
        body.querySelector('[data-a=save]').onclick = save;
        const rb = body.querySelector('[data-a=run]');
        if (rb) rb.onclick = () => { save(); if (o.term) o.term.exec('python3 ' + o.path, true); };
        return () => { if (dirty && confirm('저장하지 않은 변경이 있습니다. 저장할까요?')) save(); };
      }
    });
    return w;
  }

  window.PyROS = { run, createEditor, openEditor, loadCM, get mode() { return mode; }, runs, warmSpare };
})();
