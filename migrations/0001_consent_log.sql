-- The consent log: one row per choice (a first choice, and every change after it), never updated, so
-- the history of what someone agreed to and when is kept. Rows link to a browser through consent_id,
-- which is also in the visitor's cc_cookie.
CREATE TABLE consent_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  consent_id TEXT NOT NULL,
  -- When the visitor chose (from their browser), and when the log received it.
  consent_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  -- The page it was made on: the path only, never the query string.
  url TEXT NOT NULL,
  -- From Cloudflare's view of the request: ISO country code and region.
  country TEXT,
  region TEXT,
  -- HMAC-SHA256 of the IP address, keyed with the CONSENT_IP_KEY secret: it can be matched against an
  -- IP someone gives, but not read back.
  ip_hash TEXT,
  user_agent TEXT,
  necessary_consent INTEGER NOT NULL,
  analytics_consent INTEGER NOT NULL,
  advertising_consent INTEGER NOT NULL,
  -- accept_all, reject_all or custom.
  action TEXT NOT NULL,
  -- The banner revision the choice was made against (src/content/consent.yaml).
  revision INTEGER NOT NULL,
  -- production, or preview for branch previews and local runs, so test rows are easy to find.
  environment TEXT NOT NULL
);

CREATE INDEX consent_log_consent_id ON consent_log (consent_id);
CREATE INDEX consent_log_created_at ON consent_log (created_at);
