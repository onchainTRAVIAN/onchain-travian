/** A rule violation the player should see (not enough resources, wrong target...). */
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export function assertGame(condition: unknown, message: string): asserts condition {
  if (!condition) throw new GameError(message);
}
