import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'], testTimeout: 30000, hookTimeout: 30000,
    coverage: {provider:'v8',include:['src/**/*.{ts,tsx}'],exclude:['src/data/demoData.ts','src/vite-env.d.ts'],reporter:['text','json-summary'],thresholds:{lines:80}},
  },
});
