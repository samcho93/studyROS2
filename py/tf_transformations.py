"""tf_transformations 의 자주 쓰는 함수 (numpy 없이)."""
import math


def quaternion_from_euler(ai, aj, ak, axes='sxyz'):
    cr, sr = math.cos(ai / 2), math.sin(ai / 2)
    cp, sp = math.cos(aj / 2), math.sin(aj / 2)
    cy, sy = math.cos(ak / 2), math.sin(ak / 2)
    return [sr * cp * cy - cr * sp * sy, cr * sp * cy + sr * cp * sy, cr * cp * sy - sr * sp * cy, cr * cp * cy + sr * sp * sy]


def euler_from_quaternion(q, axes='sxyz'):
    x, y, z, w = q
    r = math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y))
    s = 2 * (w * y - z * x)
    p = math.copysign(math.pi / 2, s) if abs(s) >= 1 else math.asin(s)
    yy = math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z))
    return (r, p, yy)


def quaternion_multiply(a, b):
    x1, y1, z1, w1 = a
    x2, y2, z2, w2 = b
    return [w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2, w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
            w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2, w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2]


def quaternion_inverse(q):
    x, y, z, w = q
    n = x * x + y * y + z * z + w * w
    return [-x / n, -y / n, -z / n, w / n]
