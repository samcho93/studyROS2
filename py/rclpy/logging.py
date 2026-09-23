from ._impl import get_logger, RcutilsLogger  # noqa: F401


class LoggingSeverity:
    UNSET = 0
    DEBUG = 10
    INFO = 20
    WARN = 30
    ERROR = 40
    FATAL = 50


def set_logger_level(name, level):
    return True
