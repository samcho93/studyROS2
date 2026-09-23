# micro-ROS 보드와 대화하기
# 같은 장의 가상 ESP32 보드에서 agent 를 켜고 가변저항을 돌려 보세요.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32, Bool


class Dimmer(Node):
    """ESP32 가변저항 값(0~4095)을 읽어 LED 를 켜고 끕니다."""
    def __init__(self):
        super().__init__('esp32_dimmer')
        self.create_subscription(Int32, '/esp32/pot', self.on_pot, 10)
        self.led = self.create_publisher(Bool, '/esp32/led', 10)

    def on_pot(self, msg):
        on = msg.data > 2048
        self.led.publish(Bool(data=on))
        self.get_logger().info(f'pot={msg.data:4d} → LED {"ON" if on else "OFF"}', throttle_duration_sec=0.5)


def main():
    rclpy.init()
    rclpy.spin(Dimmer())


if __name__ == '__main__':
    main()
