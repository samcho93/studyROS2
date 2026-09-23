# 🤖 ROS 2 쉽게 배우기

**설치 없이 브라우저에서 바로 실습하는** ROS 2(Jazzy) 한국어 강좌입니다.
페이지 안에 작은 ROS 2 그래프(WebROS)가 들어 있어서 `ros2` 명령, turtlesim, **실제 rclpy 파이썬 코드**, 로봇 시뮬레이터를 그 자리에서 실행해 볼 수 있습니다.
배운 코드와 명령은 실제 Ubuntu 24.04 + ROS 2 Jazzy 에서도 그대로 동작합니다.

- 학생용: https://samcho93.github.io/studyROS2/student.html
- 강사용: https://samcho93.github.io/studyROS2/teacher.html
- 실습실: https://samcho93.github.io/studyROS2/#lab · 명령어 치트시트: https://samcho93.github.io/studyROS2/#cheatsheet

## 강좌 구성

| 부 | 장 | 내용 |
|---|---|---|
| 1부 시작하기 | 00 · 01 | ROS 2란? · 설치와 첫 실행(turtlesim) |
| 2부 핵심 개념 | 02 ~ 06 | 노드와 토픽 · 메시지와 인터페이스 · 서비스 · 액션 · 파라미터 |
| 3부 코드로 만들기 | 07 ~ 11 | 워크스페이스 · colcon · rclpy 퍼블리셔/서브스크라이버 · 서비스/액션/파라미터(+rclcpp) · 런치 · QoS/DDS/실행기/라이프사이클 |
| 4부 도구 | 12 ~ 15 | TF2 · URDF/xacro/RViz2 · rqt/rosbag2/Foxglove/rosbridge · Gazebo와 ros2_control |
| 5부 로봇 | 16 ~ 18 | SLAM과 Nav2 · MoveIt 2와 **SO-ARM101** · **Unitree Go2**와 ROS 2 |
| 6부 확장 | 19 ~ 21 | 비전·AI(OpenCV, cv_bridge, LeRobot) · micro-ROS·웹·Docker·배포 · 종합 프로젝트 |
| 부록 | | 🧪 실습실 · 📋 명령어 치트시트 · 🎬 추천 영상 · 📖 용어 사전 |

각 장: 학습 목표 → 그림 중심 본문 → **바로 실습(터미널 · 파이썬 · 시뮬레이터 위젯)** → 🎬 유튜브 영상 → 핵심 정리 · 용어 → ✅ 퀴즈 · 강사용 슬라이드

## 브라우저 실습 환경

| 구성 | 내용 |
|---|---|
| 🖥️ **터미널** | 화면 하단 고정 터미널(탭으로 여러 개, Ctrl+` 펼치기 · Ctrl+Shift+` 새 탭, 장을 옮겨도 유지) · `ros2 run/launch`, `node/topic/service/action/param/interface/pkg/bag/lifecycle/doctor`, `colcon build`, `source`, 가상 파일 시스템(`~/ros2_ws`), `nano` 편집기 창, Tab 자동 완성, Ctrl+C |
| 🐍 **rclpy** | 하단 도크의 🐍 파이썬 탭(여러 개) · 본문 코드의 ▶ 파이썬 실행 · 오른쪽 고정 화면(🐢 화면 버튼: turtlesim · rqt_graph · 로봇 시뮬레이터) · Web Worker 안의 Pyodide 에서 rclpy 호환 라이브러리로 실행 (노드 · 토픽 · 서비스 · 액션 · 파라미터 · 타이머 · QoS · tf2_ros). Chrome/Edge 는 JSPI 로 `rclpy.spin`, `time.sleep`, `spin_until_future_complete` 가 실제처럼 블로킹 |
| 🐢 **시뮬레이터** | turtlesim(서비스 · 액션 · 파라미터 포함), 차동 구동 로봇 + LiDAR(SLAM · Nav2 라이트), SO-ARM101(ros2_control · MoveIt 방식), Go2(보행 · MuJoCo 연동), 가상 ESP32(micro-ROS), 카메라 색 추적(OpenCV) |
| 🧰 **도구** | rqt_graph, rqt_plot, rqt_console, rqt_topic, rqt_reconfigure, rqt_service_caller, RViz 라이트, TF 트리(view_frames), URDF 뷰어, rosbag2, rosbridge(실제 ROS 2 연결) |
| 📚 **개념 위젯** | 토픽/서비스/액션 애니메이션, QoS 실험실, DDS 도메인, 인터페이스 탐색기, 패키지 구조, colcon 빌드, 런치 해부, executor 타임라인, 라이프사이클 |

### 실제 ROS 2 와 연결하기

1. **예제 패키지** — `ros2_ws/src/ros2_study_examples` 는 브라우저 실습기의 파이썬 예제와 같은 코드입니다.
   ```bash
   cd ros2_ws && colcon build --symlink-install && source install/setup.bash
   ros2 run ros2_study_examples turtle_circle
   ```
2. **rosbridge** — 실제 ROS 2 PC 에서 `ros2 launch rosbridge_server rosbridge_websocket_launch.xml` 을 실행하고, 14장의 🔌 rosbridge 위젯에서 `ws://localhost:9090` 에 연결하면 이 페이지의 위젯(teleop, RViz 라이트, turtlesim …)과 실제 토픽을 주고받습니다.
3. **연계 강좌** — [SO-ARM101](https://samcho93.github.io/studySOArm101/) 3D 시뮬레이터 · LeRobot · MoveIt, [Unitree Go2](https://samcho93.github.io/studyGo2/) MuJoCo 시뮬레이터 · unitree_ros2 (같은 github.io 오리진이라 18장 Go2 위젯에서 MuJoCo 시뮬레이터를 `/cmd_vel` 로 직접 조종합니다).

## 학생용 · 강사용

| 페이지 | 기능 |
|---|---|
| `student.html` 🎓 | 문서형 강좌, 실습 위젯, 퀴즈 즉시 채점, 학습 진도 저장, 검색, 라이트/다크 |
| `teacher.html` 🧑‍🏫 | 16:9 슬라이드(위젯 동작), 단계별 보이기, **판서**(펜 · 형광펜 · 직선 · 상자 · 지우개 · 레이저 · 빈 칠판), 강의 노트, 퀴즈 정답 공개, 타이머, 🖥 발표자 창 |

**슬라이드 단축키:** `←` `→` · `F` 전체 화면 · `G` 목록 · `N` 노트 · `B` 가리기 · `T` 타이머 · 판서 `P` `H` `I` `X` `E` `L` `W` `C` `Ctrl+Z` `Esc`

## 실행

GitHub Pages(Settings → Pages → `main` / root)로 바로 동작합니다. 로컬에서는 `start.bat` 또는 `python -m http.server 8080` 후 http://localhost:8080 을 엽니다.
(파이썬 실습은 Web Worker 를 쓰므로 `file://` 이 아니라 http 로 열어야 합니다. Pyodide 는 jsDelivr CDN 에서 받습니다.)

## 폴더 구조

```
index.html · student.html · teacher.html · presenter.html
js/course.js           커리큘럼          js/lessons.js    강의 파일 불러오기
js/ros-msgs.js         인터페이스 정의(.msg/.srv/.action)
js/ros.js              WebROS 그래프 코어 (노드 · 토픽 · 서비스 · 액션 · 파라미터 · TF · QoS)
js/ros-pkgs.js         실행 파일 등록소 (turtlesim, demo_nodes, tf2_ros, rqt, rosbag2 …)
js/ros-term.js         ros2 터미널 · 가상 파일 시스템 · colcon
js/pyros.js · pyros-worker.js · py/   rclpy 실행기 (Pyodide Web Worker, rclpy/tf2_ros 호환판)
js/py-examples.js      파이썬 예제 모음
js/ros-ui.js · js/widgets.js · js/w/*.js   떠 있는 창 · 위젯 (core, mobile, rviz, arm, urdf, go2, bridge, microros, vision, concept)
lessons/chNN.js        장별 콘텐츠        tools/validate.mjs  콘텐츠 검증 (--net: 영상 확인)
tools/export_ros2_ws.mjs  예제를 ros2_ws 패키지로 내보내기
ros2_ws/               실제 ROS 2 예제 패키지
docs/LESSON_GUIDE.md   콘텐츠 작성 가이드   docs/DEV_WIDGETS.md  위젯 개발 가이드
```

> 브라우저 실습 환경은 교육용으로 ROS 2 의 동작을 흉내 낸 것입니다. 실제 DDS 통신 · 물리 엔진 · C++ 빌드는 하지 않으며, 명령 출력과 API 는 ROS 2 Jazzy 를 기준으로 최대한 같게 만들었습니다.
