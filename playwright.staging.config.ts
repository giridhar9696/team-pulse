import { defineConfig, devices } from '@playwright/test';

const required=['TEAM_PULSE_STAGING_URL','TEAM_PULSE_TEST_PROJECT_REF','TEAM_PULSE_TEST_SUPABASE_URL','TEAM_PULSE_TEST_PUBLISHABLE_KEY','TEAM_PULSE_TEST_ADMIN_EMAIL','TEAM_PULSE_TEST_ADMIN_PASSWORD','TEAM_PULSE_TEST_EMPLOYEE_EMAIL','TEAM_PULSE_TEST_EMPLOYEE_PASSWORD'];
for (const name of required) if (!process.env[name]) throw new Error(`Staging test configuration required: ${name}`);
if (process.env.TEAM_PULSE_TEST_SUPABASE_URL!==`https://${process.env.TEAM_PULSE_TEST_PROJECT_REF}.supabase.co` || process.env.TEAM_PULSE_ALLOW_STAGING_TESTS!=='yes') throw new Error('Explicit dedicated staging project confirmation required.');
export default defineConfig({testDir:'./e2e',testMatch:'staging.spec.ts',workers:1,retries:0,timeout:120000,forbidOnly:true,
  reporter:[['./e2e/redacted-reporter.ts']],
  use:{baseURL:process.env.TEAM_PULSE_STAGING_URL,trace:'off',screenshot:'off',video:'off'},
  projects:[{name:'staging-chromium',use:{...devices['Desktop Chrome']}}],
});
