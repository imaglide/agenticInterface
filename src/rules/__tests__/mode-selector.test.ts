/**
 * Mode Selector Tests
 *
 * Tests the priority-based mode selection logic.
 * Priority order: CAPTURE > PREP > SYNTHESIS > NEUTRAL
 */

import { describe, it, expect } from 'vitest';
import { selectMode, getAlternatives } from '../mode-selector';
import { MeetingContext, CalendarEvent, DEFAULT_TIMING_CONFIG } from '../types';

// Helper to create a calendar event
function createEvent(
  title: string,
  startOffset: number,
  durationMin: number = 60,
  now: number = Date.now()
): CalendarEvent {
  const startTime = now + startOffset * 60 * 1000;
  return {
    id: `event-${title.toLowerCase().replace(/\s/g, '-')}`,
    title,
    startTime,
    endTime: startTime + durationMin * 60 * 1000,
    attendees: [],
  };
}

// Helper to create meeting context
function createContext(overrides: Partial<MeetingContext> = {}): MeetingContext {
  return {
    currentMeeting: null,
    nextMeeting: null,
    lastMeeting: null,
    now: Date.now(),
    ...overrides,
  };
}

describe('Mode Selector', () => {
  describe('Priority Order', () => {
    it('selects CAPTURE when meeting is live', () => {
      const now = Date.now();
      const context = createContext({
        currentMeeting: createEvent('Team Standup', -30, 60, now), // Started 30 min ago
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_capture');
      expect(result.trigger).toBe('meeting_live');
    });

    it('prioritizes CAPTURE over PREP when both exist', () => {
      const now = Date.now();
      const context = createContext({
        currentMeeting: createEvent('Current Meeting', -15, 60, now),
        nextMeeting: createEvent('Next Meeting', 30, 60, now),
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_capture');
    });

    it('prioritizes CAPTURE over SYNTHESIS when both exist', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000; // Ended 30 min ago

      const context = createContext({
        currentMeeting: createEvent('Current Meeting', -15, 60, now),
        lastMeeting,
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_capture');
    });

    it('selects PREP when no live meeting but upcoming exists', () => {
      const now = Date.now();
      const context = createContext({
        nextMeeting: createEvent('Upcoming Meeting', 20, 60, now), // In 20 min
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_prep');
      expect(result.trigger).toBe('meeting_upcoming');
    });

    it('prioritizes PREP over SYNTHESIS when both exist', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      const context = createContext({
        nextMeeting: createEvent('Upcoming Meeting', 20, 60, now),
        lastMeeting,
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_prep');
    });

    it('selects SYNTHESIS when no live or upcoming meeting but recently ended', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      const context = createContext({
        lastMeeting,
        now,
      });

      const result = selectMode(context);

      expect(result.mode).toBe('meeting_synthesis_min');
      expect(result.trigger).toBe('meeting_ended');
    });

    it('selects NEUTRAL when no meeting context', () => {
      const context = createContext();

      const result = selectMode(context);

      expect(result.mode).toBe('neutral_intent');
      // Neutral is always included as a candidate with trigger 'default'
      // 'no_context' only returns when candidates array is empty (which never happens)
      expect(result.trigger).toBe('default');
    });
  });

  describe('Confidence Assignment', () => {
    it('assigns HIGH confidence for live meeting with no competition', () => {
      const now = Date.now();
      const context = createContext({
        currentMeeting: createEvent('Solo Meeting', -15, 60, now),
        now,
      });

      const result = selectMode(context);

      expect(result.confidence).toBe('HIGH');
    });

    it('assigns HIGH confidence when winner priority is 2+ levels above next', () => {
      const now = Date.now();
      // CAPTURE (4) vs NEUTRAL (1) = 3 levels difference
      const context = createContext({
        currentMeeting: createEvent('Live Meeting', -15, 60, now),
        now,
      });

      const result = selectMode(context);

      expect(result.confidence).toBe('HIGH');
    });

    it('assigns MEDIUM confidence when competing mode is one level below', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      // PREP (3) vs SYNTHESIS (2) = 1 level difference
      const context = createContext({
        nextMeeting: createEvent('Upcoming Meeting', 20, 60, now),
        lastMeeting,
        now,
      });

      const result = selectMode(context);

      expect(result.confidence).toBe('MEDIUM');
    });

    it('assigns LOW confidence for neutral with no triggers', () => {
      const context = createContext();

      const result = selectMode(context);

      expect(result.confidence).toBe('LOW');
    });
  });

  describe('Reason Generation', () => {
    it('includes meeting title in reason for CAPTURE', () => {
      const now = Date.now();
      const context = createContext({
        currentMeeting: createEvent('Important Planning', -15, 60, now),
        now,
      });

      const result = selectMode(context);

      expect(result.reason).toContain('Important Planning');
      expect(result.reason).toContain('in progress');
    });

    it('includes meeting title and time in reason for PREP', () => {
      const now = Date.now();
      const context = createContext({
        nextMeeting: createEvent('Strategy Session', 20, 60, now),
        now,
      });

      const result = selectMode(context);

      expect(result.reason).toContain('Strategy Session');
      expect(result.reason).toContain('starts in');
    });

    it('includes meeting title and time ago in reason for SYNTHESIS', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Review Call', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      const context = createContext({
        lastMeeting,
        now,
      });

      const result = selectMode(context);

      expect(result.reason).toContain('Review Call');
      expect(result.reason).toContain('ended');
      expect(result.reason).toContain('ago');
    });
  });

  describe('getAlternatives', () => {
    it('returns empty array when only one mode candidate', () => {
      const now = Date.now();
      const context = createContext({
        currentMeeting: createEvent('Solo Meeting', -15, 60, now),
        now,
      });

      const alternatives = getAlternatives(context, 'meeting_capture');

      expect(alternatives).toHaveLength(0);
    });

    it('excludes neutral from alternatives', () => {
      const context = createContext();

      const alternatives = getAlternatives(context, 'neutral_intent');

      expect(alternatives).toHaveLength(0);
    });

    it('returns alternatives excluding selected mode', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      const context = createContext({
        nextMeeting: createEvent('Upcoming Meeting', 20, 60, now),
        lastMeeting,
        now,
      });

      const alternatives = getAlternatives(context, 'meeting_prep');

      expect(alternatives).toHaveLength(1);
      expect(alternatives[0].mode).toBe('meeting_synthesis_min');
    });

    it('limits alternatives to max 3', () => {
      const now = Date.now();
      const lastMeeting = createEvent('Past Meeting', -90, 60, now);
      lastMeeting.endTime = now - 30 * 60 * 1000;

      const context = createContext({
        currentMeeting: createEvent('Live Meeting', -15, 60, now),
        nextMeeting: createEvent('Upcoming Meeting', 20, 60, now),
        lastMeeting,
        now,
      });

      const alternatives = getAlternatives(context, 'meeting_capture');

      expect(alternatives.length).toBeLessThanOrEqual(3);
    });
  });
});
