CREATE TABLE bids (
    id UUID DEFAULT gen_random_uuid() NOT NULL,

    auction_id UUID NOT NULL,
    user_id UUID NOT NULL,

    amount NUMERIC(12,2) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT bids_pkey PRIMARY KEY (id),

    CONSTRAINT bids_auction_id_fkey
        FOREIGN KEY (auction_id)
        REFERENCES auctions(id),

    CONSTRAINT bids_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT bids_amount_check
        CHECK (amount >= 0)
);