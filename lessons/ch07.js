/* 7장 — 워크스페이스 · 패키지 · colcon */
Course.lesson({
  id: 'ch07', no: '07',
  icon: '🏗️',
  title: '워크스페이스 · 패키지 · colcon',
  subtitle: '내 코드를 ROS 2 가 찾아 실행할 수 있게 포장하고 빌드하기',
  level: '입문', time: '120분',
  goals: [
    '워크스페이스의 src · build · install · log 폴더가 각각 무엇인지 설명할 수 있다',
    '언더레이(/opt/ros/jazzy)와 오버레이(~/ros2_ws)의 관계, 새 터미널마다 source 가 필요한 이유를 말할 수 있다',
    'ros2 pkg create 로 ament_python · ament_cmake 패키지를 만들고 package.xml · setup.py · CMakeLists.txt 의 핵심 부분을 읽을 수 있다',
    'colcon build 의 주요 옵션(--packages-select · --symlink-install · --packages-up-to)을 상황에 맞게 쓸 수 있다',
    '패키지 생성 → 노드 작성 → 빌드 → source → ros2 run 을 처음부터 끝까지 직접 해 볼 수 있다'
  ],
  teacher: {
    intro: '“지금까지는 남이 만든 turtlesim 을 ros2 run 으로 실행만 했습니다. 오늘은 여러분이 만든 노드를 ros2 run 내_패키지 내_노드 로 실행하는 날입니다.” 하고 목표를 먼저 보여 줍니다. 수업 끝에 모두가 자기 노드를 rqt_graph 에 띄우는 것이 목표입니다. (2분)',
    flow: '① 워크스페이스 구조 10분 → ② 언더레이 · 오버레이 · source 15분 → ③ ros2 pkg create 10분 → ④ package.xml 10분 → ⑤ setup.py · setup.cfg 10분 → ⑥ CMakeLists.txt 10분 → ⑦ colcon build 옵션 · rosdep 15분 → ⑧ 처음부터 끝까지 따라 하기 25분 → ⑨ 자주 나는 오류 · 정리 15분'
  },

  figs: {
    /* ---------------------------------------------------------------- 워크스페이스 구조 */
    wsLayout: {
      caption: '워크스페이스 = 폴더 하나. 사람이 만지는 곳은 src/ 뿐이고, 나머지 셋은 colcon build 가 만듭니다',
      svg: `<svg class="dg" viewBox="0 0 900 400" role="img" aria-label="ros2_ws 아래 src, build, install, log 폴더와 각각의 역할">
  <rect x="20" y="20" width="200" height="56" rx="10" class="s-blue"/>
  <text x="120" y="48" class="t-lg t-c t-mono tw">~/ros2_ws/</text>
  <line x1="60" y1="78" x2="60" y2="352" class="ln thick"/>

  <line x1="60" y1="120" x2="110" y2="120" class="ln thick"/>
  <rect x="110" y="96" width="150" height="48" rx="8" class="green"/>
  <text x="185" y="120" class="t-b t-c t-mono">src/</text>
  <rect x="280" y="96" width="600" height="48" rx="8" class="box"/>
  <text x="296" y="114" class="t-sm"><tspan class="t-b t-green">소스 코드</tspan> — 패키지 폴더들 (my_pkg/, 남에게 받은 패키지 …)</text>
  <text x="296" y="134" class="t-xs t-mu">✍️ 사람이 만들고 고치는 유일한 곳 · git 으로 관리</text>

  <line x1="60" y1="190" x2="110" y2="190" class="ln thick"/>
  <rect x="110" y="166" width="150" height="48" rx="8" class="gray"/>
  <text x="185" y="190" class="t-b t-c t-mono">build/</text>
  <rect x="280" y="166" width="600" height="48" rx="8" class="box"/>
  <text x="296" y="184" class="t-sm"><tspan class="t-b">중간 산출물</tspan> — 컴파일 중간 파일, CMake 캐시</text>
  <text x="296" y="204" class="t-xs t-mu">🤖 colcon 이 만듦 · 지워도 다시 빌드하면 생김</text>

  <line x1="60" y1="260" x2="110" y2="260" class="ln thick"/>
  <rect x="110" y="236" width="150" height="48" rx="8" class="orange"/>
  <text x="185" y="260" class="t-b t-c t-mono">install/</text>
  <rect x="280" y="236" width="600" height="48" rx="8" class="box"/>
  <text x="296" y="254" class="t-sm"><tspan class="t-b t-orange">설치 결과</tspan> — 실행 파일 · 라이브러리 · share/ · setup.bash</text>
  <text x="296" y="274" class="t-xs t-mu">🚀 ros2 run 이 실제로 실행하는 곳 · source install/setup.bash</text>

  <line x1="60" y1="330" x2="110" y2="330" class="ln thick"/>
  <rect x="110" y="306" width="150" height="48" rx="8" class="gray"/>
  <text x="185" y="330" class="t-b t-c t-mono">log/</text>
  <rect x="280" y="306" width="600" height="48" rx="8" class="box"/>
  <text x="296" y="324" class="t-sm"><tspan class="t-b">빌드 기록</tspan> — 패키지별 빌드 출력 · 오류 로그</text>
  <text x="296" y="344" class="t-xs t-mu">🔍 빌드가 실패하면 여기서 자세한 원인을 찾음</text>
  <text x="450" y="386" class="t-xs t-c t-mu">build · install · log 는 워크스페이스 "최상위"에서 colcon build 를 해야 이 자리에 생깁니다</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 언더레이 / 오버레이 */
    overlay: {
      caption: '언더레이 위에 오버레이를 겹쳐 씁니다. 같은 이름의 패키지가 있으면 위(오버레이)가 이깁니다',
      svg: `<svg class="dg" viewBox="0 0 900 380" role="img" aria-label="/opt/ros/jazzy 언더레이 위에 ~/ros2_ws 오버레이가 쌓인 그림과 source 순서">
  <rect x="60" y="230" width="520" height="110" rx="14" class="blue"/>
  <text x="320" y="262" class="t-lg t-c t-b">언더레이 (underlay)</text>
  <text x="320" y="290" class="t-sm t-c t-mono">/opt/ros/jazzy</text>
  <text x="320" y="316" class="t-xs t-c">apt 로 설치한 ROS 2 — rclpy, turtlesim, rviz2, nav2 …</text>

  <rect x="100" y="100" width="440" height="110" rx="14" class="orange"/>
  <text x="320" y="132" class="t-lg t-c t-b">오버레이 (overlay)</text>
  <text x="320" y="160" class="t-sm t-c t-mono">~/ros2_ws/install</text>
  <text x="320" y="186" class="t-xs t-c">내가 빌드한 패키지 — my_pkg, 고쳐 쓰는 turtlesim …</text>

  <rect x="150" y="20" width="340" height="56" rx="12" class="s-green"/>
  <text x="320" y="48" class="t-b t-c tw">🐢 ros2 run my_pkg my_node</text>
  <path d="M320,78 L320,96" class="ln-green thick ar-green"/>
  <text x="340" y="92" class="t-xs t-green">위에서부터 찾음</text>

  <rect x="620" y="60" width="260" height="280" rx="12" class="box"/>
  <text x="750" y="88" class="t-b t-c">터미널마다 순서대로</text>
  <rect x="640" y="108" width="220" height="56" rx="8" class="blue"/>
  <text x="750" y="130" class="t-xs t-c t-b">① 언더레이 먼저</text>
  <text x="750" y="150" class="t-xs t-c t-mono">source /opt/ros/jazzy/setup.bash</text>
  <path d="M750,166 L750,190" class="ln thick ar"/>
  <rect x="640" y="194" width="220" height="56" rx="8" class="orange"/>
  <text x="750" y="216" class="t-xs t-c t-b">② 오버레이 다음</text>
  <text x="750" y="236" class="t-xs t-c t-mono">source install/setup.bash</text>
  <text x="750" y="280" class="t-xs t-c">환경 변수는 그 터미널에만!</text>
  <text x="750" y="302" class="t-xs t-c t-mu">새 터미널 = 다시 source</text>
  <text x="750" y="324" class="t-xs t-c t-mu">(~/.bashrc 에 적어 두면 자동)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 패키지 두 종류 */
    pkgKinds: {
      caption: 'ros2 pkg create 가 만드는 두 종류의 패키지 — 파이썬(ament_python)과 C++(ament_cmake)',
      svg: `<svg class="dg" viewBox="0 0 900 400" role="img" aria-label="ament_python 패키지와 ament_cmake 패키지의 파일 구조 비교">
  <rect x="20" y="16" width="420" height="368" rx="14" class="box"/>
  <text x="230" y="44" class="t-lg t-c t-b">🐍 ament_python</text>
  <text x="44" y="80" class="t-sm t-mono t-b">my_pkg/</text>
  <text x="64" y="108" class="t-sm t-mono">├── <tspan class="t-b t-orange">package.xml</tspan></text>
  <text x="64" y="134" class="t-sm t-mono">├── <tspan class="t-b t-blue">setup.py</tspan></text>
  <text x="64" y="160" class="t-sm t-mono">├── setup.cfg</text>
  <text x="64" y="186" class="t-sm t-mono">├── resource/my_pkg</text>
  <text x="64" y="212" class="t-sm t-mono">├── my_pkg/</text>
  <text x="64" y="238" class="t-sm t-mono">│   ├── __init__.py</text>
  <text x="64" y="264" class="t-sm t-mono">│   └── <tspan class="t-b t-green">my_node.py</tspan></text>
  <text x="64" y="290" class="t-sm t-mono">├── test/ (린터 테스트 3개)</text>
  <text x="64" y="316" class="t-sm t-mono">└── LICENSE</text>
  <text x="230" y="358" class="t-xs t-c t-mu">코드 폴더 이름 = 패키지 이름 (한 번 더!)</text>

  <rect x="460" y="16" width="420" height="368" rx="14" class="box"/>
  <text x="670" y="44" class="t-lg t-c t-b">⚙️ ament_cmake</text>
  <text x="484" y="80" class="t-sm t-mono t-b">my_cpp_pkg/</text>
  <text x="504" y="108" class="t-sm t-mono">├── <tspan class="t-b t-orange">package.xml</tspan></text>
  <text x="504" y="134" class="t-sm t-mono">├── <tspan class="t-b t-blue">CMakeLists.txt</tspan></text>
  <text x="504" y="160" class="t-sm t-mono">├── include/my_cpp_pkg/</text>
  <text x="504" y="186" class="t-sm t-mono">├── src/</text>
  <text x="504" y="212" class="t-sm t-mono">│   └── <tspan class="t-b t-green">my_node.cpp</tspan></text>
  <text x="504" y="238" class="t-sm t-mono">└── LICENSE</text>
  <text x="670" y="300" class="t-xs t-c">C++ 는 컴파일이 필요 →</text>
  <text x="670" y="322" class="t-xs t-c">코드를 고칠 때마다 다시 빌드</text>
  <text x="670" y="358" class="t-xs t-c t-mu">인터페이스(msg/srv) 패키지도 이 방식</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 엔트리 포인트 */
    entryPoint: {
      caption: 'setup.py 의 한 줄이 "ros2 run my_pkg my_node" 를 가능하게 합니다',
      svg: `<svg class="dg" viewBox="0 0 900 330" role="img" aria-label="setup.py entry_points 가 install/lib 의 실행 파일이 되고 ros2 run 으로 실행되는 흐름">
  <rect x="20" y="20" width="860" height="70" rx="10" class="box"/>
  <text x="450" y="46" class="t-sm t-c t-mono">'console_scripts': [</text>
  <text x="450" y="72" class="t-c t-mono"><tspan class="t-b t-green">'my_node</tspan> = <tspan class="t-b t-blue">my_pkg.my_node</tspan>:<tspan class="t-b t-orange">main'</tspan>,</text>

  <rect x="40" y="140" width="250" height="66" rx="10" class="green"/>
  <text x="165" y="166" class="t-sm t-c t-b">실행 파일 이름</text>
  <text x="165" y="190" class="t-xs t-c t-mono">ros2 run 에서 부를 이름</text>
  <rect x="325" y="140" width="250" height="66" rx="10" class="blue"/>
  <text x="450" y="166" class="t-sm t-c t-b">모듈 경로</text>
  <text x="450" y="190" class="t-xs t-c t-mono">my_pkg/my_node.py</text>
  <rect x="610" y="140" width="250" height="66" rx="10" class="orange"/>
  <text x="735" y="166" class="t-sm t-c t-b">함수 이름</text>
  <text x="735" y="190" class="t-xs t-c t-mono">def main():</text>
  <path d="M300,84 L200,136" class="ln-green ar-green"/>
  <path d="M450,90 L450,136" class="ln-blue ar-blue"/>
  <path d="M600,84 L710,136" class="ln-orange ar-orange"/>

  <rect x="120" y="248" width="360" height="56" rx="10" class="gray"/>
  <text x="300" y="270" class="t-xs t-c">colcon build 가 만드는 실행 파일</text>
  <text x="300" y="290" class="t-xs t-c t-mono">install/my_pkg/lib/my_pkg/my_node</text>
  <rect x="560" y="248" width="300" height="56" rx="10" class="s-green"/>
  <text x="710" y="276" class="t-sm t-c t-mono tw t-b">ros2 run my_pkg my_node</text>
  <path d="M165,208 L240,244" class="ln ar dash"/>
  <path d="M482,276 L556,276" class="ln-green thick ar-green"/>
  <text x="300" y="322" class="t-xs t-c t-mu">lib/패키지이름 에 두는 규칙은 setup.cfg 가 정함</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 빌드 흐름 */
    buildFlow: {
      caption: '처음부터 끝까지 — 만들고(create) · 쓰고(nano) · 빌드하고(colcon) · 환경을 불러오고(source) · 실행(run)',
      svg: `<svg class="dg" viewBox="0 0 900 250" role="img" aria-label="ros2 pkg create, 코드 편집, colcon build, source, ros2 run 다섯 단계">
  <rect x="10" y="60" width="160" height="110" rx="14" class="green"/>
  <text x="90" y="92" class="t-lg t-c">📦</text>
  <text x="90" y="124" class="t-sm t-c t-b">① 패키지 생성</text>
  <text x="90" y="148" class="t-xs t-c t-mono">ros2 pkg create</text>
  <rect x="190" y="60" width="160" height="110" rx="14" class="teal"/>
  <text x="270" y="92" class="t-lg t-c">✍️</text>
  <text x="270" y="124" class="t-sm t-c t-b">② 코드 작성</text>
  <text x="270" y="148" class="t-xs t-c t-mono">nano my_node.py</text>
  <rect x="370" y="60" width="160" height="110" rx="14" class="orange"/>
  <text x="450" y="92" class="t-lg t-c">🔨</text>
  <text x="450" y="124" class="t-sm t-c t-b">③ 빌드</text>
  <text x="450" y="148" class="t-xs t-c t-mono">colcon build</text>
  <rect x="550" y="60" width="160" height="110" rx="14" class="purple"/>
  <text x="630" y="92" class="t-lg t-c">🔌</text>
  <text x="630" y="124" class="t-sm t-c t-b">④ 환경 불러오기</text>
  <text x="630" y="148" class="t-xs t-c t-mono">source install/…</text>
  <rect x="730" y="60" width="160" height="110" rx="14" class="s-blue"/>
  <text x="810" y="92" class="t-lg t-c">🚀</text>
  <text x="810" y="124" class="t-sm t-c t-b tw">⑤ 실행</text>
  <text x="810" y="148" class="t-xs t-c t-mono tw">ros2 run</text>
  <path d="M172,115 L186,115" class="ln thick ar"/>
  <path d="M352,115 L366,115" class="ln thick ar"/>
  <path d="M532,115 L546,115" class="ln thick ar"/>
  <path d="M712,115 L726,115" class="ln thick ar"/>
  <path d="M450,172 C450,226 270,226 270,176" class="ln-teal dash ar-teal"/>
  <text x="360" y="226" class="t-xs t-c t-teal">코드를 고치면 ②→③ 다시 (파이썬은 --symlink-install 로 생략 가능)</text>
  <text x="450" y="36" class="t-sm t-c t-mu">모든 명령은 ~/ros2_ws 에서 (① 만 ~/ros2_ws/src 에서)</text>
</svg>`
    },

    /* ---------------------------------------------------------------- 의존성 태그 */
    depTags: {
      caption: 'package.xml 의 의존성 태그 — 언제 필요한가(빌드 · 실행 · 테스트)에 따라 고릅니다. 헷갈리면 &lt;depend&gt; 가 가장 무난합니다',
      svg: `<svg class="dg" viewBox="0 0 900 300" role="img" aria-label="buildtool_depend, depend, build_depend, exec_depend, test_depend 의 적용 시점 표">
  <text x="330" y="36" class="t-sm t-c t-b">빌드 도구</text>
  <text x="480" y="36" class="t-sm t-c t-b">빌드할 때</text>
  <text x="630" y="36" class="t-sm t-c t-b">실행할 때</text>
  <text x="780" y="36" class="t-sm t-c t-b">테스트할 때</text>
  <line x1="20" y1="50" x2="880" y2="50" class="ln thin"/>

  <text x="30" y="80" class="t-sm t-mono t-b">&lt;buildtool_depend&gt;</text>
  <circle cx="330" cy="76" r="12" class="s-purple"/>
  <text x="850" y="80" class="t-xs t-e t-mu">ament_cmake</text>

  <text x="30" y="126" class="t-sm t-mono t-b t-orange">&lt;depend&gt;</text>
  <circle cx="480" cy="122" r="12" class="s-orange"/><circle cx="630" cy="122" r="12" class="s-orange"/>
  <text x="850" y="126" class="t-xs t-e t-mu">rclpy · rclcpp · std_msgs</text>

  <text x="30" y="172" class="t-sm t-mono t-b">&lt;build_depend&gt;</text>
  <circle cx="480" cy="168" r="12" class="s-blue"/>
  <text x="850" y="172" class="t-xs t-e t-mu">헤더만 필요한 것</text>

  <text x="30" y="218" class="t-sm t-mono t-b">&lt;exec_depend&gt;</text>
  <circle cx="630" cy="214" r="12" class="s-green"/>
  <text x="850" y="218" class="t-xs t-e t-mu">launch_ros · 파이썬 라이브러리</text>

  <text x="30" y="264" class="t-sm t-mono t-b">&lt;test_depend&gt;</text>
  <circle cx="780" cy="260" r="12" class="s-gray"/>
  <text x="850" y="264" class="t-xs t-e t-mu">ament_flake8 · pytest</text>
</svg>`
    }
  },

  sections: [
    /* ================================================================ 1 */
    {
      title: '워크스페이스란? — src · build · install · log',
      html: `
<p>지금까지 실행한 turtlesim · demo_nodes_py 는 모두 <code>apt</code> 로 설치된 패키지였습니다. 이제 <b>내 노드</b>를 만들 차례인데, ROS 2 는 아무 폴더의 파이썬 파일이나 <code>ros2 run</code> 으로 실행해 주지 않습니다. 코드를 <b>패키지</b>로 포장하고, <b>워크스페이스</b>에서 <b>빌드 · 설치</b>해야 합니다.</p>
<ul>
  <li><b>패키지(package)</b> — ROS 2 코드를 나누고 배포하는 단위. 노드 · 런치 파일 · 설정 · 메시지 정의 등을 한 폴더에 담고, <code>package.xml</code> 로 이름표를 붙인 것.</li>
  <li><b>워크스페이스(workspace)</b> — 여러 패키지를 모아 함께 빌드하는 작업 폴더. 관례상 <code>~/ros2_ws</code>.</li>
  <li><b>colcon</b> — 워크스페이스 안의 패키지들을 의존성 순서대로 빌드 · 설치해 주는 빌드 도구.</li>
</ul>
{{fig:wsLayout}}

<div class="box analogy"><div class="box-t">🍳 비유 — 식당 주방</div>
<code>src/</code> 는 <b>레시피 책장</b>(사람이 쓰는 곳), <code>build/</code> 는 <b>조리대</b>(재료를 다듬는 중간 과정), <code>install/</code> 은 <b>완성된 요리가 나가는 창구</b>(손님 = <code>ros2 run</code> 이 가져가는 곳), <code>log/</code> 는 <b>주방 일지</b>입니다. 레시피만 고치면 되고, 조리대와 창구는 요리사(colcon)가 알아서 채웁니다.</div>

<p>워크스페이스는 그냥 폴더라서 만들기도 간단합니다. <code>-p</code> 는 중간 폴더까지 한 번에 만드는 옵션입니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>mkdir -p ~/ros2_ws/src
cd ~/ros2_ws
ls</code></pre>

<div class="box tip"><div class="box-t">💡 git 에는 src/ 만</div>
<code>build/</code> · <code>install/</code> · <code>log/</code> 는 언제든 다시 만들 수 있는 산출물이라 git 저장소에 넣지 않습니다. 빌드가 꼬였을 때 <code>rm -rf build install log</code> 로 지우고 다시 빌드하는 것도 흔한 해결책이에요.</div>`
    },

    /* ================================================================ 2 */
    {
      title: '언더레이와 오버레이 — source 는 왜 매번?',
      html: `
<p>1장에서 터미널을 열 때마다 <code>source /opt/ros/jazzy/setup.bash</code> 를 했던 것을 기억하나요? 이 명령은 "ROS 2 가 설치된 곳"을 지금 터미널의 <b>환경 변수</b>(<code>PATH</code>, <code>PYTHONPATH</code>, <code>AMENT_PREFIX_PATH</code> 등)에 추가합니다. 그래야 <code>ros2</code> 명령이 패키지를 찾을 수 있어요.</p>
<p>내 워크스페이스도 똑같습니다. 빌드한 뒤 <code>install/setup.bash</code> 를 source 해야 <code>ros2 run</code> 이 내 패키지를 찾습니다. 이때 두 설치 위치는 <b>층</b>을 이룹니다.</p>
{{fig:overlay}}

<table class="tbl cmp">
  <thead><tr><th></th><th>언더레이 (underlay)</th><th>오버레이 (overlay)</th></tr></thead>
  <tbody>
    <tr><td>위치</td><td><code>/opt/ros/jazzy</code></td><td><code>~/ros2_ws/install</code></td></tr>
    <tr><td>내용</td><td>apt 로 설치한 ROS 2 전체</td><td>내가 빌드한 패키지</td></tr>
    <tr><td>source</td><td><code>source /opt/ros/jazzy/setup.bash</code></td><td><code>source install/setup.bash</code> (ros2_ws 에서)</td></tr>
    <tr><td>같은 이름의 패키지가 있으면</td><td colspan="2">오버레이가 우선 — 예: turtlesim 소스를 받아 고쳐 빌드하면 내 turtlesim 이 쓰입니다</td></tr>
  </tbody>
</table>

<div class="box warn"><div class="box-t">⚠️ 환경 변수는 "그 터미널에만" 적용됩니다</div>
source 는 <b>지금 열린 터미널 하나</b>의 환경만 바꿉니다. 새 터미널 탭을 열면 아무것도 source 되지 않은 상태라서 <code>Package 'my_pkg' not found</code> 가 납니다. 매번 치기 귀찮다면 <code>~/.bashrc</code> 끝에 적어 두세요. (워크스페이스 source 줄은 <b>빌드를 한 번 한 뒤</b>에 추가해야 오류가 안 납니다)</div>
<pre class="code" data-lang="bash"><code>echo "source /opt/ros/jazzy/setup.bash" &gt;&gt; ~/.bashrc
echo "source ~/ros2_ws/install/setup.bash" &gt;&gt; ~/.bashrc</code></pre>

<div class="box note"><div class="box-t">📝 setup.bash 와 local_setup.bash</div>
<code>install/setup.bash</code> 는 이 워크스페이스를 빌드할 때 쓰인 <b>언더레이까지 함께</b> 불러옵니다. <code>install/local_setup.bash</code> 는 <b>이 워크스페이스만</b> 불러옵니다. 보통은 <code>setup.bash</code> 를 쓰면 됩니다. 그리고 <b>빌드하는 터미널과 실행하는 터미널을 나누는 것</b>이 공식 튜토리얼의 권장 습관입니다(빌드 터미널에서 오버레이를 source 하면 꼬일 수 있음).</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — 빌드 순서와 오버레이 눈으로 보기</div>
<ol>
  <li>아래 시뮬레이터에서 <b>▶ colcon build</b> 를 눌러, 의존하는 패키지가 먼저 빌드되고 서로 상관없는 패키지는 <b>동시에</b> 빌드되는 것을 보세요.</li>
  <li>대상을 <code>--packages-select</code> 와 <code>--packages-up-to</code> 로 바꿔 무엇이 빌드되는지 비교해 보세요. (7절에서 다시 다룹니다)</li>
  <li>아래쪽의 언더레이 · 오버레이 그림에서 source 를 하기 전과 후에 <code>ros2 run</code> 이 무엇을 찾는지 확인해 보세요.</li>
</ol></div>
{{widget:colcon}}`
    },

    /* ================================================================ 3 */
    {
      title: '패키지 만들기 — ros2 pkg create',
      html: `
<p>패키지 뼈대는 <code>ros2 pkg create</code> 가 만들어 줍니다. 반드시 <b><code>~/ros2_ws/src</code> 안에서</b> 실행하세요. 파이썬 패키지는 이렇게 만듭니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --license Apache-2.0 --node-name my_node my_pkg
tree my_pkg</code></pre>
<table class="tbl">
  <thead><tr><th>옵션</th><th>뜻</th></tr></thead>
  <tbody>
    <tr><td><code>--build-type ament_python</code></td><td>파이썬 패키지 (<code>ament_cmake</code> 면 C++ · 인터페이스용, 기본값은 ament_cmake)</td></tr>
    <tr><td><code>--license Apache-2.0</code></td><td>라이선스를 정하고 LICENSE 파일도 만듦 (빼면 경고)</td></tr>
    <tr><td><code>--node-name my_node</code></td><td>"Hello" 를 찍는 예제 노드 파일과 실행 파일 등록까지 해 줌</td></tr>
    <tr><td><code>--dependencies rclpy std_msgs</code></td><td>package.xml 에 <code>&lt;depend&gt;</code> 를 미리 넣어 줌</td></tr>
    <tr><td><code>my_pkg</code> (마지막 인자)</td><td>패키지 이름 — <b>소문자 · 숫자 · 밑줄</b>만, 문자로 시작</td></tr>
  </tbody>
</table>

<p>C++ 패키지는 빌드 타입만 바꾸면 됩니다. 의존성은 <code>--dependencies</code> 로 함께 적을 수 있어요(패키지 이름 뒤에 두면 헷갈리지 않습니다).</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_cmake --license Apache-2.0 --node-name my_node my_cpp_pkg --dependencies rclcpp std_msgs
tree my_cpp_pkg</code></pre>
{{fig:pkgKinds}}

<div class="box practice"><div class="box-t">🧪 해 보기 — 파이썬 패키지 속 들여다보기</div>
<ol>
  <li>아래 탐색기에서 파일을 하나씩 눌러 보세요. <code>package.xml</code> → <code>setup.py</code> → <code>setup.cfg</code> → <code>my_package/my_node.py</code> 순서를 추천합니다.</li>
  <li><code>setup.py</code> 에서 <code>console_scripts</code> 줄을 찾아, <code>ros2 run</code> 에 쓰일 실행 파일 이름이 어디서 정해지는지 확인하세요.</li>
  <li><code>resource/</code> 안의 빈 파일은 왜 있을까요? 설명을 읽어 보세요.</li>
</ol></div>
{{widget:pkg|kind=python}}`
    },

    /* ================================================================ 4 */
    {
      title: 'package.xml — 패키지의 이름표',
      html: `
<p><code>package.xml</code> 은 모든 ROS 2 패키지에 꼭 있는 <b>이름표 겸 명세서</b>입니다. 이름 · 버전 · 설명 · 관리자 · 라이선스, 그리고 가장 중요한 <b>의존성</b>이 들어 있어요. colcon 은 이 파일을 보고 빌드 순서를 정하고, rosdep 은 이 파일을 보고 필요한 시스템 패키지를 설치합니다. 현재 형식은 <b>format 3</b> 입니다.</p>
<pre class="code" data-lang="xml"><code>&lt;?xml version="1.0"?&gt;
&lt;?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?&gt;
&lt;package format="3"&gt;
  &lt;name&gt;my_pkg&lt;/name&gt;                       <span class="cm">&lt;!-- 폴더 이름과 같게 --&gt;</span>
  &lt;version&gt;0.0.0&lt;/version&gt;
  &lt;description&gt;내 첫 ROS 2 패키지&lt;/description&gt;
  &lt;maintainer email="me@example.com"&gt;me&lt;/maintainer&gt;
  &lt;license&gt;Apache-2.0&lt;/license&gt;

  &lt;depend&gt;rclpy&lt;/depend&gt;                   <span class="cm">&lt;!-- 빌드 + 실행 모두 --&gt;</span>
  &lt;depend&gt;std_msgs&lt;/depend&gt;
  &lt;exec_depend&gt;launch_ros&lt;/exec_depend&gt;     <span class="cm">&lt;!-- 실행할 때만 --&gt;</span>

  &lt;test_depend&gt;ament_copyright&lt;/test_depend&gt;
  &lt;test_depend&gt;ament_flake8&lt;/test_depend&gt;
  &lt;test_depend&gt;ament_pep257&lt;/test_depend&gt;
  &lt;test_depend&gt;python3-pytest&lt;/test_depend&gt;

  &lt;export&gt;
    &lt;build_type&gt;ament_python&lt;/build_type&gt;   <span class="cm">&lt;!-- colcon 이 빌드 방식을 고르는 줄 --&gt;</span>
  &lt;/export&gt;
&lt;/package&gt;</code></pre>
{{fig:depTags}}

<table class="tbl">
  <thead><tr><th>태그</th><th>의미</th><th>예</th></tr></thead>
  <tbody>
    <tr><td><code>&lt;buildtool_depend&gt;</code></td><td>빌드 <b>도구</b> 자체</td><td>C++ 패키지의 <code>ament_cmake</code></td></tr>
    <tr><td><code>&lt;depend&gt;</code></td><td>빌드 · 실행 모두 필요 (build + exec + export 를 한 번에)</td><td><code>rclpy</code>, <code>rclcpp</code>, <code>std_msgs</code></td></tr>
    <tr><td><code>&lt;build_depend&gt;</code></td><td>빌드할 때만</td><td>헤더만 쓰는 라이브러리</td></tr>
    <tr><td><code>&lt;exec_depend&gt;</code></td><td>실행할 때만</td><td>런치에서 쓰는 <code>launch_ros</code>, 다른 패키지의 노드</td></tr>
    <tr><td><code>&lt;test_depend&gt;</code></td><td>테스트(<code>colcon test</code>)할 때만</td><td><code>ament_flake8</code>, <code>python3-pytest</code></td></tr>
  </tbody>
</table>

<div class="box tip"><div class="box-t">💡 import 했으면 package.xml 에도!</div>
노드 코드에서 <code>from geometry_msgs.msg import Twist</code> 를 했다면 <code>&lt;depend&gt;geometry_msgs&lt;/depend&gt;</code> 를 추가하세요. 내 컴퓨터에서는 이미 설치되어 있어 문제없이 돌더라도, 다른 컴퓨터에서 <code>rosdep</code> 으로 설치할 때나 colcon 이 빌드 순서를 정할 때 이 정보가 쓰입니다.</div>`
    },

    /* ================================================================ 5 */
    {
      title: '파이썬 패키지 — setup.py 와 setup.cfg',
      html: `
<p>ament_python 패키지는 파이썬 표준 도구(setuptools)의 <code>setup.py</code> 로 설치 방법을 적습니다. 꼭 알아야 할 곳은 두 군데, <b>entry_points</b> 와 <b>data_files</b> 입니다.</p>
{{fig:entryPoint}}

<pre class="code" data-lang="python"><code>import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'my_pkg'

setup(
    name=package_name,
    version='0.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        <span class="cm"># ↓ 직접 추가: launch/ · config/ 폴더의 파일도 설치</span>
        (os.path.join('share', package_name, 'launch'), glob('launch/*launch.[pxy][yma]*')),
        (os.path.join('share', package_name, 'config'), glob('config/*.yaml')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='me',
    maintainer_email='me@example.com',
    description='내 첫 ROS 2 패키지',
    license='Apache-2.0',
    entry_points={
        'console_scripts': [
            'my_node = my_pkg.my_node:main',
            'talker = my_pkg.talker:main',        <span class="cm"># 노드를 추가할 때마다 한 줄씩</span>
        ],
    },
)</code></pre>

<div class="cards c2">
  <div class="card green"><div class="ci">🚪</div><b>entry_points · console_scripts</b><p><code>'실행이름 = 패키지.모듈:함수'</code>. 새 노드 파일을 만들면 <b>여기에 한 줄을 추가해야</b> <code>ros2 run</code> 으로 실행할 수 있습니다. 가장 많이 잊는 곳!</p></div>
  <div class="card orange"><div class="ci">📁</div><b>data_files</b><p>파이썬 코드가 아닌 파일(런치 · YAML · URDF)을 <code>install/my_pkg/share/my_pkg/…</code> 로 복사합니다. 적지 않으면 설치되지 않아 <code>ros2 launch</code> 가 파일을 못 찾아요(10장).</p></div>
</div>

<p><code>setup.cfg</code> 는 거의 건드리지 않지만, 실행 파일을 <code>lib/my_pkg/</code> 에 두라는 중요한 약속이 들어 있습니다. <code>ros2 run</code> 은 바로 이 폴더에서 실행 파일을 찾아요.</p>
<pre class="code" data-lang="ini"><code>[develop]
script_dir=$base/lib/my_pkg
[install]
install_scripts=$base/lib/my_pkg</code></pre>

<div class="box note"><div class="box-t">📝 resource/my_pkg 는 빈 파일</div>
<code>resource/</code> 안의 패키지 이름 파일은 내용이 없는 <b>표시(marker)</b>입니다. 설치되면 <code>share/ament_index/resource_index/packages/</code> 에 놓여, <code>ros2 pkg list</code> 같은 도구가 "이 패키지가 설치되어 있다"는 것을 알게 해 줍니다. 지우면 안 됩니다.</div>`
    },

    /* ================================================================ 6 */
    {
      title: 'C++ 패키지 — CMakeLists.txt 의 핵심',
      html: `
<p>ament_cmake 패키지는 C++ 빌드 도구 CMake 의 <code>CMakeLists.txt</code> 로 빌드 방법을 적습니다. 처음 보면 길어 보이지만, 노드 하나를 만들 때 필요한 줄은 다섯 종류뿐입니다.</p>
<pre class="code" data-lang="cmake"><code>cmake_minimum_required(VERSION 3.8)
project(my_cpp_pkg)                                   <span class="cm"># 패키지 이름과 같게</span>

if(CMAKE_COMPILER_IS_GNUCXX OR CMAKE_CXX_COMPILER_ID MATCHES "Clang")
  add_compile_options(-Wall -Wextra -Wpedantic)
endif()

<span class="cm"># ① 필요한 패키지 찾기 (package.xml 의 depend 와 짝)</span>
find_package(ament_cmake REQUIRED)
find_package(rclcpp REQUIRED)
find_package(std_msgs REQUIRED)

<span class="cm"># ② 실행 파일 만들기: 이름 + 소스 파일</span>
add_executable(my_node src/my_node.cpp)

<span class="cm"># ③ 의존 라이브러리 연결</span>
ament_target_dependencies(my_node rclcpp std_msgs)

<span class="cm"># ④ 설치: 실행 파일은 lib/패키지이름 으로 (ros2 run 이 찾는 곳)</span>
install(TARGETS my_node
  DESTINATION lib/\${PROJECT_NAME})

<span class="cm"># (런치 · 설정 폴더도 설치하려면)</span>
install(DIRECTORY launch config
  DESTINATION share/\${PROJECT_NAME})

<span class="cm"># ⑤ 마지막 줄은 항상</span>
ament_package()</code></pre>

<table class="tbl">
  <thead><tr><th>줄</th><th>파이썬 패키지의 무엇과 같나</th></tr></thead>
  <tbody>
    <tr><td><code>find_package(...)</code></td><td>package.xml 의 <code>&lt;depend&gt;</code> 와 짝 — 둘 다 적어야 함</td></tr>
    <tr><td><code>add_executable</code> + <code>install(TARGETS …)</code></td><td>setup.py 의 <code>console_scripts</code></td></tr>
    <tr><td><code>install(DIRECTORY …)</code></td><td>setup.py 의 <code>data_files</code></td></tr>
    <tr><td><code>ament_package()</code></td><td>(ament 에 패키지를 등록 — 빠지면 설치가 불완전)</td></tr>
  </tbody>
</table>

<div class="box trend"><div class="box-t">🚀 최신 동향 — ament_target_dependencies 의 퇴장</div>
Jazzy 에서는 위처럼 <code>ament_target_dependencies()</code> 를 쓰는 것이 일반적이지만, 다음 배포판 <b>Kilted(2025-05)</b>부터 이 매크로는 <b>폐기 예정(deprecated)</b> 경고가 나옵니다. 대신 표준 CMake 방식인 <code>target_link_libraries(my_node PUBLIC rclcpp::rclcpp \${std_msgs_TARGETS})</code> 를 권장합니다. 새로 배우는 분은 두 방식을 모두 알아 두세요.</div>

<div class="box practice"><div class="box-t">🧪 해 보기 — C++ 패키지 속 들여다보기</div>
<ol>
  <li>아래 탐색기에서 <code>CMakeLists.txt</code> 를 열고 위 ①~⑤에 해당하는 줄을 찾아보세요.</li>
  <li><code>package.xml</code> 에서 <code>&lt;buildtool_depend&gt;ament_cmake&lt;/buildtool_depend&gt;</code> 와 <code>&lt;build_type&gt;ament_cmake</code> 두 줄을 찾으세요. 파이썬 패키지와 무엇이 다른가요?</li>
  <li><code>src/my_node.cpp</code> 는 처음엔 rclcpp 를 쓰지 않는 "hello world" 입니다. 9장에서 이 파일을 실제 노드로 바꿉니다.</li>
</ol></div>
{{widget:pkg|kind=cmake}}
<p class="t-mu">※ 이 사이트의 터미널은 C++ 컴파일을 흉내만 냅니다. C++ 노드 실행은 실제 Ubuntu + ROS 2 에서 해 보세요. 파이썬 패키지는 브라우저에서도 실제로 실행됩니다.</p>`
    },

    /* ================================================================ 7 */
    {
      title: 'colcon build — 옵션과 의존성 설치',
      html: `
<p><code>colcon build</code> 는 <b>워크스페이스 최상위(<code>~/ros2_ws</code>)</b>에서 실행합니다. <code>src/</code> 아래의 모든 패키지를 찾아 <code>package.xml</code> 의 의존성 순서대로 빌드하고 <code>install/</code> 에 설치합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon list
colcon build</code></pre>

<table class="tbl">
  <thead><tr><th>옵션</th><th>하는 일</th><th>언제</th></tr></thead>
  <tbody>
    <tr><td><code>--packages-select my_pkg</code></td><td>이 패키지 <b>만</b> 빌드 (의존 패키지는 이미 빌드돼 있어야 함)</td><td>패키지가 많은데 하나만 고쳤을 때</td></tr>
    <tr><td><code>--packages-up-to my_pkg</code></td><td>이 패키지와 <b>이것이 의존하는 패키지들</b>까지</td><td>처음 빌드할 때, 의존성이 바뀌었을 때</td></tr>
    <tr><td><code>--symlink-install</code></td><td>파일을 복사하지 않고 <b>링크</b>로 설치 → 파이썬 코드 · 런치 · YAML 을 고쳐도 다시 빌드할 필요 없음</td><td>파이썬 개발 중 (단, setup.py 를 바꾸면 다시 빌드)</td></tr>
    <tr><td><code>--event-handlers console_direct+</code></td><td>빌드 출력을 화면에 전부 바로 보여 줌</td><td>빌드 오류를 자세히 볼 때</td></tr>
    <tr><td><code>--parallel-workers 2</code></td><td>동시에 빌드할 패키지 수 제한</td><td>라즈베리파이처럼 메모리가 작을 때</td></tr>
    <tr><td><code>--cmake-args -DCMAKE_BUILD_TYPE=Release</code></td><td>C++ 최적화 빌드</td><td>실제 로봇에 올릴 때</td></tr>
  </tbody>
</table>
<pre class="code" data-lang="bash" data-run="sh"><code>colcon build --packages-select my_pkg</code></pre>
<pre class="code" data-lang="bash"><code>colcon build --symlink-install --packages-up-to my_pkg
colcon build --packages-select my_cpp_pkg --event-handlers console_direct+</code></pre>
<pre class="code out" data-lang="출력"><code>Starting &gt;&gt;&gt; my_pkg
Finished &lt;&lt;&lt; my_pkg [0.93s]

Summary: 1 package finished [1.21s]</code></pre>

<h3>rosdep — 남의 패키지를 받았을 때</h3>
<p>GitHub 에서 받은 패키지를 <code>src/</code> 에 넣으면, 그 패키지가 필요로 하는 다른 패키지(예: <code>ros-jazzy-nav2-msgs</code>)가 내 컴퓨터에 없을 수 있습니다. <b>rosdep</b> 은 <code>src/</code> 안 모든 <code>package.xml</code> 의 의존성을 읽어 빠진 것을 <code>apt</code> 로 설치해 줍니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
rosdep install --from-paths src -y --ignore-src</code></pre>
<p class="t-mu"><code>--from-paths src</code>: src 아래 패키지들의 의존성을 보라 · <code>--ignore-src</code>: src 안에 이미 소스가 있는 패키지는 설치하지 마라 · <code>-y</code>: 묻지 말고 설치. (처음 한 번은 <code>sudo rosdep init</code> 과 <code>rosdep update</code> 가 필요합니다)</p>

{{fig:buildFlow}}`
    },

    /* ================================================================ 8 */
    {
      title: '처음부터 끝까지 따라 하기 — 내 talker 노드 실행',
      html: `
<p>이제 모든 것을 합쳐 봅시다. 목표는 <b>내 패키지 <code>my_pkg</code> 의 <code>my_node</code> 가 <code>/topic</code> 에 "Hello World" 를 발행</b>하고, 그 모습을 rqt_graph 에서 보는 것입니다. 아래 코드 블록을 <b>위에서부터 순서대로</b> ▶ 실행하세요. (이미 3절에서 <code>my_pkg</code> 를 만들었다면 1단계는 "The directory already exists" 가 나오니 건너뛰어도 됩니다. 처음부터 다시 하려면 <code>reset-ws</code> 를 입력하세요 — 이 사이트 전용 명령입니다)</p>

<h3>1단계 — 패키지 만들기</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python --license Apache-2.0 --node-name my_node my_pkg --dependencies rclpy std_msgs
cat my_pkg/my_pkg/my_node.py</code></pre>

<h3>2단계 — 노드 코드 쓰기</h3>
<p>편집기 창을 열고, 안의 내용을 모두 지운 뒤 아래 코드를 붙여 넣고 <kbd>Ctrl</kbd>+<kbd>S</kbd> 로 저장하세요. (코드 블록 아래의 <b>⧉ 복사</b> 버튼을 쓰면 편합니다) 8장에서 이 코드를 한 줄씩 해부합니다.</p>
<pre class="code" data-lang="bash" data-run="sh"><code>nano ~/ros2_ws/src/my_pkg/my_pkg/my_node.py</code></pre>
<pre class="code" data-lang="python"><code>import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class MinimalPublisher(Node):

    def __init__(self):
        super().__init__('minimal_publisher')
        self.publisher_ = self.create_publisher(String, 'topic', 10)
        self.timer = self.create_timer(0.5, self.timer_callback)
        self.i = 0

    def timer_callback(self):
        msg = String()
        msg.data = 'Hello World: %d' % self.i
        self.publisher_.publish(msg)
        self.get_logger().info('Publishing: "%s"' % msg.data)
        self.i += 1


def main(args=None):
    rclpy.init(args=args)
    node = MinimalPublisher()
    rclpy.spin(node)
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()</code></pre>
<p>함수 이름이 <b><code>main</code></b> 인 것이 중요합니다. <code>setup.py</code> 의 <code>'my_node = my_pkg.my_node:main'</code> 이 바로 이 함수를 가리켜요.</p>

<h3>3단계 — 빌드 (워크스페이스 최상위에서!)</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>cd ~/ros2_ws
colcon build --packages-select my_pkg</code></pre>

<h3>4단계 — source 하고 실행</h3>
<pre class="code" data-lang="bash" data-run="sh"><code>source install/setup.bash
ros2 run my_pkg my_node</code></pre>
<pre class="code out" data-lang="출력"><code>[INFO] [1727000000.100000000] [minimal_publisher]: Publishing: "Hello World: 0"
[INFO] [1727000000.600000000] [minimal_publisher]: Publishing: "Hello World: 1"
…</code></pre>

<div class="box practice"><div class="box-t">🧪 해 보기 — 내 노드를 그래프에 올리기</div>
<ol>
  <li>위 1~4단계 코드 블록을 순서대로 실행합니다. 결과는 아래 실습 창의 터미널에 찍히고, 오른쪽 rqt_graph 에 <code>/minimal_publisher</code> → <code>/topic</code> 이 나타납니다.</li>
  <li><kbd>Ctrl</kbd>+<kbd>C</kbd> 로 멈춘 뒤 <code>ros2 pkg executables my_pkg</code>, <code>ros2 pkg prefix my_pkg</code> 로 내 패키지가 어디에 설치됐는지 확인하세요.</li>
  <li>코드의 <code>'Hello World: %d'</code> 를 <code>'안녕 ROS 2: %d'</code> 로 바꾸고 저장 → <b>다시 빌드</b> → 실행해서 바뀌는지 보세요. (실제 Ubuntu 에서 <code>--symlink-install</code> 로 빌드했다면 재빌드 없이 바로 반영됩니다)</li>
  <li>도전: <code>my_pkg/listener.py</code> 를 새로 만들고 <code>setup.py</code> 의 <code>console_scripts</code> 에 <code>'listener = my_pkg.listener:main'</code> 을 추가해 두 번째 노드를 만들어 보세요.</li>
</ol></div>
{{widget:lab|with=graph|title=내 패키지 만들고 실행하기|h=440}}

<div class="box tip"><div class="box-t">💡 source 를 빼먹으면?</div>
3단계 뒤 바로 <code>ros2 run my_pkg my_node</code> 를 하면 <code>Package 'my_pkg' not found</code> 가 납니다. 빌드는 <code>install/</code> 에 결과물을 놓기만 하고, 지금 터미널이 그곳을 알게 하는 것은 source 의 몫이기 때문이에요. 이 사이트의 터미널도 똑같이 동작하니 일부러 실수해 보세요.</div>`
    },

    /* ================================================================ 9 */
    {
      title: '자주 나는 오류와 해결법',
      html: `
<p>처음 패키지를 만들 때 겪는 오류는 대부분 아래 표 안에 있습니다. 오류가 나면 당황하지 말고 <b>메시지의 핵심 단어</b>로 이 표를 찾아보세요.</p>
<table class="tbl cmp">
  <thead><tr><th>증상</th><th>원인</th><th>해결</th></tr></thead>
  <tbody>
    <tr><td><code>Package 'my_pkg' not found</code></td><td>새 터미널에서 오버레이를 source 하지 않음 / 빌드를 안 함</td><td><code>cd ~/ros2_ws &amp;&amp; source install/setup.bash</code> (필요하면 먼저 빌드)</td></tr>
    <tr><td><code>No executable found</code></td><td>setup.py 의 <code>console_scripts</code> 에 등록 안 함, 또는 등록 후 다시 빌드 안 함</td><td>entry point 추가 → <code>colcon build</code> → source</td></tr>
    <tr><td><code>ModuleNotFoundError</code> / <code>AttributeError: ... has no attribute 'main'</code></td><td>entry point 오타 (<code>my_pkg.my_nod:main</code>, 함수 이름이 main 이 아님)</td><td><code>'실행이름 = 패키지.모듈:함수'</code> 를 파일 · 함수 이름과 한 글자씩 대조</td></tr>
    <tr><td><code>src/build</code>, <code>src/install</code> 폴더가 생김</td><td><code>src/</code> 안에서 <code>colcon build</code> 를 실행</td><td>그 폴더들을 지우고 <b>~/ros2_ws 최상위</b>에서 다시 빌드</td></tr>
    <tr><td>코드를 고쳤는데 옛날 동작 그대로</td><td>다시 빌드하지 않음 (복사 설치)</td><td>다시 빌드, 또는 <code>--symlink-install</code> 사용</td></tr>
    <tr><td><code>ros2 launch</code> 가 런치 파일을 못 찾음</td><td>setup.py <code>data_files</code> / CMake <code>install(DIRECTORY)</code> 에 launch 폴더를 안 적음</td><td>설치 규칙 추가 후 다시 빌드</td></tr>
    <tr><td><code>Could not find a package configuration file provided by "xxx"</code> (C++)</td><td>그 패키지가 설치되지 않았거나 언더레이를 source 안 함</td><td><code>rosdep install --from-paths src -y --ignore-src</code>, source 확인</td></tr>
    <tr><td>패키지 이름 오류 (<code>My-Pkg</code>)</td><td>대문자 · 하이픈 사용</td><td>소문자 · 숫자 · 밑줄만: <code>my_pkg</code></td></tr>
  </tbody>
</table>

<div class="box practice"><div class="box-t">🧪 해 보기 — 일부러 틀려 보기</div>
<ol>
  <li>8절 실습 창의 터미널에서 <code>nano ~/ros2_ws/src/my_pkg/setup.py</code> 로 entry point 를 <code>'my_node = my_pkg.my_nod:main'</code> 으로 바꿔 저장하고 다시 빌드해 보세요. 이 사이트의 터미널은 <b>빌드 단계에서</b> 모듈 파일이 없다고 알려 줍니다. (실제 ROS 2 는 빌드는 성공하고, <code>ros2 run</code> 할 때 <code>ModuleNotFoundError</code> 로 드러납니다)</li>
  <li>원래대로 고친 뒤, <code>cd ~/ros2_ws/src</code> 에서 <code>colcon build</code> 를 해 보면 어떤 경고가 나오나요?</li>
  <li>마지막으로 올바르게 빌드 · source · 실행해서 모든 것을 되돌려 놓으세요.</li>
</ol></div>

<div class="box dev"><div class="box-t">👩‍💻 실무 관점 — 좋은 습관 네 가지</div>
<ul>
  <li><b>빌드 터미널과 실행 터미널을 나눈다</b> — 빌드하는 터미널에서는 오버레이를 source 하지 않습니다.</li>
  <li><b>파이썬 개발 중에는 <code>--symlink-install</code></b> — 매번 빌드하는 시간을 아낍니다.</li>
  <li><b>패키지는 역할별로 쪼갠다</b> — <code>my_robot_description</code>(URDF), <code>my_robot_bringup</code>(런치 · 설정), <code>my_robot_interfaces</code>(msg/srv) 처럼. 2절의 colcon 위젯이 바로 이런 구성입니다.</li>
  <li><b>package.xml 의존성을 정직하게</b> — 다른 사람이 <code>rosdep install</code> 한 번으로 빌드할 수 있게.</li>
</ul></div>

<div class="box note"><div class="box-t">📝 함께 보면 좋은 강좌</div>
실제 로봇팔 패키지로 워크스페이스를 구성하고 RViz2 를 띄우는 과정은 <a href="https://samcho93.github.io/studySOArm101/lessons/ch16.html" target="_blank" rel="noopener">SO-ARM101 강좌 16장(워크스페이스 · RViz2)</a>에서 이어서 볼 수 있습니다.</div>`
    }
  ],

  videos: [
    { title: 'Making Your First ROS Package | Getting Ready to Build Robots with ROS #5', channel: 'Articulated Robotics', url: 'https://www.youtube.com/watch?v=Y_SyQXTL2XU', lang: 'en', min: '10분', desc: '워크스페이스 · 패키지 · colcon · source 의 관계를 그림으로 설명합니다. 1~2절과 딱 맞습니다.' },
    { title: 'Create and Set Up a ROS2 Workspace - ROS2 Tutorial 3', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=3GbrKQ7G2P0', lang: 'en', min: '8분', desc: 'ros2_ws 만들기, colcon build, .bashrc 설정까지 따라 하기.' },
    { title: 'Create a ROS2 Python Package - ROS2 Tutorial 4', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=iBGZ8LEvkCY', lang: 'en', min: '11분', desc: 'ament_python 패키지를 만들고 setup.py · package.xml 을 살펴봅니다 (3~5절).' },
    { title: 'ROS2 - Create a Package for Both C++ and Python Nodes', channel: 'Robotics Back-End', url: 'https://www.youtube.com/watch?v=RoRq4XpDEtQ', lang: 'en', min: '22분', desc: 'CMakeLists.txt 로 C++ 와 파이썬 노드를 한 패키지에 담는 고급 구성. 6절을 마친 뒤 보세요.' },
    { title: 'How to Create a Workspace in ROS 2 Jazzy', channel: 'Automatic Addison', url: 'https://www.youtube.com/watch?v=EgJ_Tujmq4Y', lang: 'en', min: '6분', desc: 'Jazzy 기준으로 워크스페이스를 만드는 짧은 영상.' },
    { title: 'ROS2 Build Packages With Colcon', channel: 'Kevin Wood | Robotics & AI', url: 'https://www.youtube.com/watch?v=KLvUMtYI_Ag', lang: 'en', min: '4분', desc: 'colcon build 옵션을 4분 만에 정리합니다 (7절).' },
    { title: '[ROS 2 - 초급] #12 ROS 2의 빌드 시스템과 빌드 툴', channel: 'KIMe Lab', url: 'https://www.youtube.com/watch?v=gBOXdh_I4Hc', lang: 'ko', min: '20분', desc: 'ament · colcon · 빌드 시스템의 관계를 한국어로 자세히 설명합니다.' },
    { title: '[ROS 2 - 중급] #1 패키지 파일', channel: 'KIMe Lab', url: 'https://www.youtube.com/watch?v=_1MpViU1Kjo', lang: 'ko', min: '28분', desc: 'package.xml · setup.py · CMakeLists.txt 를 한국어로 한 줄씩 살펴봅니다 (4~6절).' }
  ],

  terms: [
    ['워크스페이스(workspace)', '여러 패키지를 모아 함께 빌드하는 작업 폴더. 관례상 ~/ros2_ws, 안에 src · build · install · log'],
    ['패키지(package)', 'ROS 2 코드를 나누고 배포하는 단위. package.xml 이 있는 폴더'],
    ['colcon', '워크스페이스의 패키지들을 의존성 순서대로 빌드 · 설치하는 빌드 도구'],
    ['ament_python · ament_cmake', '파이썬(setup.py) / C++ · 인터페이스(CMakeLists.txt) 패키지의 빌드 방식'],
    ['언더레이(underlay)', '먼저 source 하는 기반 환경. 보통 /opt/ros/jazzy'],
    ['오버레이(overlay)', '언더레이 위에 겹쳐 쓰는 내 워크스페이스(install/). 같은 이름이면 오버레이가 우선'],
    ['source install/setup.bash', '빌드 결과를 지금 터미널의 환경 변수에 추가하는 명령. 새 터미널마다 필요'],
    ['package.xml', '패키지의 이름 · 버전 · 라이선스 · 의존성을 적는 명세서 (format 3)'],
    ['<depend> · <exec_depend> · <test_depend>', '빌드+실행 / 실행만 / 테스트만 필요한 의존성을 적는 package.xml 태그'],
    ['entry_points (console_scripts)', "setup.py 에서 '실행이름 = 패키지.모듈:함수' 로 ros2 run 실행 파일을 등록하는 곳"],
    ['data_files', 'setup.py 에서 런치 · YAML 같은 비 파이썬 파일을 share/ 로 설치하도록 적는 곳'],
    ['CMakeLists.txt', 'C++ 패키지의 빌드 규칙. find_package → add_executable → ament_target_dependencies → install → ament_package'],
    ['--symlink-install', '파일을 복사 대신 링크로 설치해, 파이썬 코드 · 런치 수정 시 재빌드를 생략할 수 있게 하는 colcon 옵션'],
    ['--packages-select · --packages-up-to', '지정한 패키지만 / 지정한 패키지와 그 의존 패키지까지 빌드하는 colcon 옵션'],
    ['rosdep', 'package.xml 의 의존성을 읽어 빠진 시스템 패키지를 apt 로 설치해 주는 도구']
  ],

  summary: [
    '워크스페이스 = <code>src/</code>(사람이 쓰는 곳) + <code>build/ install/ log/</code>(colcon 이 만드는 곳). 빌드는 <b>최상위에서</b>',
    '<b>언더레이</b>(/opt/ros/jazzy) 위에 <b>오버레이</b>(~/ros2_ws/install)를 겹친다. source 는 <b>터미널마다</b>',
    '<code>ros2 pkg create --build-type ament_python --license Apache-2.0 --node-name my_node my_pkg</code> 로 뼈대 만들기',
    '<code>package.xml</code> 에 의존성(<code>depend</code> · <code>exec_depend</code> · <code>test_depend</code>), 파이썬은 <code>setup.py</code> 의 <b>console_scripts · data_files</b>, C++ 은 <code>CMakeLists.txt</code> 의 find_package · add_executable · install',
    '<code>colcon build --packages-select</code> · <code>--packages-up-to</code> · <code>--symlink-install</code>, 남의 패키지는 <code>rosdep install --from-paths src -y --ignore-src</code>',
    '흐름: <b>create → 코드 작성 → colcon build → source install/setup.bash → ros2 run</b>',
    '대표 오류: source 안 함(Package not found) · entry point 누락/오타 · src 안에서 빌드'
  ],

  quiz: [
    { q: '워크스페이스에서 사람이 직접 코드를 만들고 고치는 폴더는?', options: ['build/', 'install/', 'src/', 'log/'], answer: 2, explain: 'src/ 에만 손을 댑니다. build · install · log 는 colcon build 가 만드는 산출물이라 지워도 다시 빌드하면 생깁니다.' },
    { q: '새 터미널을 열고 <code>ros2 run my_pkg my_node</code> 를 했더니 <code>Package \'my_pkg\' not found</code> 가 났다. 빌드는 이미 성공했다. 가장 알맞은 해결은?', options: ['colcon build 를 src 폴더에서 다시 한다', 'cd ~/ros2_ws 후 source install/setup.bash 를 한다', 'package.xml 을 지운다', 'sudo apt install my_pkg'], answer: 1, explain: 'source 는 그 터미널에만 적용됩니다. 새 터미널에서는 오버레이를 다시 source 해야 ros2 가 내 패키지를 찾습니다.' },
    { q: '파이썬 패키지에 새 노드 파일 <code>talker.py</code>(main 함수 포함)를 추가했다. <code>ros2 run my_pkg talker</code> 로 실행하려면 무엇을 해야 할까?', options: ['아무것도 안 해도 된다', "setup.py 의 console_scripts 에 'talker = my_pkg.talker:main' 을 추가하고 다시 빌드 · source", 'CMakeLists.txt 에 add_executable 을 추가', 'package.xml 의 name 을 talker 로 바꾼다'], answer: 1, explain: 'ament_python 패키지의 실행 파일은 setup.py 의 entry_points(console_scripts)로 등록됩니다. 등록 후 빌드해야 install/…/lib/my_pkg/talker 가 만들어집니다.' },
    { q: '<code>&lt;depend&gt;rclpy&lt;/depend&gt;</code> 에 대한 설명으로 옳은 것은?', options: ['테스트할 때만 필요하다는 뜻', '빌드와 실행 모두에 필요하다는 뜻', 'rclpy 를 새로 설치하라는 명령', 'C++ 패키지에서만 쓸 수 있다'], answer: 1, explain: '<depend> 는 build_depend + exec_depend(+ export)를 한 번에 적는 태그입니다. 실행만 필요하면 <exec_depend>, 테스트만이면 <test_depend> 를 씁니다.' },
    { q: '패키지가 30개인 워크스페이스에서 <code>my_pkg</code> 하나만 고쳤다. 가장 빠르게 빌드하는 명령은?', options: ['colcon build', 'colcon build --packages-select my_pkg', 'colcon build --packages-up-to my_pkg', 'rosdep install --from-paths src'], answer: 1, explain: '--packages-select 는 지정한 패키지만 빌드합니다. --packages-up-to 는 그 패키지가 의존하는 패키지까지 빌드하고, 옵션 없는 colcon build 는 전부 빌드합니다.' },
    { q: '파이썬 노드 코드를 고칠 때마다 다시 빌드하지 않고 바로 반영되게 하려면?', options: ['--symlink-install 로 빌드해 둔다', '--parallel-workers 1 로 빌드한다', 'package.xml 을 format 2 로 바꾼다', 'log 폴더를 지운다'], answer: 0, explain: '--symlink-install 은 install/ 에 복사본 대신 src/ 파일로의 링크를 둡니다. 단, setup.py 에 새 entry point 를 추가하는 등 설치 규칙이 바뀌면 다시 빌드해야 합니다.' },
    { q: 'C++ 패키지의 CMakeLists.txt 에서 <code>ros2 run</code> 이 실행 파일을 찾을 수 있게 하는 줄은?', options: ['find_package(rclcpp REQUIRED)', 'add_compile_options(-Wall)', 'install(TARGETS my_node DESTINATION lib/${PROJECT_NAME})', 'cmake_minimum_required(VERSION 3.8)'], answer: 2, explain: 'add_executable 로 만든 실행 파일을 install(TARGETS …) 으로 install/…/lib/패키지이름 에 설치해야 ros2 run 이 찾을 수 있습니다.' }
  ],

  slides: [
    {
      title: '오늘의 목표',
      layout: 'center',
      html: `<div class="s-big">🐢 ros2 run turtlesim …<br>→ 🙋 ros2 run <b>my_pkg my_node</b></div>
<p class="s-center step">내 코드를 <b>패키지</b>로 포장해 <b>워크스페이스</b>에서 <b>빌드</b>하기</p>`,
      notes: '지금까지는 남의 패키지를 실행만 했다는 점을 짚고, 오늘 끝에는 모두 자기 노드를 rqt_graph 에 띄운다는 목표를 선언합니다. (2분)'
    },
    {
      title: '워크스페이스 = 폴더 넷',
      html: `{{fig:wsLayout|nocap}}`,
      notes: 'src 만 사람이 만지고 나머지 셋은 colcon 이 만든다는 것이 핵심입니다. 주방 비유(레시피 책장 · 조리대 · 배식 창구 · 주방 일지)를 곁들이세요. (4분)'
    },
    {
      title: '언더레이 + 오버레이',
      html: `{{fig:overlay|nocap}}`,
      notes: '투명 필름을 겹치는 모습으로 설명하면 좋습니다. 위 필름(오버레이)에 같은 그림이 있으면 그게 보입니다. “새 터미널에서 Package not found 가 나는 이유는?” 하고 꼭 물어보세요. (5분)'
    },
    {
      title: 'source 는 터미널마다',
      layout: 'center',
      html: `<div class="s-big">새 터미널 = 새 환경<br><code>source install/setup.bash</code></div>
<p class="s-center step s-small">귀찮으면 ~/.bashrc 에 (빌드를 한 번 한 뒤에)</p>`,
      notes: '초보자 오류 1위입니다. 한 번 더 강조하고 넘어갑니다. (2분)'
    },
    {
      title: '빌드 순서 · 병렬 빌드',
      html: `{{widget:colcon}}`,
      notes: '▶ colcon build 를 눌러 의존 순서와 병렬 빌드를 보여 줍니다. --packages-select 와 --packages-up-to 를 바꿔 가며 차이를 확인시키세요. (5분)'
    },
    {
      title: '두 종류의 패키지',
      html: `{{fig:pkgKinds|nocap}}`,
      notes: '파이썬은 setup.py, C++ 은 CMakeLists.txt. 공통은 package.xml. 파이썬 패키지 안에 같은 이름의 폴더가 한 번 더 있는 것을 짚으세요(파이썬 모듈 폴더). (4분)'
    },
    {
      title: 'ros2 pkg create',
      html: `<pre class="code" data-lang="bash"><code>cd ~/ros2_ws/src
ros2 pkg create --build-type ament_python \\
  --license Apache-2.0 --node-name my_node my_pkg</code></pre>
<p class="s-small step">이름 규칙: 소문자 · 숫자 · 밑줄 (my_pkg ✓ · My-Pkg ✗)</p>`,
      notes: '옵션 네 개의 의미를 하나씩 짚습니다. --node-name 이 예제 노드와 entry point 까지 만들어 준다는 점이 편리합니다. (3분)'
    },
    {
      title: 'package.xml 의존성',
      html: `{{fig:depTags|nocap}}`,
      notes: '헷갈리면 depend 를 쓰면 된다고 안심시킵니다. import 한 패키지는 package.xml 에도 적어야 다른 컴퓨터에서 rosdep 으로 설치된다는 점을 강조하세요. (4분)'
    },
    {
      title: 'setup.py 의 한 줄',
      html: `{{fig:entryPoint|nocap}}`,
      notes: '실행 이름 = 모듈 : 함수. 새 노드를 만들 때 이 줄을 빼먹는 실수가 가장 흔합니다. data_files 는 런치 파일(10장)에서 다시 등장한다고 예고하세요. (4분)'
    },
    {
      title: 'CMakeLists.txt 5줄 요약',
      html: `<div class="s-points">
<p class="step">① <code>find_package(rclcpp REQUIRED)</code></p>
<p class="step">② <code>add_executable(my_node src/my_node.cpp)</code></p>
<p class="step">③ <code>ament_target_dependencies(my_node rclcpp)</code></p>
<p class="step">④ <code>install(TARGETS my_node DESTINATION lib/\${PROJECT_NAME})</code></p>
<p class="step">⑤ <code>ament_package()</code></p>
</div>`,
      notes: '파이썬 패키지의 무엇과 짝인지 연결해 줍니다(find_package↔depend, add_executable+install↔console_scripts). Kilted 부터 ③이 target_link_libraries 로 바뀌는 추세도 한마디. (4분)'
    },
    {
      title: 'colcon build 옵션',
      html: `<table class="tbl">
<tbody>
<tr class="step"><td><code>--packages-select X</code></td><td>X 만</td></tr>
<tr class="step"><td><code>--packages-up-to X</code></td><td>X + 의존 패키지</td></tr>
<tr class="step"><td><code>--symlink-install</code></td><td>파이썬 수정 즉시 반영</td></tr>
<tr class="step"><td><code>--event-handlers console_direct+</code></td><td>출력 전부 보기</td></tr>
</tbody></table>`,
      notes: '상황별로 언제 쓰는지 예를 들어 줍니다. 파이썬 개발 중에는 --symlink-install 이 기본 습관이 되면 좋습니다. (3분)'
    },
    {
      title: '처음부터 끝까지',
      html: `{{fig:buildFlow|nocap}}`,
      notes: '다섯 단계를 학생들과 소리 내어 읽고, 바로 다음 슬라이드의 실습으로 들어갑니다. (2분)'
    },
    {
      title: '실습 — 내 노드 실행',
      html: `{{widget:lab|with=graph|h=440}}`,
      notes: 'create → nano 로 talker 붙여 넣기 → colcon build → source → ros2 run 을 시연합니다. 일부러 source 를 빼먹어 오류를 보여 준 뒤 고치면 기억에 오래 남습니다. 학생 전원이 rqt_graph 에 자기 노드를 띄우면 성공! (15분)'
    },
    {
      title: '오류 3대장',
      html: `<div class="cards c3">
<div class="card red step"><div class="ci">🔌</div><b>Package not found</b><p>source 안 함</p></div>
<div class="card orange step"><div class="ci">🚪</div><b>No executable found</b><p>entry point 누락 · 재빌드 안 함</p></div>
<div class="card yellow step"><div class="ci">📁</div><b>src/build 생김</b><p>src 안에서 빌드</p></div>
</div>`,
      notes: '세 오류 모두 오늘 실습에서 한 번씩은 보게 됩니다. 오류 메시지의 핵심 단어로 원인을 찾는 습관을 강조하며 마무리하세요. (3분)'
    }
  ]
});
