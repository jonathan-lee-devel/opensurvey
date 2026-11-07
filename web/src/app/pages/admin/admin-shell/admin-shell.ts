import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthStore } from '../../../core/auth/auth.store';

interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: 'surveys' | 'polls' | 'users';
}

/** Frame of the admin console: brand, section navigation, who is signed in. */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.scss',
})
export class AdminShell {
  protected readonly auth = inject(AuthStore);

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Surveys', path: '/admin/surveys', icon: 'surveys' },
    { label: 'Polls', path: '/admin/polls', icon: 'polls' },
    { label: 'Users', path: '/admin/users', icon: 'users' },
  ];
}
