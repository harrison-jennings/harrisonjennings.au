"built and shipped": the deployed projects on the home page, one at a time.

**Markup (desktop):** `<div class="hj-switch">` with `.hj-switch__side` (the title, a `role="tablist"` `.hj-switch__tabs` of `<button class="hj-switch__tab" role="tab">` each holding `.hj-switch__n` "01" and `.hj-switch__name`, then `.hj-switch__all` "all projects") and `.hj-switch__stage` with one `.hj-switch__pane` (`role="tabpanel"`, `hidden` unless chosen) per project: a 16:9 `.hj-shot.hj-shot--wide`, `.hj-switch__desc`, and `.hj-project__links`.

**Markup (phones):** `<div class="hj-pcards">` beside it: a `.hj-section__head` with arrows, a `.hj-swipe` row (`data-hj-swipe="proj"`) of `<article class="hj-pcard">` (screenshot, `.hj-pcard__name`, `.hj-pcard__desc`, links), then "all projects". CSS shows one or the other at 760px.

**Links:** `<a class="hj-live">` "live at" + `.hj-live__host`, "source on github", "read the story". Render each only if the project has it: no repository, no "source on github"; archived, no "live at".

- `HJ.switcher(el)` (run by `HJ.init`) handles clicks and arrow, Home and End keys; panes crossfade (280ms).
- The tabs scale to any number of projects without growing the section; "all projects" goes to /projects/.
- The /projects/ page has its own layout (see Projects index). `.hj-projects` / `.hj-project` rows are the earlier stacked layout and aren't used.
