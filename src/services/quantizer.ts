import type { Note, RawPitchEvent, TimeSignature } from '../types/music';
import { frequencyToMidi } from '../utils/noteUtils';
import { MIN_NOTE_DURATION_MS, SILENCE_GAP_MS } from '../constants/music';
import { getMeasureLengthBeats } from '../utils/measureUtils';

// ── Internal types ─────────────────────────────────────────────────────────────

interface Segment {
  midiNumber: number;
  startMs: number;
  endMs: number;
  frequencies: number[];
}

interface CandidateNote {
  midiNumber: number;
  startBeat: number;
  durationBeats: number;
  detectedFrequency: number;
}

const QUANTIZATION_GRID = 0.5;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Snap a beat value to the nearest multiple of gridSize. */
function snapToGrid(beat: number, gridSize: number): number {
  return Math.round(beat / gridSize) * gridSize;
}

/**
 * Snap a raw duration (in beats) to the nearest "nice" duration.
 * Options: 8th, quarter, dotted quarter, half, dotted half, whole.
 */
function snapDuration(raw: number): number {
  const options = [0.5, 1, 1.5, 2, 3, 4];
  return options.reduce((best, opt) =>
    Math.abs(opt - raw) < Math.abs(best - raw) ? opt : best
  );
}

/** Return the median value of a numeric array. */
function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function estimateFrameDurationMs(events: RawPitchEvent[]): number {
  const deltas: number[] = [];
  for (let index = 1; index < events.length; index++) {
    const delta = events[index].timestamp - events[index - 1].timestamp;
    if (delta > 0 && delta <= SILENCE_GAP_MS) deltas.push(delta);
  }

  if (deltas.length === 0) return 16;
  return Math.min(50, Math.max(10, median(deltas)));
}

function chooseRestDuration(maxAvailable: number): number {
  const options = [4, 3, 2, 1.5, 1, 0.5];
  return options.find((duration) => duration <= maxAvailable + 0.001) ?? 0;
}

function appendRestRange(
  notes: Note[],
  startBeat: number,
  endBeat: number,
  measureLengthBeats: number
): void {
  let cursorBeat = startBeat;

  while (endBeat - cursorBeat >= QUANTIZATION_GRID - 0.001) {
    const beatInMeasure = cursorBeat % measureLengthBeats;
    const measureRemaining = measureLengthBeats - beatInMeasure;
    const maxAvailable = Math.min(endBeat - cursorBeat, measureRemaining);
    const durationBeats = chooseRestDuration(maxAvailable);

    if (durationBeats === 0) break;

    notes.push({
      midiNumber: 0,
      startBeat: cursorBeat,
      durationBeats,
      isRest: true,
    });
    cursorBeat += durationBeats;
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Convert raw pitch detection events into a quantized Note[] array.
 *
 * Pipeline:
 * 1. Group consecutive frames with similar pitch (±1 semitone) into segments.
 * 2. Account for the final detector frame and discard very short blips.
 * 3. Convert segment timestamps to beats using tempo.
 * 4. Snap onsets and durations to an 8th-note grid, bounded by the next onset.
 * 5. Insert rest notes to preserve the quantized timeline.
 *
 * @param rawEvents  - Pitch events from PitchDetector, in timestamp order.
 * @param tempo      - Project BPM, used for ms → beats conversion.
 * @param timeSignature - Used to cap note duration at measure boundaries.
 */

export function quantizeToNotes(
  rawEvents: RawPitchEvent[],
  tempo: number,
  timeSignature: TimeSignature
): Note[] {
  if (rawEvents.length === 0) return [];
  if (!Number.isFinite(tempo) || tempo <= 0) {
    throw new RangeError('Tempo must be a positive finite number');
  }

  const events = [...rawEvents].sort((a, b) => a.timestamp - b.timestamp);
  const frameDurationMs = estimateFrameDurationMs(events);

  // ── Step 1: group consecutive frames into pitch segments ──────────────────

  const segments: Segment[] = [];
  let current: Segment | null = null;

  for (const event of events) {
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

    if (gap <= SILENCE_GAP_MS && midiDiff <= 1) {
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
    (s) => s.endMs - s.startMs + frameDurationMs >= MIN_NOTE_DURATION_MS
  );
  if (valid.length === 0) return [];

  // ── Step 3 & 4: convert ms → beats and snap to an 8th-note grid ───────────

  const secondsPerBeat = 60 / tempo;
  const msPerBeat = secondsPerBeat * 1000;
  const measureLengthBeats = getMeasureLengthBeats(timeSignature);
  const candidates: CandidateNote[] = [];

  for (let index = 0; index < valid.length; index++) {
    const seg = valid[index];
    const nextSegmentStartMs = valid[index + 1]?.startMs ?? Number.POSITIVE_INFINITY;
    const startBeatRaw = seg.startMs / msPerBeat;
    const effectiveEndMs = Math.min(seg.endMs + frameDurationMs, nextSegmentStartMs);
    const startBeat = Math.max(0, snapToGrid(startBeatRaw, QUANTIZATION_GRID));
    const endBeat = Math.max(
      startBeat + QUANTIZATION_GRID,
      snapToGrid(effectiveEndMs / msPerBeat, QUANTIZATION_GRID)
    );
    let durationBeats = snapDuration(endBeat - startBeat);

    // Cap duration so note doesn't overflow its measure
    const beatInMeasure = startBeat % measureLengthBeats;
    const remaining = measureLengthBeats - beatInMeasure;
    durationBeats = Math.min(durationBeats, remaining);
    if (durationBeats < QUANTIZATION_GRID) continue;

    const previous = candidates[candidates.length - 1];
    if (previous && startBeat <= previous.startBeat) {
      // The grid cannot represent two onsets in the same slot.
      continue;
    }
    if (previous) {
      previous.durationBeats = Math.min(
        previous.durationBeats,
        startBeat - previous.startBeat
      );
    }

    candidates.push({
      midiNumber: seg.midiNumber,
      startBeat,
      durationBeats,
      detectedFrequency: median(seg.frequencies),
    });
  }

  // ── Step 5: insert rests to preserve the quantized timeline ───────────────

  const withRests: Note[] = [];
  let cursorBeat = 0;

  for (const candidate of candidates) {
    if (candidate.startBeat < cursorBeat) continue;
    if (candidate.startBeat > cursorBeat) {
      appendRestRange(withRests, cursorBeat, candidate.startBeat, measureLengthBeats);
    }

    withRests.push(candidate);
    cursorBeat = candidate.startBeat + candidate.durationBeats;
  }

  return withRests;
}
