"""rclpy (브라우저 WebROS 호환판). 실제 rclpy 와 같은 이름으로 씁니다."""

import webros_rt as _RT
from webros_rt import S as _S, post as _post
from . import _impl
from ._impl import Node as _Node, get_logger as _get_logger, RCLError as _RCLError


def init(*, args=None, context=None, domain_id=None, signal_handler_options=None):
    if _S.ok:
        raise RuntimeError("Context.init() must only be called once")
    _S.ok = True
    _post("init")


def ok(*, context=None):
    return _S.ok and not _S.cancelled


def shutdown(*, context=None, uninstall_handlers=None):
    if not _S.ok:
        raise RuntimeError("Context must be initialized before it can be shutdown")
    _impl._teardown()
    _post("shutdown")


def try_shutdown(*, context=None, uninstall_handlers=None):
    if _S.ok:
        shutdown()


def create_node(node_name, **kw):
    return _Node(node_name, **kw)


def spin(node=None, executor=None):
    if not _S.ok:
        raise RuntimeError("rclpy.init() 을 먼저 불러야 합니다")
    return _RT.block_until(lambda: not _S.ok, None)


def spin_once(node=None, *, executor=None, timeout_sec=None):
    import time as _t
    t = 0.1 if timeout_sec is None else max(0.0, float(timeout_sec))
    end = _t.monotonic() + t
    if _RT.MODE == "jspi":
        _RT.process_sync(int(t * 1000))
        return None

    async def _a():
        await _RT.process_async(int(t * 1000))
    return _a()


def spin_until_future_complete(node, future, executor=None, timeout_sec=None):
    return _RT.block_until(future.done, timeout_sec)


def get_global_executor():
    from .executors import SingleThreadedExecutor
    return SingleThreadedExecutor()


def get_default_context():
    return None


from . import logging  # noqa: E402
from . import qos, node, parameter, executors, callback_groups, time, duration, clock, task, exceptions, publisher, subscription, timer, action, utilities  # noqa: E402,F401
