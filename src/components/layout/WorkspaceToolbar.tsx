import { useState } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { useRecordingContext } from '../../context/RecordingContext';
import { TempoControls } from '../controls/TempoControls';
import { TimeSignatureSelector } from '../controls/TimeSignatureSelector';
import { MetronomeControls } from '../controls/MetronomeControls';
import type { Instrument } from '../../types/music';

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  guitar: 'Guitar',
  bass: 'Bass',
};

type OpenPanel = 'settings' | 'instrument' | null;

const chipClass = (open: boolean) =>
  `flex items-center gap-1.5 min-h-10 px-3.5 rounded-full border text-sm font-semibold transition-colors ${
    open ? 'bg-frost border-peach text-ink' : 'bg-surface border-line text-ink hover:border-line-strong'
  }`;

/**
 * One row of compact chips. Settings that most people never change (tempo,
 * time signature, click) and the layer's instrument and octave live behind
 * them, so the workspace leads with recording and the notation.
 */
export function WorkspaceToolbar() {
  const {
    currentProject,
    selectedLayerId,
    selectLayer,
    deleteLayer,
    setLayerInstrument,
    shiftOctave,
  } = useProjectContext();
  const { recordingState } = useRecordingContext();
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  if (!currentProject) return null;

  const layer = currentProject.layers.find((l) => l.id === selectedLayerId);
  const { tempo, timeSignature, metronomeMode, layers } = currentProject;
  const isIdle = recordingState === 'idle';
  const toggle = (panel: Exclude<OpenPanel, null>) =>
    setOpenPanel((current) => (current === panel ? null : panel));

  const octaveLabel = layer && layer.octaveShift !== 0
    ? ` · ${layer.octaveShift > 0 ? '+' : ''}${layer.octaveShift} oct`
    : '';

  return (
    <div className="bg-surface border-b border-line">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <button
          onClick={() => toggle('settings')}
          aria-expanded={openPanel === 'settings'}
          className={chipClass(openPanel === 'settings')}
          title="Tempo, time signature and click"
        >
          <span aria-hidden="true">♩</span>
          {tempo} · {timeSignature.numerator}/{timeSignature.denominator} · Click: {metronomeMode === 'audio' ? 'sound' : 'flash'}
          <span aria-hidden="true" className="text-ink-muted">▾</span>
        </button>

        {layer && (
          <button
            onClick={() => toggle('instrument')}
            aria-expanded={openPanel === 'instrument'}
            className={chipClass(openPanel === 'instrument')}
            title="Instrument and octave"
          >
            {INSTRUMENT_LABELS[layer.instrument]}{octaveLabel}
            <span aria-hidden="true" className="text-ink-muted">▾</span>
          </button>
        )}

        {/* Layer tabs only appear once there is a second layer */}
        {layers.length > 1 && (
          <div role="tablist" aria-label="Layers" className="flex items-center gap-1 ml-auto">
            {layers.map((l) => {
              const selected = l.id === selectedLayerId;
              return (
                <div
                  key={l.id}
                  className={`flex items-center rounded-full border text-sm font-semibold ${
                    selected ? 'bg-primary border-primary text-white' : 'bg-surface-muted border-line text-ink'
                  }`}
                >
                  <button
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectLayer(l.id)}
                    disabled={!isIdle}
                    className="min-h-10 pl-3.5 pr-2 disabled:cursor-not-allowed"
                  >
                    {INSTRUMENT_LABELS[l.instrument]}
                  </button>
                  <button
                    onClick={() => deleteLayer(l.id)}
                    disabled={!isIdle}
                    aria-label={`Remove ${INSTRUMENT_LABELS[l.instrument]} layer`}
                    title="Remove this layer"
                    className={`min-h-10 pr-3 pl-1 disabled:cursor-not-allowed ${selected ? 'text-white/80 hover:text-white' : 'text-ink-muted hover:text-danger'}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {openPanel === 'settings' && (
        <div className="border-t border-line bg-surface-muted px-4 py-3">
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
            <TempoControls />
            <TimeSignatureSelector />
            <MetronomeControls />
          </div>
        </div>
      )}

      {openPanel === 'instrument' && layer && (
        <div className="border-t border-line bg-surface-muted px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2">
            <span className="text-ink-muted text-xs uppercase tracking-wide font-medium">Instrument</span>
            {(Object.keys(INSTRUMENT_LABELS) as Instrument[]).map((instrument) => (
              <button
                key={instrument}
                onClick={() => setLayerInstrument(layer.id, instrument)}
                aria-pressed={layer.instrument === instrument}
                className={`min-h-9 px-3 rounded text-sm transition-colors ${
                  layer.instrument === instrument
                    ? 'bg-primary text-white'
                    : 'bg-surface text-ink border border-line hover:bg-surface-strong'
                }`}
              >
                {INSTRUMENT_LABELS[instrument]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-ink-muted text-xs uppercase tracking-wide font-medium">Octave</span>
            <button
              onClick={() => shiftOctave(layer.id, -1)}
              disabled={layer.octaveShift <= -3}
              aria-label="Shift down one octave"
              className="w-9 h-9 rounded bg-surface border border-line hover:bg-surface-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink"
            >
              −
            </button>
            <span className="text-ink text-sm w-8 text-center font-mono">
              {layer.octaveShift > 0 ? `+${layer.octaveShift}` : layer.octaveShift}
            </span>
            <button
              onClick={() => shiftOctave(layer.id, 1)}
              disabled={layer.octaveShift >= 3}
              aria-label="Shift up one octave"
              className="w-9 h-9 rounded bg-surface border border-line hover:bg-surface-strong disabled:opacity-40 disabled:cursor-not-allowed text-ink"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
