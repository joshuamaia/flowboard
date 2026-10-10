import { Routes } from '@angular/router';

import { SettingsPage } from './pages/settings-page';

export default [
  {
    path: '',
    component: SettingsPage,
    title: 'Configurações',
    data: { description: 'Concorrência, retries, velocidade da simulação e tema' },
  },
] satisfies Routes;
