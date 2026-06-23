import asyncio
from fastapi import APIRouter, Depends, Request, Form, BackgroundTasks
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import DiscoveryRun
from app.services.discovery import run_discovery

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

_running = False


@router.get("/discovery", response_class=HTMLResponse)
async def discovery_page(request: Request, db: Session = Depends(get_db)):
    runs = db.query(DiscoveryRun).order_by(DiscoveryRun.started_at.desc()).limit(20).all()
    return templates.TemplateResponse("discovery.html", {
        "request": request, "runs": runs, "running": _running,
    })


@router.post("/discovery/run")
async def trigger_run(
    background_tasks: BackgroundTasks,
    countries: str = Form(""),
    db: Session = Depends(get_db),
):
    global _running
    if _running:
        return RedirectResponse("/discovery?error=already_running", status_code=303)
    _running = True
    country_list = [c.strip() for c in countries.split(",") if c.strip()] or None
    background_tasks.add_task(_run_and_reset, country_list, db)
    return RedirectResponse("/discovery?started=1", status_code=303)


async def _run_and_reset(country_list, db):
    global _running
    try:
        await run_discovery(db, country_list)
    finally:
        _running = False


@router.post("/discovery/purge-rejected")
async def purge_rejected(db: Session = Depends(get_db)):
    from app.services.discovery import purge_rejected_buyers
    count = purge_rejected_buyers(db)
    return RedirectResponse(f"/discovery?purged={count}", status_code=303)


@router.get("/discovery/status", response_class=JSONResponse)
async def discovery_status(db: Session = Depends(get_db)):
    latest = db.query(DiscoveryRun).order_by(DiscoveryRun.started_at.desc()).first()
    return {"running": _running, "latest_run_id": latest.id if latest else None}


@router.get("/discovery/run/{run_id}", response_class=HTMLResponse)
async def run_detail(request: Request, run_id: int, db: Session = Depends(get_db)):
    run = db.get(DiscoveryRun, run_id)
    if not run:
        return HTMLResponse("Run not found", status_code=404)
    return templates.TemplateResponse("discovery_run.html", {"request": request, "run": run})
