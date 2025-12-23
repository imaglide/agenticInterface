/**
 * Session Tracking Hook Tests
 *
 * Tests the bounce detection and session lifecycle logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSessionTracking, INTERACTION_TYPES } from '../use-session-tracking';

// Mock storage
const mockLogEvent = vi.fn().mockResolvedValue('mock-event-id');
vi.mock('@/storage', () => ({
  storage: {
    logEvent: (...args: unknown[]) => mockLogEvent(...args),
  },
}));

describe('useSessionTracking', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockLogEvent.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Session Initialization', () => {
    it('logs session_opened on mount', () => {
      renderHook(() => useSessionTracking('neutral_intent', null));

      expect(mockLogEvent).toHaveBeenCalledWith(
        'session_opened',
        expect.objectContaining({
          mode: 'neutral_intent',
          meetingId: null,
        })
      );
    });

    it('generates unique session ID', async () => {
      const { result } = renderHook(() => useSessionTracking('neutral_intent', null));

      // sessionId is set in useEffect, check via the logged event
      expect(mockLogEvent).toHaveBeenCalledWith(
        'session_opened',
        expect.objectContaining({
          sessionId: expect.stringMatching(/^session-\d+-[a-z0-9]+$/),
        })
      );
    });

    it('includes meeting ID when provided', () => {
      renderHook(() => useSessionTracking('meeting_prep', 'meeting-123'));

      expect(mockLogEvent).toHaveBeenCalledWith(
        'session_opened',
        expect.objectContaining({
          mode: 'meeting_prep',
          meetingId: 'meeting-123',
        })
      );
    });
  });

  describe('Bounce Detection', () => {
    it('logs session_bounced after 20 seconds with no interaction', () => {
      renderHook(() => useSessionTracking('neutral_intent', null));

      // Clear the session_opened call
      mockLogEvent.mockClear();

      // Advance past bounce timeout
      act(() => {
        vi.advanceTimersByTime(20001);
      });

      expect(mockLogEvent).toHaveBeenCalledWith(
        'session_bounced',
        expect.objectContaining({
          mode: 'neutral_intent',
          bounceTimeMs: 20000,
        })
      );
    });

    it('does NOT log bounce if interaction recorded before timeout', () => {
      const { result } = renderHook(() => useSessionTracking('neutral_intent', null));

      mockLogEvent.mockClear();

      // Record interaction before timeout
      act(() => {
        vi.advanceTimersByTime(10000);
        result.current.recordInteraction(INTERACTION_TYPES.CLICK);
      });

      // Advance past original timeout
      act(() => {
        vi.advanceTimersByTime(15000);
      });

      // Should NOT have session_bounced
      const bounceCalls = mockLogEvent.mock.calls.filter(
        (call) => call[0] === 'session_bounced'
      );
      expect(bounceCalls).toHaveLength(0);
    });

    it('logs session_interacted on first interaction', () => {
      const { result } = renderHook(() => useSessionTracking('neutral_intent', null));

      mockLogEvent.mockClear();

      act(() => {
        vi.advanceTimersByTime(5000);
        result.current.recordInteraction(INTERACTION_TYPES.CLICK);
      });

      expect(mockLogEvent).toHaveBeenCalledWith(
        'session_interacted',
        expect.objectContaining({
          mode: 'neutral_intent',
          firstInteractionType: 'click',
        })
      );
    });

    it('only logs session_interacted once (first interaction)', () => {
      const { result } = renderHook(() => useSessionTracking('neutral_intent', null));

      mockLogEvent.mockClear();

      // First interaction
      act(() => {
        result.current.recordInteraction(INTERACTION_TYPES.CLICK);
      });

      // Second interaction
      act(() => {
        result.current.recordInteraction(INTERACTION_TYPES.SCROLL);
      });

      const interactedCalls = mockLogEvent.mock.calls.filter(
        (call) => call[0] === 'session_interacted'
      );
      expect(interactedCalls).toHaveLength(1);
    });
  });

  describe('Interaction Recording', () => {
    it('logs each user_interaction', () => {
      const { result } = renderHook(() => useSessionTracking('neutral_intent', null));

      mockLogEvent.mockClear();

      act(() => {
        result.current.recordInteraction(INTERACTION_TYPES.GOAL_ADD);
      });

      expect(mockLogEvent).toHaveBeenCalledWith(
        'user_interaction',
        expect.objectContaining({
          type: 'goal_add',
          mode: 'neutral_intent',
        })
      );
    });

    it('tracks different interaction types', () => {
      const { result } = renderHook(() => useSessionTracking('meeting_capture', null));

      mockLogEvent.mockClear();

      act(() => {
        result.current.recordInteraction(INTERACTION_TYPES.MARKER_ADD);
      });

      expect(mockLogEvent).toHaveBeenCalledWith(
        'user_interaction',
        expect.objectContaining({
          type: 'marker_add',
        })
      );
    });
  });

  describe('Mode Change Events', () => {
    it('logs meeting_prep_opened when mode is meeting_prep with meetingId', () => {
      renderHook(() => useSessionTracking('meeting_prep', 'meeting-abc'));

      expect(mockLogEvent).toHaveBeenCalledWith(
        'meeting_prep_opened',
        expect.objectContaining({
          meetingId: 'meeting-abc',
        })
      );
    });

    it('logs meeting_capture_opened when mode is meeting_capture', () => {
      renderHook(() => useSessionTracking('meeting_capture', 'meeting-xyz'));

      expect(mockLogEvent).toHaveBeenCalledWith(
        'meeting_capture_opened',
        expect.objectContaining({
          meetingId: 'meeting-xyz',
        })
      );
    });

    it('logs meeting_synthesis_opened when mode is meeting_synthesis_min', () => {
      renderHook(() => useSessionTracking('meeting_synthesis_min', 'meeting-123'));

      expect(mockLogEvent).toHaveBeenCalledWith(
        'meeting_synthesis_opened',
        expect.objectContaining({
          meetingId: 'meeting-123',
        })
      );
    });

    it('does NOT log meeting events without meetingId', () => {
      renderHook(() => useSessionTracking('meeting_prep', null));

      const meetingCalls = mockLogEvent.mock.calls.filter(
        (call) => call[0].includes('meeting_') && call[0] !== 'session_opened'
      );

      // Should only have session_opened, not meeting_prep_opened
      expect(meetingCalls.filter((c) => c[0] === 'meeting_prep_opened')).toHaveLength(0);
    });
  });

  describe('Cleanup', () => {
    it('clears bounce timeout on unmount', () => {
      const { unmount } = renderHook(() => useSessionTracking('neutral_intent', null));

      mockLogEvent.mockClear();

      unmount();

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(25000);
      });

      // Should NOT log bounce after unmount
      const bounceCalls = mockLogEvent.mock.calls.filter(
        (call) => call[0] === 'session_bounced'
      );
      expect(bounceCalls).toHaveLength(0);
    });
  });
});

describe('INTERACTION_TYPES', () => {
  it('has all expected interaction types', () => {
    expect(INTERACTION_TYPES.CLICK).toBe('click');
    expect(INTERACTION_TYPES.INPUT).toBe('input');
    expect(INTERACTION_TYPES.SCROLL).toBe('scroll');
    expect(INTERACTION_TYPES.GOAL_ADD).toBe('goal_add');
    expect(INTERACTION_TYPES.GOAL_CHECK).toBe('goal_check');
    expect(INTERACTION_TYPES.MARKER_ADD).toBe('marker_add');
    expect(INTERACTION_TYPES.CAPSULE_OPEN).toBe('capsule_open');
    expect(INTERACTION_TYPES.MODE_SWITCH).toBe('mode_switch');
  });
});
