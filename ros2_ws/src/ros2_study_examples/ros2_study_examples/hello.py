# 첫 노드: 로그 출력
# 노드를 하나 만들고 로그를 찍은 뒤 끝나는 가장 짧은 프로그램
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node


def main():
    rclpy.init()
    node = Node('hello_node')                 # 노드 이름
    node.get_logger().info('안녕하세요, ROS 2!')
    node.get_logger().warn('이건 경고(WARN) 로그예요')
    node.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
