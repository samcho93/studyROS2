/* ===================================================================
   micro-ROS — 가상 ESP32 보드 + micro-ROS Agent
   · 패키지 micro_ros_agent (exe micro_ros_agent: udp4 --port 8888 | serial --dev /dev/ttyUSB0)
     실행 중이면 ROS.microRosAgent.running = true
   · 위젯 microros: 보드(LED · 버튼 · 가변저항 · 온도) — 에이전트가 없으면 /esp32_node 가 그래프에 나타나지 않습니다
   =================================================================== */
(function () {
  'use strict';
  const esc = RosUI.esc;

  /* ================================================== 에이전트 상태 (전역) */
  const A = ROS.microRosAgent = ROS.microRosAgent || { running: false, transport: null, port: null, dev: null, baud: null, proc: null, out: null, verbose: 4, clients: new Map() };
  const emit = () => ROS.graph.ev.emit('microros', A);
  const ts = () => { const t = ROS.graph.nowSec(); return `[${t.toFixed(6)}]`; };
  /** micro-ROS Agent 로그 한 줄 (실제 형식과 같은 열 맞춤) */
  function alog(file, fn, what, detail, level) {
    const line = `${ts()} ${(level || 'info').padEnd(8)} | ${file.padEnd(18)} | ${fn.padEnd(24)} | ${what.padEnd(22)} | ${detail}`;
    if (A.out) A.out(line);
    ROS.graph.ev.emit('microros-log', line);
    return line;
  }
  A.log = alog;
  const hex = n => '0x' + n.toString(16).toUpperCase().padStart(8, '0');
  const oid = (n, kind) => `0x${n.toString(16).toUpperCase().padStart(3, '0')}(${kind})`;

  const USAGE = `Usage: 'micro_ros_agent <udp4|udp6|tcp4|tcp6|canfd|serial|multiserial|pseudoterminal> [OPTIONS]'
Available arguments (per transport):
  * COMMON
    -h/--help.
    -m/--middleware <value> (rtps, ced, dds) [default: 'dds'].
    -r/--refs <value>.
    -v/--verbose <value> ( - ) [default: '' (4)].
  * IPvX (udp4, udp6, tcp4, tcp6)
    -p/--port <value>.
  * SERIAL (serial, multiserial, pseudoterminal)
    -D/--dev <value>.
    -b/--baudrate <value> [default: '115200'].`;

  function startAgent(argv, out, proc) {
    const tr = argv[0];
    const TRS = ['udp4', 'udp6', 'tcp4', 'tcp6', 'serial', 'multiserial', 'pseudoterminal', 'canfd'];
    if (!tr || tr === '-h' || tr === '--help' || !TRS.includes(tr)) { (out || console.log)(USAGE); return null; }
    let port = null, dev = null, baud = 115200, verbose = 4;
    for (let i = 1; i < argv.length; i++) {
      const a = argv[i];
      if (a === '-p' || a === '--port') port = +argv[++i];
      else if (a === '-D' || a === '--dev') dev = argv[++i];
      else if (a === '-b' || a === '--baudrate') baud = +argv[++i];
      else if (a === '-v' || a === '--verbose') verbose = +argv[++i] || 6;
      else if (/^-v\d$/.test(a)) verbose = +a.slice(2);
    }
    const ip = /^(udp|tcp)/.test(tr);
    if (ip && !port) { (out || console.log)(`Error: argument '-p/--port' is required for transport '${tr}'\n` + USAGE); return null; }
    if (!ip && tr !== 'canfd' && !dev) { (out || console.log)(`Error: argument '-D/--dev' is required for transport '${tr}'\n` + USAGE); return null; }
    if (A.running) {
      const same = A.transport === tr && (ip ? A.port === port : A.dev === dev);
      const l = same ? (ip ? `${ts()} error    | UDPv4AgentLinux.cpp | init                     | bind error             | port: ${port}, errno: 98` : `${ts()} error    | TermiosAgentLinux.cpp | init                     | open device error      | device: ${dev}, errno: 16 (Device or resource busy)`) : null;
      if (l) { (out || console.log)(l); return null; }
    }
    Object.assign(A, { running: true, transport: tr, port, dev, baud, verbose, proc, out: out || null });
    if (ip) alog(tr === 'udp4' ? 'UDPv4AgentLinux.cpp' : tr === 'udp6' ? 'UDPv6AgentLinux.cpp' : 'TCPv4AgentLinux.cpp', 'init', 'running...', `port: ${port}`);
    else alog('TermiosAgentLinux.cpp', 'init', 'running...', `fd: 3`);
    alog('Root.cpp', 'set_verbose_level', 'logger setup', `verbose_level: ${verbose}`);
    emit();
    return () => {
      A.clients.forEach(c => { try { c.kill && c.kill('agent'); } catch (_) {} });
      Object.assign(A, { running: false, proc: null, out: null });
      emit();
    };
  }
  A.start = (argv, out) => { const p = ROS.run('micro_ros_agent', 'micro_ros_agent', argv, { out: out || (() => {}) }); return p; };

  ROS.registerPkg('micro_ros_agent', {
    desc: 'micro-ROS Agent — MCU(ESP32 등)의 XRCE-DDS 클라이언트를 ROS 2(DDS) 그래프에 이어 줍니다',
    exes: {
      micro_ros_agent(ctx) {
        const raw = ctx.argv.slice();
        const stop = startAgent(raw, ctx.out, ctx.proc);
        if (!stop) return { oneshot: true };
        return { nodes: [], stop };
      }
    }
  });

  /* ================================================== 보드 코드 (보여 주기용, 실제 API 이름) */
  const ARDUINO = `// ESP32 + micro_ros_arduino (Arduino IDE / PlatformIO)
#include <micro_ros_arduino.h>
#include <rcl/rcl.h>
#include <rcl/error_handling.h>
#include <rclc/rclc.h>
#include <rclc/executor.h>
#include <std_msgs/msg/int32.h>
#include <std_msgs/msg/bool.h>
#include <std_msgs/msg/float32.h>

#define LED_PIN     2     // 보드 LED (PWM)
#define BUTTON_PIN  4     // 버튼 (INPUT_PULLUP)
#define POT_PIN     34    // 가변저항 (ADC 12비트: 0~4095)

rcl_publisher_t pot_pub, button_pub, temp_pub;
rcl_subscription_t led_sub, bright_sub;
std_msgs__msg__Int32   pot_msg, bright_msg;
std_msgs__msg__Bool    button_msg, led_msg;
std_msgs__msg__Float32 temp_msg;

rclc_support_t support;
rcl_allocator_t allocator;
rcl_node_t node;
rcl_timer_t timer;
rclc_executor_t executor;

bool led_on = false;
int  brightness = 255;
bool last_button = false;
int  tick = 0;

#define RCCHECK(fn) { rcl_ret_t temp_rc = fn; if ((temp_rc != RCL_RET_OK)) { error_loop(); } }
#define RCSOFTCHECK(fn) { rcl_ret_t temp_rc = fn; if ((temp_rc != RCL_RET_OK)) {} }

void error_loop() {                    // 초기화 실패 → LED 빠르게 깜빡이며 멈춤
  while (1) { digitalWrite(LED_PIN, !digitalRead(LED_PIN)); delay(100); }
}

void apply_led() { ledcWrite(LED_PIN, led_on ? brightness : 0); }   // ESP32 Arduino core 3.x

void timer_callback(rcl_timer_t * timer, int64_t last_call_time) {
  RCLC_UNUSED(last_call_time);
  if (timer == NULL) return;
  pot_msg.data = analogRead(POT_PIN);                    // 10 Hz
  RCSOFTCHECK(rcl_publish(&pot_pub, &pot_msg, NULL));

  bool pressed = digitalRead(BUTTON_PIN) == LOW;
  if (pressed != last_button) {                          // 바뀔 때만
    last_button = pressed;
    button_msg.data = pressed;
    RCSOFTCHECK(rcl_publish(&button_pub, &button_msg, NULL));
  }
  if (++tick % 10 == 0) {                                // 1 Hz
    temp_msg.data = temperatureRead();                   // 칩 내부 온도 [°C]
    RCSOFTCHECK(rcl_publish(&temp_pub, &temp_msg, NULL));
  }
}

void led_callback(const void * msgin) {
  const std_msgs__msg__Bool * msg = (const std_msgs__msg__Bool *)msgin;
  led_on = msg->data;
  apply_led();
}

void brightness_callback(const void * msgin) {
  const std_msgs__msg__Int32 * msg = (const std_msgs__msg__Int32 *)msgin;
  brightness = constrain(msg->data, 0, 255);
  apply_led();
}

void setup() {
  // Wi-Fi(UDP) 로 에이전트에 접속 — 시리얼(USB)이라면 set_microros_transports();
  set_microros_wifi_transports("robot-lab", "password", "192.168.0.10", 8888);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  ledcAttach(LED_PIN, 5000, 8);                          // 5 kHz, 8비트 PWM
  delay(2000);

  allocator = rcl_get_default_allocator();
  RCCHECK(rclc_support_init(&support, 0, NULL, &allocator));      // ← 여기서 에이전트와 세션을 맺습니다
  RCCHECK(rclc_node_init_default(&node, "esp32_node", "", &support));

  RCCHECK(rclc_publisher_init_default(&pot_pub, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Int32), "esp32/pot"));
  RCCHECK(rclc_publisher_init_default(&button_pub, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Bool), "esp32/button"));
  RCCHECK(rclc_publisher_init_best_effort(&temp_pub, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Float32), "esp32/temperature"));

  RCCHECK(rclc_subscription_init_default(&led_sub, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Bool), "esp32/led"));
  RCCHECK(rclc_subscription_init_default(&bright_sub, &node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Int32), "esp32/led_brightness"));

  // Jazzy: rclc_timer_init_default2(…, true)  /  Humble: rclc_timer_init_default(…)
  RCCHECK(rclc_timer_init_default2(&timer, &support, RCL_MS_TO_NS(100), timer_callback, true));

  // 핸들 3개 = 타이머 1 + 구독 2
  RCCHECK(rclc_executor_init(&executor, &support.context, 3, &allocator));
  RCCHECK(rclc_executor_add_timer(&executor, &timer));
  RCCHECK(rclc_executor_add_subscription(&executor, &led_sub, &led_msg, &led_callback, ON_NEW_DATA));
  RCCHECK(rclc_executor_add_subscription(&executor, &bright_sub, &bright_msg, &brightness_callback, ON_NEW_DATA));
}

void loop() {
  RCSOFTCHECK(rclc_executor_spin_some(&executor, RCL_MS_TO_NS(10)));
  delay(1);
}`;
  const CMDS = `# ── PC: micro-ROS Agent 실행 (둘 중 하나) ─────────────────────────
# (A) 소스 빌드한 micro_ros_setup 작업공간
ros2 run micro_ros_agent micro_ros_agent udp4 --port 8888          # Wi-Fi(UDP)
ros2 run micro_ros_agent micro_ros_agent serial --dev /dev/ttyUSB0 # USB 시리얼 (기본 115200)
# (B) Docker — 설치 없이
docker run -it --rm --net=host microros/micro-ros-agent:jazzy udp4 --port 8888
docker run -it --rm -v /dev:/dev --privileged microros/micro-ros-agent:jazzy serial --dev /dev/ttyUSB0

# ── 확인 ──────────────────────────────────────────────────────────
ros2 node list                        # /esp32_node  ← 보드가 세션을 맺은 뒤에만!
ros2 topic echo /esp32/pot
ros2 topic hz /esp32/pot              # ≈ 10 Hz
ros2 topic pub --once /esp32/led std_msgs/msg/Bool "{data: true}"
ros2 topic pub --once /esp32/led_brightness std_msgs/msg/Int32 "{data: 64}"

# ── 보드 펌웨어 ───────────────────────────────────────────────────
# Arduino IDE : 라이브러리 micro_ros_arduino (ROS 2 배포판과 같은 버전 브랜치)
# ESP-IDF     : micro_ros_espidf_component
#   idf.py menuconfig → micro-ROS Settings → WiFi SSID/PW, Agent IP/Port
#   코드에서는 rcl_init_options + rmw_uros_options_set_udp_address(CONFIG_MICRO_ROS_AGENT_IP,
#   CONFIG_MICRO_ROS_AGENT_PORT, rmw_options) 후 rclc_support_init_with_options(…) 사용
# PlatformIO  : micro_ros_platformio (board_microros_transport = wifi | serial)

# ── 재연결 패턴 (공식 예제 micro-ros_reconnection_example) ─────────
#   WAITING_AGENT  → rmw_uros_ping_agent(100, 1) 성공 → create_entities()
#   AGENT_CONNECTED→ 주기적으로 ping, 실패하면 AGENT_DISCONNECTED → destroy_entities()`;

  /* ================================================== 보드 SVG */
  function boardSvg() {
    const pins = (y) => Array.from({ length: 15 }, (_, i) => `<rect class="wmr-pin" x="${64 + i * 15}" y="${y}" width="7" height="7" rx="1.5"/>`).join('');
    return `<svg class="wmr-svg" viewBox="0 0 540 250" role="img" aria-label="가상 ESP32 보드">
      <!-- 브레드보드 -->
      <rect class="wmr-bb" x="332" y="18" width="198" height="214" rx="10"/>
      ${Array.from({ length: 12 }, (_, r) => Array.from({ length: 11 }, (_, c) => `<circle class="wmr-hole" cx="${346 + c * 17}" cy="${34 + r * 17}" r="1.6"/>`).join('')).join('')}
      <!-- 전선 -->
      <path class="wmr-wire w1" d="M 257 49 C 300 49, 300 72, 360 72"/>
      <path class="wmr-wire w2" d="M 242 49 C 300 30, 420 40, 470 72"/>
      <path class="wmr-wire w3" d="M 227 196 C 300 210, 380 206, 420 190"/>
      <!-- PCB -->
      <rect class="wmr-pcb" x="40" y="42" width="260" height="162" rx="10"/>
      ${pins(46)}${pins(193)}
      <text class="wmr-silk" x="64" y="66">3V3 EN VP VN 34 35 32 33 25 26 27 14 12 GND 13</text>
      <text class="wmr-silk" x="64" y="188">GND 23 22 TX RX 21 GND 19 18 5 17 16 4 0 2</text>
      <!-- ESP32-WROOM 모듈 -->
      <g class="wmr-mod" data-hit="chip">
        <rect class="wmr-modpcb" x="52" y="74" width="150" height="98" rx="4"/>
        <path class="wmr-ant" d="M 60 82 h 20 v 12 h -14 v 10 h 14 v 12 h -14 v 10 h 14 v 12 h -20"/>
        <rect class="wmr-can" x="92" y="80" width="104" height="86" rx="3"/>
        <text class="wmr-cant" x="144" y="112">ESP32-WROOM-32</text>
        <text class="wmr-cant sm" x="144" y="128">Wi-Fi · BT · 240 MHz</text>
        <text class="wmr-temp" x="144" y="152">🌡 --.- °C</text>
      </g>
      <!-- 버튼 EN / BOOT -->
      <g data-hit="en" class="wmr-hit"><rect class="wmr-tact" x="222" y="152" width="22" height="18" rx="3"/><circle class="wmr-tactc" cx="233" cy="161" r="5"/><text class="wmr-silk" x="222" y="180">EN</text></g>
      <rect class="wmr-tact" x="222" y="80" width="22" height="18" rx="3"/><circle class="wmr-tactc" cx="233" cy="89" r="5"/><text class="wmr-silk" x="218" y="76">BOOT</text>
      <!-- 전원 LED, GPIO2 LED -->
      <circle class="wmr-pwr" cx="262" cy="96" r="4.5"/><text class="wmr-silk" x="252" y="112">PWR</text>
      <circle class="wmr-led2 glow" cx="262" cy="140" r="11"/><circle class="wmr-led2" cx="262" cy="140" r="4.5"/><text class="wmr-silk" x="252" y="160">IO2</text>
      <!-- USB -->
      <rect class="wmr-usb" x="286" y="108" width="26" height="30" rx="3"/><text class="wmr-silk" x="282" y="152">USB</text>
      <!-- 가변저항 (GPIO34) -->
      <g class="wmr-hit" data-hit="pot">
        <circle class="wmr-potb" cx="372" cy="104" r="30"/>
        <g class="wmr-knob"><circle class="wmr-potk" cx="372" cy="104" r="20"/><rect class="wmr-potm" x="370" y="84" width="4" height="14" rx="2"/></g>
      </g>
      <text class="wmr-lbl" x="372" y="150">가변저항 · IO34</text>
      <text class="wmr-val wmr-potv" x="372" y="166">0</text>
      <!-- 버튼 (GPIO4) -->
      <g class="wmr-hit" data-hit="btn">
        <rect class="wmr-btnb" x="448" y="80" width="46" height="46" rx="6"/>
        <circle class="wmr-btnc" cx="471" cy="103" r="15"/>
      </g>
      <text class="wmr-lbl" x="471" y="150">버튼 · IO4</text>
      <text class="wmr-val wmr-btnv" x="471" y="166">떼어짐</text>
      <!-- 외부 LED (IO2 PWM) -->
      <circle class="wmr-xled glow" cx="420" cy="200" r="20"/>
      <path class="wmr-xledb" d="M 410 208 v -14 a 10 10 0 0 1 20 0 v 14 z"/>
      <line class="wmr-leg" x1="414" y1="208" x2="414" y2="222"/><line class="wmr-leg" x1="426" y1="208" x2="426" y2="218"/>
      <text class="wmr-lbl" x="480" y="206">LED · IO2</text>
      <text class="wmr-val wmr-ledv" x="480" y="222">꺼짐</text>
    </svg>`;
  }

  /* ================================================== 위젯 */
  function microrosView(el, opts) {
    opts = opts || {};
    const owner = opts.owner || el;
    const nodeName = opts.name || 'esp32_node';
    const root = document.createElement('div');
    root.className = 'wmr';
    root.innerHTML = `
      <div class="wmr-steps">
        <div class="wmr-step" data-s="1"><b>① micro-ROS Agent</b><span class="wmr-ss small">꺼짐</span><div class="wmr-sb"><button class="btn tiny primary" data-a="agent">▶ 에이전트 실행</button></div></div>
        <div class="wmr-arrow">→</div>
        <div class="wmr-step" data-s="2"><b>② 보드 전원 · 세션</b><span class="wmr-ss small">전원 꺼짐</span><div class="wmr-sb"><button class="btn tiny" data-a="power">🔌 USB 전원</button><button class="btn tiny ghost" data-a="reset" title="EN 버튼 = 리셋">↺ RESET</button></div></div>
        <div class="wmr-arrow">→</div>
        <div class="wmr-step" data-s="3"><b>③ ROS 2 그래프</b><span class="wmr-ss small"><code>/${esc(nodeName)}</code> 없음</span><div class="wmr-sb small muted">ros2 node list</div></div>
      </div>
      <div class="wmr-cfg small">
        <span>연결 방식</span>
        <span class="w-seg wmr-tr"><button data-tr="udp" class="on">Wi-Fi (UDP 8888)</button><button data-tr="serial">USB 시리얼</button></span>
        <span class="muted wmr-agcmd"></span>
      </div>
      <div class="w-seg wmr-tabs"><button data-tab="board" class="on">🔧 보드</button><button data-tab="code">📄 Arduino 코드</button><button data-tab="cmd">⌨ 명령어</button></div>
      <div class="wmr-page" data-page="board">
        <div class="wmr-boardwrap">${boardSvg()}</div>
        <div class="w-help wmr-hint">가변저항은 끌어서 돌리고, 버튼은 누르고 있으면 눌림입니다. 칩(모듈)을 누르고 있으면 손가락 열로 온도가 올라갑니다.</div>
        <div class="wmr-link">
          <span class="wmr-lk b">ESP32<br><small>rclc 앱 · XRCE-DDS 클라이언트</small></span>
          <span class="wmr-lk-a"><i class="wmr-lk-l1"></i><small class="wmr-lk-t1">XRCE-DDS · UDP</small></span>
          <span class="wmr-lk a">micro-ROS Agent<br><small>PC · 대리인(proxy)</small></span>
          <span class="wmr-lk-a"><i class="wmr-lk-l2"></i><small>DDS (RTPS)</small></span>
          <span class="wmr-lk g">ROS 2 그래프<br><small>ros2 node list</small></span>
        </div>
        <div class="wmr-logs">
          <div><div class="wmr-lt">📟 시리얼 모니터 (보드)</div><pre class="wmr-log wmr-slog"></pre></div>
          <div><div class="wmr-lt">🖥 micro-ROS Agent 로그</div><pre class="wmr-log wmr-alog"></pre></div>
        </div>
        <div class="wmr-pc">
          <div class="wmr-lt">💻 PC 쪽 ROS 2 에서 보이는 값 <span class="muted small">(ros2 topic echo)</span></div>
          <div class="wmr-vals w-out">
            <span>/esp32/pot <b data-v="pot">—</b></span><span>/esp32/button <b data-v="button">—</b></span><span>/esp32/temperature <b data-v="temp">—</b></span><span class="muted" data-v="hz"></span>
          </div>
          <div class="wmr-cmd">
            <button class="btn small" data-a="led">💡 /esp32/led ← true</button>
            <label class="small">/esp32/led_brightness <input type="range" min="0" max="255" value="255" class="wmr-br"> <b class="w-out wmr-brv">255</b></label>
          </div>
        </div>
      </div>
      <div class="wmr-page" data-page="code" hidden><pre class="wmr-code">${esc(ARDUINO)}</pre>
        <div class="w-help">핵심 순서: <code>rclc_support_init</code>(에이전트와 세션) → <code>rclc_node_init_default</code> → <code>rclc_publisher_init_default</code> / <code>rclc_subscription_init_default</code> → <code>rclc_timer_init_default2</code> → <code>rclc_executor_init</code> + <code>rclc_executor_add_*</code> → <code>loop()</code> 에서 <code>rclc_executor_spin_some</code>.
        에이전트가 없으면 <code>rclc_support_init</code> 가 실패해 <code>RCCHECK</code> → <code>error_loop()</code> 로 빠집니다.</div></div>
      <div class="wmr-page" data-page="cmd" hidden><pre class="wmr-code">${esc(CMDS)}</pre></div>`;
    el.appendChild(root);
    const $ = s => root.querySelector(s);
    const svg = $('.wmr-svg');

    /* ---- 보드 상태 */
    const S = { power: false, state: 'off', tr: opts.transport === 'serial' ? 'serial' : 'udp', pot: 1200, btn: false, temp: 41.5, heat: false, led: false, bright: 255, node: null, key: (Math.random() * 0xffffffff) >>> 0, timers: [], bootT: 0, lastPing: 0, pubs: null };
    const slog = [], alogL = [];
    const push = (arr, box, line, cls) => { arr.push(`<span class="${cls || ''}">${esc(line)}</span>`); while (arr.length > 60) arr.shift(); box.innerHTML = arr.join('\n'); box.scrollTop = box.scrollHeight; };
    const serial = (line, cls) => push(slog, $('.wmr-slog'), line, cls);
    const offLog = ROS.on('microros-log', line => push(alogL, $('.wmr-alog'), line, /error/.test(line) ? 'bad' : /session established|created/.test(line) ? 'ok' : ''));
    const offAg = ROS.on('microros', () => { updateSteps(); if (!A.running && S.state === 'connected') lostAgent(); });

    function agentMatches() {
      if (!A.running) return false;
      if (S.tr === 'udp') return A.transport === 'udp4' && A.port === 8888;
      return (A.transport === 'serial' || A.transport === 'multiserial') && A.dev === '/dev/ttyUSB0';
    }
    function later(ms, fn) { const t = setTimeout(() => { S.timers = S.timers.filter(x => x !== t); if (root.isConnected) fn(); }, ms); S.timers.push(t); }
    function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; }

    function powerOn() {
      S.power = true; S.state = 'boot'; slog.length = 0;
      serial('ets Jul 29 2019 12:21:46', 'muted');
      serial('rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)', 'muted');
      serial('configsip: 0, SPIWP:0xee · mode:DIO, clock div:1', 'muted');
      serial('entry 0x400805e4', 'muted');
      later(500, () => {
        if (S.tr === 'udp') {
          serial("[wifi] connecting to 'robot-lab' ...");
          later(700, () => { serial('[wifi] connected, IP 192.168.0.42', 'ok'); S.state = 'waiting'; serial('[micro-ROS] agent 192.168.0.10:8888 찾는 중 (rmw_uros_ping_agent)…'); pingLoop(); });
        } else { serial('[micro-ROS] serial transport /dev/ttyUSB0 @115200'); S.state = 'waiting'; pingLoop(); }
      });
      updateSteps();
    }
    function powerOff(reason) {
      if (S.node) destroyEntities(reason || 'power');
      clearTimers(); S.power = false; S.state = 'off'; S.led = false;
      updateSteps();
    }
    let waitCount = 0;
    function pingLoop() {
      if (!S.power || S.state !== 'waiting') return;
      if (agentMatches()) { waitCount = 0; connect(); return; }
      waitCount++;
      if (waitCount === 1 || waitCount % 5 === 0) {
        let why = '에이전트 응답 없음';
        if (A.running) why = S.tr === 'udp' ? `에이전트가 ${A.transport}${A.port ? ':' + A.port : ' ' + (A.dev || '')} 로 기다리는 중 — 보드는 udp4:8888 로 접속합니다 (방식/포트 불일치)` : `에이전트가 ${A.transport} 로 기다리는 중 — 보드는 serial /dev/ttyUSB0 로 접속합니다 (방식 불일치)`;
        serial(`[micro-ROS] ping 실패 (${waitCount}) — ${why}. 재시도…`, 'warn');
      }
      later(1000, pingLoop);
    }
    function connect() {
      S.state = 'connecting'; updateSteps();
      serial('[micro-ROS] agent 응답! rclc_support_init() → XRCE-DDS 세션 생성', 'ok');
      const key = hex(S.key), sid = '0x81', addr = S.tr === 'udp' ? '192.168.0.42:47138' : 'fd: 3';
      alog('Root.cpp', 'create_client', 'create', `client_key: ${key}, session_id: ${sid}`);
      alog('SessionManager.hpp', 'establish_session', 'session established', `client_key: ${key}, address: ${addr}`);
      later(250, () => {
        if (!agentMatches() || !S.power) { S.state = 'waiting'; pingLoop(); return; }
        alog('ProxyClient.cpp', 'create_participant', 'participant created', `client_key: ${key}, participant_id: ${oid(0, 1)}`);
        const topics = ['esp32/pot', 'esp32/button', 'esp32/temperature'];
        topics.forEach((t, i) => {
          alog('ProxyClient.cpp', 'create_topic', 'topic created', `client_key: ${key}, topic_id: ${oid(i, 2)}, participant_id: ${oid(0, 1)}`);
          alog('ProxyClient.cpp', 'create_publisher', 'publisher created', `client_key: ${key}, publisher_id: ${oid(i, 3)}, participant_id: ${oid(0, 1)}`);
          alog('ProxyClient.cpp', 'create_datawriter', 'datawriter created', `client_key: ${key}, datawriter_id: ${oid(i, 5)}, publisher_id: ${oid(i, 3)}`);
        });
        ['esp32/led', 'esp32/led_brightness'].forEach((t, j) => {
          const i = j + 3;
          alog('ProxyClient.cpp', 'create_topic', 'topic created', `client_key: ${key}, topic_id: ${oid(i, 2)}, participant_id: ${oid(0, 1)}`);
          alog('ProxyClient.cpp', 'create_subscriber', 'subscriber created', `client_key: ${key}, subscriber_id: ${oid(j, 4)}, participant_id: ${oid(0, 1)}`);
          alog('ProxyClient.cpp', 'create_datareader', 'datareader created', `client_key: ${key}, datareader_id: ${oid(j, 6)}, subscriber_id: ${oid(j, 4)}`);
        });
        createEntities();
      });
    }
    function createEntities() {
      const n = ROS.createNode(nodeName, { owner, pkg: 'micro_ros', exe: 'esp32 firmware', namespace: opts.ns || '/' });
      n.microros = { key: S.key, transport: S.tr };
      const pPot = n.createPublisher('std_msgs/msg/Int32', 'esp32/pot', 10);
      const pBtn = n.createPublisher('std_msgs/msg/Bool', 'esp32/button', 10);
      const pTmp = n.createPublisher('std_msgs/msg/Float32', 'esp32/temperature', 'sensor_data');
      n.createSubscription('std_msgs/msg/Bool', 'esp32/led', m => { S.led = !!m.data; }, 10);
      n.createSubscription('std_msgs/msg/Int32', 'esp32/led_brightness', m => { S.bright = Math.max(0, Math.min(255, m.data | 0)); }, 10);
      let tick = 0, lastBtn = null;
      n.createTimer(0.1, () => {
        pPot.publish({ data: Math.round(S.pot) });
        if (S.btn !== lastBtn) { lastBtn = S.btn; pBtn.publish({ data: S.btn }); }
        if (++tick % 10 === 0) pTmp.publish({ data: +S.temp.toFixed(2) });
      });
      S.node = n; S.state = 'connected';
      const client = { kill: why => { if (S.node) lostAgent(); } };
      A.clients.set(S.key, client); S.client = client;
      serial(`[micro-ROS] 노드 /${nodeName} 생성 · 퍼블리셔 3 · 구독 2 · executor 핸들 3`, 'ok');
      updateSteps();
    }
    function destroyEntities(reason) {
      const key = hex(S.key);
      if (S.node) { S.node.destroy(); S.node = null; }
      A.clients.delete(S.key);
      if (A.running && reason !== 'agent') {
        alog('SessionManager.hpp', 'destroy_session', 'session closed', `client_key: ${key}, address: ${S.tr === 'udp' ? '192.168.0.42:47138' : 'fd: 3'}`);
        alog('Root.cpp', 'delete_client', 'delete', `client_key: ${key}`);
      }
    }
    function lostAgent() {
      serial('[micro-ROS] ping 실패 → AGENT_DISCONNECTED: destroy_entities() — 노드가 그래프에서 사라집니다', 'bad');
      destroyEntities('agent');
      S.state = 'waiting'; updateSteps();
      later(1000, pingLoop);
    }

    function updateSteps() {
      const st1 = $('[data-s="1"]'), st2 = $('[data-s="2"]'), st3 = $('[data-s="3"]');
      const tr = A.running ? (A.port ? `${A.transport} :${A.port}` : `${A.transport} ${A.dev || ''}`) : '';
      st1.className = 'wmr-step ' + (A.running ? (agentMatches() || !S.power ? 'ok' : 'warn') : '');
      st1.querySelector('.wmr-ss').textContent = A.running ? `실행 중 · ${tr}${A.proc && A.proc === ownAgent ? '' : ' (터미널)'}` : '꺼짐 — 에이전트가 없으면 보드는 그래프에 못 들어옵니다';
      const ab = $('[data-a=agent]');
      ab.textContent = A.running ? '■ 에이전트 종료' : '▶ 에이전트 실행';
      ab.classList.toggle('primary', !A.running);
      const s2 = { off: '전원 꺼짐', boot: '부팅 중…', waiting: '에이전트 찾는 중 (ping)…', connecting: '세션 맺는 중…', connected: 'XRCE-DDS 세션 연결됨' }[S.state];
      st2.className = 'wmr-step ' + (S.state === 'connected' ? 'ok' : S.state === 'waiting' ? 'warn' : S.power ? 'busy' : '');
      st2.querySelector('.wmr-ss').textContent = s2;
      $('[data-a=power]').classList.toggle('on', S.power);
      $('[data-a=power]').textContent = S.power ? '⏻ 전원 끄기' : '🔌 USB 전원';
      st3.className = 'wmr-step ' + (S.node ? 'ok' : '');
      st3.querySelector('.wmr-ss').innerHTML = S.node ? `<code>${esc(S.node.fqn)}</code> 보임 · 토픽 5개` : `<code>/${esc(nodeName)}</code> 없음`;
      $('.wmr-agcmd').textContent = S.tr === 'udp' ? '에이전트: udp4 --port 8888' : '에이전트: serial --dev /dev/ttyUSB0';
      root.classList.toggle('wmr-on', S.power); root.classList.toggle('wmr-conn', !!S.node);
      root.classList.toggle('wmr-agent', A.running);
      $('.wmr-lk-t1').textContent = S.tr === 'udp' ? 'XRCE-DDS · UDP 8888' : 'XRCE-DDS · Serial';
      $('[data-a=led]').disabled = false;
    }

    /* ---- 버튼들 */
    let ownAgent = null;
    $('[data-a=agent]').onclick = () => {
      if (A.running) { if (A.proc) A.proc.stop(); return; }
      const argv = S.tr === 'udp' ? ['udp4', '--port', '8888'] : ['serial', '--dev', '/dev/ttyUSB0'];
      alogL.length = 0;
      push(alogL, $('.wmr-alog'), '$ ros2 run micro_ros_agent micro_ros_agent ' + argv.join(' '), 'muted');
      try { ownAgent = A.start(argv, null); A.out = null; } catch (e) { push(alogL, $('.wmr-alog'), e.message, 'bad'); }
      updateSteps();
    };
    $('[data-a=power]').onclick = () => (S.power ? (powerOff('power'), serial('— 전원 꺼짐 —', 'muted')) : powerOn());
    const reset = () => { if (!S.power) { powerOn(); return; } powerOff('reset'); serial('— RESET (EN) —', 'muted'); later(150, powerOn); };
    $('[data-a=reset]').onclick = reset;
    root.querySelectorAll('[data-tr]').forEach(b => b.onclick = () => {
      if (S.tr === b.dataset.tr) return;
      S.tr = b.dataset.tr; root.querySelectorAll('[data-tr]').forEach(x => x.classList.toggle('on', x === b));
      if (S.power) reset(); else updateSteps();
    });
    root.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => {
      root.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
      root.querySelectorAll('[data-page]').forEach(p => { p.hidden = p.dataset.page !== b.dataset.tab; });
    });
    $('[data-a=led]').onclick = () => {
      const want = !(lastSeen.led === true);
      ROS.publishOnce('/esp32/led', 'std_msgs/msg/Bool', { data: want });
      lastSeen.led = want;
      $('[data-a=led]').textContent = `💡 /esp32/led ← ${!want}`;
    };
    $('.wmr-br').oninput = e => { $('.wmr-brv').textContent = e.target.value; ROS.publishOnce('/esp32/led_brightness', 'std_msgs/msg/Int32', { data: +e.target.value }); };

    /* ---- 보드 조작 (포인터) */
    const toSvg = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) * 540 / r.width, (e.clientY - r.top) * 250 / r.height]; };
    let drag = null;
    svg.addEventListener('pointerdown', e => {
      const hit = e.target.closest('[data-hit]'); if (!hit) return;
      const h = hit.dataset.hit;
      e.preventDefault(); svg.setPointerCapture(e.pointerId);
      if (h === 'pot') { drag = 'pot'; potFrom(e); }
      else if (h === 'btn') { drag = 'btn'; S.btn = true; }
      else if (h === 'chip') { drag = 'chip'; S.heat = true; }
      else if (h === 'en') reset();
    });
    function potFrom(e) { const [x, y] = toSvg(e); let a = Math.atan2(x - 372, -(y - 104)) * 180 / Math.PI; a = Math.max(-135, Math.min(135, a)); S.pot = (a + 135) / 270 * 4095; }
    svg.addEventListener('pointermove', e => { if (drag === 'pot') potFrom(e); });
    const end = () => { if (drag === 'btn') S.btn = false; if (drag === 'chip') S.heat = false; drag = null; };
    svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', e => { if (!e.target.closest('[data-hit=pot]')) return; e.preventDefault(); S.pot = Math.max(0, Math.min(4095, S.pot - Math.sign(e.deltaY) * 150)); }, { passive: false });

    /* ---- PC 쪽 값 (그래프에 흔적을 남기지 않도록 pub 이벤트로 엿봄) */
    const lastSeen = { pot: null, button: null, temp: null, led: null };
    const ns = (opts.ns || '').replace(/\/$/, '');
    const offPub = ROS.on('pub', (topic, msg) => {
      if (topic === ns + '/esp32/pot') lastSeen.pot = msg.data;
      else if (topic === ns + '/esp32/button') lastSeen.button = msg.data;
      else if (topic === ns + '/esp32/temperature') lastSeen.temp = msg.data;
      else if (topic === ns + '/esp32/led') { lastSeen.led = !!msg.data; $('[data-a=led]').textContent = `💡 /esp32/led ← ${!msg.data}`; }
    });

    /* ---- 그리기 루프 */
    const knob = svg.querySelector('.wmr-knob');
    let acc = 0;
    const stop = RosUI.loop(root, dt => {
      // 온도: 기본 40~42 °C, 누르면 오름
      const target = S.power ? (S.heat ? 55 : 41.5) : 25;
      S.temp += (target - S.temp) * Math.min(1, dt * (S.heat ? 0.35 : 0.12)) + (Math.random() - 0.5) * 0.02;
      knob.setAttribute('transform', `rotate(${(S.pot / 4095) * 270 - 135} 372 104)`);
      svg.querySelector('.wmr-potv').textContent = Math.round(S.pot);
      svg.querySelector('.wmr-btnv').textContent = S.btn ? '눌림' : '떼어짐';
      svg.querySelector('.wmr-btnc').classList.toggle('on', S.btn);
      svg.querySelector('.wmr-temp').textContent = S.power ? `🌡 ${S.temp.toFixed(1)} °C` : '🌡 --.- °C';
      // LED: 연결 전에는 대기 깜빡임(에이전트 찾는 중), 연결 후에는 /esp32/led 로
      let lv = 0;
      if (S.power) {
        if (S.state === 'connected') lv = S.led ? S.bright / 255 : 0;
        else if (S.state === 'waiting') lv = (performance.now() % 1000) < 120 ? 0.9 : 0;
      }
      svg.querySelectorAll('.wmr-led2, .wmr-xled').forEach(c => { c.style.opacity = c.classList.contains('glow') ? lv * 0.9 : 0.25 + lv * 0.75; });
      svg.querySelector('.wmr-xledb').style.opacity = 0.45 + lv * 0.55;
      svg.querySelector('.wmr-pwr').classList.toggle('on', S.power);
      svg.querySelector('.wmr-ledv').textContent = S.state === 'connected' ? (S.led ? `켜짐 · ${S.bright}` : '꺼짐') : S.state === 'waiting' ? '대기 깜빡임' : '꺼짐';
      acc += dt;
      if (acc > 0.25) {
        acc = 0;
        const v = k => lastSeen[k] == null ? '—' : String(k === 'temp' ? (+lastSeen[k]).toFixed(1) : lastSeen[k]);
        const con = !!S.node;
        root.querySelector('[data-v=pot]').textContent = con ? v('pot') : '—';
        root.querySelector('[data-v=button]').textContent = con ? v('button') : '—';
        root.querySelector('[data-v=temp]').textContent = con ? v('temp') : '—';
        const hz = ROS.hz(ns + '/esp32/pot');
        root.querySelector('[data-v=hz]').textContent = con ? `pot ${hz.toFixed(1)} Hz` : 'ros2 topic echo: 아직 토픽이 없습니다 (노드 없음)';
      }
    });
    // 문서에서 빠지면 정리 (노드는 owner 로 자동 정리)
    const watch = setInterval(() => { if (!root.isConnected) { clearInterval(watch); dispose(); } }, 1000);
    function dispose() { stop(); clearTimers(); offLog(); offAg(); offPub(); A.clients.delete(S.key); if (ownAgent && !ownAgent.stopped && !(el.closest && el.closest('.rwin'))) ownAgent.stop(); }
    updateSteps();
    serial('보드 전원이 꺼져 있습니다. ① 에이전트 → ② 전원 순서로 켜 보세요. (순서를 바꿔도 됩니다 — 보드가 ping 으로 기다립니다)', 'muted');
    if (A.running) push(alogL, $('.wmr-alog'), `(에이전트가 이미 실행 중입니다: ${A.transport} ${A.port || A.dev || ''})`, 'muted');
    else push(alogL, $('.wmr-alog'), '(에이전트가 실행되지 않았습니다 — 위의 ▶ 버튼 또는 터미널에서\n  ros2 run micro_ros_agent micro_ros_agent udp4 --port 8888)', 'muted');
    if (opts.power === '1') powerOn();
    return () => { clearInterval(watch); powerOff('power'); dispose(); };
  }

  RosUI.registerView('microros', microrosView, { title: 'micro-ROS — ESP32', icon: '🔌', w: 860, h: 720 });
  Widgets.register('microros', (el, o) => {
    const body = RosUI.frame(el, '📟', 'micro-ROS — 가상 ESP32 보드와 에이전트');
    return microrosView(body, Object.assign({}, o, { owner: el }));
  }, { title: 'micro-ROS ESP32' });
})();
