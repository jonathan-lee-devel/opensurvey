import type { Request } from 'express';

import { clientMetadataFrom } from './client-metadata.decorator.js';

const requestWith = (ip: string | undefined, headers: Record<string, string>) =>
  ({
    ip,
    get: (name: string) => headers[name.toLowerCase()],
  }) as unknown as Request;

describe('clientMetadataFrom', () => {
  it('reads the address, user agent and referer off the request', () => {
    expect(
      clientMetadataFrom(
        requestWith('203.0.113.7', {
          'user-agent': 'curl/8.0',
          referer: 'https://example.com/survey',
        }),
      ),
    ).toEqual({
      ipAddress: '203.0.113.7',
      userAgent: 'curl/8.0',
      referer: 'https://example.com/survey',
    });
  });

  it('turns what the request lacks into nulls', () => {
    expect(clientMetadataFrom(requestWith(undefined, {}))).toEqual({
      ipAddress: null,
      userAgent: null,
      referer: null,
    });
  });
});
