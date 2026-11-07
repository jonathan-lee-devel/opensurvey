import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateSubmissionDto, PublicSubmission, PublicSurvey } from './models';

/**
 * `/public/surveys`: the anonymous routes respondents use. No token travels
 * with these calls (`authInterceptor` leaves `/public/` alone).
 */
@Service()
export class PublicSurveysService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/public/surveys`;

  findBySlug(slug: string): Observable<PublicSurvey> {
    return this.http.get<PublicSurvey>(`${this.baseUrl}/${encodeURIComponent(slug)}`);
  }

  /**
   * Posts a submission. `idempotencyKey` is unique per attempt; a retry of the
   * same attempt resends the same key and gets the first result back.
   */
  submit(
    slug: string,
    dto: CreateSubmissionDto,
    idempotencyKey: string,
  ): Observable<PublicSubmission> {
    return this.http.post<PublicSubmission>(
      `${this.baseUrl}/${encodeURIComponent(slug)}/submissions`,
      dto,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    );
  }
}
