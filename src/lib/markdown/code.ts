// Code blocks. Highlighting runs at build with Shiki, coloured with the code tokens as CSS variables
// (keywords, strings, numbers; comments muted; the rest text), so both themes work.
//
//   ```js                       the language sets the highlighting and the label; nothing is guessed
//   ```js title="src/app.js"    adds a file name to the bar
//   ```vtl {2-3}                highlights lines 2 to 3 (also {1,4-6})
//   ```sh                       a leading "$ " is a prompt: muted, and left out of the copy
import type { Element, ElementContent, Root } from 'hast';
import type { ShikiTransformer, ThemeRegistration } from 'shiki';
import { SKIP, visit } from 'unist-util-visit';
import velocity from './velocity.tmLanguage.json';

/**
 * The code theme. Colours are CSS variables, so code follows the light and dark themes: keywords,
 * strings, numbers (and true/false/null) and comments are coloured; everything else is text.
 */
export const codeTheme: ThemeRegistration = {
  name: 'hj',
  type: 'dark',
  colors: { 'editor.foreground': 'var(--text)' },
  tokenColors: [
    { settings: { foreground: 'var(--text)' } },
    {
      scope: ['keyword', 'storage', 'keyword.operator.new', 'keyword.operator.expression'],
      settings: { foreground: 'var(--code-keyword)' },
    },
    { scope: ['keyword.operator'], settings: { foreground: 'var(--text)' } },
    {
      scope: ['keyword.operator.new', 'keyword.operator.expression', 'storage.type.function.arrow'],
      settings: { foreground: 'var(--code-keyword)' },
    },
    { scope: ['string', 'string.template'], settings: { foreground: 'var(--code-string)' } },
    // Shell commands and their arguments are "unquoted strings"; only quoted text is a string.
    { scope: ['string.unquoted'], settings: { foreground: 'var(--text)' } },
    {
      scope: ['constant.numeric', 'constant.language'],
      settings: { foreground: 'var(--code-number)' },
    },
    {
      scope: ['comment', 'punctuation.definition.comment'],
      settings: { foreground: 'var(--muted)' },
    },
  ],
};

export const codeLangs = [{ ...velocity, aliases: ['vtl'] }];

const LABELS: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  shell: 'shell',
  console: 'shell',
  vtl: 'velocity',
  yml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  jsonc: 'json',
  plaintext: 'plain text',
  text: 'plain text',
  txt: 'plain text',
};
export const languageLabel = (lang: string): string => LABELS[lang] ?? lang;

const PROMPT_LANGS = new Set(['sh', 'bash', 'zsh', 'shell', 'console']);

/** Line numbers from a meta string like `title="x" {2-3,5}`. */
export function highlightedLines(meta: string): Set<number> {
  const lines = new Set<number>();
  const braces = meta.match(/\{([\d,\s-]+)\}/);
  for (const part of braces?.[1]?.split(',') ?? []) {
    const [a, b] = part.split('-').map((n) => Number(n.trim()));
    if (!a) continue;
    for (let n = a; n <= (b || a); n++) lines.add(n);
  }
  return lines;
}

export const fileTitle = (meta: string): string | undefined =>
  meta
    .match(/title=(?:"([^"]*)"|'([^']*)')/)
    ?.slice(1)
    .find((t) => t !== undefined);

const firstText = (node: Element): { parent: Element; index: number } | undefined => {
  for (const [index, child] of node.children.entries()) {
    if (child.type === 'text') return { parent: node, index };
    if (child.type === 'element') {
      const found = firstText(child);
      if (found) return found;
    }
  }
  return undefined;
};

export function codeTransformer(): ShikiTransformer {
  return {
    name: 'hj-code',
    pre(node) {
      const meta = this.options.meta?.__raw ?? '';
      const lang = this.options.lang;
      node.properties['dataLanguage'] = languageLabel(lang);
      // The block's frame sets the background (surface); Shiki can't take a CSS variable for it.
      node.properties['style'] = String(node.properties['style'] ?? '').replace(
        /background-color:[^;]*;?/,
        '',
      );
      const title = fileTitle(meta);
      if (title) node.properties['dataTitle'] = title;
    },
    code(node) {
      // One element per line, so breaks never depend on whitespace in the markup.
      node.children = node.children.filter((c) => !(c.type === 'text' && c.value === '\n'));
    },
    line(node, line) {
      const meta = this.options.meta?.__raw ?? '';
      if (highlightedLines(meta).has(line)) this.addClassToHast(node, 'highlighted');
      if (!PROMPT_LANGS.has(this.options.lang)) return;
      const first = firstText(node);
      if (!first) return;
      const text = first.parent.children[first.index] as { type: 'text'; value: string };
      const match = text.value.match(/^(\$\s?)/);
      if (!match?.[1]) return;
      text.value = text.value.slice(match[1].length);
      node.children.unshift({
        type: 'element',
        tagName: 'span',
        properties: { className: ['tk-prompt'] },
        children: [{ type: 'text', value: match[1] }],
      });
    },
  };
}

/** Wraps each highlighted <pre> in the code block: a bar with the file name, language and copy. */
export function rehypeCodeBlocks() {
  return (tree: Root) => {
    visit(tree, 'element', (el, index, parent) => {
      if (el.tagName !== 'pre' || !parent || index === undefined) return;
      const lang = String(el.properties['dataLanguage'] ?? 'plain text');
      const title = el.properties['dataTitle'];
      delete el.properties['dataTitle'];
      const label: ElementContent[] = [];
      if (title)
        label.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['codeblock__file'] },
          children: [{ type: 'text', value: String(title) }],
        });
      label.push({
        type: 'element',
        tagName: 'span',
        properties: { className: ['codeblock__lang'] },
        children: [{ type: 'text', value: lang }],
      });
      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['codeblock'] },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { className: ['codeblock__bar'] },
            children: [
              { type: 'element', tagName: 'span', properties: {}, children: label },
              {
                type: 'element',
                tagName: 'button',
                properties: { type: 'button', className: ['codeblock__copy'], dataCopyCode: '' },
                children: [{ type: 'text', value: 'copy' }],
              },
            ],
          },
          el,
        ],
      };
      return [SKIP, index + 1];
    });
  };
}
