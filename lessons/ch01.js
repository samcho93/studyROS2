/* 1장 — 설치와 첫 실행 — turtlesim */
Course.lesson({
  id: 'ch01', no: '01',
  icon: '🛠️',
  title: '설치와 첫 실행 — turtlesim',
  subtitle: 'Ubuntu 24.04 에 ROS 2 Jazzy 를 설치하고, 거북이를 움직여 봅시다',
  level: '입문', time: '120분',
  goals: [
    '내 컴퓨터 환경에 맞는 설치 방법(Ubuntu · 듀얼 부팅 · VM · WSL2 · Docker)을 고를 수 있다',
    '공식 문서 순서대로 ROS 2 Jazzy 를 apt 로 설치하고 desktop · ros-base · ros-dev-tools 의 차이를 말할 수 있다',
    'source 명령과 ~/.bashrc 로 ROS 2 환경을 설정하고 printenv 로 확인할 수 있다',
    'talker/listener 데모와 turtlesim · turtle_teleop_key 로 설치가 잘 되었는지 검증할 수 있다',
    '자주 만나는 설치 오류(ros2: command not found 등)의 원인과 해결책을 찾을 수 있다'
  ],
  teacher: {
    intro: '“ROS 2 를 설치하는 데 몇 분이면 될까요?” 하고 물어 봅니다. 인터넷이 빠르면 명령 몇 줄 + 10~20분이면 끝나지만, 대부분의 문제는 설치 “후”의 환경 설정(source)에서 생긴다는 점을 예고하며 시작합니다. 수업 전에 학생 PC 운영체제(Windows/macOS/Ubuntu)를 손들어 조사해 두세요. (3분)',
    flow: '① 설치 방법 고르기 15분 → ② apt 설치 순서 따라가기 20분 → ③ WSL2 · Docker 대안 10분 → ④ 환경 설정(source · bashrc · ROS_DOMAIN_ID) 15분 → ⑤ talker/listener 확인 15분 → ⑥ turtlesim + teleop 실습 20분 → ⑦ rqt 소개 10분 → ⑧ 문제 해결표 · 퀴즈 15분'
  },

  figs: {
    /* ---------------------------------------------------------------- 설치 방법 고르기 */
    choose: {
      caption: '내 컴퓨터에 맞는 설치 방법 고르기 — 가장 좋은 것은 Ubuntu 24.04 를 직접 설치하는 것, 어렵다면 WSL2 나 Docker',
      svg: `<svg class="dg" viewBox="0 0 880 400" role="img" aria-label="운영체제에 따라 설치 방법을 고르는 흐름도">
  <rect x="330" y="14" width="220" height="44" rx="22" class="s-blue"/>
  <text x="440" y="36" class="t-b t-c tw">지금 쓰는 컴퓨터는?</text>
  <line x1="380" y1="58" x2="130" y2="108" class="ln ar"/>
  <line x1="440" y1="58" x2="440" y2="108" class="ln ar"/>
  <line x1="500" y1="58" x2="750" y2="108" class="ln ar"/>
  <rect x="40" y="110" width="180" height="40" rx="10" class="orange"/><text x="130" y="130" class="t-b t-c">🐧 Ubuntu 24.04</text>
  <rect x="350" y="110" width="180" height="40" rx="10" class="blue"/><text x="440" y="130" class="t-b t-c">🪟 Windows 10/11</text>
  <rect x="660" y="110" width="180" height="40" rx="10" class="gray"/><text x="750" y="130" class="t-b t-c">🍎 macOS</text>

  <line x1="130" y1="150" x2="130" y2="196" class="ln-green ar-green"/>
  <rect x="30" y="198" width="200" height="72" rx="10" class="green"/>
  <text x="130" y="220" class="t-b t-c t-green">apt 로 바로 설치</text>
  <text x="130" y="244" class="t-xs t-c">가장 빠르고 문제 적음</text>
  <text x="130" y="260" class="t-xs t-c t-mu">★★★ 추천</text>

  <line x1="400" y1="150" x2="310" y2="196" class="ln ar"/>
  <line x1="440" y1="150" x2="440" y2="196" class="ln ar"/>
  <line x1="480" y1="150" x2="570" y2="196" class="ln ar"/>
  <rect x="244" y="198" width="140" height="72" rx="10" class="green"/>
  <text x="314" y="220" class="t-sm t-b t-c">듀얼 부팅</text>
  <text x="314" y="244" class="t-xs t-c">Ubuntu 를 옆에 설치</text>
  <text x="314" y="260" class="t-xs t-c t-mu">성능 최고</text>
  <rect x="394" y="198" width="92" height="72" rx="10" class="teal"/>
  <text x="440" y="220" class="t-sm t-b t-c">WSL2</text>
  <text x="440" y="244" class="t-xs t-c">가장 간편</text>
  <text x="440" y="260" class="t-xs t-c t-mu">Win11 추천</text>
  <rect x="496" y="198" width="140" height="72" rx="10" class="yellow"/>
  <text x="566" y="220" class="t-sm t-b t-c">가상 머신(VM)</text>
  <text x="566" y="244" class="t-xs t-c">VirtualBox 등</text>
  <text x="566" y="260" class="t-xs t-c t-mu">3D 가 느림</text>

  <line x1="750" y1="150" x2="750" y2="196" class="ln ar"/>
  <rect x="660" y="198" width="190" height="72" rx="10" class="purple"/>
  <text x="755" y="220" class="t-sm t-b t-c">VM(UTM 등) 또는 Docker</text>
  <text x="755" y="244" class="t-xs t-c">Ubuntu 24.04 를 안에 띄움</text>
  <text x="755" y="260" class="t-xs t-c t-mu">macOS 직접 설치는 어려움</text>

  <rect x="30" y="300" width="820" height="84" rx="12" class="box"/>
  <text x="440" y="324" class="t-b t-c">🐳 어느 운영체제든: Docker 로 <tspan class="t-mono">osrf/ros:jazzy-desktop</tspan> 이미지 실행</text>
  <text x="440" y="350" class="t-sm t-c">설치 없이 깨끗한 환경을 바로 얻을 수 있음 · GUI(turtlesim · RViz2) 표시는 추가 설정 필요</text>
  <text x="440" y="372" class="t-xs t-c t-mu">그리고 설치 전이라면? → 이 사이트의 브라우저 실습 환경으로 먼저 연습!</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 설치 순서 */
    steps: {
      caption: 'apt 설치의 다섯 단계 — ② 저장소를 추가해야 ③ 에서 ros-jazzy-* 패키지를 찾을 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="로캘 설정, 저장소 추가, 패키지 설치, 개발 도구, 환경 설정 순서">
  <rect x="10" y="40" width="160" height="130" rx="12" class="gray"/>
  <text x="90" y="68" class="t-xl t-c">🌐</text>
  <text x="90" y="104" class="t-b t-c">① 로캘</text>
  <text x="90" y="130" class="t-xs t-c">UTF-8 문자 설정</text>
  <text x="90" y="150" class="t-xs t-c t-mono t-mu">locale</text>
  <line x1="170" y1="105" x2="186" y2="105" class="ln ar"/>
  <rect x="188" y="40" width="160" height="130" rx="12" class="blue"/>
  <text x="268" y="68" class="t-xl t-c">📚</text>
  <text x="268" y="104" class="t-b t-c">② 저장소 추가</text>
  <text x="268" y="130" class="t-xs t-c">universe +</text>
  <text x="268" y="150" class="t-xs t-c t-mono">ros2-apt-source</text>
  <line x1="348" y1="105" x2="364" y2="105" class="ln ar"/>
  <rect x="366" y="40" width="160" height="130" rx="12" class="orange"/>
  <text x="446" y="68" class="t-xl t-c">📦</text>
  <text x="446" y="104" class="t-b t-c">③ ROS 2 설치</text>
  <text x="446" y="130" class="t-xs t-c">apt update · upgrade</text>
  <text x="446" y="150" class="t-xs t-c t-mono">ros-jazzy-desktop</text>
  <line x1="526" y1="105" x2="542" y2="105" class="ln ar"/>
  <rect x="544" y="40" width="160" height="130" rx="12" class="purple"/>
  <text x="624" y="68" class="t-xl t-c">🧰</text>
  <text x="624" y="104" class="t-b t-c">④ 개발 도구</text>
  <text x="624" y="130" class="t-xs t-c">colcon · rosdep 등</text>
  <text x="624" y="150" class="t-xs t-c t-mono">ros-dev-tools</text>
  <line x1="704" y1="105" x2="720" y2="105" class="ln ar"/>
  <rect x="722" y="40" width="150" height="130" rx="12" class="green"/>
  <text x="797" y="68" class="t-xl t-c">✅</text>
  <text x="797" y="104" class="t-b t-c">⑤ 환경 설정</text>
  <text x="797" y="130" class="t-xs t-c">매 터미널마다</text>
  <text x="797" y="150" class="t-xs t-c t-mono">source …/setup.bash</text>
  <rect x="10" y="194" width="862" height="42" rx="10" class="box"/>
  <text x="441" y="215" class="t-sm t-c">설치 확인: <tspan class="t-mono t-b">ros2 run demo_nodes_cpp talker</tspan> + <tspan class="t-mono t-b">ros2 run demo_nodes_py listener</tspan> → "I heard" 가 보이면 성공</text>
</svg>`
    },

    /* ---------------------------------------------------------------- source 전/후 */
    sourceFig: {
      caption: 'source 는 "이 터미널에 ROS 2 의 위치를 알려 주는" 명령 — 터미널을 새로 열 때마다 필요해서 ~/.bashrc 에 적어 둡니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="source 하기 전과 후의 터미널 비교">
  <rect x="14" y="14" width="400" height="200" rx="12" class="red"/>
  <text x="214" y="40" class="t-b t-c t-red">source 하기 전</text>
  <rect x="34" y="58" width="360" height="136" rx="8" class="box"/>
  <text x="48" y="82" class="t-sm t-mono">$ ros2 topic list</text>
  <text x="48" y="106" class="t-sm t-mono t-red">ros2: command not found</text>
  <text x="48" y="140" class="t-sm t-mono">$ echo $ROS_DISTRO</text>
  <text x="48" y="164" class="t-sm t-mono t-mu">(빈 줄)</text>

  <line x1="420" y1="114" x2="460" y2="114" class="ln-green thick ar-green"/>
  <text x="440" y="96" class="t-xs t-c t-green t-b">source</text>

  <rect x="466" y="14" width="400" height="200" rx="12" class="green"/>
  <text x="666" y="40" class="t-b t-c t-green">source 한 뒤</text>
  <rect x="486" y="58" width="360" height="136" rx="8" class="box"/>
  <text x="500" y="82" class="t-sm t-mono">$ ros2 topic list</text>
  <text x="500" y="106" class="t-sm t-mono">/parameter_events</text>
  <text x="500" y="126" class="t-sm t-mono">/rosout</text>
  <text x="500" y="152" class="t-sm t-mono">$ echo $ROS_DISTRO</text>
  <text x="500" y="176" class="t-sm t-mono t-green">jazzy</text>

  <rect x="14" y="230" width="852" height="86" rx="12" class="blue"/>
  <text x="440" y="254" class="t-b t-c t-blue">source /opt/ros/jazzy/setup.bash 가 하는 일</text>
  <text x="440" y="280" class="t-sm t-c">PATH(명령 위치) · PYTHONPATH(파이썬 모듈 위치) · AMENT_PREFIX_PATH(패키지 위치) · ROS_DISTRO 등을</text>
  <text x="440" y="302" class="t-sm t-c"><tspan class="t-b">지금 이 터미널에만</tspan> 설정 → 새 터미널에는 적용 안 됨 → <tspan class="t-mono">~/.bashrc</tspan> 에 한 줄 추가</text>
</svg>`
    },

    /* ---------------------------------------------------------------- talker / listener */
    talkListen: {
      caption: '설치 확인용 데모 — C++ talker 가 /chatter 로 보내고, 파이썬 listener 가 받습니다. 언어가 달라도 대화할 수 있어요',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="talker 노드가 chatter 토픽으로 발행하고 listener 노드가 구독">
  <rect x="14" y="14" width="300" height="130" rx="10" class="box"/>
  <text x="30" y="36" class="t-sm t-b">🖥️ 터미널 1</text>
  <text x="30" y="62" class="t-xs t-mono">$ ros2 run demo_nodes_cpp talker</text>
  <text x="30" y="86" class="t-xs t-mono t-blue">[INFO] [talker]: Publishing: 'Hello World: 1'</text>
  <text x="30" y="106" class="t-xs t-mono t-blue">[INFO] [talker]: Publishing: 'Hello World: 2'</text>
  <text x="30" y="126" class="t-xs t-mono t-mu">…</text>
  <rect x="566" y="14" width="300" height="130" rx="10" class="box"/>
  <text x="582" y="36" class="t-sm t-b">🖥️ 터미널 2</text>
  <text x="582" y="62" class="t-xs t-mono">$ ros2 run demo_nodes_py listener</text>
  <text x="582" y="86" class="t-xs t-mono t-green">[INFO] [listener]: I heard: [Hello World: 1]</text>
  <text x="582" y="106" class="t-xs t-mono t-green">[INFO] [listener]: I heard: [Hello World: 2]</text>
  <text x="582" y="126" class="t-xs t-mono t-mu">…</text>

  <ellipse cx="164" cy="220" rx="96" ry="34" class="blue"/>
  <text x="164" y="214" class="t-b t-c t-mono">/talker</text><text x="164" y="234" class="t-xs t-c t-mu">C++ (rclcpp)</text>
  <rect x="350" y="194" width="180" height="52" rx="6" class="green"/>
  <text x="440" y="214" class="t-b t-c t-mono">/chatter</text><text x="440" y="232" class="t-xs t-c t-mu">std_msgs/msg/String</text>
  <ellipse cx="716" cy="220" rx="96" ry="34" class="blue"/>
  <text x="716" y="214" class="t-b t-c t-mono">/listener</text><text x="716" y="234" class="t-xs t-c t-mu">Python (rclpy)</text>
  <line x1="260" y1="220" x2="348" y2="220" class="ln-green thick ar-green moving"/>
  <line x1="530" y1="220" x2="618" y2="220" class="ln-green thick ar-green moving"/>
  <line x1="164" y1="146" x2="164" y2="184" class="ln dash"/>
  <line x1="716" y1="146" x2="716" y2="184" class="ln dash"/>
  <text x="440" y="280" class="t-sm t-c">1초에 한 번씩 문자열 메시지가 흐름 → 두 터미널 모두 로그가 나오면 설치 성공!</text>
</svg>`
    },

    /* ---------------------------------------------------------------- teleop 키 */
    teleopKeys: {
      caption: 'turtle_teleop_key 조작법 — 방향키로 움직이고, F 를 둘러싼 8개 키로 그 방향을 바라보게 회전(RotateAbsolute 액션)합니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="방향키와 회전 키 배치도">
  <text x="190" y="26" class="t-b t-c">방향키 — 이동 (/turtle1/cmd_vel 토픽)</text>
  <rect x="160" y="50" width="60" height="54" rx="8" class="blue"/><text x="190" y="77" class="t-lg t-c">↑</text>
  <rect x="90" y="112" width="60" height="54" rx="8" class="blue"/><text x="120" y="139" class="t-lg t-c">←</text>
  <rect x="160" y="112" width="60" height="54" rx="8" class="blue"/><text x="190" y="139" class="t-lg t-c">↓</text>
  <rect x="230" y="112" width="60" height="54" rx="8" class="blue"/><text x="260" y="139" class="t-lg t-c">→</text>
  <text x="190" y="192" class="t-sm t-c">↑ 앞으로 2.0 · ↓ 뒤로</text>
  <text x="190" y="214" class="t-sm t-c">← 왼쪽 회전 · → 오른쪽 회전</text>
  <text x="190" y="246" class="t-xs t-c t-mu">키를 한 번 누를 때마다 Twist 메시지 1개 발행</text>
  <text x="190" y="266" class="t-xs t-c t-mu">(짧게 움직이고 멈춤 → 계속 누르고 있기)</text>

  <text x="640" y="26" class="t-b t-c">회전 키 — 절대 방향 (/turtle1/rotate_absolute 액션)</text>
  <rect x="520" y="50" width="70" height="60" rx="8" class="purple"/><text x="555" y="72" class="t-lg t-c">E</text><text x="555" y="96" class="t-xs t-c">↖ 135°</text>
  <rect x="605" y="50" width="70" height="60" rx="8" class="purple"/><text x="640" y="72" class="t-lg t-c">R</text><text x="640" y="96" class="t-xs t-c">↑ 90°</text>
  <rect x="690" y="50" width="70" height="60" rx="8" class="purple"/><text x="725" y="72" class="t-lg t-c">T</text><text x="725" y="96" class="t-xs t-c">↗ 45°</text>
  <rect x="520" y="120" width="70" height="60" rx="8" class="purple"/><text x="555" y="142" class="t-lg t-c">D</text><text x="555" y="166" class="t-xs t-c">← 180°</text>
  <rect x="605" y="120" width="70" height="60" rx="8" class="s-red"/><text x="640" y="142" class="t-lg t-c tw">F</text><text x="640" y="166" class="t-xs t-c tw">취소</text>
  <rect x="690" y="120" width="70" height="60" rx="8" class="purple"/><text x="725" y="142" class="t-lg t-c">G</text><text x="725" y="166" class="t-xs t-c">→ 0°</text>
  <rect x="520" y="190" width="70" height="60" rx="8" class="purple"/><text x="555" y="212" class="t-lg t-c">C</text><text x="555" y="236" class="t-xs t-c">↙ −135°</text>
  <rect x="605" y="190" width="70" height="60" rx="8" class="purple"/><text x="640" y="212" class="t-lg t-c">V</text><text x="640" y="236" class="t-xs t-c">↓ −90°</text>
  <rect x="690" y="190" width="70" height="60" rx="8" class="purple"/><text x="725" y="212" class="t-lg t-c">B</text><text x="725" y="236" class="t-xs t-c">↘ −45°</text>
  <text x="640" y="274" class="t-sm t-c">F 에서 본 키의 방향 = 거북이가 바라볼 방향</text>
  <rect x="30" y="292" width="820" height="30" rx="8" class="yellow"/>
  <text x="440" y="307" class="t-sm t-c">⚠ 키 입력은 <tspan class="t-b">teleop 을 실행한 터미널</tspan>이 받습니다 — 먼저 그 터미널을 클릭하세요 · Q 로 종료</text>
</svg>`
    },

    /* ---------------------------------------------------------------- HTML 도표 */
    optTable: `<table class="tbl cmp">
  <thead><tr><th>방법</th><th>난이도</th><th>성능 · GUI</th><th>장점</th><th>주의할 점</th></tr></thead>
  <tbody>
    <tr><td>🐧 <b>Ubuntu 24.04 직접 설치</b></td><td>★★☆</td><td>최고</td><td>공식 지원 환경, 하드웨어(USB · 카메라 · LiDAR) 연결 쉬움</td><td>PC 를 Ubuntu 전용으로</td></tr>
    <tr><td>🔀 <b>듀얼 부팅</b></td><td>★★★</td><td>최고</td><td>Windows 와 Ubuntu 를 골라서 부팅</td><td>파티션 작업 · 백업 필수</td></tr>
    <tr><td>📦 <b>가상 머신</b> (VirtualBox · VMware · UTM)</td><td>★☆☆</td><td>보통 · 3D 느림</td><td>기존 PC 를 그대로 두고 안전하게</td><td>RAM 8GB 이상 권장, Gazebo 가 느림</td></tr>
    <tr><td>🪟 <b>WSL2</b> (Windows 11)</td><td>★☆☆</td><td>좋음 · WSLg 로 GUI</td><td>명령 몇 줄로 Ubuntu 24.04 사용</td><td>USB 장치 · 네트워크 탐색에 추가 설정</td></tr>
    <tr><td>🐳 <b>Docker</b> (<code>osrf/ros:jazzy-desktop</code>)</td><td>★★☆</td><td>좋음 · GUI 설정 필요</td><td>깨끗한 환경 · 여러 버전 공존 · 재현 쉬움</td><td>컨테이너 개념 학습 필요(20장)</td></tr>
    <tr><td>🍎 <b>macOS</b></td><td>★★★</td><td>—</td><td>VM(UTM) · Docker 로 Ubuntu 를 띄워 사용</td><td>macOS 에 직접 설치는 소스 빌드만 가능(Tier 3)</td></tr>
  </tbody>
</table>`,

    probTable: `<table class="tbl">
  <thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
  <tbody>
    <tr><td><code>ros2: command not found</code></td><td>이 터미널에서 source 를 안 함</td><td><code>source /opt/ros/jazzy/setup.bash</code> · ~/.bashrc 에 추가</td></tr>
    <tr><td><code>E: Unable to locate package ros-jazzy-desktop</code></td><td>ROS 저장소 미등록 · <code>apt update</code> 안 함 · Ubuntu 버전이 24.04 가 아님</td><td><code>lsb_release -a</code> 로 버전 확인 → ros2-apt-source 설치 → <code>sudo apt update</code></td></tr>
    <tr><td><code>NO_PUBKEY</code> / GPG 키 오류</td><td>예전 방식(수동 키 · ros2.list)으로 추가한 저장소의 키 만료</td><td>예전 <code>/etc/apt/sources.list.d/ros2.list</code> 를 지우고 ros2-apt-source 로 다시 등록</td></tr>
    <tr><td><code>ros-dev-tools</code> 설치 중 의존성 충돌</td><td>apt 소스에 <code>noble-updates</code> · <code>noble-backports</code> 가 빠짐</td><td><code>/etc/apt/sources.list.d/ubuntu.sources</code> 의 <code>Suites:</code> 줄 확인 후 <code>sudo apt full-upgrade</code></td></tr>
    <tr><td><code>Package 'turtlesim' not found</code></td><td><code>ros-base</code> 만 설치함 (GUI 도구 없음)</td><td><code>sudo apt install ros-jazzy-turtlesim</code> 또는 desktop 설치</td></tr>
    <tr><td>talker 는 되는데 listener 가 아무것도 못 받음</td><td>두 터미널의 <code>ROS_DOMAIN_ID</code> 가 다름 · 방화벽 · 탐색 범위 설정</td><td><code>printenv | grep ROS</code> 로 두 터미널 값 비교, 같게 맞추기</td></tr>
    <tr><td>turtlesim 창이 안 뜸 (WSL2 · Docker)</td><td>GUI 표시(WSLg · X11) 설정 부족</td><td>WSL: <code>wsl --update</code> (Windows 11 권장) · Docker: DISPLAY · X11 소켓 연결</td></tr>
    <tr><td>teleop 키를 눌러도 거북이가 안 움직임</td><td>키보드 입력이 다른 창으로 감</td><td><b>teleop 을 실행한 터미널</b>을 클릭해서 초점을 준 뒤 키 입력</td></tr>
    <tr><td>locale 관련 경고 · 파이썬 인코딩 오류</td><td>UTF-8 로캘이 아님 (최소 설치 · 컨테이너)</td><td>로캘 설정 단계(<code>locale-gen en_US.UTF-8</code>) 다시 실행</td></tr>
  </tbody>
</table>`
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '설치 방법 고르기 — 내 컴퓨터에 맞는 길',
      html: `
<p>ROS 2 Jazzy 는 <b>Ubuntu 24.04 LTS (Noble Numbat)</b> 에서 가장 잘 동작합니다(공식 1순위 지원 환경). 하지만 모두가 Ubuntu PC 를 가진 건 아니죠. 지금 쓰는 컴퓨터에 따라 길을 고릅니다.</p>
{{fig:choose}}
{{fig:optTable}}

<div class="box analogy"><div class="box-t">🍳 비유 — 주방을 어디에 차릴까?</div>
<ul>
  <li><b>직접 설치</b> = 우리 집 주방을 통째로 식당 주방으로 개조 (가장 넓고 빠름)</li>
  <li><b>듀얼 부팅</b> = 가정용 주방과 식당 주방을 번갈아 쓰기</li>
  <li><b>VM · WSL2</b> = 거실 한쪽에 조립식 주방 들여놓기 (편하지만 조금 좁음)</li>
  <li><b>Docker</b> = 모든 도구가 담긴 푸드 트럭 빌려 오기 (어디서나 같은 주방)</li>
</ul></div>

<p>설치하기 전에 내 Ubuntu 버전부터 확인하는 습관을 들이세요. 이 사이트의 터미널은 Ubuntu 24.04 를 흉내 냅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>lsb_release -a
uname -a</code></pre>
<pre class="code out" data-lang="출력"><code>Distributor ID:	Ubuntu
Description:	Ubuntu 24.04.1 LTS
Release:	24.04
Codename:	noble</code></pre>
{{widget:term|chips=lsb_release -a;uname -a;echo $ROS_DISTRO|h=200}}

<div class="box note"><div class="box-t">📝 다른 배포판을 쓴다면</div>
<ul>
  <li><b>Humble</b>: Ubuntu 22.04 용. 설치 순서는 같고 <code>jazzy</code> 를 <code>humble</code> 로 바꾸면 됩니다.</li>
  <li><b>Kilted</b>: Jazzy 와 같은 Ubuntu 24.04 용(비 LTS, 2026-12 지원 종료).</li>
  <li><b>Lyrical Luth</b>: 2026-05 출시된 새 LTS 로, Ubuntu 26.04 용입니다.</li>
</ul></div>`
    },

    /* ================================================================ 2 */
    {
      title: 'Ubuntu 24.04 에 ROS 2 Jazzy 설치하기 (apt)',
      html: `
<p>아래 순서는 ROS 2 공식 문서(docs.ros.org 의 <b>Ubuntu (deb packages)</b> 설치 안내)를 그대로 따른 것입니다. 명령은 <b>한 줄씩 복사해서</b> 진짜 Ubuntu 터미널(<kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>T</kbd>)에 붙여 넣으세요. 이 단계는 인터넷에서 파일을 받으므로 브라우저 터미널에서는 실행하지 않습니다(복사 버튼만 있음).</p>
{{fig:steps}}

<h4>① 로캘(locale) 설정 — UTF-8 확인</h4>
<p>로캘은 언어 · 문자 인코딩 설정입니다. 대부분의 데스크톱 Ubuntu 는 이미 UTF-8 이라 확인만 하면 됩니다.</p>
<pre class="code" data-lang="bash"><code>locale  <span class="cm"># UTF-8 인지 확인</span>

sudo apt update &amp;&amp; sudo apt install locales
sudo locale-gen en_US en_US.UTF-8
sudo update-locale LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export LANG=en_US.UTF-8

locale  <span class="cm"># 다시 확인</span></code></pre>

<h4>② 저장소(repository) 추가 — universe + ros2-apt-source</h4>
<p>apt 는 "등록된 저장소"에서만 패키지를 찾습니다. 먼저 Ubuntu 의 universe 저장소를 켜고, ROS 2 저장소의 주소와 서명 키를 한 번에 설정해 주는 <b><code>ros2-apt-source</code></b> 패키지를 설치합니다. 이 패키지는 저장소 설정이 바뀌면 자동으로 갱신되는 것이 장점입니다.</p>
<pre class="code" data-lang="bash"><code>sudo apt install software-properties-common
sudo add-apt-repository universe

sudo apt update &amp;&amp; sudo apt install curl -y
export ROS_APT_SOURCE_VERSION=$(curl -s https://api.github.com/repos/ros-infrastructure/ros-apt-source/releases/latest | grep -F "tag_name" | awk -F'"' '{print $4}')
curl -L -o /tmp/ros2-apt-source.deb "https://github.com/ros-infrastructure/ros-apt-source/releases/download/\${ROS_APT_SOURCE_VERSION}/ros2-apt-source_\${ROS_APT_SOURCE_VERSION}.$(. /etc/os-release &amp;&amp; echo \${UBUNTU_CODENAME:-\${VERSION_CODENAME}})_all.deb"
sudo dpkg -i /tmp/ros2-apt-source.deb</code></pre>
<div class="box tip"><div class="box-t">💡 긴 명령 해석</div>
두 번째 줄은 GitHub 에서 ros-apt-source 의 <b>최신 버전 번호</b>를 알아내 변수에 담고, 세 번째 줄은 내 Ubuntu 코드네임(<code>noble</code>)에 맞는 <code>.deb</code> 파일을 내려받습니다. 마지막 <code>dpkg -i</code> 가 설치합니다. 예전 자료에 나오는 "키를 직접 받아 <code>ros2.list</code> 를 만드는" 방법 대신 지금은 이 방법을 씁니다.</div>

<h4>③ ROS 2 패키지 설치</h4>
<pre class="code" data-lang="bash"><code>sudo apt update
sudo apt upgrade
sudo apt install ros-jazzy-desktop</code></pre>
<p><code>sudo apt upgrade</code> 는 꼭 하세요. ROS 2 패키지는 최신 Ubuntu 기준으로 빌드되기 때문에, 시스템이 오래되면 설치 중 충돌이 날 수 있습니다.</p>
<table class="tbl cmp">
  <thead><tr><th>패키지</th><th>들어 있는 것</th><th>언제 쓰나</th></tr></thead>
  <tbody>
    <tr><td><code>ros-jazzy-desktop</code> <span class="tag green">추천</span></td><td>ROS 2 핵심 + <b>RViz2 · rqt · turtlesim · 데모 · 튜토리얼</b></td><td>공부 · 개발 PC</td></tr>
    <tr><td><code>ros-jazzy-ros-base</code></td><td>통신 라이브러리 · 메시지 · 명령줄 도구 (GUI 없음)</td><td>로봇에 올리는 컴퓨터(라즈베리 파이 등) · 서버 · Docker</td></tr>
  </tbody>
</table>

<h4>④ 개발 도구 설치 (패키지를 만들 거라면)</h4>
<p><code>ros-dev-tools</code> 에는 빌드 도구 <b>colcon</b>, 의존성 설치 도구 <b>rosdep</b> 등이 들어 있습니다. 7장부터 꼭 필요하니 지금 같이 설치하세요.</p>
<pre class="code" data-lang="bash"><code>sudo apt update &amp;&amp; sudo apt install ros-dev-tools</code></pre>
<div class="box warn"><div class="box-t">⚠ ros-dev-tools 설치가 의존성 오류로 실패한다면</div>
Ubuntu 24.04 의 apt 소스에 기본 <code>noble</code> 만 있고 <code>noble-updates</code> · <code>noble-backports</code> 가 빠져 있으면 충돌이 납니다. 다음으로 확인하세요.
<pre class="code" data-lang="bash"><code>grep Suites /etc/apt/sources.list.d/ubuntu.sources</code></pre>
출력이 <code>Suites: noble noble-updates noble-backports</code> 가 아니면 그 줄을 고친 뒤 <code>sudo apt clean &amp;&amp; sudo apt update &amp;&amp; sudo apt full-upgrade -y</code> 를 실행합니다.</div>

<p>브라우저 터미널에서도 <code>sudo apt install</code> 을 쳐 볼 수는 있습니다. 실습 환경에는 필요한 패키지가 이미 들어 있어서 "already the newest version" 이 나옵니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>sudo apt install ros-jazzy-desktop
ros2 pkg list</code></pre>`
    },

    /* ================================================================ 3 */
    {
      title: 'Windows 와 macOS 에서는? — WSL2 · Docker',
      html: `
<h4>🪟 WSL2 (Windows Subsystem for Linux)</h4>
<p>WSL2 는 Windows 안에서 진짜 리눅스 커널을 돌리는 기능입니다. Windows 11 에서는 <b>WSLg</b> 덕분에 turtlesim · RViz2 같은 GUI 창도 그대로 뜹니다. <b>PowerShell 을 관리자 권한으로</b> 열고 다음을 입력한 뒤 재부팅하세요.</p>
<pre class="code" data-lang="powershell"><code>wsl --install -d Ubuntu-24.04</code></pre>
<p>재부팅 후 시작 메뉴의 <b>Ubuntu 24.04</b> 를 열고 사용자 이름 · 비밀번호를 정하면, 그 안에서 앞 절의 apt 설치를 똑같이 진행합니다. GUI 창이 안 뜨면 PowerShell 에서 <code>wsl --update</code> 로 WSL 을 최신으로 올려 보세요.</p>

<h4>🐳 Docker</h4>
<p>Docker 는 프로그램과 필요한 파일을 통째로 담은 <b>컨테이너</b>를 실행하는 도구입니다. OSRF(ROS 를 관리하는 재단)가 ROS 2 가 설치된 이미지를 공개해 두었어요. Docker 를 설치했다면 한 줄로 ROS 2 Jazzy 환경에 들어갈 수 있습니다.</p>
<pre class="code" data-lang="bash"><code>docker run -it --rm osrf/ros:jazzy-desktop</code></pre>
<p>리눅스 PC 에서 컨테이너 안의 GUI 창(turtlesim 등)을 화면에 띄우려면 X11 화면 정보를 넘겨 줘야 합니다.</p>
<pre class="code" data-lang="bash"><code>xhost +local:docker
docker run -it --rm -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix osrf/ros:jazzy-desktop</code></pre>
<div class="cards c3">
  <div class="card blue"><div class="ci">📦</div><b>ros:jazzy</b><p>공식 Docker 이미지(ros-base 수준). GUI 없이 가볍게.</p></div>
  <div class="card green"><div class="ci">🖥️</div><b>osrf/ros:jazzy-desktop</b><p>desktop 패키지 포함. RViz2 · rqt · turtlesim.</p></div>
  <div class="card orange"><div class="ci">🧱</div><b>osrf/ros:jazzy-desktop-full</b><p>Gazebo 시뮬레이터 등까지 포함한 가장 큰 이미지.</p></div>
</div>

<h4>🍎 macOS</h4>
<p>ROS 2 Jazzy 에서 macOS 는 소스 빌드만 가능한 등급(Tier 3)이라 입문자에게는 권하지 않습니다. Apple Silicon Mac 이라면 <b>UTM</b> 같은 가상 머신에 Ubuntu 24.04 ARM64 를 설치하세요(Jazzy 는 arm64 용 apt 패키지를 제공합니다). 또는 Docker Desktop 에서 위 이미지를 씁니다.</p>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
실제 로봇 회사에서는 개발 PC 는 Ubuntu 를 직접 설치하고, 로봇에 올리는 소프트웨어는 Docker 이미지로 배포하는 경우가 많습니다. Docker 는 20장에서 자세히 다룹니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '환경 설정 — source, ~/.bashrc, ROS_DOMAIN_ID',
      html: `
<p>설치가 끝났다고 바로 <code>ros2</code> 명령이 되는 것은 아닙니다. ROS 2 는 <code>/opt/ros/jazzy</code> 폴더에 설치되는데, 터미널은 그 위치를 모르거든요. <b><code>source</code></b> 명령으로 "ROS 2 는 여기 있어"라고 알려 줘야 합니다.</p>
{{fig:sourceFig}}
<pre class="code" data-lang="bash" data-run="sh"><code>source /opt/ros/jazzy/setup.bash
echo $ROS_DISTRO
printenv | grep -i ROS</code></pre>
<pre class="code out" data-lang="출력"><code>jazzy
ROS_DISTRO=jazzy
ROS_VERSION=2
ROS_PYTHON_VERSION=3
ROS_DOMAIN_ID=0
RMW_IMPLEMENTATION=rmw_fastrtps_cpp
ROS_AUTOMATIC_DISCOVERY_RANGE=SUBNET</code></pre>

<p>그런데 source 는 <b>그 터미널에만</b> 적용됩니다. 새 터미널을 열 때마다 치기 귀찮으니, 터미널이 열릴 때 자동으로 실행되는 설정 파일 <code>~/.bashrc</code> 끝에 한 줄 추가해 둡니다(진짜 Ubuntu 에서 한 번만).</p>
<pre class="code" data-lang="bash"><code>echo "source /opt/ros/jazzy/setup.bash" &gt;&gt; ~/.bashrc
source ~/.bashrc</code></pre>

<h4>ROS_DOMAIN_ID — 같은 네트워크의 "방 번호"</h4>
<p>ROS 2 노드는 같은 네트워크(같은 와이파이 등)에 있는 다른 컴퓨터의 노드도 <b>자동으로</b> 찾습니다. 편리하지만, 교실에서 30명이 동시에 turtlesim 을 켜면 서로의 거북이를 조종하게 될 수도 있어요! 이때 <b><code>ROS_DOMAIN_ID</code></b> 를 사람마다 다르게 정하면, <b>같은 번호끼리만</b> 대화합니다.</p>
<div class="two">
<div><div class="box analogy"><div class="box-t">🍳 비유 — 무전기 채널</div>
같은 채널(도메인 ID)에 맞춘 무전기끼리만 대화가 들립니다. 기본값은 0번 채널이에요.</div></div>
<div><div class="box tip"><div class="box-t">💡 쓰는 법</div>
<code>export ROS_DOMAIN_ID=7</code> 처럼 0~101 사이 숫자를 권장합니다. 계속 쓰려면 이것도 ~/.bashrc 에 적어 두세요. 내 컴퓨터 안에서만 통신하려면 <code>export ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST</code>.</div></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>export ROS_DOMAIN_ID=7
echo $ROS_DOMAIN_ID
printenv | grep ROS_DOMAIN_ID</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 환경 변수 살펴보기</div>
<ol>
  <li>위 두 코드 블록을 차례로 실행해 <code>ROS_DISTRO</code>, <code>RMW_IMPLEMENTATION</code> 값을 확인하세요.</li>
  <li><code>export ROS_DOMAIN_ID=7</code> 로 바꾼 뒤 <code>printenv | grep ROS_DOMAIN_ID</code> 로 확인합니다.</li>
  <li>칩의 <code>ros2 doctor</code> 로 ROS 설치 상태 보고서를 읽어 보세요. <b>distribution name</b> 이 jazzy 인가요?</li>
</ol></div>
{{widget:term|chips=source /opt/ros/jazzy/setup.bash;printenv;export ROS_DOMAIN_ID=7;echo $ROS_DOMAIN_ID;ros2 doctor|h=260}}
<div class="box note"><div class="box-t">📝 브라우저 실습 환경의 도메인</div>
이 사이트는 한 페이지 안의 ROS 그래프 하나만 흉내 내므로 도메인 번호를 바꿔도 통신이 나뉘지는 않습니다. 도메인 · DDS 탐색 실험은 11장의 domain 위젯에서 해 봅니다.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '설치 확인 — talker 와 listener',
      html: `
<p>설치가 잘 되었는지 확인하는 공식 방법은 <b>데모 노드 두 개</b>를 실행해 보는 것입니다. 진짜 Ubuntu 에서는 <b>터미널 두 개</b>를 열고 각각 실행합니다.</p>
{{fig:talkListen}}
<div class="two">
<div><p><b>터미널 1</b> — C++ 로 만든 talker</p>
<pre class="code" data-lang="bash"><code>source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_cpp talker</code></pre></div>
<div><p><b>터미널 2</b> — 파이썬으로 만든 listener</p>
<pre class="code" data-lang="bash"><code>source /opt/ros/jazzy/setup.bash
ros2 run demo_nodes_py listener</code></pre></div>
</div>
<p>talker 가 <code>Publishing: 'Hello World: 1'</code>, listener 가 <code>I heard: [Hello World: 1]</code> 을 찍으면 <b>C++ 과 파이썬 API 가 모두 정상</b>이라는 뜻입니다. 멈출 때는 각 터미널에서 <kbd>Ctrl</kbd>+<kbd>C</kbd>.</p>

<p>브라우저 터미널은 창 하나이므로, 명령 뒤에 <code>&amp;</code> 를 붙여 <b>백그라운드로</b> 실행하면 한 터미널에서 두 노드를 함께 돌릴 수 있습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_cpp talker &amp;
ros2 run demo_nodes_py listener &amp;
ros2 node list
ros2 topic list</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 첫 번째 대화</div>
<ol>
  <li>아래 실습 터미널에 <code>ros2 run demo_nodes_cpp talker &amp;</code> 를 입력하세요. 1초마다 Publishing 로그가 나옵니다.</li>
  <li>이어서 <code>ros2 run demo_nodes_py listener &amp;</code> — 이제 I heard 로그가 섞여 나옵니다.</li>
  <li>오른쪽 rqt_graph 에서 <code>/talker</code> → <code>/chatter</code> → <code>/listener</code> 연결을 확인하세요.</li>
  <li><code>ros2 node list</code> 로 두 노드 이름을 확인합니다. (백그라운드 작업을 멈추려면 페이지를 새로 고치거나 다른 장으로 이동)</li>
</ol></div>
{{widget:lab|with=graph|title=설치 확인 — talker/listener 와 rqt_graph}}
<div class="box tip"><div class="box-t">💡 C++ 과 파이썬이 대화한다?</div>
노드를 어떤 언어로 만들었든, 같은 <b>메시지 형식</b>(<code>std_msgs/msg/String</code>)과 같은 <b>토픽 이름</b>(<code>/chatter</code>)만 쓰면 대화할 수 있습니다. 이것이 ROS 2 가 여러 팀 · 여러 언어의 부품을 섞어 쓸 수 있는 비결입니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'turtlesim — 거북이로 배우는 첫 로봇',
      html: `
<p><b>turtlesim</b> 은 ROS 입문용 2D 거북이 시뮬레이터입니다. 단순해 보여도 진짜 로봇처럼 <b>속도 명령 토픽(<code>cmd_vel</code>)을 받아 움직이고, 자기 위치(<code>pose</code>)를 발행</b>합니다. 여기서 익힌 방법이 실제 모바일 로봇에서도 그대로 쓰여요.</p>
<pre class="code" data-lang="bash"><code>sudo apt update
sudo apt install ros-jazzy-turtlesim  <span class="cm"># desktop 을 설치했다면 이미 들어 있음</span>
ros2 pkg executables turtlesim</code></pre>
<pre class="code out" data-lang="출력"><code>turtlesim draw_square
turtlesim mimic
turtlesim turtle_teleop_key
turtlesim turtlesim_node</code></pre>

<p>이제 거북이를 띄우고, 키보드로 조종하는 노드 <b><code>turtle_teleop_key</code></b> 를 실행합니다. 진짜 Ubuntu 에서는 터미널 두 개에 하나씩 실행하고, 여기서는 첫 명령에 <code>&amp;</code> 를 붙입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtlesim turtlesim_node &amp;
ros2 run turtlesim turtle_teleop_key</code></pre>
{{fig:teleopKeys}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 거북이 조종하기</div>
<ol>
  <li>위 코드 블록의 <b>▶ 터미널에서 실행</b>을 누르세요. turtlesim 창이 뜨고, 아래 거북이 화면에도 거북이가 나타납니다.</li>
  <li><b>터미널을 한 번 클릭</b>한 뒤 방향키 <kbd>↑</kbd> <kbd>←</kbd> <kbd>→</kbd> 로 거북이를 움직여 보세요. 지나간 자리에 선이 그려집니다.</li>
  <li><kbd>R</kbd> (위쪽 90°), <kbd>G</kbd> (오른쪽 0°), <kbd>V</kbd> (아래쪽) 를 눌러 거북이가 그 방향을 바라보게 해 보세요. 회전 중에 <kbd>F</kbd> 를 누르면 취소됩니다.</li>
  <li><kbd>Ctrl</kbd>+<kbd>C</kbd> 로 teleop 을 멈춘 뒤 <code>ros2 node list</code> 를 쳐서 <code>/turtlesim</code> 과 <code>/teleop_turtle</code> 을 확인해 보세요(teleop 을 멈췄다면 /turtlesim 만 남아요).</li>
</ol></div>
{{widget:turtlesim|start=0}}
{{widget:term|chips=ros2 run turtlesim turtlesim_node &;ros2 run turtlesim turtle_teleop_key;ros2 node list;ros2 topic list -t|h=260}}

<div class="box note"><div class="box-t">📝 무슨 일이 일어난 걸까?</div>
<code>turtle_teleop_key</code> 노드는 방향키를 누를 때마다 <code>/turtle1/cmd_vel</code> 토픽으로 속도 메시지(<code>geometry_msgs/msg/Twist</code>)를 보내고, <code>turtlesim_node</code> 가 그 메시지를 받아 거북이를 움직입니다. 회전 키(G · B · V · C · D · E · R · T)는 토픽이 아니라 <b>액션</b>(<code>/turtle1/rotate_absolute</code>)을 씁니다. 2장과 5장에서 하나씩 풀어 봅니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: 'rqt — ROS 2 의 GUI 도구 상자',
      html: `
<p><b>rqt</b> 는 여러 GUI 플러그인을 담은 도구 상자입니다. 명령줄 대신 창에서 노드 연결 그래프를 보거나, 서비스를 부르거나, 로그를 볼 수 있어요. desktop 설치에 포함되어 있고, 없으면 <code>sudo apt install '~nros-jazzy-rqt*'</code> 로 한꺼번에 설치합니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🕸️</div><b>rqt_graph</b><p>노드와 토픽의 연결 그래프. 2장에서 가장 많이 씁니다.</p></div>
  <div class="card orange"><div class="ci">📞</div><b>Service Caller</b><p>서비스를 골라 값을 넣고 호출 (예: 거북이 소환 <code>/spawn</code>). 4장.</p></div>
  <div class="card green"><div class="ci">📈</div><b>rqt_plot · Console</b><p>숫자 토픽 그래프, <code>/rosout</code> 로그 보기. 14장.</p></div>
</div>
<pre class="code" data-lang="bash" data-run="sh"><code>rqt_graph</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>rqt</code></pre>
<p>rqt 창의 <b>Plugins</b> 메뉴에서 원하는 도구를 고르면 됩니다. 위 명령을 실행하면 이 사이트에서도 비슷한 창이 뜹니다. 아래는 같은 페이지의 ROS 그래프를 실시간으로 보여 주는 rqt_graph 위젯입니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 그래프로 보기</div>
<ol>
  <li>앞 절에서 turtlesim 과 teleop 을 켜 두었다면, 아래 그래프에 <code>/teleop_turtle</code> → <code>/turtle1/cmd_vel</code> → <code>/turtlesim</code> 이 보입니다.</li>
  <li>거북이 화면의 방향 버튼을 누르면 메시지가 흐르는 선이 반짝이는지 보세요.</li>
  <li>그래프의 노드나 토픽을 클릭해 정보를 확인해 보세요.</li>
</ol></div>
{{widget:graph}}`
    },

    /* ================================================================ 8 */
    {
      title: '자주 만나는 설치 문제와 해결',
      html: `
<p>설치 문제의 대부분은 몇 가지 패턴으로 정리됩니다. 오류 메시지를 <b>그대로 읽고</b> 아래 표에서 찾아보세요.</p>
{{fig:probTable}}
<div class="box tip"><div class="box-t">💡 문제가 생겼을 때 먼저 칠 세 줄</div>
<pre class="code" data-lang="bash" data-run="sh"><code>echo $ROS_DISTRO
printenv | grep -i ROS
ros2 doctor</code></pre>
<ol>
  <li><code>echo $ROS_DISTRO</code> 가 비어 있으면 → source 문제</li>
  <li><code>printenv | grep -i ROS</code> 로 도메인 ID · RMW 가 다른 터미널과 같은지</li>
  <li><code>ros2 doctor</code> 로 네트워크 · 플랫폼 · 미들웨어 점검 보고서 확인</li>
</ol></div>
<div class="box warn"><div class="box-t">⚠ 오류를 검색할 때</div>
오류 메시지를 검색하면 ROS 1(<code>roscore</code>, <code>catkin</code>) 답변이 섞여 나옵니다. 검색어에 <b>"ros2 jazzy"</b> 를 꼭 붙이세요. 공식 질문 게시판 <b>Robotics Stack Exchange</b> 와 ROS Discourse 도 좋은 곳입니다.</div>
<div class="box teacher-note"><div class="box-t">👩‍🏫 강사 메모</div>
실습실 PC 에 미리 설치해 두었다면, 학생마다 <code>export ROS_DOMAIN_ID=좌석번호</code> 를 ~/.bashrc 에 넣게 하세요. 안 그러면 옆 사람 거북이가 움직이는 "혼선"이 생깁니다(그 현상을 일부러 보여 주는 것도 좋은 도입이 됩니다).</div>`
    }
  ],

  videos: [
    { title: 'Install ROS2 Jazzy Jalisco on Ubuntu 24.04 | ROS2 Tutorial', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=ZGds6NuZLzo', lang: 'en', desc: 'Ubuntu 24.04 에 Jazzy 를 apt 로 설치하고 데모로 확인하는 과정을 짧게 보여 줍니다.' },
    { title: 'How to Correctly Install ROS2 Jazzy Jalisco in Linux Ubuntu 24.04 (Noble)', channel: 'Aleksandar Haber PhD', url: 'https://www.youtube.com/watch?v=08o46x5SfJM', lang: 'en', desc: '로캘 · 저장소 · 설치 · 환경 설정을 한 단계씩 천천히 따라 합니다.' },
    { title: '[ROS2] 2. ROS2 Jazzy 설치 | R2R 실전', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=zTg7cjDXW6I', lang: 'ko', desc: '한국어로 Jazzy 설치 과정을 설명합니다. 화면을 보며 따라 하기 좋습니다.' },
    { title: 'ROS2 Jazzy 설치 & Hello ROS2 | 애드인에듀 무료강의', channel: '애드인에듀 ADDINEDU', url: 'https://www.youtube.com/watch?v=hqJ1owpmdMc', lang: 'ko', desc: '한국어 강의. 설치 후 첫 실행까지 이어서 보여 줍니다.' },
    { title: 'Install ROS2 on Windows (with WSL2)', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=F3n0SMAFheM', lang: 'en', desc: 'Windows 사용자를 위한 WSL2 설치 방법. 영상의 배포판 이름만 Jazzy 로 바꿔 따라 하세요.' },
    { title: 'How to install ROS and Linux on your current PC | Getting Ready to build Robots with ROS', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=kjFoWj0GC5E', lang: 'en', desc: '듀얼 부팅 · VM · WSL · Docker 등 지금 쓰는 PC 에 리눅스와 ROS 를 올리는 방법들의 장단점을 비교합니다.' },
    { title: 'Easily Learn ROS2 Jazzy Using Turtlesim Simulation', channel: 'Aleksandar Haber PhD', url: 'https://www.youtube.com/watch?v=k3NHSOq64xc', lang: 'en', desc: 'turtlesim 과 teleop, rqt 를 Jazzy 에서 직접 실행하는 입문 실습.' }
  ],

  terms: [
    ['Ubuntu 24.04 (Noble)', 'ROS 2 Jazzy 가 공식 1순위로 지원하는 리눅스 배포판. 코드네임 noble'],
    ['apt', 'Ubuntu 의 패키지 관리자. 등록된 저장소에서 프로그램을 내려받아 설치 · 업데이트'],
    ['저장소 (repository)', 'apt 가 패키지를 찾는 서버 주소. ROS 2 저장소는 ros2-apt-source 패키지로 등록'],
    ['ros2-apt-source', 'ROS 2 apt 저장소 주소와 서명 키를 설정해 주고, 바뀌면 자동 갱신되는 패키지'],
    ['ros-jazzy-desktop', 'ROS 2 핵심 + RViz2 · rqt · turtlesim · 데모가 든 권장 설치 묶음'],
    ['ros-jazzy-ros-base', 'GUI 없이 통신 라이브러리 · 메시지 · 명령줄 도구만 든 최소 설치 묶음'],
    ['ros-dev-tools', 'colcon · rosdep 등 패키지를 만들고 빌드할 때 필요한 개발 도구 묶음'],
    ['source', '설정 파일을 현재 터미널에서 실행해 환경 변수를 적용하는 명령. 그 터미널에만 효과'],
    ['~/.bashrc', '새 터미널이 열릴 때마다 자동으로 실행되는 bash 설정 파일'],
    ['환경 변수', '프로그램이 읽는 이름=값 설정. 예: ROS_DISTRO=jazzy, ROS_DOMAIN_ID=0'],
    ['ROS_DOMAIN_ID', '같은 번호끼리만 통신하게 나누는 도메인 번호. 기본 0, 0~101 권장'],
    ['WSL2', 'Windows 안에서 리눅스를 실행하는 기능. Windows 11 은 WSLg 로 GUI 창도 지원'],
    ['Docker 이미지', '프로그램과 필요한 파일을 통째로 담은 실행 꾸러미. 예: osrf/ros:jazzy-desktop'],
    ['turtlesim · turtle_teleop_key', '입문용 2D 거북이 시뮬레이터와, 키보드로 거북이를 조종하는 노드'],
    ['rqt', '여러 GUI 플러그인(rqt_graph · Service Caller · Plot 등)을 담은 ROS 도구 상자']
  ],

  summary: [
    'ROS 2 Jazzy 의 기본 환경은 <b>Ubuntu 24.04</b>. Windows 는 <b>WSL2</b>, 어디서나 <b>Docker(osrf/ros:jazzy-desktop)</b> 로도 쓸 수 있다',
    '설치 순서: <b>로캘(UTF-8) → universe + ros2-apt-source → apt update · upgrade → ros-jazzy-desktop → ros-dev-tools</b>',
    '<b>desktop</b> 은 GUI 도구 · 데모 포함(공부용), <b>ros-base</b> 는 최소 구성(로봇 · 서버용)',
    '<code>source /opt/ros/jazzy/setup.bash</code> 는 <b>그 터미널에만</b> 적용되므로 <code>~/.bashrc</code> 에 추가해 둔다',
    '<code>ROS_DOMAIN_ID</code> 가 같은 노드끼리만 통신한다 — 교실에서는 사람마다 다르게',
    '설치 확인: <b>talker/listener</b> 데모 → turtlesim + <b>turtle_teleop_key</b>(방향키 이동, G·B·V·C·D·E·R·T 회전, 터미널 클릭 필수)'
  ],

  quiz: [
    { q: '새 터미널을 열고 <code>ros2 topic list</code> 를 입력했더니 <code>ros2: command not found</code> 가 나왔다. 가장 먼저 할 일은?', options: ['ROS 2 를 지우고 다시 설치한다', '<code>source /opt/ros/jazzy/setup.bash</code> 를 실행한다', '컴퓨터를 재부팅한다', '<code>ROS_DOMAIN_ID</code> 를 바꾼다'], answer: 1, explain: 'source 는 현재 터미널에만 적용되므로 새 터미널에서는 다시 해야 합니다. 매번 치기 싫으면 ~/.bashrc 에 그 줄을 추가해 두세요.' },
    { q: '라즈베리 파이처럼 화면 없이 로봇에 올릴 컴퓨터에 가장 알맞은 설치 묶음은?', options: ['ros-jazzy-desktop', 'ros-jazzy-ros-base', 'ros-jazzy-turtlesim', 'ros-dev-tools 만'], answer: 1, explain: 'ros-base 는 통신 라이브러리 · 메시지 · 명령줄 도구만 있고 RViz2 · rqt 같은 GUI 가 없어 가볍습니다. 공부용 PC 에는 desktop 을 권장합니다.' },
    { q: 'Ubuntu 22.04 에서 <code>sudo apt install ros-jazzy-desktop</code> 를 했더니 패키지를 찾을 수 없다고 한다. 가장 큰 원인은?', options: ['인터넷이 느려서', 'Jazzy 의 apt 패키지는 Ubuntu 24.04 용이라서', 'sudo 를 안 붙여서', 'ROS_DOMAIN_ID 가 0 이라서'], answer: 1, explain: '배포판과 Ubuntu 버전은 짝이 정해져 있습니다. Ubuntu 22.04 에는 Humble 을, Jazzy 를 쓰려면 Ubuntu 24.04 를 쓰세요.' },
    { q: 'turtle_teleop_key 를 실행했는데 방향키를 눌러도 거북이가 움직이지 않는다. 가장 흔한 원인은?', options: ['거북이 배터리가 다 됨', 'teleop 을 실행한 터미널이 아닌 다른 창에 키 입력이 가고 있음', 'turtlesim 은 방향키를 지원하지 않음', 'ROS 1 을 설치해서'], answer: 1, explain: 'turtle_teleop_key 는 자기가 실행 중인 터미널의 키 입력만 읽습니다. turtlesim 창이 아니라 teleop 터미널을 클릭해서 초점을 준 뒤 키를 누르세요.' },
    { q: 'turtle_teleop_key 에서 <kbd>R</kbd> 키를 누르면 일어나는 일은?', options: ['거북이가 리셋된다', '거북이가 위쪽(90°)을 바라보도록 회전한다', '거북이가 빨간색으로 바뀐다', '프로그램이 종료된다'], answer: 1, explain: 'F 를 가운데에 두고 둘러싼 8개 키가 방향을 뜻합니다. R 은 F 의 위쪽이라 90°(위)를 바라보게 하는 RotateAbsolute 액션 목표를 보냅니다. 종료는 Q 입니다.' },
    { q: '교실에서 30명이 같은 와이파이로 turtlesim 을 실습한다. 서로의 거북이를 조종하는 혼선을 막는 가장 간단한 방법은?', options: ['모두 같은 ROS_DOMAIN_ID 를 쓴다', '사람마다 다른 ROS_DOMAIN_ID 를 export 한다', 'turtlesim 대신 Gazebo 를 쓴다', 'source 를 하지 않는다'], answer: 1, explain: 'ROS 2 노드는 같은 도메인 ID 끼리만 서로를 찾습니다. export ROS_DOMAIN_ID=좌석번호 처럼 나누면 혼선이 사라집니다.' }
  ],

  slides: [
    {
      title: '어디에 설치할까?',
      html: `{{fig:choose|nocap}}`,
      notes: '손을 들게 해 Windows / macOS / Ubuntu 사용자 수를 확인합니다. 가장 좋은 건 Ubuntu 24.04 직접 설치, Windows 11 이면 WSL2 가 가장 간편하다는 점을 강조하세요. 설치가 어려운 학생도 이 사이트의 브라우저 실습으로 수업을 따라올 수 있다고 안심시킵니다. (5분)'
    },
    {
      title: '설치 방법 비교',
      html: `{{fig:optTable|nocap}}`,
      notes: '각 방법의 장단점을 한 줄씩 짚습니다. 특히 VM 은 Gazebo 같은 3D 가 느리고, WSL2 는 USB 장치 연결에 추가 설정이 필요하다는 “나중에 겪을 함정”을 미리 알려 주세요. (4분)'
    },
    {
      title: 'apt 설치 다섯 단계',
      html: `{{fig:steps|nocap}}`,
      notes: '① 로캘 ② 저장소 ③ 설치 ④ 개발 도구 ⑤ 환경 설정. 가장 많이 틀리는 곳은 ②(저장소 추가를 빼먹음)와 ⑤(source 안 함)라는 점을 강조합니다. 실제 명령은 본문을 보며 함께 따라 칩니다. (5분)'
    },
    {
      title: 'desktop vs ros-base',
      html: `<div class="vs"><div class="vs-a green"><b>ros-jazzy-desktop</b><ul><li>ROS 2 핵심</li><li>RViz2 · rqt</li><li>turtlesim · 데모</li><li>👉 공부 · 개발 PC</li></ul></div><div class="vs-mid">VS</div><div class="vs-b blue"><b>ros-jazzy-ros-base</b><ul><li>통신 · 메시지</li><li>명령줄 도구</li><li>GUI 없음</li><li>👉 로봇 · 서버 · Docker</li></ul></div></div>
<p class="s-small step">+ <code>ros-dev-tools</code> (colcon · rosdep) — 패키지를 만든다면 필수</p>`,
      notes: '“로봇 위의 라즈베리 파이에 RViz 가 필요할까요?” 하고 물어 ros-base 의 쓰임을 끌어냅니다. ros-dev-tools 는 7장 colcon 빌드부터 필요하니 지금 설치해 두라고 안내합니다. (3분)'
    },
    {
      title: 'Windows · macOS 라면',
      html: `<div class="cards c3">
  <div class="card teal step"><div class="ci">🪟</div><b>WSL2</b><p><code>wsl --install -d Ubuntu-24.04</code></p></div>
  <div class="card blue step"><div class="ci">🐳</div><b>Docker</b><p><code>osrf/ros:jazzy-desktop</code></p></div>
  <div class="card purple step"><div class="ci">🍎</div><b>macOS</b><p>UTM 등 VM 에 Ubuntu 24.04</p></div>
</div>`,
      notes: 'Windows 11 은 WSLg 로 GUI 창도 뜬다는 점, Docker 는 GUI 에 X11 설정이 필요하다는 점을 짚습니다. macOS 직접 설치는 소스 빌드만 가능해서 입문자에게 권하지 않는다고 설명하세요. (4분)'
    },
    {
      title: 'source — 터미널에 길 알려 주기',
      html: `{{fig:sourceFig|nocap}}`,
      notes: '가장 중요한 슬라이드. “source 는 그 터미널에만 적용된다”를 두세 번 반복합니다. 실제로 새 터미널을 열어 ros2 가 안 되는 모습을 보여 주고 ~/.bashrc 에 추가하는 과정을 시연하면 효과적입니다. (5분)'
    },
    {
      title: 'ROS_DOMAIN_ID = 무전기 채널',
      layout: 'center',
      html: `<div class="s-big">같은 <b>ROS_DOMAIN_ID</b> 끼리만<br>서로를 찾고 대화합니다</div>
<p class="s-small step"><code>export ROS_DOMAIN_ID=7</code> · 기본값 0 · 0~101 권장</p>`,
      notes: '무전기 채널 비유로 설명합니다. 교실 실습에서는 좌석 번호를 도메인 ID 로 쓰게 하세요. 일부러 모두 0 으로 두고 한 학생의 거북이를 다른 학생이 움직이는 “혼선”을 보여 주는 것도 기억에 남습니다. (3분)'
    },
    {
      title: '설치 확인 — talker/listener',
      html: `{{fig:talkListen|nocap}}`,
      notes: 'C++ talker 와 Python listener 가 대화한다는 점이 포인트. 언어가 달라도 메시지 형식과 토픽 이름만 같으면 된다는 ROS 의 핵심 아이디어를 여기서 처음 짚습니다. 두 터미널을 나란히 띄워 시연하세요. (4분)'
    },
    {
      title: '직접 해 보기 — talker/listener',
      html: `{{widget:lab|with=graph|title=talker · listener · rqt_graph}}`,
      notes: 'ros2 run demo_nodes_cpp talker & → ros2 run demo_nodes_py listener & 를 차례로 입력하고, 오른쪽 그래프에 연결이 생기는 순간을 보여 줍니다. & 는 백그라운드 실행이라는 것을 짧게 설명하세요. (5분)'
    },
    {
      title: 'turtle_teleop_key 조작법',
      html: `{{fig:teleopKeys|nocap}}`,
      notes: '방향키는 토픽(cmd_vel)으로 속도를, 회전 키는 액션(rotate_absolute)으로 목표 방향을 보낸다는 차이를 가볍게 언급합니다. F 를 중심으로 한 키 배치가 곧 방향이라는 점을 손가락으로 짚어 주세요. “키가 안 먹으면 터미널을 클릭!”을 강조합니다. (4분)'
    },
    {
      title: 'rqt — GUI 도구 상자',
      html: `<div class="cards c3">
  <div class="card blue step"><div class="ci">🕸️</div><b>rqt_graph</b><p>노드 · 토픽 연결</p></div>
  <div class="card orange step"><div class="ci">📞</div><b>Service Caller</b><p>서비스 호출</p></div>
  <div class="card green step"><div class="ci">📈</div><b>Plot · Console</b><p>그래프 · 로그</p></div>
</div>`,
      notes: 'rqt 는 플러그인 모음이라는 점, 명령줄 도구와 같은 일을 창으로 한다는 점을 설명합니다. 다음 장에서 rqt_graph 를 가장 많이 쓴다고 예고하세요. (3분)'
    },
    {
      title: '문제가 생기면 이 세 줄',
      layout: 'center',
      html: `<div class="s-big"><code>echo $ROS_DISTRO</code><br><code>printenv | grep -i ROS</code><br><code>ros2 doctor</code></div>`,
      notes: '본문의 문제 해결표를 함께 훑어본 뒤, 가장 먼저 칠 세 줄을 외우게 합니다. 오류를 검색할 때 “ros2 jazzy”를 붙이라는 요령도 전달하세요. 다음 시간(2장)은 노드와 토픽을 본격적으로 배운다고 예고합니다. (4분)'
    }
  ]
});
