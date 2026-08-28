import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export interface InstructorSessionState {
  loading: boolean;
  session: Session | null;
  /** public.users.id — the app-level owner id used by courses.owner_user_id. */
  userId: string | null;
}

export function useInstructorSession(): InstructorSessionState {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadUserId(authSession: Session | null) {
      if (!authSession) {
        if (!cancelled) setUserId(null);
        return;
      }
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", authSession.user.id)
        .maybeSingle();
      if (!cancelled) setUserId(data?.id ?? null);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      loadUserId(data.session).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      void loadUserId(newSession);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { loading, session, userId };
}
