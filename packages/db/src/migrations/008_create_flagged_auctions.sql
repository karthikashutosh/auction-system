CREATE TABLE flagged_auctions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,

    auction_id UUID NOT NULL,
    bid_id UUID NOT NULL,
    user_id UUID NOT NULL,

    score NUMERIC(5,4) NOT NULL,
    features JSONB NOT NULL,
    contributions JSONB NOT NULL,

    -- Filled by Node from the ai-service investigation response (Python never writes).
    verdict JSONB NULL,
    investigated_at TIMESTAMPTZ NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT flagged_auctions_pkey PRIMARY KEY (id),
    CONSTRAINT flagged_auctions_bid_key UNIQUE (bid_id),
    CONSTRAINT flagged_auctions_auction_fkey FOREIGN KEY (auction_id) REFERENCES auctions(id),
    CONSTRAINT flagged_auctions_bid_fkey FOREIGN KEY (bid_id) REFERENCES bids(id),
    CONSTRAINT flagged_auctions_user_fkey FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX flagged_auctions_created_idx ON flagged_auctions (created_at DESC);
CREATE INDEX flagged_auctions_score_idx ON flagged_auctions (score DESC);

CREATE INDEX IF NOT EXISTS bids_user_created_idx ON bids (user_id, created_at);
CREATE INDEX IF NOT EXISTS bids_auction_created_idx ON bids (auction_id, created_at);

-- The agent reads existing flags via Node-provided context; no grant needed for ai_service.
