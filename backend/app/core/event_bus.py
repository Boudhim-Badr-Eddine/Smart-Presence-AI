"""Lightweight in-memory event bus for decoupling features.

Usage:
    from app.core.event_bus import event_bus

    async def on_attendance_marked(payload: dict) -> None:
        ...

    event_bus.subscribe("attendance.marked", on_attendance_marked)
    await event_bus.publish("attendance.marked", {"student_id": 1})

This bus is intentionally simple (in-memory). Replace with Redis/Kafka later
if cross-process delivery is needed.
"""
from __future__ import annotations

import asyncio
from collections import defaultdict
from typing import Any, Awaitable, Callable, Dict, List

EventHandler = Callable[[Dict[str, Any]], Awaitable[None]]


class EventBus:
    """A minimal async pub/sub event bus.

    - In-memory only (single-process).
    - Handlers are awaited sequentially to keep ordering predictable.
    - Safe to use from async contexts.
    """

    def __init__(self) -> None:
        self._handlers: Dict[str, List[EventHandler]] = defaultdict(list)
        self._lock = asyncio.Lock()

    async def subscribe(self, event_name: str, handler: EventHandler) -> None:
        """Register a handler for an event name."""
        async with self._lock:
            self._handlers[event_name].append(handler)

    async def unsubscribe(self, event_name: str, handler: EventHandler) -> None:
        """Remove a handler for an event name if present."""
        async with self._lock:
            if event_name in self._handlers and handler in self._handlers[event_name]:
                self._handlers[event_name].remove(handler)
                if not self._handlers[event_name]:
                    self._handlers.pop(event_name, None)

    async def publish(self, event_name: str, payload: Dict[str, Any]) -> None:
        """Publish an event; sequentially await all handlers."""
        handlers = list(self._handlers.get(event_name, []))
        for handler in handlers:
            await handler(payload)


event_bus = EventBus()
