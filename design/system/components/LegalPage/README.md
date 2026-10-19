Privacy policy (/privacy-policy/) and terms of use (/terms-of-use/): one template.

- **Header:** `.hj-pagehead__title` ("privacy policy." / "terms of use.", brick stop), a one-line intro, then `.hj-legal-meta`: "Last updated …" (privacy) or "Effective …" (terms) and a link to the other page.
- **The short version** (`.hj-short`, privacy only): a `surface` panel of four or five plain-language points, from the page's front matter.
- **Body:** the policy as Markdown in `.hj-prose`, sections as h2 (sentence case lowered to match the voice), with "on this page" beside it on desktop and the closed panel on phones.
- **Cookies section** carries a "cookie settings" button (`.hj-copy` style) that reopens the consent choices.
- **End:** `.hj-legal-contact`, a line with the contact email.
- **Editing:** each page is one Markdown file in `src/content/pages/` (title, description, `updated` date, an optional `summary` list for the short version); the text is edited there like a post.
