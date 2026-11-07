import { TestBed } from '@suites/unit';

import { AdminPollsService } from '../../services/admin-polls/admin-polls.service.js';
import { AdminPollsController } from './admin-polls.controller.js';
import { CreatePollDto } from './admin-polls.schema.js';

describe('AdminPollsController', () => {
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
    const { unit, unitRef } = await TestBed.solitary(AdminPollsController)
      .mock(AdminPollsService)
      .impl((stub) => ({ create: stub().mockResolvedValue(poll) }))
      .compile();

    await expect(unit.create(dto)).resolves.toBe(poll);
    expect(unitRef.get(AdminPollsService).create).toHaveBeenCalledWith(dto);
  });
});
