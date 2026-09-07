import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { aiRoutes } from './server/ai-routes.js';
import { workspaceRoutes } from './server/workspace-routes.js';
import { authRoutes } from './server/auth-routes.js';
import { newsRoutes } from './server/news-routes.js';
import { desktopWidgetRoutes } from './server/desktop-widget-routes.js';
export default defineConfig({
  plugins: [react(), authRoutes(), desktopWidgetRoutes(), workspaceRoutes(), newsRoutes(), aiRoutes()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/.worktrees/**'],
  },
});
