import os
from datetime import datetime, date
from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from sqlalchemy import func
from sqlalchemy.orm import Session
from dotenv import load_dotenv

load_dotenv()

from app.database import get_db, init_db
from app.models import Buyer, DiscoveryRun, OutreachMessage
from app.services.lookalike import get_lookalike_prospects
from app.routers import buyers, discovery, offers, rules, leads, webhooks, settings, stock

app = FastAPI(title="UK Car Source — Lead Engine", version="1.0.0")

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

# Register routers
app.include_router(buyers.router)
app.include_router(discovery.router)
app.include_router(offers.router)
app.include_router(rules.router)
app.include_router(leads.router)
app.include_router(webhooks.router)
app.include_router(settings.router)
app.include_router(stock.router)


@app.on_event("startup")
async def startup():
    init_db()
    _setup_scheduler()


def _setup_scheduler():
    run_time = os.getenv("DISCOVERY_RUN_TIME", "08:00")
    try:
        hour, minute = [int(x) for x in run_time.split(":")]
    except ValueError:
        hour, minute = 8, 0

    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        from app.database import SessionLocal
        from app.services.discovery import run_discovery

        scheduler = AsyncIOScheduler()

        async def scheduled_run():
            db = SessionLocal()
            try:
                await run_discovery(db)
            finally:
                db.close()

        scheduler.add_job(scheduled_run, CronTrigger(hour=hour, minute=minute))
        scheduler.start()
        print(f"Scheduler started — discovery runs daily at {hour:02d}:{minute:02d}")
    except Exception as e:
        print(f"Scheduler setup failed: {e}")


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request, db: Session = Depends(get_db)):
    today = date.today()

    total_buyers = db.query(func.count(Buyer.id)).scalar()
    new_today = db.query(func.count(Buyer.id)).filter(
        func.date(Buyer.discovery_date) == today
    ).scalar()
    new_this_week = db.query(func.count(Buyer.id)).filter(
        Buyer.discovery_date >= datetime.combine(
            date.fromisocalendar(today.year, today.isocalendar()[1], 1),
            datetime.min.time()
        )
    ).scalar()
    pending_queue = db.query(func.count(OutreachMessage.id)).filter(
        OutreachMessage.status == "pending"
    ).scalar()

    # Buyers by country (top 10)
    by_country = (
        db.query(Buyer.country, func.count(Buyer.id).label("cnt"))
        .filter(Buyer.country.isnot(None))
        .group_by(Buyer.country)
        .order_by(func.count(Buyer.id).desc())
        .limit(10)
        .all()
    )

    # Top 20 prospects by score
    top_prospects = db.query(Buyer).order_by(Buyer.lead_score.desc()).limit(20).all()

    # Recent discovery runs
    recent_runs = db.query(DiscoveryRun).order_by(DiscoveryRun.started_at.desc()).limit(5).all()

    # Lookalike prospects
    lookalikes = get_lookalike_prospects(db, top_n=5)

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "total_buyers": total_buyers,
        "new_today": new_today,
        "new_this_week": new_this_week,
        "pending_queue": pending_queue,
        "by_country": by_country,
        "top_prospects": top_prospects,
        "recent_runs": recent_runs,
        "lookalikes": lookalikes,
        "today": today,
    })
