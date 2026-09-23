"""Source transform for browsers without JSPI (fallback "async" mode).

Pyodide can only suspend Python on a JS Promise when the browser supports JS
Promise Integration (JSPI). Without it, blocking-looking calls such as
``node.call()`` or ``time.sleep(1)`` cannot wait. This module rewrites student
code so waiting becomes explicit:

* every ordinary call ``f(x)`` becomes ``await __wr_aw__(f(x))`` — ``__wr_aw__``
  awaits the value only if it is awaitable, so plain calls are unaffected;
* every user ``def`` becomes ``async def`` (so calls to it are awaited too).

Exceptions (kept synchronous, calls inside are wrapped with ``__wr_bg__`` which
schedules awaitables in the background instead):

* dunder methods (``__init__``, ``__str__`` ...), ``@property`` accessors,
  generator functions (containing ``yield``);
* lambdas, generator expressions and class bodies (cannot contain ``await``).

The module level runs with top-level await (Pyodide ``runPythonAsync``).
Line numbers are preserved so tracebacks point to the student's lines.
"""

from __future__ import annotations

import ast
import asyncio
import inspect
from typing import Any

# Builtins that never block — skipping them keeps the rewritten code fast.
_SKIP_NAMES = frozenset(
    """print range len int float str bool abs min max round list dict tuple set
    frozenset enumerate zip isinstance issubclass super sum sorted reversed type
    hasattr getattr setattr format repr divmod pow any all map filter iter next
    id hash chr ord bin hex oct bytes bytearray complex slice vars dir callable
    __wr_aw__ __wr_bg__""".split()
)


async def __wr_aw__(value: Any) -> Any:  # noqa: N802 - injected helper name
    if inspect.isawaitable(value):
        return await value
    return value


def __wr_bg__(value: Any) -> Any:  # noqa: N802 - injected helper name
    """Used inside functions that must stay synchronous."""
    if inspect.iscoroutine(value):
        asyncio.ensure_future(value)
        return None
    return value


HELPERS = {"__wr_aw__": __wr_aw__, "__wr_bg__": __wr_bg__}


def _is_generator(fn: ast.AST) -> bool:
    for node in ast.walk(fn):
        if node is not fn and isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)):
            continue
        if isinstance(node, (ast.Yield, ast.YieldFrom)):
            return True
    return False


def _must_stay_sync(fn: ast.FunctionDef) -> bool:
    if fn.name.startswith("__") and fn.name.endswith("__"):
        return True
    for dec in fn.decorator_list:
        target = dec.func if isinstance(dec, ast.Call) else dec
        name = target.attr if isinstance(target, ast.Attribute) else getattr(target, "id", "")
        if name in ("property", "setter", "getter", "deleter", "cached_property", "contextmanager"):
            return True
    return _is_generator(fn)


class _CallWrapper(ast.NodeTransformer):
    """Wrap calls in one function body; ``sync`` selects __wr_bg__ vs await."""

    def __init__(self, sync: bool) -> None:
        self.sync = sync

    # nested scopes are handled by the outer transformer
    def visit_FunctionDef(self, node):  # noqa: N802
        return _Transformer().visit_FunctionDef(node)

    def visit_AsyncFunctionDef(self, node):  # noqa: N802
        return node

    def visit_ClassDef(self, node):  # noqa: N802
        return _Transformer().visit_ClassDef(node)

    def visit_Lambda(self, node):  # noqa: N802
        return node

    def visit_GeneratorExp(self, node):  # noqa: N802
        return node

    def visit_Call(self, node):  # noqa: N802
        self.generic_visit(node)
        f = node.func
        if isinstance(f, ast.Name) and f.id in _SKIP_NAMES:
            return node
        if self.sync:
            new = ast.Call(func=ast.Name(id="__wr_bg__", ctx=ast.Load()), args=[node], keywords=[])
        else:
            new = ast.Await(
                value=ast.Call(func=ast.Name(id="__wr_aw__", ctx=ast.Load()), args=[node], keywords=[])
            )
        return ast.copy_location(new, node)


class _Transformer(ast.NodeTransformer):
    def _body(self, stmts, sync: bool):
        w = _CallWrapper(sync)
        return [w.visit(s) for s in stmts]

    def visit_Module(self, node):  # noqa: N802
        node.body = self._body(node.body, sync=False)
        return node

    def visit_ClassDef(self, node):  # noqa: N802
        new_body = []
        for stmt in node.body:
            if isinstance(stmt, ast.FunctionDef):
                new_body.append(self.visit_FunctionDef(stmt))
            elif isinstance(stmt, ast.ClassDef):
                new_body.append(self.visit_ClassDef(stmt))
            else:
                new_body.append(stmt)  # class-level statements run synchronously
        node.body = new_body
        return node

    def visit_FunctionDef(self, node):  # noqa: N802
        if _must_stay_sync(node):
            node.body = self._body(node.body, sync=True)
            return node
        new = ast.AsyncFunctionDef(
            name=node.name,
            args=node.args,
            body=self._body(node.body, sync=False),
            decorator_list=node.decorator_list,
            returns=node.returns,
            type_comment=getattr(node, "type_comment", None),
        )
        if hasattr(node, "type_params"):
            new.type_params = node.type_params
        return ast.copy_location(new, node)


def transform(source: str, filename: str = "main.py") -> ast.Module:
    tree = ast.parse(source, filename=filename)
    tree = _Transformer().visit(tree)
    ast.fix_missing_locations(tree)
    return tree


def compile_async(source: str, filename: str = "main.py"):
    """Return a code object that must be evaluated with top-level await."""
    tree = transform(source, filename)
    return compile(tree, filename, "exec", flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)


def transform_source(source: str) -> str:
    """Debug helper: rewritten code as text."""
    return ast.unparse(transform(source))
