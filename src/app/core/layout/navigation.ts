import { IconName } from '../../shared/components/icon/icons';

export interface NavItem {
  path: string;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/board', label: 'Quadro', icon: 'board' },
  { path: '/history', label: 'Histórico', icon: 'history' },
  { path: '/settings', label: 'Configurações', icon: 'settings' },
];
