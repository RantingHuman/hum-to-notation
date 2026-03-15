import { PitchDetector as PitchyDetector } from 'pitchy';
import type { RawPitchEvent } from '../types/music';
import { CLARITY_THRESHOLD } from '../constants/music';

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

    // Accept only clear pitches in a singing/humming range (80 Hz – 1100 Hz)
    if (clarity >= CLARITY_THRESHOLD && pitch >= 80 && pitch <= 1100) {
      this.events.push({
        frequency: pitch,
        clarity,
        timestamp: Date.now() - this.startTime,
      });
    }

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
