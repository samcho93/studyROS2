from ._impl import Clock  # noqa: F401


class ClockType:
    SYSTEM_TIME = 2
    STEADY_TIME = 3
    ROS_TIME = 1
