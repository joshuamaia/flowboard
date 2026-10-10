/** In-memory Storage for tests; can be told to fail writes (e.g. quota exceeded). */
export class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.items.size;
  }

  clear(): void {
    this.items.clear();
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    this.items.set(key, value);
  }
}
