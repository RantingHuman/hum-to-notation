import { memo, useEffect, useRef } from 'react';
import { useProjectContext } from '../../context/ProjectContext';
import { renderSheetMusic } from '../../services/notationRenderer';

export const SheetMusicView = memo(function SheetMusicView() {
  const { currentProject, selectedLayerId } = useProjectContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLayer = currentProject?.layers.find((l) => l.id === selectedLayerId);
  const notes = selectedLayer?.notes ?? [];
  const octaveShift = selectedLayer?.octaveShift ?? 0;
  const showNotation = Boolean(selectedLayer && notes.length > 0);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!showNotation) {
      // Always clear imperatively-injected VexFlow content so it doesn't
      // persist when the layer is deleted or deselected. containerRef is
      // always mounted (see render below), so this reliably runs.
      containerRef.current.innerHTML = '';
      return;
    }
    try {
      renderSheetMusic(
        containerRef.current,
        notes,
        currentProject!.timeSignature,
        currentProject!.tempo,
        selectedLayer!.instrument,
        octaveShift
      );
    } catch (err) {
      console.error('Sheet music render error:', err);
    }
  }, [showNotation, notes, currentProject, selectedLayer, octaveShift]);

  return (
    <>
      {/* Always keep this div mounted so containerRef.current is never null
          when the effect above needs to clear VexFlow's imperative content. */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto"
        style={{ display: showNotation ? undefined : 'none' }}
      />
      {!showNotation && (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-5xl mb-3">🎵</div>
            <p className="text-gray-400 text-sm">
              {!selectedLayer
                ? 'Select a layer to see its notation'
                : 'Record a melody to see notation here'}
            </p>
          </div>
        </div>
      )}
    </>
  );
});
