Cookie consent: the banner on a first visit and the preferences dialog behind "manage preferences" and the footer's "cookie settings". Approved 19 October 2026; mockups on the canvas under "Cookie consent".

**Banner** (`.hj-consent`): a `surface` panel with a hairline, fixed to the bottom of the screen, as wide as the content column. Left: "cookies." (`.hj-consent__title`, Martian Mono, brick stop) and one paragraph. Right: three stacked `.hj-choice` buttons of equal weight: "accept all", "reject non-essential", "manage preferences". On phones it spans the screen less 12px each side and the buttons stack under the text.

**Preferences** (`.hj-prefs` scrim, `.hj-prefs__dialog`): a 720px dialog on `ground` with a hairline. Head: "cookie preferences" and an outlined close button. Body: an intro, then one `.hj-cat` panel per category (essential, analytics, advertising), then a line pointing to the privacy policy. Foot: "accept all" and "reject non-essential" (`.hj-choice`) at the left, "save choices" (`.hj-btn`, the one primary) at the right. On phones it fills the screen and the foot stacks with "save choices" first.

**A category** (`.hj-cat`): a header row with a `<button class="hj-cat__toggle" aria-expanded>` (chevron and name) and either an `.hj-onoff` switch or "always on" (`.hj-cat__always`) for essential. Expanded (`.hj-cat__more`): one sentence on what it's for, then a `.hj-cookies` table (cookie, what it does, kept for). On phones each cookie becomes two lines: name and time, then its purpose. Analytics is open by default in the dialog.

**The switch** (`.hj-onoff`): `<button role="switch" aria-checked>` labelled by its category's name; 48 × 28 track inside a 60 × 44 hit area. Off: `ground` track with a `line` ring and a `muted` knob. On: `accent` track with an `on-accent` knob, slid right.

**Copy** (lowercase UI, Australian English):
- Banner: "Essential cookies keep the site working and remember your choices. Analytics and advertising cookies only run if you agree, and you can change your mind any time from cookie settings in the footer. More in the privacy policy."
- Dialog intro: "Choose which cookies this site can use. Anything optional stays off until you turn it on."
- essential: "Needed for the site to work, and to remember the choices you make here. These can't be turned off." `cc_cookie`, remembers your cookie choices, 6 months.
- analytics: "Google Analytics shows which pages and posts get read and how people find the site, so I know what's worth writing more of." `_ga`, tells one visitor's visits apart from another's, 2 years; `_ga_<id>`, keeps track of the current visit, 2 years.
- advertising: "Lets ad platforms tell whether a campaign brought you here, and may be used to show you related ads on other sites." Its cookies come from the Tag Manager audit.
- End line: "Questions about cookies or your information? See the privacy policy."

**Rules:**
- "accept all" and "reject non-essential" always carry equal weight; neither is brick.
- The banner never dims or blocks the page; only the preferences dialog has a scrim. Ignoring the banner means no consent: it shows on every page until a choice is made, and scrolling or clicking around never counts as consent.
- No close button on the banner. "reject non-essential" is the way out.
- Closing the dialog without saving goes back to the banner if no choice has been made yet.
- Every optional category is off until switched on.

**Building it with CookieConsent v3:** consent modal `layout: 'cloud'`, `position: 'bottom center'`, `equalWeightButtons: true`, `disablePageInteraction: false`, no `closeIconLabel`; preferences modal `layout: 'box'`; categories `necessary` (`readOnly`), `analytics`, `advertising`, each with a `cookieTable` for the rows above. Restyle its markup to these classes, or map its CSS variables to the tokens and override the rest; either way it must match the mockups in both themes. Load its stylesheet and script locally, not from a CDN.

**Accessibility:** the banner is a labelled region, not a modal; the page stays reachable. The dialog is modal: focus moves to its close button, Tab stays inside, Esc closes it, and focus returns to whatever opened it. Reduced motion: the banner and dialog appear without sliding, and switches and chevrons change without easing.
