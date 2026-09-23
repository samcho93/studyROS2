# 장애물 피하기 (LaserScan → cmd_vel)
# 로봇이 스스로 벽을 피해 돌아다닙니다. 임계값 0.45 m 와 속도를 바꿔 보세요.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist


class Avoider(Node):
    def __init__(self):
        super().__init__('obstacle_avoider')
        self.create_subscription(LaserScan, '/scan', self.on_scan, qos_profile_sensor_data)
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)

    def on_scan(self, scan):
        n = len(scan.ranges)
        def sector(deg_from, deg_to):
            vals = []
            for d in range(deg_from, deg_to):
                r = scan.ranges[int((d % 360) * n / 360)]
                if scan.range_min < r < scan.range_max:
                    vals.append(r)
            return min(vals) if vals else scan.range_max
        front = sector(-25, 25)
        left, right = sector(25, 90), sector(-90, -25)
        cmd = Twist()
        if front < 0.45:
            cmd.angular.z = 1.2 if left > right else -1.2    # 넓은 쪽으로 제자리 회전
        else:
            cmd.linear.x = 0.2
            cmd.angular.z = 0.6 * (left - right)
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(Avoider())


if __name__ == '__main__':
    main()
