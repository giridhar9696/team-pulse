import { afterEach, expect, it, vi } from 'vitest';
import { noStoreFetch } from '../src/lib/supabase';

afterEach(()=>vi.unstubAllGlobals());
it('keeps authenticated API reads out of the browser HTTP cache while preserving authorization',async()=>{
  const request=vi.fn().mockResolvedValue(new Response('{}',{status:200}));
  vi.stubGlobal('fetch',request);
  const headers={Authorization:'Bearer test-token'};
  await noStoreFetch('https://example.test/rest/v1/tasks',{headers,cache:'force-cache'});
  expect(request).toHaveBeenCalledWith('https://example.test/rest/v1/tasks',{headers,cache:'no-store'});
});
