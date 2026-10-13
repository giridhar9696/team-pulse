import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const leaks=[/sb_secret_[A-Za-z0-9_-]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,/gh[pousr]_[A-Za-z0-9]{30,}/,/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/];
const findings=[];
for (const file of files) {
  if (/\.(png|jpg|ico|woff2?|pdf|zip)$/.test(file)) continue;
  const source=readFileSync(file,'utf8');
  if (leaks.some(pattern=>pattern.test(source))) findings.push(`${file}: possible secret`);
  if (/^src\/.*\.(ts|tsx)$/.test(file) && !file.endsWith('demoData.ts')) {
    if (/from\s+['"][^'"]*demoData['"]/.test(source)) findings.push(`${file}: production imports demo data`);
    if (/localStorage\s*\./.test(source)) findings.push(`${file}: authoritative browser storage requires review`);
    if (/dangerouslySetInnerHTML/.test(source)) findings.push(`${file}: unsafe rendering requires review`);
  }
}
if (findings.length) { console.error(findings.join('\n')); process.exit(1); }
console.log(`Security checks passed for ${files.length} files. Pattern checks are not a penetration test; CI also runs Gitleaks.`);
