import { Clock } from '../app/core/utils/clock';

/** Manually advanced clock for deterministic tests. */
export class FakeClock implements Clock {
  constructor(private current = Date.UTC(2026, 0, 1, 10, 30, 0)) {}

  now(): number {
    return this.current;
  }

  advance(ms: number): void {
    this.current += ms;
  }
}
