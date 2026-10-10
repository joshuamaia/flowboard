import { Injectable } from '@angular/core';

/**
 * Time source abstraction. Injected everywhere a timestamp is needed so tests
 * can swap it for a fake clock and stay deterministic.
 */
@Injectable({ providedIn: 'root', useFactory: () => ({ now: () => Date.now() }) })
export abstract class Clock {
  abstract now(): number;
}
