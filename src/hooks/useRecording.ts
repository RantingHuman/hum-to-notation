import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import {
  requestMicrophoneAccess,
  AudioCaptureSession,
  MicrophonePermissionDenied,
  getMicrophoneErrorMessage,
} from '../services/audioCapture';
import { PitchDetector } from '../services/pitchDetector';
import { quantizeToNotes } from '../services/quantizer';
import { Metronome } from '../services/metronome';
import { useToast } from '../context/ToastContext';
import { explainEmptyRecording, getRecordingStats } from '../utils/recordingDiagnostics';
import { alignFramesToDownbeat } from '../utils/recordingTiming';

export type RecordingState = 'idle' | 'countdown' | 'recording' | 'processing';

export function useRecording() {
  const { currentProject, selectedLayerId, updateLayerNotes } = useProjectContext();
  const { showToast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownBeat, setCountdownBeat] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const captureRef = useRef<AudioCaptureSession | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The recording track, kept until processing so a silent take can name its input
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // When the first downbeat after the count-in is heard (performance.now() ms)
  const downbeatRef = useRef<number | null>(null);
  const recordingAttemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep stable ref to stopRecording to avoid stale closure in auto-stop
  const stopRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const cleanup = useCallback(() => {
    recordingAttemptRef.current += 1;
    if (timerRef.current) clearInterval(timerRef.current);
    detectorRef.current?.stop();
    captureRef.current?.stop();
    metronomeRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    captureRef.current = null;
    detectorRef.current = null;
    metronomeRef.current = null;
    streamRef.current = null;
    timerRef.current = null;
    downbeatRef.current = null;
  }, []);

  const stopRecording = useCallback(async () => {
    const detector = detectorRef.current;
    const project = currentProject;
    const layerId = selectedLayerId;
    const track = trackRef.current;
    const input = { label: track?.label, muted: track?.muted };
    const downbeatMs = downbeatRef.current;
    trackRef.current = null;

    cleanup();

    // Stopped during the count-in: nothing was recorded
    if (!detector || !project || !layerId || downbeatMs === null) {
      setRecordingState('idle');
      return;
    }

    const rawEvents = alignFramesToDownbeat(detector.getRawPitchEvents(), downbeatMs);
    setRecordingState('processing');

    // Yield to the browser for one frame so the "Processing…" UI renders
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const notes = quantizeToNotes(rawEvents, project.tempo, project.timeSignature);
      setError(null);
      if (notes.filter((n) => !n.isRest).length === 0) {
        // Keep the previous take: a failed redo shouldn't wipe a good one
        showToast(`No notes detected. ${explainEmptyRecording(rawEvents, input)}`, 'warning');
        console.info('Empty recording diagnostics:', { ...getRecordingStats(rawEvents), input });
      } else {
        updateLayerNotes(layerId, notes, rawEvents);
      }
    } catch {
      showToast('Processing failed. Please try recording again.', 'error');
    }

    setRecordingState('idle');
  }, [currentProject, selectedLayerId, cleanup, updateLayerNotes]);

  // Keep stopRef fresh
  useEffect(() => {
    stopRef.current = stopRecording;
  }, [stopRecording]);

  const startRecording = useCallback(async () => {
    if (!currentProject || !selectedLayerId) {
      setError('Please add and select a layer first.');
      return;
    }

    setError(null);
    setMicDenied(false);

    // Request mic access early so permission dialog appears before countdown
    let stream: MediaStream;
    try {
      stream = await requestMicrophoneAccess();
      streamRef.current = stream;
    } catch (err) {
      if (err instanceof MicrophonePermissionDenied) {
        setMicDenied(true);
      } else {
        setError(getMicrophoneErrorMessage(err));
      }
      return;
    }

    const attemptId = ++recordingAttemptRef.current;
    const beatsPerMeasure = currentProject.timeSignature.numerator;
    let beatsHeard = 0;

    setRecordingState('countdown');
    setCountdownBeat(0);

    // Start listening before the count-in, so audio start-up delay can't clip the
    // first note. Frames are re-based to the downbeat when recording stops.
    try {
      const capture = new AudioCaptureSession(stream);
      captureRef.current = capture;
      streamRef.current = null;
      await capture.start();

      if (recordingAttemptRef.current !== attemptId) {
        capture.stop();
        return;
      }

      const track = stream.getAudioTracks()[0] ?? null;
      trackRef.current = track;
      const inputLatencySec = (track?.getSettings() as { latency?: number } | undefined)?.latency;
      capture.onMaxDuration = () => stopRef.current?.();
      const detector = new PitchDetector(
        capture.analyserNode,
        capture.audioContext,
        typeof inputLatencySec === 'number' ? inputLatencySec * 1000 : 0
      );
      detectorRef.current = detector;
      detector.start();
    } catch (err) {
      if (recordingAttemptRef.current !== attemptId) return;
      cleanup();
      setRecordingState('idle');
      setError(getMicrophoneErrorMessage(err));
      return;
    }

    const metronome = new Metronome(
      currentProject.tempo,
      currentProject.timeSignature,
      currentProject.metronomeMode
    );
    metronomeRef.current = metronome;

    metronome.onBeat((beat, _isDownbeat, heardAtMs) => {
      setCountdownBeat(beat);
      beatsHeard++;

      // One full bar of count-in, then the next downbeat is beat 0 of the take
      if (beatsHeard === beatsPerMeasure + 1) {
        downbeatRef.current = heardAtMs;
        setRecordingState('recording');
        setElapsedMs(0);
        timerRef.current = setInterval(() => {
          setElapsedMs(Math.max(0, performance.now() - heardAtMs));
        }, 100);
      }
    });

    try {
      await metronome.start();
    } catch (err) {
      cleanup();
      setRecordingState('idle');
      setError(getMicrophoneErrorMessage(err));
    }
  }, [currentProject, selectedLayerId, cleanup]);

  const dismissMicDenied = useCallback(() => setMicDenied(false), []);
  const dismissError = useCallback(() => setError(null), []);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    recordingState,
    elapsedMs,
    countdownBeat,
    error,
    micDenied,
    startRecording,
    stopRecording,
    dismissMicDenied,
    dismissError,
  };
}
