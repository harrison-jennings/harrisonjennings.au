// The code shown with an example is the example file itself, never a second copy. Its imports point
// into the site from the design system (../../../src/…); shown, they read as they would from a page
// or component in the site (../components/…).
export const usage = (source: string): string =>
  source.replace(/(['"])(?:\.\.\/)+src\//g, '$1../').trim();
