import { useState } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import type { Instrument } from '../../types/music';

const INSTRUMENT_OPTIONS: { value: Instrument; label: string; icon: string }[] = [
  { value: 'guitar', label: 'Guitar', icon: '🎸' },
  { value: 'bass', label: 'Bass Guitar', icon: '🎵' },
];

export function LayerPanel() {
  const { currentProject, selectedLayerId, addLayer, selectLayer, deleteLayer } =
    useProjectContext();
  const [addingLayer, setAddingLayer] = useState(false);

  if (!currentProject) return null;

  const layers = currentProject.layers;
  const atMax = layers.length >= 2;

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

      {/* Instrument picker */}
      {addingLayer && (
        <div className="bg-gray-700 rounded-lg p-3 border border-purple-500 space-y-2">
          <p className="text-gray-300 text-xs font-medium">Choose instrument:</p>
          <div className="flex gap-2">
            {INSTRUMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  addLayer(opt.value);
                  setAddingLayer(false);
                }}
                className="flex-1 bg-gray-600 hover:bg-purple-700 text-white py-2 rounded text-sm transition-colors flex flex-col items-center gap-1"
              >
                <span className="text-xl">{opt.icon}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setAddingLayer(false)}
            className="w-full text-gray-400 hover:text-white text-xs py-1 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Layer list */}
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
            return (
              <div
                key={layer.id}
                onClick={() => selectLayer(layer.id)}
                className={`rounded-lg p-3 border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-900/30'
                    : 'border-gray-600 bg-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{instrument?.icon}</span>
                    <div>
                      <p className="text-white text-sm font-medium">
                        Layer {idx + 1}
                      </p>
                      <p className="text-gray-400 text-xs">{instrument?.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <span className="text-purple-400 text-xs font-medium">Active</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="text-gray-500 hover:text-red-400 text-xs ml-2 transition-colors"
                      title="Remove layer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  {layer.notes.filter((n) => !n.isRest).length} note
                  {layer.notes.filter((n) => !n.isRest).length !== 1 ? 's' : ''} recorded
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Record hint */}
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

