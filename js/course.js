/* ===================================================================
   ROS 2 강좌 — 커리큘럼 & 강의 등록
   각 lessons/chNN.js 파일이 Course.lesson({...}) 으로 자기 내용을 등록한다.
   =================================================================== */
(function () {
  'use strict';

  const PARTS = [
    { id: 'p1', title: '1부 · ROS 2 시작하기', items: ['ch00', 'ch01'] },
    { id: 'p2', title: '2부 · ROS 2 그래프의 핵심 개념', items: ['ch02', 'ch03', 'ch04', 'ch05', 'ch06'] },
    { id: 'p3', title: '3부 · 코드로 만드는 ROS 2', items: ['ch07', 'ch08', 'ch09', 'ch10', 'ch11'] },
    { id: 'p4', title: '4부 · 로봇을 표현하고 보는 도구', items: ['ch12', 'ch13', 'ch14', 'ch15'] },
    { id: 'p5', title: '5부 · 이동 · 조작 · 보행 로봇', items: ['ch16', 'ch17', 'ch18'] },
    { id: 'p6', title: '6부 · 확장과 실전', items: ['ch19', 'ch20', 'ch21'] },
    { id: 'px', title: '부록', items: ['lab', 'cheatsheet', 'videos', 'glossary'] }
  ];

  // 강의 파일이 없을 때도 목차가 보이도록 기본 정보를 둔다
  const OUTLINE = {
    ch00: { icon: '🤖', title: 'ROS 2란 무엇인가?', summary: '로봇 소프트웨어의 공통 언어, ROS 1 → ROS 2, DDS, 배포판(Humble · Jazzy · Kilted), 이 강좌의 브라우저 실습 환경' },
    ch01: { icon: '🛠️', title: '설치와 첫 실행 — turtlesim', summary: 'Ubuntu 24.04 + Jazzy 설치, Docker · WSL2, 환경 설정(source), ros2 CLI, 거북이 움직이기' },
    ch02: { icon: '📡', title: '노드와 토픽', summary: '노드 = 작은 프로그램, 토픽 = 방송 채널, 퍼블리셔/서브스크라이버, rqt_graph, ros2 topic 명령' },
    ch03: { icon: '📦', title: '메시지와 인터페이스', summary: 'msg · srv · action 정의, std/geometry/sensor 메시지, 사용자 정의 인터페이스 만들기' },
    ch04: { icon: '🔁', title: '서비스 — 묻고 답하기', summary: '요청/응답 통신, ros2 service 명령, Spawn · AddTwoInts, 토픽과 언제 다르게 쓸까' },
    ch05: { icon: '🎯', title: '액션 — 오래 걸리는 일 맡기기', summary: '목표 · 피드백 · 결과, 취소, RotateAbsolute · Fibonacci, 내비게이션이 액션인 이유' },
    ch06: { icon: '🎛️', title: '파라미터 — 노드의 설정값', summary: 'declare · get · set, YAML 파라미터 파일, 파라미터 콜백, 배경색 바꾸기' },
    ch07: { icon: '🏗️', title: '워크스페이스 · 패키지 · colcon', summary: 'ros2_ws 구조, ament_python · ament_cmake, package.xml, colcon build, 오버레이' },
    ch08: { icon: '🐍', title: 'rclpy로 퍼블리셔 · 서브스크라이버 만들기', summary: 'Node 클래스, 타이머, 콜백, 거북이 제어 노드를 브라우저에서 직접 실행' },
    ch09: { icon: '🧩', title: 'rclpy 서비스 · 액션 · 파라미터 · rclcpp', summary: '서비스 서버/클라이언트, 액션 서버/클라이언트, 파라미터 콜백, C++(rclcpp) 비교' },
    ch10: { icon: '🚀', title: '런치 파일로 여러 노드 한 번에', summary: 'Python · XML · YAML 런치, 리매핑, 네임스페이스, 파라미터 파일, include' },
    ch11: { icon: '📶', title: 'QoS · DDS · 실행기', summary: '신뢰성 · 내구성 · 히스토리, 도메인 ID, RMW(Fast DDS · Cyclone · Zenoh), executor와 콜백 그룹, 라이프사이클' },
    ch12: { icon: '🧭', title: 'TF2 — 좌표계 변환', summary: 'map · odom · base_link, 정적/동적 변환, 브로드캐스터 · 리스너, tf2_echo, view_frames' },
    ch13: { icon: '🦴', title: 'URDF · xacro와 RViz2', summary: '링크 · 조인트, robot_state_publisher, joint_state_publisher, RViz2 디스플레이' },
    ch14: { icon: '🧰', title: 'ROS 2 도구 모음', summary: 'rqt, rqt_plot, rosbag2(MCAP), Foxglove, PlotJuggler, ros2 doctor, rosbridge' },
    ch15: { icon: '🌍', title: '시뮬레이션 — Gazebo와 ros2_control', summary: 'Gazebo(gz sim), ros_gz_bridge, 차동 구동 로봇, 센서 플러그인, ros2_control · 컨트롤러' },
    ch16: { icon: '🗺️', title: 'SLAM과 내비게이션(Nav2)', summary: 'LiDAR · 오도메트리, slam_toolbox 지도 작성, AMCL, 코스트맵, 경로 계획 · 추종, Nav2 행동 트리' },
    ch17: { icon: '🦾', title: '로봇팔 — MoveIt 2와 SO-ARM101', summary: '관절 공간 · 작업 공간, 순/역기구학, JointTrajectory, MoveIt 2 계획, SO-ARM101 연동' },
    ch18: { icon: '🐕', title: '사족보행 로봇 — Unitree Go2와 ROS 2', summary: 'unitree_ros2 · CycloneDDS, cmd_vel로 걷기, 오도메트리 · LiDAR, MuJoCo 시뮬레이터 연동' },
    ch19: { icon: '👁️', title: '비전과 AI — OpenCV · cv_bridge · LeRobot', summary: 'sensor_msgs/Image, 이미지 파이프라인, 색 추적 노드, YOLO 검출, 모방학습과 ROS 2' },
    ch20: { icon: '🔌', title: 'micro-ROS · 웹 · Docker · 배포', summary: 'ESP32 micro-ROS, rosbridge와 웹 대시보드, Docker 컨테이너, 보안(SROS2), 실제 로봇 연결' },
    ch21: { icon: '🏁', title: '종합 프로젝트와 로드맵', summary: '순찰 · 배달 로봇 프로젝트 설계, 디버깅 체크리스트, 더 공부할 것들' },
    lab: { icon: '🧪', title: 'ROS 2 실습실', summary: '터미널 · 파이썬 편집기 · turtlesim · 그래프를 한 화면에서 자유롭게', special: true },
    cheatsheet: { icon: '📋', title: '명령어 치트시트', summary: 'ros2 CLI · colcon · 자주 쓰는 명령 한눈에 보기 (눌러서 실습실에서 실행)', special: true },
    videos: { icon: '🎬', title: '추천 영상 모음', summary: '모든 장의 유튜브 영상을 한곳에서', special: true },
    glossary: { icon: '📖', title: '용어 사전', summary: '강좌에 나오는 핵심 용어 정리', special: true }
  };

  const lessons = {};

  window.Course = {
    parts: PARTS,
    outline: OUTLINE,
    lessons,
    title: 'ROS 2 쉽게 배우기',
    /** 강의 등록: lessons/chNN.js 에서 호출 */
    lesson(def) {
      if (!def || !def.id) throw new Error('Course.lesson: id 가 필요합니다');
      const o = OUTLINE[def.id] || {};
      lessons[def.id] = Object.assign({ icon: o.icon, title: o.title, summary: o.summary }, def);
    },
    /** 목차 순서대로의 id 목록 */
    order() { return PARTS.flatMap(p => p.items); },
    info(id) { return lessons[id] || (OUTLINE[id] ? Object.assign({ id, missing: !OUTLINE[id].special }, OUTLINE[id]) : null); }
  };
})();
