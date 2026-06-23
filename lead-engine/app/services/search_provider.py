"""Search provider — uses SerpApi (primary) with Google Custom Search as fallback."""
import os
import httpx
from dataclasses import dataclass
from typing import Optional


SERPAPI_URL = "https://serpapi.com/search.json"
GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"

# Sites to exclude from all search queries
EXCLUDED_SITES = [
    "dubizzle.com", "zigwheels.com", "carsemsar.com", "opensooq.com",
    "haraj.com.sa", "olx.com", "olx.co.id", "olx.co.za", "cars45.com",
    "cheki.co.ke", "jiji.ng", "jiji.co.ke", "tonaton.com", "yallamotor.com",
    "motory.com", "carswitch.com", "reddit.com", "quora.com", "youtube.com",
    "facebook.com", "instagram.com", "tripadvisor.com", "wikipedia.org",
    "autotrader.co.uk", "pistonheads.com", "autocar.co.uk", "whatcar.com",
    "parkers.co.uk", "honestjohn.co.uk", "gulfnews.com", "khaleejtimes.com",
    "arabianbusiness.com", "thenationalnews.com", "forbes.com", "bloomberg.com",
]

def _build_query(query: str) -> str:
    """Append site exclusions to the search query."""
    exclusions = " ".join(f"-site:{s}" for s in EXCLUDED_SITES[:10])  # SerpApi handles ~10
    return f"{query} {exclusions}"


@dataclass
class SearchResult:
    title: str
    link: str
    snippet: str
    display_link: str


@dataclass
class SearchResponse:
    results: list[SearchResult]
    total_results: int
    error: Optional[str] = None
    error_code: Optional[str] = None


async def _serpapi_search(query: str, num: int = 10) -> SearchResponse:
    api_key = os.getenv("SERPAPI_KEY", "")
    if not api_key:
        return SearchResponse([], 0, error="SERPAPI_KEY not set", error_code="NO_KEY")

    params = {
        "q": _build_query(query),
        "api_key": api_key,
        "num": min(num, 10),
        "engine": "google",
    }

    async with httpx.AsyncClient(timeout=20) as client:
        try:
            resp = await client.get(SERPAPI_URL, params=params)
        except httpx.RequestError as exc:
            return SearchResponse([], 0, error=f"Network error: {exc}", error_code="NETWORK_ERROR")

    if resp.status_code != 200:
        return SearchResponse([], 0, error=f"SerpApi error {resp.status_code}", error_code="SERPAPI_ERROR")

    data = resp.json()

    if "error" in data:
        msg = data["error"]
        if "Invalid API key" in msg:
            return SearchResponse([], 0, error="SerpApi key is invalid.", error_code="INVALID_KEY")
        if "limit" in msg.lower():
            return SearchResponse([], 0, error="SerpApi monthly limit reached.", error_code="QUOTA_EXCEEDED")
        return SearchResponse([], 0, error=msg, error_code="SERPAPI_ERROR")

    items = data.get("organic_results", [])
    results = [
        SearchResult(
            title=item.get("title", ""),
            link=item.get("link", ""),
            snippet=item.get("snippet", ""),
            display_link=item.get("displayed_link", ""),
        )
        for item in items
    ]
    return SearchResponse(results=results, total_results=len(results))


def _friendly_google_error(status_code: int, body: dict) -> tuple:
    error = body.get("error", {})
    message = error.get("message", "")
    errors = error.get("errors", [{}])
    reason = errors[0].get("reason", "") if errors else ""

    if status_code == 403:
        if "keyInvalid" in reason:
            return ("API key is invalid.", "INVALID_KEY")
        if "dailyLimitExceeded" in reason or "rateLimitExceeded" in reason:
            return ("Google quota exceeded.", "QUOTA_EXCEEDED")
        if "accessNotConfigured" in reason or "Custom Search" in message:
            return ("Custom Search API not enabled in Google Cloud.", "API_NOT_ENABLED")
        return (f"Access denied: {message}", "FORBIDDEN")
    if status_code == 429:
        return ("Rate limited.", "RATE_LIMITED")
    return (f"Google API error {status_code}: {message}", "UNKNOWN")


async def _google_search(query: str, num: int = 10) -> SearchResponse:
    api_key = os.getenv("GOOGLE_SEARCH_API_KEY", "")
    engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID", "")

    if not api_key or not engine_id:
        return SearchResponse([], 0, error="Google keys not set", error_code="NO_KEY")

    params = {"key": api_key, "cx": engine_id, "q": query, "num": min(num, 10)}
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(GOOGLE_SEARCH_URL, params=params)
        except httpx.RequestError as exc:
            return SearchResponse([], 0, error=str(exc), error_code="NETWORK_ERROR")

    if resp.status_code != 200:
        body = {}
        try:
            body = resp.json()
        except Exception:
            pass
        msg, code = _friendly_google_error(resp.status_code, body)
        return SearchResponse([], 0, error=msg, error_code=code)

    data = resp.json()
    items = data.get("items", [])
    results = [
        SearchResult(
            title=item.get("title", ""),
            link=item.get("link", ""),
            snippet=item.get("snippet", ""),
            display_link=item.get("displayLink", ""),
        )
        for item in items
    ]
    return SearchResponse(results=results, total_results=int(data.get("searchInformation", {}).get("totalResults", 0)))


async def google_search(
    query: str,
    api_key: Optional[str] = None,
    engine_id: Optional[str] = None,
    num: int = 10,
    site_restrict: bool = False,
) -> SearchResponse:
    """Search using SerpApi (primary) or Google Custom Search (fallback)."""
    # Try SerpApi first
    serpapi_key = os.getenv("SERPAPI_KEY", "")
    if serpapi_key:
        result = await _serpapi_search(query, num)
        if not result.error or result.error_code == "QUOTA_EXCEEDED":
            return result
        # Fall through to Google if SerpApi fails for non-quota reasons

    # Fallback to Google Custom Search
    return await _google_search(query, num)


async def test_google_config() -> dict:
    """Return diagnostic dict for the settings page."""
    serpapi_key = os.getenv("SERPAPI_KEY", "")
    google_key = os.getenv("GOOGLE_SEARCH_API_KEY", "")
    engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID", "")

    status = {
        "api_key_set": bool(serpapi_key or google_key),
        "engine_id_set": bool(engine_id or serpapi_key),
        "working": False,
        "error": None,
        "provider": "SerpApi" if serpapi_key else "Google Custom Search",
    }

    resp = await google_search("UK car exporter", num=1)
    if resp.error:
        status["error"] = resp.error
    else:
        status["working"] = True
    return status
