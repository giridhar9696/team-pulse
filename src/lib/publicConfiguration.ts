export function publicConfigurationError(url:unknown,key:unknown,production:boolean) {
  if (typeof url!=='string'||!url||typeof key!=='string'||!key) return 'Team Pulse is not configured. Ask your administrator to configure the authentication service.';
  try {
    const parsed=new URL(url);
    if (parsed.protocol!=='https:' && !(parsed.protocol==='http:' && !production && ['localhost','127.0.0.1'].includes(parsed.hostname))) return 'Invalid public authentication configuration.';
    if (parsed.username||parsed.password) return 'Invalid public authentication configuration.';
    if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return null;
    const parts=key.split('.');
    if (parts.length===3 && JSON.parse(atob(parts[1].replaceAll('-','+').replaceAll('_','/'))).role==='anon') return null;
  } catch { return 'Invalid public authentication configuration.'; }
  return 'Invalid public authentication configuration.';
}
