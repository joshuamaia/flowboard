import { baseChartOptions, withAlpha } from './chart-options';
import { ChartPalette } from './chart-palette.service';

const palette: ChartPalette = {
  text: '#e2e8f0',
  textMuted: '#94a3b8',
  grid: '#334155',
  surface: '#1e293b',
  primary: '#3b82f6',
  success: '#22c55e',
  danger: '#ef4444',
  pending: '#3b82f6',
  processing: '#f59e0b',
  retrying: '#a855f7',
  completed: '#22c55e',
  failed: '#ef4444',
  fontFamily: 'Inter',
};

describe('chart options', () => {
  it('converts hex tokens to rgba', () => {
    expect(withAlpha('#3b82f6', 0.5)).toBe('rgba(59, 130, 246, 0.5)');
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgb(1, 2, 3)');
  });

  it('hides the legend by default (single series) and shows it on request', () => {
    expect(baseChartOptions(palette).plugins?.legend?.display).toBe(false);
    expect(baseChartOptions(palette, { legend: true }).plugins?.legend?.display).toBe(true);
  });

  it('uses theme tokens for grid, ticks and tooltip', () => {
    const options = baseChartOptions(palette);

    expect(options.scales?.['y']?.grid?.color).toBe(palette.grid);
    expect(options.scales?.['x']?.ticks?.color).toBe(palette.textMuted);
    expect(options.plugins?.tooltip?.backgroundColor).toBe(palette.surface);
  });

  it('swaps axes for horizontal bars', () => {
    const options = baseChartOptions(palette, { horizontal: true });

    expect(options.indexAxis).toBe('y');
    // The value axis (with gridlines) moves to x; the category axis to y.
    expect(options.scales?.['x']?.grid?.color).toBe(palette.grid);
    expect(options.scales?.['y']?.grid?.display).toBe(false);
  });
});
