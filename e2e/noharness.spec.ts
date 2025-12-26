/**
 * No-Harness Mode Tests
 *
 * Verifies app works without dev harness.
 * Tests D: No-Harness Day Sanity.
 */

import { test, expect } from '@playwright/test';
import { openCapsule, getCurrentMode } from './helpers';

test.describe('No-Harness Mode', () => {
  test.describe('D1 - Dev Harness Hidden', () => {
    test('dev harness not visible with ?noharness', async ({ page }) => {
      await page.goto('/?noharness');
      await page.waitForLoadState('networkidle');

      // Dev button should not be visible
      const devButton = page.locator('button:has-text("Dev")');
      await expect(devButton).not.toBeVisible();

      // Dev Harness panel should not be visible
      const devHarness = page.locator('text=Dev Harness');
      await expect(devHarness).not.toBeVisible();
    });

    test('no Force Mode section visible', async ({ page }) => {
      await page.goto('/?noharness');

      await expect(page.locator('text=Force Mode')).not.toBeVisible();
    });

    test('no Simulate Meeting section visible', async ({ page }) => {
      await page.goto('/?noharness');

      await expect(page.locator('text=Simulate Meeting')).not.toBeVisible();
    });

    test('no Event Log visible', async ({ page }) => {
      await page.goto('/?noharness');

      // Event Log from harness should not be visible
      const eventLog = page.locator('h3:has-text("Event Log")');
      await expect(eventLog).not.toBeVisible();
    });
  });

  test.describe('D2 - Core UX Still Works', () => {
    test('app loads without harness', async ({ page }) => {
      await page.goto('/?noharness');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('text=Agentic Interface')).toBeVisible();
    });

    test('mode selector still visible', async ({ page }) => {
      await page.goto('/?noharness');

      await expect(page.locator('button:has-text("Neutral / Intent")')).toBeVisible();
      await expect(page.locator('button:has-text("Meeting Prep")')).toBeVisible();
    });

    test('capsule can be opened', async ({ page }) => {
      await page.goto('/?noharness');

      const capsuleButton = page.locator('button:has-text("Why this view?")');
      await expect(capsuleButton).toBeVisible();

      await capsuleButton.click();
      await expect(page.locator('h2:has-text("Why this view?")').or(page.locator('h3:has-text("Why this view?")'))).toBeVisible();
    });

    test('can set intent', async ({ page }) => {
      await page.goto('/?noharness');

      // Look for intent input
      const intentInput = page.locator('input[placeholder*="focus"], input[placeholder*="intent"]');
      if (await intentInput.isVisible()) {
        await intentInput.fill('Test intent');
        await expect(intentInput).toHaveValue('Test intent');
      }
    });

    test('can switch modes via buttons', async ({ page }) => {
      await page.goto('/?noharness');

      // Click prep mode
      await page.locator('button:has-text("Meeting Prep")').click();
      await page.waitForTimeout(500);

      const mode = await getCurrentMode(page);
      expect(mode).toContain('prep');
    });

    test('can navigate to founder test dashboard', async ({ page }) => {
      await page.goto('/?noharness');

      const dashboardLink = page.locator('a[href="/founder-test"], a:has-text("Founder Test")');
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page.locator('h1:has-text("Founder Test Dashboard")')).toBeVisible();
    });
  });

  test.describe('D3 - No Harness Dependency', () => {
    test('neutral mode components render without harness', async ({ page }) => {
      await page.goto('/?noharness');

      // Check neutral mode content
      await expect(page.locator('text=What').first()).toBeVisible();
      await expect(page.locator('text=Suggestions').or(page.locator('button:has-text("Prepare")')).first()).toBeVisible();
    });

    test('can interact with suggestions', async ({ page }) => {
      await page.goto('/?noharness');

      // Click a suggestion if available
      const suggestions = page.locator('button').filter({ hasText: /Prepare|Review|Focus/i });
      if ((await suggestions.count()) > 0) {
        await suggestions.first().click();
        await page.waitForTimeout(300);
        // Should not crash
        await expect(page.locator('main')).toBeVisible();
      }
    });

    test('prep mode works without harness', async ({ page }) => {
      await page.goto('/?noharness');

      await page.locator('button:has-text("Meeting Prep")').click();
      await page.waitForTimeout(500);

      // Prep components should render - look for the My 3 Goals heading specifically
      await expect(page.locator('h3:has-text("My 3 Goals")')).toBeVisible();
    });

    test('capture mode works without harness', async ({ page }) => {
      await page.goto('/?noharness');

      await page.locator('button:has-text("Meeting Capture")').click();
      await page.waitForTimeout(500);

      // Capture layout should render
      const mode = await getCurrentMode(page);
      expect(mode).toContain('capture');
    });

    test('synthesis mode works without harness', async ({ page }) => {
      await page.goto('/?noharness');

      await page.locator('button:has-text("Post-Meeting Synthesis")').click();
      await page.waitForTimeout(500);

      const mode = await getCurrentMode(page);
      expect(mode).toContain('synthesis');
    });
  });

  test.describe('D4 - Error Handling Without Harness', () => {
    test('no console errors without harness', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
          errors.push(msg.text());
        }
      });

      await page.goto('/?noharness');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Switch through modes
      await page.locator('button:has-text("Meeting Prep")').click();
      await page.waitForTimeout(300);
      await page.locator('button:has-text("Meeting Capture")').click();
      await page.waitForTimeout(300);

      const criticalErrors = errors.filter(
        (e) => e.includes('Uncaught') || e.includes('Fatal')
      );
      expect(criticalErrors).toHaveLength(0);
    });

    test('page does not crash without harness data', async ({ page }) => {
      // Clear all storage then load without harness
      await page.goto('/');
      await page.evaluate(async () => {
        const databases = await indexedDB.databases();
        for (const db of databases) {
          if (db.name) {
            indexedDB.deleteDatabase(db.name);
          }
        }
        localStorage.clear();
      });

      await page.goto('/?noharness');
      await page.waitForLoadState('networkidle');

      // Should still render
      await expect(page.locator('main')).toBeVisible();
    });
  });
});
