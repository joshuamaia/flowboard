import { Injectable } from '@angular/core';

/** Deterministic PRNG (mulberry32): same seed, same sequence in [0, 1). */
export function createSeededGenerator(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Math.random by default; switches to a seeded generator for reproducible runs. */
export class SeedableRandom {
  private generator: () => number = Math.random;

  next(): number {
    return this.generator();
  }

  reseed(seed: number | null): void {
    this.generator = seed === null ? Math.random : createSeededGenerator(seed);
  }
}

/**
 * Source of uniformly distributed numbers in [0, 1). Injected so failure
 * rolls can be made deterministic in tests and reproducible in demos.
 */
@Injectable({ providedIn: 'root', useFactory: () => new SeedableRandom() })
export abstract class RandomSource {
  abstract next(): number;
  /** Seeds the sequence (null restores non-deterministic randomness). */
  abstract reseed(seed: number | null): void;
}
