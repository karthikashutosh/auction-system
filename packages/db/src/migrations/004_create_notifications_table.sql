CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() NOT NULL,

    user_id UUID NOT NULL,

    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    type VARCHAR(50) NOT NULL,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    entity_type VARCHAR(30) NOT NULL DEFAULT 'AUCTION',
    entity_id UUID NULL,

    CONSTRAINT notifications_pkey PRIMARY KEY (id),

    CONSTRAINT notifications_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT notifications_entity_type_check
        CHECK (entity_type IN ('AUCTION')),

    CONSTRAINT notifications_title_check
        CHECK (length(trim(title)) > 0),

    CONSTRAINT notifications_message_check
        CHECK (length(trim(message)) > 0)
);