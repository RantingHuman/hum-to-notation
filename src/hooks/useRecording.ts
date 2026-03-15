import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';
import {
  requestMicrophoneAccess,
  AudioCaptureSession,
  MicrophonePermissionDenied,
} from '../services/audioCapture';
import { PitchDetector } from '../services/pitchDetector';
import { quantizeToNotes } from '../services/quantizer';
import { Metronome } from '../services/metronome';

export type RecordingState = 'idle' | 'countdown' | 'recording' | 'processing';

export function useRecording() {
  const { currentProject, selectedLayerId, updateLayerNotes } = useProjectContext();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [countdownBeat, setCountdownBeat] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const captureRef = useRef<AudioCaptureSession | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Keep stable ref to stopRecording to avoid stale closure in auto-stop
  const stopRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    detectorRef.current?.stop();
    captureRef.current?.stop();
    metronomeRef.current?.stop();
    captureRef.current = null;
    detectorRef.current = null;
    metronomeRef.current = null;
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
        setError(
          'No notes detected. Make sure your microphone is working and hum clearly.'
        );
      } else {
        setError(null);
      }
      updateLayerNotes(layerId, notes);
    } catch {
      setError('Processing failed. Please try recording again.');
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
    } catch (err) {
      if (err instanceof MicrophonePermissionDenied) {
        setMicDenied(true);
      } else {
        setError('Could not access microphone. Please check your device.');
      }
      return;
    }

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

    metronome.onBeat((beat) => {
      setCountdownBeat(beat);

      if (!actuallyRecording) {
        countdownCount++;
        if (countdownCount >= beatsPerMeasure) {
          actuallyRecording = true;

          // Start audio capture + pitch detection
          const capture = new AudioCaptureSession(stream);
          captureRef.current = capture;
          capture.onMaxDuration = () => stopRef.current?.();

          const detector = new PitchDetector(capture.analyserNode, capture.audioContext);
          detectorRef.current = detector;
          detector.start();

          setRecordingState('recording');
          setElapsedMs(0);
          timerRef.current = setInterval(() => {
            setElapsedMs(captureRef.current?.getElapsedMs() ?? 0);
          }, 100);
        }
      }
    });

    await metronome.start();
  }, [currentProject, selectedLayerId]);

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
