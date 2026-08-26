import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * Basic live respondent counter (Phase 1 slice of spec section 12).
 * Loads the current joined count once, then keeps it current via a
 * Realtime subscription on INSERTs into session_participants — no
 * polling, and no re-fetch of the full table on every join.
 */
export function useLiveParticipantCount(classSessionId: string | null): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!classSessionId) return;
    let cancelled = false;
    const seenParticipantIds = new Set<string>();

    async function loadInitial() {
      const { data, error } = await supabase
        .from("session_participants")
        .select("id")
        .eq("class_session_id", classSessionId);
      if (!error && data && !cancelled) {
        for (const row of data as { id: string }[]) seenParticipantIds.add(row.id);
        setCount(seenParticipantIds.size);
      }
    }
    loadInitial();

    const channel = supabase
      .channel(`session-participants-${classSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "session_participants",
          filter: `class_session_id=eq.${classSessionId}`,
        },
        (payload) => {
          const id = (payload.new as { id: string }).id;
          if (!seenParticipantIds.has(id)) {
            seenParticipantIds.add(id);
            setCount(seenParticipantIds.size);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [classSessionId]);

  return count;
}
