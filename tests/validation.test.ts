import { describe, expect, it } from 'vitest';
import { addCalendarDays, csvEscape, employeeInput, isoDate, submissionInput, todayDate, organizationDate } from '../src/lib/validation';
import { publicConfigurationError } from '../src/lib/publicConfiguration';
import { sanitizeMonitoringEvent } from '../src/lib/monitoring';

describe('trust boundary validation',()=>{
  it('rejects privileged frontend keys and unsafe deployment URLs',()=>{
    const jwt=(role:string)=>`e30.${btoa(JSON.stringify({role}))}.signature`;
    expect(publicConfigurationError('https://example.supabase.co',jwt('service_role'),true)).toBeTruthy();
    expect(publicConfigurationError('https://example.supabase.co','sb_secret_invalid',true)).toBeTruthy();
    expect(publicConfigurationError('http://example.test','sb_publishable_test',true)).toBeTruthy();
    expect(publicConfigurationError('http://127.0.0.1:54321','sb_publishable_test',false)).toBeNull();
    expect(publicConfigurationError('https://example.supabase.co',jwt('anon'),true)).toBeNull();
    expect(publicConfigurationError('not a url','sb_publishable_test',true)).toBeTruthy();
  });
  it('removes private event details while retaining stack locations for diagnosis',()=>{
    const event=sanitizeMonitoringEvent({user:{email:'private@example.test'},request:{data:'password'},extra:{token:'secret'},breadcrumbs:[{message:'private note'}],exception:{values:[{value:'private task detail',stacktrace:{frames:[{filename:'app.js',lineno:42,vars:{password:'secret'}}]}}]}});
    expect(event.user).toBeUndefined();expect(event.request).toBeUndefined();expect(event.extra).toBeUndefined();expect(event.breadcrumbs).toBeUndefined();
    expect(event.exception?.values?.[0].value).toBe('Unhandled application error');
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0]).toEqual({filename:'app.js',lineno:42});
  });
  it('rejects normalized but nonexistent dates and handles leap dates',()=>{
    expect(isoDate.safeParse('2026-02-31').success).toBe(false);
    expect(isoDate.safeParse('2024-02-29').success).toBe(true);
    expect(addCalendarDays('2026-12-31',1)).toBe('2027-01-01');
    expect(todayDate(new Date(2026,9,13,23,59))).toBe('2026-10-13');
  });
  it('uses the organization date at UTC/local deadline boundaries and preserves date-only values',()=>{
    expect(organizationDate('2026-10-13T19:00:00Z','Asia/Kolkata')).toBe('2026-10-14');
    expect(organizationDate('2026-10-13','America/Los_Angeles')).toBe('2026-10-13');
  });
  it('rejects executable submission links and empty notes',()=>{
    for (const url of ['javascript:alert(1)','data:text/html,test','file:///private','not a URL']) expect(submissionInput.safeParse({url,note:'Done'}).success).toBe(false);
    expect(submissionInput.safeParse({url:'https://example.test/work',note:'Done'}).success).toBe(true);
    expect(submissionInput.safeParse({url:'https://example.test',note:'   '}).success).toBe(false);
  });
  it('neutralizes spreadsheet formulas, quotes and multiline CSV',()=>{
    expect(csvEscape('=HYPERLINK("https://example.test")')).toBe('"\'=HYPERLINK(""https://example.test"")"');
    expect(csvEscape(' @SUM(1)')).toBe("' @SUM(1)");
    expect(csvEscape('hello, "team"')).toBe('"hello, ""team"""');
    expect(csvEscape(42)).toBe('42');
  });
  it('validates employee identifiers, email and performance ranges',()=>{
    const valid={id:'EMP001',name:'Employee',email:'employee@example.test',role:'Engineer',status:'active',velocity:0};
    expect(employeeInput.safeParse(valid).success).toBe(true);
    expect(employeeInput.safeParse({...valid,email:'invalid'}).success).toBe(false);
    expect(employeeInput.safeParse({...valid,velocity:101}).success).toBe(false);
    expect(employeeInput.safeParse({...valid,id:'<script>'}).success).toBe(false);
  });
});
