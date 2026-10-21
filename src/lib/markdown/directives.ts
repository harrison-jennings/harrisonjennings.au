// remark-directive reads `:name` inside a sentence as a text directive, so prose like "4.53:1",
// "16:9" or "10:30" would become an empty element that splits the paragraph and drops the ":1". The
// site's directives are all leaf or container ones (::cookie-table, ::cookie-settings, the :::note,
// :::tip and :::warning callouts), so every text directive is turned back into the text it was
// written as. A label's own Markdown (:name[**bold**]) is kept as Markdown.
import type { PhrasingContent, Root } from 'mdast';
import type { TextDirective } from 'mdast-util-directive';
import { SKIP, visit } from 'unist-util-visit';

const text = (value: string): PhrasingContent => ({ type: 'text', value });

/** `{key="value"}` from a directive's attributes, for when the source text isn't available. */
function attributesText(attributes: TextDirective['attributes']): string {
  const pairs = Object.entries(attributes ?? {}).filter(([, value]) => value !== undefined);
  if (pairs.length === 0) return '';
  return `{${pairs.map(([key, value]) => (value === '' ? key : `${key}="${value}"`)).join(' ')}}`;
}

/** What the directive was written as: its source text, with any label's content kept as nodes. */
export function directiveAsText(node: TextDirective, source: string): PhrasingContent[] {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  const first = node.children[0]?.position?.start.offset;
  const last = node.children.at(-1)?.position?.end.offset;
  const fromSource = source !== '' && start !== undefined && end !== undefined;
  if (node.children.length === 0) {
    return [
      text(
        fromSource ? source.slice(start, end) : `:${node.name}${attributesText(node.attributes)}`,
      ),
    ];
  }
  if (fromSource && first !== undefined && last !== undefined) {
    return [text(source.slice(start, first)), ...node.children, text(source.slice(last, end))];
  }
  return [text(`:${node.name}[`), ...node.children, text(`]${attributesText(node.attributes)}`)];
}

export function remarkTextDirectivesAsText() {
  return (tree: Root, file: { value?: unknown }) => {
    const source = typeof file.value === 'string' ? file.value : String(file.value ?? '');
    visit(tree, 'textDirective', (node, index, parent) => {
      if (!parent || index === undefined) return;
      parent.children.splice(index, 1, ...directiveAsText(node, source));
      // Look at the same position again: a label may hold another text directive.
      return [SKIP, index];
    });
  };
}
