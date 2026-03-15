import { GUITAR_OPEN_STRINGS, BASS_OPEN_STRINGS } from '../constants/music';
import type { Instrument } from '../types/music';

export interface TabPosition {
  string: number; // 1 = highest string
  fret: number;
}

function findLowestFret(midiNumber: number, openStrings: number[]): TabPosition {
  let best: TabPosition = { string: 1, fret: 99 };
  openStrings.forEach((openMidi, idx) => {
    const fret = midiNumber - openMidi;
    if (fret >= 0 && fret <= 24 && fret < best.fret) {
      best = { string: idx + 1, fret };
    }
  });
  // If note is out of range, clamp to closest string
  if (best.fret === 99) {
    const closestIdx = openStrings.reduce(
      (bi, _openMidi, i) =>
        Math.abs(openStrings[i] - midiNumber) < Math.abs(openStrings[bi] - midiNumber)
          ? i
          : bi,
      0
    );
    best = { string: closestIdx + 1, fret: Math.max(0, midiNumber - openStrings[closestIdx]) };
  }
  return best;
}

export function midiToGuitarTab(midiNumber: number): TabPosition {
  return findLowestFret(midiNumber, GUITAR_OPEN_STRINGS);
}

export function midiBassTab(midiNumber: number): TabPosition {
  return findLowestFret(midiNumber, BASS_OPEN_STRINGS);
}

export function midiToTab(midiNumber: number, instrument: Instrument): TabPosition {
  return instrument === 'guitar'
    ? midiToGuitarTab(midiNumber)
    : midiBassTab(midiNumber);
}
