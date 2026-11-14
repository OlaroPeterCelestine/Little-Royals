import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import frappeui from 'frappe-ui/vite'

export default defineConfig(({ mode }) => ({
  plugins: [
    // The parts that talk to a Frappe server are off. The rest keeps the dev
    // server fast and loads one copy of the modules behind toast() and dialog.
    frappeui({ frappeProxy: false, jinjaBootData: false, buildConfig: false }),
    vue(),
  ],
  // frappe-ui ships TypeScript source with package `#imports`. Vite's esbuild
  // dep optimizer fails on those (e.g. charts → `#utils/debounce`), so keep
  // frappe-ui out of pre-bundling and let Vite resolve the package map.
  optimizeDeps: {
    exclude: ['frappe-ui'],
    include: ['vue', 'vue-router'],
  },
  esbuild: {
    legalComments: 'none',
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    cssMinify: true,
    minify: 'esbuild',
    sourcemap: false,
    reportCompressedSize: false,
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 800,
    modulePreload: {
      polyfill: true,
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/vue/') ||
            id.includes('node_modules/vue-router/') ||
            id.includes('node_modules/@vue/')
          ) {
            return 'vue-vendor'
          }
          // Keep heavy optional libs out of the main / list-page graph.
          if (
            id.includes('node_modules/echarts') ||
            (id.includes('frappe-ui') && id.includes('charts'))
          ) {
            return 'charts'
          }
          if (id.includes('node_modules/tesseract.js')) {
            return 'tesseract'
          }
          // Seed / schema payloads — cache separately from UI chrome.
          if (
            id.includes('/src/data/catalog.ts') ||
            id.includes('/src/data/catalogExtra.ts')
          ) {
            return 'catalog-data'
          }
          if (id.includes('/src/data/formSchemas.ts')) {
            return 'form-schemas'
          }
          if (id.includes('/src/data/documents.ts')) {
            return 'documents-lib'
          }
          return undefined
        },
      },
    },
  },
}))
