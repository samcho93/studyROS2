def remove_ros_args(args=None):
    args = list(args or [])
    if '--ros-args' in args:
        i = args.index('--ros-args')
        rest = args[i + 1:]
        j = rest.index('--') if '--' in rest else len(rest)
        return args[:i] + rest[j + 1:]
    return args


def ok(context=None):
    import rclpy
    return rclpy.ok()
