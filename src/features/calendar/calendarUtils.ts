import { addCalendarDays } from '../../lib/validation';

export function buildCalendarDays(anchor:string,view:'month'|'week'|'day') {
  if (view==='day') return [anchor];
  const start=view==='month' ? `${anchor.slice(0,8)}01` : anchor;
  const offset=(new Date(`${start}T00:00:00Z`).getUTCDay()+6)%7;
  return Array.from({length:view==='month'?42:7},(_,index)=>addCalendarDays(start,index-offset));
}
export function moveCalendarMonth(anchor:string,direction:number) {
  const date=new Date(`${anchor.slice(0,8)}01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth()+direction);
  return date.toISOString().slice(0,10);
}
