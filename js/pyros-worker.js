/* pyros-worker.js — Pyodide + rclpy(호환판) 을 메인 스레드와 떨어진 곳에서 실행한다.
 *
 * 왜 워커인가: 학생 코드의 while True: 나 time.sleep() 이 페이지를 멈추지 않게.
 * 모든 ROS 통신은 메인 스레드(WebROS 그래프)에 postMessage 로 보내고,
 * 메인이 보내 준 이벤트(구독 메시지 · 서비스 요청 …)는 큐에 쌓았다가 rclpy.spin() 이 꺼내 처리한다.
 *
 *   JSPI 있음  → 코드 그대로 실행, pyodide.ffi.run_sync 로 진짜 기다림(blocking)
 *   JSPI 없음  → webros_rt.asyncify 가 코드를 await 형태로 바꿔 실행
 *
 * main → worker : init | run | ev | cancel
 * worker → main : status | ready | fatal | stdout | stderr | op | done
 */
'use strict';

const PYODIDE_VERSION = '0.29.5';
const PYODIDE_BASE = 'https://cdn.jsdelivr.net/pyodide/v' + PYODIDE_VERSION + '/full/';
const MOUNT = '/home/pyodide/webros';
const FILES = [
  'webros_rt/__init__.py', 'webros_rt/asyncify.py',
  'rclpy/__init__.py', 'rclpy/_impl.py', 'rclpy/node.py', 'rclpy/qos.py', 'rclpy/parameter.py', 'rclpy/executors.py',
  'rclpy/callback_groups.py', 'rclpy/time.py', 'rclpy/duration.py', 'rclpy/clock.py', 'rclpy/logging.py', 'rclpy/task.py',
  'rclpy/exceptions.py', 'rclpy/publisher.py', 'rclpy/subscription.py', 'rclpy/timer.py', 'rclpy/utilities.py',
  'rclpy/action/__init__.py', 'rclpy/action/server.py', 'rclpy/action/client.py',
  'tf2_ros/__init__.py', 'tf2_ros/buffer.py', 'tf2_ros/transform_listener.py', 'tf2_ros/transform_broadcaster.py', 'tf2_ros/static_transform_broadcaster.py',
  'tf_transformations.py'
];

let pyodide = null, rt = null, jspi = false, running = false, cancelled = false;
const queue = [];
let waiter = null;
const post = m => self.postMessage(m);

// setTimeout 은 중첩되면 4ms 이상으로 늘어나므로 짧은 대기는 MessageChannel 로
const mc = new MessageChannel(); const mcQ = [];
mc.port1.onmessage = () => { const f = mcQ.shift(); if (f) f(); };
const yieldNow = () => new Promise(r => { mcQ.push(r); mc.port2.postMessage(0); });
async function sleepMs(ms) {
  if (!(ms > 0)) { await yieldNow(); return; }
  if (ms >= 6) { await new Promise(r => setTimeout(r, ms)); return; }
  const until = performance.now() + ms; do { await yieldNow(); } while (performance.now() < until);
}

const transport = {
  post(json) { post({ type: 'op', op: JSON.parse(json) }); },
  take() { if (!queue.length) return '[]'; return JSON.stringify(queue.splice(0), (k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v)); },
  wait(ms) {
    if (queue.length || cancelled) return Promise.resolve();
    return new Promise(r => {
      const tm = setTimeout(() => { waiter = null; r(); }, Math.max(0, ms));
      waiter = () => { clearTimeout(tm); waiter = null; r(); };
    });
  },
  sleep(ms) { return sleepMs(Number(ms)); },
  cancelled() { return cancelled; },
  now() { return Date.now() / 1000; }
};
function push(ev) { queue.push(ev); if (waiter) waiter(); }

async function init(opts) {
  post({ type: 'status', text: 'Pyodide ' + PYODIDE_VERSION + ' 내려받는 중… (처음 한 번은 10~20초 걸릴 수 있어요)' });
  importScripts(PYODIDE_BASE + 'pyodide.js');
  pyodide = await self.loadPyodide({ indexURL: PYODIDE_BASE });
  pyodide.setStdout({ batched: s => post({ type: 'stdout', text: s }) });
  pyodide.setStderr({ batched: s => post({ type: 'stderr', text: s }) });
  pyodide.setStdin({ stdin: () => undefined });
  post({ type: 'status', text: 'rclpy 준비 중…' });
  const files = await Promise.all(FILES.map(async rel => {
    const res = await fetch(opts.pyBase + rel + '?v=' + (opts.ver || '1'));
    if (!res.ok) throw new Error(rel + ' → HTTP ' + res.status);
    return [rel, await res.text()];
  }));
  for (const [rel, text] of files) {
    const path = MOUNT + '/' + rel;
    pyodide.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')));
    pyodide.FS.writeFile(path, text);
  }
  pyodide.registerJsModule('webros_transport', transport);
  pyodide.runPython('import sys\nsys.path.insert(0, ' + JSON.stringify(MOUNT) + ')\nimport webros_rt\nwebros_rt.install_import_hook()\nwebros_rt.patch_time()\n');
  rt = pyodide.pyimport('webros_rt');
  rt.set_ifaces_json(JSON.stringify(opts.ifaces));
  try {
    const probe = pyodide.runPython('def _probe():\n    from pyodide.ffi import can_run_sync\n    return bool(can_run_sync())\n_probe');
    jspi = typeof probe.callPromising === 'function' ? !!(await probe.callPromising()) : false;
    probe.destroy();
  } catch (e) { jspi = false; }
  if (opts.forceAsync) jspi = false;
  rt.set_mode(jspi ? 'jspi' : 'async');
  post({ type: 'ready', mode: jspi ? 'jspi' : 'async', pyodide: PYODIDE_VERSION, python: pyodide.runPython('import sys; sys.version.split()[0]') });
}

async function run(msg) {
  if (running) { post({ type: 'done', status: 'busy' }); return; }
  running = true; cancelled = false; queue.length = 0;
  let status = 'error';
  try {
    try { await pyodide.loadPackagesFromImports(msg.code, { messageCallback: () => {} }); } catch (e) { /* 문법 오류는 아래에서 */ }
    const argv = JSON.stringify(msg.argv || [msg.filename]);
    const ra = JSON.stringify(msg.rosArgs || {});
    if (jspi) status = await rt.run_sync_mode.callPromising(msg.code, msg.filename, msg.entry || null, argv, ra);
    else status = await rt.run_async_mode(msg.code, msg.filename, msg.entry || null, argv, ra);
  } catch (e) {
    post({ type: 'stderr', text: String(e && e.message ? e.message : e) });
    status = 'error';
  } finally {
    running = false;
    post({ type: 'done', status: String(status) });
  }
}

self.onmessage = ev => {
  const m = ev.data || {};
  if (m.type === 'init') init(m).catch(e => post({ type: 'fatal', error: String(e && e.message ? e.message : e) }));
  else if (m.type === 'run') run(m);
  else if (m.type === 'ev') push(m.ev);
  else if (m.type === 'evs') m.evs.forEach(push);
  else if (m.type === 'cancel') { cancelled = true; push({ kind: 'cancel' }); }
};
