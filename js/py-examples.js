/* ===================================================================
   파이썬(rclpy) 예제 모음 — {{widget:pylab|ex=이름}} 과 실습실에서 불러 쓴다.
   모든 코드는 실제 ROS 2 Jazzy 의 rclpy 에서도 그대로 동작하는 코드입니다.
   with: 옆에 함께 띄울 화면 (turtlesim | graph | term | bot | arm | go2 | rviz | none)
   =================================================================== */
(function () {
  'use strict';
  const EX = {};
  const add = (id, title, withV, code, desc) => { EX[id] = { id, title, with: withV, code: code.replace(/^\n/, ''), desc: desc || '' }; };

  add('hello', '첫 노드: 로그 출력', 'graph', `
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
`, '노드를 하나 만들고 로그를 찍은 뒤 끝나는 가장 짧은 프로그램');

  add('talker', '퍼블리셔 (talker)', 'graph', `
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class MinimalPublisher(Node):

    def __init__(self):
        super().__init__('minimal_publisher')
        self.publisher_ = self.create_publisher(String, 'topic', 10)
        timer_period = 0.5  # seconds
        self.timer = self.create_timer(timer_period, self.timer_callback)
        self.i = 0

    def timer_callback(self):
        msg = String()
        msg.data = 'Hello World: %d' % self.i
        self.publisher_.publish(msg)
        self.get_logger().info('Publishing: "%s"' % msg.data)
        self.i += 1


def main(args=None):
    rclpy.init(args=args)
    minimal_publisher = MinimalPublisher()
    rclpy.spin(minimal_publisher)
    minimal_publisher.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, '공식 튜토리얼의 퍼블리셔. 0.5초마다 /topic 에 문자열을 발행합니다.');

  add('listener', '서브스크라이버 (listener)', 'graph', `
import rclpy
from rclpy.node import Node
from std_msgs.msg import String


class MinimalSubscriber(Node):

    def __init__(self):
        super().__init__('minimal_subscriber')
        self.subscription = self.create_subscription(
            String,
            'topic',
            self.listener_callback,
            10)
        self.subscription  # prevent unused variable warning

    def listener_callback(self, msg):
        self.get_logger().info('I heard: "%s"' % msg.data)


def main(args=None):
    rclpy.init(args=args)
    minimal_subscriber = MinimalSubscriber()
    rclpy.spin(minimal_subscriber)
    minimal_subscriber.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, '/topic 을 구독합니다. 다른 실습기나 터미널에서 talker 를 켜 보세요.');

  add('pubsub', '퍼블리셔 + 서브스크라이버 한 파일', 'graph', `
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32


class Counter(Node):
    def __init__(self):
        super().__init__('counter')
        self.pub = self.create_publisher(Int32, 'count', 10)
        self.sub = self.create_subscription(Int32, 'count', self.on_count, 10)
        self.n = 0
        self.create_timer(1.0, self.tick)

    def tick(self):
        self.n += 1
        self.pub.publish(Int32(data=self.n))

    def on_count(self, msg):
        self.get_logger().info(f'받은 숫자: {msg.data}  (제곱: {msg.data ** 2})')


def main():
    rclpy.init()
    node = Counter()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    finally:
        node.destroy_node()
        rclpy.try_shutdown()


if __name__ == '__main__':
    main()
`);

  add('turtle_circle', '거북이 원 그리기 (cmd_vel)', 'turtlesim', `
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist


class CircleDriver(Node):
    def __init__(self):
        super().__init__('circle_driver')
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.timer = self.create_timer(0.1, self.on_timer)   # 10 Hz

    def on_timer(self):
        msg = Twist()
        msg.linear.x = 2.0      # 앞으로 2 m/s   (2 가 아니라 2.0 — float 이어야 해요!)
        msg.angular.z = 1.0     # 왼쪽으로 1 rad/s
        self.pub.publish(msg)


def main():
    rclpy.init()
    node = CircleDriver()
    rclpy.spin(node)


if __name__ == '__main__':
    main()
`, 'linear.x 와 angular.z 를 바꿔 보세요. 반지름 = 선속도 / 각속도');

  add('turtle_pose', '거북이 위치 구독 (Pose)', 'turtlesim', `
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
`, '거북이를 방향 버튼으로 움직이면서 로그를 보세요.');

  add('turtle_goto', '목표 지점까지 가기 (P 제어)', 'turtlesim', `
import math
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Twist
from turtlesim.msg import Pose


class GoTo(Node):
    def __init__(self):
        super().__init__('go_to_goal')
        self.declare_parameter('goal_x', 9.0)
        self.declare_parameter('goal_y', 9.0)
        self.pose = None
        self.create_subscription(Pose, '/turtle1/pose', self.on_pose, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)
        self.create_timer(0.05, self.control)

    def on_pose(self, msg):
        self.pose = msg

    def control(self):
        if self.pose is None:
            return
        gx = self.get_parameter('goal_x').value
        gy = self.get_parameter('goal_y').value
        dx, dy = gx - self.pose.x, gy - self.pose.y
        dist = math.hypot(dx, dy)
        cmd = Twist()
        if dist > 0.05:
            err = math.atan2(dy, dx) - self.pose.theta
            err = math.atan2(math.sin(err), math.cos(err))   # -π ~ π 로
            cmd.angular.z = 4.0 * err
            cmd.linear.x = min(2.0, 1.5 * dist) if abs(err) < 0.5 else 0.0
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(GoTo())


if __name__ == '__main__':
    main()
`, '실행 중에 터미널에서 ros2 param set /go_to_goal goal_x 2.0 으로 목표를 바꿔 보세요.');

  add('add_server', '서비스 서버 (AddTwoInts)', 'term', `
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class MinimalService(Node):

    def __init__(self):
        super().__init__('minimal_service')
        self.srv = self.create_service(AddTwoInts, 'add_two_ints', self.add_two_ints_callback)

    def add_two_ints_callback(self, request, response):
        response.sum = request.a + request.b
        self.get_logger().info('Incoming request\\na: %d b: %d' % (request.a, request.b))
        return response


def main():
    rclpy.init()
    minimal_service = MinimalService()
    rclpy.spin(minimal_service)
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, '실행 후 옆 터미널에서: ros2 service call /add_two_ints example_interfaces/srv/AddTwoInts "{a: 2, b: 3}"');

  add('add_client', '서비스 클라이언트 (AddTwoInts)', 'term', `
import sys
import rclpy
from rclpy.node import Node
from example_interfaces.srv import AddTwoInts


class MinimalClientAsync(Node):

    def __init__(self):
        super().__init__('minimal_client_async')
        self.cli = self.create_client(AddTwoInts, 'add_two_ints')
        while not self.cli.wait_for_service(timeout_sec=1.0):
            self.get_logger().info('service not available, waiting again...')
        self.req = AddTwoInts.Request()

    def send_request(self, a, b):
        self.req.a = a
        self.req.b = b
        return self.cli.call_async(self.req)


def main():
    rclpy.init()
    minimal_client = MinimalClientAsync()
    future = minimal_client.send_request(41, 1)
    rclpy.spin_until_future_complete(minimal_client, future)
    response = future.result()
    minimal_client.get_logger().info(
        'Result of add_two_ints: for %d + %d = %d' % (41, 1, response.sum))
    minimal_client.destroy_node()
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, '서버가 없으면 기다립니다. 터미널에서 ros2 run demo_nodes_py add_two_ints_server 를 켜 보세요.');

  add('spawn', '거북이 소환 (Spawn 서비스)', 'turtlesim', `
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
`);

  add('fib_server', '액션 서버 (Fibonacci)', 'term', `
import time

import rclpy
from rclpy.action import ActionServer
from rclpy.node import Node

from action_tutorials_interfaces.action import Fibonacci


class FibonacciActionServer(Node):

    def __init__(self):
        super().__init__('fibonacci_action_server')
        self._action_server = ActionServer(
            self,
            Fibonacci,
            'fibonacci',
            self.execute_callback)

    def execute_callback(self, goal_handle):
        self.get_logger().info('Executing goal...')

        feedback_msg = Fibonacci.Feedback()
        feedback_msg.partial_sequence = [0, 1]

        for i in range(1, goal_handle.request.order):
            feedback_msg.partial_sequence.append(
                feedback_msg.partial_sequence[i] + feedback_msg.partial_sequence[i-1])
            self.get_logger().info('Feedback: {0}'.format(feedback_msg.partial_sequence))
            goal_handle.publish_feedback(feedback_msg)
            time.sleep(1)

        goal_handle.succeed()

        result = Fibonacci.Result()
        result.sequence = feedback_msg.partial_sequence
        return result


def main(args=None):
    rclpy.init(args=args)
    fibonacci_action_server = FibonacciActionServer()
    rclpy.spin(fibonacci_action_server)


if __name__ == '__main__':
    main()
`, '터미널에서: ros2 action send_goal /fibonacci action_tutorials_interfaces/action/Fibonacci "{order: 5}" --feedback');

  add('fib_client', '액션 클라이언트 (Fibonacci)', 'term', `
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node

from action_tutorials_interfaces.action import Fibonacci


class FibonacciActionClient(Node):

    def __init__(self):
        super().__init__('fibonacci_action_client')
        self._action_client = ActionClient(self, Fibonacci, 'fibonacci')

    def send_goal(self, order):
        goal_msg = Fibonacci.Goal()
        goal_msg.order = order

        self._action_client.wait_for_server()

        self._send_goal_future = self._action_client.send_goal_async(
            goal_msg, feedback_callback=self.feedback_callback)
        self._send_goal_future.add_done_callback(self.goal_response_callback)

    def goal_response_callback(self, future):
        goal_handle = future.result()
        if not goal_handle.accepted:
            self.get_logger().info('Goal rejected :(')
            return

        self.get_logger().info('Goal accepted :)')

        self._get_result_future = goal_handle.get_result_async()
        self._get_result_future.add_done_callback(self.get_result_callback)

    def get_result_callback(self, future):
        result = future.result().result
        self.get_logger().info('Result: {0}'.format(result.sequence))
        rclpy.shutdown()

    def feedback_callback(self, feedback_msg):
        feedback = feedback_msg.feedback
        self.get_logger().info('Received feedback: {0}'.format(feedback.partial_sequence))


def main(args=None):
    rclpy.init(args=args)
    action_client = FibonacciActionClient()
    action_client.send_goal(10)
    rclpy.spin(action_client)


if __name__ == '__main__':
    main()
`, '먼저 액션 서버(fib_server 예제나 ros2 run action_tutorials_py fibonacci_action_server)를 켜 두세요.');

  add('rotate', '거북이 회전 액션 (RotateAbsolute)', 'turtlesim', `
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
`);

  add('params', '파라미터 선언 · 콜백', 'term', `
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
`, '터미널: ros2 param list /param_demo · ros2 param set /param_demo max_speed 1.5 · ros2 param set /param_demo max_speed 3.0 (거절)');

  add('tf_broadcaster', 'TF 브로드캐스터 (거북이 → tf)', 'turtlesim', `
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
`, '실행 후 터미널: ros2 run tf2_ros tf2_echo world turtle1');

  add('tf_listener', 'TF 리스너 (거북이 따라가기)', 'turtlesim', `
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
`, '방향 버튼으로 turtle1 을 움직이면 turtle2 가 따라옵니다.');

  add('static_tf', '정적 TF (센서 장착 위치)', 'term', `
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
`, '실행 후 터미널: ros2 run tf2_ros tf2_echo base_link laser');

  add('qos', 'QoS: best effort 퍼블리셔', 'term', `
import rclpy
from rclpy.node import Node
from rclpy.qos import QoSProfile, ReliabilityPolicy, HistoryPolicy
from std_msgs.msg import Float32


class Sensor(Node):
    def __init__(self):
        super().__init__('fake_sensor')
        qos = QoSProfile(depth=5,
                         reliability=ReliabilityPolicy.BEST_EFFORT,
                         history=HistoryPolicy.KEEP_LAST)
        self.pub = self.create_publisher(Float32, 'temperature', qos)
        self.t = 20.0
        self.create_timer(0.2, self.tick)

    def tick(self):
        self.t += 0.1
        self.pub.publish(Float32(data=self.t))


def main():
    rclpy.init()
    rclpy.spin(Sensor())


if __name__ == '__main__':
    main()
`, '터미널: ros2 topic info /temperature -v 로 BEST_EFFORT 확인 → ros2 topic echo /temperature --qos-reliability reliable 은 호환되지 않아 안 보이고(경고), 옵션 없이 echo 하면 발행자에 맞춰 자동으로 보입니다.');

  add('bot_avoid', '장애물 피하기 (LaserScan → cmd_vel)', 'bot', `
import rclpy
from rclpy.node import Node
from rclpy.qos import qos_profile_sensor_data
from sensor_msgs.msg import LaserScan
from geometry_msgs.msg import Twist


class Avoider(Node):
    def __init__(self):
        super().__init__('obstacle_avoider')
        self.create_subscription(LaserScan, '/scan', self.on_scan, qos_profile_sensor_data)
        self.pub = self.create_publisher(Twist, '/cmd_vel', 10)

    def on_scan(self, scan):
        n = len(scan.ranges)
        def sector(deg_from, deg_to):
            vals = []
            for d in range(deg_from, deg_to):
                r = scan.ranges[int((d % 360) * n / 360)]
                if scan.range_min < r < scan.range_max:
                    vals.append(r)
            return min(vals) if vals else scan.range_max
        front = sector(-25, 25)
        left, right = sector(25, 90), sector(-90, -25)
        cmd = Twist()
        if front < 0.45:
            cmd.angular.z = 1.2 if left > right else -1.2    # 넓은 쪽으로 제자리 회전
        else:
            cmd.linear.x = 0.2
            cmd.angular.z = 0.6 * (left - right)
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(Avoider())


if __name__ == '__main__':
    main()
`, '로봇이 스스로 벽을 피해 돌아다닙니다. 임계값 0.45 m 와 속도를 바꿔 보세요.');

  add('nav_goal', 'Nav2 목표 보내기 (NavigateToPose)', 'bot', `
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
`, 'bot 시뮬레이터가 nav 모드여야 합니다 (/navigate_to_pose 액션 서버).');

  add('arm_traj', '로봇팔 궤적 보내기 (FollowJointTrajectory)', 'arm', `
import rclpy
from rclpy.action import ActionClient
from rclpy.node import Node
from builtin_interfaces.msg import Duration
from control_msgs.action import FollowJointTrajectory
from trajectory_msgs.msg import JointTrajectoryPoint

JOINTS = ['shoulder_pan', 'shoulder_lift', 'elbow_flex', 'wrist_flex', 'wrist_roll', 'gripper']


def main():
    rclpy.init()
    node = Node('arm_commander')
    ac = ActionClient(node, FollowJointTrajectory, '/arm_controller/follow_joint_trajectory')
    ac.wait_for_server()

    goal = FollowJointTrajectory.Goal()
    goal.trajectory.joint_names = JOINTS
    waypoints = [
        ([0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 1),
        ([0.8, -0.6, 0.9, 0.4, 0.0, 1.2], 3),     # 오른쪽 위로 + 그리퍼 열기
        ([-0.8, -0.6, 0.9, 0.4, 1.5, 0.2], 6),    # 왼쪽으로 + 손목 회전
        ([0.0, 0.0, 0.0, 0.0, 0.0, 0.0], 8),      # 제자리
    ]
    for pos, sec in waypoints:
        p = JointTrajectoryPoint()
        p.positions = pos
        p.time_from_start = Duration(sec=sec)
        goal.trajectory.points.append(p)

    node.get_logger().info('궤적을 보냅니다...')
    send_future = ac.send_goal_async(goal)
    rclpy.spin_until_future_complete(node, send_future)
    result_future = send_future.result().get_result_async()
    rclpy.spin_until_future_complete(node, result_future)
    node.get_logger().info(f'완료! error_code={result_future.result().result.error_code}')
    rclpy.shutdown()


if __name__ == '__main__':
    main()
`, 'SO-ARM101 관절 이름 그대로 씁니다. 실제 로봇에서도 같은 액션 인터페이스입니다.');

  add('go2_walk', 'Go2 걷게 하기 (cmd_vel + 서비스)', 'go2', `
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
`, 'Go2 는 0.5 초 동안 명령이 없으면 멈춥니다(워치독). 그래서 10 Hz 로 계속 보냅니다.');

  add('esp32', 'micro-ROS 보드와 대화하기', 'none', `
import rclpy
from rclpy.node import Node
from std_msgs.msg import Int32, Bool


class Dimmer(Node):
    """ESP32 가변저항 값(0~4095)을 읽어 LED 를 켜고 끕니다."""
    def __init__(self):
        super().__init__('esp32_dimmer')
        self.create_subscription(Int32, '/esp32/pot', self.on_pot, 10)
        self.led = self.create_publisher(Bool, '/esp32/led', 10)

    def on_pot(self, msg):
        on = msg.data > 2048
        self.led.publish(Bool(data=on))
        self.get_logger().info(f'pot={msg.data:4d} → LED {"ON" if on else "OFF"}', throttle_duration_sec=0.5)


def main():
    rclpy.init()
    rclpy.spin(Dimmer())


if __name__ == '__main__':
    main()
`, '같은 장의 가상 ESP32 보드에서 agent 를 켜고 가변저항을 돌려 보세요.');

  add('follow_target', '비전 추적 → 거북이 회전', 'turtlesim', `
import rclpy
from rclpy.node import Node
from geometry_msgs.msg import Point, Twist


class Follower(Node):
    def __init__(self):
        super().__init__('target_follower')
        self.declare_parameter('gain', 2.0)
        self.create_subscription(Point, '/target', self.on_target, 10)
        self.pub = self.create_publisher(Twist, '/turtle1/cmd_vel', 10)

    def on_target(self, p):
        k = self.get_parameter('gain').value
        cmd = Twist()
        cmd.angular.z = -k * p.x          # 화면 오른쪽(+)에 있으면 오른쪽(-)으로 돌기
        self.pub.publish(cmd)


def main():
    rclpy.init()
    rclpy.spin(Follower())


if __name__ == '__main__':
    main()
`);

  add('blank', '빈 노드 템플릿', 'graph', `
import rclpy
from rclpy.node import Node


class MyNode(Node):
    def __init__(self):
        super().__init__('my_node')
        self.get_logger().info('my_node 시작!')
        self.create_timer(1.0, self.on_timer)

    def on_timer(self):
        pass   # 여기에 코드를 작성하세요


def main():
    rclpy.init()
    node = MyNode()
    try:
        rclpy.spin(node)
    except KeyboardInterrupt:
        pass
    node.destroy_node()
    rclpy.try_shutdown()


if __name__ == '__main__':
    main()
`);

  window.PY_EXAMPLES = EX;
})();
