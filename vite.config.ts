import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        onlyExplicitManualChunks: true,
        manualChunks(id) {
          const path=id.replaceAll('\\','/');
          if (path.includes('/@sentry/')) return 'monitoring';
          if (path.includes('/node_modules/react')) return 'react-vendor';
          if (path.includes('/@supabase/')) return 'supabase';
        },
      },
    },
  },
});
