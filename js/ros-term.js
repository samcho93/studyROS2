/* ===================================================================
   ROS 2 터미널 — 브라우저 안의 bash + ros2 CLI
   ros2 node/topic/service/action/param/interface/pkg/bag/run/launch/doctor,
   가상 파일 시스템(~/ros2_ws), ros2 pkg create → colcon build → ros2 run (파이썬 노드는 Pyodide 로 실행)
   =================================================================== */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const HOME = '/home/user';

  /* ================================================== 가상 파일 시스템 */
  const VFS = (function () {
    const KEY = 'r2:vfs';
    let files = null; // path → string (디렉터리는 path + '/' 키에 true)
    function load() {
      if (files) return;
      try { files = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) { files = null; }
      if (!files) { files = {}; mkdir(HOME + '/ros2_ws/src'); }
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(files)); } catch (_) {} }
    function norm(p, cwd) {
      if (!p) return cwd;
      p = p.replace(/^~(?=\/|$)/, HOME);
      if (!p.startsWith('/')) p = (cwd || HOME) + '/' + p;
      const out = [];
      p.split('/').forEach(s => { if (!s || s === '.') return; if (s === '..') out.pop(); else out.push(s); });
      return '/' + out.join('/');
    }
    function isDir(p) { load(); return p === '/' || !!files[p + '/'] || Object.keys(files).some(k => k.startsWith(p + '/')); }
    function isFile(p) { load(); return typeof files[p] === 'string'; }
    function read(p) { load(); return files[p]; }
    function write(p, s) { load(); mkdir(p.slice(0, p.lastIndexOf('/')) || '/'); files[p] = String(s); save(); }
    function mkdir(p) { load(); const parts = p.split('/').filter(Boolean); let cur = ''; parts.forEach(s => { cur += '/' + s; files[cur + '/'] = true; }); save(); }
    function rm(p, rec) { load(); let n = 0; Object.keys(files).forEach(k => { if (k === p || k === p + '/' || (rec && k.startsWith(p + '/'))) { delete files[k]; n++; } }); save(); return n; }
    function ls(p) {
      load();
      const set = new Map();
      Object.keys(files).forEach(k => {
        if (!k.startsWith(p === '/' ? '/' : p + '/')) return;
        const rest = k.slice(p === '/' ? 1 : p.length + 1);
        if (!rest) return;
        const name = rest.split('/')[0];
        const dir = rest.includes('/');
        if (name) set.set(name, set.get(name) || dir);
      });
      return [...set.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, dir]) => ({ name, dir }));
    }
    function reset() { files = {}; mkdir(HOME + '/ros2_ws/src'); save(); }
    return { norm, isDir, isFile, read, write, mkdir, rm, ls, reset, get all() { load(); return files; } };
  })();

  /* ================================================== 사용자 패키지 (colcon build 결과) */
  const WS = HOME + '/ros2_ws';
  const built = {}; // pkg → { type, exes: {name: {file, func}}, launch: {file: path}, path }
  function loadBuilt() { try { Object.assign(built, JSON.parse(localStorage.getItem('r2:built') || '{}')); } catch (_) {} }
  function saveBuilt() { try { localStorage.setItem('r2:built', JSON.stringify(built)); } catch (_) {} }
  loadBuilt();
  let sourced = { ws: false };

  function scanPackages() {
    const pkgs = [];
    const walk = (dir, depth) => {
      if (depth > 3) return;
      if (VFS.isFile(dir + '/package.xml')) { pkgs.push(dir); return; }
      VFS.ls(dir).filter(e => e.dir).forEach(e => walk(dir + '/' + e.name, depth + 1));
    };
    walk(WS + '/src', 0);
    return pkgs.map(dir => {
      const xml = VFS.read(dir + '/package.xml') || '';
      const name = (xml.match(/<name>\s*([\w-]+)\s*<\/name>/) || [])[1] || dir.split('/').pop();
      const type = (xml.match(/<build_type>\s*([\w_]+)\s*<\/build_type>/) || [])[1] || 'ament_python';
      const deps = [...xml.matchAll(/<(?:depend|exec_depend|build_depend)>\s*([\w-]+)\s*</g)].map(m => m[1]);
      return { dir, name, type, deps };
    });
  }
  function entryPoints(dir, name) {
    const setup = VFS.read(dir + '/setup.py') || '';
    const exes = {};
    const block = setup.match(/console_scripts['"]\s*:\s*\[([\s\S]*?)\]/);
    if (block) [...block[1].matchAll(/['"]\s*([\w-]+)\s*=\s*([\w.]+):(\w+)\s*['"]/g)].forEach(m => { exes[m[1]] = { file: dir + '/' + m[2].replace(/\./g, '/') + '.py', func: m[3] }; });
    return exes;
  }
  function registerBuilt() {
    Object.entries(built).forEach(([name, b]) => {
      ROS.registerPkg(name, {
        desc: '내 패키지 (~/ros2_ws)', user: true,
        exes: Object.fromEntries(Object.entries(b.exes || {}).map(([exe, ep]) => [exe, ctx => runUserPython(ctx, ep, name, exe)])),
        launch: Object.fromEntries(Object.entries(b.launch || {}).map(([f, path]) => [f, ctx => runLaunchText(ctx, VFS.read(path) || '', path)]))
      });
    });
  }
  function runUserPython(ctx, ep, pkg, exe) {
    const code = VFS.read(ep.file);
    if (code == null) { ctx.err(`[ros2run]: No such file: ${ep.file}`); return { oneshot: true }; }
    if (!window.PyROS) { ctx.err('파이썬 실행기(PyROS)를 불러오지 못했습니다'); return { oneshot: true }; }
    const run = PyROS.run(code, { filename: ep.file.split('/').pop(), entry: ep.func, argv: [exe].concat(ctx.argv), rosArgs: ctx.args, out: ctx.out, err: ctx.err, onExit: code => ctx.exit(code) });
    return { stop() { run.stop(); } };
  }

  /* ---------------------------------------------- 파이썬 런치 파일 간이 해석 */
  function parseLaunchPy(text) {
    const nodes = [];
    const bodies = [];
    const re = /\bNode\s*\(/g;
    let m;
    while ((m = re.exec(text))) {
      let i = m.index + m[0].length, depth = 1, q = null;
      for (; i < text.length && depth; i++) {
        const c = text[i];
        if (q) { if (c === q && text[i - 1] !== '\\') q = null; continue; }
        if (c === '"' || c === "'") q = c; else if (c === '(' || c === '[' || c === '{') depth++; else if (c === ')' || c === ']' || c === '}') depth--;
      }
      bodies.push(text.slice(m.index + m[0].length, i - 1));
    }
    for (const b of bodies) {
      const g = k => { const r = b.match(new RegExp(k + `\\s*=\\s*['"]([^'"]+)['"]`)); return r ? r[1] : null; };
      const spec = { package: g('package'), executable: g('executable'), name: g('name'), namespace: g('namespace'), remap: {}, params: {} };
      const rm = b.match(/remappings\s*=\s*\[([\s\S]*?)\]\s*(?:,|$)/);
      if (rm) [...rm[1].matchAll(/\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/g)].forEach(x => { spec.remap[x[1]] = x[2]; });
      const pm = b.match(/parameters\s*=\s*\[\s*\{([\s\S]*?)\}\s*\]/);
      if (pm) [...pm[1].matchAll(/['"]([\w.]+)['"]\s*:\s*([^,}\n]+)/g)].forEach(x => { let v = x[2].trim().replace(/^['"]|['"]$/g, ''); spec.params[x[1]] = /^(True|False)$/.test(v) ? v === 'True' : (isNaN(+v) ? v : +v); });
      if (spec.package && spec.executable) nodes.push(spec);
    }
    return nodes;
  }
  function runLaunchText(ctx, text, path) {
    const specs = parseLaunchPy(text);
    if (!specs.length) { ctx.out('[WARN] [launch]: 이 런치 파일에서 Node(...) 를 찾지 못했습니다'); return {}; }
    const list = specs.map(s => {
      const argv = ['--ros-args'];
      if (s.name) argv.push('-r', '__node:=' + s.name);
      if (s.namespace) argv.push('-r', '__ns:=' + (s.namespace.startsWith('/') ? s.namespace : '/' + s.namespace));
      Object.entries(s.remap).forEach(([a, b]) => argv.push('-r', `${a}:=${b}`));
      Object.entries(s.params).forEach(([a, b]) => argv.push('-p', `${a}:=${b}`));
      return [s.package, s.executable, argv, s.executable];
    });
    return ROS.runMany(ctx, list);
  }

  /* ================================================== 패키지 템플릿 (ros2 pkg create) */
  const LICENSE = 'Apache-2.0';
  function pkgCreate(name, o) {
    const dir = WS + '/src/' + name;
    if (VFS.isDir(dir)) throw new Error(`\nAborted!\nThe directory already exists: ./${name}\nEither remove the directory or choose a different destination directory or package name`);
    const deps = o.deps || [];
    const depXml = deps.map(d => `  <depend>${d}</depend>\n`).join('');
    const lines = [`going to create a new package`, `package name: ${name}`, `destination directory: ${WS}/src`, `package format: 3`, `version: 0.0.0`, `description: TODO: Package description`, `maintainer: ['user <user@todo.todo>']`, `licenses: ['${o.license || LICENSE}']`, `build type: ${o.type}`, `dependencies: [${deps.map(d => `'${d}'`).join(', ')}]`];
    if (o.node) lines.push(`node_name: ${o.node}`);
    if (o.type === 'ament_python') {
      VFS.write(dir + '/package.xml', `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>${name}</name>
  <version>0.0.0</version>
  <description>TODO: Package description</description>
  <maintainer email="user@todo.todo">user</maintainer>
  <license>${o.license || LICENSE}</license>

${depXml}
  <test_depend>ament_copyright</test_depend>
  <test_depend>ament_flake8</test_depend>
  <test_depend>ament_pep257</test_depend>
  <test_depend>python3-pytest</test_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
`);
      VFS.write(dir + '/setup.py', `from setuptools import find_packages, setup

package_name = '${name}'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='user',
    maintainer_email='user@todo.todo',
    description='TODO: Package description',
    license='${o.license || LICENSE}',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
${o.node ? `            '${o.node} = ${name}.${o.node}:main'\n` : ''}        ],
    },
)
`);
      VFS.write(dir + '/setup.cfg', `[develop]\nscript_dir=$base/lib/${name}\n[install]\ninstall_scripts=$base/lib/${name}\n`);
      VFS.write(dir + '/resource/' + name, '');
      VFS.write(dir + '/' + name + '/__init__.py', '');
      VFS.write(dir + '/test/test_flake8.py', '# ament_flake8 테스트 (생략)\n');
      if (o.node) VFS.write(dir + '/' + name + '/' + o.node + '.py', `def main():\n    print('Hi from ${name}.')\n\n\nif __name__ == '__main__':\n    main()\n`);
      lines.push(`creating folder ./${name}`, `creating ./${name}/package.xml`, `creating source folder`, `creating folder ./${name}/${name}`, `creating ./${name}/setup.py`, `creating ./${name}/setup.cfg`, `creating folder ./${name}/resource`, `creating ./${name}/resource/${name}`, `creating ./${name}/${name}/__init__.py`, `creating folder ./${name}/test`, `creating ./${name}/test/test_copyright.py`, `creating ./${name}/test/test_flake8.py`, `creating ./${name}/test/test_pep257.py`);
      if (o.node) lines.push(`creating ./${name}/${name}/${o.node}.py`);
    } else {
      VFS.write(dir + '/package.xml', `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>${name}</name>
  <version>0.0.0</version>
  <description>TODO: Package description</description>
  <maintainer email="user@todo.todo">user</maintainer>
  <license>${o.license || LICENSE}</license>

  <buildtool_depend>ament_cmake</buildtool_depend>

${depXml}
  <test_depend>ament_lint_auto</test_depend>
  <test_depend>ament_lint_common</test_depend>

  <export>
    <build_type>ament_cmake</build_type>
  </export>
</package>
`);
      VFS.write(dir + '/CMakeLists.txt', `cmake_minimum_required(VERSION 3.8)
project(${name})

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

# find dependencies
find_package(ament_cmake REQUIRED)
${deps.map(d => `find_package(${d} REQUIRED)`).join('\n')}
${o.node ? `\nadd_executable(${o.node} src/${o.node}.cpp)\ntarget_include_directories(${o.node} PUBLIC\n  $<BUILD_INTERFACE:\${CMAKE_CURRENT_SOURCE_DIR}/include>\n  $<INSTALL_INTERFACE:include/\${PROJECT_NAME}>)\ntarget_compile_features(${o.node} PUBLIC c_std_99 cxx_std_17)\n${deps.length ? `ament_target_dependencies(${o.node} ${deps.join(' ')})\n` : ''}\ninstall(TARGETS ${o.node}\n  DESTINATION lib/\${PROJECT_NAME})\n` : ''}
ament_package()
`);
      VFS.mkdir(dir + '/include/' + name);
      if (o.node) VFS.write(dir + '/src/' + o.node + '.cpp', `#include <cstdio>\n\nint main(int argc, char ** argv)\n{\n  (void) argc;\n  (void) argv;\n\n  printf("hello world ${name} package\\n");\n  return 0;\n}\n`);
      else VFS.mkdir(dir + '/src');
      lines.push(`creating folder ./${name}`, `creating ./${name}/package.xml`, `creating source and include folder`, `creating folder ./${name}/src`, `creating folder ./${name}/include/${name}`, `creating ./${name}/CMakeLists.txt`);
      if (o.node) lines.push(`creating ./${name}/src/${o.node}.cpp`);
    }
    return lines.join('\n');
  }

  /* ================================================== colcon build */
  function colconBuild(args, t) {
    const pkgs = scanPackages();
    const sel = args.includes('--packages-select') ? args.slice(args.indexOf('--packages-select') + 1).filter(a => !a.startsWith('-')) : null;
    let list = sel ? pkgs.filter(p => sel.includes(p.name)) : pkgs;
    if (args.includes('--packages-up-to')) { const want = new Set(args.slice(args.indexOf('--packages-up-to') + 1).filter(a => !a.startsWith('-'))); let grew = true; while (grew) { grew = false; pkgs.forEach(p => { if (want.has(p.name)) p.deps.forEach(d => { if (!want.has(d) && pkgs.some(x => x.name === d)) { want.add(d); grew = true; } }); }); } list = pkgs.filter(p => want.has(p.name)); }
    if (!pkgs.length) return Promise.resolve(t.print('\nSummary: 0 packages finished [0.21s]\n\n⚠ ~/ros2_ws/src 에 패키지가 없습니다. 먼저 ros2 pkg create 로 만들어 보세요.', 'muted'));
    // 의존성 순서
    const names = new Set(list.map(p => p.name));
    const order = [], seen = new Set();
    const visit = p => { if (seen.has(p.name)) return; seen.add(p.name); p.deps.filter(d => names.has(d)).forEach(d => visit(list.find(x => x.name === d))); order.push(p); };
    list.forEach(visit);
    const t0 = performance.now();
    return new Promise(resolve => {
      let i = 0; let failed = null;
      const step = () => {
        if (i >= order.length || failed) {
          const sec = ((performance.now() - t0) / 1000 + 0.4).toFixed(2);
          if (failed) t.print(`Summary: ${i - 1} package${i - 1 === 1 ? '' : 's'} finished [${sec}s]\n  1 package failed: ${failed}`, 'err');
          else t.print(`\nSummary: ${order.length} package${order.length > 1 ? 's' : ''} finished [${sec}s]`);
          saveBuilt(); registerBuilt();
          if (!failed) t.print('\n💡 새로 빌드한 패키지를 쓰려면: source install/setup.bash', 'muted');
          resolve();
          return;
        }
        const p = order[i++];
        t.print(`Starting >>> ${p.name}`);
        setTimeout(() => {
          const st = performance.now();
          if (p.type === 'ament_python') {
            const exes = entryPoints(p.dir, p.name);
            // 문법 대충 점검: entry point 파일 존재
            const missing = Object.entries(exes).find(([, ep]) => !VFS.isFile(ep.file));
            if (missing) { failed = p.name; t.print(`--- stderr: ${p.name}\nerror: 모듈 파일을 찾을 수 없습니다: ${missing[1].file.replace(HOME, '~')}\n---\nFailed   <<< ${p.name} [${((performance.now() - st) / 1000 + 0.8).toFixed(2)}s, exited with code 1]`, 'err'); setTimeout(step, 100); return; }
            const launch = {};
            VFS.ls(p.dir + '/launch').forEach(e => { if (!e.dir) launch[e.name] = p.dir + '/launch/' + e.name; });
            built[p.name] = { type: p.type, exes, launch, path: p.dir };
            if (Object.keys(launch).length && !/launch/.test(VFS.read(p.dir + '/setup.py') || '')) t.print(`--- stderr: ${p.name}\n⚠ launch/ 폴더가 있지만 setup.py 의 data_files 에 등록되지 않았습니다. (실제 ROS 2 에서는 설치되지 않아 ros2 launch 가 파일을 못 찾습니다)\n---`, 'warn');
          } else {
            built[p.name] = { type: p.type, exes: {}, launch: {}, path: p.dir };
            t.print(`--- stderr: ${p.name}\n(브라우저 실습 환경에서는 C++ 컴파일을 흉내만 냅니다. 실제 실행은 Ubuntu + ROS 2 에서 해 보세요)\n---`, 'muted');
          }
          t.print(`Finished <<< ${p.name} [${((performance.now() - st) / 1000 + (p.type === 'ament_python' ? 0.9 : 3.2)).toFixed(2)}s]`, 'ok');
          step();
        }, p.type === 'ament_python' ? 500 : 1100);
      };
      step();
    });
  }

  /* ================================================== 명령 줄 해석 */
  function splitArgs(line) {
    const out = []; let cur = '', q = null, has = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === q) q = null; else if (c === '\\' && q === '"' && line[i + 1] === '"') { cur += '"'; i++; } else cur += c; continue; }
      if (c === '"' || c === "'") { q = c; has = true; continue; }
      if (/\s/.test(c)) { if (cur || has) { out.push(cur); cur = ''; has = false; } continue; }
      cur += c;
    }
    if (cur || has) out.push(cur);
    return out;
  }
  const opt = (a, ...names) => names.some(n => a.includes(n));
  const optVal = (a, ...names) => { for (const n of names) { const i = a.indexOf(n); if (i >= 0) return a[i + 1]; const f = a.find(x => x.startsWith(n + '=')); if (f) return f.slice(n.length + 1); } return null; };
  const posArgs = (a, withVal = []) => { const out = []; for (let i = 0; i < a.length; i++) { if (a[i].startsWith('-')) { if (withVal.includes(a[i])) i++; continue; } out.push(a[i]); } return out; };

  const HIDE_NODES = n => n.startsWith('/_');
  function nodeInfo(n) {
    const L = [n.fqn, '  Subscribers:'];
    n.subs.forEach(s => L.push(`    ${s.topic}: ${s.type}`));
    L.push('  Publishers:');
    n.pubs.forEach(p => L.push(`    ${p.topic}: ${p.type}`));
    L.push('  Service Servers:');
    const std = ['describe_parameters', 'get_parameter_types', 'get_parameters', 'get_type_description', 'list_parameters', 'set_parameters', 'set_parameters_atomically'];
    const srvs = n.srvs.map(s => [s.name, s.type]).concat(std.map(s => [n.fqn + '/' + s, 'rcl_interfaces/srv/' + s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('')])).sort((a, b) => a[0].localeCompare(b[0]));
    srvs.forEach(([a, b]) => L.push(`    ${a}: ${b.replace('RclInterfaces', '').replace('GetTypeDescription', 'GetTypeDescription').replace(/^rcl_interfaces\/srv\/GetTypeDescription$/, 'type_description_interfaces/srv/GetTypeDescription')}`));
    L.push('  Service Clients:');
    n.clients.forEach(c => L.push(`    ${c.name}: ${c.type}`));
    L.push('  Action Servers:');
    n.asrvs.forEach(a => L.push(`    ${a.name}: ${a.type}`));
    L.push('  Action Clients:');
    n.aclients.forEach(a => L.push(`    ${a.name}: ${a.type}`));
    return L.join('\n');
  }
  function paramStr(v) {
    if (typeof v === 'boolean') return v ? 'True' : 'False';
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map(paramStr).join(', ') + ']';
    return String(v);
  }
  function paramTypeName(t) { return { bool: 'Boolean', integer: 'Integer', double: 'Double', string: 'String' }[t] || t; }

  function fmtField(type, k, v) {
    const fd = ((ROS.fieldsOf(type) || { fields: [] }).fields.find(f => f.name === k)) || {};
    if (Array.isArray(v)) return '[' + v.map(x => x && typeof x === 'object' ? ROS.toFlow(x, fd.type) : JSON.stringify(x)).join(', ') + ']';
    return v && typeof v === 'object' ? ROS.toFlow(v, fd.type || '') : JSON.stringify(v);
  }
  const IFACE_ALL = () => Object.keys(window.ROS_IFACES || {}).sort();

  /* ================================================== 터미널 */
  const terms = new Set();
  let activeTerm = null;
  const HIST_KEY = 'r2:hist';

  class Terminal {
    constructor(el, opts) {
      this.el = el; this.opts = opts || {};
      this.cwd = this.opts.cwd || WS;
      this.env = { ROS_DISTRO: 'jazzy', ROS_VERSION: '2', ROS_PYTHON_VERSION: '3', ROS_DOMAIN_ID: '0', RMW_IMPLEMENTATION: 'rmw_fastrtps_cpp', ROS_AUTOMATIC_DISCOVERY_RANGE: 'SUBNET', HOME, USER: 'user', SHELL: '/bin/bash' };
      this.hist = []; try { this.hist = JSON.parse(localStorage.getItem(HIST_KEY) || '[]'); } catch (_) {}
      this.hi = this.hist.length;
      this.fg = null; this.bg = [];
      el.classList.add('rterm');
      el.innerHTML = `<div class="rt-out" tabindex="0"></div><div class="rt-line"><span class="rt-ps"></span><input class="rt-in" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="터미널 입력"><button class="rt-stop hidden" title="Ctrl+C 로 멈추기">■ Ctrl+C</button></div>`;
      this.out = el.querySelector('.rt-out'); this.inp = el.querySelector('.rt-in'); this.ps = el.querySelector('.rt-ps'); this.stopBtn = el.querySelector('.rt-stop');
      this.updPs();
      this.inp.addEventListener('keydown', e => this.onKey(e));
      this.out.addEventListener('keydown', e => this.onKey(e));
      el.addEventListener('click', e => { if (!window.getSelection().toString() && !e.target.closest('a,button')) (this.fg && this.fg.keys ? this.out : this.inp).focus({ preventScroll: true }); activeTerm = this; });
      el.addEventListener('focusin', () => { activeTerm = this; });
      this.stopBtn.onclick = () => this.interrupt();
      terms.add(this); activeTerm = this;
      if (!this.opts.quiet) this.print(`<span class="rt-welcome">🐢 ROS 2 Jazzy 브라우저 터미널</span>  <span class="muted">— <b>help</b> 로 명령 목록, <kbd>Tab</kbd> 자동 완성, <kbd>↑</kbd> 이전 명령, <kbd>Ctrl</kbd>+<kbd>C</kbd> 멈추기</span>`, 'html');
    }
    get prompt() { const d = this.cwd.startsWith(HOME) ? '~' + this.cwd.slice(HOME.length) : this.cwd; return `<span class="rt-u">user@ros2</span>:<span class="rt-d">${esc(d)}</span>$ `; }
    updPs() { this.ps.innerHTML = this.prompt; }
    print(text, cls) {
      if (text == null) return;
      const div = document.createElement('div');
      div.className = 'rt-l' + (cls && cls !== 'html' ? ' rt-' + cls : '');
      if (cls === 'html') div.innerHTML = text;
      else {
        const s = String(text);
        if (!cls && /^\[(WARN|ERROR|FATAL)\]/.test(s)) div.className += /^\[WARN\]/.test(s) ? ' rt-warn' : ' rt-err';
        else if (!cls && /\[(WARN|ERROR|FATAL)\]/.test(s.slice(0, 60))) div.className += /\[WARN\]/.test(s.slice(0, 60)) ? ' rt-warn' : ' rt-err';
        div.textContent = s;
      }
      this.out.appendChild(div);
      while (this.out.childNodes.length > 1500) this.out.removeChild(this.out.firstChild);
      const nearBottom = this.out.scrollHeight - this.out.scrollTop - this.out.clientHeight < 80;
      if (nearBottom || !this._userScrolled) this.out.scrollTop = this.out.scrollHeight;
    }
    clear() { this.out.innerHTML = ''; }
    setBusy(p) {
      this.fg = p;
      this.el.classList.toggle('busy', !!p);
      this.stopBtn.classList.toggle('hidden', !p);
      this.inp.disabled = !!p;
      if (p) { this.inp.value = ''; this.inp.placeholder = p.keys ? '⌨ 이 터미널을 클릭한 뒤 키보드로 조종하세요 (Ctrl+C 멈추기)' : '실행 중… (Ctrl+C 로 멈추기)'; if (p.keys) this.out.focus({ preventScroll: true }); }
      else { this.inp.placeholder = ''; this.inp.disabled = false; this.updPs(); if (this.el.contains(document.activeElement) || document.activeElement === document.body) this.inp.focus({ preventScroll: true }); }
    }
    interrupt() {
      if (this.fg) { this.print('^C', 'muted'); const p = this.fg; this.setBusy(null); try { p.stop(); } catch (e) { console.error(e); } if (p.nodes && p.nodes.length && p.kind === 'run') this.print('[INFO] [rclpy]: 노드를 종료했습니다 (KeyboardInterrupt)', 'muted'); }
      else { this.print(this.prompt + esc(this.inp.value) + '^C', 'html'); this.inp.value = ''; }
    }
    onKey(e) {
      if (e.ctrlKey && (e.key === 'c' || e.key === 'C') && !window.getSelection().toString()) { e.preventDefault(); this.interrupt(); return; }
      if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); this.clear(); return; }
      if (this.fg) {
        if (this.fg.keys) { const ok = this.fg.keys(e.key, e); if (ok !== false) { e.preventDefault(); e.stopPropagation(); } }
        return;
      }
      if (e.target !== this.inp) return;
      if (e.key === 'Enter') { e.preventDefault(); const v = this.inp.value; this.inp.value = ''; this.exec(v, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (this.hi > 0) { this.hi--; this.inp.value = this.hist[this.hi] || ''; } }
      else if (e.key === 'ArrowDown') { e.preventDefault(); if (this.hi < this.hist.length) { this.hi++; this.inp.value = this.hist[this.hi] || ''; } }
      else if (e.key === 'Tab') { e.preventDefault(); this.complete(); }
    }
    /** 명령 실행 (echo=true 면 프롬프트와 함께 보여 줌) */
    exec(line, echo) {
      line = String(line || '');
      if (echo !== false) this.print(this.prompt + esc(line), 'html');
      const trimmed = line.trim();
      if (!trimmed) return Promise.resolve();
      if (this.fg) { this.print('(다른 명령이 실행 중입니다. Ctrl+C 로 멈춘 뒤 다시 입력하세요)', 'warn'); return Promise.resolve(); }
      if (this.hist[this.hist.length - 1] !== trimmed) { this.hist.push(trimmed); if (this.hist.length > 200) this.hist.shift(); try { localStorage.setItem(HIST_KEY, JSON.stringify(this.hist)); } catch (_) {} }
      this.hi = this.hist.length;
      // && 연결 · 주석
      const parts = trimmed.replace(/\s+#.*$/, '').split(/\s*&&\s*/);
      let p = Promise.resolve(true);
      parts.forEach(part => { p = p.then(ok => ok === false ? false : this.run1(part)); });
      return p.catch(e => { this.print(String(e && e.message || e), 'err'); console.error(e); });
    }
    /** 여러 줄(스크립트) 실행 — 한 줄씩 기다림 */
    async execScript(text) {
      const lines = String(text).split('\n').map(l => l.trim()).filter(s => s && !s.startsWith('#'));
      for (let i = 0; i < lines.length; i++) {
        await this.exec(lines[i], true);
        if (this.fg) {
          if (i === lines.length - 1) return;
          // 다음 줄이 남아 있으면 오래 도는 명령은 백그라운드로 돌리고 계속 (실제 터미널에서 창을 하나 더 연 것처럼)
          const p = this.fg; this.setBusy(null); this.bg.push(p); p.done.then(() => { this.bg = this.bg.filter(x => x !== p); });
          this.print(`[${this.bg.length}] ${p.pid || ''}  ← 계속 실행 중 (백그라운드). 멈추려면 jobs · kill %${this.bg.length}`, 'muted');
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }
    async run1(line) {
      let bgRun = false;
      if (/\s&$/.test(line)) { bgRun = true; line = line.replace(/\s*&$/, ''); }
      // 파이프: | grep 만 지원
      let grep = null;
      const pm = line.match(/^(.*?)\s*\|\s*grep\s+(-i\s+)?(.+)$/);
      if (pm) { line = pm[1]; grep = { re: new RegExp(pm[3].replace(/^['"]|['"]$/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), pm[2] ? 'i' : '') }; }
      // 환경변수 치환
      line = line.replace(/\$\{?(\w+)\}?/g, (_, k) => this.env[k] != null ? this.env[k] : '');
      // 출력 방향 바꾸기: > 파일, >> 파일
      let redir = null;
      const rm = line.match(/^(.*?)\s+(>>?)\s*([^\s>]+)\s*$/);
      if (rm && !/["'][^"']*$/.test(rm[1])) { line = rm[1]; redir = { append: rm[2] === '>>', path: VFS.norm(rm[3], this.cwd), buf: [] }; }
      const a = splitArgs(line);
      if (!a.length) return true;
      if (redir) {
        const r = await this.run1Out(a, (s) => redir.buf.push(String(s)), { bg: false, line });
        const txt = redir.buf.join('\n') + (redir.buf.length ? '\n' : '');
        VFS.write(redir.path, (redir.append ? (VFS.read(redir.path) || '') : '') + txt);
        return r;
      }
      const out = grep ? (s, c) => { String(s).split('\n').filter(x => grep.re.test(x)).forEach(x => this.print(x, c)); } : (s, c) => this.print(s, c);
      const cmd = a[0], rest = a.slice(1);
      // env 접두 (VAR=val cmd)
      if (/^\w+=/.test(cmd) && rest.length) { const [k, v] = cmd.split('='); const old = this.env[k]; this.env[k] = v; const r = await this.run1(rest.join(' ')); this.env[k] = old; return r; }
      const fn = CMDS[cmd];
      if (!fn) {
        if (ALIAS[cmd]) return this.run1(ALIAS[cmd] + ' ' + rest.map(q).join(' '));
        out(`${cmd}: command not found` + (/^ros/.test(cmd) ? '  (혹시 ros2 를 잘못 입력했나요?)' : ''), 'err');
        return false;
      }
      return fn.call(this, rest, out, { bg: bgRun, line });
    }
    async run1Out(a, out, o) {
      const fn = CMDS[a[0]];
      if (!fn) { out(`${a[0]}: command not found`); return false; }
      return fn.call(this, a.slice(1), out, o);
    }
    /** 프로세스를 포그라운드/백그라운드로 */
    attach(proc, bgRun, kind) {
      proc.kind = kind || 'run';
      if (bgRun) { this.bg.push(proc); this.print(`[${this.bg.length}] ${proc.pid}`, 'muted'); proc.done.then(() => { this.bg = this.bg.filter(x => x !== proc); }); return; }
      this.setBusy(proc);
      proc.done.then(() => { if (this.fg === proc) this.setBusy(null); });
    }
    complete() {
      const v = this.inp.value;
      const a = splitArgs(v); if (/\s$/.test(v)) a.push('');
      const last = a[a.length - 1] || '';
      let cands = [];
      const w = a.length;
      const sub = { ros2: ['run', 'launch', 'node', 'topic', 'service', 'action', 'param', 'interface', 'pkg', 'bag', 'doctor', 'lifecycle', 'daemon', 'component', 'multicast', 'wtf'], node: ['list', 'info'], topic: ['list', 'echo', 'pub', 'hz', 'info', 'type', 'bw', 'find'], service: ['list', 'call', 'type', 'find', 'info'], action: ['list', 'info', 'send_goal', 'type'], param: ['list', 'get', 'set', 'dump', 'load', 'describe', 'delete'], interface: ['list', 'show', 'package', 'packages', 'proto'], pkg: ['list', 'executables', 'create', 'prefix', 'xml'], bag: ['record', 'play', 'info', 'list'], lifecycle: ['nodes', 'get', 'list', 'set'] };
      if (w === 1) cands = Object.keys(CMDS).concat(Object.keys(ALIAS));
      else if (a[0] === 'ros2' && w === 2) cands = sub.ros2;
      else if (a[0] === 'ros2' && w === 3 && sub[a[1]]) cands = sub[a[1]];
      else if (a[0] === 'ros2' && (a[1] === 'run' || a[1] === 'launch') && w === 3) cands = Object.keys(ROS.pkgs);
      else if (a[0] === 'ros2' && a[1] === 'run' && w === 4) cands = Object.keys((ROS.pkgs[a[2]] || {}).exes || {});
      else if (a[0] === 'ros2' && a[1] === 'launch' && w === 4) cands = Object.keys((ROS.pkgs[a[2]] || {}).launch || {});
      else if (a[0] === 'ros2' && a[1] === 'topic') cands = w === 4 ? ROS.topicList().map(t => t.name) : w === 5 && a[2] === 'pub' ? [ROS.topicType(a[3]) || ''].concat(IFACE_ALL().filter(t => t.includes('/msg/'))) : [];
      else if (a[0] === 'ros2' && a[1] === 'service') cands = w === 4 ? ROS.serviceList().map(s => s.name) : w === 5 ? [((ROS.serviceList().find(s => s.name === a[3])) || {}).type || ''] : [];
      else if (a[0] === 'ros2' && a[1] === 'action') cands = w === 4 ? ROS.actionList().map(s => s.name) : w === 5 ? [((ROS.actionList().find(s => s.name === a[3])) || {}).type || ''] : [];
      else if (a[0] === 'ros2' && (a[1] === 'node' || a[1] === 'param' || a[1] === 'lifecycle') && w === 4) cands = ROS.nodes().map(n => n.fqn);
      else if (a[0] === 'ros2' && a[1] === 'param' && w === 5) { const n = ROS.findNode(a[3]); cands = n ? [...n.params.keys()] : []; }
      else if (a[0] === 'ros2' && a[1] === 'interface' && w === 4) cands = IFACE_ALL();
      else if (a[0] === 'ros2' && a[1] === 'bag' && w === 4 && a[2] !== 'record') cands = ROS.bag.list();
      else { // 파일 이름
        const base = last.includes('/') ? last.slice(0, last.lastIndexOf('/') + 1) : '';
        const dir = VFS.norm(base || '.', this.cwd);
        cands = VFS.ls(dir).map(e => base + e.name + (e.dir ? '/' : ''));
      }
      cands = cands.filter(c => c && c.startsWith(last));
      if (!cands.length) return;
      if (cands.length === 1) { a[a.length - 1] = cands[0]; this.inp.value = a.map(q).join(' ') + (cands[0].endsWith('/') ? '' : ' '); return; }
      let pre = cands[0]; cands.forEach(c => { while (!c.startsWith(pre)) pre = pre.slice(0, -1); });
      if (pre.length > last.length) { a[a.length - 1] = pre; this.inp.value = a.map(q).join(' '); return; }
      this.print(this.prompt + esc(v), 'html'); this.print(cands.slice(0, 80).join('  '), 'muted');
    }
  }
  const q = s => /[\s{}"]/.test(s) && !/^["']/.test(s) ? `"${s.replace(/"/g, '\\"')}"` : s;

  /* ================================================== 명령들 */
  const ALIAS = { rqt_graph: 'ros2 run rqt_graph rqt_graph', rviz2: 'ros2 run rviz2 rviz2', rqt: 'ros2 run rqt rqt', rqt_plot: 'ros2 run rqt_plot rqt_plot', rqt_console: 'ros2 run rqt_console rqt_console', python: 'python3', ll: 'ls -l', code: 'nano', vim: 'nano', vi: 'nano', gedit: 'nano' };
  const CMDS = {};

  CMDS.help = function (a, out) {
    out(`자주 쓰는 명령 (실제 ROS 2 와 같게 동작합니다)
  ros2 run <패키지> <실행파일>        예) ros2 run turtlesim turtlesim_node
  ros2 launch <패키지> <런치파일>     예) ros2 launch turtle_tf2_py turtle_tf2_demo.launch.py
  ros2 node list | info <노드>
  ros2 topic list [-t] | echo <토픽> | pub <토픽> <타입> "<YAML>" | hz | info [-v] | type
  ros2 service list [-t] | call <서비스> <타입> "<YAML>" | type
  ros2 action list [-t] | info | send_goal <액션> <타입> "<YAML>" --feedback
  ros2 param list | get <노드> <이름> | set <노드> <이름> <값> | dump <노드>
  ros2 interface list | show <타입>        ros2 pkg list | executables | create
  ros2 bag record -a | play <이름> | info <이름>     ros2 doctor
  rqt_graph · rviz2 · rqt · rqt_plot <토픽/필드>   (창이 뜹니다)
작업 공간
  cd ~/ros2_ws/src && ros2 pkg create --build-type ament_python --node-name my_node my_pkg
  nano <파일> (편집기 창) · python3 <파일> · colcon build · source install/setup.bash
기타: ls cd pwd cat mkdir rm tree echo export env clear history reset-ws
키: Tab 자동 완성 · ↑↓ 이전 명령 · Ctrl+C 멈춤 · Ctrl+L 화면 지우기 · 명령 뒤에 & 를 붙이면 백그라운드 실행`);
    return true;
  };
  CMDS.clear = function () { this.clear(); return true; };
  CMDS.jobs = function (a, out) { out(this.bg.map((p, i) => `[${i + 1}]  Running                 ${p.pkg ? `ros2 run ${p.pkg} ${p.exe}` : p.kind || ''} &`).join('\n')); return true; };
  CMDS.kill = function (a, out) {
    const t = a.find(x => /^%\d+$/.test(x));
    if (!t) { if (a.includes('%%') || !a.length) { const p = this.bg[this.bg.length - 1]; if (p) { p.stop(); out(`[${this.bg.length}]+  Terminated`); } return true; } out('kill: 사용법: kill %작업번호 (jobs 로 확인)', 'err'); return false; }
    const p = this.bg[+t.slice(1) - 1]; if (!p) { out(`bash: kill: ${t}: no such job`, 'err'); return false; }
    p.stop(); out(`[${t.slice(1)}]  Terminated`); return true;
  };
  CMDS.fg = function (a, out) {
    const i = a[0] ? +String(a[0]).replace('%', '') - 1 : this.bg.length - 1; const p = this.bg[i];
    if (!p) { out('bash: fg: current: no such job', 'err'); return false; }
    this.bg.splice(i, 1); this.setBusy(p); p.done.then(() => { if (this.fg === p) this.setBusy(null); }); return true;
  };
  CMDS.history = function (a, out) { out(this.hist.map((h, i) => `${String(i + 1).padStart(5)}  ${h}`).join('\n')); return true; };
  CMDS.echo = function (a, out) { out(a.join(' ')); return true; };
  CMDS.pwd = function (a, out) { out(this.cwd); return true; };
  CMDS.whoami = function (a, out) { out('user'); return true; };
  CMDS.date = function (a, out) { out(new Date().toString()); return true; };
  CMDS.uname = function (a, out) { out(opt(a, '-a') ? 'Linux ros2 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux' : 'Linux'); return true; };
  CMDS.lsb_release = function (a, out) { out('Distributor ID:\tUbuntu\nDescription:\tUbuntu 24.04.1 LTS\nRelease:\t24.04\nCodename:\tnoble'); return true; };
  CMDS.export = function (a, out) { a.forEach(kv => { const i = kv.indexOf('='); if (i > 0) { this.env[kv.slice(0, i)] = kv.slice(i + 1).replace(/^['"]|['"]$/g, ''); if (kv.startsWith('ROS_DOMAIN_ID')) out('💡 이 브라우저 실습 환경은 한 도메인만 흉내 냅니다 (11장 domain 위젯에서 도메인 실험을 해 보세요)', 'muted'); } }); return true; };
  CMDS.env = CMDS.printenv = function (a, out) { out(Object.entries(this.env).map(([k, v]) => `${k}=${v}`).join('\n')); return true; };
  CMDS.source = function (a, out) {
    const f = a[0] || '';
    if (/\/opt\/ros\/\w+\/setup\.(bash|sh|zsh)$/.test(f)) { out(''); return true; }
    if (/install\/(local_)?setup\.(bash|sh|zsh)$/.test(f)) {
      const p = VFS.norm(f.replace(/\/install\/.*$/, '') || '.', this.cwd);
      if (!Object.keys(built).length) { out(`bash: ${f}: No such file or directory  (먼저 colcon build 를 하세요)`, 'err'); return false; }
      sourced.ws = true; registerBuilt(); out(''); return true;
    }
    if (/\.bashrc$/.test(f)) return true;
    out(`bash: ${f}: No such file or directory`, 'err'); return false;
  };
  CMDS['.'] = CMDS.source;
  CMDS.cd = function (a, out) { const p = VFS.norm(a[0] || '~', this.cwd); if (!VFS.isDir(p)) { out(`bash: cd: ${a[0]}: No such file or directory`, 'err'); return false; } this.cwd = p; this.updPs(); return true; };
  CMDS.ls = function (a, out) {
    const long = a.some(x => /^-\w*l/.test(x));
    const tgt = a.filter(x => !x.startsWith('-'))[0];
    const p = VFS.norm(tgt || '.', this.cwd);
    if (VFS.isFile(p)) { out(tgt); return true; }
    if (!VFS.isDir(p)) { out(`ls: cannot access '${tgt}': No such file or directory`, 'err'); return false; }
    const e = VFS.ls(p);
    if (long) out(e.map(x => `${x.dir ? 'drwxr-xr-x' : '-rw-r--r--'} 1 user user ${x.dir ? 4096 : String((VFS.read(p + '/' + x.name) || '').length).padStart(5)} ${x.name}`).join('\n'));
    else this.print(e.map(x => x.dir ? `<span class="rt-d">${esc(x.name)}</span>` : esc(x.name)).join('  '), 'html');
    return true;
  };
  CMDS.cat = function (a, out) { for (const f of a) { const p = VFS.norm(f, this.cwd); if (!VFS.isFile(p)) { out(`cat: ${f}: No such file or directory`, 'err'); return false; } out(VFS.read(p).replace(/\n$/, '')); } return true; };
  CMDS.mkdir = function (a) { a.filter(x => !x.startsWith('-')).forEach(d => VFS.mkdir(VFS.norm(d, this.cwd))); return true; };
  CMDS.touch = function (a) { a.forEach(f => { const p = VFS.norm(f, this.cwd); if (!VFS.isFile(p)) VFS.write(p, ''); }); return true; };
  CMDS.rm = function (a, out) { const rec = a.some(x => /^-\w*r/.test(x)); a.filter(x => !x.startsWith('-')).forEach(f => { const p = VFS.norm(f, this.cwd); if (VFS.isDir(p) && !rec) out(`rm: cannot remove '${f}': Is a directory`, 'err'); else if (!VFS.rm(p, rec)) out(`rm: cannot remove '${f}': No such file or directory`, 'err'); }); return true; };
  CMDS.tree = function (a, out) {
    const root = VFS.norm(a.filter(x => !x.startsWith('-'))[0] || '.', this.cwd);
    const L = [a[0] || '.']; let nd = 0, nf = 0;
    const walk = (p, pre) => { const e = VFS.ls(p); e.forEach((x, i) => { const last = i === e.length - 1; L.push(pre + (last ? '└── ' : '├── ') + x.name); if (x.dir) { nd++; walk(p + '/' + x.name, pre + (last ? '    ' : '│   ')); } else nf++; }); };
    walk(root, ''); L.push(`\n${nd} directories, ${nf} files`); out(L.join('\n')); return true;
  };
  CMDS['reset-ws'] = function (a, out) { VFS.reset(); Object.keys(built).forEach(k => delete built[k]); saveBuilt(); this.cwd = WS; this.updPs(); out('~/ros2_ws 를 처음 상태로 되돌렸습니다.'); return true; };
  CMDS.nano = function (a, out) {
    const f = a.filter(x => !x.startsWith('-'))[0];
    if (!f) { out('사용법: nano <파일>', 'err'); return false; }
    const p = VFS.norm(f, this.cwd);
    if (!window.PyROS || !PyROS.openEditor) { out('편집기를 불러오지 못했습니다', 'err'); return false; }
    PyROS.openEditor({ path: p, title: p.replace(HOME, '~'), read: () => VFS.read(p) || '', write: s => VFS.write(p, s), term: this });
    out(`📝 편집기 창을 열었습니다: ${p.replace(HOME, '~')}  (Ctrl+S 저장)`, 'muted');
    return true;
  };
  CMDS.python3 = function (a, out, o) {
    const f = a.filter(x => !x.startsWith('-'))[0];
    if (!f) { out('Python 3 (브라우저 Pyodide) — 대화형 모드는 지원하지 않습니다. python3 파일.py 로 실행하세요.', 'muted'); return true; }
    const p = VFS.norm(f, this.cwd);
    if (!VFS.isFile(p)) { out(`python3: can't open file '${p}': [Errno 2] No such file or directory`, 'err'); return false; }
    let finish; const proc = { pid: Math.floor(Math.random() * 9000 + 1000), nodes: [], done: new Promise(r => { finish = r; }) };
    const r = PyROS.run(VFS.read(p), { filename: p.split('/').pop(), argv: [p].concat(a.slice(1)), out: s => this.print(s), err: s => this.print(s, 'err'), onExit: () => finish() });
    proc.stop = () => { r.stop(); finish(); };
    this.attach(proc, o.bg, 'python');
    return true;
  };
  CMDS.sudo = function (a, out) {
    if (a[0] === 'apt' || a[0] === 'apt-get') {
      const pk = a.slice(2).filter(x => !x.startsWith('-'));
      out(`Reading package lists... Done\nBuilding dependency tree... Done\n${pk.length ? pk.map(x => `${x} is already the newest version.`).join('\n') : ''}\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.\n💡 브라우저 실습 환경에는 필요한 패키지가 이미 들어 있다고 가정합니다.`);
      return true;
    }
    return this.run1(a.join(' '));
  };
  CMDS.apt = function (a, out) { out('E: Could not open lock file - open (13: Permission denied)  → sudo apt ... 로 실행하세요', 'err'); return false; };
  CMDS.rosdep = function (a, out) { if (a[0] === 'install') out('#All required rosdeps installed successfully'); else if (a[0] === 'update') out('reading in sources list data from /etc/ros/rosdep/sources.list.d\nupdated cache in /home/user/.ros/rosdep/sources.cache'); else out('rosdep: init | update | install --from-paths src -y --ignore-src'); return true; };
  CMDS.gz = function (a, out) { out('💡 Gazebo(gz sim)는 3D 그래픽이 필요해 브라우저에서 실행할 수 없습니다.\n   대신 15장의 "가상 로봇 시뮬레이터(bot)" 로 같은 ROS 2 인터페이스(/cmd_vel, /odom, /scan, /tf)를 실습하세요:\n   ros2 launch webbot_sim world.launch.py', 'muted'); return true; };
  CMDS.colcon = function (a, out) {
    if (a[0] !== 'build' && a[0] !== 'test' && a[0] !== 'list') { out('usage: colcon [-h] [--log-base LOG_BASE] {build,list,test,...}', 'err'); return false; }
    if (a[0] === 'list') { scanPackages().forEach(p => out(`${p.name}\t${p.dir.replace(WS + '/', '')}\t(${p.type.replace('ament_', 'ros.ament_')})`)); return true; }
    if (a[0] === 'test') { out('Starting >>> (tests)\nSummary: tests are skipped in the browser environment', 'muted'); return true; }
    if (this.cwd !== WS) out(`⚠ 작업 공간 최상위(~/ros2_ws)에서 빌드하는 것이 원칙입니다. 현재: ${this.cwd.replace(HOME, '~')} (여기서는 ~/ros2_ws 로 빌드합니다)`, 'warn');
    let finish; const proc = { pid: 1, nodes: [], done: new Promise(r => { finish = r; }), stop() { finish(); } };
    this.attach(proc, false, 'colcon');
    colconBuild(a, this).then(() => finish());
    return true;
  };

  /* ---------------------------------------------- ros2 */
  CMDS.ros2 = function (a, out, o) {
    const sub = a[0], r = a.slice(1);
    const S = ROS2[sub];
    if (!sub || sub === '-h' || sub === '--help') { out(`usage: ros2 [-h] [--use-python-default-buffering] Call \`ros2 <command> -h\` for more detailed usage. ...

ros2 is an extensible command-line tool for ROS 2.

Commands:
  action     Various action related sub-commands
  bag        Various rosbag related sub-commands
  component  Various component related sub-commands
  daemon     Various daemon related sub-commands
  doctor     Check ROS setup and other potential issues
  interface  Show information about ROS interfaces
  launch     Run a launch file
  lifecycle  Various lifecycle related sub-commands
  multicast  Various multicast related sub-commands
  node       Various node related sub-commands
  param      Various param related sub-commands
  pkg        Various package related sub-commands
  run        Run a package specific executable
  service    Various service related sub-commands
  topic      Various topic related sub-commands
  wtf        Use \`wtf\` as alias to \`doctor\``); return true; }
    if (!S) { out(`ros2: error: argument Call \`ros2 <command> -h\` for more detailed usage.: invalid choice: '${sub}' (choose from action, bag, component, daemon, doctor, interface, launch, lifecycle, multicast, node, param, pkg, run, security, service, topic, wtf)`, 'err'); return false; }
    return S.call(this, r, out, o);
  };
  const ROS2 = {};
  ROS2.run = function (a, out, o) {
    const [pkg, exe] = a;
    if (!pkg || !exe) { out('usage: ros2 run [-h] [--prefix PREFIX] package_name executable_name ...\nros2 run: error: the following arguments are required: package_name, executable_name', 'err'); return false; }
    const P = ROS.pkgs[pkg];
    if (!P || P.hidden || (P.user && !sourced.ws)) { out(`Package '${pkg}' not found` + (built[pkg] && !sourced.ws ? '\n💡 빌드한 패키지를 쓰려면 먼저: source install/setup.bash' : ''), 'err'); return false; }
    if (!P.exes[exe]) { out('No executable found', 'err'); return false; }
    let proc;
    try { proc = ROS.run(pkg, exe, a.slice(2), { out: s => this.print(s), err: s => this.print(s, 'err') }); } catch (e) { out(e.message, 'err'); return false; }
    this.attach(proc, o.bg, 'run');
    return true;
  };
  ROS2.launch = function (a, out, o) {
    const [pkg, file] = a;
    if (!pkg || !file) { out('usage: ros2 launch [-h] package_name [launch_file_name] [launch_arguments ...]', 'err'); return false; }
    const P = ROS.pkgs[pkg];
    if (!P || (P.user && !sourced.ws)) { out(`Package '${pkg}' not found: "package '${pkg}' not found, searching: ['/opt/ros/jazzy']"`, 'err'); return false; }
    const largs = {}; a.slice(2).forEach(x => { const i = x.indexOf(':='); if (i > 0) largs[x.slice(0, i)] = x.slice(i + 2); });
    let proc;
    try { proc = ROS.launch(pkg, file, largs, { out: s => this.print(s), err: s => this.print(s, 'err') }); } catch (e) { out(e.message, 'err'); return false; }
    this.attach(proc, o.bg, 'launch');
    return true;
  };
  ROS2.node = function (a, out) {
    const s = a[0];
    if (s === 'list') { const L = ROS.nodes().map(n => n.fqn).filter(n => opt(a, '-a', '--all') || !HIDE_NODES(n)).sort(); if (opt(a, '-c', '--count-nodes')) out(String(L.length)); else if (L.length) out(L.join('\n')); return true; }
    if (s === 'info') { const n = ROS.findNode(a[1] || ''); if (!n) { out(`Unable to find node '${a[1]}'`, 'err'); return false; } out(nodeInfo(n)); return true; }
    out('usage: ros2 node list | info <node_name>', 'err'); return false;
  };
  ROS2.topic = function (a, out, o) {
    const s = a[0];
    if (s === 'list') {
      const L = ROS.topicList();
      if (opt(a, '-c', '--count-topics')) { out(String(L.length)); return true; }
      if (opt(a, '-v', '--verbose')) {
        out('Published topics:'); L.filter(t => t.pubs).forEach(t => out(` * ${t.name} [${t.type}] ${t.pubs} publisher${t.pubs > 1 ? 's' : ''}`));
        out('\nSubscribed topics:'); L.filter(t => t.subs).forEach(t => out(` * ${t.name} [${t.type}] ${t.subs} subscriber${t.subs > 1 ? 's' : ''}`)); return true;
      }
      out(L.map(t => opt(a, '-t', '--show-types') ? `${t.name} [${t.type}]` : t.name).join('\n')); return true;
    }
    if (s === 'type') { const t = ROS.topicType(a[1]); if (!t) { out(`Unknown topic '${a[1]}'`, 'err'); return false; } out(t); return true; }
    if (s === 'find') { out(ROS.topicList().filter(t => t.type === ROS.normType(a[1])).map(t => t.name).join('\n')); return true; }
    if (s === 'info') {
      const t = ROS.topic(a[1]); if (!t) { out(`Unknown topic '${a[1]}'`, 'err'); return false; }
      const ty = ROS.topicType(a[1]);
      out(`Type: ${ty}\nPublisher count: ${t.pubs.length}`);
      const qs = (qo) => `  QoS profile:\n    Reliability: ${qo.reliability.toUpperCase()}\n    History (Depth): ${qo.history.toUpperCase()} (${qo.depth})\n    Durability: ${qo.durability.toUpperCase()}\n    Lifespan: Infinite\n    Deadline: Infinite\n    Liveliness: AUTOMATIC\n    Liveliness lease duration: Infinite`;
      if (opt(a, '-v', '--verbose')) t.pubs.forEach(p => out(`\nNode name: ${p.node.name}\nNode namespace: ${p.node.ns}\nTopic type: ${p.type}\nTopic type hash: RIHS01_${(p.type.length * 2654435761 >>> 0).toString(16).padStart(8, '0')}...\nEndpoint type: PUBLISHER\nGID: 01.0f.${p.node.id.toString(16).padStart(2, '0')}...\n${qs(p.qos)}`));
      out(`\nSubscription count: ${t.subs.length}`);
      if (opt(a, '-v', '--verbose')) t.subs.forEach(p => out(`\nNode name: ${p.node.name}\nNode namespace: ${p.node.ns}\nTopic type: ${p.type}\nEndpoint type: SUBSCRIPTION\n${qs(p.qos)}`));
      return true;
    }
    if (s === 'echo') {
      const pos = posArgs(a.slice(1), ['--field', '--qos-reliability', '--qos-durability', '--qos-depth', '--qos-profile', '--filter', '--truncate-length', '-l']);
      const name = pos[0]; if (!name) { out('usage: ros2 topic echo [-h] topic_name [message_type]', 'err'); return false; }
      const type = pos[1] ? ROS.normType(pos[1]) : ROS.topicType(name);
      const field = optVal(a, '--field');
      const once = opt(a, '--once');
      const tp = ROS.topic(name); const pubs = tp ? tp.pubs : [];
      const auto = k => pubs.length && pubs.every(p => p.qos[k] === (k === 'reliability' ? 'best_effort' : 'transient_local'));
      const qos = { reliability: optVal(a, '--qos-reliability') || (auto('reliability') ? 'best_effort' : 'reliable'), durability: optVal(a, '--qos-durability') || (auto('durability') ? 'transient_local' : 'volatile'), depth: +(optVal(a, '--qos-depth') || 10) };
      if (!type) out(`WARNING: topic [${name}] does not appear to be published yet\nCould not determine the type for the passed topic`, 'warn');
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      const start = (ty) => {
        const n = ROS.createNode('_ros2cli_' + Math.floor(Math.random() * 1e6), { hidden: true });
        proc.nodes.push(n);
        n.createSubscription(ty, name, m => {
          if (field) { let v = m; field.split('.').forEach(k => { v = v == null ? v : v[k]; }); out(typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'number' && !Number.isInteger(v) ? String(v) : String(v))); out('---'); }
          else if (opt(a, '--flow-style')) out(ROS.toFlow(m, ty) + '\n---');
          else { let y = ROS.toYaml(m, ty); if (opt(a, '--no-arr')) y = y.replace(/^(\s*\w+):\n(\s*- .*\n?)+/gm, "$1: '<array type: ...>'\n"); out(y + '\n---'); }
          if (once) proc.stop();
        }, qos);
      };
      proc.stop = () => { proc.nodes.forEach(x => x.destroy()); finish(); };
      if (type) start(type);
      else { const off = ROS.on('graph', () => { const ty = ROS.topicType(name); if (ty) { off(); start(ty); } }); const st = proc.stop; proc.stop = () => { off(); st(); }; }
      this.attach(proc, o.bg, 'echo');
      return true;
    }
    if (s === 'pub') {
      const pos = posArgs(a.slice(1), ['-r', '--rate', '-t', '--times', '-w', '--wait-matching-subscriptions', '--qos-reliability', '--qos-durability', '--qos-depth', '--qos-profile', '-n', '--node-name']);
      const [name, typeIn, yaml] = pos;
      if (!name || !typeIn) { out('usage: ros2 topic pub [-h] [-r N] [-p N] [-1 | -t TIMES] [-w WAIT_MATCHING_SUBSCRIPTIONS] ... topic_name message_type [values]', 'err'); return false; }
      const type = ROS.normType(typeIn);
      if (!ROS.iface(type)) { out(`The passed message type '${typeIn}' is invalid`, 'err'); return false; }
      let partial;
      try { partial = ROS.parseYaml(yaml || '{}'); } catch (e) { out(`The passed value needs to be a dictionary in YAML format\n  (${e.message})\n💡 따옴표로 감싸고, 콜론 뒤에 한 칸 띄우세요: "{linear: {x: 2.0}}"`, 'err'); return false; }
      const fields = (ROS.fieldsOf(type) || { fields: [] }).fields.map(f => f.name);
      const bad = Object.keys(partial || {}).find(k => !fields.includes(k));
      if (bad) { out(`Failed to populate field: '${type.split('/').pop()}' object has no attribute '${bad}'`, 'err'); return false; }
      const msg = ROS.make(type, partial);
      const once = opt(a, '-1', '--once');
      const times = +(optVal(a, '-t', '--times') || 0) || (once ? 1 : 0);
      const rate = +(optVal(a, '-r', '--rate') || 1);
      const n = ROS.createNode(optVal(a, '-n', '--node-name') || '_ros2cli_' + Math.floor(Math.random() * 1e6), { hidden: false });
      const pub = n.createPublisher(type, name, { reliability: optVal(a, '--qos-reliability') || 'reliable', durability: optVal(a, '--qos-durability') || 'volatile', depth: +(optVal(a, '--qos-depth') || 1) });
      let finish; const proc = { pid: 0, nodes: [n], done: new Promise(r => { finish = r; }) };
      let count = 0;
      const fire = () => { count++; out(`publisher: beginning loop\npublishing #${count}: ${type.replace('/msg/', '.msg.').replace(/\//g, '.')}(${Object.entries(msg).map(([k, v]) => `${k}=${fmtField(type, k, v)}`).join(', ')})\n`.replace('publisher: beginning loop\n', count === 1 ? 'publisher: beginning loop\n' : '')); pub.publish(ROS.cloneMsg(msg)); if (times && count >= times) setTimeout(() => proc.stop(), 30); };
      const tm = setTimeout(() => { fire(); if (!(times && count >= times)) proc.iv = setInterval(fire, 1000 / Math.max(0.01, rate)); }, 120);
      proc.stop = () => { clearTimeout(tm); clearInterval(proc.iv); n.destroy(); finish(); };
      this.attach(proc, o.bg, 'pub');
      return true;
    }
    if (s === 'hz' || s === 'bw' || s === 'delay') {
      const name = a[1]; if (!name) { out(`usage: ros2 topic ${s} topic_name`, 'err'); return false; }
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      const stamps = []; let bytes = 0;
      const n = ROS.createNode('_ros2cli_' + Math.floor(Math.random() * 1e6), { hidden: true }); proc.nodes.push(n);
      let subd = false;
      const trySub = () => { const ty = ROS.topicType(name); if (!ty || subd) return; subd = true; n.createSubscription(ty, name, m => { stamps.push(performance.now()); bytes += JSON.stringify(m).length; if (stamps.length > 200) stamps.shift(); }, 'sensor_data'); };
      trySub(); const off = ROS.on('graph', trySub);
      if (!ROS.topicType(name)) out(`WARNING: topic [${name}] does not appear to be published yet`, 'warn');
      const iv = setInterval(() => {
        const now = performance.now(); const w = stamps.filter(x => now - x < 10000);
        if (w.length < 2) { if (!subd || !w.length) out(s === 'hz' ? 'no new messages' : 'no new messages'); return; }
        const d = []; for (let i = 1; i < w.length; i++) d.push((w[i] - w[i - 1]) / 1000);
        const mean = d.reduce((x, y) => x + y, 0) / d.length, sd = Math.sqrt(d.reduce((x, y) => x + (y - mean) ** 2, 0) / d.length);
        if (s === 'hz') out(`average rate: ${(1 / mean).toFixed(3)}\n\tmin: ${Math.min(...d).toFixed(3)}s max: ${Math.max(...d).toFixed(3)}s std dev: ${sd.toFixed(5)}s window: ${w.length}`);
        else out(`${(bytes / 1024).toFixed(2)} KB/s from ${w.length} messages\n\tMessage size mean: ${(bytes / Math.max(1, stamps.length) / 1024).toFixed(2)} KB min: … max: …`), bytes = 0;
      }, 1000);
      proc.stop = () => { clearInterval(iv); off(); n.destroy(); finish(); };
      this.attach(proc, o.bg, 'hz');
      return true;
    }
    out('usage: ros2 topic {list,echo,pub,hz,info,type,bw,find}', 'err'); return false;
  };
  ROS2.service = function (a, out, o) {
    const s = a[0];
    const std = ['describe_parameters', 'get_parameter_types', 'get_parameters', 'get_type_description', 'list_parameters', 'set_parameters', 'set_parameters_atomically'];
    const stdType = x => x === 'get_type_description' ? 'type_description_interfaces/srv/GetTypeDescription' : 'rcl_interfaces/srv/' + x.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join('');
    const all = () => ROS.serviceList().map(x => [x.name, x.type]).concat(ROS.nodes().filter(n => !HIDE_NODES(n.fqn)).flatMap(n => std.map(x => [n.fqn + '/' + x, stdType(x)]))).sort((x, y) => x[0].localeCompare(y[0]));
    if (s === 'list') { const L = all(); if (opt(a, '-c', '--count-services')) out(String(L.length)); else out(L.map(([n, t]) => opt(a, '-t', '--show-types') ? `${n} [${t}]` : n).join('\n')); return true; }
    if (s === 'type') { const f = all().find(x => x[0] === a[1]); if (!f) { out(`Unknown service '${a[1]}'`, 'err'); return false; } out(f[1]); return true; }
    if (s === 'find') { out(all().filter(x => x[1] === ROS.normType(a[1]).replace('/msg/', '/srv/')).map(x => x[0]).join('\n')); return true; }
    if (s === 'info') { const f = ROS.serviceList().find(x => x.name === a[1]); if (!f) { out(`Unknown service '${a[1]}'`, 'err'); return false; } out(`Type: ${f.type}\nClients count: 0\nServices count: 1`); return true; }
    if (s === 'call') {
      const pos = posArgs(a.slice(1), ['-r', '--rate']);
      const [name, typeIn, yaml] = pos;
      if (!name || !typeIn) { out('usage: ros2 service call [-h] [-r N] service_name service_type [values]', 'err'); return false; }
      const type = ROS.normType(typeIn).replace('/msg/', '/srv/');
      if (!ROS.iface(type)) { out(`The passed service type is invalid`, 'err'); return false; }
      let req; try { req = ROS.parseYaml(yaml || '{}'); } catch (e) { out('The passed value needs to be a dictionary in YAML format', 'err'); return false; }
      const reqT = ROS.partType(type, 0), resT = ROS.partType(type, 1);
      const full = ROS.make(reqT, req);
      const nm = type.replace(/\//g, '.');
      out(`waiting for service to become available...`);
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      let alive = true; proc.stop = () => { alive = false; finish(); };
      this.attach(proc, false, 'call');
      (async () => {
        while (alive && !ROS.graph.services.has(name)) await ROS.sleep(200);
        if (!alive) return;
        if (ROS.graph.services.get(name).type !== type) { out(`서비스 타입이 다릅니다: ${name} 의 타입은 ${ROS.graph.services.get(name).type} 입니다`, 'err'); finish(); return; }
        out(`requester: making request: ${nm}_Request(${Object.entries(full).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : typeof v === 'object' ? JSON.stringify(v) : (typeof v === 'boolean' ? (v ? 'True' : 'False') : v)}`).join(', ')})\n`);
        try { const res = await ROS.callService(name, type, req); out(`response:\n${nm}_Response(${Object.entries(res).map(([k, v]) => `${k}=${typeof v === 'string' ? `'${v}'` : typeof v === 'boolean' ? (v ? 'True' : 'False') : typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')})\n`); }
        catch (e) { out(`서비스 처리 중 오류: ${e.message}`, 'err'); }
        finish();
      })();
      return true;
    }
    out('usage: ros2 service {list,call,type,find,info}', 'err'); return false;
  };
  ROS2.action = function (a, out, o) {
    const s = a[0];
    if (s === 'list') { const L = ROS.actionList(); if (opt(a, '-c', '--count-actions')) out(String(L.length)); else out(L.map(x => opt(a, '-t', '--show-types') ? `${x.name} [${x.type}]` : x.name).join('\n')); return true; }
    if (s === 'type') { const f = ROS.actionList().find(x => x.name === a[1]); if (!f) { out(`Unknown action '${a[1]}'`, 'err'); return false; } out(f.type); return true; }
    if (s === 'info') {
      const f = ROS.actionList().find(x => x.name === a[1]); if (!f) { out(`Action not found: ${a[1]}`, 'err'); return false; }
      const cl = ROS.nodes().filter(n => n.aclients.some(c => c.name === a[1]));
      out(`Action: ${a[1]}\nAction clients: ${cl.length}\n${cl.map(n => '    ' + n.fqn + (opt(a, '-t') ? ` [${f.type}]` : '')).join('\n')}${cl.length ? '\n' : ''}Action servers: 1\n    ${f.node}${opt(a, '-t') ? ` [${f.type}]` : ''}`); return true;
    }
    if (s === 'send_goal') {
      const pos = posArgs(a.slice(1));
      const [name, typeIn, yaml] = pos;
      if (!name || !typeIn) { out('usage: ros2 action send_goal [-h] [-f] action_name action_type goal', 'err'); return false; }
      const type = ROS.normType(typeIn).replace('/msg/', '/action/');
      if (!ROS.iface(type)) { out('The passed action type is invalid', 'err'); return false; }
      let goal; try { goal = ROS.parseYaml(yaml || '{}'); } catch (e) { out('The passed value needs to be a dictionary in YAML format', 'err'); return false; }
      const fb = opt(a, '-f', '--feedback');
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      let g = null, alive = true;
      proc.stop = () => { alive = false; if (g) g.cancel().then(ok => ok && out('Canceling goal...\nGoal canceled.')); finish(); };
      this.attach(proc, o.bg, 'goal');
      (async () => {
        out('Waiting for an action server to become available...');
        while (alive && !ROS.graph.actions.has(name)) await ROS.sleep(200);
        if (!alive) return;
        const full = ROS.make(ROS.partType(type, 0), goal);
        out(`Sending goal:\n${ROS.toYaml(full, ROS.partType(type, 0)).replace(/^/gm, '     ')}\n`);
        try {
          g = await ROS.sendGoal(name, goal, { feedback: fb ? f => out(`Feedback:\n${ROS.toYaml(f, ROS.partType(type, 2)).replace(/^/gm, '    ')}\n`) : null });
          if (!g.accepted) { out('Goal was rejected.'); finish(); return; }
          out(`Goal accepted with ID: ${g.goalId.replace(/-/g, '')}\n`);
          const r = await g.result;
          const st = { 4: 'SUCCEEDED', 5: 'CANCELED', 6: 'ABORTED' }[r.status] || r.status;
          out(`Result:\n${ROS.toYaml(r.result, ROS.partType(type, 1)).replace(/^/gm, '    ')}\n\nGoal finished with status: ${st}`);
        } catch (e) { out(e.message, 'err'); }
        if (this.fg === proc) this.setBusy(null);
        finish();
      })();
      return true;
    }
    out('usage: ros2 action {list,info,send_goal,type}', 'err'); return false;
  };
  ROS2.param = function (a, out) {
    const s = a[0];
    const node = nm => { const n = ROS.findNode(nm || ''); if (!n) out(`Node not found`, 'err'); return n; };
    if (s === 'list') {
      const nodes = a[1] && !a[1].startsWith('-') ? [node(a[1])].filter(Boolean) : ROS.nodes().filter(n => !HIDE_NODES(n.fqn));
      if (!nodes.length) return false;
      nodes.sort((x, y) => x.fqn.localeCompare(y.fqn)).forEach(n => { if (!(a[1] && !a[1].startsWith('-'))) out(n.fqn + ':'); out([...n.params.keys()].sort().map(k => '  ' + k + (opt(a, '-t', '--param-type') ? ` (type: ${n.params.get(k).type})` : '')).join('\n')); });
      return true;
    }
    if (s === 'get') { const n = node(a[1]); if (!n) return false; const p = n.params.get(a[2]); if (!p) { out('Parameter not set.', 'err'); return false; } out(`${paramTypeName(p.type)} value is: ${paramStr(p.value)}`); return true; }
    if (s === 'describe') { const n = node(a[1]); if (!n) return false; const p = n.params.get(a[2]); if (!p) { out(`Parameter not set.`, 'err'); return false; } out(`Parameter name: ${p.name}\n  Type: ${paramTypeName(p.type).toLowerCase()}${p.desc.description ? `\n  Description: ${p.desc.description}` : ''}\n  Constraints:${p.desc.read_only ? '\n    Read only: true' : ''}`); return true; }
    if (s === 'set') {
      const n = node(a[1]); if (!n) return false;
      if (a.length < 4) { out('usage: ros2 param set [-h] node_name parameter_name value', 'err'); return false; }
      const raw = a.slice(3).join(' ');
      const v = ROS.parseRosArgs(['--ros-args', '-p', `x:=${raw}`]).params.x;
      if (n.setParametersAsync) return n.setParametersAsync([{ name: a[2], value: v }]).then(([r]) => { out(r.successful ? 'Set parameter successful' : `Setting parameter failed: ${r.reason}`, r.successful ? null : 'err'); return r.successful; });
      const [r] = n.setParameters([{ name: a[2], value: v }]);
      out(r.successful ? 'Set parameter successful' : `Setting parameter failed: ${r.reason}`, r.successful ? null : 'err');
      return r.successful;
    }
    if (s === 'dump') {
      const n = node(a[1]); if (!n) return false;
      const L = [`${n.fqn}:`, '  ros__parameters:'];
      [...n.params.values()].sort((x, y) => x.name.localeCompare(y.name)).forEach(p => L.push(`    ${p.name}: ${typeof p.value === 'string' ? (p.value === '' ? "''" : p.value) : typeof p.value === 'boolean' ? String(p.value) : Array.isArray(p.value) ? '\n' + p.value.map(x => `    - ${x}`).join('\n') : (p.type === 'double' && Number.isInteger(p.value) ? p.value.toFixed(1) : p.value)}`));
      const txt = L.join('\n') + '\n';
      if (opt(a, '--output-dir')) { const f = VFS.norm((optVal(a, '--output-dir') || '.') + '/' + n.name + '.yaml', this.cwd); VFS.write(f, txt); out(`Saving to:  ${f}`); } else out(txt);
      return true;
    }
    if (s === 'load') {
      const n = node(a[1]); if (!n) return false;
      const f = VFS.norm(a[2] || '', this.cwd); if (!VFS.isFile(f)) { out(`파일이 없습니다: ${a[2]}`, 'err'); return false; }
      let y; try { y = ROS.parseYaml(VFS.read(f)); } catch (e) { out('YAML 오류: ' + e.message, 'err'); return false; }
      const blk = y[n.fqn] || y[n.name] || y['/**'] || Object.values(y)[0];
      const ps = (blk && blk.ros__parameters) || {};
      Object.entries(ps).forEach(([k, v]) => { const [r] = n.setParameters([{ name: k, value: v }]); out(r.successful ? `Set parameter ${k} successful` : `Set parameter ${k} failed: ${r.reason}`); });
      return true;
    }
    if (s === 'delete') { out('Deleting parameter failed: cannot undeclare a statically typed parameter', 'err'); return false; }
    out('usage: ros2 param {list,get,set,dump,load,describe,delete}', 'err'); return false;
  };
  ROS2.interface = function (a, out) {
    const s = a[0];
    const all = IFACE_ALL();
    if (s === 'list') {
      const m = opt(a, '-m', '--only-msgs'), sv = opt(a, '-s', '--only-srvs'), ac = opt(a, '-a', '--only-actions');
      const show = (k, lbl) => { const L = all.filter(t => t.split('/')[1] === k); out(`${lbl}:\n` + L.map(t => '    ' + t).join('\n')); };
      if (!sv && !ac || m) show('msg', 'Messages'); if (!m && !ac || sv) show('srv', 'Services'); if (!m && !sv || ac) show('action', 'Actions');
      return true;
    }
    if (s === 'packages') { out([...new Set(all.map(t => t.split('/')[0]))].sort().join('\n')); return true; }
    if (s === 'package') { out(all.filter(t => t.startsWith(a[1] + '/')).join('\n') || `Unknown package '${a[1]}'`); return true; }
    if (s === 'show') { const t = a[1] && ROS.showIface(ROS.normType(a[1]), { raw: opt(a, '--no-comments') ? false : false }); if (!t) { out(`Could not find the interface '${a[1]}'`, 'err'); return false; } out(t); return true; }
    if (s === 'proto') { const ty = ROS.normType(a[1] || ''); const f = ROS.iface(ty); if (!f) { out(`Could not find the interface '${a[1]}'`, 'err'); return false; } const pt = f.kind === 'msg' ? ty : ROS.partType(ty, 0); const y = ROS.toYaml(ROS.make(pt), pt); out(`"${y === '{}' ? '' : y + '\n'}"`); return true; }
    out('usage: ros2 interface {list,show,package,packages,proto}', 'err'); return false;
  };
  ROS2.pkg = function (a, out) {
    const s = a[0];
    const visible = () => Object.keys(ROS.pkgs).filter(p => !ROS.pkgs[p].hidden && (!ROS.pkgs[p].user || sourced.ws)).concat([...new Set(IFACE_ALL().map(t => t.split('/')[0]))]).filter((v, i, arr) => arr.indexOf(v) === i).sort();
    if (s === 'list') { out(visible().join('\n')); return true; }
    if (s === 'executables') {
      const list = a[1] ? [a[1]] : visible();
      if (a[1] && !ROS.pkgs[a[1]]) { out(`Package '${a[1]}' not found`, 'err'); return false; }
      out(list.flatMap(p => Object.keys((ROS.pkgs[p] || {}).exes || {}).map(e => `${p} ${e}`)).join('\n')); return true;
    }
    if (s === 'prefix') { const p = a[1]; if (!ROS.pkgs[p] && !visible().includes(p)) { out('Package not found', 'err'); return false; } out(built[p] ? WS + '/install/' + p : '/opt/ros/jazzy'); return true; }
    if (s === 'xml') { const b = built[a[1]]; out(b ? VFS.read(b.path + '/package.xml') : `<?xml version="1.0"?>\n<package format="3">\n  <name>${a[1]}</name>\n  <description>${esc((ROS.pkgs[a[1]] || {}).desc || '')}</description>\n  ...\n</package>`); return true; }
    if (s === 'create') {
      const bt = optVal(a, '--build-type') || 'ament_cmake';
      const nodeName = optVal(a, '--node-name');
      const lic = optVal(a, '--license');
      const di = a.indexOf('--dependencies');
      const deps = di >= 0 ? a.slice(di + 1).filter((x, i, arr) => !x.startsWith('-') && !arr.slice(0, i).some(y => y.startsWith('-'))) : [];
      const name = posArgs(a.slice(1), ['--build-type', '--node-name', '--license', '--destination-directory', '--maintainer-name', '--maintainer-email', '--description', '--library-name']).filter(x => !deps.includes(x))[0];
      if (!name) { out('usage: ros2 pkg create [-h] [--build-type {cmake,ament_cmake,ament_python}] [--dependencies DEPENDENCIES [...]] [--node-name NODE_NAME] package_name', 'err'); return false; }
      if (!/^[a-z][a-z0-9_]*$/.test(name)) { out(`\nAborted!\nThe package name '${name}' is invalid: must start with a lower-case letter and contain only lower-case letters, digits and underscores (_)`, 'err'); return false; }
      if (this.cwd !== WS + '/src') out(`💡 패키지는 보통 ~/ros2_ws/src 안에서 만듭니다 (여기서는 ~/ros2_ws/src 에 만듭니다)`, 'muted');
      try { out(pkgCreate(name, { type: bt === 'ament_python' ? 'ament_python' : 'ament_cmake', node: nodeName, deps, license: lic })); } catch (e) { out(e.message, 'err'); return false; }
      if (!lic) out(`\n[WARNING]\nUnknown license 'TODO: License declaration'.  This has been set in the package.xml, but no LICENSE file has been created.\nIt is recommended to use one of the ament license identifiers:\nApache-2.0\nBSL-1.0\nBSD-2.0\nBSD-2-Clause\nBSD-3-Clause\nGPL-3.0-only\nLGPL-3.0-only\nMIT\nMIT-0`, 'warn');
      return true;
    }
    out('usage: ros2 pkg {create,executables,list,prefix,xml}', 'err'); return false;
  };
  ROS2.bag = function (a, out, o) {
    const s = a[0];
    if (s === 'record') {
      const all = opt(a, '-a', '--all');
      const name = optVal(a, '-o', '--output');
      const topics = posArgs(a.slice(1), ['-o', '--output', '-s', '--storage', '--max-bag-size', '--max-bag-duration']);
      if (!all && !topics.length) { out('Need to specify one of --all OR --all-topics OR --all-services, topic_names or --regex', 'err'); return false; }
      const bag = ROS.bag.record(all ? 'all' : topics, name, { out: x => this.print(x) });
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      proc.stop = () => { bag.stop(); out(`[INFO] [rosbag2_cpp]: Writing remaining messages from cache to the bag. It may take a while\n[INFO] [rosbag2_recorder]: Event publisher thread: Exiting\n[INFO] [rosbag2_recorder]: Recording stopped\n💡 저장됨: ${bag.name}  (${bag.msgs.length}개 메시지) → ros2 bag info ${bag.name}`); finish(); };
      this.attach(proc, o.bg, 'bag');
      return true;
    }
    if (s === 'info') { const t = ROS.bag.info(a[1]); if (!t) { out(`[ERROR] [rosbag2_storage]: No storage could be initialized from the inputs. (저장된 bag: ${ROS.bag.list().join(', ') || '없음'})`, 'err'); return false; } out(t); return true; }
    if (s === 'list') { out(ROS.bag.list().join('\n') || '(저장된 bag 이 없습니다)'); return true; }
    if (s === 'play') {
      const name = posArgs(a.slice(1), ['-r', '--rate'])[0];
      if (!ROS.bag.bags[name]) { out(`[ERROR] [rosbag2_player]: bag '${name}' 를 찾을 수 없습니다 (ros2 bag list)`, 'err'); return false; }
      let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }) };
      const ti = a.indexOf('--topics'); const topics = ti >= 0 ? a.slice(ti + 1).filter((x, i, arr) => !x.startsWith('-') && !arr.slice(0, i).some(y => y.startsWith('-'))) : null;
      const h = ROS.bag.play(name, { rate: +(optVal(a, '-r', '--rate') || 1), loop: opt(a, '-l', '--loop'), topics: topics && topics.length ? topics : null }, { out: x => this.print(x), done: () => finish() });
      proc.stop = () => { h.stop(); finish(); };
      this.attach(proc, o.bg, 'bag');
      return true;
    }
    out('usage: ros2 bag {record,play,info,list}', 'err'); return false;
  };
  ROS2.doctor = ROS2.wtf = function (a, out) {
    if (opt(a, '--report', '-r')) {
      out(`\n   NETWORK CONFIGURATION\ninet         : 127.0.0.1\nflags        : 73<UP,LOOPBACK,RUNNING>\n\n   PLATFORM INFORMATION\nsystem           : Linux\nplatform info    : Linux-6.8.0-45-generic-x86_64-with-glibc2.39\nrelease          : 6.8.0-45-generic\nprocessor        : x86_64\n\n   QOS COMPATIBILITY LIST\ncompatibility status    : No publisher/subscriber pairs found\n\n   RMW MIDDLEWARE\nmiddleware name    : ${this.env.RMW_IMPLEMENTATION}\n\n   ROS 2 INFORMATION\ndistribution name      : jazzy\ndistribution type      : ros2\ndistribution status    : active\nrelease platforms      : {'debian': ['bookworm'], 'rhel': ['9'], 'ubuntu': ['noble']}\n\n   TOPIC LIST\n${ROS.topicList().map(t => `topic               : ${t.name}\npublisher count     : ${t.pubs}\nsubscriber count    : ${t.subs}`).join('\n')}`);
      return true;
    }
    const warns = [];
    ROS.topicList().forEach(t => { if (t.pubs && !t.subs && !/rosout|parameter_events/.test(t.name)) warns.push(`UserWarning: Publisher without subscriber detected on ${t.name}.`); if (t.subs && !t.pubs) warns.push(`UserWarning: Subscriber without publisher detected on ${t.name}.`); });
    out(warns.map(w => '/opt/ros/jazzy/lib/python3.12/site-packages/ros2doctor/api/topic.py: 42: ' + w).join('\n'));
    out(`\nAll ${5} checks passed`);
    return true;
  };
  ROS2.lifecycle = function (a, out) {
    const s = a[0];
    const lc = ROS.nodes().filter(n => n.lifecycle);
    if (s === 'nodes') { out(lc.map(n => n.fqn).join('\n')); return true; }
    const n = ROS.findNode(a[1] || '');
    if (!n || !n.lifecycle) { out(`Node not found`, 'err'); return false; }
    if (s === 'get') { const st = n.lifecycle.state; const id = { unconfigured: 1, inactive: 2, active: 3, finalized: 4 }[String(st).toLowerCase()] || 0; out(`${String(st).toLowerCase()} [${id}]`); return true; }
    if (s === 'list') { out(n.lifecycle.available().map(t => `- ${t}`).join('\n')); return true; }
    if (s === 'set') { const ok = n.lifecycle.trigger(a[2]); const lr = n.lifecycle.lastResult; out(ok ? 'Transitioning successful' : (lr === 'failure' || lr === 'error') ? 'Transitioning failed' : 'Unknown transition requested, available ones are:\n' + n.lifecycle.available().map(t => `- ${t}`).join('\n'), ok ? null : 'err'); return ok; }
    out('usage: ros2 lifecycle {get,list,nodes,set}', 'err'); return false;
  };
  ROS2.control = function (a, out) {
    const s = a[0];
    const srv = ROS.serviceList().find(x => /\/list_controllers$/.test(x.name));
    if (!srv) { out('Could not contact service /controller_manager/list_controllers\n💡 ros2_control 을 쓰는 로봇(예: ros2 launch so_arm101_bringup sim.launch.py)을 먼저 실행하세요', 'err'); return false; }
    if (s === 'list_controllers') {
      return ROS.callService(srv.name, null, {}).then(r => { out((r.controller || []).map(c => `${c.name.padEnd(26)} ${c.type.padEnd(56)} ${c.state}`).join('\n')); return true; }, e => { out(e.message, 'err'); return false; });
    }
    if (s === 'list_hardware_interfaces') {
      return ROS.callService(srv.name, null, {}).then(r => { out('command interfaces\n' + (r.controller || []).flatMap(c => c.claimed_interfaces || []).map(i => `\t${i} [available] [claimed]`).join('\n')); return true; });
    }
    out('usage: ros2 control {list_controllers,list_hardware_interfaces}  (브라우저에서는 이 두 가지를 지원합니다)', 'err'); return false;
  };
  ROS2.daemon = function (a, out) { out(a[0] === 'status' ? 'The daemon is running' : a[0] === 'stop' ? 'The daemon has been stopped' : a[0] === 'start' ? 'The daemon has been started' : 'usage: ros2 daemon {start,status,stop}'); return true; };
  ROS2.component = function (a, out) { out(a[0] === 'types' ? 'composition\n  composition::Talker\n  composition::Listener\n  composition::Server\n  composition::Client' : a[0] === 'list' ? '(실행 중인 컴포넌트 컨테이너가 없습니다)' : 'usage: ros2 component {list,load,standalone,types,unload}'); return true; };
  ROS2.multicast = function (a, out, o) {
    if (a[0] === 'receive') { out('Waiting for UDP multicast datagram...'); let finish; const proc = { pid: 0, nodes: [], done: new Promise(r => { finish = r; }), stop: () => finish() }; setTimeout(() => out("Received from 192.168.0.12:43751: 'Hello World!'"), 1500); this.attach(proc, o.bg, 'mc'); return true; }
    if (a[0] === 'send') { out("Sending one UDP multicast datagram..."); return true; }
    out('usage: ros2 multicast {receive,send}'); return true;
  };

  /* ================================================== 공개 API · 위젯 */
  function create(el, opts) { return new Terminal(el, opts); }
  /** 코드 블록의 "▶ 터미널에서 실행" 버튼 → 활성 터미널 (없으면 새 창) */
  function runInTerminal(text) {
    let t = activeTerm && activeTerm.el.isConnected ? activeTerm : [...terms].reverse().find(x => x.el.isConnected);
    if (!t) { RosUI.openView('term', { run: text }); return; }
    t.el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (t.fg) { t.print('(실행 중인 명령을 멈추고 새 명령을 실행합니다)', 'muted'); t.interrupt(); }
    t.execScript(text);
  }
  RosUI.registerView('term', (el, o) => {
    el.classList.add('rterm-host');
    const box = document.createElement('div'); el.appendChild(box);
    const t = create(box, o);
    if (o.run) setTimeout(() => t.execScript(o.run), 60);
    return () => { if (t.fg) t.fg.stop(); t.bg.forEach(p => p.stop()); terms.delete(t); };
  }, { title: '터미널 — user@ros2: ~/ros2_ws', icon: '🖥️', w: 720, h: 420 });

  window.Term = { create, runInTerminal, VFS, terms, get active() { return activeTerm; }, splitArgs, parseLaunchPy, scanPackages, built, HOME, WS };
})();
