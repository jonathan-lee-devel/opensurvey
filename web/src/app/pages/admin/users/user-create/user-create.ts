import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, maxLength, required, submit } from '@angular/forms/signals';

import { CopyButton } from '../../../../common/copy-button/copy-button';
import { EmptyState } from '../../../../common/empty-state/empty-state';
import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { PageHeader } from '../../../../common/page-header/page-header';
import { CreateUserDto } from '../../../../core/api/models';
import { toSubmitErrors } from '../../../../core/forms/form-utils';
import { UsersStore } from '../../../../core/stores/users.store';

interface UserFormModel {
  email: string;
  displayName: string;
}

const EMPTY: UserFormModel = { email: '', displayName: '' };

@Component({
  selector: 'app-user-create',
  imports: [DatePipe, FormField, FormFieldGroup, PageHeader, CopyButton, EmptyState],
  templateUrl: './user-create.html',
  styleUrl: './user-create.scss',
})
export class UserCreate {
  protected readonly users = inject(UsersStore);

  protected readonly model = signal<UserFormModel>(EMPTY);

  /** Mirrors `createUserSchema` in the API. */
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter an email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
    maxLength(path.email, 320, { message: 'At most 320 characters.' });
    maxLength(path.displayName, 120, { message: 'At most 120 characters.' });
  });

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    await submit(this.form, async () => {
      try {
        await this.users.create(toDto(this.model()));
        this.form().reset(EMPTY);
        return null;
      } catch (error) {
        return toSubmitErrors(error, {
          fieldFor: (path) =>
            path === 'email'
              ? this.form.email
              : path === 'displayName'
                ? this.form.displayName
                : undefined,
          byStatus: { 409: this.form.email },
        });
      }
    });
  }
}

function toDto(model: UserFormModel): CreateUserDto {
  const displayName = model.displayName.trim();
  return displayName.length > 0
    ? { email: model.email.trim(), displayName }
    : { email: model.email.trim() };
}
