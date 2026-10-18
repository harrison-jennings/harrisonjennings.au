# content

Everything is Markdown or YAML in `src/content/`, checked against the schemas in `src/content.config.ts` at build time. A missing date or a misspelt topic fails the build instead of going live.

| collection | stored as                           | publishes at                              |
| ---------- | ----------------------------------- | ----------------------------------------- |
| posts      | `src/content/posts/<slug>/index.md` | `/blog/<slug>/`                           |
| pages      | `src/content/pages/<slug>.md`       | `/<slug>/` (privacy, terms)               |
| topics     | `src/content/topics.yaml`           | `/blog/topic/<id>/`, once it has 2+ posts |
| projects   | `src/content/projects.yaml`         | `/projects/` and the home page            |

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

| field         | required | notes                                                             |
| ------------- | -------- | ----------------------------------------------------------------- |
| `title`       | yes      | lowercase, like every heading on the site                         |
| `description` | yes      | up to 180 characters; used for search results and shares          |
| `published`   | yes      | `YYYY-MM-DD`                                                      |
| `updated`     | no       | set when a post changes meaningfully                              |
| `topics`      | no       | ids from `topics.yaml`; several is fine                           |
| `draft`       | no       | `true` shows the post in `npm run dev` only                       |
| `cover`       | no       | an image beside the post; add `coverAlt` with it                  |
| `socialImage` | no       | overrides the generated social card                               |
| `wpId`        | no       | migrated posts only: the WordPress ID, so feeds don't repeat them |

Use `index.mdx` instead when a post needs a component (a callout, an embed, a diagram). Code blocks are highlighted at build time.

## a project

Add an entry to `src/content/projects.yaml` with an `id`, `name`, `summary` and, if it's deployed, `host` and `url`. `featured: true` puts it in "built and shipped" on the home page, ordered by `order`. `repo` adds "source on github"; `story` (a post's id) adds "read the story".

## publishing

1. Branch from `main` (`content/<slug>`), write, and preview with `npm run dev`.
2. Push. Cloudflare builds a private preview for the branch.
3. Open a pull request and merge it. The live site updates in about a minute.

## writing style

- Headings and UI labels lowercase; body copy in sentence case.
- Australian English. Dates written out in copy: "13 August 2026".
- Say what something does. Short paragraphs.
- Link text says where it goes ("the Marketo REST API docs"), never "click here".
