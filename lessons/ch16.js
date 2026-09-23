/* 16장 — SLAM과 내비게이션(Nav2) */
Course.lesson({
  id: 'ch16', no: '16',
  icon: '🗺️',
  title: 'SLAM과 내비게이션(Nav2)',
  subtitle: '로봇은 처음 온 건물에서 어떻게 지도를 그리고, 스스로 목적지까지 찾아갈까?',
  level: '중급', time: '150분',
  goals: [
    '내비게이션의 세 질문(어디에 있나 · 어디로 가나 · 어떻게 가나)과 각각을 푸는 ROS 2 구성 요소를 짝지을 수 있다',
    '오도메트리 드리프트와 map → odom → base_link TF 사슬이 왜 필요한지 설명할 수 있다',
    'slam_toolbox 로 점유 격자 지도를 만들고 map_saver_cli 로 .pgm · .yaml 을 저장해 그 내용을 읽을 수 있다',
    'Nav2 의 서버(bt_navigator · planner · controller · behavior)와 코스트맵 층의 역할을 그림으로 설명할 수 있다',
    'NavigateToPose 액션을 터미널과 rclpy 로 보내 로봇을 목표까지 보낼 수 있다'
  ],
  teacher: {
    intro: '“여러분이 처음 가 보는 대형 마트에서 우유 코너를 찾는다면 어떻게 하나요?” 하고 묻습니다. 안내도 보기(지도), 지금 위치 표시 찾기(위치 추정), 가는 길 정하기(경로 계획), 카트 밀며 사람 피하기(경로 추종) — 학생 답을 네 칸으로 칠판에 적어 두고, 오늘 배울 ROS 2 패키지 이름을 하나씩 채워 넣으며 수업을 마무리합니다. (3분)',
    flow: '① 도입 · 세 질문 10분 → ② 센서 · 오도메트리 드리프트(odom 위젯) 15분 → ③ 점유 격자 지도 10분 → ④ SLAM + bot 위젯으로 지도 그리기 · 저장 25분 → ⑤ AMCL 10분 → ⑥ Nav2 구조 · 코스트맵 20분 → ⑦ 행동 트리 · NavigateToPose (bot nav + RViz) 25분 → ⑧ rclpy: 반응형 vs 계획형, BasicNavigator 20분 → ⑨ 실제 로봇 · 퀴즈 15분'
  },

  figs: {
    /* ------------------------------------------------ 세 질문 */
    questions: {
      caption: '내비게이션의 세 질문과, 그 답을 맡는 ROS 2 구성 요소',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="내비게이션의 세 질문: 어디에 있나, 어디로 가나, 어떻게 가나">
  <rect x="20" y="20" width="260" height="220" rx="16" class="blue"/>
  <text x="150" y="58" class="t-xl t-c">📍</text>
  <text x="150" y="98" class="t-lg t-b t-c t-blue">나는 어디에 있나?</text>
  <text x="150" y="130" class="t-sm t-c">위치 추정 (localization)</text>
  <text x="150" y="162" class="t-sm t-c t-mono">amcl · slam_toolbox</text>
  <text x="150" y="190" class="t-xs t-c t-mu">결과: TF map → odom</text>
  <text x="150" y="212" class="t-xs t-c t-mu">/amcl_pose</text>

  <rect x="310" y="20" width="260" height="220" rx="16" class="green"/>
  <text x="440" y="58" class="t-xl t-c">🗺️</text>
  <text x="440" y="98" class="t-lg t-b t-c t-green">어디로 가야 하나?</text>
  <text x="440" y="130" class="t-sm t-c">지도 + 목표 (map · goal)</text>
  <text x="440" y="162" class="t-sm t-c t-mono">map_server · /map</text>
  <text x="440" y="190" class="t-xs t-c t-mu">목표: NavigateToPose 액션</text>
  <text x="440" y="212" class="t-xs t-c t-mu">nav_msgs/msg/OccupancyGrid</text>

  <rect x="600" y="20" width="260" height="220" rx="16" class="orange"/>
  <text x="730" y="58" class="t-xl t-c">🛣️</text>
  <text x="730" y="98" class="t-lg t-b t-c t-orange">어떻게 가야 하나?</text>
  <text x="730" y="130" class="t-sm t-c">경로 계획 + 경로 추종</text>
  <text x="730" y="162" class="t-sm t-c t-mono">planner · controller</text>
  <text x="730" y="190" class="t-xs t-c t-mu">결과: /plan (Path)</text>
  <text x="730" y="212" class="t-xs t-c t-mu">/cmd_vel (Twist)</text>

  <line x1="282" y1="130" x2="306" y2="130" class="ln ar"/>
  <line x1="572" y1="130" x2="596" y2="130" class="ln ar"/>
  <rect x="20" y="262" width="840" height="50" rx="12" class="purple"/>
  <text x="440" y="288" class="t-c t-b t-purple">Nav2 = 이 세 질문을 매 순간 다시 묻고 답하는 서버 묶음 (+ 막히면 회복 동작)</text>
</svg>`
    },

    /* ------------------------------------------------ TF 사슬 */
    tfchain: {
      caption: 'map → odom → base_link → laser. 오도메트리는 부드럽지만 틀어지고, SLAM/AMCL 이 map → odom 으로 그 틀어짐을 메웁니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="map, odom, base_link, laser 좌표계 사슬과 누가 발행하는지">
  <ellipse cx="100" cy="90" rx="80" ry="34" class="purple"/><text x="100" y="90" class="t-b t-c t-mono">map</text>
  <ellipse cx="330" cy="90" rx="80" ry="34" class="teal"/><text x="330" y="90" class="t-b t-c t-mono">odom</text>
  <ellipse cx="560" cy="90" rx="90" ry="34" class="blue"/><text x="560" y="90" class="t-b t-c t-mono">base_link</text>
  <ellipse cx="790" cy="90" rx="70" ry="34" class="green"/><text x="790" y="90" class="t-b t-c t-mono">laser</text>
  <line x1="182" y1="90" x2="246" y2="90" class="ln-purple thick ar-purple"/>
  <line x1="412" y1="90" x2="466" y2="90" class="ln-teal thick ar-teal"/>
  <line x1="652" y1="90" x2="716" y2="90" class="ln-green thick ar-green"/>
  <text x="215" y="150" class="t-sm t-c t-purple t-b">slam_toolbox 또는 amcl</text>
  <text x="215" y="172" class="t-xs t-c t-mu">느리게, 가끔 "뚝" 보정</text>
  <text x="440" y="150" class="t-sm t-c t-teal t-b">오도메트리 (바퀴 · IMU)</text>
  <text x="440" y="172" class="t-xs t-c t-mu">빠르고 부드럽지만 누적 오차</text>
  <text x="685" y="150" class="t-sm t-c t-green t-b">robot_state_publisher</text>
  <text x="685" y="172" class="t-xs t-c t-mu">고정 (URDF, /tf_static)</text>
  <rect x="20" y="210" width="840" height="70" rx="12" class="box"/>
  <text x="440" y="236" class="t-sm t-c">한 프레임에 부모는 하나뿐 → 위치 추정 노드는 <tspan class="t-b">map → base_link</tspan> 를 직접 내지 않고</text>
  <text x="440" y="260" class="t-sm t-c"><tspan class="t-b">map → odom</tspan> 을 계산해 발행합니다 (REP-105). 그래서 odom 기준 제어는 끊기지 않습니다.</text>
</svg>`
    },

    /* ------------------------------------------------ 점유 격자 */
    grid: {
      caption: '점유 격자(OccupancyGrid): 칸마다 -1(모름) · 0(빈 곳) · 100(막힘). resolution 은 한 칸의 길이, origin 은 왼쪽 아래 칸의 map 좌표',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="점유 격자 지도의 칸 값과 resolution, origin">
  <g>
    <rect x="40" y="40" width="40" height="40" class="gray"/><rect x="80" y="40" width="40" height="40" class="gray"/><rect x="120" y="40" width="40" height="40" class="s-gray"/><rect x="160" y="40" width="40" height="40" class="s-gray"/><rect x="200" y="40" width="40" height="40" class="s-gray"/><rect x="240" y="40" width="40" height="40" class="s-gray"/><rect x="280" y="40" width="40" height="40" class="gray"/><rect x="320" y="40" width="40" height="40" class="gray"/>
    <rect x="40" y="80" width="40" height="40" class="gray"/><rect x="80" y="80" width="40" height="40" class="s-gray"/><rect x="120" y="80" width="40" height="40" class="box"/><rect x="160" y="80" width="40" height="40" class="box"/><rect x="200" y="80" width="40" height="40" class="box"/><rect x="240" y="80" width="40" height="40" class="box"/><rect x="280" y="80" width="40" height="40" class="s-gray"/><rect x="320" y="80" width="40" height="40" class="gray"/>
    <rect x="40" y="120" width="40" height="40" class="s-gray"/><rect x="80" y="120" width="40" height="40" class="box"/><rect x="120" y="120" width="40" height="40" class="box"/><rect x="160" y="120" width="40" height="40" class="box"/><rect x="200" y="120" width="40" height="40" class="s-gray"/><rect x="240" y="120" width="40" height="40" class="box"/><rect x="280" y="120" width="40" height="40" class="box"/><rect x="320" y="120" width="40" height="40" class="s-gray"/>
    <rect x="40" y="160" width="40" height="40" class="s-gray"/><rect x="80" y="160" width="40" height="40" class="box"/><rect x="120" y="160" width="40" height="40" class="box"/><rect x="160" y="160" width="40" height="40" class="box"/><rect x="200" y="160" width="40" height="40" class="box"/><rect x="240" y="160" width="40" height="40" class="box"/><rect x="280" y="160" width="40" height="40" class="box"/><rect x="320" y="160" width="40" height="40" class="s-gray"/>
    <rect x="40" y="200" width="40" height="40" class="gray"/><rect x="80" y="200" width="40" height="40" class="s-gray"/><rect x="120" y="200" width="40" height="40" class="box"/><rect x="160" y="200" width="40" height="40" class="box"/><rect x="200" y="200" width="40" height="40" class="box"/><rect x="240" y="200" width="40" height="40" class="box"/><rect x="280" y="200" width="40" height="40" class="s-gray"/><rect x="320" y="200" width="40" height="40" class="gray"/>
    <rect x="40" y="240" width="40" height="40" class="gray"/><rect x="80" y="240" width="40" height="40" class="gray"/><rect x="120" y="240" width="40" height="40" class="s-gray"/><rect x="160" y="240" width="40" height="40" class="s-gray"/><rect x="200" y="240" width="40" height="40" class="s-gray"/><rect x="240" y="240" width="40" height="40" class="s-gray"/><rect x="280" y="240" width="40" height="40" class="gray"/><rect x="320" y="240" width="40" height="40" class="gray"/>
  </g>
  <text x="140" y="100" class="t-xs t-c t-mono">0</text><text x="220" y="140" class="t-xs t-c t-mono tw">100</text><text x="60" y="60" class="t-xs t-c t-mono">-1</text>
  <text x="180" y="180" class="t-lg t-c">🤖</text>
  <circle cx="40" cy="280" r="7" class="s-red"/>
  <text x="40" y="304" class="t-xs t-c t-red t-b">origin</text>
  <line x1="40" y1="330" x2="80" y2="330" class="ln-blue thick ar2"/>
  <text x="60" y="348" class="t-xs t-c t-blue">resolution</text>
  <text x="200" y="330" class="t-xs t-c t-mu">data[] 는 왼쪽 아래부터 한 줄씩 (행 우선)</text>

  <rect x="400" y="40" width="460" height="54" rx="10" class="gray"/>
  <text x="420" y="60" class="t-b">-1 · 모름 (unknown)</text>
  <text x="420" y="82" class="t-xs t-mu">아직 레이저가 닿은 적 없는 칸 · PGM 회색(205)</text>
  <rect x="400" y="104" width="460" height="54" rx="10" class="box"/>
  <text x="420" y="124" class="t-b">0 · 빈 곳 (free)</text>
  <text x="420" y="146" class="t-xs t-mu">레이저가 지나간 칸 · PGM 흰색(254)</text>
  <rect x="400" y="168" width="460" height="54" rx="10" class="s-gray"/>
  <text x="420" y="188" class="t-b tw">100 · 막힘 (occupied)</text>
  <text x="420" y="210" class="t-xs tw">레이저가 맞고 돌아온 칸 · PGM 검정(0)</text>
  <rect x="400" y="236" width="460" height="100" rx="10" class="blue"/>
  <text x="420" y="260" class="t-sm t-b t-blue">nav_msgs/msg/OccupancyGrid</text>
  <text x="420" y="284" class="t-xs t-mono">info.resolution: 0.05   # m/칸 (5 cm)</text>
  <text x="420" y="304" class="t-xs t-mono">info.width, info.height  # 칸 수</text>
  <text x="420" y="324" class="t-xs t-mono">info.origin: 칸(0,0) 의 map 좌표 · int8[] data</text>
</svg>`
    },

    /* ------------------------------------------------ 포즈 그래프 */
    posegraph: {
      caption: 'SLAM 의 속: 스캔 매칭으로 노드(포즈)를 잇고, 예전 장소를 다시 보면 루프 클로저 간선이 생겨 그래프 전체가 펴집니다',
      svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="포즈 그래프와 루프 클로저">
  <text x="210" y="30" class="t-b t-c">① 오도메트리만: 한 바퀴 돌았는데 끝이 안 맞음</text>
  <path d="M80,270 L80,110 L220,70 L350,110 L360,250 L130,285" class="ln-orange thick dash nofill"/>
  <circle cx="80" cy="270" r="9" class="s-blue"/><circle cx="80" cy="190" r="9" class="s-blue"/><circle cx="80" cy="110" r="9" class="s-blue"/>
  <circle cx="220" cy="70" r="9" class="s-blue"/><circle cx="350" cy="110" r="9" class="s-blue"/><circle cx="360" cy="180" r="9" class="s-blue"/>
  <circle cx="360" cy="250" r="9" class="s-blue"/><circle cx="240" cy="270" r="9" class="s-blue"/><circle cx="130" cy="285" r="9" class="s-red"/>
  <line x1="130" y1="285" x2="86" y2="275" class="ln-red thick dash"/>
  <text x="150" y="315" class="t-xs t-red t-b">루프 클로저: "여기 출발점이네!"</text>

  <text x="660" y="30" class="t-b t-c">② 최적화 후: 그래프가 펴져 지도가 맞음</text>
  <rect x="520" y="70" width="280" height="210" rx="4" class="ln-green thick nofill"/>
  <circle cx="520" cy="280" r="9" class="s-blue"/><circle cx="520" cy="175" r="9" class="s-blue"/><circle cx="520" cy="70" r="9" class="s-blue"/>
  <circle cx="660" cy="70" r="9" class="s-blue"/><circle cx="800" cy="70" r="9" class="s-blue"/><circle cx="800" cy="175" r="9" class="s-blue"/>
  <circle cx="800" cy="280" r="9" class="s-blue"/><circle cx="660" cy="280" r="9" class="s-blue"/>
  <line x1="400" y1="180" x2="480" y2="180" class="ln thick ar"/>
  <text x="440" y="168" class="t-xs t-c t-mu">최적화</text>
  <text x="660" y="315" class="t-xs t-c t-mu">● 노드 = 그 순간 로봇 포즈 + 스캔 · 선 = 두 포즈 사이 제약</text>
</svg>`
    },

    /* ------------------------------------------------ AMCL */
    amcl: {
      caption: 'AMCL(적응형 몬테카를로 위치 추정): 수많은 "추측(파티클)"을 뿌리고, 레이저가 지도와 잘 맞는 추측만 살아남습니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="AMCL 파티클이 수렴하는 세 단계">
  <rect x="20" y="30" width="260" height="200" rx="10" class="box"/>
  <rect x="310" y="30" width="260" height="200" rx="10" class="box"/>
  <rect x="600" y="30" width="260" height="200" rx="10" class="box"/>
  <line x1="20" y1="130" x2="150" y2="130" class="ln thick"/><line x1="310" y1="130" x2="440" y2="130" class="ln thick"/><line x1="600" y1="130" x2="730" y2="130" class="ln thick"/>
  <circle cx="50" cy="60" r="4" class="s-red"/><circle cx="90" cy="95" r="4" class="s-red"/><circle cx="140" cy="70" r="4" class="s-red"/><circle cx="200" cy="100" r="4" class="s-red"/><circle cx="240" cy="60" r="4" class="s-red"/>
  <circle cx="60" cy="170" r="4" class="s-red"/><circle cx="110" cy="200" r="4" class="s-red"/><circle cx="170" cy="160" r="4" class="s-red"/><circle cx="220" cy="190" r="4" class="s-red"/><circle cx="250" cy="150" r="4" class="s-red"/>
  <circle cx="130" cy="110" r="4" class="s-red"/><circle cx="190" cy="215" r="4" class="s-red"/><circle cx="80" cy="140" r="4" class="s-red"/><circle cx="230" cy="120" r="4" class="s-red"/>
  <circle cx="390" cy="90" r="4" class="s-red"/><circle cx="400" cy="100" r="4" class="s-red"/><circle cx="380" cy="104" r="4" class="s-red"/><circle cx="410" cy="86" r="4" class="s-red"/>
  <circle cx="500" cy="180" r="4" class="s-red"/><circle cx="515" cy="170" r="4" class="s-red"/><circle cx="505" cy="192" r="4" class="s-red"/><circle cx="490" cy="170" r="4" class="s-red"/>
  <circle cx="470" cy="80" r="4" class="s-red"/><circle cx="350" cy="190" r="4" class="s-red"/>
  <circle cx="780" cy="175" r="4" class="s-red"/><circle cx="786" cy="181" r="4" class="s-red"/><circle cx="774" cy="183" r="4" class="s-red"/><circle cx="784" cy="170" r="4" class="s-red"/><circle cx="790" cy="176" r="4" class="s-red"/>
  <text x="782" y="210" class="t-lg t-c">🤖</text>
  <text x="150" y="255" class="t-sm t-c t-b">① 초기: 넓게 흩어짐</text>
  <text x="150" y="278" class="t-xs t-c t-mu">/initialpose 로 대략 알려 주면 좁아짐</text>
  <text x="440" y="255" class="t-sm t-c t-b">② 조금 움직이면 후보 몇 곳</text>
  <text x="440" y="278" class="t-xs t-c t-mu">복도처럼 비슷한 곳은 헷갈림</text>
  <text x="730" y="255" class="t-sm t-c t-b">③ 수렴: 한 곳에 모임</text>
  <text x="730" y="278" class="t-xs t-c t-mu">평균 → /amcl_pose, TF map → odom</text>
</svg>`
    },

    /* ------------------------------------------------ Nav2 구조 */
    nav2arch: {
      caption: 'Nav2 구조: bt_navigator 가 행동 트리로 지휘하고, planner · controller · behavior 서버가 액션으로 일을 받습니다. 모두 lifecycle_manager 가 켜고 끕니다',
      svg: `<svg class="dg" viewBox="0 0 900 440" role="img" aria-label="Nav2 서버 구조와 코스트맵, 토픽 흐름">
  <rect x="330" y="16" width="240" height="46" rx="10" class="purple"/>
  <text x="450" y="39" class="t-b t-c t-purple">🎯 NavigateToPose 목표</text>
  <text x="450" y="80" class="t-xs t-c t-mu">RViz "Nav2 Goal" · ros2 action send_goal · BasicNavigator</text>
  <line x1="450" y1="62" x2="450" y2="100" class="ln-purple thick ar-purple"/>

  <ellipse cx="450" cy="130" rx="150" ry="30" class="blue"/>
  <text x="450" y="125" class="t-b t-c">bt_navigator</text>
  <text x="450" y="145" class="t-xs t-c t-mu">행동 트리(BT XML) 실행</text>

  <line x1="360" y1="156" x2="170" y2="208" class="ln-purple ar-purple"/>
  <line x1="450" y1="160" x2="450" y2="208" class="ln-purple ar-purple"/>
  <line x1="540" y1="156" x2="730" y2="208" class="ln-purple ar-purple"/>
  <text x="235" y="176" class="t-xs t-purple">ComputePathToPose</text>
  <text x="458" y="190" class="t-xs t-purple">FollowPath</text>
  <text x="640" y="176" class="t-xs t-purple">Spin · BackUp · Wait</text>

  <ellipse cx="170" cy="238" rx="125" ry="30" class="blue"/>
  <text x="170" y="233" class="t-b t-c">planner_server</text>
  <text x="170" y="252" class="t-xs t-c t-mu">NavFn · Smac · Theta*</text>
  <ellipse cx="450" cy="238" rx="130" ry="30" class="blue"/>
  <text x="450" y="233" class="t-b t-c">controller_server</text>
  <text x="450" y="252" class="t-xs t-c t-mu">DWB · RPP · MPPI</text>
  <ellipse cx="730" cy="238" rx="125" ry="30" class="blue"/>
  <text x="730" y="233" class="t-b t-c">behavior_server</text>
  <text x="730" y="252" class="t-xs t-c t-mu">회복 동작</text>

  <rect x="70" y="292" width="200" height="50" rx="8" class="teal"/>
  <text x="170" y="312" class="t-sm t-b t-c">global_costmap</text>
  <text x="170" y="331" class="t-xs t-c t-mu">지도 전체 · map 좌표</text>
  <rect x="350" y="292" width="200" height="50" rx="8" class="teal"/>
  <text x="450" y="312" class="t-sm t-b t-c">local_costmap</text>
  <text x="450" y="331" class="t-xs t-c t-mu">로봇 주변 3 m · odom 좌표</text>
  <line x1="170" y1="268" x2="170" y2="290" class="ln-teal"/>
  <line x1="450" y1="268" x2="450" y2="290" class="ln-teal"/>

  <rect x="20" y="370" width="110" height="40" rx="6" class="green"/><text x="75" y="390" class="t-sm t-c t-mono">/map</text>
  <rect x="145" y="370" width="110" height="40" rx="6" class="green"/><text x="200" y="390" class="t-sm t-c t-mono">/scan</text>
  <rect x="270" y="370" width="110" height="40" rx="6" class="green"/><text x="325" y="390" class="t-sm t-c t-mono">/tf</text>
  <line x1="75" y1="368" x2="140" y2="344" class="ln-green ar-green"/>
  <line x1="200" y1="368" x2="400" y2="344" class="ln-green ar-green"/>
  <rect x="520" y="370" width="130" height="40" rx="6" class="green"/><text x="585" y="390" class="t-sm t-c t-mono">/plan</text>
  <rect x="670" y="370" width="150" height="40" rx="6" class="green"/><text x="745" y="390" class="t-sm t-c t-mono">/cmd_vel</text>
  <line x1="240" y1="260" x2="560" y2="368" class="ln-green dash ar-green"/>
  <line x1="530" y1="262" x2="700" y2="368" class="ln-green ar-green"/>
  <text x="745" y="428" class="t-xs t-c t-mu">→ 로봇 바퀴 (실제: velocity_smoother 경유)</text>

  <rect x="700" y="16" width="190" height="60" rx="10" class="gray"/>
  <text x="795" y="40" class="t-sm t-b t-c">lifecycle_manager</text>
  <text x="795" y="60" class="t-xs t-c t-mu">configure → activate</text>
</svg>`
    },

    /* ------------------------------------------------ 코스트맵 층 */
    costmap: {
      caption: '코스트맵은 여러 층을 겹쳐 만듭니다: 정적 지도 + 센서가 본 장애물 + 벽 주변 "위험 띠(inflation)"',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="코스트맵의 정적, 장애물, 팽창 층">
  <rect x="30" y="40" width="200" height="140" rx="6" class="box"/>
  <rect x="30" y="40" width="200" height="16" class="s-gray"/><rect x="30" y="40" width="16" height="140" class="s-gray"/><rect x="120" y="110" width="40" height="70" class="s-gray"/>
  <text x="130" y="210" class="t-b t-c">static_layer</text>
  <text x="130" y="232" class="t-xs t-c t-mu">/map 을 그대로</text>

  <text x="260" y="115" class="t-xl t-c">+</text>
  <rect x="290" y="40" width="200" height="140" rx="6" class="box"/>
  <circle cx="400" cy="80" r="14" class="s-orange"/><circle cx="330" cy="140" r="10" class="s-orange"/>
  <text x="390" y="210" class="t-b t-c">obstacle_layer</text>
  <text x="390" y="232" class="t-xs t-c t-mu">/scan 이 본 새 장애물 (사람 · 상자)</text>

  <text x="520" y="115" class="t-xl t-c">=</text>
  <rect x="550" y="40" width="300" height="140" rx="6" class="box"/>
  <rect x="550" y="40" width="300" height="36" class="red"/><rect x="550" y="40" width="36" height="140" class="red"/>
  <rect x="680" y="100" width="80" height="80" class="red"/>
  <circle cx="800" cy="92" r="30" class="red"/><circle cx="620" cy="146" r="26" class="red"/>
  <rect x="550" y="40" width="300" height="16" class="s-gray"/><rect x="550" y="40" width="16" height="140" class="s-gray"/><rect x="700" y="120" width="40" height="60" class="s-gray"/>
  <circle cx="800" cy="92" r="14" class="s-orange"/><circle cx="620" cy="146" r="10" class="s-orange"/>
  <text x="700" y="210" class="t-b t-c">+ inflation_layer</text>
  <text x="700" y="232" class="t-xs t-c t-mu">벽에서 가까울수록 비용 ↑ (254 치명 · 253 내접)</text>
  <text x="440" y="275" class="t-sm t-c">플래너는 <tspan class="t-b">비용의 합이 가장 작은 길</tspan>을 찾습니다 → 벽에 바짝 붙지 않고 복도 가운데로</text>
</svg>`
    },

    /* ------------------------------------------------ 행동 트리 */
    bt: {
      caption: 'NavigateToPose 기본 행동 트리를 줄인 모습: 1 Hz 로 경로를 다시 계획하며 따라가고, 실패하면 회복 동작 뒤 다시 시도합니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="Nav2 NavigateToPose 행동 트리 요약">
  <rect x="330" y="14" width="220" height="44" rx="8" class="purple"/>
  <text x="440" y="36" class="t-b t-c">RecoveryNode (재시도 6번)</text>
  <line x1="390" y1="58" x2="200" y2="100" class="ln"/><line x1="490" y1="58" x2="680" y2="100" class="ln"/>

  <rect x="90" y="100" width="220" height="44" rx="8" class="blue"/>
  <text x="200" y="122" class="t-b t-c">PipelineSequence</text>
  <text x="200" y="160" class="t-xs t-c t-mu">"차례대로, 동시에 계속 돌림"</text>
  <line x1="150" y1="144" x2="100" y2="190" class="ln"/><line x1="250" y1="144" x2="300" y2="190" class="ln"/>
  <rect x="20" y="190" width="170" height="60" rx="8" class="box"/>
  <text x="105" y="212" class="t-sm t-c">RateController 1 Hz</text>
  <text x="105" y="234" class="t-sm t-c t-b">ComputePathToPose</text>
  <rect x="215" y="190" width="170" height="60" rx="8" class="box"/>
  <text x="300" y="212" class="t-sm t-c">경로 따라가기</text>
  <text x="300" y="234" class="t-sm t-c t-b">FollowPath</text>

  <rect x="570" y="100" width="220" height="44" rx="8" class="orange"/>
  <text x="680" y="122" class="t-b t-c">RoundRobin (회복)</text>
  <text x="680" y="160" class="t-xs t-c t-mu">"하나씩 돌아가며 시도"</text>
  <line x1="600" y1="144" x2="480" y2="190" class="ln"/><line x1="650" y1="144" x2="610" y2="190" class="ln"/><line x1="710" y1="144" x2="740" y2="190" class="ln"/><line x1="760" y1="144" x2="840" y2="190" class="ln"/>
  <rect x="420" y="190" width="120" height="60" rx="8" class="box"/><text x="480" y="214" class="t-xs t-c">코스트맵</text><text x="480" y="234" class="t-xs t-c t-b">지우기</text>
  <rect x="555" y="190" width="110" height="60" rx="8" class="box"/><text x="610" y="220" class="t-sm t-c t-b">Spin</text>
  <rect x="680" y="190" width="110" height="60" rx="8" class="box"/><text x="735" y="220" class="t-sm t-c t-b">Wait</text>
  <rect x="800" y="190" width="70" height="60" rx="8" class="box"/><text x="835" y="220" class="t-sm t-c t-b">BackUp</text>
  <rect x="20" y="276" width="850" height="42" rx="10" class="gray"/>
  <text x="445" y="297" class="t-sm t-c">왼쪽이 실패(막힘 · 경로 없음)하면 오른쪽 회복 동작 → 다시 왼쪽. XML 만 바꾸면 행동이 바뀝니다 (코드 수정 없음)</text>
</svg>`
    }
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '내비게이션의 세 질문과 센서',
      html: `
<p>사람에게 “저 문 앞까지 가 줘”는 쉬운 부탁이지만, 로봇에게는 <b>세 가지 질문</b>을 동시에 풀어야 하는 어려운 문제입니다. <b>나는 어디에 있지?</b>(위치 추정), <b>어디로 가야 하지?</b>(지도와 목표), <b>어떻게 가지?</b>(경로 계획 · 추종). 이 장에서 배우는 SLAM 과 Nav2 는 바로 이 세 질문에 대한 ROS 2 의 표준 답입니다.</p>
{{fig:questions}}
<div class="box analogy"><div class="box-t">🍳 비유 — 처음 가 보는 대형 마트</div>
안내도(지도)를 보고, “현재 위치” 빨간 점(위치 추정)을 찾고, 우유 코너까지 통로를 정한 뒤(경로 계획), 카트를 밀며 사람을 피해 갑니다(경로 추종). 안내도가 없다면? 돌아다니며 직접 그려야 합니다 — 그게 <b>SLAM</b> 입니다.</div>
<p>질문에 답하려면 로봇의 “감각”이 필요합니다. 2D 내비게이션에서 가장 흔히 쓰는 센서 세 가지와 ROS 2 메시지를 정리하면 다음과 같습니다.</p>
<table class="tbl">
<tr><th>센서</th><th>토픽 · 메시지</th><th>알려 주는 것</th><th>약점</th></tr>
<tr><td>🔦 2D LiDAR</td><td><code>/scan</code> · <code>sensor_msgs/msg/LaserScan</code></td><td>한 바퀴(360°) 방향마다 벽까지 거리 <code>ranges[]</code></td><td>유리 · 검은 물체, 높이가 다른 장애물(책상 상판)</td></tr>
<tr><td>🛞 바퀴 엔코더 → 오도메트리</td><td><code>/odom</code> · <code>nav_msgs/msg/Odometry</code></td><td>출발점 대비 얼마나 움직였나 (위치 + 속도)</td><td>미끄러짐 · 바퀴 지름 오차가 <b>누적</b></td></tr>
<tr><td>🧭 IMU</td><td><code>/imu</code> · <code>sensor_msgs/msg/Imu</code></td><td>회전 속도 · 가속도 · 자세</td><td>적분하면 드리프트</td></tr>
</table>
<p>이 강좌의 <b>webbot 시뮬레이터</b>(Gazebo 대신 브라우저에서 도는 차동 구동 로봇)는 실제 로봇과 같은 이름 · 같은 타입으로 이 토픽들을 발행합니다. 혼자 켤 때는 <code>ros2 launch webbot_sim world.launch.py world:=room</code> 을 쓰지만, 아래 실습 창이 이미 켜 두었으니 바로 토픽을 살펴봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic list -t
ros2 interface show sensor_msgs/msg/LaserScan
ros2 topic echo /scan --once --no-arr</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li><b>실행</b> — 위 코드의 ▶ 버튼을 누르면 아래 실습 창 터미널에서 시뮬레이터가 뜹니다.</li>
<li><b>필드 읽기</b> — <code>angle_min</code> · <code>angle_increment</code> · <code>range_min/max</code> 값을 찾아 “몇 도마다 한 번 재는지” 계산해 보세요.</li>
<li><b>확인</b> — <code>ros2 topic hz /scan</code> 으로 주기를 재 보세요.</li>
</ol></div>
{{widget:lab|with=bot|h=380|title=webbot 켜고 센서 토픽 보기}}`
    },

    /* ============================================================ 2 */
    {
      title: '오도메트리 드리프트와 map · odom 좌표계',
      html: `
<p><b>오도메트리(odometry)</b> 는 “바퀴가 몇 바퀴 돌았으니 이만큼 왔겠지”라고 계산한 위치입니다. 10 ms 마다 부드럽게 나와서 제어에 쓰기 좋지만, 바퀴 지름이 0.5 % 만 틀려도, 바닥이 조금만 미끄러워도 <b>오차가 계속 쌓입니다(drift)</b>. 특히 방향(yaw) 오차는 멀리 갈수록 위치 오차를 크게 키웁니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 정사각형을 달려 보면?</div>
<ol class="steps-list">
<li>아래 위젯에서 로봇이 1 m 정사각형을 여러 바퀴 돌게 해 보세요.</li>
<li>바퀴 지름 오차 · 바퀴 간격 오차를 키우면 추정 경로(오도메트리)가 실제 경로에서 어떻게 벌어지는지 보세요.</li>
<li>“왼쪽으로 돌 때와 오른쪽으로 돌 때 오차가 다르게 쌓이는” 이유를 짝과 이야기해 보세요.</li>
</ol></div>
{{widget:odom}}
<p>그래서 ROS 는 좌표계를 둘로 나눕니다(REP-105). <code>odom</code> 은 “연속적이지만 틀어지는” 좌표계, <code>map</code> 은 “틀어지지 않지만 가끔 뚝 뛰는” 좌표계입니다. SLAM 이나 AMCL 은 레이저를 지도와 맞춰 본 뒤 <b>map → odom 변환</b>을 발행해 오도메트리의 틀어짐을 메웁니다.</p>
{{fig:tfchain}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /odom --once --no-arr
ros2 run tf2_ros tf2_echo odom base_link</code></pre>
<div class="box note"><div class="box-t">📝 왜 map → base_link 를 바로 발행하지 않나요?</div>
TF 트리에서 한 프레임의 부모는 하나뿐입니다. <code>base_link</code> 의 부모는 이미 <code>odom</code>(오도메트리가 발행)이므로, 위치 추정 노드는 “map 에서 본 odom 이 어디 있어야 로봇 위치가 맞아지는가”를 계산해 map → odom 을 냅니다. TF 자세한 내용은 12장을 참고하세요.</div>`
    },

    /* ============================================================ 3 */
    {
      title: '점유 격자 지도 — 로봇이 쓰는 지도',
      html: `
<p>Nav2 가 쓰는 지도는 <b>점유 격자(occupancy grid)</b> 입니다. 바닥을 바둑판처럼 잘게 나누고, 칸마다 “여기 뭐가 있나”를 숫자로 적습니다. 메시지는 <code>nav_msgs/msg/OccupancyGrid</code>, 토픽은 보통 <code>/map</code> 입니다.</p>
{{fig:grid}}
<ul>
<li><b>resolution</b> — 한 칸의 한 변 길이(m). 0.05 면 5 cm. 작을수록 정밀하지만 칸 수가 제곱으로 늘어 메모리 · 계산이 커집니다.</li>
<li><b>origin</b> — 칸 (0, 0) 즉 <b>왼쪽 아래 칸</b>의 map 좌표 (x, y, yaw). 지도 파일을 다른 로봇과 나눌 때 좌표를 맞추는 기준입니다.</li>
<li><b>data[]</b> — 너비 × 높이 개의 int8. 값은 <code>-1</code>(모름) · <code>0</code>(빈 곳) · <code>100</code>(막힘), 중간값은 확률처럼 쓰입니다.</li>
</ul>
<div class="box tip"><div class="box-t">💡 칸 번호 ↔ 좌표 바꾸기</div>
map 좌표 (x, y) 가 들어 있는 칸은 <code>i = floor((x - origin.x) / resolution)</code>, <code>j = floor((y - origin.y) / resolution)</code>, 배열 위치는 <code>data[j * width + i]</code> 입니다. 직접 코스트맵을 읽는 노드를 짤 때 그대로 씁니다.</div>
<div class="stats"><div class="stat blue"><b>0.05 m</b><span>흔한 resolution</span></div><div class="stat green"><b>20 m × 20 m</b><span>= 400 × 400 칸</span></div><div class="stat orange"><b>160,000</b><span>int8 (약 156 KB)</span></div></div>`
    },

    /* ============================================================ 4 */
    {
      title: 'SLAM — 돌아다니며 지도 그리기 (slam_toolbox)',
      html: `
<p><b>SLAM(Simultaneous Localization And Mapping, 동시적 위치 추정 및 지도 작성)</b> 은 지도가 없는 곳에서 “내 위치”와 “지도”를 <b>동시에</b> 추정합니다. 지도를 알아야 위치를 알고, 위치를 알아야 지도를 그리는 닭과 달걀 문제를 함께 풉니다.</p>
<div class="layers">
<div class="ly blue"><b>① 스캔 매칭</b><span>새 스캔을 지금까지의 지도(또는 직전 스캔)에 가장 잘 겹치게 돌리고 밀어 봄 → 로봇이 얼마나 움직였는지 오도메트리보다 정확히</span><em>프런트엔드</em></div>
<div class="ly teal"><b>② 포즈 그래프</b><span>일정 거리마다 “노드 = 그때의 포즈 + 스캔”을 저장하고, 노드 사이 상대 위치를 “제약(간선)”으로 연결</span><em>기억</em></div>
<div class="ly orange"><b>③ 루프 클로저</b><span>예전에 왔던 곳을 다시 알아보면 먼 노드끼리 간선을 추가</span><em>되돌아옴 감지</em></div>
<div class="ly purple"><b>④ 그래프 최적화</b><span>모든 제약을 가장 잘 만족하도록 노드 위치를 한꺼번에 조정 → 지도가 “쫙 펴짐”</span><em>백엔드 (Ceres)</em></div>
</div>
{{fig:posegraph}}
<p>ROS 2 의 대표 2D SLAM 패키지는 <b>slam_toolbox</b> 입니다(Nav2 기본 권장). 모드가 여럿인데 실습에서는 <code>online_async</code> — “실시간(online)으로 돌되, 처리가 밀리면 스캔 일부를 건너뛰어(async) 늦지 않게” — 를 씁니다. 결과로 <code>/map</code> 토픽과 map → odom TF 를 발행합니다.</p>
<pre class="code" data-lang="bash"><code># 실제 로봇 · Gazebo 에서 slam_toolbox 켜기 (아래 위젯은 이미 켜 두었습니다)
ros2 launch slam_toolbox online_async_launch.py use_sim_time:=true</code></pre>
<p>아래 위젯이 slam_toolbox 를 켠 뒤에 다음 명령으로 무엇이 생겼는지 확인해 보세요. <code>/map</code> 의 QoS 가 <b>transient_local</b>(늦게 구독해도 마지막 지도를 받음)인 것도 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic info /map -v
ros2 service list | grep slam_toolbox</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 미로 지도 그리기</div>
<ol class="steps-list">
<li><b>운전</b> — 아래 시뮬레이터 화면을 클릭하고 <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 로 미로를 천천히 돌아다니세요. 회색(모름)이 흰색 · 검정으로 채워집니다.</li>
<li><b>루프</b> — 출발점으로 한 바퀴 돌아와 보세요. 벽이 두 겹으로 그려지다가 맞춰지는지 보세요.</li>
<li><b>저장</b> — 💾 <b>지도 저장</b> 버튼, 또는 아래 <code>map_saver_cli</code> 명령을 실행하세요.</li>
</ol></div>
{{widget:bot|world=maze|mode=slam|teleop=1}}
<p>지도를 다 그렸으면 <b>nav2_map_server</b> 의 <code>map_saver_cli</code> 로 파일에 저장합니다. 이미지(.pgm)와 설명서(.yaml) 두 파일이 생깁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run nav2_map_server map_saver_cli -f my_map</code></pre>
<pre class="code out" data-lang="출력"><code># my_map.yaml
image: my_map.pgm          # 흑백 이미지: 흰색=빈 곳, 검정=막힘, 회색=모름
mode: trinary              # 세 값(빈 곳/막힘/모름)으로 해석
resolution: 0.050          # m/칸
origin: [-2.40, -2.10, 0]  # 이미지 왼쪽 아래 칸의 map 좌표 (x, y, yaw)
negate: 0                  # 1 이면 흑백 반전
occupied_thresh: 0.65      # 이보다 어두우면 막힘
free_thresh: 0.25          # 이보다 밝으면 빈 곳</code></pre>
<div class="box warn"><div class="box-t">⚠️ 실제 로봇에서 자주 하는 실수</div>
<ul><li>너무 빨리 돌면 스캔 매칭이 실패해 벽이 겹쳐 그려집니다. 특히 <b>제자리 회전은 천천히</b>.</li>
<li>시뮬레이터(Gazebo)라면 <code>use_sim_time:=true</code> 를 꼭 줍니다. 시계가 다르면 TF 가 “미래/과거” 오류를 냅니다.</li>
<li>긴 복도 · 텅 빈 홀처럼 특징이 없으면 스캔 매칭이 헷갈립니다.</li></ul></div>`
    },

    /* ============================================================ 5 */
    {
      title: '지도가 있을 때의 위치 추정 — AMCL',
      html: `
<p>지도를 한 번 만들었다면 매번 SLAM 을 돌릴 필요가 없습니다. 저장한 지도를 <b>map_server</b> 로 불러오고, <b>AMCL(Adaptive Monte Carlo Localization)</b> 이 “이 지도의 어디쯤에 있나”만 풉니다.</p>
{{fig:amcl}}
<ol class="steps-list">
<li><b>뿌리기</b> — 로봇이 있을 법한 곳에 수백~수천 개의 <b>파티클(추측 포즈)</b>을 뿌립니다.</li>
<li><b>움직이기</b> — 오도메트리만큼 모든 파티클을 같이 움직이고 약간의 잡음을 섞습니다.</li>
<li><b>채점</b> — 각 파티클 위치에서 “레이저가 이렇게 보였을 확률”을 지도와 비교해 점수를 매깁니다.</li>
<li><b>다시 뽑기</b> — 점수가 높은 파티클을 더 많이 복제합니다. 확신이 커지면 파티클 수를 줄입니다(Adaptive, KLD 샘플링).</li>
</ol>
<p>처음 켰을 때는 로봇이 어디 있는지 모르므로, RViz 의 <b>2D Pose Estimate</b> 로 대략의 위치와 방향을 알려 줍니다. 이 버튼은 사실 <code>/initialpose</code> 토픽(<code>geometry_msgs/msg/PoseWithCovarianceStamped</code>)에 메시지 하나를 발행하는 것뿐이라 터미널로도 할 수 있습니다.</p>
<pre class="code" data-lang="bash"><code># 실제 로봇: 저장한 지도로 map_server + amcl 켜기
ros2 launch nav2_bringup localization_launch.py map:=my_map.yaml</code></pre>
<p>이 페이지에서는 위 SLAM 위젯의 모드 버튼을 <b>🧭 내비게이션</b>으로 바꾸면 저장한 지도 + AMCL 이 켜집니다. 그다음 터미널에서 초기 위치를 알려 주고 추정 결과를 확인해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /initialpose geometry_msgs/msg/PoseWithCovarianceStamped "{header: {frame_id: map}, pose: {pose: {position: {x: 0.0, y: 0.0}, orientation: {w: 1.0}}}}"
ros2 topic echo /amcl_pose --once</code></pre>
<div class="vs"><div class="vs-a blue"><b>slam_toolbox (SLAM)</b><ul><li>지도가 없을 때</li><li>지도를 그리며 위치 추정</li><li>계산량 큼</li></ul></div><div class="vs-mid">VS</div><div class="vs-b orange"><b>map_server + AMCL</b><ul><li>지도가 이미 있을 때</li><li>위치만 추정</li><li>가볍고 안정적 (운영 단계)</li></ul></div></div>
<div class="box note"><div class="box-t">📝 이 페이지의 시뮬레이터에서</div>
slam_toolbox 와 AMCL 은 둘 다 map → odom 을 발행하므로 실제 로봇에서도 <b>둘 중 하나만</b> 켭니다. 위젯의 모드를 바꾸면 slam_toolbox 가 꺼지고 AMCL 로 전환되는 이유입니다.</div>`
    },

    /* ============================================================ 6 */
    {
      title: 'Nav2 의 구조 — 서버 · 코스트맵 · 라이프사이클',
      html: `
<p><b>Nav2(Navigation2)</b> 는 ROS 2 의 표준 내비게이션 스택입니다. 하나의 거대한 프로그램이 아니라, 일을 나눠 맡은 <b>서버 노드들</b>이 <b>액션</b>으로 협력합니다(5장에서 “내비게이션이 액션인 이유”를 떠올려 보세요).</p>
{{fig:nav2arch}}
<table class="tbl">
<tr><th>노드</th><th>맡은 일</th><th>대표 플러그인</th></tr>
<tr><td><code>bt_navigator</code></td><td>목표를 받아 <b>행동 트리</b>대로 다른 서버에 일을 시킴 (<code>/navigate_to_pose</code>, <code>/navigate_through_poses</code> 액션 서버)</td><td>BT XML</td></tr>
<tr><td><code>planner_server</code></td><td>전역 경로 계획: 지금 위치 → 목표까지 <code>nav_msgs/msg/Path</code></td><td>NavFn(Dijkstra/A*), Smac(2D · Hybrid-A* · State Lattice), Theta*</td></tr>
<tr><td><code>controller_server</code></td><td>경로 추종: 경로와 로컬 코스트맵을 보고 매 주기 <code>/cmd_vel</code></td><td>DWB, Regulated Pure Pursuit, MPPI</td></tr>
<tr><td><code>behavior_server</code></td><td>회복 · 보조 동작</td><td>Spin, BackUp, DriveOnHeading, Wait</td></tr>
<tr><td><code>lifecycle_manager</code></td><td>위 노드들을 순서대로 configure → activate (11장의 관리형 노드)</td><td><code>autostart</code></td></tr>
</table>
<p>플래너와 컨트롤러는 <b>코스트맵(costmap)</b> 위에서 생각합니다. 점유 격자 지도에 “얼마나 위험한가” 비용(0~254)을 입힌 것으로, 여러 층을 겹쳐 만듭니다.</p>
{{fig:costmap}}
<div class="cards c3">
<div class="card blue"><div class="ci">🧭</div><b>플래너 고르기</b><p><b>NavFn</b>: 원형 로봇에 간단하고 빠름. <b>Smac Hybrid-A*</b>: 자동차처럼 제자리 회전 못 하는 로봇. <b>Smac Lattice</b>: 임의 모양 로봇.</p></div>
<div class="card orange"><div class="ci">🕹️</div><b>컨트롤러 고르기</b><p><b>DWB</b>: 속도 후보를 굴려 보고 점수. <b>RPP</b>: 앞쪽 한 점을 쫓는 단순 · 안정형(창고 AMR). <b>MPPI</b>: 수천 개 궤적 샘플로 예측 제어, 동적 장애물에 강함.</p></div>
<div class="card purple"><div class="ci">🔌</div><b>플러그인 구조</b><p>코드를 고치지 않고 YAML 파라미터 한 줄(<code>plugin: ...</code>)로 알고리즘을 바꿉니다.</p></div>
</div>
<p>Nav2 를 켜고 노드 · 파라미터를 살펴봅시다. 팽창 반경을 줄이면 로봇이 벽에 더 붙어 다닙니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch nav2_bringup navigation_launch.py &amp;
ros2 node list
ros2 action list -t
ros2 param get /global_costmap/global_costmap inflation_layer.inflation_radius
ros2 param set /global_costmap/global_costmap inflation_layer.inflation_radius 0.3</code></pre>`
    },

    /* ============================================================ 7 */
    {
      title: '행동 트리와 NavigateToPose 액션',
      html: `
<p>bt_navigator 의 “두뇌”는 <b>행동 트리(Behavior Tree, BT)</b> 입니다. 게임 캐릭터 AI 에서 온 방식으로, 작은 동작(노드)을 나무 모양으로 조립해 “무엇을, 어떤 순서로, 실패하면 무엇을” 할지 XML 로 적습니다. 상태 기계보다 고치고 늘리기 쉽습니다.</p>
{{fig:bt}}
<p>목표는 <code>nav2_msgs/action/NavigateToPose</code> 액션으로 보냅니다. 목표는 <code>PoseStamped</code>(어느 좌표계의 어느 위치 · 방향), 피드백은 현재 위치 · 남은 거리 · 경과 시간 · 회복 횟수, 결과는 성공/실패입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface show nav2_msgs/action/NavigateToPose
ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose "{pose: {header: {frame_id: map}, pose: {position: {x: 3.5, y: 0.0}}}}" --feedback</code></pre>
<p class="small">좌표는 아래 위젯을 <b>창고</b> 세계로 바꾼 뒤 기준입니다(가운데 통로 y ≈ 0 이 비어 있음, 선반은 y ≈ ±1.35). 방(room) 세계라면 (3.6, −1.3) · (0.5, 1.0) 같은 곳을 써 보세요. 벽 · 선반 안쪽 좌표는 플래너가 거부합니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 창고에서 목적지 찍기</div>
<ol class="steps-list">
<li><b>세계 바꾸기</b> — 아래 위젯 위쪽의 세계 버튼에서 <b>창고</b>를 고르세요(위 SLAM 위젯과 시뮬레이터를 함께 씁니다).</li>
<li><b>Nav2 Goal</b> — 지도를 클릭(끌면 도착 방향)해 목표를 보내고, 초록 경로(/plan)와 로봇의 움직임을 보세요.</li>
<li><b>길 막기</b> — 🧱 장애물로 경로를 막으면 코스트맵이 바뀌고 1 Hz 재계획으로 돌아가는지 보세요. 완전히 막으면 회복 동작(Spin · BackUp)이 나옵니다.</li>
<li><b>터미널</b> — 위 <code>send_goal</code> 을 실행해 피드백의 <code>distance_remaining</code> 이 줄어드는 것을 보세요.</li>
</ol></div>
{{widget:bot|world=warehouse|mode=nav}}
<p>RViz2 로 보면 로봇 내부에서 무슨 일이 일어나는지 한눈에 보입니다. Fixed Frame 을 <code>map</code> 으로 두고 TF · LaserScan · Map · Path · RobotModel 을 켰습니다. 레이저 점이 지도 벽에 딱 붙어 있으면 위치 추정이 잘 되고 있다는 뜻입니다.</p>
{{widget:rviz|fixed=map|show=tf,scan,map,path,robot|with=bot}}`
    },

    /* ============================================================ 8 */
    {
      title: '코드로 움직이기 — 반응형 vs 계획형, BasicNavigator',
      html: `
<p>같은 “장애물 피해 돌아다니기”도 두 가지 방식이 있습니다. 두 예제를 차례로 실행해 차이를 느껴 보세요.</p>
<div class="vs"><div class="vs-a teal"><b>반응형 (reactive) — bot_avoid</b><ul><li><code>/scan</code> → 규칙 → <code>/cmd_vel</code></li><li>지도 · 위치 추정 없음, 코드 30줄</li><li>빠르지만 “어디로” 가는지는 모름 (막다른 길에서 뱅뱅)</li></ul></div><div class="vs-mid">VS</div><div class="vs-b purple"><b>계획형 (deliberative) — nav_goal</b><ul><li>목표만 액션으로 보냄</li><li>지도 + AMCL + 플래너 + 컨트롤러가 알아서</li><li>목적지까지 확실히, 대신 준비물이 많음</li></ul></div></div>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li><b>반응형</b> — 첫 번째 실습기에서 ▶ 실행. 임계값 <code>0.45</code> 와 속도를 바꿔 보세요.</li>
<li><b>계획형</b> — 두 번째 실습기를 실행하면 방(room) 세계의 세 순찰 지점 (3.6, −1.3) → (0.5, 1.0) → (0, 0) 을 차례로 돕니다. bot 위젯을 <b>방</b> 세계 · 🧭 내비게이션 모드로 두세요(그래야 /navigate_to_pose 액션 서버가 있습니다).</li>
<li><b>비교</b> — 미로에서 두 방식을 각각 써 보고, 어떤 상황에서 어느 쪽이 나은지 한 줄씩 적어 보세요.</li>
</ol></div>
{{widget:pylab|ex=bot_avoid}}
{{widget:pylab|ex=nav_goal}}
<p>계획형 코드의 핵심만 떼어 보면, <code>ActionClient</code> 로 목표 하나를 보내는 짧은 노드입니다. 아래 버튼으로도 실습기에서 실행할 수 있습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="bot"><code>import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from nav2_msgs.action import NavigateToPose


def main():
    rclpy.init()
    node = Node('one_goal')
    ac = ActionClient(node, NavigateToPose, 'navigate_to_pose')
    ac.wait_for_server()
    goal = NavigateToPose.Goal()
    goal.pose.header.frame_id = 'map'
    goal.pose.pose.position.x = 3.6            # 방(room) 세계의 빈 곳
    goal.pose.pose.position.y = -1.3
    goal.pose.pose.orientation.w = 1.0
    node.get_logger().info('목표 (3.6, -1.3) 로 출발')
    res = ac.send_goal(goal)
    node.get_logger().info(f'끝! status={res.status} (4 = SUCCEEDED)')
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<p>실제 로봇에서는 <b>nav2_simple_commander</b> 의 <code>BasicNavigator</code> 가 이런 액션 호출을 감싸 줍니다. 초기 위치 설정, Nav2 활성화 대기, 여러 지점 순찰(<code>followWaypoints</code>)을 몇 줄로 쓸 수 있습니다. (브라우저 실습기에는 이 패키지가 없어 보기용으로만 싣습니다.)</p>
<pre class="code" data-lang="python"><code>import rclpy
from geometry_msgs.msg import PoseStamped
from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult


def pose(nav, x, y):
    p = PoseStamped()
    p.header.frame_id = 'map'
    p.header.stamp = nav.get_clock().now().to_msg()
    p.pose.position.x, p.pose.position.y = x, y
    p.pose.orientation.w = 1.0
    return p


def main():
    rclpy.init()
    nav = BasicNavigator()
    nav.setInitialPose(pose(nav, 0.0, 0.0))     # = RViz 2D Pose Estimate
    nav.waitUntilNav2Active()                   # amcl · bt_navigator 활성화 대기

    nav.followWaypoints([pose(nav, 3.6, -1.3), pose(nav, 0.5, 1.0), pose(nav, 0.0, 0.0)])
    while not nav.isTaskComplete():
        fb = nav.getFeedback()
        if fb:
            print(f'웨이포인트 {fb.current_waypoint + 1} 로 가는 중')

    if nav.getResult() == TaskResult.SUCCEEDED:
        print('순찰 완료!')
    nav.lifecycleShutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
실제 서비스 로봇은 대부분 “계획형 Nav2 + 그 아래 안전용 반응형 층”을 함께 씁니다. Nav2 의 <code>collision_monitor</code> 는 컨트롤러 출력(<code>/cmd_vel</code>)을 가로채 가까운 장애물이 보이면 감속 · 정지시키는 반응형 안전 장치입니다.</div>`
    },

    /* ============================================================ 9 */
    {
      title: '실제 로봇으로 — TurtleBot · Go2',
      html: `
<p>이 장에서 쓴 명령과 코드는 <b>토픽 이름과 TF 만 맞으면</b> 실제 로봇에서도 그대로 동작합니다. <code>/scan</code>, <code>/odom</code>, <code>/tf</code>(odom → base_link), <code>/cmd_vel</code> — 이 네 가지가 Nav2 가 로봇에게 요구하는 “표준 계약”입니다.</p>
<div class="cards c3">
<div class="card green"><div class="ci">🐢</div><b>TurtleBot3</b><p>ROBOTIS 의 교육용 차동 구동 로봇. 360° LiDAR, 공식 매뉴얼에 SLAM · Nav2 따라 하기가 있어 첫 실물 로봇으로 가장 많이 씁니다.</p></div>
<div class="card blue"><div class="ci">🤖</div><b>TurtleBot4</b><p>Clearpath 제작, iRobot Create 3 바탕 + 2D LiDAR + OAK-D 카메라. ROS 2 전용으로 설계되어 slam_toolbox · Nav2 런치가 기본 제공됩니다.</p></div>
<div class="card orange"><div class="ci">🐕</div><b>Unitree Go2</b><p>다리로 걷지만 Nav2 입장에서는 똑같이 <code>/cmd_vel</code> 로 움직이는 로봇. 머리의 L1 4D LiDAR 포인트클라우드를 2D <code>/scan</code> 으로 잘라 slam_toolbox 에 넣습니다 → 18장.</p></div>
</div>
<pre class="code" data-lang="bash"><code># 실제 PC (Ubuntu 24.04 + Jazzy) 에 설치 — 브라우저 터미널에서는 실행되지 않습니다
sudo apt install ros-jazzy-navigation2 ros-jazzy-nav2-bringup ros-jazzy-slam-toolbox

# 실제 로봇 드라이버가 /scan · /odom · /tf 를 낸다면:
ros2 launch slam_toolbox online_async_launch.py
ros2 launch nav2_bringup navigation_launch.py
ros2 run rviz2 rviz2 -d $(ros2 pkg prefix nav2_bringup)/share/nav2_bringup/rviz/nav2_default_view.rviz</code></pre>
<div class="box note"><div class="box-t">🔗 연계 강좌 — Unitree Go2 로 SLAM 하기</div>
Go2 의 L1 LiDAR 데이터 경로(<code>/utlidar/cloud</code>), 포인트클라우드 → 점유 격자 가공, Point-LIO 로 3D 지도 만들기는
<a href="https://samcho93.github.io/studyGo2/lessons/e08.html" target="_blank" rel="noopener">studyGo2 E08 · L1 LiDAR · SLAM</a> 에서 자세히 다룹니다.</div>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>
Nav2 는 Open Navigation 이 주도해 매 배포판마다 기능을 늘리고 있습니다. 최근에는 충전 도크 자동 접속(<code>docking_server</code>), 미리 그린 길 그래프(route graph) 위 주행(Route Server), 3D 지도 기반 내비게이션, GPS 웨이포인트 같은 기능이 추가 · 확장되고 있으니 <a href="https://docs.nav2.org" target="_blank" rel="noopener">docs.nav2.org</a> 를 확인하세요.</div>`
    }
  ],

  videos: [
    { title: 'Easy SLAM with ROS using slam_toolbox', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=ZaiA3hWaRzE', lang: 'en', min: '25분', desc: 'slam_toolbox 로 지도를 그리고 저장 · 위치 추정 모드로 쓰는 과정을 실제 로봇으로 보여 줍니다.' },
    { title: 'Making robot navigation easy with Nav2 and ROS!', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=jkoGkAd0GYk', lang: 'en', min: '30분', desc: 'Nav2 설치 · 설정 · RViz 로 목표 보내기까지. 코스트맵 파라미터 조정 부분을 눈여겨보세요.' },
    { title: 'ROS2 Nav2 - Navigation Stack in 1 Hour [Crash Course]', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=idQb2pB-h2Q', lang: 'en', min: '60분', desc: 'TurtleBot3 시뮬레이션으로 SLAM → 지도 저장 → Nav2 → 파이썬 웨이포인트까지 한 번에 따라 하기.' },
    { title: 'ROS2 Robot Dev Kit feat Navigation2 Overview', channel: 'ROS-I Consortium', url: 'https://www.youtube.com/watch?v=4_U8lWWvQV0', lang: 'en', min: '30분', desc: 'Navigation2 초기 설계(행동 트리 · 서버 분리 · 라이프사이클)가 왜 그렇게 정해졌는지 설명하는 발표.' },
    { title: '"Nav2 MPPI controller" 영상 찾아보기', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=Nav2+MPPI+controller', lang: 'en', desc: 'MPPI · Regulated Pure Pursuit 컨트롤러 비교 데모와 ROSCon 발표를 찾아보세요.' },
    { title: '"터틀봇3 SLAM 네비게이션" 영상 찾아보기', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%ED%84%B0%ED%8B%80%EB%B4%873+SLAM+%EB%84%A4%EB%B9%84%EA%B2%8C%EC%9D%B4%EC%85%98', lang: 'ko', desc: '한국어로 된 TurtleBot3 SLAM · 내비게이션 실습 영상을 찾아보세요.' }
  ],

  terms: [
    ['SLAM', 'Simultaneous Localization And Mapping. 지도가 없는 곳에서 위치와 지도를 동시에 추정하는 기술'],
    ['오도메트리(odometry)', '바퀴 회전 · IMU 등으로 계산한 “출발점 대비 이동량”. 부드럽지만 오차가 누적(드리프트)됨. nav_msgs/msg/Odometry'],
    ['LaserScan', '2D LiDAR 한 바퀴 측정값 메시지(sensor_msgs/msg/LaserScan). angle_min · angle_increment · ranges[]'],
    ['점유 격자(OccupancyGrid)', '바닥을 칸으로 나눠 -1(모름) · 0(빈 곳) · 100(막힘)을 적은 지도. resolution · origin · data[]'],
    ['스캔 매칭(scan matching)', '새 스캔을 지도나 이전 스캔에 겹쳐 가장 잘 맞는 이동량을 찾는 과정'],
    ['루프 클로저(loop closure)', '예전에 방문한 장소를 다시 알아보고 포즈 그래프에 제약을 더해 누적 오차를 한꺼번에 줄이는 것'],
    ['slam_toolbox', 'ROS 2 의 대표 2D 그래프 기반 SLAM 패키지. online_async · sync · localization 모드'],
    ['map_saver_cli', 'nav2_map_server 의 도구. /map 을 받아 .pgm 이미지와 .yaml 메타데이터로 저장'],
    ['AMCL', 'Adaptive Monte Carlo Localization. 파티클 필터로 알려진 지도 위의 위치를 추정하고 map → odom 발행'],
    ['/initialpose', 'RViz 2D Pose Estimate 가 발행하는 초기 위치 토픽(PoseWithCovarianceStamped)'],
    ['코스트맵(costmap)', '지도에 위험 비용(0~254)을 입힌 격자. static · obstacle · inflation 층을 겹쳐 만들고 global · local 두 개를 씀'],
    ['플래너 / 컨트롤러', '플래너(planner_server)는 목표까지 전역 경로를, 컨트롤러(controller_server)는 그 경로를 따라가는 /cmd_vel 을 매 주기 계산'],
    ['행동 트리(Behavior Tree)', 'bt_navigator 가 실행하는 XML 트리. 계획 · 추종 · 회복 동작의 순서와 실패 처리를 정의'],
    ['NavigateToPose', 'Nav2 의 목표 액션(nav2_msgs/action/NavigateToPose). 목표 PoseStamped, 피드백 distance_remaining 등'],
    ['BasicNavigator', 'nav2_simple_commander 의 파이썬 도우미. goToPose · followWaypoints · isTaskComplete 등']
  ],

  summary: [
    '내비게이션 = 위치 추정(amcl · slam_toolbox) + 지도 · 목표(map_server · NavigateToPose) + 계획 · 추종(planner · controller).',
    '오도메트리는 누적 오차가 있어 odom 좌표계로 두고, SLAM/AMCL 이 map → odom 을 발행해 보정합니다 (map → odom → base_link).',
    '점유 격자는 -1/0/100 값의 칸 배열이며 resolution(m/칸)과 origin(왼쪽 아래 칸 좌표)으로 실제 좌표와 연결됩니다.',
    'slam_toolbox 는 스캔 매칭 · 포즈 그래프 · 루프 클로저로 지도를 만들고, map_saver_cli -f 로 .pgm + .yaml 을 저장합니다.',
    'Nav2 는 bt_navigator(행동 트리)가 planner · controller · behavior 서버를 액션으로 부리며, global/local 코스트맵(static · obstacle · inflation 층) 위에서 동작합니다.',
    '목표는 /navigate_to_pose 액션으로 보내고, 파이썬에서는 ActionClient 또는 BasicNavigator 를 씁니다.',
    '/scan · /odom · /tf · /cmd_vel 만 맞추면 TurtleBot 이든 Go2 든 같은 Nav2 를 그대로 씁니다.'
  ],

  quiz: [
    { q: '오도메트리만으로 오래 주행하면 위치가 점점 틀어지는 주된 이유는?', options: ['LiDAR 해상도가 낮아서', '바퀴 미끄러짐 · 지름 오차 같은 작은 오차가 적분되며 누적되어서', 'DDS 통신 지연 때문에', '지도 resolution 이 커서'], answer: 1, explain: '오도메트리는 매 순간의 이동량을 더해 가는 방식이라 작은 오차도 계속 쌓입니다(드리프트). 특히 방향 오차는 이동 거리에 비례해 위치 오차를 키웁니다.' },
    { q: 'SLAM 이나 AMCL 이 발행하는 TF 는?', options: ['map → base_link', 'odom → base_link', 'map → odom', 'base_link → laser'], answer: 2, explain: 'base_link 의 부모는 이미 odom(오도메트리 담당)이므로, 위치 추정 노드는 둘을 맞추는 map → odom 변환을 발행합니다(REP-105).' },
    { q: 'OccupancyGrid 에서 값 -1 의 뜻은?', options: ['막힘', '빈 곳', '아직 관측하지 않은 모름(unknown)', '로봇 위치'], answer: 2, explain: '-1 은 모름, 0 은 빈 곳, 100 은 막힘입니다. map_saver 가 만든 PGM 에서는 회색으로 저장됩니다.' },
    { q: 'map_saver_cli 로 저장한 my_map.yaml 의 origin 이 의미하는 것은?', options: ['로봇의 출발 위치', '지도 이미지 왼쪽 아래 칸의 map 좌표(x, y, yaw)', '지도의 가운데 좌표', '충전 도크 위치'], answer: 1, explain: 'origin 은 격자의 (0,0) 칸, 즉 이미지 왼쪽 아래 칸이 map 좌표계의 어디에 있는지를 나타냅니다.' },
    { q: 'Nav2 에서 경로를 따라가며 매 주기 /cmd_vel 을 계산하는 서버는?', options: ['planner_server', 'controller_server', 'bt_navigator', 'map_server'], answer: 1, explain: 'planner_server 는 전역 경로(/plan)를 만들고, controller_server 가 DWB · RPP · MPPI 같은 플러그인으로 그 경로를 따라가는 속도 명령을 냅니다.' },
    { q: '코스트맵의 inflation_layer 가 하는 일은?', options: ['LiDAR 가 본 새 장애물을 표시', '벽 · 장애물 주변에 거리에 따라 줄어드는 비용 띠를 둘러 로봇이 너무 붙지 않게 함', '지도 파일을 불러옴', '로봇 위치를 추정'], answer: 1, explain: 'inflation_layer 는 장애물 주변 비용을 부풀려 플래너 · 컨트롤러가 벽과 거리를 두게 합니다. 반경을 줄이면 벽에 더 붙어 다닙니다.' },
    { q: '반응형(bot_avoid)과 비교한 계획형(Nav2 NavigateToPose) 방식의 특징으로 옳은 것은?', options: ['지도와 위치 추정이 필요 없다', '막다른 길에서도 목적지까지 가는 경로를 찾을 수 있지만 지도 · 위치 추정 등 준비물이 많다', '/scan 을 전혀 쓰지 않는다', '서비스로 목표를 보낸다'], answer: 1, explain: '계획형은 지도 위에서 전역 경로를 계획하므로 목적지를 확실히 찾아가지만, 지도 · AMCL · 코스트맵 등 구성 요소가 필요합니다. 목표는 서비스가 아니라 액션으로 보냅니다.' }
  ],

  slides: [
    { title: '마트에서 우유 찾기', layout: 'center', html: `<div class="s-big">🛒 처음 온 마트에서<br>우유 코너까지 어떻게 가나요?</div><p class="s-center s-small">안내도 · 현재 위치 · 가는 길 · 사람 피하기</p>`, notes: '학생들에게 답을 받아 네 칸(지도 · 위치 · 경로 · 회피)으로 칠판에 적습니다. 수업 끝에 각 칸에 ROS 2 패키지 이름을 채울 것이라고 예고합니다. (3분)' },
    { title: '내비게이션의 세 질문', html: `{{fig:questions|nocap}}`, notes: '세 질문과 담당 노드를 짝지어 설명합니다. Nav2 는 이 세 질문을 매 순간 반복한다는 점을 강조합니다. (4분)' },
    { title: '로봇의 감각', html: `<div class="s-cols c3"><div class="card blue"><div class="ci">🔦</div><b>LiDAR</b><p>/scan<br>LaserScan</p></div><div class="card teal"><div class="ci">🛞</div><b>오도메트리</b><p>/odom<br>Odometry</p></div><div class="card orange"><div class="ci">🧭</div><b>IMU</b><p>/imu<br>Imu</p></div></div>`, notes: '세 센서의 토픽 · 메시지 이름을 짚고 각각의 약점(유리, 미끄러짐, 적분 드리프트)을 묻습니다. 실습 창에서 ros2 topic echo /scan --once 를 함께 봅니다. (5분)' },
    { title: '오도메트리는 왜 틀어질까?', html: `{{widget:odom}}`, notes: '정사각형 주행으로 드리프트를 직접 보여 줍니다. 바퀴 지름 오차를 키워 보며 “방향 오차가 위치 오차를 키운다”를 확인합니다. (6분)' },
    { title: 'map → odom → base_link', html: `{{fig:tfchain|nocap}}`, notes: 'odom 은 연속 · 드리프트, map 은 정확 · 불연속. 위치 추정 노드가 map → odom 을 내는 이유(부모 하나 규칙)를 설명합니다. (4분)' },
    { title: '점유 격자 지도', html: `{{fig:grid|nocap}}`, notes: '-1/0/100, resolution, origin 을 설명하고 20 m × 20 m 를 5 cm 로 나누면 몇 칸인지 계산시켜 봅니다(400×400). (5분)' },
    { title: 'SLAM 의 속', html: `{{fig:posegraph|nocap}}`, notes: '스캔 매칭 → 포즈 그래프 → 루프 클로저 → 최적화 순서로 설명합니다. 한 바퀴 돌아 출발점을 알아보는 순간 지도가 펴진다는 점이 핵심입니다. (5분)' },
    { title: '직접 지도 그리기', html: `{{widget:bot|world=maze|mode=slam|teleop=1}}`, notes: '학생들이 미로를 한 바퀴 돌며 지도를 그리게 합니다. 천천히 돌아야 한다는 점, 저장하면 .pgm 과 .yaml 이 생긴다는 점을 확인합니다. (10분)' },
    { title: 'AMCL — 파티클 필터', html: `{{fig:amcl|nocap}}`, notes: '뿌리기 → 움직이기 → 채점 → 다시 뽑기. 2D Pose Estimate 는 /initialpose 에 메시지 하나를 보내는 것뿐임을 알려 줍니다. (5분)' },
    { title: 'Nav2 구조', html: `{{fig:nav2arch|nocap}}`, notes: 'bt_navigator 가 지휘하고 세 서버가 액션으로 일을 받는 구조를 5장 액션과 연결합니다. lifecycle_manager 는 11장 관리형 노드입니다. (6분)' },
    { title: '코스트맵의 층', html: `{{fig:costmap|nocap}}`, notes: 'static + obstacle + inflation. 팽창 반경을 줄이면 로봇이 벽에 붙는다는 것을 ros2 param set 으로 보여 줄 수 있습니다. (4분)' },
    { title: '플래너 · 컨트롤러 고르기', html: `<div class="s-cols"><div class="card blue"><b>🧭 플래너</b><p>NavFn · Smac(2D · Hybrid-A* · Lattice) · Theta*</p></div><div class="card orange"><b>🕹️ 컨트롤러</b><p>DWB · Regulated Pure Pursuit · MPPI</p></div></div><p class="s-center s-small">YAML 의 plugin 한 줄로 교체</p>`, notes: '로봇 모양 · 운동 특성에 따라 알고리즘을 고른다는 관점으로 설명합니다. 자동차형 로봇은 Hybrid-A*, 창고 AMR 은 RPP 같은 예를 듭니다. (4분)' },
    { title: '행동 트리', html: `{{fig:bt|nocap}}`, notes: '기본 NavigateToPose BT 를 줄인 그림입니다. 1 Hz 재계획과 회복 동작의 흐름을 따라가 봅니다. XML 만 바꾸면 행동이 바뀐다는 점을 강조합니다. (4분)' },
    { title: '목표 보내기', html: `<pre class="code" data-lang="bash"><code>ros2 action send_goal /navigate_to_pose \\
  nav2_msgs/action/NavigateToPose \\
  "{pose: {header: {frame_id: map},
    pose: {position: {x: 3.5, y: 0.0}}}}" --feedback</code></pre>`, notes: '목표 · 피드백 · 결과 구조를 짚고, 이 명령과 RViz Nav2 Goal 버튼, 파이썬 ActionClient 가 모두 같은 액션을 쓴다는 점을 확인합니다. 이어서 본문의 창고 위젯으로 실습합니다. (8분)' },
    { title: '반응형 vs 계획형', html: `<div class="vs"><div class="vs-a teal"><b>bot_avoid</b><ul><li>/scan → /cmd_vel</li><li>지도 없음 · 빠름</li></ul></div><div class="vs-mid">VS</div><div class="vs-b purple"><b>nav_goal</b><ul><li>목표 → Nav2</li><li>지도 · 경로 · 회복</li></ul></div></div>`, notes: '두 예제를 실습기에서 돌려 보게 하고, 실제 제품은 두 방식을 층으로 겹쳐 쓴다는 점(collision_monitor)을 덧붙입니다. (8분)' },
    { title: '같은 계약, 다른 로봇', layout: 'center', html: `<div class="s-big">/scan · /odom · /tf · /cmd_vel</div><p class="s-center">🐢 TurtleBot · 🤖 webbot · 🐕 Go2 — 모두 같은 Nav2</p>`, notes: '표준 인터페이스만 맞추면 같은 Nav2 가 어떤 로봇에도 붙는다는 메시지로 마무리하고, 18장 Go2 에서 다시 만날 것을 예고합니다. (2분)' }
  ]
});
