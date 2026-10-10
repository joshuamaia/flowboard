import { createSeededGenerator, SeedableRandom } from './random';

describe('random', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createSeededGenerator(42);
    const b = createSeededGenerator(42);

    const first = Array.from({ length: 5 }, () => a());
    expect(Array.from({ length: 5 }, () => b())).toEqual(first);
    expect(first.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('produces different sequences for different seeds', () => {
    expect(createSeededGenerator(1)()).not.toBe(createSeededGenerator(2)());
  });

  it('restarts the sequence when reseeded', () => {
    const random = new SeedableRandom();
    random.reseed(7);
    const first = [random.next(), random.next()];

    random.reseed(7);

    expect([random.next(), random.next()]).toEqual(first);
  });
});
