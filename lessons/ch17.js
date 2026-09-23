/* 17장 — 로봇팔: MoveIt 2와 SO-ARM101 */
Course.lesson({
  id: 'ch17', no: '17',
  icon: '🦾',
  title: '로봇팔 — MoveIt 2와 SO-ARM101',
  subtitle: '“저 상자를 집어 줘” — 좌표 한 점이 여섯 개의 관절 각도가 되기까지',
  level: '중급', time: '150분',
  goals: [
    '링크 · 관절 · 자유도(DoF) · TCP · 작업 영역을 로봇팔 그림에서 가리키며 설명할 수 있다',
    '관절 공간과 작업 공간의 차이를 알고, 2링크 팔의 순기구학 · 역기구학을 계산해 해가 여러 개인 이유를 말할 수 있다',
    'JointTrajectory 와 FollowJointTrajectory 액션으로 SO-ARM101 의 6개 관절을 터미널과 rclpy 로 움직일 수 있다',
    'MoveIt 2 의 move_group · 플래닝 씬 · IK 플러그인 · OMPL · 궤적 시간 계산이 계획 → 실행 흐름에서 하는 일을 설명할 수 있다',
    'LeRobot 모방학습과 ROS 2 를 잇는 방법, 실물 SO-ARM101 을 ros2_control 로 연결하는 절차를 말할 수 있다'
  ],
  teacher: {
    intro: '볼펜을 책상 위에 두고 한 학생에게 “눈을 감고 이 볼펜을 집어 보세요”라고 합니다. 어깨 · 팔꿈치 · 손목을 몇 도씩 돌려야 하는지 계산하지 않았는데도 잡을 수 있죠. “로봇은 이걸 어떻게 계산할까요?” 로 시작해, 오늘은 좌표(작업 공간) → 관절 각도(관절 공간) 변환과 충돌 없는 경로 계획을 배운다고 예고합니다. (3분)',
    flow: '① 도입 · 팔의 구조 10분 → ② 관절/작업 공간 · FK/IK 계산 20분 → ③ SO-ARM101 소개 + 3D 시뮬레이터 10분 → ④ JointTrajectory · 액션 (arm joint + 터미널) 20분 → ⑤ 궤적 표 · rclpy (arm traj · pylab) 20분 → ⑥ MoveIt 2 구조 15분 → ⑦ 계획 → 실행 · Pick &amp; Place (arm moveit) 20분 → ⑧ LeRobot 브릿지 10분 → ⑨ 실물 체크리스트 · 퀴즈 15분'
  },

  figs: {
    /* ------------------------------------------------ 팔의 구조 */
    anatomy: {
      caption: 'SO-ARM101 옆모습(개념도): 베이스에서 그리퍼까지 링크가 관절로 이어진 직렬 체인. 팔 5축 + 그리퍼 1축 = 모터 6개',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="로봇팔의 링크, 관절, 베이스, TCP, 작업 영역">
  <path d="M120,330 A290,290 0 0 1 690,250" class="ln-teal dash nofill"/>
  <text x="600" y="120" class="t-xs t-teal">작업 영역(workspace) 가장자리</text>
  <rect x="60" y="320" width="150" height="30" rx="6" class="gray"/>
  <text x="135" y="370" class="t-sm t-c t-b">base_link (고정)</text>
  <rect x="110" y="270" width="50" height="50" rx="8" class="box"/>
  <line x1="135" y1="270" x2="260" y2="140" class="ln-blue thick"/>
  <line x1="260" y1="140" x2="430" y2="200" class="ln-blue thick"/>
  <line x1="430" y1="200" x2="520" y2="200" class="ln-blue thick"/>
  <line x1="520" y1="200" x2="575" y2="200" class="ln-blue thick"/>
  <line x1="575" y1="190" x2="620" y2="176" class="ln-orange thick"/>
  <line x1="575" y1="210" x2="620" y2="224" class="ln-orange thick"/>
  <circle cx="135" cy="295" r="13" class="s-orange"/><text x="135" y="300" class="t-xs t-c tw t-b">1</text>
  <circle cx="135" cy="270" r="13" class="s-orange"/><text x="135" y="275" class="t-xs t-c tw t-b">2</text>
  <circle cx="260" cy="140" r="13" class="s-orange"/><text x="260" y="145" class="t-xs t-c tw t-b">3</text>
  <circle cx="430" cy="200" r="13" class="s-orange"/><text x="430" y="205" class="t-xs t-c tw t-b">4</text>
  <circle cx="520" cy="200" r="13" class="s-orange"/><text x="520" y="205" class="t-xs t-c tw t-b">5</text>
  <circle cx="575" cy="200" r="13" class="s-orange"/><text x="575" y="205" class="t-xs t-c tw t-b">6</text>
  <circle cx="630" cy="200" r="6" class="s-red"/>
  <text x="650" y="205" class="t-sm t-red t-b">TCP (gripper_frame_link)</text>
  <text x="180" y="190" class="t-xs t-blue">upper_arm</text>
  <text x="330" y="190" class="t-xs t-blue">lower_arm</text>

  <rect x="660" y="240" width="210" height="130" rx="10" class="box"/>
  <text x="675" y="262" class="t-xs"><tspan class="t-b">1</tspan> shoulder_pan — 좌우 회전</text>
  <text x="675" y="282" class="t-xs"><tspan class="t-b">2</tspan> shoulder_lift — 어깨 들기</text>
  <text x="675" y="302" class="t-xs"><tspan class="t-b">3</tspan> elbow_flex — 팔꿈치</text>
  <text x="675" y="322" class="t-xs"><tspan class="t-b">4</tspan> wrist_flex — 손목 꺾기</text>
  <text x="675" y="342" class="t-xs"><tspan class="t-b">5</tspan> wrist_roll — 손목 돌리기</text>
  <text x="675" y="362" class="t-xs"><tspan class="t-b">6</tspan> gripper — 집게 벌리기</text>
  <text x="440" y="30" class="t-sm t-c t-mu">● 관절(joint) = 모터 하나 · ─ 링크(link) = 뼈대 · 모두 회전 관절(revolute)</text>
</svg>`
    },

    /* ------------------------------------------------ 두 공간 */
    spaces: {
      caption: '관절 공간(각도 6개) ↔ 작업 공간(TCP 의 위치 · 자세). 순기구학은 한 가지 답, 역기구학은 답이 없거나 여러 개일 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="관절 공간과 작업 공간, 순기구학과 역기구학">
  <rect x="30" y="40" width="300" height="200" rx="14" class="blue"/>
  <text x="180" y="72" class="t-lg t-b t-c t-blue">관절 공간 (joint space)</text>
  <text x="180" y="110" class="t-sm t-c t-mono">q = [θ1, θ2, θ3, θ4, θ5]</text>
  <text x="180" y="140" class="t-sm t-c">모터가 이해하는 말</text>
  <text x="180" y="170" class="t-xs t-c t-mu">/joint_states · JointTrajectory</text>
  <text x="180" y="200" class="t-xs t-c t-mu">한계: URDF limit (예: ±110°)</text>

  <rect x="550" y="40" width="300" height="200" rx="14" class="green"/>
  <text x="700" y="72" class="t-lg t-b t-c t-green">작업 공간 (task space)</text>
  <text x="700" y="110" class="t-sm t-c t-mono">x, y, z, roll, pitch, yaw</text>
  <text x="700" y="140" class="t-sm t-c">사람이 이해하는 말</text>
  <text x="700" y="170" class="t-xs t-c t-mu">“상자 위 10 cm 로”</text>
  <text x="700" y="200" class="t-xs t-c t-mu">geometry_msgs/msg/PoseStamped</text>

  <line x1="335" y1="105" x2="545" y2="105" class="ln-blue thick ar-blue"/>
  <text x="440" y="92" class="t-sm t-c t-b t-blue">순기구학 FK</text>
  <text x="440" y="125" class="t-xs t-c t-mu">각도 → 위치 · 항상 답 하나</text>
  <line x1="545" y1="185" x2="335" y2="185" class="ln-green thick ar-green"/>
  <text x="440" y="172" class="t-sm t-c t-b t-green">역기구학 IK</text>
  <text x="440" y="205" class="t-xs t-c t-mu">위치 → 각도 · 0개 / 여러 개</text>
  <text x="440" y="275" class="t-sm t-c">MoveIt 2 는 IK 로 목표 관절값을 구하고, 관절 공간에서 충돌 없는 길을 찾습니다</text>
</svg>`
    },

    /* ------------------------------------------------ 2링크 IK */
    ik2: {
      caption: '평면 2링크 팔: 같은 점 P 에 닿는 자세가 두 개(팔꿈치 위 · 아래). 코사인 법칙으로 θ2, atan2 로 θ1 을 구합니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="2링크 평면 팔의 역기구학 두 해">
  <line x1="60" y1="320" x2="480" y2="320" class="ln thin"/><line x1="80" y1="340" x2="80" y2="40" class="ln thin"/>
  <text x="470" y="340" class="t-xs t-mu">x</text><text x="66" y="50" class="t-xs t-mu">y</text>
  <line x1="80" y1="320" x2="160" y2="160" class="ln-blue thick"/>
  <line x1="160" y1="160" x2="360" y2="200" class="ln-blue thick"/>
  <line x1="80" y1="320" x2="280" y2="300" class="ln-orange thick dash"/>
  <line x1="280" y1="300" x2="360" y2="200" class="ln-orange thick dash"/>
  <circle cx="80" cy="320" r="9" class="s-gray"/>
  <circle cx="160" cy="160" r="8" class="s-blue"/><circle cx="280" cy="300" r="8" class="s-orange"/>
  <circle cx="360" cy="200" r="9" class="s-red"/>
  <text x="378" y="196" class="t-b t-red">P (x, y)</text>
  <text x="100" y="230" class="t-sm t-blue">L1</text><text x="255" y="168" class="t-sm t-blue">L2</text>
  <text x="140" y="140" class="t-xs t-blue t-b">팔꿈치 위 (elbow-up)</text>
  <text x="200" y="336" class="t-xs t-orange t-b">팔꿈치 아래 (elbow-down)</text>
  <line x1="80" y1="320" x2="360" y2="200" class="ln thin dash"/>
  <text x="250" y="250" class="t-xs t-mu">r</text>

  <rect x="520" y="30" width="340" height="320" rx="12" class="box"/>
  <text x="540" y="58" class="t-b">순기구학 (FK)</text>
  <text x="540" y="84" class="t-sm t-mono">x = L1·cosθ1 + L2·cos(θ1+θ2)</text>
  <text x="540" y="106" class="t-sm t-mono">y = L1·sinθ1 + L2·sin(θ1+θ2)</text>
  <text x="540" y="146" class="t-b">역기구학 (IK)</text>
  <text x="540" y="172" class="t-sm t-mono">c2 = (x²+y²−L1²−L2²) / (2·L1·L2)</text>
  <text x="540" y="196" class="t-sm t-mono">θ2 = ± acos(c2)</text>
  <text x="540" y="220" class="t-sm t-mono">θ1 = atan2(y, x)</text>
  <text x="540" y="242" class="t-sm t-mono">   − atan2(L2·sinθ2, L1+L2·cosθ2)</text>
  <text x="540" y="278" class="t-xs t-mu">|c2| &gt; 1 → 팔이 닿지 않음 (해 없음)</text>
  <text x="540" y="300" class="t-xs t-mu">± → 해 두 개 · 6축 팔은 최대 8개 이상</text>
  <text x="540" y="322" class="t-xs t-mu">관절 한계 · 충돌로 쓸 수 있는 해를 고름</text>
</svg>`
    },

    /* ------------------------------------------------ ros2_control 스택 */
    jtc: {
      caption: '궤적이 모터까지 가는 길: FollowJointTrajectory 액션 → joint_trajectory_controller → controller_manager(read · update · write) → 하드웨어 인터페이스',
      svg: `<svg class="dg" viewBox="0 0 880 400" role="img" aria-label="ros2_control 스택과 궤적 액션">
  <ellipse cx="150" cy="60" rx="130" ry="32" class="blue"/>
  <text x="150" y="55" class="t-b t-c">내 노드 / MoveIt</text>
  <text x="150" y="75" class="t-xs t-c t-mu">액션 클라이언트</text>
  <rect x="330" y="30" width="520" height="60" rx="10" class="purple"/>
  <text x="590" y="54" class="t-sm t-b t-c t-mono">/arm_controller/follow_joint_trajectory</text>
  <text x="590" y="76" class="t-xs t-c">control_msgs/action/FollowJointTrajectory · 목표=JointTrajectory</text>
  <line x1="282" y1="60" x2="326" y2="60" class="ln-purple thick ar-purple"/>

  <rect x="60" y="120" width="790" height="70" rx="10" class="orange"/>
  <text x="455" y="146" class="t-b t-c">joint_trajectory_controller (arm_controller) · joint_state_broadcaster</text>
  <text x="455" y="170" class="t-xs t-c">웨이포인트 사이를 스플라인으로 보간 → 매 주기 목표 각도 · 허용 오차 감시</text>
  <line x1="590" y1="92" x2="590" y2="118" class="ln-purple ar-purple"/>

  <rect x="60" y="210" width="790" height="60" rx="10" class="teal"/>
  <text x="455" y="236" class="t-b t-c">controller_manager — update_rate(예: 50 Hz) 마다 read() → update() → write()</text>
  <text x="455" y="256" class="t-xs t-c t-mu">command_interface: position · state_interface: position, velocity</text>

  <rect x="60" y="290" width="250" height="90" rx="10" class="gray"/>
  <text x="185" y="318" class="t-b t-c">mock</text>
  <text x="185" y="342" class="t-xs t-c t-mono">mock_components/GenericSystem</text>
  <text x="185" y="362" class="t-xs t-c t-mu">하드웨어 없이 테스트</text>
  <rect x="330" y="290" width="250" height="90" rx="10" class="gray"/>
  <text x="455" y="318" class="t-b t-c">gazebo</text>
  <text x="455" y="342" class="t-xs t-c t-mono">gz_ros2_control/GazeboSimSystem</text>
  <text x="455" y="362" class="t-xs t-c t-mu">물리 시뮬레이션</text>
  <rect x="600" y="290" width="250" height="90" rx="10" class="red"/>
  <text x="725" y="318" class="t-b t-c">real</text>
  <text x="725" y="342" class="t-xs t-c t-mono">USB 시리얼 → STS3215 × 6</text>
  <text x="725" y="362" class="t-xs t-c t-mu">SO-ARM101 실물</text>
  <text x="455" y="398" class="t-xs t-c t-mu">위 층은 그대로, 맨 아래 한 층만 바꿔 끼웁니다 (URDF 의 &lt;ros2_control&gt; 태그)</text>
</svg>`
    },

    /* ------------------------------------------------ MoveIt 2 구조 */
    moveit: {
      caption: 'MoveIt 2 의 중심 move_group: 플래닝 씬을 유지하며 IK · 계획 · 충돌 검사 · 시간 계산을 거쳐 컨트롤러에 궤적을 넘깁니다',
      svg: `<svg class="dg" viewBox="0 0 900 420" role="img" aria-label="MoveIt 2 move_group 구조">
  <rect x="20" y="30" width="200" height="54" rx="10" class="purple"/>
  <text x="120" y="52" class="t-sm t-b t-c">RViz MotionPlanning</text>
  <text x="120" y="72" class="t-xs t-c t-mu">인터랙티브 마커</text>
  <rect x="20" y="100" width="200" height="54" rx="10" class="purple"/>
  <text x="120" y="122" class="t-sm t-b t-c">MoveItPy (파이썬)</text>
  <text x="120" y="142" class="t-xs t-c t-mu">moveit_py</text>
  <rect x="20" y="170" width="200" height="54" rx="10" class="purple"/>
  <text x="120" y="192" class="t-sm t-b t-c">MoveGroupInterface</text>
  <text x="120" y="212" class="t-xs t-c t-mu">C++ (moveit_ros_planning_interface)</text>
  <line x1="222" y1="57" x2="268" y2="110" class="ln-purple ar-purple"/>
  <line x1="222" y1="127" x2="268" y2="127" class="ln-purple ar-purple"/>
  <line x1="222" y1="197" x2="268" y2="145" class="ln-purple ar-purple"/>

  <rect x="270" y="20" width="440" height="300" rx="16" class="blue"/>
  <text x="490" y="46" class="t-lg t-b t-c t-blue">move_group</text>
  <rect x="290" y="62" width="400" height="48" rx="8" class="box"/>
  <text x="490" y="82" class="t-sm t-b t-c">플래닝 씬 (Planning Scene)</text>
  <text x="490" y="100" class="t-xs t-c t-mu">로봇 상태 + 주변 물체 + 허용 충돌 행렬(SRDF)</text>
  <rect x="290" y="120" width="190" height="56" rx="8" class="box"/>
  <text x="385" y="142" class="t-sm t-b t-c">① IK 플러그인</text>
  <text x="385" y="162" class="t-xs t-c t-mu">KDL · TRAC-IK · pick_ik</text>
  <rect x="500" y="120" width="190" height="56" rx="8" class="box"/>
  <text x="595" y="142" class="t-sm t-b t-c">② 경로 계획</text>
  <text x="595" y="162" class="t-xs t-c t-mu">OMPL(RRTConnect…) · Pilz · STOMP</text>
  <rect x="290" y="186" width="190" height="56" rx="8" class="box"/>
  <text x="385" y="208" class="t-sm t-b t-c">③ 충돌 검사</text>
  <text x="385" y="228" class="t-xs t-c t-mu">FCL (자기 충돌 · 환경)</text>
  <rect x="500" y="186" width="190" height="56" rx="8" class="box"/>
  <text x="595" y="208" class="t-sm t-b t-c">④ 궤적 처리</text>
  <text x="595" y="228" class="t-xs t-c t-mu">시간 매개변수화(TOTG · Ruckig)</text>
  <rect x="290" y="252" width="400" height="52" rx="8" class="box"/>
  <text x="490" y="272" class="t-sm t-b t-c">⑤ 실행 — MoveItSimpleControllerManager</text>
  <text x="490" y="292" class="t-xs t-c t-mu">moveit_controllers.yaml 의 컨트롤러 이름과 일치해야 함</text>

  <rect x="740" y="120" width="140" height="56" rx="8" class="green"/>
  <text x="810" y="142" class="t-sm t-c t-mono">/joint_states</text>
  <text x="810" y="162" class="t-xs t-c t-mu">현재 상태</text>
  <line x1="738" y1="148" x2="694" y2="90" class="ln-green ar-green"/>
  <rect x="740" y="200" width="140" height="56" rx="8" class="green"/>
  <text x="810" y="222" class="t-sm t-c t-mono">/tf · URDF</text>
  <text x="810" y="242" class="t-xs t-c t-mu">robot_description</text>

  <line x1="490" y1="304" x2="490" y2="348" class="ln-purple thick ar-purple"/>
  <rect x="270" y="350" width="440" height="56" rx="10" class="orange"/>
  <text x="490" y="372" class="t-sm t-b t-c">FollowJointTrajectory → arm_controller</text>
  <text x="490" y="392" class="t-xs t-c t-mu">ros2_control (앞 그림)</text>
</svg>`
    },

    /* ------------------------------------------------ LeRobot 브릿지 */
    lerobot: {
      caption: 'LeRobot 과 ROS 2 잇기: 리더 팔로 시범 → 데이터셋 → 정책 학습 → 정책을 ROS 2 노드로 감싸 컨트롤러에 명령 (연계 강좌 20장의 권장 방식)',
      svg: `<svg class="dg" viewBox="0 0 900 300" role="img" aria-label="LeRobot 모방학습과 ROS 2 브릿지 흐름">
  <rect x="20" y="30" width="160" height="80" rx="12" class="yellow"/>
  <text x="100" y="60" class="t-b t-c">🕹️ 리더 팔</text>
  <text x="100" y="84" class="t-xs t-c">사람이 손으로 움직임</text>
  <rect x="220" y="30" width="160" height="80" rx="12" class="orange"/>
  <text x="300" y="60" class="t-b t-c">🦾 팔로워 팔</text>
  <text x="300" y="84" class="t-xs t-c">그대로 따라 함</text>
  <rect x="420" y="30" width="200" height="80" rx="12" class="teal"/>
  <text x="520" y="60" class="t-b t-c">📼 데이터셋</text>
  <text x="520" y="84" class="t-xs t-c">관절값 + 카메라 영상</text>
  <rect x="660" y="30" width="220" height="80" rx="12" class="purple"/>
  <text x="770" y="60" class="t-b t-c">🧠 정책 학습</text>
  <text x="770" y="84" class="t-xs t-c">ACT · Diffusion · SmolVLA</text>
  <line x1="182" y1="70" x2="216" y2="70" class="ln ar"/><line x1="382" y1="70" x2="416" y2="70" class="ln ar"/><line x1="622" y1="70" x2="656" y2="70" class="ln ar"/>
  <text x="450" y="140" class="t-sm t-c t-mu">── LeRobot (Hugging Face) ──  ↓ 학습된 정책  ── ROS 2 ──</text>
  <line x1="770" y1="112" x2="770" y2="170" class="ln-purple thick ar-purple"/>
  <ellipse cx="770" cy="205" rx="110" ry="32" class="blue"/>
  <text x="770" y="200" class="t-b t-c">정책 노드</text>
  <text x="770" y="220" class="t-xs t-c t-mu">lerobot_policy_node</text>
  <rect x="440" y="180" width="200" height="50" rx="8" class="green"/>
  <text x="540" y="205" class="t-sm t-c t-mono">/joint_states · /camera/…</text>
  <line x1="642" y1="205" x2="656" y2="205" class="ln-green ar-green"/>
  <rect x="440" y="244" width="200" height="46" rx="8" class="green"/>
  <text x="540" y="267" class="t-xs t-c t-mono">…/joint_trajectory</text>
  <line x1="700" y1="232" x2="644" y2="262" class="ln-green ar-green"/>
  <ellipse cx="260" cy="250" rx="150" ry="32" class="blue"/>
  <text x="260" y="245" class="t-b t-c">joint_trajectory_controller</text>
  <text x="260" y="265" class="t-xs t-c t-mu">+ MoveIt 으로 접근 · 운반</text>
  <line x1="438" y1="267" x2="412" y2="258" class="ln-green ar-green"/>
</svg>`
    }
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '로봇팔의 몸 — 링크 · 관절 · 자유도 · TCP',
      html: `
<p><b>매니퓰레이터(manipulator)</b>, 흔히 말하는 로봇팔은 단단한 뼈대인 <b>링크(link)</b> 가 모터가 달린 <b>관절(joint)</b> 로 줄줄이 이어진 구조입니다(13장 URDF 의 link · joint 와 같은 말). 바닥에 고정된 <code>base_link</code> 에서 시작해 끝의 도구까지 한 줄로 이어지므로 <b>직렬(serial) 체인</b>이라고 합니다.</p>
{{fig:anatomy}}
<table class="tbl">
<tr><th>용어</th><th>뜻</th><th>SO-ARM101 에서는</th></tr>
<tr><td><b>자유도(DoF)</b></td><td>독립적으로 움직일 수 있는 축의 수. 공간에서 위치 3 + 자세 3 = 6 을 자유롭게 정하려면 보통 6축이 필요</td><td>팔 5축 + 그리퍼 1축 → 끝점 자세는 일부 제한됨</td></tr>
<tr><td><b>엔드 이펙터</b></td><td>팔 끝에 달린 도구(집게, 흡착기, 용접 토치 …)</td><td>두 손가락 그리퍼 (<code>gripper</code> 관절)</td></tr>
<tr><td><b>TCP</b> (Tool Center Point)</td><td>도구의 “일하는 점”. 목표 좌표는 보통 이 점 기준</td><td><code>gripper_frame_link</code></td></tr>
<tr><td><b>작업 영역(workspace)</b></td><td>TCP 가 닿을 수 있는 공간. 가장자리에서는 자세 선택이 거의 없음</td><td>반경 수십 cm 의 탁상형</td></tr>
</table>
<div class="box analogy"><div class="box-t">🍳 비유 — 내 팔</div>
어깨(좌우 · 위아래 2축) + 팔꿈치(1축) + 손목(3축) = 7축. 사람 팔은 자유도가 6보다 많아서(여유 자유도) 컵을 같은 자세로 잡은 채 팔꿈치를 들었다 내렸다 할 수 있습니다. 로봇에서는 이것을 <b>여유(redundant) 매니퓰레이터</b>라고 합니다.</div>
<p>관절 상태는 <code>/joint_states</code>(<code>sensor_msgs/msg/JointState</code>) 로 방송되고, robot_state_publisher 가 이를 URDF 와 합쳐 모든 링크의 TF 를 만듭니다. 13장에서 본 흐름 그대로입니다.</p>`
    },

    /* ============================================================ 2 */
    {
      title: '관절 공간과 작업 공간 — 순기구학 · 역기구학',
      html: `
<p>로봇팔을 다룰 때는 두 가지 “언어”를 오갑니다. 모터는 <b>관절 각도</b>(관절 공간)를 알아듣고, 사람은 <b>“저 상자 위 10 cm”</b> 같은 좌표(작업 공간)로 생각합니다.</p>
{{fig:spaces}}
<ul>
<li><b>순기구학(Forward Kinematics, FK)</b> — 각도를 알면 TCP 위치 · 자세를 계산. 변환 행렬을 링크 순서대로 곱하기만 하면 되고 답은 항상 <b>하나</b>입니다. TF 트리가 매 순간 하는 일이 바로 FK 입니다.</li>
<li><b>역기구학(Inverse Kinematics, IK)</b> — 원하는 TCP 위치 · 자세를 주면 각도를 계산. 답이 <b>없거나</b>(닿지 않음), <b>여러 개</b>(팔꿈치 위/아래)일 수 있고, 6축 이상은 보통 수치 반복법으로 풉니다.</li>
</ul>
<p>평면 위의 2링크 팔로 직접 계산해 봅시다. 코사인 법칙 하나로 팔꿈치 각도가 나옵니다.</p>
{{fig:ik2}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 손으로 IK 풀기</div>
<ol class="steps-list">
<li>L1 = L2 = 0.1 m, 목표 P = (0.1, 0.1) 일 때 <code>c2 = (0.02 − 0.02) / 0.02 = 0</code> → θ2 = ±90° 입니다.</li>
<li>θ2 = +90° 이면 θ1 = atan2(0.1, 0.1) − atan2(0.1, 0.1) = 0°. 즉 “어깨 수평, 팔꿈치 90° 위로” — 그림을 그려 확인하세요.</li>
<li>θ2 = −90° 일 때 θ1 을 구해 보세요(답: 90°). 두 자세 모두 같은 점에 닿습니다.</li>
<li>P = (0.3, 0) 이면 c2 는? 1 보다 크면 팔이 닿지 않는다는 뜻입니다.</li>
</ol></div>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 특이점(singularity)</div>
팔을 쭉 편 자세처럼 두 관절 축이 한 줄로 서면, 어떤 방향으로는 아무리 관절을 돌려도 TCP 가 움직이지 못하고, 조금 움직이려면 관절 속도가 무한대에 가까워집니다. MoveIt Servo 같은 실시간 제어기는 특이점 근처에서 속도를 줄이거나 멈추는 기능을 갖고 있습니다.</div>`
    },

    /* ============================================================ 3 */
    {
      title: 'SO-ARM101 — 이 장의 로봇팔',
      html: `
<p>이 장은 <b>SO-ARM101</b>(SO-101) 을 예로 씁니다. TheRobotStudio 가 설계하고 Hugging Face <b>LeRobot</b> 프로젝트와 함께 퍼진 오픈소스 탁상형 로봇팔로, 3D 프린팅 부품과 버스 서보로 만들어 값이 싸고 모든 설계가 공개되어 있어 교육 · 연구에 많이 쓰입니다.</p>
<div class="cards c3">
<div class="card orange"><div class="ci">⚙️</div><b>관절 6개</b><p><code>shoulder_pan</code> · <code>shoulder_lift</code> · <code>elbow_flex</code> · <code>wrist_flex</code> · <code>wrist_roll</code> · <code>gripper</code> — URDF · ros2_control · LeRobot 에서 모두 같은 이름</p></div>
<div class="card blue"><div class="ci">🔩</div><b>Feetech STS3215</b><p>한 줄 직렬 버스에 여러 개를 매다는 서보. 한 바퀴를 0~4095 틱(12비트)으로 읽고 씀. 감속비가 다른 모델(1:345 · 1:191 · 1:147)이 섞여 있어 조립 위치가 중요</p></div>
<div class="card green"><div class="ci">🤝</div><b>리더 · 팔로워</b><p>사람이 손으로 움직이는 <b>리더 팔</b>과, 그 각도를 그대로 따라 하는 <b>팔로워 팔</b> 한 쌍. 시범 데이터를 모아 모방학습에 씁니다</p></div>
</div>
<table class="tbl">
<tr><th>관절</th><th>하한</th><th>상한</th></tr>
<tr><td><code>shoulder_pan</code></td><td>−110°</td><td>110°</td></tr>
<tr><td><code>shoulder_lift</code></td><td>−100°</td><td>100°</td></tr>
<tr><td><code>elbow_flex</code></td><td>−96.8°</td><td>96.8°</td></tr>
<tr><td><code>wrist_flex</code></td><td>−95°</td><td>95°</td></tr>
<tr><td><code>wrist_roll</code></td><td>−157.2°</td><td>162.8°</td></tr>
<tr><td><code>gripper</code></td><td>−10°</td><td>100°</td></tr>
</table>
<p class="small">(연계 강좌 15장 URDF 조인트 한계 요약표 기준. 라디안으로는 shoulder_pan ±1.91986 처럼 씁니다.)</p>
<div class="box note"><div class="box-t">🔗 연계 강좌 — SO-ARM101 쉽게 배우기</div>
조립 · 서보 ID 설정 · 캘리브레이션 · LeRobot 텔레오퍼레이션 · 모방학습, 그리고 ROS 2 편(15장 URDF · 16장 워크스페이스 · 17장 ros2_control · 18장 MoveIt 2 · 19장 Gazebo · 20장 LeRobot 브릿지)은
<a href="https://samcho93.github.io/studySOArm101/" target="_blank" rel="noopener">studySOArm101</a> 에서 자세히 다룹니다. 이 장은 그중 “ROS 2 에서 팔을 어떻게 부르고 움직이는가”에 집중합니다.</div>
<p>아래는 연계 강좌의 <b>SO-ARM101 3D 시뮬레이터</b>입니다. 실제 메시(STL)로 그린 팔을 슬라이더로 움직이며 관절 이름과 한계를 눈으로 익혀 보세요.</p>
{{widget:embed|url=https://samcho93.github.io/studySOArm101/sim/index.html|h=560|title=SO-ARM101 3D 시뮬레이터|desc=연계 강좌의 실사형 3D 시뮬레이터 — 관절 슬라이더 · 순/역기구학 · 궤적 재생}}
<div class="box tip"><div class="box-t">💡 이 시뮬레이터와 아래 ROS 2 위젯의 관계</div>
위 3D 시뮬레이터는 <b>로봇 자체</b>(모양 · 기구학)를 익히는 도구이고 ROS 2 그래프에는 연결되지 않습니다. 이어지는 <b>arm 위젯</b>은 같은 관절 이름 · 같은 한계를 쓰는 “ROS 2 쪽 모습” — <code>controller_manager</code> · <code>arm_controller</code> · <code>/joint_states</code> 가 실제처럼 돌아 터미널과 rclpy 로 명령할 수 있습니다.</div>`
    },

    /* ============================================================ 4 */
    {
      title: '관절 궤적 보내기 — JointTrajectory 와 FollowJointTrajectory',
      html: `
<p>ROS 2 에서 로봇팔을 움직이는 가장 기본적인 방법은 “이 시각까지 이 각도들로”를 적은 <b>궤적(trajectory)</b> 을 컨트롤러에 넘기는 것입니다. 받는 쪽은 ros2_control 의 <b>joint_trajectory_controller(JTC)</b> 입니다(15장 ros2_control 참고).</p>
{{fig:jtc}}
<pre class="code" data-lang="text"><code># trajectory_msgs/msg/JointTrajectory (요약)
std_msgs/Header header
string[] joint_names                 # [shoulder_pan, shoulder_lift, ...]
JointTrajectoryPoint[] points
  float64[] positions                # 각 관절 목표 각도 (rad)
  float64[] velocities               # (선택) 주면 3차 스플라인, 가속도까지 주면 5차
  float64[] accelerations
  builtin_interfaces/Duration time_from_start   # 출발 후 몇 초에 도달</code></pre>
<p>보내는 길은 두 가지입니다. <b>토픽</b> <code>/arm_controller/joint_trajectory</code> 는 던지고 끝(결과를 모름), <b>액션</b> <code>/arm_controller/follow_joint_trajectory</code> 는 진행 피드백(목표 · 실제 · 오차)과 성공/실패 결과를 돌려줍니다. MoveIt 도 액션을 씁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 service call /controller_manager/list_controllers controller_manager_msgs/srv/ListControllers
ros2 action list -t
ros2 action send_goal /arm_controller/follow_joint_trajectory control_msgs/action/FollowJointTrajectory "{trajectory: {joint_names: [shoulder_pan, shoulder_lift, elbow_flex, wrist_flex, wrist_roll, gripper], points: [{positions: [0.6, -0.5, 0.8, 0.4, 0.0, 1.0], time_from_start: {sec: 2}}, {positions: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0], time_from_start: {sec: 4}}]}}" --feedback</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /arm_controller/joint_trajectory trajectory_msgs/msg/JointTrajectory "{joint_names: [shoulder_pan, elbow_flex], points: [{positions: [-0.8, 0.9], time_from_start: {sec: 2}}]}"
ros2 topic echo /joint_states --once</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li><b>슬라이더</b> — 아래 arm 위젯에서 관절 슬라이더를 움직이며 TCP 좌표가 어떻게 바뀌는지(FK) 보세요.</li>
<li><b>액션</b> — 위 첫 번째 코드의 ▶ 로 send_goal 을 보내고, 피드백의 <code>error</code> 가 0 으로 줄어드는 것을 보세요.</li>
<li><b>토픽</b> — 두 번째 코드처럼 관절 두 개만 적어도 됩니다(나머지는 제자리). 결과가 돌아오지 않는 차이를 확인하세요.</li>
<li><b>오류 내 보기</b> — <code>time_from_start</code> 를 4 → 1 로 바꿔 시간이 줄어드는 궤적을 보내 보세요. 컨트롤러가 목표를 거부합니다.</li>
</ol></div>
{{widget:arm|mode=joint}}
{{widget:term|chips=ros2 node list;ros2 action list -t;ros2 topic echo /joint_states --once;ros2 param get /arm_controller joints|h=260}}`
    },

    /* ============================================================ 5 */
    {
      title: '여러 점을 잇는 궤적 — 표로 편집하고 rclpy 로 보내기',
      html: `
<p>실제 작업은 “홈 → 준비 → 집기 → 뻗기 → 쉬기”처럼 여러 웨이포인트를 잇습니다. JTC 는 웨이포인트 사이를 스플라인으로 부드럽게 보간해, 각 점에 <code>time_from_start</code> 시각에 정확히 도착하도록 매 제어 주기 목표 각도를 만듭니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 궤적 표</div>
<ol class="steps-list">
<li>아래 위젯 표에서 각도(°)와 시간(s)을 바꾸고 실행하세요. 오른쪽 그래프에 관절별 목표/실제 곡선이 그려집니다.</li>
<li>두 점 사이 시간을 너무 짧게 주면 무슨 일이 생기는지(속도 한계에 걸려 뒤처짐) 보세요.</li>
<li>위젯이 만들어 주는 <code>ros2 action send_goal ...</code> 명령을 복사해 터미널에서 똑같이 실행해 보세요.</li>
</ol></div>
{{widget:arm|mode=traj}}
<p>같은 일을 파이썬 노드로 해 봅시다. <code>ActionClient</code> 에 <code>FollowJointTrajectory.Goal</code> 을 채워 보내는 구조는 turtlesim 의 RotateAbsolute(5장)와 똑같습니다.</p>
{{widget:pylab|ex=arm_traj}}
<p>결과를 기다리며 피드백까지 받는 버전입니다. 한 관절(<code>wrist_roll</code>)만 좌우로 흔듭니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="arm"><code>import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from builtin_interfaces.msg import Duration
from control_msgs.action import FollowJointTrajectory
from trajectory_msgs.msg import JointTrajectoryPoint


def main():
    rclpy.init()
    node = Node('wrist_wave')
    ac = ActionClient(node, FollowJointTrajectory, '/arm_controller/follow_joint_trajectory')
    ac.wait_for_server()

    goal = FollowJointTrajectory.Goal()
    goal.trajectory.joint_names = ['wrist_roll']
    for i, angle in enumerate([1.2, -1.2, 1.2, 0.0]):
        p = JointTrajectoryPoint()
        p.positions = [angle]
        p.time_from_start = Duration(sec=i + 1)
        goal.trajectory.points.append(p)

    def on_feedback(msg):
        err = msg.feedback.error.positions[0]
        node.get_logger().info(f'wrist_roll 오차 {err:+.3f} rad', throttle_duration_sec=0.5)

    result = ac.send_goal(goal, feedback_callback=on_feedback)
    node.get_logger().info(f'완료: error_code={result.result.error_code} (0 = SUCCESSFUL)')
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box warn"><div class="box-t">⚠️ 실물에서는</div>
실제 팔에 처음 궤적을 보낼 때는 <b>작은 각도 · 긴 시간</b>으로 시작하고, 한 손은 전원 스위치에 둡니다. 관절 한계를 넘는 값은 컨트롤러가 거부하거나(이 시뮬레이터는 URDF limit 로 자름) 기구가 부딪힐 수 있습니다.</div>`
    },

    /* ============================================================ 6 */
    {
      title: 'MoveIt 2 — 충돌 없는 움직임 계획',
      html: `
<p>관절 궤적을 손으로 짜는 것은 점이 두세 개일 때나 가능합니다. “책상에 부딪히지 않고 컵 위로 가라”를 풀려면 IK, 충돌 검사, 경로 탐색, 속도 · 가속도 한계를 모두 고려해야 합니다. 이것을 대신해 주는 ROS 2 의 표준 도구가 <b>MoveIt 2</b> 입니다(PickNik 이 주도하는 오픈소스).</p>
{{fig:moveit}}
<table class="tbl">
<tr><th>구성 요소</th><th>하는 일</th><th>대표 선택지</th></tr>
<tr><td><b>move_group</b></td><td>모든 기능을 묶은 중심 노드. 액션 · 서비스로 요청을 받음</td><td><code>/move_action</code>, <code>/execute_trajectory</code>, <code>/compute_ik</code></td></tr>
<tr><td><b>플래닝 씬</b></td><td>로봇의 현재 자세 + 책상 · 벽 · 물체 같은 충돌 물체 + 붙잡은 물체</td><td>RViz 의 Scene Objects, <code>/planning_scene</code></td></tr>
<tr><td><b>IK 플러그인</b></td><td>목표 자세 → 관절값</td><td>KDL(기본), TRAC-IK, pick_ik</td></tr>
<tr><td><b>플래너</b></td><td>시작 → 목표 관절값 사이 충돌 없는 경로 탐색</td><td>OMPL(RRTConnect 등 샘플링 기반), Pilz(직선 LIN · PTP · CIRC), STOMP</td></tr>
<tr><td><b>충돌 검사</b></td><td>경로 위 모든 자세에서 자기 충돌 · 환경 충돌 확인</td><td>FCL</td></tr>
<tr><td><b>궤적 처리</b></td><td>기하 경로에 시간 · 속도를 붙여 관절 한계 안의 궤적으로</td><td>TOTG(시간 최적), Ruckig(저크 제한)</td></tr>
</table>
<p>로봇마다 필요한 설정(<b>SRDF</b>: 플래닝 그룹 · 미리 정한 자세 · 충돌 무시 쌍, <code>kinematics.yaml</code>, <code>joint_limits.yaml</code>, <code>moveit_controllers.yaml</code>)은 <b>MoveIt Setup Assistant</b> 로 URDF 에서 자동 생성해 <code>*_moveit_config</code> 패키지로 만듭니다.</p>
<pre class="code" data-lang="bash"><code># 실제 PC 에서 (브라우저 터미널에서는 실행되지 않습니다)
sudo apt install ros-jazzy-moveit
ros2 launch moveit_setup_assistant setup_assistant.launch.py</code></pre>
<p>코드에서는 파이썬 <b>MoveItPy</b> 나 C++ <b>MoveGroupInterface</b> 로 부릅니다. 아래는 연계 강좌 18장의 예(플래닝 그룹 이름 <code>manipulator</code>)를 줄인 것입니다. MoveItPy 는 설정 파일을 함께 넘겨 실행해야 하므로 보기용으로 싣습니다.</p>
<div class="two"><div>
<pre class="code" data-lang="python"><code>from moveit.planning import MoveItPy
from geometry_msgs.msg import PoseStamped
import rclpy

rclpy.init()
so101 = MoveItPy(node_name='so101_moveit_py')
arm = so101.get_planning_component('manipulator')

target = PoseStamped()
target.header.frame_id = 'base_link'
target.pose.position.x = 0.22
target.pose.position.z = 0.15
target.pose.orientation.w = 1.0

arm.set_start_state_to_current_state()
arm.set_goal_state(pose_stamped_msg=target,
                   pose_link='gripper_frame_link')
plan = arm.plan()
if plan:
    so101.execute(plan.trajectory, controllers=[])</code></pre>
</div><div>
<pre class="code" data-lang="cpp"><code>#include &lt;moveit/move_group_interface/move_group_interface.h&gt;

// node 는 rclcpp::Node::SharedPtr
moveit::planning_interface::MoveGroupInterface
    arm(node, "manipulator");

geometry_msgs::msg::Pose target;
target.position.x = 0.22;
target.position.z = 0.15;
target.orientation.w = 1.0;
arm.setPoseTarget(target);

moveit::planning_interface::MoveGroupInterface::Plan plan;
if (arm.plan(plan) == moveit::core::MoveItErrorCode::SUCCESS)
  arm.execute(plan);</code></pre>
</div></div>`
    },

    /* ============================================================ 7 */
    {
      title: '계획 → 실행, 그리고 Pick & Place',
      html: `
<p>MoveIt 의 사용 흐름은 항상 같습니다. <b>① 목표 정하기</b>(자세 · 관절값 · 이름 붙은 자세) → <b>② 계획(Plan)</b>: IK + 경로 탐색 + 충돌 검사 + 시간 계산 → <b>③ 미리 보기</b> → <b>④ 실행(Execute)</b>: 궤적을 컨트롤러 액션으로 전송. 계획과 실행을 나누는 이유는 사람이 “이 경로 괜찮나?”를 확인할 기회를 주기 위해서입니다.</p>
<div class="flow"><div class="fb purple"><span class="fi">🎯</span><b>목표</b>TCP 좌표 (x, y, z)</div><div class="fb blue"><span class="fi">🧮</span><b>IK</b>목표 관절값</div><div class="fb teal"><span class="fi">🧭</span><b>계획</b>충돌 없는 경로 + 시간</div><div class="fb orange"><span class="fi">▶</span><b>실행</b>FollowJointTrajectory</div></div>
<div class="box practice"><div class="box-t">🧪 해 보기 — MoveIt 방식으로 움직이기</div>
<ol class="steps-list">
<li><b>목표</b> — 아래 위젯의 초록 공을 끌거나 x · y · z(cm)를 입력하세요.</li>
<li><b>계획</b> — 🧭 계획을 누르면 관절별 현재/목표 각도와 planning time 이 나옵니다. 닿지 않는 곳(예: z = 50 cm)은 실패합니다.</li>
<li><b>실행</b> — ▶ 실행을 누르고 터미널에서 <code>ros2 action list</code>, <code>ros2 topic echo /joint_states</code> 로 실제로 액션이 쓰이는지 확인하세요.</li>
<li><b>Pick &amp; Place</b> — 📦 버튼으로 “열기 → 접근 → 내려가기 → 잡기 → 들기 → 옮기기 → 놓기” 전체를 보세요.</li>
</ol></div>
{{widget:arm|mode=moveit}}
<p>Pick &amp; Place 는 계획을 여러 번 이어 붙인 것입니다. 실제 시스템에서는 단계마다 다른 도구를 씁니다.</p>
<ol class="steps-list">
<li><b>인식</b> — 카메라로 물체 위치를 찾아 플래닝 씬에 상자로 추가 (19장 비전)</li>
<li><b>접근(pre-grasp)</b> — 물체 위 약 10 cm 로 자유 공간 계획 (OMPL)</li>
<li><b>하강 · 상승</b> — 물체까지 <b>직선</b>으로 (Cartesian path 또는 Pilz LIN)</li>
<li><b>잡기</b> — 그리퍼 컨트롤러(<code>GripperCommand</code> 액션)로 닫고, 물체를 로봇에 “붙임(attach)” → 이후 충돌 검사에 함께 포함</li>
<li><b>운반 · 놓기 · 복귀</b> — 다시 자유 공간 계획 → 하강 → 열기 → 떼기(detach)</li>
</ol>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>
여러 단계를 한 번에 계획하는 <b>MoveIt Task Constructor(MTC)</b>, 조이스틱 · 정책 출력을 실시간으로 따라가는 <b>MoveIt Servo</b>, GPU 로 빠르게 계획하는 NVIDIA cuMotion 플러그인 등이 쓰입니다. 학습 기반 정책(다음 절)과 MoveIt 을 섞어 쓰는 구성이 늘고 있습니다.</div>`
    },

    /* ============================================================ 8 */
    {
      title: 'LeRobot ↔ ROS 2 — 모방학습과 잇기',
      html: `
<p><b>LeRobot</b> 은 Hugging Face 의 로봇 학습 라이브러리입니다. SO-ARM101 리더 팔로 시범을 보이면 팔로워의 관절값과 카메라 영상이 <b>데이터셋</b>으로 저장되고, 이것으로 <b>정책(policy)</b> — “지금 이렇게 보이면 다음에 관절을 이렇게” — 을 학습합니다(ACT, Diffusion Policy, SmolVLA 등).</p>
<div class="vs"><div class="vs-a purple"><b>LeRobot 이 잘하는 것</b><ul><li>시범 데이터 수집 · 공유(Hub)</li><li>모방학습 · VLA 정책</li><li>잡기처럼 모델링이 어려운 세밀한 동작</li></ul></div><div class="vs-mid">+</div><div class="vs-b blue"><b>ROS 2 가 잘하는 것</b><ul><li>MoveIt 충돌 회피 · 경로 계획</li><li>표준 컨트롤러 · 안전 장치</li><li>센서 · 다른 로봇과의 통합</li></ul></div></div>
{{fig:lerobot}}
<p>연계 강좌 20장은 세 가지 통합 방식을 비교하고, <b>정책을 ROS 2 노드로 감싸는 방식</b>을 권장합니다. 정책 노드가 <code>/joint_states</code> 와 카메라 토픽을 관측으로 받아, 추론한 관절 목표를 컨트롤러의 <code>joint_trajectory</code> 토픽으로 발행합니다. 반대로 ROS 2 에서 <code>ros2 bag record</code> 로 모은 데이터를 LeRobot 데이터셋으로 바꿔 학습에 쓸 수도 있습니다.</p>
<pre class="code" data-lang="bash"><code># 연계 강좌 20장의 정책 노드 실행 예 (실제 PC + 학습된 정책 필요)
ros2 run so_arm_utils lerobot_policy_node --ros-args \\
    -p policy_path:=outputs/train/act_so101/checkpoints/last/pretrained_model \\
    -p task:="Grab the black cube" -p rate_hz:=30.0

# 시범을 ROS 2 bag 으로 기록 → LeRobot 형식으로 변환
ros2 bag record /joint_states /camera/front/image_raw /camera/wrist/image_raw</code></pre>
<div class="box warn"><div class="box-t">⚠️ 시리얼 포트는 하나</div>
LeRobot 과 ROS 2 하드웨어 인터페이스가 <b>같은 USB 시리얼 포트를 동시에 열 수는 없습니다.</b> 번갈아 쓸 때는 한쪽이 포트를 닫은 뒤 다른 쪽이 엽니다. 정책 출력이 라디안인지 정규화 값인지도 반드시 확인하세요 — 단위가 틀리면 팔이 한계까지 튑니다.</div>
<div class="box note"><div class="box-t">🔗 더 알아보기</div>
<a href="https://samcho93.github.io/studySOArm101/lessons/ch20.html" target="_blank" rel="noopener">studySOArm101 20장 — LeRobot ↔ ROS 2 브릿지</a>: 정책 노드 전체 코드, 카메라 토픽 발행, 제어권 전환, 데이터 흐름 검증. 비전 · AI 쪽은 이 강좌 19장에서 이어집니다.</div>`
    },

    /* ============================================================ 9 */
    {
      title: '실물 SO-ARM101 을 ROS 2 로 — 체크리스트',
      html: `
<p>시뮬레이터에서 쓴 명령 · 코드는 실물에서도 그대로입니다. 바뀌는 것은 ros2_control 의 <b>맨 아래 하드웨어 인터페이스 한 층</b>뿐입니다(연계 강좌 17장). 실물에 연결하기 전에 다음을 차례로 확인하세요.</p>
<ol class="steps-list">
<li><b>LeRobot 으로 먼저 검증</b> — 서보 ID(1~6) 설정 · 캘리브레이션을 마치고 LeRobot 텔레오퍼레이션이 정상 동작하는지 확인합니다. 전원 어댑터 전압이 서보 사양과 맞는지 꼭 확인합니다.</li>
<li><b>시리얼 권한</b> — <code>/dev/ttyACM0</code> 같은 포트가 보이는지, 사용자가 <code>dialout</code> 그룹에 있는지(로그아웃 후 적용), 포트 이름이 바뀌지 않게 udev 규칙을 둡니다.</li>
<li><b>mock 으로 먼저</b> — URDF 의 <code>&lt;ros2_control&gt;</code> 하드웨어를 <code>mock_components/GenericSystem</code> 으로 두고 컨트롤러 · MoveIt 이 도는지 확인합니다.</li>
<li><b>하드웨어 플러그인 교체</b> — <code>hardware_type:=real</code> 로 실물 플러그인(시리얼 포트 · 보레이트 1 Mbps 파라미터)을 씁니다. 관절마다 <code>servo_id</code> 와 <code>position_offset</code>(서보 중위 2048 ↔ URDF 0 rad 보정)을 맞춥니다.</li>
<li><b>컨트롤러 확인</b> — <code>ros2 control list_controllers</code> 에서 <code>joint_state_broadcaster</code> · 궤적 컨트롤러가 active 인지, <code>list_hardware_interfaces</code> 에서 인터페이스가 claimed 인지 봅니다.</li>
<li><b>자세 일치</b> — RViz 의 모델 자세와 실물 자세가 같은지 확인합니다. 어긋나면 offset 을 고칩니다.</li>
<li><b>작게 · 천천히</b> — 첫 궤적은 한 관절 10° · 3 초. MoveIt 의 속도 · 가속도 배율(velocity/acceleration scaling)을 0.1 로 시작합니다.</li>
<li><b>이름 일치</b> — <code>moveit_controllers.yaml</code> 의 컨트롤러 이름과 <code>controllers.yaml</code> 이 다르면 “계획은 되는데 실행이 안 되는” 증상이 납니다.</li>
</ol>
<pre class="code" data-lang="bash"><code># 실물 PC 에서 — 연계 강좌 17장의 운용 명령 (ros2controlcli 필요)
ros2 control list_controllers
ros2 control list_hardware_interfaces
ros2 run controller_manager spawner joint_trajectory_controller</code></pre>
<div class="box tip"><div class="box-t">💡 브라우저에서 미리 연습</div>
이 사이트의 터미널에서는 <code>ros2 launch so_arm101_bringup sim.launch.py</code>(ros2_control 시뮬레이터) · <code>ros2 launch so_arm101_bringup moveit.launch.py</code>(move_group 포함) 로 같은 구조를 창으로 띄워 볼 수 있습니다. 실물 버전은 <a href="https://samcho93.github.io/studySOArm101/lessons/ch17.html" target="_blank" rel="noopener">studySOArm101 17장 ros2_control 과 실기 하드웨어 인터페이스</a> 와 <a href="https://samcho93.github.io/studySOArm101/lessons/ch18.html" target="_blank" rel="noopener">18장 MoveIt 2</a> 를 따라 하세요.</div>`
    }
  ],

  videos: [
    { title: 'MoveIt 2 Tutorials Ep 01 Getting Started', channel: 'PickNik Robotics', url: 'https://www.youtube.com/watch?v=TZhZpXW_sLI', lang: 'en', min: '20분', desc: 'MoveIt 2 소스 워크스페이스 구성과 튜토리얼 시작하기. MoveIt 을 만든 팀의 설명입니다.' },
    { title: 'MoveIt 2 Tutorials Ep 06 - MoveIt 2 on Foxy Quickstart with Rviz', channel: 'PickNik Robotics', url: 'https://www.youtube.com/watch?v=kOGFvq9IriI', lang: 'en', min: '20분', desc: 'RViz MotionPlanning 패널로 목표 끌기 → Plan → Execute. 이 장 7절 위젯과 같은 흐름을 실제 MoveIt 으로 봅니다.' },
    { title: 'Dr. Andy Zelenak on MoveIt Servo', channel: 'PickNik Robotics', url: 'https://www.youtube.com/watch?v=t2V4llsSxW4', lang: 'en', min: '15분', desc: '실시간 제어기 MoveIt Servo 소개. 특이점 · 충돌 근처에서 속도를 줄이는 부분을 눈여겨보세요.' },
    { title: 'Robotic Arms Workflow of MoveIt2 with ROS2 for Motion Planning', channel: 'Robotisim (Muhammad Luqman)', url: 'https://www.youtube.com/watch?v=GuOgQzuwNB0', lang: 'en', desc: 'URDF → Setup Assistant → 설정 패키지 → 계획까지 MoveIt 2 작업 흐름 전체를 한 번에 정리.' },
    { title: 'What Is Hugging Face LeRobot? Demo with the Hiwonder SO-ARM101', channel: 'Hiwonder', url: 'https://www.youtube.com/watch?v=oitT8geMat0', lang: 'en', desc: 'SO-ARM101 리더 · 팔로워 텔레오퍼레이션과 LeRobot 학습 결과 데모.' },
    { title: '"LeRobot SO-101 imitation learning" 영상 찾아보기', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=LeRobot+SO-101+imitation+learning', lang: 'en', desc: 'Hugging Face LeRobot 으로 SO-101 데이터 수집 · ACT 학습 · 평가하는 영상을 찾아보세요.' },
    { title: '"로봇팔 역기구학" 영상 찾아보기', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=%EB%A1%9C%EB%B4%87%ED%8C%94+%EC%97%AD%EA%B8%B0%EA%B5%AC%ED%95%99', lang: 'ko', desc: '한국어 순기구학 · 역기구학 강의를 찾아 2링크 계산을 복습해 보세요.' }
  ],

  terms: [
    ['매니퓰레이터(manipulator)', '링크를 관절로 이어 물체를 다루는 로봇팔. 베이스에서 끝까지 한 줄이면 직렬 매니퓰레이터'],
    ['자유도(DoF)', '독립적으로 움직일 수 있는 축의 수. 공간의 임의 위치 · 자세에는 보통 6 이상 필요'],
    ['TCP', 'Tool Center Point. 도구의 기준점. SO-ARM101 은 gripper_frame_link'],
    ['관절 공간 / 작업 공간', '관절 각도들로 표현한 상태 / TCP 의 위치 · 자세로 표현한 상태'],
    ['순기구학(FK)', '관절 각도 → TCP 위치 · 자세. 답은 항상 하나'],
    ['역기구학(IK)', 'TCP 위치 · 자세 → 관절 각도. 해가 없거나 여러 개일 수 있음'],
    ['특이점(singularity)', '관절 축이 정렬되어 특정 방향으로 TCP 를 움직일 수 없게 되는 자세'],
    ['JointTrajectory', 'trajectory_msgs/msg/JointTrajectory. 관절 이름과 시간별 웨이포인트(positions · time_from_start)'],
    ['FollowJointTrajectory', 'control_msgs/action/FollowJointTrajectory. 궤적 실행 액션. 피드백 desired · actual · error, 결과 error_code'],
    ['joint_trajectory_controller', 'ros2_control 컨트롤러. 웨이포인트를 스플라인 보간해 매 주기 관절 명령을 냄'],
    ['MoveIt 2', 'ROS 2 표준 모션 플래닝 프레임워크. move_group, 플래닝 씬, IK, OMPL, 충돌 검사, 궤적 처리'],
    ['플래닝 씬(planning scene)', '로봇 상태와 주변 충돌 물체를 담은 MoveIt 의 세계 모델'],
    ['SRDF', 'Semantic Robot Description Format. 플래닝 그룹 · 이름 붙은 자세 · 충돌 무시 쌍 등 URDF 에 없는 의미 정보'],
    ['STS3215', 'Feetech 직렬 버스 서보. 12비트(0~4095) 위치, SO-ARM101 의 모든 관절에 쓰임'],
    ['LeRobot', 'Hugging Face 의 로봇 학습 라이브러리. 텔레오퍼레이션 데이터 수집과 모방학습 정책(ACT · SmolVLA 등)']
  ],

  summary: [
    '로봇팔은 링크와 관절의 직렬 체인이며, SO-ARM101 은 shoulder_pan ~ wrist_roll 5축 + gripper 로 STS3215 서보 6개를 씁니다.',
    '순기구학(각도 → 위치)은 답이 하나, 역기구학(위치 → 각도)은 해가 없거나 여러 개입니다. 2링크 팔은 코사인 법칙으로 풉니다.',
    '관절 궤적은 JointTrajectory 로 표현하고, joint_trajectory_controller 의 FollowJointTrajectory 액션(/arm_controller/follow_joint_trajectory)으로 실행합니다.',
    'ros2_control 은 컨트롤러 · 컨트롤러 매니저 · 하드웨어 인터페이스 3층이며, mock · gazebo · real 은 맨 아래 한 층만 다릅니다.',
    'MoveIt 2 의 move_group 은 플래닝 씬 위에서 IK → 경로 계획(OMPL 등) → 충돌 검사 → 시간 계산 → 컨트롤러 실행을 맡습니다.',
    'LeRobot 정책은 ROS 2 노드로 감싸 /joint_states · 카메라를 받고 궤적을 발행하는 방식으로 MoveIt · 컨트롤러와 함께 씁니다.',
    '실물 연결은 LeRobot 검증 → 시리얼 권한 → mock → real 플러그인 · offset → 작게 천천히 순서로 합니다.'
  ],

  quiz: [
    { q: '작업 공간의 목표 자세(TCP 위치 · 자세)로부터 관절 각도를 구하는 계산은?', options: ['순기구학(FK)', '역기구학(IK)', '오도메트리', '스플라인 보간'], answer: 1, explain: '역기구학은 위치 · 자세 → 관절 각도입니다. 해가 없거나 여러 개일 수 있어 순기구학보다 어렵습니다.' },
    { q: 'L1 = L2 = 0.1 m 인 평면 2링크 팔이 점 (0.3, 0) 에 닿을 수 있을까요?', options: ['예, 해가 하나', '예, 해가 두 개', '아니요, 최대 도달 거리 0.2 m 보다 멀다', '관절 한계에 따라 다르다'], answer: 2, explain: 'r = 0.3 > L1 + L2 = 0.2 이므로 c2 > 1 이 되어 해가 없습니다.' },
    { q: 'FollowJointTrajectory 액션이 /arm_controller/joint_trajectory 토픽 발행보다 나은 점은?', options: ['더 빠르게 움직인다', '피드백(목표 · 실제 · 오차)과 성공/실패 결과를 받을 수 있고 취소할 수 있다', '관절 이름을 안 적어도 된다', 'QoS 가 필요 없다'], answer: 1, explain: '토픽은 보내고 끝이지만 액션은 진행 피드백 · 결과 · 취소를 지원합니다. MoveIt 도 실행에 이 액션을 씁니다.' },
    { q: 'JointTrajectory 의 웨이포인트 time_from_start 가 [2 s, 4 s, 1 s] 라면?', options: ['정상 실행된다', '마지막 점을 가장 먼저 실행한다', '시간이 증가하지 않아 컨트롤러가 목표를 거부한다', '1 s 를 무시한다'], answer: 2, explain: 'joint_trajectory_controller 는 time_from_start 가 엄격히 증가해야 합니다. 그렇지 않으면 목표를 거부(reject)합니다.' },
    { q: 'MoveIt 2 에서 “책상 · 벽 · 잡은 물체”처럼 충돌 검사에 쓰는 세계 정보를 담는 곳은?', options: ['URDF', '플래닝 씬(Planning Scene)', 'controllers.yaml', 'TF 트리'], answer: 1, explain: '플래닝 씬은 로봇의 현재 상태와 주변 충돌 물체, 붙잡은 물체를 담아 모든 계획 · 충돌 검사의 기준이 됩니다.' },
    { q: 'ros2_control 에서 같은 컨트롤러를 mock · Gazebo · 실물에 그대로 쓸 수 있는 이유는?', options: ['컨트롤러가 하드웨어마다 따로 컴파일되어서', '하드웨어 인터페이스 층만 바꿔 끼우고 위 층은 같은 인터페이스(position 등)만 보기 때문', 'MoveIt 이 하드웨어를 대신 제어해서', 'DDS 가 하드웨어를 흉내 내서'], answer: 1, explain: '컨트롤러는 command/state 인터페이스만 보고 하드웨어를 모릅니다. URDF 의 <ros2_control> 하드웨어 플러그인만 바꾸면 됩니다.' },
    { q: 'LeRobot 정책과 ROS 2 를 함께 쓸 때 연계 강좌가 권장하는 방식은?', options: ['LeRobot 과 ROS 2 가 같은 시리얼 포트를 동시에 연다', '정책을 ROS 2 노드로 감싸 /joint_states · 카메라를 받고 궤적 명령을 발행한다', 'ROS 2 를 끄고 LeRobot 만 쓴다', 'MoveIt 설정 파일에 정책을 넣는다'], answer: 1, explain: '정책 노드 방식은 ROS 2 의 컨트롤러 · 안전 장치 · 시각화를 모두 쓸 수 있습니다. 같은 시리얼 포트를 동시에 여는 것은 불가능합니다.' }
  ],

  slides: [
    { title: '눈 감고 볼펜 집기', layout: 'center', html: `<div class="s-big">✏️ 어깨는 몇 도,<br>팔꿈치는 몇 도?</div><p class="s-center s-small">좌표 한 점 → 관절 각도 여섯 개</p>`, notes: '한 학생에게 눈 감고 볼펜을 집게 한 뒤, 로봇은 이 계산을 어떻게 하는지 묻습니다. 오늘의 두 키워드: 역기구학, 모션 플래닝. (3분)' },
    { title: '로봇팔의 몸', html: `{{fig:anatomy|nocap}}`, notes: '링크 · 관절 · 베이스 · TCP · 작업 영역을 SO-ARM101 관절 이름과 함께 짚습니다. 팔 5축 + 그리퍼라 자세가 일부 제한된다는 점도 언급합니다. (5분)' },
    { title: '두 가지 언어', html: `{{fig:spaces|nocap}}`, notes: '모터의 언어(관절 공간)와 사람의 언어(작업 공간). FK 는 답 하나, IK 는 0개 또는 여러 개임을 강조합니다. (4분)' },
    { title: '2링크 IK 직접 풀기', html: `{{fig:ik2|nocap}}`, notes: '칠판에서 L1 = L2 = 0.1, P = (0.1, 0.1) 을 함께 풉니다. θ2 = ±90° 두 해를 그림으로 확인하고, (0.3, 0) 은 닿지 않음을 보여 줍니다. (10분)' },
    { title: 'SO-ARM101', html: `<div class="s-cols c3"><div class="card orange"><div class="ci">⚙️</div><b>관절 6개</b><p>pan · lift · elbow · wrist ×2 · gripper</p></div><div class="card blue"><div class="ci">🔩</div><b>STS3215</b><p>버스 서보 · 0~4095</p></div><div class="card green"><div class="ci">🤝</div><b>리더 · 팔로워</b><p>LeRobot 모방학습</p></div></div>`, notes: '오픈소스 저가형 팔이라 교육 · 연구에 널리 쓰인다는 점, 연계 강좌에서 조립부터 다룬다는 점을 소개합니다. (4분)' },
    { title: '3D 시뮬레이터로 관절 익히기', html: `{{widget:embed|url=https://samcho93.github.io/studySOArm101/sim/index.html|h=480|title=SO-ARM101 3D 시뮬레이터}}`, notes: '연계 강좌의 3D 시뮬레이터를 불러와 관절 슬라이더를 하나씩 움직여 봅니다. 이 도구는 ROS 2 그래프와 연결되지 않고 로봇 자체를 익히는 용도라는 점을 짚습니다. (5분)' },
    { title: '궤적이 모터까지', html: `{{fig:jtc|nocap}}`, notes: '액션 → JTC → controller_manager → 하드웨어 인터페이스. 15장 ros2_control 을 복습하며 mock · gazebo · real 은 맨 아래만 다르다는 점을 강조합니다. (5분)' },
    { title: 'JointTrajectory', html: `<pre class="code" data-lang="text"><code>joint_names: [shoulder_pan, ..., gripper]
points:
  - positions: [0.6, -0.5, 0.8, 0.4, 0.0, 1.0]
    time_from_start: {sec: 2}
  - positions: [0, 0, 0, 0, 0, 0]
    time_from_start: {sec: 4}</code></pre>`, notes: '메시지 구조를 짚고 time_from_start 가 증가해야 한다는 규칙을 알려 줍니다. 속도까지 주면 3차, 가속도까지 주면 5차 스플라인입니다. (4분)' },
    { title: '직접 움직여 보기', html: `{{widget:arm|mode=joint}}`, notes: '슬라이더로 FK 를 체감하고, 본문의 send_goal 명령을 실행해 피드백 오차가 줄어드는 것을 봅니다. (10분)' },
    { title: 'MoveIt 2 구조', html: `{{fig:moveit|nocap}}`, notes: 'move_group 안의 다섯 단계(플래닝 씬, IK, 계획, 충돌 검사, 궤적 처리)와 실행을 설명합니다. 컨트롤러 이름 불일치가 가장 흔한 실수라는 점을 덧붙입니다. (6분)' },
    { title: '계획 → 실행', html: `<div class="flow"><div class="fb purple"><span class="fi">🎯</span><b>목표</b>x, y, z</div><div class="fb blue"><span class="fi">🧮</span><b>IK</b>관절값</div><div class="fb teal"><span class="fi">🧭</span><b>계획</b>충돌 없음</div><div class="fb orange"><span class="fi">▶</span><b>실행</b>액션</div></div><p class="s-center s-small">본문 7절 위젯으로 Pick &amp; Place 까지</p>`, notes: '계획과 실행을 나누는 이유(사람의 확인)를 설명하고, 본문의 moveit 위젯으로 계획 실패 사례(닿지 않는 목표)와 Pick & Place 를 보여 줍니다. (10분)' },
    { title: 'Pick & Place 파이프라인', html: `<ol class="steps-list"><li><b>인식</b> — 물체를 플래닝 씬에</li><li><b>접근</b> — 위 10 cm 로 (OMPL)</li><li><b>하강 · 상승</b> — 직선 (Pilz LIN)</li><li><b>잡기</b> — GripperCommand + attach</li><li><b>운반 · 놓기</b> — detach</li></ol>`, notes: '단계마다 다른 플래너 · 도구를 쓴다는 점을 강조하고, MoveIt Task Constructor 를 한 줄 소개합니다. (4분)' },
    { title: 'LeRobot ↔ ROS 2', html: `{{fig:lerobot|nocap}}`, notes: '시범 → 데이터셋 → 정책 → ROS 2 노드. 학습 기반과 계획 기반의 장점을 섞는 방향을 설명하고, 시리얼 포트는 하나라는 주의점을 전합니다. (5분)' },
    { title: '실물 체크리스트', html: `<ol class="steps-list"><li>LeRobot 으로 먼저 검증</li><li>시리얼 권한 · udev</li><li>mock 으로 먼저</li><li>real 플러그인 · offset</li><li>작게 · 천천히</li></ol>`, notes: '실물 연결 순서를 요약합니다. 특히 “mock 으로 먼저, 작게 천천히”를 반복해 강조합니다. 자세한 내용은 연계 강좌 17 · 18장. (4분)' }
  ]
});
