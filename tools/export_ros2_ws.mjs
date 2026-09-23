// 브라우저 실습 예제(js/py-examples.js)를 실제 ROS 2 패키지로 내보내기
//   node tools/export_ros2_ws.mjs   →  ros2_ws/src/ros2_study_examples/
// 실제 Ubuntu 24.04 + ROS 2 Jazzy 에서:  cd ros2_ws && colcon build && source install/setup.bash
//                                         ros2 run ros2_study_examples talker
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/py-examples.js'), 'utf8'), ctx);
const EX = ctx.PY_EXAMPLES;

const PKG = 'ros2_study_examples';
const base = path.join(root, 'ros2_ws/src', PKG);
fs.rmSync(base, { recursive: true, force: true });
fs.mkdirSync(path.join(base, PKG), { recursive: true });
fs.mkdirSync(path.join(base, 'resource'), { recursive: true });
fs.mkdirSync(path.join(base, 'launch'), { recursive: true });

const deps = new Set(['rclpy']);
const entries = [];
for (const e of Object.values(EX)) {
  if (e.id === 'blank') continue;
  const code = e.code;
  for (const m of code.matchAll(/^from (\w+)\.(msg|srv|action) import/gm)) deps.add(m[1]);
  if (/tf2_ros/.test(code)) deps.add('tf2_ros');
  const mod = e.id;
  const header = `# ${e.title}\n# ${e.desc || ''}\n# 이 파일은 https://samcho93.github.io/studyROS2/ 의 브라우저 실습 예제와 같은 코드입니다.\n`;
  fs.writeFileSync(path.join(base, PKG, mod + '.py'), header + code);
  entries.push(`            '${mod} = ${PKG}.${mod}:main',`);
}
fs.writeFileSync(path.join(base, PKG, '__init__.py'), '');
fs.writeFileSync(path.join(base, 'resource', PKG), '');
fs.writeFileSync(path.join(base, 'setup.cfg'), `[develop]\nscript_dir=$base/lib/${PKG}\n[install]\ninstall_scripts=$base/lib/${PKG}\n`);
fs.writeFileSync(path.join(base, 'setup.py'), `import os
from glob import glob
from setuptools import find_packages, setup

package_name = '${PKG}'

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
${entries.join('\n')}
        ],
    },
)
`);
fs.writeFileSync(path.join(base, 'package.xml'), `<?xml version="1.0"?>
<?xml-model href="http://download.ros.org/schema/package_format3.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<package format="3">
  <name>${PKG}</name>
  <version>1.0.0</version>
  <description>ROS 2 쉽게 배우기 — 강좌 실습 예제 모음 (turtlesim · 서비스 · 액션 · TF · Nav2 · 로봇팔 · Go2)</description>
  <maintainer email="samdori93@gmail.com">samcho93</maintainer>
  <license>Apache-2.0</license>

${[...deps].sort().map(d => `  <exec_depend>${d}</exec_depend>`).join('\n')}
  <exec_depend>turtlesim</exec_depend>

  <export>
    <build_type>ament_python</build_type>
  </export>
</package>
`);
fs.writeFileSync(path.join(base, 'launch', 'turtle_follow.launch.py'), `from launch import LaunchDescription
from launch_ros.actions import Node


def generate_launch_description():
    """turtlesim + TF 로 거북이 따라가기 (강좌 12장)."""
    return LaunchDescription([
        Node(package='turtlesim', executable='turtlesim_node', name='sim'),
        Node(package='${PKG}', executable='tf_listener', name='turtle_follower'),
    ])
`);
fs.writeFileSync(path.join(base, 'launch', 'turtle_goto.launch.py'), `from launch import LaunchDescription
from launch.actions import DeclareLaunchArgument
from launch.substitutions import LaunchConfiguration
from launch_ros.actions import Node


def generate_launch_description():
    """목표 지점까지 가기 (강좌 8장). ros2 launch ${PKG} turtle_goto.launch.py goal_x:=2.0 goal_y:=8.0"""
    return LaunchDescription([
        DeclareLaunchArgument('goal_x', default_value='9.0'),
        DeclareLaunchArgument('goal_y', default_value='9.0'),
        Node(package='turtlesim', executable='turtlesim_node', name='turtlesim'),
        Node(package='${PKG}', executable='turtle_goto', name='go_to_goal',
             parameters=[{'goal_x': LaunchConfiguration('goal_x'), 'goal_y': LaunchConfiguration('goal_y')}]),
    ])
`);
fs.writeFileSync(path.join(base, 'README.md'), `# ${PKG}

강좌 **ROS 2 쉽게 배우기** (https://samcho93.github.io/studyROS2/) 의 파이썬 실습 예제를 실제 ROS 2 패키지로 묶었습니다.
브라우저 실습기(🐍 pylab)의 예제와 **같은 코드**입니다.

\`\`\`bash
cd ros2_ws
rosdep install --from-paths src -y --ignore-src
colcon build --symlink-install
source install/setup.bash
ros2 run turtlesim turtlesim_node        # 다른 터미널에서
ros2 run ${PKG} turtle_circle
\`\`\`

| 실행 파일 | 내용 |
|---|---|
${Object.values(EX).filter(e => e.id !== 'blank').map(e => `| \`${e.id}\` | ${e.title} |`).join('\n')}

런치: \`ros2 launch ${PKG} turtle_follow.launch.py\` · \`ros2 launch ${PKG} turtle_goto.launch.py goal_x:=2.0\`

> \`bot_avoid\`, \`nav_goal\` 은 TurtleBot3/Nav2 시뮬레이션, \`arm_traj\` 는 SO-ARM101(ros2_control), \`go2_walk\` 는 Go2 ROS 2 드라이버(/cmd_vel · /go2/stand_up 는 강좌용 이름 — 실제 드라이버에 맞게 바꾸세요), \`esp32\` 는 micro-ROS 보드가 필요합니다.
`);
console.log(`✓ ${base} (${entries.length} executables, deps: ${[...deps].join(', ')})`);
