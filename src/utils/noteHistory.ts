import type { Note } from '../types/music';

const MAX_HISTORY_LENGTH = 50;

export interface NoteHistory {
  past: Note[][];
  present: Note[];
  future: Note[][];
}

export function createNoteHistory(notes: Note[]): NoteHistory {
  return { past: [], present: notes, future: [] };
}

export function commitNoteHistory(history: NoteHistory, notes: Note[]): NoteHistory {
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY_LENGTH),
    present: notes,
    future: [],
  };
}

export function undoNoteHistory(history: NoteHistory): NoteHistory {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;

  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoNoteHistory(history: NoteHistory): NoteHistory {
  const next = history.future[0];
  if (!next) return history;

  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY_LENGTH),
    present: next,
    future: history.future.slice(1),
  };
}
