"""Settings page — API diagnostics."""
import os
from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.services.search_provider import test_google_config

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    google_status = await test_google_config()
    anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
    resend_key = os.getenv("RESEND_API_KEY", "")

    return templates.TemplateResponse("settings.html", {
        "request": request,
        "google_status": google_status,
        "anthropic_set": bool(anthropic_key),
        "anthropic_preview": f"{anthropic_key[:8]}..." if anthropic_key else "Not set",
        "resend_set": bool(resend_key),
        "resend_preview": f"{resend_key[:8]}..." if resend_key else "Not set",
        "from_email": os.getenv("FROM_EMAIL", "Not set"),
    })
