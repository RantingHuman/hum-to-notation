import { PitchDetector as PitchyDetector } from 'pitchy';
import type { RawPitchEvent } from '../types/music';

export class PitchDetector {
  private analyser: AnalyserNode;
  private audioContext: AudioContext;
  private detector: PitchyDetector<Float32Array>;
  private buffer: Float32Array<ArrayBuffer>;
  private events: RawPitchEvent[] = [];
  private animFrameId: number | null = null;
  private startTime = 0;
  private running = false;

  constructor(analyser: AnalyserNode, audioContext: AudioContext) {
    this.analyser = analyser;
    this.audioContext = audioContext;
    const size = analyser.fftSize;
    this.detector = PitchyDetector.forFloat32Array(size);
    this.buffer = new Float32Array(size) as Float32Array<ArrayBuffer>;
  }

  start(): void {
    this.events = [];
    this.startTime = Date.now();
    this.running = true;
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;

    this.analyser.getFloatTimeDomainData(this.buffer);
    const [pitch, clarity] = this.detector.findPitch(
      this.buffer,
      this.audioContext.sampleRate
    );

    let sumSquares = 0;
    for (const sample of this.buffer) sumSquares += sample * sample;

    // Keep every frame: the quantizer filters by clarity and range, and uses
    // the loudness of unclear frames to find re-attacks on the same pitch.
    this.events.push({
      frequency: Number.isFinite(pitch) ? pitch : 0,
      clarity: Number.isFinite(clarity) ? clarity : 0,
      timestamp: Date.now() - this.startTime,
      rms: Math.sqrt(sumSquares / this.buffer.length),
    });

    this.animFrameId = requestAnimationFrame(() => this.loop());
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  getRawPitchEvents(): RawPitchEvent[] {
    return [...this.events];
  }
}
