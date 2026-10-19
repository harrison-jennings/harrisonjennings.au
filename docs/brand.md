# brand

The working summary of the identity. The design system has live previews of every component; this file is what to follow in code.

## voice

- Lowercase for navigation, buttons, headings, labels, the name and project names: "book a call", "built and shipped", "read the story".
- Sentence case for body copy and descriptions. Product names keep their capitals (Marketo, VS Code).
- Australian English. Dates written out: "13 August 2026".

## logo

- A lowercase h drawn as one line, ending in a dot whose foot lines up with the stem. `src/components/Logo.astro`.
- Line in `text`, dot always `accent`.
- The line thickens as the mark shrinks: 40px and up stroke 11 / dot 7.5; 26–28px 12 / 8.5; 24px 15 / 9.5; 16px and below 17 / 10.5. The component does this for you.
- Lockup: mark + "harrison jennings" in Schibsted Grotesk 600, -0.02em, 10px gap. Nav 26 / 17px; footer 28 / 20px.
- Static files: `public/brand/mark-on-dark.svg`, `public/brand/mark-on-light.svg`, and the favicons in `public/`.

## colour

| role         | dark      | light     | use                                              |
| ------------ | --------- | --------- | ------------------------------------------------ |
| `ground`     | `#121110` | `#F4EFEB` | page background                                  |
| `surface`    | `#1C1A19` | `#FBF8F5` | footer, project panel                            |
| `line`       | `#2E2A28` | `#E3D9D2` | hairlines (decorative only)                      |
| `text`       | `#EFEAE6` | `#1A1615` | copy, headings, the logo's line                  |
| `muted`      | `#A39C97` | `#655D59` | dates, captions, labels                          |
| `accent`     | `#C85A52` | `#A8443D` | the dot, buttons, underlines, live signal, focus |
| `on-accent`  | `#121110` | `#FFFFFF` | text on an accent fill                           |
| `link`       | `#D9665D` | `#A8443D` | hover colour for links and icons                 |
| `apricot`    | `#E8A27A` | `#E8A27A` | the button's hover fill                          |
| `on-apricot` | `#121110` | `#1A1615` | text on apricot                                  |

- Brick is a signal, not a wash: one primary button per view, the dot, underlines, the live dot, code keywords.
- `accent` as small text only on dark `ground` (4.53:1). On dark `surface` use `link`. Light passes everywhere.
- Never white text on the dark-theme brick (4.17:1).
- No drop shadows. The only shadow is the live dot's halo.

## theme

Dark on every first visit, whatever the device is set to. The sun/moon toggle in the nav switches theme and remembers the choice. Light is an equal, finished theme with its own deeper brick, not an inversion.

## code

Code blocks always use the dark treatment (dark surface, hairline, and the dark syntax colours), in both themes: on a light page they sit as dark panels. Inline code follows the page's theme.

## ember

The brick-to-apricot gradient is atmosphere only: the hero field, social share images and the 404 page. Never on text, the logo, buttons or small UI. Two radial clouds over `ground`:

```css
background:
  radial-gradient(60% 80% at 82% 18%, var(--cloud-brick), transparent 70%),
  radial-gradient(50% 70% at 98% 92%, var(--cloud-apricot), transparent 70%);
```

Light mode uses richer cloud values automatically. Keep copy on the left, clouds on the right.

## type

- **Martian Mono** 500, -0.05em (-0.04em at 20px and below): hero, project names (34px), mobile menu links (30px), hostnames, code. Nothing longer than a line or two.
- **Schibsted Grotesk**: body 17 / 1.6, titles 600 at -0.02em (30 / 1.15), nav and footer 15, labels 14 in `muted`, legal 13, tags 12.
- Wrapped display lines use a line height of 1.12 at 46–50px (1.1 at 34px). Tighter, and descenders hit the next line's dots.

## motion

Everything is still under `prefers-reduced-motion`.

- **Logo draw:** about 2s, once on load and again on logo hover.
- **Bounce:** loading states only (the booking calendar, the 404 page).
- **Signal:** the live dot's pulse, 1.8s.
- **Button wipe:** apricot in from the side the pointer enters, out the side it leaves, 360ms, cubic ease; once on tap.
- **Links and icons:** 150ms colour and underline.
- **Nav:** compacts after 80px of scroll and stays compact under the pointer; keyboard focus opens it back up.

## components

`Button`, `TextLink`, `IconButton`, `ThemeToggle`, `Nav` (with the mobile menu), `Footer`, `Arrows`, `PostCard`, `ProjectShot`, `ProjectLinks`, `LiveSignal` (and `LiveDot`), `CopyButton`, `Tag`, `Logo`, `Icon`, the home sections in `src/components/home/`, the blog's in `src/components/blog/`, and `<Figures>` and `<YouTube>` for posts in `src/components/prose/`. Each file starts with a one-line description; the design system has the full guidelines.

## the full design

Every page is designed and approved (18–19 October 2026). `design/system/README.md` is the design system, with a note per component in `design/system/components/`; `design/mockups/screenshots/` has every page at 1440 and 390px. Where this summary and the design system differ, the design system wins.
