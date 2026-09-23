"""rclpy.parameter.Parameter"""
from enum import IntEnum


class Parameter:
    class Type(IntEnum):
        NOT_SET = 0
        BOOL = 1
        INTEGER = 2
        DOUBLE = 3
        STRING = 4
        BYTE_ARRAY = 5
        BOOL_ARRAY = 6
        INTEGER_ARRAY = 7
        DOUBLE_ARRAY = 8
        STRING_ARRAY = 9

        @classmethod
        def from_parameter_value(cls, v):
            if v is None:
                return cls.NOT_SET
            if isinstance(v, bool):
                return cls.BOOL
            if isinstance(v, int):
                return cls.INTEGER
            if isinstance(v, float):
                return cls.DOUBLE
            if isinstance(v, str):
                return cls.STRING
            if isinstance(v, (list, tuple)):
                if not v:
                    return cls.STRING_ARRAY
                e = v[0]
                if isinstance(e, bool):
                    return cls.BOOL_ARRAY
                if isinstance(e, int):
                    return cls.INTEGER_ARRAY
                if isinstance(e, float):
                    return cls.DOUBLE_ARRAY
                if isinstance(e, str):
                    return cls.STRING_ARRAY
                if isinstance(e, bytes):
                    return cls.BYTE_ARRAY
            raise TypeError(f"The given value is not one of the allowed types '{v}'.")

        def check(self, v):
            return self == Parameter.Type.from_parameter_value(v) or self == Parameter.Type.NOT_SET

    def __init__(self, name, type_=None, value=None):
        if type_ is None:
            type_ = Parameter.Type.from_parameter_value(value)
        elif not isinstance(type_, Parameter.Type):
            # Parameter(name, value) 처럼 부른 경우
            value, type_ = type_, Parameter.Type.from_parameter_value(type_)
        if type_ == Parameter.Type.DOUBLE and isinstance(value, int) and not isinstance(value, bool):
            value = float(value)
        if value is not None and not type_.check(value):
            raise ValueError(f"Type mismatch: {type_.name} 인데 값이 {value!r} 입니다")
        self._name = name
        self._type_ = type_
        self._value = value

    @property
    def name(self):
        return self._name

    @property
    def type_(self):
        return self._type_

    @property
    def value(self):
        return self._value

    def get_parameter_value(self):
        from ._impl import _PV
        return _PV(self)

    def _ptype_name(self):
        return {0: "not set", 1: "bool", 2: "integer", 3: "double", 4: "string", 5: "byte_array", 6: "bool_array",
                7: "integer_array", 8: "double_array", 9: "string_array"}[int(self._type_)]

    def __repr__(self):
        return f"Parameter(name={self._name!r}, type={self._type_.name}, value={self._value!r})"


def parameter_value_to_python(pv):
    for k in ("bool_value", "integer_value", "double_value", "string_value"):
        if getattr(pv, k, None):
            return getattr(pv, k)
    return None
