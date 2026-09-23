/* 14장 — ROS 2 도구 모음 */
(function () {
  const X = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const ROSLIB_JS = `<script src="https://cdn.jsdelivr.net/npm/roslib@1/build/roslib.min.js"></script>
<script>
  const ros = new ROSLIB.Ros({ url: 'ws://192.168.0.10:9090' });   // 로봇 PC 주소
  ros.on('connection', () => console.log('rosbridge 연결됨'));
  ros.on('error', e => console.log('연결 오류', e));

  // 구독: 거북이 위치
  const pose = new ROSLIB.Topic({ ros, name: '/turtle1/pose', messageType: 'turtlesim/msg/Pose' });
  pose.subscribe(m => { document.title = 'x=' + m.x.toFixed(2); });

  // 발행: 앞으로 가며 돌기
  const cmd = new ROSLIB.Topic({ ros, name: '/turtle1/cmd_vel', messageType: 'geometry_msgs/msg/Twist' });
  cmd.publish({ linear: { x: 1.0, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0.5 } });
</script>`;

  const CONVERT_YAML = `output_bags:
- uri: turtle_pose_sqlite       # 새로 만들 bag 폴더
  storage_id: sqlite3           # mcap 또는 sqlite3
  topics: [/turtle1/pose]       # 옮길 토픽만 골라 담기`;

  Course.lesson({
    id: 'ch14', no: '14',
    icon: '🧰',
    title: 'ROS 2 도구 모음',
    subtitle: '보고, 기록하고, 다시 틀고, 진단하기',
    level: '중급', time: '120분',
    goals: [
      'rqt 플러그인(rqt_graph · rqt_plot · rqt_console · rqt_topic · rqt_reconfigure · rqt_service_caller)을 상황에 맞게 골라 쓸 수 있다',
      'ros2 bag 으로 토픽을 녹화 · 정보 확인 · 재생(-r · --loop)하고 MCAP 저장 형식과 변환 방법을 설명할 수 있다',
      'Foxglove · PlotJuggler · Rerun 같은 외부 시각화 도구와 rosbridge + roslibjs 웹 연결의 구조를 설명할 수 있다',
      'ros2 doctor · ros2 topic hz/bw/delay · 로그 수준 설정으로 문제를 진단할 수 있다'
    ],
    teacher: {
      intro: '“어제 로봇이 이상하게 움직였는데 오늘은 멀쩡합니다. 어떻게 원인을 찾을까요?” 하고 묻습니다. ‘그때 데이터를 기록해 뒀다면 다시 틀어 볼 수 있다’는 답을 끌어내며 rosbag 과 도구들의 필요성을 소개합니다. (3분)',
      flow: '① 도구 지도 10분 → ② rqt 가족 + turtlesim 실습 20분 → ③ rqt_plot · rqt_console · 로그 15분 → ④ rosbag2 녹화 · 재생 25분 → ⑤ Foxglove · PlotJuggler · Rerun 10분 → ⑥ rosbridge · 웹 연결 15분 → ⑦ ros2 doctor · 진단 명령 10분 → ⑧ 비교표 · 퀴즈 15분'
    },

    figs: {
      /* ---------------------------------------------------------------- 도구 지도 */
      toolMap: {
        caption: 'ROS 2 도구 지도 — 가로축은 “지금 흐르는 데이터 / 기록된 데이터”, 세로축은 “명령줄 / 화면(GUI)”',
        svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="ROS 2 도구를 실시간/기록, 명령줄/GUI 로 나눈 지도">
  <line x1="80" y1="190" x2="840" y2="190" class="ln thin ar2"/>
  <line x1="460" y1="30" x2="460" y2="360" class="ln thin ar2"/>
  <text x="90" y="180" class="t-xs t-mu">실시간 (live)</text>
  <text x="830" y="180" class="t-xs t-mu t-e">기록 (bag)</text>
  <text x="470" y="42" class="t-xs t-mu">GUI · 시각화</text>
  <text x="470" y="352" class="t-xs t-mu">명령줄 (CLI)</text>
  <rect x="90" y="56" width="140" height="36" rx="18" class="blue"/><text x="160" y="74" class="t-sm t-c t-blue t-b">rqt_graph</text>
  <rect x="250" y="56" width="120" height="36" rx="18" class="blue"/><text x="310" y="74" class="t-sm t-c t-blue t-b">rqt_plot</text>
  <rect x="90" y="106" width="140" height="36" rx="18" class="blue"/><text x="160" y="124" class="t-sm t-c t-blue t-b">rqt_console</text>
  <rect x="250" y="106" width="120" height="36" rx="18" class="purple"/><text x="310" y="124" class="t-sm t-c t-purple t-b">RViz2</text>
  <rect x="380" y="130" width="170" height="36" rx="18" class="orange"/><text x="465" y="148" class="t-sm t-c t-orange t-b">Foxglove</text>
  <rect x="560" y="80" width="170" height="36" rx="18" class="orange"/><text x="645" y="98" class="t-sm t-c t-orange t-b">PlotJuggler</text>
  <rect x="660" y="130" width="130" height="36" rx="18" class="orange"/><text x="725" y="148" class="t-sm t-c t-orange t-b">Rerun</text>
  <rect x="390" y="80" width="140" height="36" rx="18" class="teal"/><text x="460" y="98" class="t-sm t-c t-teal t-b">rosbridge</text>
  <rect x="90" y="220" width="170" height="36" rx="18" class="green"/><text x="175" y="238" class="t-sm t-c t-green t-b">ros2 topic hz/bw</text>
  <rect x="90" y="270" width="170" height="36" rx="18" class="green"/><text x="175" y="288" class="t-sm t-c t-green t-b">ros2 doctor</text>
  <rect x="280" y="220" width="150" height="36" rx="18" class="green"/><text x="355" y="238" class="t-sm t-c t-green t-b">ros2 topic echo</text>
  <rect x="560" y="220" width="200" height="36" rx="18" class="red"/><text x="660" y="238" class="t-sm t-c t-red t-b">ros2 bag record</text>
  <rect x="560" y="270" width="200" height="36" rx="18" class="red"/><text x="660" y="288" class="t-sm t-c t-red t-b">ros2 bag play · info</text>
  <text x="660" y="326" class="t-xs t-c t-mu">bag 을 재생하면 왼쪽 도구를 모두 다시 쓸 수 있음</text>
</svg>`
      },

      /* ---------------------------------------------------------------- rqt 가족 */
      rqtFamily: {
        caption: 'rqt = 플러그인을 담는 창. rqt_graph · rqt_plot 같은 도구는 각각 독립 실행도 되고, rqt 창 안에 여러 개를 배치할 수도 있습니다',
        svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="rqt 창 안의 플러그인들">
  <rect x="20" y="16" width="840" height="298" rx="14" class="box"/>
  <rect x="20" y="16" width="840" height="36" rx="14" class="gray"/>
  <text x="40" y="35" class="t-sm t-b">rqt</text>
  <text x="90" y="35" class="t-xs t-mu">File · Plugins ▾ (Introspection · Visualization · Logging · Topics · Services · Configuration) · Running · Perspectives</text>
  <rect x="40" y="66" width="250" height="110" rx="10" class="blue"/>
  <text x="165" y="90" class="t-sm t-c t-blue t-b">Node Graph</text>
  <text x="165" y="110" class="t-xs t-c t-mono">rqt_graph</text>
  <ellipse cx="100" cy="145" rx="38" ry="16" class="blue"/><rect x="150" y="133" width="50" height="24" rx="4" class="green"/><ellipse cx="245" cy="145" rx="34" ry="16" class="blue"/>
  <line x1="138" y1="145" x2="148" y2="145" class="ln ar"/><line x1="200" y1="145" x2="209" y2="145" class="ln ar"/>
  <rect x="310" y="66" width="250" height="110" rx="10" class="teal"/>
  <text x="435" y="90" class="t-sm t-c t-teal t-b">Plot</text>
  <text x="435" y="110" class="t-xs t-c t-mono">rqt_plot</text>
  <path d="M330,160 C360,120 390,165 420,130 C450,100 480,160 540,125" class="ln-teal thick"/>
  <rect x="580" y="66" width="260" height="110" rx="10" class="orange"/>
  <text x="710" y="90" class="t-sm t-c t-orange t-b">Console</text>
  <text x="710" y="110" class="t-xs t-c t-mono">rqt_console</text>
  <text x="600" y="136" class="t-xs t-mono">[INFO] turtlesim: Spawning…</text>
  <text x="600" y="156" class="t-xs t-mono t-red">[WARN] Oh no! I hit the wall!</text>
  <rect x="40" y="190" width="250" height="110" rx="10" class="green"/>
  <text x="165" y="214" class="t-sm t-c t-green t-b">Topic Monitor</text>
  <text x="165" y="234" class="t-xs t-c t-mono">rqt_topic</text>
  <text x="165" y="264" class="t-xs t-c">토픽 · 타입 · Hz · 대역폭 · 값</text>
  <rect x="310" y="190" width="250" height="110" rx="10" class="purple"/>
  <text x="435" y="214" class="t-sm t-c t-purple t-b">Dynamic Reconfigure</text>
  <text x="435" y="234" class="t-xs t-c t-mono">rqt_reconfigure</text>
  <text x="435" y="264" class="t-xs t-c">파라미터를 슬라이더 · 칸으로</text>
  <rect x="580" y="190" width="260" height="110" rx="10" class="yellow"/>
  <text x="710" y="214" class="t-sm t-c t-b">Service Caller</text>
  <text x="710" y="234" class="t-xs t-c t-mono">rqt_service_caller</text>
  <text x="710" y="264" class="t-xs t-c">요청 칸을 채워 서비스 호출</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 로그 흐름 */
      logFlow: {
        caption: '로그가 가는 길 — 노드의 로그는 화면(콘솔), 파일(~/.ros/log), /rosout 토픽 세 곳으로 갑니다',
        svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="노드 로그가 콘솔, 로그 파일, rosout 토픽으로 가는 흐름">
  <ellipse cx="140" cy="140" rx="110" ry="36" class="blue"/>
  <text x="140" y="132" class="t-sm t-c t-b t-blue">내 노드</text>
  <text x="140" y="152" class="t-xs t-c t-mono">get_logger().warn(…)</text>
  <rect x="330" y="30" width="200" height="50" rx="10" class="gray"/>
  <text x="430" y="50" class="t-sm t-c t-b">터미널 화면</text>
  <text x="430" y="68" class="t-xs t-c t-mono">RCUTILS_CONSOLE_OUTPUT_FORMAT</text>
  <rect x="330" y="115" width="200" height="50" rx="10" class="gray"/>
  <text x="430" y="135" class="t-sm t-c t-b">로그 파일</text>
  <text x="430" y="153" class="t-xs t-c t-mono">~/.ros/log/</text>
  <rect x="330" y="200" width="200" height="50" rx="6" class="green"/>
  <text x="430" y="220" class="t-sm t-c t-b t-green">/rosout</text>
  <text x="430" y="238" class="t-xs t-c">rcl_interfaces/msg/Log</text>
  <line x1="236" y1="120" x2="326" y2="60" class="ln ar"/>
  <line x1="250" y1="140" x2="326" y2="140" class="ln ar"/>
  <line x1="236" y1="160" x2="326" y2="222" class="ln ar moving"/>
  <ellipse cx="720" cy="225" rx="110" ry="32" class="blue"/>
  <text x="720" y="225" class="t-sm t-c t-b t-blue">rqt_console</text>
  <line x1="532" y1="225" x2="606" y2="225" class="ln ar moving"/>
  <rect x="600" y="40" width="250" height="120" rx="12" class="orange"/>
  <text x="725" y="64" class="t-sm t-c t-orange t-b">심각도(severity)</text>
  <text x="725" y="90" class="t-xs t-c t-mono">DEBUG &lt; INFO &lt; WARN</text>
  <text x="725" y="110" class="t-xs t-c t-mono">&lt; ERROR &lt; FATAL</text>
  <text x="725" y="138" class="t-xs t-c">--log-level 보다 낮으면 버림</text>
</svg>`
      },

      /* ---------------------------------------------------------------- rosbag2 */
      bagFlow: {
        caption: 'rosbag2 — 녹화기는 토픽을 구독해 파일에 쓰고, 재생기는 파일을 읽어 같은 토픽으로 다시 발행합니다',
        svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="ros2 bag record 와 play 의 흐름과 bag 폴더 구조">
  <ellipse cx="110" cy="70" rx="90" ry="28" class="blue"/><text x="110" y="70" class="t-sm t-c t-b t-blue">/turtlesim</text>
  <rect x="230" y="30" width="150" height="34" rx="6" class="green"/><text x="305" y="47" class="t-sm t-c t-green t-b">/turtle1/pose</text>
  <rect x="230" y="78" width="150" height="34" rx="6" class="green"/><text x="305" y="95" class="t-sm t-c t-green t-b">/turtle1/cmd_vel</text>
  <line x1="196" y1="62" x2="226" y2="50" class="ln ar"/>
  <ellipse cx="500" cy="70" rx="95" ry="28" class="red"/><text x="500" y="70" class="t-sm t-c t-b t-red">● recorder</text>
  <line x1="382" y1="47" x2="412" y2="60" class="ln ar moving"/>
  <line x1="382" y1="95" x2="412" y2="80" class="ln ar moving"/>
  <rect x="640" y="20" width="220" height="150" rx="12" class="yellow"/>
  <text x="750" y="44" class="t-sm t-c t-b">📁 turtle_run/</text>
  <text x="660" y="74" class="t-xs t-mono">metadata.yaml</text>
  <text x="660" y="94" class="t-xs t-mono">turtle_run_0.mcap</text>
  <text x="660" y="124" class="t-xs t-mu">토픽 · 타입 · 개수 · 시각</text>
  <text x="660" y="144" class="t-xs t-mu">메시지는 CDR 직렬화 그대로</text>
  <line x1="596" y1="70" x2="636" y2="70" class="ln ar"/>
  <ellipse cx="500" cy="250" rx="95" ry="28" class="teal"/><text x="500" y="250" class="t-sm t-c t-b t-teal">▶ player</text>
  <path d="M750,172 C750,240 650,250 598,250" class="ln ar"/>
  <rect x="230" y="232" width="150" height="34" rx="6" class="green"/><text x="305" y="249" class="t-sm t-c t-green t-b">/turtle1/pose</text>
  <line x1="404" y1="250" x2="384" y2="250" class="ln ar moving"/>
  <ellipse cx="110" cy="250" rx="90" ry="28" class="blue"/><text x="110" y="250" class="t-sm t-c t-b t-blue">rqt_plot · RViz</text>
  <line x1="228" y1="250" x2="202" y2="250" class="ln ar"/>
  <text x="440" y="310" class="t-xs t-c t-mu">-r 2 (2배속) · --loop (반복) · --topics (골라 재생) · --clock (시뮬레이션 시각 발행)</text>
</svg>`
      },

      /* ---------------------------------------------------------------- 웹 연결 */
      bridgeArch: {
        caption: '로봇 PC 의 ROS 2 그래프를 웹으로 — rosbridge(JSON, 9090) 와 foxglove_bridge(8765) 는 DDS 와 WebSocket 사이의 통역사입니다',
        svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="ROS 2 노드, rosbridge_server, foxglove_bridge, 브라우저의 연결">
  <rect x="20" y="20" width="400" height="300" rx="16" class="box"/>
  <text x="220" y="46" class="t-b t-c">🤖 로봇 PC (ROS 2 · DDS)</text>
  <ellipse cx="110" cy="100" rx="70" ry="26" class="blue"/><text x="110" y="100" class="t-sm t-c t-b t-blue">turtlesim</text>
  <ellipse cx="110" cy="170" rx="70" ry="26" class="blue"/><text x="110" y="170" class="t-sm t-c t-b t-blue">nav2</text>
  <ellipse cx="110" cy="240" rx="70" ry="26" class="blue"/><text x="110" y="240" class="t-sm t-c t-b t-blue">camera</text>
  <ellipse cx="320" cy="120" rx="88" ry="30" class="teal"/><text x="320" y="114" class="t-sm t-c t-b t-teal">rosbridge_server</text><text x="320" y="132" class="t-xs t-c">ws :9090 (JSON)</text>
  <ellipse cx="320" cy="230" rx="88" ry="30" class="orange"/><text x="320" y="224" class="t-sm t-c t-b t-orange">foxglove_bridge</text><text x="320" y="242" class="t-xs t-c">ws :8765 (CDR)</text>
  <line x1="180" y1="104" x2="230" y2="116" class="ln ar2"/>
  <line x1="180" y1="166" x2="232" y2="130" class="ln ar2"/>
  <line x1="180" y1="176" x2="234" y2="220" class="ln ar2"/>
  <line x1="180" y1="240" x2="232" y2="234" class="ln ar2"/>
  <rect x="520" y="40" width="340" height="140" rx="16" class="teal"/>
  <text x="690" y="66" class="t-b t-c t-teal">🌐 웹 브라우저</text>
  <text x="690" y="96" class="t-sm t-c">roslibjs 로 만든 대시보드</text>
  <text x="690" y="120" class="t-sm t-c">이 강좌 페이지 (bridge 위젯)</text>
  <text x="690" y="150" class="t-xs t-c t-mono">new ROSLIB.Ros({url:'ws://…:9090'})</text>
  <rect x="520" y="210" width="340" height="100" rx="16" class="orange"/>
  <text x="690" y="238" class="t-b t-c t-orange">🦊 Foxglove 앱</text>
  <text x="690" y="266" class="t-sm t-c">3D · 영상 · 그래프 · 로그 패널</text>
  <text x="690" y="290" class="t-xs t-c t-mono">Open connection → ws://…:8765</text>
  <line x1="410" y1="120" x2="516" y2="110" class="ln-teal thick ar2 moving"/>
  <line x1="410" y1="230" x2="516" y2="258" class="ln-orange thick ar2 moving"/>
  <text x="465" y="100" class="t-xs t-c t-mu">WebSocket</text>
</svg>`
      }
    },

    sections: [
      /* ============================================================ 1 */
      {
        title: '도구 지도 — 무엇을 언제 쓸까?',
        html: `<p>지금까지 <code>ros2 topic echo</code> 처럼 명령줄 도구를 주로 썼습니다. 하지만 로봇이 커지면 “노드가 어떻게 연결됐지?”, “속도가 왜 튀지?”, “어제 그 순간을 다시 보고 싶다” 같은 질문이 생깁니다. ROS 2 에는 이런 질문마다 알맞은 도구가 있습니다.</p>
{{fig:toolMap}}
<div class="cards c4">
<div class="card blue"><div class="ci">🕸️</div><b>보기 (rqt)</b><p>연결 · 숫자 · 로그 · 파라미터를 창으로</p></div>
<div class="card red"><div class="ci">🎞️</div><b>기록 (rosbag2)</b><p>토픽을 파일로 녹화하고 다시 재생</p></div>
<div class="card orange"><div class="ci">🦊</div><b>외부 시각화</b><p>Foxglove · PlotJuggler · Rerun</p></div>
<div class="card green"><div class="ci">🩺</div><b>진단 (CLI)</b><p>ros2 doctor · topic hz/bw/delay · 로그 수준</p></div>
</div>
<div class="box analogy"><div class="box-t">🍳 비유 — 자동차 정비소</div>rqt_graph 는 배선도, rqt_plot 은 계기판, rqt_console 은 경고등 기록, rosbag 은 블랙박스, ros2 doctor 는 종합 점검기입니다. 정비사가 증상에 따라 도구를 고르듯, 우리도 질문에 따라 도구를 고릅니다.</div>`
      },

      /* ============================================================ 2 */
      {
        title: 'rqt 가족 — 플러그인 창 모음',
        html: `<p><b>rqt</b> 는 Qt 기반 GUI 틀이고, 실제 기능은 <b>플러그인</b>이 합니다. 각 플러그인은 <code>rqt_graph</code> 처럼 따로 실행할 수도 있고, <code>rqt</code> 를 켠 뒤 <b>Plugins</b> 메뉴에서 골라 한 창에 여러 개를 배치할 수도 있습니다(배치는 Perspective 로 저장).</p>
{{fig:rqtFamily}}
<div class="box note"><div class="box-t">📝 이 장의 실습 전제</div>이 페이지에서는 실습 창의 <b>turtlesim 이 처음부터 켜져 있습니다</b>. 그래서 아래 코드 블록에는 turtlesim 을 켜는 줄을 뺐습니다. 실제 PC 에서는 먼저 다른 터미널에서 <code>ros2 run turtlesim turtlesim_node</code> 를 실행해 두세요. (한 그래프에 turtlesim 을 두 개 켜면 /turtle1 토픽이 겹쳐 거북이가 이상하게 움직입니다)</div>
<table class="tbl">
<tr><th>플러그인</th><th>실행</th><th>이럴 때</th></tr>
<tr><td>Node Graph</td><td><code>rqt_graph</code></td><td>노드와 토픽이 제대로 연결됐는지 (리매핑 · 네임스페이스 확인)</td></tr>
<tr><td>Plot</td><td><code>rqt_plot /turtle1/pose/x</code></td><td>숫자 필드의 변화를 시간 그래프로</td></tr>
<tr><td>Console</td><td><code>ros2 run rqt_console rqt_console</code></td><td>여러 노드의 로그를 모아 심각도 · 노드별로 거르기</td></tr>
<tr><td>Topic Monitor</td><td><code>ros2 run rqt_topic rqt_topic</code></td><td>토픽 목록 · 주기 · 대역폭 · 마지막 값을 표로</td></tr>
<tr><td>Dynamic Reconfigure</td><td><code>ros2 run rqt_reconfigure rqt_reconfigure</code></td><td>실행 중인 노드의 파라미터를 바로 바꿔 보기</td></tr>
<tr><td>Service Caller</td><td><code>ros2 run rqt_service_caller rqt_service_caller</code></td><td>서비스 요청 칸을 채워 호출 (YAML 입력 없이)</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>rqt_graph &amp;
rqt &amp;
ros2 run turtlesim turtle_teleop_key</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — turtlesim + rqt_graph</div><ol class="steps-list">
<li>turtlesim 은 실습 창에 이미 켜져 있습니다. 터미널에서 <code>ros2 run turtlesim turtle_teleop_key</code> 를 실행해(또는 화면의 방향 버튼으로) 거북이를 움직입니다.</li>
<li>오른쪽 rqt_graph 에서 <code>/teleop_turtle → /turtle1/cmd_vel → /turtlesim</code> 연결을 찾습니다.</li>
<li><code>ros2 run rqt_reconfigure rqt_reconfigure</code> 로 <code>background_r</code> 을 바꿔 배경색을 바꿔 봅니다.</li>
<li><code>ros2 run rqt_service_caller rqt_service_caller</code> 로 <code>/spawn</code> 을 호출해 거북이를 하나 더 만듭니다.</li></ol></div>
{{widget:lab|with=turtlesim,graph|title=rqt 실습 — 터미널 + turtlesim + rqt_graph}}`
      },

      /* ============================================================ 3 */
      {
        title: 'rqt_plot · rqt_console 과 로그 다루기',
        html: `<p><b>rqt_plot</b> 은 숫자 필드를 <code>/토픽/필드/하위필드</code> 경로로 지정합니다. 여러 개를 공백으로 나열하면 한 그래프에 겹쳐 그립니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub -r 1 /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: 1.8}}" &amp;
rqt_plot /turtle1/pose/x /turtle1/pose/y</code></pre>
<p>원을 그리는 거북이의 x · y 가 서로 90° 어긋난 사인파로 보이면 성공입니다. 이번에는 로그를 봅시다. 거북이를 벽에 부딪히게 하면 turtlesim 이 <code>[WARN] Oh no! I hit the wall!</code> 을 남깁니다.</p>
{{fig:logFlow}}
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run rqt_console rqt_console &amp;
ros2 topic pub --once /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 20.0}}"
ros2 run demo_nodes_py talker --ros-args --log-level debug</code></pre>
<h4>로그 수준과 출력 모양 바꾸기</h4>
<table class="tbl">
<tr><th>방법</th><th>예</th><th>효과</th></tr>
<tr><td>노드 실행 시 수준</td><td><code>--ros-args --log-level debug</code></td><td>이 노드의 DEBUG 까지 보임</td></tr>
<tr><td>특정 로거만</td><td><code>--ros-args --log-level talker:=debug</code></td><td>이름이 talker 인 로거만 DEBUG</td></tr>
<tr><td>출력 형식</td><td><code>export RCUTILS_CONSOLE_OUTPUT_FORMAT="[{severity}] [{time}] [{name}]: {message}"</code></td><td>시각 · 파일 · 줄번호(<code>{file_name}</code> <code>{line_number}</code>) 추가</td></tr>
<tr><td>색</td><td><code>export RCUTILS_COLORIZED_OUTPUT=1</code></td><td>WARN 노랑 · ERROR 빨강 (파이프로 넘길 때도 색 유지)</td></tr>
<tr><td>로그 파일 위치</td><td><code>export ROS_LOG_DIR=~/my_logs</code></td><td>기본 <code>~/.ros/log/</code></td></tr>
</table>
<div class="box tip"><div class="box-t">💡 코드에서 로그 줄이기</div>1초에 100번 도는 콜백에서 로그를 찍으면 화면이 넘칩니다. rclpy 는 <code>self.get_logger().warn('…', throttle_duration_sec=1.0)</code>(1초에 한 번), <code>once=True</code>(한 번만), <code>skip_first=True</code> 옵션을 제공합니다.</div>`
      },

      /* ============================================================ 4 */
      {
        title: 'rosbag2 — 녹화하고 다시 틀기',
        html: `<p><b>rosbag2</b>(<code>ros2 bag</code>)는 토픽 메시지를 시각과 함께 파일에 저장했다가 똑같은 타이밍으로 다시 발행합니다. 실제 로봇에서 한 번 녹화해 두면, 로봇 없이 책상에서 알고리즘을 몇 번이고 시험할 수 있습니다.</p>
{{fig:bagFlow}}
<table class="tbl">
<tr><th>명령</th><th>뜻</th></tr>
<tr><td><code>ros2 bag record -a</code></td><td>모든 토픽 녹화 (이름은 <code>rosbag2_날짜-시각</code>)</td></tr>
<tr><td><code>ros2 bag record -o turtle_run /turtle1/pose /turtle1/cmd_vel</code></td><td>이름(-o)을 정하고 고른 토픽만</td></tr>
<tr><td><code>ros2 bag info turtle_run</code></td><td>길이 · 메시지 수 · 토픽 · 저장 형식</td></tr>
<tr><td><code>ros2 bag play turtle_run -r 2</code></td><td>2배속 재생 (<code>--rate</code>)</td></tr>
<tr><td><code>ros2 bag play turtle_run --loop</code></td><td>끝나면 처음부터 반복</td></tr>
<tr><td><code>ros2 bag play turtle_run --topics /turtle1/pose</code></td><td>골라서 재생</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic pub -r 1 /turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 1.5}, angular: {z: 1.0}}" &amp;
ros2 bag record -o turtle_run /turtle1/cmd_vel /turtle1/pose</code></pre>
<p>10초쯤 녹화한 뒤 <kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈추고 정보를 봅니다. 그다음 거북이를 리셋하고 cmd_vel 만 다시 틀면 거북이가 같은 길을 다시 그립니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 bag info turtle_run
ros2 service call /reset std_srvs/srv/Empty
ros2 bag play turtle_run --topics /turtle1/cmd_vel</code></pre>
<pre class="code out" data-lang="출력"><code>Files:             turtle_run_0.mcap
Bag size:          24.3 KiB
Storage id:        mcap
Duration:          10.012s
Messages:          636
Topic information: Topic: /turtle1/cmd_vel | Type: geometry_msgs/msg/Twist | Count: 10 | Serialization Format: cdr
                   Topic: /turtle1/pose | Type: turtlesim/msg/Pose | Count: 626 | Serialization Format: cdr</code></pre>
<h4>저장 형식 — MCAP 과 SQLite3</h4>
<div class="vs"><div class="vs-a blue"><b>MCAP (<code>mcap</code>)</b><ul><li><b>Iron 부터 기본값</b> (Jazzy 도 기본)</li><li>로봇 로그용 파일 형식 · 빠른 쓰기 · 파일 하나에 스키마 포함</li><li>Foxglove · PlotJuggler 에서 바로 열림</li></ul></div><div class="vs-mid">VS</div><div class="vs-b gray"><b>SQLite3 (<code>sqlite3</code>)</b><ul><li>Humble 까지의 기본값 (<code>.db3</code>)</li><li>SQL 로 조회 가능</li><li>필요하면 <code>-s sqlite3</code> 로 선택</li></ul></div></div>
<p>형식을 바꾸거나 토픽을 골라 새 bag 을 만들 때는 <code>ros2 bag convert</code> 에 출력 설정 YAML 을 줍니다. (실제 PC 에서)</p>
<pre class="code" data-lang="yaml"><code>${X(CONVERT_YAML)}</code></pre>
<pre class="code" data-lang="bash"><code>ros2 bag record -s sqlite3 -o old_style /turtle1/pose
ros2 bag convert -i turtle_run -o convert.yaml</code></pre>
<div class="box warn"><div class="box-t">⚠️ 시각 주의</div>bag 을 재생해 SLAM · Nav2 를 돌릴 때는 녹화 당시 시각을 써야 합니다. <code>ros2 bag play 이름 --clock</code> 으로 <code>/clock</code> 을 발행하고, 다른 노드는 <code>use_sim_time:=true</code> 로 켭니다. 그렇지 않으면 TF “extrapolation” 오류가 납니다(12장).</div>
<div class="box practice"><div class="box-t">🧪 해 보기 — rosbag 위젯</div><ol class="steps-list">
<li>위 코드 블록으로 원 그리기 발행을 켜 둡니다 (turtlesim 은 이미 켜져 있음).</li>
<li>위젯의 녹화 칸에서 <code>/turtle1/cmd_vel</code> 과 <code>/turtle1/pose</code> 를 고르고 ● 녹화 → 몇 초 뒤 ■ 정지.</li>
<li>재생 칸에서 방금 bag 을 고르고 <code>--rate 2×</code>, <code>--loop</code> 를 바꿔 가며 재생해 봅니다.</li>
<li>터미널에서 <code>ros2 bag info 이름</code> 으로 메시지 개수를 확인합니다.</li></ol></div>
{{widget:bag}}`
      },

      /* ============================================================ 5 */
      {
        title: 'Foxglove · PlotJuggler · Rerun',
        html: `<p>rqt 와 RViz2 는 ROS 에 기본으로 들어 있지만, 요즘 현장에서는 더 편한 외부 도구도 많이 씁니다. 모두 <b>실시간 연결</b>과 <b>bag 파일 열기</b>를 지원합니다.</p>
<div class="cards c3">
<div class="card orange"><div class="ci">🦊</div><b>Foxglove</b><p>웹 · 데스크톱 앱. 3D, 영상, 그래프, 로그, 지도 패널을 한 화면에 배치. MCAP 형식을 만든 회사입니다.</p></div>
<div class="card blue"><div class="ci">📈</div><b>PlotJuggler</b><p>시계열 그래프 전문. 수백 개 필드를 끌어다 놓고, 확대 · 수식(미분 · 적분) · 두 신호 XY 그래프.</p></div>
<div class="card purple"><div class="ci">🌀</div><b>Rerun</b><p>파이썬 · C++ · Rust SDK 로 로그를 보내 3D · 이미지 · 점군을 시간축과 함께 보는 오픈소스 시각화 도구.</p></div>
</div>
<h4>Foxglove 연결하기</h4>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-foxglove-bridge
ros2 launch foxglove_bridge foxglove_bridge_launch.xml</code></pre>
<p>기본 포트는 <b>8765</b> 입니다. Foxglove 앱에서 <b>Open connection → Foxglove WebSocket → <code>ws://로봇IP:8765</code></b> 를 입력하면 토픽 목록이 나타납니다. bag 파일(.mcap)은 앱으로 끌어다 놓으면 열립니다.</p>
<div class="box note"><div class="box-t">📝 라이선스 변화</div>Foxglove 는 2024년부터 계정 로그인이 필요한 상용 앱(무료 요금제 있음)으로 바뀌었습니다. 오픈소스로 쓰고 싶다면 예전 오픈소스 버전을 이어받은 포크(예: Lichtblick)도 있습니다. foxglove_bridge 자체는 오픈소스입니다.</div>
<h4>PlotJuggler 설치 · 실행</h4>
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-plotjuggler-ros
ros2 run plotjuggler plotjuggler</code></pre>
<p>왼쪽 <b>Streaming → ROS2 Topic Subscriber</b> 로 실시간 토픽을, <b>Data → Load</b> 로 bag 을 엽니다. 필드를 그래프 칸으로 끌어다 놓으면 끝입니다. 여러 그래프의 시간축이 함께 움직여 “속도 명령과 실제 속도가 언제 어긋났나”를 찾기 좋습니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 이 페이지의 rqt_plot 과 토픽 모니터</div><ol class="steps-list">
<li>PlotJuggler 대신 이 페이지의 rqt_plot 에서 <code>/turtle1/pose/theta</code> 를 추가해 봅니다 (거북이가 돌 때 −π~π 사이를 톱니처럼 오가는 모습).</li>
<li>토픽 모니터에서 각 토픽의 Hz 와 마지막 값을 확인합니다.</li></ol></div>
{{widget:plot|topic=/turtle1/pose/x,/turtle1/pose/theta}}
{{widget:echo}}`
      },

      /* ============================================================ 6 */
      {
        title: 'rosbridge + roslibjs — 웹에서 로봇 다루기',
        html: `<p>브라우저는 DDS 를 직접 말할 수 없습니다. <b>rosbridge_suite</b> 는 로봇 PC 에서 WebSocket 서버(기본 포트 <b>9090</b>)를 열고, JSON 명령(publish · subscribe · call_service …)을 ROS 2 통신으로 바꿔 줍니다. 웹 쪽에서는 자바스크립트 라이브러리 <b>roslibjs</b> 로 이 서버와 이야기합니다.</p>
{{fig:bridgeArch}}
<pre class="code" data-lang="bash"><code>sudo apt install ros-jazzy-rosbridge-suite
ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code></pre>
<pre class="code" data-lang="html"><code>${X(ROSLIB_JS)}</code></pre>
<div class="vs"><div class="vs-a teal"><b>rosbridge (9090)</b><ul><li>JSON 텍스트 — 사람이 읽기 쉬움</li><li>roslibjs · 파이썬 roslibpy 등 클라이언트 많음</li><li>웹 대시보드 · 원격 조종 앱에 적합</li></ul></div><div class="vs-mid">VS</div><div class="vs-b orange"><b>foxglove_bridge (8765)</b><ul><li>CDR 바이너리 그대로 — 영상 · 점군에 빠름</li><li>Foxglove 앱 · Foxglove SDK 용</li><li>시각화 · 디버깅에 적합</li></ul></div></div>
<div class="box warn"><div class="box-t">⚠️ 보안</div>rosbridge 는 기본적으로 <b>인증이 없습니다</b>. 9090 포트에 접속한 누구나 로봇에 <code>/cmd_vel</code> 을 보낼 수 있으니 같은 공유기(LAN) 안에서만 쓰고, 인터넷에 열 때는 VPN · 리버스 프록시(TLS, <code>wss://</code>) · 방화벽을 함께 씁니다.</div>
<h4>이 페이지를 진짜 ROS 2 PC 에 연결하기</h4>
<p>아래 <b>bridge</b> 위젯은 이 강좌 페이지의 가상 ROS 그래프를 <b>실제 PC 의 rosbridge</b> 에 연결합니다. 실제 PC 의 <code>/turtle1/pose</code> 를 이 페이지로 들여와(미러링) rqt_plot 에 그리거나, 이 페이지의 teleop 이 보낸 <code>/turtle1/cmd_vel</code> 을 실제 turtlesim 으로 내보낼 수 있습니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 실제 ROS 2 와 연결 (ROS 2 가 설치된 PC 가 있을 때)</div><ol class="steps-list">
<li>ROS 2 PC 에서 <code>ros2 run turtlesim turtlesim_node</code> 와 <code>ros2 launch rosbridge_server rosbridge_websocket_launch.xml</code> 을 실행합니다.</li>
<li>위젯의 주소를 <code>ws://PC의IP:9090</code> 으로 바꾸고 연결합니다. (같은 PC 라면 <code>ws://localhost:9090</code>)</li>
<li>원격 토픽 목록에서 <code>/turtle1/pose</code> 를 들여오고, <code>/turtle1/cmd_vel</code> 을 내보내기로 설정합니다.</li>
<li>이 페이지에서 거북이를 조종하면 PC 의 거북이가 움직입니다. (https 페이지에서 ws:// 가 막히면 브라우저의 “안전하지 않은 콘텐츠 허용” 또는 wss:// 가 필요합니다)</li></ol></div>
{{widget:bridge|url=ws://localhost:9090}}
<p>웹 대시보드 · Docker 배포 · 보안(SROS2)은 20장에서 더 자세히 다룹니다.</p>`
      },

      /* ============================================================ 7 */
      {
        title: '진단 — ros2 doctor 와 topic hz · bw · delay',
        html: `<p>“토픽이 안 와요”, “느려요” 같은 문제는 대개 네 가지 질문으로 좁힐 수 있습니다: <b>① 발행되고 있나? ② 얼마나 자주? ③ 얼마나 무겁나? ④ 얼마나 늦게 도착하나?</b></p>
<table class="tbl">
<tr><th>명령</th><th>보여 주는 것</th><th>이럴 때</th></tr>
<tr><td><code>ros2 topic hz /scan</code></td><td>평균 주기 · 최소/최대 간격 · 표준편차</td><td>센서가 10 Hz 로 오기로 했는데 3 Hz 로 온다</td></tr>
<tr><td><code>ros2 topic bw /camera/image_raw</code></td><td>초당 데이터량 (KB/s, MB/s)</td><td>Wi-Fi 로 영상이 끊긴다</td></tr>
<tr><td><code>ros2 topic delay /scan</code></td><td>header.stamp 와 받은 시각의 차이</td><td>TF extrapolation · 오래된 데이터 의심 (header 가 있는 메시지만)</td></tr>
<tr><td><code>ros2 topic info /x -v</code></td><td>발행자 · 구독자 · QoS</td><td>QoS 가 안 맞아 연결이 안 된다 (11장)</td></tr>
<tr><td><code>ros2 doctor</code></td><td>환경 · 네트워크 · 짝 없는 발행/구독 경고</td><td>뭔가 이상한데 어디부터 볼지 모를 때</td></tr>
<tr><td><code>ros2 doctor --report</code></td><td>배포판 · RMW · 네트워크 · 토픽 목록 전체 보고서</td><td>질문 게시판에 환경 정보를 붙일 때</td></tr>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic hz /turtle1/pose</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic bw /turtle1/pose</code></pre>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 doctor
ros2 doctor --report</code></pre>
<pre class="code out" data-lang="출력"><code>average rate: 62.502
	min: 0.015s max: 0.017s std dev: 0.00041s window: 64</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기</div><ol class="steps-list">
<li>(turtlesim 은 실습 창에 이미 켜져 있습니다) <code>ros2 topic hz /turtle1/pose</code> 로 pose 가 약 62.5 Hz(16 ms 주기)로 오는지 확인합니다.</li>
<li><code>ros2 topic pub -r 5 /turtle1/cmd_vel …</code> 을 켠 뒤 <code>ros2 topic hz /turtle1/cmd_vel</code> 이 5 Hz 인지 봅니다.</li>
<li><code>ros2 doctor</code> 로 “Publisher without subscriber” 같은 경고가 나오는지 확인하고 원인을 설명해 봅니다.</li></ol></div>
{{widget:lab|with=turtlesim|title=진단 실습 — 터미널 + turtlesim}}
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 디버깅 체크리스트</div>① <code>ros2 node list</code> 로 노드가 떠 있나 → ② rqt_graph 로 연결 → ③ <code>topic info -v</code> 로 QoS → ④ <code>topic hz</code> 로 주기 → ⑤ rqt_console 로 경고 → ⑥ 재현이 어려우면 <code>ros2 bag record</code> 로 증거 확보.</div>`
      },

      /* ============================================================ 8 */
      {
        title: '한눈에 비교 — 언제 무엇을 쓸까?',
        html: `<table class="tbl cmp">
<tr><th>도구</th><th>종류</th><th>강점</th><th>이럴 때 쓰세요</th></tr>
<tr><td><b>ros2 topic / node / param</b></td><td>CLI</td><td>어디서나 됨 (SSH 로도)</td><td>빠른 확인, 스크립트</td></tr>
<tr><td><b>rqt_graph</b></td><td>GUI</td><td>연결 구조</td><td>리매핑 · 네임스페이스 · 끊긴 연결</td></tr>
<tr><td><b>rqt_plot</b></td><td>GUI</td><td>가벼운 실시간 그래프</td><td>필드 몇 개의 변화 보기</td></tr>
<tr><td><b>rqt_console</b></td><td>GUI</td><td>/rosout 모아 보기 · 거르기</td><td>여러 노드의 경고 · 오류 추적</td></tr>
<tr><td><b>rqt_reconfigure</b></td><td>GUI</td><td>파라미터 즉시 변경</td><td>PID · 속도 한계 튜닝</td></tr>
<tr><td><b>RViz2</b></td><td>GUI (3D)</td><td>TF · 로봇 · 센서 · 지도</td><td>공간 데이터 확인 (12 · 13 · 16장)</td></tr>
<tr><td><b>ros2 bag</b></td><td>CLI</td><td>녹화 · 재생 (MCAP)</td><td>재현 · 오프라인 개발 · 데이터 수집</td></tr>
<tr><td><b>Foxglove</b></td><td>웹/앱</td><td>대시보드 · 원격 · bag 분석</td><td>팀 공유, 원격 로봇 모니터링</td></tr>
<tr><td><b>PlotJuggler</b></td><td>앱</td><td>많은 시계열 · 수식</td><td>제어 튜닝, 긴 bag 분석</td></tr>
<tr><td><b>Rerun</b></td><td>앱 + SDK</td><td>코드에서 바로 로깅 · 3D + 시간축</td><td>인식 · AI 파이프라인 디버깅</td></tr>
<tr><td><b>rosbridge + roslibjs</b></td><td>라이브러리</td><td>웹과 ROS 2 연결</td><td>나만의 웹 UI · 모바일 조종</td></tr>
<tr><td><b>ros2 doctor</b></td><td>CLI</td><td>환경 종합 점검</td><td>설치 · 네트워크 문제</td></tr>
</table>
<div class="box trend"><div class="box-t">🚀 최신 동향</div>대용량 로봇 데이터(카메라 · 라이다)를 AI 학습에 쓰는 일이 늘면서 MCAP 이 사실상 표준 로그 형식이 되었고, Foxglove · Rerun 같은 도구가 bag 을 브라우저에서 바로 여는 방향으로 발전하고 있습니다. LeRobot 같은 모방학습 프레임워크도 ROS 2 bag 을 데이터셋으로 바꾸는 도구를 쓰고 있습니다(19장).</div>`
      }
    ],

    videos: [
      { title: 'ROS2 - Create and Replay a ROS2 Bag', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=a-O1qM9_S7k', lang: 'en', min: '10분', desc: 'ros2 bag record · info · play 를 단계별로 보여 주는 짧고 정확한 영상입니다.' },
      { title: 'Analyzing Your System Using rqt_console - ROS 2 Jazzy', channel: 'Automatic Addison', url: 'https://www.youtube.com/watch?v=ZSbA89nc-pk', lang: 'en', min: '10분', desc: 'Jazzy 에서 rqt_console 로 로그를 거르고 분석하는 방법을 봅니다.' },
      { title: 'ROS2 Basics #14 - ROS2 tools - RQt and Ros2bag', channel: 'BotBuilder', url: 'https://www.youtube.com/watch?v=E-9Dan5Tjb4', lang: 'en', min: '15분', desc: 'rqt_graph · rqt_console · rqt_plot · ros2 bag 을 한 번에 훑어봅니다.' },
      { title: 'ROS2 Plotting Tutorial with PlotJuggler - A Simple Way to Plot in ROS', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=MnMGjvYxlUk', lang: 'en', min: '12분', desc: 'PlotJuggler 로 실시간 토픽을 그래프로 그리는 과정을 보여 줍니다.' },
      { title: 'Monitor Your Robots from the Web with Foxglove | ROS Developers Open Class 185', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=S0dwRNwI050', lang: 'en', min: '60분', desc: 'foxglove_bridge 를 켜고 웹에서 로봇을 모니터링하는 대시보드를 만드는 라이브 수업입니다.' },
      { title: 'Developing Web Interfaces For ROS Robots - Ep 1: Introduction to ROSBridge Server', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=fJDwgOJPRJE', lang: 'en', min: '30분', desc: 'rosbridge 서버와 roslibjs 로 웹 페이지에서 로봇에 명령을 보내는 기초를 다룹니다.' }
    ],

    terms: [
      ['rqt', 'Qt 기반 GUI 틀. rqt_graph · rqt_plot 등 플러그인을 한 창에 담아 쓸 수 있음'],
      ['rqt_graph', '노드와 토픽의 연결을 그래프로 보여 주는 플러그인'],
      ['rqt_plot', '숫자 필드(/토픽/필드)를 시간 그래프로 그리는 플러그인'],
      ['rqt_console', '/rosout 로그를 모아 심각도 · 노드별로 거르는 플러그인'],
      ['/rosout', '모든 노드의 로그가 모이는 토픽 (rcl_interfaces/msg/Log)'],
      ['로그 수준(severity)', 'DEBUG &lt; INFO &lt; WARN &lt; ERROR &lt; FATAL. --ros-args --log-level 로 바꿈'],
      ['rosbag2 (ros2 bag)', '토픽을 파일로 녹화(record)하고 재생(play)하는 도구'],
      ['MCAP', 'Iron 부터 rosbag2 의 기본 저장 형식. 스키마를 포함한 로봇 로그용 파일 형식'],
      ['--clock / use_sim_time', 'bag 재생 시 녹화 당시 시각을 /clock 으로 발행하고 노드가 그 시각을 쓰게 하는 설정'],
      ['Foxglove · foxglove_bridge', '웹/데스크톱 시각화 앱과, ROS 2 를 WebSocket(8765)으로 잇는 브리지 노드'],
      ['PlotJuggler', '많은 시계열 데이터를 끌어다 놓아 그리는 그래프 도구 (ros-jazzy-plotjuggler-ros)'],
      ['rosbridge_suite', 'ROS 2 를 JSON WebSocket(9090)으로 여는 서버. 웹 · 다른 언어 클라이언트용'],
      ['roslibjs', '브라우저에서 rosbridge 에 접속해 토픽 · 서비스를 쓰는 자바스크립트 라이브러리'],
      ['ros2 doctor', 'ROS 2 환경 · 네트워크 · 토픽 연결을 점검하는 명령 (--report 로 전체 보고서)']
    ],

    summary: [
      '도구는 질문에 따라 고른다: 연결은 rqt_graph, 숫자 변화는 rqt_plot, 로그는 rqt_console, 파라미터는 rqt_reconfigure, 서비스는 rqt_service_caller.',
      'rqt 는 플러그인 틀이다. 각 도구를 따로 실행하거나 rqt 창 안에 여러 개를 배치(Perspective 저장)할 수 있다.',
      '노드 로그는 화면 · ~/.ros/log 파일 · /rosout 으로 가고, --log-level 과 RCUTILS_CONSOLE_OUTPUT_FORMAT 으로 수준과 모양을 바꾼다.',
      'ros2 bag record -o 이름 토픽… 으로 녹화하고 info 로 확인, play -r · --loop · --topics 로 재생한다. Iron 부터 기본 형식은 MCAP, sqlite3 는 -s 로 고르고 convert 로 바꾼다.',
      'Foxglove(foxglove_bridge, 8765) · PlotJuggler · Rerun 은 실시간 연결과 bag 분석을 모두 지원하는 외부 시각화 도구다.',
      'rosbridge_suite(9090, JSON) + roslibjs 로 웹 페이지가 ROS 2 와 통신한다. 인증이 없으므로 LAN 안에서만 열거나 보안 장치를 둔다.',
      '진단은 ros2 node list → rqt_graph → topic info -v → topic hz/bw/delay → rqt_console → ros2 doctor 순서로 좁혀 간다.'
    ],

    quiz: [
      { q: '거북이의 x 좌표가 시간에 따라 어떻게 변하는지 그래프로 보고 싶을 때 알맞은 명령은?', options: ['rqt_graph', 'rqt_plot /turtle1/pose/x', 'ros2 bag info /turtle1/pose', 'ros2 doctor'], answer: 1, explain: 'rqt_plot 은 /토픽/필드 경로로 숫자 필드를 시간 그래프로 그립니다. rqt_graph 는 연결 구조를 보여 줍니다.' },
      { q: 'ROS 2 Jazzy 에서 ros2 bag record 의 기본 저장 형식은?', options: ['sqlite3 (.db3)', 'MCAP (.mcap)', 'CSV', 'ROS 1 .bag'], answer: 1, explain: 'Iron 부터 기본 저장 형식이 MCAP 으로 바뀌었고 Jazzy 도 같습니다. sqlite3 는 -s sqlite3 로 고를 수 있습니다.' },
      { q: '녹화한 bag 을 2배속으로 계속 반복 재생하는 명령은?', options: ['ros2 bag play my_bag -r 2 --loop', 'ros2 bag record my_bag -r 2', 'ros2 bag info my_bag --loop', 'ros2 bag play --rate 0.5 my_bag'], answer: 0, explain: 'play 의 -r(--rate) 는 재생 속도 배율, --loop 는 반복입니다. --rate 0.5 는 절반 속도입니다.' },
      { q: 'bag 을 재생하며 SLAM 을 돌릴 때 TF extrapolation 오류를 막으려면?', options: ['bag 을 sqlite3 로 바꾼다', 'ros2 bag play --clock 과 use_sim_time:=true 를 함께 쓴다', 'rqt_console 을 켠다', 'ROS_DOMAIN_ID 를 0 으로 둔다'], answer: 1, explain: '녹화 당시 시각의 메시지를 현재 시각 기준으로 처리하면 시간이 어긋납니다. --clock 으로 /clock 을 발행하고 노드들이 use_sim_time 으로 그 시각을 쓰게 합니다.' },
      { q: 'rosbridge_server 에 대한 설명으로 옳지 않은 것은?', options: ['기본 WebSocket 포트는 9090 이다', 'JSON 으로 publish · subscribe · call_service 를 주고받는다', '브라우저에서는 roslibjs 로 접속한다', '기본으로 강력한 사용자 인증이 켜져 있어 인터넷에 그냥 열어도 안전하다'], answer: 3, explain: 'rosbridge 는 기본적으로 인증이 없습니다. LAN 안에서만 쓰거나 VPN · TLS 프록시 · 방화벽을 함께 써야 합니다.' },
      { q: '센서가 10 Hz 로 와야 하는데 로봇이 느리게 반응합니다. 실제 발행 주기를 확인하는 명령은?', options: ['ros2 topic hz /scan', 'ros2 topic type /scan', 'ros2 pkg list', 'ros2 bag convert'], answer: 0, explain: 'ros2 topic hz 는 평균 주기와 간격의 최소 · 최대 · 표준편차를 보여 줍니다. 대역폭은 bw, 지연은 delay 입니다.' },
      { q: '어떤 노드의 DEBUG 로그까지 보고 싶을 때 실행 방법은?', options: ['ros2 run pkg node --ros-args --log-level debug', 'ros2 run pkg node --debug', 'export ROS_DEBUG=1', 'ros2 doctor --log debug'], answer: 0, explain: '--ros-args --log-level debug 로 로그 수준을 낮춥니다. 특정 로거만은 --log-level 이름:=debug 로 지정합니다.' }
    ],

    slides: [
      { title: '도구 지도', html: `{{fig:toolMap|nocap}}`, notes: '실시간/기록, CLI/GUI 두 축으로 도구를 배치합니다. “bag 을 재생하면 왼쪽 도구를 모두 다시 쓸 수 있다”는 점이 오늘의 핵심입니다. (3분)' },
      { title: 'rqt = 플러그인 모음', html: `{{fig:rqtFamily|nocap}}`, notes: '여섯 플러그인과 각각의 쓰임을 짧게 소개합니다. rqt 창에서 Plugins 메뉴로 여러 개를 배치하는 모습을 시연합니다. (4분)' },
      { title: '실습: turtlesim + rqt', html: `{{widget:lab|with=turtlesim,graph}}`, notes: 'turtlesim 과 teleop 을 켜고 rqt_graph 에서 연결을 찾습니다. rqt_reconfigure 로 배경색, rqt_service_caller 로 spawn 을 해 봅니다. (8분)' },
      { title: '로그가 가는 길', html: `{{fig:logFlow|nocap}}`, notes: '화면 · 파일 · /rosout 세 곳. rqt_console 은 /rosout 을 구독합니다. --log-level 과 출력 형식 환경 변수를 소개합니다. (4분)' },
      { title: 'rqt_plot 한 줄', layout: 'center', html: `<div class="s-big"><code>rqt_plot /turtle1/pose/x /turtle1/pose/y</code></div><div class="s-small">원을 그리면 90° 어긋난 두 사인파</div>`, notes: '원을 그리는 거북이의 x, y 를 그려 사인파가 되는 것을 확인합니다. 왜 90° 어긋나는지 학생들에게 물어 봅니다. (4분)' },
      { title: 'rosbag2 = 로봇 블랙박스', html: `{{fig:bagFlow|nocap}}`, notes: '녹화기는 구독자, 재생기는 발행자라는 점이 핵심입니다. bag 폴더 안의 metadata.yaml 과 .mcap 파일을 설명합니다. (4분)' },
      { title: '실습: 녹화 · 재생', html: `{{widget:bag}}`, notes: '원을 그리는 거북이를 녹화하고, reset 후 cmd_vel 만 재생해 같은 궤적이 다시 그려지는 것을 보여 줍니다. -r 2, --loop 도 시연합니다. (8분)' },
      { title: 'MCAP vs SQLite3', html: `<div class="s-cols"><div><b>MCAP</b><ul class="s-points"><li>Iron 부터 기본</li><li>Foxglove · PlotJuggler 바로 열기</li></ul></div><div><b>SQLite3</b><ul class="s-points"><li>Humble 까지 기본</li><li>-s sqlite3 · ros2 bag convert</li></ul></div></div>`, notes: '형식 차이와 변환 방법을 짧게 정리합니다. 재생 시 --clock 과 use_sim_time 이 필요하다는 점을 꼭 짚습니다. (3분)' },
      { title: 'Foxglove · PlotJuggler · Rerun', html: `<div class="s-cols c3"><div><b>🦊 Foxglove</b><p class="s-small">대시보드 · 원격 · :8765</p></div><div><b>📈 PlotJuggler</b><p class="s-small">시계열 · 수식</p></div><div><b>🌀 Rerun</b><p class="s-small">SDK 로깅 · 3D + 시간</p></div></div>`, notes: '세 도구의 강점을 비교합니다. 가능하면 Foxglove 에 .mcap 파일을 끌어다 놓는 모습을 시연합니다. (4분)' },
      { title: '웹과 ROS 2 잇기', html: `{{fig:bridgeArch|nocap}}`, notes: 'rosbridge 는 JSON(9090), foxglove_bridge 는 바이너리(8765). 둘 다 DDS 와 WebSocket 사이의 통역사입니다. 보안(인증 없음)을 꼭 강조합니다. (4분)' },
      { title: '이 페이지를 진짜 ROS 2 에', html: `{{widget:bridge|url=ws://localhost:9090}}`, notes: 'ROS 2 PC 가 있다면 rosbridge 를 켜고 연결해 실제 turtlesim 을 이 페이지에서 조종합니다. 없으면 구조만 설명합니다. (5분)' },
      { title: '진단 네 질문', html: `<ul class="s-points"><li>발행되나? — <code>ros2 topic info -v</code></li><li>얼마나 자주? — <code>ros2 topic hz</code></li><li>얼마나 무겁나? — <code>ros2 topic bw</code></li><li>얼마나 늦나? — <code>ros2 topic delay</code></li><li>종합 점검 — <code>ros2 doctor --report</code></li></ul>`, notes: '문제를 좁히는 순서를 체크리스트로 정리합니다. turtlesim pose 가 약 62.5 Hz 인 것을 hz 로 확인해 봅니다. (4분)' }
    ]
  });
})();
