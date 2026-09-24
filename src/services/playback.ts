import * as Tone from 'tone';
import type { Note, Instrument } from '../types/music';
import { createPlaybackEvents } from './playbackUtils';

interface GuitarRig {
  instrument: 'guitar';
  synth: Tone.PolySynth;
  eq: Tone.EQ3;
}

interface BassRig {
  instrument: 'bass';
  synth: Tone.MonoSynth;
  eq: Tone.EQ3;
}

type Rig = GuitarRig | BassRig;

/**
 * Plays a layer through a direct, browser-friendly Tone.js output chain.
 * Guitar uses a polyphonic plucked-style synth so every note has an explicit
 * attack and release event; bass keeps its dedicated monophonic voice.
 */
export class PlaybackEngine {
  private rig: Rig | null = null;
  private currentInstrument: Instrument | null = null;
  private _isPlaying = false;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

  onComplete?: () => void;

  private buildGuitarRig(): GuitarRig {
    const eq = new Tone.EQ3({ low: 3, mid: 1, high: -8 }).toDestination();
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.18, sustain: 0.18, release: 0.45 },
    }).connect(eq);

    return { instrument: 'guitar', synth, eq };
  }

  private buildBassRig(): BassRig {
    const eq = new Tone.EQ3({ low: 6, mid: -3, high: -12 }).toDestination();
    const synth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      filter: { Q: 1.5, type: 'lowpass', rolloff: -24 },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.6, release: 1.2 },
      filterEnvelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0.4,
        release: 1.0,
        baseFrequency: 120,
        octaves: 3.0,
      },
    }).connect(eq);

    return { instrument: 'bass', synth, eq };
  }

  private ensureRig(instrument: Instrument): Rig {
    if (!this.rig || this.currentInstrument !== instrument) {
      this.disposeRig();
      this.rig = instrument === 'guitar' ? this.buildGuitarRig() : this.buildBassRig();
      this.currentInstrument = instrument;
    }
    return this.rig;
  }

  private disposeRig(): void {
    if (!this.rig) return;
    this.rig.synth.dispose();
    this.rig.eq.dispose();
    this.rig = null;
    this.currentInstrument = null;
  }

  async playLayer(
    notes: Note[],
    tempo: number,
    octaveShift: number,
    instrument: Instrument
  ): Promise<void> {
    this.stop();

    await Tone.start();
    await Tone.getContext().resume();

    const events = createPlaybackEvents(notes, tempo, octaveShift);
    if (events.length === 0) return;

    const rig = this.ensureRig(instrument);
    const baseTime = Tone.now() + 0.05;

    events.forEach((event) => {
      const startTime = baseTime + event.startSec;
      rig.synth.triggerAttackRelease(event.frequency, event.durationSec, startTime);
    });

    this._isPlaying = true;

    const lastEvent = events[events.length - 1];
    const totalMs = (lastEvent.startSec + lastEvent.durationSec) * 1000 + 500;
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
    this.disposeRig();
    this._isPlaying = false;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }

  dispose(): void {
    this.stop();
  }
}
