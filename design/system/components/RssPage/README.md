The RSS page (/rss/): a normal page that explains the feed, not a styled feed file. Chrome stops supporting XSLT (the usual way to style a feed) on 17 November 2026, and Firefox and Safari plan to follow, so the feed itself (/rss.xml) stays raw for feed readers and every "rss feed" link on the site points here.

**Order:** `.hj-pagehead` with the eyebrow "blog / rss feed" and "rss feed." (brick stop, still); an intro ("No account, no email list, nothing tracked."); `.hj-feedbox` (label, `.hj-feedbox__url`, a `.hj-copy` button); a note that pasting the site address works too; "how it works" as `.hj-steps` (01 pick a feed reader, 02 add the address, 03 read as they land); "just one topic" as `.hj-tfeed` rows (topic, its feed address, copy) for every topic with a page; "latest in the feed" (three `.hj-row`s and "all posts"); the footer.

- `[data-hj-copy="…"]` buttons copy that text and read "copied" for 1.6s (`HJ.copyText`).
- On phones the feed address drops its "https://www." (`.hj-feedbox__scheme` hidden) so it fits; the copy button still copies the full address. Topic rows hide their addresses and keep the copy buttons.
- The site's `<head>` carries `<link rel="alternate" type="application/rss+xml">` so readers find the feed from the plain site address; topic pages add their own.
- Feeds: /rss.xml for every post; /blog/topic/<id>/rss.xml per topic page.
