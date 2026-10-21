import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import type { Root } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { createHighlighter } from 'shiki';
import { unified } from 'unified';
import { describe, expect, it } from 'vitest';
import { remarkCallouts } from '../../src/lib/markdown/callouts';
import { remarkCookieSettings } from '../../src/lib/markdown/cookie-settings';
import { readConsent, remarkCookieTable } from '../../src/lib/markdown/cookie-table';
import { directiveAsText, remarkTextDirectivesAsText } from '../../src/lib/markdown/directives';
import {
  codeLangs,
  codeTheme,
  codeTransformer,
  fileTitle,
  highlightedLines,
  languageLabel,
  rehypeCodeBlocks,
} from '../../src/lib/markdown/code';
import { rehypeFigures, remarkNoZoom } from '../../src/lib/markdown/images';
import { countWords, readingMinutes } from '../../src/lib/markdown/reading-time';
import { rehypeHeadingCeiling, rehypeTables } from '../../src/lib/markdown/structure';

const render = async (md: string) =>
  String(
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkDirective)
      .use(remarkCallouts)
      .use(remarkCookieSettings)
      .use(remarkTextDirectivesAsText)
      .use(remarkNoZoom)
      .use(remarkRehype)
      .use(rehypeHeadingCeiling)
      .use(rehypeTables)
      .use(rehypeFigures)
      .use(rehypeStringify)
      .process(md),
  );

describe('reading time', () => {
  const words = (md: string) => countWords(unified().use(remarkParse).parse(md));

  it('counts prose words and inline code, not code blocks', () => {
    expect(words('Three short words.')).toBe(3);
    expect(words('Use `isEmpty()` here.')).toBe(3);
    expect(words('Two words.\n\n```js\nconst a = 1; const b = 2; const c = 3;\n```')).toBe(2);
  });

  it('is words ÷ 230, rounded up, at least a minute', () => {
    expect(readingMinutes(0)).toBe(1);
    expect(readingMinutes(230)).toBe(1);
    expect(readingMinutes(231)).toBe(2);
    expect(readingMinutes(1380)).toBe(6);
  });
});

describe('callouts', () => {
  it('turns :::note, :::tip and :::warning into labelled asides', async () => {
    const html = await render(':::note\nSide point.\n:::\n\n:::warning\nCareful.\n:::');
    expect(html).toContain(
      '<aside class="callout callout--note"><span class="callout__label">note</span><p>Side point.</p></aside>',
    );
    expect(html).toContain('<span class="callout__label">heads up</span>');
  });

  it('leaves unknown directives alone', async () => {
    expect(await render(':::other\nText.\n:::')).not.toContain('callout');
  });
});

describe('text directives', () => {
  it('leaves a ratio or a time inside a sentence as written', async () => {
    expect(await render('Light passes at 4.53:1 on ground, and dark at 6.4:1.')).toBe(
      '<p>Light passes at 4.53:1 on ground, and dark at 6.4:1.</p>',
    );
    expect(await render('Doors open at 10:30 sharp; screenshots stay 16:9.')).toBe(
      '<p>Doors open at 10:30 sharp; screenshots stay 16:9.</p>',
    );
  });

  it('keeps any other text directive as text, its label still Markdown', async () => {
    expect(await render('Read :abbr[**CSP**]{title="policy"} here.')).toBe(
      '<p>Read :abbr[<strong>CSP</strong>]{title="policy"} here.</p>',
    );
  });

  it('rebuilds the text when the source is not available', () => {
    expect(
      directiveAsText({ type: 'textDirective', name: '1', attributes: {}, children: [] }, ''),
    ).toEqual([{ type: 'text', value: ':1' }]);
  });

  it('still runs the real directives beside a ratio', async () => {
    const html = await render(':::tip\nAim for 4.5:1 or more.\n:::\n\n::cookie-settings');
    expect(html).toContain('<span class="callout__label">tip</span><p>Aim for 4.5:1 or more.</p>');
    expect(html).toContain('data-consent-preferences');
  });
});

describe('cookie settings', () => {
  it('turns ::cookie-settings into the button that opens the cookie preferences', async () => {
    expect(await render('::cookie-settings')).toBe(
      '<p class="cookie-settings"><button type="button" class="copy" data-consent-preferences="" aria-haspopup="dialog">cookie settings</button></p>',
    );
  });
});

describe('cookie tables', () => {
  const copy = {
    dialog: { noCookies: 'None at the moment.' },
    categories: [
      {
        id: 'analytics',
        cookies: [
          { name: '_ga', domain: '.example.com', purpose: 'Tells visits apart.', kept: '2 years' },
        ],
      },
      { id: 'advertising', cookies: [] },
    ],
  };
  const table = async (md: string) =>
    String(
      await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkCookieTable, { read: () => copy })
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(md),
    );

  it("builds a category's table from the consent wording: cookie and domain, kept for, what it does", async () => {
    const html = (await table('::cookie-table{category="analytics"}')).replace(/\n/g, '');
    expect(html).toContain('<table class="cookie-table">');
    expect(html).toContain('<th>cookie and domain</th><th>kept for</th><th>what it does</th>');
    expect(html).toContain(
      '<td><code>_ga</code><br><code>.example.com</code></td><td>2 years</td><td>Tells visits apart.</td>',
    );
  });

  it('says so when a category sets no cookies, and fails on one that does not exist', async () => {
    expect(await table('::cookie-table{category="advertising"}')).toBe(
      '<p class="cookie-none">None at the moment.</p>',
    );
    await expect(table('::cookie-table{category="marketing"}')).rejects.toThrow(/no category/);
  });

  it('reads the real list, where every category has a table or the "none" line', () => {
    const real = readConsent();
    expect(real.categories.map((c) => c.id)).toEqual(['necessary', 'analytics', 'advertising']);
    expect(real.categories[0]?.cookies.map((c) => c.name)).toContain('cc_cookie');
  });
});

describe('headings and tables', () => {
  it('renders h5 and h6 as h4', async () => {
    const html = await render('##### five\n\n###### six');
    expect(html).toContain('<h4>five</h4>');
    expect(html).toContain('<h4>six</h4>');
    expect(html).not.toMatch(/<h[56]/);
  });

  it('wraps tables in a scrolling frame and sets right-aligned columns as numbers', async () => {
    const html = await render('| a | n |\n| - | -: |\n| x | 54% |');
    expect(html).toMatch(/^<div class="table-wrap"[^>]*><table class="table">/);
    expect(html).toMatch(/<td[^>]*class="num"[^>]*>54%<\/td>/);
    expect(html).toContain('<td>x</td>');
  });
});

describe('figures', () => {
  it('wraps an image in a figure with a viewer button, its title as the caption', async () => {
    const html = await render('![A diagram](./d.png "What to look at.")');
    expect(html).toMatch(
      /^<figure class="fig"><button type="button" class="zoomable" aria-label="View larger: A diagram" data-zoomable(="")?><img src="\.\/d\.png" alt="A diagram" sizes="\(max-width: 760px\) 100vw, 680px">/,
    );
    expect(html).toContain('<figcaption>What to look at.</figcaption></figure>');
    expect(html).not.toContain('title=');
    expect(html).not.toContain('<p>');
  });

  it('leaves {nozoom} images out of the viewer and removes the marker', async () => {
    const html = await render('![A diagram](./d.png){nozoom}');
    expect(html).toMatch(
      /^<figure class="fig"><img src="\.\/d\.png" alt="A diagram"[^>]*><\/figure>$/,
    );
    expect(html).not.toContain('{nozoom}');
  });

  it('gives a portrait image its ratio, so CSS can cap its height before it loads', async () => {
    const file = { path: 'src/content/posts/formatting-reference/index.mdx' };
    const run = async (md: string) =>
      String(
        await unified()
          .use(remarkParse)
          .use(remarkRehype)
          .use(rehypeFigures)
          .use(rehypeStringify)
          .process({ ...file, value: md }),
      );
    expect(await run('![tall](./portrait.png)')).toContain(
      '<figure class="fig" style="--ratio: 0.5625">',
    );
    expect(await run('![wide](./diagram.png)')).toContain('<figure class="fig"><button');
  });

  it('leaves images inside a sentence alone', async () => {
    expect(await render('Text ![icon](./i.png) more.')).toContain('<p>Text <img');
  });
});

describe('code blocks', () => {
  const highlighter = createHighlighter({
    themes: [codeTheme],
    langs: ['js', 'sh', 'json', 'yaml', 'plaintext', ...codeLangs],
  });
  const highlight = async (code: string, lang: string, meta = '') => {
    const html = (await highlighter).codeToHtml(code, {
      lang,
      theme: 'hj',
      meta: { __raw: meta },
      transformers: [codeTransformer()],
    });
    const processor = unified().use(rehypeCodeBlocks).use(rehypeStringify);
    return processor.stringify((await processor.run(fromHtml(html, { fragment: true }))) as Root);
  };

  it('reads the file name and highlighted lines from the meta string', () => {
    expect(fileTitle('title="src/app.js" {2}')).toBe('src/app.js');
    expect(fileTitle('{2}')).toBeUndefined();
    expect([...highlightedLines('{1,3-5}')]).toEqual([1, 3, 4, 5]);
    expect(highlightedLines('title="x"').size).toBe(0);
  });

  it('labels languages by name', () => {
    expect(languageLabel('js')).toBe('javascript');
    expect(languageLabel('sh')).toBe('shell');
    expect(languageLabel('vtl')).toBe('velocity');
    expect(languageLabel('plaintext')).toBe('plain text');
    expect(languageLabel('css')).toBe('css');
  });

  it('wraps the block with a bar: file name, language and copy', async () => {
    const html = await highlight("const a = 'x';", 'js', 'title="src/app.js"');
    expect(html).toMatch(
      /^<div class="codeblock" data-theme="dark"><div class="codeblock__bar"><span><span class="codeblock__file">src\/app\.js<\/span><span class="codeblock__lang">javascript<\/span><\/span><button type="button" class="codeblock__copy" data-copy-code(="")?>copy<\/button><\/div><pre/,
    );
    expect(html).not.toContain('background-color');
  });

  it('colours keywords, strings, numbers and comments only, with the code tokens', async () => {
    const html = await highlight("// note\nconst n = 8000; const s = 'dark'; button.go();", 'js');
    expect(html).toContain('color:var(--muted)">// note');
    expect(html).toContain('color:var(--code-keyword)">const');
    expect(html).toContain('color:var(--code-number)">8000');
    expect(html).toContain("color:var(--code-string)\">'dark'");
    expect(html).toMatch(/color:var\(--text\)">[^<]*button/);
  });

  it('sets keys apart from values: JSON and YAML keys in text, string values as strings', async () => {
    const json = await highlight('{ "name": "harrisonjennings.au", "port": 4321 }', 'json');
    expect(json).toMatch(/color:var\(--text\)">"name"/);
    expect(json).toContain('color:var(--code-string)">"harrisonjennings.au"');
    expect(json).toContain('color:var(--code-number)">4321');
    const yaml = await highlight(
      'name: harrisonjennings.au\nquoted: "a string"\nport: 4321',
      'yaml',
    );
    expect(yaml).toMatch(/color:var\(--text\)">name/);
    expect(yaml).toContain('color:var(--code-string)">harrisonjennings.au');
    expect(yaml).toContain('color:var(--code-string)">"a string"');
    expect(yaml).toContain('color:var(--code-number)">4321');
  });

  it('keeps shell arguments in text colour', async () => {
    expect(await highlight('npm run build --watch', 'sh')).not.toContain('var(--code-string)');
  });

  it('highlights Velocity, with {2-3} marking lines', async () => {
    const vtl = '## c\n#if( $a.isEmpty() )\n  #set( $g = "Hi" )\n#end';
    const html = await highlight(vtl, 'vtl', '{2-3}');
    expect(html.match(/class="line highlighted"/g)).toHaveLength(2);
    expect(html).toContain('color:var(--code-keyword)">#if');
    expect(html).toContain('color:var(--code-string)">"Hi"');
    expect(html).toContain('color:var(--muted)">## c');
  });

  it('treats quotes as strings only inside a Velocity directive’s parentheses', async () => {
    const vtl = [
      '#if( $lead.Company == "Acme (AU)" && ($lead.Score > 10) )',
      "  #set( $greeting = 'Hi there' )",
      '#end',
      "You're registered. We'll see you on the 3rd, true story.",
      "<a href=\"https://example.com/?id=$lead.Id\" class='btn'>Don't miss it</a>",
      '#foreach( $item in $list )$item #end',
    ].join('\n');
    const html = await highlight(vtl, 'vtl');
    // Inside the parentheses: strings (a ")" inside one doesn't end the directive) and numbers.
    expect(html).toContain('color:var(--code-string)">"Acme (AU)"');
    expect(html).toContain("color:var(--code-string)\">'Hi there'");
    expect(html).toContain('color:var(--code-number)">10');
    // Output text and HTML stay plain, apostrophes and attributes included, and nothing leaks on.
    expect(html).toContain(
      "color:var(--text)\">You're registered. We'll see you on the 3rd, true story.",
    );
    expect(html).toContain(
      'color:var(--text)">&#x3C;a href="https://example.com/?id=$lead.Id" class=\'btn\'>Don\'t miss it&#x3C;/a>',
    );
    expect(html).toContain('color:var(--code-keyword)">#foreach');
    expect(html.match(/var\(--code-string\)/g)).toHaveLength(2);
  });

  it('mutes the shell prompt and keeps commands in text colour', async () => {
    const html = await highlight('$ npm run build', 'sh');
    expect(html).toContain('<span class="tk-prompt">$ </span>');
    expect(html).not.toContain('var(--code-string)');
  });

  it('puts each line in its own element with no newlines between', async () => {
    const html = await highlight('a\nb\nc', 'plaintext');
    expect(html.match(/<span class="line">/g)).toHaveLength(3);
    expect(html).not.toMatch(/<\/span>\n<span class="line">/);
  });
});
