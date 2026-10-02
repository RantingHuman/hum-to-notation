import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
import { BrowserWarning } from './BrowserWarning';
import { LoadingSpinner } from './common/LoadingSpinner';
import { checkBrowserSupport } from '../utils/browserCompat';

const browserSupport = checkBrowserSupport(); // run once at module load

export function ProjectDashboard() {
  const { projectList, isLoading, createProject, deleteProject } =
    useProjectContext();
  const navigate = useNavigate();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);

  const handleCreate = async () => {
    const name = newName.trim() || 'Untitled Project';
    setCreating(false);
    setNewName('');
    const project = await createProject(name);
    if (project) navigate(`/project/${project.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setCreating(false); setNewName(''); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Header */}
      <header className="bg-surface px-6 py-5 border-b border-line">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-display text-3xl font-semibold text-primary">🎵 Hum to Notation</h1>
          <p className="text-ink-muted text-sm mt-1">
            Hum a melody — get sheet music &amp; tablature instantly
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Browser compatibility warning */}
        {!warningDismissed && (
          <BrowserWarning
            support={browserSupport}
            onDismiss={browserSupport.supported ? () => setWarningDismissed(true) : undefined}
          />
        )}

        {/* Storage-only reminder (only when no other warning shown) */}
        {(warningDismissed || browserSupport.warnings.length === 0) && (
          <div className="bg-amber-soft border border-amber rounded-lg px-4 py-3 mb-6 text-ink text-sm flex gap-2">
            <span>⚠️</span>
            <span>Projects are saved in your browser only. Export to keep a permanent copy.</span>
          </div>
        )}

        {/* Create new project */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-ink font-semibold text-lg">Your Projects</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="bg-primary hover:bg-primary-strong active:bg-primary-strong text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
            >
              + New Project
            </button>
          )}
        </div>

        {creating && (
          <div className="bg-surface rounded-lg p-4 mb-4 border border-peach">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Project name..."
              className="w-full bg-surface-muted text-ink px-3 py-2 rounded border border-line focus:border-peach focus:outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary-strong text-white px-4 py-2 rounded text-sm font-medium transition-colors min-h-[44px]"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="bg-surface-muted hover:bg-surface-strong text-ink px-4 py-2 rounded text-sm transition-colors min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Project list */}
        {projectList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🎵</div>
            <p className="text-ink-muted text-lg mb-2">No projects yet</p>
            <p className="text-ink-muted text-sm">Create one to start recording your melody!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectList.map((project) => (
              <div
                key={project.id}
                className="bg-surface rounded-lg p-4 border border-line flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-ink font-medium truncate">{project.name}</p>
                  <p className="text-ink-muted text-xs mt-0.5">
                    Modified {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/project/${project.id}`)}
                    className="bg-primary hover:bg-primary-strong text-white px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px]"
                  >
                    Open
                  </button>

                  {confirmDelete === project.id ? (
                    <>
                      <button
                        onClick={() => {
                          deleteProject(project.id);
                          setConfirmDelete(null);
                        }}
                        className="bg-danger hover:bg-danger-strong text-white px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="bg-surface-muted hover:bg-surface-strong text-ink px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(project.id)}
                      className="bg-surface-muted hover:bg-surface-strong text-ink px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
