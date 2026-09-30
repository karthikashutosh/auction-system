import json
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg
from pydantic import BaseModel, ValidationError

from app.core.db import acquire
from app.core.tracing import span
from app.models.agent import (
    AccountMetadata,
    AccountMetadataInput,
    BidderHistory,
    BidderHistoryInput,
    BidRecord,
    BidTimeline,
    BidTimelineInput,
    SellerAuctions,
    SellerAuctionsInput,
    SellerAuctionSummary,
    TimelineBid,
    ToolError,
)
from app.providers.chat import ToolSpec

ToolResult = BidderHistory | SellerAuctions | BidTimeline | AccountMetadata | ToolError
Handler = Callable[[asyncpg.Connection, Any], Awaitable[ToolResult]]


async def get_bidder_history(conn: asyncpg.Connection, inp: BidderHistoryInput) -> ToolResult:
    agg = await conn.fetchrow(
        """SELECT count(*) AS total, count(DISTINCT b.auction_id) AS auctions, count(DISTINCT a.owner_id) AS sellers
           FROM bids b JOIN auctions a ON a.id = b.auction_id WHERE b.user_id = $1""",
        inp.user_id,
    )
    assert agg is not None
    if agg["total"] == 0:
        return ToolError(code="not_found", message="no bids found for this user")
    top = await conn.fetchrow(
        """SELECT a.owner_id, count(*) AS n FROM bids b JOIN auctions a ON a.id = b.auction_id
           WHERE b.user_id = $1 GROUP BY a.owner_id ORDER BY n DESC LIMIT 1""",
        inp.user_id,
    )
    assert top is not None
    recent = await conn.fetch(
        """SELECT b.auction_id, a.owner_id, b.amount::float AS amount, b.created_at
           FROM bids b JOIN auctions a ON a.id = b.auction_id WHERE b.user_id = $1
           ORDER BY b.created_at DESC LIMIT 25""",
        inp.user_id,
    )
    return BidderHistory(
        user_id=inp.user_id,
        total_bids=agg["total"],
        distinct_auctions=agg["auctions"],
        distinct_sellers=agg["sellers"],
        top_seller_id=top["owner_id"],
        top_seller_share=round(top["n"] / agg["total"], 3),
        recent_bids=[
            BidRecord(auction_id=r["auction_id"], seller_id=r["owner_id"], amount=r["amount"], at=r["created_at"])
            for r in recent
        ],
    )


async def get_seller_auctions(conn: asyncpg.Connection, inp: SellerAuctionsInput) -> ToolResult:
    rows = await conn.fetch(
        """
        SELECT a.id, a.title, a.status, a.current_price::float AS price,
               count(b.id) AS bid_count, count(DISTINCT b.user_id) AS bidders,
               (SELECT user_id FROM bids x WHERE x.auction_id = a.id GROUP BY user_id
                  ORDER BY count(*) DESC LIMIT 1) AS top_bidder,
               COALESCE((SELECT max(c) FROM (SELECT count(*) AS c FROM bids x WHERE x.auction_id = a.id
                  GROUP BY user_id) t)::float / NULLIF(count(b.id), 0), 0) AS top_share
        FROM auctions a LEFT JOIN bids b ON b.auction_id = a.id
        WHERE a.owner_id = $1 GROUP BY a.id ORDER BY a.end_time DESC LIMIT 30
        """,
        inp.seller_id,
    )
    if not rows:
        return ToolError(code="not_found", message="seller has no auctions")
    return SellerAuctions(
        seller_id=inp.seller_id,
        auction_count=len(rows),
        auctions=[
            SellerAuctionSummary(
                auction_id=r["id"], title=r["title"], status=r["status"], final_price=r["price"],
                bid_count=r["bid_count"], distinct_bidders=r["bidders"], top_bidder_id=r["top_bidder"],
                top_bidder_share=round(float(r["top_share"]), 3),
            )
            for r in rows
        ],
    )


async def get_bid_timeline(conn: asyncpg.Connection, inp: BidTimelineInput) -> ToolResult:
    rows = await conn.fetch(
        """SELECT b.id, b.user_id, b.amount::float AS amount, b.created_at,
                  EXTRACT(EPOCH FROM (b.created_at - lag(b.created_at) OVER (ORDER BY b.created_at)))::float AS gap,
                  EXTRACT(EPOCH FROM (a.end_time - b.created_at))::float AS to_close
           FROM bids b JOIN auctions a ON a.id = b.auction_id
           WHERE b.auction_id = $1 ORDER BY b.created_at""",
        inp.auction_id,
    )
    if not rows:
        return ToolError(code="not_found", message="auction not found or has no bids")
    rows = rows[-60:]  # keep the tool result bounded for the model's context
    return BidTimeline(
        auction_id=inp.auction_id,
        bid_count=len(rows),
        bids=[
            TimelineBid(bid_id=r["id"], user_id=r["user_id"], amount=r["amount"], at=r["created_at"],
                        seconds_since_previous=r["gap"], seconds_before_close=r["to_close"])
            for r in rows
        ],
    )


async def get_account_metadata(conn: asyncpg.Connection, inp: AccountMetadataInput) -> ToolResult:
    r = await conn.fetchrow(
        """SELECT u.id, u.name, u.role, u.created_at,
                  (SELECT count(*) FROM bids WHERE user_id = u.id) AS bids,
                  (SELECT EXTRACT(EPOCH FROM (min(created_at) - u.created_at)) / 3600 FROM bids
                     WHERE user_id = u.id)::float AS first_bid_age,
                  (SELECT count(*) FROM auctions WHERE owner_id = u.id) AS owned
           FROM users u WHERE u.id = $1""",
        inp.user_id,
    )
    if r is None:
        return ToolError(code="not_found", message="user not found")
    age = (datetime.now(UTC) - r["created_at"]).total_seconds() / 3600
    return AccountMetadata(
        user_id=r["id"], name=r["name"], role=r["role"], created_at=r["created_at"],
        age_hours_now=round(age, 1),
        age_hours_at_first_bid=None if r["first_bid_age"] is None else round(r["first_bid_age"], 1),
        total_bids=r["bids"], auctions_owned=r["owned"],
    )


class Tool:
    def __init__(self, name: str, description: str, input_model: type[BaseModel], handler: Handler) -> None:
        self.name = name
        self.input_model = input_model
        self.handler = handler
        self.spec = ToolSpec(name=name, description=description, input_schema=input_model.model_json_schema())


TOOLS: dict[str, Tool] = {
    t.name: t
    for t in [
        Tool(
            "getAccountMetadata",
            "Basic facts about ONE user account: display name, role, when it was created, its age in hours "
            "now and at the moment of its FIRST bid (a tiny value means it bid almost immediately after "
            "signing up), how many bids it has ever placed and how many auctions it owns. Call this first when a flag "
            "involves a possibly new account or you need to know if the account is established. It does NOT "
            "show what the account bid on (use getBidderHistory).",
            AccountMetadataInput,
            get_account_metadata,
        ),
        Tool(
            "getBidderHistory",
            "Bidding profile of ONE user across ALL auctions: total bids, number of distinct auctions and "
            "distinct sellers, the seller they bid on most and that seller's share of their bids (a share "
            "near 1.0 with many bids means the account only ever bids on one seller), plus their 25 most "
            "recent bids. Use it to judge concentration on a single seller and general behaviour.",
            BidderHistoryInput,
            get_bidder_history,
        ),
        Tool(
            "getSellerAuctions",
            "Recent auctions (up to 30) owned by ONE seller, each with bid count, number of distinct "
            "bidders and the share of bids placed by the single most active bidder. Use it AFTER "
            "getBidderHistory shows heavy concentration on a seller, to see whether that seller's "
            "auctions are dominated by the same few bidders. Takes a seller_id, not a user's bidding history.",
            SellerAuctionsInput,
            get_seller_auctions,
        ),
        Tool(
            "getBidTimeline",
            "The ordered bids (up to the latest 60) on ONE auction with seconds since the previous bid and "
            "seconds before the auction closed. Use it to spot bursts (bids seconds apart), last-second "
            "sniping, or one user repeatedly outbidding others. Takes an auction_id.",
            BidTimelineInput,
            get_bid_timeline,
        ),
    ]
}
TOOL_SPECS: list[ToolSpec] = [t.spec for t in TOOLS.values()]


async def run_tool(name: str, arguments: dict[str, Any], *, fail: set[str] | None = None) -> ToolResult:
    """Never raises: every failure becomes a ToolError the model can read."""
    tool = TOOLS.get(name)
    if tool is None:
        return ToolError(code="invalid_argument", message=f"unknown tool '{name}'; available: {sorted(TOOLS)}")
    if fail and name in fail:  # deliberate fault injection (Day 49)
        return ToolError(code="unavailable", message=f"{name} is temporarily unavailable", retryable=True)
    try:
        inp = tool.input_model.model_validate(arguments)
    except ValidationError as exc:
        return ToolError(code="invalid_argument", message=json.dumps([e["msg"] for e in exc.errors()])[:300])
    try:
        with span(f"tool.{name}"):
            async with acquire() as conn:
                return await tool.handler(conn, inp)
    except (asyncpg.PostgresError, OSError, TimeoutError) as exc:
        return ToolError(code="unavailable", message=f"database error: {type(exc).__name__}", retryable=True)
    except Exception as exc:  # noqa: BLE001 - boundary: nothing may escape into the loop
        return ToolError(code="internal", message=f"{type(exc).__name__}")


def summarize(result: ToolResult) -> str:
    if isinstance(result, ToolError):
        return f"ERROR {result.code}: {result.message}"
    if isinstance(result, BidderHistory):
        return f"{result.total_bids} bids, {result.distinct_sellers} sellers, top seller share {result.top_seller_share}"
    if isinstance(result, SellerAuctions):
        return f"{result.auction_count} auctions"
    if isinstance(result, BidTimeline):
        return f"{result.bid_count} bids on timeline"
    return f"account age {result.age_hours_now}h (first bid at {result.age_hours_at_first_bid}h), {result.total_bids} bids"


__all__ = ["TOOLS", "TOOL_SPECS", "UUID", "run_tool", "summarize"]
