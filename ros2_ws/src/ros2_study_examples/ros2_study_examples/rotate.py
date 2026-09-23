# 거북이 회전 액션 (RotateAbsolute)
# 
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from turtlesim.action import RotateAbsolute


class Rotator(Node):
    def __init__(self):
        super().__init__('rotator')
        self.ac = ActionClient(self, RotateAbsolute, '/turtle1/rotate_absolute')

    def turn(self, deg):
        self.ac.wait_for_server()
        goal = RotateAbsolute.Goal(theta=math.radians(deg))
        send_future = self.ac.send_goal_async(goal, feedback_callback=self.on_fb)
        rclpy.spin_until_future_complete(self, send_future)          # 목표 수락 기다리기
        result_future = send_future.result().get_result_async()
        rclpy.spin_until_future_complete(self, result_future)        # 결과 기다리기
        result = result_future.result()
        self.get_logger().info(f'{deg}° 도착! 회전량 = {math.degrees(result.result.delta):.1f}°')

    def on_fb(self, msg):
        self.get_logger().info(f'남은 각도 {math.degrees(msg.feedback.remaining):6.1f}°',
                               throttle_duration_sec=0.3)


def main():
    rclpy.init()
    node = Rotator()
    for d in (90, 180, -90, 0):
        node.turn(d)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
