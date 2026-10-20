import { describe, expect, it } from 'vitest';
import { formatDate, isoDate, melbourneMidnight } from '../../src/lib/dates';

describe('formatDate', () => {
  it('writes dates out, day first', () => {
    expect(formatDate(new Date('2026-08-13'))).toBe('13 August 2026');
    expect(formatDate(new Date('2026-10-04'))).toBe('4 October 2026');
  });

  it('keeps the calendar date whatever the time zone', () => {
    // A front matter date is midnight UTC; in Melbourne that's still the same day, in LA the day before.
    expect(formatDate(new Date('2026-01-01T00:00:00Z'))).toBe('1 January 2026');
    expect(formatDate(new Date('2026-12-31T00:00:00Z'))).toBe('31 December 2026');
  });
});

describe('isoDate', () => {
  it('gives the machine-readable date for <time datetime>', () => {
    expect(isoDate(new Date('2026-08-13'))).toBe('2026-08-13');
  });
});

describe('melbourneMidnight', () => {
  it("gives the start of the day in Melbourne with that day's offset", () => {
    expect(melbourneMidnight(new Date('2026-07-01'))).toBe('2026-07-01T00:00:00+10:00');
    expect(melbourneMidnight(new Date('2026-10-16'))).toBe('2026-10-16T00:00:00+11:00');
  });

  it('uses the offset at midnight on the days daylight saving starts and ends', () => {
    // Daylight saving ends at 3 am on 5 April 2026 and starts at 2 am on 4 October 2026.
    expect(melbourneMidnight(new Date('2026-04-05'))).toBe('2026-04-05T00:00:00+11:00');
    expect(melbourneMidnight(new Date('2026-10-04'))).toBe('2026-10-04T00:00:00+10:00');
  });
});
