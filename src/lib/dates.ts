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
