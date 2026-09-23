/* 6장 — 파라미터: 노드의 설정값 */
Course.lesson({
  id: 'ch06', no: '06',
  icon: '🎛️',
  title: '파라미터 — 노드의 설정값',
  subtitle: '코드를 고치지 않고 로봇의 성격을 바꾸는 손잡이',
  level: '입문', time: '100분',
  goals: [
    '파라미터가 무엇이고 왜 코드 대신 파라미터로 설정하는지 설명할 수 있다',
    'ros2 param list · get · set · describe · dump · load 로 turtlesim 배경색을 바꿀 수 있다',
    '실행할 때 --ros-args -p 와 YAML 파라미터 파일(--params-file)로 값을 줄 수 있다',
    'rclpy 에서 파라미터를 선언하고, 콜백으로 잘못된 값을 거절할 수 있다',
    'use_sim_time 과 /parameter_events 처럼 모든 노드에 공통인 파라미터 기능을 설명할 수 있다'
  ],
  teacher: {
    intro: '“게임을 할 때 코드를 고쳐서 화면 밝기를 바꾸나요?” 하고 묻습니다. 설정 메뉴의 슬라이더 · 체크박스가 떠오르면, “ROS 2 노드에도 이런 설정 메뉴가 있습니다. 그게 파라미터예요”로 연결합니다. (2분)',
    flow: '① 도입 · 설정 메뉴 비유 8분 → ② 파라미터 타입 10분 → ③ ros2 param 명령 + 배경색 실습 20분 → ④ 시작할 때 값 주기(-p) 10분 → ⑤ YAML 파라미터 파일 15분 → ⑥ rqt_reconfigure 5분 → ⑦ rclpy 파라미터 · 콜백 검증 20분 → ⑧ use_sim_time · 파라미터 이벤트 · 정리 10분'
  },

  figs: {
    /* ---------------------------------------------------------------- 설정 손잡이 */
    knobs: {
      caption: '파라미터 = 노드마다 달린 설정 손잡이. 이름 · 타입 · 값을 가지고, 노드가 실행 중일 때도 바꿀 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 900 360" role="img" aria-label="turtlesim 노드와 그 파라미터 목록">
  <ellipse cx="170" cy="180" rx="140" ry="64" class="blue"/>
  <text x="170" y="170" class="t-lg t-c t-b t-blue">/turtlesim</text>
  <text x="170" y="198" class="t-sm t-c">노드</text>
  <path d="M312,180 L372,180" class="ln thick ar"/>

  <rect x="380" y="30" width="500" height="300" rx="14" class="box"/>
  <text x="630" y="58" class="t-b t-c">🎛️ 파라미터 (이름 · 타입 · 값)</text>
  <rect x="400" y="76" width="460" height="40" rx="8" class="red"/>
  <text x="416" y="96" class="t-sm t-mono">background_r</text><text x="640" y="96" class="t-xs t-mono t-mu">integer</text><text x="840" y="96" class="t-b t-e t-mono">69</text>
  <rect x="400" y="124" width="460" height="40" rx="8" class="green"/>
  <text x="416" y="144" class="t-sm t-mono">background_g</text><text x="640" y="144" class="t-xs t-mono t-mu">integer</text><text x="840" y="144" class="t-b t-e t-mono">86</text>
  <rect x="400" y="172" width="460" height="40" rx="8" class="blue"/>
  <text x="416" y="192" class="t-sm t-mono">background_b</text><text x="640" y="192" class="t-xs t-mono t-mu">integer</text><text x="840" y="192" class="t-b t-e t-mono">255</text>
  <rect x="400" y="220" width="460" height="40" rx="8" class="gray"/>
  <text x="416" y="240" class="t-sm t-mono">holonomic</text><text x="640" y="240" class="t-xs t-mono t-mu">bool</text><text x="840" y="240" class="t-b t-e t-mono">false</text>
  <rect x="400" y="268" width="460" height="40" rx="8" class="yellow"/>
  <text x="416" y="288" class="t-sm t-mono">use_sim_time</text><text x="640" y="288" class="t-xs t-mono t-mu">bool</text><text x="840" y="288" class="t-b t-e t-mono">false</text>
  <text x="170" y="290" class="t-xs t-c t-mu">use_sim_time 은 모든 노드에 있음</text>
</svg>`
    },

    /* ---------------------------------------------------------------- set 의 흐름 */
    setFlow: {
      caption: 'ros2 param set 의 속 — CLI 가 노드의 set_parameters 서비스를 부르고, 노드의 콜백이 허락하면 값이 바뀌고 /parameter_events 로 알려집니다',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="ros2 param set 이 set_parameters 서비스, 검증 콜백, parameter_events 토픽을 거치는 흐름">
  <rect x="20" y="40" width="200" height="60" rx="10" class="gray"/>
  <text x="120" y="64" class="t-sm t-c t-mono t-b">ros2 param set</text>
  <text x="120" y="86" class="t-xs t-c">/turtlesim background_r 150</text>

  <rect x="290" y="44" width="250" height="52" rx="8" class="orange"/>
  <text x="415" y="66" class="t-sm t-c t-mono">/turtlesim/set_parameters</text>
  <text x="415" y="86" class="t-xs t-c">서비스 (4장)</text>
  <path d="M222,70 L286,70" class="ln-orange thick ar-orange"/>

  <ellipse cx="720" cy="150" rx="150" ry="64" class="blue"/>
  <text x="720" y="130" class="t-b t-c t-blue">/turtlesim</text>
  <rect x="610" y="146" width="220" height="40" rx="8" class="yellow"/>
  <text x="720" y="166" class="t-xs t-c">① 타입 · 범위 · 콜백 검사</text>
  <path d="M542,70 C620,70 660,80 680,92" class="ln-orange thick ar-orange"/>

  <rect x="560" y="258" width="150" height="46" rx="10" class="s-green"/>
  <text x="635" y="281" class="t-sm t-c tw t-b">✓ 성공 → 값 변경</text>
  <rect x="740" y="258" width="150" height="46" rx="10" class="s-red"/>
  <text x="815" y="281" class="t-sm t-c tw t-b">✗ 거절 → 값 그대로</text>
  <path d="M690,214 L650,254" class="ln-green ar-green"/>
  <path d="M750,214 L800,254" class="ln-red ar-red"/>

  <path d="M600,300 L350,300" class="ln-green thick ar-green"/>
  <rect x="160" y="276" width="190" height="48" rx="6" class="green"/>
  <text x="255" y="300" class="t-sm t-c t-mono">/parameter_events</text>
  <text x="255" y="344" class="t-xs t-c t-mu">rqt_reconfigure 등이 구독해 화면 갱신</text>
  <path d="M680,214 C560,200 300,160 200,104" class="ln-teal dash ar-teal"/>
  <text x="330" y="176" class="t-xs t-teal">응답: successful / reason</text>
</svg>`
    },

    /* ---------------------------------------------------------------- YAML 해부 */
    yaml: {
      caption: 'YAML 파라미터 파일의 모양 — 노드 이름 → ros__parameters → 이름: 값. /** 는 "모든 노드"라는 와일드카드',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="파라미터 YAML 파일의 각 줄 설명">
  <rect x="20" y="20" width="440" height="340" rx="12" class="box"/>
  <text x="44" y="56" class="t-mono t-b t-blue">/turtlesim:</text>
  <text x="44" y="88" class="t-mono t-purple">  ros__parameters:</text>
  <text x="44" y="120" class="t-mono">    background_r: 150</text>
  <text x="44" y="150" class="t-mono">    background_g: 60</text>
  <text x="44" y="180" class="t-mono">    background_b: 200</text>
  <text x="44" y="226" class="t-mono t-b t-orange">/**:</text>
  <text x="44" y="258" class="t-mono t-purple">  ros__parameters:</text>
  <text x="44" y="290" class="t-mono">    use_sim_time: false</text>
  <text x="44" y="330" class="t-xs t-mu">들여쓰기는 스페이스 2칸씩 (탭 금지)</text>

  <path d="M190,52 L520,52" class="ln-blue ar-blue dash"/>
  <rect x="524" y="30" width="360" height="44" rx="8" class="blue"/>
  <text x="704" y="52" class="t-sm t-c">① 어느 노드? (전체 이름, / 로 시작)</text>
  <path d="M250,84 L520,104" class="ln-purple ar-purple dash"/>
  <rect x="524" y="86" width="360" height="44" rx="8" class="purple"/>
  <text x="704" y="108" class="t-sm t-c">② 꼭 이 단어 (밑줄 두 개 __)</text>
  <path d="M270,150 L520,160" class="ln ar dash"/>
  <rect x="524" y="142" width="360" height="44" rx="8" class="yellow"/>
  <text x="704" y="164" class="t-sm t-c">③ 파라미터이름: 값 (타입은 값 모양으로)</text>
  <path d="M110,222 L520,232" class="ln-orange ar-orange dash"/>
  <rect x="524" y="210" width="360" height="44" rx="8" class="orange"/>
  <text x="704" y="232" class="t-sm t-c">④ /** = 모든 노드에 적용</text>
  <rect x="524" y="280" width="360" height="66" rx="8" class="teal"/>
  <text x="704" y="304" class="t-sm t-c">150 → integer · 150.0 → double</text>
  <text x="704" y="328" class="t-sm t-c">true → bool · 'abc' → string · [1, 2] → 배열</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 값이 정해지는 순서 */
    layers: {
      caption: '파라미터 값이 정해지는 단계 — 코드의 기본값을 시작할 때 덮어쓰고, 실행 중에도 다시 바꿀 수 있습니다',
      svg: `<svg class="dg" viewBox="0 0 900 300" role="img" aria-label="코드 기본값, 시작 시 값, 실행 중 변경의 세 단계">
  <rect x="20" y="70" width="250" height="140" rx="14" class="gray"/>
  <text x="145" y="102" class="t-lg t-c">📄</text>
  <text x="145" y="136" class="t-b t-c">① 코드의 기본값</text>
  <text x="145" y="162" class="t-xs t-c t-mono">declare_parameter('max_speed', 0.5)</text>
  <text x="145" y="186" class="t-xs t-c t-mu">아무것도 안 주면 이 값</text>

  <rect x="325" y="70" width="250" height="140" rx="14" class="teal"/>
  <text x="450" y="102" class="t-lg t-c">🚀</text>
  <text x="450" y="136" class="t-b t-c">② 시작할 때</text>
  <text x="450" y="162" class="t-xs t-c t-mono">--ros-args -p max_speed:=1.0</text>
  <text x="450" y="184" class="t-xs t-c t-mono">--params-file robot.yaml</text>

  <rect x="630" y="70" width="250" height="140" rx="14" class="orange"/>
  <text x="755" y="102" class="t-lg t-c">🎛️</text>
  <text x="755" y="136" class="t-b t-c">③ 실행 중에</text>
  <text x="755" y="162" class="t-xs t-c t-mono">ros2 param set · load</text>
  <text x="755" y="184" class="t-xs t-c t-mono">rqt_reconfigure</text>

  <path d="M272,140 L321,140" class="ln thick ar"/>
  <path d="M577,140 L626,140" class="ln thick ar"/>
  <text x="450" y="40" class="t-sm t-c t-b">뒤 단계가 앞 단계 값을 덮어씁니다</text>
  <text x="755" y="244" class="t-xs t-c t-red">read_only 파라미터는 ③ 불가</text>
  <text x="450" y="244" class="t-xs t-c t-mu">노드가 선언(declare)한 이름만 받음</text>
  <text x="450" y="276" class="t-xs t-c t-mu">③ 은 노드를 끄면 사라짐 → 계속 쓰려면 YAML 로 저장(dump)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 콜백 검증 */
    validate: {
      caption: '파라미터 콜백 = 문지기. 새 값이 들어오면 먼저 검사해서 허락하거나 이유와 함께 거절합니다',
      svg: `<svg class="dg" viewBox="0 0 900 300" role="img" aria-label="max_speed 1.5는 허락되고 3.0은 거절되는 파라미터 콜백">
  <rect x="20" y="40" width="230" height="56" rx="10" class="box"/>
  <text x="135" y="68" class="t-sm t-c t-mono">set max_speed 1.5</text>
  <rect x="20" y="196" width="230" height="56" rx="10" class="box"/>
  <text x="135" y="224" class="t-sm t-c t-mono">set max_speed 3.0</text>

  <rect x="340" y="90" width="220" height="110" rx="14" class="yellow"/>
  <text x="450" y="124" class="t-lg t-c">🛂</text>
  <text x="450" y="156" class="t-b t-c">on_change(params)</text>
  <text x="450" y="180" class="t-xs t-c t-mono">max_speed &gt; 2.0 이면 거절</text>
  <path d="M252,68 L336,120" class="ln ar"/>
  <path d="M252,224 L336,172" class="ln ar"/>

  <rect x="650" y="36" width="230" height="64" rx="10" class="s-green"/>
  <text x="765" y="60" class="t-sm t-c tw t-b">Set parameter successful</text>
  <text x="765" y="82" class="t-xs t-c tw">값이 1.5 로 바뀜</text>
  <rect x="650" y="190" width="230" height="74" rx="10" class="s-red"/>
  <text x="765" y="214" class="t-sm t-c tw t-b">Setting parameter failed:</text>
  <text x="765" y="238" class="t-xs t-c tw">max_speed 는 2.0 이하만 가능</text>
  <text x="765" y="256" class="t-xs t-c tw">값은 그대로 1.5</text>
  <path d="M562,120 L646,70" class="ln-green thick ar-green"/>
  <path d="M562,172 L646,222" class="ln-red thick ar-red"/>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '파라미터란? — 노드의 설정 메뉴',
      html: `
<p>로봇 프로그램에는 "상황에 따라 바꾸고 싶은 숫자"가 많습니다. 최고 속도, 센서 이름, 지도 파일 경로, PID 게인, 화면 배경색…. 이런 값을 코드에 박아 두면 바꿀 때마다 코드를 고치고 다시 빌드해야 합니다.</p>
<p>그래서 ROS 2 노드는 이런 값을 <b>파라미터(parameter, 노드가 가진 이름 붙은 설정값)</b>로 밖에 드러냅니다. 파라미터는 <b>노드마다</b> 따로 있고, 각각 <b>이름 · 타입 · 값</b>을 가지며, 노드가 실행 중일 때도 바꿀 수 있습니다.</p>

<div class="box analogy"><div class="box-t">🎮 비유 — 게임의 설정 메뉴</div>
<ul>
  <li><b>게임 프로그램</b> = 노드. 코드는 똑같아도</li>
  <li><b>설정 메뉴의 항목</b>(밝기 · 음량 · 난이도) = 파라미터</li>
  <li>항목마다 <b>종류</b>가 있어요: 체크박스(bool), 숫자 슬라이더(int · double), 이름 입력(string)</li>
  <li>설정을 <b>파일로 저장</b>해 두면 다음에 켤 때 그대로 = YAML 파라미터 파일</li>
</ul></div>

{{fig:knobs}}

<div class="cards c3">
  <div class="card blue"><div class="ci">🏷️</div><b>노드마다 따로</b><p><code>/turtlesim</code> 의 <code>background_r</code> 과 다른 노드의 <code>background_r</code> 은 서로 다른 파라미터입니다. 그래서 명령에는 항상 <b>노드 이름</b>이 들어가요.</p></div>
  <div class="card teal"><div class="ci">🧾</div><b>선언해야 존재</b><p>노드는 코드에서 <code>declare_parameter()</code> 로 "이런 설정이 있어요"라고 먼저 선언합니다. 선언하지 않은 이름은 기본적으로 받지 않습니다.</p></div>
  <div class="card orange"><div class="ci">🔁</div><b>속은 서비스</b><p><code>ros2 param</code> 명령은 4장에서 본 <code>/노드/get_parameters</code> · <code>set_parameters</code> 같은 서비스를 부르는 클라이언트입니다.</p></div>
</div>

<div class="box note"><div class="box-t">📝 ROS 1 을 알던 분께</div>
ROS 1 에는 모든 노드가 함께 쓰는 <b>파라미터 서버</b>가 따로 있었습니다. ROS 2 에는 중앙 서버가 없고, <b>각 노드가 자기 파라미터를 직접 들고</b> 있습니다. 그래서 노드가 꺼지면 그 파라미터도 사라집니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '파라미터의 타입',
      html: `
<p>파라미터 값에는 정해진 타입이 있습니다. 한 번 정해진 타입은 (특별히 허락하지 않는 한) 실행 중에 바뀌지 않아요. <code>integer</code> 파라미터에 <code>150.5</code> 나 <code>"red"</code> 를 넣으려 하면 거절됩니다.</p>
<table class="tbl cmp">
  <thead><tr><th>타입</th><th>값 예시 (명령 · YAML)</th><th>쓰임 예</th></tr></thead>
  <tbody>
    <tr><td><code>bool</code></td><td><code>true</code> · <code>false</code></td><td><code>use_sim_time</code>, 디버그 켜기</td></tr>
    <tr><td><code>integer</code> (int64)</td><td><code>150</code></td><td>배경색, 버퍼 크기</td></tr>
    <tr><td><code>double</code> (float64)</td><td><code>0.5</code> · <code>2.0</code></td><td>최고 속도, 게인 — <b>소수점을 붙여야 double</b></td></tr>
    <tr><td><code>string</code></td><td><code>webbot</code> · <code>'base_link'</code></td><td>프레임 이름, 파일 경로</td></tr>
    <tr><td><code>byte_array</code></td><td>바이트 목록</td><td>드묾</td></tr>
    <tr><td><code>bool_array</code> · <code>integer_array</code> · <code>double_array</code> · <code>string_array</code></td><td><code>[1.0, 2.0, 3.0]</code> · <code>[a, b]</code></td><td>관절 이름 목록, 다각형 꼭짓점</td></tr>
  </tbody>
</table>

<div class="box warn"><div class="box-t">⚠️ 1 과 1.0 은 다른 타입!</div>
명령과 YAML 에서는 <b>값의 모양</b>으로 타입이 정해집니다. <code>max_speed</code> 가 double 인데 <code>1</code> 을 주면 integer 로 읽혀서 실제 ROS 2 에서는 <code>Wrong parameter type</code> 오류가 날 수 있어요. double 파라미터에는 습관적으로 <code>1.0</code> 처럼 소수점을 붙이세요.</div>

<p>아래 두 명령을 실행해 보세요. 첫 줄은 정수라 성공하고, 둘째 줄은 정수 파라미터에 소수를 넣으려 해서 거절됩니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param set /turtlesim background_r 200
ros2 param set /turtlesim background_r 150.5</code></pre>
<pre class="code out" data-lang="출력"><code>Set parameter successful
Setting parameter failed: Wrong parameter type, parameter {background_r} is of type {integer}, setting it to {double} is not allowed.</code></pre>
<p class="t-mu">※ 위 명령은 이 장의 turtlesim 이 켜져 있어야 동작합니다. 다음 절의 실습 창에서 해 보세요.</p>`
    },

    /* ================================================================ 3 */
    {
      title: 'ros2 param 명령 — turtlesim 배경색 바꾸기',
      html: `
<p>파라미터를 다루는 명령은 6가지입니다.</p>
<table class="tbl">
  <thead><tr><th>명령</th><th>하는 일</th></tr></thead>
  <tbody>
    <tr><td><code>ros2 param list [노드]</code></td><td>파라미터 이름 목록 (노드를 빼면 모든 노드)</td></tr>
    <tr><td><code>ros2 param get 노드 이름</code></td><td>현재 값과 타입</td></tr>
    <tr><td><code>ros2 param set 노드 이름 값</code></td><td>값 바꾸기 (실행 중)</td></tr>
    <tr><td><code>ros2 param describe 노드 이름</code></td><td>설명 · 타입 · 제약(범위 · 읽기 전용)</td></tr>
    <tr><td><code>ros2 param dump 노드</code></td><td>모든 파라미터를 YAML 로 출력</td></tr>
    <tr><td><code>ros2 param load 노드 파일</code></td><td>YAML 파일의 값을 실행 중인 노드에 적용</td></tr>
  </tbody>
</table>

<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param list /turtlesim
ros2 param get /turtlesim background_g
ros2 param describe /turtlesim background_r</code></pre>
<pre class="code out" data-lang="출력 (실제 Jazzy)"><code>  background_b
  background_g
  background_r
  holonomic
  qos_overrides./parameter_events.publisher.depth
  …
  use_sim_time
Integer value is: 86
Parameter name: background_r
  Type: integer
  Description: Red channel of the background color
  Constraints:
    Min value: 0
    Max value: 255
    Step: 1</code></pre>
<p><code>describe</code> 결과의 <b>Constraints</b> 는 turtlesim 이 이 파라미터를 선언할 때 "0~255 정수만"이라는 범위를 붙여 두었다는 뜻입니다. 범위를 벗어난 값은 노드가 거절합니다. (이 브라우저 터미널은 제약 줄을 간단히 보여 줍니다)</p>

<p>이제 배경을 보라색 계열로 바꿔 봅시다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param set /turtlesim background_r 150
ros2 param set /turtlesim background_b 200
ros2 service call /clear std_srvs/srv/Empty</code></pre>
<div class="box note"><div class="box-t">📝 왜 /clear 를 부를까?</div>
실제 Jazzy 의 turtlesim 은 <code>/parameter_events</code> 를 지켜보다가 배경을 <b>바로</b> 다시 그립니다. 하지만 예전 배포판의 turtlesim 과 <b>이 브라우저 시뮬레이터</b>는 <code>/clear</code>(또는 <code>/reset</code>) 서비스를 불러야 새 배경색이 칠해집니다. 파라미터를 "언제 읽어서 쓰는지"는 노드를 만든 사람 마음이라는 좋은 예예요. 값만 바뀌고 동작은 안 바뀐다면, 그 노드가 파라미터를 <b>시작할 때 한 번만</b> 읽는 것은 아닌지 의심해 보세요.</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — 나만의 배경색</div>
<ol>
  <li>아래 터미널에서 <code>ros2 param list</code> 를 입력해 <b>모든 노드</b>의 파라미터를 보세요. <code>use_sim_time</code> 은 어느 노드에나 있습니다.</li>
  <li><code>background_r</code> · <code>g</code> · <code>b</code> 를 원하는 값으로 바꾸고 <code>/clear</code> 를 불러 보세요. (0,0,0 = 검정, 255,255,255 = 흰색)</li>
  <li><code>ros2 param set /turtlesim background_g 300</code> 처럼 범위 밖 값이나 <code>"green"</code> 같은 문자열을 넣어 보고 오류 메시지를 읽어 보세요.</li>
  <li><code>ros2 param dump /turtlesim</code> 으로 지금 설정을 YAML 로 출력해 보세요. 다음 절에서 파일로 저장합니다.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=ros2 param 실습 — 배경색 바꾸기|h=400}}`
    },

    /* ================================================================ 4 */
    {
      title: '시작할 때 값 주기 — --ros-args -p',
      html: `
<p>실행 중에 <code>set</code> 으로 바꾼 값은 노드를 끄면 사라집니다. 노드를 <b>켤 때부터</b> 원하는 값으로 시작하려면 <code>ros2 run</code> 뒤에 <code>--ros-args</code> 를 쓰고 <code>-p 이름:=값</code> 을 붙입니다. <code>:=</code> 는 ROS 2 명령줄에서 "이 값으로 바꿔 시작"이라는 뜻의 기호예요.</p>
<pre class="code" data-lang="bash"><code>ros2 run turtlesim turtlesim_node --ros-args -p background_r:=255 -p background_g:=180 -p background_b:=0</code></pre>

<p>이미 이 페이지에 <code>/turtlesim</code> 이 떠 있으니, 아래에서는 <b>네임스페이스</b> <code>/sunset</code> 을 붙여(<code>-r __ns:=/sunset</code>, 10장에서 배웁니다) 이름이 겹치지 않는 두 번째 시뮬레이터 <code>/sunset/turtlesim</code> 을 띄워 봅시다. 새 turtlesim 창이 노란 배경으로 뜹니다. 확인은 <code>ros2 param get /sunset/turtlesim background_g</code>.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtlesim turtlesim_node --ros-args -r __ns:=/sunset -p background_r:=255 -p background_g:=180 -p background_b:=0</code></pre>

<table class="tbl">
  <thead><tr><th>쓰는 법</th><th>의미</th></tr></thead>
  <tbody>
    <tr><td><code>--ros-args</code></td><td>여기서부터는 ROS 가 해석하는 인자라는 표시</td></tr>
    <tr><td><code>-p 이름:=값</code> (<code>--param</code>)</td><td>파라미터 하나를 시작 값으로</td></tr>
    <tr><td><code>--params-file 파일.yaml</code></td><td>YAML 파일의 파라미터를 시작 값으로 (다음 절)</td></tr>
    <tr><td><code>-r 원래:=새것</code></td><td>이름 바꾸기(리매핑) — 10장</td></tr>
  </tbody>
</table>

<div class="box tip"><div class="box-t">💡 여러 개일 때는 -p 를 여러 번</div>
<code>-p a:=1 -p b:=2</code> 처럼 파라미터마다 <code>-p</code> 를 붙입니다. 배열은 <code>-p names:="[a, b]"</code> 처럼 따옴표로 감싸세요. 값이 많아지면 명령이 너무 길어지므로 YAML 파일을 씁니다.</div>`
    },

    /* ================================================================ 5 */
    {
      title: 'YAML 파라미터 파일 — 설정을 저장하고 불러오기',
      html: `
<p>파라미터가 수십 개인 실제 로봇(Nav2 는 수백 개!)은 설정을 <b>YAML 파일</b>에 적어 둡니다. 모양은 항상 같습니다: <b>노드 이름 → <code>ros__parameters</code> → 이름: 값</b>.</p>
{{fig:yaml}}

<pre class="code" data-lang="yaml"><code><span class="cm"># turtlesim.yaml</span>
/turtlesim:
  ros__parameters:
    background_r: 150
    background_g: 60
    background_b: 200

<span class="cm"># 모든 노드에 공통으로 (와일드카드)</span>
/**:
  ros__parameters:
    use_sim_time: false</code></pre>

<h3>저장하기 — dump</h3>
<p>지금 노드의 설정을 파일로 저장하는 가장 쉬운 방법은 <code>dump</code> 결과를 파일로 <b>리다이렉션</b>(<code>&gt;</code>)하는 것입니다. 실제 Ubuntu 에서는 이렇게 씁니다.</p>
<pre class="code" data-lang="bash"><code>ros2 param dump /turtlesim &gt; turtlesim.yaml</code></pre>
<div class="box note"><div class="box-t">📝 --output-dir 은 옛날 옵션</div>
Humble 까지는 <code>ros2 param dump /turtlesim --output-dir .</code> 처럼 폴더를 주면 <code>turtlesim.yaml</code> 을 만들어 주는 옵션이 있었지만, Humble 에서 "리다이렉션을 쓰라"는 경고와 함께 폐기 예정이 되었고 Jazzy 에서는 없어졌습니다. <b>이 브라우저 터미널은 <code>&gt;</code> 리다이렉션을 지원하지 않아서</b>, 실습에서만 <code>--output-dir</code> 로 같은 파일을 만듭니다.</div>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param dump /turtlesim --output-dir .
cat turtlesim.yaml</code></pre>

<h3>불러오기 — load 와 --params-file</h3>
<p>저장한 파일은 두 가지 방법으로 씁니다. <b>실행 중인 노드</b>에는 <code>ros2 param load</code>, <b>새로 켜는 노드</b>에는 <code>--params-file</code> 입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param load /turtlesim turtlesim.yaml
ros2 service call /clear std_srvs/srv/Empty</code></pre>
<pre class="code" data-lang="bash"><code>ros2 run turtlesim turtlesim_node --ros-args --params-file turtlesim.yaml</code></pre>
<p>실제 Jazzy 에서 dump 한 파일을 load 하면 <code>qos_overrides...</code> 줄에서 <code>read-only</code> 라며 실패 메시지가 몇 줄 나옵니다. 읽기 전용 파라미터는 <b>시작할 때만</b> 정할 수 있기 때문이에요. 나머지는 정상으로 적용됩니다.</p>

<div class="box practice"><div class="box-t">🧪 해 보기 — 설정 저장 → 수정 → 다시 적용</div>
<ol>
  <li>위 코드 블록으로 <code>turtlesim.yaml</code> 을 만들고 <code>cat</code> 으로 내용을 봅니다.</li>
  <li><code>nano turtlesim.yaml</code> 로 편집기 창을 열어 <code>background_r</code> · <code>g</code> · <code>b</code> 값을 바꾸고 <kbd>Ctrl</kbd>+<kbd>S</kbd> 로 저장하세요. (들여쓰기 스페이스를 지우지 않게 조심!)</li>
  <li><code>ros2 param load /turtlesim turtlesim.yaml</code> → <code>/clear</code> 로 적용되는지 확인합니다.</li>
  <li>일부러 <code>background_g: 60</code> 을 <code>background_g: 60.5</code> 로 바꿔 load 해 보세요. 그 줄만 실패합니다.</li>
</ol></div>
{{widget:lab|with=turtlesim|title=YAML 파라미터 파일 실습|h=400}}

<div class="box tip"><div class="box-t">💡 YAML 에서 자주 하는 실수</div>
<ul>
  <li><code>ros__parameters</code> 의 밑줄은 <b>두 개</b>입니다. 하나만 쓰면 파라미터가 조용히 무시돼요.</li>
  <li>노드 이름은 <b>네임스페이스까지 포함한 전체 이름</b>(<code>/my_robot/controller</code>)이어야 합니다. 헷갈리면 <code>/**</code> 로 시작해 보세요.</li>
  <li>들여쓰기는 <b>스페이스</b>로만. 탭 문자가 섞이면 YAML 오류가 납니다.</li>
  <li>런치 파일에서 YAML 을 불러오는 방법은 10장에서 다룹니다. 패키지의 <code>config/</code> 폴더에 두고 설치하는 방법은 7장에서 봅니다.</li>
</ul></div>`
    },

    /* ================================================================ 6 */
    {
      title: 'GUI 로 바꾸기 — rqt_reconfigure',
      html: `
<p>숫자를 바꿔 가며 결과를 바로 보고 싶을 때는 <b>rqt_reconfigure</b> 가 편합니다. 왼쪽에서 노드를 고르면 그 노드의 파라미터가 입력칸 · 체크박스로 나오고, 값을 바꾸는 즉시 <code>set_parameters</code> 서비스가 불립니다. 실제 Ubuntu 에서는 이렇게 켭니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run rqt_reconfigure rqt_reconfigure</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 슬라이더처럼 튜닝하기</div>
<ol>
  <li>아래 편집기에서 <code>/turtlesim</code> 을 고르고 <code>background_b</code> 를 0 으로 바꿔 보세요. 성공하면 ✓ 알림이 뜹니다.</li>
  <li>바로 아래 turtlesim 화면의 🧹 clear 버튼을 눌러 색이 바뀌는지 확인하세요.</li>
  <li><code>background_r</code> 에 300 을 넣어 보면 어떤 알림이 뜨나요? 실제 turtlesim 은 0~255 범위 밖 값을 거절합니다.</li>
  <li>다른 노드(예: 위 실습에서 띄운 <code>/sunset/turtlesim</code>)를 골라 그 노드의 파라미터도 바꿔 보세요.</li>
</ol></div>
{{widget:params|node=/turtlesim}}
{{widget:turtlesim|teleop=0}}

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 튜닝은 GUI, 기록은 YAML</div>
PID 게인이나 Nav2 의 속도 제한처럼 "돌려 보며 맞추는" 값은 rqt_reconfigure 로 실시간 튜닝하고, 마음에 드는 값을 찾으면 <code>ros2 param dump</code> 로 저장해 패키지의 YAML 파일에 옮겨 둡니다. 실행 중에 바꾼 값은 노드를 끄면 사라진다는 것을 잊지 마세요.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '코드에서 파라미터 쓰기 — 선언 · 읽기 · 콜백 검증',
      html: `
<p>이제 노드를 만드는 쪽에서 파라미터를 봅시다. rclpy 에서는 세 가지만 기억하면 됩니다.</p>
<ol class="steps-list">
  <li><b>선언</b> — <code>self.declare_parameter('max_speed', 0.5)</code>: 이름과 <b>기본값</b>(= 타입도 결정)</li>
  <li><b>읽기</b> — <code>self.get_parameter('max_speed').value</code>: 쓸 때마다 읽으면 실행 중 변경이 바로 반영됩니다</li>
  <li><b>검사</b> — <code>self.add_on_set_parameters_callback(함수)</code>: 값이 바뀌기 <b>전에</b> 불려서 허락/거절</li>
</ol>

{{fig:validate}}

<pre class="code" data-lang="python" data-run="py" data-with="term"><code>import rclpy
from rclpy.node import Node
from rcl_interfaces.msg import SetParametersResult


class ParamDemo(Node):
    def __init__(self):
        super().__init__('param_demo')
        self.declare_parameter('robot_name', 'webbot')
        self.declare_parameter('max_speed', 0.5)
        self.declare_parameter('debug', False)
        self.add_on_set_parameters_callback(self.on_change)
        self.create_timer(2.0, self.report)

    def on_change(self, params):
        for p in params:
            if p.name == 'max_speed' and p.value &gt; 2.0:
                return SetParametersResult(successful=False, reason='max_speed 는 2.0 이하만 가능')
            self.get_logger().info(f'{p.name} → {p.value}')
        return SetParametersResult(successful=True)

    def report(self):
        name = self.get_parameter('robot_name').value
        speed = self.get_parameter('max_speed').get_parameter_value().double_value
        self.get_logger().info(f'{name}: 최대 속도 {speed} m/s')


def main():
    rclpy.init()
    rclpy.spin(ParamDemo())


if __name__ == '__main__':
    main()</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 문지기 시험하기</div>
<ol>
  <li>아래 실습기에서 <b>▶ 실행</b>. 2초마다 <code>webbot: 최대 속도 0.5 m/s</code> 가 찍힙니다.</li>
  <li>오른쪽 터미널에서 <code>ros2 param set /param_demo max_speed 1.5</code> → 성공, 다음 보고부터 1.5 로 바뀝니다.</li>
  <li><code>ros2 param set /param_demo max_speed 3.0</code> → <b>거절</b>됩니다. 이유 문자열이 그대로 보이는지 확인하세요.</li>
  <li><code>ros2 param set /param_demo robot_name turtlebot</code>, <code>ros2 param set /param_demo max_speed 1</code>(소수점 없음!)도 해 보세요.</li>
</ol></div>
{{widget:pylab|ex=params|with=term}}

<h3>설명 · 범위 · 읽기 전용 — ParameterDescriptor</h3>
<p>선언할 때 <b>설명서(descriptor)</b>를 붙이면 <code>ros2 param describe</code> 에 설명이 나오고, 범위 검사와 읽기 전용 설정도 ROS 가 대신 해 줍니다. turtlesim 의 <code>background_r</code> 에 붙은 0~255 제약이 바로 이것이에요.</p>
<pre class="code" data-lang="python"><code>from rcl_interfaces.msg import ParameterDescriptor, FloatingPointRange

self.declare_parameter(
    'max_speed', 0.5,
    ParameterDescriptor(
        description='최고 속도 (m/s)',
        floating_point_range=[FloatingPointRange(from_value=0.0, to_value=2.0, step=0.0)]))

self.declare_parameter(
    'robot_model', 'webbot',
    ParameterDescriptor(description='로봇 모델 이름', read_only=True))   <span class="cm"># 시작할 때만 정할 수 있음</span></code></pre>
<table class="tbl">
  <thead><tr><th>설명서 항목</th><th>효과</th></tr></thead>
  <tbody>
    <tr><td><code>description</code></td><td><code>ros2 param describe</code> · rqt_reconfigure 에 표시</td></tr>
    <tr><td><code>integer_range</code> · <code>floating_point_range</code></td><td>범위 밖 값은 자동 거절 (rqt 에서는 슬라이더로 표시)</td></tr>
    <tr><td><code>read_only=True</code></td><td>시작할 때(-p, YAML)만 설정 가능, 실행 중 set 은 거절</td></tr>
    <tr><td><code>dynamic_typing=True</code></td><td>타입이 바뀌는 것을 허락 (드물게 사용)</td></tr>
  </tbody>
</table>

<div class="box warn"><div class="box-t">⚠️ 콜백에서 하면 안 되는 일</div>
<code>add_on_set_parameters_callback</code> 콜백은 "이 값을 받아도 되는지 <b>검사</b>"하는 곳입니다. 여기서 다른 파라미터를 바꾸거나 오래 걸리는 일을 하면 안 됩니다. 값이 바뀐 <b>뒤</b>에 무언가를 하고 싶다면 타이머에서 <code>get_parameter()</code> 로 읽거나, rclpy 의 <code>add_post_set_parameters_callback</code>(Iron 이후)을 쓰세요. 자세한 코드는 9장에서 다룹니다.</div>`
    },

    /* ================================================================ 8 */
    {
      title: '모든 노드의 공통 파라미터와 파라미터 이벤트',
      html: `
<h3>use_sim_time — 시뮬레이션 시계 쓰기</h3>
<p><code>ros2 param list</code> 에서 보았듯 <b>모든 노드</b>에는 <code>use_sim_time</code> 파라미터가 있습니다. 기본값 <code>false</code> 면 노드는 컴퓨터의 실제 시계를 쓰고, <code>true</code> 면 <code>/clock</code> 토픽으로 들어오는 <b>시뮬레이션 시간</b>을 씁니다. Gazebo 시뮬레이션이나 <code>ros2 bag play --clock</code> 으로 녹화 데이터를 재생할 때 모든 노드를 <code>true</code> 로 맞춰야 시간이 어긋나지 않습니다(15 · 14장).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 param get /turtlesim use_sim_time</code></pre>
<pre class="code" data-lang="yaml"><code><span class="cm"># 시뮬레이션용 공통 설정 — 모든 노드에 적용</span>
/**:
  ros__parameters:
    use_sim_time: true</code></pre>

<h3>/parameter_events — 누가 무엇을 바꿨나</h3>
<p>파라미터가 선언 · 변경 · 삭제될 때마다 노드는 <code>/parameter_events</code> 토픽(<code>rcl_interfaces/msg/ParameterEvent</code>)으로 알립니다. rqt_reconfigure 가 다른 곳에서 바꾼 값을 곧바로 화면에 반영하는 것도, Jazzy turtlesim 이 배경을 바로 다시 그리는 것도 이 토픽 덕분이에요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 topic echo /parameter_events --once &amp;
ros2 param set /turtlesim background_g 200</code></pre>
{{fig:setFlow}}

<div class="box practice"><div class="box-t">🧪 해 보기 — 변경 소식 엿듣기</div>
<ol>
  <li>위 코드 블록을 실행하면 echo 가 백그라운드(<code>&amp;</code>)에서 <b>메시지 하나</b>(<code>--once</code>)를 기다리고, 바로 이어서 값을 바꿉니다. <code>node: /turtlesim</code> 과 <code>changed_parameters</code> 에 <code>background_g</code> 가 찍히는지 보세요.</li>
  <li>블록을 한 번 더 실행하되 <code>background_g</code> 대신 <code>background_r</code> 을 바꾸도록 명령을 고쳐 터미널에 직접 입력해 보세요.</li>
  <li>실제 Ubuntu 에서는 터미널 하나에 <code>ros2 topic echo /parameter_events</code> 를 계속 띄워 두고, 다른 터미널이나 rqt_reconfigure 에서 값을 바꿔 보면 변경이 줄줄이 찍힙니다.</li>
</ol></div>

{{fig:layers}}

<table class="tbl">
  <thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
  <tbody>
    <tr><td><code>Node not found</code></td><td>노드 이름 오타, 또는 노드가 안 떠 있음</td><td><code>ros2 node list</code> 로 정확한 이름(앞의 <code>/</code> 포함) 확인</td></tr>
    <tr><td><code>Parameter not set</code> · 선언되지 않음</td><td>노드가 그 이름을 <code>declare</code> 하지 않았음</td><td><code>ros2 param list 노드</code> 로 이름 확인</td></tr>
    <tr><td><code>Wrong parameter type</code></td><td>1 과 1.0, 문자열 등 타입 불일치</td><td>double 에는 소수점, 문자열은 따옴표</td></tr>
    <tr><td>값은 바뀌었는데 동작이 그대로</td><td>노드가 시작할 때 한 번만 읽음</td><td>노드 문서 확인, 재시작 또는 관련 서비스 호출</td></tr>
    <tr><td>YAML 값이 적용 안 됨</td><td>노드 이름 불일치, <code>ros__parameters</code> 오타</td><td>전체 노드 이름 또는 <code>/**</code> 사용</td></tr>
  </tbody>
</table>`
    }
  ],

  videos: [
    { title: 'ROS2 - YAML Parameters', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=wY8MrBGVxYA', lang: 'en', min: '18분', desc: 'YAML 파라미터 파일을 만들고 ros2 run · 런치 파일에서 불러오는 과정. 5절과 함께 보세요.' },
    { title: 'ROS2 - rclpy Parameter Callback Tutorial [Python]', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=Pu_GPCvbuY4', lang: 'en', min: '15분', desc: '파라미터 콜백으로 값을 검사하고 반영하는 파이썬 코드. 7절 실습의 확장판입니다.' },
    { title: 'ROS2 Parameters', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=QQLOk8l2lEo', lang: 'en', min: '4분', desc: 'turtlesim 배경색으로 ros2 param 명령을 4분 만에 훑어봅니다.' },
    { title: '[ROS2 Q&A] 229 - How to use ROS2 parameters', channel: 'The Construct Robotics Institute', url: 'https://www.youtube.com/watch?v=EQE6xTqJ1u8', lang: 'en', min: '20분', desc: '노드에서 파라미터를 선언하고 명령줄 · YAML 로 값을 주는 전체 흐름.' },
    { title: '[ROS2] 4-2. 터미널에서 파라미터 다루기 - 실습', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=37aWwi8Fx-Q', lang: 'ko', min: '5분', desc: 'ros2 param 명령을 한국어로 짧게 실습합니다.' },
    { title: '[ROS2] 4-5. Parameter reconfigure', channel: '핑크랩 PinkLAB', url: 'https://www.youtube.com/watch?v=UPwzchFwlHI', lang: 'ko', min: '2분', desc: 'rqt_reconfigure 로 파라미터를 GUI 에서 바꾸는 모습 (6절).' }
  ],

  terms: [
    ['파라미터(parameter)', '노드가 밖에 드러내는 이름 붙은 설정값. 노드마다 따로 있고 이름 · 타입 · 값을 가짐'],
    ['declare_parameter', '노드가 "이런 파라미터가 있다"고 선언하는 함수. 기본값이 타입을 정함'],
    ['ros2 param', 'list · get · set · describe · dump · load 로 파라미터를 다루는 명령. 속은 파라미터 서비스 호출'],
    ['--ros-args -p', '노드를 시작할 때 파라미터 값을 주는 명령줄 인자. 형식 -p 이름:=값'],
    ['YAML 파라미터 파일', '노드이름 → ros__parameters → 이름: 값 구조로 파라미터를 적어 둔 파일'],
    ['ros__parameters', 'YAML 파라미터 파일에서 파라미터 목록이 시작됨을 알리는 예약어 (밑줄 두 개)'],
    ['/** 와일드카드', 'YAML 파라미터 파일에서 "모든 노드"에 적용하라는 노드 이름 자리 표기'],
    ['--params-file', '노드를 시작할 때 YAML 파일의 파라미터를 적용하는 인자'],
    ['ros2 param dump · load', '노드의 파라미터를 YAML 로 출력하기 / YAML 값을 실행 중인 노드에 적용하기'],
    ['파라미터 콜백', 'add_on_set_parameters_callback 으로 등록. 값이 바뀌기 전에 검사해 SetParametersResult 로 허락/거절'],
    ['ParameterDescriptor', '파라미터의 설명 · 범위(integer_range, floating_point_range) · read_only 등을 담는 설명서'],
    ['read_only', '시작할 때만 정할 수 있고 실행 중에는 바꿀 수 없는 파라미터 설정'],
    ['use_sim_time', '모든 노드에 있는 bool 파라미터. true 면 /clock 토픽의 시뮬레이션 시간을 사용'],
    ['/parameter_events', '파라미터 선언 · 변경 · 삭제를 알리는 토픽 (rcl_interfaces/msg/ParameterEvent)'],
    ['rqt_reconfigure', '노드의 파라미터를 GUI 로 보고 실시간으로 바꾸는 rqt 도구']
  ],

  summary: [
    '파라미터 = <b>노드마다 달린 설정 손잡이</b>. 코드를 고치지 않고 동작을 바꾼다 (🎮 게임 설정 메뉴)',
    '타입: bool · integer · double · string · 각종 배열. <b>1 과 1.0 은 다른 타입</b>',
    '<code>ros2 param list / get / set / describe / dump / load</code> — 속은 노드의 파라미터 서비스 호출',
    '시작 값은 <code>--ros-args -p 이름:=값</code> 또는 <code>--params-file 파일.yaml</code>',
    'YAML: <code>/노드이름:</code> → <code>ros__parameters:</code> → <code>이름: 값</code>, <code>/**</code> 는 모든 노드. 저장은 <code>ros2 param dump 노드 &gt; 파일</code>',
    '코드: <code>declare_parameter</code> → <code>get_parameter</code>, 잘못된 값은 <b>set 콜백</b>이나 descriptor 범위 · read_only 로 거절',
    '모든 노드에 <code>use_sim_time</code> 이 있고, 모든 변경은 <code>/parameter_events</code> 로 알려진다'
  ],

  quiz: [
    { q: 'ROS 2 파라미터에 대한 설명으로 옳은 것은?', options: ['모든 노드가 함께 쓰는 중앙 파라미터 서버에 저장된다', '각 노드가 자기 파라미터를 가지며, 노드가 꺼지면 실행 중에 바꾼 값은 사라진다', '파라미터는 노드를 시작할 때만 정할 수 있다', '파라미터 이름은 모든 노드에서 겹칠 수 없다'], answer: 1, explain: 'ROS 2 에는 ROS 1 식 중앙 파라미터 서버가 없습니다. 각 노드가 자기 파라미터를 갖고, 실행 중에도 바꿀 수 있으며(read_only 제외), 다른 노드와 같은 이름을 써도 됩니다.' },
    { q: '<code>/turtlesim</code> 의 <code>background_r</code> 을 100 으로 바꾸는 명령은?', options: ['ros2 param set background_r 100', 'ros2 param set /turtlesim background_r 100', 'ros2 param get /turtlesim background_r 100', 'ros2 topic pub /turtlesim background_r 100'], answer: 1, explain: '형식은 ros2 param set 노드 이름 값 입니다. 파라미터는 노드마다 따로 있으므로 노드 이름이 꼭 필요합니다.' },
    { q: 'double 타입 파라미터 <code>max_speed</code> 에 값을 줄 때 가장 안전한 표기는?', options: ['max_speed:=1', 'max_speed:=1.0', "max_speed:='one'", 'max_speed:=true'], answer: 1, explain: '명령줄과 YAML 에서는 값의 모양으로 타입이 정해집니다. 1 은 integer 로 읽히므로 double 에는 1.0 처럼 소수점을 붙이세요.' },
    { q: 'YAML 파라미터 파일에서 <b>반드시</b> 노드 이름 바로 아래에 와야 하는 키는?', options: ['parameters', 'ros_parameters', 'ros__parameters', 'params'], answer: 2, explain: 'ros__parameters(밑줄 두 개)입니다. 철자가 틀리면 파라미터가 적용되지 않습니다.' },
    { q: '파라미터 콜백에서 <code>SetParametersResult(successful=False, reason=...)</code> 를 돌려주면?', options: ['값은 바뀌고 경고만 출력된다', '노드가 종료된다', '값은 바뀌지 않고 요청한 쪽에 실패와 이유가 전달된다', '다음 값으로 자동 재시도한다'], answer: 2, explain: '콜백은 값이 바뀌기 전에 불리는 문지기입니다. 거절하면 값은 그대로이고 ros2 param set 에 "Setting parameter failed: 이유" 가 표시됩니다.' },
    { q: 'Gazebo 시뮬레이션과 함께 노드들을 실행할 때 모든 노드에 <code>true</code> 로 맞춰야 하는 공통 파라미터는?', options: ['use_sim_time', 'holonomic', 'read_only', 'qos_overrides'], answer: 0, explain: 'use_sim_time 이 true 면 노드가 /clock 토픽의 시뮬레이션 시간을 씁니다. 모든 노드가 같은 시계를 써야 TF · 메시지 시각이 어긋나지 않습니다.' }
  ],

  slides: [
    {
      title: '코드를 고치지 않고 바꾸기',
      layout: 'center',
      html: `<div class="s-big">게임 밝기를 바꾸려고<br>코드를 고치나요? 🎮</div>
<p class="s-center step">→ 노드에도 <b>설정 메뉴</b>가 있다 = <b>파라미터</b></p>`,
      notes: '설정 메뉴 비유로 시작합니다. 로봇에서는 최고 속도, 센서 이름, 지도 경로 같은 것이 설정 메뉴 항목이라는 예를 학생들에게 떠올려 보게 하세요. (2분)'
    },
    {
      title: '노드의 설정 손잡이',
      html: `{{fig:knobs|nocap}}`,
      notes: '파라미터는 노드마다 따로, 이름 · 타입 · 값 세 가지를 가진다는 점을 짚습니다. use_sim_time 은 모든 노드에 있다는 것도 미리 말해 두세요. (3분)'
    },
    {
      title: '타입 — 1 과 1.0 은 다르다',
      html: `<div class="cards c4">
<div class="card gray step"><div class="ci">☑️</div><b>bool</b><p>true</p></div>
<div class="card blue step"><div class="ci">🔢</div><b>integer</b><p>150</p></div>
<div class="card teal step"><div class="ci">📏</div><b>double</b><p>0.5 · 2.0</p></div>
<div class="card orange step"><div class="ci">🔤</div><b>string</b><p>'base_link'</p></div>
</div>
<p class="s-small step">+ 배열: [1.0, 2.0] · [a, b]</p>`,
      notes: '“max_speed:=1 로 주면 무슨 일이?” 하고 물어 integer 로 읽힌다는 함정을 짚습니다. double 에는 항상 소수점! (3분)'
    },
    {
      title: 'ros2 param 6형제',
      html: `<div class="s-points">
<p class="step"><code>list</code> — 이름 목록</p>
<p class="step"><code>get</code> · <code>set</code> — 읽기 · 쓰기</p>
<p class="step"><code>describe</code> — 설명 · 범위</p>
<p class="step"><code>dump</code> · <code>load</code> — YAML 저장 · 적용</p>
</div>`,
      notes: '명령 뒤에는 항상 노드 이름이 온다는 규칙을 강조합니다. 다음 슬라이드의 실습으로 바로 넘어갑니다. (2분)'
    },
    {
      title: '실습 — 배경색 바꾸기',
      html: `{{widget:lab|with=turtlesim|h=440}}`,
      notes: 'param list → get → set background_r 150 → /clear 순서로 시연합니다. 학생들에게 좋아하는 색으로 바꾸게 하고, 범위 밖 값(300)이나 문자열을 넣으면 어떻게 되는지 실험하게 하세요. (10분)'
    },
    {
      title: 'set 의 속',
      html: `{{fig:setFlow|nocap}}`,
      notes: '4장의 파라미터 서비스와 연결하는 그림입니다. 노드 안의 검사(타입 · 범위 · 콜백)를 통과해야 값이 바뀌고, 바뀌면 /parameter_events 로 방송된다는 두 가지를 짚으세요. (4분)'
    },
    {
      title: '시작할 때 값 주기',
      html: `<pre class="code" data-lang="bash"><code>ros2 run turtlesim turtlesim_node --ros-args \\
  -p background_r:=255 -p background_g:=180 -p background_b:=0</code></pre>
<p class="s-small step"><code>--ros-args</code> 뒤 · 파라미터마다 <code>-p 이름:=값</code></p>`,
      notes: '실행 중에 set 한 값은 노드를 끄면 사라진다는 문제에서 출발합니다. := 기호는 ROS 2 명령줄 규칙이라는 것도 설명하세요. (3분)'
    },
    {
      title: 'YAML 파라미터 파일',
      html: `{{fig:yaml|nocap}}`,
      notes: '노드 이름 → ros__parameters → 이름: 값, 세 층만 기억하면 됩니다. 밑줄 두 개, 스페이스 들여쓰기를 강조하세요. /** 는 “모든 노드”. (4분)'
    },
    {
      title: '저장하고 다시 쓰기',
      html: `<pre class="code" data-lang="bash"><code>ros2 param dump /turtlesim &gt; turtlesim.yaml
ros2 param load /turtlesim turtlesim.yaml
ros2 run turtlesim turtlesim_node --ros-args --params-file turtlesim.yaml</code></pre>`,
      notes: '실행 중인 노드에는 load, 새로 켜는 노드에는 --params-file 이라는 차이를 강조합니다. Jazzy 에서는 --output-dir 대신 리다이렉션(>)을 쓴다는 것도 한마디 해 주세요. (4분)'
    },
    {
      title: '값이 정해지는 순서',
      html: `{{fig:layers|nocap}}`,
      notes: '코드 기본값 → 시작 값 → 실행 중 변경. 뒤 단계가 앞 단계를 덮어씁니다. read_only 는 세 번째 단계가 막혀 있다는 것도 짚습니다. (3분)'
    },
    {
      title: '콜백 = 문지기',
      html: `{{fig:validate|nocap}}`,
      notes: 'pylab params 예제를 실행해 max_speed 1.5 는 통과, 3.0 은 거절되는 것을 시연합니다. “로봇이 너무 빨리 달리지 않게 막는 안전장치”라는 실무적 의미를 강조하세요. (5분)'
    },
    {
      title: '모든 노드의 공통점',
      html: `<div class="cards c2">
<div class="card yellow step"><div class="ci">⏰</div><b>use_sim_time</b><p>true → /clock 시뮬레이션 시간</p></div>
<div class="card green step"><div class="ci">📣</div><b>/parameter_events</b><p>누가 무엇을 바꿨는지 방송</p></div>
</div>`,
      notes: 'use_sim_time 은 시뮬레이션 · bag 재생 때 꼭 맞춰야 하는 값이라는 것을 15 · 14장 예고로 말합니다. /parameter_events 는 rqt_reconfigure 가 화면을 갱신하는 비결입니다. (3분)'
    }
  ]
});
