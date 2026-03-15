import type { Note, RawPitchEvent, TimeSignature } from '../types/music';
import { frequencyToMidi } from '../utils/noteUtils';
import { MIN_NOTE_DURATION_MS, SILENCE_GAP_MS } from '../constants/music';

// ── Internal types ─────────────────────────────────────────────────────────────

interface Segment {
  midiNumber: number;
  startMs: number;
  endMs: number;
  frequencies: number[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function snapToGrid(beat: number, gridSize: number): number {
  return Math.round(beat / gridSize) * gridSize;
}

/** Snap a raw duration to the nearest "nice" duration in beats. */
function snapDuration(raw: number): number {
  const options = [0.5, 1, 1.5, 2, 3, 4];
  return options.reduce((best, opt) =>
    Math.abs(opt - raw) < Math.abs(best - raw) ? opt : best
  );
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// ── Main export ────────────────────────────────────────────────────────────────

export function quantizeToNotes(
  rawEvents: RawPitchEvent[],
  tempo: number,
  timeSignature: TimeSignature
): Note[] {
  if (rawEvents.length === 0) return [];

  // ── Step 1: group consecutive frames into pitch segments ──────────────────

  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const event of rawEvents) {
    const midi = frequencyToMidi(event.frequency);

    if (!current) {
      current = {
        midiNumber: midi,
        startMs: event.timestamp,
        endMs: event.timestamp,
        frequencies: [event.frequency],
      };
      continue;
    }

    const gap = event.timestamp - current.endMs;
    const midiDiff = Math.abs(midi - current.midiNumber);

    if (gap <= SILENCE_GAP_MS + 50 && midiDiff <= 1) {
      // Same note — extend segment
      current.endMs = event.timestamp;
      current.frequencies.push(event.frequency);
      // Keep median MIDI number as we accumulate more samples
      current.midiNumber = frequencyToMidi(median(current.frequencies));
    } else {
      // Different note or silence gap — close current, start new
      segments.push(current);
      current = {
        midiNumber: midi,
        startMs: event.timestamp,
        endMs: event.timestamp,
        frequencies: [event.frequency],
      };
    }
  }
  if (current) segments.push(current);

  // ── Step 2: discard blips shorter than MIN_NOTE_DURATION_MS ──────────────

  const valid = segments.filter(
    (s) => s.endMs - s.startMs >= MIN_NOTE_DURATION_MS
  );
  if (valid.length === 0) return [];

  // ── Step 3 & 4: convert ms → beats, snap to 8th-note grid ─────────────────

  const secondsPerBeat = 60 / tempo;
  const msPerBeat = secondsPerBeat * 1000;
  const beatsPerMeasure = timeSignature.numerator;
  const GRID = 0.5; // 8th-note resolution

  const notes: Note[] = [];

  for (const seg of valid) {
    const startBeatRaw = seg.startMs / msPerBeat;
    const endBeatRaw = seg.endMs / msPerBeat;

    const startBeat = Math.max(0, snapToGrid(startBeatRaw, GRID));
    const durationRaw = Math.max(GRID, endBeatRaw - startBeatRaw);
    let durationBeats = snapDuration(durationRaw);

    // Cap duration so note doesn't overflow its measure
    const beatInMeasure = startBeat % beatsPerMeasure;
    const remaining = beatsPerMeasure - beatInMeasure;
    durationBeats = Math.min(durationBeats, remaining);
    if (durationBeats <= 0) durationBeats = GRID;

    notes.push({
      midiNumber: seg.midiNumber,
      startBeat,
      durationBeats,
      detectedFrequency: median(seg.frequencies),
    });
  }

  // ── Step 5: insert rests in gaps between notes ────────────────────────────

  const withRests: Note[] = [];

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];

    if (i > 0) {
      const prev = withRests[withRests.length - 1];
      const prevEnd = prev.startBeat + prev.durationBeats;
      const gap = note.startBeat - prevEnd;

      if (gap >= GRID) {
        // Snap gap to grid and insert rest
        const restDuration = snapDuration(gap);
        withRests.push({
          midiNumber: 0,
          startBeat: prevEnd,
          durationBeats: Math.min(restDuration, gap),
          isRest: true,
        });
      }
    }

    withRests.push(note);
  }

  return withRests;
}
