import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, maxLength, required, submit } from '@angular/forms/signals';

import { CopyButton } from '../../../../common/copy-button/copy-button';
import { EmptyState } from '../../../../common/empty-state/empty-state';
import { ErrorBanner } from '../../../../common/error-banner/error-banner';
import { FormFieldGroup } from '../../../../common/form-field/form-field';
import { LoadingIndicator } from '../../../../common/loading-indicator/loading-indicator';
import { PageChange, Pager } from '../../../../common/pager/pager';
import { PageHeader } from '../../../../common/page-header/page-header';
import { CreateUserDto } from '../../../../core/api/models';
import { toSubmitErrors } from '../../../../core/forms/form-utils';
import { UsersStore } from '../../../../core/stores/users.store';

interface UserFormModel {
  email: string;
  displayName: string;
}

const EMPTY: UserFormModel = { email: '', displayName: '' };

/** Every user, newest first, with a form to add one. */
@Component({
  selector: 'app-user-list',
  imports: [
    DatePipe,
    FormField,
    FormFieldGroup,
    PageHeader,
    CopyButton,
    EmptyState,
    ErrorBanner,
    LoadingIndicator,
    Pager,
  ],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss',
})
export class UserList {
  protected readonly users = inject(UsersStore);

  protected readonly model = signal<UserFormModel>(EMPTY);

  /** Mirrors `createUserSchema` in the API. */
  protected readonly form = form(this.model, (path) => {
    required(path.email, { message: 'Enter an email address.' });
    email(path.email, { message: 'Enter a valid email address.' });
    maxLength(path.email, 320, { message: 'At most 320 characters.' });
    maxLength(path.displayName, 120, { message: 'At most 120 characters.' });
  });

  constructor() {
    this.users.load(this.users.query);
  }

  protected page(change: PageChange): void {
    this.users.setPage(change.limit, change.offset);
  }

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
