/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve, dirname, join } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'EventStream',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'main.mjs';
        return 'main.js';
      },
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      entryRoot: 'src',
      rollupTypes: true,
      afterBundleError: true,
      beforeWriteFile: (filePath, content) => {
        return {
          filePath: resolve(__dirname, 'dist/main.d.ts'),
          content,
        };
      },
    }),
  ],
});
