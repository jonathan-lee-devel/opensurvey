import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminUser, CreateUserDto } from './models';

/** `/admin/users`: one method per handler of the API's AdminUsersController. */
@Service()
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  create(dto: CreateUserDto): Observable<AdminUser> {
    return this.http.post<AdminUser>(this.baseUrl, dto);
  }
}
