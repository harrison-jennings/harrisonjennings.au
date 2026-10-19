# content

Everything is Markdown or YAML in `src/content/`, checked against the schemas in `src/content.config.ts` at build time. A missing date or a misspelt topic fails the build instead of going live.

| collection   | stored as                           | publishes at                              |
| ------------ | ----------------------------------- | ----------------------------------------- |
| posts        | `src/content/posts/<slug>/index.md` | `/blog/<slug>/`                           |
| pages        | `src/content/pages/<slug>.md`       | `/<slug>/` (privacy, terms)               |
| topics       | `src/content/topics.yaml`           | `/blog/topic/<id>/`, once it has 2+ posts |
| projects     | `src/content/projects.yaml`         | `/projects/` and the home page            |
| services     | `src/content/services.yaml`         | "what I do" on the home page              |
| testimonials | `src/content/testimonials.yaml`     | "what people are saying" on the home page |
| home         | `src/content/home.yaml`             | the home page's hero and booking band     |
| blog         | `src/content/blog.yaml`             | the blog's intro and the author panel     |
| projectsPage | `src/content/projects-page.yaml`    | the projects page's intro                 |
| rss          | `src/content/rss.yaml`              | the wording on `/rss/`                    |
| notFound     | `src/content/not-found.yaml`        | the 404 page's title and text             |

A post's URL is its folder name. Don't rename the folder after the post is live; if you must, add a 301 from the old URL in `public/_redirects`.

## topics

One fixed list in `topics.yaml`, and a post can have several. A topic gets its own page once two published posts use it (`TOPIC_PAGE_MIN_POSTS` in `src/consts.ts`); below that it shows on posts as a label only, so there are no near-empty listing pages. Keep the list short and distinct: if two topics mostly hold the same posts, merge them and redirect the one you drop.

## a new post

Create a folder `src/content/posts/<slug>/` with an `index.md`, and put its images beside it.

```md
---
title: is sending yourself a test email enough?
description: Why the pre-send ritual misses what actually breaks, and what to check instead.
published: 2026-08-13
topics: [marketing-automation, email]
cover: ./cover.png
coverAlt: A Marketo email preview open beside its rendered result
---

If you work in marketing automation, you probably have a version of the same pre-send ritual…
```

| field         | required | notes                                                                       |
| ------------- | -------- | --------------------------------------------------------------------------- |
| `title`       | yes      | lowercase, like every heading on the site                                   |
| `description` | yes      | up to 180 characters: the dek under the title, card excerpt and meta tag    |
| `published`   | yes      | `YYYY-MM-DD`                                                                |
| `updated`     | no       | set when a post changes meaningfully                                        |
| `topics`      | no       | ids from `topics.yaml`; the first is the post's main topic                  |
| `draft`       | no       | `true` shows the post in `npm run dev` only                                 |
| `cover`       | no       | an image beside the post; add `coverAlt` with it                            |
| `toc`         | no       | `false` hides "on this page" (it's hidden anyway with fewer than three h2s) |
| `related`     | no       | up to three post ids, to hand-pick "keep reading"                           |
| `socialImage` | no       | overrides the generated social card                                         |
| `wpId`        | no       | migrated posts only: the WordPress ID, so feed readers don't repeat them    |

The site works out the rest at build: the reading time (prose words ÷ 230, rounded up; code doesn't count), "on this page" from the `##` and `###` headings, and "keep reading" (the three posts sharing the most topics, newest first on a tie, topped up with the latest).

## writing a post

The draft post `src/content/posts/formatting-reference/index.mdx` shows every element with the Markdown that makes it. It never builds for the live site; open it with `npm run dev` at `/blog/formatting-reference/`.

- **Headings:** `##` and `###` (listed in "on this page"), `####` for minor headings. `#####` and `######` render as `####`.
- **Callouts:** wrap paragraphs in `:::note`, `:::tip` or `:::warning` (shown as "heads up"), closed with `:::`.
- **Code:** the language goes after the fence and is never guessed (no language means plain text). `title="src/app.js"` adds a file name; `{2-3}` highlights lines. In ` ```sh ` blocks a leading `$ ` is a prompt, muted and left out of the copy button. Velocity (` ```vtl `) is highlighted too. Code is left exactly as written: the formatter doesn't touch code in posts.
- **Images:** `![alt](./image.png "caption")`. Every image opens the image viewer, and portrait images are capped at 560px tall. Add `{nozoom}` straight after an image to leave it out of the viewer; in an `.mdx` post write `\{nozoom}`, because braces are code in MDX. Export diagrams large (2–3× their shown size, or SVG): the viewer loads the largest size only when it opens.
- **Two or three images side by side** (`.mdx` only): `<Figures cols={2} caption="…">` with the images inside, closed with `</Figures>`. They stack on phones.
- **Tables:** Markdown tables. Right-align a column (`---:`) to set its numbers in Martian Mono.
- **Video** (`.mdx` only): `<YouTube id="…" title="what it shows" />`. Nothing loads from YouTube until it's played, not even its thumbnail (that would be a request to Google before consent). For a still frame, save one beside the post (16:9) and import it at the top: `import poster from './video-poster.jpg';`, then `<YouTube id="…" title="…" poster={poster} />`. It's served from this site.
- **Extras:** `<details><summary>…</summary>…</details>` for long scripts, `[^1]` footnotes, and `---` for the three-dot break.

## a project

Add an entry to `src/content/projects.yaml` with an `id`, `name`, `summary` and, if it's deployed, `host` and `url`. Every project shows on `/projects/`, ordered by `order`; `featured: true` also puts it in "built and shipped" on the home page. `kind` ("VS Code extension") and `built` (the year) fill in its facts. `repo` adds "source on github"; `story` (a post's id) adds "read the story" and becomes where its name links (otherwise the live site). `image` is a screenshot in `src/content/projects/`, shown at 16:9 and cropped from the top left, so keep the important part there; it's shown still, never as a link.

To retire a project, set `status: archived`. It moves to the "archived" list at the bottom of the page (which appears only once something is archived), with its `summary` as the one line on what it was; its live link goes, and the source and story stay.

## the privacy policy and terms

Each is one Markdown file in `src/content/pages/` (`privacy-policy.md`, `terms-of-use.md`), edited like a post. Sections are `##` headings (listed in "on this page") with `###` inside them.

| field          | required | notes                                                                                |
| -------------- | -------- | ------------------------------------------------------------------------------------ |
| `title`        | yes      | lowercase                                                                            |
| `description`  | yes      | the one-line intro under the title (and the meta description)                        |
| `updated`      | yes      | `YYYY-MM-DD`                                                                         |
| `updatedLabel` | no       | the words before the date: "Last updated" (the default) or "Effective"               |
| `summary`      | no       | four or five plain-language points for "the short version" panel                     |
| `contact`      | yes      | `text` (the closing line) and `email`; until there is one it shows "[email address]" |

Put `::cookie-settings` on a line of its own where the "cookie settings" button should go (the cookies section).

## the rss page and the 404

- `rss.yaml`: the intro, the note under the feed address, the three "how it works" steps and the line above the topic feeds. The addresses, the topic list (every topic with a page) and the latest posts fill themselves in.
- `not-found.yaml`: the 404's title (one line per entry; the last ends in the brick stop) and the line under it.

## the home page

Every word on the home page comes from a content file, so it can change without touching code:

- `home.yaml`: the headline (one line per entry; the last line ends in the brick stop, so leave off its full stop), the two-line subtitle, the booking band's title and note, and `shareLine`, the second line on the share card.
- `services.yaml`: each service's name, a paragraph up to 200 characters, and exactly three tools.
- `testimonials.yaml`: `quote` (up to 280 characters; trim a longer one to its best part), `name`, `role` and `order`. From five quotes the home page shows them as a moving row with a pause button; with fewer they sit still, side by side.
- `projects.yaml`: `featured: true` puts a project in "built and shipped". Its links appear only when it has them: `url` and `host` for "live at", `repo` for "source on github", `story` for "read the story". Add `image` (a screenshot in `src/content/projects/`) to replace the dashed placeholder.
- "latest posts" shows the three newest posts once there are any, each with its `description` and its first topic.

## share cards

When a link to the site is shared (LinkedIn, Slack, iMessage), the preview image is a card made at build from the page's own words: a post's title, main topic and date; a page's title and intro; the home page's headline. Nothing to do when writing. To use a picture instead on a post, set `socialImage` to an image beside it; it's cropped to 1200 × 630, so keep the subject near the middle.

## publishing

1. Branch from `main` (`content/<slug>`), write, and preview with `npm run dev`.
2. Push. Cloudflare builds a private preview for the branch.
3. Open a pull request and merge it. The live site updates in about a minute.

## writing style

- Headings and UI labels lowercase; body copy in sentence case.
- Australian English. Dates written out in copy: "13 August 2026".
- Say what something does. Short paragraphs.
- Link text says where it goes ("the Marketo REST API docs"), never "click here".
