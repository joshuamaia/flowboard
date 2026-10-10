import { DEFAULT_SIMULATION_SETTINGS, sanitizeSettings } from './simulation-settings.model';

describe('sanitizeSettings', () => {
  it('returns defaults for missing or invalid input', () => {
    expect(sanitizeSettings(undefined)).toEqual(DEFAULT_SIMULATION_SETTINGS);
    expect(sanitizeSettings('nope')).toEqual(DEFAULT_SIMULATION_SETTINGS);
    expect(sanitizeSettings({ maxRetries: 'three' })).toEqual(DEFAULT_SIMULATION_SETTINGS);
  });

  it('clamps numbers to their limits', () => {
    const settings = sanitizeSettings({
      maxConcurrency: 0,
      maxRetries: 50,
      initialRetryDelayMs: 1,
    });

    expect(settings.maxConcurrency).toBe(1);
    expect(settings.maxRetries).toBe(10);
    expect(settings.initialRetryDelayMs).toBe(250);
  });

  it('never lets the backoff cap fall below the initial delay', () => {
    const settings = sanitizeSettings({ initialRetryDelayMs: 5000, maxRetryDelayMs: 2000 });

    expect(settings.maxRetryDelayMs).toBe(5000);
  });

  it('accepts valid values unchanged', () => {
    const valid = {
      maxConcurrency: 4,
      maxRetries: 2,
      retryStrategy: 'FIXED',
      initialRetryDelayMs: 500,
      maxRetryDelayMs: 3000,
      speed: 2,
    };

    expect(sanitizeSettings(valid)).toEqual(valid);
  });
});
