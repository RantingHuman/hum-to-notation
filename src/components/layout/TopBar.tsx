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
    <header className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-lg border-b border-gray-700">
      {currentProject ? (
        <>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors text-sm shrink-0"
              title="Back to projects"
            >
              ← Projects
            </button>
            {editing ? (
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={handleKeyDown}
                className="bg-gray-700 text-white px-2 py-0.5 rounded border border-purple-500 focus:outline-none text-sm font-semibold min-w-0 w-40"
              />
            ) : (
              <button
                onClick={startEdit}
                className="text-white font-semibold text-sm truncate hover:text-purple-300 transition-colors"
                title="Click to rename"
              >
                {currentProject.name}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 hidden sm:block">Auto-saved</span>
            <ExportMenu notationContainerRef={notationContainerRef} />
          </div>
        </>
      ) : (
        <h1 className="text-xl font-bold text-purple-400">🎵 Hum to Notation</h1>
      )}
    </header>
  );
}

