// The GitHub contributions calendar behind the home page's "still shipping" section, fetched when the
// site is built (no visitor's browser ever talks to GitHub). Where it comes from, first that answers:
//   1. CONTRIBUTIONS_FIXTURE, a file of sample data: the tests set it, so their results never change;
//   2. GitHub's GraphQL API, with GITHUB_CONTRIBUTIONS_TOKEN (a build secret on the site's Worker in
//      Cloudflare: read-only, public repositories only);
//   3. the copy the live site published at /github-contributions.json on its last build, so a refresh
//      that fails (an expired token, GitHub down) keeps the last good graph up.
// If none answers, the section is left out and the build log says why.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { SITE, SOCIAL } from '../consts';

/** GitHub's own four quartiles, and none. */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface ContributionDay {
  /** YYYY-MM-DD, as GitHub gives it. */
  date: string;
  count: number;
  level: Level;
}

/** The calendar as the site keeps it, and as it's published at /github-contributions.json. */
export interface Contributions {
  login: string;
  /** When GitHub was last asked (ISO 8601). A copy kept from an earlier build keeps its own date. */
  fetchedAt: string;
  /** Contributions in the year, private ones included. */
  total: number;
  /** How many of them are in private repositories (GitHub's restricted count). */
  private: number;
  /** Every day of the year, oldest first, ending today. */
  days: ContributionDay[];
}

/** Where the live site publishes the copy each build used. */
export const PUBLISHED_PATH = '/github-contributions.json';

/** The GitHub account, from the profile link in the footer. */
export const LOGIN = new URL(SOCIAL.github.href).pathname.replace(/^\/|\/$/g, '');

const LEVELS: Record<string, Level> = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};

const QUERY = `query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount contributionLevel } }
      }
    }
  }
}`;

const DAY = 86_400_000;
const time = (date: string) => Date.parse(`${date}T00:00:00Z`);
const count = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 0;

/** Whether something is a whole, sensible calendar: about a year of consecutive days. */
export function isContributions(value: unknown): value is Contributions {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Contributions>;
  if (typeof c.login !== 'string' || typeof c.fetchedAt !== 'string') return false;
  if (Number.isNaN(Date.parse(c.fetchedAt))) return false;
  if (!count(c.total) || !count(c.private) || c.private > c.total) return false;
  if (!Array.isArray(c.days) || c.days.length < 360 || c.days.length > 372) return false;
  return c.days.every(
    (d, i, days) =>
      typeof d?.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(d.date) &&
      count(d.count) &&
      [0, 1, 2, 3, 4].includes(d.level) &&
      (d.count === 0) === (d.level === 0) &&
      (i === 0 || time(d.date) - time(days[i - 1]!.date) === DAY),
  );
}

interface GraphQLResponse {
  data?: {
    user?: {
      contributionsCollection?: {
        restrictedContributionsCount?: number;
        contributionCalendar?: {
          totalContributions?: number;
          weeks?: {
            contributionDays?: {
              date: string;
              contributionCount: number;
              contributionLevel: string;
            }[];
          }[];
        };
      };
    } | null;
  };
  errors?: { message: string }[];
}

/** GitHub's answer as the site keeps it. Throws if it isn't a whole calendar. */
export function fromGitHub(response: GraphQLResponse, login: string, now: Date): Contributions {
  if (response.errors?.length) throw new Error(response.errors.map((e) => e.message).join('; '));
  const collection = response.data?.user?.contributionsCollection;
  const calendar = collection?.contributionCalendar;
  const data = {
    login,
    fetchedAt: now.toISOString(),
    total: calendar?.totalContributions,
    private: collection?.restrictedContributionsCount,
    days: (calendar?.weeks ?? []).flatMap((week) =>
      (week.contributionDays ?? []).map((d) => ({
        date: d.date,
        count: d.contributionCount,
        level: LEVELS[d.contributionLevel],
      })),
    ),
  };
  if (!isContributions(data)) throw new Error("GitHub's answer isn't a whole year's calendar");
  return data;
}

async function fromFixture(path: string): Promise<Contributions> {
  const data: unknown = JSON.parse(await readFile(resolve(process.cwd(), path), 'utf8'));
  if (!isContributions(data)) throw new Error(`${path} isn't a whole year's calendar`);
  return data;
}

async function fetchGitHub(token: string): Promise<Contributions> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'harrisonjennings.au build',
    },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
  return fromGitHub((await res.json()) as GraphQLResponse, LOGIN, new Date());
}

async function fetchPublished(): Promise<Contributions> {
  const res = await fetch(`${SITE.url}${PUBLISHED_PATH}`, {
    headers: { 'User-Agent': 'harrisonjennings.au build' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`the live site answered ${res.status}`);
  const data: unknown = await res.json().catch(() => null);
  if (!isContributions(data)) throw new Error("the live site's copy isn't a whole year's calendar");
  return data;
}

const warn = (message: string) => console.warn(`[contributions] ${message}`);
const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function load(): Promise<Contributions | null> {
  const fixture = process.env['CONTRIBUTIONS_FIXTURE'];
  if (fixture) return fromFixture(fixture);

  const token = process.env['GITHUB_CONTRIBUTIONS_TOKEN'];
  if (token) {
    try {
      return await fetchGitHub(token);
    } catch (error) {
      warn(`GitHub didn't answer (${reason(error)}); trying the live site's copy`);
    }
  }
  try {
    const data = await fetchPublished();
    console.info(`[contributions] using the live site's copy from ${data.fetchedAt}`);
    return data;
  } catch (error) {
    warn(`no calendar (${reason(error)}): "still shipping" is left out of this build`);
    return null;
  }
}

let loaded: Promise<Contributions | null> | undefined;

/** The calendar, asked for once per build. */
export function getContributions(): Promise<Contributions | null> {
  loaded ??= load();
  return loaded;
}

// ---------- the grid, the words ----------

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** "no contributions", "1 contribution", "16 contributions". */
export function countText(n: number): string {
  if (n === 0) return 'no contributions';
  return `${n.toLocaleString('en-AU')} contribution${n === 1 ? '' : 's'}`;
}

/** "8 November", with the year when it isn't `year`: "16 November 2025". */
export function dateText(date: string, year: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]}${y === year ? '' : ` ${y}`}`;
}

export interface Cell extends ContributionDay {
  /** The tooltip's sentence, and the day's accessible name: "16 contributions on 8 November". */
  label: string;
  today: boolean;
}

export interface Month {
  /** "nov", or empty for a month with a single week (its label would collide). */
  short: string;
  /** "November", for screen readers, or empty. */
  name: string;
  /** How many weeks it heads. */
  span: number;
}

export interface Calendar {
  /** Seven rows, Sunday first; each a cell per week, or null before the first day or after today. */
  rows: (Cell | null)[][];
  months: Month[];
  /** The line for screen readers: the busiest day and how many days had any. */
  more: string;
}

/** The grid as it's drawn: weeks in columns, Sunday first, like GitHub's. */
export function calendar(data: Contributions): Calendar {
  const first = time(data.days[0]!.date);
  const lead = new Date(first).getUTCDay();
  const weeks = Math.ceil((lead + data.days.length) / 7);
  const last = data.days.at(-1)!;
  const year = Number(last.date.slice(0, 4));

  const rows: (Cell | null)[][] = Array.from({ length: 7 }, () => Array(weeks).fill(null));
  data.days.forEach((day, i) => {
    const slot = lead + i;
    rows[slot % 7]![Math.floor(slot / 7)] = {
      ...day,
      label: `${countText(day.count)} on ${dateText(day.date, year)}`,
      today: day === last,
    };
  });

  // Each week belongs to the month of its Sunday.
  const months: Month[] = [];
  let current = -1;
  for (let w = 0; w < weeks; w++) {
    const month = new Date(first + (w * 7 - lead) * DAY).getUTCMonth();
    if (month !== current) months.push({ short: '', name: MONTHS[month]!, span: 0 });
    current = month;
    months.at(-1)!.span++;
  }
  for (const m of months) {
    if (m.span < 2) m.name = '';
    m.short = m.name.slice(0, 3).toLowerCase();
  }

  const busiest = data.days.reduce((a, b) => (b.count >= a.count ? b : a));
  const active = data.days.filter((d) => d.count > 0).length;
  const more = [
    busiest.count > 0 &&
      `The busiest day was ${dateText(busiest.date, year)}, with ${countText(busiest.count)}.`,
    `There were contributions on ${active} of the last ${data.days.length} days.`,
  ]
    .filter(Boolean)
    .join(' ');

  return { rows, months, more };
}
