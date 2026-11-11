import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  calendar,
  countText,
  dateText,
  fromGitHub,
  isContributions,
  type Contributions,
} from '../../src/lib/contributions';

const fixture = JSON.parse(
  readFileSync(new URL('../e2e/fixtures/contributions.json', import.meta.url), 'utf8'),
) as Contributions;

describe('the words', () => {
  it('counts like GitHub does', () => {
    expect(countText(0)).toBe('no contributions');
    expect(countText(1)).toBe('1 contribution');
    expect(countText(16)).toBe('16 contributions');
    expect(countText(1234)).toBe('1,234 contributions');
  });

  it('dates in Australian order, with the year only outside the current one', () => {
    expect(dateText('2026-11-08', 2026)).toBe('8 November');
    expect(dateText('2025-11-16', 2026)).toBe('16 November 2025');
  });
});

describe('a calendar', () => {
  it('accepts the fixture', () => {
    expect(isContributions(fixture)).toBe(true);
  });

  it('refuses anything that isn’t a whole year of consecutive days', () => {
    expect(isContributions(null)).toBe(false);
    expect(isContributions({ ...fixture, days: fixture.days.slice(0, 100) })).toBe(false);
    const gap = fixture.days.filter((_, i) => i !== 200);
    expect(isContributions({ ...fixture, days: gap })).toBe(false);
    const levels = fixture.days.map((d, i) => (i === 10 ? { ...d, count: 3, level: 0 } : d));
    expect(isContributions({ ...fixture, days: levels })).toBe(false);
    expect(isContributions({ ...fixture, private: fixture.total + 1 })).toBe(false);
  });

  it("reads GitHub's answer", () => {
    const weeks = Array.from({ length: 53 }, (_, w) => ({
      contributionDays: Array.from({ length: w === 52 ? 3 : 7 }, (_, d) => {
        const date = new Date(Date.UTC(2025, 10, 9) + (w * 7 + d) * 86_400_000);
        return {
          date: date.toISOString().slice(0, 10),
          contributionCount: d === 1 ? 2 : 0,
          contributionLevel: d === 1 ? 'SECOND_QUARTILE' : 'NONE',
        };
      }),
    }));
    const data = fromGitHub(
      {
        data: {
          user: {
            contributionsCollection: {
              restrictedContributionsCount: 40,
              contributionCalendar: { totalContributions: 106, weeks },
            },
          },
        },
      },
      'harrison-jennings',
      new Date('2026-11-11T01:17:00Z'),
    );
    expect(data.days).toHaveLength(367);
    expect(data.days[1]).toEqual({ date: '2025-11-10', count: 2, level: 2 });
    expect(data).toMatchObject({ total: 106, private: 40, fetchedAt: '2026-11-11T01:17:00.000Z' });
  });

  it('throws on GitHub errors, or a missing user', () => {
    expect(() => fromGitHub({ errors: [{ message: 'Bad credentials' }] }, 'x', new Date())).toThrow(
      'Bad credentials',
    );
    expect(() => fromGitHub({ data: { user: null } }, 'x', new Date())).toThrow();
  });
});

describe('the grid', () => {
  const grid = calendar(fixture);

  it('has seven rows, Sunday first, with the year in week columns', () => {
    expect(grid.rows).toHaveLength(7);
    expect(new Set(grid.rows.map((r) => r.length))).toEqual(new Set([53]));
    // The fixture starts on a Wednesday: Sunday to Tuesday of the first week have no day.
    expect(grid.rows.slice(0, 3).map((r) => r[0])).toEqual([null, null, null]);
    expect(grid.rows[3]![0]!.date).toBe('2025-11-12');
  });

  it('marks today, and names each day in words', () => {
    const days = grid.rows.flat().filter((d) => d !== null);
    expect(days).toHaveLength(365);
    expect(days.filter((d) => d.today).map((d) => d.date)).toEqual(['2026-11-11']);
    const label = (date: string) => days.find((d) => d.date === date)?.label;
    expect(label('2026-11-08')).toBe('16 contributions on 8 November');
    expect(label('2026-11-09')).toBe('49 contributions on 9 November');
    expect(label('2026-11-10')).toBe('no contributions on 10 November');
    expect(label('2025-11-22')).toBe('4 contributions on 22 November 2025');
  });

  it('labels months with two weeks or more, across the 53 columns', () => {
    expect(grid.months.reduce((n, m) => n + m.span, 0)).toBe(53);
    expect(grid.months.every((m) => (m.span < 2 ? m.short === '' : m.short.length === 3))).toBe(
      true,
    );
    expect(grid.months[0]).toMatchObject({ short: 'nov', name: 'November' });
  });

  it('tells screen readers the busiest day and how many days had any', () => {
    expect(grid.more).toBe(
      'The busiest day was 9 November, with 49 contributions. There were contributions on 144 of the last 365 days.',
    );
  });
});
