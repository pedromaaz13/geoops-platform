from geoops_ingestion.cli import main


def test_cli_help(capsys) -> None:  # type: ignore[no-untyped-def]
    exit_code = main([])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "geoops-ingestion" in captured.out
    assert "smoke" in captured.out


def test_cli_smoke(capsys) -> None:  # type: ignore[no-untyped-def]
    exit_code = main(["smoke"])

    captured = capsys.readouterr()
    assert exit_code == 0
    assert "geoops-ingestion" in captured.err
    assert "no external sources were contacted" in captured.err
