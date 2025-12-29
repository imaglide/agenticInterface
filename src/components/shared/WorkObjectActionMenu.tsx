'use client';

/**
 * WorkObject Action Menu
 *
 * Universal dropdown menu for WorkObject actions including:
 * - Link to... (with link type submenu)
 * - Delete (soft-delete)
 * - Flag toggles (future)
 */

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
import type { LinkType } from '@/storage/work-object-types';

interface WorkObjectActionMenuProps {
  /** Called when user starts linking with a specific type */
  onStartLinking?: (linkType: LinkType) => void;
  /** Called when user wants to delete the item */
  onDelete?: () => void;
  /** Whether the menu is disabled */
  disabled?: boolean;
  /** Custom trigger element (defaults to three-dot button) */
  trigger?: ReactNode;
  /** Position of menu relative to trigger */
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
}

const linkTypeOptions: Array<{ type: LinkType; label: string; icon: string }> = [
  { type: 'related', label: 'Related to...', icon: '🔗' },
  { type: 'supports', label: 'Supports...', icon: '✓' },
  { type: 'blocks', label: 'Blocks...', icon: '⛔' },
  { type: 'duplicates', label: 'Duplicate of...', icon: '📋' },
];

export function WorkObjectActionMenu({
  onStartLinking,
  onDelete,
  disabled = false,
  trigger,
  position = 'bottom-right',
}: WorkObjectActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showLinkSubmenu, setShowLinkSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowLinkSubmenu(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setShowLinkSubmenu(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setShowLinkSubmenu(false);
  }, [disabled]);

  const handleLinkClick = useCallback(
    (linkType: LinkType) => {
      onStartLinking?.(linkType);
      setIsOpen(false);
      setShowLinkSubmenu(false);
    },
    [onStartLinking]
  );

  const handleDeleteClick = useCallback(() => {
    onDelete?.();
    setIsOpen(false);
  }, [onDelete]);

  // Position classes
  const positionClasses = {
    'top-right': 'bottom-full right-0 mb-1',
    'bottom-right': 'top-full right-0 mt-1',
    'top-left': 'bottom-full left-0 mb-1',
    'bottom-left': 'top-full left-0 mt-1',
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      {trigger ? (
        <div onClick={handleToggle}>{trigger}</div>
      ) : (
        <button
          ref={triggerRef}
          onClick={handleToggle}
          disabled={disabled}
          className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Actions"
          aria-expanded={isOpen}
          aria-haspopup="menu"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 16 16">
            <circle cx="8" cy="3" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="8" cy="13" r="1.5" />
          </svg>
        </button>
      )}

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className={`absolute z-50 min-w-40 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl ${positionClasses[position]}`}
          role="menu"
        >
          {/* Link to... with submenu */}
          {onStartLinking && (
            <div
              className="relative"
              onMouseEnter={() => setShowLinkSubmenu(true)}
              onMouseLeave={() => setShowLinkSubmenu(false)}
            >
              <button
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                role="menuitem"
              >
                <span>Link to...</span>
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>

              {/* Link type submenu */}
              {showLinkSubmenu && (
                <div className="absolute left-full top-0 ml-1 min-w-36 rounded-lg border border-gray-700 bg-gray-800 py-1 shadow-xl">
                  {linkTypeOptions.map(({ type, label, icon }) => (
                    <button
                      key={type}
                      onClick={() => handleLinkClick(type)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                      role="menuitem"
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          {onStartLinking && onDelete && (
            <div className="my-1 border-t border-gray-700" />
          )}

          {/* Delete action */}
          {onDelete && (
            <button
              onClick={handleDeleteClick}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300"
              role="menuitem"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
