import asyncio
import pytest

from app.core.event_bus import event_bus


@pytest.mark.asyncio
async def test_event_bus_publish_subscribe():
    received = {}

    async def handler(payload):
        received.update(payload)

    await event_bus.subscribe("test.event", handler)
    await event_bus.publish("test.event", {"value": 42})

    # Allow event loop to run handlers
    await asyncio.sleep(0)

    assert received == {"value": 42}

    await event_bus.unsubscribe("test.event", handler)
