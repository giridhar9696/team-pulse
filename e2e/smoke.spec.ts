import { test, expect } from '@playwright/test';

test('unconfigured deployment fails closed with accessible login and no demo credentials',async({page})=>{
  await page.goto('/login');
  await expect(page.getByRole('form',{name:'Login form'})).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('not configured');
  await expect(page.getByRole('button',{name:'Enter Employee panel'})).toBeDisabled();
  await expect(page.getByLabel('Account email')).toHaveValue('');
  await expect(page.getByText('Quick fill Admin')).toHaveCount(0);
  await page.getByRole('tab',{name:'Admin',exact:true}).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab',{name:'Employee',exact:true})).toBeFocused();
  await page.getByRole('button',{name:'Show password'}).click();
  await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
});
test('forged prototype administrator state cannot open a protected route',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('team-pulse-demo-user',JSON.stringify({role:'admin',name:'Forged',identifier:'attacker'})));
  await page.goto('/admin/employees');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading',{name:'Engineering Directory'})).toHaveCount(0);
});
test('recovery has keyboard-accessible fields and reports configuration failure',async({page})=>{
  await page.goto('/login');
  await page.getByRole('link',{name:'Forgot password?'}).click();
  await expect(page.getByRole('heading',{name:'Recover access'})).toBeVisible();
  await page.getByLabel('Account email').fill('employee@example.test');
  await page.getByRole('button',{name:'Request recovery link'}).click();
  await expect(page.getByRole('alert')).toContainText('not configured');
  await expect(page.getByRole('status')).toHaveCount(0);
});
