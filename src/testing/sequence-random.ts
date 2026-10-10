import { RandomSource } from '../app/core/utils/random';

/** Returns the given values in order, then keeps repeating the last one. */
export class SequenceRandom implements RandomSource {
  private index = 0;

  constructor(private readonly values: readonly number[]) {
    if (values.length === 0) {
      throw new Error('SequenceRandom needs at least one value');
    }
  }

  next(): number {
    const value = this.values[Math.min(this.index, this.values.length - 1)];
    this.index++;
    return value;
  }

  reseed(): void {
    this.index = 0;
  }
}
