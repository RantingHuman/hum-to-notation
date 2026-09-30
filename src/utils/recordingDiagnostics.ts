import type { RawPitchEvent } from '../types/music';
import {
  CLARITY_THRESHOLD,
  MAX_PITCH_HZ,
  MIN_NOTE_DURATION_MS,
  MIN_PITCH_HZ,
} from '../constants/music';

// Below roughly -50 dBFS the input is effectively silent
const SILENT_RMS = 0.003;

export interface RecordingStats {
  frames: number;
  durationMs: number;
  maxRms: number | null; // null for frames recorded before loudness was captured
  voicedFrames: number;
}

export function getRecordingStats(events: RawPitchEvent[]): RecordingStats {
  const rmsValues = events.flatMap((event) => (event.rms === undefined ? [] : [event.rms]));
  return {
    frames: events.length,
    durationMs: events.length > 1 ? events[events.length - 1].timestamp - events[0].timestamp : 0,
    maxRms: rmsValues.length > 0 ? Math.max(...rmsValues) : null,
    voicedFrames: events.filter(
      (event) =>
        event.clarity >= CLARITY_THRESHOLD &&
        event.frequency >= MIN_PITCH_HZ &&
        event.frequency <= MAX_PITCH_HZ
    ).length,
  };
}

export interface InputInfo {
  label?: string; // the device Chrome is recording from; empty when the browser hides it
  muted?: boolean; // true when the OS or browser is withholding audio from the track
}

/** Explain, in user terms, which stage lost the melody when a recording yields no notes. */
export function explainEmptyRecording(events: RawPitchEvent[], input: InputInfo = {}): string {
  const stats = getRecordingStats(events);

  if (stats.frames === 0) {
    return 'No audio was analysed. Keep this tab visible and in front while recording, then try again.';
  }
  const device = input.label ? `"${input.label}"` : 'the microphone';
  if (input.muted) {
    return `The browser muted ${device} during recording. Check your system's microphone privacy settings for this browser.`;
  }
  if (stats.maxRms === 0) {
    // A live microphone always has some noise floor; exact zeros mean no signal reaches the page
    return `The browser received no signal at all from ${device}. Allow this browser in your system's microphone privacy settings, or pick a different input in the site's permissions.`;
  }
  if (stats.maxRms !== null && stats.maxRms < SILENT_RMS) {
    return `${input.label ? device : 'Your microphone'} sent only silence. Check that the right input device is selected and not muted.`;
  }
  if (stats.voicedFrames === 0) {
    return 'Sound was picked up, but no clear pitch. Hum a steady "mmm" or "doo" closer to the microphone.';
  }
  return `A pitch was heard only briefly. Hold each note for at least ${MIN_NOTE_DURATION_MS} ms and hum a little louder.`;
}
