/**
 * Linking Mode Hook Tests
 *
 * Tests the state machine for WorkObject linking UI.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLinkingMode, DEFAULT_LINKING_CONFIG } from '../use-linking-mode';

describe('useLinkingMode', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => useLinkingMode());

      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.sourceId).toBeNull();
      expect(result.current.status.linkType).toBeNull();
      expect(result.current.status.isActive).toBe(false);
    });

    it('has correct default config', () => {
      expect(DEFAULT_LINKING_CONFIG.inactivityTimeoutMs).toBe(30000);
      expect(DEFAULT_LINKING_CONFIG.requireExplicitCancel).toBe(true);
      expect(DEFAULT_LINKING_CONFIG.warningThresholdMs).toBe(5000);
    });
  });

  describe('startLinking', () => {
    it('transitions to selecting_source state', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('related');
      });

      expect(result.current.status.state).toBe('selecting_source');
      expect(result.current.status.linkType).toBe('related');
      expect(result.current.status.isActive).toBe(true);
    });

    it('accepts all link types', () => {
      const { result } = renderHook(() => useLinkingMode());

      const linkTypes = ['related', 'supports', 'blocks', 'duplicates'] as const;

      for (const type of linkTypes) {
        act(() => {
          result.current.startLinking(type);
        });
        expect(result.current.status.linkType).toBe(type);
        act(() => {
          result.current.cancel();
        });
      }
    });
  });

  describe('selectSource', () => {
    it('transitions to selecting_target state', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('related');
      });

      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });

      expect(result.current.status.state).toBe('selecting_target');
      expect(result.current.status.sourceId).toBe('wo:marker:mtg:abc:m1');
    });

    it('does nothing if not in selecting_source state', () => {
      const { result } = renderHook(() => useLinkingMode());

      // Try in idle state
      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });

      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.sourceId).toBeNull();
    });
  });

  describe('selectTarget', () => {
    it('returns link data and resets to idle', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('supports');
      });

      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });

      let linkData: ReturnType<typeof result.current.selectTarget> | null = null;
      act(() => {
        linkData = result.current.selectTarget('wo:goal:mtg:abc:g1');
      });

      expect(linkData).toEqual({
        sourceId: 'wo:marker:mtg:abc:m1',
        targetId: 'wo:goal:mtg:abc:g1',
        linkType: 'supports',
      });

      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.sourceId).toBeNull();
      expect(result.current.status.linkType).toBeNull();
    });

    it('returns null if not in selecting_target state', () => {
      const { result } = renderHook(() => useLinkingMode());

      let linkData: ReturnType<typeof result.current.selectTarget> | null = null;
      act(() => {
        linkData = result.current.selectTarget('wo:goal:mtg:abc:g1');
      });

      expect(linkData).toBeNull();
    });
  });

  describe('cancel', () => {
    it('resets to idle from selecting_source', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('related');
      });

      act(() => {
        result.current.cancel();
      });

      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.linkType).toBeNull();
    });

    it('resets to idle from selecting_target', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('blocks');
      });

      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });

      act(() => {
        result.current.cancel();
      });

      expect(result.current.status.state).toBe('idle');
      expect(result.current.status.sourceId).toBeNull();
    });
  });

  describe('timeout behavior', () => {
    it('does not timeout when requireExplicitCancel is true (default)', () => {
      const { result } = renderHook(() => useLinkingMode());

      act(() => {
        result.current.startLinking('related');
      });

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // Should still be active
      expect(result.current.status.state).toBe('selecting_source');
      expect(result.current.status.timeoutSecondsRemaining).toBeNull();
    });

    it('times out when requireExplicitCancel is false', () => {
      const { result } = renderHook(() =>
        useLinkingMode({
          requireExplicitCancel: false,
          inactivityTimeoutMs: 10000,
        })
      );

      act(() => {
        result.current.startLinking('related');
      });

      expect(result.current.status.state).toBe('selecting_source');

      // Advance past timeout
      act(() => {
        vi.advanceTimersByTime(10001);
      });

      // Should be back to idle
      expect(result.current.status.state).toBe('idle');
    });

    it('shows countdown when timeout enabled', () => {
      const { result } = renderHook(() =>
        useLinkingMode({
          requireExplicitCancel: false,
          inactivityTimeoutMs: 10000,
        })
      );

      act(() => {
        result.current.startLinking('related');
      });

      expect(result.current.status.timeoutSecondsRemaining).toBe(10);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.status.timeoutSecondsRemaining).toBe(7);
    });

    it('shows warning when approaching timeout', () => {
      const { result } = renderHook(() =>
        useLinkingMode({
          requireExplicitCancel: false,
          inactivityTimeoutMs: 10000,
          warningThresholdMs: 5000,
        })
      );

      act(() => {
        result.current.startLinking('related');
      });

      // Not yet in warning
      expect(result.current.status.showTimeoutWarning).toBe(false);

      // Advance to warning threshold
      act(() => {
        vi.advanceTimersByTime(5001);
      });

      expect(result.current.status.showTimeoutWarning).toBe(true);
    });

    it('resetTimeout restarts the timer', () => {
      const { result } = renderHook(() =>
        useLinkingMode({
          requireExplicitCancel: false,
          inactivityTimeoutMs: 10000,
        })
      );

      act(() => {
        result.current.startLinking('related');
      });

      // Advance 8 seconds
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(result.current.status.timeoutSecondsRemaining).toBe(2);

      // Reset timeout
      act(() => {
        result.current.resetTimeout();
      });

      // Should be back to 10 seconds
      expect(result.current.status.timeoutSecondsRemaining).toBe(10);

      // Advance 8 more seconds - should still be active
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      expect(result.current.status.state).toBe('selecting_source');
    });
  });

  describe('state machine integrity', () => {
    it('full happy path: start → select source → select target', () => {
      const { result } = renderHook(() => useLinkingMode());

      // Start
      act(() => {
        result.current.startLinking('related');
      });
      expect(result.current.status.state).toBe('selecting_source');

      // Select source
      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });
      expect(result.current.status.state).toBe('selecting_target');

      // Select target
      let linkData: ReturnType<typeof result.current.selectTarget> | null = null;
      act(() => {
        linkData = result.current.selectTarget('wo:goal:mtg:abc:g1');
      });
      expect(result.current.status.state).toBe('idle');
      expect(linkData).toBeTruthy();
    });

    it('can restart linking after cancel', () => {
      const { result } = renderHook(() => useLinkingMode());

      // First attempt - cancel
      act(() => {
        result.current.startLinking('related');
        result.current.cancel();
      });

      // Second attempt - complete
      act(() => {
        result.current.startLinking('blocks');
      });

      expect(result.current.status.linkType).toBe('blocks');
      expect(result.current.status.state).toBe('selecting_source');
    });

    it('can restart linking after completion', () => {
      const { result } = renderHook(() => useLinkingMode());

      // Complete a link
      act(() => {
        result.current.startLinking('related');
      });

      act(() => {
        result.current.selectSource('wo:marker:mtg:abc:m1');
      });

      act(() => {
        result.current.selectTarget('wo:goal:mtg:abc:g1');
      });

      // Start another
      act(() => {
        result.current.startLinking('supports');
      });

      expect(result.current.status.linkType).toBe('supports');
      expect(result.current.status.state).toBe('selecting_source');
    });
  });
});
