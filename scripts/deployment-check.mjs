import { publicConfigurationError } from '../src/lib/publicConfiguration.ts';

const error=publicConfigurationError(process.env.VITE_SUPABASE_URL,process.env.VITE_SUPABASE_PUBLISHABLE_KEY,true);
if (error) throw new Error(error);
if (!['staging','production'].includes(process.env.VITE_APP_ENV)) throw new Error('Set VITE_APP_ENV to staging or production before deployment.');
if (process.env.VITE_APP_ENV==='production'&&!process.env.VITE_SENTRY_DSN) throw new Error('Production error monitoring configuration is required.');
console.log('Deployment configuration validated without exposing credential values. Hosted workflow verification and release approval remain required.');
