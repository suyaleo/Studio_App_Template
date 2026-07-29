from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_health_is_ready() -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ready"


def test_version_matches_manifest() -> None:
    response = client.get("/api/version")
    assert response.status_code == 200
    payload = response.json()
    assert payload["repository"] == "Studio_App_Template"
    assert payload["license"] == "Apache-2.0"


def test_preflight_returns_structured_checks() -> None:
    response = client.post("/api/preflight")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] in {"pass", "review"}
    assert {check["id"] for check in payload["checks"]} == {
        "manifest",
        "storage",
        "web",
        "identity",
    }
