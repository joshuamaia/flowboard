import { inject, Injectable, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, RouterStateSnapshot, TitleStrategy } from '@angular/router';

export interface PageInfo {
  title: string;
  description: string;
}

const APP_NAME = 'FlowBoard';

/**
 * Sets the document title from the route `title` and exposes the current
 * page info (title + `data.description`) as a signal for the header.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleStrategy extends TitleStrategy {
  private readonly titleService = inject(Title);
  private readonly _page = signal<PageInfo>({ title: APP_NAME, description: '' });

  readonly page = this._page.asReadonly();

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const title = this.buildTitle(snapshot) ?? APP_NAME;
    const description = this.deepestChild(snapshot.root).data['description'];

    this.titleService.setTitle(title === APP_NAME ? APP_NAME : `${title} · ${APP_NAME}`);
    this._page.set({ title, description: typeof description === 'string' ? description : '' });
  }

  private deepestChild(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }
}
