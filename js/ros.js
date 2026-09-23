/* ===================================================================
   WebROS — 브라우저 안에서 도는 작은 ROS 2 그래프
   노드 · 토픽(pub/sub) · 서비스 · 액션 · 파라미터 · TF · QoS · /rosout
   한 페이지의 모든 위젯(터미널, turtlesim, 파이썬 실습, 시각화)이 같은 그래프를 씁니다.
   =================================================================== */
(function () {
  'use strict';

  /* ================================================== 인터페이스 파서 */
  const PRIM = new Set(['bool', 'byte', 'char', 'float32', 'float64', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64', 'string', 'wstring']);
  const FLOATS = new Set(['float32', 'float64']);
  const INTS = new Set(['byte', 'char', 'int8', 'uint8', 'int16', 'uint16', 'int32', 'uint32', 'int64', 'uint64']);
  const cache = {};

  function normType(t) {
    // 'geometry_msgs/Twist' → 'geometry_msgs/msg/Twist'
    t = String(t || '').trim();
    const p = t.split('/');
    if (p.length === 2) return p[0] + '/msg/' + p[1];
    return t;
  }
  function resolveFieldType(t, pkg) {
    if (PRIM.has(t)) return t;
    if (t === 'Header') return 'std_msgs/msg/Header';
    if (t.includes('/')) return normType(t);
    return pkg + '/msg/' + t;
  }
  function parseFields(text, pkg) {
    const fields = [], consts = [];
    String(text).split('\n').forEach(line => {
      const s = line.replace(/#.*$/, '').trim();
      if (!s) return;
      const m = s.match(/^([\w/]+)(\[(<=)?(\d*)\])?(?:<=\d+)?\s+(\w+)\s*(=?)\s*(.*)$/);
      if (!m) return;
      const type = resolveFieldType(m[1], pkg);
      const array = m[2] ? (m[4] && !m[3] ? +m[4] : -1) : null;
      if (m[6] === '=') consts.push({ name: m[5], type, value: parseLit(m[7], type) });
      else fields.push({ name: m[5], type, array, def: m[7] ? parseLit(m[7], type) : undefined });
    });
    return { fields, consts };
  }
  function parseLit(s, type) {
    s = String(s).trim();
    if (type === 'string') return s.replace(/^['"]|['"]$/g, '');
    if (type === 'bool') return /^(true|1)$/i.test(s);
    return Number(s);
  }
  /** 'pkg/msg/X' → { kind, parts:[{fields,consts}], text } */
  function iface(type) {
    type = normType(type);
    if (cache[type]) return cache[type];
    const src = (window.ROS_IFACES || {})[type];
    if (src == null) return null;
    const [pkg, kind] = type.split('/');
    const texts = src.split(/^---\s*$/m);
    const parts = texts.map(t => parseFields(t, pkg));
    return (cache[type] = { type, kind, pkg, parts, text: src });
  }
  function msgFields(type) { const i = iface(type); return i ? i.parts[0] : null; }
  /** srv/action 의 한 부분(요청/응답, 목표/결과/피드백) 타입을 가상 이름으로 */
  function partType(type, idx) { return normType(type) + '#' + idx; }
  function fieldsOf(t) {
    if (t.includes('#')) { const [base, i] = t.split('#'); const f = iface(base); return f ? f.parts[+i] || { fields: [], consts: [] } : null; }
    const f = iface(t); return f ? f.parts[0] : null;
  }

  function defaultPrim(t) { return t === 'string' || t === 'wstring' ? '' : t === 'bool' ? false : 0; }
  /** 기본값으로 채운 메시지 객체 */
  function make(type, partial) {
    const f = fieldsOf(type);
    const o = {};
    if (!f) return Object.assign(o, partial || {});
    f.fields.forEach(fd => {
      if (fd.array != null) {
        o[fd.name] = fd.array > 0 ? Array.from({ length: fd.array }, () => PRIM.has(fd.type) ? defaultPrim(fd.type) : make(fd.type)) : [];
      } else if (PRIM.has(fd.type)) o[fd.name] = fd.def !== undefined ? fd.def : defaultPrim(fd.type);
      else o[fd.name] = make(fd.type);
    });
    if (partial) merge(o, partial, type);
    return o;
  }
  function merge(o, p, type) {
    const f = fieldsOf(type);
    Object.keys(p || {}).forEach(k => {
      const fd = f && f.fields.find(x => x.name === k);
      const v = p[k];
      if (fd && fd.array == null && !PRIM.has(fd.type) && v && typeof v === 'object' && !Array.isArray(v)) {
        if (!o[k] || typeof o[k] !== 'object') o[k] = make(fd.type);
        merge(o[k], v, fd.type);
      } else if (fd && fd.array != null && Array.isArray(v) && !PRIM.has(fd.type)) {
        o[k] = v.map(x => make(fd.type, x));
      } else if (fd && PRIM.has(fd.type) && fd.array == null) {
        o[k] = coerce(v, fd.type);
      } else o[k] = v;
    });
    return o;
  }
  function coerce(v, t) {
    if (t === 'string' || t === 'wstring') return v == null ? '' : String(v);
    if (t === 'bool') return v === true || v === 'true' || v === 1 || v === 'True';
    const n = Number(v); return Number.isFinite(n) ? (INTS.has(t) ? Math.trunc(n) : n) : 0;
  }

  /* ---------------------------------------------- YAML 출력 (ros2 topic echo 모양) */
  function fmtPrim(v, t) {
    if (t === 'string' || t === 'wstring') {
      const s = String(v);
      return /^[\w.\-/ ]*$/.test(s) && s !== '' && !/^(true|false|null|~|\d)/i.test(s) && !/^\s|\s$/.test(s) ? s : `'${s.replace(/'/g, "''")}'`;
    }
    if (t === 'bool') return v ? 'true' : 'false';
    if (FLOATS.has(t)) {
      if (!Number.isFinite(v)) return Number.isNaN(v) ? '.nan' : (v > 0 ? '.inf' : '-.inf');
      if (Number.isInteger(v)) return v.toFixed(1);
      let s = t === 'float32' ? String(+v.toPrecision(8)) : String(v);
      return s;
    }
    return String(v);
  }
  function toYaml(o, type, ind = '') {
    const f = fieldsOf(type);
    if (!f) return ind + JSON.stringify(o);
    if (!f.fields.length) return ind + '{}';
    const lines = [];
    f.fields.forEach(fd => {
      const v = o ? o[fd.name] : undefined;
      if (fd.array != null) {
        const arr = Array.isArray(v) ? v : (v && v.length != null ? Array.from(v) : []);
        if (!arr.length) { lines.push(`${ind}${fd.name}: []`); return; }
        if (PRIM.has(fd.type)) {
          if (arr.length > 64) { lines.push(`${ind}${fd.name}:`); arr.slice(0, 64).forEach(x => lines.push(`${ind}- ${fmtPrim(x, fd.type)}`)); lines.push(`${ind}- '...'`); }
          else { lines.push(`${ind}${fd.name}:`); arr.forEach(x => lines.push(`${ind}- ${fmtPrim(x, fd.type)}`)); }
        } else {
          lines.push(`${ind}${fd.name}:`);
          arr.forEach(x => { const sub = toYaml(x, fd.type, ind + '  ').split('\n'); sub[0] = ind + '- ' + sub[0].slice(ind.length + 2); lines.push(sub.join('\n')); });
        }
      } else if (PRIM.has(fd.type)) lines.push(`${ind}${fd.name}: ${fmtPrim(v, fd.type)}`);
      else {
        const sf = fieldsOf(fd.type);
        if (sf && !sf.fields.length) lines.push(`${ind}${fd.name}: {}`);
        else { lines.push(`${ind}${fd.name}:`); lines.push(toYaml(v || make(fd.type), fd.type, ind + '  ')); }
      }
    });
    return lines.join('\n');
  }
  /** 한 줄 flow YAML (예: {linear: {x: 2.0}, angular: {z: 1.8}}) */
  function toFlow(o, type) {
    const f = fieldsOf(type);
    if (!f) return JSON.stringify(o);
    return '{' + f.fields.map(fd => {
      const v = (o || {})[fd.name];
      if (fd.array != null) return `${fd.name}: [${(v || []).map(x => PRIM.has(fd.type) ? fmtPrim(x, fd.type) : toFlow(x, fd.type)).join(', ')}]`;
      if (PRIM.has(fd.type)) return `${fd.name}: ${fmtPrim(v, fd.type)}`;
      return `${fd.name}: ${toFlow(v, fd.type)}`;
    }).join(', ') + '}';
  }

  /* ---------------------------------------------- YAML 입력 (flow + 간단한 블록) */
  function parseYaml(src) {
    src = String(src == null ? '' : src).trim();
    if (!src) return {};
    if (src[0] !== '{' && src[0] !== '[' && /^\s*[\w-]+\s*:/m.test(src) && src.includes('\n')) return parseBlock(src);
    if (src[0] !== '{' && src[0] !== '[' && /^[\w-]+\s*:/.test(src)) src = '{' + src + '}';
    let i = 0;
    const ws = () => { while (i < src.length && /\s/.test(src[i])) i++; };
    function val() {
      ws();
      const c = src[i];
      if (c === '{') {
        i++; const o = {}; ws();
        if (src[i] === '}') { i++; return o; }
        for (;;) {
          ws(); const k = key(); ws();
          if (src[i] !== ':') throw new Error(`':' 가 필요합니다 (위치 ${i})`);
          i++; o[k] = val(); ws();
          if (src[i] === ',') { i++; continue; }
          if (src[i] === '}') { i++; return o; }
          throw new Error(`',' 또는 '}' 가 필요합니다 (위치 ${i})`);
        }
      }
      if (c === '[') {
        i++; const a = []; ws();
        if (src[i] === ']') { i++; return a; }
        for (;;) {
          a.push(val()); ws();
          if (src[i] === ',') { i++; continue; }
          if (src[i] === ']') { i++; return a; }
          throw new Error(`',' 또는 ']' 가 필요합니다 (위치 ${i})`);
        }
      }
      if (c === '"' || c === "'") { const q = c; i++; let s = ''; while (i < src.length && src[i] !== q) { if (src[i] === '\\' && q === '"') { i++; } s += src[i++]; } i++; return s; }
      let s = ''; while (i < src.length && !/[,}\]]/.test(src[i])) s += src[i++];
      return scalar(s.trim());
    }
    function key() { let s = ''; if (src[i] === '"' || src[i] === "'") { const q = src[i++]; while (src[i] !== q) s += src[i++]; i++; return s; } while (i < src.length && /[\w\-.]/.test(src[i])) s += src[i++]; if (!s) throw new Error(`키 이름이 필요합니다 (위치 ${i})`); return s; }
    const v = val(); ws();
    if (i < src.length) throw new Error(`해석하지 못한 부분: "${src.slice(i, i + 20)}"`);
    return v;
  }
  function scalar(s) {
    if (/^(true|True)$/.test(s)) return true;
    if (/^(false|False)$/.test(s)) return false;
    if (/^(null|~)$/.test(s)) return null;
    if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return Number(s);
    return s;
  }
  function parseBlock(src) {
    // 들여쓰기 블록 YAML (파라미터 파일 수준)
    const lines = src.split('\n').map(l => l.replace(/\s+#.*$/, '')).filter(l => l.trim() && !/^\s*#/.test(l));
    let i = 0;
    function block(ind) {
      const o = {};
      while (i < lines.length) {
        const l = lines[i]; const cur = l.match(/^\s*/)[0].length;
        if (cur < ind) break;
        const m = l.trim().match(/^(['"]?[\w\-./*]+['"]?)\s*:\s*(.*)$/); if (m) m[1] = m[1].replace(/^['"]|['"]$/g, '');
        if (!m) { i++; continue; }
        i++;
        if (m[2] === '') { const nx = lines[i]; const ni = nx ? nx.match(/^\s*/)[0].length : 0; o[m[1]] = ni > cur ? block(ni) : null; }
        else o[m[1]] = m[2][0] === '{' || m[2][0] === '[' ? parseYaml(m[2]) : scalar(m[2].replace(/^['"]|['"]$/g, ''));
      }
      return o;
    }
    return block(0);
  }

  /** ros2 interface show 출력 (중첩 타입을 탭으로 펼침) */
  function showIface(type, opts) {
    const f = iface(type);
    if (!f) return null;
    if (opts && opts.raw) return f.text;
    const out = [];
    const expand = (t, ind) => {
      const ff = iface(t); if (!ff) return;
      ff.text.split('\n').forEach(line => {
        const s = line.replace(/#.*$/, '').trim();
        out.push(ind + line);
        const m = s.match(/^([\w/]+)(\[(<=)?\d*\])?\s+\w+(\s+\S+)?\s*$/);
        if (m && !PRIM.has(m[1])) expand(resolveFieldType(m[1], ff.pkg), ind + '\t');
      });
    };
    const texts = f.text.split(/^---\s*$/m);
    texts.forEach((t, k) => {
      if (k) out.push('---');
      t.replace(/^\n+|\n+$/g, '').split('\n').forEach(line => {
        const s = line.replace(/#.*$/, '').trim();
        out.push(line);
        const m = s.match(/^([\w/]+)(\[(<=)?\d*\])?\s+\w+(\s+\S+)?\s*$/);
        if (m && !PRIM.has(m[1])) expand(resolveFieldType(m[1], f.pkg), '\t');
      });
    });
    return out.join('\n');
  }

  /* ================================================== 수학 도우미 */
  const M = {
    yawToQ(y) { return { x: 0, y: 0, z: Math.sin(y / 2), w: Math.cos(y / 2) }; },
    rpyToQ(r, p, y) {
      const cr = Math.cos(r / 2), sr = Math.sin(r / 2), cp = Math.cos(p / 2), sp = Math.sin(p / 2), cy = Math.cos(y / 2), sy = Math.sin(y / 2);
      return { x: sr * cp * cy - cr * sp * sy, y: cr * sp * cy + sr * cp * sy, z: cr * cp * sy - sr * sp * cy, w: cr * cp * cy + sr * sp * sy };
    },
    qToRpy(q) {
      const { x, y, z, w } = q;
      const r = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
      const sp = 2 * (w * y - z * x);
      const p = Math.abs(sp) >= 1 ? Math.sign(sp) * Math.PI / 2 : Math.asin(sp);
      const yy = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
      return [r, p, yy];
    },
    qToYaw(q) { return Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z)); },
    qMul(a, b) { return { w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z, x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y, y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x, z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w }; },
    qInv(q) { return { x: -q.x, y: -q.y, z: -q.z, w: q.w }; },
    qRot(q, v) { const p = M.qMul(M.qMul(q, { w: 0, x: v.x, y: v.y, z: v.z }), M.qInv(q)); return { x: p.x, y: p.y, z: p.z }; },
    /** 변환 T = {t:{x,y,z}, q:{x,y,z,w}} */
    tMul(A, B) { const r = M.qRot(A.q, B.t); return { t: { x: A.t.x + r.x, y: A.t.y + r.y, z: A.t.z + r.z }, q: M.qMul(A.q, B.q) }; },
    tInv(A) { const qi = M.qInv(A.q); const r = M.qRot(qi, A.t); return { t: { x: -r.x, y: -r.y, z: -r.z }, q: qi }; },
    tIdent() { return { t: { x: 0, y: 0, z: 0 }, q: { x: 0, y: 0, z: 0, w: 1 } }; },
    normAngle(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; },
    deg(r) { return r * 180 / Math.PI; }, rad(d) { return d * Math.PI / 180; },
    clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  };

  /* ================================================== QoS */
  const QOS_DEFAULT = { history: 'keep_last', depth: 10, reliability: 'reliable', durability: 'volatile' };
  const QOS_PRESETS = {
    default: QOS_DEFAULT,
    sensor_data: { history: 'keep_last', depth: 5, reliability: 'best_effort', durability: 'volatile' },
    services_default: QOS_DEFAULT,
    parameters: { history: 'keep_last', depth: 1000, reliability: 'reliable', durability: 'volatile' },
    system_default: QOS_DEFAULT,
    latched: { history: 'keep_last', depth: 1, reliability: 'reliable', durability: 'transient_local' },
    tf_static: { history: 'keep_last', depth: 100, reliability: 'reliable', durability: 'transient_local' }
  };
  function qosOf(q) {
    if (q == null) return Object.assign({}, QOS_DEFAULT);
    if (typeof q === 'number') return Object.assign({}, QOS_DEFAULT, { depth: q });
    if (typeof q === 'string') return Object.assign({}, QOS_PRESETS[q] || QOS_DEFAULT);
    return Object.assign({}, QOS_DEFAULT, q);
  }
  /** 호환성: [ok, 이유] */
  function qosCompat(pub, sub) {
    if (pub.reliability === 'best_effort' && sub.reliability === 'reliable') return [false, 'RELIABILITY: 발행자 BEST_EFFORT ↔ 구독자 RELIABLE'];
    if (pub.durability === 'volatile' && sub.durability === 'transient_local') return [false, 'DURABILITY: 발행자 VOLATILE ↔ 구독자 TRANSIENT_LOCAL'];
    return [true, ''];
  }

  /* ================================================== 이벤트 */
  function Emitter() { const m = {}; return { on(e, f) { (m[e] = m[e] || []).push(f); return () => { m[e] = (m[e] || []).filter(x => x !== f); }; }, emit(e, ...a) { (m[e] || []).slice().forEach(f => { try { f(...a); } catch (err) { console.error(err); } }); } }; }

  /* ================================================== 이름 */
  function joinNs(ns, name) { ns = ns || '/'; if (!ns.startsWith('/')) ns = '/' + ns; return (ns.endsWith('/') ? ns : ns + '/') + name; }
  function resolveName(name, node) {
    name = String(name || '').trim();
    let full;
    if (name.startsWith('/')) full = name;
    else if (name.startsWith('~')) full = joinNs(node ? node.fqn : '/', name.replace(/^~\/?/, ''));
    else full = joinNs(node ? node.ns : '/', name);
    full = full.replace(/\/+/g, '/').replace(/(.)\/$/, '$1');
    if (node && node.remap && node.remap[full]) full = node.remap[full];
    if (node && node.remap && node.remap[name]) full = resolveName(node.remap[name], { ns: node.ns, fqn: node.fqn });
    return full;
  }

  /* ================================================== TF 버퍼 */
  function TFBuffer(graph) {
    const frames = {}; // child → {parent, T, stamp, static, auth}
    const api = {
      frames,
      set(ts, isStatic, auth) {
        const child = String(ts.child_frame_id || '').replace(/^\//, ''), parent = String(ts.header && ts.header.frame_id || '').replace(/^\//, '');
        if (!child || !parent || child === parent) return;
        const tr = ts.transform || {};
        frames[child] = { parent, T: { t: Object.assign({ x: 0, y: 0, z: 0 }, tr.translation), q: Object.assign({ x: 0, y: 0, z: 0, w: 1 }, tr.rotation) }, stamp: graph.now(), at: performance.now(), static: !!isStatic, auth: auth || 'default_authority', rate: 0 };
      },
      has(f) { f = String(f).replace(/^\//, ''); return !!frames[f] || Object.values(frames).some(x => x.parent === f); },
      chain(f) { const c = [f]; let g = f, n = 0; while (frames[g] && n++ < 64) { g = frames[g].parent; c.push(g); } return c; },
      /** frame 을 root 기준으로 */
      toRoot(f) { let T = M.tIdent(); let g = f, n = 0; while (frames[g] && n++ < 64) { T = M.tMul(frames[g].T, T); g = frames[g].parent; } return { root: g, T }; },
      /** target 좌표계에서 본 source 좌표계의 변환 (tf2_echo target source) */
      lookup(target, source) {
        target = String(target).replace(/^\//, ''); source = String(source).replace(/^\//, '');
        if (!api.has(target)) throw new Error(`"${target}" passed to lookupTransform argument target_frame does not exist.`);
        if (!api.has(source)) throw new Error(`"${source}" passed to lookupTransform argument source_frame does not exist.`);
        const a = api.toRoot(target), b = api.toRoot(source);
        if (a.root !== b.root) throw new Error(`Could not find a connection between '${target}' and '${source}' because they are not part of the same tree.Tf has two or more unconnected trees.`);
        return M.tMul(M.tInv(a.T), b.T);
      },
      list() { const all = new Set(); Object.entries(frames).forEach(([c, v]) => { all.add(c); all.add(v.parent); }); return [...all]; },
      clear() { Object.keys(frames).forEach(k => delete frames[k]); }
    };
    return api;
  }

  /* ================================================== 그래프 */
  const LEVEL = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, FATAL: 50 };
  const graph = {
    nodes: new Map(), topics: new Map(), services: new Map(), actions: new Map(),
    ev: Emitter(), t0: Date.now(), p0: performance.now(), domain: 0
  };
  graph.now = () => { const ms = graph.t0 + (performance.now() - graph.p0); return { sec: Math.floor(ms / 1000), nanosec: Math.floor((ms % 1000) * 1e6) }; };
  graph.nowSec = () => (graph.t0 + (performance.now() - graph.p0)) / 1000;
  graph.stampStr = () => { const t = graph.now(); return `${t.sec}.${String(t.nanosec).padStart(9, '0')}`; };
  graph.tf = TFBuffer(graph);
  let changeT = null;
  function changed() { if (changeT) return; changeT = setTimeout(() => { changeT = null; graph.ev.emit('graph'); }, 30); }

  function topicRec(name) {
    let t = graph.topics.get(name);
    if (!t) { t = { name, pubs: [], subs: [], stamps: [], bytes: [], count: 0, last: null, lastType: null }; graph.topics.set(name, t); }
    return t;
  }
  function topicType(t) { const e = t.pubs[0] || t.subs[0]; return e ? e.type : t.lastType; }
  function gcTopic(name) { const t = graph.topics.get(name); if (t && !t.pubs.length && !t.subs.length) graph.topics.delete(name); }

  function deliver(t, pub, msg) {
    t.subs.forEach(s => {
      if (s.type !== pub.type) { if (!s._warned) { s._warned = true; s.node.log('WARN', `토픽 ${t.name} 의 타입이 다릅니다: 발행 ${pub.type} ↔ 구독 ${s.type}`); } return; }
      const [ok, why] = qosCompat(pub.qos, s.qos);
      if (!ok) { if (!s._qosWarned) { s._qosWarned = true; s.node.log('WARN', `New publisher discovered on topic '${t.name}', offering incompatible QoS. No messages will be received from it. Last incompatible policy: ${why.split(':')[0]}`); } return; }
      if (s.filter && !s.filter(pub)) return;
      const copy = cloneMsg(msg);
      queueMicrotask(() => { if (!s.dead) { try { s.cb(copy, { publisher: pub.node.fqn }); } catch (e) { s.node.log('ERROR', '콜백 오류: ' + e.message); console.error(e); } } });
    });
  }
  function cloneMsg(m) { try { return structuredClone(m); } catch (_) { return JSON.parse(JSON.stringify(m)); } }

  /* ================================================== 노드 */
  let nodeSeq = 0;
  class Node {
    constructor(name, opts = {}) {
      this.id = ++nodeSeq;
      this.name = name;
      this.ns = (opts.namespace || opts.ns || '/').replace(/\/$/, '') || '/';
      if (!this.ns.startsWith('/')) this.ns = '/' + this.ns;
      this.fqn = joinNs(this.ns, name);
      this.remap = {};
      Object.entries(opts.remap || {}).forEach(([a, b]) => { this.remap[resolveName(a, { ns: this.ns, fqn: this.fqn })] = resolveName(b, { ns: this.ns, fqn: this.fqn }); });
      this.owner = opts.owner || null;
      this.pkg = opts.pkg || ''; this.exe = opts.exe || '';
      this.lang = opts.lang || 'js';
      this.out = opts.out || null;          // 로그를 받을 곳 (터미널)
      this.pubs = []; this.subs = []; this.srvs = []; this.clients = []; this.asrvs = []; this.aclients = []; this.timers = [];
      this.params = new Map(); this.paramCbs = [];
      this.hidden = !!opts.hidden;
      this.alive = true;
      if (!this.hidden) {
        this._rosout = this.createPublisher('rcl_interfaces/msg/Log', '/rosout', { depth: 1000, durability: 'transient_local' });
        this._pev = this.createPublisher('rcl_interfaces/msg/ParameterEvent', '/parameter_events', 'parameters');
      }
      this._override = Object.assign({}, opts.params || {});
      this.declareParameter('use_sim_time', false, { description: '시뮬레이션 시간 사용 (/clock 구독)' });
      const dup = !this.hidden && [...graph.nodes.values()].some(n => n.fqn === this.fqn && !n.hidden);
      graph.nodes.set(this.id, this);
      if (dup) this.log('WARN', 'Publisher already registered for node name: \'' + this.logger + '\'. If this is due to multiple nodes with the same name then all logs for the logger named \'' + this.logger + '\' will go out over the existing publisher. As soon as any node with that name is destructed it will unregister the publisher, preventing any further logs for that name from being published on the rosout topic.');
      changed();
    }
    get logger() { return this.fqn.slice(1).replace(/\//g, '.'); }
    log(level, text) {
      const line = `[${level}] [${graph.stampStr()}] [${this.logger}]: ${text}`;
      if (this.out) this.out(line, level);
      else if (level !== 'DEBUG') console.log(line);
      if (this._rosout && this.alive) this._rosout.publish({ stamp: graph.now(), level: LEVEL[level] || 20, name: this.logger, msg: String(text), file: '', function: '', line: 0 });
      graph.ev.emit('log', { level, node: this.fqn, text, line });
    }
    info(t) { this.log('INFO', t); } warn(t) { this.log('WARN', t); } error(t) { this.log('ERROR', t); } debug(t) { this.log('DEBUG', t); }

    /* ---------- 토픽 */
    createPublisher(type, topic, qos) {
      type = normType(type);
      const name = resolveName(topic, this);
      const t = topicRec(name);
      const pub = { node: this, topic: name, type, qos: qosOf(qos), kept: [], count: 0, dead: false };
      pub.publish = (m) => {
        if (pub.dead) return;
        const msg = m && m.__proto__ === Object.prototype ? m : Object.assign({}, m);
        pub.count++; t.count++; t.last = msg; t.lastType = type;
        const now = performance.now(); t.stamps.push(now); if (t.stamps.length > 100) t.stamps.shift();
        if (pub.qos.durability === 'transient_local') { pub.kept.push(cloneMsg(msg)); while (pub.kept.length > pub.qos.depth) pub.kept.shift(); }
        if (name === '/tf' || name === '/tf_static') (msg.transforms || []).forEach(ts => graph.tf.set(ts, name === '/tf_static', this.fqn));
        deliver(t, pub, msg);
        graph.ev.emit('pub', name, msg, pub);
      };
      pub.getSubscriptionCount = () => t.subs.length;
      pub.destroy = () => { pub.dead = true; t.pubs = t.pubs.filter(x => x !== pub); this.pubs = this.pubs.filter(x => x !== pub); gcTopic(name); changed(); };
      t.pubs.push(pub); this.pubs.push(pub);
      // 늦게 온 transient_local 구독자에게는 subscription 쪽에서 처리
      changed();
      return pub;
    }
    createSubscription(type, topic, cb, qos, opts) {
      type = normType(type);
      const name = resolveName(topic, this);
      const t = topicRec(name);
      const sub = { node: this, topic: name, type, cb, qos: qosOf(qos), dead: false, filter: opts && opts.filter };
      sub.destroy = () => { sub.dead = true; t.subs = t.subs.filter(x => x !== sub); this.subs = this.subs.filter(x => x !== sub); gcTopic(name); changed(); };
      t.subs.push(sub); this.subs.push(sub);
      if (sub.qos.durability === 'transient_local') {
        t.pubs.forEach(p => { if (p.qos.durability === 'transient_local' && p.type === type) p.kept.forEach(m => { const c = cloneMsg(m); queueMicrotask(() => !sub.dead && cb(c, { publisher: p.node.fqn, latched: true })); }); });
      }
      changed();
      return sub;
    }
    /* ---------- 서비스 */
    createService(type, name, handler) {
      type = normType(type).replace('/msg/', '/srv/');
      const full = resolveName(name, this);
      if (graph.services.has(full)) this.log('WARN', `서비스 ${full} 가 이미 있습니다 (나중 것이 응답합니다)`);
      const srv = { node: this, name: full, type, handler, count: 0 };
      srv.destroy = () => { if (graph.services.get(full) === srv) graph.services.delete(full); this.srvs = this.srvs.filter(x => x !== srv); changed(); };
      graph.services.set(full, srv); this.srvs.push(srv); changed();
      return srv;
    }
    createClient(type, name) {
      type = normType(type).replace('/msg/', '/srv/');
      const full = resolveName(name, this);
      const cli = {
        node: this, name: full, type,
        isReady: () => graph.services.has(full),
        async waitForService(timeoutSec = 1) { const end = performance.now() + timeoutSec * 1000; while (performance.now() < end) { if (graph.services.has(full)) return true; await sleep(50); } return graph.services.has(full); },
        call: (req) => callService(full, type, req, this)
      };
      cli.destroy = () => { this.clients = this.clients.filter(x => x !== cli); changed(); };
      this.clients.push(cli); changed();
      return cli;
    }
    /* ---------- 액션 */
    createActionServer(type, name, h) {
      type = normType(type).replace('/msg/', '/action/');
      const full = resolveName(name, this);
      const as = { node: this, name: full, type, h, goals: new Map() };
      as.destroy = () => { if (graph.actions.get(full) === as) graph.actions.delete(full); this.asrvs = this.asrvs.filter(x => x !== as); as.goals.forEach(g => g._abort && g._abort()); changed(); };
      graph.actions.set(full, as); this.asrvs.push(as); changed();
      return as;
    }
    createActionClient(type, name) {
      type = normType(type).replace('/msg/', '/action/');
      const full = resolveName(name, this);
      const ac = {
        node: this, name: full, type,
        isReady: () => graph.actions.has(full),
        async waitForServer(timeoutSec = 1) { const end = performance.now() + timeoutSec * 1000; while (performance.now() < end) { if (graph.actions.has(full)) return true; await sleep(50); } return graph.actions.has(full); },
        sendGoal: (goal, opts) => sendGoal(full, type, goal, opts || {}, this)
      };
      ac.destroy = () => { this.aclients = this.aclients.filter(x => x !== ac); changed(); };
      this.aclients.push(ac); changed();
      return ac;
    }
    /* ---------- 파라미터 */
    declareParameter(name, value, desc) {
      if (this._override && name in this._override) value = this._override[name];
      if (!this.params.has(name)) this.params.set(name, { name, value, type: (desc && desc.type) || ptype(value), desc: desc || {} });
      changed();
      return this.params.get(name).value;
    }
    getParameter(name) { const p = this.params.get(name); return p ? p.value : undefined; }
    hasParameter(name) { return this.params.has(name); }
    /** [{name, value}] → [{successful, reason}] */
    setParameters(list) {
      return list.map(({ name, value }) => {
        const p = this.params.get(name);
        if (!p) return { successful: false, reason: `parameter '${name}' is not declared` };
        if (p.desc && p.desc.read_only) return { successful: false, reason: `Trying to set a read-only parameter: ${name}.` };
        const nt = ptype(value);
        if (p.type !== nt && !(p.type === 'double' && nt === 'integer') && !(p.desc && p.desc.dynamic_typing)) return { successful: false, reason: `Wrong parameter type, parameter {${name}} is of type {${p.type}}, setting it to {${nt}} is not allowed.` };
        if (p.type === 'double' && nt === 'integer') value = Number(value);
        for (const cb of this.paramCbs) { const r = cb([{ name, value, type: p.type }]); if (r && r.successful === false) return { successful: false, reason: r.reason || '' }; }
        p.value = value;
        if (this._pev) this._pev.publish({ stamp: graph.now(), node: this.fqn, new_parameters: [], changed_parameters: [name], deleted_parameters: [] });
        graph.ev.emit('param', this, name, value);
        return { successful: true, reason: '' };
      });
    }
    onSetParameters(cb) { this.paramCbs.push(cb); return () => { this.paramCbs = this.paramCbs.filter(x => x !== cb); }; }
    /* ---------- 타이머 */
    createTimer(periodSec, cb) {
      const id = setInterval(() => { if (!this.alive) return; try { cb(); } catch (e) { this.log('ERROR', '타이머 콜백 오류: ' + e.message); console.error(e); } }, Math.max(5, periodSec * 1000));
      const tm = { id, cancel: () => clearInterval(id) };
      this.timers.push(tm);
      return tm;
    }
    now() { return graph.now(); }
    destroy() {
      if (!this.alive) return;
      this.alive = false;
      this.timers.forEach(t => t.cancel());
      [...this.pubs].forEach(p => p.destroy()); [...this.subs].forEach(s => s.destroy());
      [...this.srvs].forEach(s => s.destroy()); [...this.clients].forEach(c => c.destroy());
      [...this.asrvs].forEach(a => a.destroy()); [...this.aclients].forEach(a => a.destroy());
      graph.nodes.delete(this.id);
      if (this.onDestroy) try { this.onDestroy(); } catch (_) {}
      changed();
    }
  }
  function ptype(v) {
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'double';
    if (typeof v === 'string') return 'string';
    if (Array.isArray(v)) { if (!v.length) return 'string_array'; const t = ptype(v[0]); return t === 'bool' ? 'bool_array' : t === 'integer' ? 'integer_array' : t === 'double' ? 'double_array' : 'string_array'; }
    return 'not set';
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function callService(name, type, req, fromNode) {
    const srv = graph.services.get(name);
    if (!srv) return Promise.reject(new Error(`서비스 ${name} 를 찾을 수 없습니다`));
    if (type && srv.type !== normType(type).replace('/msg/', '/srv/')) return Promise.reject(new Error(`서비스 타입이 다릅니다: ${srv.type}`));
    srv.count++;
    const request = make(partType(srv.type, 0), req || {});
    const response = make(partType(srv.type, 1));
    graph.ev.emit('srvcall', name, request, fromNode);
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          let r = srv.handler(request, response);
          if (r && typeof r.then === 'function') r = await r;
          const res = r === undefined ? response : r;
          graph.ev.emit('srvres', name, res);
          resolve(res);
        } catch (e) { reject(e); }
      }, 4);
    });
  }

  /* ---------------------------------------------- 액션 목표 처리 */
  const STATUS = { UNKNOWN: 0, ACCEPTED: 1, EXECUTING: 2, CANCELING: 3, SUCCEEDED: 4, CANCELED: 5, ABORTED: 6 };
  let goalSeq = 0;
  function uuid() { return Array.from({ length: 16 }, () => Math.floor(Math.random() * 256)); }
  function sendGoal(name, type, goal, opts, fromNode) {
    const as = graph.actions.get(name);
    if (!as) return Promise.reject(new Error(`액션 서버 ${name} 를 찾을 수 없습니다`));
    const g = {
      id: ++goalSeq, uuid: uuid(), server: as, status: STATUS.ACCEPTED,
      request: make(partType(as.type, 0), goal || {}),
      cancelRequested: false, fb: opts.feedback,
    };
    const hex = g.uuid.map(b => b.toString(16).padStart(2, '0')).join('');
    g.idStr = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    let resolveResult;
    const resultP = new Promise(r => { resolveResult = r; });
    const handle = {
      get request() { return g.request; }, goalId: g.idStr,
      get isCancelRequested() { return g.cancelRequested; },
      get isActive() { return g.status <= 3; },
      publishFeedback(fb) { if (g.status > 3) return; const f = make(partType(as.type, 2), fb); graph.ev.emit('afb', name, f); if (g.fb) queueMicrotask(() => g.fb(cloneMsg(f))); },
      succeed(res) { finish(STATUS.SUCCEEDED, res); }, abort(res) { finish(STATUS.ABORTED, res); }, canceled(res) { finish(STATUS.CANCELED, res); },
      execute() { g.status = STATUS.EXECUTING; }
    };
    function finish(st, res) {
      if (g.status > 3) return;
      g.status = st; as.goals.delete(g.id);
      const r = make(partType(as.type, 1), res || {});
      graph.ev.emit('aresult', name, st, r);
      resolveResult({ status: st, result: r });
    }
    g._abort = () => finish(STATUS.ABORTED);
    // 목표 수락 여부
    let accept = true;
    if (as.h.goal) { const r = as.h.goal(g.request); if (r === false) accept = false; }
    if (!accept) return Promise.resolve({ accepted: false, goalId: g.idStr, result: Promise.resolve({ status: STATUS.ABORTED, result: make(partType(as.type, 1)) }), cancel: async () => false });
    as.goals.set(g.id, g);
    graph.ev.emit('agoal', name, g.request, fromNode);
    setTimeout(async () => {
      g.status = STATUS.EXECUTING;
      try {
        const r = await as.h.execute(handle);
        if (g.status <= 3) { if (g.cancelRequested) finish(STATUS.CANCELED, r); else finish(STATUS.SUCCEEDED, r); }
      } catch (e) { as.node.log('ERROR', '액션 실행 오류: ' + e.message); console.error(e); finish(STATUS.ABORTED); }
    }, 5);
    return Promise.resolve({
      accepted: true, goalId: g.idStr, result: resultP,
      cancel: async () => { if (g.status > 3) return false; const ok = as.h.cancel ? as.h.cancel(g.request) !== false : true; if (ok) { g.cancelRequested = true; g.status = STATUS.CANCELING; } return ok; }
    });
  }

  /* ================================================== 공개 API */
  const ROS = {
    graph, iface, showIface, make, merge, toYaml, toFlow, parseYaml, normType, partType, fieldsOf, PRIM, math: M, STATUS, LEVEL,
    qosOf, qosCompat, QOS_PRESETS, resolveName, sleep, cloneMsg,
    createNode(name, opts) { return new Node(name, opts || {}); },
    Node,
    nodes() { return [...graph.nodes.values()].filter(n => !n.hidden); },
    findNode(fqn) { fqn = fqn.startsWith('/') ? fqn : '/' + fqn; return ROS.nodes().find(n => n.fqn === fqn); },
    topicList() { return [...graph.topics.values()].filter(t => t.pubs.length || t.subs.length).map(t => ({ name: t.name, type: topicType(t), pubs: t.pubs.length, subs: t.subs.length })).sort((a, b) => a.name.localeCompare(b.name)); },
    topic(name) { return graph.topics.get(name); },
    topicType(name) { const t = graph.topics.get(name); return t ? topicType(t) : null; },
    serviceList() { return [...graph.services.values()].map(s => ({ name: s.name, type: s.type, node: s.node.fqn })).sort((a, b) => a.name.localeCompare(b.name)); },
    actionList() { return [...graph.actions.values()].map(a => ({ name: a.name, type: a.type, node: a.node.fqn })).sort((a, b) => a.name.localeCompare(b.name)); },
    callService,
    sendGoal: (name, goal, opts) => { const a = graph.actions.get(name); return a ? sendGoal(name, a.type, goal, opts || {}, null) : Promise.reject(new Error(`액션 서버 ${name} 를 찾을 수 없습니다`)); },
    /** 한 번만 발행 (임시 노드) */
    publishOnce(topic, type, msg) { const n = ROS.createNode('_ros2cli_' + Math.floor(Math.random() * 1e6), { hidden: true }); const p = n.createPublisher(type, topic); p.publish(ROS.make(type, msg)); setTimeout(() => n.destroy(), 50); },
    hz(name) { const t = graph.topics.get(name); if (!t || t.stamps.length < 2) return 0; const s = t.stamps.filter(x => performance.now() - x < 3000); if (s.length < 2) return 0; return (s.length - 1) / ((s[s.length - 1] - s[0]) / 1000); },
    on: (e, f) => graph.ev.on(e, f),
    /* 실행 파일 · 런치 등록소 (ros-pkgs.js 에서 채움) */
    pkgs: {},
    registerPkg(name, def) { ROS.pkgs[name] = Object.assign(ROS.pkgs[name] || { exes: {}, launch: {} }, def); ROS.pkgs[name].exes = Object.assign({}, ROS.pkgs[name].exes, def.exes || {}); ROS.pkgs[name].launch = Object.assign({}, ROS.pkgs[name].launch, def.launch || {}); },
    /** 모든 노드 정리 (페이지 전환 시) */
    resetAll() { ROS.nodes().forEach(n => n.destroy()); graph.tf.clear(); }
  };

  // 주인(위젯 DOM)이 사라진 노드를 정리
  setInterval(() => {
    graph.nodes.forEach(n => { if (n.owner && !n.owner.isConnected && !n.keep) n.destroy(); });
  }, 800);

  window.ROS = ROS;
})();
