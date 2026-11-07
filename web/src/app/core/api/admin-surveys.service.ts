import { HttpClient, HttpParams } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminSubmissionList,
  AdminSurvey,
  AdminSurveyList,
  CreateSurveyDto,
  ListSubmissionsQuery,
  ListSurveysQuery,
  UpdateSurveyDto,
} from './models';
import { pageParams } from './page-params';

/** `/admin/surveys`: one method per handler of the API's AdminSurveysController. */
@Service()
export class AdminSurveysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/surveys`;

  create(dto: CreateSurveyDto): Observable<AdminSurvey> {
    return this.http.post<AdminSurvey>(this.baseUrl, dto);
  }

  list(query: ListSurveysQuery = {}): Observable<AdminSurveyList> {
    let params: HttpParams = pageParams(query);
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<AdminSurveyList>(this.baseUrl, { params });
  }

  findById(id: string): Observable<AdminSurvey> {
    return this.http.get<AdminSurvey>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  update(id: string, dto: UpdateSurveyDto): Observable<AdminSurvey> {
    return this.http.patch<AdminSurvey>(`${this.baseUrl}/${encodeURIComponent(id)}`, dto);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  listSubmissions(id: string, query: ListSubmissionsQuery = {}): Observable<AdminSubmissionList> {
    return this.http.get<AdminSubmissionList>(
      `${this.baseUrl}/${encodeURIComponent(id)}/submissions`,
      { params: pageParams(query) },
    );
  }
}
