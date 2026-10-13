import { Component, useEffect, type ReactNode } from 'react';
import { Link, useRouteError } from 'react-router-dom';
import { reportUnexpectedError } from '../../lib/monitoring';

export class AppErrorBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError() { return {failed:true}; }
  componentDidCatch(error:Error) {reportUnexpectedError(error);}
  render() {
    if (this.state.failed) return <main className="page-shell"><h1>Unable to display this page</h1><p role="alert">Reload the page to try again. Unsaved form changes may need to be entered again.</p><button className="button button--primary" onClick={()=>window.location.reload()}>Reload</button></main>;
    return this.props.children;
  }
}
export function RouteErrorPage() {
  const error=useRouteError();
  useEffect(()=>{reportUnexpectedError(error instanceof Error ? error : new Error('Route unavailable'));},[error]);
  return <main className="page-shell"><h1>Unable to display this page</h1><p role="alert">Reload to retry, or return to sign in.</p><Link to="/login">Return to sign in</Link></main>;
}
