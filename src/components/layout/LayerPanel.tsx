import { useState } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { useRecordingContext } from '../../context/RecordingContext';
import { usePlaybackContext } from '../../context/PlaybackContext';
import { InstrumentSelector, INSTRUMENT_OPTIONS } from '../controls/InstrumentSelector';

export function LayerPanel() {
  const {
    currentProject,
    selectedLayerId,
    addLayer,
    selectLayer,
    deleteLayer,
    clearLayerNotes,
    shiftOctave,
  } = useProjectContext();
  const { startRecording, recordingState } = useRecordingContext();
  const { playLayer, stop: stopPlayback, playingLayerId } = usePlaybackContext();
  const [addingLayer, setAddingLayer] = useState(false);

  if (!currentProject) return null;

  const layers = currentProject.layers;
  const atMax = layers.length >= 2;
  const isIdle = recordingState === 'idle';

  const handleReRecord = async (layerId: string) => {
    selectLayer(layerId);
    clearLayerNotes(layerId);
    // Small delay so context update propagates before recording starts
    await new Promise((r) => setTimeout(r, 50));
    await startRecording();
  };

  return (
    <div className="bg-gray-800 border-t border-gray-700 md:border-t-0 md:border-l w-full md:w-64 shrink-0 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold">Layers</h2>
        <button
          onClick={() => setAddingLayer(true)}
          disabled={atMax || addingLayer}
          title={atMax ? 'Maximum 2 layers' : 'Add a layer'}
          className={`text-xs px-2.5 py-1 rounded transition-colors min-h-[32px] ${
            atMax || addingLayer
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          + Add Layer
        </button>
      </div>

      {addingLayer && (
        <InstrumentSelector
          onSelect={(instrument) => {
            addLayer(instrument);
            setAddingLayer(false);
          }}
          onCancel={() => setAddingLayer(false)}
        />
      )}

      {layers.length === 0 && !addingLayer ? (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">No layers yet</p>
          <p className="text-gray-500 text-xs mt-1">Add a layer to start recording</p>
        </div>
      ) : (
        <div className="space-y-2">
          {layers.map((layer, idx) => {
            const isSelected = layer.id === selectedLayerId;
            const instrument = INSTRUMENT_OPTIONS.find((o) => o.value === layer.instrument);
            const noteCount = layer.notes.filter((n) => !n.isRest).length;
            const hasNotes = noteCount > 0;

            return (
              <div
                key={layer.id}
                onClick={() => selectLayer(layer.id)}
                className={`rounded-lg p-3 border cursor-pointer transition-all ${
                  playingLayerId === layer.id
                    ? 'border-green-500 bg-green-900/20 ring-1 ring-green-500/50'
                    : isSelected
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{instrument?.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">Layer {idx + 1}</p>
                      <p className="text-gray-400 text-xs">{instrument?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <span className="text-purple-400 text-xs font-medium mr-1">Active</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="text-gray-500 hover:text-red-400 text-xs transition-colors p-1"
                      title="Remove layer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Note count */}
                <p className="text-gray-500 text-xs mb-2">
                  {noteCount} note{noteCount !== 1 ? 's' : ''} recorded
                </p>

                {/* Octave shift row */}
                <div
                  className="flex items-center justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="text-gray-400 text-xs">Octave</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => shiftOctave(layer.id, -1)}
                      disabled={layer.octaveShift <= -3}
                      className="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs flex items-center justify-center transition-colors"
                      title="Shift down one octave"
                    >
                      −
                    </button>
                    <span className="text-white text-xs w-8 text-center font-mono">
                      {layer.octaveShift > 0 ? `+${layer.octaveShift}` : layer.octaveShift}
                    </span>
                    <button
                      onClick={() => shiftOctave(layer.id, 1)}
                      disabled={layer.octaveShift >= 3}
                      className="w-6 h-6 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs flex items-center justify-center transition-colors"
                      title="Shift up one octave"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Play / Stop row (only when layer has notes) */}
                {hasNotes && (
                  <div
                    className="flex items-center gap-2 mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {playingLayerId === layer.id ? (
                      <button
                        onClick={stopPlayback}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded bg-red-700 hover:bg-red-600 text-white text-xs transition-colors"
                        title="Stop playback"
                      >
                        <span className="w-2.5 h-2.5 bg-white rounded-sm inline-block" />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => playLayer(layer.id)}
                        disabled={recordingState !== 'idle'}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs transition-colors"
                        title={recordingState !== 'idle' ? 'Stop recording first' : 'Play this layer'}
                      >
                        <span className="text-xs">▶</span>
                        Play
                      </button>
                    )}
                  </div>
                )}

                {/* Re-record button (only when has notes and idle) */}
                {hasNotes && isSelected && isIdle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReRecord(layer.id);
                    }}
                    className="mt-2 w-full text-xs py-1 rounded bg-gray-600 hover:bg-red-700 text-gray-300 hover:text-white transition-colors"
                    title="Discard current notes and re-record this layer"
                  >
                    🔄 Re-record
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {layers.length > 0 && (
        <p className="text-gray-500 text-xs mt-auto pt-2 border-t border-gray-700">
          {selectedLayerId
            ? '🔴 Press the record button to capture a melody'
            : 'Select a layer to record into it'}
        </p>
      )}
    </div>
  );
}

