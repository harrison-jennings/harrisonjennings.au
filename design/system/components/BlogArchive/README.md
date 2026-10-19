The blog index (/blog/) and topic pages (/blog/topic/<id>/): one template.

**Markup:** `.hj-pagehead` (topic pages add `.hj-eyebrow` "blog / topic"), `.hj-pagehead__row` with `.hj-pagehead__title` (Martian Mono 46px, ending in the brick stop), `.hj-pagehead__intro` and the "rss feed" link; then `.hj-chips` (one `.hj-chip` per topic with a page, count in `.hj-chip__count`, the current one `aria-current="page"`); then one `<section class="hj-year">` per year: `.hj-year__label` and `.hj-row`s of `.hj-row__date` (+ `.hj-row__year`, shown on phones), `.hj-row__title`, `.hj-row__desc`, `.hj-tags`.

- **Index title** "blog."; intro is the blog's description (draft: "Notes from the work: Marketo, measurement, and the systems that hold marketing together.").
- **Topic page:** the topic name as the title, its description and post count as the intro, "rss for this topic" on the right, the chip for that topic current, only its posts listed.
- **Topics with pages** (2+ posts) are links; others are dashed labels (`.hj-tag--label`).
- No booking band on blog pages: "book a call" lives in the nav and footer.
- **Phones:** the chips scroll sideways; each year gets one line above it and none below; the date gains its year.
