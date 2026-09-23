/* 20장 — micro-ROS · 웹 · Docker · 배포 */
Course.lesson({
  id: 'ch20', no: '20',
  icon: '🔌',
  title: 'micro-ROS · 웹 · Docker · 배포',
  subtitle: '작은 보드에서 웹 브라우저까지, 그리고 전원을 켜면 스스로 일어나는 로봇까지',
  level: '심화', time: '150분',
  goals: [
    'micro-ROS 가 왜 필요한지, XRCE-DDS 클라이언트와 micro-ROS agent 가 어떻게 연결되는지 그림으로 설명할 수 있다',
    '가상 ESP32 보드를 agent 로 ROS 2 그래프에 붙이고, 토픽을 echo · pub 하고 파이썬 노드로 제어할 수 있다',
    'rosbridge(WebSocket · JSON)와 roslibjs 로 웹 페이지를 ROS 2 에 연결하는 구조를 설명할 수 있다',
    'Docker(osrf/ros:jazzy-desktop)로 ROS 2 를 실행하고, 여러 컴퓨터 · 보안(SROS2) 설정의 핵심 환경 변수를 말할 수 있다',
    'systemd 서비스로 로봇이 부팅할 때 launch 파일이 자동 실행되도록 배포할 수 있다'
  ],
  teacher: {
    intro: '책상 위에 ESP32 보드(또는 사진)를 보여 주며 “이 칩의 메모리는 약 0.5 MB 입니다. 우리 노트북의 ROS 2 는 수백 MB 를 씁니다. 이 작은 친구를 어떻게 ROS 2 대화에 끼워 줄까요?” 하고 묻습니다. 이어서 “웹 브라우저도, Docker 컨테이너도, 다른 방의 컴퓨터도 같은 질문”이라며 오늘의 주제 ‘ROS 2 의 경계를 넓히기’를 소개합니다. (3분)',
    flow: '① micro-ROS 개념 15분 → ② 가상 ESP32 + agent 실습 20분 → ③ 파이썬으로 보드 제어 10분 → ④ 실제 보드 · rclc 코드 10분 → ⑤ rosbridge · roslibjs · 브리지 위젯 20분 → ⑥ Docker 20분 → ⑦ 여러 컴퓨터 · 도메인 15분 → ⑧ SROS2 보안 15분 → ⑨ systemd 배포 · 퀴즈 15분'
  },

  figs: {
    /* ---------------------------------------------------------------- micro-ROS 구조 */
    microArch: {
      caption: 'micro-ROS — MCU 에는 가벼운 XRCE-DDS 클라이언트만, 무거운 DDS 는 PC 의 agent 가 대신 맡습니다',
      svg: `<svg class="dg" viewBox="0 0 900 400" role="img" aria-label="ESP32 안의 rclc, micro-ROS 클라이언트가 시리얼이나 UDP 로 PC 의 agent 에 연결되고 agent 가 DDS 로 ROS 2 노드와 통신">
  <rect x="20" y="20" width="300" height="360" rx="16" class="orange"/>
  <text x="170" y="46" class="t-b t-c t-orange">MCU (ESP32 · STM32 · RP2040)</text>
  <text x="170" y="68" class="t-xs t-c t-mu">RAM 수백 KB · OS 없음 또는 FreeRTOS</text>
  <rect x="45" y="84" width="250" height="44" rx="8" class="box"/><text x="170" y="106" class="t-sm t-c">내 펌웨어 (센서 · LED · 모터)</text>
  <rect x="45" y="136" width="250" height="44" rx="8" class="box"/><text x="170" y="158" class="t-sm t-c t-mono">rclc  (C 용 편의 API)</text>
  <rect x="45" y="188" width="250" height="44" rx="8" class="box"/><text x="170" y="210" class="t-sm t-c t-mono">rcl + rmw_microxrcedds</text>
  <rect x="45" y="240" width="250" height="44" rx="8" class="s-orange"/><text x="170" y="262" class="t-sm t-c tw">Micro XRCE-DDS Client</text>
  <rect x="45" y="292" width="250" height="44" rx="8" class="box"/><text x="170" y="314" class="t-sm t-c">전송: 시리얼 · UDP · USB</text>
  <text x="170" y="358" class="t-xs t-c t-mu">노드 · 토픽 개수는 빌드할 때 정함 (정적 메모리)</text>

  <line x1="320" y1="314" x2="560" y2="314" class="ln-orange thick ar2"/>
  <line x1="320" y1="314" x2="560" y2="314" class="ln-orange moving"/>
  <text x="440" y="296" class="t-sm t-c t-orange t-b">XRCE-DDS 프로토콜</text>
  <text x="440" y="336" class="t-xs t-c">/dev/ttyUSB0 115200 · 또는 Wi-Fi UDP 8888</text>

  <rect x="560" y="20" width="320" height="360" rx="16" class="blue"/>
  <text x="720" y="46" class="t-b t-c t-blue">PC · 라즈베리파이 (ROS 2 Jazzy)</text>
  <rect x="590" y="270" width="260" height="84" rx="10" class="s-blue"/>
  <text x="720" y="298" class="t-sm t-c tw t-b">micro-ROS Agent</text>
  <text x="720" y="322" class="t-xs t-c tw">MCU 대신 DDS 참가자를 만들어</text>
  <text x="720" y="340" class="t-xs t-c tw">토픽을 중계 (프록시)</text>
  <line x1="720" y1="268" x2="720" y2="226" class="ln-blue ar2"/>
  <text x="740" y="248" class="t-xs t-blue">DDS</text>
  <ellipse cx="640" cy="120" rx="60" ry="28" class="blue"/><text x="640" y="120" class="t-xs t-c">/esp32_node</text>
  <rect x="712" y="72" width="150" height="30" rx="6" class="green"/><text x="787" y="87" class="t-xs t-c t-mono">/esp32/pot</text>
  <rect x="712" y="138" width="150" height="30" rx="6" class="green"/><text x="787" y="153" class="t-xs t-c t-mono">/esp32/led</text>
  <line x1="698" y1="110" x2="712" y2="92" class="ln ar"/>
  <line x1="712" y1="150" x2="698" y2="132" class="ln ar"/>
  <ellipse cx="720" cy="206" rx="80" ry="22" class="blue"/><text x="720" y="206" class="t-xs t-c">다른 ROS 2 노드들</text>
  <text x="640" y="160" class="t-xs t-c t-mu">(agent 가 대신 보여 줌)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 웹 연결 */
    webArch: {
      caption: 'rosbridge — 브라우저는 DDS 를 모르지만 WebSocket 은 압니다. rosbridge_server 가 JSON ⇄ ROS 메시지를 통역합니다',
      svg: `<svg class="dg" viewBox="0 0 900 340" role="img" aria-label="브라우저의 roslibjs 가 WebSocket JSON 으로 rosbridge 서버에 연결되고 rosbridge 가 ROS 2 토픽과 서비스를 중계">
  <rect x="20" y="30" width="260" height="280" rx="16" class="purple"/>
  <text x="150" y="56" class="t-b t-c t-purple">🌐 웹 브라우저</text>
  <rect x="45" y="76" width="210" height="60" rx="8" class="box"/><text x="150" y="98" class="t-sm t-c">대시보드 HTML</text><text x="150" y="118" class="t-xs t-c t-mu">버튼 · 게이지 · 지도</text>
  <rect x="45" y="146" width="210" height="44" rx="8" class="s-purple"/><text x="150" y="168" class="t-sm t-c tw t-mono">roslibjs</text>
  <rect x="45" y="200" width="210" height="94" rx="8" class="box"/>
  <text x="60" y="220" class="t-xs t-mono">{"op": "subscribe",</text>
  <text x="60" y="240" class="t-xs t-mono"> "topic": "/esp32/pot",</text>
  <text x="60" y="260" class="t-xs t-mono"> "type": "std_msgs/msg/Int32"}</text>
  <text x="60" y="280" class="t-xs t-mu">↑ 실제로 오가는 JSON</text>

  <line x1="280" y1="168" x2="380" y2="168" class="ln-purple thick ar2"/>
  <text x="330" y="150" class="t-xs t-c t-purple t-b">WebSocket</text>
  <text x="330" y="190" class="t-xs t-c t-mono">ws://로봇IP:9090</text>

  <ellipse cx="490" cy="168" rx="110" ry="46" class="blue"/>
  <text x="490" y="160" class="t-sm t-c t-b">/rosbridge_websocket</text>
  <text x="490" y="182" class="t-xs t-c t-mu">JSON ⇄ ROS 메시지</text>
  <ellipse cx="490" cy="270" rx="70" ry="26" class="blue"/><text x="490" y="270" class="t-xs t-c">/rosapi</text>
  <line x1="490" y1="214" x2="490" y2="244" class="ln dash"/>
  <text x="490" y="306" class="t-xs t-c t-mu">토픽 · 노드 목록 조회 서비스</text>

  <line x1="600" y1="150" x2="650" y2="100" class="ln ar2"/>
  <line x1="600" y1="186" x2="650" y2="236" class="ln ar2"/>
  <rect x="650" y="80" width="170" height="36" rx="6" class="green"/><text x="735" y="98" class="t-xs t-c t-mono">/esp32/pot · /odom</text>
  <rect x="650" y="220" width="170" height="36" rx="6" class="green"/><text x="735" y="238" class="t-xs t-c t-mono">/cmd_vel · /esp32/led</text>
  <ellipse cx="735" cy="168" rx="90" ry="24" class="blue"/><text x="735" y="168" class="t-xs t-c">로봇의 ROS 2 노드들</text>
  <text x="735" y="60" class="t-xs t-c t-mu">구독 → 브라우저로</text>
  <text x="735" y="280" class="t-xs t-c t-mu">브라우저 → 발행</text>
</svg>`
    },

    /* ---------------------------------------------------------------- Docker */
    dockerFig: {
      caption: 'Docker — 호스트 OS 가 무엇이든 컨테이너 안은 Ubuntu 24.04 + Jazzy. --net=host 로 호스트와 같은 네트워크에서 DDS 탐색',
      svg: `<svg class="dg" viewBox="0 0 900 350" role="img" aria-label="호스트 위에 ROS 2 컨테이너 여러 개가 볼륨과 호스트 네트워크를 공유하는 그림">
  <rect x="20" y="290" width="860" height="46" rx="10" class="gray"/>
  <text x="450" y="313" class="t-sm t-c">호스트: Ubuntu 22.04 · Windows(WSL2) · 로봇의 Jetson … (Docker Engine)</text>
  <rect x="20" y="236" width="860" height="44" rx="10" class="teal"/>
  <text x="450" y="258" class="t-sm t-c t-teal t-b">--net=host (같은 IP · DDS 멀티캐스트 탐색)   ·   --ipc=host (공유 메모리 전송)</text>
  <rect x="40" y="30" width="250" height="194" rx="14" class="blue"/>
  <text x="165" y="54" class="t-b t-c t-blue">🐳 컨테이너 ①</text>
  <text x="165" y="78" class="t-xs t-c t-mono">osrf/ros:jazzy-desktop</text>
  <ellipse cx="165" cy="120" rx="80" ry="24" class="box"/><text x="165" y="120" class="t-xs t-c">rviz2 · 내 노드</text>
  <text x="165" y="162" class="t-xs t-c">-e DISPLAY -v /tmp/.X11-unix</text>
  <text x="165" y="184" class="t-xs t-c t-mu">GUI 창을 호스트 화면에</text>
  <rect x="325" y="30" width="250" height="194" rx="14" class="orange"/>
  <text x="450" y="54" class="t-b t-c t-orange">🐳 컨테이너 ②</text>
  <text x="450" y="78" class="t-xs t-c t-mono">microros/micro-ros-agent:jazzy</text>
  <ellipse cx="450" cy="120" rx="90" ry="24" class="box"/><text x="450" y="120" class="t-xs t-c">micro_ros_agent udp4</text>
  <text x="450" y="162" class="t-xs t-c">설치 없이 바로 실행</text>
  <text x="450" y="184" class="t-xs t-c t-mu">--rm: 끄면 컨테이너 삭제</text>
  <rect x="610" y="30" width="250" height="194" rx="14" class="purple"/>
  <text x="735" y="54" class="t-b t-c t-purple">📁 볼륨 (-v)</text>
  <text x="735" y="86" class="t-xs t-c t-mono">~/ros2_ws  →  /root/ros2_ws</text>
  <text x="735" y="116" class="t-xs t-c">소스 코드는 호스트에 두고</text>
  <text x="735" y="138" class="t-xs t-c">빌드 · 실행만 컨테이너에서</text>
  <text x="735" y="170" class="t-xs t-c t-mu">컨테이너를 지워도</text>
  <text x="735" y="190" class="t-xs t-c t-mu">코드는 남음</text>
  <line x1="165" y1="224" x2="165" y2="236" class="ln"/><line x1="450" y1="224" x2="450" y2="236" class="ln"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 여러 컴퓨터 */
    netFig: {
      caption: '여러 컴퓨터 — 같은 ROS_DOMAIN_ID 면 자동 탐색(멀티캐스트). 멀티캐스트가 막힌 망에서는 Discovery Server 나 Zenoh 라우터를 가운데 둡니다',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="로봇 PC, 노트북, 라즈베리파이가 같은 도메인으로 통신하고 디스커버리 서버를 통해 연결되는 그림">
  <text x="225" y="26" class="t-b t-c">① 기본: 멀티캐스트 자동 탐색</text>
  <rect x="30" y="50" width="160" height="80" rx="12" class="blue"/><text x="110" y="78" class="t-sm t-c">🤖 로봇 PC</text><text x="110" y="104" class="t-xs t-c t-mono">DOMAIN_ID=7</text>
  <rect x="260" y="50" width="160" height="80" rx="12" class="blue"/><text x="340" y="78" class="t-sm t-c">💻 노트북</text><text x="340" y="104" class="t-xs t-c t-mono">DOMAIN_ID=7</text>
  <rect x="145" y="180" width="160" height="80" rx="12" class="red"/><text x="225" y="208" class="t-sm t-c">💻 옆 팀</text><text x="225" y="234" class="t-xs t-c t-mono">DOMAIN_ID=3</text>
  <line x1="190" y1="90" x2="260" y2="90" class="ln-green thick ar2"/>
  <text x="225" y="150" class="t-xs t-c t-green">같은 ID → 서로 보임</text>
  <text x="225" y="286" class="t-xs t-c t-red">다른 ID → 같은 Wi-Fi 여도 안 보임</text>
  <text x="225" y="316" class="t-xs t-c t-mu">UDP 포트 = 7400 + 250 × ID 부근</text>

  <line x1="450" y1="30" x2="450" y2="340" class="ln dash"/>

  <text x="675" y="26" class="t-b t-c">② 큰 망 · 멀티캐스트 차단 시</text>
  <rect x="595" y="140" width="160" height="70" rx="12" class="s-purple"/>
  <text x="675" y="165" class="t-sm t-c tw t-b">Discovery Server</text>
  <text x="675" y="189" class="t-xs t-c tw">또는 Zenoh 라우터</text>
  <rect x="490" y="46" width="130" height="56" rx="10" class="blue"/><text x="555" y="74" class="t-xs t-c">로봇 1</text>
  <rect x="730" y="46" width="130" height="56" rx="10" class="blue"/><text x="795" y="74" class="t-xs t-c">로봇 2</text>
  <rect x="490" y="256" width="130" height="56" rx="10" class="blue"/><text x="555" y="284" class="t-xs t-c">관제 PC</text>
  <rect x="730" y="256" width="130" height="56" rx="10" class="blue"/><text x="795" y="284" class="t-xs t-c">클라우드</text>
  <line x1="555" y1="102" x2="630" y2="140" class="ln-purple ar2"/>
  <line x1="795" y1="102" x2="720" y2="140" class="ln-purple ar2"/>
  <line x1="555" y1="256" x2="630" y2="210" class="ln-purple ar2"/>
  <line x1="795" y1="256" x2="720" y2="210" class="ln-purple ar2"/>
  <text x="675" y="236" class="t-xs t-c t-mu">탐색만 중앙에서</text>
</svg>`
    },

    /* ---------------------------------------------------------------- SROS2 */
    srosFig: {
      caption: 'SROS2 — 키스토어가 인증서를 발급하고, 노드는 자기 enclave 의 인증서로 신원을 증명 · 암호화 · 권한 검사를 받습니다',
      svg: `<svg class="dg" viewBox="0 0 900 330" role="img" aria-label="키스토어에서 talker 와 listener enclave 가 만들어지고 인증된 노드끼리만 암호화 통신">
  <rect x="30" y="40" width="250" height="250" rx="14" class="purple"/>
  <text x="155" y="66" class="t-b t-c t-purple">🔐 keystore</text>
  <text x="155" y="92" class="t-xs t-c t-mono">ros2 security create_keystore</text>
  <rect x="50" y="110" width="210" height="40" rx="8" class="box"/><text x="155" y="130" class="t-xs t-c">인증 기관(CA) 인증서</text>
  <rect x="50" y="160" width="210" height="52" rx="8" class="box"/><text x="155" y="178" class="t-xs t-c t-mono">enclaves/talker_listener/</text><text x="155" y="198" class="t-xs t-c t-mono">talker/ · listener/</text>
  <text x="155" y="236" class="t-xs t-c">cert.pem · key.pem</text>
  <text x="155" y="258" class="t-xs t-c">governance.p7s · permissions.p7s</text>
  <line x1="280" y1="140" x2="360" y2="100" class="ln-purple dash ar-purple"/>
  <line x1="280" y1="200" x2="360" y2="240" class="ln-purple dash ar-purple"/>
  <ellipse cx="450" cy="100" rx="90" ry="32" class="blue"/><text x="450" y="94" class="t-sm t-c">/talker</text><text x="450" y="114" class="t-xs t-c t-mu">--enclave …/talker</text>
  <ellipse cx="450" cy="240" rx="90" ry="32" class="blue"/><text x="450" y="234" class="t-sm t-c">/listener</text><text x="450" y="254" class="t-xs t-c t-mu">--enclave …/listener</text>
  <rect x="400" y="152" width="100" height="36" rx="6" class="green"/><text x="450" y="170" class="t-xs t-c t-mono">🔒 /chatter</text>
  <line x1="450" y1="132" x2="450" y2="152" class="ln ar"/><line x1="450" y1="188" x2="450" y2="208" class="ln ar"/>
  <ellipse cx="740" cy="170" rx="100" ry="36" class="red"/><text x="740" y="164" class="t-sm t-c">🕵️ 인증서 없는 노드</text><text x="740" y="184" class="t-xs t-c t-mu">Enforce → 참가 거부</text>
  <line x1="640" y1="170" x2="505" y2="170" class="ln-red dash"/>
  <text x="575" y="156" class="t-sm t-c t-red">✗</text>
  <text x="740" y="240" class="t-xs t-c">ROS_SECURITY_ENABLE=true</text>
  <text x="740" y="260" class="t-xs t-c">ROS_SECURITY_STRATEGY=Enforce</text>
  <text x="740" y="280" class="t-xs t-c">ROS_SECURITY_KEYSTORE=경로</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 배포 흐름 */
    deployFlow: `<div class="flow">
  <div class="fb gray"><span class="fi">🔌</span><b>전원 ON</b>부팅</div>
  <div class="fb blue"><span class="fi">⚙️</span><b>systemd</b>robot.service 시작</div>
  <div class="fb teal"><span class="fi">📜</span><b>source</b>/opt/ros/jazzy + install</div>
  <div class="fb orange"><span class="fi">🚀</span><b>ros2 launch</b>bringup 전체 실행</div>
  <div class="fb red"><span class="fi">♻️</span><b>Restart=on-failure</b>죽으면 다시</div>
  <div class="fb green"><span class="fi">📓</span><b>journalctl</b>로그 확인</div>
</div>`
  },

  sections: [
    /* ============================================================ 1 */
    {
      title: '왜 micro-ROS 인가? — 작은 보드를 ROS 2 에 끼우기',
      html: `
<p>로봇에는 PC 만 있는 것이 아닙니다. 모터 드라이버, 배터리 감시, 초음파 센서, LED 처럼 <b>마이크로컨트롤러(MCU)</b>가 맡는 일이 많습니다. MCU 는 싸고 전기를 적게 쓰며 실시간으로 빠르게 반응하지만, 메모리가 수백 KB 뿐이라 리눅스도, 수백 MB 짜리 ROS 2 도 올릴 수 없습니다.</p>
<div class="stats">
  <div class="stat orange"><b>520 KB</b><span>ESP32 의 SRAM</span></div>
  <div class="stat teal"><b>264 KB</b><span>RP2040(라즈베리파이 피코) SRAM</span></div>
  <div class="stat blue"><b>수 GB</b><span>ROS 2 를 돌리는 PC 의 RAM</span></div>
</div>
<p><b>micro-ROS</b> 는 이 간극을 메웁니다. MCU 에는 아주 작은 <b>XRCE-DDS 클라이언트</b>(eXtremely Resource Constrained Environments 용 DDS)만 두고, 무거운 DDS 통신은 PC 쪽의 <b>micro-ROS agent</b> 가 대신 해 줍니다. 그래서 PC 의 <code>ros2 node list</code> 에는 MCU 의 노드가 보통 노드처럼 나타납니다.</p>
{{fig:microArch}}
<div class="box analogy"><div class="box-t">🍳 비유 — 통역사를 둔 회의</div>ROS 2 회의(DDS)는 모두가 같은 언어로 크게 말하는 자리입니다. 목소리가 작은 MCU 는 옆에 앉은 <b>통역사(agent)</b>에게 쪽지(XRCE 메시지)를 건네고, 통역사가 회의에서 대신 발언합니다. 통역사가 자리를 비우면(agent 꺼짐) MCU 의 말은 회의에 전혀 들리지 않습니다.</div>
<table class="tbl">
<tr><th>전송(transport)</th><th>연결</th><th>agent 실행 인자</th></tr>
<tr><td>시리얼(UART) · USB CDC</td><td>USB 케이블 한 줄. 가장 간단 · 안정적</td><td><code>serial --dev /dev/ttyUSB0 -b 115200</code></td></tr>
<tr><td>UDP (Wi-Fi · 이더넷)</td><td>무선. 보드가 agent 의 IP · 포트로 접속</td><td><code>udp4 --port 8888</code></td></tr>
<tr><td>기타</td><td>TCP, CAN-FD, 사용자 정의 전송</td><td><code>tcp4</code> · <code>canfd</code> …</td></tr>
</table>
<div class="cards c3">
  <div class="card orange"><div class="ci">📶</div><b>ESP32</b><p>Wi-Fi 내장. Arduino IDE · PlatformIO · ESP-IDF 모두 지원. 입문용으로 가장 많이 씀.</p></div>
  <div class="card blue"><div class="ci">🧠</div><b>STM32</b><p>산업용 모터 제어기에 흔함. STM32CubeIDE + FreeRTOS 로 micro-ROS 를 넣음.</p></div>
  <div class="card green"><div class="ci">🍓</div><b>RP2040 · Teensy</b><p>라즈베리파이 피코(C SDK), Teensy(Arduino) 등. USB 시리얼 전송이 간편.</p></div>
</div>`
    },

    /* ============================================================ 2 */
    {
      title: '실습 — 가상 ESP32 를 agent 로 연결하기',
      html: `
<p>아래 위젯은 가상 ESP32 보드입니다. 가변저항(pot), 버튼, 온도 센서, LED 가 달려 있고, 펌웨어는 <code>/esp32_node</code> 노드를 만들어 <code>/esp32/pot</code>(Int32) · <code>/esp32/button</code>(Bool) · <code>/esp32/temperature</code>(Float32) 을 발행하고 <code>/esp32/led</code>(Bool) · <code>/esp32/led_brightness</code>(Int32) 를 구독합니다. 단, <b>agent 가 없으면 아무것도 보이지 않습니다.</b></p>
<div class="box practice"><div class="box-t">🧪 해 보기 — agent → 전원 → 토픽</div>
<ol class="steps-list">
<li><b>agent 켜기</b> — 첫 코드 블록의 ▶ 로 터미널에서 agent 를 실행합니다. 실제 PC 에서는 터미널 하나를 agent 전용으로 쓰지만, 여기서는 뒤에 <code>&amp;</code> 를 붙여 <b>백그라운드</b>로 돌립니다(다음 명령을 같은 터미널에서 쓰려고).</li>
<li><b>보드 전원</b> — 위젯의 전원 버튼을 누르고 시리얼 로그를 봅니다. Wi-Fi 연결 → agent ping → 세션 생성 → <code>/esp32_node</code> 생성 순서입니다.</li>
<li><b>확인</b> — <code>ros2 node list</code> 에 <code>/esp32_node</code> 가 나타나는지, <code>ros2 topic echo /esp32/pot</code> 값이 가변저항을 돌리면 바뀌는지 봅니다.</li>
<li><b>명령</b> — <code>ros2 topic pub</code> 으로 LED 를 켜 봅니다. 그다음 agent 를 멈추면(<kbd>Ctrl</kbd>+<kbd>C</kbd> 또는 <code>kill</code> 대신 터미널의 ■ 버튼) 노드가 사라지는 것도 확인해 보세요.</li>
</ol></div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run micro_ros_agent micro_ros_agent udp4 --port 8888 &amp;</code></pre>
{{widget:microros}}
{{widget:lab|with=graph|title=실습 — 터미널 + rqt_graph (esp32_node 가 나타나는지 보세요)|h=340}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic list -t
ros2 node info /esp32_node</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /esp32/pot</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /esp32/pot</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /esp32/led std_msgs/msg/Bool "{data: true}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub --once /esp32/led_brightness std_msgs/msg/Int32 "{data: 40}"</code></pre>
<pre class="code out" data-lang="출력"><code>[1727000000.123456] info     | UDPv4AgentLinux.cpp | init                     | running...             | port: 8888
[1727000000.123789] info     | Root.cpp           | set_verbose_level        | logger setup           | verbose_level: 4
[1727000003.456123] info     | Root.cpp           | create_client            | create                 | client_key: 0x5A3C9E01, session_id: 0x81
[1727000003.456456] info     | SessionManager.hpp | establish_session        | session established    | client_key: 0x5A3C9E01, address: 192.168.0.42:47138</code></pre>
<div class="box warn"><div class="box-t">⚠️ 연결이 안 될 때 확인 순서</div>
<ol>
<li>전송 방식 · 포트가 같은가? (보드는 UDP 8888 인데 agent 는 serial 로 켰다면 연결 불가 — 위젯의 “USB 시리얼” 버튼으로 바꿔 실험해 보세요)</li>
<li>보드 펌웨어에 적은 agent IP 가 PC 의 실제 IP 인가? 방화벽이 UDP 8888 을 막지 않는가?</li>
<li>시리얼이면 포트 이름(<code>/dev/ttyUSB0</code> · <code>/dev/ttyACM0</code>)과 권한(<code>dialout</code> 그룹)을 확인</li>
<li>ROS_DOMAIN_ID — 보드의 기본 도메인은 0 입니다. PC 를 다른 ID 로 쓰면 펌웨어에서도 맞춰야 합니다.</li>
</ol></div>`
    },

    /* ============================================================ 3 */
    {
      title: 'PC 쪽 파이썬 노드로 보드 다루기',
      html: `
<p>보드 입장에서는 PC 의 노드가 누구인지 알 필요가 없습니다. 그냥 토픽입니다. 가변저항 값을 읽어 LED 를 켜고 끄는 “디머” 노드를 파이썬으로 실행해 봅시다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol class="steps-list">
<li>2절에서 agent 와 보드 전원이 켜져 있는지 확인합니다.</li>
<li>아래 실습기에서 ▶ 실행 → 위젯의 가변저항을 2048 보다 크게/작게 돌리면 LED 가 켜지고 꺼집니다.</li>
<li>기준값 2048 을 1000 으로 바꿔 다시 실행해 보세요.</li>
</ol></div>
{{widget:pylab|ex=esp32|with=graph}}
<p>다음 노드는 <b>온도가 높을수록 LED 를 밝게</b> 만듭니다. 보드의 온도 토픽은 센서답게 <b>BEST_EFFORT</b> 로 발행되므로 구독도 <code>qos_profile_sensor_data</code> 로 해야 합니다. (기본 QoS 로 바꿔 실행하면 경고와 함께 아무것도 안 오는 것을 확인할 수 있습니다.) 위젯의 🔥 가열 버튼으로 온도를 올려 보세요.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from std_msgs.msg import Float32, Int32, Bool


class ThermoLight(Node):
    """온도 35~60 ℃ 를 LED 밝기 0~255 로 바꾸고, 버튼을 누르면 알립니다."""
    def __init__(self):
        super().__init__('thermo_light')
        self.declare_parameter('t_min', 35.0)
        self.declare_parameter('t_max', 60.0)
        self.create_subscription(Float32, '/esp32/temperature', self.on_temp, qos_profile_sensor_data)
        self.create_subscription(Bool, '/esp32/button', self.on_button, 10)
        self.pub = self.create_publisher(Int32, '/esp32/led_brightness', 10)
        self.led = self.create_publisher(Bool, '/esp32/led', 10)

    def on_temp(self, msg):
        lo = self.get_parameter('t_min').value
        hi = self.get_parameter('t_max').value
        ratio = min(1.0, max(0.0, (msg.data - lo) / (hi - lo)))
        self.led.publish(Bool(data=True))
        self.pub.publish(Int32(data=int(ratio * 255)))
        self.get_logger().info(f'{msg.data:.1f} ℃ → 밝기 {int(ratio * 255)}', throttle_duration_sec=1.0)

    def on_button(self, msg):
        if msg.data:
            self.get_logger().warn('버튼이 눌렸습니다!')


def main():
    rclpy.init()
    rclpy.spin(ThermoLight())


if __name__ == '__main__':
    main()</code></pre>`
    },

    /* ============================================================ 4 */
    {
      title: '실제 보드 준비 — 펌웨어와 agent',
      html: `
<p>실제 ESP32 에 micro-ROS 를 넣는 방법은 세 가지가 대표적입니다. 모두 사용하는 ROS 2 배포판(<b>jazzy</b>)에 맞는 버전을 골라야 합니다.</p>
<table class="tbl cmp">
<tr><th>방법</th><th>특징</th><th>배포판 · 전송 선택</th></tr>
<tr><td><a href="https://github.com/micro-ROS/micro_ros_arduino" target="_blank" rel="noopener">micro_ros_arduino</a></td><td>Arduino IDE 라이브러리(미리 빌드됨). 가장 쉬움</td><td>배포판별 릴리스 · <code>set_microros_transports()</code> / <code>set_microros_wifi_transports()</code></td></tr>
<tr><td><a href="https://github.com/micro-ROS/micro_ros_platformio" target="_blank" rel="noopener">micro_ros_platformio</a></td><td>VS Code + PlatformIO. 메시지 · 설정을 직접 빌드</td><td><code>platformio.ini</code> 에 <code>board_microros_distro = jazzy</code>, <code>board_microros_transport = wifi</code></td></tr>
<tr><td>micro_ros_espidf_component</td><td>ESP-IDF(에스프레시프 공식 SDK) 컴포넌트. 세밀한 제어</td><td><code>idf.py menuconfig</code> 에서 설정</td></tr>
</table>
<h3>rclc 로 쓴 펌웨어 (Arduino, 요약)</h3>
<p>MCU 에서는 파이썬 대신 C 로 된 <b>rclc</b> API 를 씁니다. 구조는 rclpy 와 같습니다 — 노드를 만들고, 퍼블리셔 · 타이머를 만들고, executor 를 돌립니다.</p>
<pre class="code" data-lang="c"><code>#include &lt;micro_ros_arduino.h&gt;
#include &lt;rcl/rcl.h&gt;
#include &lt;rclc/rclc.h&gt;
#include &lt;rclc/executor.h&gt;
#include &lt;std_msgs/msg/int32.h&gt;

rcl_publisher_t pub;   std_msgs__msg__Int32 msg;
rclc_support_t support; rcl_allocator_t allocator;
rcl_node_t node;        rcl_timer_t timer;   rclc_executor_t executor;

void timer_cb(rcl_timer_t * t, int64_t last_call_time) {
  if (t != NULL) {
    msg.data = analogRead(34);                 <span class="cm">// 가변저항 0~4095</span>
    rcl_publish(&amp;pub, &amp;msg, NULL);
  }
}

void setup() {
  <span class="cm">// Wi-Fi(UDP) 전송: SSID, 비밀번호, agent IP, 포트</span>
  set_microros_wifi_transports("robot-lab", "password", "192.168.0.10", 8888);
  allocator = rcl_get_default_allocator();
  rclc_support_init(&amp;support, 0, NULL, &amp;allocator);
  rclc_node_init_default(&amp;node, "esp32_node", "", &amp;support);
  rclc_publisher_init_default(&amp;pub, &amp;node,
      ROSIDL_GET_MSG_TYPE_SUPPORT(std_msgs, msg, Int32), "esp32/pot");
  <span class="cm">// Jazzy 의 rclc: 마지막 인자 true = 타이머 자동 시작 (이전 배포판은 rclc_timer_init_default)</span>
  rclc_timer_init_default2(&amp;timer, &amp;support, RCL_MS_TO_NS(100), timer_cb, true);
  rclc_executor_init(&amp;executor, &amp;support.context, 1, &amp;allocator);
  rclc_executor_add_timer(&amp;executor, &amp;timer);
}

void loop() {
  rclc_executor_spin_some(&amp;executor, RCL_MS_TO_NS(10));
}</code></pre>
<h3>agent 실행 — 설치 · 빌드 없이 Docker 로</h3>
<pre class="code" data-lang="bash"><code><span class="cm"># Wi-Fi(UDP) 보드용</span>
docker run -it --rm --net=host microros/micro-ros-agent:jazzy udp4 --port 8888
<span class="cm"># USB 시리얼 보드용 (장치 파일을 컨테이너에 전달)</span>
docker run -it --rm -v /dev:/dev --privileged --net=host microros/micro-ros-agent:jazzy serial --dev /dev/ttyUSB0 -v6</code></pre>
<div class="box note"><div class="box-t">📌 소스로 agent 빌드하기</div>Docker 를 쓰지 않으려면 <code>micro_ros_setup</code> 패키지를 워크스페이스에 받아 <code>ros2 run micro_ros_setup create_agent_ws.sh</code> → <code>ros2 run micro_ros_setup build_agent.sh</code> 로 빌드한 뒤 <code>ros2 run micro_ros_agent micro_ros_agent udp4 --port 8888</code> 로 실행합니다. 자세한 내용은 <a href="https://micro.ros.org/" target="_blank" rel="noopener">micro.ros.org</a> 튜토리얼을 참고하세요.</div>
<div class="box tip"><div class="box-t">💡 재연결은 펌웨어의 몫</div>agent 가 재시작되면 보드는 세션을 잃습니다. 실전 펌웨어는 <code>rmw_uros_ping_agent()</code> 로 주기적으로 agent 를 확인해 <b>끊기면 엔티티를 지우고 다시 만드는</b> 상태 기계(WAITING → AVAILABLE → CONNECTED → DISCONNECTED)를 둡니다. 위젯의 시리얼 로그가 바로 그 흐름을 보여 줍니다.</div>`
    },

    /* ============================================================ 5 */
    {
      title: '웹과 연결 — rosbridge · roslibjs · Foxglove',
      html: `
<p>스마트폰이나 PC 의 웹 브라우저로 로봇을 조종하고 상태를 보고 싶다면? 브라우저는 DDS 를 말할 수 없지만 <b>WebSocket</b> 은 말할 수 있습니다. <code>rosbridge_suite</code> 가 로봇 쪽에서 WebSocket 서버를 열고, <b>JSON 으로 된 요청</b>을 ROS 2 토픽 · 서비스로 바꿔 줍니다.</p>
{{fig:webArch}}
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-rosbridge-suite
ros2 launch rosbridge_server rosbridge_websocket_launch.xml
<span class="cm"># [rosbridge_websocket]: Rosbridge WebSocket server started on port 9090</span></code></pre>
<table class="tbl">
<tr><th>op</th><th>보내는 JSON 예</th><th>하는 일</th></tr>
<tr><td><code>subscribe</code></td><td><code>{"op":"subscribe","topic":"/odom","type":"nav_msgs/msg/Odometry","throttle_rate":200}</code></td><td>토픽 구독 (200 ms 에 한 번만)</td></tr>
<tr><td><code>advertise</code> · <code>publish</code></td><td><code>{"op":"publish","topic":"/cmd_vel","msg":{"linear":{"x":0.2},"angular":{"z":0.0}}}</code></td><td>브라우저가 토픽 발행</td></tr>
<tr><td><code>call_service</code></td><td><code>{"op":"call_service","service":"/rosapi/topics","args":{}}</code></td><td>서비스 호출 (rosapi 로 토픽 목록 조회)</td></tr>
</table>
<h3>roslibjs 로 만든 미니 대시보드</h3>
<pre class="code" data-lang="html"><code>&lt;script src="https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.min.js"&gt;&lt;/script&gt;
&lt;p&gt;가변저항: &lt;b id="pot"&gt;-&lt;/b&gt; &lt;button id="on"&gt;LED 켜기&lt;/button&gt;&lt;/p&gt;
&lt;script&gt;
  const ros = new ROSLIB.Ros({ url: 'ws://192.168.0.10:9090' });
  ros.on('connection', () =&gt; console.log('rosbridge 연결됨'));
  ros.on('error', e =&gt; console.log('연결 오류', e));

  const pot = new ROSLIB.Topic({ ros, name: '/esp32/pot', messageType: 'std_msgs/msg/Int32' });
  pot.subscribe(m =&gt; { document.getElementById('pot').textContent = m.data; });

  const led = new ROSLIB.Topic({ ros, name: '/esp32/led', messageType: 'std_msgs/msg/Bool' });
  document.getElementById('on').onclick = () =&gt; led.publish({ data: true });
&lt;/script&gt;</code></pre>
<p>이 사이트의 <b>브리지 위젯</b>은 바로 이 방식으로, 이 페이지의 가상 ROS 그래프와 <b>여러분 PC 의 진짜 ROS 2</b> 를 잇습니다. 실제 Ubuntu + Jazzy 가 있다면 연결해 보세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 이 페이지 ↔ 내 PC 의 ROS 2</div>
<ol class="steps-list">
<li>ROS 2 PC 에서 <code>ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code> 을 실행합니다.</li>
<li>같은 PC 의 브라우저라면 주소를 <code>ws://localhost:9090</code> 그대로, 다른 PC 라면 로봇 IP 로 바꾸고 <b>연결</b>을 누릅니다.</li>
<li>PC 에서 <code>ros2 run demo_nodes_cpp talker</code> 를 켜고 위젯에서 <code>/chatter</code> 를 가져오기(미러링)로 선택해 이 페이지 터미널에서 echo 해 봅니다.</li>
<li>반대로 이 페이지의 <code>/esp32/pot</code> 을 내보내기로 선택하고 PC 에서 <code>ros2 topic echo /esp32/pot</code> 을 해 봅니다.</li>
</ol></div>
{{widget:bridge|url=ws://localhost:9090}}
<div class="box warn"><div class="box-t">⚠️ https 페이지와 ws:// 주소</div>GitHub Pages 처럼 <code>https://</code> 로 열린 페이지는 보안상 <code>ws://</code>(암호화 안 됨) 연결이 막힐 수 있습니다. <code>localhost</code> 는 대개 허용되지만, 원격 로봇에는 <code>wss://</code>(인증서 · 리버스 프록시) 를 쓰거나 페이지를 http 로 여세요.</div>
<div class="cards c2">
  <div class="card teal"><div class="ci">🦊</div><b>foxglove_bridge</b><p>Foxglove(웹 · 데스크톱 시각화 도구) 전용 C++ 브리지. JSON 대신 이진(CDR) 그대로 보내 영상 · 포인트 클라우드도 빠릅니다.<br><code>sudo apt install ros-jazzy-foxglove-bridge</code><br><code>ros2 launch foxglove_bridge foxglove_bridge_launch.xml</code> (포트 8765)</p></div>
  <div class="card purple"><div class="ci">🧭</div><b>언제 무엇을?</b><p>직접 만든 웹 앱 · 버튼 몇 개 → <b>rosbridge + roslibjs</b>. 개발 중 데이터 살펴보기 · 대용량 센서 → <b>Foxglove</b>. 둘 다 로봇 쪽 포트를 여는 것이니 외부망 노출은 조심!</p></div>
</div>`
    },

    /* ============================================================ 6 */
    {
      title: 'Docker 로 ROS 2 실행하기',
      html: `
<p>“내 컴퓨터에서는 되는데요?” 문제의 해답이 <b>컨테이너</b>입니다. Docker 이미지 안에 Ubuntu 24.04 + Jazzy + 필요한 패키지를 통째로 담아 두면, 호스트가 Ubuntu 22.04 든 Windows(WSL2) 든 로봇의 Jetson 이든 <b>똑같은 환경</b>으로 실행됩니다.</p>
{{fig:dockerFig}}
<table class="tbl">
<tr><th>이미지</th><th>내용</th></tr>
<tr><td><code>ros:jazzy</code> (Docker 공식)</td><td>ros-core / ros-base — CLI · 통신만, GUI 없음 (로봇 · 서버용으로 작음)</td></tr>
<tr><td><code>osrf/ros:jazzy-desktop</code></td><td>RViz2 · rqt · 데모 포함 (개발 PC 용)</td></tr>
<tr><td><code>osrf/ros:jazzy-desktop-full</code></td><td>desktop + 시뮬레이션 · 인식 패키지까지</td></tr>
<tr><td><code>microros/micro-ros-agent:jazzy</code></td><td>micro-ROS agent 만 들어 있음</td></tr>
</table>
<pre class="code" data-lang="bash"><code>docker pull osrf/ros:jazzy-desktop
<span class="cm"># 기본: 호스트 네트워크 공유 (DDS 탐색이 호스트와 같은 망에서 동작)</span>
docker run -it --rm --net=host --ipc=host osrf/ros:jazzy-desktop
<span class="cm"># (컨테이너 안) 이미지의 entrypoint 가 /opt/ros/jazzy/setup.bash 를 이미 source 해 둠</span>
ros2 run demo_nodes_cpp talker

<span class="cm"># GUI(RViz2) 를 호스트 화면에 띄우기 (Linux X11)</span>
xhost +local:docker
docker run -it --rm --net=host --ipc=host \\
  -e DISPLAY=$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix \\
  osrf/ros:jazzy-desktop rviz2

<span class="cm"># 워크스페이스를 볼륨으로 연결해 컨테이너 안에서 빌드</span>
docker run -it --rm --net=host --ipc=host \\
  -v ~/ros2_ws:/root/ros2_ws -w /root/ros2_ws osrf/ros:jazzy-desktop \\
  bash -c "colcon build --symlink-install"</code></pre>
<div class="box warn"><div class="box-t">⚠️ 컨테이너 ↔ 호스트 노드가 서로 안 보이면</div>
<ul>
<li><code>--net=host</code> 를 빠뜨리면 컨테이너는 별도 가상 네트워크에 있어 멀티캐스트 탐색이 안 됩니다.</li>
<li>같은 PC 안에서 Fast DDS 는 <b>공유 메모리</b>로 데이터를 보내므로 <code>--ipc=host</code> 가 없으면 “노드는 보이는데 메시지가 안 오는” 현상이 생깁니다.</li>
<li>컨테이너와 호스트의 <code>ROS_DOMAIN_ID</code> 가 같은지 확인합니다 (<code>-e ROS_DOMAIN_ID=7</code>).</li>
</ul></div>
<h3>docker compose — 여러 컨테이너를 한 번에</h3>
<pre class="code" data-lang="yaml"><code><span class="cm"># Dockerfile — 공식 이미지에 필요한 패키지를 더함</span>
<span class="cm"># FROM osrf/ros:jazzy-desktop</span>
<span class="cm"># RUN apt-get update &amp;&amp; apt-get install -y ros-jazzy-rosbridge-suite &amp;&amp; rm -rf /var/lib/apt/lists/*</span>

<span class="cm"># compose.yaml</span>
services:
  agent:
    image: microros/micro-ros-agent:jazzy
    network_mode: host
    command: udp4 --port 8888
    restart: unless-stopped
  web:
    build: .
    network_mode: host
    ipc: host
    environment:
      - ROS_DOMAIN_ID=7
    command: ros2 launch rosbridge_server rosbridge_websocket_launch.xml
    restart: unless-stopped</code></pre>
<pre class="code" data-lang="bash"><code>docker compose up -d      <span class="cm"># 백그라운드로 모두 시작</span>
docker compose logs -f    <span class="cm"># 로그 보기</span>
docker compose down       <span class="cm"># 모두 정지</span></code></pre>
<h3>VS Code Dev Containers</h3>
<p>VS Code 의 <b>Dev Containers</b> 확장을 쓰면 편집기 자체가 컨테이너 안에서 동작합니다. 프로젝트에 <code>.devcontainer/devcontainer.json</code> 을 두고 “Reopen in Container”를 누르면, 팀원 모두가 같은 ROS 2 환경에서 코드 자동 완성 · 디버깅을 합니다.</p>
<pre class="code" data-lang="json"><code>{
  "name": "ros2-jazzy",
  "image": "osrf/ros:jazzy-desktop",
  "runArgs": ["--net=host", "--ipc=host", "-e", "DISPLAY=\${localEnv:DISPLAY}"],
  "mounts": ["source=/tmp/.X11-unix,target=/tmp/.X11-unix,type=bind"],
  "workspaceMount": "source=\${localWorkspaceFolder},target=/root/ros2_ws,type=bind",
  "workspaceFolder": "/root/ros2_ws",
  "postCreateCommand": "apt-get update &amp;&amp; rosdep update &amp;&amp; rosdep install --from-paths src -y --ignore-src"
}</code></pre>`
    },

    /* ============================================================ 7 */
    {
      title: '여러 컴퓨터로 나누기 — 도메인 · 탐색 · Zenoh',
      html: `
<p>로봇 안의 컴퓨터와 내 노트북, 관제실 PC 가 함께 일하려면 서로를 <b>찾아야</b>(discovery) 합니다. ROS 2 는 기본적으로 같은 네트워크의 같은 <code>ROS_DOMAIN_ID</code> 를 쓰는 참가자를 <b>멀티캐스트</b>로 자동 발견합니다.</p>
{{fig:netFig}}
<table class="tbl">
<tr><th>환경 변수</th><th>뜻</th><th>예</th></tr>
<tr><td><code>ROS_DOMAIN_ID</code></td><td>같은 번호끼리만 통신 (0~101 권장)</td><td><code>export ROS_DOMAIN_ID=7</code></td></tr>
<tr><td><code>ROS_AUTOMATIC_DISCOVERY_RANGE</code></td><td>자동 탐색 범위 (Jazzy): <code>SUBNET</code>(기본) · <code>LOCALHOST</code>(이 PC 만) · <code>OFF</code></td><td>수업 중 옆 사람과 섞이지 않게 <code>LOCALHOST</code></td></tr>
<tr><td><code>ROS_STATIC_PEERS</code></td><td>멀티캐스트 없이 직접 찾아갈 IP 목록</td><td><code>export ROS_STATIC_PEERS=192.168.0.20</code></td></tr>
<tr><td><code>RMW_IMPLEMENTATION</code></td><td>미들웨어 선택</td><td><code>rmw_fastrtps_cpp</code> · <code>rmw_cyclonedds_cpp</code> · <code>rmw_zenoh_cpp</code></td></tr>
</table>
<p>이 페이지의 터미널에서 환경 변수와 멀티캐스트 동작을 확인해 봅시다. (실제 두 PC 라면 한쪽에서 <code>receive</code>, 다른 쪽에서 <code>send</code> 를 실행해 멀티캐스트가 통하는지 봅니다.)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>printenv | grep ROS
export ROS_DOMAIN_ID=7
ros2 doctor --report</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 multicast send</code></pre>
{{widget:domain}}
<div class="two">
<div>
<h3>Fast DDS Discovery Server</h3>
<p>학교 · 회사 Wi-Fi 는 멀티캐스트를 막는 경우가 많습니다. 그러면 한 대에 <b>탐색 서버</b>를 두고 모두 그 서버에만 물어보게 합니다.</p>
<pre class="code" data-lang="bash"><code><span class="cm"># 서버 PC (192.168.0.10)</span>
fastdds discovery -i 0 -l 192.168.0.10 -p 11811
<span class="cm"># 모든 PC</span>
export ROS_DISCOVERY_SERVER=192.168.0.10:11811
ros2 daemon stop</code></pre>
</div>
<div>
<h3>Zenoh (rmw_zenoh)</h3>
<p>DDS 대신 Zenoh 프로토콜을 쓰는 미들웨어입니다. <b>라우터</b>가 탐색을 맡아 Wi-Fi · 인터넷 너머에서도 다루기 쉽습니다. 모든 노드가 같은 RMW 를 써야 합니다.</p>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-rmw-zenoh-cpp
ros2 run rmw_zenoh_cpp rmw_zenohd        <span class="cm"># 라우터</span>
export RMW_IMPLEMENTATION=rmw_zenoh_cpp  <span class="cm"># 모든 터미널</span>
ros2 run demo_nodes_cpp talker</code></pre>
</div>
</div>
<div class="box warn"><div class="box-t">⚠️ 방화벽</div>Ubuntu 에서 <code>ufw</code> 를 켰다면 DDS 가 쓰는 UDP 포트(도메인 7 이면 9150 부근)가 막혀 “같은 ID 인데 안 보이는” 일이 생깁니다. 실험실 망에서는 <code>sudo ufw allow from 192.168.0.0/24 proto udp</code> 처럼 내부망 UDP 를 허용하세요.</div>`
    },

    /* ============================================================ 8 */
    {
      title: '보안 — SROS2 로 인증 · 암호화하기',
      html: `
<p>기본 ROS 2 통신은 <b>암호화되지 않고, 누구나 참가</b>할 수 있습니다. 같은 Wi-Fi 에 들어온 사람이 <code>ros2 topic pub /cmd_vel …</code> 한 줄로 로봇을 움직일 수 있다는 뜻이죠. 연구실에선 편하지만 실제 서비스 로봇에는 위험합니다.</p>
<p><b>SROS2</b> 는 DDS-Security 표준을 이용해 ① <b>인증</b>(인증서가 있는 노드만 참가) ② <b>암호화</b>(도청 방지) ③ <b>접근 제어</b>(어떤 노드가 어떤 토픽에 발행 · 구독할 수 있는지)를 제공합니다.</p>
{{fig:srosFig}}
<pre class="code" data-lang="bash"><code>mkdir -p ~/sros2_demo &amp;&amp; cd ~/sros2_demo
ros2 security create_keystore demo_keystore
ros2 security create_enclave demo_keystore /talker_listener/talker
ros2 security create_enclave demo_keystore /talker_listener/listener

export ROS_SECURITY_KEYSTORE=~/sros2_demo/demo_keystore
export ROS_SECURITY_ENABLE=true
export ROS_SECURITY_STRATEGY=Enforce

<span class="cm"># 터미널 1 · 2 (위 export 세 줄을 각각에서)</span>
ros2 run demo_nodes_cpp talker --ros-args --enclave /talker_listener/talker
ros2 run demo_nodes_py listener --ros-args --enclave /talker_listener/listener</code></pre>
<table class="tbl">
<tr><th>변수</th><th>값</th><th>뜻</th></tr>
<tr><td><code>ROS_SECURITY_ENABLE</code></td><td><code>true</code></td><td>보안 기능 켜기</td></tr>
<tr><td><code>ROS_SECURITY_STRATEGY</code></td><td><code>Enforce</code> / <code>Permissive</code></td><td>Enforce: 인증서 없으면 실행 거부 · Permissive: 없으면 보안 없이 실행</td></tr>
<tr><td><code>ROS_SECURITY_KEYSTORE</code></td><td>키스토어 경로</td><td>enclave 인증서를 찾을 위치</td></tr>
</table>
<div class="box note"><div class="box-t">📌 더 알아보기</div>접근 제어는 정책 XML 로 “/talker 는 /chatter 발행만 가능”처럼 적어 <code>ros2 security create_permission</code> 이나 <code>ros2 security generate_artifacts</code> 로 서명된 <code>permissions.p7s</code> 를 만듭니다. 이 브라우저 터미널에는 <code>ros2 security</code> 명령이 없으므로 실제 PC 에서 <a href="https://docs.ros.org/en/jazzy/Tutorials/Advanced/Security/Introducing-ros2-security.html" target="_blank" rel="noopener">공식 튜토리얼</a>을 따라 해 보세요. 키(<code>key.pem</code>)는 비밀번호와 같으니 Git 에 올리지 마세요!</div>`
    },

    /* ============================================================ 9 */
    {
      title: '배포 — 전원을 켜면 스스로 일어나는 로봇',
      html: `
<p>시연 날 아침마다 SSH 로 접속해 터미널 다섯 개를 여는 로봇은 제품이 될 수 없습니다. 리눅스의 서비스 관리자 <b>systemd</b> 에 launch 를 등록하면 <b>부팅할 때 자동 시작</b>, <b>죽으면 자동 재시작</b>, <b>로그 자동 보관</b>이 됩니다.</p>
{{fig:deployFlow}}
<pre class="code" data-lang="ini"><code><span class="cm"># /etc/systemd/system/robot.service</span>
[Unit]
Description=Patrol robot bringup (ROS 2 Jazzy)
After=network-online.target
Wants=network-online.target

[Service]
User=robot
Environment=ROS_DOMAIN_ID=7
Environment=ROS_LOG_DIR=/home/robot/ros_logs
ExecStart=/bin/bash -c "source /opt/ros/jazzy/setup.bash &amp;&amp; source /home/robot/ros2_ws/install/setup.bash &amp;&amp; exec ros2 launch patrol_bringup robot.launch.py"
Restart=on-failure
RestartSec=5
KillSignal=SIGINT

[Install]
WantedBy=multi-user.target</code></pre>
<pre class="code" data-lang="bash"><code>sudo systemctl daemon-reload
sudo systemctl enable --now robot.service   <span class="cm"># 부팅 시 자동 + 지금 바로 시작</span>
systemctl status robot.service
journalctl -u robot.service -f              <span class="cm"># 실시간 로그</span>
sudo systemctl restart robot.service        <span class="cm"># 새 빌드 후 재시작</span></code></pre>
<table class="tbl">
<tr><th>포인트</th><th>이유</th></tr>
<tr><td><code>bash -c "source … &amp;&amp; exec ros2 launch …"</code></td><td>systemd 는 <code>.bashrc</code> 를 읽지 않으므로 source 를 직접 해야 함. <code>exec</code> 로 launch 가 서비스의 주 프로세스가 됨</td></tr>
<tr><td><code>KillSignal=SIGINT</code></td><td><kbd>Ctrl</kbd>+<kbd>C</kbd> 와 같은 신호로 멈춰야 launch 가 노드들을 깔끔하게 종료</td></tr>
<tr><td><code>After=network-online.target</code></td><td>네트워크가 올라온 뒤 시작해야 DDS 가 올바른 인터페이스를 잡음</td></tr>
<tr><td>launch 의 <code>respawn=True</code></td><td>서비스 전체가 아니라 <b>노드 하나</b>만 죽었을 때 그 노드만 다시 띄움 (10장)</td></tr>
<tr><td>로그 위치</td><td>ROS 로그는 기본 <code>~/.ros/log</code>, <code>ROS_LOG_DIR</code> 로 변경. 디스크가 차지 않게 주기적으로 정리</td></tr>
</table>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 배포 체크리스트</div>
<ul>
<li><b>이미지로 굳히기</b>: 위 서비스가 Docker compose 를 부르게 하면 로봇 여러 대에 같은 환경을 복제하기 쉽습니다 (<code>restart: unless-stopped</code>).</li>
<li><b>robot_upstart</b>(Clearpath) 같은 도구는 launch 파일에서 systemd 서비스를 자동 생성해 줍니다. 지원 배포판은 <a href="https://index.ros.org/p/robot_upstart/" target="_blank" rel="noopener">index.ros.org</a> 에서 확인하세요.</li>
<li><b>원격 확인</b>: 로봇이 켜지면 rosbridge/Foxglove 로 상태를 보고, 문제가 생기면 <code>journalctl</code> 과 <code>ros2 bag</code> 기록을 봅니다.</li>
<li><b>보안</b>: 외부망에 9090 · 8765 포트를 그대로 열지 말고 VPN 이나 SROS2 를 씁니다.</li>
</ul></div>`
    }
  ],

  videos: [
    { title: 'Setup the micro ROS with Esp32 | ROS2 for Beginners and micro-ROS with ESP32 Course', channel: 'By 2050', url: 'https://www.youtube.com/watch?v=qtVFsgTG3AA', lang: 'en', min: '20분', desc: 'ESP32 에 micro-ROS 를 설치하고 agent 와 연결하는 전 과정' },
    { title: 'How to start develop micro-ROS on ESP32 quickly!', channel: 'stepbystep-robotics', url: 'https://www.youtube.com/watch?v=48SxC6LBVs8', lang: 'en', min: '15분', desc: '빠르게 micro-ROS 퍼블리셔를 만들어 보는 짧은 튜토리얼' },
    { title: 'Micro-Ros robot using PlatformIO for esp32 for ROS2', channel: 'Muhammad Luqman (Robotisim)', url: 'https://www.youtube.com/watch?v=Nf7HP9y6Ovo', lang: 'en', min: '20분', desc: 'PlatformIO 로 micro_ros_platformio 를 설정해 ESP32 로봇을 ROS 2 에 연결' },
    { title: 'Docker for Robotics Pt 1 - What and Why??', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=XcJzOYe3E6M', lang: 'en', min: '15분', desc: '로봇 개발에 Docker 를 왜 쓰는지 개념부터 (시리즈 1편)' },
    { title: 'Docker 101', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=SAMPOK_lazw', lang: 'en', min: '30분', desc: '이미지 · 컨테이너 · 볼륨 · 네트워크 등 Docker 기본 명령 실습' },
    { title: 'Docker for ROS 2 | ROS Developers Open Class 198', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=GmdZqgNO2f4', lang: 'en', min: '60분', desc: 'ROS 2 프로젝트를 컨테이너로 만드는 라이브 수업' },
    { title: '"SROS2 ROS 2 security" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=SROS2+ROS+2+security', lang: 'en', desc: 'SROS2 키스토어 · enclave · 접근 제어 발표와 튜토리얼' }
  ],

  terms: [
    ['micro-ROS', 'MCU(마이크로컨트롤러)에서 ROS 2 노드를 돌리게 해 주는 프레임워크. rclc + XRCE-DDS 클라이언트'],
    ['XRCE-DDS', 'DDS for eXtremely Resource Constrained Environments. 작은 기기용 DDS 표준. 클라이언트는 MCU, agent 는 PC'],
    ['micro-ROS agent', 'MCU 대신 DDS 참가자를 만들어 토픽을 중계하는 PC 쪽 프로그램 (micro_ros_agent)'],
    ['rclc', 'C 언어용 ROS 2 편의 API. MCU 펌웨어에서 노드 · 퍼블리셔 · 타이머 · executor 를 만듦'],
    ['transport', 'MCU 와 agent 사이의 연결 방식. 시리얼 · UDP · USB · TCP · CAN-FD'],
    ['rosbridge', 'WebSocket 위에서 JSON 으로 ROS 토픽 · 서비스를 쓰게 해 주는 서버 (기본 포트 9090)'],
    ['roslibjs', '브라우저에서 rosbridge 에 접속하는 JavaScript 라이브러리 (ROSLIB.Ros · Topic · Service)'],
    ['foxglove_bridge', 'Foxglove 시각화 도구용 고성능 WebSocket 브리지 (기본 포트 8765)'],
    ['Docker 이미지 / 컨테이너', '이미지는 환경을 담은 틀(osrf/ros:jazzy-desktop), 컨테이너는 그 틀로 실행한 인스턴스'],
    ['--net=host', '컨테이너가 호스트의 네트워크를 그대로 쓰게 하는 옵션. DDS 탐색에 필요'],
    ['ROS_AUTOMATIC_DISCOVERY_RANGE', 'Jazzy 의 탐색 범위 설정. SUBNET(기본) · LOCALHOST · OFF · SYSTEM_DEFAULT'],
    ['Discovery Server', 'Fast DDS 의 중앙 탐색 서버. 멀티캐스트가 막힌 망에서 사용 (ROS_DISCOVERY_SERVER)'],
    ['SROS2', 'ROS 2 보안 도구. 키스토어 · enclave 인증서로 인증 · 암호화 · 접근 제어'],
    ['enclave', '보안 신원 단위. 노드는 --enclave 로 자기 인증서 폴더를 지정'],
    ['systemd 서비스', '리눅스 부팅 시 프로그램을 자동 실행 · 재시작 · 로그 관리하는 단위 (.service 파일)']
  ],

  summary: [
    'MCU 는 ROS 2 를 통째로 돌릴 수 없으므로 micro-ROS 는 XRCE-DDS 클라이언트만 MCU 에 두고 agent 가 PC 에서 DDS 를 대신합니다. agent 가 없으면 보드 노드는 보이지 않습니다.',
    'micro-ROS 보드의 토픽은 PC 에서 보통 토픽처럼 echo · pub 하고 rclpy 노드로 처리할 수 있으며, 센서 토픽의 QoS(BEST_EFFORT)에 맞춰 구독해야 합니다.',
    'rosbridge 는 WebSocket(9090) 위에서 JSON(op: subscribe · publish · call_service)으로 브라우저와 ROS 2 를 잇고, roslibjs 가 그 클라이언트입니다.',
    'Docker(osrf/ros:jazzy-desktop)로 같은 환경을 어디서나 재현하되, --net=host · --ipc=host · 같은 ROS_DOMAIN_ID 를 챙깁니다.',
    '여러 컴퓨터는 같은 ROS_DOMAIN_ID 로 자동 탐색하고, 멀티캐스트가 막히면 Discovery Server 나 Zenoh 라우터를 씁니다.',
    'SROS2 는 keystore · enclave 인증서와 ROS_SECURITY_* 환경 변수로 인증 · 암호화 · 접근 제어를 켭니다.',
    'systemd 서비스로 source → ros2 launch 를 등록하면 부팅 시 자동 시작 · 실패 시 재시작 · journalctl 로그가 됩니다.'
  ],

  quiz: [
    { q: 'micro-ROS 에서 ESP32 보드를 켰는데 PC 의 ros2 node list 에 /esp32_node 가 보이지 않습니다. 가장 먼저 확인할 것은?', options: ['RViz2 가 켜져 있는지', 'micro-ROS agent 가 보드와 같은 전송 방식 · 포트(예: udp4 8888)로 실행 중인지', 'colcon build 를 했는지', 'turtlesim 이 실행 중인지'], answer: 1, explain: 'MCU 는 DDS 에 직접 참가하지 않습니다. agent 가 실행 중이어야 하고, 보드 펌웨어의 전송 방식 · IP · 포트와 일치해야 노드가 그래프에 나타납니다.' },
    { q: 'XRCE-DDS 클라이언트와 agent 의 역할 분담으로 옳은 것은?', options: ['MCU 가 DDS 탐색을 모두 하고 agent 는 로그만 남긴다', 'MCU 는 작은 클라이언트만 돌리고, agent 가 PC 에서 DDS 참가자를 만들어 대신 통신한다', 'agent 가 MCU 펌웨어를 컴파일한다', '둘은 같은 프로그램이다'], answer: 1, explain: '자원이 부족한 MCU 는 가벼운 XRCE 프로토콜로 agent 에 요청만 보내고, agent 가 프록시처럼 DDS 네트워크에서 노드 · 토픽을 대신 만듭니다.' },
    { q: '웹 브라우저에서 ROS 2 토픽을 구독하는 일반적인 방법은?', options: ['브라우저에서 DDS 멀티캐스트를 직접 받는다', 'rosbridge_server 를 실행하고 roslibjs 로 WebSocket(JSON) 연결', 'SSH 로 접속한다', 'ROS_DOMAIN_ID 를 브라우저에 설정한다'], answer: 1, explain: '브라우저는 DDS 를 말할 수 없으므로 rosbridge 가 WebSocket(기본 9090)에서 JSON 요청을 ROS 토픽 · 서비스로 바꿔 줍니다.' },
    { q: 'Docker 컨테이너 안의 노드와 호스트의 노드가 서로 보이게 하려면 docker run 에 주로 무엇을 붙이나요?', options: ['--rm', '--net=host (그리고 같은 PC 면 --ipc=host)', '-d', '--name ros'], answer: 1, explain: '--net=host 로 같은 네트워크에서 DDS 탐색을 하고, 같은 PC 안의 공유 메모리 전송을 위해 --ipc=host 도 함께 줍니다.' },
    { q: '두 PC 가 같은 Wi-Fi 에 있는데 서로의 토픽이 보이지 않습니다. 원인이 될 수 없는 것은?', options: ['ROS_DOMAIN_ID 가 다르다', 'ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST 로 되어 있다', '방화벽 · 공유기가 멀티캐스트 UDP 를 막는다', '두 PC 모두 Ubuntu 24.04 를 쓴다'], answer: 3, explain: '같은 OS 는 문제가 아닙니다. 도메인 ID 불일치, 탐색 범위 LOCALHOST, 멀티캐스트 · UDP 차단이 대표적인 원인입니다. ros2 multicast send/receive 로 확인하세요.' },
    { q: 'SROS2 에서 ROS_SECURITY_STRATEGY=Enforce 의 의미는?', options: ['인증서가 없어도 그냥 실행한다', '인증서(enclave)가 없거나 맞지 않으면 노드 실행 · 참가를 거부한다', '모든 토픽을 압축한다', '로그를 암호화한다'], answer: 1, explain: 'Enforce 는 보안을 강제합니다. Permissive 는 인증서가 없으면 보안 없이 실행을 허용합니다.' },
    { q: 'systemd 서비스로 ros2 launch 를 실행할 때 ExecStart 안에서 setup.bash 를 직접 source 하는 이유는?', options: ['속도를 높이려고', 'systemd 는 사용자의 .bashrc 를 읽지 않아 ROS 환경이 설정되지 않기 때문', '보안 때문에', 'launch 파일이 요구해서'], answer: 1, explain: '서비스는 로그인 셸이 아니므로 .bashrc 의 source 가 적용되지 않습니다. bash -c "source … && exec ros2 launch …" 처럼 직접 적어야 합니다.' }
  ],

  slides: [
    { title: 'ROS 2 의 경계를 넓히기', layout: 'center', html: `<div class="s-big">🔌 작은 보드 · 🌐 브라우저 · 🐳 컨테이너<br>· 🖧 다른 PC · 🔐 보안 · 🚀 배포</div>`, notes: 'ESP32 보드를 보여 주며 “메모리 0.5 MB 의 친구를 ROS 2 회의에 끼우려면?” 하고 묻습니다. 오늘은 ROS 2 가 닿는 범위를 넓히는 여섯 가지 방법을 다룬다고 안내합니다. (2분)' },
    { title: 'micro-ROS 구조', html: `{{fig:microArch|nocap}}`, notes: 'MCU 에는 rclc 와 XRCE-DDS 클라이언트만, DDS 는 agent 가 대신. 통역사 비유를 씁니다. 전송 방식(시리얼 · UDP)과 agent 인자가 반드시 맞아야 한다는 점을 강조합니다. (5분)' },
    { title: '실습: 가상 ESP32', html: `{{widget:microros}}`, notes: 'agent 를 먼저 켜고 보드 전원을 넣습니다. 시리얼 로그의 ping → 세션 → 노드 생성 순서를 읽고, pot 을 돌리며 echo 값을 확인합니다. agent 를 끄면 노드가 사라지는 것도 보여 줍니다. (8분)' },
    { title: 'rclc 펌웨어의 뼈대', layout: 'center', html: `<div class="s-points"><p>① <b>support</b> init → ② <b>node</b> → ③ <b>publisher</b> · timer</p><p>④ <b>executor</b> 에 등록 → ⑤ loop 에서 <b>spin_some</b></p></div>`, notes: 'rclpy 와 구조가 같다는 점을 강조합니다. MCU 는 메모리를 미리 정해 두므로 executor 핸들 개수를 적는다는 점, 재연결 상태 기계가 필요하다는 점을 덧붙입니다. (4분)' },
    { title: '웹 연결: rosbridge', html: `{{fig:webArch|nocap}}`, notes: '브라우저는 WebSocket 만 안다 → rosbridge 가 JSON 통역. subscribe · publish · call_service 세 op 를 칠판에 적고 roslibjs 코드와 대응시킵니다. (5분)' },
    { title: '실습: 이 페이지 ↔ 내 PC', html: `{{widget:bridge|url=ws://localhost:9090}}`, notes: '실제 Jazzy PC 가 있으면 rosbridge 를 켜고 연결을 시연합니다. https 페이지에서 원격 ws:// 가 막힐 수 있다는 점도 설명합니다. 없으면 연결 흐름만 보여 줍니다. (5분)' },
    { title: 'Docker 로 같은 환경', html: `{{fig:dockerFig|nocap}}`, notes: '“내 컴퓨터에서는 되는데요” 문제를 컨테이너로 해결. --net=host, --ipc=host, -v 볼륨, -e DISPLAY 네 가지 옵션의 의미를 짚습니다. (5분)' },
    { title: 'docker run 한 줄', layout: 'center', html: `<div class="s-big" style="font-size:30px"><code>docker run -it --rm --net=host --ipc=host osrf/ros:jazzy-desktop</code></div>`, notes: '옵션을 하나씩 떼어 설명합니다: -it 대화형, --rm 종료 후 삭제, --net=host 네트워크 공유, --ipc=host 공유 메모리. compose 로 여러 컨테이너를 묶는 방법을 예고합니다. (3분)' },
    { title: '여러 컴퓨터', html: `{{fig:netFig|nocap}}`, notes: '같은 도메인 ID → 자동 탐색. 멀티캐스트가 막히면 Discovery Server · Zenoh. ROS_AUTOMATIC_DISCOVERY_RANGE=LOCALHOST 는 수업 중 옆 사람과 섞이지 않게 하는 좋은 습관이라고 소개합니다. (5분)' },
    { title: 'SROS2', html: `{{fig:srosFig|nocap}}`, notes: '기본 ROS 2 는 암호화 · 인증이 없다는 점부터. keystore → enclave → 환경 변수 세 개 → --enclave 순서로 설명합니다. Enforce 와 Permissive 의 차이를 묻습니다. (5분)' },
    { title: '부팅하면 스스로 일어나는 로봇', html: `{{fig:deployFlow}}`, notes: 'systemd 서비스 파일의 핵심 줄(source, exec, Restart, KillSignal=SIGINT)과 journalctl 로그 확인을 설명합니다. launch respawn 과의 차이도 짚습니다. (5분)' },
    { title: '오늘의 핵심', layout: 'center', html: `<div class="s-big">보드는 <b>agent</b> 로,<br>브라우저는 <b>rosbridge</b> 로,<br>배포는 <b>Docker + systemd</b> 로</div>`, notes: '세 문장으로 정리하고 퀴즈로 넘어갑니다. (2분)' }
  ]
});
