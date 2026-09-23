# 로봇팔 궤적 보내기 (FollowJointTrajectory)
# SO-ARM101 관절 이름 그대로 씁니다. 실제 로봇에서도 같은 액션 인터페이스입니다.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from builtin_interfaces.msg import Duration
from control_msgs.action import FollowJointTrajectory
from trajectory_msgs.msg import JointTrajectoryPoint

JOINTS = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']


def main():
    rclpy.init()
    node = Node('arm_commander')
    ac = ActionClient(node, FollowJointTrajectory, '/arm_controller/follow_joint_trajectory')
    ac.wait_for_server()

    goal = FollowJointTrajectory.Goal()
    goal.trajectory.joint_names = JOINTS
    waypoints = [
        ([0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 1),
        ([0.8, -0.6, 0.9, 0.4, 0.0, 1.2], 3),     # 오른쪽 위로 + 그리퍼 열기
        ([-0.8, -0.6, 0.9, 0.4, 1.5, 0.2], 6),    # 왼쪽으로 + 손목 회전
        ([0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 8),      # 제자리
    ]
    for pos, sec in waypoints:
        p = JointTrajectoryPoint()
        p.positions = pos
        p.time_from_start = Duration(sec=sec)
        goal.trajectory.points.append(p)

    node.get_logger().info('궤적을 보냅니다...')
    send_future = ac.send_goal_async(goal)
    rclpy.spin_until_future_complete(node, send_future)
    result_future = send_future.result().get_result_async()
    rclpy.spin_until_future_complete(node, result_future)
    node.get_logger().info(f'완료! error_code={result_future.result().result.error_code}')
    rclpy.shutdown()


if __name__ == '__main__':
    main()
