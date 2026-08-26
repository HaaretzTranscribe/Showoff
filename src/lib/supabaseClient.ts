import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * False whenever the Supabase project hasn't been provisioned yet
 * (e.g. a fresh Netlify deploy before env vars are set). App.tsx
 * checks this and shows a config screen instead of rendering routes
 * that would otherwise crash the moment they touch `supabase`.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  // Never actually used when isSupabaseConfigured is false — App.tsx
  // gates all routes on it — but keeps this module import-safe.
  : (null as unknown as ReturnType<typeof createClient>);
