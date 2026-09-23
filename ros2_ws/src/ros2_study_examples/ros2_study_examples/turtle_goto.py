# 목표 지점까지 가기 (P 제어)
# 실행 중에 터미널에서 ros2 param set /go_to_goal goal_x 2.0 으로 목표를 바꿔 보세요.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose


class GoTo(Node):
    def __init__(self):
        super().__init__('go_to_goal')
        self.declare_parameter('goal_x', 9.0)
        self.declare_parameter('goal_y', 9.0)
        self.pose = None
        self.create_subscription(Pose, '/turtle1/pose', self.on_pose, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(0.05, self.control)

    def on_pose(self, msg):
        self.pose = msg

    def control(self):
        if self.pose is None:
            return
        gx = self.get_parameter('goal_x').value
        gy = self.get_parameter('goal_y').value
        dx, dy = gx - self.pose.x, gy - self.pose.y
        dist = math.hypot(dx, dy)
        cmd = Twist()
        if dist > 0.05:
            err = math.atan2(dy, dx) - self.pose.theta
            err = math.atan2(math.sin(err), math.cos(err))   # -π ~ π 로
            cmd.angular.z = 4.0 * err
            cmd.linear.x = min(2.0, 1.5 * dist) if abs(err) < 0.5 else 0.0
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(GoTo())


if __name__ == '__main__':
    main()
