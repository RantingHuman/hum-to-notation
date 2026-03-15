import * as Tone from 'tone';
import type { Note, Instrument } from '../types/music';
import { midiToFrequency } from '../utils/noteUtils';

/**
 * Plays back a layer's notes using Tone.js synthesis.
 *
 * Scheduling strategy: notes are scheduled against Tone.now() (the Web Audio
 * hardware clock) rather than the Transport. This avoids any conflict with the
 * metronome (which uses the Transport), and makes stopping trivial — disposing
 * the synth immediately silences all pending scheduled audio.
 *
 * Instruments:
 *   - guitar: PluckSynth → EQ3 → Chorus → Reverb
 *             EQ3 cuts brittle highs and boosts the 200–800 Hz body range.
 *             Chorus adds the natural detuning between guitar strings.
 *             Reverb gives the sound space and removes the "dry box" quality.
 *   - bass:   MonoSynth → EQ3 → Reverb (subtle)
 *             Sawtooth oscillator with low-pass filter for warmth.
 *             EQ3 boosts sub-bass and cuts harsh upper harmonics.
 */

interface GuitarRig {
  pluck: Tone.PluckSynth;
  eq: Tone.EQ3;
  chorus: Tone.Chorus;
  reverb: Tone.Reverb;
}

interface BassRig {
  synth: Tone.MonoSynth;
  eq: Tone.EQ3;
  reverb: Tone.Reverb;
}

type Rig = GuitarRig | BassRig;

function isGuitarRig(rig: Rig): rig is GuitarRig {
  return 'pluck' in rig;
}

export class PlaybackEngine {
  private rig: Rig | null = null;
  private currentInstrument: Instrument | null = null;
  private _isPlaying = false;
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

  onComplete?: () => void;

  private buildGuitarRig(): GuitarRig {
    const reverb = new Tone.Reverb({ decay: 1.8, preDelay: 0.01, wet: 0.35 }).toDestination();

    // Chorus: slow, subtle — mimics natural string detuning
    const chorus = new Tone.Chorus({ frequency: 2.5, delayTime: 3.5, depth: 0.25, wet: 0.4 })
      .connect(reverb);
    chorus.start();

    // EQ: boost body (200 Hz), cut harsh pick attack (5 kHz+)
    const eq = new Tone.EQ3({ low: 4, mid: 1, high: -10 }).connect(chorus);

    const pluck = new Tone.PluckSynth({
      attackNoise: 2,      // more initial noise = more pick character
      dampening: 3200,     // lower = warmer, less bright ringing
      resonance: 0.96,     // higher = longer sustain
    }).connect(eq);

    return { pluck, eq, chorus, reverb };
  }

  private buildBassRig(): BassRig {
    const reverb = new Tone.Reverb({ decay: 0.8, wet: 0.15 }).toDestination();

    // EQ: boost sub-bass warmth, cut muddy low-mids, roll off harsh highs
    const eq = new Tone.EQ3({ low: 6, mid: -3, high: -12 }).connect(reverb);

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

    return { synth, eq, reverb };
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
    if (isGuitarRig(this.rig)) {
      this.rig.pluck.dispose();
      this.rig.chorus.dispose();
      this.rig.eq.dispose();
      this.rig.reverb.dispose();
    } else {
      this.rig.synth.dispose();
      this.rig.eq.dispose();
      this.rig.reverb.dispose();
    }
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

    // Ensure AudioContext is running (required after user gesture)
    await Tone.start();

    const rig = this.ensureRig(instrument);
    const beatsPerSec = tempo / 60;
    const baseTime = Tone.now() + 0.05; // small scheduling offset

    const playableNotes = notes.filter((n) => !n.isRest);
    if (playableNotes.length === 0) return;

    let maxEndSec = 0;

    playableNotes.forEach((note) => {
      const effectiveMidi = Math.max(21, Math.min(108, note.midiNumber + octaveShift * 12));
      const freq = midiToFrequency(effectiveMidi);
      const startSec = baseTime + note.startBeat / beatsPerSec;
      const durSec = Math.max(0.08, note.durationBeats / beatsPerSec);

      if (isGuitarRig(rig)) {
        rig.pluck.triggerAttack(freq, startSec);
      } else {
        rig.synth.triggerAttackRelease(freq, durSec, startSec);
      }

      const endSec = note.startBeat / beatsPerSec + durSec;
      if (endSec > maxEndSec) maxEndSec = endSec;
    });

    this._isPlaying = true;

    // Auto-complete after all notes + reverb tail
    const totalMs = maxEndSec * 1000 + 2500; // extra for reverb tail
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
    // Dispose the whole rig to cut off reverb tail + ringing notes immediately
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
