import { describe, expect, it } from 'vitest';
import {
  AudioContextStartFailed,
  BrowserNotSupported,
  MicrophoneNotFound,
  MicrophonePermissionDenied,
  getMicrophoneErrorMessage,
} from './audioCapture';

describe('getMicrophoneErrorMessage', () => {
  it('explains denied permission', () => {
    expect(getMicrophoneErrorMessage(new MicrophonePermissionDenied())).toContain('permission');
  });

  it('explains a missing microphone', () => {
    expect(getMicrophoneErrorMessage(new MicrophoneNotFound())).toContain('microphone');
  });

  it('explains unsupported audio capture', () => {
    expect(getMicrophoneErrorMessage(new BrowserNotSupported())).toContain('browser');
  });

  it('explains an audio context startup failure', () => {
    expect(getMicrophoneErrorMessage(new AudioContextStartFailed()).toLowerCase()).toContain('audio input');
  });

  it('provides a safe message for unknown errors', () => {
    expect(getMicrophoneErrorMessage(new Error('unexpected'))).toBe(
      'Could not access the microphone. Check device permissions and try again.'
    );
  });
});
