import { toLocalDateTime } from './poll-detail';

describe('toLocalDateTime', () => {
  it('formats an instant as the local value a datetime-local input shows', () => {
    const iso = '2030-01-01T12:34:00.000Z';
    const local = toLocalDateTime(iso);
    expect(local).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    // Round-trips to the same instant, whatever the test machine's zone.
    expect(new Date(local).toISOString()).toBe(iso);
  });

  it('is empty for an open poll or garbage', () => {
    expect(toLocalDateTime(null)).toBe('');
    expect(toLocalDateTime('not a date')).toBe('');
  });
});
