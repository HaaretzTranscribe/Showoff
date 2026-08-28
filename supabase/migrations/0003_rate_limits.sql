-- Backing store for the attendance-submit Edge Function's fixed-window
-- rate limit (spec section 10: "reduce spam without intrusive
-- tracking"). Only the service role ever touches this table.
create table rate_limit_hits (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  created_at timestamptz not null default now()
);

create index rate_limit_hits_bucket_created_idx on rate_limit_hits(bucket, created_at);

alter table rate_limit_hits enable row level security;
