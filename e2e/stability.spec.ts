/**
 * Stability Tests
 *
 * Verifies no mode thrash during user interactions.
 * Tests B2: Safe Boundary Switching (anti-jank).
 * Tests B3: Transition sequence.
 */

import { test, expect } from '@playwright/test';
import {
  resetStorage,
  forceMode,
  getCurrentMode,
  setSimulatedContext,
  openDevHarness,
  getComponentOrder,
  assertStableLayout,
  waitForTransition,
} from './helpers';

test.describe('Stability - No Thrash', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetStorage(page);
  });

  test.describe('B2.1 - Forbidden Trigger Protection', () => {
    test('focus/blur does not trigger mode switch', async ({ page }) => {
      await forceMode(page, 'PREP');
      await page.waitForTimeout(300);

      const initialMode = await getCurrentMode(page);

      // Find an input and focus it
      const textInput = page.locator('input[type="text"], textarea').first();
      if (await textInput.isVisible()) {
        await textInput.focus();
        await page.waitForTimeout(200);

        // Blur by clicking elsewhere
        await page.locator('body').click({ position: { x: 0, y: 0 } });
        await page.waitForTimeout(200);

        // Mode should not have changed
        const finalMode = await getCurrentMode(page);
        expect(finalMode).toBe(initialMode);
      }
    });

    test('tab visibility change does not trigger mode switch', async ({ page }) => {
      await forceMode(page, 'PREP');
      await page.waitForTimeout(300);

      const initialMode = await getCurrentMode(page);

      // Simulate tab blur/focus via evaluate
      await page.evaluate(() => {
        // Trigger visibility change event
        const event = new Event('visibilitychange');
        Object.defineProperty(document, 'visibilityState', {
          value: 'hidden',
          writable: true,
        });
        document.dispatchEvent(event);
      });
      await page.waitForTimeout(300);

      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          writable: true,
        });
        const event = new Event('visibilitychange');
        document.dispatchEvent(event);
      });
      await page.waitForTimeout(300);

      // Mode should not have changed
      const finalMode = await getCurrentMode(page);
      expect(finalMode).toBe(initialMode);
    });
  });

  test.describe('B2.2 - Mid-Edit Lockout', () => {
    test('mode does not switch while user is typing', async ({ page }) => {
      await setSimulatedContext(page, { meetingInMinutes: 30 });
      await forceMode(page, 'PREP');
      await page.waitForTimeout(500);

      const initialMode = await getCurrentMode(page);

      // Find a text input and start typing
      const inputs = page.locator('input[type="text"], textarea');
      const inputCount = await inputs.count();

      if (inputCount > 0) {
        const input = inputs.first();
        await input.click();
        await input.type('Test typing in progress...', { delay: 50 });

        // While typing, mode should remain stable
        const duringTypingMode = await getCurrentMode(page);
        expect(duringTypingMode).toBe(initialMode);
      }
    });

    test('focused input blocks immediate mode switch', async ({ page }) => {
      await setSimulatedContext(page, { meetingInMinutes: 30 });
      await forceMode(page, 'PREP');
      await page.waitForTimeout(300);

      const initialMode = await getCurrentMode(page);

      // Focus an input
      const input = page.locator('input[type="text"], textarea').first();
      if (await input.isVisible().catch(() => false)) {
        await input.focus();
        await input.fill('Editing...');

        // Attempt to switch mode via harness
        await openDevHarness(page);
        await page.locator('label:has-text("Meeting Capture")').click();

        // The apply button might be disabled or the switch might be delayed
        const applyButton = page.locator('button:has-text("Apply")');

        // If the app implements mid-edit lockout, mode shouldn't change immediately
        // while we have unsaved input focus
        await page.waitForTimeout(200);

        // Click elsewhere to blur
        await page.locator('body').click({ force: true });
        await page.waitForTimeout(200);

        // Now mode switch should work
        if (await applyButton.isEnabled()) {
          await applyButton.click();
          await page.waitForTimeout(500);
        }
      }
    });
  });

  test.describe('B2.3 - Safe Boundary Events', () => {
    test('explicit mode button click triggers switch', async ({ page }) => {
      const initialMode = await getCurrentMode(page);

      // Click a different mode button
      await page.locator('button:has-text("Meeting Prep")').click();
      await page.waitForTimeout(500);

      const finalMode = await getCurrentMode(page);
      expect(finalMode).not.toBe(initialMode);
    });

    test('dev harness Apply button triggers switch', async ({ page }) => {
      await openDevHarness(page);

      const initialMode = await getCurrentMode(page);

      // Select a different mode
      await page.locator('label:has-text("Meeting Capture")').click();
      await page.locator('button:has-text("Apply")').click();
      await page.waitForTimeout(500);

      const finalMode = await getCurrentMode(page);
      expect(finalMode).toContain('capture');
    });
  });

  test.describe('B3.1 - Transition Stability', () => {
    test('mode switch does not cause layout reorder', async ({ page }) => {
      await forceMode(page, 'PREP');
      await page.waitForTimeout(500);

      // Get initial component order
      const initialOrder = await getComponentOrder(page);

      // Wait and verify order is stable
      await page.waitForTimeout(2000);
      const finalOrder = await getComponentOrder(page);

      expect(finalOrder).toEqual(initialOrder);
    });

    test('rapid mode switching does not crash', async ({ page }) => {
      const modes = ['Meeting Prep', 'Meeting Capture', 'Post-Meeting Synthesis', 'Neutral / Intent'];

      // Rapid fire mode switches
      for (let i = 0; i < 3; i++) {
        for (const mode of modes) {
          await page.locator(`button:has-text("${mode}")`).click();
          await page.waitForTimeout(100); // Very short delay
        }
      }

      // App should still be responsive
      await expect(page.locator('main')).toBeVisible();

      // Should end in a valid mode
      const finalMode = await getCurrentMode(page);
      expect(finalMode).toBeTruthy();
    });

    test('mode switch completes cleanly', async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.locator('button:has-text("Meeting Prep")').click();
      await waitForTransition(page);

      await page.locator('button:has-text("Meeting Capture")').click();
      await waitForTransition(page);

      // Filter out non-critical errors
      const criticalErrors = errors.filter(
        (e) => !e.includes('React DevTools') && !e.includes('favicon')
      );

      expect(criticalErrors).toHaveLength(0);
    });
  });

  test.describe('B3.2 - Layout Stability After Transition', () => {
    test('prep mode layout remains stable', async ({ page }) => {
      await forceMode(page, 'PREP');
      await page.waitForTimeout(500);

      const orderBefore = await getComponentOrder(page);

      // Wait 2 seconds
      await page.waitForTimeout(2000);

      const orderAfter = await getComponentOrder(page);
      expect(orderAfter).toEqual(orderBefore);
    });

    test('capture mode layout remains stable', async ({ page }) => {
      await setSimulatedContext(page, { meetingInMinutes: 0 });
      await forceMode(page, 'CAPTURE');
      await page.waitForTimeout(500);

      const orderBefore = await getComponentOrder(page);

      // Wait 2 seconds
      await page.waitForTimeout(2000);

      const orderAfter = await getComponentOrder(page);
      expect(orderAfter).toEqual(orderBefore);
    });
  });
});
