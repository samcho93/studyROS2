# 거북이 원 그리기 (cmd_vel)
# linear.x 와 angular.z 를 바꿔 보세요. 반지름 = 선속도 / 각속도
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class CircleDriver(Node):
    def __init__(self):
        super().__init__('circle_driver')
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.on_timer)   # 10 Hz

    def on_timer(self):
        msg = Twist()
        msg.linear.x = 2.0      # 앞으로 2 m/s   (2 가 아니라 2.0 — float 이어야 해요!)
        msg.angular.z = 1.0     # 왼쪽으로 1 rad/s
        self.pub.publish(msg)


def main():
    rclpy.init()
    node = CircleDriver()
    rclpy.spin(node)


if __name__ == '__main__':
    main()
