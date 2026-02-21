#!/usr/bin/env node
/**
 * content-exports.tsを単一バンドルとしてビルドするスクリプト
 * viteのbuild APIを使用
 */

import { build } from 'vite';
import { resolve } from 'path';

await build({
  configFile: false,
  build: {
    emptyOutDir: false,
    outDir: 'public',
    lib: {
      entry: resolve(process.cwd(), 'src/content/content-exports.ts'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'assets/content-bundle.js'
    },
    rollupOptions: {
      output: {
        extend: true
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src')
    }
  }
});

console.log('Content bundle built successfully');
