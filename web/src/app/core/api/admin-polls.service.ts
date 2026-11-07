import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminPoll, CreatePollDto } from './models';

/** `/admin/polls`: one method per handler of the API's AdminPollsController. */
@Service()
export class AdminPollsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/polls`;

  create(dto: CreatePollDto): Observable<AdminPoll> {
    return this.http.post<AdminPoll>(this.baseUrl, dto);
  }
}
