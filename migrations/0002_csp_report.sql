-- Content-Security-Policy violation reports (src/worker/csp-report.ts). One row per distinct
-- violation, counted, so a busy week of reports stays a short list of what the policy still misses.
-- No visitor data: pages and blocked addresses are stored without query strings.
CREATE TABLE csp_report (
  -- The directive broken (such as script-src-elem) and what was refused: an origin and path, or a
  -- keyword such as inline or eval.
  directive TEXT NOT NULL,
  blocked TEXT NOT NULL,
  -- The page, as a path, and the script responsible (origin, path and line), when there is one.
  page TEXT NOT NULL,
  source TEXT NOT NULL,
  -- production, or preview for branch previews and local runs.
  environment TEXT NOT NULL,
  -- The first characters of the inline script or eval refused, from the latest report.
  sample TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (directive, blocked, page, source, environment)
);
