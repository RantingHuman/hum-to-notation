import { lazy, Suspense, useState } from 'react';
import { ViewToggle } from '../notation/ViewToggle';
import { NoteEditor } from '../notation/NoteEditor';
import { useProjectContext } from '../../context/ProjectContext';
import { useRecordingContext } from '../../context/RecordingContext';
import { usePlaybackContext } from '../../context/PlaybackContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { RecordStage } from './RecordButton';

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

const MAX_LAYERS = 2;

export function NotationDisplay({ notationContainerRef }: Props) {
  const { currentProject, selectedLayerId, addLayer } = useProjectContext();
  const { recordingState, startRecording } = useRecordingContext();
  const { playLayer, stop, playingLayerId } = usePlaybackContext();
  const [view, setView] = useState<View>('sheet');
  const [editing, setEditing] = useState(false);
  // Set when someone chooses to type notes into an empty layer instead of recording
  const [typingNotesLayerId, setTypingNotesLayerId] = useState<string | null>(null);

  if (!currentProject) return null;

  const layer = currentProject.layers.find((l) => l.id === selectedLayerId);
  const hasNotes = Boolean(layer?.notes.some((n) => !n.isRest));
  const isIdle = recordingState === 'idle';
  const typingNotes = layer !== undefined && typingNotesLayerId === layer.id;

  // Nothing to show yet, or a take in progress: lead with the record button
  if (!layer || !isIdle || (!hasNotes && !typingNotes)) {
    return (
      <div className="flex-1 bg-canvas flex flex-col min-h-0">
        <RecordStage onTypeNotes={() => { setTypingNotesLayerId(layer?.id ?? null); setEditing(true); }} />
      </div>
    );
  }

  const isPlaying = playingLayerId === layer.id;
  const canAddBass = currentProject.layers.length < MAX_LAYERS;

  return (
    <div className="flex-1 bg-canvas flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <ViewToggle view={view} onChange={setView} />
        <span className="text-ink-muted text-xs hidden sm:block">
          Scroll to see more →
        </span>
      </div>

      <div
        ref={notationContainerRef as React.RefObject<HTMLDivElement>}
        className="flex-1 bg-surface overflow-auto p-2 mx-4 rounded-2xl border border-line min-h-40"
      >
        <Suspense fallback={
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="md" color="border-line-strong" />
          </div>
        }>
          {view === 'sheet' ? <SheetMusicView /> : <TabView />}
        </Suspense>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 py-3 shrink-0">
        {!hasNotes ? null : isPlaying ? (
          <button
            onClick={stop}
            className="flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary hover:bg-primary-strong text-white font-display text-lg font-semibold"
          >
            <span className="w-3.5 h-3.5 bg-white rounded-sm" aria-hidden="true" />
            Stop
          </button>
        ) : (
          <button
            onClick={() => playLayer(layer.id)}
            className="flex items-center justify-center gap-2 min-h-12 px-6 rounded-xl bg-primary hover:bg-primary-strong text-white font-display text-lg font-semibold"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" /></svg>
            Play
          </button>
        )}
        <button
          onClick={() => { stop(); void startRecording(); }}
          title="Record this layer again. The current notes stay until the new take has notes."
          className="flex items-center gap-2 min-h-12 px-4 rounded-xl bg-surface border border-line hover:border-line-strong text-ink font-semibold"
        >
          <span className="w-3 h-3 rounded-full bg-danger" aria-hidden="true" />
          Redo
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            onClick={() => setEditing((current) => !current)}
            aria-expanded={editing}
            className={`min-h-12 px-4 rounded-xl font-semibold transition-colors ${
              editing ? 'bg-frost border border-peach text-ink' : 'bg-surface-muted hover:bg-surface-strong text-ink'
            }`}
          >
            {editing ? 'Done fixing' : 'Fix a wrong note'}
          </button>
          {canAddBass && (
            <button
              onClick={() => { stop(); setEditing(false); addLayer('bass'); }}
              className="min-h-12 px-4 rounded-xl font-semibold text-primary hover:bg-surface-muted"
            >
              + Add a bass line
            </button>
          )}
        </div>
      </div>

      {editing && <NoteEditor />}
    </div>
  );
}
