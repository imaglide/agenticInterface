/**
 * Smoke Tests
 *
 * Basic app load tests - verifies the app starts without errors.
 */

import { test, expect } from '@playwright/test';
import { resetStorage, openCapsule, closeCapsule, getCurrentMode } from './helpers';

test.describe('Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('app loads without errors', async ({ page }) => {
    // Collect console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
        errors.push(msg.text());
      }
    });

    // Verify main content loads
    await expect(page.locator('main')).toBeVisible();

    // Verify header renders
    await expect(page.locator('text=Phase E Test')).toBeVisible();

    // No fatal errors
    expect(errors.filter(e => e.includes('Fatal') || e.includes('Uncaught'))).toHaveLength(0);
  });

  test('mode selector buttons are visible', async ({ page }) => {
    await expect(page.locator('button:has-text("Neutral / Intent")')).toBeVisible();
    await expect(page.locator('button:has-text("Meeting Prep")')).toBeVisible();
    await expect(page.locator('button:has-text("Meeting Capture")')).toBeVisible();
    await expect(page.locator('button:has-text("Post-Meeting Synthesis")')).toBeVisible();
  });

  test('decision capsule button exists and opens', async ({ page }) => {
    // Use helper which handles DevHarness blocking
    await openCapsule(page);

    // Capsule panel should be open
    await expect(page.locator('h2:has-text("Why this view?")').first()).toBeVisible();

    // Should show some content
    await expect(page.locator('text=Signals used').or(page.locator('text=Would change if')).first()).toBeVisible();
  });

  test('default mode is neutral/intent', async ({ page }) => {
    const mode = await getCurrentMode(page);
    expect(mode).toContain('neutral');
  });

  test('layout info displays', async ({ page }) => {
    await expect(page.locator('text=Layout:').first()).toBeVisible();
    await expect(page.locator('text=Confidence:').first()).toBeVisible();
  });

  test('founder test dashboard link exists', async ({ page }) => {
    const link = page.locator('a[href="/founder-test"], a:has-text("Founder Test")');
    await expect(link).toBeVisible();
  });

  test('founder test dashboard loads', async ({ page }) => {
    await page.goto('/founder-test');
    await expect(page.locator('h1:has-text("Founder Test Dashboard")')).toBeVisible();
    await expect(page.locator('text=Core Metrics')).toBeVisible();
  });

  test('no JS errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Wait for any async errors

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('React DevTools') &&
        !e.includes('favicon') &&
        !e.includes('HMR')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
