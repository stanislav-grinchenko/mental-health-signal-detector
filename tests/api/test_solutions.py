"""
Tests endpoint POST /solutions
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


# ─── Payload de base ──────────────────────────────────────────────────────────

def base_profile(**overrides):
    profile = {
        "emotionId": "stress",
        "mode": "adult",
        "userText": "je suis stressé par mon travail",
        "selfScore": None,
        "selfReportAnswers": None,
        "mlScore": 0.4,
        "finalScore": 0.4,
        "distressLevel": "elevated",
        "clinicalDimensions": [],
        "clinicalProfile": "adjustment",
    }
    profile.update(overrides)
    return profile


# ─── Statut HTTP ──────────────────────────────────────────────────────────────

class TestHttpStatus:
    def test_valid_request_returns_200(self, client):
        resp = client.post("/solutions", json=base_profile())
        assert resp.status_code == 200

    def test_missing_required_fields_returns_422(self, client):
        resp = client.post("/solutions", json={"emotionId": "stress"})
        assert resp.status_code == 422

    def test_invalid_distress_level_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(distressLevel="extreme"))
        assert resp.status_code == 422

    def test_invalid_mode_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(mode="teenager"))
        assert resp.status_code == 422

    def test_text_too_long_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(userText="x" * 5001))
        assert resp.status_code == 422

    def test_empty_text_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(userText=""))
        assert resp.status_code == 422


# ─── Structure de la réponse ──────────────────────────────────────────────────

class TestResponseStructure:
    def test_all_fields_present(self, client):
        resp = client.post("/solutions", json=base_profile())
        data = resp.json()
        assert "level" in data
        assert "clinicalProfile" in data
        assert "message" in data
        assert "closing" in data
        assert "microActions" in data
        assert "therapeuticBrick" in data
        assert "resources" in data
        assert "escalationRequired" in data

    def test_message_is_non_empty_string(self, client):
        resp = client.post("/solutions", json=base_profile())
        data = resp.json()
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0

    def test_closing_is_non_empty_string(self, client):
        resp = client.post("/solutions", json=base_profile())
        data = resp.json()
        assert isinstance(data["closing"], str)
        assert len(data["closing"]) > 0

    def test_micro_actions_is_list(self, client):
        resp = client.post("/solutions", json=base_profile())
        data = resp.json()
        assert isinstance(data["microActions"], list)

    def test_resources_is_list(self, client):
        resp = client.post("/solutions", json=base_profile())
        data = resp.json()
        assert isinstance(data["resources"], list)


# ─── Niveaux de triage ────────────────────────────────────────────────────────

class TestTriageLevels:
    def test_crisis_profile_returns_level_4(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis",
            distressLevel="critical",
        ))
        data = resp.json()
        assert data["level"] == 4
        assert data["escalationRequired"] is True

    def test_critical_non_crisis_returns_level_3(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="depression",
            distressLevel="critical",
        ))
        data = resp.json()
        assert data["level"] == 3
        assert data["escalationRequired"] is False

    def test_elevated_returns_level_2(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="adjustment",
            distressLevel="elevated",
        ))
        data = resp.json()
        assert data["level"] == 2

    def test_adjustment_light_returns_level_1(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="adjustment",
            distressLevel="light",
        ))
        data = resp.json()
        assert data["level"] == 1

    def test_wellbeing_returns_level_0(self, client):
        resp = client.post("/solutions", json=base_profile(
            emotionId="joy",
            clinicalProfile="wellbeing",
            distressLevel="light",
            mlScore=0.05,
            finalScore=0.05,
        ))
        data = resp.json()
        assert data["level"] == 0
        assert data["escalationRequired"] is False

    def test_burnout_tiredness_returns_level_3(self, client):
        resp = client.post("/solutions", json=base_profile(
            emotionId="tiredness",
            clinicalProfile="burnout",
            distressLevel="elevated",
            clinicalDimensions=["burnout"],
        ))
        data = resp.json()
        assert data["level"] == 3


# ─── Ressources de sécurité ───────────────────────────────────────────────────

class TestSafetyResources:
    def test_level_4_adult_includes_3114(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis",
            distressLevel="critical",
            mode="adult",
        ))
        data = resp.json()
        has_3114 = any(r.get("id") == "3114" or "3114" in (r.get("href") or "") for r in data["resources"])
        assert has_3114, "La ligne 3114 doit être présente en niveau 4"

    def test_level_4_kids_includes_3114(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis",
            distressLevel="critical",
            mode="kids",
        ))
        data = resp.json()
        has_3114 = any(r.get("id") == "3114" or "3114" in (r.get("href") or "") for r in data["resources"])
        assert has_3114, "La ligne 3114 doit être présente en mode kids niveau 4"

    def test_level_0_resources_empty(self, client):
        resp = client.post("/solutions", json=base_profile(
            emotionId="joy",
            clinicalProfile="wellbeing",
            distressLevel="light",
            mlScore=0.05,
            finalScore=0.05,
        ))
        data = resp.json()
        assert data["resources"] == []

    def test_level_2_resources_non_empty(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="depression",
            distressLevel="elevated",
        ))
        data = resp.json()
        assert len(data["resources"]) > 0


# ─── Brique thérapeutique ─────────────────────────────────────────────────────

class TestTherapeuticBrick:
    def test_crisis_brick(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis", distressLevel="critical"
        ))
        assert resp.json()["therapeuticBrick"] == "crisis"

    def test_professional_brick_at_level_3(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="depression", distressLevel="critical"
        ))
        assert resp.json()["therapeuticBrick"] == "professional"

    def test_mindfulness_for_anxiety(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="anxiety", distressLevel="light"
        ))
        assert resp.json()["therapeuticBrick"] == "mindfulness"

    def test_psychoeducation_for_burnout(self, client):
        resp = client.post("/solutions", json=base_profile(
            clinicalProfile="burnout", distressLevel="light"
        ))
        assert resp.json()["therapeuticBrick"] == "psychoeducation"


# ─── Adaptation kids/adult ────────────────────────────────────────────────────

class TestModeAdaptation:
    def test_kids_and_adult_resources_differ_at_level_4(self, client):
        kids = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis", distressLevel="critical", mode="kids"
        )).json()["resources"]
        adult = client.post("/solutions", json=base_profile(
            clinicalProfile="crisis", distressLevel="critical", mode="adult"
        )).json()["resources"]
        assert kids != adult

    def test_kids_and_adult_messages_not_empty(self, client):
        for mode in ("kids", "adult"):
            data = client.post("/solutions", json=base_profile(
                emotionId="sadness", clinicalProfile="depression",
                distressLevel="elevated", mode=mode,
            )).json()
            assert len(data["message"]) > 0


# ─── Sécurité — emotionId invalide ───────────────────────────────────────────

class TestSecuritySanitization:
    def test_unknown_emotion_id_still_returns_200(self, client):
        """Un emotionId inconnu ne doit pas crasher — fallback sur messages génériques."""
        resp = client.post("/solutions", json=base_profile(emotionId="<script>alert(1)</script>"))
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["message"]) > 0

    def test_invalid_ml_score_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(mlScore=1.5))
        assert resp.status_code == 422

    def test_negative_self_score_returns_422(self, client):
        resp = client.post("/solutions", json=base_profile(selfScore=-0.1))
        assert resp.status_code == 422
