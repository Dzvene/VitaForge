"""In-process pub/sub for cross-slice notifications.

Used when one slice reacts to another's state change without the reverse module
dependency (e.g. `diary` logs a meal → `calibration` may want to know, but
`diary` must not import `calibration`). Handlers run synchronously inside the
publisher's call frame and swallow their own exceptions so a bad subscriber
cannot break a write path. Async handlers are scheduled on the running loop.
"""

from __future__ import annotations

import asyncio
import inspect
import logging
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

_log = logging.getLogger(__name__)

Handler = Callable[..., None | Awaitable[None]]

_subscribers: dict[str, list[Handler]] = defaultdict(list)


def subscribe(topic: str, handler: Handler) -> None:
    _subscribers[topic].append(handler)


def publish(topic: str, **payload: Any) -> None:
    for handler in _subscribers[topic]:
        try:
            result = handler(**payload) if payload else handler()
            if inspect.isawaitable(result):
                _dispatch_async(result, topic)
        except Exception:
            _log.exception("event handler failed for topic=%s", topic)


def _dispatch_async(coro: Awaitable[None], topic: str) -> None:
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop is not None and loop.is_running():
        task = loop.create_task(coro)  # type: ignore[arg-type]

        def _on_done(t: asyncio.Task[Any]) -> None:
            if t.cancelled():
                return
            if t.exception() is not None:
                _log.exception("async handler failed topic=%s", topic, exc_info=t.exception())

        task.add_done_callback(_on_done)
    else:
        try:
            asyncio.run(coro)  # type: ignore[arg-type]
        except Exception:
            _log.exception("event handler failed for topic=%s", topic)
