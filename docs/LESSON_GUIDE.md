# 강의 콘텐츠 작성 가이드 (ROS 2 쉽게 배우기)

강의 한 장 = `lessons/chNN.js` 파일 하나. 파일은 `Course.lesson({...})` 한 번만 호출합니다.
빌드 도구 없이 `<script>` 로 바로 읽히므로 **순수 JavaScript(ES2020)** 로, 모듈 문법(import/export) 없이 씁니다.
HTML 은 템플릿 문자열(백틱)로 씁니다. 백틱 안에서 `` ` `` 나 `${` 를 글자로 쓰려면 `\`` · `\${` 로 이스케이프합니다.
파이썬 f-string 의 `{` 는 괜찮지만 `${` 는 반드시 `\${` 로 씁니다. 백슬래시(`\n` 등)를 코드에 글자로 보여 주려면 `\\n` 으로 씁니다.

검증: `node tools/validate.mjs ch03` (영상 주소까지 확인: `node tools/validate.mjs ch03 --net`)

## 0. 이 강좌의 특징 — "읽고 끝"이 아니라 "직접 실행"

이 사이트 안에는 **브라우저에서 도는 작은 ROS 2 그래프(WebROS)** 가 있습니다.
- 터미널 위젯에서 `ros2 run`, `ros2 topic echo/pub`, `ros2 service call`, `ros2 action send_goal`, `ros2 param set`, `ros2 bag`, `ros2 pkg create`, `colcon build` 등이 **실제와 같은 출력**으로 동작합니다.
- 파이썬 실습기(pylab)에서 **실제 rclpy 코드**(Pyodide)가 돌아 turtlesim·로봇 시뮬레이터를 움직입니다.
- 한 페이지의 모든 위젯은 같은 그래프를 공유합니다. (예: 파이썬 노드가 발행한 토픽을 터미널에서 echo, rqt_graph 에 표시)

따라서 각 장은 **개념 설명 → 그림 → 바로 실습(위젯) → 결과 해석** 의 흐름으로 씁니다. 한 장에 실습 위젯 **3개 이상**, 실행 가능한 코드 블록(`data-run`) **5개 이상**.

## 1. 대상 독자와 문체

- **ROS 를 처음 배우는 사람** (파이썬 기초 정도를 아는 대학생 · 엔지니어 · 고등학생). 리눅스를 잘 몰라도 따라올 수 있게.
- 전문 용어는 처음 나올 때 풀어 씁니다. 예: `토픽(topic, 이름 붙은 방송 채널 — 보내는 쪽과 받는 쪽이 서로를 몰라도 됨)`
- 존댓말 설명체(`~합니다`, `~해 볼까요?`). 문단은 짧게(2~4문장).
- **글만 길게 쓰지 않습니다.** 절마다 그림(SVG) · 도표 블록 · 표 · 비유 상자 · 위젯 중 최소 1개. 한 장에 SVG 그림 4개 이상.
- 일상 비유(📻 라디오 방송, 📞 전화, 🍕 배달 주문, 🏢 회사 조직도 …)로 감을 잡은 뒤 정확한 설명.
- **기준 환경: Ubuntu 24.04 + ROS 2 Jazzy Jalisco (LTS, 2024-05 ~ 2029-05)**. 다른 배포판 차이는 `box note` 로.
  - Humble Hawksbill (LTS, Ubuntu 22.04, 2022-05 ~ 2027-05), Kilted Kaiju (2025-05, 비 LTS), Rolling (개발판).
  - 기본 RMW: Fast DDS(`rmw_fastrtps_cpp`). Cyclone DDS, Zenoh(`rmw_zenoh_cpp`)도 사용 가능.
  - Gazebo: Jazzy 는 Gazebo Harmonic 과 짝. (Gazebo Classic 은 2025-01 지원 종료)
  - **확실하지 않은 사실(날짜 · 버전 · 수치)은 WebSearch/WebFetch 로 확인하거나 쓰지 않습니다.** 명령어 · 패키지 이름 · 메시지 필드는 공식 문서(docs.ros.org/en/jazzy) 기준.
- 코드 · 토픽 · 명령은 실제 ROS 2 와 **똑같이** 씁니다(학생이 실제 로봇에서 그대로 쓸 수 있게).

## 2. Course.lesson 구조

```js
Course.lesson({
  id: 'ch02', no: '02',
  icon: '📡',
  title: '노드와 토픽',
  subtitle: '로봇 프로그램은 어떻게 서로 이야기할까?',
  level: '입문', time: '120분',
  goals: ['노드와 토픽의 관계를 그림으로 설명할 수 있다', '...'],          // 3~5개
  teacher: { intro: '첫 슬라이드 노트: 도입 발문', flow: '① 도입 10분 → ② … (HTML 가능)' },
  figs: {                                                              // 재사용 그림
    graph: { svg: `<svg class="dg" viewBox="0 0 800 360">...</svg>`, caption: '노드와 토픽' },
    flow: `<div class="flow">...</div>`
  },
  sections: [ { title: '노드란?', html: `<p>...</p>{{fig:graph}}{{widget:term|chips=ros2 node list}}` } ],   // 6~9개
  videos: [ { title: '...', channel: '...', url: 'https://www.youtube.com/watch?v=...', lang: 'en', min: '12분', desc: '한 줄' } ], // 4~8개
  terms: [['노드(node)', '...'], ...],                                  // 8~15개
  summary: ['...'],                                                    // 4~7개
  quiz: [ { q: '...?', options: ['..','..','..','..'], answer: 2, explain: '해설' } ],   // 5~7개
  slides: [ { title: '...', html: `{{fig:graph|nocap}}`, notes: '강의 노트' } ]       // 10~16장
});
```

치환 표기: `{{fig:이름}}` · `{{fig:이름|nocap}}` · `{{widget:종류|옵션=값|옵션2=값}}` (옵션 값에 `|` `}` 는 못 씀. `;` 는 여러 명령 구분에 씀)

터미널 참고: 여러 줄 `data-run="sh"` 블록에서 오래 도는 명령(ros2 run, echo, pub -r …)이 마지막 줄이 아니면 자동으로 백그라운드로 돌리고 다음 줄을 실행합니다(`jobs`, `kill %1`, `fg` 지원). `>` `>>` 출력 방향 바꾸기, `| grep` 지원.

## 3. 문서 블록

| 블록 | 쓰는 법 |
|---|---|
| 상자 | `<div class="box tip"><div class="box-t">💡 팁</div>...</div>` — `tip` `note` `warn` `trend`(🚀 최신 동향) `analogy`(🍳 비유) `practice`(🧪 해 보기) `dev`(👩‍💻 실무 관점) `teacher-note`(강사에게만) |
| 표 | `<table class="tbl">…</table>` · 비교표 `class="tbl cmp"` |
| 흐름도 | `<div class="flow"><div class="fb blue"><span class="fi">📷</span><b>카메라 노드</b>/image_raw 발행</div>…</div>` · 세로 `flow v` · 반복 `flow loop` |
| 층 구조 | `<div class="layers"><div class="ly blue"><b>rclpy / rclcpp</b><span>설명</span><em>보조</em></div>…</div>` |
| 카드 | `<div class="cards c3"><div class="card orange"><div class="ci">🐢</div><b>제목</b><p>설명</p></div>…</div>` |
| 연대표 | `<ol class="timeline"><li class="purple"><span class="tl-y">2017</span><b>ROS 2 Ardent</b><p>…</p></li></ol>` |
| 대결 | `<div class="vs"><div class="vs-a blue"><b>토픽</b><ul>…</ul></div><div class="vs-mid">VS</div><div class="vs-b orange"><b>서비스</b>…</div></div>` |
| 숫자 타일 | `<div class="stats"><div class="stat blue"><b>10 Hz</b><span>발행 주기</span></div></div>` |
| 단계 | `<ol class="steps-list"><li><b>빌드</b> — …</li></ol>` |
| 2단 | `<div class="two"><div>…</div><div>…</div></div>` |
| 태그 · 키 | `<span class="tag green">LTS</span>` · `<kbd>Ctrl</kbd>` |

색: `blue teal orange purple red green yellow gray`

### 코드 블록 — **실행 버튼이 붙습니다**

```html
<pre class="code" data-lang="bash" data-run="sh"><code>ros2 run turtlesim turtlesim_node</code></pre>
```
- `data-run="sh"` → 코드 아래에 **▶ 터미널에서 실행** 버튼. 페이지의 터미널 위젯(없으면 새 터미널 창)에서 한 줄씩 실행합니다. **`$` 프롬프트를 붙이지 말고 한 줄에 명령 하나.** 브라우저에서 실행 불가능한 명령(apt 설치 등)은 `data-run` 없이 씁니다(그러면 복사 버튼만).
- `data-run="py" data-with="turtlesim"` → **▶ 실습기에서 실행** 버튼(파이썬 실습기 창이 열림). `data-with`: `turtlesim` `graph` `term` `bot` `arm` `go2` `rviz` `none`. **완전한 실행 가능한 rclpy 프로그램**(main 포함)에만 붙입니다.
- `<` `>` `&` 는 `&lt;` `&gt;` `&amp;`. 강조: `<span class="hl">…</span>`, 주석 색: `<span class="cm"># …</span>` (py 실행 블록 안에서는 span 을 쓰지 마세요 — textContent 가 그대로 실행되므로 span 은 괜찮지만 주석 기호는 코드에 맞게)
- 실행 결과 예시는 `<pre class="code out" data-lang="출력"><code>…</code></pre>` (버튼 없음).

## 4. 그림(SVG)

- `<svg class="dg" viewBox="0 0 W H" role="img" aria-label="설명">`. 가로 700~900, 세로 200~460. `width/height` 속성 금지.
- 색은 클래스로(다크 모드 자동): 도형 `box` `blue` `teal` `orange` `purple` `red` `green` `yellow` `gray` · 진한 채움 `s-blue`(글자 `tw`) · 선 `ln` `ln-blue` … + `thick` `thin` `dash` · 화살표 `ar` `ar-blue` … `ar2`(양쪽) · 움직임 `moving` `blink` `pulse` · 글자 `t-sm t-xs t-lg t-xl t-b t-mu t-mono t-c t-e t-blue …`. 글자 y 는 가운데 좌표.
- 한글 글자 폭 약 15px(15px 기준). `&` 는 `&amp;`.
- ROS 그림 관례: **노드 = 타원(ellipse, blue)**, **토픽 = 사각형(green)**, 서비스 = 주황, 액션 = 보라. rqt_graph 와 같은 모양으로.

## 5. 위젯 — `{{widget:종류|옵션=값}}`

한 페이지의 위젯은 **같은 ROS 그래프를 공유**합니다. 예: turtlesim 위젯 + 터미널 위젯을 같은 절에 두면 터미널에서 거북이를 제어할 수 있습니다.

### 핵심
| 종류 | 내용 | 옵션 |
|---|---|---|
| `term` | ros2 터미널 (bash 흉내). 칩을 누르면 명령 실행 | `chips=명령1;명령2` · `run=명령1;명령2`(자동 실행) · `h=300` |
| `turtlesim` | turtlesim 노드 + 화면 (방향 버튼, spawn/clear/reset) | `start=0`(자동 시작 안 함) · `teleop=0` |
| `lab` | 터미널 + 화면을 나란히 (가장 자주 쓰는 실습 틀) | `with=turtlesim` / `graph` / `turtlesim,graph` / `bot` / `arm` / `go2` / `rviz` / `plot` · `run=…` · `h=380` · `title=제목` |
| `teleop` | 가상 조이스틱 → Twist 발행 | `topic=/turtle1/cmd_vel` · `lin=2.0` · `ang=2.0` |
| `graph` | rqt_graph (노드 ● 토픽 ■, 메시지 흐를 때 반짝임, 클릭하면 정보) | `hide=0` |
| `plot` | rqt_plot | `topic=/turtle1/pose/x,/turtle1/pose/y` |
| `echo` | 토픽 모니터 (rqt_topic: Hz · 마지막 메시지) | |
| `params` | 파라미터 편집기 (rqt_reconfigure) | `node=/turtlesim` |
| `pylab` | 파이썬 rclpy 편집기 + 실행 + 옆 화면 | `ex=예제` · `with=turtlesim/graph/term/bot/arm/go2/rviz/none` |

`pylab` 예제(`ex=`): `hello` `talker` `listener` `pubsub` `turtle_circle` `turtle_pose` `turtle_goto` `add_server` `add_client` `spawn` `fib_server` `fib_client` `rotate` `params` `tf_broadcaster` `tf_listener` `static_tf` `qos` `bot_avoid` `nav_goal` `arm_traj` `go2_walk` `esp32` `follow_target` `blank` (코드: `js/py-examples.js`)

### 개념 · 도구
| 종류 | 내용 | 옵션 |
|---|---|---|
| `comm` | 통신 방식 애니메이션 (실제 노드 생성) | `mode=topic|service|action` |
| `qos` | QoS 실험실 (신뢰성 · 내구성 · 깊이 · 손실 · 늦게 온 구독자) | |
| `domain` | DDS 탐색 · ROS_DOMAIN_ID · RMW | |
| `iface` | 인터페이스 탐색기 + 명령 만들기 | `type=geometry_msgs/msg/Twist` |
| `pkg` | 패키지 구조 탐색 (파일 눌러 내용 보기) | `kind=python|cmake|interfaces` |
| `colcon` | colcon 빌드 순서 · 오버레이 시뮬레이터 | |
| `launch` | 런치 파일 해부 + 실행 (Python/XML/YAML) | `preset=turtles|remap|params|ns|include` |
| `bag` | rosbag2 녹화 · 재생기 | |
| `exec` | executor · 콜백 그룹 타임라인 (교착 상태 재현) | |
| `lifecycle` | 관리형(lifecycle) 노드 상태 기계 | |
| `ros1vs2` | ROS 1 vs ROS 2 비교 (마스터 없는 탐색) | |
| `bridge` | rosbridge 로 **실제 ROS 2** 에 연결 (토픽 미러링) | `url=ws://localhost:9090` |

### 좌표계 · 로봇 · 시뮬레이터
| 종류 | 내용 | 옵션 |
|---|---|---|
| `tftree` | TF 놀이터 (프레임 슬라이더, 3D 축, tf2_echo, 점 변환, 트리) | `preset=robot|turtle|arm` |
| `urdf` | URDF 편집기 + 3D 뷰 + robot_state_publisher + joint_state_publisher_gui | `model=box|two_link|r2d2|diffbot|so101` |
| `rviz` | RViz2 라이트 (Grid · TF · LaserScan · Map · Path · Odometry · Marker · RobotModel, 2D Goal) | `fixed=map|odom|world|base_link` · `show=tf,scan,map,path,odom,markers,robot` · `with=bot|turtle` |
| `bot` | 차동 구동 로봇 + LiDAR 시뮬레이터 (Gazebo 대신) · SLAM · Nav2 | `world=room|maze|warehouse` · `mode=drive|slam|nav` · `teleop=1` |
| `odom` | 오도메트리 오차 누적 데모 | |
| `ctrl` | ros2_control 관절 PID 제어 | `ctrl=position|velocity|effort` |
| `arm` | SO-ARM101 ROS 2 시뮬레이터 (ros2_control 액션, MoveIt 방식 계획/실행, 궤적 표) | `mode=joint|moveit|traj` |
| `go2` | Unitree Go2 ROS 2 시뮬레이터 (cmd_vel 보행, odom, joint_states, 서비스) + MuJoCo 연동 | `mujoco=1` |
| `microros` | 가상 ESP32 + micro-ROS agent | |
| `vision` | 카메라 → OpenCV 색 추적 노드 → /target (cv_bridge 흐름) | `follow=turtle` · `color=red|green|blue|yellow` |
| `embed` | 연계 강좌 페이지(시뮬레이터)를 눌러서 불러오는 iframe | `url=https://samcho93.github.io/…` · `h=520` · `title=` · `desc=` · `auto=1` |

터미널에서 쓸 수 있는 가상 패키지(실제와 같은 이름): `turtlesim`, `demo_nodes_py/cpp`, `examples_rclpy_minimal_publisher/subscriber`, `action_tutorials_py`, `tf2_ros`, `tf2_tools`, `turtle_tf2_py`(launch `turtle_tf2_demo.launch.py`), `teleop_twist_keyboard`, `rqt_graph`, `rqt_plot`, `rqt_console`, `rqt`, `rviz2`, `robot_state_publisher`, `joint_state_publisher_gui`, `urdf_tutorial`(launch `display.launch.py model:=urdf/01-myfirst.urdf`~`08-macroed.urdf.xacro`), `webbot_sim`(launch `world.launch.py world:=maze`), `slam_toolbox`(`online_async_launch.py`), `nav2_bringup`(`navigation_launch.py`), `nav2_map_server`(`map_saver_cli`), `so_arm101_bringup`(`sim.launch.py`, `moveit.launch.py`), `so_arm101_description`(`display.launch.py`), `go2_sim`(`go2.launch.py`), `micro_ros_agent`. 명령 예: `ros2 run turtlesim turtlesim_node` 하면 **turtlesim 창이 뜹니다**(실제처럼). `rqt_graph`, `rviz2` 도 창으로.

**위젯 배치 규칙**
- 개념을 설명한 바로 뒤에 실습 위젯. 위젯 위/아래에 `box practice` 로 **무엇을 해 볼지 단계별로**(1~4단계) 적습니다.
- 터미널 명령은 `data-run="sh"` 코드 블록으로 먼저 보여 주고, 같은 절에 `lab` 이나 `term` 위젯을 둡니다.
- 슬라이드에는 한 장에 위젯 하나만, 다른 내용은 최소화. 무거운 위젯(`lab`, `pylab`, `bot`, `arm`, `go2`)은 슬라이드에 1~3장만.

## 6. 슬라이드(강사용 PPT)

- 무대 1280×720, 본문 26px. 한 장에 글자 200자 이내 · 그림 중심. 제목 · 목표 · 영상 · 퀴즈 · 정리 슬라이드는 자동 생성.
- `layout: 'center'` + `<div class="s-big">…</div>` 큰 문장. `s-cols` `s-cols c3` `s-points` `s-small` `s-center`, `step`(→ 누를 때마다 등장).
- `notes`: 강사가 말할 내용 · 발문 · 시간(분) 2~5문장.
- 그림은 `{{fig:이름|nocap}}` 재사용. 본문 높이 약 560px — SVG 는 16:7 전후.

## 7. 유튜브 영상

- **실제로 존재하는 영상만.** 추측한 id 금지. 확인: `curl -s "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=ID"` → 제목·채널이 나오면 존재.
- 신뢰 채널 우선: Articulated Robotics, Robotics Back-End, The Construct, ROS 공식(Open Robotics · ROSCon · Open Source Robotics Foundation), Nav2/Open Navigation, PickNik(MoveIt), Unitree, Hugging Face(LeRobot), 한국어(ROBOTIS, 오로카 등 — 존재 확인 후).
- 한국어 `lang: 'ko'`, 영어 `lang: 'en'`. `desc` 에 무엇을 보면 좋은지 한 줄.
- 적당한 영상을 확인 못한 주제는 검색 링크 허용: `{ title: '"ROS 2 Nav2" 영상 찾아보기', url: 'https://www.youtube.com/results?search_query=ROS+2+Nav2', lang: 'ko', desc: '…' }`
- 한 장에 4~8개, 다른 장과 중복 피하기.

## 8. 연계 강좌 (같은 저자의 사이트 — 필요한 장에서 링크)

- SO-ARM101: https://samcho93.github.io/studySOArm101/ · 3D 시뮬레이터 `…/studySOArm101/sim/index.html` · 장: `…/studySOArm101/lessons/ch15.html`(URDF) `ch16`(워크스페이스 · RViz2) `ch17`(ros2_control) `ch18`(MoveIt 2) `ch19`(Gazebo) `ch20`(LeRobot ↔ ROS 2 브릿지)
- Unitree Go2: https://samcho93.github.io/studyGo2/ · 시뮬레이터 `…/studyGo2/sim/index.html` · Playground `…/studyGo2/tools/playground.html` · 장: `…/studyGo2/lessons/e07.html`(ROS 2 unitree_ros2) `e08`(L1 LiDAR · SLAM) `e06`(unitree_mujoco) `c07`(웹 시뮬레이터) `e10`(강화학습)
- OpenCV: https://samcho93.github.io/studyOpenCV/
- 링크는 `<a href="…" target="_blank" rel="noopener">` 로, 카드(`cards`)나 `box note` 로 소개.
