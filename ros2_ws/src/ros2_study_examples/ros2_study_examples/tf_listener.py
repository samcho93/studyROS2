# TF 리스너 (거북이 따라가기)
# 방향 버튼으로 turtle1 을 움직이면 turtle2 가 따라옵니다.
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist, TransformStamped
from tf2_ros import TransformBroadcaster, TransformException
from tf2_ros.buffer import Buffer
from tf2_ros.transform_listener import TransformListener
from turtlesim.msg import Pose
from turtlesim.srv import Spawn


class Follower(Node):
    """turtle1 의 위치를 TF 로 받아 turtle2 가 따라갑니다 (브로드캐스터까지 한 노드에)."""

    def __init__(self):
        super().__init__('turtle_follower')
        self.br = TransformBroadcaster(self)
        for name in ('turtle1', 'turtle2'):
            self.create_subscription(Pose, f'/{name}/pose', lambda m, n=name: self.send_tf(n, m), 1)
        self.tf_buffer = Buffer()
        self.tf_listener = TransformListener(self.tf_buffer, self)
        self.pub = self.create_publisher(Twist, '/turtle2/cmd_vel', 1)
        self.spawner = self.create_client(Spawn, '/spawn')
        self.spawned = False
        self.create_timer(0.1, self.on_timer)

    def send_tf(self, name, p):
        t = TransformStamped()
        t.header.stamp = self.get_clock().now().to_msg()
        t.header.frame_id = 'world'
        t.child_frame_id = name
        t.transform.translation.x, t.transform.translation.y = p.x, p.y
        t.transform.rotation.z, t.transform.rotation.w = math.sin(p.theta / 2), math.cos(p.theta / 2)
        self.br.sendTransform(t)

    def on_timer(self):
        if not self.spawned:
            if self.spawner.service_is_ready():
                self.spawner.call_async(Spawn.Request(x=4.0, y=2.0, theta=0.0, name='turtle2'))
                self.spawned = True
            return
        try:
            t = self.tf_buffer.lookup_transform('turtle2', 'turtle1', rclpy.time.Time())
        except TransformException as ex:
            self.get_logger().info(f'Could not transform turtle2 to turtle1: {ex}', throttle_duration_sec=1.0)
            return
        msg = Twist()
        x, y = t.transform.translation.x, t.transform.translation.y
        msg.angular.z = 1.0 * math.atan2(y, x)
        msg.linear.x = 0.5 * math.sqrt(x ** 2 + y ** 2)
        self.pub.publish(msg)


def main():
    rclpy.init()
    rclpy.spin(Follower())


if __name__ == '__main__':
    main()
