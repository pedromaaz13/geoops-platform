from geoops_api.config import get_settings


def test_default_cors_allows_local_vite_fallback_ports(monkeypatch):
    monkeypatch.delenv("GEOOPS_CORS_ORIGINS", raising=False)

    settings = get_settings()

    assert "http://127.0.0.1:5173" in settings.cors_origins
    assert "http://localhost:5174" in settings.cors_origins
    assert "http://127.0.0.1:5179" in settings.cors_origins
