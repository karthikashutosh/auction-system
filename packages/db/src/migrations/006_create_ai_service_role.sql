-- Python (ai-service) is READ-ONLY against Postgres, enforced here, not by convention.
-- Dev password below; rotate with ALTER ROLE ai_service PASSWORD '...' in any shared environment.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ai_service') THEN
        CREATE ROLE ai_service WITH LOGIN PASSWORD 'ai_service_dev';
    END IF;
END
$$;

DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO ai_service', current_database());
END
$$;

GRANT USAGE ON SCHEMA public TO ai_service;
GRANT SELECT ON auctions TO ai_service;
GRANT SELECT ON bids TO ai_service;
-- Column-level: the AI service never needs email or password_hash.
GRANT SELECT (id, name, role, provider, created_at) ON users TO ai_service;
-- No INSERT / UPDATE / DELETE is granted on anything.
