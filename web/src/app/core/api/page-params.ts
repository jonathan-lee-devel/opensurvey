import { HttpParams } from '@angular/common/http';

import { PageQuery } from './models';

/** Query string for the API's paged lists; omits what the API would default. */
export function pageParams(query: PageQuery): HttpParams {
  let params = new HttpParams();
  if (query.limit !== undefined) {
    params = params.set('limit', String(query.limit));
  }
  if (query.offset !== undefined) {
    params = params.set('offset', String(query.offset));
  }
  return params;
}
