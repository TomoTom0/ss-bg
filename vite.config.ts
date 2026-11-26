import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue(), crx({ manifest })],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        // crxjs は manifest から参照されるページしかビルドしないため、
        // offscreen ページ（クリップボードコピー用）を明示的にビルド対象へ追加する
        offscreen: resolve(__dirname, './src/offscreen/index.html')
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: [
      'node_modules/',
      'dist/',
      'tmp/',
      'tests/e2e/**',
      '**/*.config.ts',
      '**/*.d.ts',
      '**/types.ts'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tmp/',
        'tests/e2e/**',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/types.ts'
      ]
    }
  }
});
