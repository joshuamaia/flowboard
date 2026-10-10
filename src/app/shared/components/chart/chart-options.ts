import { ChartOptions } from 'chart.js';

import { ChartPalette } from './chart-palette.service';

export interface BaseOptionsConfig {
  /** Show a legend (only for 2+ series). */
  legend?: boolean;
  /** Horizontal bars. */
  horizontal?: boolean;
  /** Formats values on the value axis and in tooltips. */
  formatValue?: (value: number) => string;
  /** Max ticks on the category axis. */
  maxCategoryTicks?: number;
}

/** Canvas-safe translucent color from a `#rrggbb` token (other formats pass through). */
export function withAlpha(color: string, alpha: number): string {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!match) {
    return color;
  }
  const [r, g, b] = match.slice(1).map((hex) => parseInt(hex, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Shared look: hairline recessive grid, muted ticks, surface tooltip, one value axis. */
export function baseChartOptions(
  palette: ChartPalette,
  config: BaseOptionsConfig = {},
): ChartOptions<'bar' | 'line'> {
  const { legend = false, horizontal = false, formatValue, maxCategoryTicks = 6 } = config;
  const font = { family: palette.fontFamily, size: 11 };

  const valueAxis = {
    beginAtZero: true,
    border: { display: false },
    grid: { color: palette.grid, lineWidth: 1, drawTicks: false },
    ticks: {
      color: palette.textMuted,
      font,
      padding: 8,
      precision: 0,
      maxTicksLimit: 5,
      ...(formatValue ? { callback: (value: string | number) => formatValue(Number(value)) } : {}),
    },
  };
  const categoryAxis = {
    border: { color: palette.grid },
    grid: { display: false },
    ticks: {
      color: palette.textMuted,
      font,
      maxRotation: 0,
      autoSkip: true,
      maxTicksLimit: horizontal ? undefined : maxCategoryTicks,
    },
  };

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : { duration: 300 },
    indexAxis: horizontal ? 'y' : 'x',
    interaction: { mode: 'index', intersect: false, axis: horizontal ? 'y' : 'x' },
    layout: { padding: { top: 4, right: 8 } },
    scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    plugins: {
      legend: {
        display: legend,
        position: 'top',
        align: 'end',
        labels: {
          color: palette.text,
          font,
          boxWidth: 10,
          boxHeight: 10,
          useBorderRadius: true,
          borderRadius: 2,
        },
      },
      tooltip: {
        backgroundColor: palette.surface,
        borderColor: palette.grid,
        borderWidth: 1,
        titleColor: palette.text,
        bodyColor: palette.text,
        titleFont: { ...font, weight: 'bold' },
        bodyFont: font,
        padding: 10,
        cornerRadius: 8,
        boxPadding: 4,
        usePointStyle: true,
        callbacks: formatValue
          ? {
              label: (item) => {
                const raw = horizontal ? item.parsed.x : item.parsed.y;
                const prefix = item.dataset.label ? `${item.dataset.label}: ` : '';
                return raw === null ? `${prefix}—` : `${prefix}${formatValue(raw)}`;
              },
            }
          : {},
      },
    },
  };
}
