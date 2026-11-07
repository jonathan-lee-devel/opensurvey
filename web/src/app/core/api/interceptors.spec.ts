import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { authInterceptor } from '../auth/auth.interceptor';
import { ApiError } from './api-error';
import { apiErrorInterceptor } from './api-error.interceptor';

describe('HTTP interceptors', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  const auth = {
    accessToken: vi.fn<() => string | null>(() => 'token-123'),
    login: vi.fn(),
  };

  beforeEach(() => {
    auth.accessToken.mockReturnValue('token-123');
    auth.login.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthStore, useValue: auth },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('adds the Bearer token to protected API calls', () => {
    http.get('/api/admin/surveys').subscribe();
    const request = backend.expectOne('/api/admin/surveys');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-123');
    request.flush({ items: [], total: 0 });
  });

  it('leaves public API routes and other origins anonymous', () => {
    http.get('/api/public/surveys/demo').subscribe();
    http
      .get('http://localhost:8180/realms/opensurvey/.well-known/openid-configuration')
      .subscribe();
    for (const request of backend.match(() => true)) {
      expect(request.request.headers.has('Authorization')).toBe(false);
      request.flush({});
    }
  });

  it('sends no header when nobody is signed in', () => {
    auth.accessToken.mockReturnValue(null);
    http.get('/api/admin/surveys').subscribe();
    const request = backend.expectOne('/api/admin/surveys');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('turns an API failure into an ApiError with field errors', async () => {
    const pending = firstValueFrom(http.post('/api/admin/surveys', {}));
    backend
      .expectOne('/api/admin/surveys')
      .flush(
        { statusCode: 400, message: ['slug: Required'], error: 'Bad Request' },
        { status: 400, statusText: 'Bad Request' },
      );
    const error: unknown = await pending.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({ slug: 'Required' });
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('starts a new sign-in on a 401 from the API', async () => {
    const pending = firstValueFrom(http.get('/api/admin/surveys'));
    backend
      .expectOne('/api/admin/surveys')
      .flush(
        { statusCode: 401, message: 'Token expired', error: 'Unauthorized' },
        { status: 401, statusText: 'Unauthorized' },
      );
    const error: unknown = await pending.catch((e: unknown) => e);
    expect((error as ApiError).status).toBe(401);
    expect(auth.login).toHaveBeenCalledTimes(1);
  });

  it('does not touch failures from other servers', async () => {
    const pending = firstValueFrom(http.get('http://localhost:8180/token'));
    backend
      .expectOne('http://localhost:8180/token')
      .flush('nope', { status: 401, statusText: 'Unauthorized' });
    const error: unknown = await pending.catch((e: unknown) => e);
    expect(error).not.toBeInstanceOf(ApiError);
    expect(auth.login).not.toHaveBeenCalled();
  });
});
