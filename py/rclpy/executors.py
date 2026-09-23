import webros_rt as _RT
from webros_rt import S as _S


class ExternalShutdownException(Exception):
    pass


class Executor:
    """브라우저 실습 환경: 모든 노드의 콜백을 한 스레드에서 처리합니다."""

    def __init__(self, *, context=None, num_threads=None):
        self._nodes = []

    def add_node(self, node):
        if node not in self._nodes:
            self._nodes.append(node)
        return True

    def remove_node(self, node):
        if node in self._nodes:
            self._nodes.remove(node)

    def get_nodes(self):
        return list(self._nodes)

    def spin(self):
        return _RT.block_until(lambda: not _S.ok, None)

    def spin_once(self, timeout_sec=None):
        import rclpy
        return rclpy.spin_once(None, timeout_sec=timeout_sec)

    def spin_until_future_complete(self, future, timeout_sec=None):
        return _RT.block_until(future.done, timeout_sec)

    def shutdown(self, timeout_sec=None):
        return True


class SingleThreadedExecutor(Executor):
    pass


class MultiThreadedExecutor(Executor):
    pass


class StaticSingleThreadedExecutor(Executor):
    pass
