import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'badr.eddine.boudhim@smartpresence.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'Luno.xar.95';

async function loginAsAdmin(page: import('@playwright/test').Page) {
  await page.goto('/auth/login');
  await expect(page.getByRole('heading', { name: /smart presence ai/i })).toBeVisible();

  await page.getByLabel(/adresse e-mail/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/mot de passe/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /se connecter/i }).click();

  // Auth bootstrap can redirect; wait for a dashboard-ish page.
  await page.waitForURL(/\/(admin|trainer|student)/, { timeout: 30_000 });
}

test.describe('Admin pages (real backend)', () => {
  test('admin routes render without runtime errors', async ({ page }) => {
    const pageErrors: Error[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err));
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await loginAsAdmin(page);

    // Visit key admin pages.
    const routes = ['/admin', '/admin/students', '/admin/trainers', '/admin/sessions', '/admin/analytics'];
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('text=Unhandled Runtime Error')).toHaveCount(0);
    }

    expect(pageErrors, `pageerror events: ${pageErrors.map((e) => e.message).join('\n')}`).toEqual([]);

    // Filter out known-noise console errors if needed; for now, keep strict.
    expect(consoleErrors, `console.error output:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
