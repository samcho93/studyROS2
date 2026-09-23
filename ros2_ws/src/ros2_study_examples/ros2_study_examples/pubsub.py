# 퍼블리셔 + 서브스크라이버 한 파일
# 
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32


class Counter(Node):
    def __init__(self):
        super().__init__('counter')
        self.pub = self.create_publisher(Int32, 'count', 10)
        self.sub = self.create_subscription(Int32, 'count', self.on_count, 10)
        self.n = 0
        self.create_timer(1.0, self.tick)

    def tick(self):
        self.n += 1
        self.pub.publish(Int32(data=self.n))

    def on_count(self, msg):
        self.get_logger().info(f'받은 숫자: {msg.data}  (제곱: {msg.data ** 2})')


def main():
    rclpy.init()
    node = Counter()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
