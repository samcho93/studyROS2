"""QoS 설정 — 이름과 값은 실제 rclpy.qos 와 같습니다."""
from enum import IntEnum


class HistoryPolicy(IntEnum):
    SYSTEM_DEFAULT = 0
    KEEP_LAST = 1
    KEEP_ALL = 2
    UNKNOWN = 3


class ReliabilityPolicy(IntEnum):
    SYSTEM_DEFAULT = 0
    RELIABLE = 1
    BEST_EFFORT = 2
    UNKNOWN = 3
    BEST_AVAILABLE = 4


class DurabilityPolicy(IntEnum):
    SYSTEM_DEFAULT = 0
    TRANSIENT_LOCAL = 1
    VOLATILE = 2
    UNKNOWN = 3
    BEST_AVAILABLE = 4


class LivelinessPolicy(IntEnum):
    SYSTEM_DEFAULT = 0
    AUTOMATIC = 1
    MANUAL_BY_TOPIC = 3
    UNKNOWN = 4


# 예전 이름
QoSHistoryPolicy = HistoryPolicy
QoSReliabilityPolicy = ReliabilityPolicy
QoSDurabilityPolicy = DurabilityPolicy
QoSLivelinessPolicy = LivelinessPolicy


class QoSProfile:
    def __init__(self, *, history=HistoryPolicy.KEEP_LAST, depth=None, reliability=ReliabilityPolicy.RELIABLE,
                 durability=DurabilityPolicy.VOLATILE, liveliness=LivelinessPolicy.AUTOMATIC, deadline=None,
                 lifespan=None, liveliness_lease_duration=None, avoid_ros_namespace_conventions=False, **_):
        if depth is None and history == HistoryPolicy.KEEP_LAST:
            raise ValueError("A QoSProfile with history=KEEP_LAST must have a depth (예: QoSProfile(depth=10))")
        self.history = history
        self.depth = depth if depth is not None else 0
        self.reliability = reliability
        self.durability = durability
        self.liveliness = liveliness
        self.deadline = deadline
        self.lifespan = lifespan

    def _to_json(self):
        rel = "best_effort" if self.reliability == ReliabilityPolicy.BEST_EFFORT else "reliable"
        dur = "transient_local" if self.durability == DurabilityPolicy.TRANSIENT_LOCAL else "volatile"
        hist = "keep_all" if self.history == HistoryPolicy.KEEP_ALL else "keep_last"
        return {"reliability": rel, "durability": dur, "history": hist, "depth": self.depth or 1000}

    def __repr__(self):
        return (f"QoSProfile(history={self.history.name}, depth={self.depth}, "
                f"reliability={self.reliability.name}, durability={self.durability.name})")


qos_profile_system_default = QoSProfile(depth=10)
qos_profile_default = QoSProfile(depth=10)
qos_profile_sensor_data = QoSProfile(depth=5, reliability=ReliabilityPolicy.BEST_EFFORT)
qos_profile_services_default = QoSProfile(depth=10)
qos_profile_parameters = QoSProfile(depth=1000)
qos_profile_parameter_events = QoSProfile(depth=1000)


class QoSPresetProfiles:
    SYSTEM_DEFAULT = qos_profile_system_default
    SENSOR_DATA = qos_profile_sensor_data
    SERVICES_DEFAULT = qos_profile_services_default
    PARAMETERS = qos_profile_parameters
    PARAMETER_EVENTS = qos_profile_parameter_events
