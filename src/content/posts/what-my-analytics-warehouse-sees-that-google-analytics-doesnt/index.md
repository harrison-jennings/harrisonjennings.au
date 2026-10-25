---
title: "what my analytics warehouse sees that Google Analytics doesn't"
description: "GA4 showed 51 page views in a week. My BigQuery warehouse counted 232. On building a tested, privacy-first analytics layer for a personal site, and a consent puzzle."
searchTitle: "GA4 BigQuery export and Dataform: a small analytics warehouse"
searchDescription: "How I built a GA4 and Search Console warehouse in BigQuery with Dataform, why it counted 232 page views to GA4's 51, and how Consent Mode really behaves."
published: 2026-10-25
topics: [analytics, cloud]
draft: false
---

For the week of 18 to 24 October 2026, Google Analytics told me this site had 51 page views. My analytics warehouse, reading the raw data GA4 itself exports, counted 232.

Neither number is wrong. GA4's reports showed exactly the page views from visitors who said yes to analytics cookies: 51 in the interface, 51 consented page views in the export, matching day by day. The other 181 came from visitors who didn't consent. GA4 receives those as cookieless pings, but it doesn't show them as page views. So for that week, 78% of page views were invisible in the reports I'd been checking.

![Stacked bar chart of page views for each day from 18 to 24 October 2026. Consented page views sit at the base of each bar and cookieless page views above them. A marker for GA4's own daily figure lands exactly on top of the consented part every day. Week totals: GA4 interface 51, consented in the export 51, cookieless in the export 181, all page views 232.](./weekly-page-views.svg 'Early, launch-week data that includes my own testing. 18 and 19 October are still the old WordPress site.')

:::note
Caveats up front, because they matter. This is early data from launch week. It includes a fair amount of my own testing, especially on launch day, 20 October. And 18 and 19 October are still the old WordPress site. On the new site alone (21 to 24 October), GA4 showed 24 page views and the warehouse counted 171, so 86% cookieless. Those percentages will settle as real visitors replace me clicking around in private windows. But the gap is measured, not modelled, and it's the best answer I have to "why on earth did you build this?"
:::

## a personal site does not need this

Let me get this out of the way: a personal site with this little traffic does not need an analytics warehouse. Nobody is waiting on my weekly KPI deck. But this site has always doubled as my playground, so I built one anyway. The reasons going in:

- **See the whole audience**, including people who decline analytics cookies.
- **Own the history instead of renting it.** GA4's explorations keep user-level data for at most 14 months on a standard property; the Search Console interface shows 16.
- **Use definitions I can read and test**, rather than numbers computed somewhere I can't see.
- **Join GA4 and Search Console** at a grain that makes sense.
- **Practise analytics engineering properly** on a project small enough to show end to end.

## the stack it sits on

This sits downstream of a measurement set-up I've written about before. The site has its own cookie banner (essential, analytics and advertising) and uses Google's Advanced Consent Mode v2: until someone chooses, everything is denied and Google receives only cookieless pings, with no identifiers. Tag Manager loads first-party, in front of a server-side container on Cloud Run proxied by a Cloudflare Worker. That saga is in [when your website gets attacked before anyone even visits](/blog/when-your-website-gets-attacked-before-anyone-even-visits/).

The site itself was rebuilt and launched on 20 October 2026 ([leaving WordPress for the edge](/blog/leaving-wordpress-for-the-edge/)), which is why my data warehouse models start on 21 October.

## what I actually built

A **data warehouse** is a database built for analysis rather than for running an application: you load raw data in, then build clean, documented tables on top for reporting. Mine is in [**BigQuery**](https://cloud.google.com/bigquery?hl=en), Google's serverless data warehouse, hosted in the `australia-southeast2` geography, which is in its Melbourne region. You pay for the data your queries scan, and the first terabyte of queries each month is free.

In my setup, two sources land there automatically: the **GA4 daily export** (every raw event, one row each, which is where the cookieless pings show up) and the **Search Console bulk export** (impressions, clicks and positions by query and page).

Raw exports are awkward to report from, so the transformation is handled by [**Dataform**](https://cloud.google.com/dataform?hl=en), Google's tool for managing SQL inside BigQuery. Each table is a SQL file; Dataform works out the build order, runs it on a schedule and tests the results. If you've used dbt, it's the same idea. The code lives in a private GitHub repository, and every change goes through a pull request with automated checks.

![Architecture diagram in three columns. Collect: the cookie banner, Tag Manager loaded first-party, server-side tagging on Cloud Run behind a Cloudflare Worker, and GA4. Land: the GA4 daily export and the Search Console bulk export, both landing in BigQuery in Melbourne. Model: Dataform builds staging, intermediate and eight reporting marts, with a Looker Studio report planned. Underneath: 30 assertions, failure alerts, freshness checks, development datasets, least-privilege access, secret scanning, custom quotas and lineage switched off.](./warehouse-architecture.svg 'The whole thing on one page: collection on the left, the raw exports in the middle, the models on the right.')

The models are organised in three layers:

- **Staging** cleans each source and extracts GA4's nested event parameters once, so nothing downstream has to.
- **Intermediate** holds reusable logic, such as one row per consented session with its landing page and GA4's own channel attribution.
- **Marts** are the reporting tables, each with a declared grain and documented metrics.

There are eight marts, covering daily overview, consent, pages, landing pages, acquisition, search queries, search performance by page, and a weekly view putting search and site behaviour side by side for each page.

One decision I'm quite pleased with: detailed models with pseudonymous identifiers live in one dataset, and the aggregate-only reporting marts live in another. BigQuery grants access per dataset, so a dashboard can see the reporting data without ever touching the detail.

The whole thing builds every morning, checks itself with 30 automated assertions, and alerts me by email and push notification if a run fails.

## the second page view that wasn't

This is the part I enjoyed most, and the part that nearly undermined the headline number.

### the observation

Testing on the live site, I noticed something odd. When a first-time visitor clicked "accept all" on the cookie banner, the browser sent a _second_ `page_view` request. The first had gone out cookieless, before the choice. The second carried full consent and the same event ID.

If both reached GA4, adding cookieless and consented page views would double-count every visitor who accepts, and the 232 would be built on sand.

### the tests

So I ran five controlled tests, each from a fresh private browser window:

1. **Accept all on the landing page.** A cookieless `page_view`, then a second consented `page_view` flagged as a first visit and session start, then the consent event.
2. **Reject.** Only the consent event, still cookieless. The only cookie set was the one recording the choice.
3. **Analytics only.** A consent event with analytics granted, and _no_ second `page_view`.
4. **Accept all, arriving from my GitHub repo.** Both page views carried the GitHub referrer.
5. **Analytics only, arriving from GitHub.** The consent event carried the referrer, but without the session-start flags.

### the clue

The asymmetry gave it away. The second page view only appeared when _advertising_ consent was granted. Analytics consent on its own didn't trigger it at all.

In Tag Manager's preview, the page-view tag fired exactly once, and both requests belonged to that single firing, so it wasn't a rogue second tag. The second request also carried two parameters I didn't recognise: `gcu` and `sst.gcut`.

### the answer

It turned out to be two separate, documented Google behaviours, both explained far better than I could by Simo Ahava.

The first is a **server-side redispatch**. When advertising storage is granted, the Google tag resends page views collected while consent was denied, but only to a server-side Tag Manager endpoint, and only for Google's advertising tags. Simo covers this in [#GTMTips: Automatic Page View Hits In SGTM After Consent Granted](https://www.simoahava.com/gtmtips/automatic-page-view-hits-to-sgtm-after-consent-granted/). I checked it in my server container's preview: the original page view produced an outgoing request to GA4, and the redispatched one produced none. It never reaches GA4.

The second is **GA4 reprocessing**. When analytics consent is granted later on the same page, GA4 goes back and reprocesses that page's earlier cookieless hits as consented. The `user_engagement` hit sent at the moment of consent is what makes this possible. That's in [#GTMTips: Consent Granted Reprocesses Previously Denied Hits](https://www.simoahava.com/gtmtips/consent-granted-reprocesses-previously-denied-hits/).

![Timeline with three lanes: browser, server-side Tag Manager and GA4. Step 1, the page loads with consent denied: a cookieless page_view is forwarded to GA4. Step 2, accept all: the browser sends the page_view again with gcu and sst.gcut, and it stops at the server container, for Google Ads tags only. Step 3, the consent event and a user_engagement hit reach GA4, which reprocesses the original page_view as consented. Step 4, the next day's export holds one consented page_view with its original time and referrer.](./consent-timeline.svg 'Test 1 as a timeline. The re-sent page view never leaves the server container; GA4 reprocesses the original instead.')

### the confirmation

Theory is nice; the export is better. The next day's BigQuery data showed, for both accept all _and_ analytics only, a single landing `page_view` plus `first_visit` and `session_start`, all consented, with identifiers, the original page-load time and the original referrer. The source was correctly `github.com / referral`, and no cookieless copy remained. Rejecting left only the cookieless events.

So nothing is double-counted. Total page views are simply cookieless plus consented, the landing page and attribution survive the consent click, and no Tag Manager change is needed.

The part that still makes me wince: before I understood this, I'd considered "fixing" it by manually re-sending the page view after consent. That would have _caused_ exactly the double counting I was worried about in the first place.

## bugs caught by testing, not by readers

The consent puzzle reinforced a lesson I'd already learned the hard way: **observations are not contracts.** Something true of a brand-new, unpromoted site isn't necessarily a rule. There were no query strings in any URL yet, but only because no campaign had linked to the site; turn that into a test and it breaks the first time someone shares a tagged link. So before writing assertions, I profiled the real data with read-only queries. They confirmed every production event carries the environment label `Live` (now enforced), and turned up a de-duplication column that was null on every row and a leftover `platform = Local` parameter in Tag Manager, sent on every event.

Tightening up the first version, the list of things worth fixing was humbling:

- **Development runs could overwrite production (oops).** Validation runs wrote straight to production; one had already created a table there before its change was merged. Changes now run in separate development datasets first.
- **Nothing alerted on failure.** A broken export would have left stale data unnoticed. There are now freshness checks on both exports and an alert on failed runs.
- **A referrer bug.** A session's first referrer skipped empty values, so direct visits inherited a later same-site referrer and looked like internal referrals. In the first data, it affected three of seven sessions.
- **Launch-day data leaking in.** The daily job reprocesses the last five days to catch GA4's late updates, but didn't stop at the warehouse's start date. Its first scheduled run pulled in 20 October, mixing old-site and new-site data. I caught it comparing development against production.
- **A tool-version trap.** The version of Dataform's open-source command-line tool I was on (3.0.62) had a known bug that would have generated invalid SQL for one feature I'd just switched on. Google's managed service was fine, which a test run confirmed, but I upgraded anyway, and found the newer release had switched on data-lineage emission by default, which is billed with no free tier. Off it went, in the same change.
- **Leftovers after renaming.** Dataform never deletes what it no longer manages, so moving the reporting tables left old assertion views behind. The clean-up step is now documented.

## Search Console had its own surprises

Search Console dates are in US Pacific time; GA4's are in Melbourne time, about 18 hours apart. A daily join would line up most of a day's search clicks against the _next_ day's visits, so the combined content mart is weekly instead.

Because I use a domain property, the data covers every subdomain, and that surfaced something I'd never have spotted in the interface: **Tag Manager's no-JavaScript fallback page on my measurement subdomain had been indexed by Google.** The proxy Worker now adds `X-Robots-Tag: noindex, nofollow` to every response, and I submitted the URL for removal. A `robots.txt` block would have been the wrong tool here, because Google needs to fetch a page to see that it should be removed.

## privacy by design

A warehouse full of visitor data is only defensible if it's built carefully, so:

- **Consent is a hard boundary.** Users and sessions come only from consented data. Cookieless events count towards totals but are never attached to a person or session, and an assertion checks daily that they carry no identifiers. My privacy policy depends on that, so it's tested rather than assumed.
- **Retention is explicit.** GA4's retention setting doesn't apply to its BigQuery export, so visitor-level data would have been kept forever. It now expires after 26 months (two full years for year-on-year comparison), while aggregates are kept indefinitely. The privacy policy states both.
- **Personal data is stripped early.** GA4's data redaction removes email addresses and named personal parameters from URLs in the browser, should they somehow make it there.
- **No personal data in the code.** A pre-commit scanner blocks credentials and data exports, and investigation queries return aggregates only.
- **Least privilege locally.** My local tools run as a limited service account that can read production but only change development datasets. I tested that a write to production is refused.

![Diagram of the datasets. Raw exports on the left: the GA4 export, kept 26 months, and Search Console. The detail dataset in the middle: events and sessions, both kept 26 months, and Search Console rows. A line marks the boundary before the reporting dataset on the right, which holds eight aggregate marts, each listed with its grain, and is the only dataset the planned Looker Studio report reads. Below, the checks the 30 assertions run.](./inside-the-warehouse.svg 'The line that matters: identifiers stay on the left, and reports only ever read from the right.')

## what I gain over GA4

The biggest gain, by a long way, is **page views from visitors who decline cookies**. Cookieless pings feed GA4's modelling, but modelling only switches on once a property sees at least 1,000 consenting users a day on at least 7 days in the past four weeks, among other thresholds, and a site this size is nowhere near that. So those visitors simply aren't in the reports. For me, that was 78% of the week's page views.

Beyond that:

- **History that doesn't expire.** The bulk export keeps accumulating and the aggregated marts are kept indefinitely, instead of 14 or 16 months.
- **No data thresholds.** With Google Signals switched on, GA4 can apply data thresholds and withhold rows when user counts are low, which on a site this size can hide whole pages or days. BigQuery doesn't do that.
- **Definitions I can see and test.** A session, landing page or page view means exactly what my documentation says, and 30 checks catch the boring disasters: identifiers leaking into cookieless data, testing data reaching production, an export quietly stopping.
- **Consent as a metric.** Opt-in rate, cookieless share and choices over time. GA4 doesn't report cookieless volume at all.

One gain is smaller than I expected: search and site behaviour per page. GA4's own Search Console integration already shows landing pages with clicks next to engagement; the warehouse mainly adds cookieless page views and all-time history.

## what GA4 still does better

Plenty:

- Real-time reports, audiences, demographics, and attribution and path explorations.
- Modelled estimates of declining visitors, for sites large enough to qualify.
- **Zero maintenance.** GA4 just runs. This is a system I have to keep maintaining.

## what it costs

In money, effectively nothing. The whole warehouse is a few megabytes, and each model reads under half a megabyte per run. Custom quotas keep queries well inside BigQuery's free tier, and a budget alert sits behind that in case I do something silly.

In time, it's real: tool upgrades, dependency updates, the occasional alert and a pull request for every change. For a personal site, that's a hobby cost I'm happy to pay. For a business, it's the line item to think hardest about.

A note on how this was built: once I had the first version running, I worked through the hardening, investigation and reporting models with [Claude Code](https://claude.com/product/claude-code). I made the calls, ran the browser tests and validated every change in BigQuery before it went live.

## what's next

Next up is a Looker Studio report on the reporting dataset, so I don't have to write SQL every time I want to know how a post is doing. After that, device and country breakdowns, once there's enough traffic for them to be more than noise.

For a site this size, the practical gain comes down to seeing the whole audience, not just the minority who say yes to cookies, and owning that history. The rest is analytics engineering done properly on something small enough to show end to end. And along the way, it taught me more about how Consent Mode actually behaves than any amount of reading had.

If you declined cookies before reading this, thanks for the page view. I can count it now.

I still have no idea who you are, but that's exactly the point.
