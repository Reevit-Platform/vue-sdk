import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      insertTypesEntry: true,
      // rollupTypes: true, // Disabling because it causes "Unable to follow symbol" errors in CI
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ReevitVue',
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'js'}`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['vue', '@reevit/core'],
      output: {
        globals: {
          vue: 'Vue',
          '@reevit/core': 'ReevitCore',
        },
      },
    },
  },
});
