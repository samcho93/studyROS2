# 서비스 클라이언트 (AddTwoInts)
# 서버가 없으면 기다립니다. 터미널에서 ros2 run demo_nodes_py add_two_ints_server 를 켜 보세요.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import sys
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class MinimalClientAsync(Node):

    def __init__(self):
        super().__init__('minimal_client_async')
        self.cli = self.create_client(AddTwoInts, 'add_two_ints')
        while not self.cli.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('service not available, waiting again...')
        self.req = AddTwoInts.Request()

    def send_request(self, a, b):
        self.req.a = a
        self.req.b = b
        return self.cli.call_async(self.req)


def main():
    rclpy.init()
    minimal_client = MinimalClientAsync()
    future = minimal_client.send_request(41, 1)
    rclpy.spin_until_future_complete(minimal_client, future)
    response = future.result()
    minimal_client.get_logger().info(
        'Result of add_two_ints: for %d + %d = %d' % (41, 1, response.sum))
    minimal_client.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
