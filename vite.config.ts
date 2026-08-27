import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites below the repository name.  Keep the
  // local/default build rooted at `/`, while allowing CI to supply that path.
  base: process.env.VITE_BASE_PATH ?? '/',
  server: { port: 5173 }
});
