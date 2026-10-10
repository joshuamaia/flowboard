import { canRetry, retryDelayMs } from './retry-policy';

describe('retry policy', () => {
  const exponential = {
    retryStrategy: 'EXPONENTIAL' as const,
    initialRetryDelayMs: 1000,
    maxRetryDelayMs: 5000,
  };

  it('doubles the delay on each retry with exponential backoff', () => {
    expect([1, 2, 3].map((n) => retryDelayMs(n, exponential))).toEqual([1000, 2000, 4000]);
  });

  it('caps the exponential delay at the configured maximum', () => {
    expect(retryDelayMs(4, exponential)).toBe(5000);
    expect(retryDelayMs(10, exponential)).toBe(5000);
  });

  it('keeps a constant delay with the fixed strategy', () => {
    const fixed = { ...exponential, retryStrategy: 'FIXED' as const };

    expect([1, 2, 5].map((n) => retryDelayMs(n, fixed))).toEqual([1000, 1000, 1000]);
  });

  it('allows retries until maxRetries is used up', () => {
    expect(canRetry(1, 2)).toBe(true);
    expect(canRetry(2, 2)).toBe(true);
    expect(canRetry(3, 2)).toBe(false);
    expect(canRetry(1, 0)).toBe(false);
  });
});
