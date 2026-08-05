import asyncio

import httpx
from geoops_api.config import Settings
from geoops_api.main import create_app


async def _get_health(app) -> httpx.Response:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/health")


def test_health_reports_process_status() -> None:
    app = create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url="postgresql://unused:unused@localhost:5432/unused",
            api_host="127.0.0.1",
            api_port=8000,
        )
    )

    response = asyncio.run(_get_health(app))

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "geoops-api-test",
        "environment": "test",
    }
