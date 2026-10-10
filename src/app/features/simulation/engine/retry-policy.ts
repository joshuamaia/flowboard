import { SimulationSettings } from '../models/simulation-settings.model';

type RetryPolicySettings = Pick<
  SimulationSettings,
  'retryStrategy' | 'initialRetryDelayMs' | 'maxRetryDelayMs'
>;

/**
 * Delay before the given retry (1-based).
 * FIXED: always the initial delay. EXPONENTIAL: initial × 2^(n-1).
 * Both are capped by `maxRetryDelayMs`.
 */
export function retryDelayMs(retryNumber: number, settings: RetryPolicySettings): number {
  const base = settings.initialRetryDelayMs;
  const delay = settings.retryStrategy === 'EXPONENTIAL' ? base * 2 ** (retryNumber - 1) : base;
  return Math.min(delay, settings.maxRetryDelayMs);
}

/** Whether a task that just failed its `attempts`-th attempt may be retried. */
export function canRetry(attempts: number, maxRetries: number): boolean {
  return attempts - 1 < maxRetries;
}
