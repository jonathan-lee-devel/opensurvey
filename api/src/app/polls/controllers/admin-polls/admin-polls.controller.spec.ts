import { Test, TestingModule } from '@nestjs/testing';

import { AdminPollsService } from '../../services/admin-polls/admin-polls.service.js';
import { AdminPollsController } from './admin-polls.controller.js';
import { CreatePollDto } from './admin-polls.schema.js';

describe('AdminPollsController', () => {
  let controller: AdminPollsController;
  const create = vi.fn();

  beforeEach(async () => {
    create.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminPollsController],
      providers: [{ provide: AdminPollsService, useValue: { create } }],
    }).compile();

    controller = module.get<AdminPollsController>(AdminPollsController);
  });

  it('delegates to the service and returns its result', async () => {
    const dto: CreatePollDto = {
      ownerId: '11111111-1111-4111-8111-111111111111',
      question: 'Lunch?',
      slug: 'lunch',
      status: 'draft',
      closesAt: null,
      options: ['Pizza', 'Tacos'],
    };
    const poll = { id: 'p1', ...dto };
    create.mockResolvedValue(poll);
    await expect(controller.create(dto)).resolves.toBe(poll);
    expect(create).toHaveBeenCalledWith(dto);
  });
});
