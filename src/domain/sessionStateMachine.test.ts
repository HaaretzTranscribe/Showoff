import { describe, it, expect } from "vitest";
import {
  applyTransition,
  allowsJoin,
  allowsResponseWrites,
  canTransition,
  isTerminal,
} from "./sessionStateMachine";

describe("session state machine", () => {
  it("walks the happy path: draft -> join_open -> responses_open -> responses_locked -> ended", () => {
    let state = applyTransition("draft", "OPEN_JOIN");
    expect(state).toBe("join_open");
    state = applyTransition(state, "OPEN_RESPONSES");
    expect(state).toBe("responses_open");
    state = applyTransition(state, "LOCK_RESPONSES");
    expect(state).toBe("responses_locked");
    state = applyTransition(state, "END");
    expect(state).toBe("ended");
  });

  it("rejects skipping straight from draft to responses_open", () => {
    const result = canTransition("draft", "OPEN_RESPONSES");
    expect(result.ok).toBe(false);
  });

  it("pausing join during responses_open keeps existing participants answering", () => {
    const state = applyTransition("responses_open", "PAUSE_JOIN");
    expect(state).toBe("join_closed");
    expect(allowsJoin(state)).toBe(false);
    expect(allowsResponseWrites(state)).toBe(true);
  });

  it("never allows a transition out of ended", () => {
    expect(isTerminal("ended")).toBe(true);
    const result = canTransition("ended", "OPEN_JOIN");
    expect(result.ok).toBe(false);
    expect(() => applyTransition("ended", "REOPEN_JOIN")).toThrow();
  });

  it("draft does not allow join or response writes", () => {
    expect(allowsJoin("draft")).toBe(false);
    expect(allowsResponseWrites("draft")).toBe(false);
  });

  it("responses_locked stops writes but presentation keeps reading (no join)", () => {
    expect(allowsJoin("responses_locked")).toBe(false);
    expect(allowsResponseWrites("responses_locked")).toBe(false);
  });

  it("can unlock back to responses_open", () => {
    const state = applyTransition("responses_locked", "UNLOCK_RESPONSES");
    expect(state).toBe("responses_open");
  });
});
