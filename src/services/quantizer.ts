import type { Note, RawPitchEvent, TimeSignature } from '../types/music';
import { frequencyToMidi } from '../utils/noteUtils';
import {
  CLARITY_THRESHOLD,
  MAX_PITCH_HZ,
  MIN_NOTE_DURATION_MS,
  MIN_PITCH_HZ,
  ONSET_DIP_RATIO,
  ONSET_RISE_RATIO,
  PITCH_CHANGE_CENTS,
  PITCH_CHANGE_CONFIRM_MS,
  SILENCE_GAP_MS,
} from '../constants/music';
import { getMeasureLengthBeats } from '../utils/measureUtils';

// ── Internal types ─────────────────────────────────────────────────────────────

interface Segment {
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
 * Anything longer than a whole note snaps to the grid and is tied when rendered.
 */
function snapDuration(raw: number): number {
  if (raw > 4) return snapToGrid(raw, QUANTIZATION_GRID);
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

function isVoiced(event: RawPitchEvent): boolean {
  return (
    event.clarity >= CLARITY_THRESHOLD &&
    event.frequency >= MIN_PITCH_HZ &&
    event.frequency <= MAX_PITCH_HZ
  );
}

function centsBetween(frequency: number, reference: number): number {
  return 1200 * Math.log2(frequency / reference);
}

function startSegment(event: RawPitchEvent): Segment {
  return { startMs: event.timestamp, endMs: event.timestamp, frequencies: [event.frequency] };
}

function extendSegment(segment: Segment, event: RawPitchEvent): void {
  segment.endMs = event.timestamp;
  segment.frequencies.push(event.frequency);
}

/**
 * Split detector frames into one segment per sung note.
 *
 * - A pitch more than PITCH_CHANGE_CENTS from the current note starts a new
 *   note only once it has held for PITCH_CHANGE_CONFIRM_MS, so single noisy
 *   frames are ignored but half-step moves are kept.
 * - On the same pitch, a loudness dip followed by a rise (e.g. "da-da-da")
 *   starts a new note. Unclear frames still count toward the dip.
 * - A silence longer than SILENCE_GAP_MS always ends the note.
 */
function segmentEvents(events: RawPitchEvent[], frameDurationMs: number): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  // Frames at a different pitch that have not yet held long enough to count
  let pending: Segment | null = null;
  // Loudness envelope of the current note, for spotting same-pitch re-attacks
  let peakRms = 0;
  let troughRms = 0;

  for (const event of events) {
    const { rms } = event;

    if (!isVoiced(event)) {
      if (current && rms !== undefined) troughRms = Math.min(troughRms, rms);
      continue;
    }

    let next: Segment | null = null;

    if (!current || event.timestamp - (pending ?? current).endMs > SILENCE_GAP_MS) {
      next = startSegment(event);
    } else if (
      Math.abs(centsBetween(event.frequency, median(current.frequencies))) <= PITCH_CHANGE_CENTS
    ) {
      // Back on the current pitch: any pending frames were a glitch
      pending = null;
      const isReattack =
        rms !== undefined &&
        event.timestamp - current.startMs >= MIN_NOTE_DURATION_MS &&
        peakRms > 0 &&
        troughRms <= peakRms * ONSET_DIP_RATIO &&
        rms >= troughRms * ONSET_RISE_RATIO;

      if (isReattack) {
        next = startSegment(event);
      } else {
        extendSegment(current, event);
        if (rms !== undefined && rms > peakRms) {
          peakRms = rms;
          troughRms = rms;
        } else if (rms !== undefined) {
          troughRms = Math.min(troughRms, rms);
        }
      }
    } else {
      if (
        pending &&
        Math.abs(centsBetween(event.frequency, median(pending.frequencies))) <= PITCH_CHANGE_CENTS
      ) {
        extendSegment(pending, event);
      } else {
        pending = startSegment(event);
      }
      if (pending.endMs - pending.startMs + frameDurationMs >= PITCH_CHANGE_CONFIRM_MS) {
        next = pending;
      }
    }

    if (next) {
      if (current) segments.push(current);
      current = next;
      pending = null;
      peakRms = rms ?? 0;
      troughRms = peakRms;
    }
  }

  if (current) segments.push(current);
  return segments;
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
 * 1. Split frames into notes on pitch changes, re-attacks, and silences.
 * 2. Account for the final detector frame and discard very short blips.
 * 3. Convert segment timestamps to beats using tempo.
 * 4. Snap onsets and durations to an 8th-note grid, bounded by the next onset.
 *    Notes may cross barlines; the renderer and exporters tie them.
 * 5. Insert rest notes to preserve the quantized timeline.
 *
 * @param rawEvents  - Frames from PitchDetector; unclear frames are filtered here.
 * @param tempo      - Project BPM, used for ms → beats conversion.
 * @param timeSignature - Used to split rests at measure boundaries.
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

  // ── Step 1: split frames into one segment per sung note ─────────────────

  const segments = segmentEvents(events, frameDurationMs);

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
    const durationBeats = snapDuration(endBeat - startBeat);

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

    const detectedFrequency = median(seg.frequencies);
    candidates.push({
      midiNumber: frequencyToMidi(detectedFrequency),
      startBeat,
      durationBeats,
      detectedFrequency,
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
