"""
Basic smoke tests for SmartPresence backend
"""
import pytest
from fastapi.testclient import TestClient


def test_imports():
    """Test that all main modules can be imported"""
    try:
        from app.main import app
        from app.core.config import get_settings
        from app.db.session import SessionLocal

        assert app is not None
        assert get_settings is not None
        assert SessionLocal is not None
    except ImportError as e:
        pytest.fail(f"Failed to import modules: {e}")


def test_config():
    """Test that configuration loads correctly"""
    from app.core.config import get_settings

    settings = get_settings()
    assert settings.app_name is not None
    assert settings.database_url is not None


def test_app_creation():
    """Test that the FastAPI app can be created"""
    from app.main import app

    assert app is not None
    assert app.title == "Smart Presence AI"


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test the health check endpoint"""
    from app.main import app

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test the root endpoint"""
    from app.main import app

    client = TestClient(app)
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
