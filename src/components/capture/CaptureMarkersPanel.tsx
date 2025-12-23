'use client';

import { useState, useCallback } from 'react';

export type MarkerType = 'decision' | 'action' | 'risk' | 'question';

export interface Marker {
  id: string;
  type: MarkerType;
  label?: string;
  timestamp: number;
}

export interface CaptureMarkersPanelProps {
  markers?: Marker[];
  onMarkerCreate?: (type: MarkerType, label?: string) => void;
}

const markerConfig: Record<MarkerType, { label: string; color: string; hotkey: string }> = {
  decision: { label: 'Decision', color: 'bg-purple-600 hover:bg-purple-700', hotkey: 'D' },
  action: { label: 'Action', color: 'bg-blue-600 hover:bg-blue-700', hotkey: 'A' },
  risk: { label: 'Risk', color: 'bg-amber-600 hover:bg-amber-700', hotkey: 'R' },
  question: { label: 'Question', color: 'bg-emerald-600 hover:bg-emerald-700', hotkey: 'Q' },
};

export function CaptureMarkersPanel({
  markers = [],
  onMarkerCreate,
}: CaptureMarkersPanelProps) {
  const [showLabelInput, setShowLabelInput] = useState<MarkerType | null>(null);
  const [labelValue, setLabelValue] = useState('');

  const handleMarkerClick = useCallback((type: MarkerType) => {
    setShowLabelInput(type);
    setLabelValue('');
  }, []);

  const handleLabelSubmit = useCallback(() => {
    if (showLabelInput) {
      onMarkerCreate?.(showLabelInput, labelValue.trim() || undefined);
      setShowLabelInput(null);
      setLabelValue('');
    }
  }, [showLabelInput, labelValue, onMarkerCreate]);

  const handleLabelSkip = useCallback(() => {
    if (showLabelInput) {
      onMarkerCreate?.(showLabelInput, undefined);
      setShowLabelInput(null);
      setLabelValue('');
    }
  }, [showLabelInput, onMarkerCreate]);

  // Count markers by type
  const markerCounts = markers.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {} as Record<MarkerType, number>);

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-8">
      {/* Main marker buttons */}
      <div className="grid grid-cols-2 gap-4">
        {(Object.keys(markerConfig) as MarkerType[]).map((type) => {
          const config = markerConfig[type];
          const count = markerCounts[type] || 0;

          return (
            <button
              key={type}
              onClick={() => handleMarkerClick(type)}
              className={`relative flex h-24 w-32 flex-col items-center justify-center rounded-xl ${config.color} text-white shadow-lg transition-transform active:scale-95`}
            >
              <span className="text-lg font-semibold">{config.label}</span>
              <span className="mt-1 text-xs opacity-75">Press {config.hotkey}</span>
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-900">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Label input overlay */}
      {showLabelInput && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded-xl bg-gray-800 p-6 shadow-2xl">
            <p className="mb-3 text-sm text-gray-400">
              Add a quick label (optional)
            </p>
            <input
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value.slice(0, 50))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLabelSubmit();
                if (e.key === 'Escape') handleLabelSkip();
              }}
              placeholder="3-5 words..."
              className="w-full rounded-lg bg-gray-700 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              maxLength={50}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleLabelSkip}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2 text-gray-300 hover:bg-gray-600"
              >
                Skip
              </button>
              <button
                onClick={handleLabelSubmit}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recent markers */}
      {markers.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">
            Recent
          </p>
          <div className="flex flex-col gap-1">
            {markers.slice(-5).reverse().map((marker) => (
              <div
                key={marker.id}
                className="flex items-center gap-3 rounded-lg bg-gray-800/50 px-3 py-2"
              >
                <span className={`h-2 w-2 rounded-full ${markerConfig[marker.type].color.split(' ')[0]}`} />
                <span className="text-sm text-gray-400">
                  {marker.label || markerConfig[marker.type].label}
                </span>
                <span className="ml-auto text-xs text-gray-600">
                  {new Date(marker.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
