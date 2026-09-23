"""rclpy 호환 구현 (브라우저 WebROS 용).

실제 rclpy 와 같은 이름 · 같은 사용법을 목표로 합니다. 차이점:
  * 실행기는 하나의 스레드에서 돕니다 (MultiThreadedExecutor 도 한 스레드처럼 동작).
  * rclpy.spin() 이 도는 동안에만 타이머 · 구독 콜백이 불립니다 (실제와 같음).
"""

from __future__ import annotations

import json
import math
import time as _time

import webros_rt as RT
from webros_rt import post, next_id, S


# ======================================================================== 공통
class RCLError(RuntimeError):
    pass


class _Ctx:
    nodes = {}
    subs = {}
    srvs = {}
    clients = {}
    futures = {}
    aservers = {}
    agoals = {}      # 서버 쪽 goal
    aclients = {}
    cgoals = {}      # 클라이언트 쪽 goal
    loggers_once = set()
    throttle = {}


C = _Ctx


def _reset():
    C.nodes = {}
    C.subs = {}
    C.srvs = {}
    C.clients = {}
    C.futures = {}
    C.aservers = {}
    C.agoals = {}
    C.aclients = {}
    C.cgoals = {}
    C.loggers_once = set()
    C.throttle = {}
    S.handlers.update({
        "msg": _on_msg, "srv_req": _on_srv_req, "cli_res": _on_cli_res,
        "as_goal": _on_as_goal, "as_cancel": _on_as_cancel,
        "ac_accept": _on_ac_accept, "ac_fb": _on_ac_fb, "ac_result": _on_ac_result, "ac_cancel_res": _on_ac_cancel_res,
        "param_set": _on_param_set,
    })


def _teardown():
    for n in list(C.nodes.values()):
        try:
            n.destroy_node()
        except Exception:
            pass
    S.timers.clear()
    S.ok = False


# ======================================================================== Future
class Future:
    def __init__(self):
        self._done = False
        self._result = None
        self._exc = None
        self._cbs = []
        self._cancelled = False

    def done(self):
        return self._done

    def cancelled(self):
        return self._cancelled

    def result(self):
        if self._exc:
            raise self._exc
        return self._result

    def exception(self):
        return self._exc

    def set_result(self, r):
        self._result = r
        self._done = True
        self._run_cbs()

    def set_exception(self, e):
        self._exc = e
        self._done = True
        self._run_cbs()

    def cancel(self):
        if not self._done:
            self._cancelled = True
            self._done = True
            self._run_cbs()

    def add_done_callback(self, cb):
        if self._done:
            _call_later(cb, self)
        else:
            self._cbs.append(cb)

    def _run_cbs(self):
        cbs, self._cbs = self._cbs, []
        for cb in cbs:
            _call_later(cb, self)

    def __await__(self):
        while not self._done:
            yield
        return self.result()


_later = []


def _call_later(cb, *a):
    """콜백은 이벤트 처리 흐름 안에서 바로 부른다 (코루틴이면 기다림)."""
    r = cb(*a)
    if RT.inspect.isawaitable(r):
        if RT.MODE == "jspi":
            RT.drive(RT._aw(r)) if RT.inspect.iscoroutine(r) else None
        else:
            import asyncio
            asyncio.ensure_future(r)


# ======================================================================== 시간
class Duration:
    def __init__(self, *, seconds=0, nanoseconds=0):
        self.nanoseconds = int(seconds * 1e9) + int(nanoseconds)

    def to_msg(self):
        from builtin_interfaces.msg import Duration as D
        return D(sec=self.nanoseconds // 10**9, nanosec=self.nanoseconds % 10**9)

    @classmethod
    def from_msg(cls, m):
        return cls(seconds=m.sec, nanoseconds=m.nanosec)

    def __repr__(self):
        return f"Duration(nanoseconds={self.nanoseconds})"

    def __eq__(self, o):
        return isinstance(o, Duration) and o.nanoseconds == self.nanoseconds

    def __lt__(self, o):
        return self.nanoseconds < o.nanoseconds

    def __gt__(self, o):
        return self.nanoseconds > o.nanoseconds

    def __add__(self, o):
        return Duration(nanoseconds=self.nanoseconds + o.nanoseconds)

    def __sub__(self, o):
        return Duration(nanoseconds=self.nanoseconds - o.nanoseconds)


class Time:
    def __init__(self, *, seconds=0, nanoseconds=0, clock_type=None):
        self.nanoseconds = int(seconds * 1e9) + int(nanoseconds)
        self.clock_type = clock_type

    def to_msg(self):
        from builtin_interfaces.msg import Time as Tm
        return Tm(sec=self.nanoseconds // 10**9, nanosec=self.nanoseconds % 10**9)

    @classmethod
    def from_msg(cls, m, clock_type=None):
        return cls(seconds=m.sec, nanoseconds=m.nanosec)

    def seconds_nanoseconds(self):
        return (self.nanoseconds // 10**9, self.nanoseconds % 10**9)

    def __sub__(self, o):
        if isinstance(o, Time):
            return Duration(nanoseconds=self.nanoseconds - o.nanoseconds)
        return Time(nanoseconds=self.nanoseconds - o.nanoseconds)

    def __add__(self, o):
        return Time(nanoseconds=self.nanoseconds + o.nanoseconds)

    def __lt__(self, o):
        return self.nanoseconds < o.nanoseconds

    def __gt__(self, o):
        return self.nanoseconds > o.nanoseconds

    def __eq__(self, o):
        return isinstance(o, Time) and o.nanoseconds == self.nanoseconds

    def __repr__(self):
        return f"Time(nanoseconds={self.nanoseconds}, clock_type=ROS_TIME)"


class Clock:
    def now(self):
        return Time(nanoseconds=int(RT.T.now() * 1e9))

    def sleep_for(self, rel):
        _time.sleep(rel.nanoseconds / 1e9)
        return True


# ======================================================================== 로거
class RcutilsLogger:
    def __init__(self, name):
        self.name = name
        self._nid = None

    def get_child(self, suffix):
        return RcutilsLogger(self.name + "." + suffix)

    def _log(self, level, msg, once=False, throttle_duration_sec=None, skip_first=False, **_):
        key = (self.name, level, str(msg)) if once else None
        if once:
            if key in C.loggers_once:
                return True
            C.loggers_once.add(key)
        if throttle_duration_sec:
            k = (self.name, level, "throttle")
            last = C.throttle.get(k)
            now = _time.monotonic()
            if last is not None and now - last < throttle_duration_sec:
                return False
            C.throttle[k] = now
        post("log", nid=self._nid, name=self.name, level=level, msg=str(msg))
        return True

    def debug(self, msg, **kw):
        return self._log("DEBUG", msg, **kw)

    def info(self, msg, **kw):
        return self._log("INFO", msg, **kw)

    def warning(self, msg, **kw):
        return self._log("WARN", msg, **kw)

    warn = warning

    def error(self, msg, **kw):
        return self._log("ERROR", msg, **kw)

    def fatal(self, msg, **kw):
        return self._log("FATAL", msg, **kw)

    def set_level(self, level):
        return True


def get_logger(name):
    return RcutilsLogger(name)


# ======================================================================== QoS
def _qos_json(q):
    from .qos import QoSProfile
    if q is None:
        return {"depth": 10}
    if isinstance(q, int):
        return {"depth": q}
    if isinstance(q, QoSProfile):
        return q._to_json()
    return {"depth": 10}


# ======================================================================== 파라미터
class _PV:
    def __init__(self, p):
        v = p.value
        self.type = int(p.type_)
        self.bool_value = v if isinstance(v, bool) else False
        self.integer_value = v if isinstance(v, int) and not isinstance(v, bool) else 0
        self.double_value = float(v) if isinstance(v, float) else 0.0
        self.string_value = v if isinstance(v, str) else ""
        self.bool_array_value = v if isinstance(v, list) and v and isinstance(v[0], bool) else []
        self.integer_array_value = v if isinstance(v, list) and v and isinstance(v[0], int) and not isinstance(v[0], bool) else []
        self.double_array_value = v if isinstance(v, list) and v and isinstance(v[0], float) else []
        self.string_array_value = v if isinstance(v, list) and v and isinstance(v[0], str) else []
        self.byte_array_value = []


# ======================================================================== 노드
class Node:
    def __init__(self, node_name, *, context=None, cli_args=None, namespace=None, use_global_arguments=True,
                 enable_rosout=True, start_parameter_services=True, parameter_overrides=None,
                 allow_undeclared_parameters=False, automatically_declare_parameters_from_overrides=False, **_):
        if not S.ok:
            raise RCLError("rclpy.init() 을 먼저 불러야 합니다 (failed to create node: the given context is not valid)")
        ra = S.ros_args
        self._name = ra.get("name") or node_name
        ns = ra.get("ns") or namespace or "/"
        if not ns.startswith("/"):
            ns = "/" + ns
        self._ns = ns
        self._id = next_id()
        self._params = {}
        self._param_cbs = []
        self._post_set_cbs = []
        self._pubs = []
        self._subs = []
        self._timers = []
        self._srvs = []
        self._clis = []
        self._destroyed = False
        self._overrides = {}
        for p in (parameter_overrides or []):
            self._overrides[p.name] = p.value
        self._overrides.update(ra.get("params") or {})
        self._allow_undeclared = allow_undeclared_parameters
        self._logger = RcutilsLogger(((self._ns.strip("/") + ".") if self._ns != "/" else "") + self._name)
        self._logger._nid = self._id
        self._clock = Clock()
        C.nodes[self._id] = self
        post("node", nid=self._id, name=self._name, ns=self._ns, remap=ra.get("remap") or {})
        from .parameter import Parameter
        self.declare_parameter("use_sim_time", False)
        if automatically_declare_parameters_from_overrides:
            for k, v in self._overrides.items():
                if k not in self._params:
                    self.declare_parameter(k, v)

    # --------------------------------------------------------- 정보
    def get_name(self):
        return self._name

    def get_namespace(self):
        return self._ns

    def get_fully_qualified_name(self):
        return (self._ns.rstrip("/") + "/" + self._name)

    def get_logger(self):
        return self._logger

    def get_clock(self):
        return self._clock

    @property
    def executor(self):
        return None

    def count_publishers(self, topic):
        t = self._resolve(topic)
        return sum(x[2] for x in S.graph.get("topics", []) if x[0] == t)

    def count_subscribers(self, topic):
        t = self._resolve(topic)
        return sum(x[3] for x in S.graph.get("topics", []) if x[0] == t)

    def get_topic_names_and_types(self, no_demangle=False):
        return [(x[0], [x[1]]) for x in S.graph.get("topics", []) if x[1]]

    def get_service_names_and_types(self):
        return [(x[0], [x[1]]) for x in S.graph.get("services", [])]

    def get_node_names(self):
        return [n.rsplit("/", 1)[-1] for n in S.graph.get("nodes", [])]

    def get_node_names_and_namespaces(self):
        out = []
        for n in S.graph.get("nodes", []):
            ns, _, nm = n.rpartition("/")
            out.append((nm, ns or "/"))
        return out

    def _resolve(self, name):
        if name.startswith("/"):
            return name
        if name.startswith("~"):
            return self.get_fully_qualified_name() + "/" + name.lstrip("~/")
        return (self._ns.rstrip("/") + "/" + name)

    # --------------------------------------------------------- 토픽
    def create_publisher(self, msg_type, topic, qos_profile, *, callback_group=None, event_callbacks=None, **_):
        p = Publisher(self, msg_type, topic, qos_profile)
        self._pubs.append(p)
        return p

    def create_subscription(self, msg_type, topic, callback, qos_profile, *, callback_group=None, event_callbacks=None, raw=False, **_):
        s = Subscription(self, msg_type, topic, callback, qos_profile)
        self._subs.append(s)
        return s

    def create_timer(self, timer_period_sec, callback, callback_group=None, clock=None, autostart=True):
        t = Timer(callback, timer_period_sec)
        self._timers.append(t)
        S.timers.append(t)
        return t

    def create_rate(self, frequency, clock=None):
        return Rate(frequency)

    def create_service(self, srv_type, srv_name, callback, *, qos_profile=None, callback_group=None):
        s = Service(self, srv_type, srv_name, callback)
        self._srvs.append(s)
        return s

    def create_client(self, srv_type, srv_name, *, qos_profile=None, callback_group=None):
        c = Client(self, srv_type, srv_name)
        self._clis.append(c)
        return c

    def create_guard_condition(self, callback, callback_group=None):
        return None

    def destroy_publisher(self, p):
        p.destroy()
        return True

    def destroy_subscription(self, s):
        s.destroy()
        return True

    def destroy_timer(self, t):
        t.destroy()
        return True

    def destroy_service(self, s):
        s.destroy()
        return True

    def destroy_client(self, c):
        c.destroy()
        return True

    def destroy_node(self):
        if self._destroyed:
            return
        self._destroyed = True
        for t in self._timers:
            t.destroy()
        C.nodes.pop(self._id, None)
        post("node_destroy", nid=self._id)

    # --------------------------------------------------------- 파라미터
    def declare_parameter(self, name, value=None, descriptor=None, ignore_override=False):
        from .parameter import Parameter
        from .exceptions import ParameterAlreadyDeclaredException
        if name in self._params:
            raise ParameterAlreadyDeclaredException([name])
        if isinstance(value, Parameter.Type):
            ptype, value = value, None
        else:
            ptype = Parameter.Type.from_parameter_value(value)
        if not ignore_override and name in self._overrides:
            value = self._overrides[name]
            if ptype == Parameter.Type.DOUBLE and isinstance(value, int) and not isinstance(value, bool):
                value = float(value)
            ptype = Parameter.Type.from_parameter_value(value) if value is not None else ptype
        p = Parameter(name, ptype if value is None else Parameter.Type.from_parameter_value(value), value)
        self._params[name] = [p, descriptor]
        desc = {}
        if descriptor is not None:
            desc = {"description": getattr(descriptor, "description", ""), "read_only": bool(getattr(descriptor, "read_only", False))}
        post("param_decl", nid=self._id, name=name, value=value, type=p._ptype_name(), desc=desc)
        return p

    def declare_parameters(self, namespace, parameters, ignore_override=False):
        out = []
        for item in parameters:
            name = item[0]
            full = f"{namespace}.{name}" if namespace else name
            val = item[1] if len(item) > 1 else None
            desc = item[2] if len(item) > 2 else None
            out.append(self.declare_parameter(full, val, desc, ignore_override))
        return out

    def undeclare_parameter(self, name):
        self._params.pop(name, None)

    def has_parameter(self, name):
        return name in self._params

    def get_parameter(self, name):
        from .exceptions import ParameterNotDeclaredException
        from .parameter import Parameter
        if name not in self._params:
            if self._allow_undeclared:
                return Parameter(name, Parameter.Type.NOT_SET, None)
            raise ParameterNotDeclaredException(name)
        return self._params[name][0]

    def get_parameter_or(self, name, alternative_value=None):
        return self._params[name][0] if name in self._params else alternative_value

    def get_parameters(self, names):
        return [self.get_parameter(n) for n in names]

    def get_parameters_by_prefix(self, prefix):
        return {k[len(prefix) + 1:]: v[0] for k, v in self._params.items() if k.startswith(prefix + ".")}

    def describe_parameter(self, name):
        return self._params[name][1]

    def set_parameters(self, parameter_list):
        return [self._set_one(p) for p in parameter_list]

    def set_parameters_atomically(self, parameter_list):
        rs = self.set_parameters(parameter_list)
        return rs[-1] if rs else None

    def _set_one(self, p, notify=True):
        from rcl_interfaces.msg import SetParametersResult
        from .parameter import Parameter
        if p.name not in self._params and not self._allow_undeclared:
            return SetParametersResult(successful=False, reason=f"parameter '{p.name}' is not declared")
        old = self._params.get(p.name, [None, None])[0]
        desc = self._params.get(p.name, [None, None])[1]
        if desc is not None and getattr(desc, "read_only", False):
            return SetParametersResult(successful=False, reason=f"Trying to set a read-only parameter: {p.name}.")
        if old is not None and old.type_ not in (Parameter.Type.NOT_SET,) and p.type_ != old.type_ and not (desc is not None and getattr(desc, "dynamic_typing", False)):
            return SetParametersResult(successful=False, reason=f"Wrong parameter type, parameter {{{p.name}}} is of type {{{old._ptype_name()}}}, setting it to {{{p._ptype_name()}}} is not allowed.")
        for cb in self._param_cbs:
            r = cb([p])
            if RT.inspect.iscoroutine(r):
                r = RT.drive(RT._aw(r)) if RT.MODE == "jspi" else None
            if r is not None and not r.successful:
                return r
        self._params[p.name] = [p, desc]
        for cb in self._post_set_cbs:
            cb([p])
        if notify:
            post("param_set", nid=self._id, name=p.name, value=p.value, type=p._ptype_name())
        return SetParametersResult(successful=True, reason="")

    def add_on_set_parameters_callback(self, callback):
        self._param_cbs.insert(0, callback)
        return callback

    def remove_on_set_parameters_callback(self, callback):
        if callback in self._param_cbs:
            self._param_cbs.remove(callback)

    def add_post_set_parameters_callback(self, callback):
        self._post_set_cbs.append(callback)
        return callback

    def add_pre_set_parameters_callback(self, callback):
        return callback


# ======================================================================== 엔드포인트
class Publisher:
    def __init__(self, node, msg_type, topic, qos):
        self._node = node
        self.msg_type = msg_type
        self._t = RT.type_name(msg_type)
        self.topic_name = node._resolve(topic)
        self._id = next_id()
        self._dead = False
        post("pub_create", pid=self._id, nid=node._id, topic=topic, type=self._t, qos=_qos_json(qos))

    @property
    def topic(self):
        return self.topic_name

    def publish(self, msg):
        if self._dead:
            raise RCLError("publisher is destroyed")
        if not isinstance(msg, self.msg_type):
            raise TypeError(f"Expected {self.msg_type._pyfull}, got {type(msg).__module__}.{type(msg).__name__}" if hasattr(self.msg_type, "_pyfull") else "wrong message type")
        post("pub", pid=self._id, msg=msg._to_plain())

    def get_subscription_count(self):
        return self._node.count_subscribers(self.topic_name)

    def destroy(self):
        if not self._dead:
            self._dead = True
            post("ep_destroy", kind="pub", id=self._id)


class Subscription:
    def __init__(self, node, msg_type, topic, callback, qos):
        self._node = node
        self.msg_type = msg_type
        self._t = RT.type_name(msg_type)
        self.topic_name = node._resolve(topic)
        self.callback = callback
        self._id = next_id()
        C.subs[self._id] = self
        post("sub_create", sid=self._id, nid=node._id, topic=topic, type=self._t, qos=_qos_json(qos))

    def destroy(self):
        if C.subs.pop(self._id, None):
            post("ep_destroy", kind="sub", id=self._id)


def _on_msg(ev):
    s = C.subs.get(ev["sid"])
    if s is None or s._node._destroyed:
        return None
    m = s.msg_type._from_plain(ev["msg"])
    return RT._aw(s.callback(m))


class Timer:
    def __init__(self, callback, period):
        self.callback = callback
        self.timer_period_ns = int(period * 1e9)
        self._period = float(period)
        self.canceled = False
        self.next_at = _time.monotonic() + self._period
        self._running = False

    def _due(self, now):
        return not self.canceled and not self._running and now >= self.next_at

    async def _fire(self):
        self._running = True
        self.next_at += self._period
        if self.next_at < _time.monotonic():
            self.next_at = _time.monotonic() + self._period
        try:
            await RT._aw(self.callback())
        finally:
            self._running = False

    def cancel(self):
        self.canceled = True

    def reset(self):
        self.canceled = False
        self.next_at = _time.monotonic() + self._period

    def is_canceled(self):
        return self.canceled

    def is_ready(self):
        return self._due(_time.monotonic())

    def time_until_next_call(self):
        return int(max(0, self.next_at - _time.monotonic()) * 1e9)

    def destroy(self):
        self.canceled = True
        if self in S.timers:
            S.timers.remove(self)


class Rate:
    def __init__(self, hz):
        self._p = 1.0 / hz

    def sleep(self):
        return _time.sleep(self._p)

    def destroy(self):
        pass


class Service:
    def __init__(self, node, srv_type, name, cb):
        self._node = node
        self.srv_type = srv_type
        self._t = RT.type_name(srv_type)
        self.srv_name = node._resolve(name)
        self.callback = cb
        self._id = next_id()
        C.srvs[self._id] = self
        post("srv_create", ssid=self._id, nid=node._id, name=name, type=self._t)

    def destroy(self):
        if C.srvs.pop(self._id, None):
            post("ep_destroy", kind="srv", id=self._id)


async def _on_srv_req(ev):
    s = C.srvs.get(ev["ssid"])
    if s is None:
        return
    req = s.srv_type.Request._from_plain(ev["req"])
    res = s.srv_type.Response()
    try:
        r = await RT._aw(s.callback(req, res))
        if r is None:
            s._node.get_logger().error("서비스 콜백이 response 를 return 하지 않았습니다 (return response 를 잊었나요?)")
            post("srv_resp", rid=ev["rid"], error="service callback returned None")
            return
        post("srv_resp", rid=ev["rid"], res=r._to_plain())
    except KeyboardInterrupt:
        raise
    except Exception as e:  # noqa: BLE001
        import traceback
        RT.sys.stderr.write(traceback.format_exc())
        post("srv_resp", rid=ev["rid"], error=str(e))


class Client:
    def __init__(self, node, srv_type, name):
        self._node = node
        self.srv_type = srv_type
        self._t = RT.type_name(srv_type)
        self.srv_name = node._resolve(name)
        self._id = next_id()
        post("cli_create", cid=self._id, nid=node._id, name=name, type=self._t)

    def service_is_ready(self):
        return any(x[0] == self.srv_name for x in S.graph.get("services", []))

    def wait_for_service(self, timeout_sec=None):
        return RT.block_until(self.service_is_ready, timeout_sec)

    def call_async(self, request):
        if not isinstance(request, self.srv_type.Request):
            raise TypeError(f"Request must be instance of {self.srv_type.Request.__name__}")
        f = Future()
        rid = next_id()
        C.futures[rid] = (f, self)
        post("cli_call", rid=rid, cid=self._id, nid=self._node._id, name=self.srv_name, type=self._t, req=request._to_plain())
        return f

    def call(self, request, timeout_sec=None):
        f = self.call_async(request)
        r = RT.block_until(f.done, timeout_sec)
        if RT.MODE == "jspi":
            return f.result() if f.done() else None

        async def _a():
            await r
            return f.result() if f.done() else None
        return _a()

    def remove_pending_request(self, future):
        for k, (f, _) in list(C.futures.items()):
            if f is future:
                del C.futures[k]

    def destroy(self):
        post("ep_destroy", kind="cli", id=self._id)


def _on_cli_res(ev):
    ent = C.futures.pop(ev["rid"], None)
    if not ent:
        return
    f, cli = ent
    if ev.get("error"):
        f.set_exception(RCLError(ev["error"]))
    else:
        f.set_result(cli.srv_type.Response._from_plain(ev.get("res")))


# ======================================================================== 액션 (서버)
class GoalResponse:
    REJECT = 1
    ACCEPT = 2


class CancelResponse:
    REJECT = 1
    ACCEPT = 2


class GoalStatus:
    STATUS_UNKNOWN = 0
    STATUS_ACCEPTED = 1
    STATUS_EXECUTING = 2
    STATUS_CANCELING = 3
    STATUS_SUCCEEDED = 4
    STATUS_CANCELED = 5
    STATUS_ABORTED = 6


class _GoalId:
    def __init__(self, s):
        self.uuid = [int(s[i:i + 2], 16) for i in range(0, 32, 2)] if s and len(s.replace("-", "")) == 32 else [0] * 16


class ServerGoalHandle:
    def __init__(self, server, gid, request, goal_id):
        self._server = server
        self._gid = gid
        self.request = request
        self.goal_id = _GoalId(goal_id.replace("-", "") if goal_id else "")
        self._status = GoalStatus.STATUS_ACCEPTED
        self._cancel_req = False

    @property
    def status(self):
        return self._status

    @property
    def is_active(self):
        return self._status in (1, 2, 3)

    @property
    def is_cancel_requested(self):
        RT.take_cancels()
        return self._cancel_req

    def execute(self, execute_callback=None):
        self._status = GoalStatus.STATUS_EXECUTING

    def publish_feedback(self, feedback):
        if not isinstance(feedback, self._server.action_type.Feedback):
            raise TypeError("feedback 는 Feedback 메시지여야 합니다")
        post("as_fb", gid=self._gid, fb=feedback._to_plain())

    def succeed(self):
        self._status = GoalStatus.STATUS_SUCCEEDED

    def abort(self):
        self._status = GoalStatus.STATUS_ABORTED

    def canceled(self):
        self._status = GoalStatus.STATUS_CANCELED

    def destroy(self):
        pass


class ActionServer:
    def __init__(self, node, action_type, action_name, execute_callback, *, callback_group=None,
                 goal_callback=None, handle_accepted_callback=None, cancel_callback=None, **_):
        self._node = node
        self.action_type = action_type
        self._t = RT.type_name(action_type)
        self._exec = execute_callback
        self._goal_cb = goal_callback
        self._cancel_cb = cancel_callback
        self._accepted_cb = handle_accepted_callback
        self._id = next_id()
        C.aservers[self._id] = self
        post("as_create", asid=self._id, nid=node._id, name=action_name, type=self._t)

    def register_execute_callback(self, cb):
        self._exec = cb

    def destroy(self):
        if C.aservers.pop(self._id, None):
            post("ep_destroy", kind="as", id=self._id)


async def _on_as_goal(ev):
    srv = C.aservers.get(ev["asid"])
    if srv is None:
        return
    req = srv.action_type.Goal._from_plain(ev["goal"])
    if srv._goal_cb is not None:
        resp = await RT._aw(srv._goal_cb(req))
        if resp == GoalResponse.REJECT:
            post("as_done", gid=ev["gid"], status=GoalStatus.STATUS_ABORTED, result=None, rejected=True)
            return
    gh = ServerGoalHandle(srv, ev["gid"], req, ev.get("goal_id", ""))
    C.agoals[ev["gid"]] = gh
    gh.execute()
    status = GoalStatus.STATUS_ABORTED
    result = None
    try:
        r = await RT._aw(srv._exec(gh))
        result = r._to_plain() if r is not None else None
        if gh._status in (1, 2, 3):
            srv._node.get_logger().warning("Goal state not set, assuming aborted. Goal ID: " + ev.get("goal_id", ""))
            gh._status = GoalStatus.STATUS_ABORTED
        status = gh._status
    except KeyboardInterrupt:
        raise
    except Exception:  # noqa: BLE001
        import traceback
        RT.sys.stderr.write(traceback.format_exc())
    finally:
        C.agoals.pop(ev["gid"], None)
        post("as_done", gid=ev["gid"], status=status, result=result)


def _on_as_cancel(ev):
    gh = C.agoals.get(ev["gid"])
    if gh is None:
        return
    srv = gh._server
    ok = True
    if srv._cancel_cb is not None:
        r = srv._cancel_cb(gh)
        ok = r != CancelResponse.REJECT
    if ok:
        gh._cancel_req = True
        gh._status = GoalStatus.STATUS_CANCELING


# ======================================================================== 액션 (클라이언트)
class ClientGoalHandle:
    def __init__(self, client, gid, accepted, goal_id):
        self._client = client
        self._gid = gid
        self.accepted = accepted
        self.goal_id = _GoalId(goal_id.replace("-", "") if goal_id else "")
        self.status = GoalStatus.STATUS_ACCEPTED if accepted else GoalStatus.STATUS_UNKNOWN
        self._result_future = Future()

    def get_result_async(self):
        return self._result_future

    def get_result(self):
        r = RT.block_until(self._result_future.done)
        if RT.MODE == "jspi":
            return self._result_future.result()

        async def _a():
            await r
            return self._result_future.result()
        return _a()

    def cancel_goal_async(self):
        f = Future()
        C.cgoals[self._gid]["cancel_f"] = f
        post("ac_cancel", gid=self._gid)
        return f

    def cancel_goal(self):
        f = self.cancel_goal_async()
        return RT.block_until(f.done)


class _Wrapped:
    def __init__(self, **kw):
        self.__dict__.update(kw)

    def __repr__(self):
        return f"{type(self).__name__}({self.__dict__})"


class ActionClient:
    def __init__(self, node, action_type, action_name, *, callback_group=None, **_):
        self._node = node
        self.action_type = action_type
        self._t = RT.type_name(action_type)
        self._name = node._resolve(action_name)
        self._id = next_id()
        C.aclients[self._id] = self
        post("ac_create", acid=self._id, nid=node._id, name=action_name, type=self._t)

    def server_is_ready(self):
        return any(x[0] == self._name for x in S.graph.get("actions", []))

    def wait_for_server(self, timeout_sec=None):
        return RT.block_until(self.server_is_ready, timeout_sec)

    def send_goal_async(self, goal, feedback_callback=None, goal_uuid=None):
        if not isinstance(goal, self.action_type.Goal):
            raise TypeError(f"goal 은 {self.action_type.__name__}.Goal 이어야 합니다")
        gid = next_id()
        f = Future()
        C.cgoals[gid] = {"client": self, "accept_f": f, "fb": feedback_callback, "handle": None}
        post("ac_goal", gid=gid, acid=self._id, name=self._name, type=self._t, goal=goal._to_plain())
        return f

    def send_goal(self, goal, feedback_callback=None, goal_uuid=None):
        f = self.send_goal_async(goal, feedback_callback)
        r = RT.block_until(f.done)

        def _finish():
            gh = f.result()
            if not gh.accepted:
                return None
            done = RT.block_until(gh._result_future.done)
            return done, gh

        if RT.MODE == "jspi":
            gh = f.result()
            if not gh.accepted:
                return None
            RT.block_until(gh._result_future.done)
            return gh._result_future.result()

        async def _a():
            await r
            gh = f.result()
            if not gh.accepted:
                return None
            await RT.block_until(gh._result_future.done)
            return gh._result_future.result()
        return _a()

    def destroy(self):
        C.aclients.pop(self._id, None)
        post("ep_destroy", kind="ac", id=self._id)


def _on_ac_accept(ev):
    g = C.cgoals.get(ev["gid"])
    if not g:
        return
    gh = ClientGoalHandle(g["client"], ev["gid"], bool(ev.get("accepted")), ev.get("goal_id", ""))
    g["handle"] = gh
    g["accept_f"].set_result(gh)
    if not gh.accepted:
        C.cgoals.pop(ev["gid"], None)


def _on_ac_fb(ev):
    g = C.cgoals.get(ev["gid"])
    if not g or not g.get("fb"):
        return None
    fb = g["client"].action_type.Feedback._from_plain(ev["fb"])
    gh = g.get("handle")
    msg = _Wrapped(goal_id=gh.goal_id if gh else None, feedback=fb)
    return RT._aw(g["fb"](msg))


def _on_ac_result(ev):
    g = C.cgoals.pop(ev["gid"], None)
    if not g or not g.get("handle"):
        return
    gh = g["handle"]
    gh.status = ev.get("status", 0)
    res = g["client"].action_type.Result._from_plain(ev.get("result") or {})
    gh._result_future.set_result(_Wrapped(result=res, status=gh.status))


def _on_ac_cancel_res(ev):
    g = C.cgoals.get(ev["gid"])
    if g and g.get("cancel_f"):
        g["cancel_f"].set_result(_Wrapped(return_code=0 if ev.get("ok") else 1, goals_canceling=[1] if ev.get("ok") else []))


# ======================================================================== 파라미터 (외부에서 변경)
def _on_param_set(ev):
    n = C.nodes.get(ev["nid"])
    rid = ev.get("rid")
    if n is None:
        if rid:
            post("param_res", rid=rid, successful=False, reason="node not found")
        return
    from .parameter import Parameter
    v = ev.get("value")
    old = n._params.get(ev["name"], [None])[0]
    if old is not None and old.type_ == Parameter.Type.DOUBLE and isinstance(v, int) and not isinstance(v, bool):
        v = float(v)
    r = n._set_one(Parameter(ev["name"], Parameter.Type.from_parameter_value(v), v), notify=bool(rid))
    if rid:
        post("param_res", rid=rid, successful=r.successful, reason=r.reason)
        return
    if not r.successful:
        n.get_logger().warning(f"파라미터 '{ev['name']}' 변경이 거절되어 되돌립니다: {r.reason}")
        if old is not None:
            post("param_set", nid=n._id, name=old.name, value=old.value, type=old._ptype_name())
