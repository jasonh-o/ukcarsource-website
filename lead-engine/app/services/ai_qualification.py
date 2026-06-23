"""Claude API integration for buyer qualification, classification, and analysis."""
import os
import json
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class QualificationResult:
    buyer_type: str = "unknown"
    confidence: float = 0.0
    reasoning: str = ""
    brands_detected: list[str] = field(default_factory=list)
    vehicle_segment: str = "unknown"
    rhd_preference: str = "unknown"
    import_signal: bool = False
    recommended_score_boost: float = 0.0
    error: Optional[str] = None


def _client():
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        return None
    import anthropic
    return anthropic.Anthropic(api_key=api_key)


async def qualify_buyer(company_name: str, website_text: str, country: str) -> QualificationResult:
    """Use Claude to classify a buyer and return structured qualification data."""
    client = _client()
    if not client:
        return QualificationResult(error="ANTHROPIC_API_KEY not set")

    prompt = f"""You are a B2B automotive export intelligence analyst for UK Car Source, a UK-based prestige vehicle exporter.

Analyse the following company and classify them as a potential buyer.

Company: {company_name}
Country: {country}
Website content snippet:
---
{website_text[:3000]}
---

Respond ONLY with a valid JSON object in this exact format:
{{
  "buyer_type": "luxury dealer | mainstream dealer | wholesaler | importer | exporter | fleet buyer | unknown",
  "confidence": 0.0,
  "reasoning": "1-2 sentence explanation",
  "brands_detected": ["Brand1", "Brand2"],
  "vehicle_segment": "luxury | premium | mainstream | mixed | unknown",
  "rhd_preference": "rhd | lhd | mixed | unknown",
  "import_signal": true,
  "recommended_score_boost": 0.0
}}

confidence: 0.0 to 1.0
recommended_score_boost: -10 to +20 (suggest adjusting lead score based on your analysis)
"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # Strip markdown code fences if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
        return QualificationResult(**{k: data.get(k, v) for k, v in QualificationResult.__dataclass_fields__.items()})
    except json.JSONDecodeError as e:
        return QualificationResult(error=f"JSON parse error: {e}")
    except Exception as e:
        return QualificationResult(error=str(e))


async def generate_analysis_summary(buyer_dict: dict) -> str:
    """Generate a short analyst-style summary of a buyer for the CRM detail page."""
    client = _client()
    if not client:
        return "AI analysis unavailable — ANTHROPIC_API_KEY not set."

    prompt = f"""You are a senior export sales analyst at UK Car Source.

Write a 3-4 sentence analyst note about this potential buyer. Be specific and commercial. No waffle.

Buyer data:
{json.dumps(buyer_dict, indent=2, default=str)[:2000]}

Focus on: why they are (or aren't) a good prospect, what vehicles likely suit them, and what the opening approach should be.
"""
    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()
    except Exception as e:
        return f"Analysis error: {e}"
