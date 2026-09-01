import json

from httpx import AsyncClient

from app.core.settings import get_settings


async def post_analysis(client: AsyncClient, token: str, payload: dict, image=None):
    files = {"payload": (None, json.dumps(payload))}
    if image is not None:
        files["image"] = ("photo.jpg", image, "image/jpeg")
    return await client.post(
        "/api/v1/analyses", files=files, headers={"X-Session-Token": token}
    )


# ------------------------------------------------------------------- sessions
async def test_health_reports_database_and_provider(app_client: AsyncClient):
    response = await app_client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["database"] == "ok"
    assert body["ai_provider"] == "mock"


async def test_session_creation_returns_token_and_expiry(app_client: AsyncClient):
    response = await app_client.post("/api/v1/sessions", json={"language": "hi"})
    assert response.status_code == 201
    assert response.json()["token"]
    assert response.json()["expires_at"]


async def test_analysis_requires_a_valid_session(app_client: AsyncClient):
    response = await post_analysis(
        app_client,
        "not-a-real-token",
        {"language": "en", "category_key": "burn", "answers": []},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SESSION_INVALID"


# -------------------------------------------------------------------- content
async def test_categories_come_back_in_the_requested_language(app_client: AsyncClient):
    english = (await app_client.get("/api/v1/content/categories?lang=en")).json()
    hindi = (await app_client.get("/api/v1/content/categories?lang=hi")).json()

    en_burn = next(c for c in english["categories"] if c["key"] == "burn")
    hi_burn = next(c for c in hindi["categories"] if c["key"] == "burn")

    assert en_burn["label"] == "Burn"
    assert hi_burn["label"] != en_burn["label"]
    # label_alt carries the other language, for the dual-label landing cards.
    assert hi_burn["label_alt"] == "Burn"
    assert en_burn["label_alt"] == hi_burn["label"]


async def test_question_ids_are_identical_across_languages(app_client: AsyncClient):
    english = (await app_client.get("/api/v1/content/categories/burn?lang=en")).json()
    hindi = (await app_client.get("/api/v1/content/categories/burn?lang=hi")).json()

    assert [q["id"] for q in english["questions"]] == [
        q["id"] for q in hindi["questions"]
    ]
    assert english["questions"][0]["text"] != hindi["questions"][0]["text"]


async def test_escalation_metadata_is_not_exposed_to_clients(app_client: AsyncClient):
    body = (await app_client.get("/api/v1/content/categories/burn?lang=en")).json()
    for question in body["questions"]:
        for option in question["options"]:
            assert set(option) == {"id", "text"}


async def test_unknown_language_is_rejected(app_client: AsyncClient):
    response = await app_client.get("/api/v1/content/categories?lang=fr")
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


async def test_unknown_category_returns_not_found(app_client: AsyncClient):
    response = await app_client.get("/api/v1/content/categories/sunburn?lang=en")
    assert response.status_code == 404


# ------------------------------------------------------------------- analyses
async def test_non_critical_answers_are_analysed_by_the_ai(
    app_client: AsyncClient, session_token: str
):
    response = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "burn",
            "patient_context": "adult",
            "answers": [
                {"question_id": "burn_breathing", "option_id": "breathing_normal"},
                {"question_id": "burn_size", "option_id": "smaller_than_palm"},
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "ai"
    assert body["immediate_actions"]
    assert body["id"]


async def test_critical_answer_short_circuits_without_calling_the_ai(
    app_client: AsyncClient, session_token: str
):
    """A hard rule must return verified content immediately, not AI output."""
    response = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "burn",
            "patient_context": "child",
            "answers": [
                {"question_id": "burn_breathing", "option_id": "breathing_difficult"}
            ],
        },
    )
    body = response.json()
    assert body["risk_level"] == "CRITICAL"
    assert body["source"] == "rules"
    assert body["emergency"] == {"call_112": True, "call_108": True}


async def test_hindi_request_gets_hindi_guidance(
    app_client: AsyncClient, session_token: str
):
    response = await post_analysis(
        app_client,
        session_token,
        {
            "language": "hi",
            "category_key": "cut",
            "patient_context": "elderly",
            "answers": [
                {"question_id": "cut_bleeding_control", "option_id": "bleeding_stopped"}
            ],
        },
    )
    body = response.json()
    assert body["summary"]
    # Devanagari must be present, and the guidance must not be English.
    assert any("\u0900" <= ch <= "\u097f" for ch in body["summary"])
    assert body["sources"]
    assert any("\u0900" <= ch <= "\u097f" for ch in body["sources"][0]["label"])


async def test_other_flow_requires_a_description(
    app_client: AsyncClient, session_token: str
):
    response = await post_analysis(
        app_client,
        session_token,
        {"language": "en", "category_key": "other", "answers": None},
    )
    assert response.status_code == 422
    assert response.json()["error"]["fields"]["description"] == "required_for_other"


async def test_other_flow_with_description_succeeds(
    app_client: AsyncClient, session_token: str
):
    response = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "other",
            "patient_context": "adult",
            "description": "My brother fainted after standing in the sun.",
        },
    )
    assert response.status_code == 200
    assert response.json()["immediate_actions"]


async def test_unknown_option_id_is_rejected(
    app_client: AsyncClient, session_token: str
):
    response = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "burn",
            "answers": [
                {"question_id": "burn_size", "option_id": "the_whole_body"}
            ],
        },
    )
    assert response.status_code == 422


async def test_result_can_be_refetched_by_its_owner(
    app_client: AsyncClient, session_token: str
):
    created = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "burn",
            "answers": [
                {"question_id": "burn_size", "option_id": "smaller_than_palm"}
            ],
        },
    )
    analysis_id = created.json()["id"]

    refetched = await app_client.get(
        f"/api/v1/analyses/{analysis_id}", headers={"X-Session-Token": session_token}
    )
    assert refetched.status_code == 200
    assert refetched.json()["id"] == analysis_id
    assert refetched.json()["summary"] == created.json()["summary"]


async def test_another_session_cannot_read_someone_elses_result(
    app_client: AsyncClient, session_token: str
):
    """The privacy hole from the previous API design must stay closed."""
    created = await post_analysis(
        app_client,
        session_token,
        {
            "language": "en",
            "category_key": "burn",
            "answers": [
                {"question_id": "burn_size", "option_id": "smaller_than_palm"}
            ],
        },
    )
    analysis_id = created.json()["id"]

    other_token = (
        await app_client.post("/api/v1/sessions", json={"language": "en"})
    ).json()["token"]

    response = await app_client.get(
        f"/api/v1/analyses/{analysis_id}", headers={"X-Session-Token": other_token}
    )
    # 404 rather than 403, so the response does not confirm the id exists.
    assert response.status_code == 404


# --------------------------------------------------------------- rate limiting
async def test_session_analysis_rate_limit_applies(
    app_client: AsyncClient, session_token: str
):
    payload = {
        "language": "en",
        "category_key": "burn",
        "answers": [{"question_id": "burn_size", "option_id": "smaller_than_palm"}],
    }
    allowed = get_settings().analyses_per_session_per_minute
    statuses = []
    for _ in range(allowed + 2):
        response = await post_analysis(app_client, session_token, payload)
        statuses.append(response.status_code)

    assert statuses.count(200) == allowed
    assert 429 in statuses
    last = await post_analysis(app_client, session_token, payload)
    assert last.json()["error"]["retry_after_seconds"] > 0


async def test_session_creation_is_rate_limited_per_ip(app_client: AsyncClient):
    """Without this, minting sessions would bypass the per-session limit."""
    allowed = get_settings().sessions_per_ip_per_hour
    statuses = [
        (await app_client.post("/api/v1/sessions", json={"language": "en"})).status_code
        for _ in range(allowed + 2)
    ]
    assert statuses.count(201) == allowed
    assert statuses.count(429) == 2


# -------------------------------------------------------------------- internal
async def test_cleanup_requires_the_internal_secret(app_client: AsyncClient):
    unauthorised = await app_client.post("/api/v1/internal/cleanup")
    assert unauthorised.status_code == 401

    authorised = await app_client.post(
        "/api/v1/internal/cleanup", headers={"X-Internal-Secret": "test-secret"}
    )
    assert authorised.status_code == 200
    assert "deleted_sessions" in authorised.json()
