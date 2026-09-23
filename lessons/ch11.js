/* 11장 — QoS · DDS · 실행기 */
Course.lesson({
  id: 'ch11', no: '11',
  icon: '📶',
  title: 'QoS · DDS · 실행기',
  subtitle: '"분명 발행하는데 왜 안 받아지지?" — ROS 2 통신의 속사정을 들여다봅니다',
  level: '중급', time: '150분',
  goals: [
    'DDS 의 데이터 중심 발행/구독과 탐색(SPDP · SEDP) 과정을 그림으로 설명하고, ROS_DOMAIN_ID · ROS_AUTOMATIC_DISCOVERY_RANGE · RMW 를 설정할 수 있다',
    'QoS 정책(신뢰성 · 내구성 · 히스토리/깊이 · deadline · lifespan · liveliness)과 프리셋을 설명하고 코드에 적용할 수 있다',
    '요청(구독) · 제공(발행) QoS 호환 규칙으로 "메시지가 안 오는" 문제를 ros2 topic info -v 로 진단할 수 있다',
    'SingleThreaded/MultiThreaded 실행기와 MutuallyExclusive/Reentrant 콜백 그룹의 차이, 교착 상태 해결법을 설명할 수 있다',
    '라이프사이클(관리형) 노드의 상태 기계와 컴포넌트 · 프로세스 내 통신의 목적을 말할 수 있다'
  ],
  teacher: {
    intro: '"실습실에서 옆 조 친구의 teleop 이 내 거북이를 움직인 적 있나요?" 또는 "라이다 토픽은 보이는데 echo 하면 아무것도 안 나온 적 있나요?" 라고 묻습니다. 오늘은 이런 "이상한" 일들의 원인인 DDS · 도메인 · QoS · 실행기를 파헤친다고 소개합니다. (3분)',
    flow: '① DDS 와 탐색 15분 → ② 도메인 ID · 탐색 범위(domain 위젯) 15분 → ③ RMW 구현 10분 → ④ QoS 정책(qos 위젯) 20분 → ⑤ 프리셋 · 호환성 · 진단 실습(pylab qos + 터미널) 20분 → ⑥ transient_local · 늦게 온 구독자 10분 → ⑦ 실행기 · 콜백 그룹(exec 위젯) 25분 → ⑧ 라이프사이클(lifecycle 위젯) 15분 → ⑨ 컴포넌트 · 퀴즈 20분'
  },

  figs: {
    /* ------------------------------------------------------------ DDS 탐색 */
    discovery: {
      caption: 'DDS 탐색 — ① SPDP 로 "여기 참가자 있어요"를 멀티캐스트로 알리고, ② SEDP 로 서로의 퍼블리셔 · 서브스크라이버 목록을 교환한 뒤, ③ 짝이 맞으면 직접 데이터를 보냅니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="두 컴퓨터의 DDS 참가자가 SPDP 멀티캐스트로 서로를 발견하고 SEDP로 엔드포인트 정보를 교환한 뒤 토픽 데이터를 직접 주고받는 과정">
  <rect x="20" y="30" width="300" height="320" rx="14" class="box"/>
  <text x="170" y="56" class="t-b t-c">💻 노트북 (도메인 0)</text>
  <rect x="40" y="76" width="260" height="120" rx="10" class="teal"/>
  <text x="170" y="98" class="t-sm t-c t-b t-teal">DDS 참가자 (participant)</text>
  <ellipse cx="170" cy="140" rx="80" ry="24" class="blue"/>
  <text x="170" y="140" class="t-sm t-c t-b t-blue">/teleop</text>
  <text x="170" y="182" class="t-xs t-c">퍼블리셔: /cmd_vel (Twist)</text>

  <rect x="560" y="30" width="300" height="320" rx="14" class="box"/>
  <text x="710" y="56" class="t-b t-c">🤖 로봇 (도메인 0)</text>
  <rect x="580" y="76" width="260" height="120" rx="10" class="teal"/>
  <text x="710" y="98" class="t-sm t-c t-b t-teal">DDS 참가자 (participant)</text>
  <ellipse cx="710" cy="140" rx="80" ry="24" class="blue"/>
  <text x="710" y="140" class="t-sm t-c t-b t-blue">/base_driver</text>
  <text x="710" y="182" class="t-xs t-c">서브스크라이버: /cmd_vel (Twist)</text>

  <line x1="300" y1="110" x2="578" y2="110" class="ln-orange dash ar2"/>
  <text x="440" y="92" class="t-sm t-c t-orange t-b">① SPDP (멀티캐스트)</text>
  <text x="440" y="126" class="t-xs t-c">"참가자 있어요! 도메인 0"</text>

  <line x1="300" y1="200" x2="578" y2="200" class="ln-purple dash ar2"/>
  <text x="440" y="186" class="t-sm t-c t-purple t-b">② SEDP (유니캐스트)</text>
  <text x="440" y="216" class="t-xs t-c">"나는 /cmd_vel 을 이런 QoS 로 발행해요"</text>

  <line x1="300" y1="286" x2="578" y2="286" class="ln-green thick ar-green"/>
  <line x1="300" y1="286" x2="578" y2="286" class="ln-green moving"/>
  <text x="440" y="272" class="t-sm t-c t-green t-b">③ 데이터 (토픽 · 타입 · QoS 일치 시)</text>
  <rect x="115" y="264" width="110" height="44" rx="6" class="green"/>
  <text x="170" y="286" class="t-sm t-c t-b t-green">/cmd_vel</text>
  <rect x="655" y="264" width="110" height="44" rx="6" class="green"/>
  <text x="710" y="286" class="t-sm t-c t-b t-green">/cmd_vel</text>
  <text x="440" y="340" class="t-xs t-c t-mu">중앙 서버(ROS 1 의 roscore) 없이 스스로 찾음 — 대신 네트워크 설정(도메인 · 멀티캐스트)이 중요</text>
</svg>`
    },

    /* ------------------------------------------------------------ RMW 층 */
    rmw: {
      caption: 'RMW(ROS MiddleWare) 층 — 위의 코드는 그대로 두고, 아래의 통신 엔진을 환경 변수 하나로 바꿀 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="rclpy와 rclcpp 아래 rcl과 rmw 인터페이스, 그 아래 Fast DDS, Cyclone DDS, Zenoh 구현">
  <rect x="40" y="20" width="380" height="50" rx="10" class="teal"/>
  <text x="230" y="50" class="t-b t-c t-teal">rclpy (Python)</text>
  <rect x="460" y="20" width="380" height="50" rx="10" class="purple"/>
  <text x="650" y="50" class="t-b t-c t-purple">rclcpp (C++)</text>
  <rect x="40" y="84" width="800" height="44" rx="10" class="blue"/>
  <text x="440" y="111" class="t-b t-c t-blue">rcl (공통 C 라이브러리)</text>
  <rect x="40" y="142" width="800" height="44" rx="10" class="gray"/>
  <text x="440" y="169" class="t-b t-c">rmw 인터페이스 — RMW_IMPLEMENTATION 으로 선택</text>
  <line x1="170" y1="186" x2="170" y2="210" class="ln ar"/>
  <line x1="440" y1="186" x2="440" y2="210" class="ln ar"/>
  <line x1="710" y1="186" x2="710" y2="210" class="ln ar"/>
  <rect x="40" y="212" width="260" height="76" rx="10" class="orange"/>
  <text x="170" y="238" class="t-sm t-c t-b t-orange">rmw_fastrtps_cpp</text>
  <text x="170" y="258" class="t-xs t-c">eProsima Fast DDS</text>
  <text x="170" y="276" class="t-xs t-c t-b">Jazzy 기본값</text>
  <rect x="310" y="212" width="260" height="76" rx="10" class="orange"/>
  <text x="440" y="238" class="t-sm t-c t-b t-orange">rmw_cyclonedds_cpp</text>
  <text x="440" y="258" class="t-xs t-c">Eclipse Cyclone DDS</text>
  <text x="440" y="276" class="t-xs t-c t-mu">Unitree 등에서 사용</text>
  <rect x="580" y="212" width="260" height="76" rx="10" class="green"/>
  <text x="710" y="238" class="t-sm t-c t-b t-green">rmw_zenoh_cpp</text>
  <text x="710" y="258" class="t-xs t-c">Eclipse Zenoh (DDS 아님)</text>
  <text x="710" y="276" class="t-xs t-c t-b">Kilted 부터 Tier 1</text>
</svg>`
    },

    /* ------------------------------------------------------------ 신뢰성 */
    reliability: {
      caption: 'RELIABLE 은 잃어버린 메시지를 다시 보내 달라고 하고(재전송), BEST_EFFORT 는 잃어버리면 그냥 넘어갑니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="RELIABLE은 손실된 3번 메시지를 재전송하고 BEST_EFFORT는 3번을 버리는 비교">
  <text x="30" y="40" class="t-b t-blue">RELIABLE (등기 우편)</text>
  <ellipse cx="80" cy="90" rx="56" ry="22" class="blue"/>
  <text x="80" y="90" class="t-xs t-c t-b t-blue">발행</text>
  <ellipse cx="800" cy="90" rx="56" ry="22" class="blue"/>
  <text x="800" y="90" class="t-xs t-c t-b t-blue">구독</text>
  <line x1="136" y1="90" x2="742" y2="90" class="ln thin"/>
  <rect x="180" y="74" width="40" height="32" rx="4" class="green"/><text x="200" y="90" class="t-sm t-c">1</text>
  <rect x="260" y="74" width="40" height="32" rx="4" class="green"/><text x="280" y="90" class="t-sm t-c">2</text>
  <rect x="340" y="74" width="40" height="32" rx="4" class="red"/><text x="360" y="90" class="t-sm t-c">3</text>
  <text x="360" y="126" class="t-xs t-c t-red">✗ 손실</text>
  <rect x="420" y="74" width="40" height="32" rx="4" class="green"/><text x="440" y="90" class="t-sm t-c">4</text>
  <path d="M740,112 C640,150 460,150 372,112" class="ln-orange dash ar-orange"/>
  <text x="560" y="160" class="t-xs t-c t-orange">"3번 다시 보내 줘" (NACK) → 재전송</text>
  <rect x="520" y="74" width="40" height="32" rx="4" class="orange"/><text x="540" y="90" class="t-sm t-c">3</text>
  <text x="640" y="60" class="t-xs t-c">모두 도착 · 대신 지연 가능</text>

  <text x="30" y="200" class="t-b t-orange">BEST_EFFORT (일반 방송)</text>
  <ellipse cx="80" cy="250" rx="56" ry="22" class="blue"/>
  <text x="80" y="250" class="t-xs t-c t-b t-blue">발행</text>
  <ellipse cx="800" cy="250" rx="56" ry="22" class="blue"/>
  <text x="800" y="250" class="t-xs t-c t-b t-blue">구독</text>
  <line x1="136" y1="250" x2="742" y2="250" class="ln thin"/>
  <rect x="180" y="234" width="40" height="32" rx="4" class="green"/><text x="200" y="250" class="t-sm t-c">1</text>
  <rect x="260" y="234" width="40" height="32" rx="4" class="green"/><text x="280" y="250" class="t-sm t-c">2</text>
  <rect x="340" y="234" width="40" height="32" rx="4" class="red"/><text x="360" y="250" class="t-sm t-c">3</text>
  <text x="360" y="286" class="t-xs t-c t-red">✗ 손실 → 그냥 버림</text>
  <rect x="420" y="234" width="40" height="32" rx="4" class="green"/><text x="440" y="250" class="t-sm t-c">4</text>
  <rect x="500" y="234" width="40" height="32" rx="4" class="green"/><text x="520" y="250" class="t-sm t-c">5</text>
  <text x="640" y="220" class="t-xs t-c">빠르고 가벼움 · 최신 값이 중요한 센서에 적합</text>
</svg>`
    },

    /* ------------------------------------------------------------ 호환성 표 */
    compat: {
      caption: 'QoS 호환 규칙 — 발행자가 "제공(offered)"하는 품질이 구독자가 "요청(requested)"하는 품질 이상이어야 연결됩니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="신뢰성과 내구성에 대한 발행자 제공 QoS와 구독자 요청 QoS의 호환 여부 표">
  <text x="220" y="30" class="t-b t-c">신뢰성 (reliability)</text>
  <rect x="40" y="46" width="120" height="44" class="gray"/>
  <text x="100" y="62" class="t-xs t-c">발행(제공) ↓</text>
  <text x="100" y="80" class="t-xs t-c">구독(요청) →</text>
  <rect x="160" y="46" width="130" height="44" class="box"/><text x="225" y="68" class="t-sm t-c t-b">BEST_EFFORT</text>
  <rect x="290" y="46" width="130" height="44" class="box"/><text x="355" y="68" class="t-sm t-c t-b">RELIABLE</text>
  <rect x="40" y="90" width="120" height="50" class="box"/><text x="100" y="115" class="t-sm t-c t-b">BEST_EFFORT</text>
  <rect x="160" y="90" width="130" height="50" class="green"/><text x="225" y="115" class="t-lg t-c">✓</text>
  <rect x="290" y="90" width="130" height="50" class="red"/><text x="355" y="108" class="t-lg t-c">✗</text><text x="355" y="130" class="t-xs t-c t-red">연결 안 됨</text>
  <rect x="40" y="140" width="120" height="50" class="box"/><text x="100" y="165" class="t-sm t-c t-b">RELIABLE</text>
  <rect x="160" y="140" width="130" height="50" class="green"/><text x="225" y="165" class="t-lg t-c">✓</text>
  <rect x="290" y="140" width="130" height="50" class="green"/><text x="355" y="165" class="t-lg t-c">✓</text>

  <text x="660" y="30" class="t-b t-c">내구성 (durability)</text>
  <rect x="460" y="46" width="130" height="44" class="gray"/>
  <text x="525" y="62" class="t-xs t-c">발행(제공) ↓</text>
  <text x="525" y="80" class="t-xs t-c">구독(요청) →</text>
  <rect x="590" y="46" width="130" height="44" class="box"/><text x="655" y="68" class="t-sm t-c t-b">VOLATILE</text>
  <rect x="720" y="46" width="140" height="44" class="box"/><text x="790" y="68" class="t-sm t-c t-b">TRANSIENT_LOCAL</text>
  <rect x="460" y="90" width="130" height="50" class="box"/><text x="525" y="115" class="t-sm t-c t-b">VOLATILE</text>
  <rect x="590" y="90" width="130" height="50" class="green"/><text x="655" y="115" class="t-lg t-c">✓</text>
  <rect x="720" y="90" width="140" height="50" class="red"/><text x="790" y="108" class="t-lg t-c">✗</text><text x="790" y="130" class="t-xs t-c t-red">연결 안 됨</text>
  <rect x="460" y="140" width="130" height="50" class="box"/><text x="525" y="165" class="t-sm t-c t-b">TRANSIENT_LOCAL</text>
  <rect x="590" y="140" width="130" height="50" class="green"/><text x="655" y="158" class="t-lg t-c">✓</text><text x="655" y="180" class="t-xs t-c t-mu">새 메시지만</text>
  <rect x="720" y="140" width="140" height="50" class="green"/><text x="790" y="158" class="t-lg t-c">✓</text><text x="790" y="180" class="t-xs t-c t-mu">지난 것도 받음</text>

  <rect x="40" y="214" width="820" height="100" rx="12" class="yellow"/>
  <text x="60" y="240" class="t-sm t-b">기억법: "발행자가 약속한 것보다 더 많이 요구하면 안 된다"</text>
  <text x="60" y="266" class="t-xs">• deadline: 발행 주기 약속(offered) ≤ 구독 요구(requested) 이어야 함 · liveliness: 발행 AUTOMATIC ↔ 구독 MANUAL_BY_TOPIC 은 ✗</text>
  <text x="60" y="288" class="t-xs">• history · depth · lifespan 은 호환성에 영향 없음 (각자 설정)</text>
  <text x="60" y="306" class="t-xs t-mu">호환이 안 되면 에러 없이 조용히 안 받아짐 → rclpy 는 "offering incompatible QoS" 경고를 한 번 출력</text>
</svg>`
    },

    /* ------------------------------------------------------------ 늦게 온 구독자 */
    latejoin: {
      caption: 'TRANSIENT_LOCAL — 발행자가 최근 메시지(depth 개)를 보관했다가, 늦게 들어온 구독자에게도 건네줍니다 (/map, /tf_static, /robot_description)',
      svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="지도 서버가 지도를 한 번 발행한 뒤 늦게 켜진 RViz가 VOLATILE이면 못 받고 TRANSIENT_LOCAL이면 보관된 지도를 받는 시간축">
  <line x1="60" y1="60" x2="840" y2="60" class="ln thin ar"/>
  <text x="846" y="50" class="t-xs t-mu t-e">시간</text>
  <ellipse cx="150" cy="60" rx="80" ry="24" class="blue"/>
  <text x="150" y="60" class="t-xs t-c t-b t-blue">/map_server</text>
  <rect x="250" y="44" width="100" height="32" rx="6" class="green"/>
  <text x="300" y="60" class="t-xs t-c t-b">🗺️ /map 발행</text>
  <text x="300" y="96" class="t-xs t-c t-mu">딱 한 번</text>
  <rect x="380" y="36" width="160" height="48" rx="8" class="box"/>
  <text x="460" y="56" class="t-xs t-c">발행자 보관함</text>
  <text x="460" y="74" class="t-xs t-c">(depth=1: 지도 1장)</text>

  <ellipse cx="660" cy="150" rx="90" ry="24" class="blue"/>
  <text x="660" y="150" class="t-xs t-c t-b t-blue">RViz (나중에 켜짐)</text>
  <line x1="660" y1="84" x2="660" y2="124" class="ln dash"/>

  <rect x="60" y="190" width="370" height="76" rx="12" class="red"/>
  <text x="245" y="218" class="t-sm t-c t-b t-red">구독 VOLATILE</text>
  <text x="245" y="244" class="t-xs t-c">이미 지나간 지도는 못 받음 → 화면이 텅 빔</text>

  <rect x="450" y="190" width="410" height="76" rx="12" class="green"/>
  <text x="655" y="218" class="t-sm t-c t-b t-green">구독 TRANSIENT_LOCAL</text>
  <text x="655" y="244" class="t-xs t-c">연결되자마자 보관함의 지도를 받음 ✓</text>
  <path d="M500,84 C560,110 600,120 610,128" class="ln-green thick ar-green"/>
</svg>`
    },

    /* ------------------------------------------------------------ 실행기 · 콜백 그룹 */
    executors: {
      caption: '실행기 × 콜백 그룹 — 스레드가 여러 개여도 같은 MutuallyExclusive 그룹의 콜백은 차례로, Reentrant 그룹은 동시에 실행될 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="단일 스레드 실행기와 멀티스레드 실행기에서 타이머, 구독, 서비스 콜백이 시간축에 배치되는 모습과 콜백 그룹의 효과">
  <text x="30" y="34" class="t-b">① SingleThreadedExecutor — 일꾼 1명</text>
  <text x="30" y="70" class="t-xs t-mu">스레드 1</text>
  <rect x="110" y="54" width="160" height="30" rx="4" class="orange"/><text x="190" y="69" class="t-xs t-c">타이머 (느림 0.8 s)</text>
  <rect x="274" y="54" width="70" height="30" rx="4" class="blue"/><text x="309" y="69" class="t-xs t-c">구독</text>
  <rect x="348" y="54" width="70" height="30" rx="4" class="blue"/><text x="383" y="69" class="t-xs t-c">구독</text>
  <rect x="422" y="54" width="80" height="30" rx="4" class="purple"/><text x="462" y="69" class="t-xs t-c">서비스</text>
  <text x="620" y="69" class="t-xs">→ 느린 콜백 하나가 모두를 기다리게 함</text>

  <text x="30" y="126" class="t-b">② MultiThreadedExecutor + 콜백 그룹</text>
  <text x="30" y="162" class="t-xs t-mu">스레드 1</text>
  <text x="30" y="202" class="t-xs t-mu">스레드 2</text>
  <rect x="110" y="146" width="160" height="30" rx="4" class="orange"/><text x="190" y="161" class="t-xs t-c">타이머 [그룹 A]</text>
  <rect x="274" y="146" width="160" height="30" rx="4" class="orange"/><text x="354" y="161" class="t-xs t-c">타이머 [그룹 A]</text>
  <rect x="110" y="186" width="70" height="30" rx="4" class="blue"/><text x="145" y="201" class="t-xs t-c">구독 [R]</text>
  <rect x="184" y="186" width="70" height="30" rx="4" class="blue"/><text x="219" y="201" class="t-xs t-c">구독 [R]</text>
  <rect x="258" y="186" width="80" height="30" rx="4" class="purple"/><text x="298" y="201" class="t-xs t-c">서비스 [B]</text>
  <text x="620" y="161" class="t-xs">→ 그룹이 다르면 동시에 실행</text>
  <text x="620" y="201" class="t-xs">→ 느린 타이머와 상관없이 구독 처리</text>

  <rect x="30" y="236" width="400" height="110" rx="12" class="teal"/>
  <text x="230" y="262" class="t-sm t-c t-b t-teal">MutuallyExclusiveCallbackGroup (기본)</text>
  <text x="230" y="288" class="t-xs t-c">같은 그룹 안의 콜백은 한 번에 하나만</text>
  <text x="230" y="310" class="t-xs t-c">→ 공유 변수 보호, 순서 보장</text>
  <text x="230" y="332" class="t-xs t-c t-mu">노드마다 기본 그룹 1개 (모든 콜백이 여기)</text>
  <rect x="450" y="236" width="400" height="110" rx="12" class="purple"/>
  <text x="650" y="262" class="t-sm t-c t-b t-purple">ReentrantCallbackGroup</text>
  <text x="650" y="288" class="t-xs t-c">같은 콜백도 여러 개가 동시에 실행 가능</text>
  <text x="650" y="310" class="t-xs t-c">→ 처리량↑, 대신 스레드 안전은 내가 책임</text>
  <text x="650" y="332" class="t-xs t-c t-mu">(락 · 원자적 연산 필요할 수 있음)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 라이프사이클 */
    lifecycle: {
      caption: '라이프사이클(관리형) 노드의 상태 기계 — 네 가지 기본 상태와, 밖에서 요청하는 전이(configure · activate …)',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="Unconfigured, Inactive, Active, Finalized 상태와 configure, activate, deactivate, cleanup, shutdown 전이">
  <rect x="30" y="110" width="170" height="70" rx="35" class="gray"/>
  <text x="115" y="140" class="t-b t-c">Unconfigured</text>
  <text x="115" y="162" class="t-xs t-c t-mu">[1] 막 생성됨</text>
  <rect x="330" y="110" width="170" height="70" rx="35" class="yellow"/>
  <text x="415" y="140" class="t-b t-c">Inactive</text>
  <text x="415" y="162" class="t-xs t-c t-mu">[2] 준비됨 · 대기</text>
  <rect x="630" y="110" width="170" height="70" rx="35" class="green"/>
  <text x="715" y="140" class="t-b t-c t-green">Active</text>
  <text x="715" y="162" class="t-xs t-c t-mu">[3] 동작 중 · 발행</text>
  <rect x="330" y="250" width="170" height="60" rx="30" class="red"/>
  <text x="415" y="276" class="t-b t-c t-red">Finalized</text>
  <text x="415" y="296" class="t-xs t-c t-mu">[4] 종료 직전</text>

  <path d="M200,125 C250,95 280,95 330,125" class="ln-blue thick ar-blue"/>
  <text x="265" y="88" class="t-sm t-c t-blue t-b">configure</text>
  <text x="265" y="104" class="t-xs t-c t-mu">on_configure()</text>
  <path d="M330,168 C280,198 250,198 200,168" class="ln-orange ar-orange"/>
  <text x="265" y="212" class="t-sm t-c t-orange">cleanup</text>

  <path d="M500,125 C550,95 580,95 630,125" class="ln-green thick ar-green"/>
  <text x="565" y="88" class="t-sm t-c t-green t-b">activate</text>
  <text x="565" y="104" class="t-xs t-c t-mu">on_activate()</text>
  <path d="M630,168 C580,198 550,198 500,168" class="ln-orange ar-orange"/>
  <text x="565" y="212" class="t-sm t-c t-orange">deactivate</text>

  <line x1="140" y1="182" x2="340" y2="262" class="ln-red dash ar-red"/>
  <line x1="415" y1="182" x2="415" y2="248" class="ln-red dash ar-red"/>
  <line x1="690" y1="182" x2="490" y2="262" class="ln-red dash ar-red"/>
  <text x="600" y="258" class="t-xs t-red">shutdown (어느 상태에서나)</text>
  <text x="440" y="30" class="t-sm t-c">밖(사람 · lifecycle_manager)이 <tspan class="t-b">ros2 lifecycle set</tspan> 으로 전이를 요청</text>
  <text x="440" y="52" class="t-xs t-c t-mu">전이 중에는 Configuring · Activating 같은 "중간 상태"를 거치고, 콜백 결과(SUCCESS/FAILURE/ERROR)에 따라 다음 상태가 정해짐</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: 'DDS — ROS 2 통신의 엔진',
      html: `
<p>ROS 2 의 토픽 · 서비스 · 액션은 모두 <b>DDS(Data Distribution Service)</b>라는 산업용 통신 표준 위에서 돌아갑니다. DDS 는 비행기 · 군함 · 공장 자동화에서 쓰이던 기술로, "누가 보냈는지"보다 <b>"어떤 데이터인지(토픽 · 타입)"</b>를 중심으로 데이터를 나눠 주는 <b>데이터 중심(data-centric) 발행/구독</b> 방식입니다.</p>
<div class="cards c3">
  <div class="card teal"><div class="ci">👥</div><b>참가자 (participant)</b><p>DDS 에 접속한 하나의 주체. ROS 2 에서는 보통 <b>프로세스(컨텍스트)마다 하나</b>이고, 그 안에 여러 노드가 들어갑니다.</p></div>
  <div class="card green"><div class="ci">📨</div><b>토픽 · 타입</b><p>데이터의 이름과 형식. 이름과 타입이 같은 발행자 · 구독자끼리 자동으로 연결됩니다.</p></div>
  <div class="card orange"><div class="ci">📜</div><b>QoS</b><p>데이터를 "어떻게" 전달할지의 약속. 신뢰성 · 보관 · 마감 시간 등 (4절).</p></div>
</div>
<p>ROS 1 에는 모든 노드가 먼저 접속하는 <b>roscore(마스터)</b>가 있었지만, ROS 2 에는 중앙 서버가 없습니다. 대신 DDS 가 스스로 서로를 찾는 <b>탐색(discovery)</b>을 합니다.</p>
{{fig:discovery}}
<ol class="steps-list">
  <li><b>SPDP</b>(Simple Participant Discovery Protocol) — 각 참가자가 <b>멀티캐스트</b>로 "나 여기 있어요(도메인 0)"를 주기적으로 알립니다.</li>
  <li><b>SEDP</b>(Simple Endpoint Discovery Protocol) — 서로를 알게 된 참가자끼리 가진 퍼블리셔 · 서브스크라이버의 토픽 · 타입 · QoS 정보를 교환합니다.</li>
  <li><b>매칭</b> — 토픽 · 타입이 같고 QoS 가 호환되면 연결되어 데이터가 직접 흐릅니다.</li>
</ol>
<div class="box tip"><div class="box-t">💡 "노드가 안 보여요" 첫 점검 — 멀티캐스트</div>
탐색은 멀티캐스트를 쓰므로, 공유기 · 방화벽 · VPN · 일부 Wi-Fi 에서 막히면 같은 도메인이어도 서로 안 보입니다. 두 컴퓨터에서 <code>ros2 multicast receive</code> / <code>ros2 multicast send</code> 로 확인하세요.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 multicast receive</code></pre>`
    },

    /* ================================================================ 2 */
    {
      title: '도메인 ID 와 탐색 범위',
      html: `
<p>같은 네트워크의 모든 ROS 2 노드가 서로 보이면 편리하지만, 실습실처럼 여러 조가 한 Wi-Fi 를 쓰면 <b>남의 teleop 이 내 로봇을 움직이는</b> 사고가 납니다. 이를 나누는 첫 번째 도구가 <b>ROS_DOMAIN_ID</b> 입니다. 도메인이 다르면 탐색 자체가 서로 다른 UDP 포트에서 일어나 <b>서로 완전히 보이지 않습니다</b>.</p>
<div class="box analogy"><div class="box-t">📻 비유 — 무전기 채널</div>
같은 채널(도메인)끼리만 대화가 들립니다. 기본 채널은 0번이라 아무도 설정하지 않으면 모두 한 채널에서 떠들게 됩니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>printenv | grep ROS
export ROS_DOMAIN_ID=7
echo $ROS_DOMAIN_ID</code></pre>
<table class="tbl">
<thead><tr><th>환경 변수</th><th>값</th><th>뜻</th></tr></thead>
<tbody>
<tr><td><code>ROS_DOMAIN_ID</code></td><td>0(기본) ~ 101 권장</td><td>같은 번호끼리만 통신. 번호로 DDS 포트가 정해져서 너무 큰 값은 다른 포트와 겹칠 수 있음</td></tr>
<tr><td rowspan="4"><code>ROS_AUTOMATIC_DISCOVERY_RANGE</code></td><td><code>SUBNET</code> (기본)</td><td>멀티캐스트로 같은 서브넷(공유기)의 노드를 찾음</td></tr>
<tr><td><code>LOCALHOST</code></td><td>같은 컴퓨터 안의 노드만 찾음 (혼자 시뮬레이션할 때)</td></tr>
<tr><td><code>OFF</code></td><td>자동 탐색 끔 (같은 컴퓨터에서도)</td></tr>
<tr><td><code>SYSTEM_DEFAULT</code></td><td>RMW 의 원래 설정을 건드리지 않음</td></tr>
<tr><td><code>ROS_STATIC_PEERS</code></td><td><code>192.168.0.10;192.168.0.11</code></td><td>멀티캐스트가 안 되는 망에서 직접 찾아갈 주소 목록(<code>;</code> 구분)</td></tr>
</tbody></table>
<div class="box note"><div class="box-t">📝 ROS_LOCALHOST_ONLY 는 옛 방식</div>
Humble 까지는 <code>ROS_LOCALHOST_ONLY=1</code> 을 썼지만, Iron 부터 <code>ROS_AUTOMATIC_DISCOVERY_RANGE</code> · <code>ROS_STATIC_PEERS</code> 가 도입되었고 Jazzy 에서 <code>ROS_LOCALHOST_ONLY</code> 는 사용 중단 예정(deprecated)입니다. 옛 자료를 볼 때 참고하세요. 설정은 <code>~/.bashrc</code> 에 <code>export</code> 로 적어 두면 터미널마다 자동 적용됩니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 실습실 사고 막기</div>
<ol>
  <li>아래 위젯에서 프리셋 <b>모두 기본값</b>을 고르고, 친구 노트북의 teleop 이 내 로봇과 연결되는 것을 봅니다.</li>
  <li><b>도메인 나누기</b>를 눌러 나 · 로봇은 7번, 친구는 3번으로 바꾸고 연결선이 어떻게 바뀌는지 확인합니다.</li>
  <li><b>LOCALHOST</b> 프리셋에서 내 노트북 안의 노드끼리만 보이는지 확인합니다.</li>
  <li><b>Zenoh</b> 프리셋에서 라우터를 꺼 보세요. (다음 절)</li>
</ol></div>
{{widget:domain|preset=split}}
<div class="box warn"><div class="box-t">⚠ 이 브라우저 실습 환경은 도메인 하나만 흉내 냅니다</div>
터미널에서 <code>export ROS_DOMAIN_ID=7</code> 을 해도 이 사이트의 노드들은 계속 서로 보입니다. 도메인 실험은 위의 <b>domain 위젯</b>으로 하고, 실제 컴퓨터 두 대에서 꼭 한 번 확인해 보세요.</div>`
    },

    /* ================================================================ 3 */
    {
      title: 'RMW 구현 — Fast DDS · Cyclone DDS · Zenoh',
      html: `
<p>ROS 2 는 특정 DDS 제품에 묶이지 않도록 <b>rmw(ROS MiddleWare) 인터페이스</b>라는 한 층을 두었습니다. 그래서 노드 코드를 한 줄도 바꾸지 않고 환경 변수 <code>RMW_IMPLEMENTATION</code> 으로 통신 엔진을 바꿀 수 있습니다.</p>
{{fig:rmw}}
<table class="tbl cmp">
<thead><tr><th>RMW</th><th>기반</th><th>특징</th></tr></thead>
<tbody>
<tr><td><code>rmw_fastrtps_cpp</code></td><td>eProsima Fast DDS</td><td><b>Jazzy 기본값</b>. 기능이 풍부하고 공유 메모리 전송, 탐색 서버(Discovery Server) 지원</td></tr>
<tr><td><code>rmw_cyclonedds_cpp</code></td><td>Eclipse Cyclone DDS</td><td>가볍고 설정이 단순. Unitree Go2 등 여러 로봇 SDK 가 사용 (<a href="#ch18">18장</a>)</td></tr>
<tr><td><code>rmw_zenoh_cpp</code></td><td>Eclipse Zenoh</td><td><b>DDS 가 아님</b>. 멀티캐스트 대신 <b>라우터(rmw_zenohd)</b>로 서로를 찾아 Wi-Fi · 인터넷 너머 통신에 강함. <b>Kilted Kaiju 에서 Tier 1</b>, Jazzy 에서도 패키지로 설치해 사용 가능</td></tr>
</tbody></table>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-rmw-cyclonedds-cpp
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp      <span class="cm"># 이 터미널에서 켜는 노드부터 적용</span>
ros2 run demo_nodes_cpp talker

sudo apt install ros-jazzy-rmw-zenoh-cpp
ros2 run rmw_zenoh_cpp rmw_zenohd                 <span class="cm"># Zenoh 라우터 먼저 (다른 터미널)</span>
export RMW_IMPLEMENTATION=rmw_zenoh_cpp
ros2 run demo_nodes_cpp listener</code></pre>
<div class="box warn"><div class="box-t">⚠ 한 시스템 안에서는 RMW 를 통일하세요</div>
Fast DDS 와 Cyclone DDS 는 둘 다 DDS 표준(RTPS)이라 원칙상 서로 통신되지만 세부 설정 차이로 문제가 생기기 쉽고, <b>Zenoh 와 DDS 는 서로 통신하지 못합니다</b>. 로봇 · 노트북 모두 같은 RMW 를 쓰는 것이 원칙입니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>echo $RMW_IMPLEMENTATION
ros2 doctor --report</code></pre>
<div class="box trend"><div class="box-t">🚀 최신 동향 — Zenoh 의 부상</div>
DDS 의 멀티캐스트 탐색은 Wi-Fi 나 노드가 아주 많은 환경에서 트래픽 폭주 · 탐색 실패를 일으키곤 했습니다. 그래서 라우터 기반의 <b>rmw_zenoh</b> 가 개발되었고, 2025년 5월 Kilted Kaiju 에서 처음으로 DDS 가 아닌 Tier 1 미들웨어가 되었습니다. 여러 대의 로봇 · 클라우드 연결을 계획한다면 눈여겨보세요.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'QoS 정책 — 데이터를 "어떻게" 보낼까',
      html: `
<p><b>QoS(Quality of Service, 서비스 품질)</b>는 "이 토픽의 데이터를 어떤 방식으로 전달할지"에 대한 설정 묶음입니다. 카메라 영상은 몇 장 빠져도 최신 것이 중요하고, 지도는 한 번 보낸 것을 늦게 온 사람도 받아야 합니다. 이런 차이를 QoS 로 표현합니다.</p>
{{fig:reliability}}
<table class="tbl">
<thead><tr><th>정책</th><th>선택지</th><th>뜻 · 쓰임</th></tr></thead>
<tbody>
<tr><td><b>Reliability</b> 신뢰성</td><td><code>RELIABLE</code> / <code>BEST_EFFORT</code></td><td>잃어버린 메시지를 재전송할지. 명령 · 상태는 RELIABLE, 고속 센서는 BEST_EFFORT</td></tr>
<tr><td><b>Durability</b> 내구성</td><td><code>VOLATILE</code> / <code>TRANSIENT_LOCAL</code></td><td>늦게 온 구독자에게 지난 메시지를 줄지. 지도 · 정적 TF 는 TRANSIENT_LOCAL</td></tr>
<tr><td><b>History</b> 히스토리 + <b>Depth</b> 깊이</td><td><code>KEEP_LAST</code>(n) / <code>KEEP_ALL</code></td><td>보관 · 대기열에 몇 개를 둘지. <code>create_publisher(…, 10)</code> 의 10 이 이것</td></tr>
<tr><td><b>Deadline</b> 마감</td><td>기간 (예: 100 ms)</td><td>이 간격 안에 새 메시지가 와야 함 → 어기면 이벤트(센서 끊김 감지)</td></tr>
<tr><td><b>Lifespan</b> 수명</td><td>기간</td><td>이보다 오래된 메시지는 전달하지 않고 버림 (낡은 명령 방지)</td></tr>
<tr><td><b>Liveliness</b> 생존 신호</td><td><code>AUTOMATIC</code> / <code>MANUAL_BY_TOPIC</code> + lease 기간</td><td>발행자가 살아 있는지 확인하는 방법과 기준 시간</td></tr>
</tbody></table>
<pre class="code" data-lang="python"><code>from rclpy.duration import Duration
from rclpy.qos import (QoSProfile, ReliabilityPolicy, DurabilityPolicy,
                       HistoryPolicy, LivelinessPolicy)

qos = QoSProfile(
    history=HistoryPolicy.KEEP_LAST, depth=10,
    reliability=ReliabilityPolicy.RELIABLE,
    durability=DurabilityPolicy.VOLATILE,
    deadline=Duration(seconds=0.1),              <span class="cm"># 10 Hz 보다 느려지면 알림</span>
    lifespan=Duration(seconds=0.5),              <span class="cm"># 0.5초 넘은 명령은 버림</span>
    liveliness=LivelinessPolicy.AUTOMATIC)
self.pub = self.create_publisher(Twist, 'cmd_vel', qos)</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — QoS 실험실</div>
<ol>
  <li>손실률을 30% 로 올리고 RELIABLE 과 BEST_EFFORT 를 번갈아 선택해 도착한 메시지 수와 지연을 비교하세요.</li>
  <li>프리셋 <b>🐢 느린 구독자</b>를 고르고, 깊이(depth)를 3 → 20 으로 바꾸면 버려지는 메시지가 어떻게 되는지 봅니다.</li>
  <li>프리셋 <b>⚠ 호환 안 됨</b>에서 왜 하나도 도착하지 않는지 설명해 보세요. (다음 절)</li>
</ol></div>
{{widget:qos}}`
    },

    /* ================================================================ 5 */
    {
      title: 'QoS 프리셋 · 호환성 · 진단',
      html: `
<p>매번 정책을 하나하나 정하기는 번거로우므로 ROS 2 는 용도별 <b>프리셋</b>을 제공합니다.</p>
<table class="tbl">
<thead><tr><th>프리셋 (rclpy)</th><th>History / Depth</th><th>Reliability</th><th>Durability</th><th>쓰임</th></tr></thead>
<tbody>
<tr><td>기본값 (<code>10</code> 또는 <code>QoSProfile(depth=10)</code>)</td><td>KEEP_LAST 10</td><td>RELIABLE</td><td>VOLATILE</td><td>대부분의 토픽</td></tr>
<tr><td><code>qos_profile_sensor_data</code></td><td>KEEP_LAST 5</td><td><b>BEST_EFFORT</b></td><td>VOLATILE</td><td>LiDAR · 카메라 · IMU</td></tr>
<tr><td><code>qos_profile_services_default</code></td><td>KEEP_LAST 10</td><td>RELIABLE</td><td>VOLATILE</td><td>서비스</td></tr>
<tr><td><code>qos_profile_parameters</code></td><td>KEEP_LAST 1000</td><td>RELIABLE</td><td>VOLATILE</td><td>파라미터 서비스</td></tr>
<tr><td><code>qos_profile_system_default</code></td><td colspan="3">모두 SYSTEM_DEFAULT — RMW(DDS) 설정 파일이 정함</td><td>DDS 를 직접 튜닝할 때</td></tr>
</tbody></table>
<p>발행자와 구독자는 QoS 를 <b>각자</b> 정합니다. 발행자는 "이만큼 해 줄게"(offered), 구독자는 "이만큼 해 줘"(requested)라고 말하고, <b>제공 ≥ 요청</b>일 때만 연결됩니다.</p>
{{fig:compat}}
<p>직접 불일치를 만들어 진단해 봅시다. 아래 파이썬 노드는 <code>/temperature</code> 를 <b>BEST_EFFORT</b> 로 발행합니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — "왜 echo 가 조용하지?"</div>
<ol>
  <li>실습기를 <b>▶ 실행</b>합니다 (0.2초마다 온도 발행).</li>
  <li>옆 터미널에 <code>ros2 topic echo /temperature --qos-reliability reliable</code> — RELIABLE 을 요청하면 <b>아무것도 안 나옵니다</b>(경고: <i>offering incompatible QoS … Last incompatible policy: RELIABILITY</i>).</li>
  <li><kbd>Ctrl</kbd>+<kbd>C</kbd> 후 <code>ros2 topic info /temperature -v</code> 로 발행자의 <code>Reliability: BEST_EFFORT</code> 를 확인합니다.</li>
  <li><code>ros2 topic echo /temperature --qos-reliability best_effort</code> — 이제 값이 보입니다!</li>
</ol></div>
{{widget:pylab|ex=qos|with=term}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic info /temperature -v</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /temperature --qos-reliability best_effort</code></pre>
<div class="box note"><div class="box-t">📝 실제 ros2 topic echo 는 똑똑합니다</div>
실제 Jazzy 의 <code>ros2 topic echo</code> 는 QoS 옵션을 주지 않으면 발행자들의 QoS 를 보고 <b>호환되는 설정을 자동으로</b> 고릅니다(발행자가 모두 RELIABLE 이 아니면 BEST_EFFORT). 그래서 위 실습처럼 <code>--qos-reliability reliable</code> 을 <b>일부러</b> 줘야 불일치가 재현됩니다. 하지만 <b>내가 만든 노드</b>는 자동으로 맞춰 주지 않으므로, 센서 토픽을 구독할 때는 <code>qos_profile_sensor_data</code> 를 쓰는 습관을 들이세요.</div>
<pre class="code" data-lang="python" data-run="py" data-with="term"><code>import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from std_msgs.msg import Float32


class TempWatcher(Node):
    def __init__(self):
        super().__init__('temp_watcher')
        # BEST_EFFORT 발행자와 호환되도록 sensor_data 프리셋으로 구독
        self.create_subscription(Float32, 'temperature', self.on_temp, qos_profile_sensor_data)

    def on_temp(self, msg):
        self.get_logger().info(f'온도 {msg.data:.1f} ℃', throttle_duration_sec=1.0)


def main():
    rclpy.init()
    rclpy.spin(TempWatcher())


if __name__ == '__main__':
    main()</code></pre>
<p>위 코드는 온도 발행 실습기가 켜져 있는 상태에서 실행하세요. 구독 QoS 를 <code>10</code>(= RELIABLE)으로 바꾸면 경고가 뜨고 아무것도 받지 못합니다.</p>`
    },

    /* ================================================================ 6 */
    {
      title: 'TRANSIENT_LOCAL — 늦게 온 구독자',
      html: `
<p>지도(<code>/map</code>), 정적 좌표 변환(<code>/tf_static</code>), 로봇 모델(<code>/robot_description</code>)은 <b>거의 바뀌지 않아서 한 번만</b> 발행합니다. 그런데 RViz 를 나중에 켜면? VOLATILE 이면 이미 지나간 메시지라 못 받습니다. 그래서 이런 토픽은 발행자 · 구독자 모두 <b>TRANSIENT_LOCAL</b> 로 설정해, 발행자가 최근 메시지를 보관했다가 늦게 온 구독자에게 건네줍니다. (ROS 1 의 latched topic 과 같은 역할)</p>
{{fig:latejoin}}
<p>한 번만 발행하는 노드를 만들어 확인해 봅시다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="term"><code>import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, DurabilityPolicy, ReliabilityPolicy
from std_msgs.msg import String


class OneShot(Node):
    def __init__(self):
        super().__init__('latched_pub')
        qos = QoSProfile(depth=1,
                         reliability=ReliabilityPolicy.RELIABLE,
                         durability=DurabilityPolicy.TRANSIENT_LOCAL)
        self.pub = self.create_publisher(String, 'robot_info', qos)
        self.pub.publish(String(data='webbot v1 · 바퀴 지름 0.066 m'))
        self.get_logger().info('딱 한 번 발행했습니다. 이제 가만히 있어요.')


def main():
    rclpy.init()
    rclpy.spin(OneShot())


if __name__ == '__main__':
    main()</code></pre>
<p>실행하고 몇 초 뒤에(= 늦게 온 구독자) 터미널에서 두 가지로 구독해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /robot_info --qos-durability volatile --qos-reliability reliable</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /robot_info --qos-durability transient_local --qos-reliability reliable</code></pre>
<p>첫 번째는 아무것도 안 나오고, 두 번째는 보관된 메시지를 곧바로 받습니다. 아래 QoS 실험실의 <b>지도(/map)</b> 프리셋으로 "늦게 온 구독자"를 애니메이션으로도 확인해 보세요.</p>
{{widget:qos|preset=map}}
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — RViz 에 지도가 안 보일 때</div>
RViz 의 Map 디스플레이에는 <b>Durability Policy</b> 설정이 있습니다. map_server 가 TRANSIENT_LOCAL 로 발행하는데 RViz 가 VOLATILE 로 구독하면 지도가 안 보입니다. 반대로 구독만 TRANSIENT_LOCAL 이고 발행이 VOLATILE 이면 호환 자체가 안 됩니다(연결 ✗). 둘을 맞추세요.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '실행기와 콜백 그룹',
      html: `
<p>8장에서 "spin = 실행기가 콜백을 하나씩 처리한다"고 배웠습니다. 기본 <b>SingleThreadedExecutor</b> 는 일꾼(스레드)이 한 명이라, 느린 콜백 하나가 다른 모든 콜백을 기다리게 하고, 9장에서 본 <b>콜백 안 동기 호출은 교착 상태</b>가 됩니다. 이것을 해결하는 도구가 <b>MultiThreadedExecutor</b> 와 <b>콜백 그룹</b>입니다.</p>
{{fig:executors}}
<table class="tbl cmp">
<thead><tr><th></th><th>MutuallyExclusiveCallbackGroup</th><th>ReentrantCallbackGroup</th></tr></thead>
<tbody>
<tr><td>같은 그룹 안의 콜백</td><td>한 번에 <b>하나만</b></td><td><b>동시에</b> 여러 개 가능 (같은 콜백도)</td></tr>
<tr><td>장점</td><td>공유 변수 보호, 단순</td><td>처리량 ↑</td></tr>
<tr><td>주의</td><td>그룹 안에서 서로 기다리면 교착</td><td>스레드 안전(락)을 직접 챙겨야</td></tr>
<tr><td>기본값</td><td>노드마다 기본 그룹 하나 — 따로 지정 안 한 콜백은 모두 여기</td><td>—</td></tr>
</tbody></table>
<div class="box warn"><div class="box-t">⚠ 스레드만 늘려서는 교착이 안 풀립니다</div>
MultiThreadedExecutor 를 써도 타이머와 서비스 클라이언트가 <b>같은 기본(MutuallyExclusive) 그룹</b>에 있으면, 타이머 콜백이 끝나기 전까지 응답 처리 콜백을 실행할 수 없어 여전히 멈춥니다. <b>클라이언트를 다른 그룹에</b> 넣어야 합니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 교착 재현과 해결</div>
<ol>
  <li>위젯의 <b>④ 교착 상태 재현</b>을 실행해 타이머 콜백이 응답을 기다리며 멈추는 타임라인을 봅니다.</li>
  <li><b>② 멀티스레드 + 기본 그룹</b>: 스레드는 2개인데 왜 여전히 순서대로만 실행될까요?</li>
  <li><b>⑤ 교착 해결</b>: 클라이언트 · 서비스를 그룹 B 로 옮기면 무엇이 달라지나요?</li>
</ol></div>
{{widget:exec|preset=deadlock}}
<p>해결된 코드를 실행해 봅시다. 타이머 콜백 <b>안에서</b> <code>cli.call()</code> 로 동기 호출하지만, 클라이언트를 별도 그룹에 두고 멀티스레드 실행기로 돌리므로 실제 ROS 2 에서도 멈추지 않습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="term"><code>import rclpy
from rclpy.node import Node
from rclpy.executors import MultiThreadedExecutor
from rclpy.callback_groups import MutuallyExclusiveCallbackGroup
from example_interfaces.srv import AddTwoInts


class Adder(Node):
    def __init__(self):
        super().__init__('adder_server')
        self.create_service(AddTwoInts, 'add_two_ints', self.on_add)

    def on_add(self, req, res):
        res.sum = req.a + req.b
        return res


class Caller(Node):
    def __init__(self):
        super().__init__('sync_caller')
        self.timer_group = MutuallyExclusiveCallbackGroup()
        self.client_group = MutuallyExclusiveCallbackGroup()     # ← 핵심: 다른 그룹
        self.cli = self.create_client(AddTwoInts, 'add_two_ints',
                                      callback_group=self.client_group)
        self.create_timer(1.0, self.on_timer, callback_group=self.timer_group)
        self.n = 0

    def on_timer(self):
        self.n += 1
        if not self.cli.service_is_ready():
            self.get_logger().warning('서버를 기다리는 중...')
            return
        res = self.cli.call(AddTwoInts.Request(a=self.n, b=100))  # 콜백 안 동기 호출
        self.get_logger().info(f'{self.n} + 100 = {res.sum}')


def main():
    rclpy.init()
    executor = MultiThreadedExecutor()
    executor.add_node(Adder())
    executor.add_node(Caller())
    try:
        executor.spin()
    except KeyboardInterrupt:
        pass
    finally:
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box note"><div class="box-t">📝 브라우저 실습기의 실행기</div>
이 사이트의 파이썬(Pyodide)은 스레드가 하나라서 MultiThreadedExecutor 도 한 줄로 처리하며, 대기 중에도 응답을 처리하도록 만들어져 있어 <b>교착이 재현되지 않습니다</b>. 교착은 위의 exec 위젯으로 관찰하고, 코드는 실제 ROS 2 와 똑같이 쓰는 연습을 하세요. 참고로 CPython 에는 GIL 이 있어 파이썬 계산 자체가 병렬로 빨라지지는 않지만, <b>기다리는 일(서비스 · I/O)</b>을 겹치게 하는 데는 멀티스레드 실행기가 효과적입니다.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '라이프사이클(관리형) 노드',
      html: `
<p>일반 노드는 만들어지는 순간 바로 동작합니다. 하지만 센서 드라이버라면 "장치 연결(설정)이 끝난 뒤에만 데이터를 내보내고", 내비게이션이라면 "지도가 준비된 뒤에 경로 계획을 시작"해야 합니다. <b>라이프사이클(lifecycle) 노드</b>, 다른 말로 <b>관리형(managed) 노드</b>는 이런 <b>시작 순서</b>를 바깥에서 조종할 수 있게 상태 기계를 가진 노드입니다.</p>
{{fig:lifecycle}}
<table class="tbl">
<thead><tr><th>상태</th><th>이때 하는 일 (예: LiDAR 드라이버)</th></tr></thead>
<tbody>
<tr><td>Unconfigured</td><td>노드만 생성. 아무것도 안 함</td></tr>
<tr><td>Inactive</td><td><code>on_configure</code> 에서 파라미터 읽기 · 장치 연결 · 퍼블리셔 생성. 아직 발행 안 함</td></tr>
<tr><td>Active</td><td><code>on_activate</code> 후 실제로 스캔 발행</td></tr>
<tr><td>Finalized</td><td><code>on_shutdown</code> 후 종료 대기</td></tr>
</tbody></table>
<div class="box practice"><div class="box-t">🧪 해 보기 — 상태 기계 조종</div>
<ol>
  <li>위젯에서 <b>configure → activate</b> 순서로 눌러 <code>/lifecycle_chatter</code> 발행이 시작되는 것을 봅니다.</li>
  <li>Unconfigured 에서 바로 <b>activate</b> 를 누르면? (그 상태에서 가능한 전이가 아님)</li>
  <li><code>on_configure() 결과</code>를 FAILURE 로 바꾸고 configure 하면 어느 상태로 돌아가나요?</li>
  <li>아래 명령으로 터미널에서도 상태를 확인 · 변경해 봅니다.</li>
</ol></div>
{{widget:lifecycle}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 lifecycle nodes
ros2 lifecycle get /lc_talker
ros2 lifecycle list /lc_talker</code></pre>
<p>위젯에서 아직 아무 버튼도 누르지 않았다면(Unconfigured) 아래 순서로 전이를 요청해 봅니다. 이미 다른 상태라면 <code>ros2 lifecycle list</code> 로 가능한 전이를 먼저 확인하세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 lifecycle set /lc_talker configure
ros2 lifecycle set /lc_talker activate
ros2 lifecycle get /lc_talker</code></pre>
<p>rclpy 에서는 <code>rclpy.lifecycle</code> 의 Node 를 상속하고 전이 콜백을 구현합니다. (아래는 실제 ROS 2 용 코드 — 이 사이트의 실습기에는 lifecycle 모듈이 없어 위젯으로 대신 실습합니다)</p>
<pre class="code" data-lang="python"><code>from rclpy.lifecycle import Node as LifecycleNode, State, TransitionCallbackReturn
from std_msgs.msg import String


class LcTalker(LifecycleNode):
    def __init__(self):
        super().__init__('lc_talker')
        self.pub = None
        self.timer = None

    def on_configure(self, state: State) -&gt; TransitionCallbackReturn:
        self.pub = self.create_lifecycle_publisher(String, 'lifecycle_chatter', 10)
        self.timer = self.create_timer(1.0, self.tick)
        return TransitionCallbackReturn.SUCCESS

    def on_activate(self, state: State) -&gt; TransitionCallbackReturn:
        self.get_logger().info('활성화! 이제 발행합니다')
        return super().on_activate(state)            <span class="cm"># 라이프사이클 퍼블리셔 활성화</span>

    def on_deactivate(self, state: State) -&gt; TransitionCallbackReturn:
        return super().on_deactivate(state)

    def tick(self):
        if self.pub is not None and self.pub.is_activated:
            self.pub.publish(String(data='Lifecycle HelloWorld'))</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — Nav2 의 lifecycle_manager</div>
Nav2 는 map_server · amcl · planner · controller 등을 모두 라이프사이클 노드로 만들고, <code>lifecycle_manager</code> 가 정해진 순서로 configure → activate 합니다. Nav2 가 "켜졌는데 안 움직이는" 문제의 상당수는 어떤 노드가 Active 로 넘어가지 못한 것입니다(<a href="#ch16">16장</a>).</div>`
    },

    /* ================================================================ 9 */
    {
      title: '컴포넌트와 프로세스 내 통신',
      html: `
<p>노드마다 프로세스를 하나씩 띄우면 이해하기 쉽지만, 카메라 영상처럼 큰 데이터를 노드 사이에 넘길 때는 매번 직렬화 · 복사 · 네트워크 스택을 거쳐 느려집니다. <b>컴포지션(composition)</b>은 여러 노드를 <b>컴포넌트</b>로 만들어 <b>한 프로세스(컨테이너)</b> 안에 올리는 방법이고, 같은 프로세스 안에서는 <b>프로세스 내 통신(intra-process communication)</b>으로 메시지를 복사 없이(포인터 전달) 주고받을 수 있습니다.</p>
<div class="vs">
  <div class="vs-a blue"><b>노드마다 프로세스</b><ul><li>하나가 죽어도 다른 것은 살아 있음</li><li>디버깅 쉬움</li><li>메시지마다 직렬화 · 복사</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b purple"><b>컴포넌트 컨테이너</b><ul><li>한 프로세스에 여러 노드</li><li>프로세스 내 통신 → 제로 카피 가능</li><li>실행 중에 로드 · 언로드</li></ul></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 component types
ros2 component list</code></pre>
<pre class="code" data-lang="bash"><code><span class="cm"># 실제 ROS 2: 컨테이너를 띄우고 컴포넌트를 실행 중에 올리기</span>
ros2 run rclcpp_components component_container                    <span class="cm"># /ComponentManager</span>
ros2 component load /ComponentManager composition composition::Talker
ros2 component load /ComponentManager composition composition::Listener
ros2 component list</code></pre>
<p>런치 파일에서는 <code>ComposableNodeContainer</code> 와 <code>ComposableNode</code> 로 씁니다. 컴포넌트는 <b>C++(rclcpp_components)</b>로 만들며, <code>RCLCPP_COMPONENTS_REGISTER_NODE(composition::Talker)</code> 매크로로 등록합니다.</p>
<pre class="code" data-lang="python"><code>from launch import LaunchDescription
from launch_ros.actions import ComposableNodeContainer
from launch_ros.descriptions import ComposableNode


def generate_launch_description():
    container = ComposableNodeContainer(
        name='my_container', namespace='',
        package='rclcpp_components', executable='component_container',
        composable_node_descriptions=[
            ComposableNode(package='composition', plugin='composition::Talker', name='talker',
                           extra_arguments=[{'use_intra_process_comms': True}]),
            ComposableNode(package='composition', plugin='composition::Listener', name='listener',
                           extra_arguments=[{'use_intra_process_comms': True}]),
        ],
        output='screen')
    return LaunchDescription([container])</code></pre>
<div class="box tip"><div class="box-t">💡 언제 쓰나?</div>
처음에는 노드마다 프로세스로 충분합니다. 카메라 · 점군 파이프라인처럼 <b>큰 메시지가 고속으로</b> 흐르거나, 임베디드 보드에서 메모리 · CPU 를 아껴야 할 때 컴포넌트로 옮기세요. 많은 공식 드라이버(예: image_proc, depthimage_to_laserscan)가 컴포넌트로 제공됩니다.</div>`
    }
  ],

  videos: [
    { title: 'No more broken comms! (ROS 2 + rmw_zenoh)', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=fS0_rbQ6KKA', lang: 'en', desc: 'DDS 탐색이 Wi-Fi 에서 왜 말썽인지, rmw_zenoh 로 어떻게 해결하는지 — 1 · 3절과 함께 보세요.' },
    { title: 'What is ROS2 Domain ID? Simple ROS2 Tutorial To Set Domain ID for DDS Middleware', channel: 'Harsh Mittal', url: 'https://www.youtube.com/watch?v=FFeeTL0P5oo', lang: 'en', desc: 'ROS_DOMAIN_ID 를 바꿔 노드가 서로 안 보이게 되는 것을 직접 보여 줍니다.' },
    { title: 'Test of ROS 2 QoS (Quality of Service)', channel: 'Yutaka Kondo', url: 'https://www.youtube.com/watch?v=akGU1SBxO78', lang: 'en', desc: '이미지 스트리밍으로 RELIABLE 과 BEST_EFFORT 의 차이를 눈으로 비교합니다.' },
    { title: 'Executors and Callback Groups in ROS2 | ROS2 Developers Open Class #149', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=_BrT4WZN2hI', lang: 'en', desc: '실행기와 콜백 그룹으로 복잡한 노드의 스레드를 관리하는 라이브 강의 — 7절 심화.' },
    { title: 'ROS2 - Manual Composition with Multi Threaded Executor', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=amQzXVkR7lY', lang: 'en', desc: '여러 노드를 한 프로세스의 MultiThreadedExecutor 로 돌리는 파이썬 예제.' },
    { title: 'ROS2 - Lifecycle Node Tutorial', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=_GXHBP5sA70', lang: 'en', desc: '파이썬 라이프사이클 노드를 작성하고 명령줄로 전이를 일으키는 과정 — 8절 코드와 같은 흐름.' },
    { title: 'Managed (Lifecycle) Nodes in ROS 2 (Concept + Cpp Code Demo)', channel: 'Hummingbird', url: 'https://www.youtube.com/watch?v=axraRVgFRec', lang: 'en', desc: '상태 기계 개념과 C++ 라이프사이클 노드 데모.' }
  ],

  terms: [
    ['DDS', 'Data Distribution Service. ROS 2 가 쓰는 데이터 중심 발행/구독 통신 표준(OMG)'],
    ['참가자(participant)', 'DDS 에 접속한 하나의 주체. 보통 ROS 2 프로세스(컨텍스트)마다 하나'],
    ['탐색(discovery)', '중앙 서버 없이 참가자 · 엔드포인트를 찾는 과정. SPDP(참가자) → SEDP(퍼블리셔 · 서브스크라이버)'],
    ['ROS_DOMAIN_ID', '같은 번호끼리만 통신하게 나누는 환경 변수. 기본 0, 0~101 권장'],
    ['ROS_AUTOMATIC_DISCOVERY_RANGE', '자동 탐색 범위: SUBNET(기본) · LOCALHOST · OFF · SYSTEM_DEFAULT. ROS_LOCALHOST_ONLY 의 후속'],
    ['RMW', 'ROS MiddleWare 인터페이스. RMW_IMPLEMENTATION 으로 rmw_fastrtps_cpp(기본) · rmw_cyclonedds_cpp · rmw_zenoh_cpp 선택'],
    ['QoS', 'Quality of Service. 신뢰성 · 내구성 · 히스토리/깊이 · deadline · lifespan · liveliness 등 전달 방식 설정'],
    ['RELIABLE / BEST_EFFORT', '잃어버린 메시지를 재전송해 모두 전달 / 재전송 없이 빠르게(손실 허용)'],
    ['TRANSIENT_LOCAL', '발행자가 최근 메시지를 보관했다가 늦게 온 구독자에게도 주는 내구성 설정'],
    ['qos_profile_sensor_data', 'BEST_EFFORT · KEEP_LAST 5 · VOLATILE 로 된 센서용 QoS 프리셋'],
    ['QoS 호환성', '발행자가 제공(offered)하는 QoS 가 구독자의 요청(requested) 이상일 때만 연결되는 규칙'],
    ['MultiThreadedExecutor', '여러 스레드로 콜백을 동시에 처리하는 실행기'],
    ['콜백 그룹', '콜백의 동시 실행 규칙. MutuallyExclusive(하나씩, 기본) · Reentrant(동시 가능)'],
    ['라이프사이클 노드', 'Unconfigured · Inactive · Active · Finalized 상태를 가지고 밖에서 전이를 조종하는 관리형 노드'],
    ['컴포넌트 · 프로세스 내 통신', '여러 노드를 한 프로세스 컨테이너에 올려 메시지를 복사 없이 주고받는 방식']
  ],

  summary: [
    'ROS 2 는 <b>DDS</b> 위에서 동작하며, 중앙 서버 없이 <b>SPDP(멀티캐스트) → SEDP</b> 로 서로를 찾는다',
    '<b>ROS_DOMAIN_ID</b> 로 네트워크를 나누고, <b>ROS_AUTOMATIC_DISCOVERY_RANGE</b>(SUBNET · LOCALHOST · OFF)로 탐색 범위를 정한다',
    '<b>RMW_IMPLEMENTATION</b> 으로 Fast DDS(기본) · Cyclone DDS · <b>Zenoh(Kilted 부터 Tier 1)</b> 를 코드 수정 없이 교체',
    'QoS: 신뢰성 · 내구성 · 히스토리/깊이 · deadline · lifespan · liveliness. 센서는 <b>sensor_data(BEST_EFFORT)</b>, 지도 · tf_static 은 <b>TRANSIENT_LOCAL</b>',
    '<b>제공 ≥ 요청</b>일 때만 연결 — 안 오면 <b>ros2 topic info -v</b> 로 양쪽 QoS 확인',
    '<b>MultiThreadedExecutor + 콜백 그룹 분리</b>로 느린 콜백 · 콜백 안 동기 호출의 교착을 해결',
    '<b>라이프사이클 노드</b>는 configure → activate 순서를 밖에서 조종, <b>컴포넌트</b>는 한 프로세스에서 제로 카피 통신'
  ],

  quiz: [
    { q: '같은 Wi-Fi 에 있는 친구의 노드가 내 로봇과 통신하지 않게 하는 가장 간단한 방법은?', options: ['노드 이름을 바꾼다', '서로 다른 ROS_DOMAIN_ID 를 쓴다', 'QoS 깊이를 1 로 한다', 'rclcpp 로 다시 짠다'], answer: 1, explain: '도메인이 다르면 탐색 포트가 달라 서로 전혀 보이지 않습니다. 실습실에서는 조마다 다른 번호를 쓰는 것이 기본 규칙입니다.' },
    { q: 'Jazzy 에서 "내 컴퓨터 안의 노드끼리만" 통신하게 하는 설정은?', options: ['ROS_DOMAIN_ID=0', 'ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST', 'RMW_IMPLEMENTATION=localhost', 'ROS_STATIC_PEERS=OFF'], answer: 1, explain: 'LOCALHOST 는 같은 머신 안에서만 탐색합니다. 옛 ROS_LOCALHOST_ONLY=1 은 Jazzy 에서 deprecated 입니다.' },
    { q: 'BEST_EFFORT 로 발행하는 LiDAR 토픽을 RELIABLE 로 구독하면?', options: ['정상 수신', '연결되지 않아 메시지를 하나도 받지 못한다', '절반만 받는다', '자동으로 발행자가 RELIABLE 로 바뀐다'], answer: 1, explain: '구독자의 요청(RELIABLE)이 발행자의 제공(BEST_EFFORT)보다 높아 호환되지 않습니다. qos_profile_sensor_data 로 구독하세요.' },
    { q: 'RViz 를 늦게 켜도 /map 을 받을 수 있게 하는 QoS 정책은?', options: ['Reliability = BEST_EFFORT', 'Durability = TRANSIENT_LOCAL', 'History = KEEP_ALL', 'Deadline = 1초'], answer: 1, explain: 'TRANSIENT_LOCAL 발행자는 최근 메시지(depth 개)를 보관했다가 늦게 온 구독자에게도 전달합니다. 구독자도 TRANSIENT_LOCAL 이어야 지난 메시지를 받습니다.' },
    { q: 'MultiThreadedExecutor 를 썼는데도 타이머 콜백 안의 client.call() 이 멈춘다. 가장 그럴듯한 원인은?', options: ['스레드 수가 너무 많다', '타이머와 클라이언트가 같은 MutuallyExclusive 기본 그룹에 있다', 'QoS 깊이가 작다', 'ROS_DOMAIN_ID 가 다르다'], answer: 1, explain: '같은 MutuallyExclusive 그룹이면 타이머 콜백이 끝나기 전에는 응답 처리 콜백이 실행될 수 없습니다. 클라이언트를 다른 콜백 그룹에 넣어야 합니다.' },
    { q: '라이프사이클 노드를 Unconfigured 에서 발행이 시작되는 상태로 만드는 올바른 전이 순서는?', options: ['activate → configure', 'configure → activate', 'cleanup → activate', 'activate 한 번'], answer: 1, explain: 'configure 로 Inactive(준비), activate 로 Active(동작)가 됩니다. Unconfigured 에서 바로 activate 는 허용되지 않아요.' },
    { q: 'rmw_zenoh_cpp 에 대한 설명으로 옳은 것은?', options: ['Fast DDS 의 새 이름이다', 'DDS 가 아닌 Zenoh 프로토콜을 쓰며 라우터로 서로를 찾는다', 'Humble 의 기본 RMW 다', 'DDS 노드와 자유롭게 통신한다'], answer: 1, explain: 'Zenoh 는 DDS 가 아니며 rmw_zenohd 라우터로 탐색합니다. Kilted Kaiju 에서 Tier 1 이 되었고, DDS 기반 노드와는 직접 통신하지 않습니다.' }
  ],

  slides: [
    {
      title: '이상한 일들',
      layout: 'center',
      html: `<div class="s-big">"토픽은 보이는데 echo 가 조용해요"<br>"친구 teleop 이 내 로봇을 움직여요"</div>
<p class="s-small step">원인: DDS · 도메인 · QoS · 실행기</p>`,
      notes: '학생들이 실제로 겪었던 이상 현상을 먼저 물어 칠판에 적습니다. 오늘 수업 끝에 각각의 원인을 다시 짚어 주면 효과적입니다. (3분)'
    },
    {
      title: 'DDS 탐색',
      html: `{{fig:discovery|nocap}}`,
      notes: 'ROS 1 의 roscore 와 비교합니다. 중앙 서버가 없으니 멀티캐스트로 "여기 있어요"를 외친다는 것, 그래서 네트워크 설정이 중요하다는 점을 강조하세요. (6분)'
    },
    {
      title: '도메인 = 무전기 채널',
      html: `{{widget:domain|preset=split}}`,
      notes: '프리셋을 모두 기본값 → 도메인 나누기 → LOCALHOST 순서로 보여 줍니다. 실습실에서는 조 번호를 도메인 ID 로 쓰자고 규칙을 정하세요. (7분)'
    },
    {
      title: 'RMW 바꿔 끼우기',
      html: `{{fig:rmw|nocap}}`,
      notes: '코드는 그대로, 환경 변수 하나로 통신 엔진 교체. Unitree 가 Cyclone DDS 를 쓰는 이유(SDK 호환), Zenoh 가 Wi-Fi 에서 강한 이유를 짧게 언급합니다. (5분)'
    },
    {
      title: '등기 vs 방송',
      html: `{{fig:reliability|nocap}}`,
      notes: 'RELIABLE = 등기 우편(잃어버리면 다시), BEST_EFFORT = 라디오 방송(놓치면 끝). 카메라 영상에 RELIABLE 을 쓰면 지연이 쌓이는 이유를 질문으로 유도하세요. (5분)'
    },
    {
      title: 'QoS 실험실',
      html: `{{widget:qos}}`,
      notes: '손실률 30% 에서 두 신뢰성을 비교하고, 느린 구독자 프리셋에서 depth 효과를 봅니다. 학생들이 슬라이더를 직접 조작하게 하세요. (8분)'
    },
    {
      title: '제공 ≥ 요청',
      html: `{{fig:compat|nocap}}`,
      notes: '"발행자가 약속한 것보다 더 요구하면 연결 안 됨" 한 문장으로 기억시킵니다. 에러 없이 조용히 안 되는 것이 가장 무섭다는 점을 강조. (5분)'
    },
    {
      title: '진단 실습',
      html: `{{widget:pylab|ex=qos|with=term}}`,
      notes: 'echo --qos-reliability reliable → 조용함 → topic info -v → best_effort 로 성공. 실제 Jazzy 의 echo 는 자동으로 맞춰 준다는 점도 덧붙이세요. (8분)'
    },
    {
      title: '늦게 온 구독자',
      html: `{{fig:latejoin|nocap}}`,
      notes: '지도 · tf_static · robot_description 이 TRANSIENT_LOCAL 인 이유. RViz 에서 지도가 안 보일 때 Durability 설정을 확인하는 실무 팁을 함께. (4분)'
    },
    {
      title: '실행기와 콜백 그룹',
      html: `{{fig:executors|nocap}}`,
      notes: '홀 직원이 한 명(단일 스레드)일 때와 여러 명(멀티스레드)일 때. 그룹은 "이 테이블들은 한 직원만 담당" 같은 규칙이라고 비유하세요. (6분)'
    },
    {
      title: '교착 재현',
      html: `{{widget:exec|preset=deadlock}}`,
      notes: '④ 교착 → ② 멀티스레드 + 기본 그룹(여전히 문제) → ⑤ 해결 순서로 보여 줍니다. 스레드만 늘려서는 안 되고 그룹을 나눠야 한다는 것이 핵심. (8분)'
    },
    {
      title: '라이프사이클',
      html: `{{fig:lifecycle|nocap}}`,
      notes: '드라이버 예: 설정(장치 연결) → 활성화(발행). Nav2 lifecycle_manager 가 이 순서를 자동으로 관리한다는 점을 16장과 연결합니다. (5분)'
    },
    {
      title: '상태 기계 조종',
      html: `{{widget:lifecycle}}`,
      notes: 'configure → activate 로 발행 시작, Unconfigured 에서 activate 가 안 되는 것, on_configure FAILURE 시 되돌아가는 것을 시연합니다. (6분)'
    },
    {
      title: '컴포넌트',
      html: `<div class="vs">
  <div class="vs-a blue"><b>노드마다 프로세스</b><ul><li>격리 · 디버깅 쉬움</li><li>메시지 복사</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b purple"><b>컴포넌트 컨테이너</b><ul><li>한 프로세스</li><li>제로 카피</li></ul></div>
</div>`,
      notes: '큰 이미지 · 점군이 오가는 파이프라인에서만 고민하면 된다고 안심시킵니다. ros2 component types 로 등록된 컴포넌트 목록을 보여 주고 마무리. (4분)'
    }
  ]
});
