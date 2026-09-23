# ros2_study_examples

강좌 **ROS 2 쉽게 배우기** (https://samcho93.github.io/studyROS2/) 의 파이썬 실습 예제를 실제 ROS 2 패키지로 묶었습니다.
브라우저 실습기(🐍 pylab)의 예제와 **같은 코드**입니다.

```bash
cd ros2_ws
rosdep install --from-paths src -y --ignore-src
colcon build --symlink-install
source install/setup.bash
ros2 run turtlesim turtlesim_node        # 다른 터미널에서
ros2 run ros2_study_examples turtle_circle
```

| 실행 파일 | 내용 |
|---|---|
| `hello` | 첫 노드: 로그 출력 |
| `talker` | 퍼블리셔 (talker) |
| `listener` | 서브스크라이버 (listener) |
| `pubsub` | 퍼블리셔 + 서브스크라이버 한 파일 |
| `turtle_circle` | 거북이 원 그리기 (cmd_vel) |
| `turtle_pose` | 거북이 위치 구독 (Pose) |
| `turtle_goto` | 목표 지점까지 가기 (P 제어) |
| `add_server` | 서비스 서버 (AddTwoInts) |
| `add_client` | 서비스 클라이언트 (AddTwoInts) |
| `spawn` | 거북이 소환 (Spawn 서비스) |
| `fib_server` | 액션 서버 (Fibonacci) |
| `fib_client` | 액션 클라이언트 (Fibonacci) |
| `rotate` | 거북이 회전 액션 (RotateAbsolute) |
| `params` | 파라미터 선언 · 콜백 |
| `tf_broadcaster` | TF 브로드캐스터 (거북이 → tf) |
| `tf_listener` | TF 리스너 (거북이 따라가기) |
| `static_tf` | 정적 TF (센서 장착 위치) |
| `qos` | QoS: best effort 퍼블리셔 |
| `bot_avoid` | 장애물 피하기 (LaserScan → cmd_vel) |
| `nav_goal` | Nav2 목표 보내기 (NavigateToPose) |
| `arm_traj` | 로봇팔 궤적 보내기 (FollowJointTrajectory) |
| `go2_walk` | Go2 걷게 하기 (cmd_vel + 서비스) |
| `esp32` | micro-ROS 보드와 대화하기 |
| `follow_target` | 비전 추적 → 거북이 회전 |

런치: `ros2 launch ros2_study_examples turtle_follow.launch.py` · `ros2 launch ros2_study_examples turtle_goto.launch.py goal_x:=2.0`

> `bot_avoid`, `nav_goal` 은 TurtleBot3/Nav2 시뮬레이션, `arm_traj` 는 SO-ARM101(ros2_control), `go2_walk` 는 Go2 ROS 2 드라이버(/cmd_vel · /go2/stand_up 는 강좌용 이름 — 실제 드라이버에 맞게 바꾸세요), `esp32` 는 micro-ROS 보드가 필요합니다.
