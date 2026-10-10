export type SimulationStatus = 'IDLE' | 'RUNNING' | 'PAUSED';

export const SIMULATION_STATUS_LABELS: Readonly<Record<SimulationStatus, string>> = {
  IDLE: 'Parado',
  RUNNING: 'Executando',
  PAUSED: 'Pausado',
};

/**
 * What the engine is doing with a task it owns:
 * - PROCESSING: an attempt is running (occupies a worker slot);
 * - BACKOFF: waiting for the retry delay to elapse (no slot);
 * - READY: retry delay elapsed, waiting for a free slot.
 */
export type ExecutionPhase = 'PROCESSING' | 'BACKOFF' | 'READY';

export interface Execution {
  taskId: string;
  phase: ExecutionPhase;
  /** Simulated milliseconds left in the current phase, as of `resumedAt`. */
  remainingMs: number;
  /** Simulated length of the current phase. */
  totalMs: number;
  /** Wall-clock time the current timer segment started; null while not ticking. */
  resumedAt: number | null;
  /** Speed multiplier in effect for the current segment. */
  speed: number;
}
