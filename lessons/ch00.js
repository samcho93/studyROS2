/* 0장 — ROS 2란 무엇인가? */
Course.lesson({
  id: 'ch00', no: '00',
  icon: '🤖',
  title: 'ROS 2란 무엇인가?',
  subtitle: '로봇 소프트웨어의 공통 언어 — 왜 필요하고, 무엇으로 이루어져 있을까?',
  level: '입문', time: '90분',
  goals: [
    '로봇 개발에 소프트웨어 프레임워크가 왜 필요한지 "바퀴의 재발명" 문제로 설명할 수 있다',
    'ROS 가 운영체제가 아니라 미들웨어 · 도구 · 생태계의 묶음이라는 것을 말할 수 있다',
    'ROS 1 과 ROS 2 의 가장 큰 차이(마스터 없는 DDS 탐색, QoS, 다중 플랫폼)를 비교할 수 있다',
    '노드 · 토픽 · 서비스 · 액션 · 파라미터가 각각 무엇인지 한 문장으로 소개할 수 있다',
    '배포판(Humble · Jazzy · Kilted · Lyrical)과 LTS 의 뜻을 알고, 이 강좌가 Jazzy 를 쓰는 이유를 말할 수 있다'
  ],
  teacher: {
    intro: '로봇 청소기 사진을 띄우고 “이 로봇 안에는 프로그램이 몇 개나 돌고 있을까요?” 하고 물어 봅니다. 한 개? 열 개? 답을 받은 뒤, 센서마다 · 기능마다 프로그램이 따로 있고 그것들이 서로 데이터를 주고받아야 한다는 점을 끌어내며 “그 대화를 도와주는 것이 ROS 입니다”로 시작합니다. (3분)',
    flow: '① 도입 · 바퀴의 재발명 10분 → ② ROS 의 정체(미들웨어 · 도구 · 생태계) 15분 → ③ 역사 · ROS 1 vs ROS 2 위젯 15분 → ④ 핵심 개념 미리 보기 10분 → ⑤ 실제 활용 사례 10분 → ⑥ 배포판 · LTS 5분 → ⑦ 브라우저 실습 환경 체험(lab · pylab) 15분 → ⑧ 로드맵 · 퀴즈 10분'
  },

  figs: {
    /* ---------------------------------------------------------------- 바퀴의 재발명 */
    reinvent: {
      caption: '프레임워크가 없으면 연구실마다 같은 코드를 처음부터 다시 만듭니다. ROS 는 검증된 부품을 함께 나눠 쓰게 해 줍니다.',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="ROS 없이 각 팀이 같은 기능을 따로 만드는 모습과 ROS 로 부품을 공유하는 모습 비교">
  <rect x="16" y="14" width="410" height="352" rx="16" class="red"/>
  <text x="221" y="40" class="t-lg t-c t-red">😩 ROS 없이</text>
  <rect x="36" y="62" width="120" height="30" rx="8" class="box"/><text x="96" y="77" class="t-sm t-c t-b">A 대학 연구실</text>
  <rect x="161" y="62" width="120" height="30" rx="8" class="box"/><text x="221" y="77" class="t-sm t-c t-b">B 스타트업</text>
  <rect x="286" y="62" width="120" height="30" rx="8" class="box"/><text x="346" y="77" class="t-sm t-c t-b">C 공장</text>
  <g>
    <rect x="36" y="104" width="120" height="34" rx="6" class="gray"/><text x="96" y="121" class="t-xs t-c">라이다 드라이버</text>
    <rect x="36" y="144" width="120" height="34" rx="6" class="gray"/><text x="96" y="161" class="t-xs t-c">모터 제어</text>
    <rect x="36" y="184" width="120" height="34" rx="6" class="gray"/><text x="96" y="201" class="t-xs t-c">지도 만들기</text>
    <rect x="36" y="224" width="120" height="34" rx="6" class="gray"/><text x="96" y="241" class="t-xs t-c">경로 계획</text>
    <rect x="36" y="264" width="120" height="34" rx="6" class="gray"/><text x="96" y="281" class="t-xs t-c">통신 · 로그 도구</text>
  </g>
  <g>
    <rect x="161" y="104" width="120" height="34" rx="6" class="gray"/><text x="221" y="121" class="t-xs t-c">라이다 드라이버</text>
    <rect x="161" y="144" width="120" height="34" rx="6" class="gray"/><text x="221" y="161" class="t-xs t-c">모터 제어</text>
    <rect x="161" y="184" width="120" height="34" rx="6" class="gray"/><text x="221" y="201" class="t-xs t-c">지도 만들기</text>
    <rect x="161" y="224" width="120" height="34" rx="6" class="gray"/><text x="221" y="241" class="t-xs t-c">경로 계획</text>
    <rect x="161" y="264" width="120" height="34" rx="6" class="gray"/><text x="221" y="281" class="t-xs t-c">통신 · 로그 도구</text>
  </g>
  <g>
    <rect x="286" y="104" width="120" height="34" rx="6" class="gray"/><text x="346" y="121" class="t-xs t-c">라이다 드라이버</text>
    <rect x="286" y="144" width="120" height="34" rx="6" class="gray"/><text x="346" y="161" class="t-xs t-c">모터 제어</text>
    <rect x="286" y="184" width="120" height="34" rx="6" class="gray"/><text x="346" y="201" class="t-xs t-c">지도 만들기</text>
    <rect x="286" y="224" width="120" height="34" rx="6" class="gray"/><text x="346" y="241" class="t-xs t-c">경로 계획</text>
    <rect x="286" y="264" width="120" height="34" rx="6" class="gray"/><text x="346" y="281" class="t-xs t-c">통신 · 로그 도구</text>
  </g>
  <text x="221" y="322" class="t-sm t-c">같은 기능을 세 번 만들고, 서로 호환도 안 됨</text>
  <text x="221" y="346" class="t-xs t-c t-mu">→ 정작 "새로운 연구"에 쓸 시간이 부족</text>

  <rect x="454" y="14" width="410" height="352" rx="16" class="green"/>
  <text x="659" y="40" class="t-lg t-c t-green">😊 ROS 와 함께</text>
  <rect x="474" y="62" width="120" height="30" rx="8" class="box"/><text x="534" y="77" class="t-sm t-c t-b">A 대학 연구실</text>
  <rect x="599" y="62" width="120" height="30" rx="8" class="box"/><text x="659" y="77" class="t-sm t-c t-b">B 스타트업</text>
  <rect x="724" y="62" width="120" height="30" rx="8" class="box"/><text x="784" y="77" class="t-sm t-c t-b">C 공장</text>
  <rect x="474" y="104" width="120" height="44" rx="6" class="orange"/><text x="534" y="126" class="t-xs t-c">새 연구: 사람 인식</text>
  <rect x="599" y="104" width="120" height="44" rx="6" class="orange"/><text x="659" y="126" class="t-xs t-c">새 제품: 배달 로봇</text>
  <rect x="724" y="104" width="120" height="44" rx="6" class="orange"/><text x="784" y="126" class="t-xs t-c">새 공정: 물류 자동화</text>
  <line x1="534" y1="150" x2="534" y2="186" class="ln-green ar-green"/>
  <line x1="659" y1="150" x2="659" y2="186" class="ln-green ar-green"/>
  <line x1="784" y1="150" x2="784" y2="186" class="ln-green ar-green"/>
  <rect x="474" y="190" width="370" height="110" rx="12" class="blue"/>
  <text x="659" y="212" class="t-b t-c t-blue">ROS 공통 부품 (공유 · 검증됨)</text>
  <text x="659" y="240" class="t-xs t-c">드라이버 · ros2_control · slam_toolbox · Nav2</text>
  <text x="659" y="262" class="t-xs t-c">MoveIt 2 · tf2 · RViz2 · rosbag2 · rqt</text>
  <text x="659" y="284" class="t-xs t-c t-mu">+ 표준 메시지 형식으로 서로 연결</text>
  <text x="659" y="322" class="t-sm t-c">공통 부분은 가져다 쓰고</text>
  <text x="659" y="346" class="t-xs t-c t-mu">→ 각자 잘하는 "새로운 것"에 집중</text>
</svg>`
    },

    /* ---------------------------------------------------------------- ROS = 배관 + 도구 + 기능 + 생태계 */
    rosEq: {
      caption: 'ROS 를 이루는 네 가지 — 통신 배관(미들웨어), 개발 도구, 로봇 기능 패키지, 그리고 사람들(생태계)',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="ROS 는 배관, 도구, 기능, 생태계의 합">
  <rect x="20" y="40" width="180" height="190" rx="14" class="blue"/>
  <text x="110" y="78" class="t-xl t-c">🔌</text>
  <text x="110" y="118" class="t-b t-c t-blue">배관 (Plumbing)</text>
  <text x="110" y="148" class="t-sm t-c">프로그램끼리</text>
  <text x="110" y="168" class="t-sm t-c">메시지를 주고받는</text>
  <text x="110" y="188" class="t-sm t-c">통신 미들웨어</text>
  <text x="110" y="212" class="t-xs t-c t-mu">토픽 · 서비스 · 액션 · DDS</text>
  <text x="222" y="135" class="t-xl t-c">+</text>

  <rect x="244" y="40" width="180" height="190" rx="14" class="teal"/>
  <text x="334" y="78" class="t-xl t-c">🧰</text>
  <text x="334" y="118" class="t-b t-c t-teal">도구 (Tools)</text>
  <text x="334" y="148" class="t-sm t-c">보고 · 기록하고</text>
  <text x="334" y="168" class="t-sm t-c">디버깅하는</text>
  <text x="334" y="188" class="t-sm t-c">개발 도구</text>
  <text x="334" y="212" class="t-xs t-c t-mu">ros2 CLI · RViz2 · rqt · bag</text>
  <text x="446" y="135" class="t-xl t-c">+</text>

  <rect x="468" y="40" width="180" height="190" rx="14" class="orange"/>
  <text x="558" y="78" class="t-xl t-c">🦾</text>
  <text x="558" y="118" class="t-b t-c t-orange">기능 (Capabilities)</text>
  <text x="558" y="148" class="t-sm t-c">바로 가져다 쓰는</text>
  <text x="558" y="168" class="t-sm t-c">로봇 알고리즘</text>
  <text x="558" y="188" class="t-sm t-c">패키지</text>
  <text x="558" y="212" class="t-xs t-c t-mu">Nav2 · MoveIt 2 · SLAM</text>
  <text x="670" y="135" class="t-xl t-c">+</text>

  <rect x="692" y="40" width="170" height="190" rx="14" class="purple"/>
  <text x="777" y="78" class="t-xl t-c">🌏</text>
  <text x="777" y="118" class="t-b t-c t-purple">생태계</text>
  <text x="777" y="148" class="t-sm t-c">전 세계 개발자 ·</text>
  <text x="777" y="168" class="t-sm t-c">기업 · 문서 ·</text>
  <text x="777" y="188" class="t-sm t-c">질문 답변 · 행사</text>
  <text x="777" y="212" class="t-xs t-c t-mu">ROSCon · Discourse</text>

  <rect x="20" y="250" width="842" height="40" rx="10" class="box"/>
  <text x="441" y="270" class="t-c t-b">= ROS (Robot Operating System) — 이름은 "OS" 지만, 실제로는 리눅스 위에서 도는 프레임워크</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 소프트웨어 층 */
    stack: {
      caption: 'ROS 2 의 층 구조 — 여러분의 코드는 맨 위에서 rclpy/rclcpp 만 부르면, 아래층이 네트워크 통신을 알아서 처리합니다',
      svg: `<svg class="dg" viewBox="0 0 860 400" role="img" aria-label="응용 코드, 클라이언트 라이브러리, rcl, rmw, DDS, 운영체제로 이어지는 ROS 2 층 구조">
  <rect x="150" y="16" width="560" height="50" rx="10" class="orange"/>
  <text x="430" y="41" class="t-b t-c">내 로봇 프로그램 (노드) — 파이썬 · C++</text>
  <rect x="150" y="78" width="270" height="50" rx="10" class="blue"/>
  <text x="285" y="103" class="t-b t-c t-mono">rclpy</text>
  <rect x="440" y="78" width="270" height="50" rx="10" class="blue"/>
  <text x="575" y="103" class="t-b t-c t-mono">rclcpp</text>
  <rect x="150" y="140" width="560" height="50" rx="10" class="teal"/>
  <text x="430" y="165" class="t-b t-c"><tspan class="t-mono">rcl</tspan> — 언어와 상관없는 공통 C 라이브러리</text>
  <rect x="150" y="202" width="560" height="50" rx="10" class="purple"/>
  <text x="430" y="227" class="t-b t-c"><tspan class="t-mono">rmw</tspan> — 미들웨어를 갈아 끼우는 연결부</text>
  <rect x="150" y="264" width="175" height="50" rx="10" class="green"/>
  <text x="237" y="282" class="t-sm t-c t-b">Fast DDS</text>
  <text x="237" y="302" class="t-xs t-c t-mu">Jazzy 기본값</text>
  <rect x="342" y="264" width="175" height="50" rx="10" class="green"/>
  <text x="429" y="289" class="t-sm t-c t-b">Cyclone DDS</text>
  <rect x="534" y="264" width="176" height="50" rx="10" class="green"/>
  <text x="622" y="289" class="t-sm t-c t-b">Zenoh</text>
  <rect x="150" y="326" width="560" height="50" rx="10" class="gray"/>
  <text x="430" y="351" class="t-b t-c">운영체제 (Ubuntu Linux · Windows · macOS) + 네트워크</text>
  <line x1="740" y1="30" x2="740" y2="366" class="ln ar"/>
  <text x="760" y="190" class="t-sm">아래로 갈수록</text>
  <text x="760" y="210" class="t-sm">하드웨어 · 네트워크에</text>
  <text x="760" y="230" class="t-sm">가까워짐</text>
  <text x="30" y="103" class="t-sm t-mu">여러분이</text>
  <text x="30" y="123" class="t-sm t-mu">쓰는 API</text>
  <text x="30" y="289" class="t-sm t-mu">통신 엔진</text>
</svg>`
    },

    /* ---------------------------------------------------------------- ROS 1 vs ROS 2 구조 */
    masterVsDds: {
      caption: 'ROS 1 은 마스터(roscore)가 전화번호부 역할을 했지만, ROS 2 는 DDS 로 노드끼리 서로를 직접 찾습니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="ROS 1 마스터 중심 구조와 ROS 2 분산 탐색 구조">
  <rect x="14" y="14" width="420" height="302" rx="14" class="box"/>
  <text x="224" y="40" class="t-lg t-c">ROS 1 — 중앙 마스터</text>
  <rect x="164" y="70" width="120" height="50" rx="10" class="s-orange"/>
  <text x="224" y="88" class="t-b t-c tw">roscore</text>
  <text x="224" y="108" class="t-xs t-c tw">(마스터)</text>
  <ellipse cx="80" cy="230" rx="58" ry="26" class="blue"/><text x="80" y="230" class="t-sm t-c">카메라</text>
  <ellipse cx="224" cy="270" rx="58" ry="26" class="blue"/><text x="224" y="270" class="t-sm t-c">인식</text>
  <ellipse cx="368" cy="230" rx="58" ry="26" class="blue"/><text x="368" y="230" class="t-sm t-c">모터</text>
  <line x1="104" y1="206" x2="190" y2="124" class="ln-orange dash ar2"/>
  <line x1="224" y1="244" x2="224" y2="124" class="ln-orange dash ar2"/>
  <line x1="344" y1="206" x2="258" y2="124" class="ln-orange dash ar2"/>
  <line x1="138" y1="236" x2="166" y2="258" class="ln-blue thick"/>
  <text x="224" y="160" class="t-xs t-c t-orange">"누가 어디 있나요?"</text>
  <rect x="40" y="286" width="370" height="24" rx="6" class="red"/>
  <text x="225" y="298" class="t-xs t-c">⚠ 마스터가 죽으면 새 연결을 못 만듦 (단일 실패 지점)</text>

  <rect x="446" y="14" width="420" height="302" rx="14" class="box"/>
  <text x="656" y="40" class="t-lg t-c">ROS 2 — 분산 탐색 (DDS)</text>
  <ellipse cx="540" cy="110" rx="58" ry="26" class="blue"/><text x="540" y="110" class="t-sm t-c">카메라</text>
  <ellipse cx="772" cy="110" rx="58" ry="26" class="blue"/><text x="772" y="110" class="t-sm t-c">인식</text>
  <ellipse cx="540" cy="236" rx="58" ry="26" class="blue"/><text x="540" y="236" class="t-sm t-c">모터</text>
  <ellipse cx="772" cy="236" rx="58" ry="26" class="blue"/><text x="772" y="236" class="t-sm t-c">지도</text>
  <line x1="600" y1="110" x2="712" y2="110" class="ln-green ar2"/>
  <line x1="540" y1="138" x2="540" y2="208" class="ln-green ar2"/>
  <line x1="772" y1="138" x2="772" y2="208" class="ln-green ar2"/>
  <line x1="590" y1="126" x2="722" y2="220" class="ln-green ar2"/>
  <line x1="600" y1="236" x2="712" y2="236" class="ln-green ar2"/>
  <circle cx="656" cy="173" r="30" class="green pulse"/>
  <text x="656" y="173" class="t-xs t-c t-b">📣 탐색</text>
  <rect x="472" y="286" width="370" height="24" rx="6" class="green"/>
  <text x="657" y="298" class="t-xs t-c">✔ 중앙 서버 없이 서로 알아서 찾아 연결</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 핵심 개념 미리 보기 */
    concepts: {
      caption: 'ROS 2 그래프 미리 보기 — 노드(파란 타원)가 토픽(초록 사각형) · 서비스(주황) · 액션(보라) · 파라미터로 대화합니다',
      svg: `<svg class="dg" viewBox="0 0 880 400" role="img" aria-label="노드, 토픽, 서비스, 액션, 파라미터 관계도">
  <ellipse cx="120" cy="90" rx="92" ry="32" class="blue"/>
  <text x="120" y="84" class="t-b t-c t-mono">/camera</text><text x="120" y="104" class="t-xs t-c t-mu">카메라 노드</text>
  <rect x="300" y="66" width="190" height="48" rx="6" class="green"/>
  <text x="395" y="84" class="t-sm t-c t-mono t-b">/image_raw</text><text x="395" y="102" class="t-xs t-c t-mu">토픽</text>
  <ellipse cx="660" cy="90" rx="100" ry="32" class="blue"/>
  <text x="660" y="84" class="t-b t-c t-mono">/detector</text><text x="660" y="104" class="t-xs t-c t-mu">사물 인식 노드</text>
  <line x1="212" y1="90" x2="298" y2="90" class="ln-green ar-green moving"/>
  <line x1="490" y1="90" x2="558" y2="90" class="ln-green ar-green moving"/>

  <rect x="560" y="170" width="200" height="48" rx="6" class="green"/>
  <text x="660" y="188" class="t-sm t-c t-mono t-b">/cmd_vel</text><text x="660" y="206" class="t-xs t-c t-mu">토픽 (속도 명령)</text>
  <line x1="660" y1="122" x2="660" y2="168" class="ln-green ar-green moving"/>
  <ellipse cx="660" cy="300" rx="100" ry="32" class="blue"/>
  <text x="660" y="294" class="t-b t-c t-mono">/base_driver</text><text x="660" y="314" class="t-xs t-c t-mu">바퀴 모터 노드</text>
  <line x1="660" y1="218" x2="660" y2="266" class="ln-green ar-green moving"/>

  <ellipse cx="200" cy="300" rx="100" ry="32" class="blue"/>
  <text x="200" y="294" class="t-b t-c t-mono">/navigator</text><text x="200" y="314" class="t-xs t-c t-mu">길 찾기 노드</text>
  <line x1="300" y1="300" x2="558" y2="300" class="ln-purple thick ar-purple"/>
  <rect x="330" y="252" width="200" height="30" rx="15" class="purple"/>
  <text x="430" y="267" class="t-xs t-c">액션: "저기까지 가 줘" (피드백 ↔)</text>
  <line x1="120" y1="122" x2="160" y2="266" class="ln-orange ar2 dash"/>
  <rect x="20" y="180" width="160" height="30" rx="15" class="orange"/>
  <text x="100" y="195" class="t-xs t-c">서비스: 사진 한 장 줘</text>

  <rect x="300" y="340" width="260" height="46" rx="10" class="yellow"/>
  <text x="430" y="356" class="t-xs t-c t-b">⚙ 파라미터 (노드의 설정값)</text>
  <text x="430" y="374" class="t-xs t-c t-mono">max_speed: 0.5 · frame_id: base_link</text>
  <line x1="560" y1="350" x2="592" y2="328" class="ln dash"/>

  <rect x="770" y="20" width="100" height="120" rx="8" class="box"/>
  <ellipse cx="800" cy="44" rx="18" ry="10" class="blue"/><text x="824" y="44" class="t-xs">노드</text>
  <rect x="782" y="62" width="36" height="16" rx="3" class="green"/><text x="824" y="70" class="t-xs">토픽</text>
  <rect x="782" y="86" width="36" height="16" rx="8" class="orange"/><text x="824" y="94" class="t-xs">서비스</text>
  <rect x="782" y="110" width="36" height="16" rx="8" class="purple"/><text x="824" y="118" class="t-xs">액션</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 로드맵 */
    roadmap: {
      caption: '이 강좌의 여행 지도 — 6부 22장. 각 역에서 브라우저 실습으로 직접 해 보며 나아갑니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="1부부터 6부까지 강좌 로드맵">
  <path d="M60,90 L820,90 Q860,90 860,130 L860,190 Q860,230 820,230 L60,230" class="ln thick dash"/>
  <circle cx="90" cy="90" r="30" class="s-blue"/><text x="90" y="90" class="t-lg t-c tw">1</text>
  <text x="90" y="138" class="t-sm t-c t-b">시작하기</text><text x="90" y="158" class="t-xs t-c t-mu">0~1장</text>
  <text x="90" y="176" class="t-xs t-c t-mu">개념 · 설치</text>
  <circle cx="330" cy="90" r="30" class="s-teal"/><text x="330" y="90" class="t-lg t-c tw">2</text>
  <text x="330" y="138" class="t-sm t-c t-b">그래프의 핵심 개념</text><text x="330" y="158" class="t-xs t-c t-mu">2~6장</text>
  <text x="330" y="176" class="t-xs t-c t-mu">토픽 · 메시지 · 서비스 · 액션 · 파라미터</text>
  <circle cx="600" cy="90" r="30" class="s-orange"/><text x="600" y="90" class="t-lg t-c tw">3</text>
  <text x="600" y="138" class="t-sm t-c t-b">코드로 만드는 ROS 2</text><text x="600" y="158" class="t-xs t-c t-mu">7~11장</text>
  <text x="600" y="176" class="t-xs t-c t-mu">패키지 · rclpy · 런치 · QoS</text>
  <circle cx="790" cy="230" r="30" class="s-purple"/><text x="790" y="230" class="t-lg t-c tw">4</text>
  <text x="790" y="276" class="t-sm t-c t-b">표현하고 보는 도구</text><text x="790" y="296" class="t-xs t-c t-mu">12~15장 · TF · URDF · Gazebo</text>
  <circle cx="500" cy="230" r="30" class="s-red"/><text x="500" y="230" class="t-lg t-c tw">5</text>
  <text x="500" y="276" class="t-sm t-c t-b">이동 · 조작 · 보행</text><text x="500" y="296" class="t-xs t-c t-mu">16~18장 · Nav2 · MoveIt · Go2</text>
  <circle cx="210" cy="230" r="30" class="s-green"/><text x="210" y="230" class="t-lg t-c tw">6</text>
  <text x="210" y="276" class="t-sm t-c t-b">확장과 실전</text><text x="210" y="296" class="t-xs t-c t-mu">19~21장 · 비전 · micro-ROS · 프로젝트</text>
  <text x="40" y="30" class="t-sm t-mu">🏁 출발: ROS 를 처음 만나는 오늘</text>
  <text x="60" y="230" class="t-xl t-c">🏆</text>
</svg>`
    },

    /* ---------------------------------------------------------------- HTML 도표 */
    history: `<ol class="timeline">
  <li class="gray"><span class="tl-y">2007</span><b>ROS 의 시작</b><p>스탠퍼드 대학 연구실에서 시작된 아이디어를 로봇 회사 <b>Willow Garage</b> 가 이어받아 본격 개발합니다. 목표: "로봇 연구자들이 바퀴를 다시 발명하지 않게".</p></li>
  <li class="blue"><span class="tl-y">2010</span><b>ROS 1 첫 배포판 Box Turtle</b><p>PR2 로봇과 함께 공개되며 전 세계 대학 · 연구소로 퍼집니다.</p></li>
  <li class="teal"><span class="tl-y">2012</span><b>OSRF 설립 · 첫 ROSCon</b><p>비영리 재단(Open Source Robotics Foundation)이 ROS 를 맡아 관리합니다. 개발자 행사 ROSCon 이 매년 열리기 시작.</p></li>
  <li class="purple"><span class="tl-y">2017</span><b>ROS 2 첫 정식판 Ardent Apalone</b><p>산업 · 상용 로봇을 위해 통신 구조를 DDS 로 새로 설계한 ROS 2 가 나옵니다(2017-12).</p></li>
  <li class="orange"><span class="tl-y">2020</span><b>ROS 1 마지막 배포판 Noetic</b><p>ROS 1 은 Noetic 을 끝으로 새 배포판을 내지 않기로 합니다.</p></li>
  <li class="blue"><span class="tl-y">2022</span><b>Humble Hawksbill (LTS)</b><p>Ubuntu 22.04 용 장기 지원판. 지금도 많은 로봇 제품이 씁니다.</p></li>
  <li class="green"><span class="tl-y">2024</span><b>Jazzy Jalisco (LTS)</b><p>Ubuntu 24.04 용 장기 지원판(~2029-05). <b>이 강좌의 기준 버전</b>입니다.</p></li>
  <li class="red"><span class="tl-y">2025</span><b>Kilted Kaiju · ROS 1 지원 종료</b><p>Kilted 출시(2025-05-23). ROS 1 Noetic 은 <b>2025-05-31</b> 에 지원이 끝나(EOL) 이제 새 프로젝트는 ROS 2 로 합니다.</p></li>
  <li class="purple"><span class="tl-y">2026</span><b>Lyrical Luth (LTS)</b><p>2026-05-22 출시, Ubuntu 26.04 용 장기 지원판(~2031-05).</p></li>
</ol>`,

    distroTable: `<table class="tbl cmp">
  <thead><tr><th>배포판</th><th>출시</th><th>지원 종료(EOL)</th><th>짝이 되는 Ubuntu</th><th>종류</th></tr></thead>
  <tbody>
    <tr><td>🐢 Humble Hawksbill</td><td>2022-05-23</td><td>2027-05</td><td>22.04 (Jammy)</td><td><span class="tag blue">LTS</span></td></tr>
    <tr><td>🎷 <b>Jazzy Jalisco</b></td><td>2024-05-23</td><td>2029-05</td><td><b>24.04 (Noble)</b></td><td><span class="tag green">LTS · 이 강좌</span></td></tr>
    <tr><td>🦑 Kilted Kaiju</td><td>2025-05-23</td><td>2026-12</td><td>24.04 (Noble)</td><td><span class="tag orange">일반(1.5년)</span></td></tr>
    <tr><td>🎸 Lyrical Luth</td><td>2026-05-22</td><td>2031-05</td><td>26.04 (Resolute)</td><td><span class="tag blue">LTS</span></td></tr>
    <tr><td>🔄 Rolling Ridley</td><td>계속 갱신</td><td>—</td><td>최신</td><td><span class="tag gray">개발판</span></td></tr>
  </tbody>
</table>`
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '로봇에게 왜 소프트웨어 프레임워크가 필요할까?',
      html: `
<p>로봇 청소기 하나만 떠올려 봐도, 안에서는 여러 일이 <b>동시에</b> 일어납니다. 라이다(LiDAR, 레이저로 거리를 재는 센서)가 주변을 재고, 바퀴 모터가 돌고, 지도를 그리고, 배터리를 확인하고, 앱과 통신합니다.</p>
<p>이 일들을 <b>하나의 거대한 프로그램</b>으로 짜면 어떻게 될까요? 한 곳이 고장 나면 전체가 멈추고, 센서 하나를 바꾸려 해도 전체 코드를 뜯어고쳐야 합니다. 그래서 로봇 소프트웨어는 <b>작은 프로그램 여러 개가 서로 데이터를 주고받는 구조</b>로 만듭니다.</p>

<div class="box analogy"><div class="box-t">🍳 비유 — 식당 주방</div>
큰 식당은 요리사 한 명이 모든 걸 하지 않습니다. 재료 손질 · 볶음 · 튀김 · 플레이팅 담당이 따로 있고, <b>주문서</b>라는 약속된 형식으로 소통하죠. 로봇도 마찬가지로 센서 담당 · 판단 담당 · 모터 담당 프로그램이 <b>약속된 메시지</b>로 대화합니다. 이 "주방 시스템"을 통째로 제공하는 것이 ROS 입니다.</div>

<p>문제는 이런 구조를 만드는 일 자체가 어렵다는 것입니다. 프로그램끼리 통신하는 방법, 데이터 형식, 기록 · 재생 도구, 시각화 도구… 연구실과 회사마다 이것을 <b>처음부터 다시 만들고</b> 있었습니다. 이것을 <b>"바퀴의 재발명(reinventing the wheel)"</b>이라고 부릅니다.</p>
{{fig:reinvent}}

<div class="cards c3">
  <div class="card blue"><div class="ci">🧩</div><b>나누기</b><p>기능마다 작은 프로그램(노드)으로 나눠서, 하나가 죽어도 나머지는 계속 동작합니다.</p></div>
  <div class="card green"><div class="ci">🔗</div><b>잇기</b><p>표준 메시지 형식으로 연결하니, 남이 만든 부품도 그대로 끼울 수 있습니다.</p></div>
  <div class="card orange"><div class="ci">♻️</div><b>나눠 쓰기</b><p>전 세계가 검증한 드라이버 · 알고리즘을 가져다 쓰고, 새로운 것에 집중합니다.</p></div>
</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'ROS 의 정체 — 운영체제가 아니라 "미들웨어 + 도구 + 생태계"',
      html: `
<p><b>ROS</b> 는 <b>Robot Operating System</b> 의 줄임말입니다. 이름에 "운영체제(OS)"가 들어 있지만, 윈도우나 리눅스 같은 진짜 운영체제는 <b>아닙니다</b>. ROS 는 보통 <b>Ubuntu 리눅스 위에 설치하는 소프트웨어 묶음</b>이에요.</p>
{{fig:rosEq}}

<p>그중 가장 중요한 것은 <b>미들웨어(middleware)</b>입니다. 미들웨어는 운영체제와 응용 프로그램 <b>사이(middle)</b>에서, 프로그램끼리 네트워크로 데이터를 주고받는 복잡한 일을 대신 처리해 주는 소프트웨어입니다. 여러분은 "이 이름으로 이 데이터를 보내 줘"라고만 쓰면 됩니다.</p>
{{fig:stack}}

<div class="box note"><div class="box-t">📝 용어 짚기 — DDS 와 RMW</div>
<ul>
  <li><b>DDS</b>(Data Distribution Service): 산업 · 국방 · 항공 분야에서 오래 써 온 실시간 통신 표준입니다. ROS 2 는 이 표준 위에서 메시지를 주고받습니다.</li>
  <li><b>RMW</b>(ROS MiddleWare interface): DDS 제품을 <b>갈아 끼울 수 있게</b> 해 주는 연결부입니다. Jazzy 의 기본값은 <code>rmw_fastrtps_cpp</code>(Fast DDS)이고, Cyclone DDS 나 Zenoh(<code>rmw_zenoh_cpp</code>)로 바꿀 수 있습니다. 자세한 것은 11장에서 다룹니다.</li>
</ul></div>

<p>이 사이트의 터미널은 실제 ROS 2 와 같은 명령을 흉내 냅니다. 설치된 ROS 가 어떤 배포판 · 미들웨어인지 확인해 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>echo $ROS_DISTRO
printenv | grep -i ROS
ros2 doctor</code></pre>
<pre class="code out" data-lang="출력"><code>jazzy
ROS_DISTRO=jazzy
ROS_VERSION=2
ROS_PYTHON_VERSION=3
ROS_DOMAIN_ID=0
...
   RMW MIDDLEWARE
middleware name    : rmw_fastrtps_cpp</code></pre>
{{widget:term|chips=echo $ROS_DISTRO;printenv;ros2 doctor;ros2 --help|h=260}}
<div class="box practice"><div class="box-t">🧪 해 보기</div>
<ol>
  <li>위 코드 블록의 <b>▶ 터미널에서 실행</b>을 누르거나, 터미널 아래 칩을 하나씩 눌러 보세요.</li>
  <li><code>ros2 doctor</code> 출력에서 <b>middleware name</b> 과 <b>distribution name</b> 을 찾아보세요.</li>
  <li><code>ros2 --help</code> 로 ros2 명령에 어떤 하위 명령(node, topic, service …)이 있는지 훑어보세요. 앞으로 하나씩 배웁니다.</li>
</ol></div>`
    },

    /* ================================================================ 3 */
    {
      title: 'ROS 의 역사와 ROS 1 → ROS 2',
      html: `
<p>ROS 는 2007년 무렵 로봇 연구자들이 "매번 같은 코드를 새로 짜는" 문제를 해결하려고 시작했습니다. 처음(ROS 1)에는 <b>대학 연구실용</b>으로 설계되어 한 대의 로봇 · 안정적인 네트워크 · 리눅스만 가정했습니다.</p>
{{fig:history}}

<p>ROS 1 이 산업 현장으로 가자 한계가 드러났습니다. 여러 대의 로봇, 불안정한 와이파이, 실시간 제어, 보안, 윈도우 지원이 필요했거든요. 그래서 기존 구조를 고치는 대신 <b>통신 부분을 DDS 로 새로 설계</b>한 것이 ROS 2 입니다.</p>
{{fig:masterVsDds}}

<table class="tbl cmp">
  <thead><tr><th>항목</th><th>ROS 1</th><th>ROS 2</th></tr></thead>
  <tbody>
    <tr><td>노드 찾기</td><td>중앙 마스터 <code>roscore</code> 필수</td><td>DDS 가 자동 탐색 (마스터 없음)</td></tr>
    <tr><td>통신</td><td>자체 TCPROS/UDPROS</td><td>DDS 표준 · RMW 로 교체 가능</td></tr>
    <tr><td>통신 품질 설정</td><td>거의 없음</td><td><b>QoS</b>(신뢰성 · 내구성 · 기록 깊이)</td></tr>
    <tr><td>운영체제</td><td>주로 Ubuntu</td><td>Ubuntu · Windows · macOS · RHEL</td></tr>
    <tr><td>파이썬</td><td>Python 2 → 3 (Noetic)</td><td>Python 3</td></tr>
    <tr><td>보안</td><td>없음</td><td>SROS2 (DDS 보안: 암호화 · 인증)</td></tr>
    <tr><td>노드 관리</td><td>일반 노드</td><td>라이프사이클(관리형) 노드, 컴포넌트</td></tr>
    <tr><td>런치 파일</td><td>XML</td><td>Python · XML · YAML</td></tr>
    <tr><td>지원 상태</td><td><span class="tag red">2025-05-31 종료</span></td><td><span class="tag green">현재 표준</span></td></tr>
  </tbody>
</table>

<p>아래 위젯에서 두 방식의 차이를 직접 눈으로 확인해 보세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 마스터가 사라지면?</div>
<ol>
  <li>ROS 1 쪽에서 <b>마스터(roscore)를 끄고</b> 새 노드를 추가해 보세요. 새 노드가 다른 노드를 찾을 수 있나요?</li>
  <li>ROS 2 쪽에서 노드를 추가 · 삭제해 보세요. 중앙 서버 없이 서로를 찾아 연결되는 모습을 관찰합니다.</li>
  <li>"공장에 로봇 50대가 있다면 어느 쪽이 안전할까?"를 한 문장으로 적어 보세요.</li>
</ol></div>
{{widget:ros1vs2}}

<div class="box warn"><div class="box-t">⚠ 인터넷 자료를 볼 때 주의</div>
검색하면 아직도 ROS 1 자료가 많이 나옵니다. <code>roscore</code>, <code>rosrun</code>, <code>rostopic</code>, <code>catkin_make</code> 가 보이면 <b>ROS 1</b> 자료입니다. ROS 2 는 <code>ros2 run</code>, <code>ros2 topic</code>, <code>colcon build</code> 처럼 모두 <code>ros2</code> 로 시작합니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '핵심 개념 미리 보기 — 노드 · 토픽 · 서비스 · 액션 · 파라미터',
      html: `
<p>ROS 2 로 만든 로봇 소프트웨어는 여러 프로그램이 거미줄처럼 연결된 <b>그래프(graph)</b>입니다. 이 그래프를 이루는 다섯 가지 개념만 알면 어떤 로봇 시스템도 읽을 수 있어요. 지금은 이름과 느낌만 익히고, 2~6장에서 하나씩 자세히 배웁니다.</p>
{{fig:concepts}}

<table class="tbl">
  <thead><tr><th>개념</th><th>한 문장 설명</th><th>일상 비유</th><th>배우는 장</th></tr></thead>
  <tbody>
    <tr><td><b>노드</b> (node)</td><td>한 가지 일을 맡은 작은 실행 프로그램</td><td>🧑‍🍳 주방의 담당 요리사</td><td>2장</td></tr>
    <tr><td><b>토픽</b> (topic)</td><td>이름 붙은 방송 채널. 보내는 쪽은 계속 방송하고, 원하는 쪽이 구독</td><td>📻 라디오 방송</td><td>2장</td></tr>
    <tr><td><b>메시지</b> (message)</td><td>주고받는 데이터의 약속된 형식</td><td>📄 주문서 양식</td><td>3장</td></tr>
    <tr><td><b>서비스</b> (service)</td><td>요청하면 한 번 응답하는 통신</td><td>📞 전화로 묻고 답하기</td><td>4장</td></tr>
    <tr><td><b>액션</b> (action)</td><td>오래 걸리는 일을 맡기고 중간 경과(피드백)를 받는 통신</td><td>🍕 배달 주문 + 배달 현황</td><td>5장</td></tr>
    <tr><td><b>파라미터</b> (parameter)</td><td>노드가 실행 중에 바꿀 수 있는 설정값</td><td>🎛️ 오디오의 볼륨 손잡이</td><td>6장</td></tr>
  </tbody>
</table>

<div class="box tip"><div class="box-t">💡 ROS 그림 읽는 법</div>
이 강좌의 모든 그림은 ROS 의 그래프 도구 <b>rqt_graph</b> 와 같은 관례를 따릅니다. <b>노드 = 파란 타원</b>, <b>토픽 = 초록 사각형</b>, 서비스 = 주황, 액션 = 보라. 화살표는 데이터가 흐르는 방향입니다.</div>

<p>맛보기로, ROS 2 에 기본으로 들어 있는 데모 노드 두 개를 띄워 "노드 두 개가 토픽 하나로 대화하는" 가장 작은 그래프를 만들어 봅시다. 명령 끝의 <code>&amp;</code> 는 "뒤에서(백그라운드로) 실행하고 터미널은 계속 쓰기"라는 뜻입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_cpp talker &amp;
ros2 run demo_nodes_py listener &amp;
ros2 node list</code></pre>
<p>이제 둘의 연결을 그림으로 확인합니다. <code>rqt_graph</code> 창에서 <code>/talker</code> → <code>/chatter</code> → <code>/listener</code> 가 보이면 성공입니다. 자세한 의미는 2장에서 배워요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic list
rqt_graph</code></pre>`
    },

    /* ================================================================ 5 */
    {
      title: 'ROS 2 는 어디에 쓰일까? — 실제 활용 사례',
      html: `
<p>ROS 는 이제 연구실을 넘어 공장 · 물류 창고 · 자율주행차 · 우주까지 쓰입니다. 대표적인 ROS 2 프로젝트와 분야를 살펴볼까요?</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🗺️</div><b>Nav2</b><p>모바일 로봇이 지도 위에서 목적지까지 장애물을 피해 가게 하는 내비게이션 스택. 16장에서 직접 다룹니다.</p></div>
  <div class="card purple"><div class="ci">🦾</div><b>MoveIt 2</b><p>로봇팔의 충돌 없는 움직임을 계획하는 조작(manipulation) 프레임워크. 17장.</p></div>
  <div class="card orange"><div class="ci">🚗</div><b>자율주행</b><p>오픈소스 자율주행 소프트웨어 <b>Autoware</b> 가 ROS 2 위에서 만들어졌습니다.</p></div>
  <div class="card teal"><div class="ci">🏭</div><b>산업 · 물류</b><p>ROS-Industrial 커뮤니티, 물류 창고의 AMR(자율 이동 로봇), 협동 로봇 드라이버.</p></div>
  <div class="card red"><div class="ci">🚀</div><b>우주 · 항공</b><p>우주 환경에 맞춘 Space ROS 프로젝트, 드론(PX4 와 ROS 2 연동).</p></div>
  <div class="card green"><div class="ci">🎓</div><b>교육 · 연구</b><p>TurtleBot 같은 교육용 로봇, 대학 연구실 대부분이 ROS 2 로 실험합니다.</p></div>
</div>

<div class="box note"><div class="box-t">📝 같은 저자의 연계 강좌 — 진짜 로봇으로 이어 가기</div>
<div class="cards c2">
  <div class="card orange"><div class="ci">🦾</div><b>SO-ARM101 로봇팔</b><p>저렴한 오픈소스 로봇팔로 URDF · ros2_control · MoveIt 2 · LeRobot 까지.<br><a href="https://samcho93.github.io/studySOArm101/" target="_blank" rel="noopener">SO-ARM101 강좌 열기 →</a></p></div>
  <div class="card blue"><div class="ci">🐕</div><b>Unitree Go2 사족보행</b><p>unitree_ros2 · LiDAR SLAM · MuJoCo 시뮬레이터로 보행 로봇 다루기.<br><a href="https://samcho93.github.io/studyGo2/" target="_blank" rel="noopener">Go2 강좌 열기 →</a></p></div>
</div>
이 강좌의 17장 · 18장에서 두 로봇의 ROS 2 시뮬레이터를 브라우저에서 직접 움직여 봅니다.</div>

<div class="box trend"><div class="box-t">🚀 최신 동향</div>
최근에는 ROS 2 와 <b>AI</b> 가 빠르게 결합하고 있습니다. 모방학습(사람의 시연을 보고 배우기) 데이터를 ROS 2 로 모으고, 학습한 정책을 ROS 2 노드로 로봇에 올리는 흐름이 대표적입니다(19장). 통신 쪽에서는 넓은 네트워크에 강한 <b>Zenoh</b> 미들웨어가 공식 지원되기 시작했습니다(11장).</div>`
    },

    /* ================================================================ 6 */
    {
      title: '배포판(Distribution)과 LTS — 왜 Jazzy 일까?',
      html: `
<p>ROS 2 는 매년 <b>5월 23일(세계 거북이의 날)</b> 무렵 새 <b>배포판(distribution, distro)</b>을 냅니다. 배포판은 "서로 잘 맞게 검증된 ROS 패키지들의 묶음"으로, 이름은 알파벳 순서로 붙는 거북이 이름입니다(Humble → Iron → Jazzy → Kilted → Lyrical …).</p>
<p>짝수 해에 나오는 배포판은 <b>LTS(Long Term Support, 장기 지원)</b>로 5년간 버그 · 보안 수정을 받고, 홀수 해 배포판은 약 1.5년만 지원됩니다. 로봇 제품이나 긴 프로젝트는 LTS 를 씁니다.</p>
{{fig:distroTable}}
<p class="t-mu">※ 날짜는 ROS 2 공식 문서(docs.ros.org)의 배포판 목록 기준입니다.</p>

<div class="stats">
  <div class="stat green"><b>Jazzy</b><span>이 강좌 기준 (LTS)</span></div>
  <div class="stat blue"><b>Ubuntu 24.04</b><span>짝이 되는 운영체제</span></div>
  <div class="stat orange"><b>~2029-05</b><span>지원 종료 예정</span></div>
  <div class="stat purple"><b>Gazebo Harmonic</b><span>짝이 되는 시뮬레이터</span></div>
</div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 최신판이 아니라 Jazzy 를 고른 이유</div>
2026년 5월에 새 LTS 인 <b>Lyrical Luth</b>(Ubuntu 26.04)가 나왔습니다. 하지만 실제 로봇 드라이버 · 교재 · 제조사 패키지(예: Unitree, 로봇팔 드라이버)는 새 배포판을 따라잡는 데 시간이 걸립니다. 그래서 이 강좌는 <b>자료와 패키지가 가장 풍부한 LTS 인 Jazzy</b> 를 기준으로 합니다. 이 강좌에서 배우는 명령 · 코드는 Humble · Kilted · Lyrical 에서도 거의 그대로 쓸 수 있습니다.</div>

<div class="box warn"><div class="box-t">⚠ 배포판과 Ubuntu 버전은 짝이 정해져 있어요</div>
Jazzy 의 apt 패키지는 <b>Ubuntu 24.04</b> 용으로 만들어집니다. Ubuntu 22.04 에 Jazzy 를 apt 로 설치할 수는 없어요(Humble 을 써야 함). 1장에서 설치할 때 꼭 확인합니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '이 강좌의 브라우저 실습 환경',
      html: `
<p>ROS 2 를 배우려면 보통 Ubuntu 를 설치해야 합니다(1장). 하지만 이 강좌는 <b>설치하기 전에도</b> 바로 실습할 수 있도록, 웹 페이지 안에 <b>작은 ROS 2 그래프(WebROS)</b>를 넣어 두었습니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">🖥️</div><b>터미널</b><p><code>ros2 run</code>, <code>ros2 topic</code>, <code>ros2 service</code> 같은 명령이 실제와 같은 출력으로 동작합니다.</p></div>
  <div class="card green"><div class="ci">🐍</div><b>파이썬 실습기</b><p>진짜 <b>rclpy</b> 코드가 브라우저(Pyodide)에서 돌아 거북이 · 로봇을 움직입니다.</p></div>
  <div class="card orange"><div class="ci">🐢</div><b>시뮬레이터 · 도구</b><p>turtlesim, rqt_graph, RViz2 라이트, 모바일 로봇 · 로봇팔 · Go2 시뮬레이터.</p></div>
</div>
<p>한 페이지의 모든 위젯은 <b>같은 ROS 그래프</b>를 공유합니다. 파이썬으로 만든 노드를 터미널에서 <code>ros2 node list</code> 로 볼 수 있다는 뜻이에요. 먼저 터미널로 거북이 시뮬레이터를 확인해 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 node list
ros2 topic list
ros2 pkg executables turtlesim</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 첫 실습</div>
<ol>
  <li>오른쪽 거북이 화면 아래의 방향 버튼(▲ ⟲ ▼ ⟳)을 눌러 거북이를 움직여 보세요.</li>
  <li>왼쪽 터미널에 <code>ros2 node list</code> 를 입력하세요. <code>/turtlesim</code> 노드가 보이나요?</li>
  <li><code>ros2 topic list</code> 로 거북이가 쓰는 토픽(<code>/turtle1/cmd_vel</code>, <code>/turtle1/pose</code> …)을 확인하세요.</li>
  <li><code>ros2 topic echo /turtle1/pose</code> 를 실행한 채 거북이를 움직이면 위치가 바뀌는 게 보입니다. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춰요.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=첫 실습 — 터미널과 turtlesim}}

<p>이번에는 파이썬으로 가장 짧은 ROS 2 프로그램을 실행해 봅시다. 노드를 하나 만들고 로그를 찍은 뒤 끝나는 코드입니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node


def main():
    rclpy.init()
    node = Node('hello_node')
    node.get_logger().info('안녕하세요, ROS 2!')
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 파이썬 노드</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>을 누르세요. <code>[INFO] [...] [hello_node]: 안녕하세요, ROS 2!</code> 가 나오면 성공!</li>
  <li><code>'안녕하세요, ROS 2!'</code> 를 여러분의 이름으로 바꿔 다시 실행해 보세요.</li>
  <li><code>Node('hello_node')</code> 의 이름을 <code>'my_first_node'</code> 로 바꾸면 로그의 대괄호 안 이름이 어떻게 바뀌나요?</li>
</ol></div>
{{widget:pylab|ex=hello}}

<div class="box note"><div class="box-t">📝 브라우저 실습의 한계</div>
WebROS 는 학습용으로 만든 <b>흉내</b>입니다. 명령 · 코드 · 출력 형식은 실제 ROS 2 Jazzy 와 같게 맞췄지만, 실제 DDS 네트워크 · 하드웨어 · Gazebo 3D 물리 엔진은 없습니다. 1장에서 진짜 ROS 2 를 설치해 같은 명령을 꼭 실행해 보세요.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '학습 로드맵 — 22장으로 가는 길',
      html: `
<p>이 강좌는 <b>6부 22장</b>으로 이루어져 있습니다. 앞부분에서 ROS 2 그래프의 개념을 확실히 익힌 뒤, 코드를 짜고, 로봇을 표현 · 시뮬레이션하고, 마지막에 실제 로봇 응용으로 나아갑니다.</p>
{{fig:roadmap}}
<table class="tbl">
  <thead><tr><th>부</th><th>장</th><th>무엇을 할 수 있게 되나</th></tr></thead>
  <tbody>
    <tr><td>1부 시작하기</td><td>0 개념 · 1 설치와 turtlesim</td><td>ROS 2 를 설치하고 거북이를 움직인다</td></tr>
    <tr><td>2부 그래프의 핵심</td><td>2 노드 · 토픽, 3 메시지, 4 서비스, 5 액션, 6 파라미터</td><td>명령줄 도구로 어떤 ROS 시스템이든 들여다본다</td></tr>
    <tr><td>3부 코드로 만들기</td><td>7 패키지 · colcon, 8 rclpy 퍼블리셔, 9 서비스 · 액션 코드, 10 런치, 11 QoS · DDS</td><td>나만의 노드와 패키지를 만든다</td></tr>
    <tr><td>4부 표현하고 보기</td><td>12 TF2, 13 URDF · RViz2, 14 도구 모음, 15 Gazebo · ros2_control</td><td>로봇의 모양과 좌표계를 다루고 시뮬레이션한다</td></tr>
    <tr><td>5부 이동 · 조작 · 보행</td><td>16 SLAM · Nav2, 17 MoveIt 2 · SO-ARM101, 18 Unitree Go2</td><td>지도를 만들고, 팔을 움직이고, 사족보행 로봇을 걷게 한다</td></tr>
    <tr><td>6부 확장과 실전</td><td>19 비전 · AI, 20 micro-ROS · 웹 · Docker, 21 종합 프로젝트</td><td>카메라 · 마이크로컨트롤러 · 웹을 엮어 작품을 만든다</td></tr>
  </tbody>
</table>
<p>ROS 2 에는 이 모든 장에서 쓸 패키지가 이미 가득합니다. 설치된 패키지 목록과, 한 패키지 안의 실행 파일 목록을 보는 명령으로 로드맵 구경을 마무리해 볼까요?</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 pkg list
ros2 pkg executables demo_nodes_py</code></pre>
<div class="box tip"><div class="box-t">💡 공부 요령</div>
<ul>
  <li>각 장의 <b>🧪 해 보기</b> 상자를 꼭 따라 하세요. ROS 는 읽는 것보다 <b>명령을 쳐 보는 것</b>이 훨씬 빨리 익숙해집니다.</li>
  <li>막히면 <b>부록의 실습실</b>(터미널 · 파이썬 · turtlesim 을 한 화면에)과 <b>명령어 치트시트</b>를 활용하세요.</li>
  <li>새 용어가 헷갈리면 <b>용어 사전</b>을 찾아보세요.</li>
</ul></div>`
    }
  ],

  videos: [
    { title: '10 things you need to know about ROS! | Getting Ready to Build Robots with ROS #4', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=KAASuA3_4eg', lang: 'en', desc: '노드 · 토픽 · 서비스 · 파라미터 · 패키지 등 ROS 핵심 개념 10가지를 그림으로 훑어봅니다. 오늘 배운 개념 미리 보기의 복습용.' },
    { title: 'Five Things You Need Before Starting With ROS | Getting Ready to Build Robots with ROS #1', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=2lIV3dRvHmQ', lang: 'en', desc: 'ROS 를 시작하기 전에 갖춰야 할 리눅스 · 터미널 · 네트워크 기초를 정리해 줍니다.' },
    { title: 'ROS1 vs ROS2 - Practical Overview for ROS Developers', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=yn638LmVwlw', lang: 'en', desc: '마스터 유무, 빌드 도구, 런치 파일 등 ROS 1 과 ROS 2 의 실제 차이를 코드와 함께 비교합니다.' },
    { title: 'Introduction to ROS Part 1: What is the Robot Operating System?', channel: 'DigiKey', url: 'https://www.youtube.com/watch?v=mjrxf8EFSb8', lang: 'en', desc: 'ROS 가 무엇이고 왜 쓰는지, ROS 2 의 구조와 DDS 를 입문자 눈높이로 설명합니다.' },
    { title: '[ROS 2] 01강 ROS 2란? | 강의: Roadbalance.com 김수영 대표', channel: 'Developers and Creators', url: 'https://www.youtube.com/watch?v=X9uYIumhU8E', lang: 'ko', desc: '한국어 강의. ROS 2 의 개념과 필요성을 차근차근 설명합니다.' },
    { title: '[ROS2] 입문편 한 번에 몰아보기 | R2R 입문', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=aFMDvkCr9vY', lang: 'ko', desc: '한국어로 ROS 2 입문 내용을 한 번에 정리한 긴 강의. 앞으로 배울 내용을 미리 훑어보기 좋습니다.' }
  ],

  terms: [
    ['ROS (Robot Operating System)', '로봇 소프트웨어를 만들기 위한 오픈소스 프레임워크. 이름과 달리 운영체제가 아니라 미들웨어 · 도구 · 패키지 · 생태계의 묶음'],
    ['프레임워크', '자주 필요한 기능과 구조를 미리 만들어 두어, 개발자가 그 위에서 자기 기능만 채우게 해 주는 소프트웨어 틀'],
    ['미들웨어 (middleware)', '운영체제와 응용 프로그램 사이에서 프로그램끼리의 통신 같은 복잡한 일을 대신 처리해 주는 소프트웨어'],
    ['DDS', 'Data Distribution Service. 산업 · 국방에서 쓰는 실시간 발행/구독 통신 표준. ROS 2 통신의 바탕'],
    ['RMW', 'ROS MiddleWare interface. DDS 구현(Fast DDS · Cyclone DDS · Zenoh 등)을 갈아 끼울 수 있게 해 주는 층'],
    ['roscore (마스터)', 'ROS 1 에서 노드들의 위치를 알려 주던 중앙 서버. ROS 2 에는 없음'],
    ['노드 (node)', '한 가지 일을 맡은 작은 실행 프로그램. ROS 그래프의 기본 단위'],
    ['토픽 (topic)', '이름 붙은 방송 채널. 퍼블리셔가 발행한 메시지를 서브스크라이버들이 받음'],
    ['서비스 · 액션', '서비스는 요청-응답 한 번, 액션은 오래 걸리는 목표 + 피드백 + 결과(취소 가능) 통신'],
    ['파라미터 (parameter)', '노드가 가진 이름 붙은 설정값. 실행 중에 바꿀 수 있음'],
    ['배포판 (distribution)', '서로 호환되게 검증된 ROS 패키지 묶음의 버전. 예: Humble, Jazzy, Kilted, Lyrical'],
    ['LTS', 'Long Term Support. 5년간 지원되는 배포판(짝수 해 출시). Jazzy 는 2029년 5월까지'],
    ['EOL', 'End Of Life. 지원 종료. 더 이상 버그 · 보안 수정이 나오지 않음 (ROS 1 Noetic: 2025-05-31)'],
    ['rclpy / rclcpp', 'ROS 2 를 파이썬 / C++ 로 쓰게 해 주는 클라이언트 라이브러리']
  ],

  summary: [
    '로봇 소프트웨어는 <b>작은 프로그램 여러 개가 메시지로 대화</b>하는 구조로 만들고, ROS 는 그 구조를 표준으로 제공해 <b>바퀴의 재발명</b>을 막는다',
    'ROS 는 운영체제가 아니라 <b>배관(미들웨어) + 도구 + 기능 패키지 + 생태계</b>이며, 보통 Ubuntu 위에 설치한다',
    'ROS 2 는 ROS 1 의 중앙 마스터를 없애고 <b>DDS 로 노드끼리 직접 탐색</b>하며, QoS · 보안 · 다중 플랫폼을 지원한다. ROS 1 은 <b>2025-05-31</b> 에 지원이 끝났다',
    'ROS 그래프의 다섯 개념: <b>노드 · 토픽 · 서비스 · 액션 · 파라미터</b> (그림 관례: 노드 = 파란 타원, 토픽 = 초록 사각형)',
    '배포판은 매년 5월에 나오고 짝수 해가 <b>LTS(5년)</b>. 이 강좌는 <b>Jazzy Jalisco + Ubuntu 24.04</b> 기준',
    '이 사이트의 터미널 · 파이썬 실습기 · 시뮬레이터는 <b>같은 ROS 그래프를 공유</b>하므로 설치 전에도 바로 실습할 수 있다'
  ],

  quiz: [
    { q: 'ROS 에 대한 설명으로 <b>옳은</b> 것은?', options: ['윈도우를 대신하는 새로운 운영체제다', '리눅스 커널을 로봇용으로 고친 것이다', '운영체제 위에서 도는 미들웨어 · 도구 · 패키지의 묶음이다', '로봇 회사 한 곳만 쓰는 상용 프로그램이다'], answer: 2, explain: '이름에 OS 가 들어 있지만 ROS 는 Ubuntu 같은 운영체제 위에 설치하는 프레임워크입니다. 통신 미들웨어, 개발 도구, 로봇 기능 패키지, 커뮤니티가 합쳐진 것이에요.' },
    { q: 'ROS 1 과 비교한 ROS 2 의 가장 큰 구조적 차이는?', options: ['파이썬을 쓸 수 없다', '중앙 마스터(roscore) 없이 DDS 로 노드끼리 서로를 찾는다', '노드를 하나만 실행할 수 있다', '토픽 대신 이메일로 통신한다'], answer: 1, explain: 'ROS 1 은 roscore 가 전화번호부 역할을 했지만, ROS 2 는 DDS 의 자동 탐색(discovery) 덕분에 중앙 서버가 없습니다. 마스터가 죽어서 전체가 멈추는 문제가 사라졌어요.' },
    { q: '"오래 걸리는 일을 맡기고, 진행 상황(피드백)을 받다가, 필요하면 취소할 수 있는" 통신 방식은?', options: ['토픽', '서비스', '액션', '파라미터'], answer: 2, explain: '액션은 목표(goal) → 피드백(feedback) → 결과(result) 구조이고 취소도 됩니다. "저기까지 가 줘" 같은 내비게이션 명령이 대표적인 액션이에요(5장).' },
    { q: '이 강좌의 기준 환경으로 알맞은 짝은?', options: ['ROS 2 Humble + Ubuntu 24.04', 'ROS 2 Jazzy + Ubuntu 24.04', 'ROS 1 Noetic + Ubuntu 20.04', 'ROS 2 Jazzy + Ubuntu 22.04'], answer: 1, explain: 'Jazzy Jalisco 는 Ubuntu 24.04(Noble) 용 LTS 배포판입니다. Humble 은 Ubuntu 22.04 와 짝이고, Noetic 은 지원이 끝난 ROS 1 입니다.' },
    { q: 'LTS 배포판에 대한 설명으로 옳은 것은?', options: ['매달 새로 나온다', '5년간 버그 · 보안 수정을 받는 장기 지원판이다', '실험용이라 제품에는 쓰지 않는다', 'ROS 1 에만 있는 개념이다'], answer: 1, explain: 'ROS 2 는 짝수 해 5월에 LTS 를 내고 약 5년간 지원합니다(Humble ~2027-05, Jazzy ~2029-05, Lyrical ~2031-05). 홀수 해 배포판은 약 1.5년 지원입니다.' },
    { q: '인터넷에서 찾은 자료에 <code>rosrun</code>, <code>rostopic echo</code>, <code>catkin_make</code> 가 나온다. 이 자료는?', options: ['ROS 2 Jazzy 최신 자료', 'ROS 1 자료', 'Gazebo 자료', 'DDS 설정 자료'], answer: 1, explain: 'rosrun · rostopic · catkin_make 는 ROS 1 명령입니다. ROS 2 는 ros2 run · ros2 topic · colcon build 처럼 ros2 로 시작합니다.' }
  ],

  slides: [
    {
      title: '로봇 안에는 프로그램이 몇 개?',
      layout: 'center',
      html: `<div class="s-big">로봇 청소기 한 대 안에서도<br><b>수십 개의 프로그램</b>이 동시에 대화합니다</div>
<div class="cards c3">
  <div class="card blue step"><div class="ci">📡</div><b>센서</b><p>라이다 · 범퍼 · 배터리</p></div>
  <div class="card orange step"><div class="ci">🧠</div><b>판단</b><p>지도 · 경로 계획</p></div>
  <div class="card green step"><div class="ci">⚙️</div><b>구동</b><p>바퀴 · 흡입 모터</p></div>
</div>`,
      notes: '도입 발문: “이 로봇 안에 프로그램이 몇 개나 돌까요?” 답을 받은 뒤 → 키로 세 카드를 하나씩 보여 주며, 기능마다 프로그램이 나뉘고 서로 데이터를 주고받아야 한다는 점을 끌어냅니다. (3분)'
    },
    {
      title: '바퀴의 재발명',
      html: `{{fig:reinvent|nocap}}`,
      notes: '왼쪽: 연구실마다 같은 드라이버 · 지도 코드를 새로 짬. 오른쪽: 공통 부품을 나눠 쓰고 새로운 것에 집중. 질문: “여러분이 스마트폰 앱을 만들 때 카메라 드라이버부터 짜나요?” → 안드로이드/iOS 가 제공하듯 ROS 가 로봇에 그 역할. (4분)'
    },
    {
      title: 'ROS = 배관 + 도구 + 기능 + 생태계',
      html: `{{fig:rosEq|nocap}}`,
      notes: '“OS 라는데 윈도우 대신 설치하나요?” 하고 물어 오해를 먼저 드러낸 뒤, 운영체제가 아니라 Ubuntu 위의 프레임워크임을 강조합니다. 네 요소 중 이번 강좌 전반부는 배관과 도구, 후반부는 기능 패키지를 다룬다고 안내하세요. (4분)'
    },
    {
      title: 'ROS 2 의 층 구조',
      html: `{{fig:stack|nocap}}`,
      notes: '우리 코드는 rclpy/rclcpp 만 부른다는 것이 핵심. RMW 덕분에 DDS 를 갈아 끼울 수 있다(Fast DDS 기본, Cyclone, Zenoh)는 것은 이름만 들려주고 11장으로 미룹니다. (3분)'
    },
    {
      title: 'ROS 의 발자취',
      html: `<ol class="timeline">
  <li class="gray step"><span class="tl-y">2007</span><b>Willow Garage 에서 시작</b></li>
  <li class="blue step"><span class="tl-y">2010</span><b>ROS 1 Box Turtle</b></li>
  <li class="purple step"><span class="tl-y">2017</span><b>ROS 2 Ardent</b></li>
  <li class="green step"><span class="tl-y">2024</span><b>Jazzy (LTS) — 이 강좌</b></li>
  <li class="red step"><span class="tl-y">2025</span><b>ROS 1 지원 종료 (05-31)</b></li>
</ol>`,
      notes: '연도를 하나씩 공개합니다. 핵심 메시지: ROS 1 은 연구실용으로 시작 → 산업 요구(여러 로봇, 실시간, 보안) 때문에 ROS 2 로 재설계 → 2025년에 ROS 1 은 끝났으니 지금은 ROS 2 만 배우면 된다. (3분)'
    },
    {
      title: '마스터 vs 분산 탐색',
      html: `{{fig:masterVsDds|nocap}}`,
      notes: '비유: ROS 1 은 “교환원이 연결해 주는 옛날 전화”, ROS 2 는 “같은 방에서 이름을 부르면 서로 알아듣는 모임”. 발문: “교환원이 퇴근하면 어떻게 될까요?” (새 연결 불가) (4분)'
    },
    {
      title: '직접 비교해 보기 — ROS 1 vs ROS 2',
      html: `{{widget:ros1vs2}}`,
      notes: 'ROS 1 쪽에서 roscore 를 끈 뒤 노드를 추가해 연결되지 않는 모습을 보여 주고, ROS 2 쪽에서는 노드를 추가해도 자동으로 연결되는 모습을 보여 줍니다. 학생에게 버튼을 누르게 해도 좋습니다. (5분)'
    },
    {
      title: '다섯 가지 핵심 개념',
      html: `{{fig:concepts|nocap}}`,
      notes: '노드(파란 타원) · 토픽(초록 사각형) · 서비스(주황) · 액션(보라) · 파라미터를 손으로 짚으며 비유(요리사 · 라디오 · 전화 · 배달 · 볼륨 손잡이)로 소개합니다. 지금은 이름만 익히면 된다고 안심시킵니다. (5분)'
    },
    {
      title: 'ROS 2 는 어디에?',
      html: `<div class="cards c3">
  <div class="card blue step"><div class="ci">🗺️</div><b>Nav2</b><p>모바일 로봇 내비게이션</p></div>
  <div class="card purple step"><div class="ci">🦾</div><b>MoveIt 2</b><p>로봇팔 동작 계획</p></div>
  <div class="card orange step"><div class="ci">🚗</div><b>Autoware</b><p>자율주행</p></div>
  <div class="card teal step"><div class="ci">🏭</div><b>산업 · 물류</b><p>AMR · 협동 로봇</p></div>
  <div class="card red step"><div class="ci">🚀</div><b>Space ROS</b><p>우주 로봇</p></div>
  <div class="card green step"><div class="ci">🐕</div><b>SO-ARM101 · Go2</b><p>연계 강좌</p></div>
</div>`,
      notes: '각 카드를 공개하며 짧은 사례를 말합니다. 마지막 카드에서 같은 저자의 SO-ARM101 · Go2 강좌를 소개하고, 17 · 18장에서 브라우저 시뮬레이터로 만난다고 예고합니다. (4분)'
    },
    {
      title: '배포판과 LTS',
      html: `{{fig:distroTable|nocap}}
<p class="s-small">짝수 해 = LTS(5년) · 매년 5월 23일(세계 거북이의 날) 무렵 출시</p>`,
      notes: '이름이 알파벳 순서의 거북이라는 점을 재미있게 소개합니다. Lyrical 이 최신 LTS 지만 패키지 · 자료가 풍부한 Jazzy 를 기준으로 한다는 이유를 설명하고, 배포판과 Ubuntu 버전의 짝이 정해져 있음을 강조하세요. (4분)'
    },
    {
      title: '브라우저에서 바로 ROS 2',
      html: `{{widget:lab|with=turtlesim|title=터미널 + turtlesim}}`,
      notes: '강사가 먼저 방향 버튼으로 거북이를 움직이고, ros2 node list · ros2 topic list 를 입력해 보여 줍니다. 이어 ros2 topic echo /turtle1/pose 를 켠 채 거북이를 움직여 숫자가 바뀌는 것을 보여 주면 “살아 있는 시스템”이라는 느낌을 줄 수 있습니다. (6분)'
    },
    {
      title: '첫 파이썬 노드',
      html: `{{widget:pylab|ex=hello}}`,
      notes: '실행 버튼을 누르고 로그 형식 [INFO] [시각] [노드 이름]: 내용 을 짚어 줍니다. 학생들에게 메시지를 자기 이름으로 바꿔 실행해 보게 하세요. 코드 한 줄 한 줄은 8장에서 자세히 배운다고 안내합니다. (5분)'
    },
    {
      title: '22장 여행 지도',
      html: `{{fig:roadmap|nocap}}`,
      notes: '6부 구성을 한 바퀴 설명하고, 다음 시간(1장)에는 실제 Ubuntu 에 ROS 2 Jazzy 를 설치한다고 예고합니다. 집에 Ubuntu PC 가 없는 학생은 WSL2 · Docker 방법도 있으니 걱정하지 말라고 안내하세요. (3분)'
    }
  ]
});
