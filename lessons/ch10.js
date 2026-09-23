/* 10장 — 런치 파일로 여러 노드 한 번에 */
Course.lesson({
  id: 'ch10', no: '10',
  icon: '🚀',
  title: '런치 파일로 여러 노드 한 번에',
  subtitle: '터미널 열 개 대신 명령 한 줄 — 로봇 전체를 켜는 스위치를 만들어 봅시다',
  level: '기초', time: '120분',
  goals: [
    '런치 파일이 필요한 이유를 말하고 ros2 launch 로 실행할 수 있다',
    'Python 런치 파일의 구조(generate_launch_description · LaunchDescription · Node)와 Node 의 주요 인자를 설명할 수 있다',
    '리매핑 · 네임스페이스 · 파라미터(YAML) · 런치 인자 · include 를 런치 파일에 적용할 수 있다',
    '같은 내용을 XML · YAML 런치 형식으로 읽을 수 있다',
    '내 패키지에 런치 파일을 만들고 setup.py(또는 CMakeLists.txt)로 설치해 실행할 수 있다'
  ],
  teacher: {
    intro: '"로봇 한 대를 켜려면 카메라, 라이다, 모터 드라이버, SLAM, 내비게이션… 노드가 스무 개쯤 됩니다. 터미널 스무 개를 열고 명령을 스무 번 칠 건가요?" 하고 물은 뒤, TurtleBot 이나 Nav2 가 명령 한 줄로 켜지는 이유가 런치 파일이라고 소개합니다. (2분)',
    flow: '① 왜 런치? · multisim 실행 10분 → ② Python 런치 해부(turtles 위젯) 20분 → ③ 리매핑 · 네임스페이스(mimic · ns 위젯) 20분 → ④ 인자 · 파라미터 · YAML(params 위젯) 15분 → ⑤ include · 그룹 10분 → ⑥ XML · YAML 형식 10분 → ⑦ 내 패키지에 런치 설치 따라 하기 25분 → ⑧ 이벤트 핸들러 · 흔한 실수 · 퀴즈 10분'
  },

  figs: {
    /* ------------------------------------------------------------ 터미널 지옥 vs 런치 */
    whyLaunch: {
      caption: '노드마다 터미널을 여는 대신, 런치 파일 하나가 여러 노드를 설정과 함께 한꺼번에 켭니다',
      svg: `<svg class="dg" viewBox="0 0 880 340" role="img" aria-label="터미널 여러 개로 노드를 하나씩 켜는 방법과 런치 파일 하나로 모두 켜는 방법 비교">
  <rect x="20" y="20" width="400" height="300" rx="14" class="red"/>
  <text x="220" y="48" class="t-b t-c t-red">😵 터미널 여러 개</text>
  <rect x="40" y="66" width="170" height="44" rx="6" class="box"/>
  <text x="125" y="88" class="t-xs t-c t-mono">$ ros2 run turtlesim …</text>
  <rect x="230" y="66" width="170" height="44" rx="6" class="box"/>
  <text x="315" y="88" class="t-xs t-c t-mono">$ ros2 run turtlesim …</text>
  <rect x="40" y="122" width="170" height="44" rx="6" class="box"/>
  <text x="125" y="144" class="t-xs t-c t-mono">$ ros2 run … mimic -r …</text>
  <rect x="230" y="122" width="170" height="44" rx="6" class="box"/>
  <text x="315" y="144" class="t-xs t-c t-mono">$ ros2 param set …</text>
  <rect x="40" y="178" width="170" height="44" rx="6" class="box"/>
  <text x="125" y="200" class="t-xs t-c t-mono">$ ros2 run rviz2 …</text>
  <rect x="230" y="178" width="170" height="44" rx="6" class="box"/>
  <text x="315" y="200" class="t-xs t-c t-mono">$ ros2 run …</text>
  <text x="220" y="256" class="t-sm t-c">순서 · 옵션 · 이름을 매번 손으로</text>
  <text x="220" y="280" class="t-sm t-c">하나 빠뜨리면 로봇이 이상하게 동작</text>
  <text x="220" y="304" class="t-xs t-c t-mu">끌 때도 하나씩 Ctrl+C</text>

  <line x1="430" y1="170" x2="470" y2="170" class="ln thick ar"/>

  <rect x="480" y="20" width="380" height="300" rx="14" class="green"/>
  <text x="670" y="48" class="t-b t-c t-green">😎 런치 파일 하나</text>
  <rect x="500" y="66" width="340" height="44" rx="6" class="box"/>
  <text x="670" y="88" class="t-sm t-c t-mono t-b">$ ros2 launch my_pkg robot.launch.py</text>
  <line x1="670" y1="110" x2="670" y2="136" class="ln-green ar-green"/>
  <ellipse cx="560" cy="170" rx="54" ry="22" class="blue"/>
  <text x="560" y="170" class="t-xs t-c t-b t-blue">sim1</text>
  <ellipse cx="670" cy="170" rx="54" ry="22" class="blue"/>
  <text x="670" y="170" class="t-xs t-c t-b t-blue">sim2</text>
  <ellipse cx="780" cy="170" rx="54" ry="22" class="blue"/>
  <text x="780" y="170" class="t-xs t-c t-b t-blue">mimic</text>
  <ellipse cx="615" cy="220" rx="54" ry="22" class="blue"/>
  <text x="615" y="220" class="t-xs t-c t-b t-blue">rviz2</text>
  <ellipse cx="725" cy="220" rx="54" ry="22" class="blue"/>
  <text x="725" y="220" class="t-xs t-c t-b t-blue">…</text>
  <text x="670" y="268" class="t-sm t-c">이름 · 네임스페이스 · 파라미터 · 리매핑</text>
  <text x="670" y="290" class="t-sm t-c">모두 파일에 기록 → 언제나 똑같이 실행</text>
  <text x="670" y="310" class="t-xs t-c t-mu">Ctrl+C 한 번이면 모두 종료</text>
</svg>`
    },

    /* ------------------------------------------------------------ 런치 파일 해부 */
    anatomy: {
      caption: 'Python 런치 파일의 구조 — generate_launch_description() 이 "할 일(action) 목록"인 LaunchDescription 을 돌려줍니다',
      svg: `<svg class="dg" viewBox="0 0 880 380" role="img" aria-label="generate_launch_description 함수가 LaunchDescription에 Node 액션들을 담아 반환하고, Node의 package, executable, name, namespace, parameters, remappings, output 인자의 의미">
  <rect x="20" y="20" width="440" height="340" rx="14" class="box"/>
  <text x="40" y="48" class="t-sm t-mono t-mu">from launch import LaunchDescription</text>
  <text x="40" y="70" class="t-sm t-mono t-mu">from launch_ros.actions import Node</text>
  <text x="40" y="104" class="t-sm t-mono t-b">def <tspan class="t-purple">generate_launch_description</tspan>():</text>
  <text x="60" y="130" class="t-sm t-mono">return <tspan class="t-teal t-b">LaunchDescription</tspan>([</text>
  <rect x="80" y="144" width="360" height="178" rx="10" class="blue"/>
  <text x="96" y="168" class="t-sm t-mono t-blue t-b">Node(</text>
  <text x="116" y="192" class="t-xs t-mono">package='turtlesim',</text>
  <text x="116" y="212" class="t-xs t-mono">executable='turtlesim_node',</text>
  <text x="116" y="232" class="t-xs t-mono">name='sim',</text>
  <text x="116" y="252" class="t-xs t-mono">namespace='turtlesim1',</text>
  <text x="116" y="272" class="t-xs t-mono">parameters=[{'background_r': 30}],</text>
  <text x="116" y="292" class="t-xs t-mono">remappings=[('/a', '/b')], output='screen'),</text>
  <text x="96" y="312" class="t-xs t-mono t-mu"># Node(...) 를 더 넣으면 함께 실행</text>
  <text x="60" y="346" class="t-sm t-mono">])</text>

  <rect x="480" y="20" width="380" height="340" rx="14" class="teal"/>
  <text x="670" y="48" class="t-b t-c t-teal">Node 인자 = ros2 run 옵션</text>
  <text x="496" y="84" class="t-xs t-mono t-b">package · executable</text>
  <text x="496" y="102" class="t-xs">→ ros2 run <tspan class="t-mono">turtlesim turtlesim_node</tspan></text>
  <text x="496" y="132" class="t-xs t-mono t-b">name</text>
  <text x="496" y="150" class="t-xs">→ <tspan class="t-mono">--ros-args -r __node:=sim</tspan></text>
  <text x="496" y="180" class="t-xs t-mono t-b">namespace</text>
  <text x="496" y="198" class="t-xs">→ <tspan class="t-mono">-r __ns:=/turtlesim1</tspan></text>
  <text x="496" y="228" class="t-xs t-mono t-b">parameters</text>
  <text x="496" y="246" class="t-xs">→ <tspan class="t-mono">-p background_r:=30</tspan> (또는 YAML 경로)</text>
  <text x="496" y="276" class="t-xs t-mono t-b">remappings</text>
  <text x="496" y="294" class="t-xs">→ <tspan class="t-mono">-r /a:=/b</tspan></text>
  <text x="496" y="324" class="t-xs t-mono t-b">output='screen'</text>
  <text x="496" y="342" class="t-xs">→ 노드의 출력(print 등)을 터미널에 표시</text>
</svg>`
    },

    /* ------------------------------------------------------------ mimic 리매핑 */
    mimic: {
      caption: 'turtlesim_mimic_launch — 두 거북이는 네임스페이스로 나누고, mimic 의 input/output 토픽을 리매핑으로 이어 붙입니다',
      svg: `<svg class="dg" viewBox="0 0 880 330" role="img" aria-label="turtlesim1 sim의 pose를 mimic이 받아 turtlesim2의 cmd_vel로 보내는 rqt_graph 모양의 그림">
  <rect x="20" y="126" width="170" height="44" rx="6" class="green"/>
  <text x="105" y="148" class="t-xs t-c t-b t-green">/turtlesim1/turtle1/cmd_vel</text>
  <line x1="190" y1="148" x2="230" y2="148" class="ln-green thick ar-green"/>
  <ellipse cx="300" cy="148" rx="68" ry="26" class="blue"/>
  <text x="300" y="148" class="t-sm t-c t-b t-blue">/turtlesim1/sim</text>
  <line x1="300" y1="174" x2="300" y2="226" class="ln-green thick ar-green"/>
  <rect x="210" y="228" width="180" height="44" rx="6" class="green"/>
  <text x="300" y="250" class="t-xs t-c t-b t-green">/turtlesim1/turtle1/pose</text>
  <line x1="390" y1="250" x2="450" y2="250" class="ln-green thick ar-green"/>
  <ellipse cx="510" cy="250" rx="58" ry="26" class="blue"/>
  <text x="510" y="250" class="t-sm t-c t-b t-blue">/mimic</text>
  <line x1="568" y1="250" x2="610" y2="250" class="ln-green thick ar-green"/>
  <rect x="612" y="228" width="180" height="44" rx="6" class="green"/>
  <text x="702" y="250" class="t-xs t-c t-b t-green">/turtlesim2/turtle1/cmd_vel</text>
  <line x1="702" y1="228" x2="702" y2="176" class="ln-green thick ar-green"/>
  <ellipse cx="702" cy="148" rx="68" ry="26" class="blue"/>
  <text x="702" y="148" class="t-sm t-c t-b t-blue">/turtlesim2/sim</text>
  <line x1="390" y1="250" x2="450" y2="250" class="ln-green moving"/>

  <rect x="400" y="20" width="460" height="92" rx="12" class="orange"/>
  <text x="630" y="44" class="t-sm t-c t-b t-orange">mimic 코드 속 이름 → 리매핑 후 이름</text>
  <text x="420" y="70" class="t-xs t-mono">/input/pose     → /turtlesim1/turtle1/pose</text>
  <text x="420" y="94" class="t-xs t-mono">/output/cmd_vel → /turtlesim2/turtle1/cmd_vel</text>
  <text x="40" y="40" class="t-sm t-b">🐢 거북이1을 움직이면</text>
  <text x="40" y="62" class="t-sm t-b">🐢 거북이2가 똑같이 따라 함</text>
  <text x="440" y="310" class="t-xs t-c t-mu">노드 코드는 그대로 — 토픽 이름만 바꿔 연결 (코드 재사용의 핵심)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 네임스페이스 */
    ns: {
      caption: '같은 노드 묶음을 네임스페이스만 바꿔 두 번 — 상대 이름(chatter)은 /robot1/chatter, /robot2/chatter 로 자동 분리됩니다',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="robot1과 robot2 네임스페이스 안에 각각 talker, chatter, listener가 분리된 모습">
  <rect x="20" y="20" width="410" height="200" rx="14" class="purple"/>
  <text x="225" y="46" class="t-b t-c t-purple">namespace: /robot1</text>
  <ellipse cx="100" cy="130" rx="66" ry="24" class="blue"/>
  <text x="100" y="130" class="t-xs t-c t-b t-blue">/robot1/talker</text>
  <line x1="166" y1="130" x2="176" y2="130" class="ln-green ar-green"/>
  <rect x="178" y="110" width="110" height="40" rx="6" class="green"/>
  <text x="233" y="130" class="t-xs t-c t-b t-green">/robot1/chatter</text>
  <line x1="288" y1="130" x2="300" y2="130" class="ln-green ar-green"/>
  <ellipse cx="360" cy="130" rx="60" ry="24" class="blue"/>
  <text x="360" y="130" class="t-xs t-c t-b t-blue">/robot1/listener</text>

  <rect x="450" y="20" width="410" height="200" rx="14" class="teal"/>
  <text x="655" y="46" class="t-b t-c t-teal">namespace: /robot2</text>
  <ellipse cx="530" cy="130" rx="66" ry="24" class="blue"/>
  <text x="530" y="130" class="t-xs t-c t-b t-blue">/robot2/talker</text>
  <line x1="596" y1="130" x2="606" y2="130" class="ln-green ar-green"/>
  <rect x="608" y="110" width="110" height="40" rx="6" class="green"/>
  <text x="663" y="130" class="t-xs t-c t-b t-green">/robot2/chatter</text>
  <line x1="718" y1="130" x2="730" y2="130" class="ln-green ar-green"/>
  <ellipse cx="790" cy="130" rx="60" ry="24" class="blue"/>
  <text x="790" y="130" class="t-xs t-c t-b t-blue">/robot2/listener</text>

  <text x="440" y="250" class="t-sm t-c">상대 이름 <tspan class="t-mono">chatter</tspan> → <tspan class="t-mono">/네임스페이스/chatter</tspan> · 절대 이름 <tspan class="t-mono">/chatter</tspan> 는 그대로 (공유됨)</text>
  <text x="440" y="276" class="t-xs t-c t-mu">그래서 노드 코드에서는 가능하면 앞에 / 없는 상대 이름을 쓰는 것이 좋습니다</text>
</svg>`
    },

    /* ------------------------------------------------------------ include 트리 */
    include: {
      caption: '큰 시스템은 런치 파일을 나눠 두고 bringup 파일이 include 로 조립합니다 (Nav2 · TurtleBot 이 이 구조)',
      svg: `<svg class="dg" viewBox="0 0 880 300" role="img" aria-label="robot_bringup.launch.py가 description, sensors, navigation 런치 파일을 include하는 트리">
  <rect x="320" y="20" width="240" height="56" rx="12" class="purple"/>
  <text x="440" y="44" class="t-b t-c t-purple">robot_bringup.launch.py</text>
  <text x="440" y="64" class="t-xs t-c">인자: use_sim_time, robot_name</text>
  <line x1="380" y1="76" x2="150" y2="140" class="ln-purple ar-purple"/>
  <line x1="440" y1="76" x2="440" y2="140" class="ln-purple ar-purple"/>
  <line x1="500" y1="76" x2="730" y2="140" class="ln-purple ar-purple"/>
  <text x="250" y="104" class="t-xs t-purple">IncludeLaunchDescription</text>
  <rect x="40" y="142" width="220" height="56" rx="12" class="box"/>
  <text x="150" y="166" class="t-sm t-c t-b">description.launch.py</text>
  <text x="150" y="186" class="t-xs t-c t-mu">robot_state_publisher</text>
  <rect x="330" y="142" width="220" height="56" rx="12" class="box"/>
  <text x="440" y="166" class="t-sm t-c t-b">sensors.launch.py</text>
  <text x="440" y="186" class="t-xs t-c t-mu">lidar · camera 드라이버</text>
  <rect x="620" y="142" width="220" height="56" rx="12" class="box"/>
  <text x="730" y="166" class="t-sm t-c t-b">navigation.launch.py</text>
  <text x="730" y="186" class="t-xs t-c t-mu">(다른 패키지의 런치)</text>
  <line x1="730" y1="198" x2="730" y2="232" class="ln ar"/>
  <rect x="640" y="234" width="180" height="44" rx="10" class="gray"/>
  <text x="730" y="256" class="t-xs t-c">nav2_bringup/…launch.py</text>
  <text x="300" y="254" class="t-sm t-c">경로 찾기: <tspan class="t-mono">FindPackageShare('pkg')</tspan></text>
  <text x="300" y="276" class="t-xs t-c t-mu">→ install/pkg/share/pkg (설치된 위치)</text>
</svg>`
    },

    /* ------------------------------------------------------------ 설치 경로 */
    install: {
      caption: 'ros2 launch 는 src 가 아니라 install/…/share/패키지/ 에서 런치 파일을 찾습니다 — 그래서 "설치" 등록이 필요합니다',
      svg: `<svg class="dg" viewBox="0 0 880 280" role="img" aria-label="src의 launch 폴더가 colcon build로 install share 폴더에 복사되고 ros2 launch가 그곳에서 파일을 찾는 흐름">
  <rect x="20" y="30" width="270" height="200" rx="14" class="box"/>
  <text x="155" y="56" class="t-b t-c">📁 src/my_pkg/</text>
  <text x="44" y="90" class="t-sm t-mono">├── launch/</text>
  <text x="44" y="114" class="t-sm t-mono t-orange t-b">│   └── two_turtles.launch.py</text>
  <text x="44" y="138" class="t-sm t-mono">├── my_pkg/</text>
  <text x="44" y="162" class="t-sm t-mono t-blue t-b">├── setup.py  ← data_files</text>
  <text x="44" y="186" class="t-sm t-mono">└── package.xml</text>

  <line x1="290" y1="130" x2="370" y2="130" class="ln-green thick ar-green"/>
  <text x="330" y="112" class="t-xs t-c t-green t-b">colcon build</text>
  <text x="330" y="152" class="t-xs t-c t-mu">복사(설치)</text>

  <rect x="372" y="30" width="300" height="200" rx="14" class="green"/>
  <text x="522" y="56" class="t-b t-c t-green">📁 install/my_pkg/share/my_pkg/</text>
  <text x="396" y="94" class="t-sm t-mono">├── launch/</text>
  <text x="396" y="118" class="t-sm t-mono t-orange t-b">│   └── two_turtles.launch.py</text>
  <text x="396" y="142" class="t-sm t-mono">└── package.xml</text>
  <text x="522" y="190" class="t-xs t-c">data_files 에 등록 안 하면</text>
  <text x="522" y="208" class="t-xs t-c t-red t-b">이 폴더에 launch/ 가 없음!</text>

  <line x1="672" y1="130" x2="712" y2="130" class="ln ar2"/>
  <rect x="714" y="80" width="146" height="100" rx="12" class="purple"/>
  <text x="787" y="110" class="t-sm t-c t-b t-purple">ros2 launch</text>
  <text x="787" y="134" class="t-xs t-c t-mono">my_pkg</text>
  <text x="787" y="154" class="t-xs t-c t-mono">two_turtles.launch.py</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '왜 런치 파일인가?',
      html: `
<p>지금까지는 노드 하나를 켤 때마다 터미널을 열어 <code>ros2 run</code> 을 쳤습니다. 거북이 두 마리와 mimic 노드만 해도 터미널 세 개, 옵션도 길죠. 실제 로봇은 노드가 수십 개입니다. <b>런치 파일(launch file)</b>은 "어떤 노드를, 어떤 이름 · 설정으로 켤지"를 적어 둔 <b>실행 계획서</b>입니다.</p>
{{fig:whyLaunch}}
<div class="box analogy"><div class="box-t">🍳 비유 — 식당의 오픈 체크리스트</div>
문 열 때마다 "가스 켜고, 냉장고 확인하고, 조명 켜고…"를 기억에 의존하면 꼭 하나씩 빠뜨립니다. 체크리스트(런치 파일)를 벽에 붙여 두면 누가 와도 <b>똑같이</b> 가게를 열 수 있어요.</div>
<p>실행 명령은 <code>ros2 launch 패키지 런치파일</code> 입니다. turtlesim 패키지에 들어 있는 <code>multisim.launch.py</code> 를 실행해 봅시다. 거북이 창이 <b>두 개</b> 뜹니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch turtlesim multisim.launch.py</code></pre>
<p>다른 터미널(칩)에서 무엇이 켜졌는지 확인합니다. 두 노드가 <code>/turtlesim1</code>, <code>/turtlesim2</code> 네임스페이스로 나뉘어 있어 토픽 이름이 겹치지 않습니다.</p>
{{widget:term|chips=ros2 launch turtlesim multisim.launch.py &;ros2 node list;ros2 topic list;ros2 node info /turtlesim2/turtlesim}}
<div class="box note"><div class="box-t">📝 런치 파일의 세 가지 형식</div>
ROS 2 런치 파일은 <b>Python</b>(<code>.launch.py</code>), <b>XML</b>(<code>.launch.xml</code>), <b>YAML</b>(<code>.launch.yaml</code>)로 쓸 수 있습니다. Python 이 가장 강력하고(조건 · 반복 · 계산), XML · YAML 은 짧고 읽기 쉽습니다. 이 장은 Python 을 중심으로 하고 6절에서 나머지를 비교합니다.</div>`
    },

    /* ================================================================ 2 */
    {
      title: 'Python 런치 파일 해부',
      html: `
<p>Python 런치 파일은 <b><code>generate_launch_description()</code> 함수 하나</b>를 가진 파이썬 파일입니다. <code>ros2 launch</code> 가 이 함수를 불러 돌려받은 <b>LaunchDescription</b>(할 일 목록)을 차례로 실행합니다. 목록에 들어가는 항목 하나하나를 <b>액션(action)</b>이라 부르고, 가장 많이 쓰는 액션이 <code>launch_ros.actions.Node</code> 입니다.</p>
{{fig:anatomy}}
<table class="tbl">
<thead><tr><th>Node 인자</th><th>뜻</th><th>예</th></tr></thead>
<tbody>
<tr><td><code>package</code> · <code>executable</code></td><td>실행할 패키지와 실행 파일 (필수)</td><td><code>'turtlesim'</code>, <code>'turtlesim_node'</code></td></tr>
<tr><td><code>name</code></td><td>노드 이름 덮어쓰기</td><td><code>'sim'</code> → <code>/sim</code></td></tr>
<tr><td><code>namespace</code></td><td>노드 · 상대 토픽 이름 앞에 붙을 접두어</td><td><code>'turtlesim1'</code></td></tr>
<tr><td><code>parameters</code></td><td>파라미터 딕셔너리 또는 YAML 파일 경로의 <b>리스트</b></td><td><code>[{'background_r': 30}]</code></td></tr>
<tr><td><code>remappings</code></td><td>(원래 이름, 바꿀 이름) 튜플의 리스트</td><td><code>[('/input/pose', '/t1/pose')]</code></td></tr>
<tr><td><code>arguments</code></td><td>실행 파일에 넘길 일반 명령줄 인자</td><td><code>['--ros-args', '--log-level', 'debug']</code></td></tr>
<tr><td><code>output</code></td><td>출력을 어디로 보낼지</td><td><code>'screen'</code></td></tr>
</tbody></table>

<p>아래 위젯은 공식 튜토리얼의 <b>turtlesim_mimic_launch</b> 입니다. Python · XML · YAML 탭을 오가며 비교하고, 실행해서 결과를 보세요.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 런치 해부</div>
<ol>
  <li>Python 탭에서 <code>Node(</code> 가 몇 번 나오는지 세어 보세요. (3개 → 노드 3개)</li>
  <li><b>실행</b>을 누르고, 그래프에서 <code>/turtlesim1/sim</code> · <code>/mimic</code> · <code>/turtlesim2/sim</code> 의 연결을 확인합니다.</li>
  <li>"거북이1 움직이기"를 누르면 거북이2가 똑같이 움직이는지 봅니다.</li>
  <li>XML 탭과 비교해 <code>executable</code> ↔ <code>exec</code>, <code>package</code> ↔ <code>pkg</code> 처럼 이름이 조금 다른 것을 찾아보세요.</li>
</ol></div>
{{widget:launch|preset=turtles}}`
    },

    /* ================================================================ 3 */
    {
      title: '리매핑과 네임스페이스',
      html: `
<p><b>리매핑(remapping)</b>은 노드 코드를 고치지 않고 토픽 · 서비스 이름을 바꾸는 기능이고, <b>네임스페이스(namespace)</b>는 이름 앞에 "소속"을 붙이는 기능입니다. 둘 다 <b>같은 노드를 여러 번, 다른 곳에 연결해 재사용</b>하기 위한 도구입니다.</p>
{{fig:mimic}}
<p>런치 파일 없이 명령줄로 같은 일을 해 보면 런치 파일이 무엇을 대신해 주는지 확실히 보입니다. 공식 튜토리얼과 같은 순서입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch turtlesim multisim.launch.py &amp;
ros2 run turtlesim mimic --ros-args -r input/pose:=/turtlesim1/turtle1/pose -r output/cmd_vel:=/turtlesim2/turtle1/cmd_vel &amp;
ros2 topic pub -r 1 /turtlesim1/turtle1/cmd_vel geometry_msgs/msg/Twist "{linear: {x: 2.0}, angular: {z: -1.8}}"</code></pre>
<p>런치 파일에서는 <code>remappings=[('원래', '새 이름'), ...]</code> 로 씁니다. 아래 위젯은 talker 와 listener 의 <code>chatter</code> 를 <code>my_chatter</code> 로 바꿔 연결합니다.</p>
<div class="box practice"><div class="box-t">🧪 해 보기 — 리매핑</div>
<ol>
  <li>위젯을 실행하고 그래프에서 토픽 이름이 <code>/my_chatter</code> 인지 확인합니다.</li>
  <li>생각해 보기: talker 쪽만 리매핑하고 listener 는 그대로 두면? (서로 다른 토픽 → 연결 끊김)</li>
</ol></div>
{{widget:launch|preset=remap}}

<h3>네임스페이스 묶음 — GroupAction + PushRosNamespace</h3>
<p>노드마다 <code>namespace=</code> 를 적어도 되지만, 여러 노드를 한꺼번에 같은 네임스페이스에 넣을 때는 <b>GroupAction</b> 안에 <b>PushRosNamespace</b> 를 넣습니다. 로봇 두 대에 똑같은 노드 묶음을 띄울 때 씁니다.</p>
{{fig:ns}}
<pre class="code" data-lang="python"><code>from launch import LaunchDescription
from launch.actions import GroupAction
from launch_ros.actions import Node, PushRosNamespace


def generate_launch_description():
    robots = []
    for name in ['robot1', 'robot2']:            <span class="cm"># Python 이라 반복문 가능!</span>
        robots.append(GroupAction([
            PushRosNamespace(name),
            Node(package='demo_nodes_py', executable='talker'),
            Node(package='demo_nodes_py', executable='listener'),
        ]))
    return LaunchDescription(robots)</code></pre>
<div class="box practice"><div class="box-t">🧪 해 보기 — 네임스페이스</div>
<ol>
  <li>위젯을 실행하고 노드 네 개, 토픽 두 개(<code>/robot1/chatter</code>, <code>/robot2/chatter</code>)가 생기는지 봅니다.</li>
  <li>robot1 의 talker 가 보낸 메시지를 robot2 의 listener 가 받을까요? 그래프로 확인하세요.</li>
</ol></div>
{{widget:launch|preset=ns}}
<div class="box warn"><div class="box-t">⚠ 절대 이름은 네임스페이스의 영향을 받지 않아요</div>
코드에서 <code>'/turtle1/cmd_vel'</code> 처럼 <b>/ 로 시작하는 절대 이름</b>을 쓰면 네임스페이스를 붙여도 바뀌지 않습니다. 여러 로봇에 재사용할 노드라면 <code>'cmd_vel'</code> 같은 <b>상대 이름</b>으로 쓰세요. (8장 예제는 turtlesim 하나만 다루려고 절대 이름을 썼습니다)</div>`
    },

    /* ================================================================ 4 */
    {
      title: '런치 인자와 파라미터 · YAML',
      html: `
<p>런치 파일도 함수처럼 <b>인자(argument)</b>를 받을 수 있습니다. <code>DeclareLaunchArgument</code> 로 선언하고, <code>LaunchConfiguration('이름')</code> 으로 값을 꺼내 노드 파라미터 · 네임스페이스 등에 넘깁니다. 실행할 때는 <code>이름:=값</code> 으로 바꿉니다.</p>
<pre class="code" data-lang="python"><code>from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    background_r = LaunchConfiguration('background_r')      <span class="cm"># 나중에 값이 채워질 "자리표시자"</span>
    return LaunchDescription([
        DeclareLaunchArgument('background_r', default_value='200',
                              description='배경색 빨강 성분 (0~255)'),
        Node(package='turtlesim', executable='turtlesim_node', name='sim',
             parameters=[{'background_r': background_r,
                          'background_g': 86,
                          'background_b': 255}]),
    ])</code></pre>
<pre class="code" data-lang="bash"><code>ros2 launch my_pkg color.launch.py --show-args          <span class="cm"># 받을 수 있는 인자 목록</span>
ros2 launch my_pkg color.launch.py background_r:=30      <span class="cm"># 인자 값 바꾸기</span></code></pre>
<div class="box tip"><div class="box-t">💡 LaunchConfiguration 은 "자리표시자"</div>
<code>LaunchConfiguration('background_r')</code> 는 파이썬 문자열이 아닙니다. 런치가 <b>실행될 때</b> 값이 채워지는 치환(substitution) 객체예요. 그래서 <code>print()</code> 해도 값이 안 보이고, <code>if background_r == '30':</code> 같은 파이썬 비교도 안 됩니다. 조건 실행에는 <code>IfCondition</code> 을 씁니다.</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — 인자로 배경색 바꾸기</div>
<ol>
  <li>위젯의 인자 칸에서 <code>background_r</code> 값을 0, 128, 255 로 바꿔 실행해 보세요.</li>
  <li>Python · XML · YAML 탭에서 인자를 꺼내는 표기(<code>LaunchConfiguration</code> ↔ <code>$(var background_r)</code>)를 비교합니다.</li>
</ol></div>
{{widget:launch|preset=params}}

<h3>파라미터 YAML 파일 쓰기</h3>
<p>파라미터가 많으면 <a href="#ch06">6장</a>의 YAML 파일로 빼고, 런치에서는 <b>경로</b>만 넘깁니다. 노드 이름 대신 <code>/**</code> 를 쓰면 "이 파일을 받는 모든 노드"에 적용됩니다.</p>
<pre class="code" data-lang="yaml"><code><span class="cm"># my_pkg/config/turtle_colors.yaml</span>
/**:
  ros__parameters:
    background_r: 30
    background_g: 30
    background_b: 90</code></pre>
<pre class="code" data-lang="python"><code>import os
from ament_index_python.packages import get_package_share_directory

config = os.path.join(get_package_share_directory('my_pkg'), 'config', 'turtle_colors.yaml')

Node(package='turtlesim', executable='turtlesim_node', name='sim',
     parameters=[config, {'background_r': 200}])     <span class="cm"># 뒤에 있는 값이 우선</span></code></pre>
<div class="box note"><div class="box-t">📝 config/ 폴더도 설치해야 해요</div>
YAML 파일도 런치 파일처럼 <code>install/…/share/my_pkg/config/</code> 로 설치해야 <code>get_package_share_directory</code> 로 찾을 수 있습니다. setup.py 의 data_files 에 <code>(os.path.join('share', package_name, 'config'), glob('config/*.yaml'))</code> 를 추가하세요.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '다른 런치 파일 포함하기 — include',
      html: `
<p>큰 시스템은 런치 파일을 기능별로 나누고, 맨 위의 <b>bringup</b> 런치가 <code>IncludeLaunchDescription</code> 으로 조립합니다. 다른 패키지의 런치 파일을 가져올 때는 그 패키지가 설치된 <b>share 폴더</b>를 찾아야 하므로 <code>FindPackageShare</code>(치환) 또는 <code>get_package_share_directory</code>(파이썬 함수)를 씁니다.</p>
{{fig:include}}
<pre class="code" data-lang="python"><code>import os
from ament_index_python.packages import get_package_share_directory
from launch import LaunchDescription
from launch.actions import IncludeLaunchDescription
from launch.launch_description_sources import PythonLaunchDescriptionSource
from launch.substitutions import PathJoinSubstitution
from launch_ros.substitutions import FindPackageShare


def generate_launch_description():
    <span class="cm"># 방법 ① 치환(substitution)으로 경로 만들기 — 권장</span>
    multisim = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(
            PathJoinSubstitution([FindPackageShare('turtlesim'), 'launch', 'multisim.launch.py'])))

    <span class="cm"># 방법 ② 파이썬 함수로 경로 계산</span>
    tf_demo = IncludeLaunchDescription(
        PythonLaunchDescriptionSource(os.path.join(
            get_package_share_directory('turtle_tf2_py'), 'launch', 'turtle_tf2_demo.launch.py')))

    return LaunchDescription([multisim, tf_demo])</code></pre>
<p>포함하는 런치에 <b>인자</b>를 넘기려면 <code>launch_arguments</code> 를 씁니다. (아래 <code>my_robot_description</code> 은 설명용 예시 패키지)</p>
<pre class="code" data-lang="python"><code>IncludeLaunchDescription(
    PythonLaunchDescriptionSource(
        PathJoinSubstitution([FindPackageShare('my_robot_description'), 'launch', 'display.launch.py'])),
    launch_arguments={'use_sim_time': 'true', 'robot_name': 'bot1'}.items())   <span class="cm"># 값은 문자열</span></code></pre>
<p>TF 장(<a href="#ch12">12장</a>)에서 쓸 데모도 런치 파일 하나로 거북이 · 브로드캐스터 · 리스너를 한꺼번에 켭니다. 실행해 보고 <code>ros2 node list</code> 로 몇 개의 노드가 켜졌는지 세어 보세요.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 launch turtle_tf2_py turtle_tf2_demo.launch.py &amp;
ros2 node list</code></pre>
{{widget:lab|with=turtlesim,graph|title=런치로 여러 노드 켜기}}`
    },

    /* ================================================================ 6 */
    {
      title: 'XML · YAML 런치 형식',
      html: `
<p>Python 런치는 강력하지만 길어지기 쉽습니다. 조건 · 반복 같은 계산이 필요 없다면 <b>XML</b> 이나 <b>YAML</b> 이 훨씬 짧습니다. 세 형식은 섞어 쓸 수도 있습니다(XML 에서 Python 런치를 include 하는 식).</p>
<div class="two">
<div><pre class="code" data-lang="xml"><code>&lt;launch&gt;
  &lt;arg name="bg_r" default="30"/&gt;
  &lt;include file="$(find-pkg-share turtlesim)/launch/multisim.launch.py"/&gt;

  &lt;node pkg="turtlesim" exec="turtlesim_node"
        name="sim" namespace="t3"&gt;
    &lt;param name="background_r" value="$(var bg_r)"/&gt;
    &lt;param from="$(find-pkg-share my_pkg)/config/turtle_colors.yaml"/&gt;
  &lt;/node&gt;

  &lt;node pkg="turtlesim" exec="mimic" name="mimic"&gt;
    &lt;remap from="/input/pose" to="/turtlesim1/turtle1/pose"/&gt;
    &lt;remap from="/output/cmd_vel" to="/t3/turtle1/cmd_vel"/&gt;
  &lt;/node&gt;

  &lt;group&gt;
    &lt;push_ros_namespace namespace="robot1"/&gt;
    &lt;node pkg="demo_nodes_py" exec="talker"/&gt;
  &lt;/group&gt;
&lt;/launch&gt;</code></pre></div>
<div><pre class="code" data-lang="yaml"><code>launch:
- arg:
    name: bg_r
    default: "30"
- include:
    file: "$(find-pkg-share turtlesim)/launch/multisim.launch.py"
- node:
    pkg: turtlesim
    exec: turtlesim_node
    name: sim
    namespace: t3
    param:
    - name: background_r
      value: $(var bg_r)
- node:
    pkg: turtlesim
    exec: mimic
    name: mimic
    remap:
    - from: /input/pose
      to: /turtlesim1/turtle1/pose
    - from: /output/cmd_vel
      to: /t3/turtle1/cmd_vel</code></pre></div>
</div>
<table class="tbl cmp">
<thead><tr><th>개념</th><th>Python</th><th>XML</th><th>YAML</th></tr></thead>
<tbody>
<tr><td>노드</td><td><code>Node(package=, executable=)</code></td><td><code>&lt;node pkg="" exec=""/&gt;</code></td><td><code>- node: {pkg, exec}</code></td></tr>
<tr><td>인자 선언</td><td><code>DeclareLaunchArgument</code></td><td><code>&lt;arg name="" default=""/&gt;</code></td><td><code>- arg:</code></td></tr>
<tr><td>인자 값 사용</td><td><code>LaunchConfiguration('x')</code></td><td><code>$(var x)</code></td><td><code>$(var x)</code></td></tr>
<tr><td>패키지 share 경로</td><td><code>FindPackageShare('p')</code></td><td><code>$(find-pkg-share p)</code></td><td><code>$(find-pkg-share p)</code></td></tr>
<tr><td>리매핑</td><td><code>remappings=[(a, b)]</code></td><td><code>&lt;remap from="" to=""/&gt;</code></td><td><code>remap: [{from, to}]</code></td></tr>
<tr><td>포함</td><td><code>IncludeLaunchDescription</code></td><td><code>&lt;include file=""/&gt;</code></td><td><code>- include:</code></td></tr>
<tr><td>반복 · 계산</td><td>✓ 파이썬 그대로</td><td>✗</td><td>✗</td></tr>
</tbody></table>
<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 무엇으로 쓸까?</div>
공식 문서도 "대부분의 경우 XML 이나 YAML 로 충분하다"고 권합니다. 단순히 노드를 나열하는 bringup 은 XML/YAML, 로봇 수에 따라 반복하거나 조건이 복잡한 경우는 Python. Nav2 · MoveIt 같은 큰 프로젝트는 대부분 Python 런치를 씁니다.</div>`
    },

    /* ================================================================ 7 */
    {
      title: '따라 하기 — 내 패키지에 런치 파일 만들고 설치하기',
      html: `
<p>이제 직접 만들어 봅시다. <code>my_pkg</code> 패키지에 거북이 두 마리를 서로 다른 배경색으로 띄우는 <code>two_turtles.launch.py</code> 를 만들고, 설치 · 실행까지 해 봅니다. 핵심은 <b>설치 등록</b>입니다. <code>ros2 launch</code> 는 src 가 아니라 <b>install 폴더의 share</b> 에서 런치 파일을 찾기 때문입니다.</p>
{{fig:install}}
<ol class="steps-list">
  <li><b>패키지 · 폴더 만들기</b> — <a href="#ch07">7장</a>에서 <code>my_pkg</code> 를 이미 만들었다면 첫 두 줄에서 "already exists" 오류가 나도 괜찮습니다.</li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python my_pkg
mkdir -p my_pkg/launch
nano my_pkg/launch/two_turtles.launch.py</code></pre>
<ol class="steps-list" start="2">
  <li><b>런치 파일 작성</b> — 편집기 창에 아래 내용을 붙여 넣고 <kbd>Ctrl</kbd>+<kbd>S</kbd> 로 저장합니다.</li>
</ol>
<pre class="code" data-lang="python"><code>from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    return LaunchDescription([
        Node(
            package='turtlesim',
            executable='turtlesim_node',
            namespace='turtlesim1',
            name='sim',
            parameters=[{'background_r': 30, 'background_g': 30, 'background_b': 90}],
        ),
        Node(
            package='turtlesim',
            executable='turtlesim_node',
            namespace='turtlesim2',
            name='sim',
            parameters=[{'background_r': 120, 'background_g': 40, 'background_b': 40}],
        ),
    ])</code></pre>
<ol class="steps-list" start="3">
  <li><b>setup.py 에 설치 등록</b> — 맨 위에 import 두 줄, <code>data_files</code> 에 launch 줄 하나를 추가합니다.</li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>nano my_pkg/setup.py</code></pre>
<pre class="code" data-lang="python"><code>import os                                   <span class="cm"># ← 추가</span>
from glob import glob                       <span class="cm"># ← 추가</span>
from setuptools import find_packages, setup

package_name = 'my_pkg'

setup(
    name=package_name,
    ...
    data_files=[
        ('share/ament_index/resource_index/packages',
            ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'),
            glob(os.path.join('launch', '*launch.[pxy][yma]*'))),   <span class="cm"># ← 추가</span>
    ],
    ...
)</code></pre>
<p><code>'*launch.[pxy][yma]*'</code> 는 <code>.launch.py</code> · <code>.launch.xml</code> · <code>.launch.yaml</code> 을 모두 잡는 패턴입니다. package.xml 에는 <code>&lt;exec_depend&gt;ros2launch&lt;/exec_depend&gt;</code> 를 넣어 두면 좋습니다.</p>
<ol class="steps-list" start="4">
  <li><b>빌드 · source · 실행</b> — 거북이 창 두 개가 서로 다른 배경색으로 뜨면 성공!</li>
</ol>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon build --packages-select my_pkg
source install/setup.bash
ros2 launch my_pkg two_turtles.launch.py</code></pre>
<div class="box practice"><div class="box-t">🧪 더 해 보기</div>
<ol>
  <li>setup.py 의 launch 줄을 빼고 빌드하면 어떤 경고가 나오나요? (실제 ROS 2 에서는 "file … was not found in the share directory" 오류)</li>
  <li>세 번째 거북이(<code>namespace='turtlesim3'</code>)를 추가하고 다시 빌드 · 실행해 보세요.</li>
  <li>실행 중에 다른 칩으로 <code>ros2 param get /turtlesim2/sim background_r</code> 를 확인합니다.</li>
</ol></div>
{{widget:term|h=340|chips=ros2 launch my_pkg two_turtles.launch.py &;ros2 node list;ros2 param get /turtlesim2/sim background_r;ros2 pkg prefix my_pkg}}
<div class="box note"><div class="box-t">📝 이 브라우저 터미널의 런치 해석기</div>
이 사이트의 터미널은 내 런치 파일에서 <code>Node(package=, executable=, name=, namespace=, parameters=[{…}])</code> 를 읽어 실행합니다. <code>remappings</code> · 인자 · include 같은 고급 기능은 위의 <b>런치 위젯</b>으로 실습하고, 실제 Ubuntu + ROS 2 에서는 모든 기능이 그대로 동작합니다.</div>

<h3>C++ (ament_cmake) 패키지라면</h3>
<p>CMakeLists.txt 에 <code>install(DIRECTORY …)</code> 한 줄이면 됩니다.</p>
<pre class="code" data-lang="cmake"><code>install(DIRECTORY launch config
  DESTINATION share/\${PROJECT_NAME}/)</code></pre>`
    },

    /* ================================================================ 8 */
    {
      title: '이벤트 핸들러 · 흔한 실수',
      html: `
<p>런치는 노드를 켜기만 하는 것이 아니라 <b>이벤트에 반응</b>할 수도 있습니다. 예를 들어 "시뮬레이터 창이 닫히면 전체 런치를 끝내라"는 <code>OnProcessExit</code> 이벤트 핸들러로 씁니다.</p>
<pre class="code" data-lang="python"><code>from launch import LaunchDescription
from launch.actions import EmitEvent, LogInfo, RegisterEventHandler
from launch.event_handlers import OnProcessExit
from launch.events import Shutdown
from launch_ros.actions import Node


def generate_launch_description():
    sim = Node(package='turtlesim', executable='turtlesim_node', name='sim')
    return LaunchDescription([
        sim,
        RegisterEventHandler(
            OnProcessExit(
                target_action=sim,                         <span class="cm"># 이 프로세스가 끝나면</span>
                on_exit=[
                    LogInfo(msg='turtlesim 이 종료되어 전체를 끕니다'),
                    EmitEvent(event=Shutdown(reason='sim 종료')),
                ])),
    ])</code></pre>
<div class="cards c3">
  <div class="card blue"><div class="ci">▶</div><b>OnProcessStart</b><p>프로세스가 시작되면 (예: 시뮬레이터가 뜬 뒤 로봇 spawn)</p></div>
  <div class="card orange"><div class="ci">⏹</div><b>OnProcessExit</b><p>프로세스가 끝나면 (예: 하나 죽으면 전체 종료)</p></div>
  <div class="card purple"><div class="ci">⏱</div><b>TimerAction</b><p>몇 초 뒤에 실행 (예: 드라이버가 준비될 시간 주기)</p></div>
</div>

<h3>흔한 실수 모음</h3>
<table class="tbl">
<thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
<tbody>
<tr><td><code>file 'x.launch.py' was not found in the share directory</code></td><td>setup.py data_files(또는 CMake install)에 launch 미등록 · 빌드 안 함</td><td>등록 → <code>colcon build</code> → <code>source install/setup.bash</code></td></tr>
<tr><td>런치 파일을 고쳤는데 반영이 안 됨</td><td>설치된 복사본이 실행됨</td><td>다시 빌드하거나 <code>colcon build --symlink-install</code></td></tr>
<tr><td>파라미터가 적용 안 됨</td><td><code>parameters={...}</code> (리스트가 아님) · YAML 노드 이름 불일치</td><td><code>parameters=[{...}]</code>, YAML 최상위를 노드 이름이나 <code>/**</code> 로</td></tr>
<tr><td>네임스페이스를 줬는데 토픽이 그대로</td><td>코드에서 절대 이름(<code>/cmd_vel</code>) 사용</td><td>상대 이름(<code>cmd_vel</code>)으로</td></tr>
<tr><td>리매핑이 안 먹음</td><td>원래 이름 오타 · 상대/절대 불일치</td><td><code>ros2 node info</code> 로 실제 이름 확인 후 맞추기</td></tr>
<tr><td><code>LaunchConfiguration</code> 값을 print 하면 이상한 객체</td><td>실행 시점에 채워지는 치환 객체</td><td>조건은 <code>IfCondition</code>, 문자열 결합은 <code>PathJoinSubstitution</code> 등</td></tr>
</tbody></table>
<div class="box tip"><div class="box-t">💡 디버깅 도구</div>
<code>ros2 launch 패키지 파일 --show-args</code>(인자 목록), <code>--print</code>(실행하지 않고 할 일 목록 출력), <code>--debug</code>(자세한 로그)를 기억해 두세요.</div>`
    }
  ],

  videos: [
    { title: 'ROS2 - Create a Launch File with Python', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=xJ3WAs8GndA', lang: 'en', desc: 'Python 런치 파일을 만들고 setup.py 로 설치해 실행하는 전 과정 — 2 · 7절 복습.' },
    { title: 'ROS2 - Create a Launch File with XML', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=Le1vx1_KUDQ', lang: 'en', desc: '같은 런치를 XML 로 — 6절의 형식 비교와 함께 보세요.' },
    { title: 'ROS2 - Include a Launch File in Another Launch File (Python, XML, YAML)', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=sl0exwcg3o8', lang: 'en', desc: 'IncludeLaunchDescription 을 세 가지 형식으로 — 5절 내용.' },
    { title: 'ROS2 Launch File Tutorial - Create a Launch File', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=T8KJH47aZ8w', lang: 'en', desc: '런치 파일의 기본 구조를 처음부터 차근차근.' },
    { title: 'ROS2 Launch File Tutorial - Integrate Launch File in Package', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=EZf-1GozbSk', lang: 'en', desc: '패키지에 런치 파일을 넣고 설치하는 방법 — 7절 따라 하기와 같은 주제.' },
    { title: 'ROS2 Launch File Tutorial - Large Projects (remapping, namespaces, parameters)', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=aL_oM8QhTVI', lang: 'en', desc: '리매핑 · 네임스페이스 · 파라미터 파일로 큰 프로젝트를 구성 — 3 · 4절 심화.' }
  ],

  terms: [
    ['런치 파일(launch file)', '여러 노드를 이름 · 설정과 함께 한 번에 실행하도록 적어 둔 파일. Python · XML · YAML 형식'],
    ['ros2 launch', '런치 파일을 실행하는 명령. ros2 launch 패키지 파일 [인자:=값 …]'],
    ['generate_launch_description', 'Python 런치 파일에 반드시 있어야 하는 함수. LaunchDescription 을 반환'],
    ['LaunchDescription', '런치가 실행할 액션(Node, Include, 인자 선언 …)의 목록'],
    ['launch_ros.actions.Node', '노드 하나를 실행하는 런치 액션. package · executable · name · namespace · parameters · remappings'],
    ['리매핑(remapping)', '코드를 고치지 않고 토픽 · 서비스 이름을 바꾸는 기능. 명령줄 -r a:=b, 런치 remappings'],
    ['네임스페이스(namespace)', '노드와 상대 이름 앞에 붙는 접두어(/robot1/…). 같은 노드를 여러 번 띄울 때 이름 충돌 방지'],
    ['DeclareLaunchArgument', '런치 인자를 선언하는 액션. 기본값 · 설명을 가짐'],
    ['LaunchConfiguration', '런치 인자 값을 실행 시점에 꺼내 쓰는 치환(substitution) 객체'],
    ['IncludeLaunchDescription', '다른 런치 파일을 포함하는 액션. launch_arguments 로 인자 전달'],
    ['FindPackageShare', '패키지의 설치된 share 폴더 경로를 찾는 치환. XML/YAML 에서는 $(find-pkg-share 패키지)'],
    ['GroupAction · PushRosNamespace', '여러 액션을 묶고 그 안의 노드에 네임스페이스를 한꺼번에 적용'],
    ['data_files', 'ament_python 패키지의 setup.py 에서 런치 · 설정 파일을 share 폴더로 설치하도록 등록하는 곳'],
    ['이벤트 핸들러', 'OnProcessStart · OnProcessExit 처럼 프로세스 상태 변화에 반응해 액션을 실행하는 런치 기능']
  ],

  summary: [
    '런치 파일 = 여러 노드를 <b>이름 · 네임스페이스 · 파라미터 · 리매핑</b>과 함께 한 번에 켜는 실행 계획서. <b>ros2 launch 패키지 파일</b>',
    'Python 런치: <b>generate_launch_description()</b> 이 <b>LaunchDescription([Node(...), ...])</b> 을 반환',
    '<b>리매핑</b>은 코드 수정 없이 이름 바꾸기, <b>네임스페이스</b>(GroupAction + PushRosNamespace)는 같은 노드 묶음을 여러 번 띄우기',
    '<b>DeclareLaunchArgument + LaunchConfiguration</b> 으로 인자, <b>parameters=[dict 또는 YAML 경로]</b> 로 파라미터',
    '<b>IncludeLaunchDescription + FindPackageShare</b> 로 런치를 조립. XML/YAML 에서는 $(find-pkg-share) · $(var)',
    '런치 파일은 <b>설치</b>해야 찾는다: setup.py data_files(glob) 또는 CMake install(DIRECTORY launch …) → colcon build → source'
  ],

  quiz: [
    { q: 'Python 런치 파일에 반드시 있어야 하는 함수는?', options: ['main()', 'generate_launch_description()', 'launch()', 'setup()'], answer: 1, explain: 'ros2 launch 는 이 함수를 불러 LaunchDescription 을 받아 실행합니다. main 은 노드 파일의 진입점이에요.' },
    { q: '<code>Node(package=\'turtlesim\', executable=\'turtlesim_node\', namespace=\'t1\')</code> 로 실행했을 때 거북이 속도 토픽 이름은?', options: ['/turtle1/cmd_vel', '/t1/turtle1/cmd_vel', '/turtlesim/t1/cmd_vel', '/t1/cmd_vel'], answer: 1, explain: 'turtlesim 은 상대 이름 turtle1/cmd_vel 을 쓰므로 네임스페이스 /t1 이 앞에 붙습니다.' },
    { q: 'mimic 노드의 <code>/input/pose</code> 를 <code>/turtlesim1/turtle1/pose</code> 로 연결하는 런치 인자는?', options: ["parameters=[{'input': '/turtlesim1/turtle1/pose'}]", "remappings=[('/input/pose', '/turtlesim1/turtle1/pose')]", "namespace='/turtlesim1/turtle1/pose'", "arguments=['/input/pose']"], answer: 1, explain: '리매핑은 (원래 이름, 새 이름) 튜플의 리스트로 적습니다. 명령줄에서는 --ros-args -r input/pose:=/turtlesim1/turtle1/pose 와 같습니다.' },
    { q: '런치 인자 값을 실행할 때 바꾸는 올바른 명령은?', options: ['ros2 launch my_pkg a.launch.py --background_r 30', 'ros2 launch my_pkg a.launch.py background_r:=30', 'ros2 launch my_pkg a.launch.py -p background_r:=30', 'ros2 param set background_r 30'], answer: 1, explain: '런치 인자는 이름:=값 형식으로 넘깁니다. --show-args 로 받을 수 있는 인자 목록을 볼 수 있어요.' },
    { q: '내 ament_python 패키지에 launch/ 폴더를 만들었는데 ros2 launch 가 파일을 못 찾는다. 가장 먼저 확인할 것은?', options: ['package.xml 의 버전', 'setup.py 의 data_files 에 launch 파일 등록 여부', '노드 이름', 'ROS_DOMAIN_ID'], answer: 1, explain: 'ros2 launch 는 install/…/share/패키지/ 에서 찾습니다. data_files 로 설치 등록 후 빌드 · source 해야 합니다.' },
    { q: 'XML 런치에서 다른 패키지의 설치 폴더 경로를 쓰는 표기는?', options: ['$(var pkg)', '$(find-pkg-share pkg)', '${pkg}', '&lt;include pkg="pkg"/&gt;'], answer: 1, explain: '$(find-pkg-share 패키지) 는 Python 의 FindPackageShare 와 같습니다. $(var x) 는 런치 인자 값이에요.' },
    { q: '"시뮬레이터 프로세스가 끝나면 런치 전체를 종료"하려면 무엇을 쓸까?', options: ['TimerAction', 'RegisterEventHandler + OnProcessExit', 'GroupAction', 'DeclareLaunchArgument'], answer: 1, explain: 'OnProcessExit 이벤트 핸들러의 on_exit 에 EmitEvent(Shutdown) 을 넣으면 됩니다.' }
  ],

  slides: [
    {
      title: '터미널 스무 개?',
      layout: 'center',
      html: `<div class="s-big">로봇 한 대 = 노드 수십 개<br>명령 <b>한 줄</b>로 켤 수 없을까?</div>`,
      notes: '학생들에게 지난 시간 터미널을 몇 개 열었는지 물어봅니다. TurtleBot3 나 Nav2 데모가 ros2 launch 한 줄로 켜지는 영상을 잠깐 보여 줘도 좋습니다. (2분)'
    },
    {
      title: '런치 파일 = 오픈 체크리스트',
      html: `{{fig:whyLaunch|nocap}}`,
      notes: '식당 오픈 체크리스트 비유. 순서 · 옵션을 파일로 남기면 누가 실행해도 똑같다는 재현성이 핵심입니다. 이어서 multisim.launch.py 를 실행해 보여 주세요. (4분)'
    },
    {
      title: 'multisim 실행',
      html: `{{widget:term|chips=ros2 launch turtlesim multisim.launch.py &;ros2 node list;ros2 topic list}}`,
      notes: '거북이 창 두 개가 뜨는 것을 보고, node list 에서 /turtlesim1/turtlesim, /turtlesim2/turtlesim 이름을 읽게 합니다. 네임스페이스의 첫 인상을 심어 줍니다. (4분)'
    },
    {
      title: 'Python 런치 해부',
      html: `{{fig:anatomy|nocap}}`,
      notes: '오른쪽 표가 핵심: Node 인자 하나하나가 ros2 run 의 --ros-args 옵션과 1:1 대응합니다. 이미 아는 명령줄 지식을 파일로 옮기는 것뿐이라고 안심시키세요. (6분)'
    },
    {
      title: 'mimic 런치 실습',
      html: `{{widget:launch|preset=turtles}}`,
      notes: '실행 → 그래프 확인 → 거북이1 움직이기 순서. Python/XML/YAML 탭을 바꿔 보며 같은 내용이라는 점을 확인합니다. (7분)'
    },
    {
      title: '리매핑으로 연결',
      html: `{{fig:mimic|nocap}}`,
      notes: 'mimic 코드 안의 이름(input/pose, output/cmd_vel)은 그대로이고 바깥에서 연결만 바꾼다는 점. 전기 멀티탭에 코드를 꽂는 위치만 바꾸는 것에 비유할 수 있습니다. (5분)'
    },
    {
      title: '리매핑 실습',
      html: `{{widget:launch|preset=remap}}`,
      notes: 'chatter → my_chatter. 한쪽만 리매핑하면 끊긴다는 것을 질문으로 확인합니다. (4분)'
    },
    {
      title: '네임스페이스',
      html: `{{fig:ns|nocap}}`,
      notes: '상대 이름과 절대 이름의 차이를 칠판에 적습니다. 8장 코드가 /turtle1/cmd_vel 절대 이름을 쓴 이유와 재사용 시 문제를 연결하세요. (5분)'
    },
    {
      title: '네임스페이스 실습',
      html: `{{widget:launch|preset=ns}}`,
      notes: 'robot1 · robot2 가 서로의 메시지를 받지 않는 것을 그래프로 확인합니다. 파이썬 for 문으로 로봇 수를 늘릴 수 있다는 장점도 언급. (4분)'
    },
    {
      title: '인자와 파라미터',
      html: `{{widget:launch|preset=params}}`,
      notes: 'background_r 값을 바꿔 가며 실행. LaunchConfiguration 은 "나중에 채워지는 빈칸"이라는 점, 실행 명령에서 background_r:=30 으로 바꾼다는 점을 강조합니다. (6분)'
    },
    {
      title: 'include 로 조립',
      html: `{{fig:include|nocap}}`,
      notes: 'Nav2 · TurtleBot 의 bringup 구조를 예로. FindPackageShare 가 install/…/share 를 가리킨다는 것을 다음 슬라이드(설치)와 연결합니다. (4분)'
    },
    {
      title: '세 가지 형식',
      html: `<table class="tbl cmp">
<thead><tr><th></th><th>Python</th><th>XML</th><th>YAML</th></tr></thead>
<tbody>
<tr class="step"><td>노드</td><td>Node()</td><td>&lt;node&gt;</td><td>node:</td></tr>
<tr class="step"><td>인자 값</td><td>LaunchConfiguration</td><td>$(var)</td><td>$(var)</td></tr>
<tr class="step"><td>share 경로</td><td>FindPackageShare</td><td>$(find-pkg-share)</td><td>$(find-pkg-share)</td></tr>
<tr class="step"><td>반복 · 조건</td><td>✓</td><td>✗</td><td>✗</td></tr>
</tbody></table>`,
      notes: '어느 형식이 좋냐는 질문에는 "계산이 필요하면 Python, 아니면 XML/YAML"이라고 답합니다. 한 줄씩 공개하세요. (4분)'
    },
    {
      title: '설치해야 찾는다',
      html: `{{fig:install|nocap}}`,
      notes: '가장 많이 막히는 지점입니다. src 와 install 폴더를 칠판에 나란히 그리고 colcon build 가 복사한다는 것을 강조한 뒤 따라 하기 실습으로 넘어갑니다. (4분)'
    },
    {
      title: '따라 하기 — two_turtles',
      html: `{{widget:term|chips=ros2 launch my_pkg two_turtles.launch.py &;ros2 node list}}`,
      notes: 'nano 로 런치 파일과 setup.py 를 편집하고 빌드하는 과정을 함께 진행합니다(본문 7절). 먼저 끝난 학생은 세 번째 거북이 추가 과제. (15분)'
    }
  ]
});
