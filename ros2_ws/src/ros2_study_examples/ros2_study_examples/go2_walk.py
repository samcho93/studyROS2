# Go2 걷게 하기 (cmd_vel + 서비스)
# Go2 는 0.5 초 동안 명령이 없으면 멈춥니다(워치독). 그래서 10 Hz 로 계속 보냅니다.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import time
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, Vector3
from std_srvs.srv import Trigger


def main():
    rclpy.init()
    node = Node('go2_commander')
    pub = node.create_publisher(Twist, '/cmd_vel', 10)
    stand = node.create_client(Trigger, '/go2/stand_up')
    stand.wait_for_service()
    future = stand.call_async(Trigger.Request())  # 일어서기
    rclpy.spin_until_future_complete(node, future)
    node.get_logger().info('일어섰습니다. 사각형으로 걸어요!')

    for _ in range(4):
        for _ in range(20):                        # 2초 직진 (10 Hz)
            pub.publish(Twist(linear=Vector3(x=0.4)))
            time.sleep(0.1)
        for _ in range(16):                        # 약 90° 회전
            t = Twist()
            t.angular.z = 1.0
            pub.publish(t)
            time.sleep(0.1)
    pub.publish(Twist())                           # 정지
    node.get_logger().info('끝!')
    rclpy.shutdown()


if __name__ == '__main__':
    main()
