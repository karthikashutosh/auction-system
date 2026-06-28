CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() NOT NULL,

    email VARCHAR(255) NOT NULL,
    password_hash TEXT NULL,

    name VARCHAR(100) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    role VARCHAR(20) NOT NULL DEFAULT 'user',

    provider TEXT NOT NULL DEFAULT 'local',
    provider_id TEXT NULL,

    avatar_url TEXT NULL,

    CONSTRAINT users_pkey PRIMARY KEY (id),

    CONSTRAINT users_email_key UNIQUE (email),

    CONSTRAINT users_role_check
        CHECK (role IN ('user', 'admin')),

    CONSTRAINT users_provider_check
        CHECK (provider IN ('local', 'google')),

    CONSTRAINT users_provider_provider_id_key
        UNIQUE (provider, provider_id)
);