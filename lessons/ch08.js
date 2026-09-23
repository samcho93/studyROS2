/* 8장 — rclpy로 퍼블리셔 · 서브스크라이버 만들기 */
Course.lesson({
  id: 'ch08', no: '08',
  icon: '🐍',
  title: 'rclpy로 퍼블리셔 · 서브스크라이버 만들기',
  subtitle: '명령어로 구경만 하던 토픽을, 이제 내 파이썬 코드로 보내고 받아 봅시다',
  level: '기초', time: '150분',
  goals: [
    'rclpy 프로그램의 뼈대(init → Node → spin → shutdown)를 그림으로 설명하고 직접 쓸 수 있다',
    'Node 클래스를 상속해 퍼블리셔 · 타이머 · 서브스크라이버 콜백을 만들 수 있다',
    '메시지 객체(String, Twist, Pose)의 필드를 올바른 타입으로 채우고, 로그를 수준별로 찍을 수 있다',
    '"콜백은 spin 하는 동안에만 불린다"는 이벤트 루프의 원리를 설명할 수 있다',
    'Pose 를 구독하고 cmd_vel 을 발행하는 거북이 제어 노드(P 제어)를 만들고 패키지 실행 파일로 등록할 수 있다'
  ],
  teacher: {
    intro: '"지금까지는 ros2 topic pub 으로 거북이를 움직였죠. 그런데 로봇이 스스로 판단해서 움직이려면 무엇이 필요할까요?" 하고 묻습니다. 답(프로그램 · 코드)을 받은 뒤, 오늘은 그 프로그램 = 노드를 파이썬으로 직접 만든다고 선언합니다. (2분)',
    flow: '① 도입 · rclpy 뼈대 15분 → ② Node 클래스 · 퍼블리셔 · 타이머(talker 실습) 20분 → ③ 서브스크라이버 · 콜백(listener · pubsub 실습) 15분 → ④ 메시지 객체 · float 함정 · 로그 15분 → ⑤ spin 과 이벤트 루프 15분 → ⑥ 거북이 제어(원 · Pose · P 제어) 30분 → ⑦ 연습 문제(사각형 · 벽 튕기기) 20분 → ⑧ 패키지로 만들기 · 흔한 실수 · 퀴즈 10분'
  },

  figs: {
    /* ------------------------------------------------------------ rclpy 프로그램의 뼈대 */
    anatomy: {
      caption: 'rclpy 프로그램의 일생 — 초기화하고, 노드를 만들고, spin 으로 콜백을 돌리다가, 정리하고 끝냅니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="rclpy.init, 노드 생성, rclpy.spin, destroy_node와 shutdown 네 단계">
  <rect x="20" y="60" width="180" height="120" rx="14" class="teal"/>
  <text x="110" y="92" class="t-lg t-c">🔌</text>
  <text x="110" y="126" class="t-b t-c t-mono t-teal">rclpy.init()</text>
  <text x="110" y="152" class="t-xs t-c">ROS 2 통신 준비</text>
  <text x="110" y="168" class="t-xs t-c t-mu">(DDS 참가자 생성)</text>

  <line x1="200" y1="120" x2="238" y2="120" class="ln ar"/>

  <rect x="240" y="60" width="180" height="120" rx="14" class="box"/>
  <ellipse cx="330" cy="100" rx="70" ry="24" class="blue"/>
  <text x="330" y="100" class="t-sm t-c t-b t-blue">/talker</text>
  <text x="330" y="146" class="t-b t-c t-mono">Node('talker')</text>
  <text x="330" y="168" class="t-xs t-c">퍼블리셔 · 타이머 · 구독 등록</text>

  <line x1="420" y1="120" x2="458" y2="120" class="ln ar"/>

  <rect x="460" y="40" width="210" height="160" rx="14" class="orange"/>
  <text x="565" y="68" class="t-b t-c t-mono t-orange">rclpy.spin(node)</text>
  <circle cx="565" cy="130" r="44" class="box"/>
  <path d="M565,86 A44,44 0 1,1 521,130" class="ln-orange thick ar-orange"/>
  <text x="565" y="125" class="t-xs t-c">일이 생기면</text>
  <text x="565" y="141" class="t-xs t-c">콜백 실행</text>
  <text x="565" y="190" class="t-xs t-c t-mu">Ctrl+C 전까지 계속 돎</text>

  <line x1="670" y1="120" x2="708" y2="120" class="ln ar"/>

  <rect x="710" y="60" width="150" height="120" rx="14" class="gray"/>
  <text x="785" y="92" class="t-lg t-c">🧹</text>
  <text x="785" y="124" class="t-sm t-c t-mono">destroy_node()</text>
  <text x="785" y="146" class="t-sm t-c t-mono">rclpy.shutdown()</text>
  <text x="785" y="168" class="t-xs t-c t-mu">정리하고 종료</text>

  <rect x="20" y="230" width="840" height="80" rx="12" class="box"/>
  <text x="40" y="256" class="t-sm t-mono">def main():</text>
  <text x="60" y="280" class="t-sm t-mono"><tspan class="t-teal">rclpy.init()</tspan> → <tspan class="t-blue">node = Talker()</tspan> → <tspan class="t-orange">rclpy.spin(node)</tspan> → <tspan class="t-mu">node.destroy_node(); rclpy.shutdown()</tspan></text>
  <text x="840" y="256" class="t-xs t-e t-mu">네 줄이면 어떤 노드든 뼈대 완성</text>
</svg>`
    },

    /* ------------------------------------------------------------ Node 클래스 구조 */
    nodeClass: {
      caption: 'Node 를 상속한 클래스 — __init__ 에서 퍼블리셔와 타이머를 만들고, 타이머 콜백이 메시지를 발행합니다',
      svg: `<svg class="dg" viewBox="0 0 880 360" role="img" aria-label="MinimalPublisher 클래스의 init에서 퍼블리셔와 타이머를 만들고 타이머 콜백이 /topic에 발행하여 listener가 받는 구조">
  <rect x="20" y="20" width="380" height="320" rx="14" class="box"/>
  <text x="40" y="48" class="t-b t-mono">class MinimalPublisher(<tspan class="t-blue">Node</tspan>):</text>
  <rect x="40" y="66" width="340" height="140" rx="10" class="teal"/>
  <text x="56" y="90" class="t-sm t-mono t-teal t-b">def __init__(self):</text>
  <text x="70" y="116" class="t-xs t-mono">super().__init__('minimal_publisher')</text>
  <text x="70" y="140" class="t-xs t-mono">self.publisher_ = self.<tspan class="t-green t-b">create_publisher</tspan>(</text>
  <text x="96" y="160" class="t-xs t-mono">String, 'topic', 10)</text>
  <text x="70" y="186" class="t-xs t-mono">self.timer = self.<tspan class="t-orange t-b">create_timer</tspan>(0.5, self.timer_callback)</text>
  <rect x="40" y="220" width="340" height="104" rx="10" class="orange"/>
  <text x="56" y="244" class="t-sm t-mono t-orange t-b">def timer_callback(self):</text>
  <text x="70" y="270" class="t-xs t-mono">msg = String()</text>
  <text x="70" y="290" class="t-xs t-mono">msg.data = 'Hello World: %d' % self.i</text>
  <text x="70" y="310" class="t-xs t-mono">self.publisher_.<tspan class="t-green t-b">publish</tspan>(msg)</text>

  <circle cx="470" cy="120" r="36" class="orange"/>
  <text x="470" y="114" class="t-lg t-c">⏰</text>
  <text x="470" y="140" class="t-xs t-c">0.5 초마다</text>
  <path d="M470,156 C470,220 440,260 384,270" class="ln-orange dash ar-orange"/>
  <text x="520" y="215" class="t-xs t-orange">콜백 호출</text>

  <ellipse cx="570" cy="300" rx="90" ry="26" class="blue"/>
  <text x="570" y="300" class="t-sm t-c t-b t-blue">/minimal_publisher</text>
  <line x1="380" y1="300" x2="478" y2="300" class="ln-green dash"/>
  <line x1="660" y1="300" x2="700" y2="300" class="ln-green thick ar-green"/>
  <rect x="702" y="280" width="90" height="40" rx="6" class="green"/>
  <text x="747" y="300" class="t-sm t-c t-b t-green">/topic</text>
  <line x1="747" y1="280" x2="747" y2="222" class="ln-green thick ar-green"/>
  <line x1="747" y1="300" x2="700" y2="300" class="ln-green moving"/>
  <ellipse cx="747" cy="196" rx="100" ry="26" class="blue"/>
  <text x="747" y="196" class="t-sm t-c t-b t-blue">/minimal_subscriber</text>
  <text x="747" y="150" class="t-xs t-c t-mu">std_msgs/msg/String</text>
  <text x="747" y="120" class="t-xs t-c">"I heard: Hello World: 3"</text>
</svg>`
    },

    /* ------------------------------------------------------------ 이벤트 루프 */
    eventLoop: {
      caption: 'spin = 이벤트 루프. 실행기(executor)가 "할 일"을 기다렸다가 준비된 콜백을 하나씩 꺼내 실행합니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="타이머, 구독 메시지, 서비스 요청이 대기열에 쌓이고 실행기가 하나씩 꺼내 콜백을 실행하는 이벤트 루프">
  <rect x="20" y="30" width="200" height="60" rx="10" class="orange"/>
  <text x="120" y="54" class="t-sm t-c t-b t-orange">⏰ 타이머 만료</text>
  <text x="120" y="75" class="t-xs t-c">create_timer(0.1, …)</text>
  <rect x="20" y="110" width="200" height="60" rx="10" class="green"/>
  <text x="120" y="134" class="t-sm t-c t-b t-green">📨 메시지 도착</text>
  <text x="120" y="155" class="t-xs t-c">create_subscription(…)</text>
  <rect x="20" y="190" width="200" height="60" rx="10" class="purple"/>
  <text x="120" y="214" class="t-sm t-c t-b t-purple">📞 서비스 요청 · 응답</text>
  <text x="120" y="235" class="t-xs t-c">create_service / client</text>

  <line x1="220" y1="60" x2="290" y2="130" class="ln ar"/>
  <line x1="220" y1="140" x2="290" y2="140" class="ln ar"/>
  <line x1="220" y1="220" x2="290" y2="150" class="ln ar"/>

  <rect x="292" y="100" width="150" height="80" rx="10" class="box"/>
  <text x="367" y="124" class="t-sm t-c t-b">대기열</text>
  <rect x="306" y="140" width="36" height="26" rx="4" class="orange"/>
  <rect x="348" y="140" width="36" height="26" rx="4" class="green"/>
  <rect x="390" y="140" width="36" height="26" rx="4" class="green"/>
  <line x1="442" y1="140" x2="508" y2="140" class="ln ar"/>

  <circle cx="620" cy="140" r="104" class="blue"/>
  <path d="M620,52 A88,88 0 1,1 532,140" class="ln-blue thick ar-blue"/>
  <text x="620" y="98" class="t-b t-c t-blue">실행기 (executor)</text>
  <text x="620" y="126" class="t-sm t-c">① 할 일이 있나 기다림</text>
  <text x="620" y="150" class="t-sm t-c">② 준비된 콜백 하나 꺼냄</text>
  <text x="620" y="174" class="t-sm t-c">③ 끝날 때까지 실행</text>
  <text x="620" y="198" class="t-xs t-c t-mu">→ 다시 ①</text>

  <rect x="740" y="60" width="130" height="160" rx="10" class="box"/>
  <text x="805" y="86" class="t-sm t-c t-b">내 콜백</text>
  <text x="805" y="116" class="t-xs t-c t-mono">timer_callback()</text>
  <text x="805" y="140" class="t-xs t-c t-mono">on_pose(msg)</text>
  <text x="805" y="164" class="t-xs t-c t-mono">on_request(…)</text>
  <text x="805" y="196" class="t-xs t-c t-mu">짧게 끝내야 함!</text>

  <rect x="20" y="280" width="840" height="84" rx="12" class="red"/>
  <text x="40" y="308" class="t-b t-red">⚠ 두 가지 규칙</text>
  <text x="40" y="334" class="t-sm">① spin(또는 spin_once)을 부르지 않으면 콜백은 <tspan class="t-b">한 번도</tspan> 불리지 않습니다.</text>
  <text x="40" y="354" class="t-sm">② 콜백 안에서 time.sleep() 처럼 오래 붙잡으면 그동안 <tspan class="t-b">다른 콜백이 모두 멈춥니다</tspan> (기본 실행기는 한 줄로 처리).</text>
</svg>`
    },

    /* ------------------------------------------------------------ P 제어 */
    pctrl: {
      caption: '목표 지점까지 가는 P 제어 — 거리 d 에 비례해 앞으로, 방향 오차 e 에 비례해 회전합니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="거북이 위치와 목표 사이의 거리 d, 목표 방향 atan2, 현재 방향 theta, 방향 오차 e와 P 제어 공식">
  <rect x="20" y="20" width="460" height="340" rx="14" class="box"/>
  <line x1="60" y1="330" x2="460" y2="330" class="ln thin"/>
  <line x1="60" y1="330" x2="60" y2="40" class="ln thin"/>
  <text x="456" y="348" class="t-xs t-mu t-e">x</text>
  <text x="48" y="48" class="t-xs t-mu">y</text>

  <circle cx="400" cy="90" r="12" class="s-red"/>
  <text x="400" y="62" class="t-sm t-c t-b t-red">🎯 목표 (gx, gy)</text>

  <text x="130" y="270" class="t-xl t-c">🐢</text>
  <text x="130" y="310" class="t-xs t-c">(x, y)</text>
  <line x1="130" y1="262" x2="394" y2="96" class="ln-red dash ar-red"/>
  <text x="250" y="160" class="t-sm t-red t-b">d = √(dx² + dy²)</text>

  <line x1="130" y1="262" x2="270" y2="262" class="ln thin dash"/>
  <line x1="130" y1="262" x2="250" y2="200" class="ln-blue thick ar-blue"/>
  <text x="262" y="200" class="t-sm t-blue t-b">θ (지금 방향)</text>
  <path d="M190,262 A60,60 0 0,0 183,234" class="ln-blue"/>
  <path d="M230,262 A100,100 0 0,0 214,209" class="ln-orange thick"/>
  <text x="300" y="250" class="t-xs t-orange">목표 방향 = atan2(dy, dx)</text>
  <text x="300" y="286" class="t-sm t-orange t-b">e = atan2(dy, dx) − θ</text>

  <rect x="500" y="20" width="360" height="340" rx="14" class="teal"/>
  <text x="680" y="50" class="t-b t-c t-teal">P(비례) 제어 규칙</text>
  <text x="520" y="92" class="t-sm t-mono">dx = gx − x,  dy = gy − y</text>
  <text x="520" y="124" class="t-sm t-mono">e  = wrap(atan2(dy, dx) − θ)</text>
  <text x="520" y="162" class="t-sm t-mono t-b">angular.z = K<tspan class="t-xs">a</tspan> · e</text>
  <text x="520" y="194" class="t-sm t-mono t-b">linear.x  = min(v<tspan class="t-xs">max</tspan>, K<tspan class="t-xs">l</tspan> · d)</text>
  <text x="520" y="232" class="t-xs">• 멀면 빨리, 가까우면 천천히 (d 에 비례)</text>
  <text x="520" y="254" class="t-xs">• 많이 틀어졌으면 크게 회전 (e 에 비례)</text>
  <text x="520" y="276" class="t-xs">• |e| 가 크면 전진을 멈추고 먼저 돌기</text>
  <text x="520" y="298" class="t-xs">• wrap: 오차를 −π ~ π 로 (짧은 쪽으로 회전)</text>
  <text x="520" y="336" class="t-xs t-mu">예제 값: K<tspan class="t-xs">a</tspan> = 4.0, K<tspan class="t-xs">l</tspan> = 1.5, v<tspan class="t-xs">max</tspan> = 2.0</text>
</svg>`
    },

    /* ------------------------------------------------------------ 사각형 상태 기계 */
    square: {
      caption: '사각형 그리기 = 두 상태를 오가는 상태 기계. 시간만 보고 움직이면(개루프) 조금씩 오차가 쌓입니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="직진 상태와 회전 상태를 번갈아 오가는 사각형 그리기 상태 기계">
  <rect x="60" y="80" width="240" height="120" rx="60" class="blue"/>
  <text x="180" y="120" class="t-b t-c t-blue">① 직진 (forward)</text>
  <text x="180" y="148" class="t-sm t-c t-mono">linear.x = 1.0</text>
  <text x="180" y="172" class="t-xs t-c t-mu">2.0 초 동안 → 2 m</text>

  <rect x="480" y="80" width="240" height="120" rx="60" class="orange"/>
  <text x="600" y="120" class="t-b t-c t-orange">② 회전 (turn)</text>
  <text x="600" y="148" class="t-sm t-c t-mono">angular.z = 1.0</text>
  <text x="600" y="172" class="t-xs t-c t-mu">π/2 ≈ 1.57 초 → 90°</text>

  <path d="M300,110 C360,60 420,60 480,110" class="ln-blue thick ar-blue"/>
  <text x="390" y="58" class="t-xs t-c">elapsed ≥ 2.0</text>
  <path d="M480,170 C420,230 360,230 300,170" class="ln-orange thick ar-orange"/>
  <text x="390" y="242" class="t-xs t-c">elapsed ≥ π/2 (변 +1)</text>

  <rect x="760" y="70" width="100" height="100" class="box"/>
  <rect x="770" y="80" width="80" height="80" class="nofill ln-blue thick"/>
  <text x="810" y="195" class="t-xs t-c t-mu">4번 반복</text>
  <text x="440" y="285" class="t-xs t-c t-mu">타이머 주기 0.1 초 → 회전이 1.6 초에 끝나 약 1.7° 씩 더 돎. 오차를 줄이려면 Pose 를 보고 제어(폐루프)!</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: 'rclpy 프로그램의 뼈대',
      html: `
<p>지금까지는 <code>ros2 run</code> · <code>ros2 topic pub</code> 처럼 <b>남이 만든 노드</b>를 명령어로 다뤘습니다. 이번 장부터는 노드를 <b>직접 만듭니다</b>. 파이썬으로 ROS 2 노드를 만들 때 쓰는 라이브러리가 <b>rclpy</b>(ROS Client Library for Python)입니다.</p>
<p>어떤 rclpy 프로그램이든 뼈대는 똑같습니다. <b>① 초기화 → ② 노드 만들기 → ③ spin(콜백 돌리기) → ④ 정리</b>. 이 네 단계만 기억하면 나머지는 "노드 안에 무엇을 넣느냐"의 문제입니다.</p>
{{fig:anatomy}}

<div class="box analogy"><div class="box-t">🍳 비유 — 가게 문 열기</div>
<ul>
  <li><code>rclpy.init()</code> = 가게 전기 · 전화선 연결 (ROS 2 통신 준비)</li>
  <li><code>Node('talker')</code> = 간판 걸기 (이름표가 붙은 노드가 그래프에 나타남)</li>
  <li><code>rclpy.spin(node)</code> = 영업 중 — 손님(메시지 · 타이머)이 오면 응대(콜백)</li>
  <li><code>destroy_node()</code> · <code>shutdown()</code> = 문 닫고 전기 끄기</li>
</ul></div>

<p>가장 짧은 노드부터 실행해 봅시다. 아래 코드는 노드를 만들고 로그 두 줄을 찍은 뒤 바로 끝납니다. <b>▶ 실습기에서 실행</b>을 누르세요.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node


def main():
    rclpy.init()                              # ① ROS 2 통신 준비
    node = Node('hello_node')                 # ② 이름이 hello_node 인 노드
    node.get_logger().info('안녕하세요, ROS 2!')
    node.get_logger().info(f'내 이름은 {node.get_name()} 입니다')
    node.destroy_node()                       # ④ 정리
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<pre class="code out" data-lang="출력"><code>[INFO] [1719800000.123456789] [hello_node]: 안녕하세요, ROS 2!
[INFO] [1719800000.124001234] [hello_node]: 내 이름은 hello_node 입니다</code></pre>

<div class="box note"><div class="box-t">📝 ③ spin 이 빠졌어요</div>
이 프로그램은 할 일이 로그 두 줄뿐이라 spin 없이 바로 끝납니다. 그래서 rqt_graph 에 <code>/hello_node</code> 가 <b>잠깐 나타났다 사라집니다</b>. 계속 살아서 메시지를 주고받는 노드를 만들려면 spin 이 꼭 필요합니다 — 다음 절에서 봅니다.</div>

<table class="tbl">
<thead><tr><th>줄</th><th>하는 일</th><th>빠뜨리면?</th></tr></thead>
<tbody>
<tr><td><code>rclpy.init()</code></td><td>ROS 2 컨텍스트(통신 환경) 초기화</td><td>노드를 만들 때 오류</td></tr>
<tr><td><code>Node('이름')</code></td><td>그래프에 노드 등록 (이름은 영문 · 숫자 · 밑줄)</td><td>—</td></tr>
<tr><td><code>rclpy.spin(node)</code></td><td>콜백(타이머 · 구독 · 서비스)을 계속 실행</td><td>콜백이 절대 안 불림</td></tr>
<tr><td><code>destroy_node()</code> · <code>shutdown()</code></td><td>자원 반납, 통신 종료</td><td>종료 시 경고 · 자원 누수</td></tr>
</tbody></table>`
    },

    /* ================================================================ 2 */
    {
      title: 'Node 클래스 상속 — 퍼블리셔와 타이머',
      html: `
<p>실제 ROS 2 코드는 거의 모두 <b>Node 를 상속한 클래스</b>로 씁니다. 노드가 가진 퍼블리셔 · 타이머 · 상태 변수(카운터 등)를 <code>self</code> 한곳에 모아 둘 수 있기 때문입니다. 공식 튜토리얼의 <b>talker</b>(MinimalPublisher)를 해부해 봅시다.</p>
{{fig:nodeClass}}

<div class="cards c3">
  <div class="card blue"><div class="ci">🏷️</div><b>super().__init__('이름')</b><p>부모(Node)를 초기화하면서 <b>노드 이름</b>을 정합니다. 그래프에 <code>/minimal_publisher</code> 로 보입니다.</p></div>
  <div class="card green"><div class="ci">📤</div><b>create_publisher(타입, 토픽, 10)</b><p>메시지 <b>타입</b> 클래스, <b>토픽 이름</b>, <b>QoS 깊이</b>(보관할 메시지 수). 반환값의 <code>.publish(msg)</code> 로 보냅니다.</p></div>
  <div class="card orange"><div class="ci">⏰</div><b>create_timer(초, 콜백)</b><p>정해진 <b>주기(초)</b>마다 콜백 함수를 부릅니다. 0.5 → 2 Hz, 0.1 → 10 Hz.</p></div>
</div>

<div class="box tip"><div class="box-t">💡 세 번째 인자 10 은 무엇?</div>
<code>create_publisher(String, 'topic', 10)</code> 의 10 은 <b>QoS 프로필</b> 자리에 정수를 넣은 것으로, "최근 메시지 10개까지 보관(KEEP_LAST, depth=10)"이라는 뜻입니다. 대부분은 10 이면 충분하고, 센서처럼 특별한 경우의 QoS 는 <a href="#ch11">11장</a>에서 자세히 다룹니다.</div>

<p>옆 실습기에서 talker 를 실행하고, 그래프와 터미널에서 결과를 확인해 보세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — talker</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>을 누릅니다. 0.5초마다 <code>Publishing: "Hello World: N"</code> 로그가 찍힙니다.</li>
  <li>터미널 칩 <code>ros2 topic echo /topic</code> 을 눌러 메시지가 실제로 나가는지 봅니다.</li>
  <li><code>ros2 topic hz /topic</code> 으로 약 2 Hz 인지 확인합니다. 그다음 코드의 <code>timer_period</code> 를 <b>0.1</b> 로 바꿔 다시 실행하고 Hz 를 비교해 보세요.</li>
  <li><code>msg.data</code> 에 내 이름을 넣어 바꿔 봅니다.</li>
</ol></div>
{{widget:pylab|ex=talker|with=graph}}
{{widget:term|chips=ros2 node list;ros2 topic echo /topic;ros2 topic hz /topic;ros2 topic info /topic}}

<p>같은 일을 <b>클래스 없이</b> 쓸 수도 있습니다. 짧은 실험에는 편하지만, 노드가 커지면 변수 관리가 어려워서 실무에서는 클래스 방식을 씁니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node
from std_msgs.msg import String


def main():
    rclpy.init()
    node = Node('func_talker')
    pub = node.create_publisher(String, 'chatter', 10)
    count = [0]                      # 콜백 안에서 바꾸려고 리스트에 담음

    def tick():
        count[0] += 1
        pub.publish(String(data=f'함수형 talker {count[0]}'))
        node.get_logger().info(f'보냄: {count[0]}')

    node.create_timer(1.0, tick)
    rclpy.spin(node)


if __name__ == '__main__':
    main()</code></pre>`
    },

    /* ================================================================ 3 */
    {
      title: '서브스크라이버와 콜백',
      html: `
<p>받는 쪽은 <code>create_subscription(타입, 토픽, 콜백, QoS)</code> 하나면 됩니다. 메시지가 도착할 때마다 실행기가 <b>콜백 함수에 메시지 객체를 넣어 불러 줍니다</b>. 우리는 "받으면 무엇을 할지"만 적으면 됩니다.</p>
<pre class="code" data-lang="python"><code>self.subscription = self.create_subscription(
    String,                  <span class="cm"># ① 메시지 타입 (퍼블리셔와 같아야 함)</span>
    'topic',                 <span class="cm"># ② 토픽 이름</span>
    self.listener_callback,  <span class="cm"># ③ 도착할 때마다 불릴 함수 (괄호 없이!)</span>
    10)                      <span class="cm"># ④ QoS 깊이</span>

def listener_callback(self, msg):     <span class="cm"># msg = 받은 String 객체</span>
    self.get_logger().info('I heard: "%s"' % msg.data)</code></pre>

<div class="box warn"><div class="box-t">⚠ 콜백 이름 뒤에 괄호를 붙이지 마세요</div>
<code>self.listener_callback()</code> 처럼 괄호를 붙이면 함수를 <b>지금 한 번 호출한 결과</b>(None)를 넘기게 됩니다. 넘겨야 하는 것은 함수 <b>자체</b>, 즉 <code>self.listener_callback</code> 입니다.</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — listener 와 talker 연결</div>
<ol>
  <li>아래 listener 실습기를 <b>▶ 실행</b>합니다. 아직 보내는 쪽이 없어 조용합니다.</li>
  <li>터미널 칩 <code>ros2 run demo_nodes_py talker</code> 를 누르세요. 그런데 로그가 안 찍힙니다! 왜일까요? (demo 의 talker 는 <code>/chatter</code> 로 보냅니다)</li>
  <li>이번엔 <code>ros2 topic pub /topic std_msgs/msg/String "data: 안녕"</code> 칩을 눌러 보세요. (<code>"{data: 안녕}"</code> 처럼 중괄호로 써도 같은 YAML 입니다) 이제 <code>I heard: "안녕"</code> 이 찍힙니다. <b>토픽 이름과 타입이 같아야</b> 연결됩니다.</li>
  <li>rqt_graph 에서 누가 누구와 이어졌는지 확인합니다.</li>
</ol></div>
{{widget:pylab|ex=listener|with=graph}}
{{widget:term|chips=ros2 run demo_nodes_py talker;ros2 topic pub /topic std_msgs/msg/String "data: 안녕";ros2 topic info /topic}}

<p>한 노드가 <b>퍼블리셔와 서브스크라이버를 둘 다</b> 가질 수도 있습니다. 아래 예제는 1초마다 숫자를 <code>/count</code> 에 보내고, 같은 토픽을 스스로 구독해 제곱을 계산합니다. <code>Int32(data=self.n)</code> 처럼 <b>생성자에 필드를 키워드로</b> 넣는 방법도 눈여겨보세요.</p>
{{widget:pylab|ex=pubsub|with=graph}}

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 받은 메시지는 저장만, 계산은 타이머에서</div>
센서 메시지는 매우 자주(수십~수백 Hz) 옵니다. 구독 콜백에서는 <code>self.latest = msg</code> 처럼 <b>최신 값만 저장</b>하고, 제어 계산은 일정한 주기의 타이머 콜백에서 하는 패턴을 많이 씁니다. 6절의 <code>turtle_goto</code> 예제가 바로 이 구조입니다.</div>`
    },

    /* ================================================================ 4 */
    {
      title: '메시지 객체와 로그 찍기',
      html: `
<p>메시지는 파이썬 <b>클래스</b>입니다. <code>from std_msgs.msg import String</code> 으로 가져와 <code>String()</code> 으로 만들고, 필드에 값을 넣습니다. 필드 이름과 타입은 <code>ros2 interface show</code> 로 확인합니다(<a href="#ch03">3장</a>).</p>
<table class="tbl">
<thead><tr><th>메시지</th><th>가져오기</th><th>필드 (타입)</th></tr></thead>
<tbody>
<tr><td>String</td><td><code>from std_msgs.msg import String</code></td><td><code>data</code> (str)</td></tr>
<tr><td>Twist</td><td><code>from geometry_msgs.msg import Twist</code></td><td><code>linear.x/y/z</code>, <code>angular.x/y/z</code> (<b>float</b>)</td></tr>
<tr><td>Pose (turtlesim)</td><td><code>from turtlesim.msg import Pose</code></td><td><code>x</code>, <code>y</code>, <code>theta</code>, <code>linear_velocity</code>, <code>angular_velocity</code> (float)</td></tr>
<tr><td>Int32</td><td><code>from std_msgs.msg import Int32</code></td><td><code>data</code> (int, −2³¹ ~ 2³¹−1)</td></tr>
</tbody></table>

<div class="box warn"><div class="box-t">⚠ 가장 흔한 첫 오류 — float 자리에 int</div>
rclpy 메시지는 <b>타입을 엄격하게 검사</b>합니다. <code>msg.linear.x = 2</code> 처럼 float 필드에 정수를 넣으면 <code>AssertionError: The 'x' field must be of type 'float'</code> 가 납니다. <b>2.0</b> 처럼 소수점을 붙이거나 <code>float(값)</code> 으로 바꾸세요.</div>
<p>직접 오류를 일으켜 보고 고쳐 봅시다. 실행하면 거북이가 한 번 살짝 움직입니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


def main():
    rclpy.init()
    node = Node('type_check_demo')
    pub = node.create_publisher(Twist, '/turtle1/cmd_vel', 10)

    msg = Twist()
    msg.linear.x = 2.0                  # OK — float
    try:
        msg.angular.z = 1               # ✗ int 를 넣으면?
    except AssertionError as e:
        node.get_logger().error(f'AssertionError: {e}')
    msg.angular.z = float(1)            # ✓ 이렇게 고치면 OK
    pub.publish(msg)
    node.get_logger().info(f'발행 성공: linear.x={msg.linear.x}, angular.z={msg.angular.z}')

    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>

<h3>로그 — print 대신 get_logger()</h3>
<p><code>print()</code> 도 되지만, ROS 2 에서는 <code>self.get_logger()</code> 를 씁니다. 로그에는 <b>수준 · 시각 · 노드 이름</b>이 붙고, <code>/rosout</code> 토픽으로도 나가서 rqt_console 등에서 모아 볼 수 있습니다.</p>
<div class="stats">
  <div class="stat gray"><b>DEBUG</b><span>개발 중 자세한 값 (기본 숨김)</span></div>
  <div class="stat blue"><b>INFO</b><span>정상 진행 상황</span></div>
  <div class="stat yellow"><b>WARN</b><span>이상하지만 계속 가능</span></div>
  <div class="stat red"><b>ERROR</b><span>기능 실패</span></div>
  <div class="stat purple"><b>FATAL</b><span>더는 진행 불가</span></div>
</div>
<table class="tbl">
<thead><tr><th>옵션</th><th>예</th><th>뜻</th></tr></thead>
<tbody>
<tr><td><code>throttle_duration_sec</code></td><td><code>info('...', throttle_duration_sec=1.0)</code></td><td>자주 불려도 <b>1초에 한 번만</b> 출력</td></tr>
<tr><td><code>once</code></td><td><code>info('...', once=True)</code></td><td>처음 <b>한 번만</b> 출력</td></tr>
<tr><td><code>skip_first</code></td><td><code>warning('...', skip_first=True)</code></td><td>첫 번째 호출은 건너뜀</td></tr>
</tbody></table>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import rclpy
from rclpy.node import Node


class LogDemo(Node):
    def __init__(self):
        super().__init__('log_demo')
        self.n = 0
        self.timer = self.create_timer(0.1, self.tick)      # 10 Hz

    def tick(self):
        self.n += 1
        log = self.get_logger()
        log.info('노드 시작! (once=True 라 한 번만)', once=True)
        log.info(f'1초에 한 번만 찍기: n={self.n}', throttle_duration_sec=1.0)
        if self.n % 20 == 0:
            log.warning(f'n={self.n} — 20의 배수!')
        if self.n == 60:
            log.error('60번 도달 — 타이머를 멈춥니다')
            self.timer.cancel()


def main():
    rclpy.init()
    rclpy.spin(LogDemo())


if __name__ == '__main__':
    main()</code></pre>
<div class="box note"><div class="box-t">📝 DEBUG 로그 보이게 하기</div>
실제 ROS 2 의 기본 로그 수준은 INFO 라서 <code>debug()</code> 는 보이지 않습니다. 실행할 때 <code>ros2 run 패키지 실행파일 --ros-args --log-level debug</code> 로 수준을 낮추면 보입니다. <code>warn()</code> 은 <code>warning()</code> 의 옛 이름으로, 둘 다 동작합니다.</div>`
    },

    /* ================================================================ 5 */
    {
      title: 'rclpy.spin 과 이벤트 루프',
      html: `
<p><code>rclpy.spin(node)</code> 안에서는 무슨 일이 일어날까요? spin 은 <b>실행기(executor)</b>를 돌리는 함수입니다. 실행기는 "타이머가 울렸나? 메시지가 왔나? 서비스 요청이 왔나?"를 계속 확인하다가 <b>준비된 콜백을 하나씩 꺼내 실행</b>합니다. 이런 구조를 <b>이벤트 루프</b>라고 합니다.</p>
{{fig:eventLoop}}

<div class="box analogy"><div class="box-t">🍳 비유 — 식당의 홀 직원 한 명</div>
홀 직원(실행기)은 한 명뿐입니다. 벨(타이머)이 울리거나 손님(메시지)이 오면 한 번에 한 테이블씩 응대(콜백)합니다. 직원이 한 테이블에서 5분 동안 수다를 떨면(콜백 안에서 <code>time.sleep(5)</code>), 그동안 다른 테이블은 아무도 봐 주지 않습니다. 그리고 직원이 <b>출근하지 않으면</b>(spin 안 함) 벨이 아무리 울려도 소용이 없죠.</div>

<p>"콜백은 spin 하는 동안에만 불린다"를 눈으로 확인해 봅시다. 아래 프로그램은 0.5초 타이머를 만든 뒤, 처음 3초는 <code>time.sleep</code> 으로 잠만 자고, 다음 2초는 <code>spin_once</code> 로 실행기를 돌립니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="graph"><code>import time
import rclpy
from rclpy.node import Node


def main():
    rclpy.init()
    node = Node('spin_demo')
    node.create_timer(0.5, lambda: node.get_logger().info('⏰ 타이머 콜백!'))

    node.get_logger().info('3초 동안 spin 없이 잠만 잡니다...')
    time.sleep(3.0)                      # 이 동안 콜백은 한 번도 안 불림

    node.get_logger().info('이제 spin_once 로 2초 동안 실행기를 돌립니다')
    end = time.monotonic() + 2.0
    while time.monotonic() &lt; end:
        rclpy.spin_once(node, timeout_sec=0.1)   # 할 일 하나 처리 (최대 0.1초 기다림)

    node.get_logger().info('끝! 콜백은 spin 하는 동안에만 불렸습니다')
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>

<table class="tbl">
<thead><tr><th>함수</th><th>동작</th><th>언제 쓰나</th></tr></thead>
<tbody>
<tr><td><code>rclpy.spin(node)</code></td><td>종료(Ctrl+C) 전까지 계속 콜백 처리</td><td>대부분의 노드</td></tr>
<tr><td><code>rclpy.spin_once(node, timeout_sec=0.1)</code></td><td>할 일 <b>하나</b>만 처리하고 돌아옴</td><td>내 while 루프 안에서 조금씩 돌릴 때</td></tr>
<tr><td><code>rclpy.spin_until_future_complete(node, future)</code></td><td>future(서비스 응답 등)가 끝날 때까지</td><td>서비스 · 액션 결과 기다리기 (<a href="#ch09">9장</a>)</td></tr>
</tbody></table>

<div class="box warn"><div class="box-t">⚠ 콜백 안에서 while True / 긴 sleep 금지</div>
콜백 안에서 <code>while True:</code> 로 거북이를 계속 움직이려 하면, 그 콜백이 끝나지 않아 <b>Pose 구독 콜백이 영영 불리지 않습니다</b>(위치가 갱신되지 않음). "반복"은 <b>타이머</b>에게 맡기고, 콜백은 한 번의 계산만 하고 빨리 끝내세요.</div>`
    },

    /* ================================================================ 6 */
    {
      title: '거북이 제어 노드 — 원 · 위치 · 목표점',
      html: `
<p>이제 배운 것을 거북이에게 써 봅시다. turtlesim 은 <code>/turtle1/cmd_vel</code>(Twist)을 <b>구독</b>해서 움직이고, <code>/turtle1/pose</code>(Pose)를 <b>발행</b>해 자기 위치를 알립니다. 그러니 우리 노드는 반대로 cmd_vel 을 발행하고 pose 를 구독하면 됩니다.</p>

<h3>① 원 그리기 — 발행만</h3>
<p>0.1초마다 같은 Twist(앞으로 2.0 m/s, 왼쪽으로 1.0 rad/s)를 보냅니다. 반지름 = 선속도 ÷ 각속도 = 2.0 ÷ 1.0 = <b>2 m</b> 인 원이 그려집니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 원 크기 바꾸기</div>
<ol>
  <li>▶ 실행해서 원이 그려지는지 봅니다.</li>
  <li><code>angular.z</code> 를 <b>2.0</b> 으로 바꾸면 반지름은? (1 m) 직접 확인해 보세요.</li>
  <li><code>angular.z</code> 를 <b>-1.0</b> 으로 하면 어느 쪽으로 돌까요?</li>
  <li>일부러 <code>msg.linear.x = 2</code> 로 바꿔 AssertionError 를 다시 확인해 보세요.</li>
</ol></div>
{{widget:pylab|ex=turtle_circle|with=turtlesim}}

<h3>② 위치 구독하기 — 구독만</h3>
<p>Pose 는 1초에 수십 번 옵니다. 모두 찍으면 로그가 넘치니 30번에 한 번만 찍습니다(<code>throttle_duration_sec</code> 로 바꿔도 좋아요). 방향 버튼으로 거북이를 움직이며 x · y · θ 가 어떻게 변하는지 보세요. turtlesim 화면은 <b>0 ~ 약 11.09</b> 크기이고, 처음 위치는 가운데(약 5.54, 5.54), θ 는 라디안(0 = 오른쪽, 반시계가 +)입니다.</p>
{{widget:pylab|ex=turtle_pose|with=turtlesim}}

<h3>③ 목표점까지 가기 — 구독 + 발행 = 제어</h3>
<p>드디어 <b>폐루프 제어</b>입니다. Pose 를 받아 목표까지의 거리와 방향 오차를 계산하고, 그에 <b>비례한</b> 속도를 cmd_vel 로 보냅니다. 이것이 <b>P(비례) 제어</b>입니다.</p>
{{fig:pctrl}}
<ol class="steps-list">
  <li><b>차이 계산</b> — <code>dx = gx − x</code>, <code>dy = gy − y</code>, 거리 <code>d = hypot(dx, dy)</code></li>
  <li><b>방향 오차</b> — 목표 방향 <code>atan2(dy, dx)</code> 에서 지금 방향 <code>θ</code> 를 뺍니다. 그대로 두면 350° 를 도는 일이 생기므로 <code>atan2(sin e, cos e)</code> 로 <b>−π ~ π</b> 로 감쌉니다(wrap).</li>
  <li><b>비례 명령</b> — <code>angular.z = 4.0 × e</code>, <code>linear.x = min(2.0, 1.5 × d)</code>. 단, 방향이 많이 틀어졌으면(|e| ≥ 0.5) 전진하지 않고 먼저 돕니다.</li>
  <li><b>도착 판정</b> — d 가 0.05 보다 작으면 멈춤(Twist 기본값 = 모두 0).</li>
</ol>
<div class="box practice"><div class="box-t">🧪 해 보기 — 실행 중에 목표 바꾸기</div>
<ol>
  <li>▶ 실행하면 거북이가 오른쪽 위 (9, 9) 로 갑니다.</li>
  <li>터미널 칩 <code>ros2 param set /go_to_goal goal_x 2.0</code> 을 누르면 실행 중에 목표가 바뀝니다. (파라미터 코드는 <a href="#ch09">9장</a>)</li>
  <li>이득 <code>4.0</code> 을 <b>0.5</b> 로 줄이면? <b>15.0</b> 으로 키우면? 도는 모습이 어떻게 달라지는지 비교하세요.</li>
</ol></div>
{{widget:pylab|ex=turtle_goto|with=turtlesim}}
{{widget:term|chips=ros2 param set /go_to_goal goal_x 2.0;ros2 param set /go_to_goal goal_y 3.0;ros2 topic echo /turtle1/cmd_vel}}

<div class="box tip"><div class="box-t">💡 P 제어의 한계</div>
P 제어는 간단하지만, 이득이 너무 크면 목표 근처에서 흔들리고(진동) 너무 작으면 느립니다. 실제 로봇에서는 적분(I) · 미분(D) 항을 더한 <b>PID 제어</b>를 많이 씁니다. 거북이는 관성이 없어서 P 만으로도 잘 도착합니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '연습 문제 — 사각형 그리기 · 벽에서 튕기기',
      html: `
<p>난이도 순서로 두 문제를 풀어 봅시다. 먼저 스스로 코드를 고쳐 본 뒤, 막히면 아래 풀이를 실행해 보세요.</p>

<h3>문제 1 (보통) — 한 변 2 m 인 사각형 그리기</h3>
<p>힌트: "직진"과 "회전" 두 <b>상태</b>를 두고, 타이머 콜백에서 지난 시간을 세어 상태를 바꿉니다. 1.0 m/s 로 2초 직진 → 1.0 rad/s 로 π/2 초 회전.</p>
{{fig:square}}
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class SquareDriver(Node):
    def __init__(self):
        super().__init__('square_driver')
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.dt = 0.1
        self.state = 'forward'
        self.elapsed = 0.0
        self.sides = 0
        self.timer = self.create_timer(self.dt, self.on_timer)

    def on_timer(self):
        cmd = Twist()
        self.elapsed += self.dt
        if self.state == 'forward':
            cmd.linear.x = 1.0
            if self.elapsed &gt;= 2.0:
                self.state, self.elapsed = 'turn', 0.0
        else:
            cmd.angular.z = 1.0
            if self.elapsed &gt;= math.pi / 2:
                self.state, self.elapsed = 'forward', 0.0
                self.sides += 1
                self.get_logger().info(f'{self.sides}번째 변 완료')
                if self.sides == 4:
                    self.get_logger().info('사각형 완성!')
                    self.timer.cancel()
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(SquareDriver())


if __name__ == '__main__':
    main()</code></pre>
<div class="box note"><div class="box-t">📝 왜 꼭짓점이 조금씩 어긋날까?</div>
시간만 세는 <b>개루프(open-loop)</b> 방식이라 타이머 주기(0.1초) 단위로 오차가 생깁니다. 회전은 1.6초에 끝나 약 1.7° 씩 더 돌아요. turtlesim 의 <code>draw_square</code> 데모도 비슷한 이유로 Pose 를 보고 움직입니다. 개선해 보세요: 회전 상태에서 Pose 의 θ 를 보고 90° 가 되면 멈추도록!</div>

<h3>문제 2 (도전) — 벽에 닿으면 방향 바꾸기</h3>
<p>힌트: Pose 를 구독해 벽(1.0 이하 또는 10.0 이상)에 가까워졌고 <b>바깥을 향하고 있으면</b> "회전" 상태로 바꿉니다. 새 방향은 화면 가운데 쪽 ± 무작위 각도. 목표 방향과의 오차에 비례해 돌다가, 충분히 돌았으면 다시 직진합니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import math
import random
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose


def wrap(a):
    return math.atan2(math.sin(a), math.cos(a))      # -π ~ π


class Bouncer(Node):
    def __init__(self):
        super().__init__('bouncer')
        self.pose = None
        self.turning = False
        self.target = 0.0
        self.create_subscription(Pose, '/turtle1/pose', self.on_pose, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(0.05, self.control)

    def on_pose(self, msg):
        self.pose = msg                                # 저장만!

    def control(self):
        if self.pose is None:
            return
        p = self.pose
        to_center = math.atan2(5.5 - p.y, 5.5 - p.x)
        near_wall = p.x &lt; 1.0 or p.x &gt; 10.0 or p.y &lt; 1.0 or p.y &gt; 10.0
        facing_out = abs(wrap(to_center - p.theta)) &gt; math.pi / 2
        if not self.turning and near_wall and facing_out:
            self.turning = True
            self.target = to_center + random.uniform(-0.7, 0.7)
            self.get_logger().info(f'벽! ({p.x:.1f}, {p.y:.1f}) 에서 방향을 바꿉니다')

        cmd = Twist()
        if self.turning:
            err = wrap(self.target - p.theta)
            cmd.angular.z = 4.0 * err                  # P 제어로 회전
            if abs(err) &lt; 0.05:
                self.turning = False
        else:
            cmd.linear.x = 2.0
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(Bouncer())


if __name__ == '__main__':
    main()</code></pre>
<div class="box practice"><div class="box-t">🧪 더 해 보기</div>
<ol>
  <li>벽에 닿을 때마다 <code>/turtle1/set_pen</code> 서비스로 펜 색을 바꾸려면? (서비스 클라이언트는 <a href="#ch09">9장</a>)</li>
  <li>직진 속도를 4.0 으로 올리면 벽을 뚫고 나갈까요? 이유를 생각해 보세요. (힌트: 타이머 주기 동안 이동하는 거리)</li>
</ol></div>`
    },

    /* ================================================================ 8 */
    {
      title: '스크립트를 패키지 실행 파일로 · 안전한 종료',
      html: `
<p>실습기에서 돌린 코드는 한 파일짜리 스크립트입니다. 실제 로봇에서는 <a href="#ch07">7장</a>에서 배운 <b>패키지</b>에 넣고 <code>ros2 run</code> 으로 실행합니다. 핵심은 <b>setup.py 의 entry_points</b> 에 "실행 파일 이름 = 모듈:함수"를 등록하는 것입니다.</p>
<div class="flow">
  <div class="fb teal"><span class="fi">📦</span><b>ros2 pkg create</b>패키지 틀 만들기</div>
  <div class="fb blue"><span class="fi">🐍</span><b>노드 파일 작성</b>my_turtle/circle.py</div>
  <div class="fb orange"><span class="fi">📝</span><b>setup.py 등록</b>'circle = my_turtle.circle:main'</div>
  <div class="fb green"><span class="fi">🔨</span><b>colcon build</b>+ source</div>
  <div class="fb purple"><span class="fi">▶</span><b>ros2 run</b>my_turtle circle</div>
</div>
<p>아래 명령을 차례로 실행하면 <code>--node-name circle</code> 덕분에 <code>circle.py</code> 와 entry point 가 자동으로 만들어집니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --dependencies rclpy geometry_msgs --node-name circle my_turtle
cat my_turtle/setup.py
nano my_turtle/my_turtle/circle.py</code></pre>
<p>편집기 창이 열리면 앞의 <code>turtle_circle</code> 코드를 붙여 넣고 <kbd>Ctrl</kbd>+<kbd>S</kbd> 로 저장합니다. 그다음 빌드하고 실행합니다. 줄 끝의 <code>&amp;</code> 는 turtlesim 을 <b>백그라운드</b>로 띄워 같은 터미널에서 다음 명령을 이어 쓰게 해 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon build --packages-select my_turtle
source install/setup.bash
ros2 run turtlesim turtlesim_node &amp;
ros2 run my_turtle circle</code></pre>
<pre class="code" data-lang="python"><code>entry_points={
    'console_scripts': [
        'circle = my_turtle.circle:main',        <span class="cm"># 실행파일 = 패키지.모듈:함수</span>
        'go_to_goal = my_turtle.go_to_goal:main', <span class="cm"># 노드를 더 만들면 줄을 추가</span>
    ],
},</code></pre>
{{widget:lab|with=turtlesim|title=내 패키지 실행하기}}

<h3>Ctrl+C 에도 깔끔하게 끝내기</h3>
<p><code>rclpy.spin()</code> 은 Ctrl+C 를 받으면 <code>KeyboardInterrupt</code> 예외로 빠져나옵니다. 그대로 두면 트레이스백이 지저분하게 찍히고 정리 코드가 실행되지 않습니다. 실무에서는 아래 패턴을 씁니다. <code>try_shutdown()</code> 은 "아직 안 꺼졌으면 끄기"라서 이미 종료된 경우에도 오류가 나지 않습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class SafeDriver(Node):
    def __init__(self):
        super().__init__('safe_driver')
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(0.1, self.drive)

    def drive(self):
        msg = Twist()
        msg.linear.x = 1.5
        msg.angular.z = 0.8
        self.pub.publish(msg)

    def stop(self):
        self.pub.publish(Twist())          # 모두 0 = 정지 명령
        self.get_logger().info('정지 명령을 보내고 종료합니다')


def main():
    rclpy.init()
    node = SafeDriver()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:              # ■ 정지 / Ctrl+C
        node.stop()
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()</code></pre>

<h3>흔한 실수 모음</h3>
<table class="tbl">
<thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
<tbody>
<tr><td><code>AssertionError: ... must be of type 'float'</code></td><td>float 필드에 정수</td><td><code>2.0</code> 또는 <code>float(x)</code></td></tr>
<tr><td>구독 콜백이 전혀 안 불림</td><td>spin 을 안 함 / 토픽 이름 · 타입 불일치</td><td><code>rclpy.spin</code>, <code>ros2 topic info -v</code> 로 확인</td></tr>
<tr><td>Pose 가 갱신되지 않음</td><td>콜백 안에 <code>while True</code> · 긴 <code>sleep</code></td><td>반복은 타이머에게</td></tr>
<tr><td><code>TypeError: 'NoneType' object is not callable</code></td><td>콜백에 괄호: <code>self.cb()</code></td><td><code>self.cb</code></td></tr>
<tr><td><code>ImportError: cannot import name 'String'</code></td><td><code>from std_msgs import String</code> (.msg 빠짐)</td><td><code>from std_msgs.msg import String</code></td></tr>
<tr><td><code>ros2 run</code> 이 "No executable found"</td><td>entry_points 미등록 · 빌드 후 source 안 함</td><td>setup.py 확인 → <code>colcon build</code> → <code>source install/setup.bash</code></td></tr>
<tr><td>코드를 고쳤는데 옛날 동작</td><td>다시 빌드하지 않음</td><td><code>colcon build --symlink-install</code> 쓰면 파이썬은 재빌드 불필요</td></tr>
</tbody></table>`
    }
  ],

  videos: [
    { title: 'ROS2 Basics #11 - Writing a Simple Publisher and Subscriber (Python)', channel: 'BotBuilder', url: 'https://www.youtube.com/watch?v=eqfoy2ctixE', lang: 'en', min: '15분', desc: '공식 튜토리얼의 talker/listener 를 한 줄씩 따라 치며 설명합니다. 2 · 3절 복습용.' },
    { title: 'ROS2 Tutorial 3: Publisher and Subscriber Nodes From Scratch in Python and Ubuntu Linux!', channel: 'Aleksandar Haber PhD', url: 'https://www.youtube.com/watch?v=VDotKYuKcVY', lang: 'en', desc: '빈 폴더에서 패키지를 만들고 퍼블리셔 · 서브스크라이버를 작성해 ros2 run 까지 — 8절의 패키지 흐름과 같습니다.' },
    { title: 'Hands-On ROS2 - Part 1 (Publisher/Subscriber)', channel: 'Hummingbird', url: 'https://www.youtube.com/watch?v=8407qTyBRe0', lang: 'en', desc: 'Node 클래스 · 타이머 · 콜백 구조를 실습 위주로 보여 줍니다.' },
    { title: 'Mathematics in Robotics : Go to Goal in ROS2', channel: 'Muhammad Luqman (Robotisim)', url: 'https://www.youtube.com/watch?v=SaZz-L3d_AE', lang: 'en', desc: '거리 · atan2 · 방향 오차로 목표점까지 가는 수학을 turtlesim 으로 설명 — 6절 P 제어 그림과 함께 보세요.' },
    { title: 'Go to goal - TurtleSim ROS2', channel: 'Camilo Muñoz', url: 'https://www.youtube.com/watch?v=uQNUUYtXon8', lang: 'en', desc: 'turtlesim 에서 목표점 제어 노드가 실제로 움직이는 모습(짧은 데모).' },
    { title: '"ROS2 파이썬 퍼블리셔 서브스크라이버" 한국어 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=ROS2+%ED%8C%8C%EC%9D%B4%EC%8D%AC+%ED%8D%BC%EB%B8%94%EB%A6%AC%EC%85%94+%EC%84%9C%EB%B8%8C%EC%8A%A4%ED%81%AC%EB%9D%BC%EC%9D%B4%EB%B2%84', lang: 'ko', desc: '한국어로 rclpy 노드 작성을 설명하는 강의를 더 찾아볼 수 있습니다.' }
  ],

  terms: [
    ['rclpy', 'ROS Client Library for Python. 파이썬으로 ROS 2 노드를 만드는 공식 라이브러리'],
    ['rclpy.init() / shutdown()', 'ROS 2 통신 환경(컨텍스트)을 시작하고 끝내는 함수. 프로그램 처음과 끝에 한 번씩'],
    ['Node 클래스', '노드를 나타내는 rclpy 클래스. 상속해서 퍼블리셔 · 타이머 · 구독을 self 에 담는 것이 표준 방식'],
    ['create_publisher', '(메시지 타입, 토픽 이름, QoS) 로 퍼블리셔를 만드는 Node 메서드. .publish(msg) 로 발행'],
    ['create_subscription', '(메시지 타입, 토픽 이름, 콜백, QoS) 로 구독을 만드는 메서드. 메시지가 올 때마다 콜백 호출'],
    ['create_timer', '(주기 초, 콜백) 으로 일정한 주기마다 콜백을 부르는 타이머를 만드는 메서드'],
    ['콜백(callback)', '"이 일이 생기면 불러 줘" 하고 미리 넘겨 두는 함수. 타이머 · 메시지 · 서비스 요청 때 실행기가 호출'],
    ['spin', '실행기를 돌려 준비된 콜백을 계속 처리하는 함수. spin 하지 않으면 콜백은 불리지 않음'],
    ['실행기(executor)', '대기 중인 이벤트를 확인하고 콜백을 실행하는 rclpy 구성 요소. 기본은 단일 스레드'],
    ['이벤트 루프', '"기다림 → 이벤트 처리 → 다시 기다림" 을 반복하는 프로그램 구조'],
    ['Twist', 'geometry_msgs/msg/Twist. linear(선속도)와 angular(각속도) 벡터로 된 속도 명령 메시지'],
    ['로그 수준', 'DEBUG · INFO · WARN · ERROR · FATAL. get_logger() 로 찍으며 /rosout 으로도 발행됨'],
    ['P 제어', '오차에 비례한 명령을 내는 가장 단순한 피드백 제어. 명령 = 이득 × 오차'],
    ['entry_points', 'setup.py 에서 "실행파일 = 패키지.모듈:함수" 로 ros2 run 이름을 등록하는 곳']
  ],

  summary: [
    'rclpy 프로그램의 뼈대: <b>rclpy.init() → 노드 생성 → rclpy.spin(node) → destroy_node() · shutdown()</b>',
    '노드는 <b>Node 를 상속한 클래스</b>로 만들고, __init__ 에서 <b>create_publisher · create_timer · create_subscription</b> 을 호출한다',
    '메시지는 클래스 객체 — 필드 타입이 엄격해서 float 자리에 int 를 넣으면 <b>AssertionError</b>',
    '로그는 <b>get_logger().info/warning/error</b>, 자주 찍힐 땐 <b>throttle_duration_sec</b> · <b>once</b>',
    '<b>콜백은 spin 하는 동안에만</b> 불리며, 기본 실행기는 한 번에 하나씩 처리하므로 콜백은 짧게',
    'Pose 구독 + cmd_vel 발행 = 폐루프 제어. <b>P 제어</b>: 회전 = K·방향오차, 전진 = K·거리',
    '패키지에 넣으려면 <b>setup.py entry_points</b> 등록 → colcon build → source → ros2 run'
  ],

  quiz: [
    { q: 'rclpy 프로그램에서 <b>타이머와 구독 콜백이 실제로 불리게</b> 하는 줄은?', options: ['rclpy.init()', 'Node(\'talker\')', 'rclpy.spin(node)', 'rclpy.shutdown()'], answer: 2, explain: 'spin 이 실행기를 돌려야 준비된 콜백이 실행됩니다. spin(또는 spin_once)을 부르지 않으면 콜백은 한 번도 불리지 않아요.' },
    { q: '<code>self.create_publisher(String, \'topic\', 10)</code> 에서 <b>10</b> 의 의미는?', options: ['초당 10번 발행', '메시지 최대 길이 10자', 'QoS 히스토리 깊이 — 최근 메시지 10개 보관', '구독자 최대 10명'], answer: 2, explain: '세 번째 인자는 QoS 프로필 자리이며, 정수를 넣으면 KEEP_LAST 깊이로 쓰입니다. 발행 주기는 타이머가 정합니다.' },
    { q: '<code>msg = Twist(); msg.linear.x = 2</code> 를 실행하면?', options: ['정상 — 자동으로 2.0 으로 변환', 'AssertionError — float 필드에 int', '거북이가 2배 빠르게 움직임', 'TypeError — Twist 에 linear 가 없음'], answer: 1, explain: 'rclpy 메시지는 필드 타입을 검사합니다. linear.x 는 float64 이므로 2.0 또는 float(2) 로 넣어야 합니다.' },
    { q: 'Pose 구독 콜백 안에 <code>while True:</code> 로 cmd_vel 을 계속 발행하는 코드를 넣었다. 무슨 일이 생길까?', options: ['잘 동작한다', '그 콜백이 끝나지 않아 다음 Pose 가 처리되지 않는다(위치가 갱신 안 됨)', 'ROS 2 가 자동으로 새 스레드를 만든다', '거북이가 두 배 빨라진다'], answer: 1, explain: '기본 실행기는 콜백을 한 번에 하나씩 처리합니다. 끝나지 않는 콜백은 다른 모든 콜백을 막습니다. 반복은 타이머에게 맡기세요.' },
    { q: '목표점 P 제어에서 방향 오차를 <code>atan2(sin e, cos e)</code> 로 감싸는 이유는?', options: ['계산을 빠르게 하려고', '오차를 −π ~ π 로 만들어 짧은 쪽으로 회전하게', '각도를 도(°)로 바꾸려고', '거리를 구하려고'], answer: 1, explain: '예를 들어 오차가 350° 라면 실제로는 −10° 만 돌면 됩니다. wrap 하지 않으면 거의 한 바퀴를 돌아갑니다.' },
    { q: '로그가 너무 자주 찍힐 때 <b>1초에 한 번만</b> 출력하려면?', options: ['info(msg, once=True)', 'info(msg, throttle_duration_sec=1.0)', 'info(msg, skip_first=True)', 'time.sleep(1) 을 콜백에 넣는다'], answer: 1, explain: 'throttle_duration_sec 는 지정한 시간 안의 반복 출력을 건너뜁니다. once 는 딱 한 번만, sleep 은 다른 콜백까지 막으니 쓰면 안 됩니다.' },
    { q: '패키지에 넣은 노드를 <code>ros2 run my_turtle circle</code> 로 실행하려면 setup.py 에 무엇을 적어야 할까?', options: ["data_files 에 'circle.py'", "entry_points 의 console_scripts 에 'circle = my_turtle.circle:main'", "install_requires 에 'circle'", 'package.xml 에 &lt;exec&gt;circle&lt;/exec&gt;'], answer: 1, explain: 'ament_python 패키지는 entry_points 의 console_scripts 로 실행 파일 이름을 등록합니다. 등록 후 colcon build 와 source 가 필요해요.' }
  ],

  slides: [
    {
      title: '오늘의 질문',
      layout: 'center',
      html: `<div class="s-big">명령어로 움직이던 거북이를<br><b>내 파이썬 코드</b>로 움직이려면?</div>
<div class="cards c3">
  <div class="card blue step"><div class="ci">📤</div><b>발행</b><p>cmd_vel 보내기</p></div>
  <div class="card green step"><div class="ci">📥</div><b>구독</b><p>pose 받기</p></div>
  <div class="card orange step"><div class="ci">🧠</div><b>판단</b><p>P 제어</p></div>
</div>`,
      notes: '지난 시간 ros2 topic pub 으로 거북이를 움직였던 것을 떠올리게 합니다. "그런데 벽에 부딪히기 전에 스스로 멈추게 하려면?" 하고 물어 코드가 필요한 이유를 끌어냅니다. (3분)'
    },
    {
      title: 'rclpy 프로그램의 뼈대',
      html: `{{fig:anatomy|nocap}}`,
      notes: '네 단계를 가게 문 열기 비유로 설명합니다. init=전기 연결, Node=간판, spin=영업 중, shutdown=문 닫기. 발문: "spin 을 빼면 어떻게 될까요?" 답은 5절에서 확인한다고 예고합니다. (5분)'
    },
    {
      title: '첫 노드 실행',
      html: `{{widget:pylab|ex=hello|with=graph}}`,
      notes: '학생들이 직접 ▶ 실행을 누르게 합니다. 로그 형식 [수준] [시각] [노드 이름] 을 짚어 주고, 노드가 그래프에 잠깐 나타났다 사라지는 이유(spin 없음)를 묻습니다. (5분)'
    },
    {
      title: 'Node 클래스 해부',
      html: `{{fig:nodeClass|nocap}}`,
      notes: 'super().__init__ → create_publisher → create_timer → timer_callback 순서로 손가락으로 짚습니다. create_publisher 의 세 인자(타입 · 토픽 · QoS 깊이)를 칠판에 적어 두세요. (6분)'
    },
    {
      title: 'talker 실습',
      html: `{{widget:pylab|ex=talker|with=graph}}`,
      notes: '실행 후 timer_period 를 0.1 로 바꿔 보게 합니다. 짝과 함께 한 명은 코드, 한 명은 ros2 topic hz 로 확인하는 역할을 나누면 좋습니다. (8분)'
    },
    {
      title: '구독 = 콜백 등록',
      html: `<div class="s-points">
<p class="step"><code>create_subscription(<b>타입</b>, <b>토픽</b>, <b>콜백</b>, <b>10</b>)</code></p>
<p class="step">메시지가 오면 실행기가 <b>콜백(msg)</b> 을 불러 줌</p>
<p class="step">콜백 이름에 <b>괄호 X</b> — 함수 자체를 넘긴다</p>
<p class="step">토픽 이름 · 타입이 같아야 연결</p>
</div>`,
      notes: '콜백 개념이 처음인 학생이 많습니다. "택배 올 때 문자 보내 주세요"라고 전화번호(함수)를 맡기는 것에 비유하세요. 괄호를 붙이면 지금 전화를 걸어 버리는 것. (5분)'
    },
    {
      title: 'float 함정',
      layout: 'center',
      html: `<div class="s-big"><code>msg.linear.x = 2</code> ✗<br><code>msg.linear.x = 2.0</code> ✓</div>
<p class="s-small step">AssertionError: The 'x' field must be of type 'float'</p>`,
      notes: '첫 코드에서 거의 모든 학생이 한 번씩 만나는 오류입니다. 파이썬은 원래 느슨하지만 ROS 메시지는 C++ 과도 주고받아야 하므로 타입을 엄격히 검사한다고 설명합니다. (3분)'
    },
    {
      title: '로그 수준',
      html: `<div class="stats">
  <div class="stat gray"><b>DEBUG</b><span>기본 숨김</span></div>
  <div class="stat blue"><b>INFO</b><span>진행</span></div>
  <div class="stat yellow"><b>WARN</b><span>이상</span></div>
  <div class="stat red"><b>ERROR</b><span>실패</span></div>
</div>
<p class="s-small step"><code>throttle_duration_sec=1.0</code> · <code>once=True</code></p>`,
      notes: 'print 대신 get_logger 를 쓰는 이유(시각 · 노드 이름 · /rosout 으로 모아 보기)를 설명합니다. 센서 콜백에서 로그 폭탄이 터지는 상황을 예로 throttle 을 소개하세요. (4분)'
    },
    {
      title: 'spin = 이벤트 루프',
      html: `{{fig:eventLoop|nocap}}`,
      notes: '홀 직원 한 명 비유. 직원이 출근을 안 하면(spin 없음) 벨이 울려도 응대가 없고, 한 테이블에 오래 있으면(sleep) 다른 테이블이 기다립니다. 이어서 spin_demo 코드를 실행해 확인합니다. (7분)'
    },
    {
      title: '원 그리기',
      html: `{{widget:pylab|ex=turtle_circle|with=turtlesim}}`,
      notes: '반지름 = 선속도 / 각속도 공식을 알려 주고, 값을 바꾸기 전에 반지름을 먼저 예측하게 합니다. 예측 → 실행 → 확인 순서를 지키세요. (6분)'
    },
    {
      title: 'P 제어로 목표점 가기',
      html: `{{fig:pctrl|nocap}}`,
      notes: '칠판에 거북이와 목표를 그리고 dx, dy, d, atan2, θ, e 를 차례로 표시합니다. wrap 이 필요한 이유는 350° 대신 −10° 예시로. 이득이 크면 흔들리고 작으면 느리다는 것도 예고. (8분)'
    },
    {
      title: '목표점 실습',
      html: `{{widget:pylab|ex=turtle_goto|with=turtlesim}}`,
      notes: '실행 중 ros2 param set 으로 목표를 바꿔 보게 하고, 이득 4.0 을 0.5 · 15.0 으로 바꿔 비교합니다. 누가 가장 빨리 부드럽게 도착하는 이득을 찾는지 작은 대회를 열어도 좋습니다. (10분)'
    },
    {
      title: '연습 — 사각형',
      html: `{{fig:square|nocap}}`,
      notes: '상태 기계 개념을 소개하고 10분 정도 스스로 짜게 합니다. 완성한 학생에게는 꼭짓점이 어긋나는 이유(개루프 오차)를 묻고 Pose 를 이용한 개선을 과제로. (12분)'
    },
    {
      title: '패키지로 만들기',
      html: `<div class="flow">
  <div class="fb teal step"><b>pkg create</b></div>
  <div class="fb blue step"><b>노드 파일</b></div>
  <div class="fb orange step"><b>entry_points</b></div>
  <div class="fb green step"><b>colcon build</b></div>
  <div class="fb purple step"><b>ros2 run</b></div>
</div>
<p class="s-small step"><code>'circle = my_turtle.circle:main'</code></p>`,
      notes: '7장의 패키지 구조를 다시 떠올리게 하고 entry_points 한 줄이 ros2 run 이름이 된다는 점을 강조합니다. try/except KeyboardInterrupt + try_shutdown 패턴도 함께 보여 주세요. (5분)'
    }
  ]
});
