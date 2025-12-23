/**
 * Split Layout
 *
 * Two-column layout used for Meeting Prep mode.
 * Context/info on left, actions/input on right.
 */

import { ReactNode, Children, isValidElement } from 'react';

interface SplitLayoutProps {
  children: ReactNode;
}

/**
 * Split layout divides children into two columns.
 * First half of children go left, second half go right.
 * If odd number, extra child goes to left column.
 */
export function SplitLayout({ children }: SplitLayoutProps) {
  const childArray = Children.toArray(children).filter(isValidElement);
  const midpoint = Math.ceil(childArray.length / 2);
  const leftChildren = childArray.slice(0, midpoint);
  const rightChildren = childArray.slice(midpoint);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Left column: context */}
          <div className="flex flex-col gap-6">
            {leftChildren}
          </div>
          {/* Right column: actions */}
          <div className="flex flex-col gap-6">
            {rightChildren}
          </div>
        </div>
      </main>
    </div>
  );
}
