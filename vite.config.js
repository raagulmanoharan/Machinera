import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      // multi-page: the liminal drive (index) + the photoreal city (city)
      input: {
        main: 'index.html',
        city: 'city.html',
      },
    },
  },
})
