import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const isProd = mode === 'production';
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
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('@monaco-editor') || id.includes('monaco-editor')) {
                return 'monaco-suite';
              }
              if (id.includes('react-syntax-highlighter') || id.includes('prismjs')) {
                return 'syntax-highlighter-pkg';
              }
              if (id.includes('axios')) {
                return 'network-libs';
              }
              if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler') || id.includes('motion')) {
                return 'react-core';
              }
              if (id.includes('lucide-react')) {
                return 'lucide-icons';
              }
              if (id.includes('react-markdown') || id.includes('remark-') || id.includes('turndown')) {
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
      watch: {
        ignored: ['**/src-tauri/**', '**/target/**'],
      },
    },
  };
});
