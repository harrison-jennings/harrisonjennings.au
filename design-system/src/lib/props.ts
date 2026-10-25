// A component's props, read from its own source at build time: each member of its `interface Props`
// (name, whether it's required, its type and its /** comment */), and its default from the
// `const { … } = Astro.props` that takes them apart. So the props table can't drift from the code.

export interface Prop {
  name: string;
  required: boolean;
  type: string;
  /** The default as written in the code, if there is one: 'm', false, isExternal(href). */
  default?: string;
  /** The prop's doc comment, on one line. */
  doc?: string;
}

/** The text between the brace at `open` and the one that closes it. */
function block(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(open + 1, i);
  }
  return '';
}

/** Splits on `sep` where it isn't inside brackets, braces, angle brackets or quotes. */
function splitTop(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quote = '';
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i] ?? '';
    if (quote) {
      if (c === quote) quote = '';
    } else if (c === "'" || c === '"' || c === '`') quote = c;
    else if ('([{<'.includes(c)) depth++;
    else if (')]}>'.includes(c) && text[i - 1] !== '=') depth--;
    else if (c === sep && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts.map((p) => p.trim()).filter(Boolean);
}

const tidy = (comment: string) =>
  comment
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map((line) => line.replace(/^\s*\*\s?/, '').trim())
    .join(' ')
    .trim();

/** The defaults in `const { a = 1, b: renamed = 'x', c } = Astro.props;`. */
function defaults(source: string): Map<string, string> {
  const found = new Map<string, string>();
  let body: string | undefined;
  for (const m of source.matchAll(/const\s*\{/g)) {
    const open = (m.index ?? 0) + m[0].length - 1;
    const inner = block(source, open);
    if (/^\s*=\s*Astro\.props/.test(source.slice(open + inner.length + 2))) body = inner;
  }
  if (body === undefined) return found;
  for (const part of splitTop(body.replace(/\/\/[^\n]*/g, ''), ',')) {
    const m = part.match(/^(\w+)\s*(?::\s*\w+\s*)?=\s*([\s\S]+)$/);
    if (m?.[1] && m[2]) found.set(m[1], m[2].replace(/\s+/g, ' ').trim());
  }
  return found;
}

/** Every prop in the component's `interface Props`, in order. None if it takes no props. */
export function readProps(source: string): Prop[] {
  const at = source.search(/interface\s+Props\b[^{]*\{/);
  if (at < 0) return [];
  const body = block(source, source.indexOf('{', at));
  const given = defaults(source);
  const props: Prop[] = [];
  // Each member: an optional doc comment, then `name?: type;`. Line comments are dropped.
  const members = body.replace(/^\s*\/\/[^\n]*$/gm, '');
  const re = /(\/\*\*[\s\S]*?\*\/)?\s*(\w+)(\?)?\s*:\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(members))) {
    // The type runs to the next `;` at the top level.
    const rest = members.slice(re.lastIndex);
    const type = splitTop(rest, ';')[0] ?? '';
    re.lastIndex += rest.indexOf(type) + type.length;
    const name = m[2] ?? '';
    const prop: Prop = {
      name,
      required: !m[3],
      type: type.replace(/\s+/g, ' ').replace(/\s*\|\s*undefined$/, ''),
    };
    const fallback = given.get(name);
    if (fallback !== undefined) prop.default = fallback;
    if (m[1]) prop.doc = tidy(m[1]);
    props.push(prop);
  }
  return props;
}
