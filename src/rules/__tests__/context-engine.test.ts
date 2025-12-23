/**
 * Context Engine Tests
 *
 * Tests meeting context computation from calendar events.
 */

import { describe, it, expect } from 'vitest';
import {
  computeMeetingContext,
  isMeetingStarting,
  isMeetingEnding,
  getTimeUntilMeeting,
  getTimeSinceMeetingEnded,
  formatDuration,
} from '../context-engine';
import { CalendarEvent, TimingConfig, DEFAULT_TIMING_CONFIG } from '../types';

// Helper to create a calendar event
function createEvent(
  id: string,
  title: string,
  startTime: number,
  endTime: number
): CalendarEvent {
  return {
    id,
    title,
    startTime,
    endTime,
    attendees: [],
  };
}

describe('Context Engine', () => {
  describe('computeMeetingContext', () => {
    it('detects current meeting when within time bounds', () => {
      const now = Date.now();
      const events: CalendarEvent[] = [
        createEvent('1', 'Live Meeting', now - 30 * 60000, now + 30 * 60000),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.currentMeeting).not.toBeNull();
      expect(context.currentMeeting?.title).toBe('Live Meeting');
    });

    it('detects current meeting within grace period at start', () => {
      const now = Date.now();
      const meetingStart = now + 60000; // Starts in 1 min
      const events: CalendarEvent[] = [
        createEvent('1', 'Starting Meeting', meetingStart, meetingStart + 60 * 60000),
      ];

      // Default grace is 2 min, so 1 min before should be "live"
      const context = computeMeetingContext(events, now);

      expect(context.currentMeeting).not.toBeNull();
      expect(context.currentMeeting?.title).toBe('Starting Meeting');
    });

    it('detects current meeting within grace period at end', () => {
      const now = Date.now();
      const meetingEnd = now - 60000; // Ended 1 min ago
      const events: CalendarEvent[] = [
        createEvent('1', 'Ending Meeting', meetingEnd - 60 * 60000, meetingEnd),
      ];

      // Default grace is 2 min, so 1 min after end should still be "live"
      const context = computeMeetingContext(events, now);

      expect(context.currentMeeting).not.toBeNull();
    });

    it('detects next meeting within prep window', () => {
      const now = Date.now();
      const meetingStart = now + 20 * 60000; // Starts in 20 min
      const events: CalendarEvent[] = [
        createEvent('1', 'Upcoming Meeting', meetingStart, meetingStart + 60 * 60000),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.nextMeeting).not.toBeNull();
      expect(context.nextMeeting?.title).toBe('Upcoming Meeting');
    });

    it('does NOT detect meeting outside prep window', () => {
      const now = Date.now();
      const meetingStart = now + 60 * 60000; // Starts in 60 min (outside 45 min window)
      const events: CalendarEvent[] = [
        createEvent('1', 'Far Meeting', meetingStart, meetingStart + 60 * 60000),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.nextMeeting).toBeNull();
    });

    it('selects nearest upcoming meeting when multiple in prep window', () => {
      const now = Date.now();
      const events: CalendarEvent[] = [
        createEvent('1', 'Later Meeting', now + 30 * 60000, now + 90 * 60000),
        createEvent('2', 'Sooner Meeting', now + 15 * 60000, now + 75 * 60000),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.nextMeeting?.title).toBe('Sooner Meeting');
    });

    it('detects last meeting within synthesis window', () => {
      const now = Date.now();
      const meetingEnd = now - 30 * 60000; // Ended 30 min ago
      const events: CalendarEvent[] = [
        createEvent('1', 'Past Meeting', meetingEnd - 60 * 60000, meetingEnd),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.lastMeeting).not.toBeNull();
      expect(context.lastMeeting?.title).toBe('Past Meeting');
    });

    it('does NOT detect meeting outside synthesis window', () => {
      const now = Date.now();
      const meetingEnd = now - 90 * 60000; // Ended 90 min ago (outside 60 min window)
      const events: CalendarEvent[] = [
        createEvent('1', 'Old Meeting', meetingEnd - 60 * 60000, meetingEnd),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.lastMeeting).toBeNull();
    });

    it('selects most recently ended meeting when multiple in synthesis window', () => {
      const now = Date.now();
      const events: CalendarEvent[] = [
        createEvent('1', 'Earlier Meeting', now - 120 * 60000, now - 50 * 60000),
        createEvent('2', 'Later Meeting', now - 90 * 60000, now - 20 * 60000),
      ];

      const context = computeMeetingContext(events, now);

      expect(context.lastMeeting?.title).toBe('Later Meeting');
    });

    it('handles empty events array', () => {
      const now = Date.now();
      const context = computeMeetingContext([], now);

      expect(context.currentMeeting).toBeNull();
      expect(context.nextMeeting).toBeNull();
      expect(context.lastMeeting).toBeNull();
      expect(context.now).toBe(now);
    });

    it('respects custom timing config', () => {
      const now = Date.now();
      const customConfig: TimingConfig = {
        prepWindowMinutes: 10, // Reduced from 45
        synthesisWindowMinutes: 15, // Reduced from 60
        meetingGraceMinutes: 0, // No grace
        minimumHoldMs: 5000,
      };

      // Meeting 20 min away - outside custom 10 min prep window
      const events: CalendarEvent[] = [
        createEvent('1', 'Outside Prep', now + 20 * 60000, now + 80 * 60000),
      ];

      const context = computeMeetingContext(events, now, customConfig);

      expect(context.nextMeeting).toBeNull();
    });
  });

  describe('isMeetingStarting', () => {
    it('returns true when within grace period before start', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now + 60000, now + 3600000);

      expect(isMeetingStarting(event, now, 2)).toBe(true);
    });

    it('returns false when too early before meeting', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now + 5 * 60000, now + 3600000);

      expect(isMeetingStarting(event, now, 2)).toBe(false);
    });

    it('returns false when meeting already started', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 5 * 60000, now + 3600000);

      expect(isMeetingStarting(event, now, 2)).toBe(false);
    });
  });

  describe('isMeetingEnding', () => {
    it('returns true when within grace period after end', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 3600000, now - 60000);

      expect(isMeetingEnding(event, now, 2)).toBe(true);
    });

    it('returns false when too long after end', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 3600000, now - 5 * 60000);

      expect(isMeetingEnding(event, now, 2)).toBe(false);
    });

    it('returns false when meeting still ongoing', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 30 * 60000, now + 30 * 60000);

      expect(isMeetingEnding(event, now, 2)).toBe(false);
    });
  });

  describe('getTimeUntilMeeting', () => {
    it('returns positive time until future meeting', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now + 30 * 60000, now + 90 * 60000);

      const result = getTimeUntilMeeting(event, now);

      expect(result).toBe(30 * 60000);
    });

    it('returns 0 for past meeting start', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 10 * 60000, now + 50 * 60000);

      const result = getTimeUntilMeeting(event, now);

      expect(result).toBe(0);
    });
  });

  describe('getTimeSinceMeetingEnded', () => {
    it('returns positive time since past meeting end', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 90 * 60000, now - 30 * 60000);

      const result = getTimeSinceMeetingEnded(event, now);

      expect(result).toBe(30 * 60000);
    });

    it('returns 0 for ongoing meeting', () => {
      const now = Date.now();
      const event = createEvent('1', 'Test', now - 30 * 60000, now + 30 * 60000);

      const result = getTimeSinceMeetingEnded(event, now);

      expect(result).toBe(0);
    });
  });

  describe('formatDuration', () => {
    it('formats minutes under 60', () => {
      expect(formatDuration(15 * 60000)).toBe('15 min');
      expect(formatDuration(45 * 60000)).toBe('45 min');
    });

    it('formats exact hours', () => {
      expect(formatDuration(60 * 60000)).toBe('1 hr');
      expect(formatDuration(120 * 60000)).toBe('2 hr');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(90 * 60000)).toBe('1 hr 30 min');
      expect(formatDuration(150 * 60000)).toBe('2 hr 30 min');
    });

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0 min');
    });
  });
});
