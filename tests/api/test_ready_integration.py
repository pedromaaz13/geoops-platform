import asyncio
import os

import httpx
import pytest
from geoops_api.config import Settings
from geoops_api.main import create_app


async def _get_ready(app) -> httpx.Response:  # type: ignore[no-untyped-def]
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.get("/ready")


@pytest.mark.integration
def test_ready_checks_postgis_when_available() -> None:
    database_url = os.getenv("GEOOPS_TEST_DATABASE_URL")
    if not database_url:
        pytest.skip("GEOOPS_TEST_DATABASE_URL is not configured")

    app = create_app(
        Settings(
            service_name="geoops-api-test",
            environment="test",
            database_url=database_url,
            api_host="127.0.0.1",
            api_port=8000,
        )
    )

    response = asyncio.run(_get_ready(app))

    assert response.status_code == 200
    assert response.json()["status"] == "ready"
    assert response.json()["dependency"] == "postgis"
    assert response.json()["postgis_version"]
