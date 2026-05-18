import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  assetsInclude: ['**/*.gltf', '**/*.bin'],
  server: {
    port: 5174
  }
});
