import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import frappeui from 'frappe-ui/vite'

export default defineConfig({
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
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/')) {
            return 'vue-vendor'
          }
          if (id.includes('/src/data/')) {
            return 'school-data'
          }
          return undefined
        },
      },
    },
  },
})
