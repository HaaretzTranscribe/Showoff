import { supabase } from "./supabaseClient";

/**
 * Ensures the browser has a Supabase anonymous-auth session before
 * calling join-session (spec 13.2). Supabase persists the session in
 * localStorage, so this is a no-op after the first visit.
 */
export async function ensureAnonymousSession(): Promise<string> {
  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    return existing.session.access_token;
  }
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session) {
    throw new Error(error?.message ?? "anonymous sign-in failed");
  }
  return data.session.access_token;
}
