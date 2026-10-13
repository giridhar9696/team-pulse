import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';

function privileged(source) {
  if (/sb_secret_[A-Za-z0-9_-]{20,}/.test(source)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(source)) return true;
  for (const token of source.matchAll(/[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g)) {
    try {if (JSON.parse(Buffer.from(token[0].split('.')[1],'base64url').toString()).role==='service_role') return true;} catch { /* Not a JWT. */ }
  }
  return false;
}
const syntheticJwt=role=>`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({role})).toString('base64url')}.${'x'.repeat(32)}`;
assert(privileged(syntheticJwt('service_role')));
assert(!privileged(syntheticJwt('anon')));
assert(privileged('sb_'+'secret_'+'a'.repeat(32)));
const files=[];
function inspect(directory) {
  for (const entry of readdirSync(directory,{withFileTypes:true})) {
    const path=join(directory,entry.name);
    if (entry.isDirectory()) inspect(path);
    else if (/\.(js|html|css|map)$/.test(entry.name)) {
      if (privileged(readFileSync(path,'utf8'))) throw new Error(`Privileged credential detected in ${path}; build must not be deployed.`);
      files.push(path);
    }
  }
}
inspect('dist');
console.log(`No privileged credentials found in ${files.length} build files.`);
