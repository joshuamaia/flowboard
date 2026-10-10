import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Icon } from '../../../shared/components/icon/icon';
import { NAV_ITEMS } from '../navigation';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  host: { '[class.open]': 'open()' },
})
export class Sidebar {
  readonly open = input(false);
  readonly closed = output();

  protected readonly items = NAV_ITEMS;
}
