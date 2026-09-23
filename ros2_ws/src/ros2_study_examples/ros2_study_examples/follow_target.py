# 비전 추적 → 거북이 회전
# 
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Point, Twist


class Follower(Node):
    def __init__(self):
        super().__init__('target_follower')
        self.declare_parameter('gain', 2.0)
        self.create_subscription(Point, '/target', self.on_target, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)

    def on_target(self, p):
        k = self.get_parameter('gain').value
        cmd = Twist()
        cmd.angular.z = -k * p.x          # 화면 오른쪽(+)에 있으면 오른쪽(-)으로 돌기
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(Follower())


if __name__ == '__main__':
    main()
