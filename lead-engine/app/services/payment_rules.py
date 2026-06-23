"""Country payment rule lookup from config."""
import json
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


def _load():
    return json.loads((CONFIG / "payment_rules.json").read_text())


def get_payment_method_for_country(country: str) -> str:
    data = _load()
    return data["country_defaults"].get(country, "TT")


def get_payment_method_details(method: str) -> dict:
    data = _load()
    return data["methods"].get(method, {})


def get_all_methods() -> dict:
    return _load()["methods"]


def payment_terms_for_buyer(country: str) -> dict:
    method = get_payment_method_for_country(country)
    details = get_payment_method_details(method)
    return {
        "method": method,
        "name": details.get("name", method),
        "deposit_percent": details.get("deposit_percent", 30),
        "balance_trigger": details.get("balance_trigger", "on_shipping_docs"),
        "notes": details.get("notes", ""),
    }
