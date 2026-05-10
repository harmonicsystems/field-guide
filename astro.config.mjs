// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://field-guide.feed-and-seed.com',
  vite: {
    plugins: [tailwindcss()],
  },
});
