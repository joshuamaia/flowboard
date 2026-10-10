import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', loadChildren: () => import('./features/dashboard/dashboard.routes') },
  { path: 'board', loadChildren: () => import('./features/board/board.routes') },
  { path: 'history', loadChildren: () => import('./features/history/history.routes') },
  { path: 'settings', loadChildren: () => import('./features/settings/settings.routes') },
  { path: '**', redirectTo: 'dashboard' },
];
