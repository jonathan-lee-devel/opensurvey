import { Test, TestingModule } from '@nestjs/testing';

import { PublicPollsService } from '../../services/public-polls/public-polls.service.js';
import { PublicPollsController } from './public-polls.controller.js';

describe('PublicPollsController', () => {
  let controller: PublicPollsController;
  const findBySlug = vi.fn();

  beforeEach(async () => {
    findBySlug.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPollsController],
      providers: [{ provide: PublicPollsService, useValue: { findBySlug } }],
    }).compile();

    controller = module.get<PublicPollsController>(PublicPollsController);
  });

  it('delegates to the service and returns its result', async () => {
    const poll = { id: '1', slug: 'lunch', options: [] };
    findBySlug.mockResolvedValue(poll);
    await expect(controller.findBySlug('lunch')).resolves.toBe(poll);
    expect(findBySlug).toHaveBeenCalledWith('lunch');
  });
});
