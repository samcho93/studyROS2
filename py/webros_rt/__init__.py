"""webros_rt — Pyodide(Web Worker) 안의 rclpy 가 브라우저 ROS 그래프(WebROS)와 이야기하는 통로.

* 메시지 클래스: 메인 스레드가 보내 준 인터페이스 정의로 ``std_msgs.msg.String`` 같은 모듈/클래스를 만든다.
* 이벤트: 메인 → 워커로 오는 구독 메시지 · 서비스 요청 · 액션 목표 등을 큐에서 꺼내 콜백을 부른다.
* 기다리기: JSPI 가 있으면 ``pyodide.ffi.run_sync`` 로 진짜로 멈추고(blocking),
  없으면 asyncify 로 바꾼 코드가 ``await`` 하도록 코루틴을 돌려준다.
"""

from __future__ import annotations

import importlib.abc
import importlib.machinery
import inspect
import json
import sys
import time as _time_mod

import webros_transport as T  # 워커가 registerJsModule 로 넣어 준 JS 객체

MODE = "jspi"          # "jspi" | "async"
_real_sleep = _time_mod.sleep
_ids = {"n": 0}


def next_id() -> int:
    _ids["n"] += 1
    return _ids["n"]


def post(op: str, **kw) -> None:
    kw["op"] = op
    T.post(json.dumps(kw, default=_json_default))


def _json_default(o):
    if hasattr(o, "_to_plain"):
        return o._to_plain()
    if isinstance(o, (bytes, bytearray)):
        return list(o)
    try:
        return list(o)
    except Exception:
        return str(o)


# ======================================================================== 취소
class _State:
    cancelled = False
    ok = False
    graph = {"services": [], "actions": [], "topics": [], "nodes": []}
    ros_args = {"remap": {}, "params": {}, "name": None, "ns": None}
    handlers = {}          # 이벤트 종류 → 함수
    timers = []            # rclpy Timer 객체
    pending = []           # 아직 처리 안 한 이벤트 (cancel 만 먼저 꺼낸 경우)


S = _State


def check_cancel():
    if S.cancelled or T.cancelled():
        S.cancelled = True
        raise KeyboardInterrupt("Ctrl+C — 실행을 멈췄습니다")


# ======================================================================== 메시지 클래스
PRIM_FLOAT = {"float32", "float64"}
PRIM_INT = {"byte", "char", "int8", "uint8", "int16", "uint16", "int32", "uint32", "int64", "uint64"}
PRIM_STR = {"string", "wstring"}
PRIM = PRIM_FLOAT | PRIM_INT | PRIM_STR | {"bool"}
INT_RANGE = {
    "int8": (-128, 127), "uint8": (0, 255), "byte": (0, 255), "char": (0, 255), "int16": (-32768, 32767), "uint16": (0, 65535),
    "int32": (-2**31, 2**31 - 1), "uint32": (0, 2**32 - 1), "int64": (-2**63, 2**63 - 1), "uint64": (0, 2**64 - 1),
}
IFACES: dict = {}      # 'pkg/msg/X' → {'kind':..,'parts':[{'fields':[[n,t,arr,def]], 'consts':[[n,t,v]]}]}
_classes: dict = {}
CHECK_TYPES = True


def set_ifaces(d):
    IFACES.clear()
    IFACES.update(d)


def set_ifaces_json(s):
    set_ifaces(json.loads(s))


def _default(ft, arr, dflt):
    if arr is not None:
        if arr > 0:
            return [(_prim_default(ft) if ft in PRIM else msg_class(ft)()) for _ in range(arr)]
        return []
    if ft in PRIM:
        if dflt is not None:
            return float(dflt) if ft in PRIM_FLOAT else dflt
        return _prim_default(ft)
    return msg_class(ft)()


def _prim_default(ft):
    if ft in PRIM_FLOAT:
        return 0.0
    if ft in PRIM_STR:
        return ""
    if ft == "bool":
        return False
    return 0


def _pyname(t):
    base, _, part = t.partition("#")
    pkg, kind, name = base.split("/")
    if part:
        suffix = {"srv": ["Request", "Response"], "action": ["Goal", "Result", "Feedback"]}[kind][int(part)]
        return f"{pkg}.{kind}.{name}_{suffix}", f"{name}_{suffix}"
    return f"{pkg}.{kind}.{name}", name


def _fields_of(t):
    base, _, part = t.partition("#")
    d = IFACES.get(base)
    if d is None:
        raise ImportError(f"알 수 없는 인터페이스: {base}")
    return d["parts"][int(part) if part else 0]


class _Msg:
    """모든 메시지의 부모. 필드 타입 검사까지 실제 rclpy 메시지처럼 한다."""
    __slots__ = ()
    _type = ""
    _spec = {}

    def __init__(self, **kwargs):
        for n, (ft, arr, dflt) in self._spec.items():
            object.__setattr__(self, n, _default(ft, arr, dflt))
        for k, v in kwargs.items():
            if k not in self._spec:
                raise AssertionError(
                    "Invalid arguments passed to constructor: %s" % k)
            setattr(self, k, v)

    def __setattr__(self, k, v):
        spec = self._spec.get(k)
        if spec is None:
            raise AttributeError(f"'{type(self).__name__}' object has no attribute '{k}'")
        ft, arr, _ = spec
        if CHECK_TYPES:
            _check(k, ft, arr, v)
        if arr is not None and not isinstance(v, list):
            v = list(v)
        object.__setattr__(self, k, v)

    def __repr__(self):
        args = ", ".join(f"{n}={getattr(self, n)!r}" for n in self._spec)
        return f"{self._pyfull}({args})"

    def __eq__(self, other):
        return type(self) is type(other) and all(getattr(self, n) == getattr(other, n) for n in self._spec)

    @classmethod
    def get_fields_and_field_types(cls):
        out = {}
        for n, (ft, arr, _) in cls._spec.items():
            t = ft if ft in PRIM else "/".join(ft.split("/")[::2]) if "/msg/" in ft else ft
            t = {"float64": "double", "float32": "float"}.get(t, t)
            out[n] = (f"sequence<{t}>" if arr == -1 else f"{t}[{arr}]") if arr is not None else t
        return out

    def _to_plain(self):
        d = {}
        for n, (ft, arr, _) in self._spec.items():
            v = getattr(self, n)
            if arr is not None:
                d[n] = [x._to_plain() if isinstance(x, _Msg) else x for x in v]
            elif isinstance(v, _Msg):
                d[n] = v._to_plain()
            else:
                d[n] = v
        return d

    @classmethod
    def _from_plain(cls, d):
        o = cls.__new__(cls)
        d = d or {}
        for n, (ft, arr, dflt) in cls._spec.items():
            v = d.get(n, None)
            if v is None:
                v = _default(ft, arr, dflt)
            elif arr is not None:
                if ft in PRIM:
                    v = [float(x) if ft in PRIM_FLOAT else x for x in v]
                else:
                    sub = msg_class(ft)
                    v = [sub._from_plain(x) for x in v]
            elif ft in PRIM_FLOAT:
                v = float(v)
            elif ft in PRIM_INT:
                v = int(v)
            elif ft == "bool":
                v = bool(v)
            elif ft not in PRIM:
                v = msg_class(ft)._from_plain(v)
            object.__setattr__(o, n, v)
        return o


def _tname(ft):
    if ft in PRIM_FLOAT:
        return "float"
    if ft in PRIM_INT:
        return "int"
    if ft in PRIM_STR:
        return "str"
    if ft == "bool":
        return "bool"
    return _pyname(ft)[0]


def _check(k, ft, arr, v):
    if arr is not None:
        if not isinstance(v, (list, tuple)) and not hasattr(v, "__iter__"):
            raise AssertionError(f"The '{k}' field must be a set or sequence and each value of type '{_tname(ft)}'")
        if ft in PRIM_FLOAT:
            for x in v:
                if not isinstance(x, (float, int)) or isinstance(x, bool):
                    raise AssertionError(f"The '{k}' field must be a set or sequence and each value of type 'float'")
        return
    if ft in PRIM_FLOAT:
        if not isinstance(v, float):
            raise AssertionError(f"The '{k}' field must be of type 'float'")
    elif ft in PRIM_INT:
        if not isinstance(v, int) or isinstance(v, bool):
            raise AssertionError(f"The '{k}' field must be of type 'int'")
        lo, hi = INT_RANGE.get(ft, (None, None))
        if lo is not None and not (lo <= v <= hi):
            raise AssertionError(f"The '{k}' field must be an integer in [{lo}, {hi}]")
    elif ft in PRIM_STR:
        if not isinstance(v, str):
            raise AssertionError(f"The '{k}' field must be of type 'str'")
    elif ft == "bool":
        if not isinstance(v, bool):
            raise AssertionError(f"The '{k}' field must be of type 'bool'")
    else:
        cls = msg_class(ft)
        if not isinstance(v, cls):
            raise AssertionError(f"The '{k}' field must be a sub message of type '{cls.__name__}'")


def msg_class(t):
    c = _classes.get(t)
    if c is not None:
        return c
    part = _fields_of(t)
    full, short = _pyname(t)
    spec = {f[0]: (f[1], f[2], f[3] if len(f) > 3 else None) for f in part["fields"]}
    ns = {"__slots__": tuple(spec.keys()), "_type": t, "_spec": spec, "_pyfull": full, "__module__": full.rsplit(".", 1)[0]}
    for cn, ct, cv in part.get("consts", []):
        ns[cn] = float(cv) if ct in PRIM_FLOAT else cv
    c = type(short, (_Msg,), ns)
    _classes[t] = c
    return c


class _SrvBase:
    pass


def iface_class(t):
    """'pkg/msg/X' → 메시지 클래스, 'pkg/srv/X' → Request/Response 를 가진 클래스, action → Goal/Result/Feedback."""
    c = _classes.get(t)
    if c is not None:
        return c
    pkg, kind, name = t.split("/")
    if kind == "msg":
        return msg_class(t)
    if kind == "srv":
        c = type(name, (_SrvBase,), {"_type": t, "Request": msg_class(t + "#0"), "Response": msg_class(t + "#1"), "__module__": f"{pkg}.srv"})
    else:
        c = type(name, (_SrvBase,), {"_type": t, "Goal": msg_class(t + "#0"), "Result": msg_class(t + "#1"), "Feedback": msg_class(t + "#2"), "__module__": f"{pkg}.action"})
        # 피드백 메시지(FeedbackMessage)는 goal_id + feedback
        c.Impl = type("Impl", (), {})
    _classes[t] = c
    return c


def type_name(cls) -> str:
    t = getattr(cls, "_type", None)
    if not t:
        raise TypeError(f"{cls!r} 는 ROS 메시지/서비스/액션 타입이 아닙니다")
    return t


# ---------------------------------------------------------------- import hook
class _IfaceFinder(importlib.abc.MetaPathFinder, importlib.abc.Loader):
    def _pkgs(self):
        return {k.split("/")[0] for k in IFACES}

    def find_spec(self, fullname, path=None, target=None):
        parts = fullname.split(".")
        if parts[0] not in self._pkgs():
            return None
        if len(parts) == 1:
            return importlib.machinery.ModuleSpec(fullname, self, is_package=True)
        if len(parts) == 2 and parts[1] in ("msg", "srv", "action"):
            return importlib.machinery.ModuleSpec(fullname, self, is_package=False)
        return None

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        parts = module.__name__.split(".")
        if len(parts) == 1:
            module.__path__ = []
            return
        pkg, kind = parts
        found = False
        for t in IFACES:
            p, k, n = t.split("/")
            if p == pkg and k == kind:
                setattr(module, n, iface_class(t))
                found = True
        if not found:
            raise ImportError(f"No module named '{module.__name__}'")


def install_import_hook():
    if not any(isinstance(f, _IfaceFinder) for f in sys.meta_path):
        sys.meta_path.insert(0, _IfaceFinder())


# ======================================================================== 이벤트 처리
def take_events():
    evs = S.pending
    S.pending = []
    raw = T.take()
    if raw and raw != "[]":
        evs = evs + json.loads(raw)
    return evs


def take_cancels():
    """액션 실행 중(time.sleep 루프)에도 취소 요청을 알 수 있게 cancel 이벤트만 먼저 꺼낸다."""
    raw = T.take()
    if not raw or raw == "[]":
        return
    for ev in json.loads(raw):
        if ev.get("kind") == "as_cancel":
            h = S.handlers.get("as_cancel")
            if h:
                h(ev)
        elif ev.get("kind") == "graph":
            S.graph = ev
        else:
            S.pending.append(ev)


async def _aw(x):
    if inspect.isawaitable(x):
        if MODE == "jspi" and inspect.iscoroutine(x):
            from pyodide.ffi import run_sync
            return run_sync(x)
        return await x
    return x


async def route(ev):
    kind = ev.get("kind")
    if kind == "graph":
        S.graph = ev
        return
    if kind == "cancel":
        S.cancelled = True
        return
    h = S.handlers.get(kind)
    if h is not None:
        r = h(ev)
        if inspect.isawaitable(r):
            await r


def drive(coro):
    """JSPI 모드: 멈추지 않는 코루틴을 동기적으로 끝까지 돌린다."""
    try:
        coro.send(None)
    except StopIteration as e:
        return e.value
    coro.close()
    raise RuntimeError("내부 오류: 콜백이 예상치 않게 멈췄습니다")


def run_due_timers_sync():
    now = _time_mod.monotonic()
    for t in list(S.timers):
        if t._due(now):
            drive(t._fire())


async def run_due_timers_async():
    now = _time_mod.monotonic()
    for t in list(S.timers):
        if t._due(now):
            await t._fire()


def next_timeout(max_ms=100):
    now = _time_mod.monotonic()
    ms = max_ms
    for t in S.timers:
        if not t.canceled:
            ms = min(ms, max(0, (t.next_at - now) * 1000))
    return int(ms)


def process_sync(timeout_ms):
    """JSPI: 이벤트가 오거나 타이머 때가 될 때까지 기다린 뒤 모두 처리."""
    from pyodide.ffi import run_sync
    check_cancel()
    evs = take_events()
    if not evs:
        run_sync(T.wait(max(0, min(timeout_ms, next_timeout()))))
        evs = take_events()
    check_cancel()
    for ev in evs:
        drive(route(ev))
        check_cancel()
    run_due_timers_sync()


async def process_async(timeout_ms):
    check_cancel()
    evs = take_events()
    if not evs:
        await T.wait(max(0, min(timeout_ms, next_timeout())))
        evs = take_events()
    check_cancel()
    for ev in evs:
        await route(ev)
        check_cancel()
    await run_due_timers_async()


def block_until(pred, timeout_sec=None):
    """pred() 가 참이 될 때까지 이벤트를 처리하며 기다린다. (JSPI: 값, async: 코루틴)"""
    end = None if timeout_sec is None or timeout_sec < 0 else _time_mod.monotonic() + timeout_sec
    if MODE == "jspi":
        while not pred():
            if end is not None and _time_mod.monotonic() >= end:
                return False
            if not S.ok and not S.cancelled and pred is not _never:
                return pred()
            rem = 100 if end is None else max(0, int((end - _time_mod.monotonic()) * 1000))
            process_sync(min(100, rem))
        return True

    async def _a():
        while not pred():
            if end is not None and _time_mod.monotonic() >= end:
                return False
            if not S.ok and not S.cancelled and pred is not _never:
                return pred()
            rem = 100 if end is None else max(0, int((end - _time_mod.monotonic()) * 1000))
            await process_async(min(100, rem))
        return True
    return _AwaitableBool(_a(), pred)


def _never():
    return False


class _AwaitableBool:
    """async 모드에서 __init__ 같은 동기 자리에서 불려도 참/거짓 판단이 되게."""
    _spins = 0

    def __init__(self, coro, pred):
        self._c = coro
        self._p = pred

    def __await__(self):
        return self._c.__await__()

    def __bool__(self):
        self._c.close()
        v = bool(self._p())
        if not v:
            _AwaitableBool._spins += 1
            if _AwaitableBool._spins > 50:
                raise RuntimeError("이 브라우저(JSPI 미지원)에서는 __init__ 안에서 기다릴 수 없습니다. "
                                   "Chrome/Edge 최신 버전을 쓰거나 기다리는 코드를 main() 으로 옮기세요.")
        return v


# ======================================================================== time.sleep
def patched_sleep(seconds):
    check_cancel()
    ms = max(0, int(float(seconds) * 1000))
    if MODE == "jspi":
        from pyodide.ffi import run_sync
        end = _time_mod.monotonic() + ms / 1000
        # 긴 sleep 도 조각내어 취소(Ctrl+C) 와 액션 취소 요청을 확인
        while True:
            rem = end - _time_mod.monotonic()
            if rem <= 0:
                break
            run_sync(T.sleep(int(min(rem, 0.1) * 1000)))
            check_cancel()
            take_cancels()
        return None
    return _async_sleep(ms)


async def _async_sleep(ms):
    end = _time_mod.monotonic() + ms / 1000
    while True:
        rem = end - _time_mod.monotonic()
        if rem <= 0:
            break
        await T.sleep(int(min(rem, 0.1) * 1000))
        check_cancel()
        take_cancels()


def patch_time():
    _time_mod.sleep = patched_sleep


# ======================================================================== 실행기
FILENAME = "main.py"


def _report(exc, filename):
    import traceback
    if isinstance(exc, KeyboardInterrupt):
        return "stopped"
    if isinstance(exc, SystemExit):
        return "ok" if exc.code in (None, 0) else "error"
    tb = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == filename]
    lines = ["Traceback (most recent call last):\n"]
    lines += traceback.format_list(tb)
    lines += traceback.format_exception_only(type(exc), exc)
    sys.stderr.write("".join(lines))
    return "error"


def _prepare(argv, ros_args, filename):
    S.cancelled = False
    S.ok = False
    S.timers.clear()
    S.pending = []
    S.ros_args = ros_args or {"remap": {}, "params": {}, "name": None, "ns": None}
    sys.argv = list(argv or [filename])
    import rclpy._impl as impl
    impl._reset()


def _globals(filename, entry):
    g = {"__name__": "__main__" if not entry else filename.rsplit(".", 1)[0], "__file__": filename, "__builtins__": __builtins__}
    from . import asyncify
    g.update(asyncify.HELPERS)
    return g


def _finish():
    import rclpy._impl as impl
    impl._teardown()


def run_sync_mode(source, filename, entry, argv_json, ros_args_json):
    argv = json.loads(argv_json)
    _prepare(argv, json.loads(ros_args_json), filename)
    try:
        code = compile(source, filename, "exec")
        g = _globals(filename, entry)
        exec(code, g)
        if entry:
            if entry not in g:
                raise AttributeError(f"module '{filename[:-3]}' has no attribute '{entry}' (setup.py 의 entry_points 를 확인하세요)")
            g[entry]()
        return "ok"
    except BaseException as exc:  # noqa: BLE001
        return _report(exc, filename)
    finally:
        _finish()


async def run_async_mode(source, filename, entry, argv_json, ros_args_json):
    global MODE
    argv = json.loads(argv_json)
    _prepare(argv, json.loads(ros_args_json), filename)
    try:
        from . import asyncify
        code = asyncify.compile_async(source, filename)
        g = _globals(filename, entry)
        coro = eval(code, g)
        if coro is not None:
            await coro
        if entry:
            r = g[entry]()
            if inspect.isawaitable(r):
                await r
        return "ok"
    except BaseException as exc:  # noqa: BLE001
        return _report(exc, filename)
    finally:
        _finish()


def set_mode(m):
    global MODE
    MODE = m
