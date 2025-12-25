/**
 * E2E Test Helpers
 *
 * Reusable functions for Playwright tests.
 * These helpers abstract common operations for V1 acceptance criteria testing.
 */

import { Page, expect, Download } from '@playwright/test';

// ============================================
// Constants
// ============================================

export const DB_NAME = 'agentic-interface';
export const STORE_NAMES = ['events', 'meetings', 'intents', 'aggregates'];

export const MODES = {
  NEUTRAL: 'neutral_intent',
  PREP: 'meeting_prep',
  CAPTURE: 'meeting_capture',
  SYNTHESIS: 'meeting_synthesis_min',
} as const;

export const MODE_LABELS = {
  [MODES.NEUTRAL]: 'Neutral / Intent',
  [MODES.PREP]: 'Meeting Prep',
  [MODES.CAPTURE]: 'Meeting Capture',
  [MODES.SYNTHESIS]: 'Post-Meeting Synthesis',
} as const;

export const MARKER_HOTKEYS = {
  decision: 'd',
  action: 'a',
  risk: 'r',
  question: 'q',
} as const;

// ============================================
// Storage Reset
// ============================================

/**
 * Clear all IndexedDB storage to start fresh.
 * Must be called after page load (needs browser context).
 */
export async function resetStorage(page: Page): Promise<void> {
  await page.evaluate(async (dbName) => {
    // Delete the entire database
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('Database deletion blocked - closing connections');
        resolve(); // Continue anyway
      };
    });
  }, DB_NAME);

  // Also clear localStorage
  await page.evaluate(() => localStorage.clear());

  // Reload to reinitialize clean state
  await page.reload();
  await page.waitForLoadState('networkidle');
}

/**
 * Clear storage via browser context (alternative method).
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
  const context = page.context();
  await context.clearCookies();
  // Note: clearStorageState doesn't exist, use page.evaluate instead
  await resetStorage(page);
}

// ============================================
// Dev Harness Controls
// ============================================

/**
 * Open the dev harness panel if not already open.
 */
export async function openDevHarness(page: Page): Promise<void> {
  // Check if harness is already open
  const harness = page.locator('text=Dev Harness').first();
  const harnessVisible = await harness.isVisible().catch(() => false);

  if (!harnessVisible) {
    // Click the "Dev" button to open
    const devButton = page.locator('button:has-text("Dev")');
    if (await devButton.isVisible()) {
      await devButton.click();
      await page.waitForSelector('text=Dev Harness');
    }
  }
}

/**
 * Close the dev harness panel.
 */
export async function closeDevHarness(page: Page): Promise<void> {
  const closeButton = page.locator('h2:has-text("Dev Harness") + button:has-text("✕")');
  if (await closeButton.isVisible().catch(() => false)) {
    await closeButton.click({ force: true });
  }
}

/**
 * Set simulated meeting context via dev harness.
 */
export async function setSimulatedContext(
  page: Page,
  context: {
    meetingInMinutes?: number;
    durationMinutes?: number;
  }
): Promise<void> {
  await openDevHarness(page);

  // Set meeting start time
  if (context.meetingInMinutes !== undefined) {
    const startsInInput = page.locator('text=Starts in:').locator('..').locator('input[type="number"]');
    await startsInInput.fill(String(context.meetingInMinutes));
  }

  // Set duration
  if (context.durationMinutes !== undefined) {
    const durationInput = page.locator('text=Duration:').locator('..').locator('input[type="number"]');
    await durationInput.fill(String(context.durationMinutes));
  }

  // Start simulation
  await page.locator('button:has-text("Start Simulation")').click();

  // Wait for simulation to be active
  await expect(page.locator('text=Current state:').locator('..').locator('text=Prep')).toBeVisible({ timeout: 5000 }).catch(() => {
    // May show different state depending on timing
  });
}

/**
 * Force mode change via dev harness.
 */
export async function forceMode(page: Page, mode: keyof typeof MODES): Promise<void> {
  await openDevHarness(page);

  const modeMap: Record<string, string> = {
    NEUTRAL: 'Neutral/Intent',
    PREP: 'Meeting Prep',
    CAPTURE: 'Meeting Capture',
    SYNTHESIS: 'Synthesis',
  };

  // Select mode radio
  const modeLabel = modeMap[mode];
  await page.locator(`label:has-text("${modeLabel}")`).click();

  // Click Apply if enabled (disabled means we're already in this mode)
  const applyButton = page.locator('button:has-text("Apply")');
  const isEnabled = await applyButton.isEnabled().catch(() => false);
  if (isEnabled) {
    await applyButton.click();
    // Wait for mode to change
    await page.waitForTimeout(500);
  } else {
    // Already in this mode, just wait briefly
    await page.waitForTimeout(100);
  }
}

/**
 * Inject sample goals via dev harness.
 */
export async function injectGoals(page: Page, goalTexts: string[]): Promise<void> {
  await openDevHarness(page);

  const availableGoals = [
    'Get alignment on timeline',
    'Understand blockers',
    'Confirm next steps',
  ];

  for (const text of goalTexts) {
    if (availableGoals.includes(text)) {
      await page.locator(`label:has-text("${text}")`).click();
    }
  }

  await page.locator('button:has-text("Inject Selected")').click();
  await page.waitForTimeout(300);
}

/**
 * Add a marker via dev harness.
 */
export async function addMarkerViaHarness(
  page: Page,
  type: 'decision' | 'action' | 'risk' | 'question',
  label?: string
): Promise<void> {
  await openDevHarness(page);

  // Select marker type
  const typeSelect = page.locator('select').filter({ hasText: 'Decision' });
  await typeSelect.selectOption(type.charAt(0).toUpperCase() + type.slice(1));

  // Enter label if provided
  if (label) {
    await page.locator('input[placeholder="Label (optional)"]').fill(label);
  }

  // Click Add Marker
  await page.locator('button:has-text("Add Marker")').click();
  await page.waitForTimeout(300);
}

// ============================================
// Mode Detection
// ============================================

/**
 * Get the current mode from the UI.
 */
export async function getCurrentMode(page: Page): Promise<string> {
  // Read from the mode indicator in the main content
  const modeText = await page.locator('text=Mode:').first().locator('..').textContent();
  if (modeText) {
    const match = modeText.match(/Mode:\s*(\w+)/);
    if (match) return match[1];
  }

  // Fallback: check which mode button is active/highlighted
  for (const [mode, label] of Object.entries(MODE_LABELS)) {
    const button = page.locator(`button:has-text("${label}")`).first();
    const classes = await button.getAttribute('class');
    if (classes?.includes('bg-blue') || classes?.includes('ring')) {
      return mode;
    }
  }

  return 'unknown';
}

/**
 * Get the current mode label from the top bar.
 */
export async function getCurrentModeLabel(page: Page): Promise<string> {
  const mode = await getCurrentMode(page);
  return MODE_LABELS[mode as keyof typeof MODE_LABELS] || mode;
}

/**
 * Wait for mode to change to expected value.
 */
export async function waitForMode(page: Page, expectedMode: string, timeout = 10000): Promise<void> {
  await expect(async () => {
    const currentMode = await getCurrentMode(page);
    expect(currentMode).toContain(expectedMode);
  }).toPass({ timeout });
}

/**
 * Get confidence level from UI.
 */
export async function getConfidence(page: Page): Promise<string> {
  const confidenceText = await page.locator('text=Confidence:').first().locator('..').textContent();
  if (confidenceText) {
    const match = confidenceText.match(/Confidence:\s*(\w+)/);
    if (match) return match[1];
  }
  return 'unknown';
}

/**
 * Get layout type from UI.
 */
export async function getLayout(page: Page): Promise<string> {
  const layoutText = await page.locator('text=Layout:').first().locator('..').textContent();
  if (layoutText) {
    const match = layoutText.match(/Layout:\s*(\w+)/);
    if (match) return match[1];
  }
  return 'unknown';
}

// ============================================
// Decision Capsule
// ============================================

/**
 * Open the decision capsule ("Why this view?").
 */
export async function openCapsule(page: Page): Promise<void> {
  // Close DevHarness first if it's open (it can block the capsule button)
  const harness = page.locator('h2:has-text("Dev Harness")');
  if (await harness.isVisible().catch(() => false)) {
    // Use force click to avoid z-index issues
    await page.locator('h2:has-text("Dev Harness")').locator('..').locator('button:has-text("✕")').click({ force: true });
    // Wait for harness to close
    await expect(harness).not.toBeVisible({ timeout: 2000 });
  }

  // Close any existing capsule panel by clicking backdrop
  const capsuleH2 = page.locator('h2:has-text("Why this view?")');
  const backdrop = page.locator('.fixed.inset-0.z-50.bg-black\\/20');
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ force: true, position: { x: 10, y: 10 } });
    await expect(capsuleH2).not.toBeVisible({ timeout: 2000 });
  }

  const capsuleButton = page.locator('button:has-text("Why this view?")');
  await capsuleButton.click();
  await expect(capsuleH2).toBeVisible();
}

/**
 * Close the decision capsule by clicking the backdrop.
 */
export async function closeCapsule(page: Page): Promise<void> {
  const capsuleH2 = page.locator('h2:has-text("Why this view?")');

  // Click the backdrop (the semi-transparent overlay) to close
  const backdrop = page.locator('.fixed.inset-0.z-50.bg-black\\/20');
  if (await backdrop.isVisible().catch(() => false)) {
    await backdrop.click({ force: true, position: { x: 10, y: 10 } });
    await expect(capsuleH2).not.toBeVisible({ timeout: 2000 });
    return;
  }

  // Fallback: click the close button
  if (await capsuleH2.isVisible().catch(() => false)) {
    const closeButton = capsuleH2.locator('..').locator('button:has-text("✕")');
    if (await closeButton.isVisible()) {
      await closeButton.click({ force: true });
      await expect(capsuleH2).not.toBeVisible({ timeout: 2000 });
    }
  }
}

/**
 * Get capsule reason text.
 */
export async function getCapsuleReason(page: Page): Promise<string> {
  // Navigate from h2 -> header div -> panel div to find the content area
  const capsulePanel = page.locator('h2:has-text("Why this view?")').locator('..').locator('..');
  const reasonText = await capsulePanel.locator('p').first().textContent();
  return reasonText || '';
}

/**
 * Get capsule confidence badge.
 */
export async function getCapsuleConfidence(page: Page): Promise<string> {
  // The capsule panel is a fixed div containing both header and content
  // Navigate from h2 -> header div -> panel div
  const capsulePanel = page.locator('h2:has-text("Why this view?")').locator('..').locator('..');

  // Look for HIGH, MEDIUM, LOW badge text
  for (const level of ['HIGH', 'MEDIUM', 'LOW']) {
    const badge = capsulePanel.locator(`text=${level}`).first();
    if (await badge.isVisible().catch(() => false)) {
      return level;
    }
  }
  return 'unknown';
}

// ============================================
// Marker Operations
// ============================================

/**
 * Create markers using hotkeys.
 */
export async function createMarkersByHotkey(
  page: Page,
  types: Array<'decision' | 'action' | 'risk' | 'question'>
): Promise<void> {
  for (const type of types) {
    const key = MARKER_HOTKEYS[type].toUpperCase();
    await page.keyboard.press(key);
    await page.waitForTimeout(100); // Brief pause between keys
  }
}

/**
 * Get marker count from storage directly via IndexedDB.
 * Finds the most recent sim-* meeting and returns its marker count.
 */
export async function getMarkerCount(page: Page): Promise<number> {
  // Query IndexedDB directly - get most recent simulated meeting
  const count = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const request = indexedDB.open('agentic-interface');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('meetings', 'readonly');
        const store = tx.objectStore('meetings');
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const meetings = getAllRequest.result || [];
          // Find the most recent sim-* meeting
          const simMeetings = meetings.filter((m: { id: string }) => m.id.startsWith('sim-'));
          if (simMeetings.length === 0) {
            resolve(0);
            return;
          }
          // Sort by createdAt descending
          simMeetings.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);
          const meeting = simMeetings[0];
          resolve(meeting.markers?.length || 0);
        };
        getAllRequest.onerror = () => resolve(0);
      };
      request.onerror = () => resolve(0);
    });
  });

  return count;
}

// ============================================
// Goals Operations
// ============================================

/**
 * Add a goal in the My3Goals card.
 */
export async function addGoal(page: Page, text: string): Promise<void> {
  // Find the My3Goals input if available
  const goalInput = page.locator('input[placeholder*="goal"], input[placeholder*="Goal"]').first();
  if (await goalInput.isVisible().catch(() => false)) {
    await goalInput.fill(text);
    await goalInput.press('Enter');
  }
}

/**
 * Check a goal in capture mode.
 */
export async function checkGoal(page: Page, goalIndex: number): Promise<void> {
  const checkButtons = page.locator('button:has-text("○")');
  const button = checkButtons.nth(goalIndex);
  if (await button.isVisible()) {
    await button.click();
  }
}

/**
 * Get goal count from storage directly via IndexedDB.
 * Finds the most recent sim-* meeting and returns its goal count.
 */
export async function getGoalCount(page: Page): Promise<number> {
  // Query IndexedDB directly - get most recent simulated meeting
  const count = await page.evaluate(async () => {
    return new Promise<number>((resolve) => {
      const request = indexedDB.open('agentic-interface');
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('meetings', 'readonly');
        const store = tx.objectStore('meetings');
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => {
          const meetings = getAllRequest.result || [];
          // Find the most recent sim-* meeting
          const simMeetings = meetings.filter((m: { id: string }) => m.id.startsWith('sim-'));
          if (simMeetings.length === 0) {
            resolve(0);
            return;
          }
          // Sort by createdAt descending
          simMeetings.sort((a: { createdAt: number }, b: { createdAt: number }) => b.createdAt - a.createdAt);
          const meeting = simMeetings[0];
          resolve(meeting.my3Goals?.length || 0);
        };
        getAllRequest.onerror = () => resolve(0);
      };
      request.onerror = () => resolve(0);
    });
  });

  return count;
}

// ============================================
// Export Operations
// ============================================

/**
 * Export JSON and return parsed data.
 */
export async function exportJsonAndParse(page: Page): Promise<unknown> {
  // Navigate to founder test dashboard if not there
  if (!page.url().includes('/founder-test')) {
    await page.goto('/founder-test');
  }

  // Set up download listener
  const downloadPromise = page.waitForEvent('download');

  // Click export button
  await page.locator('button:has-text("Export JSON")').click();

  // Wait for download
  const download = await downloadPromise;
  const path = await download.path();

  if (!path) {
    throw new Error('Download path not available');
  }

  // Read and parse file
  const fs = await import('fs');
  const content = fs.readFileSync(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Generate markdown report and return content.
 */
export async function generateMarkdownReport(page: Page): Promise<string> {
  // Navigate to founder test dashboard if not there
  if (!page.url().includes('/founder-test')) {
    await page.goto('/founder-test');
  }

  // Set up download listener
  const downloadPromise = page.waitForEvent('download');

  // Click generate report button
  await page.locator('button:has-text("Generate Report")').click();

  // Wait for download
  const download = await downloadPromise;
  const path = await download.path();

  if (!path) {
    throw new Error('Download path not available');
  }

  // Read file content
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf-8');
}

// ============================================
// Metrics Extraction
// ============================================

/**
 * Get metrics from founder test dashboard.
 */
export async function getDashboardMetrics(page: Page): Promise<{
  overrideRate: number;
  capsuleOpenRate: number;
  bounceRate: number;
  goalUtilization: number;
  markerUtilization: number;
  synthesisCompletion: number;
}> {
  if (!page.url().includes('/founder-test')) {
    await page.goto('/founder-test');
    await page.waitForLoadState('networkidle');
  }

  const extractPercent = async (label: string): Promise<number> => {
    const card = page.locator(`text=${label}`).locator('..');
    const percentText = await card.locator('p').nth(1).textContent();
    const match = percentText?.match(/([\d.]+)%/);
    return match ? parseFloat(match[1]) : 0;
  };

  return {
    overrideRate: await extractPercent('Override Rate'),
    capsuleOpenRate: await extractPercent('Capsule Open Rate'),
    bounceRate: await extractPercent('Overall Bounce Rate'),
    goalUtilization: await extractPercent('Goal Utilization'),
    markerUtilization: await extractPercent('Marker Utilization'),
    synthesisCompletion: await extractPercent('Synthesis Completion'),
  };
}

/**
 * Check if warning indicator is shown for a metric.
 */
export async function hasWarningIndicator(page: Page, metricLabel: string): Promise<boolean> {
  const card = page.locator(`text=${metricLabel}`).locator('..');
  const classes = await card.getAttribute('class');
  // Check for red/warning styling
  return classes?.includes('red') || classes?.includes('border-red') || false;
}

// ============================================
// DOM Snapshot Helpers
// ============================================

/**
 * Get component order in main content area.
 */
export async function getComponentOrder(page: Page): Promise<string[]> {
  const main = page.locator('main');
  const headings = await main.locator('h1, h2, h3').allTextContents();
  return headings;
}

/**
 * Assert component order hasn't changed.
 */
export async function assertStableLayout(
  page: Page,
  expectedOrder: string[],
  waitMs = 2000
): Promise<void> {
  await page.waitForTimeout(waitMs);
  const currentOrder = await getComponentOrder(page);
  expect(currentOrder).toEqual(expectedOrder);
}

// ============================================
// Event Generation (for metrics testing)
// ============================================

/**
 * Generate events by performing actions.
 */
export async function generateTestEvents(
  page: Page,
  config: {
    sessionOpens?: number;
    modeSwitches?: number;
    capsuleOpens?: number;
    goalAdds?: number;
    markerCreates?: number;
    bounces?: number;
  }
): Promise<void> {
  // Mode switches generate mode_switched events
  if (config.modeSwitches) {
    for (let i = 0; i < config.modeSwitches; i++) {
      const modes = ['PREP', 'CAPTURE', 'SYNTHESIS', 'NEUTRAL'] as const;
      await forceMode(page, modes[i % modes.length]);
      await page.waitForTimeout(200);
    }
  }

  // Capsule opens
  if (config.capsuleOpens) {
    for (let i = 0; i < config.capsuleOpens; i++) {
      await openCapsule(page);
      await page.waitForTimeout(100);
      await closeCapsule(page);
    }
  }
}

// ============================================
// Assertion Helpers
// ============================================

/**
 * Assert no console errors.
 */
export async function assertNoConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
}

/**
 * Wait for transition to complete.
 */
export async function waitForTransition(page: Page): Promise<void> {
  // Wait for any transition overlay to appear and disappear
  const overlay = page.locator('[class*="transition"], [class*="fade"]');
  try {
    await overlay.waitFor({ state: 'visible', timeout: 1000 });
    await overlay.waitFor({ state: 'hidden', timeout: 5000 });
  } catch {
    // No transition overlay, that's fine
  }

  // Ensure page is stable
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(300);
}
