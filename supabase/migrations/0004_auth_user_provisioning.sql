-- Bridges Supabase Auth identities to the public.users table used by
-- RLS (app_user_id() in 0002_rls_policies.sql). Only real instructor
-- sign-ins (email/password/SSO) get a users row; anonymous student
-- sign-ins (spec 13.2) are identified solely by auth.uid() inside
-- session_participants and never need one.

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_anonymous, false) = false then
    insert into public.users (auth_id, email, role)
    values (new.id, new.email, 'instructor')
    on conflict (auth_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
