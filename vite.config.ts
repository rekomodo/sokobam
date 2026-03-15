import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['test/**/*.test.ts'],
  },
} as import('vite').UserConfig & { test: import('vitest/config').UserWorkspaceConfig['test'] });
