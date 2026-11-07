import { Routes } from '@angular/router';

import { PollDetailStore } from '../../core/stores/poll-detail.store';
import { SurveyDetailStore } from '../../core/stores/survey-detail.store';
import { AdminShell } from './admin-shell/admin-shell';

/** Children of `/admin`; the guard on the parent route has already run. */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminShell,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'surveys' },
      {
        path: 'surveys',
        title: 'Surveys — OpenSurvey admin',
        loadComponent: () => import('./surveys/survey-list/survey-list').then((m) => m.SurveyList),
      },
      {
        path: 'surveys/new',
        title: 'New survey — OpenSurvey admin',
        loadComponent: () =>
          import('./surveys/survey-create/survey-create').then((m) => m.SurveyCreate),
      },
      {
        path: 'surveys/:id',
        title: 'Survey — OpenSurvey admin',
        // Route-scoped so each visit starts with a clean survey and page.
        providers: [SurveyDetailStore],
        loadComponent: () =>
          import('./surveys/survey-detail/survey-detail').then((m) => m.SurveyDetail),
      },
      {
        path: 'polls',
        title: 'Polls — OpenSurvey admin',
        loadComponent: () => import('./polls/poll-list/poll-list').then((m) => m.PollList),
      },
      {
        path: 'polls/new',
        title: 'New poll — OpenSurvey admin',
        loadComponent: () => import('./polls/poll-create/poll-create').then((m) => m.PollCreate),
      },
      {
        path: 'polls/:id',
        title: 'Poll — OpenSurvey admin',
        providers: [PollDetailStore],
        loadComponent: () => import('./polls/poll-detail/poll-detail').then((m) => m.PollDetail),
      },
      {
        path: 'users',
        title: 'Users — OpenSurvey admin',
        loadComponent: () => import('./users/user-list/user-list').then((m) => m.UserList),
      },
    ],
  },
];
