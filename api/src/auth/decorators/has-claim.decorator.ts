import { SetMetadata } from '@nestjs/common';

import { REQUIRED_CLAIMS_KEY } from '../auth.constants.js';

/**
 * Requires the caller's token to hold every listed claim (see `hasClaim()` in
 * `claims.ts` for what counts), on top of being authenticated. Claims on the
 * controller and on the handler add up. `ClaimsGuard` answers 403 when one is
 * missing.
 *
 * @example
 * @HasClaim('azg12345_SurveyAdmin')
 * @Get(':id/submissions')
 * listSubmissions() {}
 */
export const HasClaim = (claim: string, ...more: string[]) =>
  SetMetadata(REQUIRED_CLAIMS_KEY, [claim, ...more]);
