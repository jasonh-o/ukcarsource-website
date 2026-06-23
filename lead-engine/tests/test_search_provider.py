"""Tests for Google search provider error handling."""
import sys
from pathlib import Path
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.search_provider import _friendly_error


def test_no_api_key_returns_no_key_code():
    """_friendly_error not needed here — test the missing key path directly."""
    import asyncio
    from unittest.mock import patch

    async def run():
        from app.services.search_provider import google_search
        with patch.dict("os.environ", {"GOOGLE_SEARCH_API_KEY": "", "GOOGLE_SEARCH_ENGINE_ID": "cx123"}):
            resp = await google_search("test query", api_key="", engine_id="cx123")
        return resp

    resp = asyncio.get_event_loop().run_until_complete(run())
    assert resp.error_code == "NO_KEY"
    assert len(resp.results) == 0


def test_no_engine_id_returns_error():
    """Empty engine_id with a key set causes either NO_CX or a BAD_REQUEST from Google."""
    import asyncio

    async def run():
        from app.services.search_provider import google_search
        # When engine_id is empty and no env var is set, should get NO_CX
        import os
        os.environ.pop("GOOGLE_SEARCH_ENGINE_ID", None)
        resp = await google_search("test query", api_key="AIzaFAKE", engine_id="")
        return resp

    resp = asyncio.get_event_loop().run_until_complete(run())
    assert resp.error_code in ("NO_CX", "BAD_REQUEST", "INVALID_KEY", "FORBIDDEN")
    assert len(resp.results) == 0


def test_friendly_error_invalid_key():
    body = {"error": {"message": "API key not valid", "errors": [{"reason": "keyInvalid"}]}}
    msg, code = _friendly_error(403, body)
    assert code == "INVALID_KEY"
    assert "invalid" in msg.lower() or "key" in msg.lower()


def test_friendly_error_quota_exceeded():
    body = {"error": {"message": "Quota exceeded", "errors": [{"reason": "dailyLimitExceeded"}]}}
    msg, code = _friendly_error(403, body)
    assert code == "QUOTA_EXCEEDED"
    assert "quota" in msg.lower() or "100" in msg


def test_friendly_error_api_not_enabled():
    body = {"error": {"message": "Custom Search API has not been used", "errors": [{"reason": "accessNotConfigured"}]}}
    msg, code = _friendly_error(403, body)
    assert code == "API_NOT_ENABLED"
    assert "enabled" in msg.lower() or "cloud" in msg.lower()


def test_friendly_error_bad_cx():
    body = {"error": {"message": "Request contains an invalid argument", "errors": [{"reason": "invalid"}]},
            "error_details": "cx parameter"}
    msg, code = _friendly_error(400, body)
    assert code in ("INVALID_CX", "BAD_REQUEST")


def test_friendly_error_rate_limited():
    body = {"error": {"message": "Rate limit exceeded", "errors": []}}
    msg, code = _friendly_error(429, body)
    assert code == "RATE_LIMITED"


def test_friendly_error_unknown_status():
    body = {"error": {"message": "Something went wrong", "errors": []}}
    msg, code = _friendly_error(500, body)
    assert code == "UNKNOWN"
    assert "500" in msg
