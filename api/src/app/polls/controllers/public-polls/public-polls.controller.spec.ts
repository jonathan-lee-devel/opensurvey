import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicPollsController } from './public-polls.controller.js';

describe('PublicPollsController', () => {
  let controller: PublicPollsController;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPollsController],
      providers: [
        {
          provide: getDrizzleToken(),
          useValue: { query: { polls: { findFirst } } },
        },
      ],
    }).compile();

    controller = module.get<PublicPollsController>(PublicPollsController);
  });

  it('returns the poll the database finds', async () => {
    const poll = { id: '1', slug: 'lunch', options: [] };
    findFirst.mockResolvedValue(poll);
    await expect(controller.findBySlug('lunch')).resolves.toBe(poll);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('answers 404 when no published poll has the slug', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(controller.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
