import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  convertToParamMap,
  provideRouter,
} from '@angular/router';

import { adminGuard } from './admin.guard';
import { AuthStore } from './auth.store';

describe('adminGuard', () => {
  const auth = {
    isAuthenticated: vi.fn<() => boolean>(),
    isAdmin: vi.fn<() => boolean>(),
    consumeReturnUrl: vi.fn<() => string | null>(() => null),
    login: vi.fn<(url?: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  const snapshot = (query: Record<string, string> = {}) =>
    ({ queryParamMap: convertToParamMap(query) }) as ActivatedRouteSnapshot;
  const route = snapshot();
  const state = { url: '/admin/surveys?status=draft' } as RouterStateSnapshot;

  const run = (r = route, s = state) => TestBed.runInInjectionContext(() => adminGuard(r, s));
  const serialize = (result: unknown) => TestBed.inject(Router).serializeUrl(result as UrlTree);

  beforeEach(() => {
    auth.login.mockClear();
    auth.consumeReturnUrl.mockReset().mockReturnValue(null);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthStore, useValue: auth }],
    });
  });

  it('sends an anonymous visitor to sign in with the requested URL', () => {
    auth.isAuthenticated.mockReturnValue(false);
    expect(run()).toBe(false);
    expect(auth.login).toHaveBeenCalledWith('/admin/surveys?status=draft');
  });

  it('redirects a signed-in user without the admin claim to /forbidden', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isAdmin.mockReturnValue(false);
    const result = run();
    expect(result).toBeInstanceOf(UrlTree);
    expect(serialize(result)).toBe('/forbidden');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('lets an admin through', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isAdmin.mockReturnValue(true);
    expect(run()).toBe(true);
  });

  it('sends a just-signed-in admin to the URL they first asked for', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isAdmin.mockReturnValue(true);
    auth.consumeReturnUrl.mockReturnValue('/admin/surveys/abc');
    const result = run(snapshot({ iss: 'http://idp' }), {
      url: '/admin?iss=http://idp',
    } as RouterStateSnapshot);
    expect(serialize(result)).toBe('/admin/surveys/abc');
  });

  it('drops the identity provider leftovers when there is no return URL', () => {
    auth.isAuthenticated.mockReturnValue(true);
    auth.isAdmin.mockReturnValue(true);
    const result = run(snapshot({ iss: 'http://idp' }), {
      url: '/admin?iss=http://idp',
    } as RouterStateSnapshot);
    expect(serialize(result)).toBe('/admin');
  });
});
