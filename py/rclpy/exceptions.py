class ParameterException(Exception):
    pass


class ParameterNotDeclaredException(ParameterException):
    def __init__(self, name):
        super().__init__(f"Invalid access to undeclared parameter(s): {name}")


class ParameterAlreadyDeclaredException(ParameterException):
    def __init__(self, names):
        super().__init__(f"Parameter(s) already declared: {names}")


class InvalidParameterTypeException(ParameterException):
    pass


class InvalidParameterValueException(ParameterException):
    pass


class ParameterUninitializedException(ParameterException):
    pass


class ROSInterruptException(Exception):
    pass


class InvalidHandle(Exception):
    pass
