import { memo, useEffect, useRef } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { renderTabNotation } from '../../services/notationRenderer';

export const TabView = memo(function TabView() {
  const { currentProject, selectedLayerId } = useProjectContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLayer = currentProject?.layers.find((l) => l.id === selectedLayerId);
  const notes = selectedLayer?.notes ?? [];
  const octaveShift = selectedLayer?.octaveShift ?? 0;

  useEffect(() => {
    if (!containerRef.current || !currentProject) return;
    if (notes.length === 0) {
      containerRef.current.innerHTML = '';
      return;
    }
    try {
      renderTabNotation(
        containerRef.current,
        notes,
        currentProject.timeSignature,
        selectedLayer?.instrument ?? 'guitar',
        octaveShift
      );
    } catch (err) {
      console.error('Tab render error:', err);
    }
  }, [notes, currentProject, selectedLayer, octaveShift]);

  if (!selectedLayer || notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-5xl mb-3">🎸</div>
          <p className="text-gray-400 text-sm">
            {!selectedLayer
              ? 'Select a layer to see its tab'
              : 'Record a melody to see tab notation here'}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full overflow-x-auto" />;
});
