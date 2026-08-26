import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export function useInstructorSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  // Anonymous student sessions must never be treated as an instructor
  // session, even though both are technically "logged in" (spec 13).
  const isInstructor = Boolean(session && !session.user.is_anonymous);

  return { session: isInstructor ? session : null, loading: session === undefined };
}
