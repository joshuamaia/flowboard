import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';

import { Clock } from '../utils/clock';

const TICK_MS = 1000;

/** A coarse "current time" signal for time-window calculations in the UI. */
@Injectable({ providedIn: 'root' })
export class NowService {
  private readonly clock = inject(Clock);

  readonly now = toSignal(interval(TICK_MS).pipe(map(() => this.clock.now())), {
    initialValue: this.clock.now(),
  });
}
