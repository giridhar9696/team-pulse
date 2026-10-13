import { requireSupabase } from '../../lib/supabase';

export type UserRole = 'admin' | 'employee';
export type AppUser = { id: string; organizationId: string; role: UserRole; name: string; identifier: string; email: string };
export type LoginPayload = { role: UserRole; identifier: string; password: string };
export async function resolveUser(): Promise<AppUser | null> {
  const client = requireSupabase();
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: member, error: membershipError } = await client.from('memberships')
    .select('id,organization_id,name,email,role,status').eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (membershipError) throw new Error('Unable to verify organization access. Please retry.');
  if (!member || !['admin','employee'].includes(member.role)) {
    const {error:signOutError}=await client.auth.signOut({scope:'local'});
    if (signOutError) throw new Error('Organization access denied. Please sign out again.');
    return null;
  }
  return { id: user.id, organizationId: member.organization_id, role: member.role, name: member.name, identifier: member.id, email: user.email ?? member.email };
}
export async function requestRecovery(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/auth/recovery` });
  if (error) throw new Error('Unable to request recovery. Please try again later.');
}
export async function changePassword(password: string) {
  if (password.length < 12) throw new Error('Use at least 12 characters.');
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw new Error('Unable to update your password. Request a new recovery link or try again.');
}
