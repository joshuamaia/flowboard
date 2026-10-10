import { Routes } from '@angular/router';

import { DashboardPage } from './pages/dashboard-page';

export default [
  {
    path: '',
    component: DashboardPage,
    title: 'Dashboard',
    data: { description: 'Visão geral da fila de processamento em tempo real' },
  },
] satisfies Routes;
