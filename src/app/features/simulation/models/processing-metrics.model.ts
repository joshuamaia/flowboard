export interface ProcessingMetrics {
  total: number;
  pending: number;
  processing: number;
  retrying: number;
  completed: number;
  failed: number;
  /** completed / (completed + failed); null until a task has finished. */
  successRate: number | null;
  /** Mean duration of the final attempt of completed tasks. */
  averageProcessingMs: number | null;
  /** Tasks completed in the last 60 seconds. */
  throughputPerMinute: number;
}
