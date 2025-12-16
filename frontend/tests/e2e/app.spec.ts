import { test, expect } from '@playwright/test';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

test.describe('Authentication Flow', () => {
  test('should login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Fill login form
    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForURL(/\/(admin|trainer|student)/, { timeout: 5000 });

    // Verify user is logged in (check for navbar)
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('text=Smart Presence AI')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Check for error message
    await expect(page.locator('text=/erreur/i')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin|trainer|student)/);

    // Click logout button
    await page.click('button:has-text("Déconnexion")');

    // Should redirect to login
    await page.waitForURL(/\/auth\/login/);
    await expect(page.locator('text=Se connecter')).toBeVisible();
  });
});

test.describe('Trainer - Attendance Marking', () => {
  test.beforeEach(async ({ page }) => {
    // Login as trainer
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);
  });

  test('should mark student as absent with dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/trainer/mark-attendance`);

    // Wait for sessions to load
    await page.waitForSelector('text=/séance/i', { timeout: 5000 });

    // Select first session (if available)
    const sessionButton = page.locator('button:has-text("Session")').first();
    if (await sessionButton.isVisible()) {
      await sessionButton.click();
    }

    // Choose marking method
    await page.click('button:has-text("QR Code")');

    // Click absent button for first student
    const absentButton = page.locator('button:has-text("Absent")').first();
    await absentButton.click();

    // Dialog should open
    await expect(page.locator('dialog, [role="dialog"]')).toBeVisible();

    // Fill justification
    await page.fill('textarea', 'Malade');
    await page.fill('input[type="number"]', '0');

    // Submit
    await page.click('button:has-text("Confirmer")');

    // Dialog should close
    await expect(page.locator('dialog, [role="dialog"]')).not.toBeVisible();
  });

  test('should search for students', async ({ page }) => {
    await page.goto(`${BASE_URL}/trainer/mark-attendance`);

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Type in search box
    const searchInput = page.locator('input[placeholder*="Rechercher"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('John');

      // Results should filter
      await expect(page.locator('text=John')).toBeVisible();
    }
  });
});

test.describe('Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);
  });

  test('should display notification bell', async ({ page }) => {
    // Notification bell should be visible in navbar
    const bellIcon = page
      .locator('[aria-label*="notification"]')
      .or(page.locator('svg.lucide-bell'));
    await expect(bellIcon).toBeVisible();
  });

  test('should open notification dropdown', async ({ page }) => {
    // Click notification bell
    const bellButton = page.locator('button:has(svg.lucide-bell)');
    await bellButton.click();

    // Dropdown should open
    await expect(page.locator('text=/notifications/i')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should show mobile menu', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);

    // Mobile menu button should be visible
    const menuButton = page.locator('[aria-label="Ouvrir le menu"]');
    await expect(menuButton).toBeVisible();

    // Click to open
    await menuButton.click();

    // Menu items should be visible
    const menuItemCount = await page.locator('role=menuitem').count();
    expect(menuItemCount).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test('should have proper ARIA labels on key elements', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Check for accessible labels
    await expect(page.locator('input[type="email"]')).toHaveAttribute('aria-label', /.+/i);

    await page.fill('input[type="email"]', 'badr.boudhim@istanitic.ma');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);

    // Navigation should have proper role
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/login`);

    // Tab through form fields
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="password"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });
});
