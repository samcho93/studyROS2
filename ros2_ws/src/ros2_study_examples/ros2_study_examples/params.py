# 파라미터 선언 · 콜백
# 터미널: ros2 param list /param_demo · ros2 param set /param_demo max_speed 1.5 · ros2 param set /param_demo max_speed 3.0 (거절)
# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.
import rclpy
from rclpy.node import Node
from rcl_interfaces.msg import SetParametersResult


class ParamDemo(Node):
    def __init__(self):
        super().__init__('param_demo')
        self.declare_parameter('robot_name', 'webbot')
        self.declare_parameter('max_speed', 0.5)
        self.declare_parameter('debug', False)
        self.add_on_set_parameters_callback(self.on_change)
        self.create_timer(2.0, self.report)

    def on_change(self, params):
        for p in params:
            if p.name == 'max_speed' and p.value > 2.0:
                return SetParametersResult(successful=False, reason='max_speed 는 2.0 이하만 가능')
            self.get_logger().info(f'{p.name} → {p.value}')
        return SetParametersResult(successful=True)

    def report(self):
        name = self.get_parameter('robot_name').value
        speed = self.get_parameter('max_speed').get_parameter_value().double_value
        self.get_logger().info(f'{name}: 최대 속도 {speed} m/s')


def main():
    rclpy.init()
    rclpy.spin(ParamDemo())


if __name__ == '__main__':
    main()
