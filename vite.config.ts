import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  // CRITICAL: Use relative paths for Capacitor file:// protocol
  base: './',
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'react-is',
      '@radix-ui/react-popover',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      'recharts',
    ],
    esbuildOptions: {
      target: 'esnext',
    },
    force: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
      'react-window': path.resolve(__dirname, './src/lib/react-window-shim.ts'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-is'],
  },
  esbuild: {
    // Strip console.* and debugger statements in production builds
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    // 2G OPTIMIZATION: Aggressive chunk splitting for parallel download
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-is'],
          'router': ['react-router-dom'],
          'query': ['@tanstack/react-query'],
          'ui-core': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
          ],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Reduce chunk size for 2G
    chunkSizeWarningLimit: 300,
    assetsInlineLimit: 4096, // Inline small assets to reduce requests
  },
  // CSS optimization
  css: {
    devSourcemap: false,
  },
  cacheDir: '.vite-nocache',
}));
