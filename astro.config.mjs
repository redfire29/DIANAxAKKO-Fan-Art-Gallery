// @ts-check
import { defineConfig } from 'astro/config';

import svelte from '@astrojs/svelte';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [svelte()],
  site: 'https://redfire29.github.io',
  base: '/DIANAxAKKO-Fan-Art-Gallery',

  vite: {
    plugins: [tailwindcss()]
  }
});