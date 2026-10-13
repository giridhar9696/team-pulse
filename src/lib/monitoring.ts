import type { Event } from '@sentry/react';
import { init, captureException } from '@sentry/react';

export function sanitizeMonitoringEvent<T extends Event>(event:T):T {
  delete event.user;delete event.request;delete event.breadcrumbs;delete event.extra;delete event.contexts;
  if (event.exception?.values) for (const value of event.exception.values) {
    value.value='Unhandled application error';
    if (value.stacktrace?.frames) for (const frame of value.stacktrace.frames) delete frame.vars;
  }
  return event;
}
let configured=false;
export function initializeMonitoring() {
  const dsn=import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || configured) return;
  init({dsn,environment:import.meta.env.VITE_APP_ENV??'development',tracesSampleRate:0,
      dataCollection:{userInfo:false,cookies:false,httpHeaders:false,httpBodies:[],urlQueryParams:false,databaseQueryData:false,stackFrameVariables:false,frameContextLines:0,graphQL:{document:false,variables:false},genAI:{inputs:false,outputs:false},queues:false},
      beforeSend:sanitizeMonitoringEvent,
  });
  configured=true;
}
export function reportUnexpectedError(error:Error) {
  if (configured) captureException(error);
}
