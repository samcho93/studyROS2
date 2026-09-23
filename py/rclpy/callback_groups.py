class CallbackGroup:
    pass


class MutuallyExclusiveCallbackGroup(CallbackGroup):
    """브라우저 실습 환경에서는 모든 콜백이 한 줄로 실행됩니다."""


class ReentrantCallbackGroup(CallbackGroup):
    """브라우저 실습 환경에서는 모든 콜백이 한 줄로 실행됩니다."""
