import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Header } from './core/layout/header/header';
import { Sidebar } from './core/layout/sidebar/sidebar';
import { SimulationControls } from './features/simulation/components/simulation-controls/simulation-controls';
import { TaskCreateDialog } from './features/tasks/components/task-create-dialog/task-create-dialog';
import { TaskDialogService } from './features/tasks/services/task-dialog.service';
import { ConfirmDialog } from './shared/components/confirm-dialog/confirm-dialog';
import { ToastContainer } from './shared/components/toast/toast-container';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    Sidebar,
    Header,
    SimulationControls,
    TaskCreateDialog,
    ConfirmDialog,
    ToastContainer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '(document:keydown.escape)': 'closeSidebar()' },
})
export class App {
  private readonly taskDialog = inject(TaskDialogService);

  protected readonly sidebarOpen = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeSidebar());
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected openTaskDialog(): void {
    this.taskDialog.open();
  }
}
