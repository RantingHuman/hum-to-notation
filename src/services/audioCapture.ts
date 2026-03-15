import { MAX_RECORDING_DURATION_MS } from '../constants/music';

// ── Error types ────────────────────────────────────────────────────────────────

export class MicrophonePermissionDenied extends Error {
  constructor() {
    super('Microphone permission denied');
    this.name = 'MicrophonePermissionDenied';
  }
}

export class MicrophoneNotFound extends Error {
  constructor() {
    super('No microphone found');
    this.name = 'MicrophoneNotFound';
  }
}

export class BrowserNotSupported extends Error {
  constructor() {
    super('Browser does not support audio capture');
    this.name = 'BrowserNotSupported';
  }
}

// ── Mic access ─────────────────────────────────────────────────────────────────

export async function requestMicrophoneAccess(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new BrowserNotSupported();
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
      video: false,
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        throw new MicrophonePermissionDenied();
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        throw new MicrophoneNotFound();
      }
    }
    throw err;
  }
}

// ── Capture session ────────────────────────────────────────────────────────────

type AudioContextCompat = typeof AudioContext;

function createAudioContext(): AudioContext {
  const AC: AudioContextCompat =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: AudioContextCompat }).webkitAudioContext;
  return new AC();
}

export class AudioCaptureSession {
  readonly audioContext: AudioContext;
  readonly analyserNode: AnalyserNode;
  private source: MediaStreamAudioSourceNode;
  private stream: MediaStream;
  private startTime: number;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;

  /** Called when the 2-minute max duration is reached. */
  onMaxDuration?: () => void;

  constructor(stream: MediaStream) {
    this.stream = stream;
    this.audioContext = createAudioContext();
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 2048;
    this.source.connect(this.analyserNode);
    this.startTime = Date.now();
    this.maxTimer = setTimeout(
      () => this.onMaxDuration?.(),
      MAX_RECORDING_DURATION_MS
    );
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  stop(): void {
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.source.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    this.audioContext.close();
  }
}
