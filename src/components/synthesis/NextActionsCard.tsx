'use client';

import { useState } from 'react';

export interface NextActionsCardProps {
  onCreateFollowUp?: (type: 'email' | 'intent', content: string) => void;
}

export function NextActionsCard({ onCreateFollowUp }: NextActionsCardProps) {
  const [showEmailDraft, setShowEmailDraft] = useState(false);
  const [emailContent, setEmailContent] = useState('');
  const [showIntentInput, setShowIntentInput] = useState(false);
  const [intentContent, setIntentContent] = useState('');

  const handleEmailCreate = () => {
    if (emailContent.trim()) {
      onCreateFollowUp?.('email', emailContent.trim());
      setEmailContent('');
      setShowEmailDraft(false);
    }
  };

  const handleIntentCreate = () => {
    if (intentContent.trim()) {
      onCreateFollowUp?.('intent', intentContent.trim());
      setIntentContent('');
      setShowIntentInput(false);
    }
  };

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-sm font-medium text-gray-500">
        Next Actions
      </h3>

      <div className="flex flex-col gap-3">
        {/* Email draft option */}
        {!showEmailDraft ? (
          <button
            onClick={() => setShowEmailDraft(true)}
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="text-lg">✉️</span>
            <div>
              <p className="font-medium text-gray-900">Draft follow-up email</p>
              <p className="text-sm text-gray-500">Summarize outcomes for attendees</p>
            </div>
          </button>
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Email summary
            </p>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Key points and action items from the meeting..."
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              rows={4}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleEmailCreate}
                disabled={!emailContent.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create Draft
              </button>
              <button
                onClick={() => {
                  setShowEmailDraft(false);
                  setEmailContent('');
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Follow-up intent option */}
        {!showIntentInput ? (
          <button
            onClick={() => setShowIntentInput(true)}
            className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <span className="text-lg">🎯</span>
            <div>
              <p className="font-medium text-gray-900">Create follow-up intent</p>
              <p className="text-sm text-gray-500">Set a reminder for next steps</p>
            </div>
          </button>
        ) : (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              What needs to happen next?
            </p>
            <input
              type="text"
              value={intentContent}
              onChange={(e) => setIntentContent(e.target.value)}
              placeholder="e.g., Follow up with Alice about timeline"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleIntentCreate}
                disabled={!intentContent.trim()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Create Intent
              </button>
              <button
                onClick={() => {
                  setShowIntentInput(false);
                  setIntentContent('');
                }}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
