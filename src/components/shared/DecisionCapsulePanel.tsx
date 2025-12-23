'use client';

import { useState } from 'react';
import { DecisionCapsule, Mode } from '@/types/ui-plan';

export interface DecisionCapsulePanelProps {
  capsule: DecisionCapsule;
  onAction?: (action: { type: string; target?: Mode }) => void;
}

const confidenceColors = {
  HIGH: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-amber-100 text-amber-800',
  LOW: 'bg-gray-100 text-gray-600',
};

export function DecisionCapsulePanel({
  capsule,
  onAction,
}: DecisionCapsulePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-gray-600 shadow-lg transition hover:bg-gray-50"
      >
        <span className="text-gray-400">?</span>
        Why this view?
      </button>

      {/* Slide-over panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="fixed bottom-0 right-0 top-0 z-50 w-full max-w-md overflow-y-auto bg-white shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Why this view?
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* View label and confidence */}
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {capsule.viewLabel}
                  </h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${confidenceColors[capsule.confidence]}`}>
                    {capsule.confidence}
                  </span>
                </div>
                <p className="mt-2 text-gray-600">{capsule.reason}</p>
              </div>

              {/* Signals used */}
              <div className="mb-6">
                <h4 className="mb-2 text-sm font-medium text-gray-500">
                  Signals used
                </h4>
                <ul className="space-y-1">
                  {capsule.signalsUsed.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1 text-green-500">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Alternatives considered */}
              {capsule.alternativesConsidered.length > 0 && (
                <div className="mb-6">
                  <h4 className="mb-2 text-sm font-medium text-gray-500">
                    Alternatives considered
                  </h4>
                  <ul className="space-y-2">
                    {capsule.alternativesConsidered.map((alt, i) => (
                      <li key={i} className="rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span className="font-medium text-gray-700">
                          {alt.mode.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-500"> — {alt.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Would change if */}
              <div className="mb-6">
                <h4 className="mb-2 text-sm font-medium text-gray-500">
                  Would change if
                </h4>
                <ul className="space-y-1">
                  {capsule.wouldChangeIf.map((condition, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1 text-amber-500">→</span>
                      {condition}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Actions */}
              {capsule.actions.length > 0 && (
                <div className="border-t pt-6">
                  <h4 className="mb-3 text-sm font-medium text-gray-500">
                    Actions
                  </h4>
                  <div className="flex flex-col gap-2">
                    {capsule.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onAction?.(action);
                          setIsOpen(false);
                        }}
                        className="rounded-lg border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 transition hover:border-blue-300 hover:bg-blue-50"
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
