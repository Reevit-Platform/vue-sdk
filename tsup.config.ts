import { defineConfig } from 'tsup';
import { copyFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['vue', '@reevit/core'],
  onSuccess: async () => {
    // Copy styles from core package
    const coreStyles = resolve(__dirname, '../core/dist/styles.css');
    if (existsSync(coreStyles)) {
      copyFileSync(coreStyles, 'dist/styles.css');
      console.log('Copied styles.css from @reevit/core');
    }
  },
});
