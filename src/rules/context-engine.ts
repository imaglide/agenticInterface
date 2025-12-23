/**
 * Context Engine
 *
 * Computes meeting context from calendar events.
 * Determines current, next, and last meeting states.
 */

import {
  CalendarEvent,
  MeetingContext,
  TimingConfig,
  DEFAULT_TIMING_CONFIG,
} from './types';

/**
 * Compute meeting context from calendar events.
 *
 * @param events - Array of calendar events
 * @param now - Current timestamp (allows override for testing)
 * @param config - Timing configuration
 * @returns Meeting context with current/next/last meetings
 */
export function computeMeetingContext(
  events: CalendarEvent[],
  now: number = Date.now(),
  config: TimingConfig = DEFAULT_TIMING_CONFIG
): MeetingContext {
  const { prepWindowMinutes, synthesisWindowMinutes, meetingGraceMinutes } = config;

  const prepWindowMs = prepWindowMinutes * 60 * 1000;
  const synthesisWindowMs = synthesisWindowMinutes * 60 * 1000;
  const graceMs = meetingGraceMinutes * 60 * 1000;

  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

  let currentMeeting: CalendarEvent | null = null;
  let nextMeeting: CalendarEvent | null = null;
  let lastMeeting: CalendarEvent | null = null;

  for (const event of sortedEvents) {
    const startWithGrace = event.startTime - graceMs;
    const endWithGrace = event.endTime + graceMs;

    // Check if meeting is currently live (with grace period)
    if (now >= startWithGrace && now <= endWithGrace) {
      currentMeeting = event;
    }
    // Check if meeting is within prep window (upcoming)
    else if (
      event.startTime > now &&
      event.startTime <= now + prepWindowMs
    ) {
      // Take the nearest upcoming meeting
      if (!nextMeeting || event.startTime < nextMeeting.startTime) {
        nextMeeting = event;
      }
    }
    // Check if meeting is within synthesis window (recently ended)
    else if (
      event.endTime < now &&
      event.endTime >= now - synthesisWindowMs
    ) {
      // Take the most recently ended meeting
      if (!lastMeeting || event.endTime > lastMeeting.endTime) {
        lastMeeting = event;
      }
    }
  }

  return {
    currentMeeting,
    nextMeeting,
    lastMeeting,
    now,
  };
}

/**
 * Check if a meeting is about to start (within grace period).
 */
export function isMeetingStarting(
  event: CalendarEvent,
  now: number,
  graceMinutes: number = 2
): boolean {
  const graceMs = graceMinutes * 60 * 1000;
  return now >= event.startTime - graceMs && now < event.startTime;
}

/**
 * Check if a meeting just ended (within grace period).
 */
export function isMeetingEnding(
  event: CalendarEvent,
  now: number,
  graceMinutes: number = 2
): boolean {
  const graceMs = graceMinutes * 60 * 1000;
  return now > event.endTime && now <= event.endTime + graceMs;
}

/**
 * Get time until meeting starts.
 */
export function getTimeUntilMeeting(event: CalendarEvent, now: number): number {
  return Math.max(0, event.startTime - now);
}

/**
 * Get time since meeting ended.
 */
export function getTimeSinceMeetingEnded(event: CalendarEvent, now: number): number {
  return Math.max(0, now - event.endTime);
}

/**
 * Format duration in human-readable form.
 */
export function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMinutes} min`;
}
