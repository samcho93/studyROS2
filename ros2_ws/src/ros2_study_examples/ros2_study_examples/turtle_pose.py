# 거북이 위치 구독 (Pose)
# 거북이를 방향 버튼으로 움직이면서 로그를 보세요.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.node import Node
from turtlesim.msg import Pose


class PoseWatcher(Node):
    def __init__(self):
        super().__init__('pose_watcher')
        self.create_subscription(Pose, '/turtle1/pose', self.on_pose, 10)
        self.count = 0

    def on_pose(self, p):
        self.count += 1
        if self.count % 30 == 0:   # 너무 많이 찍지 않게 30번에 한 번
            self.get_logger().info(
                f'x={p.x:.2f}  y={p.y:.2f}  θ={math.degrees(p.theta):.0f}°')


def main():
    rclpy.init()
    rclpy.spin(PoseWatcher())


if __name__ == '__main__':
    main()
