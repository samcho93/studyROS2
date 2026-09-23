from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    """목표 지점까지 가기 (강좌 8장). ros2 launch ros2_study_examples turtle_goto.launch.py goal_x:=2.0 goal_y:=8.0"""
    return LaunchDescription([
        DeclareLaunchArgument('goal_x', default_value='9.0'),
        DeclareLaunchArgument('goal_y', default_value='9.0'),
        Node(package='turtlesim', executable='turtlesim_node', name='turtlesim'),
        Node(package='ros2_study_examples', executable='turtle_goto', name='go_to_goal',
             parameters=[{'goal_x': LaunchConfiguration('goal_x'), 'goal_y': LaunchConfiguration('goal_y')}]),
    ])
