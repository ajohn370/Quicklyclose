-- Setup automatic PostgREST schema cache reloading
-- This prevents PGRST204 errors when schema changes occur

-- Create function to watch for DDL operations
CREATE OR REPLACE FUNCTION pgrst_ddl_watch() RETURNS event_trigger AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA',
      'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE',
      'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE',
      'CREATE VIEW', 'ALTER VIEW',
      'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW',
      'CREATE FUNCTION', 'ALTER FUNCTION',
      'CREATE TRIGGER',
      'CREATE TYPE', 'ALTER TYPE',
      'CREATE RULE',
      'COMMENT'
    )
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create the event trigger (if it doesn't exist)
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end EXECUTE PROCEDURE pgrst_ddl_watch();

-- Manual reload for immediate effect
NOTIFY pgrst, 'reload schema';