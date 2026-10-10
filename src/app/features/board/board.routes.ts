import { Routes } from '@angular/router';

import { BoardPage } from './pages/board-page';

export default [
  {
    path: '',
    component: BoardPage,
    title: 'Quadro',
    data: { description: 'Acompanhe as tarefas por estado e mova-as manualmente' },
  },
] satisfies Routes;
