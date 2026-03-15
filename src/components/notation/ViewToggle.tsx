type View = 'sheet' | 'tab';

interface Props {
  view: View;
  onChange: (v: View) => void;
}

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-600 text-sm">
      <button
        onClick={() => onChange('sheet')}
        className={`px-4 py-1.5 transition-colors ${
          view === 'sheet'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        🎼 Sheet Music
      </button>
      <button
        onClick={() => onChange('tab')}
        className={`px-4 py-1.5 transition-colors ${
          view === 'tab'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        🎸 Tab
      </button>
    </div>
  );
}
