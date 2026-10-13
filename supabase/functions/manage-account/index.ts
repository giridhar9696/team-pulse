import { createClient } from 'npm:@supabase/supabase-js@2.117.3';

const origin = Deno.env.get('APP_ORIGIN');
const url = Deno.env.get('SUPABASE_URL');
const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (request: Request) => {
  const requestOrigin = request.headers.get('origin');
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin ?? '', 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
  const respond = (status: number, body: object) => new Response(JSON.stringify(body), {status,headers});
  if (!origin || !url || !publicKey || !secret) return respond(503,{error:'Account service is not configured.'});
  if (requestOrigin !== origin) return respond(403,{error:'Origin denied.'});
  if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
  if (request.method !== 'POST') return respond(405,{error:'Method not allowed.'});
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return respond(401,{error:'Authentication required.'});
  const caller = createClient(url,publicKey,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await caller.auth.getUser(authorization.slice(7));
  if (authError || !user) return respond(401,{error:'Authentication required.'});
  try {
    const text=await request.text();
    if (text.length>4096) return respond(413,{error:'Request too large.'});
    const body=JSON.parse(text);
    if (!body || typeof body.employeeId!=='string' || !/^[A-Z0-9_-]{1,40}$/.test(body.employeeId) || !['invite','recover'].includes(body.action)) return respond(400,{error:'Invalid request.'});
    // The authenticated RPC selects the email and organization and limits repeat requests.
    const {data:target,error:accessError}=await caller.rpc('reserve_account_request',{employee_id:body.employeeId,request_action:body.action});
    if (accessError || !target) return respond(accessError?.code==='42501' ? 403 : 429,{error:'Account request denied. Check access and retry later.'});
    const server=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    if (body.action==='invite') {
      const {error}=await server.auth.admin.inviteUserByEmail(target.email,{redirectTo:`${origin}/auth/invitation`});
      if (error) return respond(502,{error:'Invitation could not be requested.'});
    } else {
      const {data:{user:targetUser},error:targetError}=await server.auth.admin.getUserById(target.userId);
      if (targetError || !targetUser?.email) return respond(502,{error:'Recovery account unavailable.'});
      const {error}=await server.auth.resetPasswordForEmail(targetUser.email,{redirectTo:`${origin}/auth/recovery`});
      if (error) return respond(502,{error:'Recovery could not be requested.'});
    }
    return respond(200,{ok:true});
  } catch { return respond(400,{error:'Invalid account request.'}); }
});
