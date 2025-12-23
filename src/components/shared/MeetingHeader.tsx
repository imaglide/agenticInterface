'use client';

export interface MeetingHeaderProps {
  title: string;
  startTime: number;
  endTime?: number;
  attendees?: string[];
  location?: string;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const minutes = Math.round(diff / 60000);

  if (minutes < 0) {
    const pastMinutes = Math.abs(minutes);
    if (pastMinutes < 60) return `${pastMinutes}m ago`;
    return `${Math.round(pastMinutes / 60)}h ago`;
  }
  if (minutes === 0) return 'now';
  if (minutes < 60) return `in ${minutes}m`;
  return `in ${Math.round(minutes / 60)}h`;
}

export function MeetingHeader({
  title,
  startTime,
  endTime,
  attendees = [],
  location,
}: MeetingHeaderProps) {
  const isLive = Date.now() >= startTime && (!endTime || Date.now() < endTime);
  const isPast = endTime && Date.now() >= endTime;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
                Live
              </span>
            )}
            {isPast && (
              <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Ended
              </span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {formatTime(startTime)}
            {endTime && ` – ${formatTime(endTime)}`}
            {!isPast && (
              <span className="ml-2 text-gray-400">
                ({formatRelativeTime(startTime)})
              </span>
            )}
          </p>
        </div>
      </div>

      {(attendees.length > 0 || location) && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
          {attendees.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">👥</span>
              <span>
                {attendees.slice(0, 3).join(', ')}
                {attendees.length > 3 && ` +${attendees.length - 3}`}
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">📍</span>
              <span>{location}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
