# 정적 TF (센서 장착 위치)
# 실행 후 터미널: ros2 run tf2_ros tf2_echo base_link laser
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import TransformStamped
from tf2_ros.static_transform_broadcaster import StaticTransformBroadcaster


def main():
    rclpy.init()
    node = Node('static_tf_pub')
    br = StaticTransformBroadcaster(node)

    t = TransformStamped()
    t.header.stamp = node.get_clock().now().to_msg()
    t.header.frame_id = 'base_link'
    t.child_frame_id = 'laser'
    t.transform.translation.x = 0.10     # 로봇 중심에서 앞으로 10 cm
    t.transform.translation.z = 0.20     # 위로 20 cm
    t.transform.rotation.w = 1.0
    br.sendTransform(t)
    node.get_logger().info('base_link → laser 정적 변환을 발행했습니다')
    rclpy.spin(node)


if __name__ == '__main__':
    main()
