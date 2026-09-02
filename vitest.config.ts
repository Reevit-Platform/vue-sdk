import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    restoreMocks: true,
    server: {
      // @hubteljs/checkout ships extensionless ESM imports that Node cannot resolve;
      // inlining routes it through Vite's resolver instead.
      deps: { inline: ['@hubteljs/checkout'] },
    },
  },
});
