-- Backing store for join/response rate limiting (spec section 21).
-- Written and read exclusively by Edge Functions via the service role;
-- RLS is enabled with no policies so it is unreachable from any
-- browser-side key, anon or authenticated.

create table rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null, -- e.g. 'join:ip:1.2.3.4' or 'join:identifier:<hash>'
  created_at timestamptz not null default now()
);

create index rate_limit_hits_bucket_created_idx on rate_limit_hits(bucket, created_at);

alter table rate_limit_hits enable row level security;
-- Intentionally no policies: only the service role (which bypasses RLS) may access this table.
