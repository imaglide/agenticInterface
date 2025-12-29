/**
 * Rules Engine Integration Tests
 *
 * Tests that the rules engine correctly selects modes based on
 * simulated calendar events from test scenarios.
 */

import { test, expect } from '@playwright/test';

test.describe('Rules Engine Integration', () => {
  test.describe('Mode Selection from Calendar Events', () => {
    test('empty-slate scenario → neutral mode', async ({ page }) => {
      await page.goto('/?scenario=empty-slate');
      await page.waitForLoadState('networkidle');

      // Wait for rules engine to evaluate
      await page.waitForTimeout(500);

      // Check that neutral mode button is selected (has blue background)
      const neutralButton = page.locator('button:has-text("Neutral / Intent")');
      await expect(neutralButton).toHaveClass(/bg-blue-600/);
    });

    test('upcoming-meeting-30min scenario → prep mode', async ({ page }) => {
      // Capture console logs
      const consoleLogs: string[] = [];
      page.on('console', msg => {
        if (msg.text().includes('[Rules') || msg.text().includes('[useRulesEngine]') || msg.text().includes('scenario')) {
          consoleLogs.push(msg.text());
        }
      });

      await page.goto('/?scenario=upcoming-meeting-30min');
      await page.waitForLoadState('networkidle');

      // Wait for rules engine to evaluate
      await page.waitForTimeout(1000);

      // Debug: log what we captured
      console.log('Console logs:', consoleLogs);

      // Check what mode we're in
      const headerText = await page.locator('.text-xs.text-gray-500').first().textContent();
      console.log('Header text:', headerText);

      // Check that prep mode button is selected
      const prepButton = page.locator('button:has-text("Meeting Prep")');
      await expect(prepButton).toHaveClass(/bg-blue-600/);
    });

    test('active-meeting scenario → capture mode', async ({ page }) => {
      await page.goto('/?scenario=active-meeting');
      await page.waitForLoadState('networkidle');

      // Wait for rules engine to evaluate
      await page.waitForTimeout(500);

      // Check that capture mode button is selected
      const captureButton = page.locator('button:has-text("Meeting Capture")');
      await expect(captureButton).toHaveClass(/bg-blue-600/);
    });

    test('post-meeting scenario → synthesis mode', async ({ page }) => {
      await page.goto('/?scenario=post-meeting');
      await page.waitForLoadState('networkidle');

      // Wait for rules engine to evaluate
      await page.waitForTimeout(500);

      // Check that synthesis mode button is selected
      const synthesisButton = page.locator('button:has-text("Post-Meeting Synthesis")');
      await expect(synthesisButton).toHaveClass(/bg-blue-600/);
    });
  });

  test.describe('Decision Capsule Reflects Context', () => {
    test('prep mode capsule shows meeting context', async ({ page }) => {
      // Use noharness to prevent Dev Harness from covering the capsule button
      await page.goto('/?scenario=upcoming-meeting-30min&noharness');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Open the decision capsule
      const capsuleButton = page.locator('button:has-text("Why this view?")');
      await capsuleButton.click();

      // Should show prep-related explanation (use .first() since there may be multiple matches)
      await expect(page.locator('text=Meeting Prep').or(page.locator('text=upcoming')).first()).toBeVisible();
    });

    test('capture mode capsule shows live meeting context', async ({ page }) => {
      // Use noharness to prevent Dev Harness from covering the capsule button
      await page.goto('/?scenario=active-meeting&noharness');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Open the decision capsule
      const capsuleButton = page.locator('button:has-text("Why this view?")');
      await capsuleButton.click();

      // Should show capture-related explanation (use .first() since there may be multiple matches)
      await expect(page.locator('text=Live Capture').or(page.locator('text=in progress')).first()).toBeVisible();
    });
  });

  test.describe('Manual Override Still Works', () => {
    test('can switch away from auto-selected mode', async ({ page }) => {
      await page.goto('/?scenario=active-meeting');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Should be in capture mode
      const captureButton = page.locator('button:has-text("Meeting Capture")');
      await expect(captureButton).toHaveClass(/bg-blue-600/);

      // Click neutral mode
      const neutralButton = page.locator('button:has-text("Neutral / Intent")');
      await neutralButton.click();

      // Should now be in neutral mode (manual override)
      await expect(neutralButton).toHaveClass(/bg-blue-600/);
      await expect(captureButton).not.toHaveClass(/bg-blue-600/);
    });
  });

  test.describe('Fallback When No Calendar Events', () => {
    test('works without calendar (manual mode)', async ({ page }) => {
      // No scenario = no simulated events = manual mode
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Header should show "Manual mode"
      await expect(page.locator('text=Manual mode')).toBeVisible();

      // Mode switching should still work
      const prepButton = page.locator('button:has-text("Meeting Prep")');
      await prepButton.click();
      await expect(prepButton).toHaveClass(/bg-blue-600/);
    });
  });
});
