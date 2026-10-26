// The code shown with an example is the example file itself, never a second copy. Its imports point
// into the site from the design system (../../../src/…); shown, they read as they would from a page
// or component in the site (../components/…), and a content example's images as they would beside a post.
export const usage = (source: string): string =>
  source
    // A content example borrows a post's files (images, a poster); in a post they sit beside it.
    .replace(/(['"(])(?:\.\.\/)+src\/content\/posts\/[^/]+\//g, '$1./')
    .replace(/(['"])(?:\.\.\/)+src\//g, '$1../')
    .trim();
