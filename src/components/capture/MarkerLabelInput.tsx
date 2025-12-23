'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { MarkerType } from './CaptureMarkersPanel';

export interface MarkerLabelInputProps {
  markerType: MarkerType;
  onSubmit?: (label: string) => void;
  onCancel?: () => void;
}

const markerLabels: Record<MarkerType, string> = {
  decision: 'Decision',
  action: 'Action',
  risk: 'Risk',
  question: 'Question',
};

export function MarkerLabelInput({
  markerType,
  onSubmit,
  onCancel,
}: MarkerLabelInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    onSubmit?.(value.trim());
  }, [value, onSubmit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  }, [handleSubmit, onCancel]);

  return (
    <div className="fixed bottom-20 left-1/2 w-80 -translate-x-1/2 rounded-xl bg-gray-800 p-4 shadow-2xl">
      <p className="mb-2 text-xs text-gray-400">
        Label this {markerLabels[markerType].toLowerCase()} (optional)
      </p>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 50))}
        onKeyDown={handleKeyDown}
        placeholder="3-5 words..."
        className="w-full rounded-lg bg-gray-700 px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        maxLength={50}
      />
      <div className="mt-3 flex gap-2 text-sm">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg bg-gray-700 py-2 text-gray-300 hover:bg-gray-600"
        >
          Skip (Esc)
        </button>
        <button
          onClick={handleSubmit}
          className="flex-1 rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700"
        >
          Save (Enter)
        </button>
      </div>
    </div>
  );
}
