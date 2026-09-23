import os
from glob import glob
from setuptools import find_packages, setup

package_name = 'ros2_study_examples'

setup(
    name=package_name,
    version='1.0.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
        (os.path.join('share', package_name, 'launch'), glob('launch/*.launch.py')),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='samcho93',
    maintainer_email='samdori93@gmail.com',
    description='ROS 2 쉽게 배우기 — 강좌 실습 예제 모음',
    license='Apache-2.0',
    entry_points={
        'console_scripts': [
            'hello = ros2_study_examples.hello:main',
            'talker = ros2_study_examples.talker:main',
            'listener = ros2_study_examples.listener:main',
            'pubsub = ros2_study_examples.pubsub:main',
            'turtle_circle = ros2_study_examples.turtle_circle:main',
            'turtle_pose = ros2_study_examples.turtle_pose:main',
            'turtle_goto = ros2_study_examples.turtle_goto:main',
            'add_server = ros2_study_examples.add_server:main',
            'add_client = ros2_study_examples.add_client:main',
            'spawn = ros2_study_examples.spawn:main',
            'fib_server = ros2_study_examples.fib_server:main',
            'fib_client = ros2_study_examples.fib_client:main',
            'rotate = ros2_study_examples.rotate:main',
            'params = ros2_study_examples.params:main',
            'tf_broadcaster = ros2_study_examples.tf_broadcaster:main',
            'tf_listener = ros2_study_examples.tf_listener:main',
            'static_tf = ros2_study_examples.static_tf:main',
            'qos = ros2_study_examples.qos:main',
            'bot_avoid = ros2_study_examples.bot_avoid:main',
            'nav_goal = ros2_study_examples.nav_goal:main',
            'arm_traj = ros2_study_examples.arm_traj:main',
            'go2_walk = ros2_study_examples.go2_walk:main',
            'esp32 = ros2_study_examples.esp32:main',
            'follow_target = ros2_study_examples.follow_target:main',
        ],
    },
)
