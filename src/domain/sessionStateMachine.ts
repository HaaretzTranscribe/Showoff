import type { SessionState } from "./types";

/**
 * Pure, server-authoritative state machine for a class_session
 * (spec section 16). No I/O here on purpose: the Edge Functions /
 * server routes that mutate class_sessions.status must call this
 * to decide whether a transition is legal, then persist the result.
 * Clients (Student App, Presentation) only ever display status —
 * they never compute or trust a locally-derived state.
 */

export type SessionEvent =
  | "OPEN_JOIN"
  | "OPEN_RESPONSES"
  | "PAUSE_JOIN"
  | "REOPEN_JOIN"
  | "LOCK_RESPONSES"
  | "UNLOCK_RESPONSES"
  | "END";

const TRANSITIONS: Record<SessionState, Partial<Record<SessionEvent, SessionState>>> = {
  draft: {
    OPEN_JOIN: "join_open",
  },
  join_open: {
    OPEN_RESPONSES: "responses_open",
    PAUSE_JOIN: "join_closed",
    END: "ended",
  },
  responses_open: {
    // "Pause Join" without closing the questionnaire for those already in (spec section 5):
    // existing participants keep answering (join_closed still allows response writes).
    PAUSE_JOIN: "join_closed",
    LOCK_RESPONSES: "responses_locked",
    END: "ended",
  },
  join_closed: {
    REOPEN_JOIN: "join_open",
    OPEN_RESPONSES: "responses_open",
    LOCK_RESPONSES: "responses_locked",
    END: "ended",
  },
  responses_locked: {
    UNLOCK_RESPONSES: "responses_open",
    END: "ended",
  },
  ended: {},
};

/** Whether new participants may call the join endpoint. */
export function allowsJoin(state: SessionState): boolean {
  return state === "join_open" || state === "responses_open";
}

/** Whether existing participants may write/update responses. */
export function allowsResponseWrites(state: SessionState): boolean {
  return state === "responses_open" || state === "join_closed";
}

export function isTerminal(state: SessionState): boolean {
  return state === "ended";
}

export interface TransitionResult {
  ok: boolean;
  nextState?: SessionState;
  error?: string;
}

export function canTransition(current: SessionState, event: SessionEvent): TransitionResult {
  if (isTerminal(current)) {
    return { ok: false, error: `session is ended; no further transitions are allowed` };
  }
  const next = TRANSITIONS[current]?.[event];
  if (!next) {
    return { ok: false, error: `event ${event} is not valid from state ${current}` };
  }
  return { ok: true, nextState: next };
}

export function applyTransition(current: SessionState, event: SessionEvent): SessionState {
  const result = canTransition(current, event);
  if (!result.ok || !result.nextState) {
    throw new Error(result.error);
  }
  return result.nextState;
}
