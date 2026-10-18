/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

// Unit tests run through Astro's Vite config, so `astro:content` and `import.meta.env` resolve as they do in a build.
export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
