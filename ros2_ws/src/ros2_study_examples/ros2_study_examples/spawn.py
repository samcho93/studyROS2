# 거북이 소환 (Spawn 서비스)
# 
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import random
import rclpy
from rclpy.node import Node
from turtlesim.srv import Spawn, SetPen


def main():
    rclpy.init()
    node = Node('spawner')
    cli = node.create_client(Spawn, '/spawn')
    cli.wait_for_service()

    for i in range(3):
        req = Spawn.Request()
        req.x = random.uniform(1.0, 10.0)
        req.y = random.uniform(1.0, 10.0)
        req.theta = random.uniform(-3.14, 3.14)
        future = cli.call_async(req)
        rclpy.spin_until_future_complete(node, future)
        name = future.result().name
        node.get_logger().info(f'{name} 를 소환했습니다!')

        pen = node.create_client(SetPen, f'/{name}/set_pen')
        pen.wait_for_service()
        f2 = pen.call_async(SetPen.Request(r=255, g=80 * i, b=0, width=5, off=0))
        rclpy.spin_until_future_complete(node, f2)

    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
