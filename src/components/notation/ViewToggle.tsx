type View = 'sheet' | 'tab';

interface Props {
  view: View;
  onChange: (v: View) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-line text-sm">
      <button
        onClick={() => onChange('sheet')}
        className={`px-4 py-1.5 transition-colors ${
          view === 'sheet'
            ? 'bg-primary text-white'
            : 'bg-surface-muted text-ink hover:bg-surface-strong'
        }`}
      >
        🎼 Sheet Music
      </button>
      <button
        onClick={() => onChange('tab')}
        className={`px-4 py-1.5 transition-colors ${
          view === 'tab'
            ? 'bg-primary text-white'
            : 'bg-surface-muted text-ink hover:bg-surface-strong'
        }`}
      >
        🎸 Tab
      </button>
    </div>
  );
}
