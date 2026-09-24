import type { Note } from '../types/music';

export const NOTE_EDITOR_GRID = 0.5;
const MIN_MIDI = 21;
const MAX_MIDI = 108;

type EditableNoteChanges = Partial<Pick<Note, 'midiNumber' | 'startBeat' | 'durationBeats'>>;

function snapToGrid(value: number): number {
  return Math.max(0, Math.round(value / NOTE_EDITOR_GRID) * NOTE_EDITOR_GRID);
}

function normalizeNote(note: Note): Note {
  return {
    ...note,
    midiNumber: note.isRest
      ? 0
      : Math.max(MIN_MIDI, Math.min(MAX_MIDI, Math.round(note.midiNumber))),
    startBeat: Number.isFinite(note.startBeat) ? snapToGrid(note.startBeat) : 0,
    durationBeats: Number.isFinite(note.durationBeats)
      ? Math.max(NOTE_EDITOR_GRID, snapToGrid(note.durationBeats))
      : NOTE_EDITOR_GRID,
  };
}

export function normalizeEditableNotes(notes: Note[]): Note[] {
  const sortedNotes = notes.map(normalizeNote).sort((left, right) => left.startBeat - right.startBeat);
  let previousEndBeat = 0;

  return sortedNotes.map((note, index) => {
    const startBeat = Math.max(note.startBeat, previousEndBeat);
    const nextStartBeat = sortedNotes[index + 1]?.startBeat;
    const availableBeforeNext = nextStartBeat === undefined
      ? note.durationBeats
      : nextStartBeat - startBeat;
    const durationBeats = Math.max(
      NOTE_EDITOR_GRID,
      Math.min(note.durationBeats, availableBeforeNext >= NOTE_EDITOR_GRID
        ? availableBeforeNext
        : note.durationBeats)
    );

    previousEndBeat = startBeat + durationBeats;
    return { ...note, startBeat, durationBeats };
  });
}

export function updateNoteAt(
  notes: Note[],
  index: number,
  changes: EditableNoteChanges
): Note[] {
  if (index < 0 || index >= notes.length) return notes;

  const updatedNotes = notes.map((note, noteIndex) => {
    if (noteIndex !== index) return note;
    const updatedNote = { ...note, ...changes };
    if (changes.midiNumber !== undefined && !updatedNote.isRest) {
      updatedNote.detectedFrequency = undefined;
    }
    return updatedNote;
  });

  return normalizeEditableNotes(updatedNotes);
}

export function appendNote(notes: Note[]): Note[] {
  const normalizedNotes = normalizeEditableNotes(notes);
  const lastNote = normalizedNotes[normalizedNotes.length - 1];
  const startBeat = lastNote
    ? lastNote.startBeat + lastNote.durationBeats
    : 0;

  return normalizeEditableNotes([
    ...normalizedNotes,
    { midiNumber: 60, startBeat, durationBeats: NOTE_EDITOR_GRID },
  ]);
}

export function deleteNoteAt(notes: Note[], index: number): Note[] {
  if (index < 0 || index >= notes.length) return notes;
  return normalizeEditableNotes(notes.filter((_, noteIndex) => noteIndex !== index));
}
