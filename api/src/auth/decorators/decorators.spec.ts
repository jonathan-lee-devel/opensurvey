import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY, REQUIRED_CLAIMS_KEY } from '../auth.constants.js';
import { HasClaim } from './has-claim.decorator.js';
import { IsPublic } from './is-public.decorator.js';

@Controller('things')
@HasClaim('viewer')
class ThingsController {
  @Get('mine')
  @HasClaim('owner', 'editor')
  mine() {}

  @Get()
  @IsPublic()
  list() {}

  @Get('plain')
  plain() {}
}

const reflector = new Reflector();
const proto = ThingsController.prototype;

describe('IsPublic', () => {
  it('marks a handler, and nothing else, as public', () => {
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        proto.list,
        ThingsController,
      ]),
    ).toBe(true);
    expect(
      reflector.getAllAndOverride(IS_PUBLIC_KEY, [
        proto.plain,
        ThingsController,
      ]),
    ).toBeUndefined();
  });
});

describe('HasClaim', () => {
  it('merges the claims of the controller and the handler', () => {
    expect(
      reflector.getAllAndMerge(REQUIRED_CLAIMS_KEY, [
        ThingsController,
        proto.mine,
      ]),
    ).toEqual(['viewer', 'owner', 'editor']);
  });

  it('leaves the controller claims on a handler without its own', () => {
    expect(
      reflector.getAllAndMerge(REQUIRED_CLAIMS_KEY, [
        ThingsController,
        proto.plain,
      ]),
    ).toEqual(['viewer']);
  });
});
