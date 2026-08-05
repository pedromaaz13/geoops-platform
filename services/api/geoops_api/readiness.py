from __future__ import annotations

import psycopg


def check_postgis_ready(database_url: str, timeout_seconds: int = 3) -> str:
    with (
        psycopg.connect(database_url, connect_timeout=timeout_seconds) as connection,
        connection.cursor() as cursor,
    ):
        cursor.execute("select postgis_version()")
        version = cursor.fetchone()

    if version is None:
        raise RuntimeError("PostGIS did not return a version")

    return str(version[0])
