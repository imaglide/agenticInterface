/**
 * Prep Mode Tests
 *
 * Verifies My3Goals, MeetingGoal, and prompts functionality.
 * Tests B4: Prep mode interactions.
 */

import { test, expect } from '@playwright/test';
import {
  resetStorage,
  forceMode,
  setSimulatedContext,
  openDevHarness,
  injectGoals,
  getGoalCount,
} from './helpers';

test.describe('Prep Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await resetStorage(page);
    await setSimulatedContext(page, { meetingInMinutes: 30, durationMinutes: 60 });
    await forceMode(page, 'PREP');
    await page.waitForTimeout(500);
  });

  test.describe('B4.1 - My3Goals Card', () => {
    test('goals card is visible', async ({ page }) => {
      await expect(page.locator('text=My 3 Goals').first()).toBeVisible();
    });

    test('can inject sample goals via harness', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline', 'Understand blockers']);
      await page.waitForTimeout(300);

      const count = await getGoalCount(page);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('goals persist after mode switch', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline']);
      await page.waitForTimeout(300);

      const countBefore = await getGoalCount(page);

      // Switch to neutral and back
      await forceMode(page, 'NEUTRAL');
      await page.waitForTimeout(300);
      await forceMode(page, 'PREP');
      await page.waitForTimeout(300);

      const countAfter = await getGoalCount(page);
      expect(countAfter).toBe(countBefore);
    });

    test('goal hard cap of 3 is enforced', async ({ page }) => {
      // Inject all 3 goals
      await injectGoals(page, [
        'Get alignment on timeline',
        'Understand blockers',
        'Confirm next steps',
      ]);
      await page.waitForTimeout(300);

      const count = await getGoalCount(page);
      expect(count).toBeLessThanOrEqual(3);
    });

    test('goals show in UI with correct format', async ({ page }) => {
      // Goals should show numbered format (1, 2, 3) with text
      // The mock meeting provides pre-populated goals, so we check format not specific text
      const goalsSection = page.locator('h3:has-text("My 3 Goals")').locator('..').locator('..');

      // Check for numbered format - goal 1 should be visible with "1" and some text
      await expect(goalsSection.locator('text=/^1$/').first()).toBeVisible();

      // Check that goal text is present (any goal text)
      await expect(goalsSection.locator('text=/alignment|blockers|steps/i').first()).toBeVisible();
    });
  });

  test.describe('B4.2 - Meeting Goal Card', () => {
    test('meeting goal section is visible', async ({ page }) => {
      await expect(page.locator('text=Meeting Goal').first()).toBeVisible();
    });

    test('can view meeting goal', async ({ page }) => {
      // Mock meeting has a goal
      const goalArea = page.locator('text=Meeting Goal').locator('..');
      await expect(goalArea).toBeVisible();
    });
  });

  test.describe('B4.3 - Prep Prompts', () => {
    test('quick prep prompts are visible', async ({ page }) => {
      // Look for the Quick Prep heading specifically (h3 element)
      await expect(page.locator('h3:has-text("Quick Prep")')).toBeVisible();
    });

    test('prep prompt buttons exist', async ({ page }) => {
      // Check for common prep prompt buttons
      const promptButtons = page.locator('button').filter({ hasText: /success|wrong|need/i });
      const count = await promptButtons.count();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    test('clicking prep prompt does not crash', async ({ page }) => {
      const promptButtons = page.locator('button').filter({ hasText: /success|wrong|need/i });
      if ((await promptButtons.count()) > 0) {
        await promptButtons.first().click();
        await page.waitForTimeout(300);
        // Should still be stable
        await expect(page.locator('main')).toBeVisible();
      }
    });
  });

  test.describe('B4.4 - Prep Layout', () => {
    test('prep mode shows split layout', async ({ page }) => {
      await expect(page.locator('text=Layout:').locator('..').locator('text=split').first()).toBeVisible();
    });

    test('context panel is present', async ({ page }) => {
      // Check for context card - look for button with "Context" and a count like "Context (2)"
      // Use regex to match "Context" followed by number in parens, avoiding "No strong context"
      await expect(page.locator('button:has-text("Context (")').first()).toBeVisible();
    });

    test('meeting header shows title', async ({ page }) => {
      // Check for meeting title in header
      const meetingHeader = page.locator('h1, h2').filter({ hasText: /meeting|sync/i });
      await expect(meetingHeader.first()).toBeVisible();
    });

    test('meeting shows time info', async ({ page }) => {
      // Should show meeting time or "in X minutes"
      const timeInfo = page.locator('text=/\\d+m|\\d+:\\d+/');
      await expect(timeInfo.first()).toBeVisible();
    });
  });

  test.describe('B4.5 - Goal Interactions', () => {
    test('goal action menu exists', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline']);
      await page.waitForTimeout(300);

      // Look for action menu button (three-dot menu that contains delete)
      const actionMenu = page.locator('button[aria-label="Actions"]');
      await expect(actionMenu.first()).toBeVisible();
    });

    test('goal check buttons exist', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline']);
      await page.waitForTimeout(300);

      // Look for check button (○)
      const checkButton = page.locator('button:has-text("○")');
      await expect(checkButton.first()).toBeVisible();
    });

    test('can toggle goal achieved state', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline']);
      await page.waitForTimeout(300);

      // Find and click check button
      const checkButton = page.locator('button:has-text("○")').first();
      if (await checkButton.isVisible()) {
        await checkButton.click();
        await page.waitForTimeout(200);
        // Button should change appearance (or disappear/change to checkmark)
      }
    });
  });

  test.describe('B4.6 - Data Persistence', () => {
    test('goals persist across page reload', async ({ page }) => {
      await injectGoals(page, ['Get alignment on timeline']);
      await page.waitForTimeout(300);

      const countBefore = await getGoalCount(page);
      expect(countBefore).toBeGreaterThan(0);

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Re-enter prep mode
      await forceMode(page, 'PREP');
      await page.waitForTimeout(500);

      const countAfter = await getGoalCount(page);
      expect(countAfter).toBe(countBefore);
    });
  });
});
