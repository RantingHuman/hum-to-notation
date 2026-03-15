import * as Tone from 'tone';
import type { Note, Instrument } from '../types/music';
import { midiToFrequency } from '../utils/noteUtils';

type Synth = Tone.PluckSynth | Tone.MonoSynth;

/**
 * Plays back a layer's notes using Tone.js synthesis.
 *
 * Scheduling strategy: notes are scheduled against Tone.now() (the Web Audio
 * hardware clock) rather than the Transport. This avoids any conflict with the
 * metronome (which uses the Transport), and makes stopping trivial — disposing
 * the synth immediately silences all pending scheduled audio.
 *
 * Instruments:
 *   - guitar: PluckSynth (Karplus-Strong string model)
 *   - bass:   MonoSynth with sawtooth oscillator + lowpass filter
 */
export class PlaybackEngine {
  private synth: Synth | null = null;
  private currentInstrument: Instrument | null = null;
  private _isPlaying = false;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

  onComplete?: () => void;

  private createSynth(instrument: Instrument): Synth {
    if (instrument === 'guitar') {
      return new Tone.PluckSynth({
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.9,
      }).toDestination();
    } else {
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.8 },
        filterEnvelope: {
          attack: 0.001,
          decay: 0.1,
          sustain: 0.5,
          release: 0.8,
          baseFrequency: 200,
          octaves: 2.6,
        },
      }).toDestination();
    }
  }

  private ensureSynth(instrument: Instrument): Synth {
    if (!this.synth || this.currentInstrument !== instrument) {
      this.synth?.dispose();
      this.synth = this.createSynth(instrument);
      this.currentInstrument = instrument;
    }
    return this.synth;
  }

  async playLayer(
    notes: Note[],
    tempo: number,
    octaveShift: number,
    instrument: Instrument
  ): Promise<void> {
    this.stop();

    // Ensure AudioContext is running (required after user gesture)
    await Tone.start();

    const synth = this.ensureSynth(instrument);
    const beatsPerSec = tempo / 60;
    const baseTime = Tone.now() + 0.05; // small scheduling offset

    const playableNotes = notes.filter((n) => !n.isRest);
    if (playableNotes.length === 0) return;

    let maxEndSec = 0;

    playableNotes.forEach((note) => {
      const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));
      const freq = midiToFrequency(effectiveMidi);
      const startSec = baseTime + note.startBeat / beatsPerSec;
      const durSec = Math.max(0.05, note.durationBeats / beatsPerSec);

      if (instrument === 'guitar') {
        (synth as Tone.PluckSynth).triggerAttack(freq, startSec);
      } else {
        (synth as Tone.MonoSynth).triggerAttackRelease(freq, durSec, startSec);
      }

      const endSec = note.startBeat / beatsPerSec + durSec;
      if (endSec > maxEndSec) maxEndSec = endSec;
    });

    this._isPlaying = true;

    // Auto-complete after all notes have played
    const totalMs = maxEndSec * 1000 + 300;
    this.completionTimer = setTimeout(() => {
      if (this._isPlaying) {
        this._isPlaying = false;
        this.onComplete?.();
      }
    }, totalMs);
  }

  stop(): void {
    if (this.completionTimer) {
      clearTimeout(this.completionTimer);
      this.completionTimer = null;
    }
    // Dispose + recreate synth to cut off any ringing notes immediately
    this.synth?.dispose();
    this.synth = null;
    this.currentInstrument = null;
    this._isPlaying = false;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  dispose(): void {
    this.stop();
  }
}
