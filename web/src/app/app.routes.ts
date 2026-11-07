import { Routes } from '@angular/router';

import { adminGuard } from './core/auth/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'OpenSurvey — open-source, self-hosted surveys and feedback',
    loadComponent: () => import('./pages/landing-page/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'forbidden',
    title: 'No access — OpenSurvey',
    loadComponent: () => import('./pages/forbidden/forbidden').then((m) => m.Forbidden),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./pages/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  },
  { path: '**', redirectTo: '' },
];
