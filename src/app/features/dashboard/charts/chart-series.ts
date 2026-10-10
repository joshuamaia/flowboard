import { Task } from '../../tasks/models/task.model';
import { TaskEvent } from '../../tasks/models/task-event.model';
import { processingTimeMs } from '../../tasks/models/task.utils';

export interface TimeSeries {
  /** Start of each bucket (epoch ms), oldest first. */
  bucketStarts: number[];
  /** Total tasks completed up to the end of each bucket. */
  completedCumulative: number[];
  /** Attempts that succeeded in each bucket. */
  successes: number[];
  /** Attempts that failed in each bucket (retried or not). */
  failures: number[];
  /** Mean processing time of tasks completed in each bucket; null if none. */
  averageProcessingMs: (number | null)[];
}

export interface ThroughputSeries {
  bucketStarts: number[];
  completions: number[];
}

export const TIME_BUCKET_MS = 10_000;
export const TIME_BUCKET_COUNT = 30;
export const THROUGHPUT_MINUTES = 10;

/** Starts of `count` consecutive buckets ending with the one that contains `now`. */
function bucketStarts(now: number, bucketMs: number, count: number): number[] {
  const current = Math.floor(now / bucketMs) * bucketMs;
  return Array.from({ length: count }, (_, i) => current - (count - 1 - i) * bucketMs);
}

function bucketIndex(timestamp: number, first: number, bucketMs: number, count: number): number {
  const index = Math.floor((timestamp - first) / bucketMs);
  return index >= 0 && index < count ? index : -1;
}

/** Rolling window of fixed-size time buckets for the evolution charts. */
export function buildTimeSeries(
  events: readonly TaskEvent[],
  tasks: readonly Task[],
  now: number,
  bucketMs = TIME_BUCKET_MS,
  count = TIME_BUCKET_COUNT,
): TimeSeries {
  const starts = bucketStarts(now, bucketMs, count);
  const first = starts[0];
  const successes = new Array<number>(count).fill(0);
  const failures = new Array<number>(count).fill(0);
  const durationSums = new Array<number>(count).fill(0);
  const durationSamples = new Array<number>(count).fill(0);
  let completedBeforeWindow = 0;

  for (const event of events) {
    if (event.type !== 'COMPLETED' && event.type !== 'FAILED') {
      continue;
    }
    const timestamp = Date.parse(event.timestamp);
    if (event.type === 'COMPLETED' && timestamp < first) {
      completedBeforeWindow++;
    }
    const index = bucketIndex(timestamp, first, bucketMs, count);
    if (index >= 0) {
      (event.type === 'COMPLETED' ? successes : failures)[index]++;
    }
  }

  for (const task of tasks) {
    const duration = processingTimeMs(task);
    if (task.status !== 'COMPLETED' || !task.completedAt || duration === undefined) {
      continue;
    }
    const index = bucketIndex(Date.parse(task.completedAt), first, bucketMs, count);
    if (index >= 0) {
      durationSums[index] += duration;
      durationSamples[index]++;
    }
  }

  let running = completedBeforeWindow;
  return {
    bucketStarts: starts,
    completedCumulative: successes.map((value) => (running += value)),
    successes,
    failures,
    averageProcessingMs: durationSums.map((sum, i) =>
      durationSamples[i] > 0 ? sum / durationSamples[i] : null,
    ),
  };
}

/** Completions per minute over the last `minutes` minutes. */
export function buildThroughput(
  events: readonly TaskEvent[],
  now: number,
  minutes = THROUGHPUT_MINUTES,
): ThroughputSeries {
  const bucketMs = 60_000;
  const starts = bucketStarts(now, bucketMs, minutes);
  const completions = new Array<number>(minutes).fill(0);

  for (const event of events) {
    if (event.type === 'COMPLETED') {
      const index = bucketIndex(Date.parse(event.timestamp), starts[0], bucketMs, minutes);
      if (index >= 0) {
        completions[index]++;
      }
    }
  }
  return { bucketStarts: starts, completions };
}
