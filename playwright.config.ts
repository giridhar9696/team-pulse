import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:'./e2e',testMatch:'smoke.spec.ts',fullyParallel:true,forbidOnly:Boolean(process.env.CI),retries:process.env.CI?1:0,
  use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
  webServer:{command:'npm run dev -- --port 4173 --strictPort',url:'http://127.0.0.1:4173',reuseExistingServer:false,
    env:{VITE_SUPABASE_URL:'',VITE_SUPABASE_PUBLISHABLE_KEY:'',VITE_SENTRY_DSN:''}},
});
