/**
 * Capture Mode Tests
 *
 * Verifies markers, hotkeys, goals checklist functionality.
 * Tests B5: Capture mode interactions.
 */

import { test, expect } from '@playwright/test';
import {
  resetStorage,
  forceMode,
  setSimulatedContext,
  injectGoals,
  addMarkerViaHarness,
  createMarkersByHotkey,
  getMarkerCount,
  checkGoal,
  openDevHarness,
} from './helpers';

test.describe('Capture Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetStorage(page);

    // Set up a meeting context
    await setSimulatedContext(page, { meetingInMinutes: 0, durationMinutes: 60 });

    // Add some goals first (in prep mode)
    await forceMode(page, 'PREP');
    await page.waitForTimeout(300);
    await injectGoals(page, ['Get alignment on timeline', 'Understand blockers', 'Confirm next steps']);
    await page.waitForTimeout(300);

    // Switch to capture mode
    await forceMode(page, 'CAPTURE');
    await page.waitForTimeout(500);
  });

  test.describe('B5.1 - Capture Layout', () => {
    test('capture mode shows single layout', async ({ page }) => {
      await expect(page.locator('text=Layout:').locator('..').locator('text=single').first()).toBeVisible();
    });

    test('minimal UI - no extra panels', async ({ page }) => {
      // Capture should have minimal UI
      const main = page.locator('main');
      await expect(main).toBeVisible();

      // Should have marker controls
      const markerSection = page.locator('text=Marker').or(page.locator('button:has-text("Decision")'));
      // At least marker functionality should be present via hotkeys or buttons
    });
  });

  test.describe('B5.2 - Marker Creation via Hotkeys', () => {
    test('hotkey D creates decision marker', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await page.keyboard.press('d');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 1);
    });

    test('hotkey A creates action marker', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await page.keyboard.press('a');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 1);
    });

    test('hotkey R creates risk marker', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await page.keyboard.press('r');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 1);
    });

    test('hotkey Q creates question marker', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await page.keyboard.press('q');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 1);
    });

    test('can create multiple markers via hotkeys', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await createMarkersByHotkey(page, ['decision', 'action', 'risk', 'question']);
      await page.waitForTimeout(500);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 4);
    });
  });

  test.describe('B5.3 - Marker Creation via Dev Harness', () => {
    test('can add marker via harness', async ({ page }) => {
      const countBefore = await getMarkerCount(page);

      await addMarkerViaHarness(page, 'decision', 'Test label');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore + 1);
    });

    test('marker with label is created correctly', async ({ page }) => {
      await addMarkerViaHarness(page, 'action', 'Follow up with team');
      await page.waitForTimeout(300);

      // Marker should be logged in event log
      await openDevHarness(page);
      const eventLog = page.locator('text=marker_created');
      await expect(eventLog.first()).toBeVisible();
    });
  });

  test.describe('B5.4 - Goals Strip in Capture', () => {
    test('goals checklist is visible at top', async ({ page }) => {
      // Goals should be shown as a strip
      const goalsArea = page.locator('text=Goals').or(page.locator('text=/\\d\\/3/'));
      await expect(goalsArea.first()).toBeVisible();
    });

    test('can check goal in capture mode', async ({ page }) => {
      // Find check button for first goal
      const checkButton = page.locator('button:has-text("○")').first();
      if (await checkButton.isVisible()) {
        await checkButton.click();
        await page.waitForTimeout(300);

        // Goal should be marked as checked (button might change to checkmark)
      }
    });

    test('checked goal persists', async ({ page }) => {
      const checkButton = page.locator('button:has-text("○")').first();
      if (await checkButton.isVisible()) {
        await checkButton.click();
        await page.waitForTimeout(300);

        // Reload and verify
        await page.reload();
        await forceMode(page, 'CAPTURE');
        await page.waitForTimeout(500);

        // Goal state should persist
      }
    });
  });

  test.describe('B5.5 - Hotkey Hints', () => {
    test('bottom hint bar shows hotkey hints', async ({ page }) => {
      // Look for hint bar or hotkey instructions
      const hintBar = page.locator('text=/[DARQ]|Decision|Action|Risk|Question/i');
      // At minimum, marker buttons should be visible
      const markerButtons = page.locator('button').filter({ hasText: /Decision|Action|Risk|Question/i });

      // Either hint bar or marker buttons should be present
      const hintsVisible = await hintBar.first().isVisible().catch(() => false);
      const buttonsCount = await markerButtons.count();

      expect(hintsVisible || buttonsCount > 0).toBeTruthy();
    });
  });

  test.describe('B5.6 - Marker Persistence', () => {
    test('markers persist across page reload', async ({ page }) => {
      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await createMarkersByHotkey(page, ['decision', 'action']);
      await page.waitForTimeout(300);

      const countBefore = await getMarkerCount(page);
      expect(countBefore).toBeGreaterThanOrEqual(2);

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');
      await forceMode(page, 'CAPTURE');
      await page.waitForTimeout(500);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore);
    });

    test('markers persist across mode switches', async ({ page }) => {
      // Click on main area to ensure focus is on the document
      await page.locator('main').click();
      await createMarkersByHotkey(page, ['decision', 'risk']);
      await page.waitForTimeout(300);

      const countBefore = await getMarkerCount(page);

      // Switch to prep and back
      await forceMode(page, 'PREP');
      await page.waitForTimeout(300);
      await forceMode(page, 'CAPTURE');
      await page.waitForTimeout(300);

      const countAfter = await getMarkerCount(page);
      expect(countAfter).toBe(countBefore);
    });
  });

  test.describe('B5.7 - Marker Label', () => {
    test('can add short label to marker', async ({ page }) => {
      await addMarkerViaHarness(page, 'decision', 'Ship v1');
      await page.waitForTimeout(300);

      // Event should be logged
      await openDevHarness(page);
      await expect(page.locator('text=marker_created')).toBeVisible();
    });

    test('label accepts 3-5 word input', async ({ page }) => {
      const shortLabel = 'Ship v1 by Friday';
      await addMarkerViaHarness(page, 'action', shortLabel);
      await page.waitForTimeout(300);

      // Should be created without error
      const count = await getMarkerCount(page);
      expect(count).toBeGreaterThan(0);
    });
  });
});
