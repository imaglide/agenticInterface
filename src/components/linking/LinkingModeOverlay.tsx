'use client';

/**
 * Linking Mode Overlay
 *
 * Displays the current linking mode status at the bottom of the screen.
 * Shows: link type, selected source, countdown timer, and cancel hint.
 */

import { useEffect } from 'react';
import type { LinkingModeStatus } from '@/hooks/use-linking-mode';
import type { LinkType } from '@/storage/work-object-types';

interface LinkingModeOverlayProps {
  status: LinkingModeStatus;
  onCancel: () => void;
  /** Optional: Display name resolver for WorkObject IDs */
  getDisplayName?: (workObjectId: string) => string;
}

const linkTypeLabels: Record<LinkType, { label: string; verb: string; color: string }> = {
  related: { label: 'Related', verb: 'relating', color: 'bg-blue-600' },
  supports: { label: 'Supports', verb: 'supporting', color: 'bg-green-600' },
  blocks: { label: 'Blocks', verb: 'blocking', color: 'bg-red-600' },
  duplicates: { label: 'Duplicates', verb: 'marking as duplicate', color: 'bg-amber-600' },
};

export function LinkingModeOverlay({
  status,
  onCancel,
  getDisplayName = (id) => id.split(':').pop() || id,
}: LinkingModeOverlayProps) {
  // Listen for Escape key to cancel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && status.isActive) {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [status.isActive, onCancel]);

  if (!status.isActive) {
    return null;
  }

  const linkConfig = status.linkType ? linkTypeLabels[status.linkType] : null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-700 bg-gray-900/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        {/* Left: Status info */}
        <div className="flex items-center gap-3">
          {/* Link type badge */}
          {linkConfig && (
            <span className={`rounded-full px-3 py-1 text-xs font-medium text-white ${linkConfig.color}`}>
              {linkConfig.label}
            </span>
          )}

          {/* Status message */}
          <span className="text-sm text-gray-300">
            {status.state === 'selecting_source' && (
              <>Select source item to link from</>
            )}
            {status.state === 'selecting_target' && status.sourceId && (
              <>
                <span className="text-white">
                  {getDisplayName(status.sourceId)}
                </span>
                {' → Select target item'}
              </>
            )}
          </span>
        </div>

        {/* Right: Timer and cancel */}
        <div className="flex items-center gap-4">
          {/* Countdown timer (only shown when timeout enabled) */}
          {status.timeoutSecondsRemaining !== null && (
            <span
              className={`text-sm tabular-nums ${
                status.showTimeoutWarning
                  ? 'font-medium text-amber-400'
                  : 'text-gray-500'
              }`}
            >
              {status.timeoutSecondsRemaining}s
            </span>
          )}

          {/* Cancel hint */}
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <kbd className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 font-mono text-xs">
              Esc
            </kbd>
            <span>Cancel</span>
          </button>
        </div>
      </div>

      {/* Warning bar when timeout approaching */}
      {status.showTimeoutWarning && (
        <div className="h-1 bg-amber-500/30">
          <div
            className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${((status.timeoutSecondsRemaining || 0) / 5) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
}
