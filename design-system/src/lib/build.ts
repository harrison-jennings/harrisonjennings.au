// The build stamp: which commit the design system was built from, and when, so it's clear how
// current it is. Workers Builds provides the commit; elsewhere it's read from git.
import { execSync } from 'node:child_process';
import { formatDate } from '../../../src/lib/dates';

function commit(): string {
  const fromCloudflare = process.env['WORKERS_CI_COMMIT_SHA'];
  if (fromCloudflare) return fromCloudflare;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const sha = commit();

export const BUILD = {
  commit: sha.slice(0, 7),
  commitUrl: sha ? `https://github.com/harrison-jennings/harrisonjennings.au/commit/${sha}` : '',
  date: formatDate(new Date()),
};
