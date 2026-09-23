from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    """turtlesim + TF 로 거북이 따라가기 (강좌 12장)."""
    return LaunchDescription([
        Node(package='turtlesim', executable='turtlesim_node', name='sim'),
        Node(package='ros2_study_examples', executable='tf_listener', name='turtle_follower'),
    ])
