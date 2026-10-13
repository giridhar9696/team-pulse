import { z } from 'zod';

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>{
  const date=new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10)===value;
},'Use a valid calendar date.');
export const submissionInput = z.object({url:z.string().max(2048).url().refine(value=>URL.canParse(value)&&['http:','https:'].includes(new URL(value).protocol),'Use an HTTP or HTTPS URL.'),note:z.string().trim().min(1).max(10000)});
export const employeeInput = z.object({id:z.string().trim().regex(/^[A-Z0-9_-]{1,40}$/),name:z.string().trim().min(1).max(200),email:z.email(),role:z.string().trim().min(1).max(200),status:z.enum(['active','inactive','frozen']),velocity:z.number().int().min(0).max(100)});
export function todayDate(date=new Date()) {
  const year=date.getFullYear();
  return `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function organizationDate(value:string,timeZone:string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date=new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0,10);
  const parts=new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type)?.value).join('-');
}
export function addCalendarDays(date:string,days:number) {
  const next=new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate()+days);
  return next.toISOString().slice(0,10);
}
export function csvEscape(value:string|number) {
  const raw=String(value);
  const text=/^[\s]*[=+@-]/.test(raw)||/^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text;
}
