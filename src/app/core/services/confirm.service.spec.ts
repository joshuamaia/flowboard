import { TestBed } from '@angular/core/testing';

import { ConfirmService } from './confirm.service';

describe('ConfirmService', () => {
  let service: ConfirmService;

  beforeEach(() => {
    service = TestBed.inject(ConfirmService);
  });

  it('resolves true when confirmed', async () => {
    const result = service.confirm({ title: 'Apagar?', message: '' });
    expect(service.pending()?.title).toBe('Apagar?');

    service.settle(true);

    await expect(result).resolves.toBe(true);
    expect(service.pending()).toBeNull();
  });

  it('resolves false when cancelled', async () => {
    const result = service.confirm({ title: 'Apagar?', message: '' });

    service.settle(false);

    await expect(result).resolves.toBe(false);
  });

  it('cancels a previous request when a new one starts', async () => {
    const first = service.confirm({ title: 'A', message: '' });
    const second = service.confirm({ title: 'B', message: '' });

    await expect(first).resolves.toBe(false);
    service.settle(true);
    await expect(second).resolves.toBe(true);
  });
});
