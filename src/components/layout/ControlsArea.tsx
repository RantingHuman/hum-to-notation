import { useProjectContext } from '../../context/ProjectContext';
import { TempoControls } from '../controls/TempoControls';
import { TimeSignatureSelector } from '../controls/TimeSignatureSelector';
import { MetronomeControls } from '../controls/MetronomeControls';

export function ControlsArea() {
  const { currentProject } = useProjectContext();

  if (!currentProject) return null;

  return (
    <div className="bg-surface border-b border-line px-4 py-3">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <TempoControls />
        <div className="hidden sm:block w-px bg-surface-muted self-stretch" />
        <TimeSignatureSelector />
        <div className="hidden sm:block w-px bg-surface-muted self-stretch" />
        <MetronomeControls />
      </div>
    </div>
  );
}

