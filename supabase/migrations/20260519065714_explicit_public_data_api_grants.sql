-- Supabase Data API access will no longer be granted implicitly for public
-- tables. Keep the table-level grants explicit; RLS policies still decide
-- which rows each role can actually read or write.

grant usage on schema public
  to anon, authenticated, service_role;

grant select, insert, update, delete
  on table
    public.profiles,
    public.listings,
    public.reports,
    public.pin_records,
    public.page_views,
    public.admin_logs
  to anon, authenticated, service_role;

grant usage, select
  on all sequences in schema public
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences
  to anon, authenticated, service_role;
