import { TestBed } from '@suites/unit';

import { PublicPollsService } from '../../services/public-polls/public-polls.service.js';
import { PublicPollsController } from './public-polls.controller.js';

describe('PublicPollsController', () => {
  it('delegates to the service and returns its result', async () => {
    const poll = { id: '1', slug: 'lunch', options: [] };
    const { unit, unitRef } = await TestBed.solitary(PublicPollsController)
      .mock(PublicPollsService)
      .impl((stub) => ({ findBySlug: stub().mockResolvedValue(poll) }))
      .compile();

    await expect(unit.findBySlug('lunch')).resolves.toBe(poll);
    expect(unitRef.get(PublicPollsService).findBySlug).toHaveBeenCalledWith(
      'lunch',
    );
  });
});
