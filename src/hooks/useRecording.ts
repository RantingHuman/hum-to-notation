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
  }, []);

  const stopRecording = useCallback(async () => {
    const detector = detectorRef.current;
    const project = currentProject;
    const layerId = selectedLayerId;

    cleanup();

    if (!detector || !project || !layerId) {
      setRecordingState('idle');
      return;
    }

    const rawEvents = detector.getRawPitchEvents();
    setRecordingState('processing');

    // Yield to the browser for one frame so the "Processing…" UI renders
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const notes = quantizeToNotes(rawEvents, project.tempo, project.timeSignature);
      if (notes.filter((n) => !n.isRest).length === 0) {
        showToast(
          'No notes detected. Make sure your microphone is working and hum clearly.',
          'warning'
        );
        setError(null);
      } else {
        setError(null);
      }
      updateLayerNotes(layerId, notes, rawEvents);
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
    let countdownCount = 0;
    let actuallyRecording = false;

    const metronome = new Metronome(
      currentProject.tempo,
      currentProject.timeSignature,
      currentProject.metronomeMode
    );
    metronomeRef.current = metronome;

    setRecordingState('countdown');
    setCountdownBeat(0);

    const beginCapture = async () => {
      try {
        const capture = new AudioCaptureSession(stream);
        captureRef.current = capture;
        streamRef.current = null;
        await capture.start();

        if (recordingAttemptRef.current !== attemptId) {
          capture.stop();
          return;
        }

        capture.onMaxDuration = () => stopRef.current?.();
        const detector = new PitchDetector(capture.analyserNode, capture.audioContext);
        detectorRef.current = detector;
        detector.start();

        setRecordingState('recording');
        setElapsedMs(0);
        timerRef.current = setInterval(() => {
          setElapsedMs(captureRef.current?.getElapsedMs() ?? 0);
        }, 100);
      } catch (err) {
        if (recordingAttemptRef.current !== attemptId) return;
        cleanup();
        setRecordingState('idle');
        setError(getMicrophoneErrorMessage(err));
      }
    };

    metronome.onBeat((beat) => {
      setCountdownBeat(beat);

      if (!actuallyRecording) {
        countdownCount++;
        if (countdownCount >= beatsPerMeasure) {
          actuallyRecording = true;
          void beginCapture();
        }
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
