import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  return {
    plugins: [
      react({
        // Enable automatic JSX runtime for smaller output
        jsxRuntime: 'automatic',
      }),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
          // Faster service worker
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        manifest: {
          name: 'Lumina',
          short_name: 'Lumina',
          description: 'Modern intelligence, refined interface.',
          theme_color: '#09090b',
          background_color: '#09090b',
          display: 'standalone',
          icons: [
            { src: 'icon.svg', sizes: '192x192', type: 'image/svg+xml' },
            { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml' },
            { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' },
          ],
        },
      }),
    ],
    build: {
      // CSS optimization
      cssMinify: 'esbuild',
      cssCodeSplit: true,
      // JS/TS minification
      minify: 'esbuild',
      // Target modern browsers
      target: 'es2020',
      rollupOptions: {
        output: {
          // Aggressive chunk splitting
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('motion')) {
                return 'react-core';
              }
              if (id.includes('lucide-react')) {
                return 'lucide-icons';
              }
              if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
                return 'monaco-suite';
              }
              if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
                return 'syntax-highlighter-pkg';
              }
              if (id.includes('react-markdown') || id.includes('remark-') || id.includes('turndown') || id.includes('cheerio')) {
                return 'content-parsers-suite';
              }
              // Split large vendors further
              if (id.includes('axios') || id.includes('cheerio')) return 'network-libs';
              return 'vendor-libs';
            }
          },
          // Compact output
          compact: true,
          // Consistent chunk naming
          entryFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          chunkFileNames: isProd ? 'assets/[name]-[hash].js' : 'assets/[name].js',
          assetFileNames: isProd ? 'assets/[name]-[hash][extname]' : 'assets/[name][extname]',
        },
      },
      chunkSizeWarningLimit: 2000,
      // Enable source maps in dev only for faster builds
      sourcemap: isProd ? false : true,
      // Report gzip sizes
      reportCompressedSize: false,
    },
    // Faster CSS with lightningcss if available
    css: {
      transformer: 'lightningcss',
    },
    esbuild: {
      // Drop debugger statements in production
      drop: isProd ? ['debugger', 'console'] : [],
      // Tree shaking
      legalComments: 'none',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: 3000,
      strictPort: true,
      hmr: false,
    },
  };
});
