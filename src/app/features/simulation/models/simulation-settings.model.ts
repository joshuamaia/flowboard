export const RETRY_STRATEGIES = ['FIXED', 'EXPONENTIAL'] as const;
export type RetryStrategy = (typeof RETRY_STRATEGIES)[number];

export const SIMULATION_SPEEDS = [0.5, 1, 2, 4] as const;
export type SimulationSpeed = (typeof SIMULATION_SPEEDS)[number];

export interface SimulationSettings {
  /** Maximum number of tasks in PROCESSING at the same time. */
  maxConcurrency: number;
  /** Automatic retries after the first failed attempt (0 disables retry). */
  maxRetries: number;
  retryStrategy: RetryStrategy;
  /** Delay before the first retry; base of the exponential backoff. */
  initialRetryDelayMs: number;
  /** Upper bound for any retry delay. */
  maxRetryDelayMs: number;
  /** Simulation clock multiplier: 2 means everything runs twice as fast. */
  speed: SimulationSpeed;
}

export const DEFAULT_SIMULATION_SETTINGS: SimulationSettings = {
  maxConcurrency: 3,
  maxRetries: 3,
  retryStrategy: 'EXPONENTIAL',
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 8000,
  speed: 1,
};

export const SETTINGS_LIMITS = {
  maxConcurrency: { min: 1, max: 10, step: 1 },
  maxRetries: { min: 0, max: 10, step: 1 },
  initialRetryDelayMs: { min: 250, max: 10_000, step: 250 },
  maxRetryDelayMs: { min: 1000, max: 60_000, step: 1000 },
} as const;

type NumericSetting = keyof typeof SETTINGS_LIMITS;

function clampSetting(key: NumericSetting, value: unknown): number {
  const { min, max } = SETTINGS_LIMITS[key];
  const fallback = DEFAULT_SIMULATION_SETTINGS[key];
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;
}

/**
 * Turns untrusted input (e.g. persisted JSON) into valid settings: unknown
 * values fall back to defaults and numbers are clamped to their limits.
 */
export function sanitizeSettings(input: unknown): SimulationSettings {
  const source = (typeof input === 'object' && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const strategy = source['retryStrategy'];
  const speed = source['speed'];
  const initialRetryDelayMs = clampSetting('initialRetryDelayMs', source['initialRetryDelayMs']);

  return {
    maxConcurrency: clampSetting('maxConcurrency', source['maxConcurrency']),
    maxRetries: clampSetting('maxRetries', source['maxRetries']),
    retryStrategy: RETRY_STRATEGIES.includes(strategy as RetryStrategy)
      ? (strategy as RetryStrategy)
      : DEFAULT_SIMULATION_SETTINGS.retryStrategy,
    initialRetryDelayMs,
    maxRetryDelayMs: Math.max(
      initialRetryDelayMs,
      clampSetting('maxRetryDelayMs', source['maxRetryDelayMs']),
    ),
    speed: SIMULATION_SPEEDS.includes(speed as SimulationSpeed)
      ? (speed as SimulationSpeed)
      : DEFAULT_SIMULATION_SETTINGS.speed,
  };
}
