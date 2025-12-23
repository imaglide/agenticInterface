/**
 * Stack Layout
 *
 * Single column layout used for Neutral/Intent and Synthesis modes.
 * Components stack vertically with consistent spacing.
 */

import { ReactNode } from 'react';

interface StackLayoutProps {
  children: ReactNode;
}

export function StackLayout({ children }: StackLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  );
}
