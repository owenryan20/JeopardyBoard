import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages project site: https://owenryan20.github.io/JeopardyBoard/
const repoBase = '/JeopardyBoard/';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Dev server: root path. Production build: GitHub Pages subpath.
  base: mode === 'production' ? repoBase : '/',
}));
