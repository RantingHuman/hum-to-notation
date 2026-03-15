import * as Tone from 'tone';
import type { TimeSignature } from '../types/music';

export type MetronomeMode = 'audio' | 'visual';
export type BeatCallback = (beatNumber: number, isDownbeat: boolean) => void;

export class Metronome {
  private bpm: number;
  private timeSignature: TimeSignature;
  private mode: MetronomeMode;
  private beatCallback: BeatCallback | null = null;
  private synth: Tone.Synth | null = null;
  private sequence: Tone.Sequence<number> | null = null;
  private _isPlaying = false;

  constructor(bpm: number, timeSignature: TimeSignature, mode: MetronomeMode) {
    this.bpm = bpm;
    this.timeSignature = timeSignature;
    this.mode = mode;
  }

  onBeat(callback: BeatCallback): void {
    this.beatCallback = callback;
  }

  setTempo(bpm: number): void {
    this.bpm = bpm;
    if (this._isPlaying) {
      Tone.getTransport().bpm.value = bpm;
    }
  }

  setTimeSignature(ts: TimeSignature): void {
    this.timeSignature = ts;
  }

  setMode(mode: MetronomeMode): void {
    this.mode = mode;
  }

  async start(): Promise<void> {
    await Tone.start();

    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();

    transport.bpm.value = this.bpm;
    transport.timeSignature = this.timeSignature.numerator;

    if (this.mode === 'audio') {
      this.synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.05 },
        volume: -6,
      }).toDestination();
    }

    const beatsPerMeasure = this.timeSignature.numerator;
    const beatIndices = Array.from({ length: beatsPerMeasure }, (_, i) => i);

    this.sequence = new Tone.Sequence<number>(
      (time, beatIndex) => {
        const beatNumber = beatIndex + 1;
        const isDownbeat = beatNumber === 1;

        if (this.mode === 'audio' && this.synth) {
          const freq = isDownbeat ? 1047 : 523; // C6 vs C5
          this.synth.triggerAttackRelease(freq, '32n', time);
        }

        Tone.getDraw().schedule(() => {
          this.beatCallback?.(beatNumber, isDownbeat);
        }, time);
      },
      beatIndices,
      '4n'
    );

    this.sequence.start(0);
    transport.start();
    this._isPlaying = true;
  }

  stop(): void {
    this.sequence?.stop();
    this.sequence?.dispose();
    this.sequence = null;

    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    this.synth?.dispose();
    this.synth = null;

    this._isPlaying = false;
  }

  get isPlaying(): boolean {
    return this._isPlaying;
  }
}
