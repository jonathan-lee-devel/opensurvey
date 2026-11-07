import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../../core/auth/auth.store';

/** Shown to someone signed in without the admin claim. */
@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  template: `
    <main id="main" class="forbidden">
      <div class="forbidden__card">
        <p class="forbidden__eyebrow">No access</p>
        <h1 class="forbidden__title">This account cannot use the admin console</h1>
        <p class="forbidden__text">
          @if (auth.profile(); as profile) {
            You are signed in as <strong>{{ profile.name }}</strong
            >, but that account does not hold the <code>{{ adminClaim }}</code> role. Ask an
            administrator to grant it, or sign in with another account.
          } @else {
            Sign in with an account that holds the <code>{{ adminClaim }}</code> role.
          }
        </p>
        <div class="forbidden__actions">
          @if (auth.isAuthenticated()) {
            <button type="button" class="btn btn--primary" (click)="auth.logout()">
              Sign out and switch account
            </button>
          } @else {
            <button type="button" class="btn btn--primary" (click)="auth.login('/admin')">
              Sign in
            </button>
          }
          <a class="btn btn--ghost" routerLink="/">Back to the home page</a>
        </div>
      </div>
    </main>
  `,
  styles: `
    .forbidden {
      min-height: 100dvh;
      display: grid;
      place-items: center;
      padding: 24px 16px;
      background: var(--glow), var(--background);
    }

    .forbidden__card {
      max-width: 36rem;
      padding: 32px;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--background-1dp);
    }

    .forbidden__eyebrow {
      margin-bottom: 8px;
      color: var(--primary);
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .forbidden__title {
      font-size: clamp(1.5rem, 3vw, 2rem);
    }

    .forbidden__text {
      margin-top: 12px;
    }

    .forbidden__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
    }
  `,
})
export class Forbidden {
  protected readonly auth = inject(AuthStore);
  protected readonly adminClaim = environment.adminClaim;
}
