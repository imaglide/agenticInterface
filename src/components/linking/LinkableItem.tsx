'use client';

/**
 * Linkable Item Wrapper
 *
 * Wraps any WorkObject UI element to make it clickable during link mode.
 * Shows visual feedback when in linking mode.
 */

import { useCallback, type ReactNode, type MouseEvent } from 'react';
import type { LinkingModeStatus } from '@/hooks/use-linking-mode';

interface LinkableItemProps {
  /** The WorkObject ID for this item */
  workObjectId: string;
  /** Current linking mode status */
  linkingStatus: LinkingModeStatus;
  /** Called when item is selected as source */
  onSelectSource: (workObjectId: string) => void;
  /** Called when item is selected as target */
  onSelectTarget: (workObjectId: string) => void;
  /** Activity callback to reset timeout */
  onActivity?: () => void;
  /** The child content to wrap */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether this item can be selected (defaults to true) */
  canSelect?: boolean;
}

export function LinkableItem({
  workObjectId,
  linkingStatus,
  onSelectSource,
  onSelectTarget,
  onActivity,
  children,
  className = '',
  canSelect = true,
}: LinkableItemProps) {
  const isLinkingActive = linkingStatus.isActive;
  const isSelectingSource = linkingStatus.state === 'selecting_source';
  const isSelectingTarget = linkingStatus.state === 'selecting_target';
  const isSource = linkingStatus.sourceId === workObjectId;

  // Cannot select self as target
  const canSelectAsTarget = canSelect && !isSource;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (!isLinkingActive || !canSelect) return;

      // Reset activity timeout
      onActivity?.();

      if (isSelectingSource) {
        e.preventDefault();
        e.stopPropagation();
        onSelectSource(workObjectId);
      } else if (isSelectingTarget && canSelectAsTarget) {
        e.preventDefault();
        e.stopPropagation();
        onSelectTarget(workObjectId);
      }
    },
    [
      isLinkingActive,
      canSelect,
      isSelectingSource,
      isSelectingTarget,
      canSelectAsTarget,
      workObjectId,
      onSelectSource,
      onSelectTarget,
      onActivity,
    ]
  );

  const handleMouseMove = useCallback(() => {
    if (isLinkingActive) {
      onActivity?.();
    }
  }, [isLinkingActive, onActivity]);

  // Compute visual states
  const isClickable =
    isLinkingActive && canSelect && (isSelectingSource || (isSelectingTarget && canSelectAsTarget));
  const showSourceHighlight = isSource;
  const showTargetHint = isSelectingTarget && canSelectAsTarget;

  // Build class names
  const wrapperClasses = [
    'relative transition-all duration-150',
    className,
    isClickable && 'cursor-pointer',
    showSourceHighlight && 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900',
    showTargetHint && 'hover:ring-2 hover:ring-green-500 hover:ring-offset-2 hover:ring-offset-gray-900',
    isLinkingActive && !canSelect && 'opacity-50',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={wrapperClasses}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick(e as unknown as MouseEvent);
        }
      }}
    >
      {children}

      {/* Source indicator badge */}
      {showSourceHighlight && (
        <div className="absolute -right-1 -top-1 rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white shadow-lg">
          Source
        </div>
      )}
    </div>
  );
}
