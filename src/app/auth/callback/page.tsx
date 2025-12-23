'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { handleOAuthCallback } from '@/calendar/oauth';
import { isCalendarError } from '@/calendar/types';

/**
 * OAuth callback content component.
 */
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    async function processCallback() {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setErrorMessage(
          error === 'access_denied'
            ? 'You declined calendar access. You can try again anytime.'
            : `OAuth error: ${error}`
        );
        return;
      }

      // Validate required params
      if (!code || !state) {
        setStatus('error');
        setErrorMessage('Missing authorization code or state');
        return;
      }

      try {
        // Exchange code for tokens
        await handleOAuthCallback(code, state);
        setStatus('success');

        // Redirect to home after short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (err) {
        console.error('OAuth callback failed:', err);
        setStatus('error');

        if (isCalendarError(err)) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage('Failed to complete authentication');
        }
      }
    }

    processCallback();
  }, [searchParams, router]);

  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      {status === 'processing' && (
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">
            Connecting your calendar...
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Please wait while we complete the setup.
          </p>
        </div>
      )}

      {status === 'success' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Calendar Connected!
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Redirecting you back to the app...
          </p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Connection Failed
          </h2>
          <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Return to App
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Loading fallback for Suspense.
 */
function LoadingFallback() {
  return (
    <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
      </div>
    </div>
  );
}

/**
 * OAuth callback page.
 * Handles the redirect from Google after user authorizes.
 */
export default function AuthCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Suspense fallback={<LoadingFallback />}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
