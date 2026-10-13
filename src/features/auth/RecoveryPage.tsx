import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FieldShell, TextInput } from '../../components/ui/FormControls';
import { changePassword, requestRecovery } from './authService';
import { requireSupabase } from '../../lib/supabase';

export function RecoveryPage({ complete = false }: { complete?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(''); setError('');
    try {
      if (complete) {
        if (password !== confirmation) throw new Error('Passwords must match.');
        await changePassword(password);
        const {error: logoutError} = await requireSupabase().auth.signOut();
        if (logoutError) throw new Error('Password updated. Please log out and sign in again.');
        setPassword(''); setConfirmation(''); setMessage('Password updated. Sign in with your new password.');
      } else {
        await requestRecovery(email);
        setMessage('If this account can receive recovery mail, a link has been requested. Open it in this browser.');
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to complete recovery.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><form className="login-card" onSubmit={submit}>
    <h1>{complete ? 'Set your password' : 'Recover access'}</h1>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    {complete ? <>
      <FieldShell id="new-password" label="New password" hint="At least 12 characters"><TextInput id="new-password" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e=>setPassword(e.target.value)} /></FieldShell>
      <FieldShell id="confirm-password" label="Confirm password"><TextInput id="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} /></FieldShell>
    </> : <FieldShell id="recovery-email" label="Account email"><TextInput id="recovery-email" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} /></FieldShell>}
    <button className="button button--primary" disabled={busy}>{busy ? 'Working…' : complete ? 'Save password' : 'Request recovery link'}</button>
    <Link to="/login">Back to sign in</Link>
  </form></main>;
}
