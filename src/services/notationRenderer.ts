import {
  Renderer,
  Stave,
  StaveNote,
  Voice,
  Formatter,
  Accidental,
  TabStave,
  TabNote,
} from 'vexflow';
import type { Note, TimeSignature } from '../types/music';
import type { Instrument } from '../types/music';
import { getMeasureLengthBeats, groupNotesIntoMeasures } from '../utils/measureUtils';
import { midiToTab } from '../utils/tabUtils';

// ── MIDI / duration helpers ───────────────────────────────────────────────────

const NOTE_NAMES = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
const SHARPS = new Set([1, 3, 6, 8, 10]); // indices with '#'

function midiToVexKey(midi: number): string {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${name}/${octave}`;
}

interface VexDuration {
  duration: string; // 'w','h','hd','q','qd','8','8d'
  dots: number;
}

function beatsToVexDuration(beats: number): VexDuration {
  if (beats >= 4) return { duration: 'w', dots: 0 };
  if (beats >= 3) return { duration: 'h', dots: 1 };
  if (beats >= 2) return { duration: 'h', dots: 0 };
  if (beats >= 1.5) return { duration: 'q', dots: 1 };
  if (beats >= 1) return { duration: 'q', dots: 0 };
  if (beats >= 0.75) return { duration: '8', dots: 1 };
  return { duration: '8', dots: 0 };
}

function makeDurationString(vd: VexDuration, isRest: boolean): string {
  return vd.duration + (vd.dots ? 'd' : '') + (isRest ? 'r' : '');
}

function padMeasure(notes: Note[], beatsPerMeasure: number, measureStartBeat: number): Note[] {
  const total = notes.reduce((s, n) => s + n.durationBeats, 0);
  const remaining = beatsPerMeasure - (total % beatsPerMeasure || beatsPerMeasure);
  if (remaining > 0.01 && remaining < beatsPerMeasure - 0.01) {
    return [
      ...notes,
      {
        midiNumber: 0,
        startBeat: measureStartBeat + total,
        durationBeats: remaining,
        isRest: true,
      },
    ];
  }
  return notes;
}

// ── Sheet music rendering ─────────────────────────────────────────────────────

const STAVE_PADDING_TOP = 50;
const LINE_SPACING = 140;
const LEFT_MARGIN = 20;

export function renderSheetMusic(
  container: HTMLElement,
  notes: Note[],
  timeSignature: TimeSignature,
  tempo: number,
  instrument: Instrument,
  octaveShift = 0
): void {
  container.innerHTML = '';

  const measureLengthBeats = getMeasureLengthBeats(timeSignature);
  const clef = instrument === 'bass' ? 'bass' : 'treble';
  const timeSigStr = `${timeSignature.numerator}/${timeSignature.denominator}`;

  const allMeasures = groupNotesIntoMeasures(notes, measureLengthBeats);
  if (allMeasures.length === 0) return;

  const containerWidth = container.clientWidth || 700;
  const drawWidth = containerWidth - LEFT_MARGIN * 2;

  // Estimate measures per line based on width
  const firstStaveWidth = drawWidth - 80; // account for clef + timesig
  const avgNoteWidth = 50;
  const notesPerLine = Math.max(1, Math.floor(firstStaveWidth / avgNoteWidth));
  const measuresPerLine = Math.max(1, Math.floor(notesPerLine / measureLengthBeats));

  const lines: Note[][][] = [];
  for (let i = 0; i < allMeasures.length; i += measuresPerLine) {
    lines.push(allMeasures.slice(i, i + measuresPerLine));
  }

  const totalHeight = STAVE_PADDING_TOP + lines.length * LINE_SPACING + 40;
  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(containerWidth, totalHeight);
  const ctx = renderer.getContext();
  ctx.setFont('Arial', 10);

  lines.forEach((lineMeasures, lineIdx) => {
    const y = STAVE_PADDING_TOP + lineIdx * LINE_SPACING;
    const measuresInLine = lineMeasures.length;
    const isFirstLine = lineIdx === 0;

    // First stave in line is wider to account for clef/time signature
    const clefWidth = isFirstLine ? 80 : 40;
    const staveWidth = (drawWidth - clefWidth) / measuresInLine;

    lineMeasures.forEach((measureNotes, mIdx) => {
      const globalMeasureIdx = lineIdx * measuresPerLine + mIdx;
      const x =
        LEFT_MARGIN + (mIdx === 0 ? 0 : clefWidth) + mIdx * staveWidth;
      const w = mIdx === 0 ? staveWidth + clefWidth : staveWidth;

      const stave = new Stave(x, y, w);

      if (mIdx === 0) {
        stave.addClef(clef);
        if (isFirstLine) {
          stave.addTimeSignature(timeSigStr);
        }
      }
      stave.setContext(ctx).draw();

      // Tempo marking on first measure of first line
      if (isFirstLine && mIdx === 0) {
        ctx.save();
        ctx.setFont('Arial', 11, 'bold');
        ctx.fillText(`♩ = ${tempo}`, x + 5, y - 10);
        ctx.restore();
      }

      const measureStart = globalMeasureIdx * measureLengthBeats;
      const paddedNotes = padMeasure(measureNotes, measureLengthBeats, measureStart);

      const vexNotes = paddedNotes.map((note) => {
        const effectiveMidi = note.isRest
          ? 71 // B4 — standard rest position
          : Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));

        const vd = beatsToVexDuration(note.durationBeats);
        const durStr = makeDurationString(vd, !!note.isRest);
        const key = note.isRest ? 'b/4' : midiToVexKey(effectiveMidi);

        const staveNote = new StaveNote({
          keys: [key],
          duration: durStr,
          clef,
        });

        // Add accidental for sharps/flats
        if (!note.isRest && SHARPS.has(effectiveMidi % 12)) {
          staveNote.addModifier(new Accidental('#'), 0);
        }

        return staveNote;
      });

      if (vexNotes.length === 0) return;

      const voice = new Voice({
        numBeats: timeSignature.numerator,
        beatValue: timeSignature.denominator,
      }).setMode(2); // SOFT mode — don't throw on beat count mismatch

      voice.addTickables(vexNotes);
      new Formatter().joinVoices([voice]).format([voice], w - 20);
      voice.draw(ctx, stave);
    });
  });
}

// ── Tab rendering ─────────────────────────────────────────────────────────────

const TAB_LINE_SPACING = 130;

export function renderTabNotation(
  container: HTMLElement,
  notes: Note[],
  timeSignature: TimeSignature,
  instrument: Instrument,
  octaveShift = 0
): void {
  container.innerHTML = '';

  const measureLengthBeats = getMeasureLengthBeats(timeSignature);
  const numStrings = instrument === 'guitar' ? 6 : 4;
  const allMeasures = groupNotesIntoMeasures(notes, measureLengthBeats);
  if (allMeasures.length === 0) return;

  const containerWidth = container.clientWidth || 700;
  const drawWidth = containerWidth - LEFT_MARGIN * 2;

  const measuresPerLine = Math.max(1, Math.floor(drawWidth / 200));
  const lines: Note[][][] = [];
  for (let i = 0; i < allMeasures.length; i += measuresPerLine) {
    lines.push(allMeasures.slice(i, i + measuresPerLine));
  }

  const totalHeight = 40 + lines.length * TAB_LINE_SPACING + 40;
  const renderer = new Renderer(container as HTMLDivElement, Renderer.Backends.SVG);
  renderer.resize(containerWidth, totalHeight);
  const ctx = renderer.getContext();
  ctx.setFont('Arial', 10);

  lines.forEach((lineMeasures, lineIdx) => {
    const y = 40 + lineIdx * TAB_LINE_SPACING;
    const isFirstLine = lineIdx === 0;
    const clefWidth = isFirstLine ? 50 : 20;
    const staveWidth = (drawWidth - clefWidth) / lineMeasures.length;

    lineMeasures.forEach((measureNotes, mIdx) => {
      const globalMeasureIdx = lineIdx * measuresPerLine + mIdx;
      const x = LEFT_MARGIN + (mIdx === 0 ? 0 : clefWidth) + mIdx * staveWidth;
      const w = mIdx === 0 ? staveWidth + clefWidth : staveWidth;

      const stave = new TabStave(x, y, w);
      if (mIdx === 0) stave.addClef('tab');
      stave.setNumLines(numStrings);
      stave.setContext(ctx).draw();

      const measureStart = globalMeasureIdx * measureLengthBeats;
      const paddedNotes = padMeasure(measureNotes, measureLengthBeats, measureStart);

      const tabNotes = paddedNotes.map((note) => {
        const vd = beatsToVexDuration(note.durationBeats);
        const durStr = vd.duration + (vd.dots ? 'd' : '');

        if (note.isRest) {
          return new TabNote({ positions: [{ str: 1, fret: 'x' }], duration: durStr + 'r' });
        }

        const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));
        const pos = midiToTab(effectiveMidi, instrument);
        return new TabNote({
          positions: [{ str: pos.string, fret: pos.fret }],
          duration: durStr,
        });
      });

      if (tabNotes.length === 0) return;

      const voice = new Voice({
        numBeats: timeSignature.numerator,
        beatValue: timeSignature.denominator,
      }).setMode(2);

      voice.addTickables(tabNotes);
      new Formatter().joinVoices([voice]).format([voice], w - 20);
      voice.draw(ctx, stave);
    });
  });
}
