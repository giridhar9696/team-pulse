import { useMemo } from 'react';
import { useProjects } from '../admin/projectContext';

export function useDateFormat() {
  const {settings,timeZone}=useProjects();
  return useMemo(()=>{
    if (settings.dateFormat==='iso') return (value:string)=>value;
    const dateOnly=new Intl.DateTimeFormat('en',{timeZone:'UTC',year:'numeric',month:'short',day:'numeric'});
    const timestamp=new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
    return (value:string)=>{
      const plain=/^\d{4}-\d{2}-\d{2}$/.test(value);
      const date=new Date(plain ? `${value}T00:00:00Z` : value);
      return Number.isNaN(date.getTime()) ? value : (plain ? dateOnly : timestamp).format(date);
    };
  },[settings.dateFormat,timeZone]);
}
