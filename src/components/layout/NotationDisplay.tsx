import { lazy, Suspense, useState } from 'react';
import { ViewToggle } from '../notation/ViewToggle';
import { NoteEditor } from '../notation/NoteEditor';
import { useProjectContext } from '../../context/ProjectContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

const SheetMusicView = lazy(() =>
  import('../notation/SheetMusicView').then((m) => ({ default: m.SheetMusicView }))
);
const TabView = lazy(() =>
  import('../notation/TabView').then((m) => ({ default: m.TabView }))
);

type View = 'sheet' | 'tab';

interface Props {
  notationContainerRef: React.RefObject<HTMLElement | null>;
}

export function NotationDisplay({ notationContainerRef }: Props) {
  const { currentProject } = useProjectContext();
  const [view, setView] = useState<View>('sheet');

  if (!currentProject) return null;

  return (
    <div className="flex-1 bg-gray-900 flex flex-col min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700 shrink-0">
        <ViewToggle view={view} onChange={setView} />
        <span className="text-gray-500 text-xs hidden sm:block">
          Scroll horizontally to see more →
        </span>
      </div>

      {/* Notation area */}
      <div
        ref={notationContainerRef as React.RefObject<HTMLDivElement>}
        className="flex-1 bg-white overflow-auto p-2"
      >
        <Suspense fallback={
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" color="border-gray-400" />
          </div>
        }>
          {view === 'sheet' ? <SheetMusicView /> : <TabView />}
        </Suspense>
      </div>

      <NoteEditor />
    </div>
  );
}

