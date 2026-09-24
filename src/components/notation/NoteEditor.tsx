import { useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { midiToNoteName } from '../../utils/noteUtils';
import {
  appendNote,
  deleteNoteAt,
  NOTE_EDITOR_GRID,
  updateNoteAt,
} from '../../utils/noteEditorUtils';
import {
  commitNoteHistory,
  createNoteHistory,
  redoNoteHistory,
  undoNoteHistory,
} from '../../utils/noteHistory';

function formatBeat(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function NoteEditor() {
  const {
    currentProject,
    selectedLayerId,
    updateLayerNotes,
  } = useProjectContext();
  const selectedLayer = currentProject?.layers.find((layer) => layer.id === selectedLayerId);
  const notes = selectedLayer?.notes ?? [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState(() => createNoteHistory(notes));
  const lastAppliedNotesRef = useRef<typeof notes | null>(null);

  useEffect(() => {
    setSelectedIndex((current) => Math.min(current, Math.max(0, notes.length - 1)));
  }, [selectedLayerId, notes.length]);

  useEffect(() => {
    if (lastAppliedNotesRef.current === notes) {
      lastAppliedNotesRef.current = null;
      return;
    }
    setHistory(createNoteHistory(notes));
  }, [selectedLayerId, notes]);

  if (!selectedLayer) return null;

  const applyNotes = (nextNotes: typeof notes) => {
    lastAppliedNotesRef.current = nextNotes;
    setHistory((current) => commitNoteHistory(current, nextNotes));
    updateLayerNotes(selectedLayer.id, nextNotes);
  };

  const handleUndo = () => {
    const nextHistory = undoNoteHistory(history);
    if (nextHistory === history) return;
    lastAppliedNotesRef.current = nextHistory.present;
    setHistory(nextHistory);
    updateLayerNotes(selectedLayer.id, nextHistory.present);
  };

  const handleRedo = () => {
    const nextHistory = redoNoteHistory(history);
    if (nextHistory === history) return;
    lastAppliedNotesRef.current = nextHistory.present;
    setHistory(nextHistory);
    updateLayerNotes(selectedLayer.id, nextHistory.present);
  };

  const changeNote = (index: number, changes: Parameters<typeof updateNoteAt>[2]) => {
    const nextNotes = updateNoteAt(notes, index, changes);
    applyNotes(nextNotes);
    setSelectedIndex(Math.min(index, Math.max(0, nextNotes.length - 1)));
  };

  const handleAddNote = () => {
    const nextNotes = appendNote(notes);
    applyNotes(nextNotes);
    setSelectedIndex(nextNotes.length - 1);
  };

  const handleDeleteNote = (index: number) => {
    const nextNotes = deleteNoteAt(notes, index);
    applyNotes(nextNotes);
    setSelectedIndex(Math.min(index, Math.max(0, nextNotes.length - 1)));
  };

  return (
    <section className="bg-gray-800 border-t border-gray-700 px-3 py-3 shrink-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 className="text-white text-sm font-semibold">Review notes</h2>
          <p className="text-gray-500 text-xs">Correct pitch and timing before export</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.past.length === 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-2 py-1.5 rounded min-h-8"
            title="Undo last note edit"
          >
            Undo
          </button>
          <button
            onClick={handleRedo}
            disabled={history.future.length === 0}
            className="bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs px-2 py-1.5 rounded min-h-8"
            title="Redo note edit"
          >
            Redo
          </button>
          <button
            onClick={handleAddNote}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded min-h-8"
          >
            + Add note
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-400 text-xs py-2">No notes yet. Add one manually or record a layer.</p>
      ) : (
        <div className="overflow-x-auto max-h-52">
          <div className="min-w-160 space-y-1">
            <div className="grid grid-cols-[2.5rem_5rem_6rem_6rem_1fr] gap-2 px-2 text-gray-500 text-[10px] uppercase tracking-wide">
              <span>#</span>
              <span>Pitch</span>
              <span>Start beat</span>
              <span>Duration</span>
              <span>Adjust</span>
            </div>
            {notes.map((note, index) => {
              const isSelected = selectedIndex === index;
              const isRest = Boolean(note.isRest);
              return (
                <div
                  key={`${note.startBeat}-${index}`}
                  onClick={() => setSelectedIndex(index)}
                  className={`grid grid-cols-[2.5rem_5rem_6rem_6rem_1fr] items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer ${
                    isSelected ? 'bg-purple-900/50 ring-1 ring-purple-500' : 'bg-gray-700/70 hover:bg-gray-700'
                  }`}
                >
                  <span className="text-gray-400">{index + 1}</span>
                  <span className={isRest ? 'text-gray-400' : 'text-white font-medium'}>
                    {isRest ? 'Rest' : midiToNoteName(note.midiNumber)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step={NOTE_EDITOR_GRID}
                    value={formatBeat(note.startBeat)}
                    onChange={(event) => changeNote(index, { startBeat: Number(event.target.value) })}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Start beat for note ${index + 1}`}
                    className="w-20 bg-gray-900 text-white border border-gray-600 rounded px-1.5 py-1 focus:border-purple-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    min={NOTE_EDITOR_GRID}
                    step={NOTE_EDITOR_GRID}
                    value={formatBeat(note.durationBeats)}
                    onChange={(event) => changeNote(index, { durationBeats: Number(event.target.value) })}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Duration for note ${index + 1}`}
                    className="w-20 bg-gray-900 text-white border border-gray-600 rounded px-1.5 py-1 focus:border-purple-500 focus:outline-none"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        changeNote(index, { midiNumber: note.midiNumber - 1 });
                      }}
                      disabled={isRest}
                      className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-30 text-white"
                      title="Lower pitch by one semitone"
                      aria-label={`Lower pitch for note ${index + 1}`}
                    >
                      -
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        changeNote(index, { midiNumber: note.midiNumber + 1 });
                      }}
                      disabled={isRest}
                      className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-30 text-white"
                      title="Raise pitch by one semitone"
                      aria-label={`Raise pitch for note ${index + 1}`}
                    >
                      +
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteNote(index);
                      }}
                      className="w-7 h-7 rounded bg-gray-600 hover:bg-red-700 text-gray-300 hover:text-white"
                      title="Delete note"
                      aria-label={`Delete note ${index + 1}`}
                    >
                      x
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
