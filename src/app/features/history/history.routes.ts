import { Routes } from '@angular/router';

import { HistoryPage } from './pages/history-page';

export default [
  {
    path: '',
    component: HistoryPage,
    title: 'Histórico',
    data: { description: 'Linha do tempo de todas as transições de estado' },
  },
] satisfies Routes;
