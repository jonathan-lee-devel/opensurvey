import { CacheInterceptor } from '@nestjs/cache-manager';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants.js';
import { TestBed } from '@suites/unit';

import { PublicUsersService } from '../../services/public-users/public-users.service.js';
import { PublicUsersController } from './public-users.controller.js';

describe('PublicUsersController', () => {
  it('delegates to the service and returns its result', async () => {
    const user = { id: '1', displayName: 'Ada' };
    const { unit, unitRef } = await TestBed.solitary(PublicUsersController)
      .mock(PublicUsersService)
      .impl((stub) => ({ findOne: stub().mockResolvedValue(user) }))
      .compile();

    await expect(unit.findOne('1')).resolves.toBe(user);
    expect(unitRef.get(PublicUsersService).findOne).toHaveBeenCalledWith('1');
  });

  it('caches its responses with CacheInterceptor', () => {
    expect(
      Reflect.getMetadata(INTERCEPTORS_METADATA, PublicUsersController),
    ).toEqual([CacheInterceptor]);
  });
});
