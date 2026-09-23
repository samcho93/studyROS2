/* 13장 — URDF · xacro 와 RViz2 */
(function () {
  const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const URDF_01 = `<?xml version="1.0"?>
<robot name="myfirst">
  <link name="base_link">
    <visual>
      <geometry>
        <cylinder length="0.6" radius="0.2"/>
      </geometry>
    </visual>
  </link>
</robot>`;

  const URDF_LEG = `<link name="right_leg">
  <visual>
    <geometry>
      <box size="0.6 0.1 0.2"/>
    </geometry>
    <origin rpy="0 1.57075 0" xyz="0 0 -0.3"/>   <!-- ② 링크 안에서 모양을 옮기고 세움 -->
  </visual>
</link>

<joint name="base_to_right_leg" type="fixed">
  <parent link="base_link"/>
  <child link="right_leg"/>
  <origin xyz="0 -0.22 0.25"/>                  <!-- ① 자식 프레임을 부모에서 어디에 둘까 -->
</joint>`;

  const URDF_LINK = `<link name="wheel">
  <visual>                                   <!-- 눈에 보이는 모양 (RViz) -->
    <origin xyz="0 0 0" rpy="1.5708 0 0"/>
    <geometry><mesh filename="package://my_bot_description/meshes/wheel.stl"/></geometry>
    <material name="black"/>
  </visual>
  <collision>                                <!-- 충돌 계산용: 단순한 도형이 빠름 -->
    <origin xyz="0 0 0" rpy="1.5708 0 0"/>
    <geometry><cylinder radius="0.05" length="0.04"/></geometry>
  </collision>
  <inertial>                                 <!-- 물리 시뮬레이션: 질량 · 무게중심 · 관성 -->
    <origin xyz="0 0 0"/>
    <mass value="0.2"/>
    <inertia ixx="0.000152" ixy="0" ixz="0" iyy="0.00025" iyz="0" izz="0.000152"/>
  </inertial>
</link>`;

  const URDF_JOINT = `<joint name="head_swivel" type="continuous">
  <parent link="base_link"/>
  <child link="head"/>
  <origin xyz="0 0 0.3" rpy="0 0 0"/>
  <axis xyz="0 0 1"/>                        <!-- z 축을 중심으로 돈다 -->
</joint>

<joint name="gripper_extension" type="prismatic">
  <parent link="base_link"/>
  <child link="gripper_pole"/>
  <origin xyz="0.19 0 0.2" rpy="0 0 0"/>
  <limit effort="1000.0" lower="-0.38" upper="0" velocity="0.5"/>   <!-- m, N, m/s -->
</joint>`;

  const XACRO = `<?xml version="1.0"?>
<robot xmlns:xacro="http://www.ros.org/wiki/xacro" name="mybot">

  <!-- ① 속성(property): 숫자에 이름 붙이기 -->
  <xacro:property name="base_width" value="0.30"/>
  <xacro:property name="wheel_radius" value="0.05"/>
  <xacro:property name="wheel_width" value="0.04"/>

  <!-- ② include: 다른 파일 가져오기 -->
  <xacro:include filename="$(find my_bot_description)/urdf/materials.xacro"/>

  <link name="base_link">
    <visual>
      <geometry><box size="0.40 \${base_width} 0.10"/></geometry>
      <material name="blue"/>
    </visual>
  </link>

  <!-- ③ 매크로(macro): 비슷한 블록을 찍어 내는 틀 -->
  <xacro:macro name="wheel" params="prefix y_reflect">
    <link name="\${prefix}_wheel">
      <visual>
        <origin rpy="\${pi/2} 0 0"/>                          <!-- ④ 수식 -->
        <geometry><cylinder radius="\${wheel_radius}" length="\${wheel_width}"/></geometry>
        <material name="black"/>
      </visual>
    </link>
    <joint name="\${prefix}_wheel_joint" type="continuous">
      <parent link="base_link"/>
      <child link="\${prefix}_wheel"/>
      <origin xyz="0 \${y_reflect * (base_width/2 + wheel_width/2)} 0"/>
      <axis xyz="0 1 0"/>
    </joint>
  </xacro:macro>

  <xacro:wheel prefix="left"  y_reflect="1"/>
  <xacro:wheel prefix="right" y_reflect="-1"/>
</robot>`;

  const LAUNCH = `from launch import LaunchDescription
from launch.substitutions import Command, PathJoinSubstitution
from launch_ros.actions import Node
from launch_ros.parameter_descriptions import ParameterValue
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    xacro_file = PathJoinSubstitution([FindPackageShare('my_bot_description'), 'urdf', 'mybot.urdf.xacro'])
    robot_description = ParameterValue(Command(['xacro ', xacro_file]), value_type=str)
    return LaunchDescription([
        Node(package='robot_state_publisher', executable='robot_state_publisher',
             parameters=[{'robot_description': robot_description}]),
        Node(package='joint_state_publisher_gui', executable='joint_state_publisher_gui'),
        Node(package='rviz2', executable='rviz2', arguments=['-d', 'mybot.rviz']),
    ])`;

  Course.lesson({
    id: 'ch13', no: '13',
    icon: '🦴',
    title: 'URDF · xacro와 RViz2',
    subtitle: '로봇의 뼈대를 글로 써서 3D 로 보기',
    level: '중급', time: '150분',
    goals: [
      'URDF 의 링크(visual · collision · inertial)와 조인트(6가지 종류, origin · axis · limit)를 설명할 수 있다',
      'urdf_tutorial 의 01 → 08 단계를 따라가며 URDF 를 한 줄씩 늘려 R2D2 를 완성할 수 있다',
      'xacro 의 속성 · 매크로 · 수식 · include 로 URDF 를 짧게 만들고 xacro 명령으로 전개할 수 있다',
      'robot_state_publisher · joint_state_publisher_gui 가 /joint_states → /tf 를 만드는 흐름을 그릴 수 있다',
      'RViz2 에서 Fixed Frame · RobotModel · TF 디스플레이를 설정하고 .rviz 설정을 저장할 수 있다'
    ],
    teacher: {
      intro: '“로봇을 전화로 설명해야 한다면 무엇을 말해야 할까요?” — 몸통 크기, 팔이 어디에 붙었는지, 어느 방향으로 얼마나 돌아가는지. 학생들이 말한 항목을 칠판에 적고, 그것이 곧 링크 · 조인트 · origin · axis · limit 라는 것을 연결합니다. (3분)',
      flow: '① 도입 · 링크와 조인트 15분 → ② 링크 세 부분 15분 → ③ 조인트 종류 · origin · axis 20분 → ④ urdf_tutorial 01→08 실습 25분 → ⑤ xacro 20분 → ⑥ robot_state_publisher · joint_state_publisher 20분 → ⑦ RViz2 15분 → ⑧ 검사 도구 · SO-ARM101 10분 → ⑨ 퀴즈 10분'
    },

    figs: {
      /* ---------------------------------------------------------------- 링크 · 조인트 트리 */
      linkJoint: {
        caption: 'R2D2(urdf_tutorial)의 링크(파랑 상자)와 조인트(주황 타원) — URDF 는 부모 → 자식으로 이어진 나무 구조입니다',
        svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="base_link 에서 다리, 바퀴, 머리, 그리퍼로 이어지는 링크와 조인트 트리">
  <rect x="370" y="20" width="140" height="44" rx="10" class="s-blue"/><text x="440" y="42" class="t-b t-c tw">base_link</text>
  <ellipse cx="140" cy="120" rx="80" ry="20" class="orange"/><text x="140" y="120" class="t-xs t-c t-orange t-b">fixed</text>
  <ellipse cx="340" cy="120" rx="80" ry="20" class="orange"/><text x="340" y="120" class="t-xs t-c t-orange t-b">fixed</text>
  <ellipse cx="540" cy="120" rx="80" ry="20" class="orange"/><text x="540" y="120" class="t-xs t-c t-orange t-b">continuous</text>
  <ellipse cx="740" cy="120" rx="80" ry="20" class="orange"/><text x="740" y="120" class="t-xs t-c t-orange t-b">prismatic</text>
  <line x1="400" y1="64" x2="160" y2="100" class="ln ar"/>
  <line x1="420" y1="64" x2="350" y2="100" class="ln ar"/>
  <line x1="460" y1="64" x2="530" y2="100" class="ln ar"/>
  <line x1="480" y1="64" x2="720" y2="100" class="ln ar"/>
  <rect x="80" y="170" width="120" height="40" rx="10" class="blue"/><text x="140" y="190" class="t-sm t-c t-blue t-b">right_leg</text>
  <rect x="280" y="170" width="120" height="40" rx="10" class="blue"/><text x="340" y="190" class="t-sm t-c t-blue t-b">left_leg</text>
  <rect x="480" y="170" width="120" height="40" rx="10" class="blue"/><text x="540" y="190" class="t-sm t-c t-blue t-b">head</text>
  <rect x="670" y="170" width="140" height="40" rx="10" class="blue"/><text x="740" y="190" class="t-sm t-c t-blue t-b">gripper_pole</text>
  <line x1="140" y1="140" x2="140" y2="166" class="ln ar"/>
  <line x1="340" y1="140" x2="340" y2="166" class="ln ar"/>
  <line x1="540" y1="140" x2="540" y2="166" class="ln ar"/>
  <line x1="740" y1="140" x2="740" y2="166" class="ln ar"/>
  <rect x="80" y="250" width="120" height="36" rx="10" class="blue"/><text x="140" y="268" class="t-xs t-c t-blue t-b">right_base</text>
  <line x1="140" y1="210" x2="140" y2="246" class="ln ar"/>
  <rect x="20" y="320" width="120" height="36" rx="10" class="blue"/><text x="80" y="338" class="t-xs t-c t-blue t-b">right_front_wheel</text>
  <rect x="150" y="320" width="120" height="36" rx="10" class="blue"/><text x="210" y="338" class="t-xs t-c t-blue t-b">right_back_wheel</text>
  <line x1="120" y1="286" x2="90" y2="316" class="ln ar"/>
  <line x1="160" y1="286" x2="200" y2="316" class="ln ar"/>
  <text x="235" y="302" class="t-xs t-orange">continuous</text>
  <rect x="620" y="250" width="110" height="36" rx="10" class="blue"/><text x="675" y="268" class="t-xs t-c t-blue t-b">left_gripper</text>
  <rect x="750" y="250" width="110" height="36" rx="10" class="blue"/><text x="805" y="268" class="t-xs t-c t-blue t-b">right_gripper</text>
  <line x1="720" y1="210" x2="680" y2="246" class="ln ar"/>
  <line x1="760" y1="210" x2="800" y2="246" class="ln ar"/>
  <text x="740" y="310" class="t-xs t-c t-orange">revolute (limit 0~0.548 rad)</text>
  <text x="520" y="340" class="t-xs t-c t-mu">링크 = 단단한 몸 조각 · 조인트 = 두 링크를 잇는 관절(부모 1 → 자식 1)</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 링크 세 부분 */
      linkParts: {
        caption: '링크 하나는 세 가지 얼굴을 가집니다 — 보이는 모양(visual), 부딪히는 모양(collision), 무게 성질(inertial)',
        svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="링크의 visual, collision, inertial 비교">
  <rect x="20" y="20" width="270" height="260" rx="14" class="blue"/>
  <text x="155" y="48" class="t-b t-c t-blue">&lt;visual&gt;</text>
  <circle cx="155" cy="140" r="58" class="gray"/>
  <circle cx="155" cy="140" r="44" class="box"/>
  <circle cx="155" cy="140" r="12" class="gray"/>
  <line x1="155" y1="96" x2="155" y2="128" class="ln thin"/><line x1="155" y1="152" x2="155" y2="184" class="ln thin"/>
  <line x1="111" y1="140" x2="143" y2="140" class="ln thin"/><line x1="167" y1="140" x2="199" y2="140" class="ln thin"/>
  <text x="155" y="228" class="t-sm t-c">메시(STL · DAE) · 색 · 재질</text>
  <text x="155" y="252" class="t-xs t-c t-mu">RViz · 카메라 렌더링에 쓰임</text>

  <rect x="305" y="20" width="270" height="260" rx="14" class="orange"/>
  <text x="440" y="48" class="t-b t-c t-orange">&lt;collision&gt;</text>
  <circle cx="440" cy="140" r="58" class="nofill ln-orange dash"/>
  <circle cx="440" cy="140" r="58" class="orange"/>
  <text x="440" y="145" class="t-sm t-c t-orange t-b">원기둥 1개</text>
  <text x="440" y="228" class="t-sm t-c">단순한 도형 (box · cylinder · sphere)</text>
  <text x="440" y="252" class="t-xs t-c t-mu">충돌 계산 · MoveIt 경로 계획에 쓰임</text>

  <rect x="590" y="20" width="270" height="260" rx="14" class="purple"/>
  <text x="725" y="48" class="t-b t-c t-purple">&lt;inertial&gt;</text>
  <circle cx="725" cy="140" r="58" class="box"/>
  <circle cx="725" cy="140" r="8" class="s-purple"/>
  <text x="725" y="116" class="t-xs t-c t-purple">무게중심</text>
  <text x="725" y="176" class="t-sm t-c t-mono">m = 0.2 kg</text>
  <text x="725" y="228" class="t-sm t-c">질량 · 무게중심 · 관성 텐서</text>
  <text x="725" y="252" class="t-xs t-c t-mu">Gazebo 물리 시뮬레이션에 꼭 필요</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 조인트 종류 */
      jointTypes: {
        caption: 'URDF 조인트 6종류 — 실제 로봇에서는 revolute · continuous · prismatic · fixed 를 가장 많이 씁니다',
        svg: `<svg class="dg" viewBox="0 0 880 320" role="img" aria-label="revolute, continuous, prismatic, fixed, floating, planar 조인트">
  <rect x="20" y="20" width="270" height="130" rx="12" class="blue"/>
  <text x="155" y="44" class="t-b t-c t-blue">revolute (회전 · 한계 있음)</text>
  <path d="M110,120 A50,50 0 0 1 200,120" class="ln-blue thick ar-blue"/>
  <line x1="110" y1="112" x2="110" y2="130" class="ln-red thick"/><line x1="200" y1="112" x2="200" y2="130" class="ln-red thick"/>
  <text x="155" y="140" class="t-xs t-c t-mu">팔꿈치 · 로봇팔 관절 (lower~upper rad)</text>

  <rect x="305" y="20" width="270" height="130" rx="12" class="teal"/>
  <text x="440" y="44" class="t-b t-c t-teal">continuous (무한 회전)</text>
  <circle cx="440" cy="95" r="30" class="nofill ln-teal thick"/>
  <line x1="440" y1="65" x2="452" y2="65" class="ln-teal thick ar-teal"/>
  <text x="440" y="140" class="t-xs t-c t-mu">바퀴 · 회전 머리 (한계 없음)</text>

  <rect x="590" y="20" width="270" height="130" rx="12" class="orange"/>
  <text x="725" y="44" class="t-b t-c t-orange">prismatic (직선 이동)</text>
  <rect x="650" y="84" width="150" height="20" rx="4" class="gray"/>
  <rect x="690" y="76" width="36" height="36" rx="4" class="s-orange"/>
  <line x1="740" y1="94" x2="790" y2="94" class="ln-orange thick ar-orange"/>
  <text x="725" y="140" class="t-xs t-c t-mu">리니어 가이드 · 엘리베이터 (m)</text>

  <rect x="20" y="170" width="270" height="130" rx="12" class="gray"/>
  <text x="155" y="194" class="t-b t-c">fixed (고정)</text>
  <text x="155" y="245" class="t-xl t-c">🔒</text>
  <text x="155" y="290" class="t-xs t-c t-mu">센서 장착 · 몸체 부품 → /tf_static</text>

  <rect x="305" y="170" width="270" height="130" rx="12" class="purple"/>
  <text x="440" y="194" class="t-b t-c t-purple">floating (6자유도)</text>
  <line x1="440" y1="245" x2="490" y2="245" class="ln-red ar-red"/>
  <line x1="440" y1="245" x2="405" y2="270" class="ln-green ar-green"/>
  <line x1="440" y1="245" x2="440" y2="210" class="ln-blue ar-blue"/>
  <text x="440" y="290" class="t-xs t-c t-mu">x y z + roll pitch yaw 모두 자유</text>

  <rect x="590" y="170" width="270" height="130" rx="12" class="yellow"/>
  <text x="725" y="194" class="t-b t-c">planar (평면 3자유도)</text>
  <path d="M650,260 L700,220 L820,220 L770,260 Z" class="box"/>
  <line x1="735" y1="240" x2="775" y2="240" class="ln-red ar-red"/>
  <line x1="735" y1="240" x2="755" y2="224" class="ln-green ar-green"/>
  <text x="725" y="290" class="t-xs t-c t-mu">평면 위 x · y 이동 + 법선 축 회전</text>
</svg>`
      },

      /* ---------------------------------------------------------------- origin · axis */
      originAxis: {
        caption: 'joint 의 &lt;origin&gt; 은 “부모 프레임에서 자식 프레임을 어디에 어떻게 둘까”, &lt;axis&gt; 는 “자식 프레임의 어느 축으로 움직일까”',
        svg: `<svg class="dg" viewBox="0 0 880 320" role="img" aria-label="부모 링크 프레임에서 origin 만큼 떨어진 자식 프레임과 회전축">
  <rect x="20" y="16" width="540" height="288" rx="14" class="box"/>
  <line x1="90" y1="250" x2="190" y2="250" class="ln-red thick ar-red"/>
  <line x1="90" y1="250" x2="90" y2="150" class="ln-blue thick ar-blue"/>
  <circle cx="90" cy="250" r="6" class="green"/>
  <text x="90" y="280" class="t-sm t-c t-b">parent (base_link)</text>
  <line x1="96" y1="244" x2="344" y2="104" class="ln-purple dash ar-purple"/>
  <text x="200" y="160" class="t-sm t-purple t-b">origin xyz</text>
  <text x="200" y="180" class="t-xs t-purple t-mono">"0.19 0 0.2"</text>
  <line x1="350" y1="100" x2="440" y2="100" class="ln-red thick ar-red"/>
  <line x1="350" y1="100" x2="350" y2="30" class="ln-blue thick ar-blue"/>
  <circle cx="350" cy="100" r="6" class="green"/>
  <text x="360" y="130" class="t-sm t-b">child (gripper_pole)</text>
  <line x1="350" y1="100" x2="500" y2="100" class="ln-orange thick dash"/>
  <text x="470" y="84" class="t-xs t-orange t-b">axis 1 0 0</text>
  <text x="470" y="160" class="t-xs t-mu">prismatic → 이 방향으로</text>
  <text x="470" y="176" class="t-xs t-mu">lower~upper 만큼 이동</text>
  <rect x="580" y="16" width="280" height="288" rx="14" class="purple"/>
  <text x="720" y="44" class="t-b t-c t-purple">순서를 기억하세요</text>
  <text x="600" y="84" class="t-sm">① origin xyz 만큼 이동</text>
  <text x="600" y="114" class="t-sm">② origin rpy 만큼 회전</text>
  <text x="620" y="134" class="t-xs t-mu">(roll → pitch → yaw, 고정축 기준)</text>
  <text x="600" y="168" class="t-sm">③ 관절 값 q 만큼 axis 로</text>
  <text x="620" y="188" class="t-xs t-mu">회전(rad) 또는 이동(m)</text>
  <text x="600" y="228" class="t-sm">axis 를 안 쓰면 기본 1 0 0</text>
  <text x="600" y="258" class="t-sm">단위: m · rad</text>
  <text x="600" y="284" class="t-xs t-mu">visual 의 origin 은 링크 안에서 모양만 옮김</text>
</svg>`
      },

      /* ---------------------------------------------------------------- RSP 흐름 */
      rspFlow: {
        caption: 'URDF 가 3D 로봇이 되기까지 — robot_state_publisher 가 URDF 와 관절 값(/joint_states)을 합쳐 /tf 를 만듭니다',
        svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="xacro, robot_description, robot_state_publisher, joint_state_publisher_gui, tf, rviz2 의 흐름">
  <rect x="20" y="30" width="150" height="56" rx="10" class="gray"/>
  <text x="95" y="52" class="t-sm t-c t-b">mybot.urdf.xacro</text>
  <text x="95" y="72" class="t-xs t-c t-mu">파일</text>
  <line x1="170" y1="58" x2="230" y2="58" class="ln ar"/>
  <text x="200" y="46" class="t-xs t-c t-mu">xacro</text>
  <rect x="234" y="30" width="170" height="56" rx="10" class="orange"/>
  <text x="319" y="52" class="t-sm t-c t-orange t-b">robot_description</text>
  <text x="319" y="72" class="t-xs t-c">파라미터 (URDF 문자열)</text>
  <line x1="319" y1="86" x2="319" y2="126" class="ln ar"/>
  <ellipse cx="319" cy="160" rx="125" ry="32" class="blue"/>
  <text x="319" y="160" class="t-sm t-c t-b t-blue">robot_state_publisher</text>
  <rect x="20" y="236" width="170" height="44" rx="6" class="green"/>
  <text x="105" y="258" class="t-sm t-c t-green t-b">/joint_states</text>
  <ellipse cx="105" cy="160" rx="95" ry="30" class="blue"/>
  <text x="105" y="155" class="t-xs t-c t-b t-blue">joint_state_</text>
  <text x="105" y="170" class="t-xs t-c t-b t-blue">publisher_gui</text>
  <line x1="105" y1="190" x2="105" y2="232" class="ln ar moving"/>
  <path d="M190,250 C250,250 280,220 300,194" class="ln ar moving"/>
  <rect x="520" y="60" width="170" height="44" rx="6" class="green"/>
  <text x="605" y="82" class="t-sm t-c t-green t-b">/robot_description</text>
  <rect x="520" y="138" width="170" height="44" rx="6" class="green"/>
  <text x="605" y="160" class="t-sm t-c t-green t-b">/tf</text>
  <rect x="520" y="216" width="170" height="44" rx="6" class="green"/>
  <text x="605" y="238" class="t-sm t-c t-green t-b">/tf_static</text>
  <line x1="430" y1="146" x2="516" y2="86" class="ln ar"/>
  <line x1="444" y1="160" x2="516" y2="160" class="ln ar moving"/>
  <line x1="430" y1="176" x2="516" y2="232" class="ln ar"/>
  <text x="470" y="274" class="t-xs t-c t-mu">움직이는 조인트 → /tf · 고정 조인트 → /tf_static</text>
  <ellipse cx="800" cy="160" rx="66" ry="32" class="blue"/>
  <text x="800" y="160" class="t-b t-c t-blue">rviz2</text>
  <line x1="690" y1="82" x2="746" y2="140" class="ln ar"/>
  <line x1="690" y1="160" x2="732" y2="160" class="ln ar"/>
  <line x1="690" y1="238" x2="746" y2="180" class="ln ar"/>
  <path d="M520,72 C400,20 200,110 150,138" class="ln dash ar"/>
  <text x="430" y="30" class="t-xs t-c t-mu">GUI 도 모델을 읽어 슬라이더를 만듦</text>
</svg>`
      },

      /* ---------------------------------------------------------------- RViz 화면 구성 */
      rvizPanel: {
        caption: 'RViz2 화면 구성 — 왼쪽 Displays 목록에서 무엇을 그릴지 고르고, Fixed Frame 으로 화면의 기준 좌표계를 정합니다',
        svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="RViz2 의 Displays 패널, 3D 뷰, 도구 막대">
  <rect x="20" y="16" width="840" height="310" rx="12" class="box"/>
  <rect x="20" y="16" width="840" height="34" rx="12" class="gray"/>
  <text x="40" y="34" class="t-xs">🖱 Interact · Move Camera · Select · 2D Pose Estimate · 2D Goal Pose · Publish Point</text>
  <rect x="34" y="62" width="250" height="250" rx="8" class="blue"/>
  <text x="159" y="82" class="t-sm t-c t-blue t-b">Displays</text>
  <text x="50" y="108" class="t-xs t-b">▾ Global Options</text>
  <text x="66" y="128" class="t-xs t-mono">Fixed Frame: base_link</text>
  <text x="66" y="146" class="t-xs t-mono t-mu">Background Color · Frame Rate</text>
  <text x="50" y="172" class="t-xs">☑ Grid</text>
  <text x="50" y="194" class="t-xs">☑ RobotModel</text>
  <text x="66" y="212" class="t-xs t-mono t-mu">Description Topic: /robot_description</text>
  <text x="50" y="236" class="t-xs">☑ TF  <tspan class="t-mu">(Show Names · Axes)</tspan></text>
  <rect x="50" y="262" width="90" height="30" rx="6" class="s-blue"/><text x="95" y="277" class="t-xs t-c tw">Add</text>
  <rect x="150" y="262" width="120" height="30" rx="6" class="gray"/><text x="210" y="277" class="t-xs t-c">By topic</text>
  <rect x="300" y="62" width="546" height="250" rx="8" class="gray"/>
  <line x1="340" y1="280" x2="820" y2="280" class="ln thin"/><line x1="380" y1="240" x2="780" y2="240" class="ln thin"/>
  <line x1="420" y1="200" x2="740" y2="200" class="ln thin"/>
  <rect x="520" y="140" width="110" height="90" rx="12" class="blue"/>
  <line x1="575" y1="185" x2="655" y2="185" class="ln-red thick ar-red"/>
  <line x1="575" y1="185" x2="535" y2="215" class="ln-green thick ar-green"/>
  <line x1="575" y1="185" x2="575" y2="110" class="ln-blue thick ar-blue"/>
  <text x="600" y="100" class="t-xs t-mono">base_link</text>
  <text x="573" y="84" class="t-sm t-c t-b">3D 뷰</text>
  <text x="573" y="300" class="t-xs t-c t-mu">왼쪽 끌기 = 회전 · 가운데(Shift) = 이동 · 휠 = 확대</text>
</svg>`
      },

      tutorialSteps: `<ol class="timeline">
<li class="blue"><span class="tl-y">01</span><b>myfirst</b><p>원기둥 링크 하나</p></li>
<li class="teal"><span class="tl-y">02</span><b>multipleshapes</b><p>다리 추가 · 겹쳐 보임</p></li>
<li class="green"><span class="tl-y">03</span><b>origins</b><p>origin 으로 제자리에</p></li>
<li class="yellow"><span class="tl-y">04</span><b>materials</b><p>색 · 왼쪽 다리</p></li>
<li class="orange"><span class="tl-y">05</span><b>visual</b><p>바퀴 · 그리퍼 · 머리</p></li>
<li class="red"><span class="tl-y">06</span><b>flexible</b><p>움직이는 조인트</p></li>
<li class="purple"><span class="tl-y">07</span><b>physics</b><p>collision · inertial</p></li>
<li class="gray"><span class="tl-y">08</span><b>macroed</b><p>xacro 로 정리</p></li>
</ol>`
    },

    sections: [
      /* ============================================================ 1 */
      {
        title: 'URDF — 로봇을 글로 설명하기',
        html: `<p>12장에서 TF 트리를 손으로 만들었습니다. 그런데 관절이 20개인 로봇이라면 static_transform_publisher 를 20번 실행해야 할까요? 그 대신 로봇의 모양과 관절을 <b>파일 하나</b>에 적어 두고, 도구가 자동으로 TF 를 만들게 합니다. 그 파일 형식이 <b>URDF</b>(Unified Robot Description Format, 통합 로봇 기술 형식)입니다.</p>
<p>URDF 는 XML 파일이고 두 가지 태그가 전부라고 해도 될 정도입니다.</p>
<div class="cards c2">
<div class="card blue"><div class="ci">🧱</div><b>&lt;link&gt; 링크</b><p>단단한 몸 조각. 모양 · 색 · 충돌 모양 · 질량을 가집니다. 각 링크마다 TF 프레임이 하나씩 생깁니다.</p></div>
<div class="card orange"><div class="ci">🔩</div><b>&lt;joint&gt; 조인트</b><p>두 링크를 잇는 관절. 부모 · 자식, 위치(origin), 움직이는 축(axis), 한계(limit)를 가집니다.</p></div>
</div>
{{fig:linkJoint}}
<div class="box analogy"><div class="box-t">🍳 비유 — 인형 조립 설명서</div>“몸통(링크)에 목 관절(조인트)로 머리(링크)를 붙인다. 목은 좌우로만 돈다(axis, continuous).” URDF 는 이런 조립 설명서를 컴퓨터가 읽을 수 있게 쓴 것입니다. 한 부품(자식 링크)은 딱 한 곳(부모)에만 붙기 때문에 전체 모양은 <b>나무</b>가 됩니다 — 그래서 URDF 는 고리 모양(병렬 링크) 로봇을 직접 표현하지 못합니다.</div>
<p>가장 짧은 URDF 는 링크 하나짜리입니다. <code>urdf_tutorial</code> 패키지의 첫 파일을 볼까요?</p>
<pre class="code" data-lang="xml"><code>${X(URDF_01)}</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/01-myfirst.urdf</code></pre>
<p>이 런치 파일은 robot_state_publisher · joint_state_publisher_gui · RViz2 를 한꺼번에 켜서 URDF 를 3D 로 보여 줍니다. 파란 원기둥(높이 0.6 m, 반지름 0.2 m)이 하나 보이면 성공입니다.</p>`
      },

      /* ============================================================ 2 */
      {
        title: '링크 — visual · collision · inertial',
        html: `<p>링크는 세 가지 정보를 담을 수 있습니다. 화면에 보이기만 하면 되는 모델은 <code>&lt;visual&gt;</code> 만 있어도 되지만, Gazebo 같은 물리 시뮬레이터나 MoveIt 충돌 검사에 쓰려면 셋 다 필요합니다.</p>
{{fig:linkParts}}
<pre class="code" data-lang="xml"><code>${X(URDF_LINK)}</code></pre>
<table class="tbl">
<tr><th>요소</th><th>쓰는 곳</th><th>팁</th></tr>
<tr><td><code>&lt;geometry&gt;</code></td><td>visual · collision</td><td><code>box size="x y z"</code> · <code>cylinder radius length</code>(z 축 방향) · <code>sphere radius</code> · <code>mesh filename</code></td></tr>
<tr><td><code>&lt;origin&gt;</code></td><td>visual · collision · inertial</td><td>링크 프레임 안에서 모양(또는 무게중심)을 옮기고 돌림</td></tr>
<tr><td><code>&lt;material&gt;</code></td><td>visual</td><td><code>&lt;color rgba="0 0 0.8 1"/&gt;</code> — 이름을 붙여 재사용</td></tr>
<tr><td><code>&lt;mass&gt;</code> · <code>&lt;inertia&gt;</code></td><td>inertial</td><td>kg · kg·m². 0 이나 터무니없는 값이면 시뮬레이션에서 로봇이 날아갑니다</td></tr>
</table>
<div class="box tip"><div class="box-t">💡 관성 텐서 계산 공식</div>
상자(질량 m, 크기 x·y·z): <code>ixx = m(y²+z²)/12</code>, <code>iyy = m(x²+z²)/12</code>, <code>izz = m(x²+y²)/12</code><br>
원기둥(반지름 r, 길이 h, z 축): <code>ixx = iyy = m(3r²+h²)/12</code>, <code>izz = m·r²/2</code><br>
구(반지름 r): <code>ixx = iyy = izz = 2m·r²/5</code>. 위 바퀴는 원기둥을 x 축으로 돌려 놓았으므로 iyy 가 m·r²/2 = 0.00025 입니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — URDF 편집기 (R2D2)</div><ol class="steps-list">
<li>URDF 탭에서 <code>base_link</code> 의 <code>cylinder</code> 반지름을 0.2 → 0.3 으로 바꿔 3D 뷰가 바로 바뀌는지 봅니다.</li>
<li><code>&lt;material name="blue"/&gt;</code> 를 <code>white</code> 로 바꿔 봅니다.</li>
<li>일부러 <code>&lt;/link&gt;</code> 하나를 지워 보세요. 몇 번째 줄에 오류가 있는지 알려 줍니다.</li>
<li>check_urdf 탭에서 트리 구조(root Link, child 개수)를 확인합니다.</li></ol></div>
{{widget:urdf|model=r2d2}}`
      },

      /* ============================================================ 3 */
      {
        title: '조인트 — 종류 · origin · axis · limit',
        html: `<p>조인트는 “부모 링크의 프레임에서 자식 링크의 프레임을 어디에 두고, 어떻게 움직이게 할지”를 정합니다.</p>
{{fig:jointTypes}}
<table class="tbl">
<tr><th>type</th><th>움직임</th><th>필수 요소</th><th>관절 값 단위</th></tr>
<tr><td><code>revolute</code></td><td>축 둘레 회전, 한계 있음</td><td><code>axis</code>, <code>limit lower upper effort velocity</code></td><td>rad</td></tr>
<tr><td><code>continuous</code></td><td>축 둘레 무한 회전</td><td><code>axis</code></td><td>rad</td></tr>
<tr><td><code>prismatic</code></td><td>축 방향 직선 이동</td><td><code>axis</code>, <code>limit</code></td><td>m</td></tr>
<tr><td><code>fixed</code></td><td>움직이지 않음</td><td>—</td><td>—</td></tr>
<tr><td><code>floating</code></td><td>6자유도 모두 자유</td><td>—</td><td>(거의 안 씀)</td></tr>
<tr><td><code>planar</code></td><td>평면 위 이동 + 회전</td><td><code>axis</code>(평면의 법선)</td><td>(거의 안 씀)</td></tr>
</table>
{{fig:originAxis}}
<pre class="code" data-lang="xml"><code>${X(URDF_JOINT)}</code></pre>
<div class="box warn"><div class="box-t">⚠️ 두 개의 origin 을 헷갈리지 마세요</div><b>joint 의 origin</b> 은 자식 <b>프레임</b>을 옮깁니다(TF 가 바뀜). <b>visual 의 origin</b> 은 그 프레임 안에서 <b>모양만</b> 옮깁니다(TF 는 그대로). 관절이 엉뚱한 곳을 중심으로 돈다면 대개 모양을 joint origin 으로 옮겨야 할 것을 visual origin 으로 옮긴 경우입니다.</div>
<p>limit 의 <code>effort</code>(N 또는 N·m)와 <code>velocity</code>(m/s 또는 rad/s)는 revolute · prismatic 에서 필수입니다. 이 값은 ros2_control · MoveIt 이 실제로 참고합니다.</p>`
      },

      /* ============================================================ 4 */
      {
        title: 'urdf_tutorial 따라가기 — 01 에서 08 까지',
        html: `<p>ROS 공식 <code>urdf_tutorial</code> 패키지는 R2D2 를 여덟 단계로 조금씩 완성합니다. 파일을 하나씩 바꿔 가며 같은 런치 파일로 열어 보세요.</p>
{{fig:tutorialSteps}}
<p><b>02 → 03 이 가장 중요합니다.</b> 02 에서는 다리가 몸통 한가운데 겹쳐 있습니다. 03 에서 joint origin 으로 다리 프레임을 옆으로 옮기고(<code>xyz="0 -0.22 0.25"</code>), visual origin 으로 상자를 세워 아래로 내립니다(<code>rpy="0 1.57075 0" xyz="0 0 -0.3"</code>).</p>
<pre class="code" data-lang="xml"><code>${X(URDF_LEG)}</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/03-origins.urdf</code></pre>
<p>06-flexible 부터는 관절이 움직입니다. <b>Joint State Publisher</b> 창의 슬라이더로 머리(head_swivel)를 돌리고 그리퍼(gripper_extension)를 넣었다 뺐다 해 보세요. 슬라이더 값이 <code>/joint_states</code> 로 나가고, TF 가 바뀌고, 모델이 움직입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/06-flexible.urdf &amp;
ros2 topic echo /joint_states --once
ros2 run tf2_ros tf2_echo base_link gripper_pole</code></pre>
<pre class="code out" data-lang="출력"><code>header:
  stamp: …
  frame_id: ''
name:
- right_front_wheel_joint
- right_back_wheel_joint
- left_front_wheel_joint
- …
- gripper_extension
- head_swivel
position:
- 0.0
- …</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div><ol class="steps-list">
<li>터미널에서 <code>01-myfirst</code> → <code>03-origins</code> → <code>05-visual</code> 순서로 실행해(바꿀 때 Ctrl+C) 모양이 어떻게 늘어나는지 봅니다.</li>
<li><code>06-flexible</code> 을 실행하고 슬라이더로 <code>gripper_extension</code> 을 움직이며 <code>tf2_echo base_link gripper_pole</code> 의 x 값이 0.19 에서 −0.19 까지 바뀌는지 확인합니다.</li>
<li><code>ros2 run tf2_tools view_frames</code> 로 전체 링크 트리를 확인합니다.</li></ol></div>
{{widget:term|chips=ros2 launch urdf_tutorial display.launch.py model:=urdf/01-myfirst.urdf;ros2 launch urdf_tutorial display.launch.py model:=urdf/05-visual.urdf;ros2 launch urdf_tutorial display.launch.py model:=urdf/06-flexible.urdf &;ros2 topic echo /joint_states --once;ros2 run tf2_ros tf2_echo base_link gripper_pole;ros2 run tf2_tools view_frames}}
<div class="box note"><div class="box-t">📝 07-physics</div>07 단계는 모든 링크에 <code>&lt;collision&gt;</code> 과 <code>&lt;inertial&gt;</code> 을 추가하고, 조인트 limit 에 effort · velocity 를 채웁니다. RViz 모양은 06 과 같지만 Gazebo(15장)에 넣을 수 있는 모델이 됩니다.</div>`
      },

      /* ============================================================ 5 */
      {
        title: 'xacro — URDF 를 짧고 똑똑하게',
        html: `<p>R2D2 의 URDF 는 다리 · 바퀴 · 그리퍼가 좌우로 똑같이 반복되어 300줄이 넘습니다. 바퀴 반지름 하나를 바꾸려면 네 군데를 고쳐야 하죠. <b>xacro</b>(XML Macros)는 URDF 에 변수 · 함수 · 수식을 더한 도구입니다. <code>.urdf.xacro</code> 로 쓰고, 실행할 때 <code>xacro</code> 명령이 평범한 URDF 로 펼쳐(전개) 줍니다.</p>
<div class="cards c4">
<div class="card blue"><div class="ci">🏷️</div><b>property</b><p><code>&lt;xacro:property name="r" value="0.05"/&gt;</code> → <code>\${r}</code></p></div>
<div class="card orange"><div class="ci">🧩</div><b>macro</b><p>매개변수를 받는 틀. 왼쪽/오른쪽 바퀴를 한 번에</p></div>
<div class="card green"><div class="ci">🧮</div><b>수식</b><p><code>\${pi/2}</code>, <code>\${base_width/2 + 0.02}</code> — 파이썬 식</p></div>
<div class="card purple"><div class="ci">📎</div><b>include</b><p>재료 · 센서 · gazebo 설정을 파일로 나눔</p></div>
</div>
<pre class="code" data-lang="xml"><code>${X(XACRO)}</code></pre>
<p>xacro 파일을 URDF 로 펼쳐 보려면 다음처럼 합니다. (<code>sudo apt install ros-jazzy-xacro</code>, 실제 PC 에서 실행)</p>
<pre class="code" data-lang="bash"><code>xacro mybot.urdf.xacro &gt; mybot.urdf
check_urdf mybot.urdf</code></pre>
<p>보통은 파일로 저장하지 않고, 런치 파일이 xacro 를 실행한 결과 문자열을 바로 <code>robot_description</code> 파라미터로 넘깁니다. 명령줄에서는 <code>ros2 run robot_state_publisher robot_state_publisher --ros-args -p robot_description:="$(xacro mybot.urdf.xacro)"</code> 처럼 씁니다.</p>
<pre class="code" data-lang="python"><code>${X(LAUNCH)}</code></pre>
<div class="box tip"><div class="box-t">💡 xacro 팁</div>① 루트 태그에 <code>xmlns:xacro="http://www.ros.org/wiki/xacro"</code> 를 꼭 넣습니다. ② <code>$(find 패키지)</code> 는 패키지 경로, <code>\${…}</code> 는 수식 — 기호가 다릅니다. ③ <code>&lt;xacro:arg name="use_sim" default="false"/&gt;</code> 와 <code>$(arg use_sim)</code> 으로 런치에서 값을 받아 시뮬레이션용 태그를 켜고 끌 수 있습니다(15장).</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — 차동 구동 로봇(diffbot)</div><ol class="steps-list">
<li><b>xacro</b> 탭을 눌러 같은 모델을 property · macro 로 쓴 모습을 봅니다.</li>
<li>URDF 탭에서 두 바퀴 조인트의 y 값을 바꿔 바퀴 간격(wheel separation)을 넓혀 봅니다.</li>
<li>joint 슬라이더로 바퀴(continuous)를 돌리고, 캐스터(fixed)는 슬라이더가 없는 것을 확인합니다.</li></ol></div>
{{widget:urdf|model=diffbot}}
<p>urdf_tutorial 의 마지막 단계도 xacro 입니다. 이 사이트에서는 전개된 결과를 불러옵니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/08-macroed.urdf.xacro</code></pre>`
      },

      /* ============================================================ 6 */
      {
        title: 'robot_state_publisher 와 joint_state_publisher',
        html: `<p>URDF 파일 자체는 아무 일도 하지 않습니다. 이것을 TF 로 바꾸는 노드가 <b>robot_state_publisher</b>(RSP)입니다.</p>
{{fig:rspFlow}}
<table class="tbl">
<tr><th>노드</th><th>입력</th><th>출력</th></tr>
<tr><td><code>robot_state_publisher</code></td><td>파라미터 <code>robot_description</code>(URDF 문자열) + 토픽 <code>/joint_states</code></td><td>고정 조인트 → <code>/tf_static</code>, 움직이는 조인트 → <code>/tf</code>, URDF → <code>/robot_description</code>(transient_local)</td></tr>
<tr><td><code>joint_state_publisher_gui</code></td><td><code>/robot_description</code> 토픽</td><td>슬라이더 값 → <code>/joint_states</code> (sensor_msgs/msg/JointState)</td></tr>
<tr><td><code>joint_state_publisher</code></td><td>같음</td><td>GUI 없이 기본값(0 또는 한계 가운데)으로 <code>/joint_states</code></td></tr>
</table>
<div class="box dev"><div class="box-t">👩‍💻 실제 로봇에서는?</div>joint_state_publisher_gui 는 <b>모델 확인용</b>입니다. 실제 로봇이나 Gazebo 에서는 모터 드라이버(ros2_control 의 <code>joint_state_broadcaster</code>, 15장)가 진짜 엔코더 값을 <code>/joint_states</code> 로 발행합니다. 두 개를 같이 켜면 관절이 두 값 사이를 깜빡이니 주의하세요.</div>
<p>display.launch.py 를 켠 채로 그래프를 살펴봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/06-flexible.urdf &amp;
ros2 node list
ros2 topic info /robot_description -v
ros2 param get /robot_state_publisher publish_frequency</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 터미널 + rqt_graph</div><ol class="steps-list">
<li>위 명령으로 display.launch.py 를 켭니다.</li>
<li>rqt_graph 에서 joint_state_publisher_gui → /joint_states → robot_state_publisher → /tf 흐름을 찾습니다.</li>
<li><code>ros2 topic info /robot_description -v</code> 에서 Durability 가 TRANSIENT_LOCAL 인지 확인합니다 — 늦게 켠 RViz 도 모델을 받을 수 있는 이유입니다.</li></ol></div>
{{widget:lab|with=graph|title=URDF 파이프라인 — 터미널 + rqt_graph}}`
      },

      /* ============================================================ 7 */
      {
        title: 'RViz2 — 로봇을 눈으로 보기',
        html: `<p><b>RViz2</b> 는 ROS 2 의 3D 시각화 도구입니다. 스스로 데이터를 만들지 않고, 토픽(/tf, /robot_description, /scan, /map …)을 구독해 <b>그려 주기만</b> 합니다. 실제 PC 에서는 <code>rviz2</code> 또는 <code>ros2 run rviz2 rviz2 -d 설정.rviz</code> 로 켭니다.</p>
{{fig:rvizPanel}}
<table class="tbl">
<tr><th>설정</th><th>뜻</th><th>자주 하는 실수</th></tr>
<tr><td><b>Fixed Frame</b> (Global Options)</td><td>화면의 기준 좌표계. 모든 데이터를 이 프레임으로 TF 변환해 그림</td><td>없는 프레임(예: map 없이 map)을 고르면 “Frame [map] does not exist” — URDF 만 볼 때는 base_link</td></tr>
<tr><td><b>RobotModel</b></td><td>/robot_description 의 URDF + TF 로 로봇 모양을 그림</td><td>Description Topic 을 비워 두거나, RSP 가 없으면 “No transform” 경고</td></tr>
<tr><td><b>TF</b></td><td>모든 프레임을 축(x 빨강 · y 초록 · z 파랑)으로 표시</td><td>프레임이 많으면 Show Names 를 끄고 Marker Scale 을 줄임</td></tr>
<tr><td><b>Grid</b></td><td>바닥 격자 (기본 1 m 간격)</td><td>Reference Frame 이 Fixed Frame 과 같은지</td></tr>
<tr><td><b>Add → By topic</b></td><td>지금 있는 토픽 중에서 골라 디스플레이 추가</td><td>메시지 타입마다 알맞은 디스플레이가 자동 선택됨</td></tr>
</table>
<div class="box tip"><div class="box-t">💡 설정 저장하기</div>디스플레이를 매번 추가하기 귀찮다면 <b>File → Save Config As</b> 로 <code>mybot.rviz</code> 를 저장하고, 패키지의 <code>rviz/</code> 폴더에 넣은 뒤 런치에서 <code>arguments=['-d', rviz_파일_경로]</code> 로 불러옵니다. urdf_tutorial 의 <code>rvizconfig</code> 인자가 바로 이것입니다.</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — RViz2 라이트</div><ol class="steps-list">
<li>이 절의 RViz 는 Fixed Frame = <code>base_link</code>, 디스플레이 = TF · RobotModel 로 열려 있습니다.</li>
<li>앞 절에서 display.launch.py 를 켜 두었다면 로봇이 보입니다. 안 보이면 위 코드 블록의 ▶ 버튼으로 다시 켭니다.</li>
<li>Fixed Frame 을 <code>head</code> 나 <code>gripper_pole</code> 로 바꿔 보세요. 그 프레임이 화면 중심에 고정되고 나머지가 움직여 보입니다.</li>
<li>TF 디스플레이를 끄고 켜며 링크 프레임 위치를 확인합니다.</li></ol></div>
{{widget:rviz|fixed=base_link|show=tf,robot}}`
      },

      /* ============================================================ 8 */
      {
        title: 'URDF 검사 도구와 SO-ARM101 모델',
        html: `<p>URDF 가 길어지면 오타 하나로 전체가 안 뜹니다. 실제 PC 에서는 <code>liburdfdom-tools</code> 의 두 도구로 먼저 검사합니다(<code>sudo apt install liburdfdom-tools</code>).</p>
<pre class="code" data-lang="bash"><code>check_urdf 05-visual.urdf
urdf_to_graphviz 05-visual.urdf</code></pre>
<pre class="code out" data-lang="출력"><code>robot name is: visual
---------- Successfully Parsed XML ---------------
root Link: base_link has 4 child(ren)
    child(1):  right_leg
        child(1):  right_base
            child(1):  right_back_wheel
            child(2):  right_front_wheel
    child(2):  left_leg
        …
    child(3):  gripper_pole
        child(1):  left_gripper
            child(1):  left_tip
        child(2):  right_gripper
            child(1):  right_tip
    child(4):  head
        child(1):  box</code></pre>
<p><code>urdf_to_graphviz</code>(옛 이름 <code>urdf_to_graphiz</code>)는 링크 · 조인트 트리를 PDF 그림으로 만들어 줍니다. xacro 파일은 먼저 <code>xacro</code> 로 전개한 뒤 검사합니다.</p>
<table class="tbl">
<tr><th>증상</th><th>원인</th></tr>
<tr><td><code>Error: Failed to build tree: child link [x] of joint [y] not found</code></td><td>조인트가 가리키는 링크 이름 오타</td></tr>
<tr><td><code>Error: Failed to build tree: parent link [a] of joint [b] not found</code> 또는 root 가 둘</td><td>어느 링크에도 연결되지 않은 링크가 있음 (트리가 둘)</td></tr>
<tr><td>RViz 에서 모델이 흰색 · 메시가 안 보임</td><td><code>package://</code> 경로의 패키지가 설치(install)되지 않음 — CMakeLists/setup.py 에 meshes 폴더 설치 누락</td></tr>
<tr><td>관절이 엉뚱한 점을 중심으로 돔</td><td>joint origin 대신 visual origin 으로 옮김</td></tr>
</table>
<p>진짜 로봇팔의 URDF 도 열어 봅시다. SO-ARM101 은 6개 관절(shoulder_pan · shoulder_lift · elbow_flex · wrist_flex · wrist_roll · gripper)을 가진 오픈소스 로봇팔입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch so_arm101_description display.launch.py</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — SO-ARM101 URDF</div><ol class="steps-list">
<li>관절 슬라이더를 움직여 각 관절이 어느 축(axis)으로 도는지 봅니다.</li>
<li>URDF 탭에서 <code>shoulder_lift</code> 조인트의 <code>limit</code> 를 찾아 lower/upper 가 몇 rad 인지 확인합니다.</li>
<li>check_urdf 탭에서 트리가 곧게 한 줄로 이어진(직렬) 팔 구조인지 확인합니다.</li></ol></div>
{{widget:urdf|model=so101}}
<div class="cards c2">
<div class="card orange"><div class="ci">🦾</div><b>SO-ARM101 강좌 15장 — URDF</b><p>실제 SO-ARM101 의 STL 메시 · 관절 한계 · 보정값이 URDF 에 어떻게 들어가는지 자세히 봅니다. <a href="https://samcho93.github.io/studySOArm101/lessons/ch15.html" target="_blank" rel="noopener">열기 →</a></p></div>
<div class="card blue"><div class="ci">🗂️</div><b>SO-ARM101 강좌 16장 — 워크스페이스 · RViz2</b><p>description 패키지를 만들고 colcon 빌드 후 RViz2 로 띄우는 과정을 따라 합니다. <a href="https://samcho93.github.io/studySOArm101/lessons/ch16.html" target="_blank" rel="noopener">열기 →</a></p></div>
</div>`
      }
    ],

    videos: [
      { title: 'How do we describe a robot? With URDF! | Getting Ready to build Robots with ROS #7', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=CwdbsvcpOHM', lang: 'en', min: '25분', desc: '링크 · 조인트 · robot_state_publisher · RViz 의 관계를 그림과 실습으로 설명하는 최고의 입문 영상입니다.' },
      { title: 'Creating a rough 3D model of our robot with URDF', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=BcjHyhV0kIs', lang: 'en', min: '27분', desc: '차동 구동 로봇의 몸체 · 바퀴 · 캐스터를 xacro 로 만들고 충돌 · 관성까지 넣는 과정을 따라 합니다.' },
      { title: 'ROS2 URDF Tutorial Xacro Files (Simplify URDF with Xacro Property and Xacro Macro)', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=DoT3iAgY9Vc', lang: 'en', min: '15분', desc: 'xacro property 와 macro 로 반복되는 URDF 를 줄이는 방법을 보여 줍니다.' },
      { title: '"ROS 2 RViz2 사용법" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=ROS+2+RViz2+tutorial', lang: 'ko', desc: 'Displays · Fixed Frame · 설정 저장을 다루는 영상을 찾아보세요.' },
      { title: '"ROS 2 URDF 만들기" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=ROS2+URDF+%EB%A7%8C%EB%93%A4%EA%B8%B0', lang: 'ko', desc: '한국어로 URDF 작성 과정을 설명하는 영상을 찾아 복습해 보세요.' }
    ],

    terms: [
      ['URDF', 'Unified Robot Description Format. 로봇의 링크와 조인트를 적는 XML 형식'],
      ['링크(link)', '단단한 몸 조각. visual · collision · inertial 을 가지며, 링크마다 TF 프레임이 하나 생김'],
      ['조인트(joint)', '부모 링크와 자식 링크를 잇는 관절. type · origin · axis · limit 을 가짐'],
      ['visual / collision', '화면에 보이는 모양 / 충돌 계산에 쓰는 단순한 모양'],
      ['inertial', '질량(kg) · 무게중심 · 관성 텐서(kg·m²). 물리 시뮬레이션에 필요'],
      ['revolute / continuous', '한계가 있는 회전 관절 / 한계 없이 계속 도는 회전 관절(바퀴)'],
      ['prismatic', '축 방향으로 직선 이동하는 관절 (단위 m)'],
      ['origin (xyz · rpy)', 'joint 에서는 부모 프레임 기준 자식 프레임의 위치 · 자세, visual 에서는 링크 안 모양의 위치'],
      ['axis', '관절이 회전하거나 이동하는 방향 (자식 프레임 기준, 기본 1 0 0)'],
      ['xacro', 'URDF 에 property · macro · 수식 · include 를 더한 XML 매크로 도구. xacro 명령으로 URDF 로 전개'],
      ['robot_description', 'URDF 문자열을 담는 파라미터(및 transient_local 토픽) 이름'],
      ['robot_state_publisher', 'URDF + /joint_states → /tf · /tf_static 을 발행하는 노드'],
      ['joint_state_publisher_gui', '슬라이더로 관절 값을 정해 /joint_states 를 발행하는 확인용 도구'],
      ['RViz2 Fixed Frame', 'RViz 화면의 기준 좌표계. 모든 데이터를 이 프레임으로 변환해 그림']
    ],

    summary: [
      'URDF 는 링크(몸 조각)와 조인트(관절)로 로봇을 나무 구조로 적는 XML 이다. 링크마다 TF 프레임이 하나 생긴다.',
      '링크는 visual(보이는 모양) · collision(충돌용 단순 도형) · inertial(질량 · 관성)을 가진다. Gazebo 에는 셋 다 필요하다.',
      '조인트는 revolute · continuous · prismatic · fixed · floating · planar 6종류이고, origin 으로 자식 프레임 위치를, axis 로 움직이는 방향을, limit 으로 한계를 정한다.',
      'xacro 의 property · macro · 수식(${…}) · include 로 반복을 없애고, xacro 명령이나 런치의 Command 로 URDF 문자열을 만든다.',
      'robot_state_publisher 가 robot_description + /joint_states 로 /tf · /tf_static 을 만들고, joint_state_publisher_gui 는 확인용으로 /joint_states 를 낸다.',
      'RViz2 는 토픽을 그리기만 하는 도구다. Fixed Frame 을 올바르게 고르고 RobotModel · TF 디스플레이를 추가한 뒤 .rviz 설정으로 저장한다.',
      'check_urdf · urdf_to_graphviz 로 트리를 검사하고, urdf_tutorial display.launch.py 로 단계별 모델을 확인한다.'
    ],

    quiz: [
      { q: '바퀴처럼 한계 없이 계속 도는 관절에 알맞은 URDF 조인트 type 은?', options: ['revolute', 'continuous', 'prismatic', 'floating'], answer: 1, explain: 'continuous 는 축 둘레로 무한히 회전합니다. revolute 는 lower/upper 한계가 있는 회전, prismatic 은 직선 이동입니다.' },
      { q: '링크의 &lt;collision&gt; 요소에 대한 설명으로 옳은 것은?', options: ['RViz 에 색을 칠할 때만 쓴다', '충돌 계산에 쓰이므로 보통 단순한 도형으로 쓴다', '질량을 적는 곳이다', '조인트의 회전축을 정한다'], answer: 1, explain: 'collision 은 물리 시뮬레이션 · 충돌 검사용이라 계산이 빠른 box · cylinder · sphere 로 근사하는 것이 보통입니다. 질량은 inertial, 모양 · 색은 visual 입니다.' },
      { q: 'joint 의 &lt;origin xyz="0 -0.22 0.25"/&gt; 가 하는 일은?', options: ['자식 링크의 모양만 옮긴다', '부모 프레임 기준으로 자식 프레임의 위치를 정한다', '관절의 회전 한계를 정한다', '로봇 전체를 지도에서 옮긴다'], answer: 1, explain: 'joint 의 origin 은 자식 프레임(TF)을 부모 프레임에서 어디에 둘지 정합니다. 모양만 옮기는 것은 visual 안의 origin 입니다.' },
      { q: 'robot_state_publisher 의 입력과 출력으로 옳은 것은?', options: ['입력 /tf → 출력 /joint_states', '입력 robot_description + /joint_states → 출력 /tf · /tf_static', '입력 /cmd_vel → 출력 /odom', '입력 /scan → 출력 /map'], answer: 1, explain: 'RSP 는 URDF 와 관절 값을 받아 순기구학으로 각 링크의 TF 를 계산합니다. 고정 조인트는 /tf_static, 움직이는 조인트는 /tf 로 나갑니다.' },
      { q: 'xacro 에서 \${wheel_radius * 2} 같은 표기는 무엇인가?', options: ['패키지 경로 찾기', '런치 인자 읽기', 'property 를 쓴 수식 계산', 'XML 주석'], answer: 2, explain: '\${…} 는 property 값과 수식을 계산합니다. 패키지 경로는 $(find pkg), 인자는 $(arg name) 으로 기호가 다릅니다.' },
      { q: 'RViz2 에서 URDF 모델만 확인할 때(지도 · 위치 추정 없음) Fixed Frame 으로 알맞은 것은?', options: ['map', 'odom', 'base_link', 'earth'], answer: 2, explain: 'map · odom 을 발행하는 노드가 없으면 “Frame does not exist” 가 납니다. 로봇 모델만 볼 때는 URDF 의 루트 링크인 base_link 를 고릅니다.' }
    ],

    slides: [
      { title: '로봇 조립 설명서 = URDF', html: `{{fig:linkJoint|nocap}}`, notes: '링크는 몸 조각, 조인트는 관절. 자식은 부모 하나에만 붙어 나무가 된다는 점을 강조합니다. (3분)' },
      { title: '링크의 세 얼굴', html: `{{fig:linkParts|nocap}}`, notes: 'visual 은 보는 용도, collision 은 부딪히는 용도, inertial 은 무게. RViz 만 쓰면 visual 로 충분하지만 Gazebo 에는 셋 다 필요하다고 설명합니다. (4분)' },
      { title: 'URDF 편집기', html: `{{widget:urdf|model=r2d2}}`, notes: '반지름이나 색을 바꿔 바로 반영되는 것을 보여 주고, 태그를 하나 지워 오류 위치 표시를 보여 줍니다. (5분)' },
      { title: '조인트 6종류', html: `{{fig:jointTypes|nocap}}`, notes: '실무에서는 revolute · continuous · prismatic · fixed 네 가지면 거의 충분합니다. 각각 떠오르는 실제 부품을 학생들에게 물어 봅니다. (4분)' },
      { title: 'origin 과 axis', html: `{{fig:originAxis|nocap}}`, notes: 'joint origin(프레임 이동)과 visual origin(모양 이동)의 차이가 가장 흔한 실수입니다. 순서: 이동 → 회전 → 관절 값. (4분)' },
      { title: 'urdf_tutorial 8단계', html: `{{fig:tutorialSteps|nocap}}`, notes: '01 부터 08 까지 같은 런치 파일에 model 인자만 바꿔 열어 봅니다. 02→03 에서 origin 이 왜 필요한지 보여 주는 것이 핵심입니다. (3분)' },
      { title: '실습: display.launch.py', layout: 'center', html: `<div class="s-big"><code>ros2 launch urdf_tutorial display.launch.py model:=urdf/06-flexible.urdf</code></div><div class="s-small">슬라이더 → /joint_states → /tf → 모델이 움직임</div>`, notes: '06-flexible 을 열고 슬라이더로 머리와 그리퍼를 움직입니다. tf2_echo base_link gripper_pole 로 값 변화를 함께 확인합니다. (8분)' },
      { title: 'xacro 네 가지 도구', html: `<div class="s-cols c3"><div><b>property</b><p class="s-small">숫자에 이름</p></div><div><b>macro</b><p class="s-small">반복 블록을 틀로</p></div><div><b>수식 · include</b><p class="s-small">\${pi/2} · 파일 나누기</p></div></div>`, notes: '바퀴 반지름을 네 군데 고치던 것이 한 줄로 바뀌는 장점을 보여 줍니다. $(find) 와 ${} 기호가 다르다는 점을 짚습니다. (5분)' },
      { title: 'diffbot — xacro 로 쓴 모델', html: `{{widget:urdf|model=diffbot}}`, notes: 'xacro 탭과 URDF 탭을 비교합니다. 바퀴 조인트 y 값을 바꿔 바퀴 간격을 조절해 봅니다. (4분)' },
      { title: 'URDF → TF 파이프라인', html: `{{fig:rspFlow|nocap}}`, notes: 'robot_state_publisher 가 중심입니다. 실제 로봇에서는 GUI 대신 joint_state_broadcaster 가 /joint_states 를 낸다는 점을 예고합니다(15장). (4분)' },
      { title: 'RViz2 화면', html: `{{fig:rvizPanel|nocap}}`, notes: 'Fixed Frame, RobotModel, TF, Add By topic, 설정 저장. Fixed Frame 을 잘못 고르는 것이 가장 흔한 실수입니다. (4분)' },
      { title: 'RViz2 라이트', html: `{{widget:rviz|fixed=base_link|show=tf,robot}}`, notes: 'Fixed Frame 을 head 로 바꾸면 무엇이 달라지는지 학생들이 예측하게 한 뒤 확인합니다. (4분)' },
      { title: 'SO-ARM101 모델', html: `{{widget:urdf|model=so101}}`, notes: '실제 로봇팔 URDF 를 보면서 6개 관절의 axis 와 limit 을 찾아봅니다. SO-ARM101 강좌 15 · 16장으로 이어진다고 안내합니다. (4분)' }
    ]
  });
})();
