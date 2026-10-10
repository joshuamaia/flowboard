import { Task } from '../../tasks/models/task.model';
import { processingTimeMs } from '../../tasks/models/task.utils';
import { ProcessingMetrics } from '../models/processing-metrics.model';

export const THROUGHPUT_WINDOW_MS = 60_000;

/** Pure metrics calculation, so it can be wrapped in computed() and unit tested. */
export function computeMetrics(tasks: readonly Task[], now: number): ProcessingMetrics {
  const counts = { PENDING: 0, PROCESSING: 0, RETRYING: 0, COMPLETED: 0, FAILED: 0 };
  let processingSum = 0;
  let processingSamples = 0;
  let recentCompletions = 0;

  for (const task of tasks) {
    counts[task.status]++;
    if (task.status !== 'COMPLETED') {
      continue;
    }

    const duration = processingTimeMs(task);
    if (duration !== undefined) {
      processingSum += duration;
      processingSamples++;
    }
    if (task.completedAt && now - Date.parse(task.completedAt) <= THROUGHPUT_WINDOW_MS) {
      recentCompletions++;
    }
  }

  const finished = counts.COMPLETED + counts.FAILED;
  return {
    total: tasks.length,
    pending: counts.PENDING,
    processing: counts.PROCESSING,
    retrying: counts.RETRYING,
    completed: counts.COMPLETED,
    failed: counts.FAILED,
    successRate: finished > 0 ? counts.COMPLETED / finished : null,
    averageProcessingMs: processingSamples > 0 ? processingSum / processingSamples : null,
    throughputPerMinute: recentCompletions,
  };
}
