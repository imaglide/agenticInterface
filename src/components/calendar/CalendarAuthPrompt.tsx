'use client';

import { useState } from 'react';
import { useCalendar } from '@/calendar/use-calendar';

/**
 * Calendar authentication prompt.
 * Shown when user needs to connect their Google Calendar.
 */
export function CalendarAuthPrompt() {
  const { signIn, isAuthenticated } = useCalendar();
  const [isConnecting, setIsConnecting] = useState(false);

  if (isAuthenticated) {
    return null;
  }

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await signIn();
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
      <div className="mb-4 flex items-center justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <svg
            className="h-6 w-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>

      <h2 className="mb-2 text-center text-xl font-semibold text-gray-900">
        Connect Your Calendar
      </h2>

      <p className="mb-6 text-center text-sm text-gray-600">
        Connect your Google Calendar to get personalized meeting assistance.
        We only request read-only access.
      </p>

      <button
        onClick={handleConnect}
        disabled={isConnecting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <svg className="h-5 w-5 animate-spin\" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Connecting...
          </>
        ) : (
          <>
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Connect Google Calendar
          </>
        )}
      </button>

      <p className="mt-4 text-center text-xs text-gray-500">
        Your calendar data stays on your device.
        <br />
        No data is sent to our servers.
      </p>
    </div>
  );
}

/**
 * Compact calendar status indicator.
 * Shows connection status and allows reconnecting.
 */
export function CalendarStatusIndicator() {
  const { isAuthenticated, signIn, signOut, snapshotInfo, error } = useCalendar();

  if (!isAuthenticated) {
    return (
      <button
        onClick={signIn}
        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Connect Calendar
      </button>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-600">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        Calendar unavailable
      </div>
    );
  }

  return (
    <div className="group relative flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-sm text-green-700">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 13l4 4L19 7"
        />
      </svg>
      <span>
        {snapshotInfo.eventCount} events
        {snapshotInfo.isStale && ' (stale)'}
      </span>

      {/* Dropdown on hover */}
      <div className="absolute right-0 top-full z-10 mt-1 hidden w-48 rounded-lg bg-white p-2 shadow-lg group-hover:block">
        <p className="mb-2 text-xs text-gray-500">
          Last updated: {snapshotInfo.cacheAge || 'Never'}
        </p>
        <button
          onClick={signOut}
          className="w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50"
        >
          Disconnect Calendar
        </button>
      </div>
    </div>
  );
}
