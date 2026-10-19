The projects page (/projects/): every project, newest first, then anything archived.

**Header:** `.hj-pagehead` as on the blog: "projects." in Martian Mono 46 with the brick stop and an intro ("Tools I've built for the work, mostly for Marketo and the people who run it. Open source where I can."). No topic chips, no booking band.

**Each project** (`.hj-pjlist` > `<article class="hj-pj">`):
- `.hj-pj__shot`: the screenshot across the full column, 16:9 (4:3 on phones), radius 20. A plain image: not a link, no hover, no scroll animation. The name and links below are the ways in.
- `.hj-pj__body`, two columns (stacked on phones): left `.hj-pj__n` ("01" in `link`), `.hj-pj__name` (Martian Mono 34, links to the story or live site), and `.hj-pj__facts`: status (`.hj-status` with a pulsing live dot), what it is, built; right `.hj-pj__desc` (19px) and `.hj-project__links` (live at, source on github, read the story; each only when the project has it).

**Archived** (`.hj-archived`): appears only once a project is archived. One `.hj-archived__row` each: name in Martian Mono 21 `muted`, one line on what it was. No screenshot or live link; the status dot is a hollow ring that doesn't pulse.

**Data** (`src/content/projects.yaml`): name, summary, host, url, repo, story, image, status, order, plus two fields to add: `kind` ("VS Code extension", "interactive API reference") and `built` (year). All editable as text.
