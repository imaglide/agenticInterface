'use client';

/**
 * Linking Context
 *
 * Provides linking mode state and operations to components throughout the app.
 * Wraps the useLinkingMode hook and integrates with WorkLink API.
 */

import { createContext, useContext, ReactNode, useCallback } from 'react';
import { toast } from 'sonner';
import {
  useLinkingMode,
  LinkingModeStatus,
  LinkingModeConfig,
} from '@/hooks/use-linking-mode';
import { createWorkLink, LinkValidationError } from '@/storage/work-object-api';
import type { LinkType } from '@/storage/work-object-types';

interface LinkingContextValue {
  /** Current linking mode status */
  status: LinkingModeStatus;
  /** Start linking mode with a specific link type (from action menu) */
  startLinking: (sourceId: string, linkType: LinkType) => void;
  /** Select target to complete the link */
  selectTarget: (targetId: string) => Promise<boolean>;
  /** Cancel linking mode */
  cancel: () => void;
  /** Reset timeout timer on user activity */
  resetTimeout: () => void;
}

const LinkingContext = createContext<LinkingContextValue | null>(null);

interface LinkingProviderProps {
  children: ReactNode;
  config?: Partial<LinkingModeConfig>;
  onLinkCreated?: (sourceId: string, targetId: string, linkType: LinkType) => void;
}

export function LinkingProvider({
  children,
  config,
  onLinkCreated,
}: LinkingProviderProps) {
  const {
    status,
    startLinking: hookStartLinking,
    selectTarget: hookSelectTarget,
    cancel,
    resetTimeout,
  } = useLinkingMode(config);

  // Combined start linking: sets both type and source in one action
  // This is called from WorkObjectActionMenu "Link to..." submenu
  const startLinking = useCallback(
    (sourceId: string, linkType: LinkType) => {
      // Pass sourceId directly to hook for atomic state transition
      hookStartLinking(linkType, sourceId);
    },
    [hookStartLinking]
  );

  // Select target and create the link
  const selectTarget = useCallback(
    async (targetId: string): Promise<boolean> => {
      const result = hookSelectTarget(targetId);
      if (!result) {
        return false;
      }

      try {
        await createWorkLink(result.sourceId, result.targetId, result.linkType);
        toast.success('Link created');
        onLinkCreated?.(result.sourceId, result.targetId, result.linkType);
        return true;
      } catch (error) {
        if (error instanceof LinkValidationError) {
          toast.error(`Cannot create link: ${error.message}`);
        } else {
          toast.error('Failed to create link');
          console.error('Link creation failed:', error);
        }
        return false;
      }
    },
    [hookSelectTarget, onLinkCreated]
  );

  return (
    <LinkingContext.Provider
      value={{
        status,
        startLinking,
        selectTarget,
        cancel,
        resetTimeout,
      }}
    >
      {children}
    </LinkingContext.Provider>
  );
}

export function useLinkingContext() {
  return useContext(LinkingContext);
}
