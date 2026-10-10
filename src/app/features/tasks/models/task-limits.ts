/** Bounds for user-provided task parameters, shared by the form and generators. */
export const TASK_LIMITS = {
  titleMinLength: 3,
  titleMaxLength: 80,
  descriptionMaxLength: 280,
  durationMs: { min: 500, max: 15_000, step: 500, default: 3_000 },
  failureProbability: { min: 0, max: 1, step: 0.05, default: 0.2 },
} as const;
