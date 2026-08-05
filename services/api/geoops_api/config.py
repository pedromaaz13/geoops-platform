from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    service_name: str
    environment: str
    database_url: str
    api_host: str
    api_port: int


def get_settings() -> Settings:
    return Settings(
        service_name=os.getenv("GEOOPS_SERVICE_NAME", "geoops-api"),
        environment=os.getenv("GEOOPS_ENVIRONMENT", "development"),
        database_url=os.getenv(
            "GEOOPS_DATABASE_URL",
            "postgresql://geoops:geoops@localhost:5432/geoops_dev",
        ),
        api_host=os.getenv("GEOOPS_API_HOST", "0.0.0.0"),
        api_port=int(os.getenv("GEOOPS_API_PORT", "8000")),
    )
