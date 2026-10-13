// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Tabs } from '../src/components/ui/Tabs';
import { AppErrorBoundary, RouteErrorPage } from '../src/components/ui/AppErrorBoundary';

afterEach(cleanup);
function RoleTabs() {
  const [value,setValue]=useState('employee');
  return <Tabs label="Login role" value={value} onChange={setValue} items={[{value:'employee',label:'Employee'},{value:'admin',label:'Admin'}]} />;
}
describe('accessible controls and safe errors',()=>{
  it('moves tab selection and keyboard focus with arrow, Home and End keys',()=>{
    render(<RoleTabs />);
    const employee=screen.getByRole('tab',{name:'Employee'}),admin=screen.getByRole('tab',{name:'Admin'});
    employee.focus();fireEvent.keyDown(employee,{key:'ArrowRight'});
    expect(document.activeElement).toBe(admin);expect(admin.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(admin,{key:'Home'});expect(document.activeElement).toBe(employee);
    fireEvent.keyDown(employee,{key:'End'});expect(document.activeElement).toBe(admin);
    fireEvent.keyDown(admin,{key:'ArrowLeft'});expect(document.activeElement).toBe(employee);
  });
  it('renders a safe component failure instead of exposing internal diagnostics',()=>{
    const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    function Broken():never {throw new Error('Internal database diagnostic');}
    try {
      render(<AppErrorBoundary><Broken /></AppErrorBoundary>);
      expect(screen.getByRole('heading',{name:'Unable to display this page'})).toBeTruthy();
      expect(screen.queryByText('Internal database diagnostic')).toBeNull();
      expect(screen.getByRole('button',{name:'Reload'})).toBeTruthy();
    } finally {log.mockRestore();}
  });
  it('hides route-loader diagnostics and offers a safe sign-in destination',async()=>{
    const router=createMemoryRouter([{path:'/broken',loader:()=>{throw new Error('Internal database diagnostic');},errorElement:<RouteErrorPage />}],{initialEntries:['/broken']});
    render(<RouterProvider router={router} />);
    await screen.findByRole('heading',{name:'Unable to display this page'});
    expect(screen.queryByText('Internal database diagnostic')).toBeNull();
    expect(screen.getByRole('link',{name:'Return to sign in'}).getAttribute('href')).toBe('/login');
  });
});
