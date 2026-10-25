import { describe, expect, it } from 'vitest';
import { readProps } from '../../design-system/src/lib/props';
import button from '../../src/components/Button.astro?raw';
import logo from '../../src/components/Logo.astro?raw';
import postCardView from '../../src/components/PostCardView.astro?raw';

// The design system's props tables are read from each component's `interface Props`.

describe('readProps', () => {
  it("reads a component's props in order, with types, defaults and doc comments", () => {
    const props = readProps(button);
    expect(props.map((p) => p.name)).toEqual([
      'href',
      'label',
      'size',
      'external',
      'class',
      'attrs',
    ]);
    expect(props.find((p) => p.name === 'label')).toMatchObject({ required: true, type: 'string' });
    expect(props.find((p) => p.name === 'size')).toMatchObject({
      required: false,
      type: "'l' | 'm' | 's' | 'xs' | 'block'",
      default: "'m'",
    });
    expect(props.find((p) => p.name === 'external')?.default).toBe('isExternal(href)');
    expect(props.find((p) => p.name === 'href')?.doc).toBe(
      'Leave out for an in-page action: renders a <button>.',
    );
  });

  it('joins a doc comment over several lines, and reads a renamed prop', () => {
    const props = readProps(logo);
    expect(props.find((p) => p.name === 'draw')?.doc).toMatch(
      /^Play the draw on load .* element\.$/,
    );
    expect(props.find((p) => p.name === 'draw')?.type).toBe("boolean | 'view'");
    expect(props.find((p) => p.name === 'size')?.default).toBe('26');
  });

  it('keeps an object type whole, and drops a trailing | undefined', () => {
    const tag = readProps(postCardView).find((p) => p.name === 'tag');
    expect(tag?.type).toBe('{ name: string; href?: string | undefined }');
    expect(readProps(postCardView).map((p) => p.name)).toEqual(['href', 'datetime', 'tag']);
  });

  it('finds none in a component without props', () => {
    expect(readProps('---\nconst x = 1;\n---\n<p>hi</p>')).toEqual([]);
  });
});
