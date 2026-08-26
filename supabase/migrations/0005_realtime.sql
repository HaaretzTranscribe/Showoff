-- Enables Postgres change broadcast for the tables the Presentation
-- client subscribes to (spec section 12). Realtime respects each
-- table's RLS policies from 0002_rls_policies.sql, so a given
-- connection only ever receives rows it could already SELECT.

alter publication supabase_realtime add table session_participants;
alter publication supabase_realtime add table responses;
