CREATE TABLE auctions (
    id UUID DEFAULT gen_random_uuid() NOT NULL,

    owner_id UUID NOT NULL,

    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_key TEXT NOT NULL,

    starting_price NUMERIC(12,2) NOT NULL,
    current_price NUMERIC(12,2) NOT NULL,
    reserve_price NUMERIC(12,2) NOT NULL,

    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,

    status TEXT NOT NULL DEFAULT 'ACTIVE',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    highest_bidder_id UUID NULL,

    CONSTRAINT auctions_pkey PRIMARY KEY (id),

    CONSTRAINT auctions_owner_id_fkey
        FOREIGN KEY (owner_id)
        REFERENCES users(id),

    CONSTRAINT auctions_highest_bidder_id_fkey
        FOREIGN KEY (highest_bidder_id)
        REFERENCES users(id)
        ON DELETE SET NULL,

    CONSTRAINT auctions_starting_price_check
        CHECK (starting_price >= 0),

    CONSTRAINT auctions_current_price_check
        CHECK (current_price >= 0),

    CONSTRAINT auctions_reserve_price_check
        CHECK (reserve_price >= 0),

    CONSTRAINT auctions_time_check
        CHECK (end_time > start_time),

    CONSTRAINT auctions_status_check
        CHECK (status IN ('ACTIVE', 'ENDED', 'CANCELLED'))
);