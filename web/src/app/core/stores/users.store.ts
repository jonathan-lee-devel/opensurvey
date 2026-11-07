import { inject } from '@angular/core';
import { signalStore, patchState, withMethods } from '@ngrx/signals';
import { prependEntity, withEntities } from '@ngrx/signals/entities';
import { firstValueFrom } from 'rxjs';

import { AdminUsersService } from '../api/admin-users.service';
import { AdminUser, CreateUserDto } from '../api/models';
import { ToastsStore } from './toasts.store';

/**
 * Users known to this session. The API has no list endpoint yet, so the
 * entities are the users created here; when `GET /admin/users` lands, a
 * `load()` method fills the same collection and nothing else changes.
 */
export const UsersStore = signalStore(
  { providedIn: 'root' },
  withEntities<AdminUser>(),
  withMethods((store) => {
    const users = inject(AdminUsersService);
    const toasts = inject(ToastsStore);

    return {
      /** Creates a user; rejects with the `ApiError` so the form can place field errors. */
      async create(dto: CreateUserDto): Promise<AdminUser> {
        const created = await firstValueFrom(users.create(dto));
        patchState(store, prependEntity(created));
        toasts.success(`User ${created.email} created.`);
        return created;
      },
    };
  }),
);
