/** Dates are written out: "13 August 2026". Content dates are calendar dates, so they're read as UTC. */
const long = new Intl.DateTimeFormat('en-AU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export const formatDate = (date: Date): string => long.format(date);

/** The machine-readable form for <time datetime>: "2026-08-13". */
export const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const offsetFormat = new Intl.DateTimeFormat('en-AU', {
  timeZone: 'Australia/Melbourne',
  timeZoneName: 'longOffset',
});
/** Melbourne's UTC offset at an instant: "+11:00" in daylight saving, "+10:00" otherwise. */
const melbourneOffset = (instant: number): string =>
  offsetFormat
    .formatToParts(instant)
    .find((part) => part.type === 'timeZoneName')
    ?.value.replace('GMT', '') || '+00:00';

/**
 * A content date as the start of that day in Melbourne, with its offset: "2026-10-16T00:00:00+11:00".
 * For structured data, which wants a time zone. The offset is the one in force at local midnight
 * (daylight saving starts and ends at 2–3 am, so midday's can differ).
 */
export function melbourneMidnight(date: Date): string {
  const day = isoDate(date);
  let offset = melbourneOffset(Date.parse(`${day}T00:00:00Z`));
  offset = melbourneOffset(Date.parse(`${day}T00:00:00${offset}`));
  return `${day}T00:00:00${offset}`;
}
