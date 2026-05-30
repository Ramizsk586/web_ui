import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon.svg', 'mask-icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 50 * 1024 * 1024 // 50MB
        },
        manifest: {
          name: 'Lumina',
          short_name: 'Lumina',
          description: 'Modern intelligence, refined interface.',
          theme_color: '#09090b',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        output: {
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
              if (id.includes('tesseract.js')) {
                return 'ocr-tesseract-engine';
              }
              if (id.includes('react-markdown') || id.includes('remark-') || id.includes('turndown') || id.includes('cheerio')) {
                return 'content-parsers-suite';
              }
              return 'vendor-libs';
            }
          }
        }
      },
      chunkSizeWarningLimit: 2000
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
