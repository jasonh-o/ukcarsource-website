"""Build stock blocks for inclusion in outreach messages."""
from app.database import SessionLocal
from app.models import CurrentStock


def get_stock_block(drive: str = "LHD") -> str:
    """Return a formatted stock list for inclusion in emails. drive = LHD or RHD."""
    db = SessionLocal()
    try:
        if drive == "LHD":
            items = db.query(CurrentStock).filter(
                CurrentStock.active == True,
                CurrentStock.drive.in_(["LHD", "Both"])
            ).order_by(CurrentStock.stock_type).all()
        else:
            items = db.query(CurrentStock).filter(
                CurrentStock.active == True,
                CurrentStock.drive.in_(["RHD", "Both"])
            ).order_by(CurrentStock.stock_type).all()
    finally:
        db.close()

    if not items:
        return ""

    physical = [i for i in items if i.stock_type == "physical"]
    allocations = [i for i in items if i.stock_type == "allocation"]
    factory = [i for i in items if i.stock_type == "factory-order"]

    def _format(item: CurrentStock) -> str:
        parts = []
        name = f"{item.year or ''} {item.make} {item.model}".strip()
        if item.variant:
            name += f" {item.variant}"
        name += f" ({item.drive})"
        parts.append(f"• {name}")
        details = []
        if item.mileage:
            details.append(f"Approx. {item.mileage:,} miles")
        if item.colour:
            details.append(item.colour)
        if item.interior:
            details.append(f"{item.interior} interior")
        if item.location:
            details.append(item.location)
        if item.notes:
            details.append(item.notes)
        if details:
            parts.append(f"  {' | '.join(details)}")
        return "\n".join(parts)

    sections = []

    if physical:
        sections.append("We currently have the following vehicles in physical stock:\n" +
                        "\n".join(_format(i) for i in physical))

    if allocations:
        sections.append("We also hold confirmed allocations for:\n" +
                        "\n".join(_format(i) for i in allocations))

    if factory:
        sections.append("Available to factory order:\n" +
                        "\n".join(_format(i) for i in factory))

    return "\n\n".join(sections)
