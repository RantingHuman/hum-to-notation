import { PitchDetector as PitchyDetector } from 'pitchy';
import type { RawPitchEvent } from '../types/music';

export class PitchDetector {
  private analyser: AnalyserNode;
  private audioContext: AudioContext;
  private detector: PitchyDetector<Float32Array>;
  private buffer: Float32Array<ArrayBuffer>;
  private events: RawPitchEvent[] = [];
  private animFrameId: number | null = null;
  private running = false;
  // How long before "now" the analysed sound actually happened
  private readonly frameDelayMs: number;

  /**
   * Frames are timestamped on the performance.now() clock, at the moment the
   * sound reached the microphone: the centre of the analysis window, less the
   * input latency the browser reports for the track.
   */
  constructor(analyser: AnalyserNode, audioContext: AudioContext, inputLatencyMs = 0) {
    this.analyser = analyser;
    this.audioContext = audioContext;
    const size = analyser.fftSize;
    this.detector = PitchyDetector.forFloat32Array(size);
    this.buffer = new Float32Array(size) as Float32Array<ArrayBuffer>;
    this.frameDelayMs = (size / 2 / audioContext.sampleRate) * 1000 + inputLatencyMs;
  }

  start(): void {
    this.events = [];
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
      timestamp: performance.now() - this.frameDelayMs,
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
