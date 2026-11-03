"""Static scan: no imports of LojasNova business apps in generated Python."""
from pathlib import Path

def test_no_host_business_imports():
    root = Path(__file__).resolve().parents[2]
    for path in root.rglob("*.py"):
        if "tests" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        assert "from app_config " not in text
        assert "from app_home " not in text
        assert "from app_billing " not in text
