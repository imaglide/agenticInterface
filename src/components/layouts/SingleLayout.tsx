/**
 * Single Layout
 *
 * Minimal canvas layout used for Meeting Capture mode.
 * Full-width, distraction-free interface for in-meeting use.
 */

import { ReactNode } from 'react';

interface SingleLayoutProps {
  children: ReactNode;
}

export function SingleLayout({ children }: SingleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <main className="flex min-h-screen flex-col">
        {children}
      </main>
    </div>
  );
}
