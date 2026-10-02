import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../../context/ProjectContext';
import { ExportMenu } from '../ExportMenu';

interface Props {
  notationContainerRef: React.RefObject<HTMLElement | null>;
}

export function TopBar({ notationContainerRef }: Props) {
  const { currentProject, closeProject, updateCurrentProject } = useProjectContext();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startEdit = () => {
    setNameInput(currentProject?.name ?? '');
    setEditing(true);
  };

  const commitEdit = () => {
    const name = nameInput.trim();
    if (name && currentProject) {
      updateCurrentProject({ name });
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  const handleClose = () => {
    closeProject();
    navigate('/');
  };

  return (
    <header className="bg-canvas text-ink px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-lg border-b border-line">
      {currentProject ? (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="text-ink-muted hover:text-ink transition-colors text-sm shrink-0"
              title="Back to your melodies"
            >
              ← Melodies
            </button>
            {editing ? (
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="bg-surface-muted text-ink px-2 py-0.5 rounded border border-peach focus:outline-none text-sm font-semibold min-w-0 w-40"
              />
            ) : (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 min-w-0 text-ink font-semibold text-sm hover:text-primary-strong transition-colors"
                title="Rename"
              >
                <span className="truncate">{currentProject.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-muted">
                  <path d="M4 20h4L19 9l-4-4L4 16z" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-muted hidden sm:block">Auto-saved</span>
            <ExportMenu notationContainerRef={notationContainerRef} />
          </div>
        </>
      ) : (
        <h1 className="font-display text-xl font-semibold text-primary">🎵 Hum to Notation</h1>
      )}
    </header>
  );
}

