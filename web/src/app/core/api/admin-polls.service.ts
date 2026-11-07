import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AdminPoll, AdminPollList, CreatePollDto, ListPollsQuery } from './models';
import { pageParams } from './page-params';

/** `/admin/polls`: one method per handler of the API's AdminPollsController. */
@Service()
export class AdminPollsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/polls`;

  create(dto: CreatePollDto): Observable<AdminPoll> {
    return this.http.post<AdminPoll>(this.baseUrl, dto);
  }

  list(query: ListPollsQuery = {}): Observable<AdminPollList> {
    let params: HttpParams = pageParams(query);
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<AdminPollList>(this.baseUrl, { params });
  }

  findById(id: string): Observable<AdminPoll> {
    return this.http.get<AdminPoll>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }
}
