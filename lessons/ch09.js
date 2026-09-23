/* 9장 — rclpy 서비스 · 액션 · 파라미터 · rclcpp */
Course.lesson({
  id: 'ch09', no: '09',
  icon: '🧩',
  title: 'rclpy 서비스 · 액션 · 파라미터 · rclcpp',
  subtitle: '묻고 답하기, 오래 걸리는 일 맡기기, 설정값 바꾸기를 코드로 — 그리고 C++ 로도',
  level: '기초', time: '150분',
  goals: [
    'create_service 로 서비스 서버를, create_client · call_async 로 클라이언트를 만들 수 있다',
    '콜백 안에서 서비스를 동기 호출하면 교착 상태가 되는 이유를 설명하고 add_done_callback 방식으로 피할 수 있다',
    'ActionServer(execute_callback · publish_feedback · succeed)와 ActionClient(send_goal_async · feedback · get_result_async)를 작성할 수 있다',
    'declare_parameter · get_parameter · add_on_set_parameters_callback 으로 파라미터를 코드에서 다룰 수 있다',
    '같은 talker 를 rclcpp(C++)로 읽고, CMakeLists.txt · package.xml 설정과 Python/C++ 선택 기준을 말할 수 있다'
  ],
  teacher: {
    intro: '"8장에서 거북이를 계속 달리게 했죠. 그럼 \'지금 멈춰!\' 라는 한 번의 부탁은 토픽이 좋을까요, 서비스가 좋을까요?" 로 시작합니다. 4 · 5 · 6장의 CLI 경험을 떠올리게 한 뒤, 오늘은 그 서버와 클라이언트를 직접 코드로 만든다고 안내합니다. (2분)',
    flow: '① 서비스 서버 20분 → ② 클라이언트(spin_until_future_complete · spawn) 15분 → ③ 콜백 안 호출과 교착 · add_done_callback 15분 → ④ 액션 서버 20분 → ⑤ 액션 클라이언트 · rotate 15분 → ⑥ 파라미터 코드 15분 → ⑦ rclcpp talker 20분 → ⑧ C++ 빌드 설정 · Python vs C++ · 퀴즈 30분'
  },

  figs: {
    /* ------------------------------------------------------------ 서비스 흐름 */
    srvFlow: {
      caption: '서비스 = 요청 한 번에 응답 한 번. 서버 콜백은 request 를 읽고 response 를 채워 반드시 return 합니다',
      svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="클라이언트가 AddTwoInts 요청을 보내면 서버 콜백이 response.sum을 채워 반환하는 서비스 흐름">
  <ellipse cx="140" cy="110" rx="120" ry="34" class="blue"/>
  <text x="140" y="104" class="t-b t-c t-blue">/minimal_client_async</text>
  <text x="140" y="124" class="t-xs t-c">create_client(AddTwoInts, …)</text>

  <ellipse cx="740" cy="110" rx="120" ry="34" class="blue"/>
  <text x="740" y="104" class="t-b t-c t-blue">/minimal_service</text>
  <text x="740" y="124" class="t-xs t-c">create_service(AddTwoInts, …)</text>

  <rect x="350" y="86" width="180" height="48" rx="10" class="orange"/>
  <text x="440" y="106" class="t-b t-c t-orange">/add_two_ints</text>
  <text x="440" y="124" class="t-xs t-c">example_interfaces/srv/AddTwoInts</text>

  <line x1="262" y1="96" x2="348" y2="96" class="ln-orange thick ar-orange"/>
  <line x1="532" y1="96" x2="618" y2="96" class="ln-orange thick ar-orange"/>
  <text x="300" y="80" class="t-xs t-c t-orange">① 요청 a=41, b=1</text>
  <line x1="618" y1="126" x2="532" y2="126" class="ln-teal thick ar-teal"/>
  <line x1="348" y1="126" x2="262" y2="126" class="ln-teal thick ar-teal"/>
  <text x="580" y="152" class="t-xs t-c t-teal">③ 응답 sum=42</text>

  <rect x="560" y="176" width="300" height="148" rx="12" class="box"/>
  <text x="576" y="200" class="t-sm t-mono t-b">② def add_cb(self, request, response):</text>
  <text x="596" y="228" class="t-sm t-mono">response.sum = request.a + request.b</text>
  <text x="596" y="254" class="t-sm t-mono t-red t-b">return response</text>
  <text x="576" y="286" class="t-xs t-mu">response 는 비어 있는 채로 넘어오고,</text>
  <text x="576" y="306" class="t-xs t-mu">채워서 돌려주는 것이 서버의 일</text>

  <rect x="20" y="176" width="500" height="148" rx="12" class="box"/>
  <text x="36" y="200" class="t-sm t-mono t-b">클라이언트 쪽</text>
  <text x="36" y="228" class="t-sm t-mono">future = cli.call_async(req)   <tspan class="t-mu"># 즉시 반환</tspan></text>
  <text x="36" y="254" class="t-sm t-mono">rclpy.spin_until_future_complete(node, future)</text>
  <text x="36" y="280" class="t-sm t-mono">future.result().sum             <tspan class="t-mu"># 42</tspan></text>
  <text x="36" y="306" class="t-xs t-mu">future = "나중에 결과가 담길 상자" (택배 송장 번호)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 교착 상태 */
    deadlock: {
      caption: '단일 스레드 실행기에서 콜백 안의 동기 호출 — 응답을 처리할 사람이 바로 나 자신이라 영원히 기다립니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="타이머 콜백 안에서 client.call을 부르면 응답 콜백을 처리할 실행기가 막혀 교착 상태가 되는 과정과 해결책">
  <rect x="20" y="20" width="420" height="290" rx="14" class="red"/>
  <text x="230" y="48" class="t-b t-c t-red">✗ 교착 상태 (deadlock)</text>
  <circle cx="110" cy="120" r="46" class="box"/>
  <text x="110" y="112" class="t-sm t-c">실행기</text>
  <text x="110" y="132" class="t-xs t-c">(스레드 1개)</text>
  <rect x="190" y="80" width="230" height="80" rx="10" class="box"/>
  <text x="305" y="104" class="t-xs t-c t-mono">def on_timer(self):</text>
  <text x="305" y="126" class="t-xs t-c t-mono t-b">res = cli.call(req)</text>
  <text x="305" y="148" class="t-xs t-c t-red">⏳ 응답 올 때까지 멈춤</text>
  <line x1="156" y1="120" x2="188" y2="120" class="ln ar"/>
  <rect x="190" y="200" width="230" height="56" rx="10" class="box"/>
  <text x="305" y="222" class="t-xs t-c">📨 응답 도착 → 처리 대기</text>
  <text x="305" y="242" class="t-xs t-c t-mu">"실행기가 비면 처리할게요"</text>
  <path d="M305,198 L305,164" class="ln-red dash ar-red"/>
  <text x="230" y="290" class="t-sm t-c">실행기는 on_timer 안에 갇혀 있음 → 응답을 못 받음 → 영원히 대기</text>

  <rect x="460" y="20" width="400" height="290" rx="14" class="green"/>
  <text x="660" y="48" class="t-b t-c t-green">✓ 해결 방법</text>
  <text x="480" y="86" class="t-sm t-b">① 비동기 + 완료 콜백 (가장 간단)</text>
  <text x="496" y="110" class="t-xs t-mono">f = cli.call_async(req)</text>
  <text x="496" y="130" class="t-xs t-mono">f.add_done_callback(self.on_done)</text>
  <text x="496" y="150" class="t-xs t-mu">콜백은 바로 끝나고, 응답은 on_done 에서</text>
  <text x="480" y="190" class="t-sm t-b">② 멀티스레드 실행기 + 콜백 그룹 분리</text>
  <text x="496" y="214" class="t-xs t-mono">MultiThreadedExecutor()</text>
  <text x="496" y="234" class="t-xs t-mono">client callback_group=다른 그룹</text>
  <text x="496" y="254" class="t-xs t-mu">다른 스레드가 응답을 처리 (<tspan class="t-b">11장</tspan>)</text>
  <text x="480" y="292" class="t-xs t-mu">main() 안에서는 spin_until_future_complete 사용 OK</text>
</svg>`
    },

    /* ------------------------------------------------------------ 액션 흐름 */
    actionFlow: {
      caption: '액션 클라이언트와 서버의 대화 — 목표 수락, 피드백 여러 번, 결과 한 번. 클라이언트는 future 두 개를 차례로 기다립니다',
      svg: `<svg class="dg" viewBox="0 0 880 400" role="img" aria-label="send_goal_async, goal_response_callback, feedback_callback, get_result_async, get_result_callback과 서버의 execute_callback, publish_feedback, succeed 순서도">
  <ellipse cx="170" cy="40" rx="150" ry="26" class="blue"/>
  <text x="170" y="40" class="t-b t-c t-blue">액션 클라이언트</text>
  <ellipse cx="710" cy="40" rx="150" ry="26" class="blue"/>
  <text x="710" y="40" class="t-b t-c t-blue">액션 서버</text>
  <line x1="170" y1="66" x2="170" y2="390" class="ln thin dash"/>
  <line x1="710" y1="66" x2="710" y2="390" class="ln thin dash"/>

  <line x1="172" y1="96" x2="706" y2="96" class="ln-purple thick ar-purple"/>
  <text x="440" y="88" class="t-sm t-c t-purple">① send_goal_async(goal, feedback_callback=…)</text>
  <line x1="708" y1="130" x2="174" y2="130" class="ln-purple ar-purple"/>
  <text x="440" y="122" class="t-xs t-c">② 수락 → goal_response_callback(future) · goal_handle.accepted</text>

  <rect x="720" y="146" width="150" height="150" rx="10" class="purple"/>
  <text x="795" y="168" class="t-xs t-c t-b t-mono">execute_callback</text>
  <text x="795" y="192" class="t-xs t-c t-mono">for …:</text>
  <text x="795" y="212" class="t-xs t-c t-mono">publish_feedback()</text>
  <text x="795" y="236" class="t-xs t-c t-mono">succeed()</text>
  <text x="795" y="260" class="t-xs t-c t-mono">return Result</text>

  <line x1="708" y1="180" x2="174" y2="180" class="ln-teal dash ar-teal"/>
  <line x1="708" y1="206" x2="174" y2="206" class="ln-teal dash ar-teal"/>
  <line x1="708" y1="232" x2="174" y2="232" class="ln-teal dash ar-teal"/>
  <text x="440" y="222" class="t-xs t-c t-teal">③ 피드백 여러 번 → feedback_callback(fb_msg)</text>

  <line x1="172" y1="276" x2="706" y2="276" class="ln-purple ar-purple"/>
  <text x="440" y="268" class="t-xs t-c">④ goal_handle.get_result_async()</text>
  <line x1="708" y1="316" x2="174" y2="316" class="ln-green thick ar-green"/>
  <text x="440" y="308" class="t-sm t-c t-green t-b">⑤ 결과 → get_result_callback(future) · future.result().result</text>

  <rect x="20" y="340" width="300" height="50" rx="10" class="box"/>
  <text x="170" y="360" class="t-xs t-c">클라이언트는 future 가 두 개</text>
  <text x="170" y="378" class="t-xs t-c t-mu">(목표 수락 future → 결과 future)</text>
  <rect x="560" y="340" width="300" height="50" rx="10" class="box"/>
  <text x="710" y="360" class="t-xs t-c">succeed() 를 안 부르면 상태는 ABORTED</text>
  <text x="710" y="378" class="t-xs t-c t-mu">(취소면 canceled(), 실패면 abort())</text>
</svg>`
    },

    /* ------------------------------------------------------------ 파라미터 콜백 */
    paramCb: {
      caption: '파라미터 변경 요청은 먼저 on_set_parameters 콜백을 통과해야 합니다 — 여기서 거절하면 값이 바뀌지 않습니다',
      svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="ros2 param set 요청이 파라미터 콜백에서 검사되어 받아들여지거나 거절되는 흐름">
  <rect x="20" y="100" width="200" height="80" rx="12" class="box"/>
  <text x="120" y="130" class="t-sm t-c t-mono">ros2 param set</text>
  <text x="120" y="152" class="t-sm t-c t-mono">/param_demo max_speed 3.0</text>
  <line x1="220" y1="140" x2="298" y2="140" class="ln ar"/>

  <polygon points="420,60 560,140 420,220 280,140" class="yellow"/>
  <text x="420" y="128" class="t-sm t-c t-b">on_change(params)</text>
  <text x="420" y="150" class="t-xs t-c">값 검사</text>

  <line x1="530" y1="110" x2="620" y2="70" class="ln-green thick ar-green"/>
  <rect x="622" y="36" width="238" height="70" rx="12" class="green"/>
  <text x="741" y="62" class="t-sm t-c t-b t-green">successful=True</text>
  <text x="741" y="86" class="t-xs t-c">값 적용 → "Set parameter successful"</text>

  <line x1="530" y1="170" x2="620" y2="210" class="ln-red thick ar-red"/>
  <rect x="622" y="176" width="238" height="70" rx="12" class="red"/>
  <text x="741" y="202" class="t-sm t-c t-b t-red">successful=False, reason=…</text>
  <text x="741" y="226" class="t-xs t-c">값 유지 → "Setting parameter failed: …"</text>
  <text x="420" y="260" class="t-xs t-c t-mu">콜백은 반드시 SetParametersResult 를 return (rcl_interfaces.msg)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 클라이언트 라이브러리 층 */
    clientLibs: {
      caption: 'rclpy 와 rclcpp 는 같은 C 라이브러리(rcl)와 RMW 위에 올라간 "언어별 손잡이"입니다 — 그래서 서로 자유롭게 통신합니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="rclpy와 rclcpp가 rcl, rmw, DDS 위에 있는 층 구조와 Python 노드와 C++ 노드의 통신">
  <rect x="40" y="30" width="360" height="60" rx="10" class="teal"/>
  <text x="220" y="56" class="t-b t-c t-teal">🐍 rclpy (Python)</text>
  <text x="220" y="76" class="t-xs t-c">빠르게 작성 · 실험 · 스크립트</text>
  <rect x="480" y="30" width="360" height="60" rx="10" class="purple"/>
  <text x="660" y="56" class="t-b t-c t-purple">⚙️ rclcpp (C++)</text>
  <text x="660" y="76" class="t-xs t-c">빠른 실행 · 실시간 · 드라이버</text>
  <line x1="220" y1="90" x2="220" y2="118" class="ln ar"/>
  <line x1="660" y1="90" x2="660" y2="118" class="ln ar"/>
  <rect x="40" y="120" width="800" height="50" rx="10" class="blue"/>
  <text x="440" y="150" class="t-b t-c t-blue">rcl (C 언어 공통 핵심 — 노드 · 토픽 · 서비스 · 파라미터 규칙)</text>
  <rect x="40" y="180" width="800" height="50" rx="10" class="orange"/>
  <text x="440" y="210" class="t-b t-c t-orange">rmw (미들웨어 추상화) → Fast DDS · Cyclone DDS · Zenoh</text>
  <ellipse cx="220" cy="286" rx="110" ry="26" class="blue"/>
  <text x="220" y="286" class="t-sm t-c t-b t-blue">/talker (C++)</text>
  <rect x="385" y="266" width="110" height="40" rx="6" class="green"/>
  <text x="440" y="286" class="t-sm t-c t-b t-green">/chatter</text>
  <ellipse cx="660" cy="286" rx="110" ry="26" class="blue"/>
  <text x="660" y="286" class="t-sm t-c t-b t-blue">/listener (Python)</text>
  <line x1="330" y1="286" x2="383" y2="286" class="ln-green thick ar-green"/>
  <line x1="497" y1="286" x2="548" y2="286" class="ln-green thick ar-green"/>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '서비스 서버 만들기',
      html: `
<p><a href="#ch04">4장</a>에서 <code>ros2 service call</code> 로 서비스를 불러 봤습니다. 이번에는 <b>서버를 직접</b> 만듭니다. 핵심은 한 줄, <code>create_service(타입, 이름, 콜백)</code> 입니다. 요청이 올 때마다 콜백이 <code>(request, response)</code> 두 인자로 불리고, 우리는 response 를 채워 <b>return</b> 합니다.</p>
{{fig:srvFlow}}

<div class="box analogy"><div class="box-t">🍕 비유 — 피자 가게 주문서</div>
손님(클라이언트)이 주문서(request)를 내면, 가게(서버)는 <b>빈 영수증(response)</b>을 받아 내용을 적어 돌려줍니다. 영수증을 적기만 하고 <b>건네주지 않으면</b>(return 누락) 손님은 아무것도 못 받습니다.</div>

<p>공식 예제 <b>AddTwoInts 서버</b>를 실행하고 터미널에서 불러 보세요. 실습기 옆 화면이 터미널입니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 내가 만든 서버 부르기</div>
<ol>
  <li>실습기에서 <b>▶ 실행</b> — <code>/add_two_ints</code> 서비스가 생깁니다.</li>
  <li>옆 터미널에 <code>ros2 service list</code> 를 입력해 서비스가 보이는지 확인합니다.</li>
  <li><code>ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 2, b: 3}"</code> 를 입력합니다. 서버 로그에 <code>Incoming request</code>, 터미널에 <code>sum=5</code> 가 찍힙니다.</li>
  <li>코드에서 <code>return response</code> 줄을 지우고 다시 호출해 보세요. 어떤 오류가 날까요?</li>
</ol></div>
{{widget:pylab|ex=add_server|with=term}}

<p>이번엔 거북이에 쓸모 있는 서버를 만들어 봅시다. <code>std_srvs/srv/SetBool</code>(요청 <code>bool data</code> → 응답 <code>bool success</code>, <code>string message</code>)로 <b>"달려/멈춰" 스위치</b>를 만듭니다. 달리기는 8장처럼 타이머가 맡고, 서비스 콜백은 상태 변수만 바꿉니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from std_srvs.srv import SetBool


class ToggleDriver(Node):
    def __init__(self):
        super().__init__('toggle_driver')
        self.driving = False
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.srv = self.create_service(SetBool, 'toggle_drive', self.on_toggle)
        self.create_timer(0.1, self.drive)
        self.get_logger().info('서비스 /toggle_drive 준비 완료')

    def on_toggle(self, request, response):
        self.driving = request.data
        response.success = True
        response.message = '출발!' if self.driving else '정지!'
        self.get_logger().info(f'요청 data={request.data} → {response.message}')
        return response                     # ← 잊지 말기!

    def drive(self):
        msg = Twist()
        if self.driving:
            msg.linear.x = 1.5
            msg.angular.z = 0.9
        self.pub.publish(msg)


def main():
    rclpy.init()
    rclpy.spin(ToggleDriver())


if __name__ == '__main__':
    main()</code></pre>
<p>실행한 뒤 아래 명령으로 켜고 끕니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service type /toggle_drive
ros2 service call /toggle_drive std_srvs/srv/SetBool "{data: true}"</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 service call /toggle_drive std_srvs/srv/SetBool "{data: false}"</code></pre>
<div class="box warn"><div class="box-t">⚠ 서버 콜백은 빨리 끝내기</div>
서비스 콜백이 오래 걸리면(예: 10초 동안 이동) 그동안 노드의 다른 콜백이 멈추고 클라이언트도 기다립니다. <b>오래 걸리는 일은 액션</b>으로(4 · 5절), 서비스는 "설정 바꾸기 · 즉시 답할 수 있는 질문"에 씁니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '서비스 클라이언트 — call_async 와 future',
      html: `
<p>클라이언트는 세 단계입니다. <b>① create_client</b> 로 만들고, <b>② wait_for_service</b> 로 서버가 뜰 때까지 기다린 뒤, <b>③ call_async</b> 로 요청을 보냅니다. call_async 는 응답을 기다리지 않고 <b>future</b>(나중에 결과가 담길 상자)를 즉시 돌려줍니다.</p>
<pre class="code" data-lang="python"><code>self.cli = self.create_client(AddTwoInts, 'add_two_ints')
while not self.cli.wait_for_service(timeout_sec=1.0):       <span class="cm"># 서버 뜰 때까지</span>
    self.get_logger().info('service not available, waiting again...')

future = self.cli.call_async(AddTwoInts.Request(a=41, b=1))   <span class="cm"># 즉시 반환</span>
rclpy.spin_until_future_complete(self, future)               <span class="cm"># main() 에서 기다리기</span>
print(future.result().sum)                                   <span class="cm"># 42</span></code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 클라이언트와 서버 짝 맞추기</div>
<ol>
  <li>클라이언트 실습기를 먼저 <b>▶ 실행</b>하세요. 서버가 없어서 <code>service not available, waiting again...</code> 이 1초마다 찍힙니다.</li>
  <li>옆 터미널에서 <code>ros2 run demo_nodes_py add_two_ints_server</code> 를 실행하면 곧바로 <code>41 + 1 = 42</code> 가 나오고 프로그램이 끝납니다.</li>
  <li><code>send_request(41, 1)</code> 의 숫자를 바꿔 다시 실행해 보세요.</li>
</ol></div>
{{widget:pylab|ex=add_client|with=term}}

<p>turtlesim 의 <code>/spawn</code> 과 <code>/거북이이름/set_pen</code> 도 서비스입니다. 아래 예제는 거북이 3마리를 무작위 위치에 만들고 펜 색을 바꿉니다. 한 요청이 끝나야 다음 요청을 보내는 <b>순차 호출</b> 구조를 보세요.</p>
{{widget:pylab|ex=spawn|with=turtlesim}}

<div class="box tip"><div class="box-t">💡 client.call() 도 있지만…</div>
rclpy 에는 응답이 올 때까지 멈춰서 기다리는 <code>client.call(req)</code> 도 있습니다. 하지만 <b>다른 스레드가 spin 하고 있을 때만</b> 안전합니다. 초보자는 <b>main 에서는 call_async + spin_until_future_complete</b>, <b>콜백 안에서는 call_async + add_done_callback</b> 두 가지만 기억하세요. (다음 절)</div>`
    },

    /* ================================================================ 3 */
    {
      title: '콜백 안에서 서비스 부르기 — 교착 상태 피하기',
      html: `
<p>"타이머 콜백에서 1초마다 펜 색을 바꾸고 싶다"처럼 <b>콜백 안에서</b> 서비스를 부르는 일은 아주 흔합니다. 이때 <code>client.call()</code> 이나 <code>spin_until_future_complete()</code> 를 쓰면 기본(단일 스레드) 실행기에서는 <b>교착 상태(deadlock)</b>에 빠집니다.</p>
{{fig:deadlock}}
<div class="box warn"><div class="box-t">⚠ 왜 멈출까?</div>
기본 실행기에는 일꾼(스레드)이 한 명뿐입니다. 그 일꾼이 타이머 콜백 안에서 "응답 올 때까지 기다리는 중"이면, 막상 도착한 응답을 처리할 사람이 없습니다. 콜백 안에서 <code>spin_until_future_complete</code> 를 다시 부르는 것도 이미 spin 중인 실행기를 겹쳐 돌리는 것이라 오류나 멈춤의 원인이 됩니다. 이 현상은 <a href="#ch11">11장</a>의 실행기 위젯에서 눈으로 재현해 볼 수 있습니다.</div>

<p>가장 간단한 해결책은 <b>기다리지 않는 것</b>입니다. <code>call_async</code> 로 보내고 콜백은 바로 끝낸 뒤, 응답은 <code>future.add_done_callback(함수)</code> 로 받습니다. 아래 코드는 거북이를 원으로 달리게 하면서 1초마다 펜 색을 무작위로 바꿉니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import random
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.srv import SetPen


class RainbowPen(Node):
    def __init__(self):
        super().__init__('rainbow_pen')
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.pen = self.create_client(SetPen, '/turtle1/set_pen')
        self.busy = False
        self.create_timer(0.1, self.drive)
        self.create_timer(1.0, self.change_color)

    def drive(self):
        msg = Twist()
        msg.linear.x = 2.0
        msg.angular.z = 1.2
        self.pub.publish(msg)

    def change_color(self):
        if self.busy or not self.pen.service_is_ready():
            return                                   # 이전 요청이 아직이면 건너뜀
        req = SetPen.Request(r=random.randint(0, 255), g=random.randint(0, 255),
                             b=random.randint(0, 255), width=4, off=0)
        self.busy = True
        future = self.pen.call_async(req)            # 보내기만 하고 바로 돌아옴
        future.add_done_callback(lambda f: self.on_done(f, req))

    def on_done(self, future, req):
        self.busy = False
        future.result()                              # 서버 쪽 오류가 있었다면 여기서 예외
        self.get_logger().info(f'펜 색 → ({req.r}, {req.g}, {req.b})')


def main():
    rclpy.init()
    node = RainbowPen()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()</code></pre>
<p>교착 상태에 빠지는 코드는 아래와 같습니다(실행 금지 — 실제 ROS 2 에서 영원히 멈춥니다).</p>
<pre class="code" data-lang="python"><code><span class="cm"># ✗ 기본 실행기(단일 스레드) + 콜백 안 동기 호출 = 교착</span>
def change_color(self):
    req = SetPen.Request(r=255, g=0, b=0, width=4, off=0)
    self.pen.call(req)                                        <span class="cm"># 여기서 영원히 대기</span>
    <span class="cm"># 또는</span>
    future = self.pen.call_async(req)
    rclpy.spin_until_future_complete(self, future)            <span class="cm"># 이미 spin 중 → 문제</span></code></pre>
<table class="tbl">
<thead><tr><th>어디서 부르나</th><th>추천 방법</th></tr></thead>
<tbody>
<tr><td><code>main()</code> (spin 전 · 밖)</td><td><code>call_async</code> + <code>rclpy.spin_until_future_complete(node, future)</code></td></tr>
<tr><td>타이머 · 구독 · 서비스 콜백 안</td><td><code>call_async</code> + <code>future.add_done_callback(cb)</code></td></tr>
<tr><td>콜백 안에서 꼭 순서대로 기다려야 할 때</td><td><code>MultiThreadedExecutor</code> + 클라이언트를 <b>다른 콜백 그룹</b>에 두고 <code>call()</code> (11장)</td></tr>
</tbody></table>`
    },

    /* ================================================================ 4 */
    {
      title: '액션 서버 — 목표 · 피드백 · 결과',
      html: `
<p><a href="#ch05">5장</a>에서 액션은 <b>목표(goal) → 피드백(feedback) 여러 번 → 결과(result)</b> 로 이루어진다고 배웠습니다. 파이썬에서는 <code>rclpy.action.ActionServer</code> 로 서버를 만들고, 실제 일은 <b>execute_callback(goal_handle)</b> 에서 합니다.</p>
{{fig:actionFlow}}
<table class="tbl">
<thead><tr><th>코드</th><th>뜻</th></tr></thead>
<tbody>
<tr><td><code>ActionServer(self, Fibonacci, 'fibonacci', self.execute_callback)</code></td><td>노드 · 액션 타입 · 이름 · 실행 콜백</td></tr>
<tr><td><code>goal_handle.request.order</code></td><td>클라이언트가 보낸 목표 값</td></tr>
<tr><td><code>goal_handle.publish_feedback(fb)</code></td><td>중간 진행 상황 보내기 (여러 번)</td></tr>
<tr><td><code>goal_handle.succeed()</code></td><td>상태를 SUCCEEDED 로 (<code>abort()</code> · <code>canceled()</code> 도 있음)</td></tr>
<tr><td><code>return Fibonacci.Result(...)</code></td><td>결과 메시지를 반환</td></tr>
</tbody></table>

<div class="box practice"><div class="box-t">🧪 해 보기 — 피보나치 액션 서버</div>
<ol>
  <li>실습기를 <b>▶ 실행</b>합니다.</li>
  <li>옆 터미널에서 <code>ros2 action list</code> 로 <code>/fibonacci</code> 가 보이는지 확인합니다.</li>
  <li><code>ros2 action send_goal /fibonacci action_tutorials_interfaces/action/Fibonacci "{order: 5}" --feedback</code> 을 입력하세요. 1초마다 피드백이 오고 마지막에 결과가 옵니다.</li>
  <li><code>goal_handle.succeed()</code> 줄을 주석 처리하고 다시 보내 보세요. 결과 상태가 어떻게 바뀌나요? (ABORTED)</li>
</ol></div>
{{widget:pylab|ex=fib_server|with=term}}

<div class="box note"><div class="box-t">📝 execute_callback 안의 time.sleep 은 괜찮나요?</div>
8장에서 "콜백 안에 긴 sleep 금지"라고 했는데, 공식 예제는 <code>time.sleep(1)</code> 을 씁니다. 튜토리얼이라 단순하게 쓴 것이고, 이 동안 같은 노드의 다른 콜백은 멈춥니다. 실무에서는 액션 서버를 <code>MultiThreadedExecutor</code> 와 함께 쓰거나, 취소 요청을 확인하며(<code>goal_handle.is_cancel_requested</code>) 조금씩 진행합니다.</div>

<p>취소까지 받는 서버는 이렇게 씁니다. <code>cancel_callback</code> 에서 <code>CancelResponse.ACCEPT</code> 를 돌려주고, 실행 루프 안에서 취소 요청을 확인합니다.</p>
<pre class="code" data-lang="python"><code>from rclpy.action import ActionServer, CancelResponse

self._server = ActionServer(self, Fibonacci, 'fibonacci', self.execute_callback,
                            cancel_callback=lambda goal_handle: CancelResponse.ACCEPT)

def execute_callback(self, goal_handle):
    fb = Fibonacci.Feedback(partial_sequence=[0, 1])
    for i in range(1, goal_handle.request.order):
        if goal_handle.is_cancel_requested:          <span class="cm"># 취소 요청이 왔으면</span>
            goal_handle.canceled()
            return Fibonacci.Result(sequence=fb.partial_sequence)
        fb.partial_sequence.append(fb.partial_sequence[i] + fb.partial_sequence[i - 1])
        goal_handle.publish_feedback(fb)
        time.sleep(1)
    goal_handle.succeed()
    return Fibonacci.Result(sequence=fb.partial_sequence)</code></pre>`
    },

    /* ================================================================ 5 */
    {
      title: '액션 클라이언트 — send_goal_async 와 두 개의 future',
      html: `
<p>액션 클라이언트는 서비스보다 한 단계 더 깁니다. 목표를 보내면 <b>① 수락 여부</b>를 먼저 받고(goal future), 수락됐으면 <b>② 결과</b>를 따로 요청합니다(result future). 그 사이에 피드백은 <code>feedback_callback</code> 으로 계속 들어옵니다.</p>
<ol class="steps-list">
  <li><b>send_goal_async(goal, feedback_callback=…)</b> — 목표 전송, goal future 반환</li>
  <li><b>goal_response_callback(future)</b> — <code>future.result()</code> 가 goal_handle. <code>accepted</code> 확인</li>
  <li><b>goal_handle.get_result_async()</b> — result future 반환 → <code>add_done_callback</code></li>
  <li><b>get_result_callback(future)</b> — <code>future.result().result</code> 가 결과 메시지, <code>.status</code> 가 상태(4 = SUCCEEDED)</li>
</ol>
<div class="box practice"><div class="box-t">🧪 해 보기 — 서버와 클라이언트를 둘 다 내 코드로</div>
<ol>
  <li>앞 절의 피보나치 서버 실습기가 실행 중인지 확인합니다. (꺼졌다면 옆 터미널에서 <code>ros2 run action_tutorials_py fibonacci_action_server</code>)</li>
  <li>아래 클라이언트 실습기를 <b>▶ 실행</b>합니다. <code>Goal accepted :)</code> → 피드백 → <code>Result: [...]</code> 순서로 찍힙니다.</li>
  <li><code>send_goal(10)</code> 을 <code>send_goal(3)</code> 으로 바꿔 보세요.</li>
</ol></div>
{{widget:pylab|ex=fib_client|with=term}}

<p>turtlesim 에도 액션이 있습니다: <code>/turtle1/rotate_absolute</code>(RotateAbsolute). 아래 예제는 목표 각도를 차례로 보내며 거북이를 돌립니다. 이 예제는 <code>send_goal_async()</code> 로 목표를 보내고 <code>rclpy.spin_until_future_complete()</code> 로 수락 · 결과를 차례로 기다립니다 — main 에서 순서대로 쓰기 좋은 방식입니다.</p>
<div class="box warn"><div class="box-t">⚠ 동기 버전 send_goal() · call() 은 조심!</div>
실제 rclpy 의 <code>ActionClient.send_goal()</code> · <code>Client.call()</code> 은 <b>다른 스레드가 spin 하고 있을 때만</b> 응답을 받을 수 있습니다. spin 하는 스레드 없이 main 에서 부르면 영원히 기다릴 수 있어요. 그래서 이 강좌의 예제는 모두 <code>*_async()</code> + <code>spin_until_future_complete()</code> 또는 콜백 방식을 씁니다.</div>
{{widget:pylab|ex=rotate|with=turtlesim}}

<p>같은 일을 <b>콜백 방식(비동기)</b>으로 쓰면 아래와 같습니다. 결과 콜백에서 다음 목표를 보내는 "사슬" 구조라, spin 을 막지 않고 다른 콜백과 함께 돌 수 있습니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import math
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from turtlesim.action import RotateAbsolute


class AsyncRotator(Node):
    def __init__(self):
        super().__init__('async_rotator')
        self.ac = ActionClient(self, RotateAbsolute, '/turtle1/rotate_absolute')
        self.targets = [90, 180, -90, 0]

    def next_goal(self):
        if not self.targets:
            self.get_logger().info('모든 목표 완료!')
            return
        deg = self.targets.pop(0)
        goal = RotateAbsolute.Goal(theta=math.radians(deg))
        self.get_logger().info(f'목표 {deg}° 전송')
        f = self.ac.send_goal_async(goal, feedback_callback=self.on_feedback)
        f.add_done_callback(self.on_goal_response)

    def on_goal_response(self, future):
        handle = future.result()
        if not handle.accepted:
            self.get_logger().warning('목표가 거절됐습니다')
            return
        handle.get_result_async().add_done_callback(self.on_result)

    def on_feedback(self, fb_msg):
        rem = math.degrees(fb_msg.feedback.remaining)
        self.get_logger().info(f'남은 각도 {rem:6.1f}°', throttle_duration_sec=0.5)

    def on_result(self, future):
        res = future.result()
        self.get_logger().info(f'도착! 상태={res.status}, 회전량={math.degrees(res.result.delta):.1f}°')
        self.next_goal()                          # 다음 목표로 이어 가기


def main():
    rclpy.init()
    node = AsyncRotator()
    node.ac.wait_for_server()
    node.next_goal()
    rclpy.spin(node)


if __name__ == '__main__':
    main()</code></pre>
<div class="box tip"><div class="box-t">💡 취소하려면</div>
goal_handle 을 저장해 두었다가 <code>goal_handle.cancel_goal_async()</code> 를 부릅니다. 터미널에서 보낸 목표는 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 취소 요청이 갑니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: '파라미터를 코드에서 다루기',
      html: `
<p><a href="#ch06">6장</a>에서는 <code>ros2 param</code> 명령과 YAML 로 파라미터를 바꿨습니다. 노드 코드 쪽에서는 세 가지만 알면 됩니다.</p>
<div class="cards c3">
  <div class="card blue"><div class="ci">📝</div><b>declare_parameter(이름, 기본값)</b><p>이 노드가 쓰는 파라미터를 <b>선언</b>. 선언 안 된 이름은 get/set 할 수 없습니다. 기본값의 타입이 파라미터 타입이 됩니다.</p></div>
  <div class="card green"><div class="ci">🔍</div><b>get_parameter(이름).value</b><p>현재 값 읽기. 타이머 콜백에서 매번 읽으면 실행 중 변경이 바로 반영됩니다.</p></div>
  <div class="card orange"><div class="ci">🛡️</div><b>add_on_set_parameters_callback(cb)</b><p>바꾸기 <b>전에</b> 검사. <code>SetParametersResult(successful=…)</code> 를 반환해 받아들이거나 거절합니다.</p></div>
</div>
{{fig:paramCb}}
<div class="box practice"><div class="box-t">🧪 해 보기 — 허용 범위 검사</div>
<ol>
  <li>실습기를 <b>▶ 실행</b>합니다. 2초마다 <code>webbot: 최대 속도 0.5 m/s</code> 가 찍힙니다.</li>
  <li>터미널에서 <code>ros2 param list /param_demo</code> 로 선언된 파라미터를 봅니다.</li>
  <li><code>ros2 param set /param_demo max_speed 1.5</code> → 성공, 로그 값이 바뀝니다.</li>
  <li><code>ros2 param set /param_demo max_speed 3.0</code> → 콜백이 거절합니다(<code>Setting parameter failed: max_speed 는 2.0 이하만 가능</code>).</li>
</ol></div>
{{widget:pylab|ex=params|with=term}}

<p>파라미터로 거북이 원 크기를 실행 중에 바꾸는 예제입니다. <code>ParameterDescriptor</code> 로 설명을 붙이면 <code>ros2 param describe</code> 에 표시됩니다.</p>
<pre class="code" data-lang="python" data-run="py" data-with="turtlesim"><code>import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from rcl_interfaces.msg import ParameterDescriptor, SetParametersResult


class TunableCircle(Node):
    def __init__(self):
        super().__init__('tunable_circle')
        self.declare_parameter('linear_speed', 2.0,
                               ParameterDescriptor(description='앞으로 가는 속도 (m/s)'))
        self.declare_parameter('radius', 2.0,
                               ParameterDescriptor(description='원의 반지름 (m), 0 보다 커야 함'))
        self.add_on_set_parameters_callback(self.on_params)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(0.1, self.drive)

    def on_params(self, params):
        for p in params:
            if p.name == 'radius' and p.value &lt;= 0.0:
                return SetParametersResult(successful=False, reason='radius 는 0 보다 커야 합니다')
        return SetParametersResult(successful=True)

    def drive(self):
        v = self.get_parameter('linear_speed').value
        r = self.get_parameter('radius').value
        msg = Twist()
        msg.linear.x = float(v)
        msg.angular.z = float(v / r)          # ω = v / r
        self.pub.publish(msg)


def main():
    rclpy.init()
    rclpy.spin(TunableCircle())


if __name__ == '__main__':
    main()</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param describe /tunable_circle radius
ros2 param set /tunable_circle radius 1.0
ros2 param set /tunable_circle radius 0.0</code></pre>
<div class="box warn"><div class="box-t">⚠ 타입을 지키세요</div>
기본값을 <code>2.0</code>(double)으로 선언했다면 <code>ros2 param set /tunable_circle radius 3</code> 처럼 정수를 넣으면 실제 ROS 2 는 타입이 다르다며 거절합니다. <code>3.0</code> 으로 쓰세요. 또, 파라미터 콜백 안에서는 <b>검사만</b> 하고 다른 파라미터를 바꾸거나 오래 걸리는 일을 하지 않는 것이 규칙입니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: 'rclcpp — 같은 talker 를 C++ 로',
      html: `
<p>ROS 2 의 드라이버 · 제어기 · Nav2 · MoveIt 같은 핵심 패키지는 대부분 <b>C++(rclcpp)</b>로 쓰여 있습니다. 코드를 직접 쓰지 않더라도 <b>읽을 수는</b> 있어야 합니다. 다행히 구조는 rclpy 와 거의 똑같습니다.</p>
{{fig:clientLibs}}
<p>공식 튜토리얼(Jazzy)의 C++ 퍼블리셔입니다. 8장의 파이썬 talker 와 한 줄씩 비교해 보세요.</p>
<pre class="code" data-lang="cpp"><code>#include &lt;chrono&gt;
#include &lt;memory&gt;
#include &lt;string&gt;

#include "rclcpp/rclcpp.hpp"
#include "std_msgs/msg/string.hpp"

using namespace std::chrono_literals;                       <span class="cm">// 500ms 같은 표기</span>

class MinimalPublisher : public rclcpp::Node                 <span class="cm">// class MinimalPublisher(Node)</span>
{
public:
  MinimalPublisher()
  : Node("minimal_publisher"), count_(0)                    <span class="cm">// super().__init__('minimal_publisher')</span>
  {
    publisher_ = this-&gt;create_publisher&lt;std_msgs::msg::String&gt;("topic", 10);
    auto timer_callback =
      [this]() -&gt; void {                                    <span class="cm">// 람다 = 이름 없는 함수</span>
        auto message = std_msgs::msg::String();
        message.data = "Hello, world! " + std::to_string(this-&gt;count_++);
        RCLCPP_INFO(this-&gt;get_logger(), "Publishing: '%s'", message.data.c_str());
        this-&gt;publisher_-&gt;publish(message);
      };
    timer_ = this-&gt;create_wall_timer(500ms, timer_callback); <span class="cm">// create_timer(0.5, …)</span>
  }

private:
  rclcpp::TimerBase::SharedPtr timer_;                       <span class="cm">// 멤버에 보관해야 살아 있음</span>
  rclcpp::Publisher&lt;std_msgs::msg::String&gt;::SharedPtr publisher_;
  size_t count_;
};

int main(int argc, char * argv[])
{
  rclcpp::init(argc, argv);                                  <span class="cm">// rclpy.init()</span>
  rclcpp::spin(std::make_shared&lt;MinimalPublisher&gt;());       <span class="cm">// rclpy.spin(node)</span>
  rclcpp::shutdown();
  return 0;
}</code></pre>
<table class="tbl cmp">
<thead><tr><th>rclpy (Python)</th><th>rclcpp (C++)</th></tr></thead>
<tbody>
<tr><td><code>class X(Node)</code></td><td><code>class X : public rclcpp::Node</code></td></tr>
<tr><td><code>create_publisher(String, 'topic', 10)</code></td><td><code>create_publisher&lt;std_msgs::msg::String&gt;("topic", 10)</code> — 타입을 &lt;&gt; 안에</td></tr>
<tr><td><code>create_timer(0.5, cb)</code></td><td><code>create_wall_timer(500ms, cb)</code></td></tr>
<tr><td><code>self.get_logger().info(f'...')</code></td><td><code>RCLCPP_INFO(get_logger(), "...%s", s.c_str())</code> (printf 형식)</td></tr>
<tr><td>변수에 담기만 하면 됨</td><td><code>SharedPtr</code> 멤버로 보관 — 안 하면 타이머 · 구독이 바로 소멸</td></tr>
<tr><td><code>msg.data</code> 는 str</td><td><code>message.data</code> 는 <code>std::string</code></td></tr>
</tbody></table>

<h3>콜백 연결 — std::bind 와 람다</h3>
<p>서브스크라이버는 멤버 함수를 콜백으로 넘겨야 합니다. 옛 코드는 <code>std::bind</code>, 요즘 코드는 <b>람다</b>를 많이 씁니다. 둘 다 "이 객체(this)의 이 함수를 불러 줘"라는 뜻입니다.</p>
<pre class="code" data-lang="cpp"><code><span class="cm">// ① std::bind — _1 자리에 받은 메시지가 들어감</span>
using std::placeholders::_1;
subscription_ = this-&gt;create_subscription&lt;std_msgs::msg::String&gt;(
  "topic", 10, std::bind(&amp;MinimalSubscriber::topic_callback, this, _1));

<span class="cm">// ② 람다 — 같은 뜻, 더 짧고 읽기 쉬움</span>
subscription_ = this-&gt;create_subscription&lt;std_msgs::msg::String&gt;(
  "topic", 10,
  [this](const std_msgs::msg::String &amp; msg) {
    RCLCPP_INFO(this-&gt;get_logger(), "I heard: '%s'", msg.data.c_str());
  });</code></pre>
<p>C++ 노드와 파이썬 노드는 같은 토픽으로 자유롭게 대화합니다. 터미널에서 C++ talker 와 파이썬 listener 를 함께 띄워 확인해 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run demo_nodes_cpp talker &amp;
ros2 run demo_nodes_py listener</code></pre>
{{widget:lab|with=graph|title=C++ talker ↔ Python listener}}`
    },

    /* ================================================================ 8 */
    {
      title: 'C++ 패키지 설정 · Python 과 C++ 중 무엇을 고를까',
      html: `
<p>C++ 는 <b>컴파일</b>이 필요하므로 빌드 방법을 <b>CMakeLists.txt</b> 에 적습니다(빌드 타입 <code>ament_cmake</code>). 파이썬의 setup.py entry_points 에 해당하는 것이 <code>add_executable</code> + <code>install(TARGETS …)</code> 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_cmake --dependencies rclcpp std_msgs --node-name talker cpp_pubsub
cat cpp_pubsub/CMakeLists.txt</code></pre>
<pre class="code" data-lang="cmake"><code>cmake_minimum_required(VERSION 3.8)
project(cpp_pubsub)

find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

add_executable(talker src/talker.cpp)                  <span class="cm"># 실행 파일 = 소스 파일</span>
ament_target_dependencies(talker rclcpp std_msgs)      <span class="cm"># 헤더 · 라이브러리 연결</span>

install(TARGETS talker
  DESTINATION lib/\${PROJECT_NAME})                     <span class="cm"># ros2 run 이 찾는 위치</span>

ament_package()</code></pre>
<pre class="code" data-lang="xml"><code>&lt;buildtool_depend&gt;ament_cmake&lt;/buildtool_depend&gt;
&lt;depend&gt;rclcpp&lt;/depend&gt;
&lt;depend&gt;std_msgs&lt;/depend&gt;
&lt;export&gt;
  &lt;build_type&gt;ament_cmake&lt;/build_type&gt;
&lt;/export&gt;</code></pre>
<div class="box trend"><div class="box-t">🚀 최신 동향 — ament_target_dependencies 는 사라지는 중</div>
Kilted Kaiju(2025-05)부터 <code>ament_target_dependencies()</code> 는 사용 중단 예정(deprecated)입니다. 새 코드는 표준 CMake 방식으로 씁니다: <code>target_link_libraries(talker PUBLIC rclcpp::rclcpp \${std_msgs_TARGETS})</code>. Jazzy 에서는 두 방식 모두 동작합니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon build --packages-select cpp_pubsub
source install/setup.bash</code></pre>
<div class="box note"><div class="box-t">📝 브라우저 실습 환경의 한계</div>
이 사이트의 터미널은 C++ 컴파일을 <b>흉내만</b> 냅니다. 진짜 C++ 노드는 Ubuntu 24.04 + Jazzy 에서 <code>sudo apt install ros-jazzy-desktop</code> 후 빌드해 보세요. 빌드한 C++ 노드와 이 강좌의 파이썬 노드는 같은 방식으로 통신합니다.</div>

<h3>Python vs C++ — 언제 무엇을?</h3>
<div class="vs">
  <div class="vs-a teal"><b>🐍 Python (rclpy)</b><ul><li>코드가 짧고 빌드 없이 수정 (<code>--symlink-install</code>)</li><li>NumPy · OpenCV · PyTorch 등 AI · 데이터 도구</li><li>실험 · 프로토타입 · 테스트 · 런치 파일</li><li>느린 실행 속도, GIL 로 진짜 병렬 계산이 어려움</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b purple"><b>⚙️ C++ (rclcpp)</b><ul><li>빠르고 지연이 예측 가능 (실시간 제어)</li><li>하드웨어 드라이버 · ros2_control · Nav2 · MoveIt 플러그인</li><li>프로세스 내 통신 · 컴포넌트(제로 카피)</li><li>코드가 길고 컴파일 시간이 필요</li></ul></div>
</div>
<table class="tbl cmp">
<thead><tr><th>상황</th><th>추천</th></tr></thead>
<tbody>
<tr><td>처음 배우기 · 수업 과제 · 빠른 실험</td><td>Python</td></tr>
<tr><td>카메라 영상 AI 추론 (PyTorch, YOLO)</td><td>Python (무거운 계산은 라이브러리가 C/GPU 로 처리)</td></tr>
<tr><td>1 kHz 모터 제어 루프 · 하드웨어 인터페이스</td><td>C++</td></tr>
<tr><td>Nav2 · MoveIt · ros2_control 플러그인</td><td>C++ (플러그인 인터페이스가 C++)</td></tr>
<tr><td>대용량 점군 · 이미지 파이프라인</td><td>C++ 컴포넌트 (프로세스 내 통신)</td></tr>
</tbody></table>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점</div>
실제 프로젝트는 <b>섞어 씁니다</b>. 성능이 중요한 드라이버 · 제어는 C++, 상위 로직 · 미션 관리 · 테스트 · 런치 파일은 Python. 토픽 · 서비스 인터페이스만 맞추면 언어는 상관없다는 것이 ROS 의 큰 장점입니다.</div>`
    }
  ],

  videos: [
    { title: 'ROS2 Services in Python | ROS Developers Live Class #106', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=RRc0kv669BU', lang: 'en', desc: '서비스 서버 · 클라이언트를 파이썬으로 직접 작성하는 라이브 강의 — 1 · 2절 심화.' },
    { title: 'ROS2 Basics #13 - Writing a Simple Service and Client (Python)', channel: 'BotBuilder', url: 'https://www.youtube.com/watch?v=Qoa9kDBZnHs', lang: 'en', desc: '공식 AddTwoInts 서버 · 클라이언트를 한 줄씩 따라 작성합니다.' },
    { title: 'ROS2 Action Package', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=YQes7T5g-JU', lang: 'en', desc: '액션 인터페이스 정의부터 서버 · 클라이언트 실행까지 — 4 · 5절 복습.' },
    { title: '[ROS2 How-to] #2 - Create a ROS2 action server', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=ICpsNT3lhaU', lang: 'en', desc: '액션 서버의 execute_callback, 피드백, 결과 반환을 짧게 정리합니다.' },
    { title: 'ROS2 - rclcpp Parameter Callback Tutorial [C++]', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=xomIOpRKiJ0', lang: 'en', desc: '6절의 파라미터 콜백을 C++(rclcpp)로 — 7절의 Python ↔ C++ 비교 연습에 좋습니다.' },
    { title: 'ROS2 Tutorials #9: How to create a Simple Publisher with ROS2 (C++)', channel: 'The Construct', url: 'https://www.youtube.com/watch?v=RW8aZ_0D2UI', lang: 'en', desc: 'rclcpp 퍼블리셔와 CMakeLists.txt 설정 — 7 · 8절의 C++ 부분을 영상으로.' },
    { title: 'ROS 2 C++ Tutorial: Simple Publisher & Subscriber Explained!', channel: 'FusyBots', url: 'https://www.youtube.com/watch?v=ce2L4Y4a4zQ', lang: 'en', desc: 'C++ 퍼블리셔 · 서브스크라이버, std::bind 와 람다 콜백을 차근차근 설명합니다.' }
  ],

  terms: [
    ['create_service', '(서비스 타입, 이름, 콜백)으로 서비스 서버를 만드는 메서드. 콜백은 (request, response)를 받아 response 를 반환'],
    ['create_client', '(서비스 타입, 이름)으로 서비스 클라이언트를 만드는 메서드'],
    ['wait_for_service', '서버가 준비될 때까지 기다리는 클라이언트 메서드. timeout_sec 로 최대 대기 시간 지정'],
    ['call_async', '요청을 보내고 즉시 future 를 돌려주는 비동기 호출'],
    ['future', '아직 끝나지 않은 작업의 결과가 나중에 담길 객체. done() · result() · add_done_callback()'],
    ['spin_until_future_complete', 'future 가 완료될 때까지 실행기를 돌리는 함수. main 처럼 spin 밖에서 사용'],
    ['교착 상태(deadlock)', '서로가 서로를 기다려 아무도 진행하지 못하는 상태. 단일 스레드 콜백 안 동기 호출이 대표 원인'],
    ['ActionServer', 'rclpy.action 의 액션 서버 클래스. execute_callback(goal_handle) 에서 일을 하고 결과를 반환'],
    ['goal_handle', '목표 하나를 다루는 손잡이. request · publish_feedback() · succeed() · abort() · is_cancel_requested'],
    ['ActionClient', 'rclpy.action 의 액션 클라이언트. send_goal_async → goal_handle.get_result_async 순서로 사용'],
    ['SetParametersResult', '파라미터 콜백이 반환하는 메시지(rcl_interfaces/msg). successful 과 reason'],
    ['rclcpp', 'ROS Client Library for C++. C++ 로 노드를 만드는 공식 라이브러리'],
    ['create_wall_timer', 'rclcpp 의 타이머 생성 함수. 500ms 처럼 std::chrono 시간을 받음'],
    ['ament_cmake', 'C++ (그리고 인터페이스) 패키지의 빌드 타입. CMakeLists.txt 로 빌드 방법을 정의']
  ],

  summary: [
    '서비스 서버: <b>create_service(타입, 이름, cb)</b>, cb(request, response) 는 response 를 채워 <b>반드시 return</b>',
    '클라이언트: <b>create_client → wait_for_service → call_async</b>. main 에서는 spin_until_future_complete, 콜백 안에서는 <b>add_done_callback</b>',
    '단일 스레드 실행기에서 <b>콜백 안 동기 호출(call, spin_until_future_complete)은 교착 상태</b>를 부른다',
    '액션 서버: <b>execute_callback</b> 에서 publish_feedback → succeed → Result 반환. 클라이언트는 <b>goal future → result future</b> 두 단계',
    '파라미터: <b>declare_parameter → get_parameter().value</b>, 검사는 <b>add_on_set_parameters_callback</b> 이 SetParametersResult 로',
    'rclcpp 도 구조는 같다: Node 상속, create_publisher&lt;T&gt;, create_wall_timer, RCLCPP_INFO, 람다 · std::bind 콜백',
    'C++ 는 CMakeLists.txt(add_executable · install) + ament_cmake. <b>빠른 개발은 Python, 성능 · 드라이버는 C++</b>'
  ],

  quiz: [
    { q: '서비스 서버 콜백 <code>def cb(self, request, response)</code> 의 마지막 줄로 알맞은 것은?', options: ['return request', 'return response', 'self.publish(response)', '아무것도 반환하지 않는다'], answer: 1, explain: '채운 response 를 반환해야 클라이언트에게 전달됩니다. return 을 빠뜨리면 서버에서 오류가 나고 클라이언트는 응답을 받지 못합니다.' },
    { q: '<code>future = cli.call_async(req)</code> 직후의 상태로 옳은 것은?', options: ['응답이 이미 future 에 들어 있다', '요청을 보냈고, 응답은 나중에 future 에 담긴다', '서버가 없으면 즉시 예외가 난다', '요청이 아직 보내지지 않았다'], answer: 1, explain: 'call_async 는 기다리지 않고 바로 반환합니다. 실행기가 돌면서 응답을 받으면 future 가 완료(done)됩니다.' },
    { q: '기본 실행기로 spin 중인 노드의 <b>타이머 콜백 안에서</b> <code>client.call(req)</code> 를 부르면?', options: ['정상적으로 응답을 받는다', '교착 상태 — 응답을 처리할 실행기가 콜백 안에 막혀 있다', '자동으로 새 스레드가 생긴다', 'call 이 call_async 로 바뀐다'], answer: 1, explain: '단일 스레드 실행기는 콜백이 끝나야 다음 일(응답 처리)을 할 수 있습니다. call_async + add_done_callback 이나 멀티스레드 실행기 + 콜백 그룹 분리로 해결합니다.' },
    { q: '액션 서버의 execute_callback 에서 <b>중간 진행 상황</b>을 보내는 코드는?', options: ['goal_handle.succeed()', 'goal_handle.publish_feedback(fb)', 'return Fibonacci.Feedback()', 'self.publisher.publish(fb)'], answer: 1, explain: 'publish_feedback 은 여러 번 부를 수 있고, 클라이언트의 feedback_callback 으로 전달됩니다. succeed 는 마지막에 한 번, 결과는 return 으로.' },
    { q: '액션 클라이언트에서 <code>goal_handle.get_result_async()</code> 는 언제 불러야 할까?', options: ['send_goal_async 보다 먼저', '목표가 수락(accepted)된 뒤 goal_response 콜백에서', '피드백을 받을 때마다', '부를 필요 없다'], answer: 1, explain: 'send_goal_async 의 future 가 완료되면 goal_handle 을 얻고, accepted 인지 확인한 뒤 결과 future 를 요청합니다.' },
    { q: '파라미터 콜백에서 변경을 <b>거절</b>하려면?', options: ['예외를 발생시킨다', "return SetParametersResult(successful=False, reason='…')", 'self.undeclare_parameter(name)', 'return None'], answer: 1, explain: 'SetParametersResult 의 successful=False 와 reason 을 돌려주면 값은 유지되고 ros2 param set 에 실패 이유가 표시됩니다.' },
    { q: 'rclcpp 에서 타이머를 만든 뒤 <code>timer_</code> 멤버에 저장하지 않고 지역 변수로만 두면?', options: ['아무 문제 없다', '생성자가 끝날 때 SharedPtr 가 소멸해 타이머가 돌지 않는다', '타이머가 두 배 빨라진다', '컴파일 오류가 난다'], answer: 1, explain: 'C++ 에서는 반환된 SharedPtr 을 누군가 들고 있어야 객체가 살아 있습니다. 그래서 publisher_ · timer_ · subscription_ 을 멤버로 보관합니다.' }
  ],

  slides: [
    {
      title: '오늘의 세 가지',
      layout: 'center',
      html: `<div class="s-big">CLI 로 불러 보던 것을<br><b>코드로 만든다</b></div>
<div class="cards c3">
  <div class="card orange step"><div class="ci">🔁</div><b>서비스</b><p>묻고 답하기</p></div>
  <div class="card purple step"><div class="ci">🎯</div><b>액션</b><p>오래 걸리는 일</p></div>
  <div class="card teal step"><div class="ci">🎛️</div><b>파라미터</b><p>설정값</p></div>
</div>`,
      notes: '4 · 5 · 6장에서 ros2 service call, ros2 action send_goal, ros2 param set 을 써 본 기억을 떠올리게 합니다. 오늘은 그 반대편(서버)을 직접 만든다고 안내하세요. (3분)'
    },
    {
      title: '서비스 서버의 한 줄',
      html: `{{fig:srvFlow|nocap}}`,
      notes: '피자 주문서 비유: 빈 영수증(response)을 받아 채워서 돌려준다. return 누락이 가장 흔한 실수라는 점을 빨간 글씨로 강조합니다. (5분)'
    },
    {
      title: '서버 실습',
      html: `{{widget:pylab|ex=add_server|with=term}}`,
      notes: '실행 후 옆 터미널에서 ros2 service call 을 직접 타이핑하게 합니다. 이어서 return response 를 지워 보고 오류 메시지를 함께 읽습니다. (7분)'
    },
    {
      title: 'future = 택배 송장',
      layout: 'center',
      html: `<div class="s-big"><code>call_async</code> → 송장 번호(future)를 받고 바로 돌아옴</div>
<div class="s-points">
<p class="step">main 에서: <code>spin_until_future_complete</code></p>
<p class="step">콜백 안에서: <code>add_done_callback</code></p>
</div>`,
      notes: '택배를 주문하면 물건이 아니라 송장 번호를 먼저 받는다는 비유. 기다리는 방법이 두 가지(문 앞에서 기다리기 vs 도착 문자 받기)임을 연결합니다. (4분)'
    },
    {
      title: '클라이언트 실습',
      html: `{{widget:pylab|ex=add_client|with=term}}`,
      notes: '서버 없이 먼저 실행해 waiting 메시지를 보게 한 뒤 터미널에서 서버를 켭니다. wait_for_service 의 의미가 자연스럽게 전달됩니다. (5분)'
    },
    {
      title: '교착 상태',
      html: `{{fig:deadlock|nocap}}`,
      notes: '일꾼이 한 명뿐인데 그 일꾼이 "택배 오면 받을게" 하고 방 안에서 문을 잠그고 기다리는 상황. 11장에서 멀티스레드 실행기로 다시 다룬다고 예고합니다. (6분)'
    },
    {
      title: '액션의 대화',
      html: `{{fig:actionFlow|nocap}}`,
      notes: '①~⑤ 번호를 순서대로 짚습니다. 클라이언트에 future 가 두 개(수락, 결과)라는 점이 서비스와 가장 다른 부분입니다. (6분)'
    },
    {
      title: '액션 서버 실습',
      html: `{{widget:pylab|ex=fib_server|with=term}}`,
      notes: 'ros2 action send_goal ... --feedback 으로 피드백이 1초마다 오는 것을 확인합니다. succeed() 를 주석 처리하면 ABORTED 가 되는 것도 보여 주세요. (7분)'
    },
    {
      title: '거북이 회전 액션',
      html: `{{widget:pylab|ex=rotate|with=turtlesim}}`,
      notes: 'turtlesim 의 RotateAbsolute 액션으로 90 → 180 → -90 → 0 도를 차례로. 목표 각도를 바꿔 보게 하고 피드백 remaining 이 줄어드는 것을 관찰합니다. (5분)'
    },
    {
      title: '파라미터 검사',
      html: `{{fig:paramCb|nocap}}`,
      notes: '콜백이 문지기 역할을 한다는 비유. 1.5 는 통과, 3.0 은 거절되는 시연을 이어서 실습기로 보여 줍니다. (5분)'
    },
    {
      title: '파라미터 실습',
      html: `{{widget:pylab|ex=params|with=term}}`,
      notes: 'ros2 param list → set 1.5 → set 3.0 순서로 실행. 실패 메시지의 reason 문구가 코드에서 온 것임을 확인시킵니다. (5분)'
    },
    {
      title: 'Python ↔ C++',
      html: `{{fig:clientLibs|nocap}}`,
      notes: '두 언어가 같은 rcl · rmw 위에 있어서 서로 통신된다는 점이 핵심. demo_nodes_cpp talker 와 demo_nodes_py listener 를 함께 띄워 보여 주면 설득력이 큽니다. (5분)'
    },
    {
      title: 'C++ talker 읽기',
      html: `<table class="tbl cmp">
<thead><tr><th>Python</th><th>C++</th></tr></thead>
<tbody>
<tr class="step"><td>class X(Node)</td><td>class X : public rclcpp::Node</td></tr>
<tr class="step"><td>create_timer(0.5, cb)</td><td>create_wall_timer(500ms, cb)</td></tr>
<tr class="step"><td>get_logger().info()</td><td>RCLCPP_INFO(...)</td></tr>
<tr class="step"><td>변수에 담기</td><td>SharedPtr 멤버 보관</td></tr>
</tbody></table>`,
      notes: 'C++ 문법을 가르치는 시간이 아니라 "읽을 수 있게" 하는 시간입니다. 한 줄씩 공개하며 파이썬 대응 코드를 학생이 먼저 말하게 하세요. (6분)'
    },
    {
      title: '무엇을 고를까?',
      html: `<div class="vs">
  <div class="vs-a teal"><b>🐍 Python</b><ul><li>빠른 개발 · AI</li><li>실험 · 테스트 · 런치</li></ul></div>
  <div class="vs-mid">VS</div>
  <div class="vs-b purple"><b>⚙️ C++</b><ul><li>실시간 · 드라이버</li><li>Nav2 · MoveIt 플러그인</li></ul></div>
</div>`,
      notes: '정답은 "섞어 쓴다". 인터페이스(토픽 · 서비스 타입)만 맞으면 언어는 자유라는 ROS 의 설계 철학으로 마무리합니다. (4분)'
    }
  ]
});
