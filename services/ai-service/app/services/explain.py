import json
import re

from app.models.valuation import Explanation
from app.providers.chat import ChatMessage
from app.providers.chat_instrumentation import InstrumentedChat
from app.services.valuation import ValuationResult

SYSTEM = (
    "TASK:valuation_explain\n"
    "You explain a price range to a seller in ONE sentence. You are given a JSON object with the "
    "comparables, median and range, already computed. Restate those numbers; never compute, estimate "
    "or invent any number that is not in the input. Reply with the sentence only."
)

_NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def allowed_numbers(res: ValuationResult) -> set[int]:
    vals = [res.p25, res.median, res.p75, *[c.price for c in res.comparables], float(len(res.comparables))]
    return {round(v) for v in vals if v is not None}


def numbers_are_grounded(sentence: str, allowed: set[int]) -> bool:
    for m in _NUM.findall(sentence):
        n = float(m.replace(",", ""))
        # tolerate rounding to the nearest 100 / 1k only when it matches an allowed value
        if round(n) not in allowed and not any(abs(n - a) <= max(50, a * 0.005) for a in allowed):
            return False
    return True


def template_sentence(res: ValuationResult) -> str:
    assert res.median is not None and res.p25 is not None and res.p75 is not None
    return (
        f"Based on {len(res.comparables)} similar sold listings, items like this typically close around "
        f"₹{round(res.median):,}, mostly between ₹{round(res.p25):,} and ₹{round(res.p75):,}."
    )


async def explain(chat: InstrumentedChat, res: ValuationResult) -> str | None:
    if res.status != "ok":
        return None
    payload = json.dumps(
        {
            "median": round(res.median or 0),
            "p25": round(res.p25 or 0),
            "p75": round(res.p75 or 0),
            "comparables": [{"title": c.title, "price": round(c.price)} for c in res.comparables[:8]],
        }
    )
    try:
        out = await chat.complete(
            system=SYSTEM, messages=[ChatMessage(role="user", content=payload)], tools=[], feature="valuation_explain"
        )
        parsed = Explanation(sentence=(out.text or "").strip())
    except Exception:  # provider outage or schema failure: degrade, never fail the request
        chat.mark_validation_failed("valuation_explain")
        return template_sentence(res)
    if not numbers_are_grounded(parsed.sentence, allowed_numbers(res)):
        chat.mark_validation_failed("valuation_explain")
        return template_sentence(res)
    return parsed.sentence
