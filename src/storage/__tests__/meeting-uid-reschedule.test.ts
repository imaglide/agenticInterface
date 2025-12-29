/**
 * Meeting UID Reschedule Detection Tests
 *
 * Tests the logic for detecting and handling rescheduled recurring meetings.
 */

import { describe, it, expect } from 'vitest';
import { isSameDateDifferentTime } from '../meeting-uid-api';

describe('isSameDateDifferentTime', () => {
  it('returns true for same day different time', () => {
    // 9am and 10am on same day
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-01-15T10:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(true);
  });

  it('returns true for same day significantly different time', () => {
    // Morning to afternoon on same day
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-01-15T14:30:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(true);
  });

  it('returns false for exact same time', () => {
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-01-15T09:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });

  it('returns false for different days', () => {
    // Same time, different day
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-01-16T09:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });

  it('returns false for different days even with similar time', () => {
    // Monday and Tuesday at 9am
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-01-22T09:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });

  it('returns false for different months', () => {
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2024-02-15T09:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });

  it('returns false for different years', () => {
    const time1 = '2024-01-15T09:00:00.000Z';
    const time2 = '2025-01-15T09:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });

  it('handles timezone edge case - same UTC date', () => {
    // Both are Jan 15 in UTC
    const time1 = '2024-01-15T23:00:00.000Z';
    const time2 = '2024-01-15T01:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(true);
  });

  it('handles midnight boundary correctly', () => {
    // Just before and just after midnight are different dates
    const time1 = '2024-01-15T23:59:59.999Z';
    const time2 = '2024-01-16T00:00:00.000Z';

    expect(isSameDateDifferentTime(time1, time2)).toBe(false);
  });
});

describe('Reschedule Detection Scenarios', () => {
  describe('same-day reschedule', () => {
    it('standup moved from 9am to 10am should be same-day', () => {
      const original = '2024-01-15T09:00:00.000Z';
      const rescheduled = '2024-01-15T10:00:00.000Z';

      expect(isSameDateDifferentTime(original, rescheduled)).toBe(true);
    });

    it('meeting moved earlier in the day should be same-day', () => {
      const original = '2024-01-15T14:00:00.000Z';
      const rescheduled = '2024-01-15T09:00:00.000Z';

      expect(isSameDateDifferentTime(original, rescheduled)).toBe(true);
    });
  });

  describe('different-day reschedule (not detected)', () => {
    it('meeting moved to next day is NOT same-day', () => {
      const original = '2024-01-15T09:00:00.000Z';
      const rescheduled = '2024-01-16T09:00:00.000Z';

      // This is intentionally false - different-day reschedules need manual resolution
      expect(isSameDateDifferentTime(original, rescheduled)).toBe(false);
    });

    it('meeting moved to next week is NOT same-day', () => {
      const original = '2024-01-15T09:00:00.000Z';
      const rescheduled = '2024-01-22T09:00:00.000Z';

      expect(isSameDateDifferentTime(original, rescheduled)).toBe(false);
    });
  });
});
