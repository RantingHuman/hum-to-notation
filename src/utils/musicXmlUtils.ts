const STEP_NAMES = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'];
const ALTERS     = [  0,  1,  0,  1,  0,  0,  1,  0,  1,  0,  1,  0];

export function midiToPitch(midi: number): { step: string; alter: number; octave: number } {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { step: STEP_NAMES[pc], alter: ALTERS[pc], octave };
}

/** Maps a beat duration to a MusicXML <type> name and dot count. */
export function durationToMusicXmlType(beats: number): { type: string; dots: number; divisions: number } {
  // divisions = 8 (eighth note = 1 division unit)
  if (beats >= 4)   return { type: 'whole',   dots: 0, divisions: 32 };
  if (beats >= 3)   return { type: 'half',    dots: 1, divisions: 24 };
  if (beats >= 2)   return { type: 'half',    dots: 0, divisions: 16 };
  if (beats >= 1.5) return { type: 'quarter', dots: 1, divisions: 12 };
  if (beats >= 1)   return { type: 'quarter', dots: 0, divisions:  8 };
  if (beats >= 0.75)return { type: 'eighth',  dots: 1, divisions:  6 };
  return              { type: 'eighth',  dots: 0, divisions:  4 };
}

export function midiToMidiWriterName(midi: number): string {
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[midi % 12]}${octave}`;
}

export function beatsToMidiWriterDuration(beats: number): string {
  if (beats >= 4)    return '1';
  if (beats >= 3)    return 'd2';
  if (beats >= 2)    return '2';
  if (beats >= 1.5)  return 'd4';
  if (beats >= 1)    return '4';
  if (beats >= 0.75) return 'd8';
  return '8';
}
