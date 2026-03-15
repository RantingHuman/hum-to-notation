// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — midi-writer-js ships types at a non-standard path
import MidiWriter from 'midi-writer-js';
import type { Project } from '../types/project';
import { midiToMidiWriterName, beatsToMidiWriterDuration } from '../utils/musicXmlUtils';

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

    // Notes — we schedule each non-rest note; rests become wait time on the next note
    // We iterate notes in order and track current beat position.
    let curBeat = 0;

    layer.notes.forEach((note) => {
      const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + layer.octaveShift * 12));
      const duration = beatsToMidiWriterDuration(note.durationBeats);

      // Gap between current position and note start (rest)
      const gap = note.startBeat - curBeat;
      const waitDuration = gap > 0.25 ? beatsToMidiWriterDuration(gap) : '0';

      if (note.isRest) {
        curBeat = note.startBeat + note.durationBeats;
        return;
      }

      track.addEvent(
        new MidiWriter.NoteEvent({
          pitch: [midiToMidiWriterName(effectiveMidi)],
          duration,
          wait: waitDuration,
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
