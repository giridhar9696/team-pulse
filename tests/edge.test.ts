import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { transpileModule, ModuleKind } from 'typescript';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler:(request:Request)=>Promise<Response>;
const getUser=vi.fn(),reserve=vi.fn(),invite=vi.fn(),recover=vi.fn(),getTarget=vi.fn();
const createClient=vi.fn();
beforeEach(()=>{
  vi.clearAllMocks();
  getUser.mockResolvedValue({data:{user:{id:'verified-admin'}},error:null});
  reserve.mockResolvedValue({data:{email:'stored@example.test',userId:'stored-auth-id'},error:null});
  invite.mockResolvedValue({error:null}); recover.mockResolvedValue({error:null});
  getTarget.mockResolvedValue({data:{user:{email:'confirmed@example.test'}},error:null});
  createClient.mockImplementation((_url,key)=>key==='server-secret' ? {auth:{admin:{inviteUserByEmail:invite,getUserById:getTarget},resetPasswordForEmail:recover}} : {auth:{getUser},rpc:reserve});
  const source=readFileSync('supabase/functions/manage-account/index.ts','utf8').replace(/^import .*\n/,'');
  const script=transpileModule(source,{compilerOptions:{module:ModuleKind.None}}).outputText;
  const env:Record<string,string>={APP_ORIGIN:'https://staging.example.test',SUPABASE_URL:'https://supabase.example.test',SUPABASE_ANON_KEY:'public-key',SUPABASE_SERVICE_ROLE_KEY:'server-secret'};
  runInNewContext(script,{createClient,Response,JSON,Deno:{env:{get:(key:string)=>env[key]},serve:(callback:typeof handler)=>{handler=callback;}}});
});
function request(body:object={employeeId:'EMP001',action:'invite'},overrides:RequestInit={}) {
  return new Request('https://functions.example.test/manage-account',{method:'POST',headers:{origin:'https://staging.example.test',authorization:'Bearer verified-token','content-type':'application/json'},body:JSON.stringify(body),...overrides});
}
describe('account edge function boundary',()=>{
  it('rejects an unapproved origin before any database or account access',async()=>{
    const response=await handler(request({}, {headers:{origin:'https://untrusted.test',authorization:'Bearer token'}}));
    expect(response.status).toBe(403);expect(createClient).not.toHaveBeenCalled();
  });
  it('rejects missing/invalid identity before privileged client initialization',async()=>{
    expect((await handler(request({}, {headers:{origin:'https://staging.example.test'}}))).status).toBe(401);
    getUser.mockResolvedValue({data:{user:null},error:{message:'invalid'}});
    expect((await handler(request())).status).toBe(401);
    expect(createClient.mock.calls.some(c=>c[1]==='server-secret')).toBe(false);
  });
  it('does not send email or initialize privileged access when the scoped RPC denies access',async()=>{
    reserve.mockResolvedValue({data:null,error:{code:'42501'}});
    expect((await handler(request())).status).toBe(403);
    expect(invite).not.toHaveBeenCalled();
    expect(createClient.mock.calls.some(c=>c[1]==='server-secret')).toBe(false);
  });
  it('takes recipient and redirect from verified server configuration, ignoring supplied alternatives',async()=>{
    const response=await handler(request({employeeId:'EMP001',action:'invite',email:'attacker@example.test',redirectOrigin:'https://attacker.test'}));
    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledWith('verified-token');
    expect(invite).toHaveBeenCalledWith('stored@example.test',{redirectTo:'https://staging.example.test/auth/invitation'});
  });
  it('recovers only the server-selected verified Auth identity',async()=>{
    expect((await handler(request({employeeId:'EMP001',action:'recover',userId:'attacker'}))).status).toBe(200);
    expect(getTarget).toHaveBeenCalledWith('stored-auth-id');
    expect(recover).toHaveBeenCalledWith('confirmed@example.test',{redirectTo:'https://staging.example.test/auth/recovery'});
  });
  it('handles mail-provider failures without reporting success or leaking details',async()=>{
    invite.mockResolvedValue({error:{message:'secret provider diagnostic'}});
    const response=await handler(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('secret provider diagnostic');
  });
});
