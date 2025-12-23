'use client';

import { useState, useCallback } from 'react';

export interface NeutralIntentSetterProps {
  onIntentSubmit?: (intent: string) => void;
  placeholder?: string;
}

export function NeutralIntentSetter({
  onIntentSubmit,
  placeholder = "What do you want to focus on?",
}: NeutralIntentSetterProps) {
  const [intent, setIntent] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (intent.trim() && onIntentSubmit) {
      onIntentSubmit(intent.trim());
      setIntent('');
    }
  }, [intent, onIntentSubmit]);

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-gray-900">
        What's on your mind?
      </h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <button
          type="submit"
          disabled={!intent.trim()}
          className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Set Intent
        </button>
      </form>
    </div>
  );
}
