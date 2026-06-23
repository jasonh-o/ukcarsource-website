"""Approval queue — view, approve, edit, reject outreach messages."""
from datetime import datetime
from fastapi import APIRouter, Depends, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import OutreachMessage, Buyer
from app.services.email_sender import send_email

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/queue", response_class=HTMLResponse)
async def queue_page(
    request: Request,
    db: Session = Depends(get_db),
    channel: str = "",
    status: str = "pending",
    offer: str = "",
):
    query = db.query(OutreachMessage)
    if channel:
        query = query.filter(OutreachMessage.channel == channel)
    if status:
        query = query.filter(OutreachMessage.status == status)
    if offer:
        query = query.filter(OutreachMessage.linked_offer_id == int(offer))
    messages = query.order_by(OutreachMessage.created_at.desc()).limit(200).all()
    pending_count = db.query(OutreachMessage).filter(OutreachMessage.status == "pending").count()
    return templates.TemplateResponse("queue.html", {
        "request": request,
        "messages": messages,
        "channel": channel,
        "status": status,
        "pending_count": pending_count,
    })


@router.post("/queue/{msg_id}/approve")
async def approve_message(msg_id: int, db: Session = Depends(get_db)):
    msg = db.get(OutreachMessage, msg_id)
    if not msg:
        return RedirectResponse("/queue", status_code=303)

    msg.status = "approved"
    msg.approved_at = datetime.utcnow()
    db.commit()

    # Send email immediately after approval
    if msg.channel == "email":
        buyer = db.get(Buyer, msg.buyer_id)
        if buyer and buyer.email:
            result = await send_email(
                to=buyer.email,
                subject=msg.subject or "UK Car Source — Vehicle Export Enquiry",
                body=msg.body,
            )
            if result.success:
                msg.status = "sent"
                msg.sent_at = datetime.utcnow()
                buyer.email_sent_count += 1
                buyer.last_contacted = datetime.utcnow()
            else:
                # Keep as approved but note the send failure in body
                msg.body = msg.body + f"\n\n[Send failed: {result.error}]"
            db.commit()

    return RedirectResponse("/queue?status=approved", status_code=303)


@router.post("/queue/{msg_id}/reject")
async def reject_message(msg_id: int, db: Session = Depends(get_db)):
    msg = db.get(OutreachMessage, msg_id)
    if msg:
        msg.status = "rejected"
        db.commit()
    return RedirectResponse("/queue", status_code=303)


@router.post("/queue/{msg_id}/edit")
async def edit_message(
    msg_id: int,
    subject: str = Form(""),
    body: str = Form(...),
    db: Session = Depends(get_db),
):
    msg = db.get(OutreachMessage, msg_id)
    if msg:
        if subject:
            msg.subject = subject
        msg.body = body
        db.commit()
    return RedirectResponse("/queue", status_code=303)


@router.post("/queue/bulk-approve")
async def bulk_approve(ids: str = Form(...), db: Session = Depends(get_db)):
    id_list = [int(i) for i in ids.split(",") if i.strip().isdigit()]
    now = datetime.utcnow()
    for msg_id in id_list:
        msg = db.get(OutreachMessage, msg_id)
        if msg and msg.status == "pending":
            msg.status = "approved"
            msg.approved_at = now
            # Send emails
            if msg.channel == "email":
                buyer = db.get(Buyer, msg.buyer_id)
                if buyer and buyer.email:
                    result = await send_email(
                        to=buyer.email,
                        subject=msg.subject or "UK Car Source — Vehicle Export Enquiry",
                        body=msg.body,
                    )
                    if result.success:
                        msg.status = "sent"
                        msg.sent_at = now
                        buyer.email_sent_count += 1
                        buyer.last_contacted = now
    db.commit()
    return RedirectResponse("/queue", status_code=303)
