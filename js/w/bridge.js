/* ===================================================================
   rosbridge 연결 — 이 페이지의 WebROS 그래프를 진짜 ROS 2 시스템과 잇기
   rosbridge_suite(WebSocket, JSON 프로토콜 v2) 클라이언트
     ops: advertise / unadvertise / publish / subscribe / unsubscribe / call_service / service_response
          (+ advertise_service: 브라우저 서비스를 원격에 공개)
     rosapi: /rosapi/topics, /rosapi/nodes, /rosapi/services
   JS API: ROS.bridge = { connect(url), disconnect(), mirrorIn(topic,type), mirrorOut(topic,type), status, … }
   위젯/보기: bridge
   =================================================================== */
(function () {
  'use strict';
  const esc = RosUI.esc;

  /* ================================================== 변환 도우미 */
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function b64decode(s) {
    if (typeof atob === 'function') { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
    const clean = String(s).replace(/[^A-Za-z0-9+/]/g, ''); const out = [];
    for (let i = 0; i < clean.length; i += 4) {
      const n = (B64.indexOf(clean[i]) << 18) | (B64.indexOf(clean[i + 1]) << 12) | ((B64.indexOf(clean[i + 2]) & 63) << 6) | (B64.indexOf(clean[i + 3]) & 63);
      out.push((n >> 16) & 255); if (clean[i + 2]) out.push((n >> 8) & 255); if (clean[i + 3]) out.push(n & 255);
    }
    return new Uint8Array(out);
  }
  const BYTE_T = new Set(['uint8', 'byte', 'char', 'int8']);
  const FLOAT_T = new Set(['float32', 'float64']);
  /** rosbridge JSON → WebROS 메시지 (uint8[] 는 base64 문자열로 옴, NaN/inf 는 null 로 올 수 있음) */
  function fromWire(v, type) {
    const f = type && ROS.fieldsOf(type);
    if (!f || !v || typeof v !== 'object') return v;
    f.fields.forEach(fd => {
      const x = v[fd.name];
      if (x === undefined) return;
      if (fd.array != null) {
        if (BYTE_T.has(fd.type) && typeof x === 'string') v[fd.name] = b64decode(x);
        else if (Array.isArray(x) && FLOAT_T.has(fd.type)) v[fd.name] = x.map(n => (n == null ? (fd.name === 'ranges' ? Infinity : NaN) : n));
        else if (Array.isArray(x) && !ROS.PRIM.has(fd.type)) v[fd.name] = x.map(e => fromWire(e, fd.type));
      } else if (FLOAT_T.has(fd.type) && x == null) v[fd.name] = NaN;
      else if (!ROS.PRIM.has(fd.type)) v[fd.name] = fromWire(x, fd.type);
    });
    return v;
  }
  /** WebROS 메시지 → JSON 문자열. 타입 배열은 일반 배열로, NaN/±Infinity 는 파이썬 json 이 읽는 토큰으로 */
  function toJson(obj) {
    const s = JSON.stringify(obj, (k, v) => {
      if (typeof v === 'number' && !Number.isFinite(v)) return Number.isNaN(v) ? '__rb_NaN__' : v > 0 ? '__rb_Inf__' : '__rb_-Inf__';
      if (ArrayBuffer.isView(v)) return Array.from(v);
      return v;
    });
    return s.replace(/"__rb_NaN__"/g, 'NaN').replace(/"__rb_Inf__"/g, 'Infinity').replace(/"__rb_-Inf__"/g, '-Infinity');
  }
  /** 받은 텍스트 해석 (Infinity/NaN 토큰이 섞여 와도 읽기) */
  function parseIncoming(text) {
    try { return JSON.parse(text); } catch (_) {
      return JSON.parse(text.replace(/("(?:[^"\\]|\\.)*")|-?\bInfinity\b|\bNaN\b/g, (m, str) => (str ? str : 'null')));
    }
  }
  /** 에코 판별용 지문: 숫자 정밀도를 맞춘 정규화 JSON */
  function fingerprint(msg) {
    return JSON.stringify(msg, (k, v) => {
      if (typeof v === 'number') return Number.isFinite(v) ? +v.toPrecision(6) : String(v);
      if (ArrayBuffer.isView(v)) return Array.from(v);
      return v;
    });
  }
  const normT = t => { t = ROS.normType(t || ''); return t; };
  const LATCHED = /(^|\/)(tf_static|map|robot_description)$/;

  /* ================================================== 연결 싱글턴 */
  const listeners = new Set();
  let seq = 0, ws = null, proxy = null, ownerEl = null, ownerTimer = null;
  const pending = new Map();                  // id → {resolve, reject, timer}
  const sentFp = new Map();                   // topic → [{fp, t}]
  const exposed = new Map();                  // service → local name

  const B = ROS.bridge = {
    url: 'ws://localhost:9090',
    status: 'disconnected',                   // disconnected | connecting | connected | error
    error: '',
    remote: { topics: [], nodes: [], services: [] },
    mirrors: { in: new Map(), out: new Map() },   // 원격 topic → {type, local, …} / 로컬 topic → {type, remote, …}
    stats: { rx: 0, tx: 0, echo: 0 },
    throttle: 0,                              // subscribe throttle_rate [ms]
    frames: [],                               // 최근 JSON 프레임 (가르치기용)
    logLines: [],
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get connected() { return B.status === 'connected'; },

    connect(url, opts) {
      opts = opts || {};
      if (ws) B.disconnect(true);
      B.url = url || B.url;
      B.error = '';
      ownerEl = opts.owner || null;
      setStatus('connecting');
      log(`연결 시도: ${B.url}`);
      try { ws = new WebSocket(B.url); }
      catch (e) {
        ws = null;
        B.error = /^ws:/.test(B.url) && location.protocol === 'https:' ? `https 페이지에서 ws:// 연결이 막혔습니다 (${e.message}). localhost 는 대부분 허용되지만, 다른 PC 는 wss:// (TLS) 가 필요합니다.` : e.message;
        setStatus('error'); log('✗ ' + B.error, 'bad'); return Promise.resolve(false);
      }
      const sock = ws;
      return new Promise(resolve => {
        let opened = false;
        sock.onopen = () => {
          if (sock !== ws) return;
          opened = true;
          proxy = ROS.createNode('rosbridge_proxy', { pkg: 'rosbridge_server', exe: 'rosbridge_websocket', owner: ownerEl || undefined, out: l => log(l) });
          proxy.onDestroy = () => { if (sock === ws) B.disconnect(); };
          setStatus('connected'); log(`✓ 연결됨: ${B.url}`, 'ok');
          B.refresh().catch(() => {});
          resolve(true);
        };
        sock.onmessage = ev => { if (sock === ws) onMessage(ev.data); };
        sock.onerror = () => {
          if (sock !== ws) return;
          B.error = opened ? 'WebSocket 오류' : `연결할 수 없습니다 — rosbridge 가 ${B.url} 에서 실행 중인지 확인하세요` + (location.protocol === 'https:' && /^ws:/.test(B.url) && !/localhost|127\.0\.0\.1/.test(B.url) ? ' (https 페이지 → 다른 PC 는 wss:// 필요)' : '');
        };
        sock.onclose = ev => {
          if (sock !== ws) return;
          const wasOpen = opened;
          cleanup();
          if (!wasOpen) { setStatus('error'); log('✗ ' + (B.error || `연결 실패 (code ${ev.code})`), 'bad'); resolve(false); }
          else { setStatus('disconnected'); log(`연결이 끊어졌습니다 (code ${ev.code})`, 'warn'); }
        };
      }).then(ok => {
        clearInterval(ownerTimer);
        if (ok && ownerEl) ownerTimer = setInterval(() => { if (ownerEl && !ownerEl.isConnected) B.disconnect(); }, 1000);
        return ok;
      });
    },

    disconnect(silent) {
      if (!ws && B.status !== 'error') { setStatus('disconnected'); return; }
      const sock = ws;
      if (sock && sock.readyState === 1) {
        B.mirrors.in.forEach((m, t) => send({ op: 'unsubscribe', id: m.subId, topic: t }));
        B.mirrors.out.forEach((m, t) => send({ op: 'unadvertise', id: m.advId, topic: m.remote }));
        exposed.forEach((l, s) => send({ op: 'unadvertise_service', service: s }));
      }
      cleanup();
      try { sock && sock.close(1000); } catch (_) {}
      if (!silent) log('연결을 끊었습니다');
      setStatus('disconnected');
    },

    /** rosapi 로 원격 목록 새로고침 */
    async refresh() {
      if (!B.connected) return B.remote;
      const [t, n, s] = await Promise.all([
        B.call('/rosapi/topics', {}).catch(e => { log('rosapi/topics: ' + e.message, 'warn'); return null; }),
        B.call('/rosapi/nodes', {}).catch(() => null),
        B.call('/rosapi/services', {}).catch(() => null)
      ]);
      if (t) B.remote.topics = (t.topics || []).map((name, i) => ({ name, type: normT((t.types || [])[i]) })).sort((a, b) => a.name.localeCompare(b.name));
      if (n) B.remote.nodes = (n.nodes || []).slice().sort();
      if (s) B.remote.services = (s.services || []).slice().sort().map(name => ({ name }));
      if (t) log(`원격 토픽 ${B.remote.topics.length}개 · 노드 ${B.remote.nodes.length}개 · 서비스 ${B.remote.services.length}개`);
      emit();
      return B.remote;
    },

    /** 원격 서비스 호출 → Promise(values) */
    call(service, args, type) {
      if (!B.connected) return Promise.reject(new Error('연결되어 있지 않습니다'));
      const id = 'call_service:' + service + ':' + (++seq);
      const msg = { op: 'call_service', id, service, args: args || {} };
      if (type) msg.type = normT(type).replace('/msg/', '/srv/');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('응답 시간 초과 (5 s)')); }, 5000);
        pending.set(id, { resolve, reject, timer });
        send(msg);
      });
    },

    /** 원격 → 브라우저: 원격 topic 을 구독해 로컬(localName, 기본은 같은 이름)으로 다시 발행 */
    mirrorIn(topic, type, localName) {
      if (!B.connected) throw new Error('rosbridge 에 먼저 연결하세요');
      type = normT(type || (B.remote.topics.find(t => t.name === topic) || {}).type);
      if (!type) throw new Error(`${topic} 의 타입을 알 수 없습니다`);
      if (B.mirrors.in.has(topic)) return B.mirrors.in.get(topic);
      const local = localName || topic;
      const pub = proxy.createPublisher(type, local, LATCHED.test(local) ? 'latched' : 10);
      const m = { type, local, pub, subId: 'subscribe:' + topic + ':' + (++seq), count: 0 };
      B.mirrors.in.set(topic, m);
      send({ op: 'subscribe', id: m.subId, topic, type, throttle_rate: +B.throttle || 0, queue_length: 1 });
      log(`원격→브라우저: ${topic} [${type}]` + (local !== topic ? ` → ${local}` : ''), 'ok');
      emit(); return m;
    },
    unmirrorIn(topic) {
      const m = B.mirrors.in.get(topic); if (!m) return;
      if (B.connected) send({ op: 'unsubscribe', id: m.subId, topic });
      m.pub.destroy(); B.mirrors.in.delete(topic); log(`원격→브라우저 해제: ${topic}`); emit();
    },
    /** 브라우저 → 원격: 로컬 topic 을 구독해 원격(remoteName, 기본은 같은 이름)에 advertise + publish */
    mirrorOut(topic, type, remoteName) {
      if (!B.connected) throw new Error('rosbridge 에 먼저 연결하세요');
      type = normT(type || ROS.topicType(topic) || (B.remote.topics.find(t => t.name === topic) || {}).type);
      if (!type) throw new Error(`${topic} 의 타입을 알 수 없습니다`);
      if (B.mirrors.out.has(topic)) return B.mirrors.out.get(topic);
      const remote = remoteName || topic;
      const m = { type, remote, advId: 'advertise:' + remote + ':' + (++seq), count: 0 };
      send({ op: 'advertise', id: m.advId, topic: remote, type });
      m.sub = proxy.createSubscription(type, topic, (msg, info) => {
        if (info && info.publisher === proxy.fqn) { B.stats.echo++; return; }   // 우리가 원격에서 받아 넣은 메시지 → 되돌려 보내지 않음
        const fp = fingerprint(msg);
        const arr = sentFp.get(remote) || []; const now = performance.now();
        arr.push({ fp, t: now }); while (arr.length > 60 || (arr.length && now - arr[0].t > 3000)) arr.shift(); sentFp.set(remote, arr);
        m.count++;
        send({ op: 'publish', topic: remote, msg }, true);
      }, { reliability: 'best_effort', depth: 10 });
      B.mirrors.out.set(topic, m);
      log(`브라우저→원격: ${topic} [${type}]` + (remote !== topic ? ` → ${remote}` : ''), 'ok');
      emit(); return m;
    },
    unmirrorOut(topic) {
      const m = B.mirrors.out.get(topic); if (!m) return;
      if (B.connected) send({ op: 'unadvertise', id: m.advId, topic: m.remote });
      m.sub.destroy(); B.mirrors.out.delete(topic); log(`브라우저→원격 해제: ${topic}`); emit();
    },
    /** 브라우저 안의 서비스를 원격 ROS 2 에 공개 (advertise_service) */
    exposeService(name, type) {
      if (!B.connected) throw new Error('rosbridge 에 먼저 연결하세요');
      const s = ROS.serviceList().find(x => x.name === name);
      type = normT(type || (s && s.type)).replace('/msg/', '/srv/');
      send({ op: 'advertise_service', service: name, type });
      exposed.set(name, name); log(`서비스 공개: ${name} [${type}]`, 'ok'); emit();
    },
    toJson, fromWire, parseIncoming, fingerprint
  };

  function setStatus(s) { B.status = s; emit(); }
  function emit() { listeners.forEach(f => { try { f(B); } catch (e) { console.error(e); } }); }
  function log(text, cls) { B.logLines.push({ text, cls: cls || '', t: new Date() }); while (B.logLines.length > 40) B.logLines.shift(); emit(); }
  function frame(dir, obj) {
    let s = typeof obj === 'string' ? obj : toJson(obj);
    if (s.length > 220) s = s.slice(0, 217) + '…';
    B.frames.push({ dir, s }); while (B.frames.length > 8) B.frames.shift();
  }
  function send(obj, quiet) {
    if (!ws || ws.readyState !== 1) return false;
    const s = toJson(obj);
    try { ws.send(s); } catch (e) { log('전송 실패: ' + e.message, 'bad'); return false; }
    B.stats.tx++;
    if (!quiet || B.stats.tx % 20 === 1) frame('→', s);
    return true;
  }
  function cleanup() {
    pending.forEach(p => { clearTimeout(p.timer); p.reject(new Error('연결이 끊어졌습니다')); }); pending.clear();
    B.mirrors.in.forEach(m => m.pub.destroy()); B.mirrors.out.forEach(m => m.sub.destroy());
    B.mirrors.in.clear(); B.mirrors.out.clear(); exposed.clear(); sentFp.clear();
    B.remote = { topics: [], nodes: [], services: [] };
    clearInterval(ownerTimer);
    const px = proxy; proxy = null;
    if (px) { px.onDestroy = null; px.destroy(); }
    const w = ws; ws = null;
    if (w) { w.onopen = w.onmessage = w.onerror = w.onclose = null; }
  }
  function onMessage(text) {
    let m; try { m = parseIncoming(text); } catch (e) { log('해석할 수 없는 프레임', 'warn'); return; }
    B.stats.rx++;
    if (m.op !== 'publish' || B.stats.rx % 20 === 1) frame('←', text);
    switch (m.op) {
      case 'publish': {
        const mi = B.mirrors.in.get(m.topic); if (!mi) return;
        const arr = sentFp.get(m.topic);
        if (arr && arr.length) {                                  // 우리가 보낸 메시지가 되돌아온 것 → 버림
          const fp = fingerprint(fromWire(ROS.cloneMsg(m.msg), mi.type)); const i = arr.findIndex(x => x.fp === fp);
          if (i >= 0) { arr.splice(i, 1); B.stats.echo++; return; }
        }
        mi.count++;
        mi.pub.publish(fromWire(m.msg, mi.type));
        break;
      }
      case 'service_response': {
        const p = pending.get(m.id); if (!p) return;
        pending.delete(m.id); clearTimeout(p.timer);
        if (m.result === false) p.reject(new Error(typeof m.values === 'string' ? m.values : '서비스 호출 실패'));
        else p.resolve(m.values || {});
        break;
      }
      case 'call_service': {                                        // 원격이 우리가 공개한 서비스를 호출
        const local = exposed.get(m.service);
        const reply = (values, result) => send({ op: 'service_response', id: m.id, service: m.service, values, result });
        if (!local) { reply('not advertised', false); return; }
        ROS.callService(local, null, m.args || {}).then(v => reply(v, true)).catch(e => reply(e.message, false));
        break;
      }
      case 'status': log(`[rosbridge ${m.level || 'info'}] ${m.msg}`, m.level === 'error' ? 'bad' : 'warn'); break;
      default: break;
    }
  }

  /* ================================================== 화면 */
  const SETUP = `# 1) 설치 (Ubuntu 24.04 + ROS 2 Jazzy)
sudo apt install ros-jazzy-rosbridge-suite

# 2) 실행 — WebSocket 서버가 9090 포트에서 기다립니다
source /opt/ros/jazzy/setup.bash
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
#   [rosbridge_websocket]: Rosbridge WebSocket server started on port 9090

# 3) 이 위젯에서 ws://localhost:9090 (다른 PC 라면 ws://<IP>:9090) 으로 연결
#    원격 목록은 rosapi 노드(/rosapi/topics, /rosapi/nodes, /rosapi/services)가 알려 줍니다`;
  const EXAMPLES = [
    ['🐢', '진짜 turtlesim 을 웹에서 조종', 'PC 에서 <code>ros2 run turtlesim turtlesim_node</code> → 이 페이지의 turtlesim 텔레옵이 내는 <code>/turtle1/cmd_vel</code> 을 <b>브라우저→원격</b> 으로 켭니다. (페이지 안 거북이와 진짜 거북이가 같이 움직입니다)'],
    ['📡', '실제 /scan 을 RViz-lite 로 보기', '로봇(또는 Gazebo)의 <code>/scan</code> 과 <code>/tf</code> 를 <b>원격→브라우저</b> 로 켜면 이 사이트의 RViz 위젯이 그대로 그립니다.'],
    ['🦾', 'SO-ARM101 관절 보기', '팔 드라이버의 <code>/joint_states</code> 를 <b>원격→브라우저</b> 로 — 웹 3D 모델이 실제 팔을 따라 움직입니다.'],
    ['🐕', 'Go2 를 /cmd_vel 로', '커뮤니티 드라이버 <b>go2_ros2_sdk</b> 를 띄우고, 이 페이지 Go2 위젯의 <code>/cmd_vel</code> 을 <b>브라우저→원격</b> 으로 (반드시 낮은 속도 · 비상정지 준비).']
  ];

  function bridgeView(el, opts) {
    opts = opts || {};
    const owner = opts.owner || el;
    const root = document.createElement('div');
    root.className = 'wb-r';
    root.innerHTML = `
      <div class="wb-r-bar">
        <input class="w-in wb-r-url" value="${esc(opts.url || B.url || 'ws://localhost:9090')}" spellcheck="false" aria-label="rosbridge 주소">
        <button class="btn small primary" data-a="conn">연결</button>
        <button class="btn small" data-a="disc">해제</button>
        <span class="wb-r-st"><i class="wb-r-dot"></i><b class="wb-r-stt">연결 안 됨</b></span>
        <span class="wb-r-cnt small muted w-out"></span>
      </div>
      <div class="wb-r-err" hidden></div>
      <div class="wb-r-tabs w-seg"><button data-tab="topics" class="on">토픽</button><button data-tab="nodes">노드</button><button data-tab="services">서비스</button><button data-tab="frames">JSON 프레임</button></div>
      <div class="wb-r-tools">
        <input class="w-in wb-r-filter" placeholder="🔎 이름 거르기" spellcheck="false">
        <label class="small" title="원격 토픽을 브라우저에 들여올 때 이름 앞에 붙일 접두어 (비우면 같은 이름)">로컬 접두어 <input class="w-in wb-r-prefix" value="${esc(opts.prefix || '')}" placeholder="(같은 이름)" spellcheck="false"></label>
        <label class="small" title="rosbridge subscribe 의 throttle_rate (ms). 0 이면 제한 없음">throttle <input class="w-in wb-r-thr" type="number" min="0" step="50" value="${+B.throttle || 0}"> ms</label>
        <button class="btn tiny" data-a="refresh">↻ 새로고침</button>
      </div>
      <div class="wb-r-list"></div>
      <details class="wb-r-call"><summary>🛎 원격 서비스 호출</summary>
        <div class="wb-r-callrow">
          <input class="w-in wb-r-svc" list="" placeholder="/서비스 이름 (예: /spawn)" spellcheck="false">
          <input class="w-in wb-r-svct" placeholder="타입 (선택, 예: turtlesim/srv/Spawn)" spellcheck="false">
        </div>
        <div class="wb-r-callrow"><input class="w-in wb-r-args" placeholder="{x: 2.0, y: 2.0, theta: 0.0, name: 'turtle2'}" spellcheck="false"><button class="btn small" data-a="call">호출</button></div>
        <pre class="wb-r-res w-out"></pre>
      </details>
      <div class="wb-r-log w-out"></div>
      <details class="wb-r-help"${opts.help === '0' ? '' : ' open'}><summary>🧰 준비: 진짜 ROS 2 쪽에서 rosbridge 켜기</summary>
        <pre class="wb-r-pre">${esc(SETUP)}</pre>
        <div class="w-help">⚠ 이 사이트는 <b>https</b> 로 열립니다. 브라우저는 https 페이지에서 암호화되지 않은 <code>ws://</code> 연결을 막을 수 있습니다 —
        <b>localhost 는 대부분 허용</b>(Chrome · Edge · Firefox)되지만, <b>다른 PC 는 wss:// (TLS 인증서)</b> 가 필요합니다
        (<code>rosbridge_websocket_launch.xml ssl:=true certfile:=… keyfile:=…</code> 또는 리버스 프록시).</div>
        <div class="wb-r-ex">${EXAMPLES.map(([i, t, d]) => `<div class="wb-r-exi"><b>${i} ${t}</b><div class="small">${d}</div></div>`).join('')}</div>
        <div class="w-help">JS 에서: <code>ROS.bridge.connect('ws://localhost:9090')</code> · <code>ROS.bridge.mirrorIn('/scan', 'sensor_msgs/msg/LaserScan')</code> · <code>ROS.bridge.mirrorOut('/turtle1/cmd_vel')</code></div>
      </details>`;
    el.appendChild(root);
    const $ = s => root.querySelector(s);
    let tab = 'topics';

    $('[data-a=conn]').onclick = () => { B.throttle = +$('.wb-r-thr').value || 0; B.connect($('.wb-r-url').value.trim(), { owner }); };
    $('.wb-r-url').onkeydown = e => { if (e.key === 'Enter') $('[data-a=conn]').click(); };
    $('[data-a=disc]').onclick = () => B.disconnect();
    $('[data-a=refresh]').onclick = () => { B.refresh(); render(); };
    $('.wb-r-thr').onchange = e => { B.throttle = +e.target.value || 0; };
    $('.wb-r-filter').oninput = () => render();
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; root.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b)); render(); });
    $('[data-a=call]').onclick = async () => {
      const svc = $('.wb-r-svc').value.trim(), res = $('.wb-r-res');
      if (!svc) { res.textContent = '서비스 이름을 입력하세요'; return; }
      let args = {};
      try { args = ROS.parseYaml($('.wb-r-args').value || '{}') || {}; } catch (e) { res.textContent = 'YAML 오류: ' + e.message; return; }
      res.textContent = `waiting for service to become available...\nrequester: making request: ${svc} ${JSON.stringify(args)}`;
      try { const v = await B.call(svc, args, $('.wb-r-svct').value.trim() || null); res.textContent += '\n\nresponse:\n' + JSON.stringify(v, null, 2); }
      catch (e) { res.textContent += '\n\n✗ ' + e.message; }
    };

    function rowsTopics(f) {
      const map = new Map();
      B.remote.topics.forEach(t => map.set(t.name, { name: t.name, type: t.type, remote: true, local: false }));
      const proxyName = '/rosbridge_proxy';
      ROS.topicList().forEach(t => {
        if (t.name === '/rosout' || t.name === '/parameter_events') { if (!map.has(t.name)) return; }
        const tr = ROS.topic(t.name);
        const onlyProxy = tr && [...tr.pubs, ...tr.subs].every(e => e.node.fqn === proxyName);
        if (onlyProxy) return;
        const r = map.get(t.name) || { name: t.name, type: t.type, remote: false, local: false };
        r.local = !onlyProxy; r.type = r.type || t.type; map.set(t.name, r);
      });
      return [...map.values()].filter(r => !f || r.name.includes(f) || (r.type || '').includes(f)).sort((a, b) => a.name.localeCompare(b.name));
    }
    function render() {
      const list = $('.wb-r-list'), f = $('.wb-r-filter').value.trim(), on = B.connected;
      $('.wb-r-tools').style.display = tab === 'frames' ? 'none' : '';
      if (tab === 'topics') {
        const rows = rowsTopics(f);
        const pre = $('.wb-r-prefix').value.trim().replace(/\/$/, '');
        list.innerHTML = rows.length ? `<table class="tbl wb-r-tbl"><thead><tr><th>토픽</th><th>위치</th><th class="c" title="원격 토픽을 구독해 이 페이지 그래프로 다시 발행">원격→브라우저</th><th class="c" title="이 페이지 토픽을 원격에 advertise + publish">브라우저→원격</th></tr></thead><tbody>${rows.map(r => {
          const mi = B.mirrors.in.get(r.name), mo = B.mirrors.out.get(r.name);
          return `<tr><td><code>${esc(r.name)}</code><div class="small muted">${esc(r.type || '?')}${mi && mi.local !== r.name ? ` → <code>${esc(mi.local)}</code>` : ''}</div></td>
            <td class="small">${r.remote && r.local ? '양쪽' : r.remote ? '🖥 원격' : '🌐 브라우저'}</td>
            <td class="c"><button class="wb-r-tg${mi ? ' on' : ''}" data-in="${esc(r.name)}" data-type="${esc(r.type || '')}" data-local="${esc(pre ? pre + r.name : r.name)}" ${on && r.remote ? '' : 'disabled'}>${mi ? '켜짐 ' + mi.count : '끔'}</button></td>
            <td class="c"><button class="wb-r-tg${mo ? ' on' : ''}" data-out="${esc(r.name)}" data-type="${esc(r.type || '')}" ${on && r.local ? '' : 'disabled'}>${mo ? '켜짐 ' + mo.count : '끔'}</button></td></tr>`;
        }).join('')}</tbody></table>` : `<div class="muted small wb-r-empty">${on ? '토픽이 없습니다' : '연결하면 원격 토픽이 여기에 나옵니다. (지금은 이 페이지의 토픽만 보입니다)'}</div>`;
        list.querySelectorAll('[data-in]').forEach(b => b.onclick = () => { const t = b.dataset.in; try { if (B.mirrors.in.has(t)) B.unmirrorIn(t); else B.mirrorIn(t, b.dataset.type, b.dataset.local); } catch (e) { log(e.message, 'bad'); } });
        list.querySelectorAll('[data-out]').forEach(b => b.onclick = () => { const t = b.dataset.out; try { if (B.mirrors.out.has(t)) B.unmirrorOut(t); else B.mirrorOut(t, b.dataset.type); } catch (e) { log(e.message, 'bad'); } });
      } else if (tab === 'nodes') {
        const rn = B.remote.nodes.filter(n => !f || n.includes(f));
        list.innerHTML = `<div class="wb-r-cols"><div><b class="small">🖥 원격 노드 (${rn.length})</b><pre class="wb-r-pre">${esc(rn.join('\n') || (on ? '(없음)' : '(연결 안 됨)'))}</pre></div>
          <div><b class="small">🌐 이 페이지 노드</b><pre class="wb-r-pre">${esc(ROS.nodes().map(n => n.fqn).filter(n => !f || n.includes(f)).join('\n'))}</pre></div></div>`;
      } else if (tab === 'services') {
        const rs = B.remote.services.filter(s => !f || s.name.includes(f));
        list.innerHTML = rs.length ? `<div class="wb-r-svcs">${rs.map(s => `<button class="btn tiny ghost" data-svc="${esc(s.name)}">${esc(s.name)}</button>`).join('')}</div><div class="w-help">누르면 아래 “원격 서비스 호출” 칸에 채워집니다.</div>` : `<div class="muted small wb-r-empty">${on ? '서비스가 없습니다' : '연결하면 원격 서비스 목록이 나옵니다'}</div>`;
        list.querySelectorAll('[data-svc]').forEach(b => b.onclick = () => { $('.wb-r-svc').value = b.dataset.svc; $('.wb-r-call').open = true; $('.wb-r-args').focus(); });
      } else {
        list.innerHTML = `<pre class="wb-r-pre wb-r-frames">${B.frames.length ? B.frames.map(x => `<span class="${x.dir === '→' ? 'tx' : 'rx'}">${x.dir} ${esc(x.s)}</span>`).join('\n') : esc('(아직 주고받은 프레임이 없습니다)\n예) → {"op":"call_service","id":"call_service:/rosapi/topics:1","service":"/rosapi/topics","args":{}}\n    → {"op":"subscribe","topic":"/scan","type":"sensor_msgs/msg/LaserScan","throttle_rate":0,"queue_length":1}\n    ← {"op":"publish","topic":"/scan","msg":{"header":{…},"ranges":[…]}}')}</pre><div class="w-help">rosbridge 프로토콜 v2 는 JSON 한 덩어리에 <code>op</code> 로 동작을 적습니다. 발행 프레임은 20개 중 1개만 보여 줍니다.</div>`;
      }
    }
    function update() {
      const st = B.status;
      $('.wb-r-dot').className = 'wb-r-dot ' + st;
      $('.wb-r-stt').textContent = { disconnected: '연결 안 됨', connecting: '연결 중…', connected: '연결됨', error: '연결 실패' }[st];
      $('.wb-r-cnt').textContent = B.connected ? `↓${B.stats.rx} ↑${B.stats.tx}${B.stats.echo ? ` · 에코 차단 ${B.stats.echo}` : ''}` : '';
      const err = $('.wb-r-err'); err.hidden = !(st === 'error' && B.error); err.textContent = B.error;
      $('.wb-r-log').innerHTML = B.logLines.slice(-5).map(l => `<div class="${l.cls}">${esc(l.text)}</div>`).join('');
      if (st === 'connected') $('.wb-r-help').open = false;
    }
    let dirty = true;
    const off = B.on(() => { dirty = true; });
    const offG = ROS.on('graph', () => { dirty = true; });
    let acc = 0;
    const stop = RosUI.loop(root, dt => {
      acc += dt;
      if (dirty || acc > 1) {
        const active = document.activeElement;
        update();
        if (dirty || tab === 'topics' || tab === 'frames') { if (!(active && root.contains(active) && active.classList.contains('wb-r-tg'))) render(); }
        dirty = false; acc = 0;
      }
    });
    update(); render();
    if (opts.autoconnect === '1' && !B.connected) $('[data-a=conn]').click();
    return () => { stop(); off(); offG(); };
  }

  RosUI.registerView('bridge', bridgeView, { title: 'rosbridge 연결', icon: '🔌', w: 760, h: 640 });
  Widgets.register('bridge', (el, o) => {
    const body = RosUI.frame(el, '🔌', 'rosbridge — 진짜 ROS 2 와 연결하기', '실제 연결');
    return bridgeView(body, Object.assign({}, o, { owner: el }));
  }, { title: 'rosbridge 연결' });
})();
