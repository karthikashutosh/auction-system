-- Some databases (restored from an early dump) have auctions.*_time / *_at as
-- `timestamp without time zone`, unlike migration 002. node-pg wrote local wall-clock
-- time into them, which every non-Node reader (e.g. the Python AI service) then misreads
-- by the server's UTC offset. Convert to timestamptz, interpreting existing values in
-- the zone they were written in (edit 'Asia/Kolkata' if your dev machine differs).
-- No-op on databases that already use timestamptz.
DO $$
DECLARE
    col text;
BEGIN
    FOREACH col IN ARRAY ARRAY['start_time', 'end_time', 'created_at', 'updated_at'] LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'auctions'
              AND column_name = col AND data_type = 'timestamp without time zone'
        ) THEN
            EXECUTE format(
                'ALTER TABLE auctions ALTER COLUMN %I TYPE timestamptz USING %I AT TIME ZONE ''Asia/Kolkata''',
                col, col
            );
        END IF;
    END LOOP;
END
$$;
