import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectContext } from '../context/ProjectContext';
import { BrowserWarning } from './BrowserWarning';
import { LoadingSpinner } from './common/LoadingSpinner';
import { checkBrowserSupport } from '../utils/browserCompat';
import { nextUntitledName } from '../utils/projectNames';

const browserSupport = checkBrowserSupport(); // run once at module load

export function ProjectDashboard() {
  const { projectList, isLoading, createProject, deleteProject } =
    useProjectContext();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // No naming step: new melodies get "Untitled melody N" and can be renamed in the workspace
  const handleCreate = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const project = await createProject(nextUntitledName(projectList.map((p) => p.name)));
      navigate(`/project/${project.id}`);
    } finally {
      setCreating(false);
    }
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
            <span>Melodies are saved in this browser only. Export to keep a permanent copy.</span>
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full flex items-center justify-center gap-3 min-h-18 mb-8 rounded-2xl bg-primary hover:bg-primary-strong active:scale-[0.99] disabled:opacity-60 text-white font-display text-xl font-semibold shadow-[0_6px_18px_rgba(185,84,47,0.25)] transition-all"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
          Hum a new melody
        </button>

        {projectList.length > 0 && (
          <h2 className="font-display text-ink font-semibold text-lg mb-3">Your melodies</h2>
        )}

        {/* Project list */}
        {projectList.length === 0 ? (
          <p className="text-center text-ink-muted py-8">
            Your melodies will appear here.
          </p>
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
