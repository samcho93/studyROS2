# TF 브로드캐스터 (거북이 → tf)
# 실행 후 터미널: ros2 run tf2_ros tf2_echo world turtle1
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TransformStamped
from tf2_ros import TransformBroadcaster
from turtlesim.msg import Pose


def quaternion_from_euler(ai, aj, ak):
    ai /= 2.0; aj /= 2.0; ak /= 2.0
    ci, si = math.cos(ai), math.sin(ai)
    cj, sj = math.cos(aj), math.sin(aj)
    ck, sk = math.cos(ak), math.sin(ak)
    cc, cs, sc, ss = ci*ck, ci*sk, si*ck, si*sk
    return [cj*sc - sj*cs, cj*ss + sj*cc, cj*cs - sj*sc, cj*cc + sj*ss]


class FramePublisher(Node):
    def __init__(self):
        super().__init__('turtle_tf2_frame_publisher')
        self.turtlename = self.declare_parameter('turtlename', 'turtle1').value
        self.tf_broadcaster = TransformBroadcaster(self)
        self.create_subscription(Pose, f'/{self.turtlename}/pose', self.handle_turtle_pose, 1)

    def handle_turtle_pose(self, msg):
        t = TransformStamped()
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = 'world'
        t.child_frame_id = self.turtlename
        t.transform.translation.x = msg.x
        t.transform.translation.y = msg.y
        t.transform.translation.z = 0.0
        q = quaternion_from_euler(0, 0, msg.theta)
        t.transform.rotation.x = q[0]
        t.transform.rotation.y = q[1]
        t.transform.rotation.z = q[2]
        t.transform.rotation.w = q[3]
        self.tf_broadcaster.sendTransform(t)


def main():
    rclpy.init()
    rclpy.spin(FramePublisher())


if __name__ == '__main__':
    main()
