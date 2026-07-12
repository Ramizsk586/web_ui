import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
  const webviewTarget = 'esnext';
  return {
    plugins: [
      {
        name: 'strip-broken-monaco-loader-sourcemap',
        enforce: 'pre',
        transform(code, id) {
          const normalizedId = id.replace(/\\/g, '/');
          if (!normalizedId.endsWith('/monaco-editor/min/vs/loader.js')) {
            return null;
          }

          return {
            code: code.replace(/\n\/\/# sourceMappingURL=\.\.\/\.\.\/min-maps\/vs\/loader\.js\.map\s*$/, ''),
            map: null,
          };
        },
      },
      react({
        // Enable automatic JSX runtime for smaller output
        jsxRuntime: 'automatic',
      }),
      tailwindcss(),
    ],
    build: {
      // CSS optimization
      cssMinify: 'esbuild',
      cssCodeSplit: true,
      // JS/TS minification
      minify: 'esbuild',
      // Target modern browsers
      target: webviewTarget,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              const normalizedId = id.replace(/\\/g, '/');
              if (normalizedId.includes('/@monaco-editor/') || normalizedId.includes('/monaco-editor/')) {
                return 'monaco-suite';
              }
              if (normalizedId.includes('/react-syntax-highlighter/') || normalizedId.includes('/prismjs/')) {
                return 'syntax-highlighter-pkg';
              }
              if (normalizedId.includes('/axios/')) {
                return 'network-libs';
              }
              if (/\/node_modules\/(react|react-dom|scheduler|motion|motion\/react)\//.test(normalizedId)) {
                return 'react-core';
              }
              if (normalizedId.includes('/lucide-react/')) {
                return 'lucide-icons';
              }
              if (normalizedId.includes('/react-markdown/') || normalizedId.includes('/remark-') || normalizedId.includes('/turndown/')) {
                return 'content-parsers-suite';
              }
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
      target: webviewTarget,
      // Drop debugger statements in production
      drop: isProd ? ['debugger', 'console'] : [],
      // Tree shaking
      legalComments: 'none',
    },
    optimizeDeps: {
      esbuildOptions: {
        target: webviewTarget,
      },
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
      watch: {
        ignored: ['**/src-tauri/**', '**/target/**'],
      },
    },
  };
});
