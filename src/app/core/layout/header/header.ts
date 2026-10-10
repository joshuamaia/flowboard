import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';

import { Icon } from '../../../shared/components/icon/icon';
import { PageTitleStrategy } from '../../services/page-title.strategy';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-header',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private readonly themeService = inject(ThemeService);

  readonly menuToggled = output();
  readonly createTask = output();

  protected readonly page = inject(PageTitleStrategy).page;
  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');
  protected readonly themeLabel = computed(() =>
    this.isDark() ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
