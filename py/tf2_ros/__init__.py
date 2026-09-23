"""tf2_ros (브라우저 WebROS 호환판): TransformBroadcaster · StaticTransformBroadcaster · Buffer · TransformListener"""
import math

from rclpy.qos import QoSProfile, DurabilityPolicy, HistoryPolicy


class TransformException(Exception):
    pass


class LookupException(TransformException):
    pass


class ConnectivityException(TransformException):
    pass


class ExtrapolationException(TransformException):
    pass


class InvalidArgumentException(TransformException):
    pass


def _as_list(t):
    return list(t) if isinstance(t, (list, tuple)) else [t]


class TransformBroadcaster:
    def __init__(self, node, qos=None):
        from tf2_msgs.msg import TFMessage
        self._TF = TFMessage
        self._pub = node.create_publisher(TFMessage, '/tf', qos or 100)

    def sendTransform(self, transform):
        self._pub.publish(self._TF(transforms=_as_list(transform)))

    send_transform = sendTransform


class StaticTransformBroadcaster:
    def __init__(self, node, qos=None):
        from tf2_msgs.msg import TFMessage
        self._TF = TFMessage
        self._net = {}
        q = qos or QoSProfile(depth=1, durability=DurabilityPolicy.TRANSIENT_LOCAL, history=HistoryPolicy.KEEP_LAST)
        self._pub = node.create_publisher(TFMessage, '/tf_static', q)

    def sendTransform(self, transform):
        for t in _as_list(transform):
            self._net[t.child_frame_id] = t
        self._pub.publish(self._TF(transforms=list(self._net.values())))

    send_transform = sendTransform


# ---------------------------------------------------------------- 수학
def _qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return (aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx,
            aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz)


def _qinv(q):
    return (-q[0], -q[1], -q[2], q[3])


def _rot(q, v):
    p = _qmul(_qmul(q, (v[0], v[1], v[2], 0.0)), _qinv(q))
    return (p[0], p[1], p[2])


def _tmul(A, B):
    r = _rot(A[1], B[0])
    return ((A[0][0] + r[0], A[0][1] + r[1], A[0][2] + r[2]), _qmul(A[1], B[1]))


def _tinv(A):
    qi = _qinv(A[1])
    r = _rot(qi, A[0])
    return ((-r[0], -r[1], -r[2]), qi)


class Buffer:
    def __init__(self, cache_time=None, node=None):
        self._f = {}   # child → (parent, T)

    def _set(self, ts, static=False):
        c = ts.child_frame_id.lstrip('/')
        p = ts.header.frame_id.lstrip('/')
        tr = ts.transform
        self._f[c] = (p, ((tr.translation.x, tr.translation.y, tr.translation.z),
                          (tr.rotation.x, tr.rotation.y, tr.rotation.z, tr.rotation.w)))

    def set_transform(self, ts, authority):
        self._set(ts)

    def set_transform_static(self, ts, authority):
        self._set(ts, True)

    def _has(self, f):
        return f in self._f or any(p == f for p, _ in self._f.values())

    def _to_root(self, f):
        T = ((0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0))
        n = 0
        while f in self._f and n < 64:
            p, tf = self._f[f]
            T = _tmul(tf, T)
            f = p
            n += 1
        return f, T

    def _lookup(self, target, source):
        target, source = target.lstrip('/'), source.lstrip('/')
        if not self._has(target):
            raise LookupException(f'"{target}" passed to lookupTransform argument target_frame does not exist. ')
        if not self._has(source):
            raise LookupException(f'"{source}" passed to lookupTransform argument source_frame does not exist. ')
        ra, A = self._to_root(target)
        rb, B = self._to_root(source)
        if ra != rb:
            raise ConnectivityException(f"Could not find a connection between '{target}' and '{source}' because they are not part of the same tree.Tf has two or more unconnected trees.")
        return _tmul(_tinv(A), B)

    def lookup_transform(self, target_frame, source_frame, time=None, timeout=None):
        from geometry_msgs.msg import TransformStamped
        (t, q) = self._lookup(target_frame, source_frame)
        ts = TransformStamped()
        ts.header.frame_id = target_frame
        ts.child_frame_id = source_frame
        ts.transform.translation.x, ts.transform.translation.y, ts.transform.translation.z = float(t[0]), float(t[1]), float(t[2])
        ts.transform.rotation.x, ts.transform.rotation.y, ts.transform.rotation.z, ts.transform.rotation.w = (float(v) for v in q)
        return ts

    def can_transform(self, target_frame, source_frame, time=None, timeout=None, return_debug_tuple=False):
        try:
            self._lookup(target_frame, source_frame)
            return True
        except TransformException:
            return False

    def all_frames_as_string(self):
        return '\n'.join(f'Frame {c} exists with parent {p}.' for c, (p, _) in self._f.items())

    def all_frames_as_yaml(self):
        return '\n'.join(f"{c}: \n  parent: '{p}'" for c, (p, _) in self._f.items())


class TransformListener:
    def __init__(self, buffer, node, *, spin_thread=False, qos=None, static_qos=None):
        from tf2_msgs.msg import TFMessage
        self.buffer = buffer
        sq = static_qos or QoSProfile(depth=100, durability=DurabilityPolicy.TRANSIENT_LOCAL)
        node.create_subscription(TFMessage, '/tf', self._cb, qos or 100)
        node.create_subscription(TFMessage, '/tf_static', self._cb_static, sq)

    def _cb(self, msg):
        for t in msg.transforms:
            self.buffer._set(t)

    def _cb_static(self, msg):
        for t in msg.transforms:
            self.buffer._set(t, True)

    def unregister(self):
        pass


from . import buffer, transform_listener, transform_broadcaster, static_transform_broadcaster  # noqa: E402,F401
