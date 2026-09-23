/* 15장 — 시뮬레이션: Gazebo 와 ros2_control */
(function () {
  const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const SDF_WORLD = `<?xml version="1.0"?>
<sdf version="1.9">
  <world name="my_world">
    <physics name="1ms" type="ode"><max_step_size>0.001</max_step_size></physics>
    <plugin filename="gz-sim-physics-system" name="gz::sim::systems::Physics"/>
    <plugin filename="gz-sim-user-commands-system" name="gz::sim::systems::UserCommands"/>
    <plugin filename="gz-sim-scene-broadcaster-system" name="gz::sim::systems::SceneBroadcaster"/>
    <plugin filename="gz-sim-sensors-system" name="gz::sim::systems::Sensors">
      <render_engine>ogre2</render_engine>          <!-- 라이다 · 카메라에 필요 -->
    </plugin>
    <light type="directional" name="sun"> … </light>
    <model name="ground_plane"> … </model>
    <model name="box_obstacle">
      <pose>2 0 0.5 0 0 0</pose> …
    </model>
  </world>
</sdf>`;

  const BRIDGE_YAML = `- ros_topic_name: "/scan"
  gz_topic_name: "/scan"
  ros_type_name: "sensor_msgs/msg/LaserScan"
  gz_type_name: "gz.msgs.LaserScan"
  direction: GZ_TO_ROS

- ros_topic_name: "/cmd_vel"
  gz_topic_name: "/cmd_vel"
  ros_type_name: "geometry_msgs/msg/Twist"
  gz_type_name: "gz.msgs.Twist"
  direction: ROS_TO_GZ

- ros_topic_name: "/clock"
  gz_topic_name: "/clock"
  ros_type_name: "rosgraph_msgs/msg/Clock"
  gz_type_name: "gz.msgs.Clock"
  direction: GZ_TO_ROS`;

  const PLUGINS = `<!-- 차동 구동 (Gazebo 내장 시스템) -->
<gazebo>
  <plugin filename="gz-sim-diff-drive-system" name="gz::sim::systems::DiffDrive">
    <left_joint>left_wheel_joint</left_joint>
    <right_joint>right_wheel_joint</right_joint>
    <wheel_separation>0.34</wheel_separation>
    <wheel_radius>0.05</wheel_radius>
    <topic>cmd_vel</topic>
    <odom_topic>odom</odom_topic>
    <frame_id>odom</frame_id>
    <child_frame_id>base_link</child_frame_id>
    <odom_publish_frequency>30</odom_publish_frequency>
  </plugin>
  <plugin filename="gz-sim-joint-state-publisher-system" name="gz::sim::systems::JointStatePublisher"/>
</gazebo>

<!-- 2D 라이다 -->
<gazebo reference="laser_frame">
  <sensor name="laser" type="gpu_lidar">
    <topic>scan</topic>
    <gz_frame_id>laser_frame</gz_frame_id>
    <update_rate>10</update_rate>
    <lidar>
      <scan><horizontal>
        <samples>360</samples><min_angle>-3.14159</min_angle><max_angle>3.14159</max_angle>
      </horizontal></scan>
      <range><min>0.12</min><max>12.0</max></range>
      <noise><type>gaussian</type><mean>0.0</mean><stddev>0.01</stddev></noise>
    </lidar>
    <always_on>1</always_on>
    <visualize>true</visualize>
  </sensor>
</gazebo>

<!-- IMU (월드에 gz-sim-imu-system 플러그인도 필요) -->
<gazebo reference="imu_link">
  <sensor name="imu" type="imu">
    <topic>imu</topic>
    <gz_frame_id>imu_link</gz_frame_id>
    <update_rate>100</update_rate>
    <always_on>1</always_on>
  </sensor>
</gazebo>

<!-- 카메라 -->
<gazebo reference="camera_link">
  <sensor name="camera" type="camera">
    <topic>camera/image_raw</topic>
    <gz_frame_id>camera_link_optical</gz_frame_id>
    <update_rate>30</update_rate>
    <camera>
      <horizontal_fov>1.089</horizontal_fov>
      <image><width>640</width><height>480</height><format>R8G8B8</format></image>
      <clip><near>0.05</near><far>8.0</far></clip>
    </camera>
  </sensor>
</gazebo>`;

  const R2C_URDF = `<ros2_control name="GazeboSystem" type="system">
  <hardware>
    <plugin>gz_ros2_control/GazeboSimSystem</plugin>   <!-- 실제 로봇이면 모터 드라이버 플러그인 -->
  </hardware>
  <joint name="left_wheel_joint">
    <command_interface name="velocity">
      <param name="min">-10</param><param name="max">10</param>
    </command_interface>
    <state_interface name="position"/>
    <state_interface name="velocity"/>
  </joint>
  <joint name="right_wheel_joint"> … 같은 모양 … </joint>
</ros2_control>

<gazebo>
  <plugin filename="gz_ros2_control-system" name="gz_ros2_control::GazeboSimROS2ControlPlugin">
    <parameters>$(find my_bot)/config/my_controllers.yaml</parameters>
  </plugin>
</gazebo>`;

  const CTRL_YAML = `controller_manager:
  ros__parameters:
    update_rate: 100                    # 제어 루프 Hz

    joint_state_broadcaster:
      type: joint_state_broadcaster/JointStateBroadcaster
    diff_cont:
      type: diff_drive_controller/DiffDriveController

diff_cont:
  ros__parameters:
    left_wheel_names: ["left_wheel_joint"]
    right_wheel_names: ["right_wheel_joint"]
    wheel_separation: 0.34
    wheel_radius: 0.05
    base_frame_id: base_link
    publish_rate: 50.0`;

  Course.lesson({
    id: 'ch15', no: '15',
    icon: '🌍',
    title: '시뮬레이션 — Gazebo와 ros2_control',
    subtitle: '진짜 로봇을 부수기 전에, 가상 세계에서 먼저',
    level: '중급', time: '150분',
    goals: [
      '시뮬레이션의 장점(안전 · 비용 · 반복)과 sim2real 격차를 설명할 수 있다',
      'Gazebo(gz sim, Harmonic)와 ROS 2 를 잇는 ros_gz_sim create · ros_gz_bridge 의 역할과 문법을 설명할 수 있다',
      'URDF 에 라이다 · 카메라 · IMU 센서와 차동 구동 플러그인을 넣는 방법을 읽을 수 있다',
      '가상 로봇(webbot)에서 /scan · /odom · /cmd_vel 을 다루고 장애물 회피 노드를 실행할 수 있다',
      'ros2_control 의 controller_manager · 하드웨어 인터페이스 · 컨트롤러 구조를 그리고 PID 이득을 조절해 볼 수 있다'
    ],
    teacher: {
      intro: '“100만 원짜리 로봇에 처음 짠 코드를 바로 넣어 볼 사람?” 하고 묻습니다. 벽에 박거나 책상에서 떨어지는 영상(또는 이야기)을 곁들여, 시뮬레이터가 왜 첫 번째 시험장인지 공감을 끌어냅니다. (3분)',
      flow: '① 왜 시뮬레이션 10분 → ② Gazebo 버전 · gz sim · SDF 15분 → ③ ros_gz 스폰 · 브리지 20분 → ④ 센서 · 구동 플러그인 15분 → ⑤ webbot 실습(/scan · teleop) 20분 → ⑥ 장애물 회피 코드 15분 → ⑦ ros2_control 구조 20분 → ⑧ PID 튜닝 실습 20분 → ⑨ 다른 시뮬레이터 · 퀴즈 15분'
    },

    figs: {
      /* ---------------------------------------------------------------- 왜 시뮬레이션 */
      simWhy: {
        caption: '같은 ROS 2 코드가 시뮬레이터와 실제 로봇 모두에서 돕니다 — 차이(sim2real 격차)를 줄이는 것이 시뮬레이션 활용의 핵심',
        svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="내 ROS 2 코드가 시뮬레이터와 실제 로봇에 같은 토픽으로 연결되는 구조와 sim2real 격차">
  <ellipse cx="440" cy="60" rx="150" ry="36" class="blue"/>
  <text x="440" y="54" class="t-b t-c t-blue">내 ROS 2 노드들</text>
  <text x="440" y="74" class="t-xs t-c">SLAM · Nav2 · 장애물 회피 …</text>
  <rect x="330" y="120" width="220" height="40" rx="6" class="green"/>
  <text x="440" y="140" class="t-sm t-c t-green t-b">/cmd_vel · /scan · /odom · /tf</text>
  <line x1="440" y1="96" x2="440" y2="116" class="ln ar2"/>
  <rect x="40" y="200" width="330" height="110" rx="16" class="teal"/>
  <text x="205" y="226" class="t-b t-c t-teal">🌍 시뮬레이터 (Gazebo)</text>
  <text x="205" y="254" class="t-sm t-c">✔ 부서지지 않음 · 공짜 · 빨리 감기</text>
  <text x="205" y="278" class="t-sm t-c">✔ 같은 상황을 똑같이 반복</text>
  <text x="205" y="300" class="t-xs t-c t-mu">✔ 정답 위치(ground truth)를 앎</text>
  <rect x="510" y="200" width="330" height="110" rx="16" class="orange"/>
  <text x="675" y="226" class="t-b t-c t-orange">🤖 실제 로봇</text>
  <text x="675" y="254" class="t-sm t-c">센서 잡음 · 미끄러짐 · 지연</text>
  <text x="675" y="278" class="t-sm t-c">배터리 · 온도 · 조명 변화</text>
  <text x="675" y="300" class="t-xs t-c t-mu">최종 검증은 결국 여기서</text>
  <line x1="390" y1="160" x2="250" y2="196" class="ln ar2"/>
  <line x1="490" y1="160" x2="630" y2="196" class="ln ar2"/>
  <line x1="372" y1="255" x2="506" y2="255" class="ln-red thick dash ar2"/>
  <text x="440" y="244" class="t-xs t-c t-red t-b">sim2real 격차</text>
  <text x="440" y="276" class="t-xs t-c t-mu">잡음 · 마찰 · 지연을</text>
  <text x="440" y="292" class="t-xs t-c t-mu">시뮬에 넣어 줄임</text>
</svg>`
      },

      /* ---------------------------------------------------------------- Gazebo 구조 */
      gzArch: {
        caption: 'Gazebo 와 ROS 2 — Gazebo 는 자기만의 통신(gz-transport)을 쓰므로 ros_gz_bridge 가 토픽을 번역하고, ros_gz_sim create 가 URDF 로 로봇을 소환합니다',
        svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="gz sim 서버, SDF 월드, 시스템 플러그인, ros_gz_bridge, ROS 2 노드의 연결">
  <rect x="20" y="20" width="380" height="320" rx="16" class="teal"/>
  <text x="210" y="46" class="t-b t-c t-teal">🌍 gz sim (Gazebo Harmonic)</text>
  <rect x="40" y="64" width="160" height="56" rx="10" class="box"/>
  <text x="120" y="86" class="t-sm t-c t-b">world.sdf</text>
  <text x="120" y="106" class="t-xs t-c t-mu">바닥 · 벽 · 빛 · 물리</text>
  <rect x="220" y="64" width="160" height="56" rx="10" class="box"/>
  <text x="300" y="86" class="t-sm t-c t-b">로봇 모델</text>
  <text x="300" y="106" class="t-xs t-c t-mu">URDF → SDF 자동 변환</text>
  <rect x="40" y="138" width="340" height="96" rx="10" class="box"/>
  <text x="210" y="160" class="t-sm t-c t-b">시스템 플러그인</text>
  <text x="210" y="184" class="t-xs t-c">Physics · Sensors(gpu_lidar · camera) · Imu</text>
  <text x="210" y="204" class="t-xs t-c">DiffDrive · JointStatePublisher</text>
  <text x="210" y="224" class="t-xs t-c t-teal t-b">gz_ros2_control (ros2_control 연결)</text>
  <rect x="40" y="252" width="340" height="70" rx="10" class="gray"/>
  <text x="210" y="274" class="t-sm t-c t-b">gz-transport 토픽</text>
  <text x="210" y="298" class="t-xs t-c t-mono">/scan  /cmd_vel  /odom  /clock</text>
  <ellipse cx="560" cy="287" rx="110" ry="32" class="blue"/>
  <text x="560" y="281" class="t-sm t-c t-b t-blue">parameter_bridge</text>
  <text x="560" y="299" class="t-xs t-c">ros_gz_bridge</text>
  <line x1="382" y1="287" x2="446" y2="287" class="ln ar2 moving"/>
  <ellipse cx="560" cy="92" rx="110" ry="32" class="blue"/>
  <text x="560" y="86" class="t-sm t-c t-b t-blue">create</text>
  <text x="560" y="104" class="t-xs t-c">ros_gz_sim</text>
  <line x1="450" y1="92" x2="384" y2="92" class="ln ar"/>
  <text x="418" y="80" class="t-xs t-c t-mu">소환</text>
  <rect x="690" y="72" width="170" height="40" rx="6" class="green"/>
  <text x="775" y="92" class="t-sm t-c t-green t-b">/robot_description</text>
  <line x1="688" y1="92" x2="672" y2="92" class="ln ar"/>
  <rect x="700" y="176" width="160" height="36" rx="6" class="green"/><text x="780" y="194" class="t-sm t-c t-green t-b">/scan · /odom</text>
  <rect x="700" y="226" width="160" height="36" rx="6" class="green"/><text x="780" y="244" class="t-sm t-c t-green t-b">/cmd_vel</text>
  <rect x="700" y="276" width="160" height="36" rx="6" class="green"/><text x="780" y="294" class="t-sm t-c t-green t-b">/clock</text>
  <line x1="660" y1="270" x2="698" y2="196" class="ln ar"/>
  <line x1="698" y1="244" x2="668" y2="278" class="ln ar"/>
  <line x1="668" y1="292" x2="698" y2="294" class="ln ar"/>
  <text x="780" y="336" class="t-xs t-c t-mu">ROS 2 노드는 use_sim_time:=true</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 브리지 문법 */
      bridgeSyntax: {
        caption: 'parameter_bridge 인자 한 개 해부 — 가운데 기호가 방향을 정합니다: @ 양방향 · [ Gazebo → ROS · ] ROS → Gazebo',
        svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="/scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan 인자의 각 부분 설명">
  <rect x="30" y="80" width="820" height="60" rx="10" class="box"/>
  <text x="95" y="112" class="t-lg t-mono t-c t-b">/scan</text>
  <text x="160" y="112" class="t-lg t-mono t-c t-red t-b">@</text>
  <text x="340" y="112" class="t-lg t-mono t-c t-b">sensor_msgs/msg/LaserScan</text>
  <text x="520" y="112" class="t-lg t-mono t-c t-red t-b">[</text>
  <text x="660" y="112" class="t-lg t-mono t-c t-b">gz.msgs.LaserScan</text>
  <line x1="95" y1="140" x2="95" y2="178" class="ln-blue ar-blue"/>
  <text x="95" y="198" class="t-sm t-c t-blue t-b">토픽 이름</text>
  <text x="95" y="218" class="t-xs t-c t-mu">(양쪽 같은 이름)</text>
  <line x1="340" y1="140" x2="340" y2="178" class="ln-green ar-green"/>
  <text x="340" y="198" class="t-sm t-c t-green t-b">ROS 2 메시지 타입</text>
  <line x1="660" y1="140" x2="660" y2="178" class="ln-teal ar-teal"/>
  <text x="660" y="198" class="t-sm t-c t-teal t-b">Gazebo 메시지 타입</text>
  <line x1="520" y1="80" x2="520" y2="50" class="ln-red ar-red"/>
  <text x="520" y="36" class="t-sm t-c t-red t-b">방향 기호</text>
  <text x="200" y="36" class="t-sm t-c t-mu">@ = 양방향 · [ = gz → ROS · ] = ROS → gz</text>
  <text x="440" y="240" class="t-xs t-c t-mu">예) /cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist   ·   /clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock</text>
</svg>`
      },

      /* ---------------------------------------------------------------- ros2_control 구조 */
      ctrlArch: {
        caption: 'ros2_control 구조 — 컨트롤러는 하드웨어를 몰라도 되고, 하드웨어 인터페이스만 바꾸면 같은 컨트롤러가 Gazebo 와 실제 모터 모두에서 돕니다',
        svg: `<svg class="dg" viewBox="0 0 880 440" role="img" aria-label="controller_manager, 컨트롤러, resource manager, 하드웨어 인터페이스, command/state 인터페이스">
  <rect x="20" y="20" width="840" height="190" rx="16" class="blue"/>
  <text x="440" y="44" class="t-b t-c t-blue">controller_manager (ros2_control_node · update_rate 100 Hz)</text>
  <rect x="40" y="62" width="250" height="70" rx="10" class="box"/>
  <text x="165" y="86" class="t-sm t-c t-b">diff_drive_controller</text>
  <text x="165" y="108" class="t-xs t-c t-mono">~/cmd_vel(TwistStamped) → 바퀴 속도</text>
  <text x="165" y="124" class="t-xs t-c t-mono">→ /odom · /tf</text>
  <rect x="310" y="62" width="250" height="70" rx="10" class="box"/>
  <text x="435" y="86" class="t-sm t-c t-b">joint_trajectory_controller</text>
  <text x="435" y="108" class="t-xs t-c t-mono">FollowJointTrajectory 액션</text>
  <text x="435" y="124" class="t-xs t-c t-mono">로봇팔 · MoveIt 2</text>
  <rect x="580" y="62" width="260" height="70" rx="10" class="box"/>
  <text x="710" y="86" class="t-sm t-c t-b">joint_state_broadcaster</text>
  <text x="710" y="108" class="t-xs t-c t-mono">상태 인터페이스 → /joint_states</text>
  <text x="710" y="124" class="t-xs t-c t-mu">(명령은 안 씀)</text>
  <rect x="40" y="146" width="800" height="50" rx="10" class="purple"/>
  <text x="440" y="166" class="t-sm t-c t-purple t-b">Resource Manager</text>
  <text x="440" y="184" class="t-xs t-c">인터페이스를 빌려주고(claim) 충돌을 막음 — 한 명령 인터페이스는 한 컨트롤러만</text>
  <line x1="220" y1="210" x2="220" y2="256" class="ln-orange thick ar-orange"/>
  <text x="228" y="236" class="t-xs t-orange t-b">command: velocity</text>
  <line x1="400" y1="256" x2="400" y2="212" class="ln-green thick ar-green"/>
  <text x="408" y="236" class="t-xs t-green t-b">state: position · velocity</text>
  <line x1="660" y1="256" x2="660" y2="212" class="ln-green thick ar-green"/>
  <text x="668" y="236" class="t-xs t-green t-b">state: orientation …</text>
  <rect x="20" y="258" width="840" height="100" rx="16" class="orange"/>
  <text x="440" y="280" class="t-b t-c t-orange">하드웨어 인터페이스 (플러그인)</text>
  <rect x="40" y="294" width="330" height="54" rx="10" class="box"/>
  <text x="205" y="314" class="t-sm t-c t-b">System</text>
  <text x="205" y="334" class="t-xs t-c">여러 관절 · 한 통신 버스 (모터 보드, Gazebo)</text>
  <rect x="390" y="294" width="220" height="54" rx="10" class="box"/>
  <text x="500" y="314" class="t-sm t-c t-b">Actuator</text>
  <text x="500" y="334" class="t-xs t-c">관절 1개 (서보 1개)</text>
  <rect x="630" y="294" width="210" height="54" rx="10" class="box"/>
  <text x="735" y="314" class="t-sm t-c t-b">Sensor</text>
  <text x="735" y="334" class="t-xs t-c">읽기 전용 (IMU · 힘센서)</text>
  <rect x="140" y="376" width="260" height="46" rx="10" class="teal"/>
  <text x="270" y="399" class="t-sm t-c t-teal t-b">gz_ros2_control (Gazebo)</text>
  <rect x="480" y="376" width="260" height="46" rx="10" class="gray"/>
  <text x="610" y="399" class="t-sm t-c t-b">실제 모터 드라이버 (C++)</text>
  <text x="440" y="399" class="t-sm t-c t-b">or</text>
</svg>`
      },

      /* ---------------------------------------------------------------- PID */
      pidLoop: {
        caption: 'PID 제어 루프 — 목표(r)와 실제(y)의 차이 e 로 명령 u 를 계산해 모터에 줍니다. 컨트롤러는 이 계산을 update_rate(예: 100 Hz)마다 반복합니다',
        svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="목표, 오차, PID, 모터, 센서 피드백으로 이루어진 폐루프">
  <text x="50" y="110" class="t-sm t-b">목표 r</text>
  <line x1="100" y1="105" x2="176" y2="105" class="ln ar"/>
  <circle cx="200" cy="105" r="22" class="box"/>
  <text x="200" y="100" class="t-sm t-c t-b">Σ</text>
  <text x="186" y="80" class="t-xs t-green t-b">+</text>
  <text x="208" y="142" class="t-xs t-red t-b">−</text>
  <line x1="222" y1="105" x2="296" y2="105" class="ln ar"/>
  <text x="258" y="94" class="t-xs t-c t-b">e = r − y</text>
  <rect x="300" y="50" width="220" height="110" rx="12" class="purple"/>
  <text x="410" y="76" class="t-b t-c t-purple">PID</text>
  <text x="410" y="100" class="t-xs t-c t-mono">Kp·e       (지금 차이)</text>
  <text x="410" y="120" class="t-xs t-c t-mono">+ Ki·∫e dt (쌓인 차이)</text>
  <text x="410" y="140" class="t-xs t-c t-mono">+ Kd·de/dt (변화 속도)</text>
  <line x1="520" y1="105" x2="596" y2="105" class="ln ar moving"/>
  <text x="558" y="94" class="t-xs t-c t-b">u (토크)</text>
  <rect x="600" y="60" width="160" height="90" rx="12" class="orange"/>
  <text x="680" y="92" class="t-b t-c t-orange">관절 · 모터</text>
  <text x="680" y="116" class="t-xs t-c">관성 · 마찰 · 중력</text>
  <line x1="760" y1="105" x2="846" y2="105" class="ln ar"/>
  <text x="826" y="92" class="t-sm t-b">y</text>
  <path d="M800,105 L800,220 L200,220 L200,131" class="ln-green thick ar-green"/>
  <text x="500" y="240" class="t-sm t-c t-green t-b">피드백: 엔코더 → 상태 인터페이스 (position · velocity)</text>
</svg>`
      },

      gzTimeline: `<ol class="timeline">
<li class="gray"><span class="tl-y">2019</span><b>Citadel (LTS)</b><p>새 Gazebo(Ignition) 첫 LTS</p></li>
<li class="blue"><span class="tl-y">2021</span><b>Fortress (LTS)</b><p>ROS 2 Humble 과 짝</p></li>
<li class="teal"><span class="tl-y">2022</span><b>Garden</b><p>이름을 Ignition → Gazebo 로</p></li>
<li class="green"><span class="tl-y">2023</span><b>Harmonic (LTS)</b><p>ROS 2 Jazzy 와 짝 ← 이 강좌</p></li>
<li class="orange"><span class="tl-y">2024</span><b>Ionic</b><p>ROS 2 Kilted 와 짝</p></li>
<li class="red"><span class="tl-y">2025-01</span><b>Gazebo Classic 11 지원 종료</b><p>gazebo_ros_pkgs → ros_gz 로 이전</p></li>
</ol>`
    },

    sections: [
      /* ============================================================ 1 */
      {
        title: '왜 시뮬레이션인가?',
        html: `<p>로봇 코드는 버그가 곧 사고입니다. 속도 부호를 하나 틀리면 로봇이 벽으로 돌진합니다. <b>시뮬레이터</b>는 물리 법칙과 센서를 흉내 낸 가상 세계에서 로봇을 먼저 돌려 보게 해 줍니다.</p>
<div class="stats"><div class="stat green"><b>0 원</b><span>부서져도 비용 없음</span></div><div class="stat blue"><b>×10</b><span>빨리 감기 · 병렬 실행</span></div><div class="stat purple"><b>100%</b><span>같은 상황 재현</span></div><div class="stat orange"><b>정답</b><span>ground truth 위치를 앎</span></div></div>
{{fig:simWhy}}
<p>ROS 2 가 시뮬레이션과 잘 맞는 이유는 <b>토픽 인터페이스가 같기 때문</b>입니다. 시뮬레이터가 실제 로봇과 똑같이 <code>/scan</code> · <code>/odom</code> · <code>/tf</code> 를 발행하고 <code>/cmd_vel</code> 을 받으면, 위쪽의 SLAM · Nav2 코드는 상대가 가상인지 진짜인지 모릅니다.</p>
<div class="box warn"><div class="box-t">⚠️ sim2real 격차</div>시뮬레이터에서 완벽하던 로봇이 실제로는 바퀴가 미끄러지고, 라이다가 유리를 못 보고, 모터가 늦게 반응해 실패하곤 합니다. 이 차이를 <b>sim2real 격차</b>라고 합니다. 센서에 잡음을 넣고, 마찰 · 질량(inertial)을 실제에 맞추고, 여러 조건을 무작위로 바꿔 보는(domain randomization) 방법으로 줄입니다. 그래도 <b>마지막 검증은 실제 로봇</b>에서 합니다.</div>`
      },

      /* ============================================================ 2 */
      {
        title: 'Gazebo 한눈에 — 버전 · gz sim · SDF',
        html: `<p><b>Gazebo</b> 는 ROS 와 함께 가장 널리 쓰이는 오픈소스 로봇 시뮬레이터입니다. 이름이 여러 번 바뀌어 헷갈리니 정리해 봅시다. 옛 <b>Gazebo Classic</b>(버전 11까지)은 2025년 1월에 지원이 끝났고, 지금은 새로 만든 <b>Gazebo</b>(한때 이름 Ignition)를 씁니다. <b>ROS 2 Jazzy 의 짝은 Gazebo Harmonic</b> 입니다.</p>
{{fig:gzTimeline}}
<table class="tbl">
<tr><th></th><th>Gazebo Classic</th><th>Gazebo (새 버전)</th></tr>
<tr><td>실행 명령</td><td><code>gazebo</code></td><td><code>gz sim</code></td></tr>
<tr><td>ROS 연결 패키지</td><td>gazebo_ros_pkgs (플러그인이 ROS 노드)</td><td><b>ros_gz</b> (ros_gz_sim · ros_gz_bridge)</td></tr>
<tr><td>통신</td><td>플러그인이 직접 ROS 토픽 발행</td><td>gz-transport 토픽 → 브리지로 번역</td></tr>
<tr><td>플러그인 이름</td><td><code>libgazebo_ros_diff_drive.so</code></td><td><code>gz-sim-diff-drive-system</code></td></tr>
</table>
<p>실제 PC(Ubuntu 24.04 + Jazzy)에서는 이렇게 설치하고 실행합니다. Gazebo 는 3D 그래픽(GPU)이 필요해 브라우저 터미널에서는 실행되지 않습니다.</p>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-ros-gz
gz sim shapes.sdf
ros2 launch ros_gz_sim gz_sim.launch.py gz_args:="-r empty.sdf"</code></pre>
<p>Gazebo 의 세계는 <b>SDF</b>(Simulation Description Format) 파일로 적습니다. URDF 가 로봇 하나를 적는다면, SDF 는 빛 · 바닥 · 장애물 · 물리 설정 · 시스템 플러그인까지 <b>세계 전체</b>를 적습니다. URDF 로 쓴 로봇은 Gazebo 가 불러올 때 SDF 로 자동 변환합니다.</p>
<pre class="code" data-lang="xml"><code>${X(SDF_WORLD)}</code></pre>
<div class="box tip"><div class="box-t">💡 gz 명령줄 도구</div><code>gz topic -l</code>(Gazebo 토픽 목록), <code>gz topic -e -t /scan</code>(내용 보기), <code>gz model --list</code> 로 ROS 없이도 Gazebo 내부를 볼 수 있습니다. 브리지가 안 될 때 “Gazebo 쪽엔 토픽이 있나?”를 먼저 확인하세요.</div>`
      },

      /* ============================================================ 3 */
      {
        title: 'ros_gz — 로봇 소환하고 토픽 다리 놓기',
        html: `<p>Gazebo 는 ROS 2 와 다른 자기만의 통신(gz-transport)을 씁니다. 그래서 두 가지 연결 도구가 필요합니다.</p>
{{fig:gzArch}}
<ol class="steps-list">
<li><b>robot_state_publisher</b> 로 URDF(xacro)를 <code>robot_description</code> 에 올립니다 (13장).</li>
<li><b>ros_gz_sim create</b> 가 그 URDF 를 읽어 Gazebo 세계에 로봇을 <b>소환(spawn)</b>합니다.</li>
<li><b>ros_gz_bridge parameter_bridge</b> 가 필요한 토픽만 골라 양쪽으로 번역합니다.</li>
<li>모든 ROS 노드는 <code>use_sim_time:=true</code> 로 Gazebo 의 <code>/clock</code> 을 따릅니다.</li></ol>
<pre class="code" data-lang="bash"><code>ros2 launch ros_gz_sim gz_sim.launch.py gz_args:="-r empty.sdf"
ros2 run robot_state_publisher robot_state_publisher --ros-args -p robot_description:="$(xacro my_bot.urdf.xacro)" -p use_sim_time:=true
ros2 run ros_gz_sim create -topic robot_description -name my_bot -z 0.1
ros2 run ros_gz_bridge parameter_bridge /scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan /cmd_vel@geometry_msgs/msg/Twist]gz.msgs.Twist /clock@rosgraph_msgs/msg/Clock[gz.msgs.Clock</code></pre>
{{fig:bridgeSyntax}}
<p>토픽이 많아지면 명령줄 대신 YAML 설정 파일을 씁니다. <code>direction</code> 은 <code>GZ_TO_ROS</code> · <code>ROS_TO_GZ</code> · <code>BIDIRECTIONAL</code> 중 하나입니다.</p>
<pre class="code" data-lang="yaml"><code>${X(BRIDGE_YAML)}</code></pre>
<pre class="code" data-lang="bash"><code>ros2 run ros_gz_bridge parameter_bridge --ros-args -p config_file:=bridge.yaml</code></pre>
<div class="box warn"><div class="box-t">⚠️ 가장 흔한 실수 세 가지</div>① <code>/clock</code> 을 브리지하지 않거나 <code>use_sim_time</code> 을 빠뜨림 → TF extrapolation 오류. ② 방향 기호 <code>[</code> <code>]</code> 를 거꾸로 씀 → 토픽은 보이는데 데이터가 안 옴. ③ Gazebo 쪽 토픽 이름이 다름(예: <code>/model/my_bot/cmd_vel</code>) → <code>gz topic -l</code> 로 정확한 이름 확인.</div>`
      },

      /* ============================================================ 4 */
      {
        title: '센서와 구동 플러그인',
        html: `<p>URDF 만으로는 Gazebo 로봇이 움직이지도, 보지도 못합니다. <code>&lt;gazebo&gt;</code> 태그 안에 <b>센서</b>와 <b>시스템 플러그인</b>을 추가해야 합니다. 보통 <code>my_bot.gazebo.xacro</code> 같은 별도 파일로 나눠 include 합니다.</p>
<div class="cards c4">
<div class="card teal"><div class="ci">📡</div><b>gpu_lidar</b><p>2D/3D 라이다 → <code>/scan</code> (LaserScan)</p></div>
<div class="card orange"><div class="ci">📷</div><b>camera</b><p>RGB 영상 → <code>/camera/image_raw</code></p></div>
<div class="card purple"><div class="ci">🧭</div><b>imu</b><p>각속도 · 가속도 · 자세 → <code>/imu</code></p></div>
<div class="card blue"><div class="ci">🛞</div><b>DiffDrive</b><p><code>/cmd_vel</code> → 바퀴 회전, <code>/odom</code> 발행</p></div>
</div>
<pre class="code" data-lang="xml"><code>${X(PLUGINS)}</code></pre>
<div class="box note"><div class="box-t">📝 월드 쪽 준비물</div>센서는 월드 SDF 에 <code>gz-sim-sensors-system</code>(라이다 · 카메라, <code>render_engine</code> ogre2) 과 <code>gz-sim-imu-system</code>(IMU) 플러그인이 있어야 데이터를 냅니다. 또 센서가 달린 링크에는 <code>&lt;inertial&gt;</code> 이 있어야 물리 엔진이 링크를 지우지 않습니다(13장 07-physics).</div>
<div class="box dev"><div class="box-t">👩‍💻 DiffDrive 플러그인 vs ros2_control</div>간단한 시뮬레이션은 Gazebo 내장 <b>DiffDrive</b> 시스템으로 충분합니다. 하지만 실제 로봇과 <b>같은 제어 코드</b>를 쓰고 싶다면 아래 7절의 <b>ros2_control + gz_ros2_control</b> 을 씁니다. 그러면 시뮬레이션과 실제 로봇의 차이가 하드웨어 플러그인 한 줄로 줄어듭니다.</div>`
      },

      /* ============================================================ 5 */
      {
        title: '이 사이트의 Gazebo 대역 — webbot 시뮬레이터',
        html: `<p>브라우저에서는 Gazebo 를 돌릴 수 없으므로, 이 강좌는 <b>webbot</b> 이라는 가벼운 2D 차동 구동 로봇 시뮬레이터를 씁니다. Gazebo + 브리지를 거친 로봇과 <b>같은 ROS 2 인터페이스</b>를 냅니다: <code>/cmd_vel</code>(구독), <code>/scan</code> · <code>/odom</code> · <code>/imu</code> · <code>/joint_states</code> · <code>/tf</code>(발행).</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 방 안의 로봇</div><ol class="steps-list">
<li>가상 조이스틱(또는 화살표 키)으로 로봇을 움직여 봅니다. 빨간 점들이 라이다가 본 벽입니다.</li>
<li>벽에 가까이 가서 라이다 점이 어떻게 모이는지 봅니다.</li>
<li>세계를 <code>maze</code> 나 <code>warehouse</code> 로 바꿔 봅니다.</li></ol></div>
{{widget:bot|world=room|teleop=1}}
<p>터미널에서 센서 데이터를 직접 봅시다. <code>ranges</code> 배열의 각 값이 한 방향의 거리(m)입니다. <code>angle_min</code> 부터 <code>angle_increment</code> 씩 반시계로 돌아가며 잽니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic list
ros2 topic echo /scan --once</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /scan</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run teleop_twist_keyboard teleop_twist_keyboard</code></pre>
<p>teleop_twist_keyboard 는 <kbd>i</kbd> 앞 · <kbd>,</kbd> 뒤 · <kbd>j</kbd> <kbd>l</kbd> 회전 · <kbd>k</kbd> 정지 키로 <code>/cmd_vel</code> 을 발행합니다. 터미널 창을 클릭한 뒤 키를 누르세요.</p>
<p>로봇을 움직이는 동안 오도메트리와 TF 도 확인해 봅시다. <code>--field</code> 로 필요한 부분만 뽑아 볼 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /odom --field pose.pose.position --once
ros2 run tf2_ros tf2_echo odom base_link</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 터미널 + webbot</div><ol class="steps-list">
<li><code>ros2 topic echo /scan --once</code> 로 한 장의 스캔을 보고 <code>range_min</code> · <code>range_max</code> 를 찾습니다.</li>
<li><code>ros2 topic hz /scan</code> 으로 라이다 주기를 잽니다.</li>
<li>teleop_twist_keyboard 로 로봇을 몰면서 <code>ros2 topic echo /odom --field pose.pose.position</code> 으로 위치가 바뀌는지 봅니다.</li>
<li><code>ros2 run tf2_ros tf2_echo odom base_link</code> 로 12장의 TF 가 여기서도 나오는지 확인합니다.</li></ol></div>
{{widget:lab|with=bot|title=webbot — 터미널 + 시뮬레이터}}
<div class="box note"><div class="box-t">📝 실제 PC 에서 TurtleBot3 로 해 보기</div>ROBOTIS 의 TurtleBot3 는 Gazebo 시뮬레이션 패키지를 제공합니다. 설치 방법은 ROBOTIS e-Manual 의 Jazzy 안내를 따르세요. 설치 후에는 다음과 같이 실행합니다.
<pre class="code" data-lang="bash"><code>export TURTLEBOT3_MODEL=burger
ros2 launch turtlebot3_gazebo turtlebot3_world.launch.py
ros2 run turtlebot3_teleop teleop_keyboard</code></pre>
이 사이트에서는 같은 흐름을 <code>ros2 launch webbot_sim world.launch.py world:=maze</code> 로 흉내 낼 수 있습니다.</div>`
      },

      /* ============================================================ 6 */
      {
        title: '코드로 장애물 피하기',
        html: `<p>시뮬레이터가 있으니 이제 로봇이 <b>스스로</b> 움직이게 해 봅시다. 아래 노드는 <code>/scan</code> 을 받아 앞 · 왼쪽 · 오른쪽 구역의 최소 거리를 구하고, 앞이 막히면 넓은 쪽으로 돌고, 아니면 전진하면서 벽에서 멀어지는 쪽으로 살짝 방향을 틉니다.</p>
<div class="flow"><div class="fb teal"><span class="fi">📡</span><b>/scan</b>LaserScan 360개 거리</div><div class="fb purple"><span class="fi">🧮</span><b>구역 나누기</b>앞 ±25° · 왼쪽 · 오른쪽 최솟값</div><div class="fb orange"><span class="fi">🤔</span><b>판단</b>앞 &lt; 0.45 m → 제자리 회전</div><div class="fb blue"><span class="fi">🛞</span><b>/cmd_vel</b>Twist 발행</div></div>
<div class="box tip"><div class="box-t">💡 qos_profile_sensor_data</div>센서 토픽은 보통 BEST_EFFORT QoS 로 발행됩니다. 구독도 <code>qos_profile_sensor_data</code> 로 맞춰야 메시지를 받을 수 있습니다(11장).</div>
<div class="box practice"><div class="box-t">🧪 해 보기</div><ol class="steps-list">
<li><b>▶ 실행</b> 후 로봇이 벽을 피해 돌아다니는지 봅니다.</li>
<li>임계값 <code>0.45</code> 를 <code>0.8</code> 로 바꾸면 어떻게 달라질까요? 예측한 뒤 실행해 봅니다.</li>
<li><code>cmd.linear.x = 0.2</code> 를 <code>0.5</code> 로 올려 벽에 부딪히는지 확인합니다 — 판단 주기와 속도의 관계를 생각해 봅니다.</li></ol></div>
{{widget:pylab|ex=bot_avoid}}`
      },

      /* ============================================================ 7 */
      {
        title: 'ros2_control — 컨트롤러와 하드웨어를 나누기',
        html: `<p>모터를 돌리는 코드는 로봇마다 다릅니다. 하지만 “바퀴 두 개로 cmd_vel 따라가기”, “관절들을 궤적대로 움직이기” 같은 <b>제어 방법</b>은 로봇이 달라도 같습니다. <b>ros2_control</b> 은 이 둘을 나눠, 컨트롤러는 재사용하고 하드웨어 부분만 새로 쓰게 해 주는 프레임워크입니다.</p>
{{fig:ctrlArch}}
<table class="tbl">
<tr><th>구성 요소</th><th>하는 일</th></tr>
<tr><td><b>controller_manager</b></td><td>제어 루프(read → update → write)를 update_rate 로 돌리고, 컨트롤러를 불러오고(load) · 켜고(activate) · 끔</td></tr>
<tr><td><b>Resource Manager</b></td><td>하드웨어 플러그인을 불러와 인터페이스를 관리. 명령 인터페이스는 한 컨트롤러만 쓸 수 있게 함</td></tr>
<tr><td><b>하드웨어 인터페이스</b></td><td><b>System</b>(여러 관절) · <b>Actuator</b>(관절 1개) · <b>Sensor</b>(읽기 전용). URDF 의 <code>&lt;ros2_control&gt;</code> 태그로 정의</td></tr>
<tr><td><b>command / state 인터페이스</b></td><td>명령: position · velocity · effort, 상태: position · velocity · effort (+ 센서 값)</td></tr>
</table>
<table class="tbl">
<tr><th>자주 쓰는 컨트롤러 (ros2_controllers)</th><th>입력</th><th>용도</th></tr>
<tr><td><code>joint_state_broadcaster</code></td><td>(상태 인터페이스)</td><td>/joint_states 발행 → robot_state_publisher</td></tr>
<tr><td><code>diff_drive_controller</code></td><td><code>~/cmd_vel</code> (Jazzy: <b>TwistStamped</b>)</td><td>차동 구동 로봇, /odom · odom→base_link TF</td></tr>
<tr><td><code>joint_trajectory_controller</code></td><td><code>~/follow_joint_trajectory</code> 액션</td><td>로봇팔 · MoveIt 2 (17장)</td></tr>
<tr><td><code>forward_command_controller</code></td><td><code>~/commands</code> (Float64MultiArray)</td><td>관절 명령을 그대로 전달 (position/velocity/effort)</td></tr>
</table>
<p>URDF 에 하드웨어를, YAML 에 컨트롤러를 적습니다. Gazebo 에서는 하드웨어 플러그인이 <code>gz_ros2_control/GazeboSimSystem</code> 이고, <code>gz_ros2_control-system</code> 플러그인이 Gazebo 안에서 controller_manager 를 대신 띄워 줍니다.</p>
<pre class="code" data-lang="xml"><code>${X(R2C_URDF)}</code></pre>
<pre class="code" data-lang="yaml"><code>${X(CTRL_YAML)}</code></pre>
<p>컨트롤러는 <b>spawner</b> 로 켜고, <code>ros2 control</code> 명령으로 상태를 봅니다. (실제 PC · Gazebo 에서)</p>
<pre class="code" data-lang="bash"><code>ros2 run controller_manager spawner joint_state_broadcaster
ros2 run controller_manager spawner diff_cont
ros2 control list_controllers
ros2 control list_hardware_interfaces
ros2 control list_hardware_components
ros2 run teleop_twist_keyboard teleop_twist_keyboard --ros-args -r /cmd_vel:=/diff_cont/cmd_vel -p stamped:=true</code></pre>
<pre class="code out" data-lang="출력"><code>joint_state_broadcaster joint_state_broadcaster/JointStateBroadcaster  active
diff_cont               diff_drive_controller/DiffDriveController      active</code></pre>
<div class="box warn"><div class="box-t">⚠️ Jazzy 의 diff_drive_controller 는 TwistStamped</div>Jazzy 부터 <code>diff_drive_controller</code> 의 <code>~/cmd_vel</code> 은 <code>geometry_msgs/msg/TwistStamped</code> 만 받습니다. Twist 를 내는 teleop 은 <code>-p stamped:=true</code> 를 주거나 변환 노드를 거쳐야 합니다. 토픽 이름도 컨트롤러 이름 아래(<code>/diff_cont/cmd_vel</code>)라서 리매핑이 필요합니다.</div>`
      },

      /* ============================================================ 8 */
      {
        title: 'PID 튜닝 실습 — 한 관절 제어하기',
        html: `<p>위치 제어 관절은 목표 각도와 실제 각도의 차이를 보고 토크를 정합니다. 가장 널리 쓰는 계산이 <b>PID</b> 입니다. 실제 시스템에서 PID 는 모터 드라이버 안, gz_ros2_control 의 위치 제어 이득, 또는 ros2_controllers 의 <code>pid_controller</code> 등 여러 곳에 있을 수 있습니다. 여기서는 개념을 잡기 위해 한 관절을 직접 튜닝합니다.</p>
{{fig:pidLoop}}
<table class="tbl">
<tr><th>이득</th><th>올리면</th><th>너무 크면</th></tr>
<tr><td><b>Kp</b> (비례)</td><td>빨리 목표로 감</td><td>목표를 지나쳤다 돌아옴(오버슈트) · 진동</td></tr>
<tr><td><b>Ki</b> (적분)</td><td>중력 · 마찰 때문에 남는 오차(정상상태 오차)를 없앰</td><td>느린 출렁임 · 적분 누적(windup)</td></tr>
<tr><td><b>Kd</b> (미분)</td><td>브레이크 역할 — 오버슈트를 줄임</td><td>잡음에 민감, 떨림</td></tr>
</table>
<div class="box practice"><div class="box-t">🧪 해 보기 — PID 튜닝 (위치 제어)</div><ol class="steps-list">
<li><b>⎍ 스텝</b> 을 눌러 목표를 0 ↔ 1 rad 로 바꾸며 기본 이득(Kp 8 · Ki 2 · Kd 0.6)의 응답을 봅니다.</li>
<li>Kd 를 0 으로 내리고 Kp 를 30 으로 올려 보세요. 오버슈트와 진동이 생깁니다. Kd 를 다시 올려 진동을 잡습니다.</li>
<li><b>중력</b> 을 켜고 Ki 를 0 으로 두면 목표보다 조금 아래에서 멈춥니다(정상상태 오차). Ki 를 올려 오차가 사라지는지 봅니다.</li>
<li><b>💥 외란</b> 을 눌러 관절을 툭 쳤을 때 얼마나 빨리 돌아오는지 비교합니다.</li></ol></div>
{{widget:ctrl|ctrl=position}}
<p>이 위젯도 ROS 2 그래프의 일부입니다. <code>controller_manager</code>, <code>forward_position_controller</code>, <code>joint_state_broadcaster</code> 노드가 떠 있어 터미널로 명령을 주고 이득을 바꿀 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic pub --once /forward_position_controller/commands std_msgs/msg/Float64MultiArray "{data: [1.5]}"
ros2 param set /forward_position_controller gains.joint1.p 20.0
ros2 topic echo /joint_states --once</code></pre>
{{widget:term|chips=ros2 node list;ros2 topic pub --once /forward_position_controller/commands std_msgs/msg/Float64MultiArray "{data: [1.5]}";ros2 topic pub --once /forward_position_controller/commands std_msgs/msg/Float64MultiArray "{data: [-1.0]}";ros2 param set /forward_position_controller gains.joint1.p 20.0;ros2 param set /forward_position_controller gains.joint1.d 0.1;ros2 topic echo /joint_states --once}}
<div class="box teacher-note"><div class="box-t">👩‍🏫 강사 노트</div>튜닝 순서의 경험칙: Ki · Kd 를 0 으로 두고 Kp 를 진동 직전까지 올림 → Kd 로 오버슈트를 줄임 → 남는 오차가 있으면 Ki 를 조금. 학생들에게 “가장 빠르면서 오버슈트 5% 이하” 같은 목표를 주고 경쟁시키면 좋습니다.</div>`
      },

      /* ============================================================ 9 */
      {
        title: 'Gazebo 말고도 — 다른 시뮬레이터들',
        html: `<p>Gazebo 는 ROS 와 가장 잘 붙지만, 목적에 따라 더 알맞은 시뮬레이터도 있습니다.</p>
<table class="tbl cmp">
<tr><th>시뮬레이터</th><th>강점</th><th>ROS 2 연결</th><th>이럴 때</th></tr>
<tr><td><b>Gazebo (Harmonic)</b></td><td>ROS 표준 · 센서 플러그인 풍부 · 오픈소스</td><td>ros_gz · gz_ros2_control</td><td>모바일 로봇 · Nav2 · 일반 연구</td></tr>
<tr><td><b>NVIDIA Isaac Sim</b></td><td>사실적 렌더링(RTX) · 합성 데이터 · GPU 물리</td><td>ROS 2 Bridge 확장</td><td>비전 AI 학습 데이터 · 디지털 트윈 (고성능 GPU 필요)</td></tr>
<tr><td><b>Webots</b></td><td>설치 쉬움 · 로봇 모델 많음 · 오픈소스</td><td>webots_ros2</td><td>교육 · 빠른 프로토타입</td></tr>
<tr><td><b>MuJoCo</b></td><td>빠르고 정확한 접촉 물리</td><td>직접 브리지 · 커뮤니티 패키지</td><td>보행 로봇 · 강화학습</td></tr>
<tr><td><b>CoppeliaSim</b></td><td>다양한 물리 엔진 · 스크립트 내장</td><td>simROS2 플러그인</td><td>산업용 팔 · 교육</td></tr>
<tr><td><b>O3DE</b></td><td>게임 엔진 기반 대규모 환경</td><td>ROS 2 Gem</td><td>큰 실외 · 다중 로봇 시뮬레이션</td></tr>
</table>
<div class="cards c2">
<div class="card purple"><div class="ci">🐕</div><b>Unitree Go2 MuJoCo 웹 시뮬레이터</b><p>사족보행 로봇을 브라우저에서 MuJoCo 물리로 걷게 해 봅니다(18장과 연계). <a href="https://samcho93.github.io/studyGo2/sim/index.html" target="_blank" rel="noopener">열기 →</a></p></div>
<div class="card orange"><div class="ci">🦾</div><b>SO-ARM101 강좌 19장 — Gazebo</b><p>로봇팔 URDF 에 gz_ros2_control 을 붙여 Gazebo 에서 궤적 제어를 해 봅니다. <a href="https://samcho93.github.io/studySOArm101/lessons/ch19.html" target="_blank" rel="noopener">열기 →</a></p></div>
</div>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>로봇 AI(강화학습 · 모방학습)가 커지면서 GPU 로 수천 개 환경을 동시에 돌리는 시뮬레이터(Isaac Lab, MuJoCo 의 GPU 판 MJX 등)와, 실제 영상처럼 보이는 합성 데이터가 중요해지고 있습니다. 하지만 ROS 2 와 연결되는 “같은 토픽 인터페이스” 원칙은 그대로입니다.</div>`
      }
    ],

    videos: [
      { title: 'Simulating Robots with Gazebo and ROS | Getting Ready to Build Robots with ROS #8', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=laWn7_cj434', lang: 'en', min: '25분', desc: '시뮬레이션이 왜 필요한지와 Gazebo · ROS 연결 구조를 그림으로 설명합니다 (Classic 기준이지만 개념은 같음).' },
      { title: 'How to upgrade your ROS project to the New Gazebo', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=fH4gkIFZ6W8', lang: 'en', min: '25분', desc: 'Classic 에서 새 Gazebo 로 옮기며 ros_gz_bridge · 센서 · diff drive · ros2_control 을 바꾸는 과정을 보여 줍니다. 꼭 보세요.' },
      { title: 'Solving the problem EVERY robot has (with ros2_control)', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=4QKsDf1c4hc', lang: 'en', min: '25분', desc: 'ros2_control 의 controller manager · 하드웨어 인터페이스 · 컨트롤러 개념을 가장 알기 쉽게 설명합니다.' },
      { title: 'Using ros2_control to drive our robot (off the edge of the bench...)', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=4VVrTCnxvSw', lang: 'en', min: '20분', desc: '시뮬레이션에서 쓰던 ros2_control 설정을 실제 로봇에 옮기는 과정입니다.' },
      { title: 'Driving your virtual robot!', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=IjFcr5r0nMs', lang: 'en', min: '20분', desc: 'Gazebo 로봇에 차동 구동 플러그인을 붙여 teleop 으로 운전해 봅니다.' },
      { title: 'How to Use ROS2 Jazzy and Gazebo Harmonic for Robot Simulation', channel: 'robot mania', url: 'https://www.youtube.com/watch?v=b8VwSsbZYn0', lang: 'en', min: '15분', desc: 'Jazzy + Harmonic 조합으로 로봇을 띄우는 최신 예제입니다.' },
      { title: 'ROS2 Control | Gazebo Harmonic', channel: 'Luis Cruz', url: 'https://www.youtube.com/watch?v=h6x0IFvvkIw', lang: 'en', min: '15분', desc: 'Gazebo Harmonic 에서 gz_ros2_control 로 컨트롤러를 띄우는 과정을 보여 줍니다.' }
    ],

    terms: [
      ['시뮬레이터', '물리 법칙과 센서를 흉내 낸 가상 세계. 실제 로봇 없이 코드를 시험'],
      ['sim2real 격차', '시뮬레이션과 실제 로봇 동작의 차이. 잡음 · 마찰 · 지연 등을 맞춰 줄임'],
      ['Gazebo (gz sim)', 'ROS 와 함께 쓰는 오픈소스 로봇 시뮬레이터. Jazzy 는 Harmonic 과 짝. Classic 11 은 2025-01 지원 종료'],
      ['SDF', 'Simulation Description Format. 월드(빛 · 바닥 · 물체 · 물리 · 플러그인) 전체를 적는 XML 형식'],
      ['ros_gz_sim create', 'robot_description(URDF) 을 읽어 Gazebo 세계에 로봇을 소환하는 실행 파일'],
      ['ros_gz_bridge', 'Gazebo 토픽(gz-transport)과 ROS 2 토픽을 번역하는 브리지. /토픽@ROS타입[gz타입 문법'],
      ['use_sim_time', '노드가 시스템 시계 대신 /clock 토픽(시뮬레이션 시각)을 쓰게 하는 파라미터'],
      ['gpu_lidar · camera · imu', 'Gazebo 센서 종류. 월드에 Sensors · Imu 시스템 플러그인이 필요'],
      ['ros2_control', '컨트롤러와 하드웨어를 나눠, 같은 컨트롤러를 시뮬레이션과 실제 로봇에서 쓰게 하는 프레임워크'],
      ['controller_manager', 'ros2_control 의 중심. 제어 루프를 돌리고 컨트롤러를 load · activate · deactivate'],
      ['command / state 인터페이스', '컨트롤러가 쓰는 명령(position · velocity · effort)과 읽는 상태 값'],
      ['diff_drive_controller', '차동 구동 컨트롤러. ~/cmd_vel(Jazzy: TwistStamped) → 바퀴 속도, /odom 발행'],
      ['joint_state_broadcaster', '상태 인터페이스를 읽어 /joint_states 를 발행하는 컨트롤러'],
      ['gz_ros2_control', 'Gazebo 안에서 ros2_control 을 돌리는 플러그인 (하드웨어: GazeboSimSystem)'],
      ['PID', '비례(Kp) · 적분(Ki) · 미분(Kd) 으로 오차를 줄이는 피드백 제어 계산']
    ],

    summary: [
      '시뮬레이션은 안전 · 무료 · 반복 가능한 첫 시험장이다. ROS 2 는 토픽 인터페이스가 같아 코드를 그대로 옮길 수 있지만, sim2real 격차 때문에 최종 검증은 실제 로봇에서 한다.',
      'Jazzy 는 Gazebo Harmonic(gz sim)과 짝이며, Gazebo Classic 은 2025년 1월 지원이 끝났다. 월드는 SDF, 로봇은 URDF 로 적는다.',
      'ros_gz_sim create 로 robot_description 을 소환하고, ros_gz_bridge 로 /토픽@ROS타입[gz타입 (또는 YAML) 형식으로 토픽을 번역한다. /clock 과 use_sim_time 을 잊지 않는다.',
      '센서(gpu_lidar · camera · imu)와 DiffDrive 는 URDF 의 &lt;gazebo&gt; 태그로 넣고, 월드에 Sensors · Imu 시스템이 있어야 한다.',
      '이 강좌의 webbot 시뮬레이터는 Gazebo 대신 같은 /cmd_vel · /scan · /odom · /tf 인터페이스를 제공한다.',
      'ros2_control 은 controller_manager · Resource Manager · 하드웨어 인터페이스(System · Actuator · Sensor)로 이뤄지고, joint_state_broadcaster · diff_drive_controller · joint_trajectory_controller 같은 컨트롤러를 spawner 로 켠다.',
      'PID 는 Kp 로 빠르게, Kd 로 오버슈트를 줄이고, Ki 로 남은 오차를 없앤다.'
    ],

    quiz: [
      { q: 'ROS 2 Jazzy 와 공식적으로 짝을 이루는 Gazebo 버전은?', options: ['Gazebo Classic 11', 'Gazebo Fortress', 'Gazebo Harmonic', 'Gazebo Citadel'], answer: 2, explain: 'Jazzy 는 Harmonic(LTS)과 짝입니다. Humble 은 Fortress 와 짝이고, Gazebo Classic 11 은 2025년 1월에 지원이 끝났습니다.' },
      { q: 'parameter_bridge 인자 /scan@sensor_msgs/msg/LaserScan[gz.msgs.LaserScan 에서 [ 의 뜻은?', options: ['양방향', 'Gazebo → ROS 한 방향', 'ROS → Gazebo 한 방향', '배열 타입'], answer: 1, explain: '@ 는 양방향, [ 는 Gazebo 에서 ROS 로, ] 는 ROS 에서 Gazebo 로입니다. 라이다는 Gazebo 가 만들어 ROS 로 보내므로 [ 를 씁니다.' },
      { q: 'Gazebo 시뮬레이션에서 ROS 노드들이 use_sim_time:=true 를 써야 하는 이유는?', options: ['CPU 사용량을 줄이려고', 'Gazebo 가 발행하는 /clock 시각에 맞춰 TF · 메시지 시각을 일치시키려고', '로봇 모델을 불러오려고', 'QoS 를 맞추려고'], answer: 1, explain: '시뮬레이터 시각은 실제 시각과 다르게 흐릅니다(느리거나 빠르게, 멈추기도). 모든 노드가 /clock 을 따라야 TF extrapolation 같은 시간 오류가 없습니다.' },
      { q: 'ros2_control 에서 /joint_states 를 발행하는 컨트롤러는?', options: ['diff_drive_controller', 'joint_state_broadcaster', 'forward_command_controller', 'controller_manager'], answer: 1, explain: 'joint_state_broadcaster 는 명령 없이 상태 인터페이스만 읽어 /joint_states 를 발행합니다. robot_state_publisher 가 이것으로 TF 를 만듭니다.' },
      { q: 'ros2_control 의 장점을 가장 잘 설명한 것은?', options: ['Gazebo 없이도 3D 렌더링을 해 준다', '하드웨어 플러그인만 바꾸면 같은 컨트롤러를 시뮬레이션과 실제 로봇에서 쓸 수 있다', '모든 로봇의 URDF 를 자동으로 만든다', 'DDS 를 대체한다'], answer: 1, explain: '컨트롤러는 command/state 인터페이스만 보므로 하드웨어가 Gazebo(GazeboSimSystem)든 실제 모터 드라이버든 상관없습니다.' },
      { q: '위치 PID 제어에서 목표를 크게 지나쳤다가 돌아오는(오버슈트) 현상을 줄이려면 먼저 무엇을 조절할까?', options: ['Kd 를 올리거나 Kp 를 낮춘다', 'Ki 를 크게 올린다', 'update_rate 를 1 Hz 로 낮춘다', '목표 값을 없앤다'], answer: 0, explain: 'Kd 는 변화 속도에 반대로 작용하는 브레이크 역할을 해 오버슈트를 줄입니다. Kp 가 너무 크면 오버슈트가 커집니다. Ki 를 올리면 보통 출렁임이 더 커집니다.' },
      { q: 'Jazzy 의 diff_drive_controller 에 teleop_twist_keyboard 로 명령을 보낼 때 필요한 조치는?', options: ['아무것도 필요 없다', '-p stamped:=true 로 TwistStamped 를 보내고 /diff_cont/cmd_vel 로 리매핑한다', 'ros_gz_bridge 를 끈다', 'use_sim_time 을 false 로 한다'], answer: 1, explain: 'Jazzy 의 diff_drive_controller 는 ~/cmd_vel 에서 TwistStamped 만 받습니다. teleop 의 stamped 파라미터를 켜고, 컨트롤러 이름 아래 토픽으로 리매핑합니다.' }
    ],

    slides: [
      { title: '같은 코드, 두 세계', html: `{{fig:simWhy|nocap}}`, notes: '토픽 인터페이스가 같으면 상위 코드는 가상과 실제를 구분하지 못합니다. sim2real 격차의 예(미끄러짐, 유리, 지연)를 학생들에게 물어 봅니다. (4분)' },
      { title: 'Gazebo 버전 정리', html: `{{fig:gzTimeline|nocap}}`, notes: 'Classic 은 2025-01 종료, Jazzy 는 Harmonic. 인터넷 예제가 gazebo_ros_pkgs(Classic)인지 ros_gz(새 버전)인지 먼저 확인하라고 강조합니다. (3분)' },
      { title: 'Gazebo ↔ ROS 2', html: `{{fig:gzArch|nocap}}`, notes: 'create 로 소환, bridge 로 번역, /clock 과 use_sim_time. 이 세 가지를 기억하면 Gazebo 연결의 90% 입니다. (5분)' },
      { title: '브리지 문법', html: `{{fig:bridgeSyntax|nocap}}`, notes: '@ [ ] 세 기호의 방향을 퀴즈처럼 물어 봅니다. 라이다는 [, cmd_vel 은 ], clock 은 [. (3분)' },
      { title: '센서 · 구동 플러그인', html: `<div class="s-cols c3"><div><b>📡 gpu_lidar</b><p class="s-small">/scan</p></div><div><b>📷 camera · 🧭 imu</b><p class="s-small">/camera/image_raw · /imu</p></div><div><b>🛞 DiffDrive</b><p class="s-small">/cmd_vel → /odom</p></div></div>`, notes: 'URDF 의 gazebo 태그에 센서와 시스템 플러그인을 넣는다는 점, 월드에 Sensors 시스템이 필요하다는 점을 짚습니다. (4분)' },
      { title: 'webbot 시뮬레이터', html: `{{widget:bot|world=room|teleop=1}}`, notes: '브라우저용 Gazebo 대역입니다. 조이스틱으로 몰아 보고 라이다 점이 벽에 찍히는 것을 봅니다. (5분)' },
      { title: '실습: /scan 과 teleop', html: `{{widget:lab|with=bot}}`, notes: 'ros2 topic echo /scan --once, ros2 topic hz /scan, teleop_twist_keyboard 를 차례로 실행합니다. tf2_echo odom base_link 로 12장과 연결합니다. (8분)' },
      { title: '장애물 피하기 코드', html: `{{widget:pylab|ex=bot_avoid}}`, notes: '앞 · 왼쪽 · 오른쪽 구역 최솟값으로 판단하는 간단한 반응형 제어입니다. 임계값과 속도를 바꿔 결과를 예측하게 합니다. (8분)' },
      { title: 'ros2_control 구조', html: `{{fig:ctrlArch|nocap}}`, notes: '컨트롤러 / 리소스 매니저 / 하드웨어 세 층. 하드웨어 플러그인만 바꾸면 같은 컨트롤러가 Gazebo 와 실제 로봇에서 돈다는 점이 핵심입니다. (6분)' },
      { title: '컨트롤러 켜고 보기', layout: 'center', html: `<div class="s-big"><code>ros2 run controller_manager spawner diff_cont</code><br><code>ros2 control list_controllers</code></div><div class="s-small">Jazzy diff_drive_controller = TwistStamped</div>`, notes: 'spawner 와 ros2 control 명령을 소개합니다. Jazzy 에서 TwistStamped 로 바뀐 점 때문에 teleop 이 안 먹는 경우가 많다고 경고합니다. (3분)' },
      { title: 'PID 루프', html: `{{fig:pidLoop|nocap}}`, notes: 'P 는 지금, I 는 과거(쌓인 오차), D 는 미래(변화 방향). 자동차 운전(가속 · 브레이크)에 비유합니다. (4분)' },
      { title: 'PID 튜닝 실습', html: `{{widget:ctrl|ctrl=position}}`, notes: 'Kp 를 올려 오버슈트, Kd 로 잡기, 중력 켜고 Ki 로 정상상태 오차 없애기 순서로 진행합니다. “가장 빠르고 오버슈트 5% 이하” 대회를 해도 좋습니다. (10분)' },
      { title: '다른 시뮬레이터', html: `<ul class="s-points"><li><b>Isaac Sim</b> — 사실적 렌더링 · AI 데이터</li><li><b>Webots</b> — 쉬움 · 교육</li><li><b>MuJoCo</b> — 접촉 물리 · 보행 · 강화학습</li><li><b>CoppeliaSim · O3DE</b> — 산업 · 대규모 환경</li></ul>`, notes: '목적에 따라 시뮬레이터를 고른다는 점을 정리합니다. Go2 MuJoCo 웹 시뮬레이터와 SO-ARM101 Gazebo 장을 소개합니다. (3분)' }
    ]
  });
})();
