"""Send approved emails via Resend."""
import os
import httpx
from dataclasses import dataclass
from typing import Optional


@dataclass
class SendResult:
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


async def send_email(to: str, subject: str, body: str) -> SendResult:
    api_key = os.getenv("RESEND_API_KEY", "")
    from_email = os.getenv("FROM_EMAIL", "sales@ukcarsource.com")
    from_name = os.getenv("FROM_NAME", "Jason | UK Car Source")

    if not api_key or api_key == "your_resend_api_key_here":
        return SendResult(success=False, error="RESEND_API_KEY not configured.")

    # Convert plain text body to simple HTML
    html_body = body.replace("\n", "<br>")

    payload = {
        "from": f"{from_name} <{from_email}>",
        "to": [to],
        "subject": subject,
        "html": f"<div style='font-family:Arial,sans-serif;font-size:14px;line-height:1.6;'>{html_body}</div>",
        "text": body,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                "https://api.resend.com/emails",
                json=payload,
                headers={"Authorization": f"Bearer {api_key}"},
            )
        except httpx.RequestError as exc:
            return SendResult(success=False, error=f"Network error: {exc}")

    if resp.status_code in (200, 201):
        data = resp.json()
        return SendResult(success=True, message_id=data.get("id"))

    try:
        error_msg = resp.json().get("message", resp.text)
    except Exception:
        error_msg = resp.text
    return SendResult(success=False, error=f"Resend error {resp.status_code}: {error_msg}")
