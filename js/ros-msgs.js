/* ===================================================================
   WebROS — 인터페이스(msg / srv / action) 정의
   실제 ROS 2 의 .msg/.srv/.action 문법 그대로 적고, ros.js 가 읽어서 씁니다.
   (긴 정의는 핵심 필드만 남긴 간소화 버전 — 이름·타입은 실제와 같게 유지)
   =================================================================== */
(function () {
  'use strict';
  const D = {};

  /* ---------------------------------------------------------- builtin */
  D['builtin_interfaces/msg/Time'] = `# 시각 (에포크 기준)
int32 sec
uint32 nanosec`;
  D['builtin_interfaces/msg/Duration'] = `int32 sec
uint32 nanosec`;

  /* ---------------------------------------------------------- std_msgs */
  D['std_msgs/msg/String'] = 'string data';
  D['std_msgs/msg/Bool'] = 'bool data';
  D['std_msgs/msg/Int32'] = 'int32 data';
  D['std_msgs/msg/Int64'] = 'int64 data';
  D['std_msgs/msg/UInt8'] = 'uint8 data';
  D['std_msgs/msg/Float32'] = 'float32 data';
  D['std_msgs/msg/Float64'] = 'float64 data';
  D['std_msgs/msg/Empty'] = '';
  D['std_msgs/msg/ColorRGBA'] = `float32 r
float32 g
float32 b
float32 a`;
  D['std_msgs/msg/Header'] = `# 타임스탬프와 좌표계 이름
builtin_interfaces/Time stamp
string frame_id`;
  D['std_msgs/msg/Float64MultiArray'] = `float64[] data`;

  /* ---------------------------------------------------------- example_interfaces */
  D['example_interfaces/msg/String'] = 'string data';
  D['example_interfaces/msg/Int64'] = 'int64 data';
  D['example_interfaces/srv/AddTwoInts'] = `int64 a
int64 b
---
int64 sum`;
  D['example_interfaces/srv/SetBool'] = `bool data
---
bool success
string message`;
  D['example_interfaces/srv/Trigger'] = `---
bool success
string message`;
  D['example_interfaces/action/Fibonacci'] = `# Goal
int32 order
---
# Result
int32[] sequence
---
# Feedback
int32[] sequence`;
  D['action_tutorials_interfaces/action/Fibonacci'] = `int32 order
---
int32[] sequence
---
int32[] partial_sequence`;

  /* ---------------------------------------------------------- 사용자 정의 예 (3장) */
  D['tutorial_interfaces/msg/Num'] = 'int64 num';
  D['tutorial_interfaces/msg/Sphere'] = `geometry_msgs/Point center
float64 radius`;
  D['tutorial_interfaces/srv/AddThreeInts'] = `int64 a
int64 b
int64 c
---
int64 sum`;

  /* ---------------------------------------------------------- std_srvs */
  D['std_srvs/srv/Empty'] = '---';
  D['std_srvs/srv/SetBool'] = `bool data # e.g. for hardware enabling / disabling
---
bool success   # indicate successful run of triggered service
string message # informational, e.g. for error messages`;
  D['std_srvs/srv/Trigger'] = `---
bool success   # indicate successful run of triggered service
string message # informational, e.g. for error messages`;

  /* ---------------------------------------------------------- geometry_msgs */
  D['geometry_msgs/msg/Vector3'] = `# 3차원 벡터 (속도·가속도·힘 등)
float64 x
float64 y
float64 z`;
  D['geometry_msgs/msg/Point'] = `# 3차원 공간의 한 점
float64 x
float64 y
float64 z`;
  D['geometry_msgs/msg/Point32'] = `float32 x
float32 y
float32 z`;
  D['geometry_msgs/msg/Quaternion'] = `# 쿼터니언으로 나타낸 회전
float64 x 0
float64 y 0
float64 z 0
float64 w 1`;
  D['geometry_msgs/msg/Pose'] = `# 위치 + 자세
Point position
Quaternion orientation`;
  D['geometry_msgs/msg/Pose2D'] = `float64 x
float64 y
float64 theta`;
  D['geometry_msgs/msg/PoseStamped'] = `std_msgs/Header header
Pose pose`;
  D['geometry_msgs/msg/PointStamped'] = `std_msgs/Header header
Point point`;
  D['geometry_msgs/msg/Twist'] = `# 선속도(linear)와 각속도(angular)
Vector3  linear
Vector3  angular`;
  D['geometry_msgs/msg/TwistStamped'] = `std_msgs/Header header
Twist twist`;
  D['geometry_msgs/msg/Transform'] = `Vector3 translation
Quaternion rotation`;
  D['geometry_msgs/msg/TransformStamped'] = `# header.frame_id(부모) 기준 child_frame_id(자식) 의 변환
std_msgs/Header header
string child_frame_id
Transform transform`;
  D['geometry_msgs/msg/PoseWithCovariance'] = `Pose pose
float64[36] covariance`;
  D['geometry_msgs/msg/TwistWithCovariance'] = `Twist twist
float64[36] covariance`;
  D['geometry_msgs/msg/PoseWithCovarianceStamped'] = `std_msgs/Header header
PoseWithCovariance pose`;

  /* ---------------------------------------------------------- sensor_msgs */
  D['sensor_msgs/msg/LaserScan'] = `# 2D 레이저 거리 센서(LiDAR) 한 바퀴 측정값
std_msgs/Header header
float32 angle_min        # start angle of the scan [rad]
float32 angle_max        # end angle of the scan [rad]
float32 angle_increment  # angular distance between measurements [rad]
float32 time_increment   # time between measurements [seconds]
float32 scan_time        # time between scans [seconds]
float32 range_min        # minimum range value [m]
float32 range_max        # maximum range value [m]
float32[] ranges         # range data [m]
float32[] intensities    # intensity data`;
  D['sensor_msgs/msg/JointState'] = `# 관절 이름 · 위치 · 속도 · 힘
std_msgs/Header header
string[] name
float64[] position
float64[] velocity
float64[] effort`;
  D['sensor_msgs/msg/Imu'] = `std_msgs/Header header
geometry_msgs/Quaternion orientation
float64[9] orientation_covariance
geometry_msgs/Vector3 angular_velocity
float64[9] angular_velocity_covariance
geometry_msgs/Vector3 linear_acceleration
float64[9] linear_acceleration_covariance`;
  D['sensor_msgs/msg/Range'] = `uint8 ULTRASOUND=0
uint8 INFRARED=1
std_msgs/Header header
uint8 radiation_type
float32 field_of_view
float32 min_range
float32 max_range
float32 range`;
  D['sensor_msgs/msg/Image'] = `std_msgs/Header header
uint32 height
uint32 width
string encoding
uint8 is_bigendian
uint32 step
uint8[] data`;
  D['sensor_msgs/msg/BatteryState'] = `std_msgs/Header header
float32 voltage
float32 current
float32 percentage
bool present`;

  /* ---------------------------------------------------------- nav_msgs */
  D['nav_msgs/msg/Odometry'] = `# 오도메트리: 바퀴 회전 등으로 추정한 위치와 속도
std_msgs/Header header
string child_frame_id
geometry_msgs/PoseWithCovariance pose
geometry_msgs/TwistWithCovariance twist`;
  D['nav_msgs/msg/Path'] = `std_msgs/Header header
geometry_msgs/PoseStamped[] poses`;
  D['nav_msgs/msg/MapMetaData'] = `builtin_interfaces/Time map_load_time
float32 resolution
uint32 width
uint32 height
geometry_msgs/Pose origin`;
  D['nav_msgs/msg/OccupancyGrid'] = `# 격자 지도: -1 모름, 0 빈칸, 100 장애물
std_msgs/Header header
MapMetaData info
int8[] data`;

  /* ---------------------------------------------------------- tf2 */
  D['tf2_msgs/msg/TFMessage'] = 'geometry_msgs/TransformStamped[] transforms';

  /* ---------------------------------------------------------- trajectory / control */
  D['trajectory_msgs/msg/JointTrajectoryPoint'] = `float64[] positions
float64[] velocities
float64[] accelerations
float64[] effort
builtin_interfaces/Duration time_from_start`;
  D['trajectory_msgs/msg/JointTrajectory'] = `std_msgs/Header header
string[] joint_names
JointTrajectoryPoint[] points`;
  D['control_msgs/action/FollowJointTrajectory'] = `# (간소화) 궤적을 따라 관절을 움직입니다
trajectory_msgs/JointTrajectory trajectory
---
int32 SUCCESSFUL = 0
int32 INVALID_GOAL = -1
int32 error_code
string error_string
---
std_msgs/Header header
string[] joint_names
trajectory_msgs/JointTrajectoryPoint desired
trajectory_msgs/JointTrajectoryPoint actual
trajectory_msgs/JointTrajectoryPoint error`;
  D['control_msgs/action/GripperCommand'] = `# (간소화)
float64 position
float64 max_effort
---
float64 position
bool reached_goal
---
float64 position
bool reached_goal`;

  /* ---------------------------------------------------------- nav2 */
  D['nav2_msgs/action/NavigateToPose'] = `# (간소화) 목표 자세까지 이동
geometry_msgs/PoseStamped pose
string behavior_tree
---
uint16 error_code
string error_msg
---
geometry_msgs/PoseStamped current_pose
builtin_interfaces/Duration navigation_time
builtin_interfaces/Duration estimated_time_remaining
int16 number_of_recoveries
float32 distance_remaining`;

  /* ---------------------------------------------------------- visualization */
  D['visualization_msgs/msg/Marker'] = `# (간소화) RViz 에 도형 그리기
int32 ARROW=0
int32 CUBE=1
int32 SPHERE=2
int32 CYLINDER=3
int32 LINE_STRIP=4
int32 POINTS=8
int32 TEXT_VIEW_FACING=9
int32 ADD=0
int32 DELETE=2
std_msgs/Header header
string ns
int32 id
int32 type
int32 action
geometry_msgs/Pose pose
geometry_msgs/Vector3 scale
std_msgs/ColorRGBA color
geometry_msgs/Point[] points
string text`;

  /* ---------------------------------------------------------- rcl_interfaces */
  D['rcl_interfaces/msg/Log'] = `byte DEBUG=10
byte INFO=20
byte WARN=30
byte ERROR=40
byte FATAL=50
builtin_interfaces/Time stamp
uint8 level
string name
string msg
string file
string function
uint32 line`;
  D['rcl_interfaces/msg/ParameterEvent'] = `builtin_interfaces/Time stamp
string node
string[] new_parameters
string[] changed_parameters
string[] deleted_parameters`;

  D['rcl_interfaces/msg/SetParametersResult'] = `# 파라미터 변경을 받아들일지 여부
bool successful
string reason`;
  D['rcl_interfaces/msg/FloatingPointRange'] = `float64 from_value
float64 to_value
float64 step`;
  D['rcl_interfaces/msg/IntegerRange'] = `int64 from_value
int64 to_value
uint64 step`;
  D['rcl_interfaces/msg/ParameterDescriptor'] = `string name
uint8 type
string description
string additional_constraints
bool read_only false
bool dynamic_typing false
FloatingPointRange[<=1] floating_point_range
IntegerRange[<=1] integer_range`;
  D['action_msgs/msg/GoalStatus'] = `int8 STATUS_UNKNOWN   = 0
int8 STATUS_ACCEPTED  = 1
int8 STATUS_EXECUTING = 2
int8 STATUS_CANCELING = 3
int8 STATUS_SUCCEEDED = 4
int8 STATUS_CANCELED  = 5
int8 STATUS_ABORTED   = 6
GoalInfo goal_info
int8 status`;
  D['action_msgs/msg/GoalInfo'] = `unique_identifier_msgs/UUID goal_id
builtin_interfaces/Time stamp`;
  D['unique_identifier_msgs/msg/UUID'] = `uint8[16] uuid`;

  /* ---------------------------------------------------------- turtlesim */
  D['turtlesim/msg/Pose'] = `float32 x
float32 y
float32 theta

float32 linear_velocity
float32 angular_velocity`;
  D['turtlesim/msg/Color'] = `uint8 r
uint8 g
uint8 b`;
  D['turtlesim/srv/Spawn'] = `float32 x
float32 y
float32 theta
string name # Optional.  A unique name will be created and returned if this is empty
---
string name`;
  D['turtlesim/srv/Kill'] = `string name
---`;
  D['turtlesim/srv/SetPen'] = `uint8 r
uint8 g
uint8 b
uint8 width
uint8 off
---`;
  D['turtlesim/srv/TeleportAbsolute'] = `float32 x
float32 y
float32 theta
---`;
  D['turtlesim/srv/TeleportRelative'] = `float32 linear
float32 angular
---`;
  D['turtlesim/action/RotateAbsolute'] = `# The desired heading in radians
float32 theta
---
# The angular displacement in radians to the starting position
float32 delta
---
# The remaining rotation in radians
float32 remaining`;

  /* ---------------------------------------------------------- 로봇 예제 전용(간소화) */
  D['unitree_go/msg/SportModeState'] = `# (간소화) Go2 스포츠 모드 상태
uint8 mode
float32 body_height
float32[3] position
float32[3] velocity
float32 yaw_speed
float32[4] foot_force`;

  window.ROS_IFACES = D;
})();
