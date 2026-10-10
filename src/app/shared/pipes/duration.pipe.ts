import { Pipe, PipeTransform } from '@angular/core';

/** Formats milliseconds as `850 ms`, `3,5 s` or `2 min 05 s`. */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes} min ${seconds} s`;
}

@Pipe({ name: 'duration' })
export class DurationPipe implements PipeTransform {
  transform(ms: number | null | undefined): string {
    return ms == null ? '—' : formatDuration(ms);
  }
}
