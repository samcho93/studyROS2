# QoS: best effort 퍼블리셔
# 터미널: ros2 topic info /temperature -v 로 BEST_EFFORT 확인 → ros2 topic echo /temperature --qos-reliability reliable 은 호환되지 않아 안 보이고(경고), 옵션 없이 echo 하면 발행자에 맞춰 자동으로 보입니다.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from std_msgs.msg import Float32


class Sensor(Node):
    def __init__(self):
        super().__init__('fake_sensor')
        qos = QoSProfile(depth=5,
                         reliability=ReliabilityPolicy.BEST_EFFORT,
                         history=HistoryPolicy.KEEP_LAST)
        self.pub = self.create_publisher(Float32, 'temperature', qos)
        self.t = 20.0
        self.create_timer(0.2, self.tick)

    def tick(self):
        self.t += 0.1
        self.pub.publish(Float32(data=self.t))


def main():
    rclpy.init()
    rclpy.spin(Sensor())


if __name__ == '__main__':
    main()
