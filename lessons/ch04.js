/* 4장 — 서비스: 묻고 답하기 */
Course.lesson({
  id: 'ch04', no: '04',
  icon: '🔁',
  title: '서비스 — 묻고 답하기',
  subtitle: '"거북이 한 마리 더 만들어 줘!" — 부탁하고 결과를 돌려받는 통신',
  level: '입문', time: '110분',
  goals: [
    '서비스의 요청(request) · 응답(response) 구조를 클라이언트 · 서버 그림으로 설명할 수 있다',
    '토픽과 서비스의 차이를 알고, 상황에 맞는 통신 방식을 고를 수 있다',
    'ros2 service list · type · find · call 로 서비스를 찾아보고 직접 호출할 수 있다',
    'turtlesim 의 /spawn · /kill · set_pen · teleport 서비스와 AddTwoInts 예제를 실행해 볼 수 있다',
    '서비스 콜백을 짧게 유지해야 하는 이유와 동기 호출 교착 상태를 설명할 수 있다'
  ],
  teacher: {
    intro: '“여러분이 짜장면을 시킬 때, 가게가 1초마다 ‘지금 짜장면 있어요!’ 하고 방송해 주길 바라나요, 아니면 전화해서 주문하고 ‘네, 20분 뒤 도착합니다’라는 답을 듣고 싶나요?” 하고 물으며 시작합니다. 앞 장의 토픽(방송)과 오늘의 서비스(전화 주문)를 대비시키는 발문입니다. (2분)',
    flow: '① 도입 · 전화 비유 10분 → ② 토픽 vs 서비스 + comm 위젯 15분 → ③ ros2 service 명령 15분 → ④ turtlesim 서비스 실습 25분 → ⑤ 서비스 타입 해부 · 숨은 파라미터 서비스 10분 → ⑥ AddTwoInts · 파이썬 서버/클라이언트 20분 → ⑦ 주의점 · 퀴즈 · 정리 15분'
  },

  figs: {
    /* ---------------------------------------------------------------- 요청/응답 기본 그림 */
    callModel: {
      caption: '서비스 = 클라이언트가 요청을 보내면 서버가 처리해서 응답을 딱 한 번 돌려주는 통신',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="클라이언트 노드가 /spawn 서비스로 요청을 보내고 turtlesim 서버 노드가 응답을 돌려주는 그림">
  <ellipse cx="140" cy="150" rx="118" ry="52" class="blue"/>
  <text x="140" y="140" class="t-b t-c t-blue">클라이언트 노드</text>
  <text x="140" y="166" class="t-sm t-c t-mono">/spawner</text>
  <text x="140" y="232" class="t-sm t-c t-mu">"거북이 한 마리 만들어 줘"</text>

  <rect x="350" y="112" width="180" height="76" rx="10" class="orange"/>
  <text x="440" y="140" class="t-b t-c t-orange t-mono">/spawn</text>
  <text x="440" y="166" class="t-xs t-c t-mono">turtlesim/srv/Spawn</text>

  <ellipse cx="740" cy="150" rx="118" ry="52" class="blue"/>
  <text x="740" y="140" class="t-b t-c t-blue">서버 노드</text>
  <text x="740" y="166" class="t-sm t-c t-mono">/turtlesim</text>
  <text x="740" y="232" class="t-sm t-c t-mu">"turtle2 를 만들었어요"</text>

  <path d="M250,125 L346,125" class="ln-orange thick ar-orange"/>
  <path d="M534,125 L628,125" class="ln-orange thick ar-orange"/>
  <text x="440" y="90" class="t-sm t-c t-b">① 요청 (Request)  x=2, y=2, theta=0.2, name=''</text>

  <path d="M628,178 L534,178" class="ln-teal thick ar-teal dash"/>
  <path d="M346,178 L250,178" class="ln-teal thick ar-teal dash"/>
  <text x="440" y="218" class="t-sm t-c t-b t-teal">③ 응답 (Response)  name='turtle2'</text>

  <rect x="630" y="262" width="220" height="44" rx="10" class="yellow"/>
  <text x="740" y="284" class="t-sm t-c">② 서버가 콜백에서 처리</text>
  <line x1="740" y1="204" x2="740" y2="258" class="ln thin dash"/>

  <rect x="30" y="262" width="330" height="44" rx="10" class="box"/>
  <text x="195" y="284" class="t-sm t-c">요청 1번 → 응답 1번 (1 : 1 짝)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 토픽 vs 서비스 */
    topicVsService: {
      caption: '토픽은 계속 흘려보내는 방송(1 : N, 단방향), 서비스는 필요할 때 묻고 답을 받는 전화(요청 ↔ 응답)',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="왼쪽은 토픽 방송, 오른쪽은 서비스 요청 응답 비교">
  <rect x="14" y="14" width="428" height="332" rx="16" class="box"/>
  <text x="228" y="42" class="t-lg t-c t-green">📻 토픽 — 방송</text>
  <ellipse cx="90" cy="180" rx="64" ry="34" class="blue"/>
  <text x="90" y="180" class="t-sm t-c t-b">카메라</text>
  <rect x="180" y="158" width="100" height="44" rx="6" class="green"/>
  <text x="230" y="180" class="t-xs t-c t-mono">/image</text>
  <line x1="154" y1="180" x2="176" y2="180" class="ln-green thick ar-green"/>
  <ellipse cx="370" cy="100" rx="58" ry="28" class="blue"/><text x="370" y="100" class="t-xs t-c">화면 표시</text>
  <ellipse cx="370" cy="180" rx="58" ry="28" class="blue"/><text x="370" y="180" class="t-xs t-c">물체 인식</text>
  <ellipse cx="370" cy="260" rx="58" ry="28" class="blue"/><text x="370" y="260" class="t-xs t-c">녹화</text>
  <path d="M282,172 L310,108" class="ln-green ar-green"/>
  <path d="M282,180 L308,180" class="ln-green ar-green"/>
  <path d="M282,188 L310,252" class="ln-green ar-green"/>
  <line x1="154" y1="180" x2="176" y2="180" class="ln-green moving"/>
  <text x="228" y="312" class="t-sm t-c">계속 · 한 방향 · 받는 쪽이 몇 명이든 OK</text>
  <text x="228" y="334" class="t-xs t-c t-mu">답장이 없다 (보낸 쪽은 누가 받았는지 모름)</text>

  <rect x="458" y="14" width="428" height="332" rx="16" class="box"/>
  <text x="672" y="42" class="t-lg t-c t-orange">📞 서비스 — 전화</text>
  <ellipse cx="540" cy="180" rx="64" ry="34" class="blue"/>
  <text x="540" y="180" class="t-sm t-c t-b">클라이언트</text>
  <rect x="624" y="158" width="100" height="44" rx="6" class="orange"/>
  <text x="674" y="180" class="t-xs t-c t-mono">/get_map</text>
  <ellipse cx="808" cy="180" rx="64" ry="34" class="blue"/>
  <text x="808" y="180" class="t-sm t-c t-b">서버</text>
  <path d="M580,146 C620,100 760,100 790,146" class="ln-orange thick ar-orange"/>
  <text x="684" y="96" class="t-sm t-c t-orange">요청</text>
  <path d="M790,214 C760,262 620,262 580,214" class="ln-teal thick ar-teal dash"/>
  <text x="684" y="276" class="t-sm t-c t-teal">응답</text>
  <text x="672" y="312" class="t-sm t-c">필요할 때 한 번 · 양방향 · 답을 기다림</text>
  <text x="672" y="334" class="t-xs t-c t-mu">서버는 하나, 클라이언트는 여럿이어도 됨</text>
</svg>`
    },

    /* ---------------------------------------------------------------- turtlesim 서비스 지도 */
    turtleSrvs: {
      caption: 'turtlesim 노드가 제공하는 서비스 — 전체 거북이용 4개 + 거북이마다 붙는 3개 + 모든 노드에 있는 파라미터 서비스',
      svg: `<svg class="dg" viewBox="0 0 900 400" role="img" aria-label="turtlesim 노드 주위의 서비스 목록">
  <ellipse cx="450" cy="200" rx="110" ry="50" class="blue"/>
  <text x="450" y="192" class="t-b t-c t-blue">/turtlesim</text>
  <text x="450" y="216" class="t-xs t-c t-mu">서비스 서버</text>

  <text x="140" y="36" class="t-sm t-c t-b">시뮬레이터 전체</text>
  <rect x="40" y="52" width="200" height="40" rx="6" class="orange"/><text x="140" y="72" class="t-sm t-c t-mono">/spawn  Spawn</text>
  <rect x="40" y="102" width="200" height="40" rx="6" class="orange"/><text x="140" y="122" class="t-sm t-c t-mono">/kill  Kill</text>
  <rect x="40" y="152" width="200" height="40" rx="6" class="orange"/><text x="140" y="172" class="t-sm t-c t-mono">/clear  Empty</text>
  <rect x="40" y="202" width="200" height="40" rx="6" class="orange"/><text x="140" y="222" class="t-sm t-c t-mono">/reset  Empty</text>
  <path d="M242,72 L350,170" class="ln-orange thin"/>
  <path d="M242,122 L342,182" class="ln-orange thin"/>
  <path d="M242,172 L340,196" class="ln-orange thin"/>
  <path d="M242,222 L342,212" class="ln-orange thin"/>

  <text x="760" y="36" class="t-sm t-c t-b">거북이마다 (turtle1, turtle2 …)</text>
  <rect x="630" y="52" width="260" height="40" rx="6" class="orange"/><text x="760" y="72" class="t-sm t-c t-mono">/turtle1/set_pen</text>
  <rect x="630" y="102" width="260" height="40" rx="6" class="orange"/><text x="760" y="122" class="t-sm t-c t-mono">/turtle1/teleport_absolute</text>
  <rect x="630" y="152" width="260" height="40" rx="6" class="orange"/><text x="760" y="172" class="t-sm t-c t-mono">/turtle1/teleport_relative</text>
  <path d="M628,72 L552,172" class="ln-orange thin"/>
  <path d="M628,122 L558,184" class="ln-orange thin"/>
  <path d="M628,172 L560,196" class="ln-orange thin"/>

  <rect x="180" y="296" width="540" height="88" rx="10" class="gray dash"/>
  <text x="450" y="318" class="t-sm t-c t-b">모든 노드에 자동으로 생기는 파라미터 서비스 (6장)</text>
  <text x="450" y="344" class="t-xs t-c t-mono">/turtlesim/get_parameters · set_parameters · list_parameters</text>
  <text x="450" y="366" class="t-xs t-c t-mono">describe_parameters · get_parameter_types · set_parameters_atomically</text>
  <line x1="450" y1="252" x2="450" y2="292" class="ln thin dash"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 서비스 타입 해부 */
    srvType: {
      caption: '.srv 파일은 --- 를 기준으로 위는 요청, 아래는 응답. ros2 service call 의 YAML 은 "위쪽 필드"만 채웁니다',
      svg: `<svg class="dg" viewBox="0 0 900 350" role="img" aria-label="Spawn.srv 의 요청과 응답 필드, 그리고 service call 명령과의 대응">
  <rect x="20" y="20" width="360" height="310" rx="12" class="box"/>
  <text x="200" y="46" class="t-b t-c t-mono">turtlesim/srv/Spawn</text>
  <rect x="40" y="62" width="320" height="150" rx="8" class="orange"/>
  <text x="56" y="86" class="t-xs t-orange t-b">요청 (Request)</text>
  <text x="60" y="112" class="t-sm t-mono">float32 x</text>
  <text x="60" y="136" class="t-sm t-mono">float32 y</text>
  <text x="60" y="160" class="t-sm t-mono">float32 theta</text>
  <text x="60" y="184" class="t-sm t-mono">string name  <tspan class="t-mu"># 비우면 자동</tspan></text>
  <text x="200" y="232" class="t-lg t-c t-mono t-b">---</text>
  <rect x="40" y="248" width="320" height="66" rx="8" class="teal"/>
  <text x="56" y="270" class="t-xs t-teal t-b">응답 (Response)</text>
  <text x="60" y="296" class="t-sm t-mono">string name</text>

  <rect x="440" y="60" width="440" height="92" rx="10" class="yellow"/>
  <text x="660" y="86" class="t-sm t-c t-b">명령에서는 요청 필드만 YAML 로</text>
  <text x="660" y="116" class="t-xs t-c t-mono">ros2 service call /spawn turtlesim/srv/Spawn</text>
  <text x="660" y="138" class="t-xs t-c t-mono">"{x: 2, y: 2, theta: 0.2, name: ''}"</text>
  <path d="M362,136 L436,106" class="ln-orange ar-orange"/>

  <rect x="440" y="224" width="440" height="92" rx="10" class="box"/>
  <text x="660" y="250" class="t-sm t-c t-b">결과는 응답 필드로 돌아옴</text>
  <text x="660" y="282" class="t-xs t-c t-mono">response:</text>
  <text x="660" y="302" class="t-xs t-c t-mono">turtlesim.srv.Spawn_Response(name='turtle2')</text>
  <path d="M362,282 L436,272" class="ln-teal ar-teal"/>
</svg>`
    },

    /* ---------------------------------------------------------------- 비동기 호출 / 교착 */
    asyncCall: {
      caption: '위: call_async 는 요청을 보내고 바로 돌아와 실행기(spin)가 응답을 받아 줍니다. 아래: 콜백 안에서 동기 call() 을 하면 응답을 받을 실행기가 막혀 영원히 기다립니다',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="비동기 서비스 호출 흐름과 동기 호출 교착 상태 비교">
  <text x="20" y="34" class="t-b t-green">✅ call_async() + spin</text>
  <line x1="120" y1="80" x2="860" y2="80" class="ln thin"/>
  <text x="60" y="84" class="t-sm t-c">클라이언트</text>
  <line x1="120" y1="150" x2="860" y2="150" class="ln thin"/>
  <text x="60" y="154" class="t-sm t-c">서버</text>
  <rect x="140" y="64" width="120" height="32" rx="6" class="blue"/><text x="200" y="80" class="t-xs t-c">call_async()</text>
  <path d="M262,86 L380,144" class="ln-orange ar-orange"/>
  <rect x="380" y="134" width="130" height="32" rx="6" class="orange"/><text x="445" y="150" class="t-xs t-c">콜백 처리</text>
  <path d="M510,144 L610,90" class="ln-teal ar-teal dash"/>
  <rect x="270" y="64" width="320" height="32" rx="6" class="green"/><text x="430" y="80" class="t-xs t-c">spin: 다른 콜백도 계속 처리 (future 대기)</text>
  <rect x="612" y="64" width="180" height="32" rx="6" class="teal"/><text x="702" y="80" class="t-xs t-c">future 완료 → 결과 사용</text>

  <text x="20" y="224" class="t-b t-red">❌ 콜백 안에서 동기 call()</text>
  <line x1="120" y1="270" x2="860" y2="270" class="ln thin"/>
  <text x="60" y="274" class="t-sm t-c">클라이언트</text>
  <line x1="120" y1="340" x2="860" y2="340" class="ln thin"/>
  <text x="60" y="344" class="t-sm t-c">서버</text>
  <rect x="140" y="254" width="130" height="32" rx="6" class="blue"/><text x="205" y="270" class="t-xs t-c">타이머 콜백</text>
  <rect x="272" y="254" width="100" height="32" rx="6" class="red"/><text x="322" y="270" class="t-xs t-c">call() 😴</text>
  <path d="M372,276 L470,334" class="ln-orange ar-orange"/>
  <rect x="470" y="324" width="110" height="32" rx="6" class="orange"/><text x="525" y="340" class="t-xs t-c">응답 보냄</text>
  <path d="M580,334 L660,282" class="ln-teal ar-teal dash"/>
  <rect x="372" y="254" width="480" height="32" rx="6" class="red dash blink"/>
  <text x="612" y="270" class="t-xs t-c t-red t-b">응답을 받을 실행기가 이 콜백에 묶여 있음 → 영원히 대기</text>
</svg>`
    },

    /* ---------------------------------------------------------------- AddTwoInts 흐름 */
    addFlow: {
      caption: 'AddTwoInts 예제 — 클라이언트가 a, b 를 보내면 서버가 더한 sum 을 돌려줍니다',
      svg: `<svg class="dg" viewBox="0 0 880 250" role="img" aria-label="add_two_ints_client 가 /add_two_ints 서비스로 a와 b를 보내고 add_two_ints_server 가 sum 을 응답하는 그림">
  <ellipse cx="150" cy="120" rx="130" ry="48" class="blue"/>
  <text x="150" y="112" class="t-b t-c t-blue">add_two_ints_client</text>
  <text x="150" y="136" class="t-xs t-c t-mu">demo_nodes_py</text>
  <rect x="345" y="92" width="190" height="56" rx="8" class="orange"/>
  <text x="440" y="114" class="t-sm t-c t-b t-mono">/add_two_ints</text>
  <text x="440" y="134" class="t-xs t-c t-mono">example_interfaces/srv/AddTwoInts</text>
  <ellipse cx="730" cy="120" rx="130" ry="48" class="blue"/>
  <text x="730" y="112" class="t-b t-c t-blue">add_two_ints_server</text>
  <text x="730" y="136" class="t-xs t-c t-mu">demo_nodes_py</text>
  <path d="M282,104 L341,104" class="ln-orange thick ar-orange"/>
  <path d="M539,104 L598,104" class="ln-orange thick ar-orange"/>
  <text x="440" y="70" class="t-sm t-c t-orange t-b">a: 2, b: 3</text>
  <path d="M598,140 L539,140" class="ln-teal thick ar-teal dash"/>
  <path d="M341,140 L282,140" class="ln-teal thick ar-teal dash"/>
  <text x="440" y="180" class="t-sm t-c t-teal t-b">sum: 5</text>
  <text x="440" y="226" class="t-xs t-c t-mu">int64 a · int64 b  ---  int64 sum</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '서비스란? — 전화로 주문하기',
      html: `
<p>2장에서 배운 <b>토픽</b>은 라디오 방송처럼 한쪽이 계속 흘려보내는 통신이었습니다. 그런데 로봇을 만들다 보면 <b>"지금 이것 좀 해 줘, 그리고 결과를 알려 줘"</b>가 필요한 순간이 많습니다. 거북이를 한 마리 더 만들기, 지도를 한 장 받아 오기, 모터 드라이버를 켜기 같은 일이죠.</p>
<p>이럴 때 쓰는 것이 <b>서비스(service, 요청을 보내면 응답이 한 번 돌아오는 통신)</b>입니다. 부탁하는 쪽을 <b>클라이언트(client)</b>, 부탁을 받아 처리하는 쪽을 <b>서버(server)</b>라고 부릅니다.</p>

<div class="box analogy"><div class="box-t">📞 비유 — 중국집에 전화 주문</div>
<ul>
  <li><b>전화번호</b> = 서비스 이름 (<code>/spawn</code>) — 어디로 걸지</li>
  <li><b>주문 양식</b> = 서비스 타입 (<code>turtlesim/srv/Spawn</code>) — "메뉴 · 수량 · 주소"를 말해야 한다는 약속</li>
  <li><b>손님</b> = 클라이언트 — 주문(요청)하고 답을 기다림</li>
  <li><b>가게</b> = 서버 — 주문을 받아 처리하고 "네, 접수됐습니다"(응답)를 돌려줌</li>
</ul>
가게는 손님이 전화하기 전까지는 아무 말도 하지 않습니다. 그리고 전화 한 통에 대답도 한 번입니다.</div>

{{fig:callModel}}

<div class="cards c3">
  <div class="card blue"><div class="ci">🙋</div><b>클라이언트</b><p>요청 메시지를 만들어 보내고, 응답을 기다립니다. 여러 노드가 같은 서비스의 클라이언트가 될 수 있어요.</p></div>
  <div class="card orange"><div class="ci">🛎️</div><b>서비스 이름 · 타입</b><p>이름은 <code>/spawn</code> 처럼 토픽과 같은 규칙을 따르고, 타입은 <code>패키지/srv/이름</code> 형식입니다.</p></div>
  <div class="card teal"><div class="ci">🧑‍🍳</div><b>서버</b><p>한 서비스 이름에는 <b>서버가 하나</b>만 있어야 합니다. 요청이 오면 콜백 함수가 처리하고 응답을 돌려줍니다.</p></div>
</div>

<div class="box note"><div class="box-t">📝 서버가 둘이면?</div>
같은 이름으로 서버를 두 개 띄우는 것 자체는 막혀 있지 않지만, 어느 서버가 응답할지 정해져 있지 않습니다. 공식 문서도 서비스 이름마다 서버는 하나만 두라고 안내합니다. 실무에서는 이름 충돌이 생기지 않게 <b>네임스페이스</b>(10장)를 씁니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '토픽 vs 서비스 — 언제 무엇을 쓸까?',
      html: `
<p>토픽과 서비스는 경쟁 관계가 아니라 <b>쓰임새가 다른 도구</b>입니다. 핵심 질문은 두 가지예요. "<b>계속</b> 흘러야 하는 데이터인가?", "보낸 쪽이 <b>결과를 알아야</b> 하는가?"</p>
{{fig:topicVsService}}

<div class="vs">
  <div class="vs-a green"><b>📻 토픽</b>
    <ul><li>퍼블리셔 → 서브스크라이버, <b>한 방향</b></li><li>주기적 · 연속 데이터 (센서, 속도 명령, 위치)</li><li>받는 쪽이 0명이어도, 100명이어도 상관없음</li><li>답장 없음 — 보낸 쪽은 누가 받았는지 모름</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b orange"><b>📞 서비스</b>
    <ul><li>클라이언트 ⇄ 서버, <b>요청과 응답</b></li><li>가끔 한 번 필요한 일 (설정 바꾸기, 계산, 상태 조회)</li><li>서버는 하나, 클라이언트는 여럿 가능</li><li>응답으로 성공 여부 · 결과를 받음</li></ul></div>
</div>

<table class="tbl cmp">
  <thead><tr><th>이런 일이라면</th><th>통신 방식</th><th>이유</th></tr></thead>
  <tbody>
    <tr><td>카메라 영상 · LiDAR 스캔 · 오도메트리</td><td><span class="tag green">토픽</span></td><td>초당 수십 번 계속 흘러야 함</td></tr>
    <tr><td>로봇에 속도 명령 보내기 (<code>/cmd_vel</code>)</td><td><span class="tag green">토픽</span></td><td>계속 새 명령으로 덮어씀, 답장 불필요</td></tr>
    <tr><td>거북이 한 마리 더 만들기 (<code>/spawn</code>)</td><td><span class="tag orange">서비스</span></td><td>한 번 부탁하고 "이름이 뭐로 됐는지" 알아야 함</td></tr>
    <tr><td>지도 한 장 받아 오기, 모터 전원 켜기/끄기</td><td><span class="tag orange">서비스</span></td><td>가끔, 결과(성공/실패)가 중요</td></tr>
    <tr><td>목표 지점까지 30초 동안 이동하기</td><td><span class="tag purple">액션</span></td><td>오래 걸리고 중간 진행 상황 · 취소가 필요 (5장)</td></tr>
  </tbody>
</table>

<div class="box practice"><div class="box-t">🧪 해 보기 — 서비스 통신 눈으로 보기</div>
<ol>
  <li>아래 위젯에서 <b>🔁 서비스</b> 탭이 선택된 것을 확인합니다.</li>
  <li>클라이언트에서 요청을 보내 보고, 주황색 요청이 서버로 갔다가 응답이 <b>같은 클라이언트에게만</b> 돌아오는 것을 확인하세요.</li>
  <li>📨 토픽 탭으로 바꿔 서브스크라이버를 여러 개 붙여 보고, "답장이 없는 방송"과 비교해 보세요.</li>
  <li>아래 로그에 찍히는 <code>Incoming request</code> 줄이 실제 <code>demo_nodes_py</code> 서버와 같은 형식이라는 것도 봐 두세요.</li>
</ol></div>
{{widget:comm|mode=service}}`
    },

    /* ================================================================ 3 */
    {
      title: 'ros2 service 명령으로 서비스 찾아보기',
      html: `
<p>터미널에서 서비스를 살펴보는 명령은 토픽 명령과 거의 같습니다. <code>topic</code> 자리에 <code>service</code> 를 넣는다고 생각하면 됩니다.</p>

<table class="tbl">
  <thead><tr><th>명령</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr><td><code>ros2 service list</code></td><td>지금 떠 있는 서비스 이름 목록</td></tr>
    <tr><td><code>ros2 service list -t</code></td><td>이름 옆에 <b>타입</b>까지 (<code>--show-types</code>)</td></tr>
    <tr><td><code>ros2 service type &lt;이름&gt;</code></td><td>그 서비스의 타입 하나만</td></tr>
    <tr><td><code>ros2 service find &lt;타입&gt;</code></td><td>그 타입을 쓰는 서비스 이름 찾기</td></tr>
    <tr><td><code>ros2 service info &lt;이름&gt;</code></td><td>타입과 클라이언트 · 서버 개수</td></tr>
    <tr><td><code>ros2 interface show &lt;타입&gt;</code></td><td>요청 · 응답 필드 보기 (3장)</td></tr>
    <tr><td><code>ros2 service call &lt;이름&gt; &lt;타입&gt; "&lt;YAML&gt;"</code></td><td><b>직접 요청 보내기</b></td></tr>
  </tbody>
</table>

<p>오른쪽 turtlesim 이 켜져 있는 상태에서 차례로 실행해 봅시다. 먼저 목록과 타입입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service list
ros2 service list -t</code></pre>
<pre class="code out" data-lang="출력"><code>/clear [std_srvs/srv/Empty]
/kill [turtlesim/srv/Kill]
/reset [std_srvs/srv/Empty]
/spawn [turtlesim/srv/Spawn]
/turtle1/set_pen [turtlesim/srv/SetPen]
/turtle1/teleport_absolute [turtlesim/srv/TeleportAbsolute]
/turtle1/teleport_relative [turtlesim/srv/TeleportRelative]
/turtlesim/describe_parameters [rcl_interfaces/srv/DescribeParameters]
...</code></pre>

<p>특정 서비스의 타입, 그리고 거꾸로 "이 타입을 쓰는 서비스는 어디?"를 물어볼 수도 있습니다. <code>Empty</code> 는 요청도 응답도 비어 있는 타입이에요. "그냥 해 줘" 하고 버튼을 누르는 것과 같습니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service type /clear
ros2 service find std_srvs/srv/Empty
ros2 service info /spawn
ros2 interface show turtlesim/srv/Spawn</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 서비스 목록 읽기</div>
<ol>
  <li>위 코드 블록의 <b>▶ 터미널에서 실행</b>을 누르거나, 아래 터미널에 직접 입력하세요. (<kbd>Tab</kbd> 으로 자동 완성)</li>
  <li><code>ros2 service list</code> 결과에서 <b>거북이 전용</b>(<code>/turtle1/...</code>)과 <b>시뮬레이터 전체용</b>(<code>/spawn</code> 등)을 구분해 보세요.</li>
  <li><code>/turtlesim/...parameters</code> 로 끝나는 서비스가 6개 넘게 있는 것을 찾아보세요. 이것은 모든 노드에 자동으로 생기는 서비스입니다(이 장 5절).</li>
</ol></div>
{{widget:lab|with=turtlesim|title=ros2 service 명령 실습|h=380}}

<div class="box tip"><div class="box-t">💡 서비스 이름도 토픽처럼</div>
서비스 이름은 <code>/turtle1/set_pen</code> 처럼 <b>슬래시로 계층</b>을 만듭니다. 이름이 <code>/</code> 로 시작하지 않으면 노드의 네임스페이스 안에 만들어지고, 실행할 때 <code>--ros-args -r</code> 로 이름을 바꿀(리매핑) 수도 있습니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: 'turtlesim 서비스 가지고 놀기',
      html: `
<p>이제 직접 요청을 보내 봅시다. 형식은 언제나 <b><code>ros2 service call 이름 타입 "YAML"</code></b> 입니다. YAML 은 <code>{필드: 값, 필드: 값}</code> 모양이고, <b>콜론 뒤에 한 칸</b> 띄우는 것을 잊지 마세요.</p>
{{fig:turtleSrvs}}

<h3>① 거북이 소환 — /spawn</h3>
<p><code>name</code> 을 빈 문자열로 두면 turtlesim 이 <code>turtle2</code>, <code>turtle3</code> … 처럼 알아서 이름을 붙이고, 그 이름을 <b>응답</b>으로 돌려줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /spawn turtlesim/srv/Spawn "{x: 2, y: 2, theta: 0.2, name: ''}"</code></pre>
<pre class="code out" data-lang="출력"><code>waiting for service to become available...
requester: making request: turtlesim.srv.Spawn_Request(x=2.0, y=2.0, theta=0.2, name='')

response:
turtlesim.srv.Spawn_Response(name='turtle2')</code></pre>
<p>이름을 직접 정할 수도 있습니다. 같은 이름이 이미 있으면 서버가 오류를 냅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /spawn turtlesim/srv/Spawn "{x: 8.0, y: 8.0, theta: 3.14, name: 'leo'}"</code></pre>

<h3>② 펜 색 바꾸기 — /turtle1/set_pen</h3>
<p>거북이가 지나간 자리에 그리는 선의 색(<code>r g b</code>, 0~255)과 굵기(<code>width</code>)를 바꿉니다. 바꾼 뒤 방향 버튼으로 거북이를 움직여 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /turtle1/set_pen turtlesim/srv/SetPen "{r: 255, g: 0, b: 0, width: 5}"</code></pre>
<div class="box warn"><div class="box-t">⚠️ <code>off</code> 필드는 따옴표로</div>
펜을 들어 올리는 필드 이름이 <code>off</code> 인데, YAML 에서 <code>off</code> 는 <b>불리언 거짓(false)</b>으로 읽힐 수 있는 단어입니다. 그래서 필드 이름을 <code>'off'</code> 처럼 따옴표로 감싸 주는 것이 안전합니다: <code>"{'off': 1}"</code></div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /turtle1/set_pen turtlesim/srv/SetPen "{'off': 1}"</code></pre>

<h3>③ 순간 이동 — teleport_absolute · teleport_relative</h3>
<p><code>teleport_absolute</code> 는 화면 좌표(왼쪽 아래가 0,0 · 오른쪽 위가 약 11,11)로 바로 옮기고, <code>teleport_relative</code> 는 지금 방향 기준으로 <code>linear</code> 만큼 앞으로, <code>angular</code>(라디안)만큼 돌립니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /turtle1/teleport_absolute turtlesim/srv/TeleportAbsolute "{x: 1.0, y: 1.0, theta: 0.0}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /turtle1/teleport_relative turtlesim/srv/TeleportRelative "{linear: 3.0, angular: 1.57}"</code></pre>

<h3>④ 지우기 · 초기화 · 없애기 — /clear · /reset · /kill</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /clear std_srvs/srv/Empty</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /kill turtlesim/srv/Kill "{name: 'turtle2'}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /reset std_srvs/srv/Empty</code></pre>
<p><code>/clear</code> 는 그림만 지우고, <code>/reset</code> 은 모든 거북이를 없앤 뒤 <code>turtle1</code> 만 가운데에 다시 만듭니다. 거북이를 <code>/kill</code> 하면 그 거북이의 <code>/turtleN/...</code> 서비스와 토픽도 함께 사라집니다. <code>ros2 service list</code> 로 확인해 보세요.</p>

<div class="box practice"><div class="box-t">🧪 해 보기 — 서비스로 그림 그리기</div>
<ol>
  <li>위 코드 블록을 차례로 실행해 <code>turtle2</code> 를 만들고, <code>turtle1</code> 의 펜을 빨간색 · 굵게 바꿉니다.</li>
  <li>화면을 누르고 방향키(또는 ▲⟲▼⟳ 버튼)로 거북이를 움직여 빨간 선을 그려 보세요.</li>
  <li><code>/turtle2/set_pen</code> 으로 두 번째 거북이의 펜도 바꿔 보세요. (서비스 이름에 거북이 이름이 들어갑니다!)</li>
  <li><code>/kill</code> 로 <code>turtle2</code> 를 없앤 뒤 <code>ros2 service list</code> 에서 <code>/turtle2/...</code> 가 사라졌는지 확인하고, <code>/reset</code> 으로 마무리합니다.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=turtlesim 서비스 실습|h=420}}

<div class="box tip"><div class="box-t">💡 GUI 로 서비스 부르기 — rqt_service_caller</div>
명령어가 길어 부담스러우면 <b>rqt_service_caller</b> 를 쓰세요. 서비스를 고르면 요청 필드가 표로 나오고, 값을 채워 <b>Call</b> 버튼을 누르면 응답이 아래에 보입니다. 이 사이트의 터미널에서도 창이 뜹니다.
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run rqt_service_caller rqt_service_caller</code></pre></div>`
    },

    /* ================================================================ 5 */
    {
      title: '서비스 타입 해부와 숨은 파라미터 서비스',
      html: `
<p>3장에서 본 것처럼 서비스 타입은 <code>.srv</code> 파일로 정의합니다. 파일 가운데의 <b><code>---</code></b> 한 줄이 핵심이에요. 위쪽은 <b>요청</b>, 아래쪽은 <b>응답</b> 메시지입니다. 실제로 ROS 2 는 이 파일에서 <code>Spawn_Request</code>, <code>Spawn_Response</code> 두 메시지 타입을 만들어 씁니다.</p>
{{fig:srvType}}

<div class="box practice"><div class="box-t">🧪 해 보기 — 요청 · 응답 필드 찾기</div>
<ol>
  <li>아래 인터페이스 탐색기에서 <code>turtlesim/srv/Spawn</code> 을 보고 요청 필드 4개와 응답 필드 1개를 확인하세요.</li>
  <li><code>turtlesim/srv/Kill</code>, <code>std_srvs/srv/Empty</code>, <code>example_interfaces/srv/AddTwoInts</code> 로 바꿔 보며 <code>---</code> 아래가 비어 있는 타입을 찾아보세요.</li>
  <li>명령 만들기 기능으로 만든 <code>ros2 service call</code> 명령을 복사해 위 터미널에서 실행해 보세요.</li>
</ol></div>
{{widget:iface|type=turtlesim/srv/Spawn}}

<h3>모든 노드에 있는 "숨은" 서비스</h3>
<p><code>ros2 service list</code> 에서 본 <code>/turtlesim/get_parameters</code> 같은 서비스는 turtlesim 이 일부러 만든 것이 아닙니다. <b>rclcpp · rclpy 로 만든 거의 모든 노드</b>는 파라미터(6장)를 밖에서 읽고 바꿀 수 있도록 아래 서비스를 <b>자동으로</b> 엽니다. <code>ros2 param</code> 명령은 사실 이 서비스들을 부르는 클라이언트예요.</p>
<table class="tbl">
  <thead><tr><th>서비스 (노드 이름 뒤에 붙음)</th><th>타입</th><th>쓰는 곳</th></tr></thead>
  <tbody>
    <tr><td><code>list_parameters</code></td><td><code>rcl_interfaces/srv/ListParameters</code></td><td><code>ros2 param list</code></td></tr>
    <tr><td><code>get_parameters</code></td><td><code>rcl_interfaces/srv/GetParameters</code></td><td><code>ros2 param get</code></td></tr>
    <tr><td><code>set_parameters</code></td><td><code>rcl_interfaces/srv/SetParameters</code></td><td><code>ros2 param set</code></td></tr>
    <tr><td><code>set_parameters_atomically</code></td><td><code>rcl_interfaces/srv/SetParametersAtomically</code></td><td>여러 개를 한꺼번에 (전부 성공 or 전부 실패)</td></tr>
    <tr><td><code>describe_parameters</code></td><td><code>rcl_interfaces/srv/DescribeParameters</code></td><td><code>ros2 param describe</code></td></tr>
    <tr><td><code>get_parameter_types</code></td><td><code>rcl_interfaces/srv/GetParameterTypes</code></td><td>타입만 조회</td></tr>
  </tbody>
</table>
<p>실제 ROS 2 에서는 이 서비스를 직접 불러 볼 수도 있습니다(아래 명령은 실제 Ubuntu 에서 해 보세요). 결과가 <code>ros2 param get /turtlesim background_r</code> 과 같은 값인 것을 확인할 수 있어요.</p>
<pre class="code" data-lang="bash"><code>ros2 service call /turtlesim/get_parameters rcl_interfaces/srv/GetParameters "{names: ['background_r']}"</code></pre>

<div class="box note"><div class="box-t">📝 Jazzy 에서 보이는 것 하나 더</div>
Jazzy 에서는 노드가 자기 메시지 타입 설명을 알려 주는 <code>/노드/get_type_description</code> 서비스(<code>type_description_interfaces/srv/GetTypeDescription</code>)도 열 수 있습니다. 목록에서 보이더라도 지금은 신경 쓰지 않아도 됩니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'AddTwoInts — 공식 예제 서버와 클라이언트',
      html: `
<p>ROS 2 공식 튜토리얼의 대표 서비스 예제는 <b>두 정수 더하기(AddTwoInts)</b>입니다. 요청으로 <code>a</code>, <code>b</code> 를 보내면 응답으로 <code>sum</code> 이 돌아옵니다. <code>demo_nodes_py</code> 패키지에 서버와 클라이언트가 모두 들어 있어요.</p>
{{fig:addFlow}}

<p>서버를 <b>백그라운드</b>(<code>&amp;</code>)로 켜고, 같은 터미널에서 요청을 보내 봅시다. 실제 Ubuntu 에서는 보통 터미널 두 개를 열어 한쪽에 서버, 한쪽에 클라이언트를 띄웁니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_py add_two_ints_server &amp;
ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 2, b: 3}"</code></pre>
<pre class="code out" data-lang="출력"><code>[INFO] [1727000000.123456789] [add_two_ints_server]: Incoming request
a: 2 b: 3
requester: making request: example_interfaces.srv.AddTwoInts_Request(a=2, b=3)

response:
example_interfaces.srv.AddTwoInts_Response(sum=5)</code></pre>

<p>이번에는 명령 대신 <b>클라이언트 노드</b>가 요청을 보내게 합니다. 서버가 없으면 <code>service not available, waiting again...</code> 을 찍으며 기다리다가, 서버가 뜨면 바로 요청을 보냅니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_py add_two_ints_client</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 서버 먼저? 클라이언트 먼저?</div>
<ol>
  <li>아래 터미널 칩에서 <code>ros2 service list -t</code> 를 눌러 <code>/add_two_ints</code> 가 있는지 봅니다.</li>
  <li>서버가 없는 상태라면 클라이언트를 먼저 실행해 <b>기다리는</b> 모습을 보세요. <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춥니다.</li>
  <li>서버를 <code>&amp;</code> 로 켠 뒤 클라이언트를 다시 실행하면 <code>Result of add_two_ints</code> 가 찍히고 클라이언트는 스스로 끝납니다.</li>
  <li><code>{a: 100, b: -58}</code> 처럼 값을 바꿔 <code>ros2 service call</code> 도 해 보세요.</li>
</ol></div>
{{widget:term|chips=ros2 service list -t;ros2 run demo_nodes_py add_two_ints_server &;ros2 run demo_nodes_py add_two_ints_client;ros2 service info /add_two_ints;ros2 node list|h=280}}

<h3>파이썬으로 서버 만들기 (미리 보기)</h3>
<p>서버 코드는 생각보다 짧습니다. <code>create_service(타입, 이름, 콜백)</code> 한 줄로 서비스를 열고, 콜백은 <code>request</code> 를 읽어 <code>response</code> 를 채워 <b>return</b> 합니다. 자세한 문법은 9장에서 다룹니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 내가 만든 서버에 요청하기</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>을 눌러 <code>minimal_service</code> 노드를 띄웁니다.</li>
  <li>오른쪽 터미널에서 <code>ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 7, b: 8}"</code> 을 입력하세요.</li>
  <li>콜백의 <code>request.a + request.b</code> 를 <code>request.a * request.b</code> 로 바꿔 다시 실행하고 결과가 바뀌는지 보세요. (타입 이름은 AddTwoInts 지만, 무슨 계산을 할지는 서버 마음입니다!)</li>
</ol></div>
{{widget:pylab|ex=add_server|with=term}}

<p>클라이언트 쪽 코드는 <code>create_client</code> → <code>wait_for_service</code> → <code>call_async</code> → <code>spin_until_future_complete</code> 순서입니다. 위 서버를 켜 둔 채로 실행하면 <code>41 + 1 = 42</code> 가 찍힙니다.</p>
{{widget:pylab|ex=add_client|with=term}}`
    },

    /* ================================================================ 7 */
    {
      title: '파이썬으로 거북이 소환하기 — Spawn 클라이언트',
      html: `
<p>명령어로 한 일을 코드로 옮겨 봅시다. 아래 프로그램은 <code>/spawn</code> 서비스를 세 번 불러 무작위 위치에 거북이를 만들고, 응답으로 받은 <b>이름</b>을 이용해 각 거북이의 <code>set_pen</code> 서비스까지 부릅니다. 응답을 받아야 다음 일을 할 수 있다는 것이 서비스의 핵심이에요.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import random
import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn, SetPen


def main():
    rclpy.init()
    node = Node('spawner')
    cli = node.create_client(Spawn, '/spawn')
    cli.wait_for_service()

    for i in range(3):
        req = Spawn.Request()
        req.x = random.uniform(1.0, 10.0)
        req.y = random.uniform(1.0, 10.0)
        req.theta = random.uniform(-3.14, 3.14)
        future = cli.call_async(req)
        rclpy.spin_until_future_complete(node, future)
        name = future.result().name
        node.get_logger().info(f'{name} 를 소환했습니다!')

        pen = node.create_client(SetPen, f'/{name}/set_pen')
        pen.wait_for_service()
        f2 = pen.call_async(SetPen.Request(r=255, g=80 * i, b=0, width=5, off=0))
        rclpy.spin_until_future_complete(node, f2)

    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>

<ol class="steps-list">
  <li><b>클라이언트 만들기</b> — <code>node.create_client(Spawn, '/spawn')</code>: 타입과 이름은 서버와 똑같아야 합니다.</li>
  <li><b>서버 기다리기</b> — <code>wait_for_service()</code>: 서버가 아직 안 떴으면 여기서 기다립니다. 실무에서는 <code>timeout_sec=1.0</code> 을 주고 반복하며 로그를 찍는 경우가 많아요.</li>
  <li><b>요청 채우기</b> — <code>Spawn.Request()</code> 를 만들고 필드에 값을 넣습니다.</li>
  <li><b>비동기로 보내기</b> — <code>call_async()</code> 는 기다리지 않고 <b>future</b>(나중에 결과가 담길 상자)를 바로 돌려줍니다.</li>
  <li><b>결과 기다리기</b> — <code>spin_until_future_complete()</code> 가 노드를 돌리며 응답이 올 때까지 기다린 뒤, <code>future.result()</code> 로 응답을 꺼냅니다.</li>
</ol>

<div class="box practice"><div class="box-t">🧪 해 보기 — 거북이 군단</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>을 누르면 오른쪽 turtlesim 에 거북이 세 마리가 생깁니다.</li>
  <li><code>range(3)</code> 을 <code>range(6)</code> 으로 바꾸고, 펜 색 <code>g=80 * i</code> 를 <code>g=40 * i</code> 로 바꿔 다시 실행해 보세요.</li>
  <li><code>req.name = f'ninja{i}'</code> 한 줄을 추가해 이름을 직접 지어 보세요. 두 번 실행하면 어떤 오류가 날까요? (같은 이름은 만들 수 없습니다)</li>
</ol></div>
{{widget:pylab|ex=spawn|with=turtlesim}}`
    },

    /* ================================================================ 8 */
    {
      title: '서비스를 쓸 때 주의할 점',
      html: `
<p>서비스는 편리하지만 잘못 쓰면 로봇 전체가 멈출 수 있습니다. 초보자가 가장 많이 겪는 문제 세 가지를 기억해 두세요.</p>

<div class="cards c3">
  <div class="card orange"><div class="ci">⚡</div><b>서버 콜백은 짧게</b><p>서비스 콜백이 도는 동안 그 노드는 (기본 설정에서) 다른 콜백을 처리하지 못합니다. 몇 초씩 걸리는 일(이동, 긴 계산)은 서비스가 아니라 <b>액션</b>(5장)으로 만드세요.</p></div>
  <div class="card red"><div class="ci">🔒</div><b>콜백 안에서 동기 호출 금지</b><p>콜백 안에서 다른 서비스를 <code>call()</code>(동기)로 부르면, 응답을 받아 줄 실행기가 바로 그 콜백에 묶여 <b>교착 상태(deadlock)</b>에 빠집니다.</p></div>
  <div class="card blue"><div class="ci">⏱️</div><b>항상 기다릴 준비</b><p>서버가 아직 없을 수 있으니 <code>wait_for_service(timeout_sec=...)</code> 로 확인하고, 응답이 안 올 때를 대비해 시간 제한을 두세요.</p></div>
</div>

{{fig:asyncCall}}

<div class="box warn"><div class="box-t">⚠️ 교착 상태 예시 — 이렇게 쓰면 멈춥니다</div>
<pre class="code" data-lang="python"><code>def timer_callback(self):
    req = AddTwoInts.Request(a=1, b=2)
    <span class="cm"># ❌ 타이머 콜백 안에서 동기 호출 → 응답을 받을 실행기가 이 콜백에 막혀 영원히 대기</span>
    result = self.cli.call(req)

def timer_callback(self):
    <span class="cm"># ✅ 비동기로 보내고, 응답이 오면 불릴 함수를 등록</span>
    future = self.cli.call_async(AddTwoInts.Request(a=1, b=2))
    future.add_done_callback(lambda f: self.get_logger().info(f'sum={f.result().sum}'))</code></pre>
동기 <code>call()</code> 을 꼭 써야 한다면 콜백 그룹과 멀티스레드 실행기를 함께 써야 합니다. 이 내용은 11장(실행기 · 콜백 그룹)에서 <code>exec</code> 위젯으로 직접 재현해 봅니다.</div>

<table class="tbl">
  <thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
  <tbody>
    <tr><td><code>waiting for service to become available...</code> 에서 멈춤</td><td>서버 노드가 안 떠 있거나 이름 오타</td><td><code>ros2 service list</code> 로 이름 확인, 서버 실행</td></tr>
    <tr><td><code>The passed service type is invalid</code></td><td>타입 이름 오타 (<code>srv</code> 를 <code>msg</code> 로 쓰는 등)</td><td><code>ros2 service type</code> 결과를 그대로 복사</td></tr>
    <tr><td><code>needs to be a dictionary in YAML format</code></td><td>YAML 모양이 틀림 (콜론 뒤 공백 없음, 따옴표 누락)</td><td><code>"{a: 1, b: 2}"</code> 처럼 전체를 큰따옴표로</td></tr>
    <tr><td>다른 토픽 콜백이 한동안 멈춤</td><td>서버 콜백이 너무 오래 걸림</td><td>일을 줄이거나 액션으로 바꾸기</td></tr>
    <tr><td>프로그램이 응답 없이 굳음</td><td>콜백 안의 동기 <code>call()</code> (교착)</td><td><code>call_async()</code> + 콜백, 또는 콜백 그룹</td></tr>
  </tbody>
</table>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 서비스는 "설정과 조회"에</div>
실제 로봇 소프트웨어에서 서비스는 주로 <b>설정 바꾸기 · 상태 조회 · 짧은 명령</b>에 쓰입니다. 예를 들어 <code>slam_toolbox</code> 는 지도 저장 · 직렬화를 서비스로 제공하고, <code>nav2_map_server</code> 는 지도를 불러오는 <code>load_map</code> 서비스를 가지고 있어요. 반면 "목표까지 가라", "팔을 이 자세로 움직여라"처럼 오래 걸리는 일은 모두 액션입니다.</div>

<div class="box trend"><div class="box-t">🚀 최신 동향 — 서비스 내용 엿보기</div>
Iron 이후 배포판에는 <b>서비스 인트로스펙션</b> 기능이 들어와, 설정을 켜면 <code>ros2 service echo</code> 로 오가는 요청 · 응답을 토픽처럼 들여다볼 수 있습니다. 기본값은 꺼져 있어서 노드 쪽에서 켜 줘야 합니다(Jazzy 공식 튜토리얼 <i>Understanding services</i> 참고).</div>`
    }
  ],

  videos: [
    { title: 'What is a ROS2 Service? - ROS2 Tutorial 10', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=FSqm0fDfxrk', lang: 'en', min: '14분', desc: '토픽과 서비스의 차이, 클라이언트 · 서버 구조를 그림으로 설명합니다. 이 장 1~2절 복습용.' },
    { title: "ROS2 - 'ros2 service' Command Line Walk-through", channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=5l9U1yZBuDE', lang: 'en', min: '5분', desc: 'ros2 service list · type · call 을 짧게 훑어봅니다. 3~4절 명령 실습과 함께 보세요.' },
    { title: 'Write a ROS2 Service Client with Python - ROS2 Tutorial 11', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=vCTbUgw6k8U', lang: 'en', min: '23분', desc: 'call_async 와 future 로 클라이언트를 만드는 과정. 7절 Spawn 클라이언트 코드와 같은 흐름입니다.' },
    { title: 'ROS2 Services', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=PcO-sTuP8zg', lang: 'en', min: '4분', desc: '4분 만에 서비스 개념과 turtlesim 호출을 정리하는 짧은 영상.' },
    { title: '[ROS2] 3-4. ROS2 Service 기초', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=5WGv-F9HyEk', lang: 'ko', min: '14분', desc: '한국어로 서비스 기초와 turtlesim 서비스 호출을 따라 해 봅니다.' },
    { title: '[ROS 2 - 초급] #7 서비스(Service) 통신 (CLI 명령어 설명 및 실습)', channel: 'KIMe Lab', url: 'https://www.youtube.com/watch?v=IbD4JymM3_I', lang: 'ko', min: '14분', desc: 'ros2 service 명령어를 하나씩 한국어로 설명하는 실습 영상.' }
  ],

  terms: [
    ['서비스(service)', '클라이언트가 요청을 보내면 서버가 처리해 응답을 한 번 돌려주는 요청/응답 통신'],
    ['서비스 클라이언트', '요청 메시지를 만들어 보내고 응답을 기다리는 쪽. 한 서비스에 여러 개 있을 수 있음'],
    ['서비스 서버', '요청을 받아 콜백에서 처리하고 응답을 돌려주는 쪽. 서비스 이름마다 하나만 두는 것이 원칙'],
    ['요청(Request) · 응답(Response)', '.srv 파일에서 --- 위(요청)와 아래(응답)에 정의된 두 메시지'],
    ['.srv 파일', '서비스 타입을 정의하는 인터페이스 파일. 패키지/srv/이름 형식의 타입이 됨'],
    ['ros2 service call', '터미널에서 서비스에 직접 요청을 보내는 명령. 형식: 이름 타입 "YAML"'],
    ['std_srvs/srv/Empty', '요청과 응답이 모두 비어 있는 서비스 타입. /clear, /reset 등이 사용'],
    ['/spawn · /kill', 'turtlesim 에서 거북이를 새로 만들고 없애는 서비스'],
    ['teleport_absolute · teleport_relative', '거북이를 절대 좌표로, 또는 현재 자세 기준 상대량만큼 순간 이동시키는 서비스'],
    ['AddTwoInts', 'example_interfaces 의 예제 서비스 타입. int64 a, b 를 받아 int64 sum 을 돌려줌'],
    ['call_async · future', '요청을 보내고 바로 돌아오는 비동기 호출과, 나중에 응답이 담길 결과 상자'],
    ['교착 상태(deadlock)', '서로가 끝나기를 기다리며 영원히 멈춘 상태. 콜백 안에서 동기 서비스 호출 시 발생'],
    ['파라미터 서비스', 'get_parameters · set_parameters 등 거의 모든 노드에 자동으로 생기는 서비스. ros2 param 이 사용'],
    ['rqt_service_caller', '서비스를 골라 요청 필드를 채우고 Call 버튼으로 호출하는 GUI 도구']
  ],

  summary: [
    '서비스는 <b>클라이언트의 요청 → 서버의 응답</b>이 1 : 1 짝을 이루는 통신이다 (📞 전화 주문)',
    '<b>계속 흐르는 데이터는 토픽</b>, <b>가끔 부탁하고 결과를 알아야 하는 일은 서비스</b>, 오래 걸리는 일은 액션',
    '<code>ros2 service list -t</code> · <code>type</code> · <code>find</code> · <code>info</code> 로 찾고, <code>ros2 service call 이름 타입 "YAML"</code> 로 부른다',
    'turtlesim: <code>/spawn</code> · <code>/kill</code> · <code>/clear</code> · <code>/reset</code> + 거북이마다 <code>set_pen</code> · <code>teleport_absolute</code> · <code>teleport_relative</code>',
    '.srv 는 <code>---</code> 위가 요청, 아래가 응답. 거의 모든 노드에는 <b>파라미터 서비스 6종</b>이 자동으로 있다',
    '서버 콜백은 짧게, 클라이언트는 <code>call_async()</code> — 콜백 안의 동기 <code>call()</code> 은 교착 상태를 부른다'
  ],

  quiz: [
    { q: '서비스에 대한 설명으로 <b>틀린</b> 것은?', options: ['요청 하나에 응답이 하나 돌아온다', '한 서비스 이름에는 서버를 하나만 두는 것이 원칙이다', '서버는 요청이 없어도 주기적으로 응답을 방송한다', '클라이언트는 여러 개일 수 있다'], answer: 2, explain: '서버는 요청이 와야만 응답합니다. 주기적으로 방송하는 것은 토픽의 퍼블리셔입니다.' },
    { q: '다음 중 <b>서비스</b>로 만드는 것이 가장 알맞은 것은?', options: ['30 Hz 카메라 영상 전달', '로봇에 속도 명령을 계속 보내기', '모터 드라이버 전원을 켜고 성공 여부 받기', '목표 지점까지 1분 동안 이동하며 진행률 보고'], answer: 2, explain: '한 번 부탁하고 결과(성공/실패)를 받아야 하는 짧은 일이 서비스에 맞습니다. 영상 · 속도 명령은 토픽, 오래 걸리며 진행률이 필요한 일은 액션입니다.' },
    { q: '<code>ros2 service call /spawn turtlesim/srv/Spawn "{x: 2, y: 2, theta: 0.2, name: \'\'}"</code> 의 응답으로 오는 것은?', options: ['새 거북이의 x, y 좌표', '새 거북이의 이름', '성공/실패 불리언', '아무것도 오지 않는다'], answer: 1, explain: 'Spawn.srv 의 --- 아래(응답)에는 string name 하나만 있습니다. 이름을 비워 보내면 turtlesim 이 정한 이름(예: turtle2)을 돌려줍니다.' },
    { q: '<code>/clear</code> 와 <code>/reset</code> 의 차이로 옳은 것은?', options: ['둘 다 완전히 같다', '/clear 는 그림만 지우고, /reset 은 거북이까지 처음 상태로 되돌린다', '/clear 는 거북이를 모두 없애고, /reset 은 그림만 지운다', '/reset 은 turtlesim 노드를 종료한다'], answer: 1, explain: '/clear 는 선만 지웁니다. /reset 은 모든 거북이를 없애고 turtle1 을 가운데에 다시 만들며 그림도 지웁니다.' },
    { q: '모든 노드에 자동으로 생기는 <code>/노드이름/get_parameters</code> 같은 서비스는 누가 주로 사용할까?', options: ['ros2 topic echo', 'ros2 param 명령', 'colcon build', 'rqt_graph'], answer: 1, explain: 'ros2 param list/get/set 은 노드의 list_parameters · get_parameters · set_parameters 서비스를 부르는 클라이언트입니다.' },
    { q: '타이머 콜백 안에서 <code>self.cli.call(req)</code>(동기 호출)을 했더니 프로그램이 굳었다. 가장 알맞은 원인과 해결은?', options: ['서버가 너무 빨라서 — sleep 을 넣는다', '응답을 받을 실행기가 그 콜백에 묶인 교착 상태 — call_async() 와 완료 콜백을 쓴다', '메시지 타입이 틀려서 — 타입을 바꾼다', '토픽을 써야 해서 — 서비스를 지운다'], answer: 1, explain: '단일 스레드 실행기에서는 콜백이 끝나야 다른 일(응답 수신)을 처리할 수 있습니다. 콜백 안에서는 call_async() 로 보내고 add_done_callback 으로 결과를 받으세요.' }
  ],

  slides: [
    {
      title: '묻고 답하기',
      layout: 'center',
      html: `<div class="s-big">토픽은 📻 <b>방송</b>,<br>서비스는 📞 <b>전화 주문</b></div>
<div class="cards c3">
  <div class="card blue step"><div class="ci">🙋</div><b>클라이언트</b><p>요청</p></div>
  <div class="card orange step"><div class="ci">🛎️</div><b>/spawn</b><p>이름 · 타입</p></div>
  <div class="card teal step"><div class="ci">🧑‍🍳</div><b>서버</b><p>응답</p></div>
</div>`,
      notes: '짜장면 주문 발문으로 시작합니다. 가게가 계속 방송하는 것(토픽)과 전화로 주문하고 답을 듣는 것(서비스)을 대비시키세요. 카드를 하나씩 열며 역할 이름을 소개합니다. (3분)'
    },
    {
      title: '요청 → 처리 → 응답',
      html: `{{fig:callModel|nocap}}`,
      notes: '①②③ 순서를 손으로 짚습니다. “요청 한 번에 응답은 몇 번?” → 한 번. 서버는 요청이 오기 전까지 아무것도 보내지 않는다는 점을 강조하세요. (4분)'
    },
    {
      title: '토픽 vs 서비스',
      html: `{{fig:topicVsService|nocap}}`,
      notes: '왼쪽은 받는 사람이 몇 명이든 계속 흘러가는 방송, 오른쪽은 한 명이 묻고 한 명이 답하는 전화입니다. 학생들에게 “GPS 위치는? 지도 저장은?” 하고 물어 분류해 보게 하세요. (4분)'
    },
    {
      title: '어느 쪽일까?',
      html: `<table class="tbl cmp">
<thead><tr><th>상황</th><th>답</th></tr></thead>
<tbody>
<tr class="step"><td>LiDAR 스캔 10 Hz</td><td><span class="tag green">토픽</span></td></tr>
<tr class="step"><td>거북이 한 마리 추가</td><td><span class="tag orange">서비스</span></td></tr>
<tr class="step"><td>모터 전원 켜기</td><td><span class="tag orange">서비스</span></td></tr>
<tr class="step"><td>30초 걸리는 이동</td><td><span class="tag purple">액션</span></td></tr>
</tbody></table>`,
      notes: '한 줄씩 공개하기 전에 학생이 먼저 답하게 합니다. 마지막 줄은 다음 장(액션)을 예고하는 장치입니다. (3분)'
    },
    {
      title: '직접 보기 — 서비스 애니메이션',
      html: `{{widget:comm|mode=service}}`,
      notes: '요청 버튼을 눌러 주황 요청이 서버로 가고 응답이 같은 클라이언트에게만 돌아오는 것을 보여 줍니다. 토픽 탭으로 바꿔 차이를 비교해도 좋습니다. (4분)'
    },
    {
      title: 'ros2 service 명령 5종',
      html: `<div class="s-points">
<p class="step"><code>ros2 service list -t</code> — 목록 + 타입</p>
<p class="step"><code>ros2 service type /clear</code> — 타입 하나</p>
<p class="step"><code>ros2 service find std_srvs/srv/Empty</code></p>
<p class="step"><code>ros2 interface show turtlesim/srv/Spawn</code></p>
<p class="step"><code>ros2 service call 이름 타입 "YAML"</code></p>
</div>`,
      notes: 'topic 명령과 모양이 거의 같다는 점을 짚습니다. call 의 세 칸(이름 · 타입 · YAML)을 칠판에 크게 적어 두고, YAML 은 콜론 뒤 공백이 필수라는 점을 강조하세요. (4분)'
    },
    {
      title: 'turtlesim 의 서비스 지도',
      html: `{{fig:turtleSrvs|nocap}}`,
      notes: '왼쪽은 시뮬레이터 전체용, 오른쪽은 거북이마다 붙는 서비스, 아래는 모든 노드에 있는 파라미터 서비스입니다. “turtle2 를 만들면 어떤 서비스가 새로 생길까요?” 하고 물어보세요. (3분)'
    },
    {
      title: '실습 — 서비스로 그림 그리기',
      html: `{{widget:lab|with=turtlesim|h=440}}`,
      notes: '터미널에 spawn → set_pen → teleport_absolute 순서로 직접 입력하며 시연합니다. 학생들에게는 “자기 이니셜을 서비스와 방향키만으로 그리기” 미션을 줍니다. (10분)'
    },
    {
      title: '.srv = 요청 --- 응답',
      html: `{{fig:srvType|nocap}}`,
      notes: '--- 한 줄이 요청과 응답을 가른다는 것, 명령의 YAML 에는 위쪽 필드만 쓴다는 것을 연결합니다. 3장의 인터페이스 내용을 되짚는 시간입니다. (3분)'
    },
    {
      title: 'AddTwoInts',
      html: `{{fig:addFlow|nocap}}
<pre class="code" data-lang="bash"><code>ros2 run demo_nodes_py add_two_ints_server
ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 2, b: 3}"</code></pre>`,
      notes: '공식 튜토리얼 예제입니다. 서버를 먼저 켜지 않고 클라이언트를 실행하면 기다린다는 점을 시연하세요. “서버가 곱셈을 해도 될까요?” — 타입은 약속일 뿐, 처리는 서버 마음이라는 점을 짚습니다. (5분)'
    },
    {
      title: '파이썬 클라이언트 5단계',
      html: `<ol class="steps-list">
<li class="step"><b>create_client</b>(Spawn, '/spawn')</li>
<li class="step"><b>wait_for_service</b>()</li>
<li class="step"><b>Spawn.Request()</b> 채우기</li>
<li class="step"><b>call_async</b>() → future</li>
<li class="step"><b>spin_until_future_complete</b> → result()</li>
</ol>`,
      notes: '7절의 spawn 예제를 실습기에서 실행해 보여 준 뒤 이 슬라이드로 정리합니다. future 는 “진동벨” 비유가 잘 통합니다 — 주문하고 받은 진동벨이 울리면 음식(응답)을 가지러 갑니다. (5분)'
    },
    {
      title: '콜백 안의 동기 호출 = 교착',
      html: `{{fig:asyncCall|nocap}}`,
      notes: '아래 그림의 빨간 막대가 핵심입니다. 응답을 받아 줄 사람이 바로 기다리고 있는 나 자신이라 영원히 못 받는 상황이에요. 해결은 call_async + 완료 콜백. 11장 exec 위젯에서 다시 재현한다고 예고하세요. (4분)'
    },
    {
      title: '서비스 3대 수칙',
      html: `<div class="cards c3">
<div class="card orange step"><div class="ci">⚡</div><b>콜백은 짧게</b><p>오래 걸리면 액션</p></div>
<div class="card red step"><div class="ci">🔒</div><b>동기 call 금지</b><p>콜백 안에서는 call_async</p></div>
<div class="card blue step"><div class="ci">⏱️</div><b>기다릴 준비</b><p>wait_for_service(timeout)</p></div>
</div>`,
      notes: '세 수칙을 한 번에 정리합니다. 첫 번째 수칙이 자연스럽게 다음 장 “액션”으로 이어진다는 점을 말하며 마무리하세요. (2분)'
    }
  ]
});
