/* 21장 — 종합 프로젝트와 로드맵 */
Course.lesson({
  id: 'ch21', no: '21',
  icon: '🏁',
  title: '종합 프로젝트와 로드맵',
  subtitle: '지금까지 배운 모든 것을 모아 순찰 로봇을 만들고, 다음 걸음을 정합니다',
  level: '종합', time: '180분',
  goals: [
    '요구사항에서 출발해 노드 · 토픽 · 액션 구조를 rqt_graph 모양으로 설계할 수 있다',
    '런치 파일 하나로 Nav2 · 순찰 관리자 · 장애물 감시 · rosbridge 를 함께 실행하는 구조를 작성할 수 있다',
    'NavigateToPose 액션으로 웨이포인트를 순찰하고, /scan 감시 · rosbag2 기록 · RViz 대시보드로 동작을 확인할 수 있다',
    'source · 도메인 · QoS · TF · use_sim_time 등 자주 만나는 문제를 진단 명령으로 찾아낼 수 있다',
    '공식 문서 · 커뮤니티 · 연계 강좌를 활용한 다음 학습 계획을 세울 수 있다'
  ],
  teacher: {
    intro: '“밤에 아무도 없는 창고를 로봇 혼자 돌아다니며 지키게 하려면 무엇이 필요할까요?” 하고 묻고, 학생들의 답(지도, 길 찾기, 장애물, 카메라, 기록, 원격 확인 …)을 칠판에 적습니다. 적힌 단어 하나하나가 이 강좌의 어느 장이었는지 짝지어 보며 “오늘은 이것을 전부 합칩니다”라고 시작합니다. (5분)',
    flow: '① 요구사항 정리 15분 → ② 노드 · 토픽 설계 20분 → ③ 런치 파일 15분 → ④ 웨이포인트 순찰 실습 30분 → ⑤ 장애물 감시 노드 20분 → ⑥ rosbag2 · RViz 대시보드 20분 → ⑦ 다른 종합 프로젝트 소개 15분 → ⑧ 디버깅 체크리스트 20분 → ⑨ 로드맵 · 최종 퀴즈 25분'
  },

  figs: {
    /* ---------------------------------------------------------------- 순찰 로봇 그래프 */
    patrolGraph: {
      caption: '순찰 로봇의 노드 · 토픽 설계 (rqt_graph 모양) — 파랑 타원 = 노드, 초록 사각형 = 토픽, 보라 = 액션',
      svg: `<svg class="dg" viewBox="0 0 900 440" role="img" aria-label="webbot, amcl, map_server, Nav2, patrol_manager, obstacle_monitor, rosbridge, rosbag2 노드와 토픽 연결">
  <ellipse cx="90" cy="210" rx="72" ry="34" class="blue"/><text x="90" y="204" class="t-sm t-c t-b">/webbot</text><text x="90" y="222" class="t-xs t-c t-mu">로봇 · 시뮬레이터</text>
  <line x1="150" y1="190" x2="210" y2="120" class="ln ar"/>
  <line x1="162" y1="206" x2="210" y2="206" class="ln ar"/>
  <line x1="150" y1="230" x2="210" y2="292" class="ln ar"/>
  <rect x="210" y="102" width="90" height="34" rx="6" class="green"/><text x="255" y="119" class="t-xs t-c t-mono">/scan</text>
  <rect x="210" y="189" width="90" height="34" rx="6" class="green"/><text x="255" y="206" class="t-xs t-c t-mono">/odom</text>
  <rect x="210" y="276" width="90" height="34" rx="6" class="green"/><text x="255" y="293" class="t-xs t-c t-mono">/tf</text>

  <ellipse cx="400" cy="60" rx="62" ry="26" class="blue"/><text x="400" y="60" class="t-xs t-c">/map_server</text>
  <rect x="470" y="44" width="80" height="32" rx="6" class="green"/><text x="510" y="60" class="t-xs t-c t-mono">/map</text>
  <line x1="462" y1="60" x2="470" y2="60" class="ln ar"/>
  <ellipse cx="400" cy="206" rx="80" ry="40" class="blue"/><text x="400" y="198" class="t-sm t-c t-b">Nav2</text><text x="400" y="218" class="t-xs t-c t-mu">amcl · planner · controller</text>
  <line x1="300" y1="119" x2="336" y2="180" class="ln ar"/>
  <line x1="300" y1="206" x2="320" y2="206" class="ln ar"/>
  <line x1="300" y1="293" x2="336" y2="232" class="ln ar"/>
  <line x1="510" y1="76" x2="450" y2="172" class="ln ar"/>
  <rect x="330" y="290" width="100" height="32" rx="6" class="green"/><text x="380" y="306" class="t-xs t-c t-mono">/cmd_vel</text>
  <line x1="390" y1="246" x2="385" y2="290" class="ln ar"/>
  <path d="M330,306 C200,370 90,330 90,244" class="ln nofill ar"/>
  <rect x="440" y="290" width="80" height="32" rx="6" class="green"/><text x="480" y="306" class="t-xs t-c t-mono">/plan</text>
  <line x1="430" y1="240" x2="470" y2="290" class="ln ar"/>

  <rect x="530" y="186" width="150" height="40" rx="8" class="purple"/><text x="605" y="206" class="t-xs t-c t-mono">navigate_to_pose</text>
  <line x1="680" y1="206" x2="700" y2="206" class="ln-purple ar2"/>
  <line x1="530" y1="206" x2="482" y2="206" class="ln-purple ar2"/>
  <ellipse cx="780" cy="206" rx="80" ry="34" class="blue"/><text x="780" y="200" class="t-sm t-c t-b">/patrol_manager</text><text x="780" y="218" class="t-xs t-c t-mu">웨이포인트 · 상태</text>
  <line x1="780" y1="240" x2="780" y2="270" class="ln ar"/>
  <rect x="705" y="270" width="150" height="32" rx="6" class="green"/><text x="780" y="286" class="t-xs t-c t-mono">/patrol/status</text>

  <ellipse cx="610" cy="110" rx="82" ry="28" class="blue"/><text x="610" y="110" class="t-xs t-c t-b">/obstacle_monitor</text>
  <path d="M300,112 C420,95 470,105 528,110" class="ln nofill ar"/>
  <line x1="692" y1="110" x2="720" y2="110" class="ln ar"/>
  <rect x="720" y="94" width="160" height="32" rx="6" class="green"/><text x="800" y="110" class="t-xs t-c t-mono">/patrol/obstacle</text>
  <line x1="800" y1="126" x2="790" y2="172" class="ln dash ar"/>

  <ellipse cx="640" cy="380" rx="100" ry="28" class="blue"/><text x="640" y="380" class="t-xs t-c">/rosbridge_websocket</text>
  <ellipse cx="840" cy="380" rx="52" ry="28" class="blue"/><text x="840" y="380" class="t-xs t-c">/rosbag2</text>
  <line x1="780" y1="302" x2="660" y2="352" class="ln dash ar"/>
  <line x1="800" y1="302" x2="830" y2="352" class="ln dash ar"/>
  <text x="640" y="420" class="t-xs t-c t-mu">웹 대시보드로 중계</text>
  <text x="840" y="420" class="t-xs t-c t-mu">기록</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 임무 상태 기계 */
    missionFsm: {
      caption: '순찰 관리자의 상태 기계 — 이동 중 장애물 경보가 오면 멈추고, 실패하면 다음 지점으로 건너뜁니다',
      svg: `<svg class="dg" viewBox="0 0 900 330" role="img" aria-label="대기, 이동, 도착 점검, 일시 정지, 건너뛰기, 완료 상태 사이의 전이">
  <rect x="30" y="130" width="120" height="56" rx="28" class="gray"/><text x="90" y="158" class="t-sm t-c t-b">대기 IDLE</text>
  <line x1="150" y1="158" x2="220" y2="158" class="ln ar"/><text x="185" y="144" class="t-xs t-c">시작</text>
  <rect x="220" y="130" width="160" height="56" rx="28" class="s-blue"/><text x="300" y="150" class="t-sm t-c tw t-b">이동 GOING</text><text x="300" y="170" class="t-xs t-c tw">send_goal(wp[i])</text>
  <line x1="380" y1="158" x2="470" y2="158" class="ln-green ar-green"/><text x="425" y="144" class="t-xs t-c t-green">성공(4)</text>
  <rect x="470" y="130" width="160" height="56" rx="28" class="green"/><text x="550" y="150" class="t-sm t-c t-b">도착 점검</text><text x="550" y="170" class="t-xs t-c">status 발행 · 사진</text>
  <path d="M550,130 C550,60 300,60 300,128" class="ln-green nofill ar-green"/><text x="425" y="56" class="t-xs t-c t-green">i += 1 (남은 지점 있음)</text>
  <line x1="630" y1="158" x2="720" y2="158" class="ln ar"/><text x="675" y="144" class="t-xs t-c">마지막 지점</text>
  <rect x="720" y="130" width="150" height="56" rx="28" class="teal"/><text x="795" y="158" class="t-sm t-c t-b">완료 DONE</text>
  <rect x="140" y="250" width="200" height="56" rx="28" class="orange"/><text x="240" y="270" class="t-sm t-c t-b">일시 정지 PAUSED</text><text x="240" y="290" class="t-xs t-c">/patrol/obstacle = true</text>
  <line x1="270" y1="186" x2="250" y2="250" class="ln-orange ar-orange"/>
  <line x1="290" y1="250" x2="310" y2="186" class="ln-orange dash ar-orange"/>
  <text x="195" y="222" class="t-xs t-c t-orange">경보</text><text x="340" y="222" class="t-xs t-c t-orange">해제</text>
  <rect x="420" y="250" width="200" height="56" rx="28" class="red"/><text x="520" y="270" class="t-sm t-c t-b">건너뛰기 SKIP</text><text x="520" y="290" class="t-xs t-c">실패 기록 후 다음 지점</text>
  <line x1="350" y1="180" x2="440" y2="250" class="ln-red ar-red"/><text x="420" y="214" class="t-xs t-c t-red">실패 · 시간 초과</text>
  <path d="M620,278 C700,278 700,210 620,180" class="ln-red dash nofill ar-red"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 런치 구조 */
    launchTree: {
      caption: 'robot.launch.py 한 파일이 Nav2 런치를 include 하고, 우리가 만든 노드 · rosbridge 를 파라미터와 함께 띄웁니다',
      svg: `<svg class="dg" viewBox="0 0 900 340" role="img" aria-label="robot launch 파일이 nav2 bringup 을 포함하고 patrol_manager, obstacle_monitor, rosbridge 노드를 실행">
  <rect x="330" y="20" width="240" height="56" rx="12" class="s-orange"/>
  <text x="450" y="42" class="t-sm t-c tw t-b">patrol_bringup/robot.launch.py</text>
  <text x="450" y="62" class="t-xs t-c tw">인자: map · use_sim_time</text>
  <line x1="390" y1="76" x2="140" y2="130" class="ln ar"/>
  <line x1="430" y1="76" x2="370" y2="130" class="ln ar"/>
  <line x1="480" y1="76" x2="590" y2="130" class="ln ar"/>
  <line x1="520" y1="76" x2="790" y2="130" class="ln ar"/>
  <rect x="30" y="130" width="220" height="190" rx="12" class="purple"/>
  <text x="140" y="154" class="t-sm t-c t-b t-purple">IncludeLaunchDescription</text>
  <text x="140" y="176" class="t-xs t-c t-mono">nav2_bringup/bringup_launch.py</text>
  <ellipse cx="140" cy="210" rx="80" ry="16" class="box"/><text x="140" y="210" class="t-xs t-c">map_server · amcl</text>
  <ellipse cx="140" cy="248" rx="80" ry="16" class="box"/><text x="140" y="248" class="t-xs t-c">planner · controller</text>
  <ellipse cx="140" cy="286" rx="80" ry="16" class="box"/><text x="140" y="286" class="t-xs t-c">bt_navigator · …</text>
  <ellipse cx="370" cy="170" rx="100" ry="34" class="blue"/><text x="370" y="164" class="t-sm t-c">patrol_manager</text><text x="370" y="184" class="t-xs t-c t-mu">patrol.yaml</text>
  <ellipse cx="590" cy="170" rx="100" ry="34" class="blue"/><text x="590" y="164" class="t-sm t-c">obstacle_monitor</text><text x="590" y="184" class="t-xs t-c t-mu">respawn=True</text>
  <ellipse cx="790" cy="170" rx="95" ry="34" class="blue"/><text x="790" y="164" class="t-sm t-c">rosbridge_websocket</text><text x="790" y="184" class="t-xs t-c t-mu">port 9090</text>
  <rect x="280" y="240" width="590" height="80" rx="12" class="box"/>
  <text x="300" y="264" class="t-xs t-mono">ros2 launch patrol_bringup robot.launch.py use_sim_time:=true</text>
  <text x="300" y="290" class="t-xs">→ 터미널 한 개 · 명령 한 줄 · systemd 서비스로 등록하기도 쉬움 (20장)</text>
  <text x="300" y="310" class="t-xs t-mu">(이 사이트에서는 bot 위젯의 nav 모드가 같은 구성을 대신 띄워 줍니다)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 디버깅 흐름 */
    debugFlow: {
      caption: '“안 돼요!” 를 만났을 때 — 그래프의 바깥(환경)에서 안쪽(데이터 · TF)으로 하나씩 좁혀 갑니다',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="환경, 노드, 연결, 데이터, 좌표계 순서로 문제를 좁혀 가는 디버깅 흐름">
  <rect x="20" y="30" width="160" height="70" rx="12" class="red"/><text x="100" y="56" class="t-sm t-c t-b">① 환경</text><text x="100" y="80" class="t-xs t-c">source? 도메인?</text>
  <rect x="200" y="30" width="160" height="70" rx="12" class="orange"/><text x="280" y="56" class="t-sm t-c t-b">② 노드</text><text x="280" y="80" class="t-xs t-c">살아 있나? 이름?</text>
  <rect x="380" y="30" width="160" height="70" rx="12" class="yellow"/><text x="460" y="56" class="t-sm t-c t-b">③ 연결</text><text x="460" y="80" class="t-xs t-c">토픽 이름 · 타입 · QoS</text>
  <rect x="560" y="30" width="160" height="70" rx="12" class="green"/><text x="640" y="56" class="t-sm t-c t-b">④ 데이터</text><text x="640" y="80" class="t-xs t-c">값 · 주기 · 시간</text>
  <rect x="740" y="30" width="140" height="70" rx="12" class="blue"/><text x="810" y="56" class="t-sm t-c t-b">⑤ 좌표계</text><text x="810" y="80" class="t-xs t-c">TF 트리</text>
  <line x1="180" y1="65" x2="200" y2="65" class="ln ar"/><line x1="360" y1="65" x2="380" y2="65" class="ln ar"/><line x1="540" y1="65" x2="560" y2="65" class="ln ar"/><line x1="720" y1="65" x2="740" y2="65" class="ln ar"/>
  <text x="100" y="130" class="t-xs t-c t-mono">printenv | grep ROS</text>
  <text x="100" y="152" class="t-xs t-c t-mono">ros2 doctor</text>
  <text x="280" y="130" class="t-xs t-c t-mono">ros2 node list</text>
  <text x="280" y="152" class="t-xs t-c t-mono">ros2 node info</text>
  <text x="460" y="130" class="t-xs t-c t-mono">ros2 topic info -v</text>
  <text x="460" y="152" class="t-xs t-c t-mono">rqt_graph</text>
  <text x="640" y="130" class="t-xs t-c t-mono">ros2 topic echo · hz</text>
  <text x="640" y="152" class="t-xs t-c t-mono">rqt_plot · ros2 bag</text>
  <text x="810" y="130" class="t-xs t-c t-mono">view_frames</text>
  <text x="810" y="152" class="t-xs t-c t-mono">tf2_echo</text>
  <rect x="20" y="190" width="860" height="150" rx="14" class="box"/>
  <text x="40" y="216" class="t-sm t-b">🔎 좁혀 가기의 원칙</text>
  <text x="40" y="244" class="t-sm">• 한 번에 하나만 바꾸고 다시 확인합니다. (두 개를 바꾸면 무엇이 고쳤는지 모름)</text>
  <text x="40" y="270" class="t-sm">• 문제를 작게 만듭니다: 노드 하나 + ros2 topic pub/echo 로 재현되면 절반은 해결.</text>
  <text x="40" y="296" class="t-sm">• 로그 수준을 올립니다: --ros-args --log-level debug  ·  rqt_console 로 경고를 모아 보기.</text>
  <text x="40" y="322" class="t-sm">• 재현 가능한 기록을 남깁니다: ros2 bag record 로 문제 상황을 저장해 두고 반복 재생.</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 로드맵 */
    roadmap: `<ol class="timeline">
  <li class="blue"><span class="tl-y">1단계</span><b>공식 튜토리얼 끝까지</b><p>docs.ros.org 의 Beginner → Intermediate → Advanced 를 실제 Ubuntu 에서 한 번씩. 이 강좌의 브라우저 실습을 실제 터미널로 옮겨 보기.</p></li>
  <li class="teal"><span class="tl-y">2단계</span><b>실제 로봇 한 대</b><p>TurtleBot3/4 · SO-ARM101 · 직접 만든 차동 구동 로봇 + micro-ROS. 시뮬레이터(Gazebo)와 실물을 같은 코드로 돌려 보기.</p></li>
  <li class="orange"><span class="tl-y">3단계</span><b>한 분야 깊게</b><p>이동 로봇이면 Nav2 · SLAM, 로봇팔이면 MoveIt 2 · ros2_control, AI 면 비전 · LeRobot · Isaac ROS.</p></li>
  <li class="purple"><span class="tl-y">4단계</span><b>C++ · 성능 · 품질</b><p>rclcpp, 컴포넌트 · 인트라 프로세스, 테스트(launch_testing) · CI, 실시간성, 보안(SROS2).</p></li>
  <li class="green"><span class="tl-y">5단계</span><b>나누고 기여하기</b><p>GitHub 에 패키지 공개, ROS Discourse · 오로카에서 질문 · 답변, ROSCon 발표 보기 · 하기.</p></li>
</ol>`
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '프로젝트 소개 — 순찰 로봇의 요구사항',
      html: `
<p>마지막 장에서는 지금까지 배운 것을 모아 <b>순찰 로봇(patrol robot)</b>을 만듭니다. 실제 회사에서 로봇을 만들 때처럼 “무엇을 해야 하는가(요구사항)”부터 정리하고, 그다음 “어떻게 나눌까(설계)”, “어떻게 띄울까(런치)”, “제대로 되나(검증)” 순서로 진행합니다.</p>
<div class="box analogy"><div class="box-t">🍳 비유 — 야간 경비원</div>경비원은 ① 정해진 순서로 건물을 돌고 ② 복도에 뭔가 막혀 있으면 멈춰서 확인하고 ③ 돌았던 기록을 일지에 남기고 ④ 관제실 모니터로 위치를 알립니다. 순찰 로봇도 똑같습니다.</div>
<table class="tbl">
<tr><th>#</th><th>요구사항</th><th>구현 방법</th><th>배운 장</th></tr>
<tr><td>R1</td><td>지도 위 여러 지점을 정해진 순서로 반복 방문</td><td>Nav2 <code>navigate_to_pose</code> 액션 + 순찰 관리자 노드</td><td>5 · 9 · 16장</td></tr>
<tr><td>R2</td><td>앞에 장애물이 가까우면 경보</td><td><code>/scan</code> 구독 → <code>/patrol/obstacle</code> 발행</td><td>2 · 8 · 11장</td></tr>
<tr><td>R3</td><td>현재 상태를 사람이 읽을 수 있게 알림</td><td><code>/patrol/status</code>(String), rosbridge 웹 대시보드</td><td>2 · 20장</td></tr>
<tr><td>R4</td><td>순찰 기록을 남기고 나중에 재생</td><td><code>ros2 bag record</code></td><td>14장</td></tr>
<tr><td>R5</td><td>지도 · 경로 · 로봇 위치를 화면으로 확인</td><td>RViz2 (Map · LaserScan · Path · TF · RobotModel)</td><td>12 · 13장</td></tr>
<tr><td>R6</td><td>명령 한 줄로 전체 실행, 부팅 시 자동 시작</td><td>런치 파일 + systemd</td><td>10 · 20장</td></tr>
</table>
<div class="stats">
  <div class="stat blue"><b>3 곳</b><span>순찰 지점 (방 세계)</span></div>
  <div class="stat orange"><b>0.5 m</b><span>장애물 경보 거리</span></div>
  <div class="stat green"><b>1 줄</b><span>ros2 launch 로 전체 실행</span></div>
  <div class="stat purple"><b>0 번</b><span>사람이 조종하는 횟수</span></div>
</div>
<div class="box note"><div class="box-t">📌 이 장의 실습 환경</div>Gazebo 대신 이 사이트의 <b>webbot 시뮬레이터(bot 위젯)</b>를 씁니다. 차동 구동 로봇 · LiDAR · 지도 · AMCL · Nav2(간소화)가 실제와 같은 토픽 · 액션 이름으로 동작하므로, 여기서 짠 파이썬 노드는 실제 TurtleBot + Nav2 에서도 그대로 쓸 수 있습니다.</div>`
    },

    /* ============================================================ 2 */
    {
      title: '설계 — 노드와 토픽 나누기',
      html: `
<p>좋은 설계의 원칙은 <b>“한 노드는 한 가지 일”</b>입니다. 로봇 드라이버(시뮬레이터)와 Nav2 는 이미 있는 것을 쓰고, 우리는 <b>순찰 관리자</b>와 <b>장애물 감시</b> 두 노드만 새로 만듭니다.</p>
{{fig:patrolGraph}}
<table class="tbl">
<tr><th>이름</th><th>종류 · 타입</th><th>누가 → 누구에게</th></tr>
<tr><td><code>/scan</code></td><td>토픽 · <code>sensor_msgs/msg/LaserScan</code> (BEST_EFFORT)</td><td>webbot → Nav2, obstacle_monitor</td></tr>
<tr><td><code>/odom</code> · <code>/tf</code></td><td>토픽 · <code>nav_msgs/msg/Odometry</code> · <code>tf2_msgs/msg/TFMessage</code></td><td>webbot · amcl → Nav2 · RViz</td></tr>
<tr><td><code>/map</code></td><td>토픽 · <code>nav_msgs/msg/OccupancyGrid</code> (TRANSIENT_LOCAL)</td><td>map_server → Nav2 · RViz</td></tr>
<tr><td><code>navigate_to_pose</code></td><td>액션 · <code>nav2_msgs/action/NavigateToPose</code></td><td>patrol_manager → Nav2</td></tr>
<tr><td><code>/patrol/obstacle</code></td><td>토픽 · <code>std_msgs/msg/Bool</code></td><td>obstacle_monitor → patrol_manager · 대시보드</td></tr>
<tr><td><code>/patrol/status</code></td><td>토픽 · <code>std_msgs/msg/String</code></td><td>patrol_manager → 대시보드 · rosbag2</td></tr>
</table>
<p>순찰 관리자는 “지금 무엇을 하는 중인가”를 <b>상태 기계</b>로 관리합니다. 상태를 명확히 나눠 두면 “장애물 때문에 멈춘 건지, 목표를 못 찾은 건지”를 로그만 보고도 알 수 있습니다.</p>
{{fig:missionFsm}}
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 인터페이스부터 합의</div>팀으로 개발할 때는 위 표(토픽 이름 · 타입 · QoS)를 먼저 정해 문서로 공유합니다. 그러면 한 사람은 순찰 관리자를, 다른 사람은 웹 대시보드를 동시에 만들 수 있습니다. 표준 메시지로 부족하면 3장 방식으로 <code>patrol_interfaces</code> 패키지를 따로 만듭니다.</div>`
    },

    /* ============================================================ 3 */
    {
      title: '런치 파일로 한 번에 띄우기',
      html: `
<p>노드가 여러 개가 되면 터미널을 여러 개 여는 대신 <b>런치 파일</b> 하나로 묶습니다(10장). Nav2 전체는 공식 <code>nav2_bringup</code> 의 런치를 <b>include</b> 하고, 우리 노드는 파라미터 파일과 함께 추가합니다.</p>
{{fig:launchTree}}
<pre class="code" data-lang="python"><code><span class="cm"># patrol_bringup/launch/robot.launch.py</span>
import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument, IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    nav2_dir = get_package_share_directory('nav2_bringup')
    my_dir = get_package_share_directory('patrol_bringup')
    use_sim_time = LaunchConfiguration('use_sim_time')

    return LaunchDescription([
        DeclareLaunchArgument('use_sim_time', default_value='true'),
        DeclareLaunchArgument('map', default_value=os.path.join(my_dir, 'maps', 'room.yaml')),

        IncludeLaunchDescription(
            PythonLaunchDescriptionSource(os.path.join(nav2_dir, 'launch', 'bringup_launch.py')),
            launch_arguments={'map': LaunchConfiguration('map'),
                              'use_sim_time': use_sim_time}.items()),

        Node(package='patrol_robot', executable='patrol_manager', name='patrol_manager',
             parameters=[os.path.join(my_dir, 'config', 'patrol.yaml'),
                         {'use_sim_time': use_sim_time}],
             output='screen'),
        Node(package='patrol_robot', executable='obstacle_monitor', name='obstacle_monitor',
             parameters=[{'warn_dist': 0.5, 'use_sim_time': use_sim_time}],
             respawn=True),
        Node(package='rosbridge_server', executable='rosbridge_websocket',
             name='rosbridge_websocket'),
    ])</code></pre>
<pre class="code" data-lang="yaml"><code><span class="cm"># patrol_bringup/config/patrol.yaml — 파라미터는 평평한 배열로 (x0, y0, x1, y1, …)</span>
patrol_manager:
  ros__parameters:
    waypoints: [3.6, -1.3, 0.5, 1.0, 0.0, 0.0]
    laps: 3</code></pre>
<div class="box warn"><div class="box-t">⚠️ use_sim_time 은 모두 같게</div>시뮬레이터(Gazebo)는 <code>/clock</code> 으로 시뮬레이션 시간을 발행합니다. 어떤 노드는 <code>use_sim_time:=true</code>, 어떤 노드는 false 면 TF 시간이 어긋나 “extrapolation into the future” 같은 오류가 납니다. 런치 인자 하나로 <b>모든 노드에 같은 값</b>을 넘기세요. 실제 로봇에서는 false 입니다.</div>
<p>런치 파일의 include · 인자 · 리매핑 구조를 아래 위젯에서 다시 확인해 보세요.</p>
{{widget:launch|preset=include}}`
    },

    /* ============================================================ 4 */
    {
      title: '웨이포인트 순찰 — Nav2 액션으로 돌아다니기',
      html: `
<p>이제 로봇을 움직입니다. 아래 bot 위젯은 <b>방(room) 세계</b>에서 map_server · AMCL · Nav2 를 켠 상태(nav 모드)로 시작합니다. 지도 위를 클릭하면 2D Goal 을 줄 수 있고, 코드로는 <code>navigate_to_pose</code> 액션을 호출합니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 손으로 한 번, 명령으로 한 번, 코드로 한 번</div>
<ol class="steps-list">
<li><b>손으로</b> — bot 위젯의 지도에서 빈 곳을 클릭해 목표를 주고, 경로(초록 선)와 로봇 이동을 관찰합니다.</li>
<li><b>명령으로</b> — 아래 <code>ros2 action send_goal</code> 블록을 실행해 창가 지점 (3.6, −1.3) 으로 보냅니다. 피드백의 <code>distance_remaining</code> 이 줄어드는지 보세요.</li>
<li><b>예제 코드로</b> — 파이썬 실습기의 nav_goal 예제를 실행해 세 지점을 차례로 방문합니다.</li>
<li><b>내 순찰 관리자로</b> — 맨 아래 코드(상태 발행 + 여러 바퀴)를 실행하고, 터미널에서 <code>ros2 topic echo /patrol/status</code> 로 보고를 받습니다.</li>
</ol></div>
{{widget:bot|world=room|mode=nav}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 action list -t
ros2 action send_goal /navigate_to_pose nav2_msgs/action/NavigateToPose "{pose: {header: {frame_id: map}, pose: {position: {x: 3.6, y: -1.3}, orientation: {w: 1.0}}}}" --feedback</code></pre>
{{widget:pylab|ex=nav_goal|with=bot}}
<p>예제를 조금 키워 “순찰 관리자”를 만듭니다. 지점마다 이름을 붙이고, 여러 바퀴를 돌며, 상황을 <code>/patrol/status</code> 로 발행합니다. 결과 상태 4 는 <code>GoalStatus.STATUS_SUCCEEDED</code> 입니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="bot"><code>import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from nav2_msgs.action import NavigateToPose
from std_msgs.msg import String

WAYPOINTS = [('창가', 3.6, -1.3), ('소파 옆', 0.5, 1.0), ('출발점', 0.0, 0.0)]


class PatrolManager(Node):
    def __init__(self):
        super().__init__('patrol_manager')
        self.declare_parameter('laps', 2)
        self.ac = ActionClient(self, NavigateToPose, 'navigate_to_pose')
        self.status = self.create_publisher(String, '/patrol/status', 10)

    def report(self, text):
        self.status.publish(String(data=text))
        self.get_logger().info(text)

    def go(self, x, y):
        goal = NavigateToPose.Goal()
        goal.pose.header.frame_id = 'map'
        goal.pose.pose.position.x = x
        goal.pose.pose.position.y = y
        goal.pose.pose.orientation.w = 1.0
        res = self.ac.send_goal(goal)
        return res.status == 4              # 4 = STATUS_SUCCEEDED

    def run(self):
        self.ac.wait_for_server()
        laps = self.get_parameter('laps').value
        for lap in range(1, laps + 1):
            for name, x, y in WAYPOINTS:
                self.report(f'[{lap}/{laps}바퀴] {name} ({x}, {y}) 로 이동')
                if self.go(x, y):
                    self.report(f'{name} 도착 — 이상 없음')
                else:
                    self.report(f'{name} 이동 실패 — 다음 지점으로 건너뜀')
        self.report('순찰 완료')


def main():
    rclpy.init()
    node = PatrolManager()
    node.run()
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /patrol/status</code></pre>
<div class="box note"><div class="box-t">📌 실제 로봇에서는 nav2_simple_commander</div>실제 rclpy 의 동기 <code>send_goal()</code> 은 다른 스레드에서 노드가 spin 되고 있어야 결과를 받을 수 있습니다. 실무에서는 Nav2 가 제공하는 파이썬 API <code>nav2_simple_commander</code> 를 많이 씁니다.
<pre class="code" data-lang="python"><code>from nav2_simple_commander.robot_navigator import BasicNavigator, TaskResult
nav = BasicNavigator()
nav.waitUntilNav2Active()                      <span class="cm"># AMCL · Nav2 가 준비될 때까지</span>
poses = [make_pose(nav, 3.6, -1.3), make_pose(nav, 0.5, 1.0), make_pose(nav, 0.0, 0.0)]
nav.followWaypoints(poses)                     <span class="cm"># 또는 goThroughPoses / goToPose</span>
while not nav.isTaskComplete():
    fb = nav.getFeedback()                     <span class="cm"># 현재 몇 번째 지점인지 등</span>
print(nav.getResult() == TaskResult.SUCCEEDED)</code></pre></div>
<div class="box tip"><div class="box-t">💡 도전 — 창고 세계로 확장</div>bot 위젯 위쪽의 <b>창고</b> 버튼으로 세계를 바꾸면 8 × 6 m 물류 창고가 됩니다. 선반은 y ≈ ±1.35 부근에 있으니 가운데 통로(예: <code>(3.5, 0.0)</code>)와 끝 지점(<code>(6.3, 2.0)</code>)처럼 빈 곳을 골라 <code>WAYPOINTS</code> 를 바꿔 보세요.</div>`
    },

    /* ============================================================ 5 */
    {
      title: '장애물 감시 — /scan 으로 경보 내기',
      html: `
<p>Nav2 도 스스로 장애물을 피하지만, 순찰 로봇은 “복도에 뭔가 있다”는 사실 자체를 <b>보고</b>해야 합니다. LiDAR 의 <code>/scan</code> 에서 <b>앞쪽 ±30°</b> 범위의 가장 가까운 거리를 보고, 기준보다 가까우면 <code>/patrol/obstacle</code> 에 <code>true</code> 를 발행합니다.</p>
<div class="box note"><div class="box-t">📌 LaserScan 의 각도 계산</div><code>i</code> 번째 거리의 방향은 <code>angle_min + i × angle_increment</code> 입니다. LiDAR 마다 <code>angle_min</code> 이 0 일 수도 −π 일 수도 있으니, 인덱스를 직접 가정하지 말고 이 식으로 계산하세요. <code>range_min</code> ~ <code>range_max</code> 밖의 값(0 · inf)은 버립니다.</div>
<pre class="code" data-lang="python" data-run="py" data-with="bot"><code>import math
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import LaserScan
from std_msgs.msg import Bool


class ObstacleMonitor(Node):
    def __init__(self):
        super().__init__('obstacle_monitor')
        self.declare_parameter('warn_dist', 0.5)      # [m]
        self.declare_parameter('half_fov_deg', 30.0)  # 앞쪽 ±30°
        self.create_subscription(LaserScan, '/scan', self.on_scan, qos_profile_sensor_data)
        self.pub = self.create_publisher(Bool, '/patrol/obstacle', 10)
        self.was_close = False

    def on_scan(self, scan):
        half = math.radians(self.get_parameter('half_fov_deg').value)
        front = []
        for i, r in enumerate(scan.ranges):
            a = scan.angle_min + i * scan.angle_increment
            a = math.atan2(math.sin(a), math.cos(a))   # -pi ~ pi 로 정규화
            if abs(a) &lt;= half and scan.range_min &lt; r &lt; scan.range_max:
                front.append(r)
        if not front:
            return
        nearest = min(front)
        close = nearest &lt; self.get_parameter('warn_dist').value
        self.pub.publish(Bool(data=close))
        if close and not self.was_close:
            self.get_logger().warn(f'앞 {nearest:.2f} m 에 장애물! 순찰 일시 정지 요청')
        elif self.was_close and not close:
            self.get_logger().info('통로가 다시 비었습니다')
        self.was_close = close


def main():
    rclpy.init()
    rclpy.spin(ObstacleMonitor())


if __name__ == '__main__':
    main()</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li>위 코드를 ▶ 실행하고, 아래 실습 창에서 로봇을 벽 쪽으로 몰아(W A S D) 경고 로그가 뜨는지 봅니다.</li>
<li><code>ros2 topic echo /patrol/obstacle</code> 로 true/false 가 바뀌는 순간을 확인합니다.</li>
<li><code>ros2 topic info /scan -v</code> 로 <code>/scan</code> 의 QoS 가 BEST_EFFORT 라는 점, 우리 구독자도 sensor_data 로 맞춰져 있다는 점을 확인합니다.</li>
<li><code>ros2 param set /obstacle_monitor warn_dist 1.0</code> 으로 기준을 바꿔 보세요.</li>
</ol></div>
{{widget:lab|with=bot|title=실습 — 터미널 + webbot (장애물 감시)|h=380}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic info /scan -v</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /scan</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param set /obstacle_monitor warn_dist 1.0
ros2 topic echo /patrol/obstacle</code></pre>
<div class="box tip"><div class="box-t">💡 순찰 관리자와 합치기</div>순찰 관리자에서 <code>/patrol/obstacle</code> 을 구독하고, true 가 오면 현재 목표를 <b>취소</b>(<code>goal_handle.cancel_goal_async()</code>)한 뒤 PAUSED 상태로, false 가 되면 같은 지점을 다시 보내면 상태 기계(2절 그림)가 완성됩니다.</div>`
    },

    /* ============================================================ 6 */
    {
      title: '기록과 대시보드 — rosbag2 · RViz',
      html: `
<p>순찰 로봇에게 “어젯밤 3시에 뭐가 있었어?”라고 물으려면 <b>기록</b>이 있어야 합니다. <code>ros2 bag record</code> 는 토픽을 시간과 함께 저장하고, <code>ros2 bag play</code> 는 그 순간을 그대로 재생합니다(14장). 문제를 재현할 때도 최고의 도구입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 bag record /scan /odom /plan /patrol/status /patrol/obstacle -o patrol_log</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 bag info patrol_log</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 기록하고 되돌려 보기</div>
<ol class="steps-list">
<li>위 record 블록을 실행한 채로 4절의 순찰 관리자를 돌립니다.</li>
<li>순찰이 끝나면 터미널의 ■(<kbd>Ctrl</kbd>+<kbd>C</kbd>)로 녹화를 멈추고 <code>ros2 bag info patrol_log</code> 로 메시지 수를 확인합니다.</li>
<li>아래 rosbag2 위젯에서도 녹화 · 재생을 해 보고, 재생 중에 <code>/patrol/status</code> 를 echo 하면 그때의 보고가 다시 나오는지 봅니다.</li>
</ol></div>
{{widget:bag}}
<p>관제 화면은 RViz2 로 만듭니다. 고정 좌표계를 <code>map</code> 으로 두고 TF · LaserScan · Map · Path · RobotModel 을 켜면 “지도 위 어디에서, 무엇을 보며, 어디로 가는지”가 한눈에 보입니다. 아래 RViz 위젯은 위의 webbot 시뮬레이터와 연결되어 있습니다.</p>
{{widget:rviz|fixed=map|show=tf,scan,map,path,robot|with=bot}}
<table class="tbl">
<tr><th>RViz 디스플레이</th><th>토픽</th><th>보이는 것</th></tr>
<tr><td>Map</td><td><code>/map</code></td><td>벽 · 빈 공간 (TRANSIENT_LOCAL 이라 늦게 켜도 받음)</td></tr>
<tr><td>LaserScan</td><td><code>/scan</code></td><td>지금 LiDAR 가 보는 점 — 지도와 겹치면 위치 추정이 잘 된 것</td></tr>
<tr><td>Path</td><td><code>/plan</code></td><td>Nav2 가 계획한 경로</td></tr>
<tr><td>TF · RobotModel</td><td><code>/tf</code> · <code>/robot_description</code></td><td>map → odom → base_link 와 로봇 모양</td></tr>
</table>
<div class="box trend"><div class="box-t">🚀 웹 대시보드 · Foxglove</div>현장에서는 RViz 대신 rosbridge + 웹 페이지(20장)나 Foxglove 로 관제 화면을 만들기도 합니다. 설치 없이 태블릿으로 보고, bag 파일(MCAP)도 같은 화면에서 재생할 수 있습니다.</div>`
    },

    /* ============================================================ 7 */
    {
      title: '다른 종합 프로젝트 — 팔 · 사족보행 · 센서 스테이션',
      html: `
<p>순찰 로봇 말고도 이 사이트의 도구로 해 볼 수 있는 종합 프로젝트가 있습니다. 관심 분야를 골라 같은 순서(요구사항 → 설계 → 런치 → 검증)로 진행해 보세요.</p>
<div class="cards c3">
  <div class="card orange"><div class="ci">🦾</div><b>SO-ARM101 집어 옮기기</b><p>카메라로 물체 위치 인식(19장) → TF 로 팔 기준 좌표 변환(12장) → MoveIt 계획 · 실행(17장) → 그리퍼. 더 나아가 LeRobot 모방학습으로 같은 일을 학습시키고 비교.</p></div>
  <div class="card blue"><div class="ci">🐕</div><b>Go2 따라오기 (follow-me)</b><p>카메라 색 추적 · 사람 검출(19장) → <code>/target</code> → 속도 명령 <code>/cmd_vel</code>(18장). 워치독 · 최대 속도 제한 · LiDAR 로 충돌 방지.</p></div>
  <div class="card green"><div class="ci">🌡️</div><b>micro-ROS 센서 스테이션</b><p>ESP32 여러 대가 온도 · 습도 · 버튼을 발행(20장) → 수집 노드 → rosbag2 기록 → rosbridge 웹 대시보드. Docker compose 로 한 번에 배포.</p></div>
</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 로봇팔 pick &amp; place 맛보기</div>
<ol class="steps-list">
<li>아래 SO-ARM101 위젯(MoveIt 모드)에서 목표 자세를 정하고 계획(Plan) → 실행(Execute)을 눌러 봅니다.</li>
<li>“집기 전 위치 → 내려가기 → 그리퍼 닫기 → 들어 올리기 → 옮기기 → 놓기”를 웨이포인트 목록으로 적어 봅니다. 순찰 관리자와 구조가 같다는 것을 느껴 보세요.</li>
</ol></div>
{{widget:arm|mode=moveit}}
<div class="box practice"><div class="box-t">🧪 해 보기 — Go2 걸리기</div>
<ol class="steps-list">
<li>아래 Go2 위젯에서 일어서기 후 가상 조이스틱으로 <code>/cmd_vel</code> 을 보내 걷게 합니다.</li>
<li>19장의 <code>/target</code> 을 받아 <code>angular.z = −k·x</code> 로 도는 노드를 Go2 용(<code>/cmd_vel</code>)으로 바꾸면 follow-me 의 뼈대가 됩니다.</li>
</ol></div>
{{widget:go2}}
<div class="box note"><div class="box-t">📌 연계 강좌</div>
<a href="https://samcho93.github.io/studySOArm101/" target="_blank" rel="noopener">SO-ARM101 강좌</a> (<a href="https://samcho93.github.io/studySOArm101/lessons/ch18.html" target="_blank" rel="noopener">18장 MoveIt 2</a> · <a href="https://samcho93.github.io/studySOArm101/lessons/ch20.html" target="_blank" rel="noopener">20장 LeRobot ↔ ROS 2</a>) ·
<a href="https://samcho93.github.io/studyGo2/" target="_blank" rel="noopener">Unitree Go2 강좌</a> (<a href="https://samcho93.github.io/studyGo2/lessons/e07.html" target="_blank" rel="noopener">unitree_ros2</a> · <a href="https://samcho93.github.io/studyGo2/lessons/e08.html" target="_blank" rel="noopener">L1 LiDAR · SLAM</a>) ·
<a href="https://samcho93.github.io/studyOpenCV/" target="_blank" rel="noopener">OpenCV 강좌</a></div>`
    },

    /* ============================================================ 8 */
    {
      title: '디버깅 체크리스트 — “안 돼요!” 를 만났을 때',
      html: `
<p>ROS 2 에서 만나는 문제의 대부분은 코드 버그가 아니라 <b>환경 · 연결 · 설정</b> 문제입니다. 아래 순서로 바깥에서 안쪽으로 좁혀 가면 대부분 몇 분 안에 원인을 찾을 수 있습니다.</p>
{{fig:debugFlow}}
<table class="tbl">
<tr><th>증상</th><th>흔한 원인</th><th>진단 명령</th><th>해결</th></tr>
<tr><td><code>ros2: command not found</code> · <code>Package 'x' not found</code></td><td><b>source 를 안 함</b> (새 터미널마다 필요) · 빌드 후 워크스페이스 source 빠짐</td><td><code>printenv | grep ROS</code> · <code>ros2 pkg list | grep x</code></td><td><code>source /opt/ros/jazzy/setup.bash</code>, <code>source install/setup.bash</code> (<code>~/.bashrc</code> 에 등록)</td></tr>
<tr><td>다른 PC · 컨테이너의 노드가 안 보임</td><td><b>ROS_DOMAIN_ID 불일치</b> · 탐색 범위 LOCALHOST · 방화벽 · 멀티캐스트 차단</td><td><code>echo $ROS_DOMAIN_ID</code> · <code>ros2 multicast receive</code> / <code>send</code> · <code>ros2 doctor --report</code></td><td>ID 통일, <code>ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET</code>, UDP 허용, Discovery Server</td></tr>
<tr><td>토픽은 있는데 메시지가 안 옴</td><td><b>QoS 불일치</b> (BEST_EFFORT 발행 ↔ RELIABLE 구독, VOLATILE ↔ TRANSIENT_LOCAL)</td><td><code>ros2 topic info /scan -v</code> · <code>ros2 doctor --report</code> (QoS 호환성 목록)</td><td>센서는 <code>qos_profile_sensor_data</code>, 지도는 TRANSIENT_LOCAL 로 맞춤</td></tr>
<tr><td>RViz 에 “No transform from … to …” · 로봇이 안 보임</td><td><b>TF 프레임 누락</b> · 이름 오타 · 정적 TF 미발행</td><td><code>ros2 run tf2_tools view_frames</code> · <code>ros2 run tf2_ros tf2_echo map base_link</code></td><td>빠진 브로드캐스터 실행(robot_state_publisher, static_transform_publisher), 프레임 이름 통일</td></tr>
<tr><td>“extrapolation into the future/past” · 시간이 이상함</td><td><b>use_sim_time 불일치</b> · /clock 없음 · PC 간 시계 차이</td><td><code>ros2 param get /amcl use_sim_time</code> · <code>ros2 topic echo /clock --once</code></td><td>모든 노드에 같은 use_sim_time, 실제 로봇 여러 대는 chrony(NTP)로 시간 동기화</td></tr>
<tr><td>노드가 이상하게 동작 · 파라미터가 엉뚱함</td><td><b>노드 이름 충돌</b> (같은 이름 두 개 실행)</td><td><code>ros2 node list</code> (중복 경고) · <code>ros2 node info /이름</code></td><td>하나 끄기, <code>--ros-args -r __node:=새이름</code> 또는 네임스페이스</td></tr>
<tr><td>연결은 되는데 “incompatible type” · 값이 이상함</td><td><b>메시지 타입 불일치</b> (Twist ↔ TwistStamped 등) · 필드 이름 오타</td><td><code>ros2 topic type /cmd_vel</code> · <code>ros2 topic info /cmd_vel</code> · <code>ros2 interface show …</code></td><td>양쪽 타입 통일, 필요하면 변환 노드</td></tr>
<tr><td>구독자가 아무것도 못 받음 (QoS 는 정상)</td><td><b>토픽 이름 · 네임스페이스 차이</b> (<code>cmd_vel</code> vs <code>/robot1/cmd_vel</code>)</td><td><code>ros2 topic list</code> · <code>rqt_graph</code></td><td>리매핑(<code>-r cmd_vel:=/robot1/cmd_vel</code>) 또는 런치에서 remappings</td></tr>
<tr><td>코드를 고쳤는데 그대로</td><td>다시 빌드 · source 안 함, 옛 프로세스가 살아 있음</td><td><code>ros2 node list</code> · <code>ps aux | grep ros</code></td><td><code>colcon build --symlink-install</code>, 새 터미널에서 source, 옛 노드 종료</td></tr>
<tr><td>목록이 이상하게 오래된 정보</td><td>ros2 CLI 데몬 캐시</td><td><code>ros2 daemon status</code></td><td><code>ros2 daemon stop</code> 후 다시 실행</td></tr>
</table>
<p>이 페이지의 터미널에서 진단 명령을 직접 실행해 보세요. (4절의 webbot 이 켜져 있으면 결과가 더 풍부합니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>printenv | grep ROS
ros2 doctor</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run tf2_tools view_frames</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param get /amcl use_sim_time
ros2 topic type /cmd_vel</code></pre>
{{widget:term|chips=ros2 doctor;ros2 doctor --report;ros2 topic info /scan -v;ros2 run tf2_tools view_frames;ros2 node list;ros2 daemon status|h=300}}
<div class="box tip"><div class="box-t">💡 질문을 잘하는 법</div>커뮤니티에 질문할 때는 ① ROS 2 배포판 · OS ② 실행한 명령 전체 ③ 오류 메시지 원문 ④ <code>ros2 doctor --report</code> 결과 ⑤ 이미 해 본 것 을 함께 적으세요. 답이 몇 배 빨리 옵니다.</div>`
    },

    /* ============================================================ 9 */
    {
      title: '로드맵 — 이 강좌 다음에 무엇을 할까?',
      html: `
<p>축하합니다! 노드 · 토픽에서 시작해 서비스 · 액션 · 파라미터, 패키지와 런치, QoS · TF · URDF · 시뮬레이션, Nav2 · MoveIt · 보행 로봇, 비전 · AI, micro-ROS · 웹 · 배포까지 ROS 2 의 큰 지도를 한 바퀴 돌았습니다. 이제 한 분야를 골라 깊이 들어갈 차례입니다.</p>
{{fig:roadmap}}
<div class="cards c3">
  <div class="card blue"><div class="ci">📘</div><b>공식 문서</b><p><a href="https://docs.ros.org/en/jazzy/" target="_blank" rel="noopener">ROS 2 Jazzy 문서</a> — 튜토리얼 · 개념 · How-to<br><a href="https://index.ros.org/" target="_blank" rel="noopener">index.ros.org</a> — 패키지 검색</p></div>
  <div class="card teal"><div class="ci">🗺️</div><b>Nav2 · MoveIt</b><p><a href="https://docs.nav2.org/" target="_blank" rel="noopener">Nav2 문서</a> — 튜토리얼 · 설정 가이드 · 행동 트리<br><a href="https://moveit.picknik.ai/main/index.html" target="_blank" rel="noopener">MoveIt 2 문서</a> — 튜토리얼 · 예제</p></div>
  <div class="card orange"><div class="ci">💬</div><b>커뮤니티</b><p><a href="https://discourse.openrobotics.org/" target="_blank" rel="noopener">ROS Discourse</a> — 공지 · 토론<br><a href="https://robotics.stackexchange.com/" target="_blank" rel="noopener">Robotics Stack Exchange</a> — Q&amp;A<br><a href="https://cafe.naver.com/openrt" target="_blank" rel="noopener">오로카(OROCA)</a> — 한국어 커뮤니티</p></div>
  <div class="card purple"><div class="ci">🎤</div><b>ROSCon</b><p><a href="https://roscon.ros.org/" target="_blank" rel="noopener">roscon.ros.org</a> — 해마다 열리는 ROS 개발자 회의. 지난 발표 영상 · 슬라이드가 공개되어 최신 동향을 보기 좋습니다.</p></div>
  <div class="card green"><div class="ci">📚</div><b>책</b><p>표윤석 · 임태훈, 『ROS 2로 시작하는 로봇 프로그래밍』(루비페이퍼, 2021) — 한국어 입문서<br>Francisco Martín Rico, <i>A Concise Introduction to Robot Programming with ROS2</i> (CRC Press)</p></div>
  <div class="card red"><div class="ci">🤖</div><b>실물 로봇 자료</b><p><a href="https://emanual.robotis.com/" target="_blank" rel="noopener">ROBOTIS e-Manual</a> — TurtleBot3 · 다이나믹셀<br>연계 강좌: <a href="https://samcho93.github.io/studySOArm101/" target="_blank" rel="noopener">SO-ARM101</a> · <a href="https://samcho93.github.io/studyGo2/" target="_blank" rel="noopener">Go2</a> · <a href="https://samcho93.github.io/studyOpenCV/" target="_blank" rel="noopener">OpenCV</a></p></div>
</div>
<div class="box trend"><div class="box-t">🚀 앞으로 눈여겨볼 흐름</div>
<ul>
<li><b>미들웨어</b>: DDS 외에 Zenoh(rmw_zenoh)가 공식 지원 RMW 로 자리 잡아 가고 있습니다.</li>
<li><b>AI 와 로봇</b>: 모방학습 · VLA 모델이 ROS 2 노드로 들어오는 사례가 늘고 있습니다 (19장).</li>
<li><b>배포판</b>: Jazzy(LTS, 2029-05 까지)를 기준으로 쓰되, 매년 5월 새 배포판이 나오니 릴리스 노트를 확인하는 습관을 들이세요.</li>
</ul></div>
<div class="box practice"><div class="box-t">🧪 마지막 과제 — 나만의 로드맵 한 장</div>
<ol class="steps-list">
<li>이 강좌에서 가장 재미있었던 장 두 개를 고릅니다.</li>
<li>그 분야로 “한 달 뒤에 만들고 싶은 것”을 한 문장으로 적습니다. (예: “방 지도를 만들고 부엌까지 물 배달하는 로봇”)</li>
<li>요구사항 표(1절)와 노드 · 토픽 그림(2절)을 그 프로젝트로 다시 그려 봅니다. 이것이 여러분의 첫 설계 문서입니다.</li>
</ol></div>`
    }
  ],

  videos: [
    { title: 'ROS 2 Navigation - Part 4.2 (Nav2 Project - build a Patrolling Robot)', channel: 'Hummingbird', url: 'https://www.youtube.com/watch?v=V0kmKkO7tVo', lang: 'en', min: '30분', desc: 'Nav2 와 사용자 행동 트리로 순찰 로봇 프로젝트를 끝까지 만드는 과정' },
    { title: '[ROS2 Q&A] 232 - How to follow waypoints using nav2', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=KIbgZqfppAI', lang: 'en', min: '20분', desc: 'nav2_simple_commander 로 웨이포인트를 따라가게 하는 방법' },
    { title: 'Navigation2 Waypoint Follower Tutorial (ROS World 2020)', channel: 'Rover Robotics', url: 'https://www.youtube.com/watch?v=F2h7ZuJW8y0', lang: 'en', min: '15분', desc: '실제 로버로 Nav2 웨이포인트 팔로워를 시연' },
    { title: 'Using ros2 doctor to Identify Issues - ROS 2 Jazzy', channel: 'Automatic Addison', url: 'https://www.youtube.com/watch?v=tDd8LG0v_ww', lang: 'en', min: '10분', desc: 'Jazzy 에서 ros2 doctor 로 환경 · 네트워크 · QoS 문제 찾기' },
    { title: 'ROS2 Doctor: ROS Diagnostic and Debug Tool', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=_A_LRRIxpLg', lang: 'en', min: '10분', desc: 'ros2 doctor(wtf) 의 점검 항목과 --report 읽는 법' },
    { title: 'Learn ROS 2: Beginner to Advanced Course (Concepts and Code)', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=HJAE5Pk8Nyw', lang: 'en', min: '긴 강좌', desc: '강좌 전체를 영어로 복습하고 싶을 때 — 개념과 코드를 처음부터 끝까지' }
  ],

  terms: [
    ['요구사항', '로봇이 “무엇을” 해야 하는지 적은 목록. 설계 · 검증의 기준이 됨'],
    ['웨이포인트(waypoint)', '로봇이 차례로 거쳐 가야 하는 지도 위 지점'],
    ['NavigateToPose', 'Nav2 의 목표 자세 이동 액션 (nav2_msgs/action/NavigateToPose). 피드백에 distance_remaining'],
    ['nav2_simple_commander', 'Nav2 를 파이썬에서 쉽게 쓰는 API. BasicNavigator 의 goToPose · followWaypoints'],
    ['상태 기계', '대기 · 이동 · 정지 · 완료처럼 상태와 전이 조건으로 동작을 정리하는 설계 방법'],
    ['IncludeLaunchDescription', '다른 런치 파일을 포함해 실행하는 런치 액션 (예: nav2_bringup)'],
    ['respawn', '런치에서 노드가 죽으면 자동으로 다시 띄우는 옵션'],
    ['use_sim_time', '노드가 /clock(시뮬레이션 시간)을 쓸지 정하는 파라미터. 모든 노드가 같아야 함'],
    ['ros2 doctor', 'ROS 2 환경 · 네트워크 · QoS 호환성을 점검하는 도구 (--report 로 자세히)'],
    ['view_frames', 'tf2_tools 의 TF 트리 그림(PDF) 생성 도구. 빠진 프레임을 찾을 때 사용'],
    ['QoS 호환성', '발행자와 구독자의 신뢰성 · 내구성 등이 맞아야 연결됨. 불일치 시 메시지가 오지 않음'],
    ['rosbag2', '토픽을 시간과 함께 기록 · 재생하는 도구. 문제 재현 · 데이터 수집에 사용'],
    ['오로카(OROCA)', '한국의 오픈 로보틱스 커뮤니티. ROS 강좌 · 질문 · 세미나']
  ],

  summary: [
    '종합 프로젝트는 요구사항 → 노드 · 토픽 설계 → 런치 → 실행 · 검증 순서로 진행하며, 한 노드는 한 가지 일만 맡깁니다.',
    '순찰 로봇은 Nav2 의 navigate_to_pose 액션으로 웨이포인트를 돌고, /scan 감시 노드가 /patrol/obstacle 로 경보를, 관리자가 /patrol/status 로 보고를 냅니다.',
    '런치 파일 하나로 Nav2 를 include 하고 우리 노드를 파라미터 · respawn 과 함께 띄우며, use_sim_time 은 모든 노드에 같게 넘깁니다.',
    'rosbag2 로 순찰을 기록 · 재생하고, RViz 의 Map · LaserScan · Path · TF 로 관제 화면을 만듭니다.',
    '문제가 생기면 환경(source · 도메인) → 노드 → 연결(이름 · 타입 · QoS) → 데이터 → TF 순서로 좁혀 가며 ros2 doctor · topic info -v · view_frames 를 씁니다.',
    '다음 걸음은 공식 문서 · Nav2 · MoveIt 문서, ROS Discourse · 오로카 커뮤니티, ROSCon 발표, 실제 로봇 한 대로 이어집니다.'
  ],

  quiz: [
    { q: '[2장 · 토픽] 퍼블리셔와 서브스크라이버의 관계로 옳은 것은?', options: ['서브스크라이버가 퍼블리셔에게 매번 요청해야 받는다', '같은 토픽 이름 · 타입이면 서로를 몰라도 메시지가 전달된다', '퍼블리셔는 하나의 구독자에게만 보낼 수 있다', '토픽은 반드시 응답을 돌려준다'], answer: 1, explain: '토픽은 이름 붙은 방송 채널입니다. 같은 이름 · 타입(그리고 호환되는 QoS)이면 발행자와 구독자는 서로를 몰라도 연결됩니다. 요청 · 응답은 서비스입니다.' },
    { q: '[5 · 16장 · 액션] 순찰 로봇이 지점 이동에 토픽이나 서비스가 아닌 액션(navigate_to_pose)을 쓰는 이유는?', options: ['액션이 가장 빠르기 때문에', '오래 걸리는 일에 진행 상황(피드백)과 취소, 최종 결과가 필요하기 때문에', '액션만 QoS 를 지원해서', '서비스는 파이썬에서 쓸 수 없어서'], answer: 1, explain: '이동은 수십 초가 걸리므로 distance_remaining 같은 피드백, 장애물 시 취소, 성공 · 실패 결과가 필요합니다. 이것이 액션의 용도입니다.' },
    { q: '[11장 · QoS] LiDAR 가 BEST_EFFORT 로 /scan 을 발행합니다. 내 노드가 받지 못한다면 가장 의심할 것은?', options: ['내 구독자가 RELIABLE 을 요구하고 있다', '토픽 이름이 너무 길다', 'LiDAR 가 너무 빠르다', 'rviz2 가 꺼져 있다'], answer: 0, explain: 'RELIABLE 구독자는 BEST_EFFORT 발행자와 연결되지 않습니다. qos_profile_sensor_data 로 구독하고 ros2 topic info /scan -v 로 확인하세요.' },
    { q: '[12장 · TF] RViz 에 “No transform from base_link to map” 이 뜹니다. 가장 먼저 쓸 진단 명령은?', options: ['ros2 bag play', 'ros2 run tf2_tools view_frames (또는 tf2_echo map base_link)', 'colcon build', 'ros2 pkg create'], answer: 1, explain: 'view_frames 로 TF 트리를 그려 map → odom → base_link 중 어느 연결이 빠졌는지(누가 발행해야 하는지) 확인합니다.' },
    { q: '[10장 · 런치] 시뮬레이터와 함께 쓸 때 런치 파일에서 모든 노드에 같은 값으로 넘겨야 하는 파라미터는?', options: ['use_sim_time', 'node_name', 'rviz_color', 'ROS_DISTRO'], answer: 0, explain: '어떤 노드는 /clock(시뮬레이션 시간), 어떤 노드는 벽시계를 쓰면 TF 시간이 어긋나 extrapolation 오류가 납니다.' },
    { q: '[20장 · 네트워크] 노트북과 로봇 PC 가 같은 Wi-Fi 인데 서로의 노드가 안 보입니다. 원인이 아닌 것은?', options: ['ROS_DOMAIN_ID 가 서로 다르다', '한쪽이 ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST 이다', '공유기가 멀티캐스트를 막는다', '두 PC 모두 source /opt/ros/jazzy/setup.bash 를 했다'], answer: 3, explain: 'source 는 해야 하는 일입니다. 도메인 ID 불일치, 탐색 범위 LOCALHOST, 멀티캐스트 차단이 대표적 원인이며 ros2 multicast send/receive, ros2 doctor --report 로 확인합니다.' },
    { q: '[19장 · 비전] cv_bridge 로 컬러 이미지를 OpenCV 에서 처리할 때 올바른 습관은?', options: ['항상 passthrough 로 받는다', "desired_encoding='bgr8' 을 명시해 OpenCV 의 BGR 순서로 받는다", '이미지를 문자열로 바꾼다', 'CameraInfo 로 이미지를 받는다'], answer: 1, explain: 'OpenCV 는 BGR 순서를 씁니다. rgb8 영상을 passthrough 로 받으면 빨강 · 파랑이 뒤바뀝니다.' }
  ],

  slides: [
    { title: '마지막 장 — 모두 합치기', layout: 'center', html: `<div class="s-big">🏁 순찰 로봇<br><span style="font-size:0.7em">지도 · 길 찾기 · 장애물 · 기록 · 관제</span></div>`, notes: '“밤에 창고를 혼자 지키는 로봇에 무엇이 필요할까?” 발문으로 시작해 칠판의 단어를 장 번호와 짝짓습니다. (5분)' },
    { title: '요구사항 → 배운 장', html: `<div class="s-cols c3"><div><b>R1 순찰</b><br>액션 · Nav2</div><div><b>R2 경보</b><br>/scan · QoS</div><div><b>R3~R5 보고 · 기록 · 관제</b><br>rosbridge · bag · RViz</div></div>`, notes: '요구사항 표를 보며 각 항목이 어느 장의 기술로 해결되는지 학생에게 묻습니다. R6(한 줄 실행 · 자동 시작)은 런치 + systemd 입니다. (5분)' },
    { title: '노드 · 토픽 설계', html: `{{fig:patrolGraph|nocap}}`, notes: '노드는 파랑 타원, 토픽은 초록 사각형, 액션은 보라. 새로 만드는 것은 patrol_manager 와 obstacle_monitor 두 개뿐이라는 점을 강조합니다. (6분)' },
    { title: '순찰 관리자의 상태 기계', html: `{{fig:missionFsm|nocap}}`, notes: 'IDLE → GOING → 도착 점검 → 다음 지점, 경보 시 PAUSED, 실패 시 SKIP. 상태를 로그로 남기면 디버깅이 쉬워진다는 점을 강조합니다. (5분)' },
    { title: '런치 파일 구조', html: `{{fig:launchTree|nocap}}`, notes: 'Nav2 는 include, 우리 노드는 파라미터 파일과 respawn 옵션. use_sim_time 을 모든 노드에 같게 넘기는 이유를 묻습니다. (5분)' },
    { title: '실습: Nav2 로 순찰', html: `{{widget:bot|world=room|mode=nav}}`, notes: '지도 클릭으로 목표 주기 → ros2 action send_goal → 파이썬 순찰 관리자 순으로 시연합니다. 피드백의 distance_remaining 을 함께 읽습니다. (10분)' },
    { title: '실습: 장애물 감시', layout: 'center', html: `<div class="s-big">/scan 앞쪽 ±30°<br>가장 가까운 거리 &lt; 0.5 m<br>→ <b>/patrol/obstacle = true</b></div>`, notes: 'angle_min + i × angle_increment 로 각도를 계산하는 이유, range_min~range_max 밖 값을 버리는 이유를 설명하고 코드를 실행합니다. (8분)' },
    { title: '기록과 관제', html: `{{widget:rviz|fixed=map|show=tf,scan,map,path,robot|with=bot}}`, notes: 'Map · LaserScan · Path · TF 를 켜고, 스캔 점이 지도 벽과 겹치면 위치 추정이 잘 된 것이라고 설명합니다. ros2 bag record 로 순찰을 기록하는 것도 함께 시연합니다. (7분)' },
    { title: '다른 종합 프로젝트', html: `<div class="s-cols c3"><div>🦾<br><b>SO-ARM101</b><br>pick &amp; place</div><div>🐕<br><b>Go2</b><br>follow-me</div><div>🌡️<br><b>micro-ROS</b><br>센서 스테이션</div></div>`, notes: '세 프로젝트 모두 “요구사항 → 설계 → 런치 → 검증”의 같은 틀을 따른다는 점을 강조하고, 관심 분야를 골라 보게 합니다. (4분)' },
    { title: '디버깅: 바깥에서 안쪽으로', html: `{{fig:debugFlow|nocap}}`, notes: '환경 → 노드 → 연결 → 데이터 → TF. 각 단계의 대표 명령을 학생들이 외쳐 보게 합니다. 한 번에 하나만 바꾸기 원칙을 강조합니다. (6분)' },
    { title: '자주 만나는 7가지', html: `<div class="s-points"><p>source 안 함 · <b>ROS_DOMAIN_ID</b> 불일치 · <b>QoS</b> 불일치</p><p><b>TF</b> 누락 · <b>use_sim_time</b> 불일치 · 노드 이름 충돌 · 메시지 타입 불일치</p></div>`, notes: '각 문제마다 진단 명령을 하나씩 짝지어 봅니다(printenv, multicast, topic info -v, view_frames, param get, node list, topic type). 표를 인쇄해 책상에 붙여 두라고 권합니다. (6분)' },
    { title: '로드맵', html: `{{fig:roadmap}}`, notes: '공식 튜토리얼 → 실제 로봇 → 한 분야 깊게 → C++ · 품질 → 기여. 공식 문서, Nav2 · MoveIt 문서, Discourse, 오로카, ROSCon 을 소개합니다. (5분)' },
    { title: '수고하셨습니다!', layout: 'center', html: `<div class="s-big">🤖 이제 여러분의 로봇을<br><b>ROS 2</b> 로 만들 차례입니다</div>`, notes: '마지막 과제(나만의 로드맵 한 장)를 안내하고 최종 퀴즈로 넘어갑니다. 강좌 전체에 대한 소감을 한 문장씩 들어 봅니다. (3분)' }
  ]
});
