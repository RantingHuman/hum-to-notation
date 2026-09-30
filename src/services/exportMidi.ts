// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — midi-writer-js ships types at a non-standard path
import MidiWriter from 'midi-writer-js';
import type { Project } from '../types/project';
import { midiToMidiWriterName } from '../utils/musicXmlUtils';

// midi-writer-js default resolution (ticks per quarter note)
const TICKS_PER_BEAT = 128;

function beatsToTicks(beats: number): string {
  return `T${Math.round(beats * TICKS_PER_BEAT)}`;
}

// General MIDI program numbers (0-indexed)
const GM_PROGRAM: Record<string, number> = {
  guitar: 25, // Acoustic Guitar (steel)
  bass:   33, // Electric Bass (finger)
};

export function exportProjectToMidi(project: Project): Blob {
  const tracks: InstanceType<typeof MidiWriter.Track>[] = [];

  project.layers.forEach((layer) => {
    const track = new MidiWriter.Track();

    // Tempo
    track.addEvent(new MidiWriter.TempoEvent({ bpm: project.tempo }));

    // Time signature
    track.addEvent(
      new MidiWriter.TimeSignatureEvent(
        project.timeSignature.numerator,
        project.timeSignature.denominator
      )
    );

    // Instrument program change
    track.addEvent(new MidiWriter.ProgramChangeEvent({ instrument: GM_PROGRAM[layer.instrument] }));

    // Rests are implied: each note waits for the gap since the last sounding note ended.
    // Tick durations keep lengths like 2.5 beats (tied in notation) exact.
    let curBeat = 0;

    layer.notes
      .filter((note) => !note.isRest)
      .sort((left, right) => left.startBeat - right.startBeat)
      .forEach((note) => {
        const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + layer.octaveShift * 12));
        const gap = Math.max(0, note.startBeat - curBeat);

        track.addEvent(
          new MidiWriter.NoteEvent({
            pitch: [midiToMidiWriterName(effectiveMidi)],
            duration: beatsToTicks(note.durationBeats),
            wait: gap > 0 ? beatsToTicks(gap) : '0',
            velocity: 70,
          })
        );

        curBeat = note.startBeat + note.durationBeats;
      });

    tracks.push(track);
  });

  const writer = new MidiWriter.Writer(tracks);
  const data = writer.buildFile();
  return new Blob([data], { type: 'audio/midi' });
}
