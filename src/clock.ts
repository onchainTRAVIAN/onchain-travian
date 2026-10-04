/**
 * Injectable game clock. All game logic reads time through `clock.now()`
 * so tests can fast-forward hours of game time instantly.
 */
let offsetMs = 0;
let frozenAt: number | null = null;

export const clock = {
  now(): number {
    return frozenAt ?? Date.now() + offsetMs;
  },
  /** Test helper: move time forward. */
  advance(ms: number): void {
    if (frozenAt !== null) frozenAt += ms;
    else offsetMs += ms;
  },
  /** Test helper: pin time to a fixed instant. */
  freeze(at: number = Date.now()): void {
    frozenAt = at;
  },
  reset(): void {
    offsetMs = 0;
    frozenAt = null;
  },
};
