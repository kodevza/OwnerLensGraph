var _a;
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    // GitHub Pages serves project sites below the repository name.  Keep the
    // local/default build rooted at `/`, while allowing CI to supply that path.
    base: (_a = process.env.VITE_BASE_PATH) !== null && _a !== void 0 ? _a : '/',
    server: { port: 5173 }
});
