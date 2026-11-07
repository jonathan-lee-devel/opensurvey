import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicPollsService } from './public-polls.service.js';

describe('PublicPollsService', () => {
  let service: PublicPollsService;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicPollsService,
        {
          provide: getDrizzleToken(),
          useValue: { query: { polls: { findFirst } } },
        },
      ],
    }).compile();

    service = module.get<PublicPollsService>(PublicPollsService);
  });

  it('returns the poll the database finds', async () => {
    const poll = { id: '1', slug: 'lunch', options: [] };
    findFirst.mockResolvedValue(poll);
    await expect(service.findBySlug('lunch')).resolves.toBe(poll);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no published poll has the slug', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
