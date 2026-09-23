/* 18장 — 사족보행 로봇: Unitree Go2와 ROS 2 */
Course.lesson({
  id: 'ch18', no: '18',
  icon: '🐕',
  title: '사족보행 로봇 — Unitree Go2와 ROS 2',
  subtitle: '다리 12개 관절로 걷는 로봇도, ROS 2 에서는 /cmd_vel 한 줄로 움직입니다',
  level: '중급', time: '150분',
  goals: [
    '사족보행 로봇의 12 관절(hip · thigh · calf × 4 다리)과 트롯 같은 보행 패턴, 몸통 · 발 좌표계를 설명할 수 있다',
    'Go2 모델(Air · Pro · EDU)별 개발 경로와, unitree_ros2 가 CycloneDDS · 유선 192.168.123.x 망으로 로봇과 통신하는 구조를 설명할 수 있다',
    '/sportmodestate · /lowstate · /lowcmd · /api/sport/request 의 역할과 고수준 · 저수준 제어의 안전 차이를 구분할 수 있다',
    '브라우저 Go2 시뮬레이터를 터미널 · rclpy 로 일으켜 세우고 /cmd_vel 로 걷게 할 수 있다',
    '바퀴 로봇 · 로봇팔 · 보행 로봇이 같은 ROS 2 표준 인터페이스(cmd_vel · odom · tf · joint_states)를 쓰는 이점을 말할 수 있다'
  ],
  teacher: {
    intro: '강아지 로봇이 계단을 오르는 짧은 영상을 보여 주고 “이 로봇을 앞으로 1 m 걷게 하려면 모터 12개에 무엇을 보내야 할까요?”라고 묻습니다. 대부분 “각 관절 각도”라고 답합니다. 그런데 16장의 바퀴 로봇에 쓴 <code>/cmd_vel</code> 한 줄로도 걷는다는 것을 오늘 확인할 것이라고 예고합니다. (3분)',
    flow: '① 도입 · 다리와 보행 15분 → ② Go2 모델 · 통신 구조 20분 → ③ 토픽 · 고수준/저수준 · 안전 20분 → ④ 브라우저 Go2 시뮬레이터 + MuJoCo 연동 15분 → ⑤ 터미널 실습(lab) 20분 → ⑥ rclpy go2_walk · Playground 15분 → ⑦ 커뮤니티 SDK · SLAM/Nav2 15분 → ⑧ 세 로봇 비교 · 퀴즈 15분'
  },

  figs: {
    /* ------------------------------------------------ 다리와 관절 */
    legs: {
      caption: 'Go2 의 다리 네 개(FR · FL · RR · RL)와 다리마다 세 관절(hip · thigh · calf) = 12 자유도. 몸통 좌표계는 base_link(x 앞, y 왼쪽, z 위)',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="Go2 다리 배치 위에서 본 모습과 한 다리의 세 관절 옆모습">
  <text x="220" y="26" class="t-b t-c">위에서 본 모습</text>
  <rect x="120" y="110" width="200" height="110" rx="24" class="blue"/>
  <text x="220" y="160" class="t-b t-c t-mono">base_link</text>
  <line x1="220" y1="165" x2="300" y2="165" class="ln-red thick ar-red"/><text x="306" y="170" class="t-xs t-red t-b">x (앞)</text>
  <line x1="220" y1="165" x2="220" y2="105" class="ln-green thick ar-green"/><text x="228" y="100" class="t-xs t-green t-b">y (왼쪽)</text>
  <circle cx="300" cy="100" r="16" class="s-orange"/><text x="300" y="105" class="t-xs t-c tw t-b">FL</text>
  <circle cx="300" cy="230" r="16" class="s-orange"/><text x="300" y="235" class="t-xs t-c tw t-b">FR</text>
  <circle cx="140" cy="100" r="16" class="s-teal"/><text x="140" y="105" class="t-xs t-c tw t-b">RL</text>
  <circle cx="140" cy="230" r="16" class="s-teal"/><text x="140" y="235" class="t-xs t-c tw t-b">RR</text>
  <text x="220" y="280" class="t-xs t-c t-mu">SDK 모터 순서: FR(0~2) · FL(3~5) · RR(6~8) · RL(9~11)</text>
  <text x="220" y="302" class="t-xs t-c t-mu">URDF 관절 이름: FL_hip_joint, FL_thigh_joint, FL_calf_joint …</text>

  <text x="640" y="26" class="t-b t-c">한 다리 옆모습 (오른쪽에서)</text>
  <rect x="520" y="60" width="240" height="40" rx="10" class="blue"/>
  <circle cx="700" cy="80" r="13" class="s-orange"/><text x="700" y="85" class="t-xs t-c tw t-b">H</text>
  <line x1="700" y1="80" x2="640" y2="190" class="ln-orange thick"/>
  <circle cx="640" cy="190" r="12" class="s-orange"/><text x="640" y="195" class="t-xs t-c tw t-b">C</text>
  <line x1="640" y1="190" x2="700" y2="300" class="ln-orange thick"/>
  <circle cx="700" cy="300" r="9" class="s-red"/>
  <line x1="560" y1="312" x2="820" y2="312" class="ln thin"/>
  <text x="780" y="76" class="t-xs"><tspan class="t-b">hip</tspan> — 다리를 옆으로 벌림</text>
  <text x="690" y="140" class="t-xs"><tspan class="t-b">thigh</tspan> — 허벅지 앞뒤</text>
  <text x="560" y="250" class="t-xs"><tspan class="t-b">calf</tspan> — 무릎(종아리)</text>
  <text x="712" y="298" class="t-xs t-red t-b">발(foot) — 접촉점</text>
  <text x="640" y="340" class="t-xs t-c t-mu">thigh · calf 길이 각 약 0.213 m (go2_description)</text>
</svg>`
    },

    /* ------------------------------------------------ 보행 패턴 */
    gaits: {
      caption: '보행(gait) 타이밍: 막대 = 발이 공중에 뜬 구간(swing). 트롯은 대각선 두 발씩 짝지어 번갈아 딛습니다',
      svg: `<svg class="dg" viewBox="0 0 880 320" role="img" aria-label="트롯과 걷기 보행의 발 타이밍 도표">
  <text x="230" y="26" class="t-b t-c">🐎 트롯 (trot) — Go2 기본 보행</text>
  <text x="40" y="70" class="t-sm t-b">FL</text><text x="40" y="110" class="t-sm t-b">RR</text><text x="40" y="150" class="t-sm t-b">FR</text><text x="40" y="190" class="t-sm t-b">RL</text>
  <rect x="80" y="54" width="360" height="28" rx="4" class="box"/><rect x="80" y="94" width="360" height="28" rx="4" class="box"/><rect x="80" y="134" width="360" height="28" rx="4" class="box"/><rect x="80" y="174" width="360" height="28" rx="4" class="box"/>
  <rect x="80" y="54" width="90" height="28" rx="4" class="s-orange"/><rect x="260" y="54" width="90" height="28" rx="4" class="s-orange"/>
  <rect x="80" y="94" width="90" height="28" rx="4" class="s-orange"/><rect x="260" y="94" width="90" height="28" rx="4" class="s-orange"/>
  <rect x="170" y="134" width="90" height="28" rx="4" class="s-teal"/><rect x="350" y="134" width="90" height="28" rx="4" class="s-teal"/>
  <rect x="170" y="174" width="90" height="28" rx="4" class="s-teal"/><rect x="350" y="174" width="90" height="28" rx="4" class="s-teal"/>
  <text x="260" y="228" class="t-xs t-c t-mu">대각선 짝 (FL+RR) ↔ (FR+RL) · 늘 두 발로 지탱</text>

  <text x="670" y="26" class="t-b t-c">🐢 걷기 (walk) — 느리고 안정</text>
  <text x="490" y="70" class="t-sm t-b">FL</text><text x="490" y="110" class="t-sm t-b">RR</text><text x="490" y="150" class="t-sm t-b">FR</text><text x="490" y="190" class="t-sm t-b">RL</text>
  <rect x="520" y="54" width="340" height="28" rx="4" class="box"/><rect x="520" y="94" width="340" height="28" rx="4" class="box"/><rect x="520" y="134" width="340" height="28" rx="4" class="box"/><rect x="520" y="174" width="340" height="28" rx="4" class="box"/>
  <rect x="520" y="54" width="85" height="28" rx="4" class="s-orange"/><rect x="605" y="174" width="85" height="28" rx="4" class="s-teal"/>
  <rect x="690" y="134" width="85" height="28" rx="4" class="s-teal"/><rect x="775" y="94" width="85" height="28" rx="4" class="s-orange"/>
  <text x="690" y="228" class="t-xs t-c t-mu">한 번에 한 발만 · 늘 세 발로 지탱</text>
  <rect x="40" y="252" width="820" height="52" rx="10" class="purple"/>
  <text x="450" y="274" class="t-sm t-c">Go2 의 <tspan class="t-b">스포츠 모드</tspan>가 이 타이밍 · 발 궤적 · 균형을 로봇 안에서 계산합니다</text>
  <text x="450" y="294" class="t-xs t-c">→ 사용자는 “몸통을 vx, vy, vyaw 로 움직여라”만 보내면 됩니다</text>
</svg>`
    },

    /* ------------------------------------------------ 통신 구조 */
    network: {
      caption: 'Go2 와 대화하는 두 길: EDU 는 유선 이더넷 + CycloneDDS(공식 SDK2 · unitree_ros2), Air/Pro 는 앱이 쓰는 Wi-Fi WebRTC(비공식 커뮤니티 도구)',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="Go2 EDU 유선 DDS 망과 WebRTC 경로">
  <rect x="20" y="40" width="250" height="200" rx="14" class="blue"/>
  <text x="145" y="68" class="t-b t-c">💻 개발 PC (Ubuntu)</text>
  <text x="145" y="96" class="t-sm t-c t-mono">192.168.123.99</text>
  <text x="145" y="126" class="t-xs t-c t-mono">RMW_IMPLEMENTATION=</text>
  <text x="145" y="144" class="t-xs t-c t-mono">rmw_cyclonedds_cpp</text>
  <text x="145" y="172" class="t-xs t-c t-mono">CYCLONEDDS_URI → enp3s0</text>
  <text x="145" y="200" class="t-xs t-c t-mu">unitree_go · unitree_api 메시지</text>
  <text x="145" y="222" class="t-xs t-c t-mu">ROS_DOMAIN_ID = 0</text>

  <rect x="560" y="30" width="320" height="230" rx="16" class="orange"/>
  <text x="720" y="58" class="t-b t-c">🐕 Go2 EDU 내부망</text>
  <rect x="580" y="76" width="280" height="64" rx="10" class="box"/>
  <text x="720" y="100" class="t-sm t-b t-c">모션 제어 보드 (MCU)</text>
  <text x="720" y="122" class="t-xs t-c t-mono">192.168.123.161 · rt/sportmodestate …</text>
  <rect x="580" y="150" width="280" height="64" rx="10" class="box"/>
  <text x="720" y="174" class="t-sm t-b t-c">확장 컴퓨트 (Jetson Orin)</text>
  <text x="720" y="196" class="t-xs t-c t-mono">192.168.123.18 · SSH · 온보드 ROS 2</text>
  <text x="720" y="240" class="t-xs t-c t-mu">DDS 토픽 rt/lowstate ↔ ROS 2 /lowstate</text>

  <line x1="272" y1="120" x2="556" y2="120" class="ln-blue thick ar2"/>
  <text x="414" y="106" class="t-sm t-c t-b t-blue">유선 이더넷 · CycloneDDS</text>
  <text x="414" y="140" class="t-xs t-c t-mu">같은 DDS + 같은 메시지 정의 = 래퍼 없이 ROS 2 토픽</text>

  <rect x="20" y="280" width="250" height="80" rx="12" class="gray"/>
  <text x="145" y="308" class="t-sm t-b t-c">📱 앱 · 커뮤니티 SDK</text>
  <text x="145" y="332" class="t-xs t-c t-mu">go2_ros2_sdk (CONN_TYPE=webrtc)</text>
  <path d="M272,320 C420,330 560,310 620,262" class="ln dash ar nofill"/>
  <text x="440" y="344" class="t-sm t-c">Wi-Fi · WebRTC (Air · Pro · EDU, 비공식)</text>
</svg>`
    },

    /* ------------------------------------------------ 고수준 vs 저수준 */
    levels: {
      caption: '고수준(sport) 제어는 “몸통을 이렇게”만 요청하고 균형은 로봇이 잡습니다. 저수준(low-level) 제어는 12 모터 토크를 직접 — 스포츠 모드를 끄고, 로봇을 매단 채로만',
      svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="고수준 제어와 저수준 제어의 경로 비교">
  <rect x="20" y="20" width="400" height="300" rx="14" class="green"/>
  <text x="220" y="48" class="t-lg t-b t-c t-green">고수준 (High-level)</text>
  <rect x="50" y="66" width="340" height="46" rx="8" class="box"/>
  <text x="220" y="86" class="t-sm t-c t-mono">/api/sport/request</text>
  <text x="220" y="104" class="t-xs t-c t-mu">api_id 1008 Move {"x":0.3,"y":0,"z":0}</text>
  <line x1="220" y1="114" x2="220" y2="138" class="ln-green ar-green"/>
  <rect x="50" y="140" width="340" height="60" rx="8" class="s-green"/>
  <text x="220" y="164" class="t-sm t-c tw t-b">스포츠 모드 (로봇 안)</text>
  <text x="220" y="186" class="t-xs t-c tw">보행 · 균형 · 넘어짐 회복</text>
  <line x1="220" y1="202" x2="220" y2="226" class="ln-green ar-green"/>
  <rect x="50" y="228" width="340" height="40" rx="8" class="box"/>
  <text x="220" y="252" class="t-sm t-c">모터 12개</text>
  <text x="220" y="298" class="t-xs t-c">상태: /sportmodestate (위치 · 속도 · 모드)</text>

  <rect x="460" y="20" width="400" height="300" rx="14" class="red"/>
  <text x="660" y="48" class="t-lg t-b t-c t-red">저수준 (Low-level)</text>
  <rect x="490" y="66" width="340" height="46" rx="8" class="box"/>
  <text x="660" y="86" class="t-sm t-c t-mono">/lowcmd (LowCmd)</text>
  <text x="660" y="104" class="t-xs t-c t-mu">모터마다 q · dq · kp · kd · tau + CRC</text>
  <line x1="660" y1="114" x2="660" y2="226" class="ln-red thick ar-red"/>
  <rect x="490" y="140" width="340" height="60" rx="8" class="box"/>
  <text x="660" y="164" class="t-sm t-c t-b">⚠ 스포츠 모드 꺼야 함</text>
  <text x="660" y="186" class="t-xs t-c">균형은 전부 내 코드 책임</text>
  <rect x="490" y="228" width="340" height="40" rx="8" class="box"/>
  <text x="660" y="252" class="t-sm t-c">모터 12개 (고속 주기)</text>
  <text x="660" y="298" class="t-xs t-c">상태: /lowstate (모터 · IMU · 발 힘센서) · 매단 상태에서만</text>
</svg>`
    },

    /* ------------------------------------------------ Go2 SLAM 파이프라인 */
    slam: {
      caption: 'Go2 로 2D SLAM · Nav2: 3D 포인트클라우드를 2D 레이저 스캔으로 잘라 16장과 같은 파이프라인에 넣습니다',
      svg: `<svg class="dg" viewBox="0 0 900 260" role="img" aria-label="Go2 LiDAR 포인트클라우드에서 SLAM, Nav2 까지의 파이프라인">
  <rect x="10" y="40" width="150" height="60" rx="8" class="green"/>
  <text x="85" y="64" class="t-xs t-c t-mono">/utlidar/cloud</text>
  <text x="85" y="84" class="t-xs t-c t-mu">PointCloud2 (L1)</text>
  <ellipse cx="265" cy="70" rx="90" ry="32" class="blue"/>
  <text x="265" y="65" class="t-xs t-c t-b">pointcloud_to</text>
  <text x="265" y="81" class="t-xs t-c t-b">_laserscan</text>
  <rect x="380" y="40" width="110" height="60" rx="8" class="green"/>
  <text x="435" y="70" class="t-sm t-c t-mono">/scan</text>
  <ellipse cx="600" cy="70" rx="90" ry="32" class="blue"/>
  <text x="600" y="75" class="t-sm t-c t-b">slam_toolbox</text>
  <rect x="720" y="40" width="160" height="60" rx="8" class="green"/>
  <text x="800" y="64" class="t-sm t-c t-mono">/map</text>
  <text x="800" y="84" class="t-xs t-c t-mu">+ TF map → odom</text>
  <line x1="162" y1="70" x2="173" y2="70" class="ln ar"/><line x1="357" y1="70" x2="376" y2="70" class="ln ar"/><line x1="492" y1="70" x2="508" y2="70" class="ln ar"/><line x1="692" y1="70" x2="716" y2="70" class="ln ar"/>

  <rect x="10" y="160" width="150" height="60" rx="8" class="green"/>
  <text x="85" y="184" class="t-xs t-c t-mono">/odom · /tf</text>
  <text x="85" y="204" class="t-xs t-c t-mu">다리 오도메트리</text>
  <ellipse cx="435" cy="190" rx="120" ry="32" class="purple"/>
  <text x="435" y="185" class="t-sm t-c t-b">Nav2</text>
  <text x="435" y="203" class="t-xs t-c t-mu">planner · controller · BT</text>
  <rect x="620" y="160" width="120" height="60" rx="8" class="green"/>
  <text x="680" y="190" class="t-sm t-c t-mono">/cmd_vel</text>
  <ellipse cx="820" cy="190" rx="70" ry="32" class="orange"/>
  <text x="820" y="185" class="t-sm t-c t-b">드라이버</text>
  <text x="820" y="203" class="t-xs t-c t-mu">→ sport Move</text>
  <line x1="162" y1="190" x2="311" y2="190" class="ln ar"/>
  <line x1="800" y1="102" x2="520" y2="162" class="ln dash ar"/>
  <line x1="557" y1="190" x2="616" y2="190" class="ln ar"/><line x1="742" y1="190" x2="748" y2="190" class="ln ar"/>
  <text x="450" y="245" class="t-xs t-c t-mu">16장 webbot 과 달라지는 곳은 맨 왼쪽(센서 가공)과 맨 오른쪽(드라이버)뿐</text>
</svg>`
    }
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '다리로 걷는 로봇 — 12 관절과 보행 패턴',
      html: `
<p>바퀴는 평평한 바닥에서 빠르고 효율적이지만, 계단 · 자갈 · 풀밭 앞에서는 멈춥니다. <b>다리 로봇</b>은 발을 디딜 곳을 골라 “불연속한” 지형을 넘을 수 있습니다. 대신 넘어지지 않으려면 매 순간 균형을 잡아야 해서 제어가 훨씬 어렵습니다.</p>
{{fig:legs}}
<p>Unitree Go2 는 다리마다 관절 세 개 — <b>hip</b>(다리를 옆으로 벌림), <b>thigh</b>(허벅지 앞뒤), <b>calf</b>(무릎) — 가 있어 모두 <b>12 자유도</b>입니다. 다리 이름은 앞(F) · 뒤(R) + 오른쪽(R) · 왼쪽(L) 조합으로 FR · FL · RR · RL. ROS 2 에서는 <code>/joint_states</code> 에 <code>FL_hip_joint</code> … <code>RR_calf_joint</code> 12개가 실리고, TF 에는 몸통 <code>base_link</code> 와 각 발 프레임이 나타납니다.</p>
{{fig:gaits}}
<div class="box analogy"><div class="box-t">🍳 비유 — 자동차 운전자와 엔진</div>
운전자는 “시속 30 km 로 왼쪽으로”만 정하고, 엔진 점화 시점이나 변속은 차가 알아서 합니다. Go2 의 <b>스포츠 모드</b>가 “엔진”이고, 우리가 보내는 <code>/cmd_vel</code>(또는 Move 요청)이 “운전대와 가속 페달”입니다.</div>
<div class="stats"><div class="stat orange"><b>12</b><span>관절 (4 다리 × 3)</span></div><div class="stat blue"><b>≈ 0.213 m</b><span>thigh · calf 링크 길이</span></div><div class="stat green"><b>3 값</b><span>vx · vy · vyaw 로 걷기 명령</span></div></div>`
    },

    /* ============================================================ 2 */
    {
      title: 'Go2 모델과 통신 구조 — DDS 로 곧장 ROS 2',
      html: `
<p>Go2 는 같은 몸체에 여러 모델이 있고, <b>“누가 로봇에게 명령을 보낼 수 있는가”</b>가 모델마다 다릅니다. 연계 강좌(studyGo2 C01)의 정리를 따르면 다음과 같습니다.</p>
<table class="tbl cmp">
<tr><th>접근 경로</th><th>Air / Pro</th><th>EDU / EDU Plus</th></tr>
<tr><td>Unitree Go 앱 · 리모컨</td><td>●</td><td>●</td></tr>
<tr><td>공식 <code>unitree_sdk2</code> (DDS)</td><td>–</td><td>●</td></tr>
<tr><td>공식 ROS 2 <code>unitree_ros2</code></td><td>–</td><td>●</td></tr>
<tr><td>저수준 관절 제어 (<code>LowCmd</code>)</td><td>불가</td><td>● (매단 상태에서)</td></tr>
<tr><td>WebRTC (앱 통신을 재현한 <b>비공식</b> 커뮤니티 도구)</td><td>●</td><td>●</td></tr>
</table>
<p>EDU 는 로봇 뒤쪽 이더넷 포트로 PC 를 연결합니다. 로봇 내부망은 <code>192.168.123.x</code> 대역(모션 제어 보드 <code>.161</code>, 확장 컴퓨트 Jetson <code>.18</code>)이고, PC 에는 겹치지 않는 고정 IP(예: <code>192.168.123.99</code>)를 줍니다.</p>
{{fig:network}}
<p>핵심은 <b>ROS 2 도 DDS 위에서 돈다</b>는 점입니다(11장). Go2 는 SDK 통신에 <b>CycloneDDS</b> 를 쓰므로, ROS 2 쪽도 ① 같은 DDS 구현(<code>rmw_cyclonedds_cpp</code>) ② 같은 메시지 정의(<code>unitree_go</code> · <code>unitree_api</code> 패키지)만 맞추면 로봇의 DDS 토픽이 “래퍼 없이” ROS 2 토픽으로 보입니다. DDS 이름 <code>rt/lowstate</code> 가 ROS 2 에서 <code>/lowstate</code> 로 보이는 것은 ROS 2 가 토픽에 <code>rt/</code> 접두사를 붙이는 규칙 때문입니다.</p>
<pre class="code" data-lang="bash"><code># 실제 PC 에서 (unitree_ros2 README 의 setup.sh 를 고친 모습)
source /opt/ros/humble/setup.bash
source ~/unitree_ros2/cyclonedds_ws/install/setup.bash
export RMW_IMPLEMENTATION=rmw_cyclonedds_cpp
export CYCLONEDDS_URI='&lt;CycloneDDS&gt;&lt;Domain&gt;&lt;General&gt;&lt;Interfaces&gt;
    &lt;NetworkInterface name="enp3s0" priority="default" multicast="default" /&gt;
  &lt;/Interfaces&gt;&lt;/General&gt;&lt;/Domain&gt;&lt;/CycloneDDS&gt;'
ros2 topic list</code></pre>
<div class="box warn"><div class="box-t">⚠️ 배포판 주의 — 이 강좌의 기준(Jazzy)과 다릅니다</div>
unitree_ros2 README 의 테스트 환경은 <b>Ubuntu 20.04 + Foxy</b>, <b>Ubuntu 22.04 + Humble(권장)</b> 입니다. Jazzy(24.04)는 공식 테스트 대상이 아니므로, 실물 Go2 실습은 Humble PC(또는 Humble Docker)에서 하는 것이 안전합니다. 인터페이스 이름(<code>enp3s0</code>)은 <code>ip a</code> 로 찾은 여러분 PC 의 이름으로 바꿉니다.</div>`
    },

    /* ============================================================ 3 */
    {
      title: '핵심 토픽과 고수준 · 저수준 제어',
      html: `
<table class="tbl">
<tr><th>ROS 2 토픽</th><th>메시지</th><th>내용</th></tr>
<tr><td><code>/sportmodestate</code> (저주기 <code>/lf/sportmodestate</code>)</td><td><code>unitree_go/msg/SportModeState</code></td><td>몸통 위치 · 속도 · 자세, 현재 모드, 발 위치</td></tr>
<tr><td><code>/lowstate</code> (<code>/lf/lowstate</code>)</td><td><code>unitree_go/msg/LowState</code></td><td>모터 12개 각도 · 속도 · 토크, IMU, 배터리, 발 힘센서</td></tr>
<tr><td><code>/lowcmd</code></td><td><code>unitree_go/msg/LowCmd</code></td><td>저수준 모터 명령 (q · dq · kp · kd · tau)</td></tr>
<tr><td><code>/api/sport/request</code></td><td><code>unitree_api/msg/Request</code></td><td>고수준 명령 요청 — <code>header.identity.api_id</code> + JSON <code>parameter</code></td></tr>
<tr><td><code>/wirelesscontroller</code></td><td><code>unitree_go/msg/WirelessController</code></td><td>리모컨 스틱 · 버튼</td></tr>
<tr><td><code>/utlidar/cloud</code></td><td><code>sensor_msgs/msg/PointCloud2</code></td><td>머리의 L1 LiDAR 포인트클라우드 (frame <code>utlidar_lidar</code>)</td></tr>
</table>
<p>고수준 명령은 서비스가 아니라 <b>요청 메시지를 토픽에 발행</b>하는 방식입니다. SDK 의 <code>SportClient.Move(vx, vy, vyaw)</code> 가 내부에서 하는 일을 ROS 2 에서는 직접 합니다.</p>
<table class="tbl">
<tr><th>api_id</th><th>이름</th><th>api_id</th><th>이름</th></tr>
<tr><td>1001</td><td>Damp (모든 관절 힘 빼기)</td><td>1008</td><td>Move — <code>{"x": vx, "y": vy, "z": vyaw}</code></td></tr>
<tr><td>1002</td><td>BalanceStand</td><td>1009</td><td>Sit</td></tr>
<tr><td>1003</td><td>StopMove</td><td>1010</td><td>RiseSit</td></tr>
<tr><td>1004</td><td>StandUp</td><td>1016</td><td>Hello</td></tr>
<tr><td>1005</td><td>StandDown</td><td>1006</td><td>RecoveryStand</td></tr>
</table>
{{fig:levels}}
<div class="box warn"><div class="box-t">⚠️ 안전 — 실물 Go2 앞에서</div>
<ul>
<li>주변 반경 3 m 를 비우고, 보조자가 <b>리모컨을 들고 댐핑(비상 정지)</b> 준비. 첫 이동은 0.2 m/s 이하.</li>
<li>ROS 2 경로는 앱 · 브리지의 속도 제한을 거치지 않습니다. <b>노드 안에서 직접 속도를 제한</b>하고, 노드가 끝날 때 <code>StopMove</code> 를 보내며, 명령이 끊기면 멈추는 <b>워치독</b>을 둡니다.</li>
<li><b>저수준 제어</b>(<code>/lowcmd</code>)는 스포츠 모드를 끄고 로봇을 <b>매단 상태</b>에서만 시험합니다. 잘못된 kp · 토크 한 번에 로봇이 튀거나 주저앉습니다.</li>
</ul></div>`
    },

    /* ============================================================ 4 */
    {
      title: '브라우저 Go2 시뮬레이터 — 그리고 MuJoCo 연동',
      html: `
<p>이 사이트의 <b>go2 위젯</b>은 가벼운 4족 보행 시뮬레이터 노드 <code>/go2_driver</code>(패키지 <code>go2_sim</code>)를 ROS 2 그래프에 띄웁니다. 실제 로봇 드라이버처럼 <code>/cmd_vel</code> 을 받아 트롯으로 걷고, <code>/odom</code> · <code>/tf</code> · <code>/joint_states</code>(12 관절) · <code>/imu</code> · <code>/sportmodestate</code> · <code>/scan</code> 을 발행합니다. 실물과 같은 모양의 <code>/api/sport/request</code> 도 받아 줍니다.</p>
<div class="box note"><div class="box-t">📝 실물과 다른 점 — 꼭 구분하세요</div>
<ul>
<li><code>/go2/stand_up</code> · <code>/go2/stand_down</code> · <code>/go2/sit</code> · <code>/go2/hello</code> 서비스(<code>std_srvs/srv/Trigger</code>)는 <b>실습 편의를 위해 이 시뮬레이터가 제공</b>하는 것입니다. 공식 unitree_ros2 에서는 같은 일을 <code>/api/sport/request</code> 에 api_id 로 요청합니다.</li>
<li><code>/cmd_vel</code> 도 공식 unitree_ros2 에는 없고, 커뮤니티 드라이버(go2_ros2_sdk 등)나 여러분이 만든 변환 노드가 제공합니다(7절).</li>
<li>0.5 초 동안 <code>/cmd_vel</code> 이 없으면 멈추는 워치독(<code>cmd_timeout</code> 파라미터)이 있습니다.</li>
</ul></div>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li><b>일어서기 · 걷기</b> — 아래 위젯의 버튼으로 일어선 뒤 방향 버튼(또는 키보드)으로 걸려 보세요. 오른쪽 옆모습에서 대각선 다리가 짝지어 움직이는지(트롯) 보세요.</li>
<li><b>모드</b> — 엎드린 상태에서 걷기 명령을 보내면 무시됩니다. 왜 그런지 로그를 읽어 보세요.</li>
<li><b>MuJoCo 연동</b> — 🦾 <b>MuJoCo 실사 시뮬레이터 연동</b>을 켜면 연계 강좌 studyGo2 의 물리 시뮬레이터(MuJoCo WASM)가 함께 뜨고, <code>/cmd_vel</code> 이 그쪽의 sport Move 로 전달됩니다.</li>
</ol></div>
{{widget:go2}}
<div class="box tip"><div class="box-t">💡 MuJoCo 연동은 배포된 사이트에서</div>
studyGo2 시뮬레이터는 보안상 <b>같은 출처(same-origin)</b> 페이지가 보낸 <code>postMessage</code> 만 받습니다. 이 강좌와 studyGo2 는 모두 <code>samcho93.github.io</code> 에 있으므로 배포된 사이트에서는 연동되고, 내 PC 의 localhost 로 열었을 때는 안내문이 나옵니다. 연동 중에는 studyGo2 의 안전 속도 한계(vx 0.5 · vy 0.3 · vyaw 1.0)가 적용됩니다.</div>
<p>MuJoCo 시뮬레이터만 따로 열어 볼 수도 있습니다. <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 이동 · <kbd>Q</kbd><kbd>E</kbd> 회전 · <kbd>Space</kbd> 비상 정지(Damp), 매달기(suspend) 모드로 저수준 제어도 연습할 수 있습니다.</p>
{{widget:embed|url=https://samcho93.github.io/studyGo2/sim/index.html|h=560|title=Go2 MuJoCo 시뮬레이터 (studyGo2)|desc=MuJoCo WASM 물리 · 가상 스포츠 모드 · 관절 그래프 · 매달기 모드}}
<div class="box note"><div class="box-t">📝 두 시뮬레이터의 관계</div>
위 <b>go2 위젯</b>은 ROS 2 그래프 안의 노드(터미널 · rclpy 로 제어), 이 <b>MuJoCo 시뮬레이터</b>는 접촉 · 중력을 계산하는 물리 모델입니다. 따로 열면 ROS 2 와 연결되지 않고, go2 위젯의 연동 버튼을 켰을 때만 ROS 2 명령이 전달됩니다. 공식 <b>unitree_mujoco</b>(C++ · Python)를 실제 PC 에서 돌리면 <code>ROS_DOMAIN_ID=1</code> · 루프백(<code>lo</code>)으로 <code>/lowstate</code> · <code>/sportmodestate</code> 를 ROS 2 에서 볼 수 있습니다(<a href="https://samcho93.github.io/studyGo2/lessons/e06.html" target="_blank" rel="noopener">studyGo2 E06</a>).</div>`
    },

    /* ============================================================ 5 */
    {
      title: '터미널로 Go2 부리기',
      html: `
<p>이제 16장의 바퀴 로봇에 쓰던 명령 그대로 Go2 를 움직여 봅시다. 아래 실습 창은 터미널과 Go2 화면을 나란히 띄우고, 같은 <code>/go2_driver</code> 에 붙습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic list -t
ros2 topic echo /odom --once --no-arr
ros2 service call /go2/stand_up std_srvs/srv/Trigger
ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.3}}" -r 10</code></pre>
<p>마지막 줄은 계속 발행하는 명령이라 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춥니다. 멈추면 0.5 초 뒤 워치독이 로봇을 세웁니다. <code>-r 10</code> 을 빼고 <code>--once</code> 로 한 번만 보내면 어떻게 되는지도 확인해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 interface show unitree_api/msg/Request
ros2 topic pub --once /api/sport/request unitree_api/msg/Request "{header: {identity: {api_id: 1016}}}"
ros2 topic echo /sportmodestate --once --no-arr
ros2 param set /go2_driver max_vx 0.5
ros2 topic hz /joint_states</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li><b>상태</b> — <code>/odom</code> 의 <code>pose.pose.position.x</code> 가 걷는 동안 늘어나는지 확인하세요.</li>
<li><b>인사</b> — api_id 1016(Hello) 요청을 보내 보세요. 서 있을 때와 엎드렸을 때 결과가 다릅니다.</li>
<li><b>옆걸음 · 회전</b> — <code>"{linear: {y: 0.2}}"</code>, <code>"{angular: {z: 0.8}}"</code> 을 보내 보세요. 바퀴 로봇은 할 수 없는 옆걸음입니다.</li>
<li><b>제한</b> — <code>max_vx</code> 를 0.5 로 낮춘 뒤 <code>x: 2.0</code> 을 보내면 드라이버가 잘라 내는지 보세요.</li>
</ol></div>
{{widget:lab|with=go2|h=420|title=Go2 터미널 실습}}`
    },

    /* ============================================================ 6 */
    {
      title: 'rclpy 로 걷게 하기 — 그리고 SDK Playground',
      html: `
<p>파이썬 노드로 “일어서기 → 사각형 걷기 → 정지”를 해 봅시다. 서비스 클라이언트(일어서기)와 퍼블리셔(<code>/cmd_vel</code> 10 Hz)만 쓰는, 16장 · 8장에서 배운 그대로의 코드입니다.</p>
{{widget:pylab|ex=go2_walk}}
<p>실물(unitree_ros2)이라면 <code>/cmd_vel</code> 대신 <code>/api/sport/request</code> 에 Move 요청을 발행합니다. 이 시뮬레이터도 같은 메시지를 받으므로 그대로 실행해 볼 수 있습니다. 속도 상한과 종료 시 <code>StopMove</code> 는 실물에서 꼭 지키는 습관입니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="go2"><code>import json
import time
import rclpy
from rclpy.node import Node
from unitree_api.msg import Request

STAND_UP, STOP_MOVE, MOVE = 1004, 1003, 1008
VX_MAX = 0.3                                   # 안전 상한 (m/s)


def main():
    rclpy.init()
    node = Node('go2_sport_request')
    pub = node.create_publisher(Request, '/api/sport/request', 10)

    def send(api_id, param=None):
        req = Request()
        req.header.identity.api_id = api_id
        req.parameter = json.dumps(param or {})
        pub.publish(req)

    time.sleep(0.5)
    send(STAND_UP)
    node.get_logger().info('StandUp 요청')
    time.sleep(2.0)
    for _ in range(30):                         # 3초 동안 10 Hz 로 Move
        send(MOVE, {'x': min(0.25, VX_MAX), 'y': 0.0, 'z': 0.3})
        time.sleep(0.1)
    send(STOP_MOVE)
    node.get_logger().info('StopMove — 끝')
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box tip"><div class="box-t">💡 ROS 2 가 아닌 공식 SDK 로는?</div>
EDU 의 공식 <code>unitree_sdk2_python</code> 은 ROS 2 없이 DDS 로 직접 <code>SportClient().Move(0.3, 0, 0)</code> 처럼 부릅니다. 연계 강좌의 <b>Python Playground</b> 는 이 SDK 와 같은 모양의 코드를 브라우저에서 MuJoCo 시뮬레이터에 실행해 줍니다. ROS 2 노드(위)와 SDK 코드(아래)를 나란히 비교해 보세요 — 같은 api_id 가 오갑니다.</div>
{{widget:embed|url=https://samcho93.github.io/studyGo2/tools/playground.html|h=560|title=Go2 Python Playground (studyGo2)|desc=unitree_sdk2py 모양의 코드를 브라우저에서 시뮬레이터에 실행}}`
    },

    /* ============================================================ 7 */
    {
      title: '커뮤니티 드라이버 · LiDAR · SLAM/Nav2',
      html: `
<p>공식 unitree_ros2 는 SDK 토픽을 그대로 보여 줄 뿐, Nav2 가 기대하는 <code>/cmd_vel</code> · <code>/odom</code> · <code>/scan</code> 모양으로 바꿔 주지는 않습니다. 이 “표준 인터페이스 변환”을 해 주는 대표적인 커뮤니티 프로젝트가 <b>go2_ros2_sdk</b>(abizovnuralem/go2_ros2_sdk) 입니다.</p>
<table class="tbl">
<tr><th>항목</th><th>go2_ros2_sdk (README 기준)</th></tr>
<tr><td>연결</td><td><b>WebRTC</b>(Wi-Fi, 기본) 또는 <b>CycloneDDS</b>(이더넷) — <code>CONN_TYPE=webrtc|cyclonedds</code>, <code>ROBOT_IP</code></td></tr>
<tr><td>토픽</td><td><code>/cmd_vel</code>, <code>/odom</code>, <code>/joint_states</code>, LiDAR <code>PointCloud2</code>, <code>/scan</code>(pointcloud_to_laserscan), 카메라 <code>/go2_camera/color/image</code></td></tr>
<tr><td>포함 기능</td><td>slam_toolbox 지도 작성, Nav2 내비게이션, RViz · Foxglove, 객체 검출 예제</td></tr>
<tr><td>테스트 환경</td><td>Ubuntu 22.04 + Humble / Iron / Rolling</td></tr>
<tr><td>대상</td><td>Air · Pro · EDU (WebRTC 는 <b>비공식</b> 경로 — 펌웨어 업데이트에 따라 달라질 수 있음)</td></tr>
</table>
<pre class="code" data-lang="bash"><code># 실제 PC 에서 (go2_ros2_sdk README)
export ROBOT_IP="192.168.x.x"
export CONN_TYPE="webrtc"
ros2 launch go2_robot_sdk robot.launch.py</code></pre>
<p>SLAM 과 Nav2 는 16장과 똑같습니다. 달라지는 곳은 입력이 3D 라는 점뿐입니다. L1 LiDAR 의 포인트클라우드에서 로봇 높이 범위의 점만 잘라 2D <code>/scan</code> 으로 만들면(<code>pointcloud_to_laserscan</code>), slam_toolbox 와 Nav2 가 바퀴 로봇에서처럼 동작합니다.</p>
{{fig:slam}}
<div class="box note"><div class="box-t">🔗 연계 강좌 — 더 깊이</div>
<ul>
<li><a href="https://samcho93.github.io/studyGo2/lessons/e07.html" target="_blank" rel="noopener">studyGo2 E07 · ROS 2 (unitree_ros2)</a> — 설치, setup.sh 수정, 공식 예제, rclpy 로 /api/sport/request 발행</li>
<li><a href="https://samcho93.github.io/studyGo2/lessons/e08.html" target="_blank" rel="noopener">studyGo2 E08 · L1 LiDAR · SLAM</a> — 포인트클라우드 가공(다운샘플 · 지면 제거 · 점유 격자), Point-LIO 3D SLAM</li>
<li><a href="https://samcho93.github.io/studyGo2/lessons/e06.html" target="_blank" rel="noopener">studyGo2 E06 · unitree_mujoco</a> — 공식 MuJoCo 시뮬레이터와 ROS 2</li>
<li><a href="https://samcho93.github.io/studyGo2/" target="_blank" rel="noopener">studyGo2 강좌 홈</a> · <a href="https://samcho93.github.io/studyGo2/sim/index.html" target="_blank" rel="noopener">시뮬레이터</a> · <a href="https://samcho93.github.io/studyGo2/tools/playground.html" target="_blank" rel="noopener">Playground</a></li>
</ul></div>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>
보행 제어기 자체도 강화학습(RL)으로 학습한 정책이 많이 쓰입니다. 시뮬레이터(Isaac Lab · MuJoCo)에서 수천 마리를 병렬로 훈련해 실물에 옮기는 sim-to-real 방식이며, 연계 강좌 E10 에서 다룹니다.</div>`
    },

    /* ============================================================ 8 */
    {
      title: '바퀴 · 팔 · 다리 — 같은 ROS 2 인터페이스의 힘',
      html: `
<p>16~18장에서 세 가지 전혀 다른 로봇을 다뤘습니다. 그런데 ROS 2 쪽에서 보면 쓰는 “말”이 거의 같습니다.</p>
<table class="tbl cmp">
<tr><th></th><th>🤖 webbot (바퀴, 16장)</th><th>🦾 SO-ARM101 (팔, 17장)</th><th>🐕 Go2 (다리, 18장)</th></tr>
<tr><td>움직이라는 명령</td><td><code>/cmd_vel</code> (Twist)</td><td><code>FollowJointTrajectory</code> 액션</td><td><code>/cmd_vel</code> (Twist) · <code>/api/sport/request</code></td></tr>
<tr><td>관절 상태</td><td><code>/joint_states</code> (바퀴 2)</td><td><code>/joint_states</code> (6)</td><td><code>/joint_states</code> (12)</td></tr>
<tr><td>자기 위치</td><td><code>/odom</code> · TF odom → base_link</td><td>TF base_link → gripper_frame_link</td><td><code>/odom</code> · TF odom → base_link</td></tr>
<tr><td>센서</td><td><code>/scan</code> · <code>/imu</code></td><td>(카메라)</td><td><code>/scan</code> · <code>/imu</code> · PointCloud2</td></tr>
<tr><td>상위 두뇌</td><td>slam_toolbox · Nav2</td><td>MoveIt 2</td><td>slam_toolbox · Nav2</td></tr>
<tr><td>로봇 전용 층</td><td>차동 구동 컨트롤러</td><td>ros2_control 하드웨어 인터페이스</td><td>스포츠 모드 (로봇 안)</td></tr>
</table>
<div class="box practice"><div class="box-t">🧪 해 보기 — 같은 명령, 다른 로봇</div>
<ol class="steps-list">
<li>16장의 <code>ros2 topic pub /cmd_vel geometry_msgs/msg/Twist "{linear: {x: 0.3}}" -r 10</code> 이 이 장의 Go2 도 걷게 한다는 것을 다시 확인하세요.</li>
<li>16장의 <code>bot_avoid</code> 예제(LaserScan → cmd_vel)를 떠올려 보세요. Go2 시뮬레이터도 <code>/scan</code> 을 내므로, 토픽 이름만 맞으면 같은 코드가 강아지 로봇의 장애물 회피가 됩니다.</li>
</ol></div>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 인터페이스가 곧 재사용</div>
로봇 회사가 바뀌어도, 로봇이 바퀴에서 다리로 바뀌어도, 상위 소프트웨어(내비게이션 · 계획 · 인식 · 대시보드)를 다시 짤 필요가 없다는 것이 ROS 2 표준 인터페이스(REP-105 좌표계, 표준 메시지, 표준 액션)의 가장 큰 가치입니다. 새 로봇을 들이면 할 일은 “표준 토픽을 내는 드라이버 하나”입니다.</div>
<div class="box note"><div class="box-t">📝 다음 장</div>
19장에서는 카메라 영상(<code>sensor_msgs/msg/Image</code>)과 OpenCV · AI 를 붙여, 이 로봇들이 “보고” 판단하게 만듭니다.</div>`
    }
  ],

  videos: [
    { title: 'Unlock ROS2 on your Unitree Go2 Robot Dog!', channel: 'DroneBlocks', url: 'https://www.youtube.com/watch?v=Q_dqPLJDPms', lang: 'en', desc: 'unitree_ros2 설치 · 네트워크 설정 · 센서 토픽 확인까지. 이 장 2절의 통신 구조를 실물로 봅니다.' },
    { title: 'Unitree Go2 Getting Started with Unitree SDK2 C++ Repository', channel: 'DroneBlocks', url: 'https://www.youtube.com/watch?v=Tb5Pp2fSwSw', lang: 'en', desc: '공식 SDK2 저장소 빌드와 예제 실행. ROS 2 아래에서 오가는 DDS 메시지를 이해하는 데 도움이 됩니다.' },
    { title: 'Quadruped Robot ROS2 | Unitree Go2', channel: 'Luis Cruz', url: 'https://www.youtube.com/watch?v=r3QCn4AO9G0', lang: 'en', desc: 'Go2 를 ROS 2 로 다루는 데모. 토픽 · RViz 시각화 장면에 주목하세요.' },
    { title: 'D-LIO with Unitree Go2 (Quadruped) | ROS2 Jazzy | Gazebo Harmonic', channel: 'Ali Tekeş', url: 'https://www.youtube.com/watch?v=k4HOyx_zuFE', lang: 'en', desc: 'Jazzy + Gazebo Harmonic 에서 Go2 모델로 LiDAR-관성 오도메트리를 돌리는 시뮬레이션.' },
    { title: 'Unitree Robotics 공식 채널', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=Unitree+Go2+official', lang: 'en', desc: 'Unitree 공식 Go2 소개 · 기능 영상을 찾아보세요 (모델별 기능 차이 확인).' },
    { title: '"go2_ros2_sdk slam nav2" 영상 찾아보기', channel: 'YouTube 검색', url: 'https://www.youtube.com/results?search_query=go2_ros2_sdk+slam+nav2', lang: 'en', desc: '커뮤니티 드라이버로 Go2 에서 slam_toolbox · Nav2 를 돌리는 데모를 찾아보세요.' }
  ],

  terms: [
    ['사족보행 로봇(quadruped)', '다리 네 개로 걷는 로봇. Go2 는 다리마다 hip · thigh · calf 3관절, 모두 12 자유도'],
    ['보행 패턴(gait)', '발을 들고 딛는 순서 · 타이밍. 트롯(trot)은 대각선 두 발씩 짝지어 번갈아 딛는 방식'],
    ['스포츠 모드(sport mode)', 'Go2 내부의 고수준 보행 · 균형 제어기. 몸통 속도 명령을 관절 명령으로 바꿈'],
    ['unitree_ros2', 'Unitree 공식 ROS 2 패키지. unitree_go · unitree_api 메시지와 예제. Foxy · Humble 에서 테스트'],
    ['CycloneDDS', 'Eclipse 의 DDS 구현. Go2 SDK 와 ROS 2 가 같은 DDS(rmw_cyclonedds_cpp)를 써서 토픽을 공유'],
    ['CYCLONEDDS_URI', 'CycloneDDS 설정(XML). 로봇과 연결된 네트워크 인터페이스 이름을 지정'],
    ['/sportmodestate', 'unitree_go/msg/SportModeState. 몸통 위치 · 속도 · 모드 등 고수준 상태'],
    ['/lowstate · /lowcmd', '저수준 상태(모터 · IMU · 배터리) / 저수준 모터 명령(q · dq · kp · kd · tau)'],
    ['/api/sport/request', 'unitree_api/msg/Request 로 고수준 명령을 요청하는 토픽. header.identity.api_id(예: 1008 Move) + JSON parameter'],
    ['워치독(watchdog)', '명령이 일정 시간 끊기면 로봇을 멈추는 안전 장치'],
    ['매달기(suspend)', '저수준 제어 시험 때 로봇 몸통을 공중에 매달아 넘어짐 · 튐을 막는 절차'],
    ['go2_ros2_sdk', '커뮤니티 Go2 ROS 2 드라이버. WebRTC/CycloneDDS 연결, /cmd_vel · /odom · /scan, slam_toolbox · Nav2 포함'],
    ['pointcloud_to_laserscan', '3D 포인트클라우드의 일정 높이 범위를 잘라 2D LaserScan 으로 바꾸는 ROS 2 노드'],
    ['MuJoCo', '접촉 · 관절 동역학에 강한 물리 엔진. unitree_mujoco 와 studyGo2 웹 시뮬레이터가 사용']
  ],

  summary: [
    'Go2 는 4 다리 × (hip · thigh · calf) = 12 관절 로봇이며, 내부 스포츠 모드가 트롯 등 보행과 균형을 계산합니다.',
    '공식 SDK2 · unitree_ros2 는 EDU 에서만 지원되며, 유선 192.168.123.x 망에서 CycloneDDS(rmw_cyclonedds_cpp)로 로봇 토픽이 곧바로 ROS 2 토픽으로 보입니다.',
    '고수준 제어는 /api/sport/request 에 api_id(1004 StandUp, 1008 Move …)를 발행하고, 저수준 /lowcmd 는 스포츠 모드를 끄고 매단 상태에서만 씁니다.',
    '실물에서는 속도 제한 · 워치독 · 종료 시 StopMove · 리모컨 비상 정지를 반드시 준비합니다.',
    '브라우저 go2 위젯은 /cmd_vel · /odom · /joint_states · /scan 을 쓰는 ROS 2 노드이며, 배포된 사이트에서는 studyGo2 MuJoCo 시뮬레이터와 연동됩니다.',
    'go2_ros2_sdk 같은 드라이버가 /cmd_vel · /scan 을 제공하면 16장의 slam_toolbox · Nav2 를 Go2 에 그대로 씁니다.',
    '바퀴 · 팔 · 다리 로봇 모두 cmd_vel · odom · tf · joint_states 같은 표준 인터페이스를 써서 상위 소프트웨어를 재사용할 수 있습니다.'
  ],

  quiz: [
    { q: 'Go2 의 관절 수와 다리 하나의 관절 구성으로 옳은 것은?', options: ['8개 · thigh, calf', '12개 · hip, thigh, calf', '12개 · shoulder, elbow, wrist', '16개 · hip, thigh, calf, foot'], answer: 1, explain: '다리 4개 × 관절 3개(hip · thigh · calf) = 12 자유도입니다. 발(foot)은 관절이 아니라 접촉점 프레임입니다.' },
    { q: '공식 unitree_ros2 로 Go2 를 제어할 수 있는 모델은?', options: ['Air', 'Pro', 'EDU (EDU Plus)', '모든 모델'], answer: 2, explain: '공식 SDK2 · unitree_ros2 등 2차 개발은 EDU 계열에서만 지원됩니다. Air · Pro 는 비공식 WebRTC 커뮤니티 도구만 쓸 수 있습니다.' },
    { q: 'unitree_ros2 가 별도 변환 노드 없이 로봇 토픽을 ROS 2 에서 볼 수 있는 이유는?', options: ['로봇이 rosbridge 를 실행해서', '로봇과 ROS 2 가 같은 DDS(CycloneDDS)와 같은 메시지 정의를 쓰기 때문', 'Wi-Fi 로 JSON 을 주고받아서', 'ROS 1 브리지를 써서'], answer: 1, explain: 'ROS 2 의 RMW 를 rmw_cyclonedds_cpp 로 맞추고 unitree_go · unitree_api 메시지 패키지를 빌드하면 DDS 토픽이 그대로 ROS 2 토픽으로 보입니다.' },
    { q: '/api/sport/request 로 걷기(Move) 명령을 보낼 때 쓰는 api_id 와 parameter 는?', options: ['1004, {"x": 0.3}', '1008, {"x": 0.3, "y": 0.0, "z": 0.0}', '1001, {"vx": 0.3}', '1016, 빈 문자열'], answer: 1, explain: 'Move 는 api_id 1008 이며 parameter 에 JSON {"x": vx, "y": vy, "z": vyaw} 를 넣습니다. 1004 는 StandUp, 1001 은 Damp, 1016 은 Hello 입니다.' },
    { q: '저수준 제어(/lowcmd)를 시험할 때 반드시 지켜야 할 것은?', options: ['스포츠 모드를 켠 채 보낸다', '스포츠 모드를 끄고 로봇을 매단 상태에서 시험한다', 'Wi-Fi 로 연결한다', 'kp 를 최대로 둔다'], answer: 1, explain: '저수준 명령은 균형을 전혀 잡아 주지 않으며 스포츠 모드와 충돌합니다. 스포츠 모드를 끄고, 매단 상태에서 작은 게인으로 시작합니다.' },
    { q: '이 사이트의 Go2 시뮬레이터에서 ros2 topic pub /cmd_vel ... 을 --once 로 한 번만 보내면?', options: ['계속 그 속도로 걷는다', '약 0.5 초 뒤 워치독으로 멈춘다', '로봇이 넘어진다', '오류가 난다'], answer: 1, explain: 'cmd_timeout(0.5 초) 워치독 때문에 명령이 끊기면 멈춥니다. 그래서 -r 10 처럼 계속 발행합니다. 실물 노드에도 같은 안전 장치를 둡니다.' },
    { q: 'Go2 에서 slam_toolbox · Nav2 를 쓰려면 L1 LiDAR 데이터를 보통 어떻게 가공하나요?', options: ['포인트클라우드를 그대로 slam_toolbox 에 넣는다', 'pointcloud_to_laserscan 으로 일정 높이 범위를 잘라 2D /scan 으로 만든다', '카메라 영상으로 바꾼다', '/lowstate 로 보낸다'], answer: 1, explain: 'slam_toolbox 와 Nav2 기본 구성은 2D LaserScan 을 입력으로 받습니다. 3D 포인트클라우드를 2D 스캔으로 잘라 넣으면 16장 파이프라인을 그대로 씁니다.' }
  ],

  slides: [
    { title: '모터 12개에 무엇을 보낼까?', layout: 'center', html: `<div class="s-big">🐕 1 m 앞으로 걸어!</div><p class="s-center">관절 12개의 각도? 아니면 … <code>/cmd_vel</code> 한 줄?</p>`, notes: '계단을 오르는 보행 로봇 영상을 보여 준 뒤 질문합니다. 학생 답을 받아 두고, 오늘 끝에 /cmd_vel 로 걷는 것을 확인한다고 예고합니다. (3분)' },
    { title: '다리 네 개, 관절 열두 개', html: `{{fig:legs|nocap}}`, notes: 'FR · FL · RR · RL 이름 규칙과 hip · thigh · calf 의 역할을 짚습니다. SDK 모터 순서와 URDF 관절 이름 순서가 다르다는 점도 언급합니다. (5분)' },
    { title: '보행 패턴', html: `{{fig:gaits|nocap}}`, notes: '트롯은 대각선 짝, 걷기는 한 발씩. 이 복잡한 타이밍을 스포츠 모드가 로봇 안에서 계산한다는 점이 핵심입니다. (5분)' },
    { title: '모델별 개발 경로', html: `<table class="tbl cmp"><tr><th></th><th>Air / Pro</th><th>EDU</th></tr><tr><td>공식 SDK2 · ROS 2</td><td>–</td><td>●</td></tr><tr><td>저수준 제어</td><td>불가</td><td>●</td></tr><tr><td>WebRTC (비공식)</td><td>●</td><td>●</td></tr></table>`, notes: '속도 · 배터리보다 “누가 명령을 보낼 수 있나”가 모델 선택의 핵심이라는 점을 강조합니다. (4분)' },
    { title: 'DDS 로 곧장 ROS 2', html: `{{fig:network|nocap}}`, notes: '11장 DDS 를 복습하며, 같은 DDS + 같은 메시지 정의면 래퍼 없이 토픽이 보인다는 점을 설명합니다. unitree_ros2 는 Foxy · Humble 기준이라는 주의점도 전합니다. (6분)' },
    { title: '고수준 vs 저수준', html: `{{fig:levels|nocap}}`, notes: '/api/sport/request 의 api_id 방식과 /lowcmd 의 차이. 저수준은 매단 상태에서만이라는 안전 규칙을 반복합니다. (6분)' },
    { title: '안전 수칙', html: `<ol class="steps-list"><li>반경 3 m 비우기 · 리모컨 보조자</li><li>첫 이동 0.2 m/s 이하</li><li>노드 안 속도 제한 · 워치독 · StopMove</li><li>저수준은 매단 상태에서만</li></ol>`, notes: '실물 실습 전에 반드시 읽고 확인하게 합니다. 시뮬레이터에서도 같은 습관을 들이자고 권합니다. (3분)' },
    { title: 'Go2 시뮬레이터', html: `{{widget:go2}}`, notes: '일어서기 → 걷기 → 옆걸음을 시연하고, 엎드린 상태에서 걷기 명령이 무시되는 로그를 보여 줍니다. 배포된 사이트라면 MuJoCo 연동 버튼도 눌러 봅니다. (8분)' },
    { title: '터미널로 걷기', html: `<pre class="code" data-lang="bash"><code>ros2 service call /go2/stand_up std_srvs/srv/Trigger
ros2 topic pub /cmd_vel geometry_msgs/msg/Twist \\
  "{linear: {x: 0.3}}" -r 10</code></pre><p class="s-center s-small">16장 바퀴 로봇과 같은 명령</p>`, notes: '본문 5절의 lab 위젯에서 학생들이 직접 실행하게 합니다. -r 10 을 --once 로 바꾸면 워치독으로 멈추는 것도 확인합니다. /go2/* 서비스는 시뮬레이터 편의 기능임을 다시 짚습니다. (10분)' },
    { title: 'rclpy 로 걷기', html: `{{widget:pylab|ex=go2_walk}}`, notes: '서비스 클라이언트 + 10 Hz 퍼블리셔 구조를 읽고 실행합니다. 사각형 크기와 회전 시간을 바꿔 보게 합니다. (8분)' },
    { title: 'Go2 로 SLAM · Nav2', html: `{{fig:slam|nocap}}`, notes: '포인트클라우드 → 2D 스캔만 추가하면 16장 파이프라인 그대로. go2_ros2_sdk 가 이 구성을 묶어 제공한다는 점과 연계 강좌 E08 을 소개합니다. (6분)' },
    { title: 'MuJoCo · Playground', html: `{{widget:embed|url=https://samcho93.github.io/studyGo2/sim/index.html|h=480|title=Go2 MuJoCo 시뮬레이터}}`, notes: '물리 시뮬레이터에서 WASD 보행과 Space 비상 정지, 매달기 모드를 시연합니다. ROS 2 위젯과 달리 따로 열면 ROS 2 그래프와 연결되지 않는다는 점을 구분합니다. (5분)' },
    { title: '세 로봇, 같은 말', html: `<div class="s-cols c3"><div class="card blue"><div class="ci">🤖</div><b>바퀴</b><p>/cmd_vel · /odom · Nav2</p></div><div class="card orange"><div class="ci">🦾</div><b>팔</b><p>/joint_states · 액션 · MoveIt</p></div><div class="card green"><div class="ci">🐕</div><b>다리</b><p>/cmd_vel · /odom · Nav2</p></div></div>`, notes: '표준 인터페이스 덕분에 상위 소프트웨어를 재사용한다는 5부의 결론으로 정리합니다. 새 로봇에 필요한 것은 표준 토픽을 내는 드라이버 하나라는 메시지로 마무리합니다. (4분)' }
  ]
});
