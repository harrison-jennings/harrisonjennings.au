The identity for harrisonjennings.au: a dark-first, technical brand for a marketing technology consultant. One warm accent (brick), one display face with a terminal accent (Martian Mono), one working face (Schibsted Grotesk), and a logo that is a single line ending in a signal dot. Everything here is approved; build pages from these tokens and components, and treat anything not covered as a gap to raise, not to invent.

## Content fundamentals

- **Lowercase voice.** Navigation, buttons, headings, labels, the name and project names are all lowercase: "book a call", "built and shipped", "read the story", "harrison jennings". Body copy and project descriptions use normal sentence case ("Email previews and linting that understand Marketo, inside VS Code.").
- **Plain and specific.** Say what a thing does. Short verbs on actions: "book a call", "read the blog", "source on github", "all projects".
- **Australian English.** colour, organise. Dates written out: "13 August 2026".
- Product names keep their own capitals inside sentences (Marketo, VS Code, Adobe), and stay lowercase only when they are a project's own name in the display face ("leadlens").
- **Home page copy (approved):** headline "marketing, engineered." (the full stop is the brick signal dot); subtitle "Strategy and the stack, from one person." then, on its own line, "I'm Harrison, a marketing technology consultant in Melbourne." First name only in running copy; the full name lives in the logo.
- **Home section titles (approved):** "what I do", "built and shipped", "what people are saying" (they are not all clients, so never "what clients say"), "latest posts", and the booking band's "ready to jump in? book a call." with the brick stop.
- **Blog rules:** a post's main topic is the first in its `topics` list (shown above the title and as the tag on its cards). Reading time is calculated at build (prose words ÷ 230, rounded up; code doesn't count). "Keep reading" picks the three posts sharing the most topics, newest first on a tie, unless the post names its own with `related:`. A topic gets a page at two posts; until then its tag is a dashed label.
- **Length limits,** enforced by the content schema so nothing overflows: a post's `description` (its card excerpt and meta description) up to 180 characters; a project's summary up to 240; a testimonial's home-page quote up to 280 (about seven lines on a card; trim a longer one to its best part and keep the full text elsewhere). Each service lists three short tools.

## Logo

- The mark is a lowercase h drawn as one continuous line (`viewBox 0 0 100 100`, path `M30 10 V90 M30 58 C30 44 39 38 50 38 C61 38 70 44 70 58 V72`, round caps), with a dot at `cx 70 cy 88`. The dot's foot lines up with the base of the stem.
- Stroke is always `text`; the dot is always `accent`. Never colour the stroke, never put the dot in apricot or a gradient.
- Weights by rendered size (the line thickens as it shrinks so it never looks spindly): 40px and up stroke 11, dot 7.5; 26–28px stroke 12, dot 8.5; 46px in the 64px favicon stroke 13, dot 8.5; 24px stroke 15, dot 9.5; 13px stroke 17, dot 10.5. `HJ.markSvg(size)` picks these for you.
- **Lockup:** mark + "harrison jennings" in Schibsted Grotesk 600, -0.02em, gap `space-10`. Sizes: nav 26px mark / 17px name; footer 28 / 20; large 40 / 24 (-0.03em).
- **Favicons:** the mark on a `surface` tile: 64px (radius 14), 32px (radius 7), 16px (radius 4). Files in the Logos asset group.
- Don't: stretch, outline, add a container other than the favicon tile, rotate, put the mark on a busy photo, or set the name in Martian Mono.

## Colour

Two themes from one set of roles. Dark is the primary look; light is an equal, finished theme with its own deeper brick, not an inversion.

| role | dark | light | use |
|---|---|---|---|
| `ground` | #121110 | #f4efeb | page background |
| `surface` | #1c1a19 | #fbf8f5 | footer, project panel, raised areas |
| `line` | #2e2a28 | #e3d9d2 | hairlines and outlines (decorative) |
| `text` | #efeae6 | #1a1615 | copy, headings, the logo's line |
| `muted` | #a39c97 | #655d59 | dates, captions, labels |
| `accent` | #c85a52 | #a8443d | brick: the dot, buttons, underlines, live signal |
| `on-accent` | #121110 | #ffffff | text on a brick fill |
| `link` | #d9665d | #a8443d | hover colour for links and icons |
| `apricot` | #e8a27a | #e8a27a | the button's hover fill |
| `on-apricot` | #121110 | #1a1615 | text on apricot |
| `code-keyword` | #d9665d | #a8443d | syntax: keywords |
| `code-string` | #e8a27a | #8f4f1c | syntax: text in quotes |
| `code-number` | #d8c3a5 | #6b5a3a | syntax: numbers, true/false, null |
| `code-highlight` | brick 12% | brick 8% | a highlighted line's band |

**Rules**

- Brick is a signal, not a wash. Spend it on one primary button per view, the logo's dot, link underlines, the live dot and code keywords. Large areas of brick only appear as the ember field.
- `text` and `muted` on `ground` or `surface` for everything you read. All pass AA in both themes (muted is the weakest at 5.6:1).
- `accent` as text: only on `ground` in dark (4.53:1); on dark `surface` it is 4.16:1, so use `link` for small text there. In light, `accent` passes on both.
- Buttons at rest: `on-accent` on `accent`. Never white on the dark-theme brick (4.17:1).
- Apricot is only ever a fill under `on-apricot` text, or the far end of the ember gradient. Never apricot text.
- `line` is too faint (1.2–1.3:1) to be the only thing marking a control. Controls are marked by fill (buttons), underline (links) or size (icon buttons).
- No drop shadows. Surfaces separate by colour and hairline. The only shadow token is the live dot's halo, `shadow-signal`.

## Theme

- **Dark on every first visit,** whatever the device is set to. The sun/moon toggle in the nav switches theme, and the choice is remembered (`localStorage`, key `hj-theme`). Remembering a display preference is functional, not tracking, so it sits outside the consent banner.
- Set the theme before first paint with a tiny inline script in `<head>`, so there is no flash of the wrong theme:

```html
<script>try{var t=localStorage.getItem('hj-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}</script>
```

- `HJ.setTheme('light' | 'dark')` switches and saves; `[data-hj-theme]` buttons are wired by `HJ.init()`.

## Ember: the gradient and the clouds

Ember runs brick to apricot (`ember-from` → `ember-to`). It is atmosphere: the hero field, the social share cards and the 404 page. It never touches text, the logo, buttons or small UI.

- **Clouds** (`.hj-ember`): two radial gradients over `ground`.
  - `radial-gradient(60% 80% at 82% 18%, var(--cloud-brick), transparent 70%)`: brick, high on the right.
  - `radial-gradient(50% 70% at 98% 92%, var(--cloud-apricot), transparent 70%)`: apricot, low in the corner.
- Light mode runs the clouds richer (`cloud-brick` 0.68 of #d6584c, `cloud-apricot` 0.75 of #f29662) so they hold their own on the pale ground. Dark uses 0.75 of brick and 0.55 of apricot.
- Text on the clouds stays `text` and still passes: the densest point of the dark cloud is about 5.2:1 against `text`.
- Buttons on ember stay solid `accent`. Gradient buttons were tried and dropped.
- Keep the clouds to the right and the copy to the left, so headlines never sit on the densest colour.

## Type

Two families, self-hosted from `fonts/` (variable woff, Latin subset; OFL licences in `licenses/`).

- **Martian Mono** (`display`, weight 500, tracking -0.05em; -0.04em at 20px and below) is only for the display layer: the hero, project names, the mobile menu's links, hostnames and code. Never for body copy, buttons, nav links or anything longer than a line or two.
- **Schibsted Grotesk** (`sans`) does everything else: body 17px / 1.6, titles 600 at -0.02em, nav and footer 15px, dates and labels 14px in `muted`, legal 13px.
- Post type: `title-xl` 46 (the post title, Schibsted 600, -0.03em; 32 on phones), `dek` 20 in `muted`, `heading-2` 26, `heading-3` 20, `heading-4` 17 (all 600), `prose` 17 / 1.7. Post titles stay in Schibsted because they run past two lines.
- Scale in use: `display-xl` 50, `display-l` 46, `display-m` 34, `display-s` 30, `display-xs` 20, `title-l` 30, `wordmark` 17 (20 in the footer), `body` 17, `button` 18, `ui` 15, `label` 14, `small` 13, `tag` 12, `code` 12.5.
- Display lines that wrap set at 1.12 at the large sizes (50 and 46px) and 1.1 at 34px. Any tighter and the descenders of one line (g, the comma) touch the dots and ascenders of the next.
- Measure: keep body text to about 560–680px (`.hj-project__desc` caps at 560px).
- Dates are written out: "13 August 2026". Meta lines join with a comma: "13 August 2026, marketing automation".

## Motion

All motion stops under `prefers-reduced-motion: reduce`: the logo sits drawn, the button swaps colour instantly, the dots stay still.

- **Logo draw:** the dot travels 16 units ahead of the line, drawing the stem down, back up, round the arch and down the leg, then rests at the foot. One continuous trace, ease-in-out (quad), about 2s. Plays once on page load and again when the logo is hovered (`data-hj-draw`). The demo loops on a 3.4s cycle: draw 60%, hold, fade.
- **Bounce:** the dot squashes and bounces at the foot of the leg (1s loop). Only while something is genuinely loading: the Cal.com booking calendar, the 404 page.
- **Signal:** a ring expands from the dot and fades (1.8s, ease-out). At small size this is the live dot on deployed projects.
- **Button wipe:** apricot wipes in from the side the pointer enters and out the side it leaves, with a cubic ease. On phones it plays once on tap. The demo runs slowly on a 3s cycle; on the site use 360ms.
- **Links and icons:** colour and underline thickness ease over 150ms.
- **Nav:** compacts after 80px of scroll; hovering or focusing it opens it back up. Page links grow a 1.5px brick underline from the left on hover (240ms); the current page keeps it.
- **Hero signal field:** a grid of faint dots (`field-dot`) drifts gently; the pointer pushes dots aside and lights them in `link`, sending a ring out every 1.5s (every 2.8s from a slow wanderer when nobody is pointing). A click or tap sends a ring too. The headline's brick stop pulses two small rings that stay clear of the letters. Pauses when off screen.
- **Theme toggle:** the outgoing icon turns a quarter and fades as the other arrives (320ms).
- **Scroll cue:** the chevron dips 3px and back every 2.4s, then rests; the cue fades out over the first 160px of scroll.
- **Testimonial ticker:** the quotes drift left on an 80s loop and pause while the pointer is over them or anything inside has focus; the pause button stops them outright. Under reduced motion they sit still in a row you scroll by hand.
- **Project switcher:** the outgoing project fades out as the next fades in and rises 8px (280ms).
- **Swipe rows (phones):** the arrows scroll one card at a time, smoothly; an arrow fades to 35% at the end of its row.
- **Screenshots stay still.** No scroll-linked scaling on project screenshots: scaling resamples them and softens their small interface text. (Tried and dropped 19 October 2026.)
- **Footer logo:** draws once when the footer comes into view (`data-hj-draw="view"`), and again on hover.
- **Image viewer:** zoom eases over 220ms (instant while dragging); the hint fades after 3s.
- **On this page:** stays in view beside the post and marks the section being read with a 1.5px `accent` edge as the reader scrolls.
- **Signal line (approved, held in reserve):** a line made of dots that swells into a waveform near the pointer and ends in a pulsing brick dot, the logo's line-and-dot at full width. Not for the home page; keep it for a future section or page (it is the "hero c" tile on the mockups canvas).

## Components

- **Button** (`.hj-btn`): solid pill, `accent` with `on-accent` text, Schibsted 600. Sizes: large 20px (20 × 36 padding), default 18px (17 × 30), nav 15px (12 × 20), compact 14px (10 × 16), full-width 16px (14). One primary button per view; the label is almost always "book a call".
- **Text link** (`.hj-link`): `text` colour with a 1px `accent` underline at 5px offset. On hover the text turns `link` and the underline thickens to 2px. Standalone links ("all projects") start in `link` colour.
- **Icon button** (`.hj-icon-btn`): GitHub and LinkedIn, 44px targets, `text` at rest and `link` on hover and focus, each with an aria-label. In the mobile menu they are 48px (`.hj-icon-btn--lg`) with no outline. `.hj-icon-btn--outline` (a `line` ring) is only for the menu and close buttons, which are controls rather than links.
- **Theme toggle** (`.hj-icon-btn.hj-theme`, `data-hj-theme`): a 44px icon button showing the current theme, a moon in dark and a sun in light; its label says the action ("Switch to light mode").
- **Nav** (`.hj-nav`): a floating pill on `ground` with a `line` border: lockup, links (home, blog, projects), the theme toggle, a divider, the two icon buttons, then "book a call". After scrolling it compacts to mark, links and a 14px button. The current page carries the brick underline. On phones: logo and name (15px), the theme toggle, and an outlined menu button.
- **Mobile menu** (`.hj-menu`): fills the screen in `ground`. Top row: lockup and an outlined close button, sitting exactly where the bar's lockup and menu button were. Then Martian Mono links at 30px (current page underlined in brick), a full-width button, and GitHub and LinkedIn as plain 48px icons at the bottom.
- **Hero** (`.hj-hero`): the home page's first screen, filling the viewport (`clamp(640px, 100svh, 1080px)`; 560px minimum on phones). Ember clouds and the signal field behind; headline in `display-hero` ending in `.hj-hero__stop`; subtitle in `muted`; "read the blog" and a large "book a call"; the scroll cue bottom left. On phones the buttons stack, "book a call" full width.
- **Scroll cue** (`.hj-cue`): a 14px chevron and "scroll" in 13px `muted`, on the column's left edge 24px above the hero's bottom (18px on phones). Decorative: `aria-hidden`.
- **Footer** (`.hj-footer`): three columns on `surface`: lockup and "marketing technology consultant, melbourne"; blog, projects, book a call; github, linkedin and the legal links (privacy, terms, cookie settings), spaced apart with no commas, each turning `link` on hover. The logo draws when the footer comes into view.
- **Section head** (`.hj-section__head`): the 30px title on the left and, on the right, a quiet link ("all posts") or controls (arrows, the pause button).
- **What I do** (`.hj-services`): three services in one row, each with a name, a short paragraph and a tools line (`.hj-tools`: Martian Mono 12px items after a small brick dot, never split across lines). The rows are shared across the three, so the tools lines start level however long the paragraphs run.
- **Built and shipped** (`.hj-switch`): the project switcher on `surface`. Left: the title, the projects as numbered tabs in Martian Mono (the chosen one in `text` with its number in `link`), then "all projects". Right: one project at a time: a 16:9 screenshot, the description, and its links. On phones it becomes one full-width card per project (`.hj-pcards`) in a swipe row with arrows, so long names wrap instead of being cut off.
- **Project links:** "live at {host}" is itself a link (`a.hj-live`, the host underlined like a text link), then "source on github" and "read the story". Each link appears only when the project has it: no repository, no "source on github"; not live, no "live at".
- **Projects page** (`.hj-pjlist`, `.hj-pj`, `.hj-archived`): one large entry per project: the screenshot across the column (a still image, not a link), then the number, name and facts (status with a pulsing dot, what it is, built) beside the description and links; archived projects follow as quiet one-line rows. (`.hj-projects` / `.hj-project` rows are an earlier layout, not used.)
- **What people are saying** (`.hj-ticker`, `.hj-quote`): quote cards (420px; 300px on phones) on `surface`, drifting in a row that runs the full page width and fades at both edges, with a pause button in the section head. Cards in the row share the tallest card's height so the names line up. Needs five or more quotes; with fewer, lay the cards out still, side by side.
- **Latest posts** (`.hj-posts`, `.hj-post`): the three newest posts side by side: date, title (the underline grows in on hover), the post's description in `muted`, and one topic tag. "all posts" sits in the section head (under the row on phones).
- **Booking band** (`.hj-book`): a `surface` band: "ready to jump in? book a call." in Martian Mono 40px with the brick stop, a one-line note, and on the right "view availability" with "or say hello on linkedin" under it. The button opens the calendar inside the band and only then loads Cal.com (the band fires `hj:book-open`).
- **Swipe row** (`.hj-swipe`, `.hj-arrows`): on phones, What I do, latest posts and the project cards become rows that swipe sideways (cards 84% wide so the next one peeks in; project cards full width) with ‹ › arrow buttons in the section head. Desktop never shows the arrows.
- **Live signal** (`.hj-live`): an 8px brick dot with a 4px `shadow-signal` halo and a pulsing ring.
- **Tag** (`.hj-tag`): 12px chip with a `line` outline for topics; as a link it turns `link` on hover.
- **Code block** (`.hj-codeblock`): Martian Mono 12.5 / 1.7 on `surface` in a `line` frame, radius 12, with a bar for the language (and file name) and a copy button. Syntax colours: keywords `code-keyword`, text in quotes `code-string`, numbers `code-number`, comments `muted`, the rest `text`. Optional highlighted lines get a `code-highlight` band with an `accent` edge. Long lines scroll sideways, never wrap. (`.hj-code` is the older plain frame; use `.hj-codeblock` in posts.)
- **Blog index and topic pages** (`.hj-pagehead`, `.hj-chips`, `.hj-year`, `.hj-row`): "blog." in Martian Mono 46 with the brick stop, an intro and the RSS link; topic chips with counts; posts grouped by year, each with date, title, description and topic tags. No booking band on blog pages.
- **Post page** (`.hj-posthead`, `.hj-article`, `.hj-toc`, `.hj-author`): eyebrow "blog / {main topic}", title, dek, date and reading time with tags; a 680px reading column with "on this page" beside it; then the published/updated line, the author panel (github and linkedin, no booking), "keep reading" and the footer.
- **RSS page** (`.hj-feedbox`, `.hj-steps`, `.hj-tfeed`, `.hj-copy`): /rss/ explains the feed and gives its address to copy, with per-topic feeds and the latest posts. A normal page, because browsers are dropping XSLT-styled feeds; /rss.xml stays raw for readers.
- **Legal pages** (`.hj-legal-meta`, `.hj-short`, `.hj-legal-contact`): privacy and terms share one template: title, intro, updated or effective date, a "short version" panel on privacy, the sections with "on this page", a cookie settings button in the cookies section, and a contact line.
- **404** (`.hj-404`): ember clouds, "this page has moved on." with the brick stop, a way home and the latest posts, and the mark with its dot bouncing (the only place the bounce loops besides the booking calendar while it loads).
- **Social share cards** (1200 × 630, built per page): ember clouds, the lockup, and the page's own title: home, post (topic, title, date), project, and page variants. Dark only. See ShareCard.
- **Image viewer** (`.hj-zoomable`, `.hj-lightbox`): any image in a post opens full screen; zoom to 400% (wheel, + / −, double-click, pinch), drag to move, step between a post's images, Esc or swipe down to close. Near-black in dark, white in light.
- **Prose** (`.hj-prose`): headings h2–h4, text, lists, quote, three callouts (note, tip, heads up), one-, two- and three-up figures, tables, click-to-play video, details, footnotes and a three-dot divider. The "formatting reference" board on the mockups canvas shows each with its Markdown.

## Layout

- **One column, shared with the nav.** The nav pill is at most `container` (1152px) wide with `space-16` gutters; every page's content uses the same width, starting under the logo (22px in from the pill's left edge) and ending under the nav button (10px in from its right edge). `.hj-shell` holds the nav; `.hj-column` holds content. Large display type takes a -0.045em optical nudge so it looks aligned rather than measures aligned.
- Home page sections are 96px apart (72px on phones); panels pad `space-40` (24 × 20 on phones).
- Inner pages (blog, posts) put the nav at the top and start the page header 120px below it (72px on phones). A post's text column is 680px with a 240px "on this page" column to its right; code blocks and the cover run edge to edge on phones.
- Radii: `radius-pill` for every control, `radius-lg` (20) for panels, `radius-md` (14) for screenshots, `radius-sm` (12) for code, `radius-xl` (28) for the mobile menu frame.
- Breakpoint at 760px: the nav becomes logo and name, theme toggle and menu button; the hero's buttons stack; What I do, built and shipped and latest posts become swipe rows with arrows; the booking band stacks; the footer goes to one column.

## Iconography

- Only two icons: GitHub and LinkedIn, as solid single-ink glyphs on a 24-unit grid (Icons asset group). Draw them inline with `fill: currentColor` so they follow `text` and `link`.
- Line icons are drawn on the 24-unit grid with a 2px round-capped stroke: the menu button (two lines), the close button (a cross), the theme toggle's sun (a circle with eight short rays) and moon (a crescent), and the scroll cue's chevron. No icon library and no decorative illustrations.
- The blocks and rings on this system's cover are only its banner. They are not a brand pattern: never use them, or any block-and-circle graphic, on the site.

## Accessibility

- Every text pairing above meets WCAG AA in both themes.
- Focus: a 2px solid `accent` outline at 3px offset on every interactive element (3:1 or better on both grounds).
- Hit areas are at least 44px; mobile menu icons 48px.
- The mobile menu is a dialog: focus moves in when it opens, Escape and the close button close it, and focus returns to the menu button.
- Icon-only links carry aria-labels ("GitHub profile", "LinkedIn profile"). The logo mark is decorative next to the name; on its own it is labelled "harrison jennings".
- Every animation has a still state under reduced motion.
- The testimonial ticker moves on its own, so it always has a pause button (WCAG 2.2.2) and stops on hover and focus.
- The project switcher is a tab list: arrow keys, Home and End move between projects; only the chosen tab is in the tab order.
- The image viewer is a modal dialog: focus moves to its close button, Tab stays inside it, Esc closes it, and focus returns to the image.
- Swipe arrows are real buttons with labels ("Next post"); at the end of a row they are marked `aria-disabled` rather than removed, so focus never jumps.

## Using the components

`components/bundle.css` holds every class above and reads only tokens; `components/bundle.js` defines `window.HJ` with the behaviours: `HJ.init(root)` wires every `.hj-btn` wipe, `[data-hj-draw]` logo, `[data-hj-nav]` bar, `[data-hj-theme]` toggle, `.hj-hero` signal field, `.hj-cue`, `[data-hj-swipe]` rows (with `[data-hj-prev]` / `[data-hj-next]` buttons), `.hj-switch` tabs, `.hj-ticker` (with its `[data-hj-pause]` button) and `.hj-book` inside `root`. `HJ.markSvg(size, {label})` returns the mark's markup at the right weight; `HJ.draw(svg)` plays the draw. Wrap the page in `.hj-page` and set `data-theme="dark"` or `"light"` on the root.
