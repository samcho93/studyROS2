/* 3장 — 메시지와 인터페이스 */
Course.lesson({
  id: 'ch03', no: '03',
  icon: '📦',
  title: '메시지와 인터페이스',
  subtitle: '노드끼리 주고받는 데이터의 "약속된 양식" 읽고, 쓰고, 만들기',
  level: '입문', time: '120분',
  goals: [
    '인터페이스의 세 종류(.msg · .srv · .action)와 전체 이름(패키지/msg/타입)을 구별할 수 있다',
    '기본 필드 타입(bool · int · float · string · 배열)과 중첩 타입으로 된 메시지 정의를 읽을 수 있다',
    'std_msgs · geometry_msgs · sensor_msgs · nav_msgs 의 대표 메시지와 Header(stamp · frame_id)의 역할을 말할 수 있다',
    'ros2 interface 명령과 YAML 문법으로 메시지 구조를 확인하고 ros2 topic pub 을 오류 없이 쓸 수 있다',
    'ament_cmake 패키지에 .msg/.srv 를 추가해 사용자 정의 인터페이스를 만들 수 있다'
  ],
  teacher: {
    intro: '택배 송장 한 장을 보여 주며 “받는 사람 · 주소 · 전화번호 칸이 정해져 있지 않으면 어떻게 될까요?” 하고 묻습니다. 칸이 정해져 있어야 전국 어느 택배 기사든 읽을 수 있듯, 노드끼리도 “칸이 정해진 양식”이 필요하다 — 그것이 메시지(인터페이스)라는 것으로 시작합니다. (3분)',
    flow: '① 도입 · 인터페이스 세 종류 10분 → ② 필드 타입 · 배열 · 중첩 15분 → ③ 자주 쓰는 메시지 패키지 · Header 15분 → ④ ros2 interface + iface 위젯 15분 → ⑤ YAML 로 pub 하기 · 흔한 실수 20분 → ⑥ 파이썬 float 오류 10분 → ⑦ 사용자 정의 인터페이스 만들기 25분 → ⑧ 이름 규칙 · 퀴즈 10분'
  },

  figs: {
    /* ---------------------------------------------------------------- 인터페이스 세 종류 */
    kinds: {
      caption: '인터페이스 세 종류 — 메시지(.msg)는 필드 목록, 서비스(.srv)는 요청 --- 응답, 액션(.action)은 목표 --- 결과 --- 피드백',
      svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="msg, srv, action 파일 구조 비교">
  <rect x="14" y="14" width="270" height="310" rx="14" class="green"/>
  <text x="149" y="40" class="t-lg t-c t-green">.msg 메시지</text>
  <text x="149" y="64" class="t-xs t-c t-mu">토픽으로 오가는 데이터</text>
  <rect x="34" y="82" width="230" height="120" rx="8" class="box"/>
  <text x="46" y="104" class="t-sm t-mono t-mu"># turtlesim/msg/Pose</text>
  <text x="46" y="128" class="t-sm t-mono">float32 x</text>
  <text x="46" y="148" class="t-sm t-mono">float32 y</text>
  <text x="46" y="168" class="t-sm t-mono">float32 theta</text>
  <text x="46" y="188" class="t-sm t-mono t-mu">…</text>
  <text x="149" y="232" class="t-sm t-c">한 줄 = 필드 하나</text>
  <text x="149" y="254" class="t-sm t-c"><tspan class="t-mono">타입 이름</tspan></text>
  <text x="149" y="296" class="t-xs t-c t-mu">📻 방송 내용의 양식</text>

  <rect x="305" y="14" width="270" height="310" rx="14" class="orange"/>
  <text x="440" y="40" class="t-lg t-c t-orange">.srv 서비스</text>
  <text x="440" y="64" class="t-xs t-c t-mu">요청하고 응답받는 한 쌍</text>
  <rect x="325" y="82" width="230" height="140" rx="8" class="box"/>
  <text x="337" y="104" class="t-sm t-mono t-mu"># AddTwoInts.srv</text>
  <text x="337" y="128" class="t-sm t-mono">int64 a</text>
  <text x="337" y="148" class="t-sm t-mono">int64 b</text>
  <text x="337" y="172" class="t-sm t-mono t-orange t-b">---</text>
  <text x="337" y="196" class="t-sm t-mono">int64 sum</text>
  <text x="480" y="138" class="t-xs t-orange">← 요청</text>
  <text x="480" y="196" class="t-xs t-orange">← 응답</text>
  <text x="440" y="252" class="t-sm t-c"><tspan class="t-mono t-b">---</tspan> 로 두 부분을 나눔</text>
  <text x="440" y="296" class="t-xs t-c t-mu">📞 전화 질문지 + 답변지</text>

  <rect x="596" y="14" width="270" height="310" rx="14" class="purple"/>
  <text x="731" y="40" class="t-lg t-c t-purple">.action 액션</text>
  <text x="731" y="64" class="t-xs t-c t-mu">오래 걸리는 일</text>
  <rect x="616" y="82" width="230" height="170" rx="8" class="box"/>
  <text x="628" y="104" class="t-sm t-mono t-mu"># Fibonacci.action</text>
  <text x="628" y="128" class="t-sm t-mono">int32 order</text>
  <text x="628" y="150" class="t-sm t-mono t-purple t-b">---</text>
  <text x="628" y="172" class="t-sm t-mono">int32[] sequence</text>
  <text x="628" y="194" class="t-sm t-mono t-purple t-b">---</text>
  <text x="628" y="216" class="t-sm t-mono">int32[] partial_sequence</text>
  <text x="790" y="128" class="t-xs t-purple">← 목표</text>
  <text x="790" y="172" class="t-xs t-purple">← 결과</text>
  <text x="818" y="238" class="t-xs t-purple t-c">↑ 피드백</text>
  <text x="731" y="296" class="t-xs t-c t-mu">🍕 주문서 + 영수증 + 배달 현황</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 중첩 구조 */
    nested: {
      caption: '메시지는 레고처럼 쌓입니다 — Twist 는 Vector3 두 개, Vector3 는 float64 세 개. 결국 모든 메시지는 기본 타입으로 풀립니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="Twist 메시지의 중첩 구조 트리">
  <rect x="330" y="14" width="220" height="50" rx="10" class="s-green"/>
  <text x="440" y="32" class="t-b t-c tw">geometry_msgs/msg/Twist</text>
  <text x="440" y="52" class="t-xs t-c tw">속도 명령 (/cmd_vel)</text>
  <line x1="400" y1="64" x2="220" y2="108" class="ln-green ar-green"/>
  <line x1="480" y1="64" x2="660" y2="108" class="ln-green ar-green"/>
  <rect x="110" y="110" width="220" height="56" rx="10" class="green"/>
  <text x="220" y="130" class="t-b t-c"><tspan class="t-mono">linear</tspan></text>
  <text x="220" y="150" class="t-xs t-c t-mono">Vector3 · 직진 속도 m/s</text>
  <rect x="550" y="110" width="220" height="56" rx="10" class="green"/>
  <text x="660" y="130" class="t-b t-c"><tspan class="t-mono">angular</tspan></text>
  <text x="660" y="150" class="t-xs t-c t-mono">Vector3 · 회전 속도 rad/s</text>
  <line x1="160" y1="166" x2="100" y2="206" class="ln"/>
  <line x1="220" y1="166" x2="220" y2="206" class="ln"/>
  <line x1="280" y1="166" x2="340" y2="206" class="ln"/>
  <line x1="600" y1="166" x2="540" y2="206" class="ln"/>
  <line x1="660" y1="166" x2="660" y2="206" class="ln"/>
  <line x1="720" y1="166" x2="780" y2="206" class="ln"/>
  <rect x="50" y="208" width="100" height="40" rx="8" class="s-blue"/><text x="100" y="228" class="t-sm t-c t-mono tw">x float64</text>
  <rect x="170" y="208" width="100" height="40" rx="8" class="box"/><text x="220" y="228" class="t-sm t-c t-mono">y float64</text>
  <rect x="290" y="208" width="100" height="40" rx="8" class="box"/><text x="340" y="228" class="t-sm t-c t-mono">z float64</text>
  <rect x="490" y="208" width="100" height="40" rx="8" class="box"/><text x="540" y="228" class="t-sm t-c t-mono">x float64</text>
  <rect x="610" y="208" width="100" height="40" rx="8" class="box"/><text x="660" y="228" class="t-sm t-c t-mono">y float64</text>
  <rect x="730" y="208" width="100" height="40" rx="8" class="s-blue"/><text x="780" y="228" class="t-sm t-c t-mono tw">z float64</text>
  <text x="100" y="270" class="t-xs t-c t-blue t-b">앞뒤 이동</text>
  <text x="780" y="270" class="t-xs t-c t-blue t-b">좌우 회전</text>
  <rect x="200" y="286" width="480" height="34" rx="8" class="box"/>
  <text x="440" y="303" class="t-sm t-c">접근: <tspan class="t-mono t-b">msg.linear.x</tspan> · YAML: <tspan class="t-mono t-b">{linear: {x: 2.0}}</tspan></text>
</svg>`
    },

    /* ---------------------------------------------------------------- 메시지 가족 */
    families: {
      caption: '자주 쓰는 메시지 패키지 네 가족 — 대부분의 로봇 데이터는 이미 표준 메시지가 있으니 먼저 찾아 쓰세요',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="std_msgs, geometry_msgs, sensor_msgs, nav_msgs 대표 메시지">
  <rect x="14" y="14" width="200" height="352" rx="14" class="gray"/>
  <text x="114" y="40" class="t-b t-c t-mono">std_msgs</text>
  <text x="114" y="62" class="t-xs t-c t-mu">기본 · 간단한 값</text>
  <rect x="34" y="82" width="160" height="30" rx="6" class="box"/><text x="114" y="97" class="t-sm t-c t-mono">String</text>
  <rect x="34" y="118" width="160" height="30" rx="6" class="box"/><text x="114" y="133" class="t-sm t-c t-mono">Bool · Int32</text>
  <rect x="34" y="154" width="160" height="30" rx="6" class="box"/><text x="114" y="169" class="t-sm t-c t-mono">Float64</text>
  <rect x="34" y="190" width="160" height="30" rx="6" class="s-gray"/><text x="114" y="205" class="t-sm t-c t-mono tw">Header</text>
  <rect x="34" y="226" width="160" height="30" rx="6" class="box"/><text x="114" y="241" class="t-sm t-c t-mono">ColorRGBA</text>
  <text x="114" y="300" class="t-xs t-c">연습 · 간단한 신호용</text>
  <text x="114" y="320" class="t-xs t-c t-mu">(실제 제품엔 의미 있는</text>
  <text x="114" y="338" class="t-xs t-c t-mu">타입을 권장)</text>

  <rect x="232" y="14" width="200" height="352" rx="14" class="green"/>
  <text x="332" y="40" class="t-b t-c t-mono">geometry_msgs</text>
  <text x="332" y="62" class="t-xs t-c t-mu">위치 · 방향 · 속도</text>
  <rect x="252" y="82" width="160" height="30" rx="6" class="box"/><text x="332" y="97" class="t-sm t-c t-mono">Twist</text>
  <rect x="252" y="118" width="160" height="30" rx="6" class="box"/><text x="332" y="133" class="t-sm t-c t-mono">Pose · Point</text>
  <rect x="252" y="154" width="160" height="30" rx="6" class="box"/><text x="332" y="169" class="t-sm t-c t-mono">PoseStamped</text>
  <rect x="252" y="190" width="160" height="30" rx="6" class="box"/><text x="332" y="205" class="t-sm t-c t-mono">TransformStamped</text>
  <rect x="252" y="226" width="160" height="30" rx="6" class="box"/><text x="332" y="241" class="t-sm t-c t-mono">Vector3</text>
  <rect x="252" y="262" width="160" height="30" rx="6" class="box"/><text x="332" y="277" class="t-sm t-c t-mono">Quaternion</text>
  <text x="332" y="320" class="t-xs t-c">cmd_vel · 목표 위치 · TF</text>

  <rect x="450" y="14" width="200" height="352" rx="14" class="orange"/>
  <text x="550" y="40" class="t-b t-c t-mono">sensor_msgs</text>
  <text x="550" y="62" class="t-xs t-c t-mu">센서 데이터</text>
  <rect x="470" y="82" width="160" height="30" rx="6" class="box"/><text x="550" y="97" class="t-sm t-c t-mono">LaserScan</text>
  <rect x="470" y="118" width="160" height="30" rx="6" class="box"/><text x="550" y="133" class="t-sm t-c t-mono">Image</text>
  <rect x="470" y="154" width="160" height="30" rx="6" class="box"/><text x="550" y="169" class="t-sm t-c t-mono">Imu</text>
  <rect x="470" y="190" width="160" height="30" rx="6" class="box"/><text x="550" y="205" class="t-sm t-c t-mono">JointState</text>
  <rect x="470" y="226" width="160" height="30" rx="6" class="box"/><text x="550" y="241" class="t-sm t-c t-mono">BatteryState</text>
  <text x="550" y="320" class="t-xs t-c">라이다 · 카메라 · 관성 · 관절</text>

  <rect x="668" y="14" width="200" height="352" rx="14" class="purple"/>
  <text x="768" y="40" class="t-b t-c t-mono">nav_msgs</text>
  <text x="768" y="62" class="t-xs t-c t-mu">내비게이션</text>
  <rect x="688" y="82" width="160" height="30" rx="6" class="box"/><text x="768" y="97" class="t-sm t-c t-mono">Odometry</text>
  <rect x="688" y="118" width="160" height="30" rx="6" class="box"/><text x="768" y="133" class="t-sm t-c t-mono">Path</text>
  <rect x="688" y="154" width="160" height="30" rx="6" class="box"/><text x="768" y="169" class="t-sm t-c t-mono">OccupancyGrid</text>
  <text x="768" y="320" class="t-xs t-c">주행 거리 · 경로 · 지도</text>
</svg>`
    },

    /* ---------------------------------------------------------------- Header */
    header: {
      caption: 'std_msgs/Header — "언제(stamp) · 어느 좌표계 기준(frame_id)" 의 데이터인지 붙이는 꼬리표. 이름에 Stamped 가 붙은 메시지는 대부분 Header 를 가집니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="PoseStamped 메시지 안의 Header 와 Pose">
  <rect x="14" y="14" width="420" height="272" rx="14" class="green"/>
  <text x="224" y="40" class="t-b t-c t-mono">geometry_msgs/msg/PoseStamped</text>
  <rect x="34" y="60" width="380" height="110" rx="10" class="s-gray"/>
  <text x="50" y="82" class="t-b t-mono tw">header: std_msgs/Header</text>
  <text x="66" y="108" class="t-sm t-mono tw">stamp: {sec: 1727054400, nanosec: 5000}</text>
  <text x="66" y="132" class="t-sm t-mono tw">frame_id: "map"</text>
  <text x="66" y="154" class="t-xs tw">⏱ 측정 시각 · 🧭 기준 좌표계</text>
  <rect x="34" y="182" width="380" height="88" rx="10" class="box"/>
  <text x="50" y="204" class="t-b t-mono">pose: Pose</text>
  <text x="66" y="228" class="t-sm t-mono">position: {x: 2.0, y: 1.0, z: 0.0}</text>
  <text x="66" y="252" class="t-sm t-mono">orientation: {x: 0, y: 0, z: 0, w: 1}</text>

  <line x1="440" y1="115" x2="480" y2="80" class="ln ar"/>
  <line x1="440" y1="130" x2="480" y2="190" class="ln ar"/>
  <rect x="486" y="30" width="380" height="100" rx="12" class="blue"/>
  <text x="676" y="54" class="t-b t-c t-blue">⏱ stamp — 왜 필요할까?</text>
  <text x="676" y="80" class="t-sm t-c">카메라 사진과 라이다 스캔을</text>
  <text x="676" y="102" class="t-sm t-c">"같은 순간"끼리 짝지어 합치려면 시각이 필수</text>
  <rect x="486" y="150" width="380" height="120" rx="12" class="purple"/>
  <text x="676" y="174" class="t-b t-c t-purple">🧭 frame_id — 무엇을 기준으로?</text>
  <text x="676" y="200" class="t-sm t-c">"x = 2.0" 은 지도(map) 기준일까,</text>
  <text x="676" y="222" class="t-sm t-c">로봇 몸(base_link) 기준일까?</text>
  <text x="676" y="248" class="t-xs t-c t-mu">좌표계 변환은 12장 TF2 에서</text>
</svg>`
    },

    /* ---------------------------------------------------------------- rosidl 코드 생성 */
    rosidl: {
      caption: '.msg 파일 한 장이 빌드되면 C++ 헤더 · 파이썬 클래스 · DDS 타입 코드가 자동으로 생깁니다 (rosidl) — 그래서 인터페이스 패키지는 CMake 빌드(ament_cmake)가 필요합니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="msg 파일이 rosidl 로 C++ Python DDS 코드로 변환">
  <rect x="14" y="80" width="170" height="130" rx="12" class="green"/>
  <text x="99" y="104" class="t-b t-c">📄 Sphere.msg</text>
  <text x="30" y="136" class="t-xs t-mono">geometry_msgs/Point center</text>
  <text x="30" y="160" class="t-xs t-mono">float64 radius</text>
  <text x="99" y="192" class="t-xs t-c t-mu">사람이 쓰는 정의</text>
  <line x1="184" y1="145" x2="232" y2="145" class="ln thick ar"/>
  <rect x="236" y="60" width="220" height="170" rx="12" class="purple"/>
  <text x="346" y="86" class="t-b t-c t-purple">colcon build</text>
  <text x="346" y="116" class="t-xs t-c t-mono">rosidl_generate_interfaces(</text>
  <text x="346" y="134" class="t-xs t-c t-mono">  "msg/Sphere.msg" …)</text>
  <text x="346" y="166" class="t-sm t-c">rosidl 코드 생성기</text>
  <text x="346" y="188" class="t-xs t-c t-mu">rosidl_default_generators</text>
  <text x="346" y="210" class="t-xs t-c t-mu">(CMake 에서 동작)</text>
  <line x1="456" y1="110" x2="520" y2="54" class="ln-blue ar-blue"/>
  <line x1="456" y1="145" x2="520" y2="145" class="ln-orange ar-orange"/>
  <line x1="456" y1="180" x2="520" y2="236" class="ln-teal ar-teal"/>
  <rect x="524" y="24" width="340" height="60" rx="10" class="blue"/>
  <text x="694" y="46" class="t-b t-c">C++ 헤더</text>
  <text x="694" y="68" class="t-xs t-c t-mono">#include "tutorial_interfaces/msg/sphere.hpp"</text>
  <rect x="524" y="115" width="340" height="60" rx="10" class="orange"/>
  <text x="694" y="137" class="t-b t-c">파이썬 클래스</text>
  <text x="694" y="159" class="t-xs t-c t-mono">from tutorial_interfaces.msg import Sphere</text>
  <rect x="524" y="206" width="340" height="60" rx="10" class="teal"/>
  <text x="694" y="228" class="t-b t-c">DDS 타입 지원 코드</text>
  <text x="694" y="250" class="t-xs t-c">네트워크로 보낼 때 직렬화 · 역직렬화</text>
  <text x="440" y="288" class="t-sm t-c">→ 한 번 정의하면 C++ 노드와 파이썬 노드가 <tspan class="t-b">같은 메시지</tspan>로 대화</text>
</svg>`
    },

    /* ---------------------------------------------------------------- HTML 도표 */
    primTable: `<table class="tbl">
  <thead><tr><th>ROS 2 타입</th><th>뜻 · 범위</th><th>파이썬</th><th>C++</th></tr></thead>
  <tbody>
    <tr><td><code>bool</code></td><td>참/거짓</td><td><code>bool</code></td><td><code>bool</code></td></tr>
    <tr><td><code>byte</code> · <code>char</code></td><td>1바이트 데이터 · 문자</td><td><code>bytes</code> · <code>int</code></td><td><code>uint8_t</code> · <code>unsigned char</code></td></tr>
    <tr><td><code>int8</code> · <code>uint8</code></td><td>−128~127 · 0~255</td><td><code>int</code></td><td><code>int8_t</code> · <code>uint8_t</code></td></tr>
    <tr><td><code>int16</code> · <code>uint16</code></td><td>2바이트 정수</td><td><code>int</code></td><td><code>int16_t</code> · <code>uint16_t</code></td></tr>
    <tr><td><code>int32</code> · <code>uint32</code></td><td>4바이트 정수</td><td><code>int</code></td><td><code>int32_t</code> · <code>uint32_t</code></td></tr>
    <tr><td><code>int64</code> · <code>uint64</code></td><td>8바이트 정수</td><td><code>int</code></td><td><code>int64_t</code> · <code>uint64_t</code></td></tr>
    <tr><td><code>float32</code></td><td>단정밀도 실수</td><td><code>float</code></td><td><code>float</code></td></tr>
    <tr><td><code>float64</code></td><td>배정밀도 실수 (가장 많이 씀)</td><td><code>float</code></td><td><code>double</code></td></tr>
    <tr><td><code>string</code></td><td>문자열 (UTF-8)</td><td><code>str</code></td><td><code>std::string</code></td></tr>
  </tbody>
</table>`,

    arrTable: `<table class="tbl cmp">
  <thead><tr><th>표기</th><th>뜻</th><th>예</th></tr></thead>
  <tbody>
    <tr><td><code>float64[]</code></td><td><b>크기 제한 없는</b> 배열 (unbounded)</td><td><code>float32[] ranges</code> — 라이다 거리값들</td></tr>
    <tr><td><code>float64[9]</code></td><td><b>크기가 정확히 9</b>인 고정 배열</td><td><code>float64[9] orientation_covariance</code> — 3×3 행렬</td></tr>
    <tr><td><code>int32[&lt;=5]</code></td><td><b>최대 5개</b>까지인 제한 배열 (bounded)</td><td><code>int32[&lt;=5] ids</code></td></tr>
    <tr><td><code>string&lt;=10</code></td><td>최대 10자 문자열</td><td><code>string&lt;=10 code</code></td></tr>
    <tr><td><code>Point</code> · <code>geometry_msgs/Point</code></td><td><b>다른 메시지</b>를 필드로 (중첩). 같은 패키지면 패키지 이름 생략 가능</td><td><code>geometry_msgs/Point center</code></td></tr>
    <tr><td><code>PoseStamped[]</code></td><td>메시지의 배열</td><td><code>geometry_msgs/PoseStamped[] poses</code> — nav_msgs/Path</td></tr>
    <tr><td><code>uint8 x 42</code></td><td>기본값 42 (필드 이름 뒤에 값)</td><td><code>float64 w 1</code> — Quaternion 의 w 기본값</td></tr>
    <tr><td><code>int32 MAX=100</code></td><td>상수 (이름은 대문자, <code>=</code> 로)</td><td><code>uint8 STATUS_OK=0</code></td></tr>
  </tbody>
</table>`,

    yamlTable: `<table class="tbl">
  <thead><tr><th>❌ 틀린 예</th><th>⭕ 바른 예</th><th>이유</th></tr></thead>
  <tbody>
    <tr><td><code>"{linear: {x:2.0}}"</code></td><td><code>"{linear: {x: 2.0}}"</code></td><td>YAML 은 <b>콜론 뒤 공백</b>이 있어야 "키: 값"으로 읽음</td></tr>
    <tr><td><code>{linear: {x: 2.0}}</code> (따옴표 없음)</td><td><code>"{linear: {x: 2.0}}"</code></td><td>따옴표가 없으면 셸이 공백마다 인자를 나눠 버림</td></tr>
    <tr><td><code>"{data: Hello: ROS}"</code></td><td><code>"{data: 'Hello: ROS'}"</code></td><td>문자열 안에 콜론 · 쉼표 · 중괄호가 있으면 작은따옴표로 감싸기</td></tr>
    <tr><td><code>"{linear: {X: 2.0}}"</code></td><td><code>"{linear: {x: 2.0}}"</code></td><td>필드 이름은 대소문자까지 정확히 (<code>ros2 interface show</code> 로 확인)</td></tr>
    <tr><td><code>"{x: 2.0}"</code> (Twist 에)</td><td><code>"{linear: {x: 2.0}}"</code></td><td>중첩 구조를 그대로 따라가야 함</td></tr>
    <tr><td><code>"{data: 3.7}"</code> (Int32 에)</td><td><code>"{data: 3}"</code></td><td>정수 필드에는 정수만. 실수 필드에는 <code>2.0</code> 처럼 소수점을 쓰는 습관</td></tr>
  </tbody>
</table>`
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '인터페이스 — 노드들이 약속한 "데이터 양식"',
      html: `
<p>2장에서 토픽은 <b>같은 이름 + 같은 메시지 타입</b>이어야 연결된다고 배웠습니다. 이 "메시지 타입"을 정의하는 파일을 통틀어 <b>인터페이스(interface)</b>라고 부릅니다. 노드끼리 주고받는 데이터의 <b>칸(필드)과 자료형</b>을 미리 약속해 두는 양식이에요.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 택배 송장</div>
송장에는 받는 사람 · 주소 · 전화번호 칸이 정해져 있어서, 처음 보는 택배 기사도 바로 읽을 수 있습니다. ROS 2 메시지도 마찬가지로 칸이 정해져 있어서, <b>다른 사람이 만든 노드 · 다른 언어로 만든 노드</b>와도 바로 대화할 수 있습니다.</div>
{{fig:kinds}}
<p>인터페이스는 세 종류이고, 각각 <b>패키지/종류/이름</b> 형식의 전체 이름을 가집니다.</p>
<div class="cards c3">
  <div class="card green"><div class="ci">📻</div><b>메시지 .msg</b><p>토픽용. 예: <code>geometry_msgs/msg/Twist</code>, <code>std_msgs/msg/String</code></p></div>
  <div class="card orange"><div class="ci">📞</div><b>서비스 .srv</b><p>요청 <code>---</code> 응답. 예: <code>turtlesim/srv/Spawn</code> (4장)</p></div>
  <div class="card purple"><div class="ci">🍕</div><b>액션 .action</b><p>목표 <code>---</code> 결과 <code>---</code> 피드백. 예: <code>turtlesim/action/RotateAbsolute</code> (5장)</p></div>
</div>
<p>지금 켜져 있는 노드들이 어떤 인터페이스를 쓰는지 터미널로 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic list -t
ros2 interface show turtlesim/msg/Pose</code></pre>
<pre class="code out" data-lang="출력"><code>float32 x
float32 y
float32 theta

float32 linear_velocity
float32 angular_velocity</code></pre>
{{widget:term|chips=ros2 topic list -t;ros2 interface show turtlesim/msg/Pose;ros2 interface show turtlesim/srv/Spawn;ros2 interface show turtlesim/action/RotateAbsolute|h=260}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 세 종류 구별하기</div>
<ol>
  <li>위 코드 블록을 실행해 토픽마다 붙은 <code>[타입]</code> 을 읽어 보세요. (이 페이지 5절의 실습 창에 turtlesim 이 켜져 있어서 <code>/turtle1/...</code> 토픽이 보입니다)</li>
  <li>칩으로 <code>turtlesim/srv/Spawn</code> 을 보세요. <code>---</code> 위가 요청(x, y, theta, name), 아래가 응답(name)입니다.</li>
  <li><code>turtlesim/action/RotateAbsolute</code> 에는 <code>---</code> 가 몇 개인가요? 각 부분이 목표 · 결과 · 피드백 중 무엇일지 맞혀 보세요.</li>
</ol></div>`
    },

    /* ================================================================ 2 */
    {
      title: '필드 타입 — 기본 타입 · 배열 · 중첩',
      html: `
<p>.msg 파일의 한 줄은 <b><code>타입 필드이름</code></b> 입니다. 타입에는 숫자 · 문자열 같은 <b>기본 타입(primitive)</b>과, 다른 메시지를 가져다 쓰는 <b>중첩 타입</b>이 있습니다.</p>
{{fig:primTable}}
<div class="box tip"><div class="box-t">💡 float32 와 float64 중 무엇을?</div>
특별한 이유가 없으면 <b>float64</b>(파이썬 float, C++ double)를 씁니다. geometry_msgs 의 좌표 · 속도는 모두 float64 입니다. 대신 데이터가 아주 많은 센서(라이다 거리 수백 개)는 크기를 줄이려 float32 를 쓰기도 해요(<code>sensor_msgs/LaserScan</code>). turtlesim 의 Pose 도 float32 입니다.</div>

<h4>배열 · 제한 · 기본값 · 상수</h4>
{{fig:arrTable}}

<h4>중첩 — 메시지 안의 메시지</h4>
<p>메시지는 다른 메시지를 필드로 가질 수 있습니다. 예를 들어 <code>Twist</code> 는 <code>Vector3</code> 두 개로, <code>Vector3</code> 는 <code>float64</code> 세 개로 이루어져 있어요. 결국 모든 메시지는 기본 타입으로 풀립니다.</p>
{{fig:nested}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface show geometry_msgs/msg/Twist
ros2 interface show geometry_msgs/msg/Vector3</code></pre>
<pre class="code out" data-lang="출력"><code># This expresses velocity in free space broken into its linear and angular parts.

Vector3  linear
	float64 x
	float64 y
	float64 z
Vector3  angular
	float64 x
	float64 y
	float64 z</code></pre>
<p><code>ros2 interface show</code> 는 중첩된 타입을 <b>들여쓰기로 펼쳐서</b> 보여 줍니다. 들여쓰기 한 단계 = 한 층 안쪽이라고 읽으면 됩니다.</p>`
    },

    /* ================================================================ 3 */
    {
      title: '자주 쓰는 메시지 패키지와 Header',
      html: `
<p>ROS 2 에는 로봇에서 흔히 쓰는 데이터를 위한 <b>표준 메시지 패키지</b>가 준비되어 있습니다. 새 메시지를 만들기 전에 <b>이미 있는 표준 메시지부터 찾아 쓰는 것</b>이 원칙이에요. 그래야 RViz2 · Nav2 같은 도구와 바로 연결됩니다.</p>
{{fig:families}}
<table class="tbl">
  <thead><tr><th>메시지</th><th>주요 필드</th><th>어디에 쓰나</th></tr></thead>
  <tbody>
    <tr><td><code>geometry_msgs/Twist</code></td><td>linear · angular (Vector3)</td><td>속도 명령 <code>/cmd_vel</code></td></tr>
    <tr><td><code>geometry_msgs/Pose</code></td><td>position (Point) · orientation (Quaternion)</td><td>위치 + 방향</td></tr>
    <tr><td><code>geometry_msgs/PoseStamped</code></td><td>header · pose</td><td>내비게이션 목표 지점</td></tr>
    <tr><td><code>geometry_msgs/TransformStamped</code></td><td>header · child_frame_id · transform</td><td>좌표계 변환(TF, 12장)</td></tr>
    <tr><td><code>geometry_msgs/Quaternion</code></td><td>x · y · z · w (기본 w = 1)</td><td>3D 방향(회전) 표현</td></tr>
    <tr><td><code>sensor_msgs/LaserScan</code></td><td>header · angle_min/max/increment · range_min/max · ranges[] · intensities[]</td><td>2D 라이다 <code>/scan</code></td></tr>
    <tr><td><code>sensor_msgs/Image</code></td><td>header · height · width · encoding · step · data[]</td><td>카메라 영상 (19장)</td></tr>
    <tr><td><code>sensor_msgs/Imu</code></td><td>orientation · angular_velocity · linear_acceleration (+ 공분산)</td><td>관성 측정 장치</td></tr>
    <tr><td><code>sensor_msgs/JointState</code></td><td>name[] · position[] · velocity[] · effort[]</td><td>로봇팔 · 다리 관절 상태</td></tr>
    <tr><td><code>nav_msgs/Odometry</code></td><td>header · child_frame_id · pose · twist (공분산 포함)</td><td>바퀴로 추정한 위치 <code>/odom</code></td></tr>
    <tr><td><code>nav_msgs/Path</code></td><td>header · poses[] (PoseStamped 배열)</td><td>계획된 경로</td></tr>
    <tr><td><code>nav_msgs/OccupancyGrid</code></td><td>header · info · data[] (int8)</td><td>격자 지도 <code>/map</code></td></tr>
  </tbody>
</table>

<h4>Header — "언제, 어디 기준" 꼬리표</h4>
<p>센서 데이터와 위치 데이터에는 거의 항상 <b><code>std_msgs/Header</code></b> 가 첫 필드로 붙습니다. Header 에는 두 필드만 있어요.</p>
{{fig:header}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface show std_msgs/msg/Header
ros2 interface show geometry_msgs/msg/PoseStamped</code></pre>
<div class="box note"><div class="box-t">📝 이름 짓기 관례 — Stamped</div>
<code>Pose</code> 에 Header 를 붙인 것이 <code>PoseStamped</code>, <code>Twist</code> 에 붙인 것이 <code>TwistStamped</code> 입니다. 이름에 <b>Stamped</b> 가 있으면 "시각과 좌표계가 붙은 버전"이라고 생각하면 됩니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'ros2 interface 명령과 인터페이스 탐색기',
      html: `
<p>처음 보는 메시지를 만나면 <code>ros2 interface</code> 명령으로 구조를 확인합니다. 특히 <code>proto</code> 는 <b>ros2 topic pub 에 바로 쓸 수 있는 YAML 틀</b>을 만들어 줘서 아주 편리해요.</p>
<table class="tbl">
  <thead><tr><th>명령</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr><td><code>ros2 interface list</code></td><td>설치된 모든 인터페이스 (<code>-m</code> 메시지만 · <code>-s</code> 서비스만 · <code>-a</code> 액션만)</td></tr>
    <tr><td><code>ros2 interface packages</code></td><td>인터페이스를 가진 패키지 목록</td></tr>
    <tr><td><code>ros2 interface package &lt;패키지&gt;</code></td><td>그 패키지의 인터페이스 목록</td></tr>
    <tr><td><code>ros2 interface show &lt;타입&gt;</code></td><td>정의 전체 (중첩 타입은 펼쳐서)</td></tr>
    <tr><td><code>ros2 interface proto &lt;타입&gt;</code></td><td>기본값이 채워진 YAML 틀</td></tr>
  </tbody>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface list -m
ros2 interface package turtlesim
ros2 interface proto geometry_msgs/msg/Twist</code></pre>
<pre class="code out" data-lang="출력 (proto)"><code>"linear:
  x: 0.0
  y: 0.0
  z: 0.0
angular:
  x: 0.0
  y: 0.0
  z: 0.0
"</code></pre>
<p>아래 <b>인터페이스 탐색기</b>에서는 메시지 · 서비스 · 액션을 골라 구조를 펼쳐 보고, 값을 넣어 <code>ros2 topic pub</code> 명령을 만들어 볼 수 있습니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 메시지 해부</div>
<ol>
  <li>탐색기에서 <code>sensor_msgs/msg/LaserScan</code> 을 찾아 필드를 펼쳐 보세요. 배열(<code>[]</code>) 필드는 무엇인가요?</li>
  <li><code>nav_msgs/msg/Odometry</code> 를 열어 Header 가 어디 있는지, <code>pose</code> 안에 무엇이 몇 겹으로 들어 있는지 따라가 보세요.</li>
  <li><code>geometry_msgs/msg/Twist</code> 로 돌아와 값을 넣어 명령을 만들고, 복사해서 다음 절의 터미널에 붙여 보세요.</li>
</ol></div>
{{widget:iface|type=geometry_msgs/msg/Twist}}`
    },

    /* ================================================================ 5 */
    {
      title: 'YAML 로 메시지 쓰기 — ros2 topic pub 제대로 하기',
      html: `
<p><code>ros2 topic pub</code> · <code>ros2 service call</code> · <code>ros2 action send_goal</code> 의 마지막 인자는 모두 <b>YAML</b> 로 쓴 메시지 값입니다. YAML 은 사람이 읽기 쉬운 데이터 표기법으로, 여기서는 한 줄로 쓰는 <b>흐름(flow) 스타일</b> <code>{키: 값, 키: {키: 값}}</code> 을 씁니다.</p>
<div class="two">
<div><p><b>메시지 구조</b></p>
<pre class="code" data-lang="msg"><code>Vector3 linear
  float64 x
  float64 y
  float64 z
Vector3 angular
  float64 x
  float64 y
  float64 z</code></pre></div>
<div><p><b>YAML 로 쓰면</b></p>
<pre class="code" data-lang="yaml"><code>{linear: {x: 2.0, y: 0.0, z: 0.0},
 angular: {x: 0.0, y: 0.0, z: 1.8}}</code></pre>
<p>빠진 필드는 기본값(0, 빈 문자열)이 들어가므로 <code>{linear: {x: 2.0}}</code> 만 써도 됩니다.</p></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /chatter std_msgs/msg/String "{data: '안녕하세요: ROS 2'}"</code></pre>
{{fig:yamlTable}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 일부러 틀려 보기</div>
<ol>
  <li>아래 실습 터미널에 위 코드 블록의 첫 명령을 입력해 거북이를 움직이세요.</li>
  <li>콜론 뒤 공백을 빼고(<code>{linear: {x:2.0}}</code>) 다시 실행해 보세요. 어떤 오류가 나오나요?</li>
  <li>필드 이름을 대문자 <code>X</code> 로 바꾸면? "has no attribute" 오류를 읽고 원인을 찾아보세요.</li>
  <li><code>ros2 topic echo /chatter</code> 를 켠 뒤(<kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춤), 다른 방법으로 String 메시지를 발행해 보세요. 콜론이 들어간 문자열은 작은따옴표로 감싸야 합니다.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=YAML 로 메시지 보내기 — 터미널 + turtlesim}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x:2.0}}"
ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {X: 2.0}}"</code></pre>
<div class="box tip"><div class="box-t">💡 여러 줄 YAML 도 됩니다</div>
진짜 터미널에서는 따옴표 안에서 줄을 바꿔 블록 스타일로 써도 됩니다. 예: <code>ros2 topic pub --once /chatter std_msgs/msg/String "data: hello"</code> 처럼 중괄호 없이 <code>키: 값</code> 만 써도 됩니다. 헷갈리면 <code>ros2 interface proto</code> 로 틀을 받아 고치세요.</div>`
    },

    /* ================================================================ 6 */
    {
      title: '파이썬에서 메시지 다루기 — 2 와 2.0 은 다르다',
      html: `
<p>rclpy 의 메시지 클래스는 <b>필드 타입을 엄격하게 검사</b>합니다. <code>float64</code> 필드에 정수 <code>2</code> 를 넣으면 실행 중에 <b>AssertionError</b> 가 나요. 파이썬에서는 <code>2</code> 와 <code>2.0</code> 이 다른 타입(int · float)이기 때문입니다.</p>
<div class="vs">
  <div class="vs-a red"><b>❌ 오류</b><ul><li><code>msg.linear.x = 2</code></li><li><code>AssertionError: The 'x' field must be of type 'float'</code></li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b green"><b>⭕ 정상</b><ul><li><code>msg.linear.x = 2.0</code></li><li><code>msg.linear.x = float(speed)</code></li></ul></div>
</div>
<p>아래 프로그램은 일부러 정수를 넣어 오류를 잡아 본 뒤, 올바르게 float 을 넣어 거북이를 움직입니다. 사용자 정의 메시지 <code>tutorial_interfaces/msg/Sphere</code>(7절에서 만듦)도 함께 발행해요.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from tutorial_interfaces.msg import Sphere


class TypeCheckDemo(Node):
    def __init__(self):
        super().__init__('type_check_demo')
        self.cmd_pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.sphere_pub = self.create_publisher(Sphere, 'sphere', 10)

        msg = Twist()
        try:
            msg.linear.x = 2          # int -> error!
        except AssertionError as e:
            self.get_logger().error(f'실패: {e}')
        msg.linear.x = 2.0            # float -> OK
        self.get_logger().info(f'성공: linear.x = {msg.linear.x}')

        self.create_timer(0.5, self.tick)

    def tick(self):
        cmd = Twist()
        cmd.linear.x = 1.5
        cmd.angular.z = 1.0
        self.cmd_pub.publish(cmd)

        s = Sphere()
        s.center.x = 1.0
        s.radius = 0.5
        self.sphere_pub.publish(s)


def main():
    rclpy.init()
    node = TypeCheckDemo()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 타입 오류 체험</div>
<ol>
  <li>위 코드의 <b>▶ 실습기에서 실행</b>을 누르세요. 빨간 <code>실패: The 'x' field must be of type 'float'</code> 로그 뒤에 성공 로그가 나오고, 거북이가 원을 그립니다.</li>
  <li><code>s.radius = 0.5</code> 를 <code>s.radius = 1</code> 로 바꿔 실행해 보세요. 이번에는 잡지 않은 오류라 노드가 멈춥니다.</li>
  <li>실행 중에 터미널에서 <code>ros2 topic echo /sphere</code> 로 Sphere 메시지를 확인해 보세요. <code>center</code> 가 중첩되어 출력됩니다.</li>
</ol></div>
<div class="box note"><div class="box-t">📝 명령줄 YAML 은 조금 너그럽다</div>
<code>ros2 topic pub</code> 은 YAML 의 정수를 실수 필드에 넣을 때 자동으로 바꿔 주는 경우가 많습니다. 하지만 <b>파이썬 코드에서는 절대 자동으로 바뀌지 않으니</b>, 어디서든 실수 필드에는 <code>2.0</code> 처럼 쓰는 습관을 들이세요. 반대로 정수 필드(<code>int32</code>)에 <code>3.0</code> 을 넣어도 오류입니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '나만의 인터페이스 만들기 — tutorial_interfaces',
      html: `
<p>표준 메시지로 표현하기 어려운 데이터라면 직접 만듭니다. 공식 튜토리얼과 같은 <b><code>tutorial_interfaces</code></b> 패키지를 만들어 메시지 두 개(<code>Num</code>, <code>Sphere</code>)와 서비스 한 개(<code>AddThreeInts</code>)를 정의해 봅시다.</p>
{{fig:rosidl}}

<h4>① 패키지와 폴더 만들기</h4>
<p>인터페이스 패키지는 <b>반드시 <code>ament_cmake</code></b> 로 만듭니다(파이썬 노드에서 쓰는 것은 상관없어요). .msg 는 <code>msg/</code>, .srv 는 <code>srv/</code> 폴더에 둬야 합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_cmake --license Apache-2.0 tutorial_interfaces
cd tutorial_interfaces
mkdir msg srv
ls</code></pre>

<h4>② 정의 파일 쓰기</h4>
<div class="cards c3">
  <div class="card green"><b>msg/Num.msg</b><pre class="code" data-lang="msg"><code>int64 num</code></pre></div>
  <div class="card green"><b>msg/Sphere.msg</b><pre class="code" data-lang="msg"><code>geometry_msgs/Point center
float64 radius</code></pre></div>
  <div class="card orange"><b>srv/AddThreeInts.srv</b><pre class="code" data-lang="srv"><code>int64 a
int64 b
int64 c
---
int64 sum</code></pre></div>
</div>
<p><code>Sphere</code> 는 다른 패키지(<code>geometry_msgs</code>)의 <code>Point</code> 를 가져다 씁니다. 이런 <b>의존성</b>은 아래 두 파일에 꼭 적어야 해요.</p>

<h4>③ CMakeLists.txt — 코드 생성 요청</h4>
<pre class="code" data-lang="cmake"><code>find_package(geometry_msgs REQUIRED)
find_package(rosidl_default_generators REQUIRED)

rosidl_generate_interfaces(\${PROJECT_NAME}
  "msg/Num.msg"
  "msg/Sphere.msg"
  "srv/AddThreeInts.srv"
  DEPENDENCIES geometry_msgs  <span class="cm"># Sphere.msg 가 geometry_msgs 를 씀</span>
)</code></pre>

<h4>④ package.xml — 의존성 선언</h4>
<pre class="code" data-lang="xml"><code>&lt;depend&gt;geometry_msgs&lt;/depend&gt;
&lt;buildtool_depend&gt;rosidl_default_generators&lt;/buildtool_depend&gt;
&lt;exec_depend&gt;rosidl_default_runtime&lt;/exec_depend&gt;
&lt;member_of_group&gt;rosidl_interface_packages&lt;/member_of_group&gt;</code></pre>
<table class="tbl">
  <thead><tr><th>줄</th><th>뜻</th></tr></thead>
  <tbody>
    <tr><td><code>buildtool_depend rosidl_default_generators</code></td><td>빌드할 때 .msg → 코드 생성기가 필요함</td></tr>
    <tr><td><code>exec_depend rosidl_default_runtime</code></td><td>실행할 때 생성된 코드를 쓰는 데 필요한 런타임</td></tr>
    <tr><td><code>member_of_group rosidl_interface_packages</code></td><td>"나는 인터페이스 패키지다"라는 소속 표시</td></tr>
    <tr><td><code>depend geometry_msgs</code></td><td>Sphere 가 쓰는 다른 인터페이스 패키지</td></tr>
  </tbody>
</table>
<p>아래 <b>패키지 탐색기</b>에서 각 파일을 눌러 완성된 내용과 설명을 확인하세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 인터페이스 패키지 해부</div>
<ol>
  <li>탐색기에서 <code>CMakeLists.txt</code> 를 눌러 <code>rosidl_generate_interfaces</code> 부분을 찾으세요.</li>
  <li><code>package.xml</code> 에서 위 표의 네 줄을 찾아보세요.</li>
  <li><code>msg/Sphere.msg</code> 를 눌러 중첩 타입이 어떻게 쓰였는지 확인하세요.</li>
</ol></div>
{{widget:pkg|kind=interfaces}}

<h4>⑤ 빌드하고 확인하기</h4>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon build --packages-select tutorial_interfaces</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>source install/setup.bash
ros2 interface show tutorial_interfaces/msg/Sphere
ros2 interface show tutorial_interfaces/srv/AddThreeInts</code></pre>
<pre class="code out" data-lang="출력"><code>geometry_msgs/Point center
	float64 x
	float64 y
	float64 z
float64 radius</code></pre>
<p>이제 다른 패키지의 파이썬 노드에서 <code>from tutorial_interfaces.msg import Num</code> 처럼 가져다 쓸 수 있습니다(쓰는 쪽 package.xml 에 <code>&lt;depend&gt;tutorial_interfaces&lt;/depend&gt;</code> 추가). 서비스 <code>AddThreeInts</code> 는 4장 · 9장에서 사용합니다.</p>
<div class="box note"><div class="box-t">📝 브라우저 실습 환경에서는</div>
이 사이트에는 <code>tutorial_interfaces</code> 의 정의가 미리 들어 있어서 빌드 전에도 <code>ros2 interface show</code> 가 동작합니다. 편집기(<code>nano msg/Num.msg</code>)로 파일을 직접 써 보는 연습은 해 볼 수 있지만, C++ 코드 생성은 흉내만 냅니다. 진짜 Ubuntu 에서 꼭 한 번 끝까지 해 보세요.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '이름 규칙과 설계 요령',
      html: `
<p>인터페이스 이름을 잘못 지으면 빌드 단계에서 오류가 납니다. 규칙은 간단하니 한 번에 익혀 두세요.</p>
<table class="tbl cmp">
  <thead><tr><th>대상</th><th>규칙</th><th>⭕ 좋은 예</th><th>❌ 안 되는 예</th></tr></thead>
  <tbody>
    <tr><td>타입(파일) 이름</td><td><b>대문자로 시작하는 CamelCase</b>, 영문자 · 숫자만</td><td><code>Num.msg</code>, <code>AddThreeInts.srv</code></td><td><code>num.msg</code>, <code>add_three_ints.srv</code></td></tr>
    <tr><td>필드 이름</td><td>소문자 · 숫자 · 밑줄, 소문자로 시작, 밑줄 두 개 연속 · 끝 밑줄 금지</td><td><code>radius</code>, <code>linear_velocity</code></td><td><code>Radius</code>, <code>2d_pose</code>, <code>my__val</code></td></tr>
    <tr><td>상수 이름</td><td>대문자 · 숫자 · 밑줄</td><td><code>int32 MAX_SPEED=10</code></td><td><code>int32 maxSpeed=10</code></td></tr>
    <tr><td>패키지 이름</td><td>소문자 · 숫자 · 밑줄, 소문자로 시작. 보통 <code>_interfaces</code> 나 <code>_msgs</code> 로 끝냄</td><td><code>my_robot_interfaces</code></td><td><code>MyRobotMsgs</code></td></tr>
  </tbody>
</table>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 인터페이스 설계 요령</div>
<ul>
  <li><b>표준 먼저</b>: 위치는 <code>geometry_msgs</code>, 센서는 <code>sensor_msgs</code>. 표준을 쓰면 RViz2 · Nav2 · rosbag 도구가 바로 알아봅니다.</li>
  <li><b>인터페이스 전용 패키지</b>: 노드 패키지와 분리해 <code>my_robot_interfaces</code> 처럼 따로 둡니다. 여러 패키지가 함께 쓰기 쉽고, 순환 의존을 피할 수 있어요.</li>
  <li><b>단위를 이름이나 주석에</b>: ROS 는 SI 단위(미터 · 초 · 라디안)가 관례입니다(REP 103). <code>float64 distance_m</code> 처럼 단위를 적어 두면 실수를 줄입니다.</li>
  <li><b>std_msgs/Int32 같은 범용 타입은 연습용</b>: 실제 제품에서는 의미가 드러나는 이름의 메시지를 권장합니다.</li>
</ul></div>

<div class="box warn"><div class="box-t">⚠ 왜 ament_python 으로는 인터페이스를 못 만들까?</div>
.msg 를 C++ · 파이썬 코드로 바꾸는 <b>rosidl 코드 생성기가 CMake 위에서 동작</b>하기 때문입니다. 그래서 인터페이스 패키지는 <code>ament_cmake</code> 여야 합니다. 노드는 파이썬 패키지(ament_python)에 두고, 인터페이스는 별도의 ament_cmake 패키지에 두는 것이 가장 흔한 구성입니다(7장).</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface packages
ros2 interface package tutorial_interfaces</code></pre>`
    }
  ],

  videos: [
    { title: 'ROS2 - Create a Custom Interface (Custom Message)', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=E_xBPI8SQig', lang: 'en', desc: '인터페이스 전용 패키지를 만들고 CMakeLists.txt · package.xml 을 고쳐 사용자 정의 메시지를 빌드하는 전 과정.' },
    { title: 'ROS2 Tutorials #7: How to create a ROS2 Custom Message [NEW]', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=nG3IOkEOPps', lang: 'en', desc: '사용자 정의 메시지를 만들고 노드에서 쓰는 과정을 따라 합니다.' },
    { title: '[ROS2 Tutorials] What is ROS2 Message?', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=JYgSMgxNiEg', lang: 'en', desc: 'ROS 2 메시지가 무엇이고 ros2 interface 로 어떻게 살펴보는지 짧게 설명합니다.' },
    { title: 'ROS2 Concepts in Practice #4 - Interfaces', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=N3XfhAFJRus', lang: 'en', desc: '메시지 · 서비스 · 액션 인터페이스를 실제 예로 비교합니다.' },
    { title: '[ROS2] 2-1. 토픽 메시지 정의 만들기 | R2R 응용', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=bzIFQmn7ZxY', lang: 'ko', desc: '한국어 강의. 토픽에 쓸 사용자 정의 메시지를 정의하는 방법을 설명합니다.' },
    { title: 'ROS2를 배워보자 - 15.사용자 정의 msg 및 srv 파일 생성', channel: 'QUAD 드론 연구소', url: 'https://www.youtube.com/watch?v=0RiX1QDGj3M', lang: 'ko', desc: '한국어로 .msg · .srv 파일을 만들고 빌드하는 과정을 보여 줍니다.' }
  ],

  terms: [
    ['인터페이스 (interface)', '노드끼리 주고받는 데이터의 형식을 정의한 것. .msg · .srv · .action 세 종류'],
    ['메시지 (.msg)', '토픽으로 오가는 데이터 양식. 한 줄에 "타입 필드이름" 하나'],
    ['서비스 정의 (.srv)', '요청과 응답을 --- 로 나눈 양식'],
    ['액션 정의 (.action)', '목표 --- 결과 --- 피드백 세 부분으로 된 양식'],
    ['기본 타입 (primitive)', 'bool · int8~uint64 · float32/64 · string 같은 더 나눌 수 없는 타입'],
    ['중첩 타입', '다른 메시지를 필드로 쓰는 것. 예: Twist 안의 Vector3'],
    ['배열 (unbounded · bounded · fixed)', 'float64[] 크기 제한 없음, int32[<=5] 최대 5개, float64[9] 정확히 9개'],
    ['std_msgs/Header', 'stamp(시각)와 frame_id(기준 좌표계)를 담는 꼬리표. Stamped 메시지의 첫 필드'],
    ['YAML (흐름 스타일)', '{키: 값, 키: {키: 값}} 형태의 데이터 표기법. ros2 topic pub 의 값 인자'],
    ['ros2 interface proto', '기본값이 채워진 YAML 틀을 출력해 주는 명령'],
    ['rosidl', '.msg/.srv/.action 에서 C++ · 파이썬 · DDS 코드를 생성하는 도구 모음'],
    ['rosidl_generate_interfaces', 'CMakeLists.txt 에서 인터페이스 파일의 코드 생성을 요청하는 함수'],
    ['rosidl_interface_packages', 'package.xml 의 member_of_group 에 적는, 인터페이스 패키지 소속 그룹 이름'],
    ['AssertionError (타입 검사)', 'rclpy 메시지 필드에 맞지 않는 타입을 넣었을 때 나는 오류. float 필드에 2 대신 2.0']
  ],

  summary: [
    '인터페이스는 노드들의 <b>데이터 양식</b>: <b>.msg</b>(토픽) · <b>.srv</b>(요청 --- 응답) · <b>.action</b>(목표 --- 결과 --- 피드백), 전체 이름은 <code>패키지/종류/이름</code>',
    '필드는 <code>타입 이름</code> 한 줄 — 기본 타입(bool · int · float32/64 · string), 배열(<code>[]</code> · <code>[N]</code> · <code>[&lt;=N]</code>), 중첩 메시지, 기본값 · 상수',
    '표준 패키지 먼저: <b>geometry_msgs</b>(Twist · Pose · PoseStamped · TransformStamped) · <b>sensor_msgs</b>(LaserScan · Image · Imu · JointState) · <b>nav_msgs</b>(Odometry · Path · OccupancyGrid)',
    '<b>Header</b> = stamp(언제) + frame_id(어느 좌표계 기준). 이름에 Stamped 가 붙은 메시지가 가짐',
    '<code>ros2 interface list · show · proto · package</code> 로 구조를 확인하고, YAML 은 <b>콜론 뒤 공백 · 전체 따옴표 · 정확한 필드 이름</b>',
    '파이썬 메시지는 타입 검사가 엄격 — float 필드에 <code>2</code> 는 AssertionError, <code>2.0</code> 으로',
    '사용자 정의 인터페이스는 <b>ament_cmake</b> 패키지 + <code>rosidl_generate_interfaces</code> + package.xml 의 <b>rosidl_default_generators / runtime / rosidl_interface_packages</b>'
  ],

  quiz: [
    { q: '.srv 파일에서 <code>---</code> 의 역할은?', options: ['주석의 시작', '요청 부분과 응답 부분을 나눈다', '배열의 끝을 표시한다', '파일의 끝을 표시한다'], answer: 1, explain: '.srv 는 --- 위가 요청(request), 아래가 응답(response)입니다. .action 은 --- 가 두 개로 목표 · 결과 · 피드백을 나눠요.' },
    { q: '<code>geometry_msgs/msg/Twist</code> 에서 로봇의 앞뒤 속도가 들어가는 필드는?', options: ['angular.z', 'linear.x', 'linear.z', 'angular.x'], answer: 1, explain: 'Twist 는 linear(Vector3)와 angular(Vector3)로 이루어져 있고, 바닥을 달리는 로봇은 linear.x 가 앞뒤 속도(m/s), angular.z 가 좌우 회전 속도(rad/s)입니다.' },
    { q: '<code>std_msgs/Header</code> 가 담는 두 가지 정보는?', options: ['노드 이름과 토픽 이름', '측정 시각(stamp)과 기준 좌표계(frame_id)', '발행 주기와 QoS', '메시지 크기와 순서 번호'], answer: 1, explain: 'Header 는 stamp(builtin_interfaces/Time)와 frame_id(string) 두 필드입니다. 서로 다른 센서 데이터를 같은 순간 · 같은 좌표계로 맞출 때 꼭 필요해요.' },
    { q: '파이썬에서 <code>msg.linear.x = 2</code> 를 실행하면?', options: ['자동으로 2.0 으로 바뀐다', 'AssertionError: The \'x\' field must be of type \'float\'', '0 이 들어간다', '경고만 나오고 정상 동작한다'], answer: 1, explain: 'rclpy 메시지는 필드 타입을 엄격히 검사합니다. float64 필드에는 2.0 이나 float(2) 를 넣어야 합니다.' },
    { q: 'ros2 topic pub 의 YAML 값으로 <b>올바른</b> 것은?', options: ['"{linear: {x:2.0}}"', '{linear: {x: 2.0}}  (따옴표 없음)', '"{linear: {x: 2.0}, angular: {z: 1.0}}"', '"{Linear: {X: 2.0}}"'], answer: 2, explain: '콜론 뒤에 공백이 있어야 하고, 셸이 나누지 않게 전체를 따옴표로 감싸야 하며, 필드 이름은 대소문자까지 정확해야 합니다.' },
    { q: '사용자 정의 .msg 파일을 만들 패키지의 빌드 타입은?', options: ['ament_python', 'ament_cmake', '아무거나 상관없다', 'catkin'], answer: 1, explain: 'rosidl 코드 생성이 CMake 위에서 동작하므로 인터페이스 패키지는 반드시 ament_cmake 입니다. 만든 인터페이스는 파이썬 노드에서도 쓸 수 있어요.' },
    { q: '인터페이스 패키지의 package.xml 에 들어가야 하는 줄이 <b>아닌</b> 것은?', options: ['&lt;buildtool_depend&gt;rosidl_default_generators&lt;/buildtool_depend&gt;', '&lt;exec_depend&gt;rosidl_default_runtime&lt;/exec_depend&gt;', '&lt;member_of_group&gt;rosidl_interface_packages&lt;/member_of_group&gt;', '&lt;exec_depend&gt;turtlesim&lt;/exec_depend&gt;'], answer: 3, explain: '앞의 세 줄은 모든 인터페이스 패키지에 필요합니다. turtlesim 은 이 인터페이스와 관계없는 패키지라 필요 없어요. 다른 인터페이스를 쓰면(예: geometry_msgs) &lt;depend&gt; 로 추가합니다.' }
  ],

  slides: [
    {
      title: '송장 칸이 없다면?',
      layout: 'center',
      html: `<div class="s-big">📦 칸이 정해진 <b>양식</b>이 있어야<br>누구나 읽고 쓸 수 있다</div>
<p class="s-small step">ROS 2 의 양식 = <b>인터페이스</b> (.msg · .srv · .action)</p>`,
      notes: '택배 송장을 보여 주며 도입합니다. “이름 · 주소 칸이 없으면 기사님이 어떻게 읽을까요?” → 노드끼리도 칸(필드)과 자료형이 정해진 양식이 필요하다. (3분)'
    },
    {
      title: '인터페이스 세 종류',
      html: `{{fig:kinds|nocap}}`,
      notes: '.msg 는 필드 목록, .srv 는 --- 하나, .action 은 --- 둘. 전체 이름 패키지/종류/이름 형식(geometry_msgs/msg/Twist)을 칠판에 적어 두세요. (4분)'
    },
    {
      title: '기본 타입',
      html: `{{fig:primTable|nocap}}`,
      notes: 'float64 = 파이썬 float = C++ double 이 가장 많이 쓰인다는 점을 강조합니다. int8~uint64 는 크기 차이일 뿐이라고 가볍게 넘어가세요. (3분)'
    },
    {
      title: '배열 · 기본값 · 상수',
      html: `{{fig:arrTable|nocap}}`,
      notes: '[] 는 제한 없음, [N] 은 고정, [<=N] 은 최대. LaserScan 의 ranges[] 와 Imu 의 covariance[9] 예를 짚습니다. Quaternion 의 w 기본값 1 은 “회전 없음”을 뜻한다고 덧붙이세요. (4분)'
    },
    {
      title: '메시지는 레고',
      html: `{{fig:nested|nocap}}`,
      notes: 'Twist → Vector3 → float64. 접근은 msg.linear.x, YAML 은 {linear: {x: 2.0}}. 점(.)과 중괄호가 같은 구조를 표현한다는 것을 연결해 주세요. (4분)'
    },
    {
      title: '표준 메시지 네 가족',
      html: `{{fig:families|nocap}}`,
      notes: '새로 만들기 전에 표준을 먼저 찾아라 — RViz2 · Nav2 가 바로 알아본다. 각 가족에서 하나씩 “어디에 쓰일까요?” 물어 봅니다(Twist→cmd_vel, LaserScan→scan, Odometry→odom). (5분)'
    },
    {
      title: 'Header — 언제, 어디 기준',
      html: `{{fig:header|nocap}}`,
      notes: '“x = 2.0 은 어디서부터 2미터일까요?” 발문으로 frame_id 의 필요성을 끌어냅니다. stamp 는 카메라와 라이다를 같은 순간끼리 맞추는 데 필요. 좌표계는 12장에서 자세히. (4분)'
    },
    {
      title: '인터페이스 탐색기',
      html: `{{widget:iface|type=sensor_msgs/msg/LaserScan}}`,
      notes: 'LaserScan 을 펼쳐 배열 필드(ranges, intensities)를 보여 주고, Twist 로 바꿔 값을 넣어 ros2 topic pub 명령을 만들어 봅니다. ros2 interface proto 가 같은 일을 한다고 알려 주세요. (5분)'
    },
    {
      title: 'YAML 흔한 실수',
      html: `{{fig:yamlTable|nocap}}`,
      notes: '콜론 뒤 공백, 전체 따옴표, 필드 이름 대소문자가 3대 실수입니다. 다음 슬라이드에서 일부러 틀려 보며 오류 메시지를 함께 읽어 보세요. (4분)'
    },
    {
      title: '직접 보내 보기',
      html: `{{widget:lab|with=turtlesim|title=YAML 로 Twist 보내기}}`,
      notes: '바른 명령 → 거북이 이동. 콜론 뒤 공백 삭제 → YAML 오류. 필드 이름 X → has no attribute 오류. 오류 메시지를 소리 내어 읽게 하면 디버깅 습관이 생깁니다. (6분)'
    },
    {
      title: '2 와 2.0 은 다르다',
      html: `<div class="vs"><div class="vs-a red"><b>❌ msg.linear.x = 2</b><ul><li>AssertionError</li><li>field must be of type 'float'</li></ul></div><div class="vs-mid">VS</div><div class="vs-b green"><b>⭕ msg.linear.x = 2.0</b><ul><li>float(speed) 도 OK</li></ul></div></div>`,
      notes: '파이썬 입문자가 가장 많이 겪는 ROS 2 오류입니다. 명령줄 YAML 은 너그럽지만 파이썬 코드는 엄격하다는 점을 대비시키세요. 본문의 실습 코드를 실행해 빨간 로그를 보여 주면 좋습니다. (3분)'
    },
    {
      title: '.msg 가 코드가 되기까지',
      html: `{{fig:rosidl|nocap}}`,
      notes: 'rosidl 이 C++ 헤더 · 파이썬 클래스 · DDS 코드를 만든다 → 그래서 CMake(ament_cmake)가 필요하다. 한 번 정의하면 C++ 노드와 파이썬 노드가 같은 메시지로 대화한다는 1장의 talker/listener 이야기와 연결하세요. (4분)'
    },
    {
      title: 'tutorial_interfaces 해부',
      html: `{{widget:pkg|kind=interfaces}}`,
      notes: 'CMakeLists.txt 의 rosidl_generate_interfaces, package.xml 의 네 줄(depend · buildtool_depend · exec_depend · member_of_group)을 차례로 눌러 보여 줍니다. 파일 이름은 CamelCase, 필드 이름은 snake_case 규칙도 함께 짚으세요. (6분)'
    },
    {
      title: '이름 규칙 한눈에',
      html: `<div class="cards c3">
<div class="card green step"><b>타입 · 파일</b><p><code>AddThreeInts.srv</code><br>CamelCase</p></div>
<div class="card blue step"><b>필드</b><p><code>linear_velocity</code><br>snake_case</p></div>
<div class="card orange step"><b>상수</b><p><code>MAX_SPEED=10</code><br>대문자</p></div>
</div>`,
      notes: '규칙을 어기면 colcon build 단계에서 오류가 난다는 점을 강조합니다. 다음 장(4장 서비스)에서 오늘 본 .srv 가 실제로 어떻게 호출되는지 배운다고 예고하세요. (3분)'
    }
  ]
});
