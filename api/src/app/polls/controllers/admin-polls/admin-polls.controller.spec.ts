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

  it('passes the list query to the service and returns the page', async () => {
    const page = { items: [], total: 0 };
    const { unit, unitRef } = await TestBed.solitary(AdminPollsController)
      .mock(AdminPollsService)
      .impl((stub) => ({ list: stub().mockResolvedValue(page) }))
      .compile();

    const query = { limit: 10, offset: 0, status: 'published' as const };
    await expect(unit.list(query)).resolves.toBe(page);
    expect(unitRef.get(AdminPollsService).list).toHaveBeenCalledWith(query);
  });

  it('passes the id to the service and returns the poll', async () => {
    const poll = { id: 'p1', question: 'Lunch?', options: [] };
    const { unit, unitRef } = await TestBed.solitary(AdminPollsController)
      .mock(AdminPollsService)
      .impl((stub) => ({ findById: stub().mockResolvedValue(poll) }))
      .compile();

    await expect(unit.findById('p1')).resolves.toBe(poll);
    expect(unitRef.get(AdminPollsService).findById).toHaveBeenCalledWith('p1');
  });
});
