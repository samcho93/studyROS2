/* 2장 — 노드와 토픽 */
Course.lesson({
  id: 'ch02', no: '02',
  icon: '📡',
  title: '노드와 토픽',
  subtitle: '로봇 프로그램들은 어떻게 서로 이야기할까?',
  level: '입문', time: '120분',
  goals: [
    '노드와 토픽의 관계를 rqt_graph 모양(타원 · 사각형)으로 그려 설명할 수 있다',
    '퍼블리셔 · 서브스크라이버가 서로를 몰라도 되는 이유(익명 · 느슨한 연결)와 다대다 연결을 말할 수 있다',
    'ros2 node list/info, ros2 topic list/info/type/echo/hz/pub 로 실행 중인 시스템을 들여다볼 수 있다',
    '--ros-args -r 로 노드 이름과 토픽 이름을 바꾸는(리매핑) 방법을 쓸 수 있다',
    'rclpy talker/listener 코드에서 퍼블리셔 · 서브스크라이버를 만드는 줄을 찾을 수 있다'
  ],
  teacher: {
    intro: '교실 스피커로 라디오를 틀어 놓고 시작합니다. “방송국은 누가 듣고 있는지 알까요? 듣는 사람은 방송국 주소를 알아야 할까요?” — 둘 다 “아니요”. 주파수(채널 이름)만 맞추면 된다는 것이 오늘 배울 토픽의 핵심입니다. (3분)',
    flow: '① 도입 · 노드 개념 15분 → ② 토픽 · 퍼블리셔/서브스크라이버 + comm 위젯 20분 → ③ turtlesim 으로 메시지 흐름 보기(teleop · echo) 15분 → ④ ros2 topic 명령 실습 25분 → ⑤ rqt_graph · rqt_plot 10분 → ⑥ 리매핑 · 이름 규칙 15분 → ⑦ 파이썬 talker/listener 10분 → ⑧ 퀴즈 · 정리 10분'
  },

  figs: {
    /* ---------------------------------------------------------------- 로봇 = 노드들 */
    robotNodes: {
      caption: '한 대의 모바일 로봇을 노드로 나눈 모습 — 노드마다 한 가지 일만 하고, 토픽으로 데이터를 주고받습니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="카메라, 라이다, 인식, 경로 계획, 모터 드라이버 노드와 토픽 연결">
  <ellipse cx="110" cy="70" rx="90" ry="30" class="blue"/><text x="110" y="64" class="t-b t-c t-mono">/camera</text><text x="110" y="84" class="t-xs t-c t-mu">📷 사진 찍기</text>
  <ellipse cx="110" cy="200" rx="90" ry="30" class="blue"/><text x="110" y="194" class="t-b t-c t-mono">/lidar</text><text x="110" y="214" class="t-xs t-c t-mu">📡 거리 재기</text>
  <ellipse cx="110" cy="330" rx="90" ry="30" class="blue"/><text x="110" y="324" class="t-b t-c t-mono">/wheel_odom</text><text x="110" y="344" class="t-xs t-c t-mu">🛞 바퀴 회전 세기</text>

  <rect x="240" y="50" width="130" height="40" rx="6" class="green"/><text x="305" y="70" class="t-sm t-c t-mono">/image_raw</text>
  <rect x="240" y="180" width="130" height="40" rx="6" class="green"/><text x="305" y="200" class="t-sm t-c t-mono">/scan</text>
  <rect x="240" y="310" width="130" height="40" rx="6" class="green"/><text x="305" y="330" class="t-sm t-c t-mono">/odom</text>
  <line x1="200" y1="70" x2="238" y2="70" class="ln-green ar-green"/>
  <line x1="200" y1="200" x2="238" y2="200" class="ln-green ar-green"/>
  <line x1="200" y1="330" x2="238" y2="330" class="ln-green ar-green"/>

  <ellipse cx="510" cy="100" rx="96" ry="30" class="blue"/><text x="510" y="94" class="t-b t-c t-mono">/detector</text><text x="510" y="114" class="t-xs t-c t-mu">🧠 사람 찾기</text>
  <ellipse cx="510" cy="260" rx="96" ry="30" class="blue"/><text x="510" y="254" class="t-b t-c t-mono">/planner</text><text x="510" y="274" class="t-xs t-c t-mu">🗺️ 길 정하기</text>
  <line x1="370" y1="70" x2="424" y2="90" class="ln-green ar-green"/>
  <line x1="370" y1="200" x2="424" y2="244" class="ln-green ar-green"/>
  <line x1="370" y1="330" x2="430" y2="278" class="ln-green ar-green"/>
  <rect x="444" y="162" width="130" height="36" rx="6" class="green"/><text x="509" y="180" class="t-sm t-c t-mono">/people</text>
  <line x1="510" y1="130" x2="510" y2="160" class="ln-green ar-green"/>
  <line x1="510" y1="198" x2="510" y2="228" class="ln-green ar-green"/>

  <rect x="630" y="240" width="110" height="40" rx="6" class="green"/><text x="685" y="260" class="t-sm t-c t-mono">/cmd_vel</text>
  <line x1="606" y1="260" x2="628" y2="260" class="ln-green ar-green"/>
  <ellipse cx="790" cy="330" rx="80" ry="30" class="blue"/><text x="790" y="324" class="t-b t-c t-mono">/motor</text><text x="790" y="344" class="t-xs t-c t-mu">⚙️ 바퀴 돌리기</text>
  <line x1="720" y1="280" x2="760" y2="302" class="ln-green ar-green"/>

  <rect x="630" y="30" width="236" height="150" rx="12" class="box"/>
  <text x="748" y="54" class="t-b t-c">노드를 나누면 좋은 점</text>
  <text x="646" y="84" class="t-sm">✔ 하나가 죽어도 나머지는 동작</text>
  <text x="646" y="108" class="t-sm">✔ 부품 교체가 쉬움 (카메라 바꾸기)</text>
  <text x="646" y="132" class="t-sm">✔ 여러 사람이 나눠서 개발</text>
  <text x="646" y="156" class="t-sm">✔ 다른 컴퓨터로 옮겨 실행 가능</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 퍼블리셔 · 서브스크라이버 */
    pubsub: {
      caption: '토픽 = 이름 붙은 방송 채널. 퍼블리셔는 채널에 "발행"만 하고, 서브스크라이버는 채널을 "구독"만 합니다. 서로의 존재를 몰라도 됩니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="퍼블리셔 노드가 토픽에 발행하고 서브스크라이버 노드들이 구독">
  <ellipse cx="130" cy="150" rx="110" ry="40" class="blue"/>
  <text x="130" y="140" class="t-b t-c t-mono">/talker</text>
  <text x="130" y="162" class="t-xs t-c">퍼블리셔 (Publisher)</text>
  <text x="130" y="210" class="t-xl t-c">📻</text>
  <text x="130" y="244" class="t-xs t-c t-mu">"방송국" — 누가 듣든 발행</text>

  <rect x="330" y="118" width="220" height="64" rx="8" class="green"/>
  <text x="440" y="140" class="t-b t-c t-mono">/chatter</text>
  <text x="440" y="164" class="t-xs t-c">std_msgs/msg/String</text>
  <text x="440" y="206" class="t-xs t-c t-mu">토픽 이름 + 메시지 타입</text>
  <text x="440" y="226" class="t-xs t-c t-mu">= 주파수 + 방송 형식</text>

  <line x1="240" y1="150" x2="328" y2="150" class="ln-green thick ar-green moving"/>
  <text x="284" y="132" class="t-xs t-c t-green">발행</text>

  <ellipse cx="750" cy="70" rx="110" ry="34" class="blue"/>
  <text x="750" y="62" class="t-b t-c t-mono">/listener</text><text x="750" y="82" class="t-xs t-c">서브스크라이버</text>
  <ellipse cx="750" cy="150" rx="110" ry="34" class="blue"/>
  <text x="750" y="142" class="t-b t-c t-mono">/logger</text><text x="750" y="162" class="t-xs t-c">서브스크라이버</text>
  <ellipse cx="750" cy="230" rx="110" ry="34" class="blue"/>
  <text x="750" y="222" class="t-b t-c t-mono">/display</text><text x="750" y="242" class="t-xs t-c">서브스크라이버</text>
  <line x1="550" y1="140" x2="642" y2="80" class="ln-green thick ar-green moving"/>
  <line x1="550" y1="150" x2="638" y2="150" class="ln-green thick ar-green moving"/>
  <line x1="550" y1="160" x2="642" y2="222" class="ln-green thick ar-green moving"/>
  <text x="598" y="100" class="t-xs t-c t-green">구독</text>
  <text x="750" y="284" class="t-xs t-c t-mu">"청취자" — 채널만 맞추면 수신</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 다대다 */
    manyToMany: {
      caption: '토픽은 다대다(N:M) — 퍼블리셔도 여럿, 서브스크라이버도 여럿일 수 있고, 한 노드가 여러 토픽을 동시에 발행 · 구독할 수도 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 320" role="img" aria-label="여러 퍼블리셔와 여러 서브스크라이버가 한 토픽을 공유">
  <ellipse cx="120" cy="70" rx="100" ry="30" class="blue"/><text x="120" y="70" class="t-sm t-c t-mono t-b">/teleop_key</text>
  <ellipse cx="120" cy="160" rx="100" ry="30" class="blue"/><text x="120" y="160" class="t-sm t-c t-mono t-b">/joystick</text>
  <ellipse cx="120" cy="250" rx="100" ry="30" class="blue"/><text x="120" y="250" class="t-sm t-c t-mono t-b">/autopilot</text>
  <rect x="330" y="132" width="200" height="56" rx="8" class="green"/>
  <text x="430" y="152" class="t-b t-c t-mono">/turtle1/cmd_vel</text>
  <text x="430" y="172" class="t-xs t-c">geometry_msgs/msg/Twist</text>
  <line x1="220" y1="76" x2="336" y2="136" class="ln-green ar-green"/>
  <line x1="220" y1="160" x2="328" y2="160" class="ln-green ar-green"/>
  <line x1="220" y1="244" x2="336" y2="184" class="ln-green ar-green"/>
  <ellipse cx="740" cy="90" rx="110" ry="30" class="blue"/><text x="740" y="90" class="t-sm t-c t-mono t-b">/turtlesim</text>
  <ellipse cx="740" cy="230" rx="110" ry="30" class="blue"/><text x="740" y="230" class="t-sm t-c t-mono t-b">/cmd_logger</text>
  <line x1="530" y1="150" x2="632" y2="100" class="ln-green ar-green"/>
  <line x1="530" y1="172" x2="632" y2="222" class="ln-green ar-green"/>
  <text x="120" y="300" class="t-sm t-c t-b">퍼블리셔 3개</text>
  <text x="430" y="226" class="t-sm t-c t-b">토픽 1개</text>
  <text x="740" y="290" class="t-sm t-c t-b">서브스크라이버 2개</text>
  <rect x="330" y="24" width="200" height="60" rx="10" class="yellow"/>
  <text x="430" y="44" class="t-xs t-c">⚠ 여러 명이 같은 토픽에 발행하면</text>
  <text x="430" y="64" class="t-xs t-c">받는 쪽은 섞인 메시지를 받음</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 메시지 흐름 */
    msgFlow: {
      caption: '메시지 한 개가 전달되는 과정 — 발행 → 미들웨어(DDS)가 전달 → 받는 쪽 대기열 → 콜백 함수 실행',
      svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="타이머, 발행, DDS, 대기열, 콜백 순서">
  <rect x="14" y="40" width="160" height="120" rx="12" class="blue"/>
  <text x="94" y="66" class="t-b t-c t-blue">talker 노드</text>
  <text x="94" y="96" class="t-sm t-c">⏰ 타이머 0.5초</text>
  <text x="94" y="120" class="t-xs t-c t-mono">msg.data = 'Hello'</text>
  <text x="94" y="142" class="t-xs t-c t-mono">pub.publish(msg)</text>
  <line x1="174" y1="100" x2="210" y2="100" class="ln-green ar-green"/>
  <rect x="212" y="40" width="200" height="120" rx="12" class="purple"/>
  <text x="312" y="66" class="t-b t-c t-purple">미들웨어 (DDS)</text>
  <text x="312" y="96" class="t-sm t-c">같은 토픽 이름 ·</text>
  <text x="312" y="118" class="t-sm t-c">같은 타입의 구독자를</text>
  <text x="312" y="140" class="t-sm t-c">찾아서 복사 전달</text>
  <line x1="412" y1="100" x2="448" y2="100" class="ln-green ar-green moving"/>
  <rect x="450" y="40" width="190" height="120" rx="12" class="green"/>
  <text x="545" y="66" class="t-b t-c t-green">받는 쪽 대기열</text>
  <rect x="470" y="88" width="34" height="30" rx="4" class="box"/><text x="487" y="103" class="t-xs t-c">✉</text>
  <rect x="510" y="88" width="34" height="30" rx="4" class="box"/><text x="527" y="103" class="t-xs t-c">✉</text>
  <rect x="550" y="88" width="34" height="30" rx="4" class="box"/><text x="567" y="103" class="t-xs t-c">✉</text>
  <rect x="590" y="88" width="34" height="30" rx="4" class="box"/>
  <text x="545" y="140" class="t-xs t-c">깊이 10 (QoS depth)</text>
  <line x1="640" y1="100" x2="676" y2="100" class="ln-green ar-green"/>
  <rect x="678" y="40" width="190" height="120" rx="12" class="blue"/>
  <text x="773" y="66" class="t-b t-c t-blue">listener 노드</text>
  <text x="773" y="96" class="t-sm t-c">spin() 이 꺼내서</text>
  <text x="773" y="120" class="t-xs t-c t-mono">listener_callback(msg)</text>
  <text x="773" y="142" class="t-xs t-c">"I heard: Hello"</text>
  <rect x="14" y="186" width="854" height="80" rx="12" class="box"/>
  <text x="441" y="210" class="t-sm t-c">📌 받는 쪽은 "언제 올지 모르는" 메시지를 기다리지 않고, 도착하면 불리는 <tspan class="t-b">콜백(callback) 함수</tspan>로 처리합니다</text>
  <text x="441" y="236" class="t-sm t-c">📌 대기열이 가득 차면 가장 오래된 메시지부터 버려집니다 (신뢰성 · 깊이 설정은 11장 QoS)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- turtlesim 그래프 */
    turtleGraph: {
      caption: 'turtlesim 과 turtle_teleop_key 를 켰을 때의 rqt_graph — teleop 이 /turtle1/cmd_vel 로 속도를 보내고, turtlesim 이 /turtle1/pose 로 위치를 알립니다',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="teleop_turtle 노드, cmd_vel 토픽, turtlesim 노드, pose 토픽">
  <ellipse cx="120" cy="100" rx="105" ry="34" class="blue"/>
  <text x="120" y="100" class="t-b t-c t-mono">/teleop_turtle</text>
  <rect x="290" y="74" width="200" height="52" rx="6" class="green"/>
  <text x="390" y="94" class="t-b t-c t-mono">/turtle1/cmd_vel</text>
  <text x="390" y="112" class="t-xs t-c t-mu">geometry_msgs/msg/Twist</text>
  <ellipse cx="640" cy="100" rx="100" ry="34" class="blue"/>
  <text x="640" y="100" class="t-b t-c t-mono">/turtlesim</text>
  <line x1="225" y1="100" x2="288" y2="100" class="ln-green thick ar-green moving"/>
  <line x1="490" y1="100" x2="538" y2="100" class="ln-green thick ar-green moving"/>
  <rect x="570" y="180" width="200" height="52" rx="6" class="green"/>
  <text x="670" y="200" class="t-b t-c t-mono">/turtle1/pose</text>
  <text x="670" y="218" class="t-xs t-c t-mu">turtlesim/msg/Pose · 약 60 Hz</text>
  <line x1="660" y1="134" x2="668" y2="178" class="ln-green ar-green moving"/>
  <text x="790" y="206" class="t-sm">→ 구독자가</text>
  <text x="790" y="226" class="t-sm">없어도 발행</text>
  <rect x="20" y="170" width="440" height="66" rx="10" class="box"/>
  <text x="240" y="192" class="t-sm t-c">⌨ 방향키 → Twist { linear.x: 2.0 } 발행</text>
  <text x="240" y="216" class="t-sm t-c">🐢 turtlesim 이 받아 거북이를 앞으로 이동</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 리매핑 */
    remap: {
      caption: '리매핑(remapping) — 코드를 고치지 않고 실행할 때 이름만 바꿔 연결을 바꿉니다. teleop 이 turtle1 대신 turtle2 를 조종하게 만든 예',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="리매핑 전후 비교">
  <text x="20" y="28" class="t-b">기본 실행</text>
  <ellipse cx="130" cy="80" rx="100" ry="30" class="blue"/><text x="130" y="80" class="t-sm t-c t-mono t-b">/teleop_turtle</text>
  <rect x="300" y="56" width="200" height="48" rx="6" class="green"/><text x="400" y="80" class="t-sm t-c t-mono t-b">/turtle1/cmd_vel</text>
  <line x1="230" y1="80" x2="298" y2="80" class="ln-green ar-green"/>
  <line x1="500" y1="80" x2="574" y2="80" class="ln-green ar-green"/>
  <text x="610" y="80" class="t-xl t-c">🐢</text><text x="680" y="80" class="t-sm">turtle1 이 움직임</text>

  <line x1="20" y1="136" x2="860" y2="136" class="ln dash"/>
  <text x="20" y="164" class="t-b">리매핑 실행</text>
  <text x="140" y="164" class="t-xs t-mono t-orange">--ros-args -r turtle1/cmd_vel:=turtle2/cmd_vel</text>
  <ellipse cx="130" cy="226" rx="100" ry="30" class="blue"/><text x="130" y="226" class="t-sm t-c t-mono t-b">/teleop_turtle</text>
  <rect x="300" y="202" width="200" height="48" rx="6" class="orange"/><text x="400" y="226" class="t-sm t-c t-mono t-b">/turtle2/cmd_vel</text>
  <line x1="230" y1="226" x2="298" y2="226" class="ln-orange ar-orange"/>
  <line x1="500" y1="226" x2="574" y2="226" class="ln-orange ar-orange"/>
  <text x="610" y="226" class="t-xl t-c">🐢</text><text x="680" y="226" class="t-sm">turtle2 가 움직임</text>
  <text x="440" y="284" class="t-sm t-c t-mu">코드 속 이름 'turtle1/cmd_vel' 은 그대로 — 실행할 때 연결만 바뀜</text>
</svg>`
    },

    /* ---------------------------------------------------------------- HTML 도표 */
    topicCmds: `<table class="tbl">
  <thead><tr><th>명령</th><th>하는 일</th><th>자주 쓰는 옵션</th></tr></thead>
  <tbody>
    <tr><td><code>ros2 topic list</code></td><td>지금 있는 토픽 이름 목록</td><td><code>-t</code> 타입도 함께 · <code>-v</code> 발행/구독 수</td></tr>
    <tr><td><code>ros2 topic info &lt;토픽&gt;</code></td><td>타입, 퍼블리셔 · 서브스크라이버 수</td><td><code>-v</code> 노드 이름 · QoS 까지</td></tr>
    <tr><td><code>ros2 topic type &lt;토픽&gt;</code></td><td>메시지 타입만 출력</td><td></td></tr>
    <tr><td><code>ros2 topic echo &lt;토픽&gt;</code></td><td>흘러가는 메시지를 화면에 출력</td><td><code>--once</code> 한 개만 · <code>--field x</code> 한 필드만</td></tr>
    <tr><td><code>ros2 topic hz &lt;토픽&gt;</code></td><td>초당 몇 번 발행되는지(주기) 측정</td><td></td></tr>
    <tr><td><code>ros2 topic pub &lt;토픽&gt; &lt;타입&gt; "&lt;값&gt;"</code></td><td>명령줄에서 직접 메시지 발행</td><td><code>--once</code> 한 번 · <code>--rate 1</code> 1 Hz 반복</td></tr>
  </tbody>
</table>`,

    nameRules: `<table class="tbl cmp">
  <thead><tr><th>구분</th><th>예</th><th>규칙 · 뜻</th></tr></thead>
  <tbody>
    <tr><td>노드 이름</td><td><code>talker</code>, <code>camera_front</code></td><td>영문자 · 숫자 · 밑줄(_)만, 숫자로 시작 불가. 슬래시(/) 불가</td></tr>
    <tr><td>전체 이름(FQN)</td><td><code>/robot1/talker</code></td><td>네임스페이스 + 노드 이름. 같은 전체 이름의 노드가 둘이면 혼란이 생김</td></tr>
    <tr><td>상대 토픽 이름</td><td><code>chatter</code>, <code>turtle1/cmd_vel</code></td><td>노드의 네임스페이스가 앞에 붙음 → <code>/robot1/chatter</code></td></tr>
    <tr><td>절대 토픽 이름</td><td><code>/chatter</code></td><td>/ 로 시작 — 네임스페이스와 상관없이 그대로</td></tr>
    <tr><td>개인(private) 이름</td><td><code>~/status</code></td><td>노드 이름이 붙음 → <code>/talker/status</code></td></tr>
    <tr><td>토픽 이름 규칙</td><td><code>/scan</code>, <code>/camera/image_raw</code></td><td>영문자 · 숫자 · 밑줄 · 슬래시. 슬래시로 끝나면 안 되고, 각 토막이 숫자로 시작하면 안 됨</td></tr>
  </tbody>
</table>`
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '노드 — 한 가지 일을 맡은 작은 프로그램',
      html: `
<p><b>노드(node)</b>는 ROS 2 그래프의 기본 단위로, <b>한 가지 일만 맡은 실행 프로그램</b>입니다. 카메라 노드는 사진만 찍고, 인식 노드는 사진에서 사람만 찾고, 모터 노드는 바퀴만 돌립니다. 이렇게 잘게 나눈 노드들이 서로 데이터를 주고받아 하나의 로봇이 됩니다.</p>
{{fig:robotNodes}}
<div class="box analogy"><div class="box-t">🏢 비유 — 회사의 부서</div>
회사에는 영업부 · 개발부 · 회계부가 따로 있고, 각 부서는 자기 일만 하며 <b>정해진 서류 양식</b>으로 소통합니다. 한 부서의 담당자가 바뀌어도 서류 양식만 지키면 회사는 굴러가죠. 노드 = 부서, 메시지 = 서류 양식, 토픽 = 사내 게시판입니다.</div>

<p>실행 중인 노드를 확인하는 명령은 두 가지입니다. <code>ros2 node list</code> 는 노드 이름 목록을, <code>ros2 node info</code> 는 그 노드가 <b>무엇을 발행 · 구독하고 어떤 서비스 · 액션을 제공하는지</b> 보여 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 node info /turtlesim</code></pre>
<pre class="code out" data-lang="출력"><code>/turtlesim
  Subscribers:
    /parameter_events: rcl_interfaces/msg/ParameterEvent
    /turtle1/cmd_vel: geometry_msgs/msg/Twist
  Publishers:
    /parameter_events: rcl_interfaces/msg/ParameterEvent
    /rosout: rcl_interfaces/msg/Log
    /turtle1/color_sensor: turtlesim/msg/Color
    /turtle1/pose: turtlesim/msg/Pose
  Service Servers:
    /clear: std_srvs/srv/Empty
    /spawn: turtlesim/srv/Spawn
    ...
  Action Servers:
    /turtle1/rotate_absolute: turtlesim/action/RotateAbsolute</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 노드 들여다보기</div>
<ol>
  <li>아래 실습 창에는 turtlesim 노드가 이미 켜져 있습니다. 터미널에 <code>ros2 node list</code> 를 입력하세요.</li>
  <li><code>ros2 node info /turtlesim</code> 으로 turtlesim 이 <b>구독</b>하는 토픽(Subscribers)을 찾아보세요. 거북이를 움직이려면 어느 토픽에 보내야 할까요?</li>
  <li><code>ros2 run turtlesim turtle_teleop_key</code> 를 실행하고 터미널을 클릭한 뒤 방향키로 거북이를 움직여 보세요. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춘 뒤 다시 <code>ros2 node list</code> — teleop 노드가 켜져 있을 때와 비교해 보세요.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=노드 살펴보기 — 터미널 + turtlesim}}
<div class="box tip"><div class="box-t">💡 /parameter_events 와 /rosout 은 뭐죠?</div>
모든 노드가 기본으로 가지는 토픽입니다. <code>/rosout</code> 은 로그(<code>get_logger().info(...)</code>)가 모이는 곳, <code>/parameter_events</code> 는 파라미터가 바뀔 때 알림이 나가는 곳이에요(6장). 지금은 무시해도 됩니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '토픽 — 이름 붙은 방송 채널',
      html: `
<p><b>토픽(topic)</b>은 노드끼리 데이터를 주고받는 <b>이름 붙은 통로(버스)</b>입니다. 데이터를 보내는 쪽을 <b>퍼블리셔(publisher, 발행자)</b>, 받는 쪽을 <b>서브스크라이버(subscriber, 구독자)</b>라고 합니다.</p>
{{fig:pubsub}}
<div class="box analogy"><div class="box-t">📻 비유 — 라디오 방송</div>
방송국(퍼블리셔)은 <b>FM 91.9</b> 같은 주파수(토픽 이름)로 방송만 합니다. 누가 듣는지 모르고, 아무도 안 들어도 방송은 계속돼요. 청취자(서브스크라이버)는 주파수만 맞추면 되고, 방송국 주소를 알 필요가 없습니다. 단, <b>방송 형식(메시지 타입)</b>이 맞아야 알아들을 수 있죠.</div>

<div class="vs">
  <div class="vs-a blue"><b>토픽의 특징</b><ul>
    <li><b>익명 · 느슨한 연결</b>: 보내는 쪽과 받는 쪽이 서로를 모름</li>
    <li><b>일방향 · 연속</b>: 센서값처럼 계속 흐르는 데이터에 알맞음</li>
    <li><b>다대다</b>: 발행자 · 구독자가 몇 개든 가능</li>
    <li>응답(받았다는 확인)이 없음</li>
  </ul></div>
  <div class="vs-mid">→</div>
  <div class="vs-b green"><b>그래서 좋은 점</b><ul>
    <li>카메라 드라이버를 바꿔도 인식 노드는 그대로</li>
    <li>디버깅용 구독자(echo, rqt)를 언제든 끼워 넣기</li>
    <li>기록(rosbag)해 두었다가 똑같이 재생</li>
    <li>"요청-응답"이 필요하면 서비스(4장)</li>
  </ul></div>
</div>
{{fig:manyToMany}}

<p>아래 위젯은 토픽 통신을 애니메이션으로 보여 줍니다. 위젯이 만든 노드는 진짜 ROS 그래프에 등록되므로, 터미널에서 <code>ros2 topic list</code> 로도 보입니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 방송과 구독</div>
<ol>
  <li>위젯에서 메시지가 퍼블리셔 → 토픽 → 서브스크라이버로 흘러가는 모습을 관찰하세요.</li>
  <li>서브스크라이버를 추가하거나 빼 보세요. 퍼블리셔 쪽은 아무것도 바뀌지 않습니다(익명성).</li>
  <li>구독자가 하나도 없을 때도 퍼블리셔가 계속 발행하는지 확인해 보세요.</li>
</ol></div>
{{widget:comm|mode=topic}}`
    },

    /* ================================================================ 3 */
    {
      title: '거북이로 보는 메시지 흐름 — cmd_vel 과 pose',
      html: `
<p>turtlesim 은 실제 모바일 로봇과 같은 방식으로 동작합니다. <b>속도 명령</b>을 <code>/turtle1/cmd_vel</code> 토픽으로 받아 움직이고, 자기 <b>위치</b>를 <code>/turtle1/pose</code> 토픽으로 계속 발행합니다. <code>cmd_vel</code>(command velocity)은 실제 로봇에서도 거의 표준처럼 쓰이는 이름이에요.</p>
{{fig:turtleGraph}}
{{fig:msgFlow}}

<p>이번에는 키보드 대신 <b>가상 조이스틱</b>(teleop 위젯)으로 <code>/turtle1/cmd_vel</code> 에 발행하고, 토픽 모니터(echo 위젯)로 두 토픽의 메시지와 주기(Hz)를 동시에 지켜봅시다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 속도를 보내고 위치를 받기</div>
<ol>
  <li>가상 조이스틱의 손잡이를 위로 끌어 보세요(또는 조이스틱을 클릭한 뒤 <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>). 거북이가 움직입니다.</li>
  <li>토픽 모니터에서 <code>/turtle1/cmd_vel</code> 을 펼쳐 <code>linear.x</code>, <code>angular.z</code> 값이 조이스틱에 따라 바뀌는지 보세요.</li>
  <li><code>/turtle1/pose</code> 의 Hz 를 확인하세요. 조이스틱을 놓아도(구독자가 없어도) 위치는 계속 발행됩니다.</li>
  <li>조이스틱을 놓았을 때 <code>/turtle1/cmd_vel</code> 메시지가 멈추면 거북이는 어떻게 되나요? (turtlesim 은 약 1초 동안 명령이 없으면 멈춥니다)</li>
</ol></div>
<div class="two">
<div>{{widget:teleop}}</div>
<div>{{widget:turtlesim}}</div>
</div>
{{widget:echo}}
<div class="box note"><div class="box-t">📝 Twist 메시지</div>
<code>geometry_msgs/msg/Twist</code> 는 <code>linear</code>(x, y, z 방향 직진 속도, m/s)와 <code>angular</code>(x, y, z 축 회전 속도, rad/s) 두 묶음으로 이루어져 있습니다. 바닥을 달리는 로봇은 보통 <code>linear.x</code>(앞뒤)와 <code>angular.z</code>(좌우 회전)만 씁니다. 메시지 구조는 3장에서 자세히 봅니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'ros2 topic 명령 — 시스템을 들여다보는 청진기',
      html: `
<p>의사가 청진기로 몸 속 소리를 듣듯, <code>ros2 topic</code> 명령으로 실행 중인 로봇의 토픽을 들여다봅니다. 처음 보는 로봇 시스템을 만나면 가장 먼저 쓰는 명령들입니다.</p>
{{fig:topicCmds}}

<h4>① 목록 · 정보 · 타입</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic list
ros2 topic list -t
ros2 topic info /turtle1/cmd_vel
ros2 topic type /turtle1/pose</code></pre>
<pre class="code out" data-lang="출력"><code>/parameter_events [rcl_interfaces/msg/ParameterEvent]
/rosout [rcl_interfaces/msg/Log]
/turtle1/cmd_vel [geometry_msgs/msg/Twist]
/turtle1/color_sensor [turtlesim/msg/Color]
/turtle1/pose [turtlesim/msg/Pose]

Type: geometry_msgs/msg/Twist
Publisher count: 1
Subscription count: 1</code></pre>

<h4>② echo · hz — 흐르는 데이터 보기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /turtle1/pose --once</code></pre>
<p>필드 하나만 보고 싶으면 <code>--field</code> 를 붙입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /turtle1/pose --field x --once</code></pre>
<p><code>--once</code> 없이 <code>ros2 topic echo /turtle1/pose</code> 를 치면 멈출 때까지(<kbd>Ctrl</kbd>+<kbd>C</kbd>) 계속 출력됩니다. 발행 주기는 <code>hz</code> 로 잽니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /turtle1/pose</code></pre>
<pre class="code out" data-lang="출력"><code>average rate: 62.498
	min: 0.015s max: 0.017s std dev: 0.0005s window: 64</code></pre>

<h4>③ pub — 명령줄에서 직접 발행하기</h4>
<p>노드를 만들지 않고도 터미널에서 메시지를 보낼 수 있습니다. 형식은 <code>ros2 topic pub &lt;토픽&gt; &lt;타입&gt; "&lt;YAML 값&gt;"</code> 입니다. <code>--once</code> 는 한 번만, <code>--rate 1</code> 은 1초에 한 번씩 계속 보냅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 1.8}}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --rate 1 /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0, y: 0.0, z: 0.0}, angular: {x: 0.0, y: 0.0, z: 1.8}}"</code></pre>
<div class="box warn"><div class="box-t">⚠ YAML 쓸 때 흔한 실수</div>
<ul>
  <li>콜론 뒤에 <b>한 칸 띄우기</b>: <code>{x: 2.0}</code> ⭕ · <code>{x:2.0}</code> ❌</li>
  <li>전체를 <b>따옴표로 감싸기</b>: 셸이 중괄호 · 공백을 나누지 않게</li>
  <li>float 필드에는 <code>2.0</code> 처럼 소수점 — 자세한 건 3장</li>
</ul></div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 청진기 대기</div>
<ol>
  <li>①의 명령으로 turtlesim 의 토픽 목록과 타입을 확인하세요.</li>
  <li><code>ros2 topic echo /turtle1/pose</code> 를 켠 채로 오른쪽 거북이 화면의 방향 버튼을 눌러 보세요. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춥니다.</li>
  <li><code>--once</code> 발행으로 거북이가 호를 그리며 조금 움직이는지, <code>--rate 1</code> 로는 원을 그리며 계속 도는지 비교하세요.</li>
  <li><code>--rate 1</code> 발행을 켠 채 <code>ros2 topic info /turtle1/cmd_vel</code> 을 치면 Publisher count 가 늘어나 있을 거예요. (먼저 Ctrl+C 로 멈추고 쳐야 합니다)</li>
</ol></div>
{{widget:lab|with=turtlesim,graph|title=ros2 topic 실습 — 터미널 + turtlesim + rqt_graph|h=420}}`
    },

    /* ================================================================ 5 */
    {
      title: 'rqt_graph 와 rqt_plot — 연결과 값을 그림으로',
      html: `
<p>토픽이 많아지면 명령줄 목록만으로는 연결을 파악하기 어렵습니다. <b>rqt_graph</b> 는 노드(타원)와 토픽(사각형)의 연결을 그림으로 그려 줍니다. 진짜 Ubuntu 에서는 다음 명령으로 엽니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>rqt_graph</code></pre>
<p>rqt_graph 창의 왼쪽 위 목록에서 <b>"Nodes/Topics (all)"</b> 을 고르면 토픽까지 모두 보이고, <b>Hide: Debug</b> 체크를 풀면 <code>/rosout</code> 같은 기본 토픽도 보입니다. 연결이 바뀌면 새로 고침(↻) 버튼을 누르세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 그래프 읽기</div>
<ol>
  <li>아래 그래프에서 turtlesim 노드와 cmd_vel · pose 토픽을 찾으세요. 앞 절의 조이스틱 · 터미널 발행이 모두 같은 토픽으로 들어가는 것이 보이나요?</li>
  <li>그래프의 토픽 사각형을 클릭해 타입과 발행/구독 수를 확인하세요.</li>
  <li>rqt_plot 그래프에서 거북이의 x, y 값을 보며 거북이를 원으로 돌려 보세요(4절의 <code>--rate 1</code> 발행). 두 값이 사인 곡선처럼 오르내립니다.</li>
</ol></div>
{{widget:graph}}
{{widget:plot|topic=/turtle1/pose/x,/turtle1/pose/y}}
<p>rqt_plot 도 명령으로 열 수 있습니다. 토픽 이름 뒤에 <code>/필드</code> 를 붙여 숫자 값 하나를 고릅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>rqt_plot /turtle1/pose/x /turtle1/pose/y</code></pre>`
    },

    /* ================================================================ 6 */
    {
      title: '이름 규칙과 리매핑 (--ros-args -r)',
      html: `
<p>ROS 2 의 모든 것(노드 · 토픽 · 서비스)은 <b>이름</b>으로 연결됩니다. 이름이 한 글자만 달라도 연결되지 않아요. 그래서 이름 규칙을 알아 두는 것이 중요합니다.</p>
{{fig:nameRules}}

<p><b>리매핑(remapping)</b>은 코드를 고치지 않고 <b>실행할 때 이름을 바꾸는</b> 기능입니다. <code>ros2 run</code> 뒤에 <code>--ros-args</code> 를 쓰고 <code>-r 원래이름:=새이름</code>(또는 <code>--remap</code>)을 붙입니다. 특별한 이름 <code>__node</code> 는 노드 이름을, <code>__ns</code> 는 네임스페이스를 바꿉니다.</p>
{{fig:remap}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_py talker --ros-args -r __node:=my_talker -r chatter:=news &amp;
ros2 node list
ros2 topic list</code></pre>
<pre class="code out" data-lang="출력"><code>/my_talker
/turtlesim
...
/news
/turtle1/cmd_vel
...</code></pre>
<p>이번에는 거북이를 하나 더 소환(<b>➕ spawn</b> 버튼 → <code>turtle2</code>)한 뒤, teleop 의 토픽을 <code>turtle2</code> 쪽으로 리매핑해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtlesim turtle_teleop_key --ros-args -r turtle1/cmd_vel:=turtle2/cmd_vel</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 두 번째 거북이 조종</div>
<ol>
  <li>아래 거북이 화면의 <b>➕ spawn</b> 을 눌러 거북이를 한 마리 더 만드세요. 이름은 자동으로 <code>turtle2</code> 가 됩니다. (<code>ros2 topic list</code> 에 <code>/turtle2/cmd_vel</code> 이 생겼는지 확인)</li>
  <li>위 리매핑 명령을 실행하고, 터미널을 클릭한 뒤 방향키를 누르세요. 이번엔 <b>turtle2</b> 가 움직입니다!</li>
  <li><kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추고 <code>ros2 run turtlesim turtle_teleop_key --ros-args -r __node:=teleop2</code> 처럼 노드 이름도 바꿔 실행한 뒤 <code>ros2 node list</code> 로 확인해 보세요.</li>
</ol></div>
{{widget:turtlesim}}
{{widget:term|chips=ros2 topic list;ros2 run turtlesim turtle_teleop_key --ros-args -r turtle1/cmd_vel:=turtle2/cmd_vel;ros2 run turtlesim turtle_teleop_key --ros-args -r __node:=teleop2;ros2 node list|h=240}}
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
실제 로봇에서는 같은 카메라 드라이버를 두 번 실행해 앞 · 뒤 카메라로 쓰는 일이 흔합니다. 이때 <code>__ns:=/front</code>, <code>__ns:=/rear</code> 로 네임스페이스만 바꾸면 <code>/front/image_raw</code>, <code>/rear/image_raw</code> 가 되어 충돌하지 않아요. 여러 노드의 리매핑은 런치 파일(10장)로 한꺼번에 합니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '파이썬으로 만든 talker 와 listener',
      html: `
<p>지금까지는 이미 만들어진 노드를 실행했습니다. 퍼블리셔 · 서브스크라이버를 파이썬(rclpy)으로 만들면 어떻게 생겼는지 미리 살펴봅시다. 코드 한 줄 한 줄은 8장에서 자세히 배우고, 여기서는 <b>핵심 두 줄</b>만 찾아보세요.</p>
<div class="two">
<div><div class="box note"><div class="box-t">📤 퍼블리셔 만들기</div>
<code>self.create_publisher(String, 'topic', 10)</code><br>→ 타입 <b>String</b>, 토픽 이름 <b>'topic'</b>, 대기열 깊이 <b>10</b>. 이후 <code>publish(msg)</code> 로 보냅니다.</div></div>
<div><div class="box note"><div class="box-t">📥 서브스크라이버 만들기</div>
<code>self.create_subscription(String, 'topic', self.listener_callback, 10)</code><br>→ 메시지가 올 때마다 <b>콜백 함수</b>가 불립니다.</div></div>
</div>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class MinimalPublisher(Node):

    def __init__(self):
        super().__init__('minimal_publisher')
        self.publisher_ = self.create_publisher(String, 'topic', 10)
        timer_period = 0.5  # seconds
        self.timer = self.create_timer(timer_period, self.timer_callback)
        self.i = 0

    def timer_callback(self):
        msg = String()
        msg.data = 'Hello World: %d' % self.i
        self.publisher_.publish(msg)
        self.get_logger().info('Publishing: "%s"' % msg.data)
        self.i += 1


def main(args=None):
    rclpy.init(args=args)
    minimal_publisher = MinimalPublisher()
    rclpy.spin(minimal_publisher)
    minimal_publisher.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 두 실습기를 대화시키기</div>
<ol>
  <li>첫 번째 실습기(talker)의 <b>▶ 실행</b>을 누르세요. 0.5초마다 Publishing 로그가 나옵니다.</li>
  <li>두 번째 실습기(listener)도 <b>▶ 실행</b>. <code>I heard: "Hello World: …"</code> 가 찍히면 두 노드가 <code>/topic</code> 으로 대화하는 중입니다.</li>
  <li>talker 코드의 <code>'topic'</code> 을 <code>'topic2'</code> 로 바꿔 다시 실행하면? listener 는 더 이상 받지 못합니다 — 이름이 연결의 전부!</li>
  <li>페이지 위쪽의 아무 터미널에서 <code>ros2 topic echo /topic</code> 을 쳐서 파이썬 노드의 메시지를 엿들어 보세요(같은 그래프를 공유).</li>
</ol></div>
{{widget:pylab|ex=talker}}
{{widget:pylab|ex=listener}}`
    },

    /* ================================================================ 8 */
    {
      title: '토픽 디버깅 체크리스트',
      html: `
<p>"분명 발행하는데 왜 안 받아지지?" — ROS 2 를 쓰면 반드시 만나는 질문입니다. 대부분 아래 다섯 가지 중 하나예요. 위에서부터 차례로 확인하세요.</p>
<ol class="steps-list">
  <li><b>이름</b> — <code>ros2 topic list</code> 로 양쪽이 <b>정확히 같은 이름</b>인지. 상대 이름 · 네임스페이스 때문에 <code>/robot1/chatter</code> 와 <code>/chatter</code> 로 갈리는 경우가 많습니다.</li>
  <li><b>타입</b> — <code>ros2 topic info -v</code> 로 퍼블리셔와 서브스크라이버의 타입이 같은지. 타입이 다르면 연결되지 않습니다.</li>
  <li><b>발행 여부</b> — <code>ros2 topic hz</code> 로 실제로 메시지가 나오는지.</li>
  <li><b>QoS</b> — 신뢰성(reliable/best effort) 설정이 서로 맞는지(11장). <code>ros2 topic info -v</code> 에 표시됩니다.</li>
  <li><b>도메인 · 네트워크</b> — 다른 컴퓨터라면 <code>ROS_DOMAIN_ID</code> 가 같은지, 방화벽이 막지 않는지(1장 · 11장).</li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic list -t
ros2 topic info /turtle1/cmd_vel -v</code></pre>
<div class="box tip"><div class="box-t">💡 토픽을 쓸까, 다른 걸 쓸까?</div>
토픽은 <b>계속 흐르는 데이터</b>(센서값 · 위치 · 속도 명령)에 알맞습니다. "지금 한 번만 계산해 줘"처럼 <b>대답이 필요한 일</b>은 서비스(4장), "저기까지 가 줘"처럼 <b>오래 걸리고 중간 경과가 궁금한 일</b>은 액션(5장)을 씁니다.</div>`
    }
  ],

  videos: [
    { title: 'What is a ROS2 Topic? - ROS2 Tutorial 6', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=MwEXX6a-TWw', lang: 'en', desc: '퍼블리셔 · 서브스크라이버 · 토픽의 개념을 라디오 비유와 그림으로 설명합니다.' },
    { title: 'Start Your First ROS2 Node - ROS2 Tutorial 2', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=c5DRTN2b2kY', lang: 'en', desc: '노드를 실행하고 ros2 node 명령으로 살펴보는 과정을 짧게 보여 줍니다.' },
    { title: "ROS2 - 'ros2 topic' Command Line Walk through", channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=AHz7iMZ8oI0', lang: 'en', desc: 'list · info · echo · hz · pub 등 ros2 topic 하위 명령을 하나씩 실행해 봅니다. 4절 복습용.' },
    { title: 'ROS2 tutorial: Nodes and topics // Getting started with Robot Operating System using Turtlesim', channel: 'Kajal Gada', url: 'https://www.youtube.com/watch?v=MJnfuoTHR_g', lang: 'en', desc: 'turtlesim 과 rqt_graph 로 노드 · 토픽을 눈으로 확인하는 입문 실습.' },
    { title: 'ROS2 노드·토픽, 로봇 프로그램이 대화하는 법 | 로봇 SW · ROS2 EP.1', channel: '아마따', url: 'https://www.youtube.com/watch?v=9jJvFVQRabo', lang: 'ko', desc: '한국어로 노드와 토픽이 왜 필요한지, 어떻게 대화하는지 설명합니다.' },
    { title: '[ROS2] 노드 이해하기', channel: 'PinkWink', url: 'https://www.youtube.com/watch?v=aYhJCYtg6AU', lang: 'ko', desc: '한국어 강의. turtlesim 으로 ROS 2 노드를 실행하고 살펴봅니다.' }
  ],

  terms: [
    ['노드 (node)', '한 가지 일을 맡은 실행 프로그램. ROS 2 그래프의 기본 단위'],
    ['토픽 (topic)', '노드끼리 메시지를 주고받는 이름 붙은 통로(방송 채널). 다대다 · 일방향'],
    ['퍼블리셔 (publisher)', '토픽에 메시지를 발행(publish)하는 쪽'],
    ['서브스크라이버 (subscriber)', '토픽을 구독(subscribe)해 메시지를 받는 쪽'],
    ['메시지 타입', '토픽으로 오가는 데이터의 형식. 예: std_msgs/msg/String, geometry_msgs/msg/Twist'],
    ['콜백 (callback)', '메시지 도착 · 타이머 같은 사건이 생기면 자동으로 불리는 함수'],
    ['cmd_vel', 'command velocity. 로봇에 속도 명령(Twist)을 보내는 관례적인 토픽 이름'],
    ['ROS 그래프', '실행 중인 노드와 토픽 · 서비스 · 액션의 연결 전체'],
    ['rqt_graph', 'ROS 그래프를 노드(타원) · 토픽(사각형) 그림으로 보여 주는 도구'],
    ['네임스페이스 (namespace)', '이름 앞에 붙는 폴더 같은 접두어. 예: /robot1/talker'],
    ['리매핑 (remapping)', '코드를 고치지 않고 실행할 때 노드 · 토픽 이름을 바꾸는 것. --ros-args -r 옛이름:=새이름'],
    ['Hz (헤르츠)', '1초에 몇 번 발행되는지(주기). ros2 topic hz 로 측정'],
    ['QoS 깊이 (depth)', '받지 못한 메시지를 몇 개까지 쌓아 둘지 정하는 대기열 크기. 예제의 10']
  ],

  summary: [
    '<b>노드</b>는 한 가지 일을 맡은 작은 프로그램이고, 로봇은 노드 여러 개가 대화하는 <b>그래프</b>다 — <code>ros2 node list/info</code>',
    '<b>토픽</b>은 이름 붙은 방송 채널: 퍼블리셔는 발행만, 서브스크라이버는 구독만 하며 <b>서로를 모르고(익명)</b>, <b>다대다</b>로 연결된다',
    '연결 조건은 <b>같은 토픽 이름 + 같은 메시지 타입</b> (+ 맞는 QoS · 같은 도메인)',
    '<code>ros2 topic list -t / info / type / echo / hz / pub --once · --rate</code> 로 시스템을 들여다보고 직접 조작한다',
    '<b>rqt_graph</b> 는 노드(타원) · 토픽(사각형) 연결을, <b>rqt_plot</b> 은 숫자 값을 그림으로 보여 준다',
    '<code>--ros-args -r 옛이름:=새이름</code> 으로 코드 수정 없이 이름을 바꾼다(<code>__node</code>, <code>__ns</code> 포함)',
    'rclpy 에서는 <code>create_publisher(타입, 이름, 깊이)</code> 와 <code>create_subscription(타입, 이름, 콜백, 깊이)</code> 두 줄이 핵심'
  ],

  quiz: [
    { q: '토픽 통신에 대한 설명으로 <b>틀린</b> 것은?', options: ['퍼블리셔는 누가 구독하는지 몰라도 된다', '한 토픽에 서브스크라이버가 여러 개일 수 있다', '서브스크라이버가 메시지를 받으면 퍼블리셔에게 자동으로 응답이 간다', '구독자가 없어도 퍼블리셔는 발행할 수 있다'], answer: 2, explain: '토픽은 일방향 방송이라 응답이 없습니다. 요청에 대한 응답이 필요하면 서비스(4장)를 씁니다.' },
    { q: 'turtlesim 의 거북이를 움직이려면 어느 토픽에 메시지를 보내야 할까?', options: ['/turtle1/pose', '/turtle1/cmd_vel', '/rosout', '/parameter_events'], answer: 1, explain: 'turtlesim 은 /turtle1/cmd_vel 을 구독해 속도 명령(geometry_msgs/msg/Twist)을 받고, /turtle1/pose 로는 자기 위치를 발행합니다. ros2 node info /turtlesim 의 Subscribers 에서 확인할 수 있어요.' },
    { q: '토픽이 1초에 몇 번 발행되는지 알고 싶을 때 쓰는 명령은?', options: ['ros2 topic echo', 'ros2 topic hz', 'ros2 topic type', 'ros2 node list'], answer: 1, explain: 'ros2 topic hz <토픽> 은 평균 발행 주기(average rate)를 보여 줍니다. echo 는 메시지 내용, type 은 메시지 타입을 보여 줘요.' },
    { q: '<code>ros2 topic pub /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x:2.0}}"</code> 가 실패했다. 가장 의심되는 원인은?', options: ['토픽 이름이 틀렸다', '콜론 뒤에 공백이 없다 (x:2.0)', '따옴표를 썼다', 'Twist 타입이 없다'], answer: 1, explain: 'YAML 에서는 "키: 값" 처럼 콜론 뒤에 한 칸을 띄워야 합니다. {linear: {x: 2.0}} 으로 고치세요.' },
    { q: '코드를 고치지 않고 teleop 노드가 turtle2 를 조종하게 하려면?', options: ['ros2 run turtlesim turtle_teleop_key turtle2', 'ros2 run turtlesim turtle_teleop_key --ros-args -r turtle1/cmd_vel:=turtle2/cmd_vel', 'ros2 topic pub turtle2', 'turtlesim 을 다시 설치한다'], answer: 1, explain: '리매핑(--ros-args -r 옛이름:=새이름)은 실행할 때 토픽 이름을 바꿔 연결을 바꿉니다. 노드 이름은 __node:=새이름 으로 바꿔요.' },
    { q: 'rclpy 코드 <code>self.create_subscription(String, \'topic\', self.cb, 10)</code> 에서 <code>self.cb</code> 는 언제 실행될까?', options: ['노드가 시작할 때 한 번', '0.5초마다 한 번', '/topic 에 메시지가 도착할 때마다', '노드가 종료될 때'], answer: 2, explain: 'self.cb 는 콜백 함수로, 구독한 토픽에 메시지가 도착할 때마다 spin() 이 불러 줍니다. 마지막 10 은 대기열 깊이(QoS depth)예요.' },
    { q: '노드 이름으로 <b>쓸 수 없는</b> 것은?', options: ['talker', 'camera_front', '2nd_camera', 'lidar2'], answer: 2, explain: '노드 이름은 영문자 · 숫자 · 밑줄만 쓸 수 있고 숫자로 시작할 수 없습니다. 2nd_camera 는 숫자로 시작해서 안 됩니다.' }
  ],

  slides: [
    {
      title: '라디오는 누가 듣는지 알까?',
      layout: 'center',
      html: `<div class="s-big">📻 방송국은 청취자를 모르고,<br>청취자는 <b>주파수</b>만 맞춘다</div>
<p class="s-small step">ROS 2 에서 주파수 = <b>토픽 이름</b>, 방송 형식 = <b>메시지 타입</b></p>`,
      notes: '도입 발문: “방송국은 누가 듣고 있는지 알까요? 청취자는 방송국 주소를 알아야 하나요?” 둘 다 아니다 → 토픽의 익명성 · 느슨한 연결로 연결합니다. (3분)'
    },
    {
      title: '로봇 = 노드들의 그래프',
      html: `{{fig:robotNodes|nocap}}`,
      notes: '노드는 한 가지 일만 한다. 카메라 · 라이다 · 인식 · 계획 · 모터로 나눈 예를 짚으며, 나누면 좋은 점 네 가지를 오른쪽 상자로 정리합니다. 발문: “카메라 회사를 바꾸면 어떤 노드만 바꾸면 될까요?” (5분)'
    },
    {
      title: '퍼블리셔 · 토픽 · 서브스크라이버',
      html: `{{fig:pubsub|nocap}}`,
      notes: '파란 타원 = 노드, 초록 사각형 = 토픽이라는 rqt_graph 관례를 다시 강조합니다. 연결 조건은 “같은 이름 + 같은 타입”. (4분)'
    },
    {
      title: '다대다 연결',
      html: `{{fig:manyToMany|nocap}}`,
      notes: '퍼블리셔도 여럿일 수 있다는 점이 학생들에게 의외인 경우가 많습니다. 키보드 · 조이스틱 · 자율주행이 모두 cmd_vel 에 보내면 섞인다 → 실제로는 우선순위를 정하는 노드(twist_mux 같은)를 둔다고 한마디 덧붙이세요. (3분)'
    },
    {
      title: '애니메이션으로 보기',
      html: `{{widget:comm|mode=topic}}`,
      notes: '서브스크라이버를 추가 · 삭제해도 퍼블리셔는 변화가 없다는 점을 보여 줍니다. 구독자가 없어도 발행은 계속된다는 것도 확인하세요. (4분)'
    },
    {
      title: '메시지 한 개의 여행',
      html: `{{fig:msgFlow|nocap}}`,
      notes: '타이머 → publish → DDS → 대기열 → 콜백. “받는 쪽은 기다리지 않고, 오면 불린다(콜백)”가 핵심 문장입니다. 대기열 깊이 10 은 QoS 로 11장에서 다룬다고 예고합니다. (4분)'
    },
    {
      title: 'turtlesim 의 두 토픽',
      html: `{{fig:turtleGraph|nocap}}`,
      notes: 'cmd_vel 로 속도가 들어가고 pose 로 위치가 나온다. 실제 모바일 로봇도 cmd_vel 로 움직이고 odom 으로 위치를 알린다는 점을 연결해 주세요. (3분)'
    },
    {
      title: 'ros2 topic — 청진기',
      html: `{{fig:topicCmds|nocap}}`,
      notes: '표를 한 줄씩 짚고, 다음 슬라이드에서 바로 실습합니다. list -t, echo --once, hz, pub --once / --rate 를 특히 강조하세요. (3분)'
    },
    {
      title: '직접 들여다보기',
      html: `{{widget:lab|with=turtlesim,graph|title=터미널 + turtlesim + rqt_graph}}`,
      notes: '강사가 ros2 topic list -t → echo /turtle1/pose --once → hz → pub --rate 1 순서로 시연합니다. pub 할 때 YAML 콜론 뒤 공백을 일부러 빼서 오류를 보여 주면 기억에 남아요. (8분)'
    },
    {
      title: '리매핑',
      html: `{{fig:remap|nocap}}`,
      notes: '코드는 그대로, 실행할 때 이름만 바꾼다. spawn 으로 turtle2 를 만든 뒤 teleop 을 리매핑해 turtle2 를 움직이는 시연을 하면 효과적입니다. __node, __ns 도 소개하세요. (5분)'
    },
    {
      title: '이름 규칙',
      html: `{{fig:nameRules|nocap}}`,
      notes: '상대 이름 · 절대 이름 · 개인 이름(~)의 차이를 예로 짚습니다. “이름이 한 글자만 달라도 연결되지 않는다”를 강조하세요. (3분)'
    },
    {
      title: '파이썬 talker/listener 핵심 두 줄',
      html: `<div class="s-cols">
<div class="card blue step"><b>📤 퍼블리셔</b><p><code>create_publisher(String, 'topic', 10)</code><br><code>publish(msg)</code></p></div>
<div class="card green step"><b>📥 서브스크라이버</b><p><code>create_subscription(String, 'topic', callback, 10)</code></p></div>
</div>
<p class="s-small step">타입 · 이름 · (콜백) · 대기열 깊이</p>`,
      notes: '코드 전체보다 두 줄에 집중합니다. 두 실습기로 talker 와 listener 를 동시에 돌리는 시연을 하고, 토픽 이름을 바꾸면 끊기는 것을 보여 주세요. 자세한 구조는 8장. (4분)'
    },
    {
      title: '안 받아질 때 체크리스트',
      html: `<ol class="steps-list">
<li class="step"><b>이름</b> — ros2 topic list</li>
<li class="step"><b>타입</b> — ros2 topic info -v</li>
<li class="step"><b>발행 여부</b> — ros2 topic hz</li>
<li class="step"><b>QoS</b> — 11장</li>
<li class="step"><b>도메인 · 네트워크</b> — ROS_DOMAIN_ID</li>
</ol>`,
      notes: '실무에서 가장 많이 쓰는 디버깅 순서입니다. 다음 장(3장)에서는 오늘 나온 메시지 타입(String, Twist, Pose)의 속을 들여다본다고 예고합니다. (3분)'
    }
  ]
});
