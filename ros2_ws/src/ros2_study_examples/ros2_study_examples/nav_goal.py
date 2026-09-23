# Nav2 목표 보내기 (NavigateToPose)
# bot 시뮬레이터가 nav 모드여야 합니다 (/navigate_to_pose 액션 서버).
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from nav2_msgs.action import NavigateToPose


class GoalSender(Node):
    def __init__(self):
        super().__init__('goal_sender')
        self.ac = ActionClient(self, NavigateToPose, 'navigate_to_pose')

    def go(self, x, y):
        self.ac.wait_for_server()
        goal = NavigateToPose.Goal()
        goal.pose.header.frame_id = 'map'
        goal.pose.pose.position.x = x
        goal.pose.pose.position.y = y
        goal.pose.pose.orientation.w = 1.0
        self.get_logger().info(f'목표 ({x}, {y}) 로 출발!')
        send_future = self.ac.send_goal_async(goal, feedback_callback=self.on_fb)
        rclpy.spin_until_future_complete(self, send_future)
        result_future = send_future.result().get_result_async()
        rclpy.spin_until_future_complete(self, result_future)
        self.get_logger().info(f'결과 상태: {result_future.result().status} (4 = 성공)')

    def on_fb(self, msg):
        self.get_logger().info(f'남은 거리 {msg.feedback.distance_remaining:.2f} m', throttle_duration_sec=1.0)


def main():
    rclpy.init()
    node = GoalSender()
    for x, y in [(3.6, -1.3), (0.5, 1.0), (0.0, 0.0)]:   # 순찰 지점 (bot 의 '방' 세계 기준)
        node.go(x, y)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
