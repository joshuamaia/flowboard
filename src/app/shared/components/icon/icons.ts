/**
 * Stroke icon set (24x24 grid, Lucide-style geometry, ISC license).
 * Each icon is a list of path definitions so it renders without innerHTML.
 */
export const ICONS = {
  activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
  dashboard: ['M3 3h7v9H3z', 'M14 3h7v5h-7z', 'M14 12h7v9h-7z', 'M3 16h7v5H3z'],
  board: ['M6 5v11', 'M12 5v6', 'M18 5v14'],
  history: ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5', 'M12 7v5l4 2'],
  settings: [
    'M21 4h-7',
    'M10 4H3',
    'M21 12h-9',
    'M8 12H3',
    'M21 20h-5',
    'M12 20H3',
    'M14 2v4',
    'M8 10v4',
    'M16 18v4',
  ],
  sun: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8z',
    'M12 2v2',
    'M12 20v2',
    'm4.93 4.93 1.41 1.41',
    'm17.66 17.66 1.41 1.41',
    'M2 12h2',
    'M20 12h2',
    'm6.34 17.66-1.41 1.41',
    'm19.07 4.93-1.41 1.41',
  ],
  moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  plus: ['M5 12h14', 'M12 5v14'],
  play: ['M6 3 20 12 6 21Z'],
  pause: ['M14 4h4v16h-4z', 'M6 4h4v16H6z'],
  stop: ['M5 5h14v14H5z'],
  trash: [
    'M3 6h18',
    'M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
    'M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
  ],
  gauge: ['m12 14 4-4', 'M3.34 19a10 10 0 1 1 17.32 0'],
  zap: ['M13 2 3 14h9l-1 8 10-12h-9l1-8z'],
  filter: ['M22 3H2l8 9.46V19l4 2v-8.54L22 3z'],
  layers: ['m12 2 10 5-10 5L2 7l10-5z', 'm2 17 10 5 10-5', 'm2 12 10 5 10-5'],
  check: ['M20 6 9 17l-5-5'],
  alert: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z', 'M12 8v4', 'M12 16h.01'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z', 'M12 16v-4', 'M12 8h.01'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 1 0 0-20z', 'M12 6v6l4 2'],
  repeat: [
    'm17 2 4 4-4 4',
    'M3 11v-1a4 4 0 0 1 4-4h14',
    'm7 22-4-4 4-4',
    'M21 13v1a4 4 0 0 1-4 4H3',
  ],
  inbox: [
    'M22 12h-6l-2 3h-4l-2-3H2',
    'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  ],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICONS;
