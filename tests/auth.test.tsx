// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../src/features/auth/AuthProvider';
import { useAuth } from '../src/features/auth/authContext';
import { changePassword, requestRecovery } from '../src/features/auth/authService';
import { LoginPage } from '../src/features/auth/LoginPage';
import { RecoveryPage } from '../src/features/auth/RecoveryPage';
import { RequireRole } from '../src/features/auth/RequireRole';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), membership: vi.fn(), onAuth: vi.fn(), reset: vi.fn(), update: vi.fn(),
}));
vi.mock('../src/lib/supabase', () => {
  const chain = { select: () => chain, eq: () => chain, maybeSingle: mocks.membership };
  const client = { from: () => chain, auth: {getUser:mocks.getUser,signInWithPassword:mocks.signIn,signOut:mocks.signOut,onAuthStateChange:mocks.onAuth,resetPasswordForEmail:mocks.reset,updateUser:mocks.update} };
  return { configurationError:null,supabase:client,requireSupabase:()=>client };
});
const identity = {id:'auth-user',email:'employee@example.test'};
const member = {id:'EMP001',organization_id:'org',name:'Employee',email:identity.email,role:'employee',status:'active'};
let callback: (event: string, session: object | null) => void;
function Probe() {
  const {user,loading,error,login,logout} = useAuth();
  return <><p>{loading ? 'Restoring' : user ? `${user.role}:${user.identifier}` : 'Signed out'}</p><p>{error}</p>
    <button onClick={()=>void login({role:'admin',identifier:identity.email,password:'a real password'}).catch(()=>{})}>Login</button>
    <button onClick={()=>void logout().catch(()=>{})}>Logout</button></>;
}
function mount() {
  const cache = new QueryClient({defaultOptions:{queries:{retry:false}}});
  cache.setQueryData(['old-user-data'],{private:'record'});
  render(<QueryClientProvider client={cache}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>);
  return cache;
}
beforeEach(()=>{
  vi.clearAllMocks();
  mocks.getUser.mockResolvedValue({data:{user:identity},error:null});
  mocks.membership.mockResolvedValue({data:member,error:null});
  mocks.signIn.mockResolvedValue({error:null}); mocks.signOut.mockResolvedValue({error:null});
  mocks.reset.mockResolvedValue({error:null}); mocks.update.mockResolvedValue({error:null});
  mocks.onAuth.mockImplementation((cb)=>{callback=cb;return {data:{subscription:{unsubscribe:vi.fn()}}};});
});
afterEach(cleanup);
describe('verified authentication',()=>{
  it('restores the backend role and clears a prior user cache',async()=>{
    const cache=mount();
    await screen.findByText('employee:EMP001');
    expect(cache.getQueryData(['old-user-data'])).toBeUndefined();
  });
  it('uses membership role even if the login payload asks for administrator',async()=>{
    mocks.getUser.mockResolvedValueOnce({data:{user:null},error:null});
    mount(); await screen.findByText('Signed out');
    fireEvent.click(screen.getByText('Login'));
    await screen.findByText('employee:EMP001');
    expect(mocks.signIn).toHaveBeenCalledWith({email:identity.email,password:'a real password'});
  });
  it('denies access when there is no active membership',async()=>{
    mocks.membership.mockResolvedValue({data:null,error:null});
    mount(); await screen.findByText('Signed out');
    expect(mocks.signOut).toHaveBeenCalledWith({scope:'local'});
    expect(screen.queryByText('employee:EMP001')).toBeNull();
    fireEvent.click(screen.getByText('Login'));
    await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());
  });
  it('clears private cache and identity on expired/signed-out sessions',async()=>{
    const cache=mount(); await screen.findByText('employee:EMP001');
    cache.setQueryData(['private'],['task']);
    act(()=>callback('SIGNED_OUT',null));
    await screen.findByText('Signed out');
    expect(cache.getQueryData(['private'])).toBeUndefined();
  });
  it('fails closed when membership verification fails',async()=>{
    mocks.membership.mockResolvedValue({data:null,error:{message:'network failure'}});
    mount(); await screen.findByText('Signed out');
    expect(screen.getByText(/Unable to verify your session/)).toBeTruthy();
  });
  it('refreshes membership on focus, so deactivation removes the visible workspace',async()=>{
    mount(); await screen.findByText('employee:EMP001');
    mocks.membership.mockResolvedValue({data:null,error:null});
    fireEvent(window,new Event('focus'));
    await screen.findByText('Signed out');
  });
  it('clears cached administrator data when the verified role changes for the same identity',async()=>{
    mocks.membership.mockResolvedValue({data:{...member,role:'admin'},error:null});
    const cache=mount();await screen.findByText('admin:EMP001');
    cache.setQueryData(['administrator-directory'],['other employee']);
    mocks.membership.mockResolvedValue({data:member,error:null});
    fireEvent(window,new Event('focus'));
    await screen.findByText('employee:EMP001');
    expect(cache.getQueryData(['administrator-directory'])).toBeUndefined();
  });
  it('reports logout errors without claiming the user signed out',async()=>{
    mocks.signOut.mockResolvedValue({error:{message:'network'}});
    mount(); await screen.findByText('employee:EMP001');
    fireEvent.click(screen.getByText('Logout'));
    await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());
    expect(screen.getByText('employee:EMP001')).toBeTruthy();
  });
  it('uses an origin-bound recovery redirect and validates passwords',async()=>{
    await requestRecovery(' employee@example.test ');
    expect(mocks.reset).toHaveBeenCalledWith(identity.email,{redirectTo:`${window.location.origin}/auth/recovery`});
    await expect(changePassword('short')).rejects.toThrow(/12 characters/);
    expect(mocks.update).not.toHaveBeenCalled();
    await changePassword('a strong new password');
    expect(mocks.update).toHaveBeenCalledWith({password:'a strong new password'});
  });
  it('ignores a delayed initial session result after a newer login succeeds',async()=>{
    let release:(value:object)=>void=()=>{};
    mocks.getUser.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
    mount();fireEvent.click(screen.getByText('Login'));
    await screen.findByText('employee:EMP001');
    await act(async()=>{release({data:{user:null},error:null});});
    expect(screen.getByText('employee:EMP001')).toBeTruthy();
  });
});
function mountAuthPage(path:string) {
  render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><AuthProvider><MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/forgot-password" element={<RecoveryPage />} />
    <Route path="/auth/recovery" element={<RecoveryPage complete />} />
    <Route path="/employee" element={<RequireRole role="employee" />}><Route index element={<p>Employee workspace</p>} /></Route>
    <Route path="/admin" element={<RequireRole role="admin" />}><Route index element={<p>Administrator workspace</p>} /></Route>
  </Routes></MemoryRouter></AuthProvider></QueryClientProvider>);
}
describe('authentication forms and route boundaries',()=>{
  it('validates the login fields and navigates using the verified role',async()=>{
    mocks.getUser.mockResolvedValueOnce({data:{user:null},error:null});
    mountAuthPage('/login');
    fireEvent.click(screen.getByRole('button',{name:'Enter Employee panel'}));
    await screen.findByText('Account email is required.');
    expect(mocks.signIn).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Account email'),{target:{value:identity.email}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'a real password'}});
    fireEvent.click(screen.getByRole('button',{name:'Enter Employee panel'}));
    await screen.findByText('Employee workspace');
  });
  it('shows a failed login without claiming access',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:null});mocks.signIn.mockResolvedValue({error:{message:'credentials rejected'}});
    mountAuthPage('/login');
    fireEvent.change(screen.getByLabelText('Account email'),{target:{value:identity.email}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'a real password'}});
    fireEvent.click(screen.getByRole('button',{name:'Enter Employee panel'}));
    await screen.findByText('Unable to sign in. Check your email and password.');
    expect(screen.queryByText('Employee workspace')).toBeNull();
  });
  it('denies an employee the administrator route',async()=>{
    mountAuthPage('/admin');await screen.findByText('Employee workspace');
    expect(screen.queryByText('Administrator workspace')).toBeNull();
  });
  it('redirects an unauthenticated protected route to login',async()=>{
    mocks.getUser.mockResolvedValue({data:{user:null},error:null});
    mountAuthPage('/employee');await screen.findByRole('form',{name:'Login form'});
    expect(screen.queryByText('Employee workspace')).toBeNull();
  });
  it('restores a session before deciding whether a protected route is allowed',async()=>{
    let release:(value:object)=>void=()=>{};
    mocks.getUser.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
    mountAuthPage('/employee');await screen.findByText('Restoring your session…');
    await act(async()=>{release({data:{user:identity},error:null});});
    await screen.findByText('Employee workspace');
  });
  it('requests recovery from the existing email form without promising delivery',async()=>{
    mountAuthPage('/forgot-password');
    fireEvent.change(screen.getByLabelText('Account email'),{target:{value:identity.email}});
    fireEvent.click(screen.getByRole('button',{name:'Request recovery link'}));
    await screen.findByText(/If this account can receive recovery mail/);
    expect(mocks.reset).toHaveBeenCalledWith(identity.email,expect.objectContaining({redirectTo:`${window.location.origin}/auth/recovery`}));
  });
  it('checks password confirmation and reports a successful recovery update',async()=>{
    mountAuthPage('/auth/recovery');
    fireEvent.change(screen.getByLabelText('New password'),{target:{value:'a strong new password'}});
    fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'different password'}});
    fireEvent.click(screen.getByRole('button',{name:'Save password'}));
    await screen.findByText('Passwords must match.');expect(mocks.update).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'a strong new password'}});
    fireEvent.click(screen.getByRole('button',{name:'Save password'}));
    await screen.findByText('Password updated. Sign in with your new password.');
  });
});
