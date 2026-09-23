/* 5장 — 액션: 오래 걸리는 일 맡기기 */
Course.lesson({
  id: 'ch05', no: '05',
  icon: '🎯',
  title: '액션 — 오래 걸리는 일 맡기기',
  subtitle: '"저기까지 가 줘. 가는 동안 어디쯤인지 알려 주고, 필요하면 취소할게!"',
  level: '입문', time: '110분',
  goals: [
    '액션의 목표(goal) · 피드백(feedback) · 결과(result) · 취소(cancel)를 배달 앱 비유로 설명할 수 있다',
    '액션이 서비스 3개와 토픽 2개로 만들어진다는 것을 그림으로 그릴 수 있다',
    'ros2 action list · info · send_goal --feedback 으로 turtlesim 과 Fibonacci 액션을 실행할 수 있다',
    '목표 상태(ACCEPTED · EXECUTING · CANCELING · SUCCEEDED · CANCELED · ABORTED)의 흐름을 설명할 수 있다',
    '주어진 상황에 토픽 · 서비스 · 액션 중 무엇이 알맞은지 고를 수 있다'
  ],
  teacher: {
    intro: '“배달 앱으로 치킨을 시키면 주문하고 끝인가요? 아니면 앱에서 무엇을 계속 보여 주나요?” 하고 물어봅니다. ‘조리 중 → 배달 출발 → 도착 5분 전’ 같은 진행 상황, 그리고 ‘주문 취소’ 버튼이 떠오르면 오늘 배울 액션의 네 요소가 모두 나온 것입니다. (2분)',
    flow: '① 도입 · 배달 앱 비유 10분 → ② 액션의 속(서비스 3 + 토픽 2) + comm 위젯 15분 → ③ turtle_teleop_key 로 회전 액션 체험 10분 → ④ ros2 action 명령 · send_goal 15분 → ⑤ 목표 상태 · 취소 · 중단 실험 15분 → ⑥ Fibonacci 서버/클라이언트 20분 → ⑦ 파이썬 RotateAbsolute 10분 → ⑧ 무엇을 고를까 · 실제 로봇 예 · 정리 15분'
  },

  figs: {
    /* ---------------------------------------------------------------- 배달 앱 비유 */
    delivery: {
      caption: '배달 앱 주문 = 액션. 주문(목표)을 보내면 접수 여부를 먼저 알려 주고, 진행 상황(피드백)을 계속 보내다가, 끝나면 결과를 줍니다. 중간에 취소도 할 수 있어요',
      svg: `<svg class="dg" viewBox="0 0 900 330" role="img" aria-label="배달 앱의 주문, 접수, 진행 상황, 도착, 취소를 액션의 목표, 수락, 피드백, 결과, 취소에 대응시킨 그림">
  <line x1="60" y1="150" x2="850" y2="150" class="ln thick"/>
  <circle cx="90" cy="150" r="34" class="purple"/><text x="90" y="146" class="t-lg t-c">📱</text>
  <text x="90" y="210" class="t-b t-c t-purple">목표 (Goal)</text>
  <text x="90" y="232" class="t-xs t-c">"치킨 1마리"</text>

  <circle cx="230" cy="150" r="30" class="teal"/><text x="230" y="146" class="t-lg t-c">✅</text>
  <text x="230" y="210" class="t-b t-c t-teal">수락</text>
  <text x="230" y="232" class="t-xs t-c">"주문 접수!"</text>

  <circle cx="380" cy="150" r="26" class="green pulse"/><text x="380" y="146" class="t-c">🍳</text>
  <circle cx="500" cy="150" r="26" class="green pulse"/><text x="500" y="146" class="t-c">🛵</text>
  <circle cx="620" cy="150" r="26" class="green pulse"/><text x="620" y="146" class="t-c">📍</text>
  <text x="500" y="210" class="t-b t-c t-green">피드백 (Feedback) — 여러 번</text>
  <text x="500" y="232" class="t-xs t-c">"조리 중" → "배달 출발" → "도착 5분 전"</text>

  <circle cx="790" cy="150" r="34" class="blue"/><text x="790" y="146" class="t-lg t-c">🍗</text>
  <text x="790" y="210" class="t-b t-c t-blue">결과 (Result)</text>
  <text x="790" y="232" class="t-xs t-c">"배달 완료"</text>

  <rect x="300" y="36" width="300" height="46" rx="10" class="red"/>
  <text x="450" y="59" class="t-sm t-c t-b">❌ 취소 (Cancel) — 도중에 언제든</text>
  <path d="M450,84 L450,118" class="ln-red ar-red dash"/>

  <rect x="120" y="270" width="660" height="44" rx="10" class="box"/>
  <text x="450" y="292" class="t-sm t-c">서비스는 "주문 → 도착" 두 칸뿐, 액션은 <tspan class="t-b">중간 과정과 취소</tspan>가 더 있다</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 서비스 3 + 토픽 2 */
    actionParts: {
      caption: '액션 하나 = 서비스 3개(send_goal · cancel_goal · get_result) + 토픽 2개(feedback · status). 이름 뒤에 숨은 _action/ 이 붙습니다',
      svg: `<svg class="dg" viewBox="0 0 900 420" role="img" aria-label="액션 클라이언트와 서버 사이의 서비스 세 개와 토픽 두 개">
  <ellipse cx="120" cy="210" rx="100" ry="54" class="blue"/>
  <text x="120" y="202" class="t-b t-c t-blue">액션 클라이언트</text>
  <text x="120" y="226" class="t-xs t-c t-mono">/teleop_turtle</text>
  <ellipse cx="780" cy="210" rx="100" ry="54" class="blue"/>
  <text x="780" y="202" class="t-b t-c t-blue">액션 서버</text>
  <text x="780" y="226" class="t-xs t-c t-mono">/turtlesim</text>

  <rect x="240" y="20" width="420" height="384" rx="16" class="purple dash"/>
  <text x="450" y="44" class="t-b t-c t-purple t-mono">/turtle1/rotate_absolute</text>

  <rect x="270" y="62" width="360" height="46" rx="8" class="orange"/>
  <text x="450" y="80" class="t-sm t-c t-b">① 서비스 send_goal</text>
  <text x="450" y="98" class="t-xs t-c t-mono">목표 보내기 → 수락/거절</text>
  <rect x="270" y="120" width="360" height="46" rx="8" class="orange"/>
  <text x="450" y="138" class="t-sm t-c t-b">② 서비스 get_result</text>
  <text x="450" y="156" class="t-xs t-c t-mono">결과 요청 → 끝날 때 응답</text>
  <rect x="270" y="178" width="360" height="46" rx="8" class="orange"/>
  <text x="450" y="196" class="t-sm t-c t-b">③ 서비스 cancel_goal</text>
  <text x="450" y="214" class="t-xs t-c t-mono">취소 요청 → 취소 수락 여부</text>

  <rect x="270" y="252" width="360" height="46" rx="8" class="green"/>
  <text x="450" y="270" class="t-sm t-c t-b">④ 토픽 feedback</text>
  <text x="450" y="288" class="t-xs t-c t-mono">진행 상황 (서버 → 클라이언트)</text>
  <rect x="270" y="310" width="360" height="46" rx="8" class="green"/>
  <text x="450" y="328" class="t-sm t-c t-b">⑤ 토픽 status</text>
  <text x="450" y="346" class="t-xs t-c t-mono">모든 목표의 상태 목록</text>
  <text x="450" y="386" class="t-xs t-c t-mu t-mono">실제 이름: /turtle1/rotate_absolute/_action/send_goal …</text>

  <path d="M216,190 L266,85" class="ln-orange ar-orange"/>
  <path d="M216,200 L266,143" class="ln-orange ar-orange"/>
  <path d="M216,210 L266,201" class="ln-orange ar-orange"/>
  <path d="M634,85 L684,190" class="ln-orange ar-orange"/>
  <path d="M634,143 L684,200" class="ln-orange ar-orange"/>
  <path d="M634,201 L684,210" class="ln-orange ar-orange"/>
  <path d="M684,236 L634,275" class="ln-green ar-green"/>
  <path d="M684,246 L634,333" class="ln-green ar-green"/>
  <path d="M266,275 L216,232" class="ln-green ar-green"/>
  <path d="M266,333 L216,244" class="ln-green ar-green"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 시간 순서 */
    sequence: {
      caption: '액션 한 번의 시간 순서 — 목표 수락 → 결과 요청(대기) → 피드백 여러 번 → 결과 응답',
      svg: `<svg class="dg" viewBox="0 0 880 420" role="img" aria-label="액션 클라이언트와 서버 사이의 시간 순서 다이어그램">
  <rect x="80" y="14" width="160" height="40" rx="8" class="blue"/><text x="160" y="34" class="t-b t-c">클라이언트</text>
  <rect x="640" y="14" width="160" height="40" rx="8" class="blue"/><text x="720" y="34" class="t-b t-c">서버</text>
  <line x1="160" y1="56" x2="160" y2="408" class="ln dash"/>
  <line x1="720" y1="56" x2="720" y2="408" class="ln dash"/>

  <path d="M162,80 L716,80" class="ln-orange ar-orange"/><text x="440" y="72" class="t-sm t-c t-orange">send_goal 요청 {theta: 1.57}</text>
  <path d="M718,112 L164,112" class="ln-orange ar-orange dash"/><text x="440" y="104" class="t-sm t-c t-orange">응답: accepted = true (+ goal ID)</text>
  <path d="M162,146 L716,146" class="ln-orange ar-orange"/><text x="440" y="138" class="t-sm t-c t-orange">get_result 요청 (끝날 때까지 응답 보류)</text>

  <rect x="700" y="160" width="40" height="170" rx="6" class="purple"/>
  <text x="790" y="248" class="t-xs t-c t-purple">실행 중</text>
  <path d="M718,184 L164,184" class="ln-green ar-green"/><text x="440" y="178" class="t-xs t-c t-green">feedback: remaining 1.2</text>
  <path d="M718,218 L164,218" class="ln-green ar-green"/><text x="440" y="212" class="t-xs t-c t-green">feedback: remaining 0.7</text>
  <path d="M718,252 L164,252" class="ln-green ar-green"/><text x="440" y="246" class="t-xs t-c t-green">feedback: remaining 0.2</text>
  <path d="M718,286 L164,286" class="ln-green ar-green dash"/><text x="440" y="280" class="t-xs t-c t-green">status: EXECUTING → SUCCEEDED</text>

  <path d="M718,346 L164,346" class="ln-teal thick ar-teal"/><text x="440" y="338" class="t-sm t-c t-teal t-b">get_result 응답: delta = 1.57, SUCCEEDED</text>
  <rect x="250" y="370" width="380" height="32" rx="8" class="red dash"/>
  <text x="440" y="386" class="t-xs t-c">도중에 cancel_goal 요청을 보내면 → CANCELING → CANCELED</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 목표 상태 */
    goalStates: {
      caption: '목표(goal)의 상태 기계 — 초록은 성공, 회색은 취소, 빨강은 중단(실패). 끝 상태 셋 중 하나로 반드시 끝납니다',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="ACCEPTED, EXECUTING, CANCELING, SUCCEEDED, CANCELED, ABORTED 상태 전이 그림">
  <rect x="20" y="150" width="120" height="50" rx="25" class="gray dash"/>
  <text x="80" y="170" class="t-xs t-c">목표 도착</text><text x="80" y="188" class="t-xs t-c t-mu">(거절되면 끝)</text>
  <path d="M142,175 L196,175" class="ln ar"/>

  <rect x="200" y="150" width="160" height="50" rx="25" class="teal"/>
  <text x="280" y="170" class="t-b t-c t-mono">ACCEPTED</text><text x="280" y="188" class="t-xs t-c">1 · 수락됨</text>
  <path d="M362,175 L436,175" class="ln ar"/>
  <text x="400" y="164" class="t-xs t-c t-mu">execute</text>

  <rect x="440" y="150" width="170" height="50" rx="25" class="purple"/>
  <text x="525" y="170" class="t-b t-c t-mono">EXECUTING</text><text x="525" y="188" class="t-xs t-c">2 · 실행 중</text>

  <rect x="700" y="30" width="180" height="50" rx="25" class="s-green"/>
  <text x="790" y="50" class="t-b t-c t-mono tw">SUCCEEDED</text><text x="790" y="68" class="t-xs t-c tw">4 · 성공</text>
  <rect x="700" y="150" width="180" height="50" rx="25" class="s-red"/>
  <text x="790" y="170" class="t-b t-c t-mono tw">ABORTED</text><text x="790" y="188" class="t-xs t-c tw">6 · 서버가 중단</text>
  <rect x="700" y="290" width="180" height="50" rx="25" class="s-gray"/>
  <text x="790" y="310" class="t-b t-c t-mono tw">CANCELED</text><text x="790" y="328" class="t-xs t-c tw">5 · 취소 완료</text>

  <rect x="440" y="290" width="170" height="50" rx="25" class="orange"/>
  <text x="525" y="310" class="t-b t-c t-mono">CANCELING</text><text x="525" y="328" class="t-xs t-c">3 · 취소 중</text>

  <path d="M600,160 L696,62" class="ln-green ar-green"/><text x="632" y="96" class="t-xs t-green">succeed</text>
  <path d="M612,175 L696,175" class="ln-red ar-red"/><text x="654" y="166" class="t-xs t-c t-red">abort</text>
  <path d="M525,202 L525,286" class="ln-orange ar-orange"/><text x="534" y="248" class="t-xs t-orange">취소 요청 수락</text>
  <path d="M280,202 L440,300" class="ln-orange ar-orange dash"/><text x="330" y="274" class="t-xs t-orange">취소 요청</text>
  <path d="M612,315 L696,315" class="ln-gray ar-gray"/><text x="654" y="306" class="t-xs t-c t-mu">canceled</text>
  <path d="M600,300 L700,190" class="ln-red ar-red dash"/>
  <path d="M606,292 L716,82" class="ln-green ar-green dash"/>
  <text x="280" y="120" class="t-xs t-c t-mu">숫자 = action_msgs/msg/GoalStatus 의 값</text>
</svg>`
    },

    /* ---------------------------------------------------------------- teleop 회전 키 */
    teleopKeys: {
      caption: 'turtle_teleop_key 의 회전 키 — 거북이가 바라볼 "절대 방향"을 정해 RotateAbsolute 목표로 보냅니다. F 는 취소',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="E R T D G C V B 키 배치와 각 키가 가리키는 방향">
  <circle cx="220" cy="180" r="120" class="box"/>
  <text x="220" y="186" class="t-xl t-c">🐢</text>
  <line x1="220" y1="180" x2="330" y2="180" class="ln-purple ar-purple"/>
  <rect x="332" y="164" width="36" height="32" rx="6" class="purple"/><text x="350" y="180" class="t-b t-c t-mono">G</text>
  <rect x="300" y="68" width="36" height="32" rx="6" class="purple"/><text x="318" y="84" class="t-b t-c t-mono">T</text>
  <rect x="202" y="30" width="36" height="32" rx="6" class="purple"/><text x="220" y="46" class="t-b t-c t-mono">R</text>
  <rect x="104" y="68" width="36" height="32" rx="6" class="purple"/><text x="122" y="84" class="t-b t-c t-mono">E</text>
  <rect x="72" y="164" width="36" height="32" rx="6" class="purple"/><text x="90" y="180" class="t-b t-c t-mono">D</text>
  <rect x="104" y="260" width="36" height="32" rx="6" class="purple"/><text x="122" y="276" class="t-b t-c t-mono">C</text>
  <rect x="202" y="298" width="36" height="32" rx="6" class="purple"/><text x="220" y="314" class="t-b t-c t-mono">V</text>
  <rect x="300" y="260" width="36" height="32" rx="6" class="purple"/><text x="318" y="276" class="t-b t-c t-mono">B</text>
  <text x="392" y="184" class="t-xs t-mu">0</text>

  <rect x="470" y="30" width="390" height="300" rx="12" class="box"/>
  <text x="665" y="58" class="t-b t-c">키 → theta (라디안)</text>
  <text x="500" y="92" class="t-sm t-mono">G  0      (오른쪽 →)</text>
  <text x="500" y="118" class="t-sm t-mono">T  0.785  (↗)</text>
  <text x="500" y="144" class="t-sm t-mono">R  1.571  (위 ↑)</text>
  <text x="500" y="170" class="t-sm t-mono">E  2.356  (↖)</text>
  <text x="500" y="196" class="t-sm t-mono">D  3.142  (왼쪽 ←)</text>
  <text x="500" y="222" class="t-sm t-mono">C  -2.356 (↙)</text>
  <text x="500" y="248" class="t-sm t-mono">V  -1.571 (아래 ↓)</text>
  <text x="500" y="274" class="t-sm t-mono">B  -0.785 (↘)</text>
  <text x="500" y="306" class="t-sm t-b t-red">F  진행 중인 회전 취소</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 선택 흐름도 */
    decision: {
      caption: '통신 방식 고르기 — 두세 가지 질문이면 대부분 정해집니다',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="토픽, 서비스, 액션 중 무엇을 쓸지 고르는 흐름도">
  <rect x="330" y="16" width="240" height="56" rx="12" class="yellow"/>
  <text x="450" y="38" class="t-sm t-c t-b">데이터가 계속 흘러야 하나?</text>
  <text x="450" y="58" class="t-xs t-c">(센서 · 위치 · 속도 명령)</text>
  <path d="M330,44 L160,44 L160,108" class="ln-green thick ar-green"/><text x="240" y="36" class="t-xs t-c t-green t-b">예</text>
  <rect x="60" y="112" width="200" height="56" rx="8" class="green"/>
  <text x="160" y="140" class="t-lg t-c t-b">📻 토픽</text>

  <path d="M450,74 L450,120" class="ln thick ar"/><text x="468" y="102" class="t-xs t-b">아니오</text>
  <rect x="310" y="124" width="280" height="56" rx="12" class="yellow"/>
  <text x="450" y="146" class="t-sm t-c t-b">몇 초 이상 걸리거나</text>
  <text x="450" y="166" class="t-sm t-c t-b">중간 진행 · 취소가 필요한가?</text>
  <path d="M590,152 L740,152 L740,212" class="ln-purple thick ar-purple"/><text x="664" y="144" class="t-xs t-c t-purple t-b">예</text>
  <rect x="640" y="216" width="200" height="56" rx="8" class="purple"/>
  <text x="740" y="244" class="t-lg t-c t-b">🎯 액션</text>

  <path d="M450,182 L450,228" class="ln thick ar"/><text x="468" y="210" class="t-xs t-b">아니오</text>
  <rect x="350" y="232" width="200" height="56" rx="8" class="orange"/>
  <text x="450" y="260" class="t-lg t-c t-b">🔁 서비스</text>
  <text x="450" y="318" class="t-xs t-c t-mu">짧게 부탁하고 결과를 받는 일 (설정 · 조회 · 계산)</text>
  <text x="160" y="196" class="t-xs t-c t-mu">답장 없이 한 방향</text>
  <text x="740" y="300" class="t-xs t-c t-mu">이동 · 팔 동작 · 긴 계산</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '액션이란? — 배달 앱으로 주문 추적하기',
      html: `
<p>4장의 서비스는 "부탁 → 답"이 한 번에 끝나는 통신이었습니다. 그런데 <b>"저기 부엌까지 가 줘"</b> 같은 부탁은 30초, 1분이 걸립니다. 그동안 클라이언트는 아무 소식도 못 듣고 기다려야 할까요? 가는 도중에 "아, 취소!" 하고 싶으면요?</p>
<p>이런 <b>오래 걸리는 일</b>을 위해 ROS 2 에는 <b>액션(action, 목표를 보내면 진행 상황을 받다가 결과를 받는 통신)</b>이 있습니다. 배달 앱을 떠올리면 쉽습니다.</p>

{{fig:delivery}}

<div class="cards c4">
  <div class="card purple"><div class="ci">🎯</div><b>목표 (Goal)</b><p>클라이언트가 서버에 맡기는 일. 예: "90° 방향을 봐", "피보나치 수열 10개 구해 줘"</p></div>
  <div class="card green"><div class="ci">📍</div><b>피드백 (Feedback)</b><p>일하는 동안 서버가 <b>여러 번</b> 보내는 진행 상황. 예: "남은 각도 0.7 rad"</p></div>
  <div class="card blue"><div class="ci">🏁</div><b>결과 (Result)</b><p>일이 끝났을 때 <b>한 번</b> 오는 최종 결과와 상태(성공 · 취소 · 중단)</p></div>
  <div class="card red"><div class="ci">✋</div><b>취소 (Cancel)</b><p>클라이언트가 도중에 "그만!"을 요청. 서버가 받아들이면 멈춥니다.</p></div>
</div>

<div class="box analogy"><div class="box-t">🍗 비유를 정확히 맞춰 보면</div>
<table class="tbl">
  <thead><tr><th>배달 앱</th><th>액션</th></tr></thead>
  <tbody>
    <tr><td>주문하기 버튼</td><td>목표 보내기 (<code>send_goal</code>)</td></tr>
    <tr><td>"주문이 접수되었습니다" / "재료 소진으로 거절"</td><td>목표 수락 / 거절</td></tr>
    <tr><td>"조리 중 → 배달 출발 → 5분 전"</td><td>피드백 (여러 번)</td></tr>
    <tr><td>"배달 완료" 알림</td><td>결과 (<code>SUCCEEDED</code>)</td></tr>
    <tr><td>주문 취소 버튼</td><td>취소 요청 (<code>cancel_goal</code>) → <code>CANCELED</code></td></tr>
    <tr><td>"가게 사정으로 배달 불가"</td><td>서버가 중단 (<code>ABORTED</code>)</td></tr>
  </tbody>
</table></div>

<p>액션 타입은 <code>.action</code> 파일로 정의하고(3장), <code>---</code> 두 줄로 <b>목표 / 결과 / 피드백</b> 세 부분을 나눕니다. 순서가 "목표 → 결과 → 피드백"인 것에 주의하세요.</p>
<pre class="code" data-lang="text"><code><span class="cm"># turtlesim/action/RotateAbsolute.action</span>
float32 theta       <span class="cm"># 목표: 바라볼 방향 (라디안)</span>
---
float32 delta       <span class="cm"># 결과: 실제로 돈 각도</span>
---
float32 remaining   <span class="cm"># 피드백: 남은 각도</span></code></pre>`
    },

    /* ================================================================ 2 */
    {
      title: '액션의 속 — 서비스 3개 + 토픽 2개',
      html: `
<p>액션은 완전히 새로운 통신이 아니라, 우리가 이미 아는 <b>서비스와 토픽을 조합</b>해서 만든 것입니다. 액션 이름 하나 아래에 서비스 3개와 토픽 2개가 숨어 있어요.</p>
{{fig:actionParts}}

<table class="tbl">
  <thead><tr><th>부품</th><th>종류</th><th>실제 이름 (turtlesim 예)</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr><td>send_goal</td><td><span class="tag orange">서비스</span></td><td><code>/turtle1/rotate_absolute/_action/send_goal</code></td><td>목표를 보내고 수락 여부를 받음</td></tr>
    <tr><td>get_result</td><td><span class="tag orange">서비스</span></td><td><code>…/_action/get_result</code></td><td>결과를 요청 — 서버는 <b>일이 끝날 때</b> 응답</td></tr>
    <tr><td>cancel_goal</td><td><span class="tag orange">서비스</span></td><td><code>…/_action/cancel_goal</code></td><td>취소 요청과 그 수락 여부</td></tr>
    <tr><td>feedback</td><td><span class="tag green">토픽</span></td><td><code>…/_action/feedback</code></td><td>진행 상황 (목표 ID 와 함께)</td></tr>
    <tr><td>status</td><td><span class="tag green">토픽</span></td><td><code>…/_action/status</code></td><td>서버가 가진 모든 목표의 상태 목록</td></tr>
  </tbody>
</table>
<p>이름에 <code>_action</code> 처럼 <b>밑줄로 시작하는 부분</b>이 있으면 "숨은(hidden)" 이름으로 취급되어 <code>ros2 topic list</code> 같은 명령에 보통 나오지 않습니다. 실제 Ubuntu 에서는 옵션을 붙여 볼 수 있어요.</p>
<pre class="code" data-lang="bash"><code>ros2 topic list --include-hidden-topics
ros2 service list --include-hidden-services</code></pre>

{{fig:sequence}}

<div class="box practice"><div class="box-t">🧪 해 보기 — 액션 통신 눈으로 보기</div>
<ol>
  <li>아래 위젯의 <b>🎯 액션</b> 탭에서 목표를 보내 보세요. 수락 → 피드백 여러 번 → 결과 순서로 오가는 것을 확인합니다.</li>
  <li>목표가 실행되는 도중에 <b>취소</b>를 눌러 상태가 CANCELING → CANCELED 로 바뀌는지 보세요.</li>
  <li>🔁 서비스 탭과 비교해, 액션에만 있는 것(피드백 · 취소 · 상태)을 세 가지 말해 보세요.</li>
</ol></div>
{{widget:comm|mode=action}}`
    },

    /* ================================================================ 3 */
    {
      title: 'turtle_teleop_key 로 회전 액션 체험하기',
      html: `
<p>사실 여러분은 1장에서 이미 액션을 써 봤습니다. <code>turtle_teleop_key</code> 를 실행하면 나오는 안내문을 자세히 보세요.</p>
<pre class="code out" data-lang="출력"><code>Reading from keyboard
---------------------------
Use arrow keys to move the turtle.
Use G|B|V|C|D|E|R|T keys to rotate to absolute orientations. 'F' to cancel a rotation.
'Q' to quit.</code></pre>
<p>방향키는 <code>/turtle1/cmd_vel</code> <b>토픽</b>으로 속도를 보내지만, <kbd>G</kbd> <kbd>B</kbd> <kbd>V</kbd> <kbd>C</kbd> <kbd>D</kbd> <kbd>E</kbd> <kbd>R</kbd> <kbd>T</kbd> 는 <code>/turtle1/rotate_absolute</code> <b>액션</b>으로 "이 방향을 바라봐"라는 목표를 보냅니다. <kbd>F</kbd> 는 그 목표를 취소해요. 키보드의 G 를 가운데로, 둘레 8개 키가 8방향을 가리키도록 배치되어 있습니다.</p>
{{fig:teleopKeys}}

<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtlesim turtle_teleop_key</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 키보드로 목표 보내기</div>
<ol>
  <li>아래 터미널에서 위 명령을 실행하고, <b>터미널을 한 번 클릭</b>해 키 입력이 터미널로 가게 합니다.</li>
  <li><kbd>R</kbd>(위), <kbd>D</kbd>(왼쪽), <kbd>G</kbd>(오른쪽)를 눌러 거북이가 그 방향으로 <b>천천히 돌아가는</b> 것을 보세요. 도착하면 <code>Rotation goal completed successfully</code> 로그가 나옵니다.</li>
  <li><kbd>V</kbd> 를 누르고 거북이가 도는 도중에 <kbd>F</kbd> 를 눌러 취소해 보세요.</li>
  <li>회전 도중에 방향키(↑)를 누르면 어떻게 될까요? 다음 절에서 이유를 알아봅니다. 끝나면 <kbd>Q</kbd> 또는 <kbd>Ctrl</kbd>+<kbd>C</kbd>.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=turtle_teleop_key — 회전 액션|h=400}}

<div class="box tip"><div class="box-t">💡 누가 서버, 누가 클라이언트?</div>
<code>ros2 node info /turtlesim</code> 을 보면 <b>Action Servers</b> 에 <code>/turtle1/rotate_absolute</code> 가, <code>ros2 node info /teleop_turtle</code> 을 보면 <b>Action Clients</b> 에 같은 이름이 있습니다. 거북이를 실제로 돌리는 turtlesim 이 서버, 키보드 노드가 클라이언트예요.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'ros2 action 명령 — 목록 · 정보 · 목표 보내기',
      html: `
<p>액션 명령도 토픽 · 서비스와 같은 모양입니다.</p>
<table class="tbl">
  <thead><tr><th>명령</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr><td><code>ros2 action list</code> (<code>-t</code>)</td><td>액션 목록 (타입까지)</td></tr>
    <tr><td><code>ros2 action type &lt;이름&gt;</code></td><td>액션 타입</td></tr>
    <tr><td><code>ros2 action info &lt;이름&gt;</code></td><td>액션 클라이언트 · 서버가 어느 노드인지</td></tr>
    <tr><td><code>ros2 interface show &lt;타입&gt;</code></td><td>목표 / 결과 / 피드백 필드</td></tr>
    <tr><td><code>ros2 action send_goal &lt;이름&gt; &lt;타입&gt; "&lt;YAML&gt;"</code></td><td>목표 보내기 (<code>--feedback</code> 을 붙이면 피드백도 출력)</td></tr>
  </tbody>
</table>

<pre class="code" data-lang="bash" data-run="sh"><code>ros2 action list -t
ros2 action info /turtle1/rotate_absolute
ros2 interface show turtlesim/action/RotateAbsolute</code></pre>
<pre class="code out" data-lang="출력"><code>/turtle1/rotate_absolute [turtlesim/action/RotateAbsolute]
Action: /turtle1/rotate_absolute
Action clients: 0
Action servers: 1
    /turtlesim</code></pre>

<p>이제 명령으로 목표를 보내 봅시다. <code>theta: 1.57</code> 은 약 90°(위쪽)입니다. 결과와 함께 <b>최종 상태</b>가 찍혀요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 action send_goal /turtle1/rotate_absolute turtlesim/action/RotateAbsolute "{theta: 1.57}"</code></pre>
<pre class="code out" data-lang="출력"><code>Waiting for an action server to become available...
Sending goal:
     theta: 1.57

Goal accepted with ID: f8db8f44410849eaa93d3feb747dd444

Result:
    delta: -1.5679999589920044

Goal finished with status: SUCCEEDED</code></pre>
<p><code>--feedback</code> 을 붙이면 남은 각도(<code>remaining</code>)가 계속 출력됩니다. 반대 방향 <code>-1.57</code> 로 보내 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 action send_goal /turtle1/rotate_absolute turtlesim/action/RotateAbsolute "{theta: -1.57}" --feedback</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 목표를 보내고 피드백 읽기</div>
<ol>
  <li>위 코드 블록을 차례로 실행하고, 결과의 <code>delta</code> 가 실제로 돈 각도라는 것을 확인하세요. (출발 방향에 따라 값이 다릅니다)</li>
  <li><code>--feedback</code> 버전을 실행해 <code>remaining</code> 이 0 에 가까워지다가 끝나는 것을 보세요.</li>
  <li><code>"{theta: 3.14}"</code> 로 보내고 도는 도중 <kbd>Ctrl</kbd>+<kbd>C</kbd> 를 눌러 보세요. <code>send_goal</code> 은 멈출 때 목표 <b>취소</b>를 요청합니다.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=ros2 action 명령 실습|h=400}}

<div class="box note"><div class="box-t">📝 라디안 복습</div>
ROS 는 각도를 <b>라디안</b>으로 씁니다. π(약 3.14) = 180°, π/2(약 1.57) = 90°. turtlesim 에서 0 은 오른쪽(→), 반시계 방향이 + 입니다. 파이썬에서는 <code>math.radians(90)</code> 으로 바꿀 수 있어요.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '목표의 상태 — 성공 · 취소 · 중단',
      html: `
<p>액션 서버에 보낸 목표는 정해진 <b>상태</b>를 거쳐 갑니다. 각 상태에는 번호가 있고(<code>action_msgs/msg/GoalStatus</code>), <code>_action/status</code> 토픽으로 계속 알려집니다. <code>ros2 action send_goal</code> 마지막 줄의 <code>Goal finished with status: …</code> 가 바로 이 값이에요.</p>
{{fig:goalStates}}

<table class="tbl cmp">
  <thead><tr><th>번호</th><th>상태</th><th>뜻</th><th>turtlesim 에서 보는 법</th></tr></thead>
  <tbody>
    <tr><td>1</td><td><code>ACCEPTED</code></td><td>서버가 목표를 받아들임 (아직 시작 전일 수 있음)</td><td>send_goal 직후</td></tr>
    <tr><td>2</td><td><code>EXECUTING</code></td><td>실행 중 — 피드백이 나옴</td><td>거북이가 도는 동안</td></tr>
    <tr><td>3</td><td><code>CANCELING</code></td><td>취소 요청이 받아들여져 멈추는 중</td><td><kbd>F</kbd> 또는 <kbd>Ctrl</kbd>+<kbd>C</kbd> 직후</td></tr>
    <tr><td>4</td><td><code>SUCCEEDED</code></td><td>목표 달성</td><td>목표 방향에 도착</td></tr>
    <tr><td>5</td><td><code>CANCELED</code></td><td>취소 완료</td><td>회전 도중 취소</td></tr>
    <tr><td>6</td><td><code>ABORTED</code></td><td>서버가 스스로 포기(중단)</td><td>회전 중 <b>방향키</b> 또는 <b>새 목표</b>가 들어올 때</td></tr>
  </tbody>
</table>
<p class="t-mu">※ 0 번 <code>STATUS_UNKNOWN</code> 도 정의되어 있지만 정상 흐름에서는 보이지 않습니다. 서버가 목표를 처음부터 <b>거절</b>하면 상태 목록에 들어가지 않고 <code>Goal was rejected.</code> 로 끝납니다.</p>

<h3>왜 ABORTED 가 될까?</h3>
<p>turtlesim 은 회전 목표를 수행하는 도중 <code>cmd_vel</code> 속도 명령이 들어오거나, 새 회전 목표가 들어오면 <b>이전 목표를 중단(abort)</b>하도록 만들어져 있습니다. 실제 turtlesim 은 이때 <code>Rotation goal received before a previous goal finished. Aborting previous goal</code> 같은 경고를 남깁니다. "사람이 직접 조종하기 시작하면 자동 회전은 포기한다"는 설계예요.</p>

<div class="box practice"><div class="box-t">🧪 해 보기 — 세 가지 끝 상태 모두 만들기</div>
<ol>
  <li><b>SUCCEEDED</b>: 위 실습 터미널에서 <code>ros2 action send_goal /turtle1/rotate_absolute turtlesim/action/RotateAbsolute "{theta: 3.14}" --feedback</code> 을 끝까지 기다립니다.</li>
  <li><b>CANCELED</b>: 같은 명령을 <code>"{theta: 0.0}"</code> 으로 보내고 도는 도중 <kbd>Ctrl</kbd>+<kbd>C</kbd>.</li>
  <li><b>ABORTED</b>: 명령 뒤에 <code>&amp;</code> 를 붙여 백그라운드로 보낸 뒤, 도는 동안 turtlesim 화면의 ▲ 버튼(= cmd_vel 발행)을 눌러 보세요. 터미널에 <code>Goal finished with status: ABORTED</code> 가 찍힙니다.</li>
</ol></div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 상태로 분기하기</div>
로봇 프로그램은 결과의 <b>상태</b>를 보고 다음 행동을 정합니다. 예를 들어 Nav2 에 "충전기로 가라"를 보냈는데 <code>ABORTED</code> 면 다른 경로로 재시도하고, <code>CANCELED</code> 면 사람이 취소한 것이니 대기합니다. 파이썬에서는 결과 future 의 <code>status</code> 를 <code>GoalStatus.STATUS_SUCCEEDED</code> 와 비교합니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'Fibonacci — 공식 예제 액션 서버와 클라이언트',
      html: `
<p>공식 튜토리얼의 액션 예제는 <b>피보나치 수열</b>을 한 칸씩 계산하는 서버입니다. 목표로 <code>order</code>(몇 개까지)를 받으면, 1초에 한 칸씩 수열을 늘리며 <b>지금까지의 수열</b>을 피드백으로 보내고, 끝나면 전체 수열을 결과로 돌려줍니다. 일부러 느리게 만들어 "오래 걸리는 일"을 흉내 낸 것이에요.</p>
<pre class="code" data-lang="text"><code><span class="cm"># action_tutorials_interfaces/action/Fibonacci.action</span>
int32 order
---
int32[] sequence
---
int32[] partial_sequence</code></pre>

<p>서버를 백그라운드로 켜고 명령으로 목표를 보내 봅시다. (실제 Ubuntu 에서는 터미널 두 개를 쓰면 됩니다)</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run action_tutorials_py fibonacci_action_server &amp;
ros2 action send_goal /fibonacci action_tutorials_interfaces/action/Fibonacci "{order: 5}" --feedback</code></pre>
<pre class="code out" data-lang="출력"><code>Sending goal:
     order: 5

Goal accepted with ID: 3a2b…

Feedback:
    partial_sequence:
- 0
- 1
- 1
…
Result:
    sequence:
- 0
- 1
- 1
- 2
- 3
- 5

Goal finished with status: SUCCEEDED</code></pre>

<p>이번에는 명령 대신 <b>클라이언트 노드</b>로 목표를 보냅니다. 서버가 켜져 있어야 해요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run action_tutorials_py fibonacci_action_client</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 서버와 클라이언트</div>
<ol>
  <li>아래 터미널 칩을 위에서부터 눌러 서버를 켜고, <code>ros2 action list -t</code> 로 <code>/fibonacci</code> 를 확인하세요.</li>
  <li>클라이언트를 실행하면 <code>Goal accepted :)</code> → <code>Received feedback</code> 여러 줄 → <code>Result</code> 순서로 찍힙니다.</li>
  <li><code>ros2 action info /fibonacci</code> 를 클라이언트가 실행되는 동안과 끝난 뒤에 각각 쳐서 <code>Action clients</code> 수를 비교해 보세요.</li>
</ol></div>
{{widget:term|chips=ros2 run action_tutorials_py fibonacci_action_server &;ros2 action list -t;ros2 run action_tutorials_py fibonacci_action_client &;ros2 action info /fibonacci;ros2 node list|h=300}}

<h3>파이썬 서버 · 클라이언트 들여다보기</h3>
<p>서버의 핵심은 <code>execute_callback(goal_handle)</code> 하나입니다. 루프를 돌며 <code>goal_handle.publish_feedback()</code> 으로 피드백을 보내고, 끝나면 <code>goal_handle.succeed()</code> 후 결과를 <b>return</b> 합니다. 자세한 문법은 9장에서 다룹니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 내 서버 돌리기</div>
<ol>
  <li>아래 실습기에서 서버를 <b>▶ 실행</b>하고, 오른쪽 터미널에서 <code>ros2 action send_goal /fibonacci action_tutorials_interfaces/action/Fibonacci "{order: 8}" --feedback</code> 을 입력하세요.</li>
  <li><code>time.sleep(1)</code> 을 <code>time.sleep(0.3)</code> 으로 바꿔 다시 실행하면 피드백이 빨라집니다.</li>
</ol></div>
{{widget:pylab|ex=fib_server|with=term}}
<p>클라이언트는 <code>send_goal_async()</code> → 수락 확인(<code>goal_response_callback</code>) → <code>get_result_async()</code> → 결과 콜백 순서로, <b>기다리는 곳 없이 콜백만으로</b> 흐름을 이어 갑니다. 위 서버를 켜 둔 채 실행해 보세요.</p>
{{widget:pylab|ex=fib_client|with=term}}`
    },

    /* ================================================================ 7 */
    {
      title: '파이썬으로 거북이 돌리기 — RotateAbsolute 클라이언트',
      html: `
<p>turtle_teleop_key 가 하던 일을 파이썬으로 직접 해 봅시다. 아래 프로그램은 90° → 180° → -90° → 0° 순서로 목표를 보내고, 피드백으로 남은 각도를 찍습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import math
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from turtlesim.action import RotateAbsolute


class Rotator(Node):
    def __init__(self):
        super().__init__('rotator')
        self.ac = ActionClient(self, RotateAbsolute, '/turtle1/rotate_absolute')

    def turn(self, deg):
        self.ac.wait_for_server()
        goal = RotateAbsolute.Goal(theta=math.radians(deg))
        result = self.ac.send_goal(goal, feedback_callback=self.on_fb)
        self.get_logger().info(f'{deg}° 도착! 회전량 = {math.degrees(result.result.delta):.1f}°')

    def on_fb(self, msg):
        self.get_logger().info(f'남은 각도 {math.degrees(msg.feedback.remaining):6.1f}°',
                               throttle_duration_sec=0.3)


def main():
    rclpy.init()
    node = Rotator()
    for d in (90, 180, -90, 0):
        node.turn(d)
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>

<ol class="steps-list">
  <li><b>ActionClient(노드, 타입, 이름)</b> — 서비스의 create_client 에 해당합니다.</li>
  <li><b>wait_for_server()</b> — 서버가 뜰 때까지 기다립니다.</li>
  <li><b>RotateAbsolute.Goal(theta=…)</b> — 목표 메시지를 만듭니다. 각도는 라디안!</li>
  <li><b>send_goal(goal, feedback_callback=…)</b> — 결과가 나올 때까지 기다리는 <b>동기</b> 호출입니다. 피드백이 올 때마다 <code>on_fb</code> 가 불립니다. (콜백 <b>안</b>에서는 4장과 같은 이유로 <code>send_goal_async</code> 를 써야 합니다)</li>
</ol>

<div class="box practice"><div class="box-t">🧪 해 보기 — 거북이 춤</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>을 눌러 거북이가 네 방향을 차례로 보는지 확인하세요.</li>
  <li><code>(90, 180, -90, 0)</code> 을 <code>(45, 135, 225, 315)</code> 로 바꿔 보세요. 225° 는 라디안으로 바꾸면 π 보다 크지만, turtlesim 이 알아서 -135° 방향으로 이해합니다.</li>
  <li>실행 도중 turtlesim 의 ▲ 버튼을 눌러 목표를 <b>ABORTED</b> 로 만들어 보세요. 결과의 delta 는 어떻게 될까요?</li>
</ol></div>
{{widget:pylab|ex=rotate|with=turtlesim}}`
    },

    /* ================================================================ 8 */
    {
      title: '토픽 · 서비스 · 액션, 무엇을 고를까? — 실제 로봇의 액션',
      html: `
<p>세 가지 통신을 모두 배웠습니다. 새 기능을 설계할 때는 아래 흐름도의 질문을 차례로 던져 보세요.</p>
{{fig:decision}}

<table class="tbl cmp">
  <thead><tr><th></th><th>📻 토픽</th><th>🔁 서비스</th><th>🎯 액션</th></tr></thead>
  <tbody>
    <tr><td>방향</td><td>한 방향 (pub → sub)</td><td>요청 ⇄ 응답</td><td>목표 → 피드백 … → 결과</td></tr>
    <tr><td>연결</td><td>N : M</td><td>클라이언트 N : 서버 1</td><td>클라이언트 N : 서버 1</td></tr>
    <tr><td>걸리는 시간</td><td>계속</td><td>짧게 (즉시 응답)</td><td>길게 (초 ~ 분)</td></tr>
    <tr><td>중간 진행 상황</td><td>—</td><td>없음</td><td>피드백</td></tr>
    <tr><td>취소</td><td>—</td><td>불가</td><td>가능</td></tr>
    <tr><td>정의 파일</td><td><code>.msg</code></td><td><code>.srv</code> (요청 / 응답)</td><td><code>.action</code> (목표 / 결과 / 피드백)</td></tr>
    <tr><td>대표 예</td><td><code>/scan</code>, <code>/cmd_vel</code>, <code>/odom</code></td><td><code>/spawn</code>, 지도 저장, 모드 전환</td><td>내비게이션, 팔 궤적, 도킹</td></tr>
  </tbody>
</table>

<h3>실제 로봇 소프트웨어의 액션</h3>
<div class="cards c3">
  <div class="card purple"><div class="ci">🗺️</div><b>Nav2 — NavigateToPose</b><p><code>/navigate_to_pose</code> 액션(<code>nav2_msgs/action/NavigateToPose</code>). 목표는 지도 위 자세(<code>pose</code>), 피드백은 현재 위치 · 남은 거리 · 예상 남은 시간 · 복구 횟수. RViz 의 "2D Goal Pose" 버튼도 이 액션을 보냅니다. (16장)</p></div>
  <div class="card orange"><div class="ci">🦾</div><b>FollowJointTrajectory</b><p>ros2_control 의 궤적 컨트롤러가 여는 <code>control_msgs/action/FollowJointTrajectory</code> 액션. 관절 궤적(시간별 각도 목록)을 목표로 받아 팔을 움직이고, 목표 · 실제 · 오차를 피드백합니다. MoveIt 2 도 계획한 궤적을 이 액션으로 실행합니다. (15 · 17장)</p></div>
  <div class="card teal"><div class="ci">🔋</div><b>그 밖의 예</b><p>도킹(충전기 찾아가기), 그리퍼 잡기(<code>control_msgs/action/GripperCommand</code>), 경로 계산(Nav2 의 <code>ComputePathToPose</code>) 처럼 "시간이 걸리고 결과가 중요한" 일은 대부분 액션입니다.</p></div>
</div>

<pre class="code" data-lang="text"><code><span class="cm"># nav2_msgs/action/NavigateToPose (Jazzy, 주석 일부 생략)</span>
geometry_msgs/PoseStamped pose
string behavior_tree
---
uint16 error_code
string error_msg
---
geometry_msgs/PoseStamped current_pose
builtin_interfaces/Duration navigation_time
builtin_interfaces/Duration estimated_time_remaining
int16 number_of_recoveries
float32 distance_remaining</code></pre>

<div class="box note"><div class="box-t">📝 함께 보면 좋은 강좌</div>
SO-ARM101 로봇팔이 <code>FollowJointTrajectory</code> 액션으로 움직이는 모습은 <a href="https://samcho93.github.io/studySOArm101/lessons/ch17.html" target="_blank" rel="noopener">SO-ARM101 강좌 17장(ros2_control)</a>과 <a href="https://samcho93.github.io/studySOArm101/lessons/ch18.html" target="_blank" rel="noopener">18장(MoveIt 2)</a>에서 자세히 다룹니다.</div>

<div class="box warn"><div class="box-t">⚠️ 액션 서버를 만들 때 흔한 실수</div>
<ul>
  <li><b>피드백을 안 보냄</b> — 클라이언트는 진행 상황을 모른 채 기다립니다. 적당한 주기로 <code>publish_feedback()</code>.</li>
  <li><b>취소 요청을 확인하지 않음</b> — 실행 루프 안에서 <code>goal_handle.is_cancel_requested</code> 를 확인하고 <code>canceled()</code> 로 끝내야 취소가 실제로 동작합니다. (rclpy 는 기본적으로 취소 요청을 <b>거절</b>하므로, 취소를 받으려면 <code>cancel_callback</code> 을 지정해야 합니다)</li>
  <li><b>succeed()/abort() 없이 return</b> — 상태가 애매하게 끝납니다. 결과를 돌려주기 전에 끝 상태를 명확히 정하세요.</li>
</ul></div>`
    }
  ],

  videos: [
    { title: 'ROS2 Actions [1H Crash Course]', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=X7YSnDbKMWo', lang: 'en', min: '67분', desc: '액션 개념부터 파이썬 · C++ 서버/클라이언트, 취소와 상태까지 한 시간에 정리한 강의. 이 장과 9장의 연결 고리.' },
    { title: 'Getting Started with ROS Part 2: Services and Actions', channel: 'Ubuntu Robotics', url: 'https://www.youtube.com/watch?v=DW5CtASlAJo', lang: 'en', min: '12분', desc: 'Canonical 의 입문 시리즈. turtlesim 으로 서비스와 액션을 비교하며 보여 줍니다.' },
    { title: 'ROS2 Actions', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=zNxCqBKKbGM', lang: 'en', min: '4분', desc: '목표 · 피드백 · 결과 구조를 4분 만에 복습하는 짧은 영상.' },
    { title: '[ROS 2 - 초급] #8 액션(Action) 통신 (CLI 명령어 설명 및 실습)', channel: 'KIMe Lab', url: 'https://www.youtube.com/watch?v=i6SYiXdRlBw', lang: 'ko', min: '17분', desc: 'ros2 action list · info · send_goal 을 한국어로 차근차근 실습합니다.' },
    { title: '[ROS2] 3-9. ROS2 Action', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=1jFswxDooGM', lang: 'ko', min: '9분', desc: 'turtlesim 회전 액션을 한국어로 설명하는 입문 강의.' },
    { title: '"Nav2 NavigateToPose action" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=Nav2+NavigateToPose+action+ROS+2', lang: 'en', desc: '실제 로봇이 내비게이션 액션으로 목표까지 이동하는 데모를 찾아볼 수 있습니다 (16장 예습).' }
  ],

  terms: [
    ['액션(action)', '목표를 보내면 진행 상황(피드백)을 받다가 최종 결과를 받는, 오래 걸리는 일을 위한 통신. 취소 가능'],
    ['목표(Goal)', '액션 클라이언트가 서버에 맡기는 일. .action 파일의 첫 부분'],
    ['피드백(Feedback)', '서버가 목표를 수행하는 동안 여러 번 보내는 진행 상황 메시지'],
    ['결과(Result)', '목표가 끝났을 때 한 번 돌아오는 최종 메시지. 끝 상태와 함께 전달'],
    ['취소(Cancel)', '클라이언트가 진행 중인 목표를 멈춰 달라고 요청하는 것. 서버가 수락해야 CANCELED 가 됨'],
    ['.action 파일', '--- 두 줄로 목표 / 결과 / 피드백 세 부분을 정의하는 인터페이스 파일'],
    ['_action/ 숨은 이름', '액션을 이루는 send_goal · get_result · cancel_goal 서비스와 feedback · status 토픽의 실제 이름 접두사'],
    ['GoalStatus', 'action_msgs/msg/GoalStatus. ACCEPTED(1) · EXECUTING(2) · CANCELING(3) · SUCCEEDED(4) · CANCELED(5) · ABORTED(6)'],
    ['ABORTED', '서버가 스스로 목표를 포기한 끝 상태. turtlesim 은 회전 중 cmd_vel 이나 새 목표가 오면 이전 목표를 중단'],
    ['ros2 action send_goal', '터미널에서 목표를 보내는 명령. --feedback 을 붙이면 피드백도 출력'],
    ['RotateAbsolute', 'turtlesim 의 액션 타입. 목표 theta, 결과 delta, 피드백 remaining'],
    ['Fibonacci (action_tutorials)', '공식 튜토리얼 예제 액션. order 를 받아 1초에 한 칸씩 수열을 늘리며 피드백'],
    ['NavigateToPose', 'Nav2 의 대표 액션. 지도 위 목표 자세까지 이동하며 남은 거리 · 시간을 피드백'],
    ['FollowJointTrajectory', 'ros2_control 궤적 컨트롤러의 액션. 관절 궤적을 받아 로봇팔을 움직임']
  ],

  summary: [
    '액션 = <b>목표 → 피드백(여러 번) → 결과</b> + 언제든 <b>취소</b>. 오래 걸리는 일을 맡길 때 쓴다 (🍗 배달 앱)',
    '액션은 <b>서비스 3개</b>(send_goal · get_result · cancel_goal)와 <b>토픽 2개</b>(feedback · status)로 만들어진다',
    '<code>ros2 action list -t</code> · <code>info</code> · <code>send_goal 이름 타입 "YAML" --feedback</code>',
    '목표 상태: ACCEPTED → EXECUTING → <b>SUCCEEDED / CANCELED / ABORTED</b> (취소는 CANCELING 을 거침)',
    'turtlesim: 회전 키 G B V C D E R T 는 <code>/turtle1/rotate_absolute</code> 목표, F 는 취소, 방향키는 진행 중 목표를 ABORTED 로',
    '계속 흐르면 토픽, 짧게 묻고 답하면 서비스, 오래 걸리고 진행 · 취소가 필요하면 액션 (Nav2 · FollowJointTrajectory)'
  ],

  quiz: [
    { q: '액션에는 있지만 서비스에는 <b>없는</b> 것 두 가지로 알맞은 것은?', options: ['요청과 응답', '피드백과 취소', '이름과 타입', '클라이언트와 서버'], answer: 1, explain: '서비스도 요청/응답 · 이름/타입 · 클라이언트/서버가 있습니다. 진행 중 피드백과 취소는 액션만의 기능입니다.' },
    { q: '액션 하나를 이루는 부품으로 옳은 것은?', options: ['토픽 3개 + 서비스 2개', '서비스 3개 + 토픽 2개', '서비스 1개 + 토픽 1개', '토픽 5개'], answer: 1, explain: 'send_goal · get_result · cancel_goal 세 서비스와 feedback · status 두 토픽입니다. 모두 _action/ 아래 숨은 이름으로 만들어집니다.' },
    { q: '.action 파일의 세 부분 순서로 옳은 것은?', options: ['목표 --- 피드백 --- 결과', '결과 --- 목표 --- 피드백', '목표 --- 결과 --- 피드백', '피드백 --- 목표 --- 결과'], answer: 2, explain: '목표, 결과, 피드백 순서입니다. RotateAbsolute 는 theta --- delta --- remaining 이에요.' },
    { q: 'turtlesim 에서 회전 목표가 실행되는 도중 방향키로 <code>cmd_vel</code> 을 보내면 목표는 어떤 상태로 끝날까?', options: ['SUCCEEDED', 'CANCELED', 'ABORTED', 'EXECUTING 에서 영원히 멈춤'], answer: 2, explain: 'turtlesim 은 회전 중 속도 명령이 오면 서버가 스스로 목표를 중단(abort)합니다. 클라이언트가 취소를 요청한 것이 아니므로 CANCELED 가 아닙니다.' },
    { q: '<code>ros2 action send_goal</code> 에 <code>--feedback</code> 을 붙이면?', options: ['목표를 보내지 않고 피드백만 구독한다', '목표를 보내고 진행 중 피드백 메시지도 출력한다', '결과를 출력하지 않는다', '목표를 자동으로 취소한다'], answer: 1, explain: '--feedback(-f)은 피드백 토픽의 메시지도 함께 보여 줍니다. 결과와 최종 상태는 그대로 출력됩니다.' },
    { q: '다음 중 <b>액션</b>으로 만드는 것이 가장 알맞은 것은?', options: ['IMU 값 100 Hz 전달', '현재 배터리 잔량 한 번 조회', '로봇을 20 m 떨어진 방까지 이동시키고 남은 거리 보고', '로그 레벨 바꾸기'], answer: 2, explain: '오래 걸리고, 남은 거리 같은 진행 상황과 취소가 필요한 일이므로 액션입니다(Nav2 NavigateToPose). IMU 는 토픽, 잔량 조회 · 로그 레벨은 서비스가 알맞습니다.' },
    { q: 'rclpy 액션 서버가 취소를 제대로 처리하려면 실행 루프에서 무엇을 확인해야 할까?', options: ['goal_handle.is_cancel_requested', 'rclpy.ok() 만', 'feedback 토픽 구독자 수', 'get_result 호출 횟수'], answer: 0, explain: '루프 안에서 is_cancel_requested 를 확인하고 goal_handle.canceled() 로 끝내야 합니다. 또 rclpy 는 기본적으로 취소를 거절하므로 cancel_callback 에서 수락하도록 해 줘야 합니다.' }
  ],

  slides: [
    {
      title: '오래 걸리는 일은?',
      layout: 'center',
      html: `<div class="s-big">"부엌까지 가 줘" — 30초 동안<br>아무 소식 없이 기다려야 할까? 🤔</div>
<p class="s-center step">→ 🍗 배달 앱처럼 <b>진행 상황</b>과 <b>취소 버튼</b>이 필요하다</p>`,
      notes: '서비스로 30초짜리 이동을 부탁하면 어떤 문제가 있는지 먼저 묻습니다. (중간 상황 모름, 취소 불가, 서버가 그동안 다른 일을 못 함) 학생 답을 받은 뒤 배달 앱으로 연결하세요. (3분)'
    },
    {
      title: '배달 앱 = 액션',
      html: `{{fig:delivery|nocap}}`,
      notes: '주문(목표) → 접수(수락) → 진행 상황(피드백) → 도착(결과), 그리고 위의 취소. 네 단어를 칠판에 크게 적어 둡니다. 가게가 “배달 불가”를 통보하는 경우가 ABORTED 라는 것도 미리 말해 두면 좋습니다. (4분)'
    },
    {
      title: '.action = 목표 / 결과 / 피드백',
      html: `<pre class="code" data-lang="text"><code>float32 theta       # 목표
---
float32 delta       # 결과
---
float32 remaining   # 피드백</code></pre>
<p class="s-small step">순서 주의: 목표 → <b>결과</b> → 피드백</p>`,
      notes: 'RotateAbsolute 정의입니다. 순서가 시간 순서(피드백이 먼저 옴)와 다르다는 점에서 학생들이 자주 헷갈립니다. (2분)'
    },
    {
      title: '액션의 속: 서비스 3 + 토픽 2',
      html: `{{fig:actionParts|nocap}}`,
      notes: '액션은 새 발명품이 아니라 서비스와 토픽의 조합이라는 것이 핵심입니다. 각 부품을 배달 앱에 대응시켜 보게 하세요. (send_goal=주문, get_result=도착 알림 신청, cancel=취소 버튼, feedback=진행 알림, status=주문 내역 화면) (5분)'
    },
    {
      title: '시간 순서',
      html: `{{fig:sequence|nocap}}`,
      notes: 'get_result 요청을 미리 보내 두고 서버가 끝날 때 응답한다는 점이 재미있는 부분입니다. “전화를 걸어 두고 끊지 않은 채 기다리는 것”에 비유하세요. (4분)'
    },
    {
      title: '직접 보기 — 액션 애니메이션',
      html: `{{widget:comm|mode=action}}`,
      notes: '목표를 보내고, 한 번은 끝까지, 한 번은 도중에 취소해 봅니다. 상태 표시가 바뀌는 것을 함께 확인하세요. (4분)'
    },
    {
      title: '키보드로 보내는 목표',
      html: `{{fig:teleopKeys|nocap}}`,
      notes: '1장에서 써 본 turtle_teleop_key 에 이미 액션이 들어 있었다는 반전이 포인트입니다. 방향키는 토픽, 글자 키는 액션! (3분)'
    },
    {
      title: '실습 — send_goal',
      html: `{{widget:lab|with=turtlesim|h=440}}`,
      notes: 'ros2 action list -t → info → send_goal "{theta: 1.57}" → --feedback 순서로 시연합니다. 그다음 teleop_key 를 실행해 R · D · F 키를 눌러 보게 하세요. (10분)'
    },
    {
      title: '목표의 일생',
      html: `{{fig:goalStates|nocap}}`,
      notes: '끝 상태는 세 가지(성공 · 취소 · 중단)뿐이라는 점을 강조합니다. CANCELED 는 클라이언트가 원해서, ABORTED 는 서버가 포기해서라는 차이를 배달 앱 예로 다시 묻습니다. (4분)'
    },
    {
      title: '세 가지 끝 상태 만들기',
      html: `<div class="cards c3">
<div class="card green step"><div class="ci">✅</div><b>SUCCEEDED</b><p>끝까지 기다리기</p></div>
<div class="card gray step"><div class="ci">✋</div><b>CANCELED</b><p>Ctrl+C 또는 F 키</p></div>
<div class="card red step"><div class="ci">💥</div><b>ABORTED</b><p>회전 중 방향키</p></div>
</div>`,
      notes: '학생들이 직접 세 상태를 모두 만들어 보게 하는 미션입니다. ABORTED 는 send_goal 을 & 로 보내 놓고 ▲ 버튼을 누르면 쉽게 만들 수 있습니다. (6분)'
    },
    {
      title: 'Fibonacci 예제',
      html: `<pre class="code" data-lang="bash"><code>ros2 run action_tutorials_py fibonacci_action_server
ros2 action send_goal /fibonacci \\
  action_tutorials_interfaces/action/Fibonacci "{order: 5}" --feedback</code></pre>
<p class="s-small step">1초에 한 칸씩 → 피드백: 지금까지의 수열 → 결과: 전체 수열</p>`,
      notes: '공식 튜토리얼 예제입니다. 일부러 sleep(1) 로 느리게 만든 “가짜 오래 걸리는 일”이라는 점을 설명하고, 서버 코드의 execute_callback 구조를 잠깐 보여 줍니다. (5분)'
    },
    {
      title: '무엇을 고를까?',
      html: `{{fig:decision|nocap}}`,
      notes: '흐름도를 따라 몇 가지 예(카메라, 지도 저장, 도킹, 모터 켜기, 팔 궤적)를 학생들이 분류하게 합니다. 헷갈리면 “몇 초 걸리나? 도중에 취소할 일이 있나?”를 물으세요. (5분)'
    },
    {
      title: '실제 로봇의 액션',
      html: `<div class="cards c2">
<div class="card purple step"><div class="ci">🗺️</div><b>Nav2 NavigateToPose</b><p>목표 자세 → 남은 거리 · 시간 피드백</p></div>
<div class="card orange step"><div class="ci">🦾</div><b>FollowJointTrajectory</b><p>관절 궤적 → 목표 · 실제 · 오차 피드백</p></div>
</div>`,
      notes: '오늘 배운 액션이 실제 자율주행 · 로봇팔의 핵심 인터페이스라는 점을 보여 주며 동기를 줍니다. RViz 의 2D Goal Pose 버튼이 NavigateToPose 목표를 보낸다는 것을 16장 예고로 말해 두세요. (3분)'
    }
  ]
});
