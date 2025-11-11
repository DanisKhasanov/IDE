import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@src',
        replacement: resolve(__dirname, 'src'),
      },
    ],
  },
});
