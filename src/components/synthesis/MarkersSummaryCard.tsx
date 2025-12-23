'use client';

import { Marker, MarkerType } from '@/components/capture/CaptureMarkersPanel';

export interface MarkersSummaryCardProps {
  markers: Marker[];
}

const markerConfig: Record<MarkerType, { label: string; pluralLabel: string; color: string }> = {
  decision: { label: 'Decision', pluralLabel: 'Decisions', color: 'bg-purple-100 text-purple-800' },
  action: { label: 'Action', pluralLabel: 'Actions', color: 'bg-blue-100 text-blue-800' },
  risk: { label: 'Risk', pluralLabel: 'Risks', color: 'bg-amber-100 text-amber-800' },
  question: { label: 'Question', pluralLabel: 'Questions', color: 'bg-emerald-100 text-emerald-800' },
};

export function MarkersSummaryCard({ markers }: MarkersSummaryCardProps) {
  // Group markers by type
  const grouped = markers.reduce((acc, marker) => {
    if (!acc[marker.type]) {
      acc[marker.type] = [];
    }
    acc[marker.type].push(marker);
    return acc;
  }, {} as Record<MarkerType, Marker[]>);

  const typeOrder: MarkerType[] = ['decision', 'action', 'risk', 'question'];

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-500">
        Meeting Markers ({markers.length})
      </h3>

      {markers.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          No markers captured during this meeting
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {typeOrder.map((type) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;

            const config = markerConfig[type];

            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
                    {items.length} {items.length === 1 ? config.label : config.pluralLabel}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {items.map((marker) => (
                    <div
                      key={marker.id}
                      className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="text-sm text-gray-700">
                        {marker.label || `Unmarked ${config.label.toLowerCase()}`}
                      </span>
                      <span className="ml-auto text-xs text-gray-400">
                        {new Date(marker.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
