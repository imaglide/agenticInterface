'use client';

export interface HotkeyHint {
  key: string;
  label: string;
}

export interface BottomHintBarProps {
  hotkeys: HotkeyHint[];
}

export function BottomHintBar({ hotkeys }: BottomHintBarProps) {
  return (
    <div className="border-t border-gray-800 bg-gray-900/80 px-4 py-3">
      <div className="mx-auto flex max-w-2xl items-center justify-center gap-6">
        {hotkeys.map((hint) => (
          <div key={hint.key} className="flex items-center gap-2">
            <kbd className="flex h-6 min-w-[24px] items-center justify-center rounded bg-gray-700 px-2 font-mono text-xs text-gray-300">
              {hint.key.toUpperCase()}
            </kbd>
            <span className="text-sm text-gray-500">{hint.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
