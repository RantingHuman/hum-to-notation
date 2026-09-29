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

export class AudioContextStartFailed extends Error {
  constructor() {
    super('Audio input could not be started');
    this.name = 'AudioContextStartFailed';
  }
}

export function getMicrophoneErrorMessage(error: unknown): string {
  if (error instanceof MicrophoneNotFound) {
    return 'No microphone was found. Connect one and try again.';
  }
  if (error instanceof BrowserNotSupported) {
    return 'This browser cannot capture audio. Try Chrome or Edge over HTTPS.';
  }
  if (error instanceof AudioContextStartFailed) {
    return 'Audio input could not start. Try reloading the page and recording again.';
  }
  if (error instanceof MicrophonePermissionDenied) {
    return 'Microphone permission is required to record.';
  }
  return 'Could not access the microphone. Check device permissions and try again.';
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
  const AC: AudioContextCompat | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: AudioContextCompat }).webkitAudioContext;
  if (!AC) throw new BrowserNotSupported();
  return new AC();
}

export class AudioCaptureSession {
  readonly audioContext: AudioContext;
  readonly analyserNode: AnalyserNode;
  private source: MediaStreamAudioSourceNode;
  private stream: MediaStream;
  private startTime: number;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;

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

  async start(): Promise<void> {
    try {
      if (this.audioContext.state !== 'running') {
        await this.audioContext.resume();
      }
    } catch {
      throw new AudioContextStartFailed();
    }

    if (this.audioContext.state !== 'running') {
      throw new AudioContextStartFailed();
    }
  }

  getElapsedMs(): number {
    return Date.now() - this.startTime;
  }

  stop(): void {
    if (this.stopped) return;
    this.stopped = true;
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.maxTimer = null;
    this.source.disconnect();
    this.stream.getTracks().forEach((t) => t.stop());
    this.audioContext.close().catch(() => undefined);
  }
}
