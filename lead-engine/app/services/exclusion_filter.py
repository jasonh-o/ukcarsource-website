"""Filter out official/franchise dealers, news articles, and non-buyer results."""
import json
import tldextract
from pathlib import Path

CONFIG = Path(__file__).resolve().parent.parent.parent / "config"


def _rules():
    return json.loads((CONFIG / "exclusion_rules.json").read_text())


def should_exclude(candidate: dict) -> tuple:
    """
    Returns (True, reason) if the candidate should be excluded, else (False, '').
    """
    rules = _rules()
    name = (candidate.get("company_name") or "").lower()
    website = (candidate.get("website") or "").lower()
    snippet = (candidate.get("notes") or "").lower()

    # 1. News/media domain check
    if website:
        ext = tldextract.extract(website)
        domain = f"{ext.domain}.{ext.suffix}".lower()
        full_domain = f"{ext.subdomain}.{ext.domain}.{ext.suffix}".lower().lstrip(".")
        for news_domain in rules.get("news_domains", []):
            if domain == news_domain or full_domain.endswith(news_domain):
                return True, f"News/media site: {domain}"

    # 2. Manufacturer domain check
    if website:
        ext = tldextract.extract(website)
        domain = f"{ext.domain}.{ext.suffix}".lower()
        for mfr_domain in rules["manufacturer_domains"]:
            if domain == mfr_domain or domain.endswith("." + mfr_domain):
                return True, f"Manufacturer domain: {domain}"

    # 3. Headline/news title pattern check
    for phrase in rules.get("title_headline_keywords", []):
        if phrase in name:
            return True, f"Looks like a news headline: '{phrase.strip()}'"

    # 4. Name keyword check (franchise signals)
    for keyword in rules["name_keywords"]:
        if keyword in name:
            return True, f"Franchise keyword in name: '{keyword}'"

    # 5. Dealer group name check
    for group in rules["dealer_group_names"]:
        if group in name:
            return True, f"Known franchise group: '{group}'"

    # 6. Snippet phrase check
    for phrase in rules["snippet_phrases"]:
        if phrase in snippet:
            return True, f"Franchise signal in description: '{phrase}'"

    # 6a. Brand-country domain pattern check (e.g. jaguar-oman.com, bmw-dubai.com, porsche-qatar.com)
    if website:
        ext = tldextract.extract(website)
        domain_lower = f"{ext.domain}.{ext.suffix}".lower()
        brand_names = [
            "jaguar", "landrover", "land-rover", "rollsroyce", "rolls-royce",
            "bentley", "porsche", "ferrari", "lamborghini", "mclaren",
            "astonmartin", "aston-martin", "mercedes", "mercedesbenz",
            "mercedes-benz", "bmw", "audi", "lexus", "toyota", "nissan",
            "honda", "ford", "volkswagen", "volvo", "maserati",
        ]
        for brand in brand_names:
            if domain_lower.startswith(brand + "-") or domain_lower.startswith(brand + ".") or ("-" + brand + ".") in domain_lower:
                return True, f"Brand-country domain detected: {domain_lower}"

    # 6b. Government website check
    if website:
        ext = tldextract.extract(website)
        full = f"{ext.subdomain}.{ext.domain}.{ext.suffix}".lower().lstrip(".")
        # Block .gov.* domains and common government TLDs
        if ".gov." in full or full.endswith(".gov") or ext.suffix in ("gov", "gov.om", "gov.ae", "gov.sa", "gov.kw", "gov.qa", "gov.bh", "gov.ke", "gov.za", "gov.uk"):
            return True, f"Government website: {full}"
        # Also catch customs, ministry, municipality, police, transport authority sites
        gov_keywords = ["customs.", "ministry", "municipality", "transport.gov", "rta.", "tra.", "moi.", "mot."]
        for kw in gov_keywords:
            if kw in full:
                return True, f"Government/authority website: {full}"

    # 7. Email domain check for known franchise groups
    email = (candidate.get("email") or "").lower()
    franchise_email_domains = [
        "gargash-merxedesbenz.com", "gargash.ae", "agmc.ae",
        "altayermotors.com", "altayer.com", "abudhabi-motors.com",
        "alghanim.com", "almullagroup.com", "nbkautomotive.com",
        "bmw.com", "mercedes-benz.com", "landrover.com",
        "rolls-roycemotorcars.com", "bentleymotors.com",
    ]
    for domain in franchise_email_domains:
        if email.endswith("@" + domain) or ("@" + domain) in email:
            return True, f"Franchise email domain: {domain}"

    return False, ""
