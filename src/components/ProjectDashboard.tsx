import { useState } from 'react';
import { useProjectContext } from '../context/ProjectContext';

export function ProjectDashboard() {
  const { projectList, isLoading, createProject, openProject, deleteProject } =
    useProjectContext();
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = newName.trim() || 'Untitled Project';
    setCreating(false);
    setNewName('');
    await createProject(name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
    if (e.key === 'Escape') { setCreating(false); setNewName(''); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 px-6 py-5 border-b border-gray-700">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-purple-400">🎵 Hum to Notation</h1>
          <p className="text-gray-400 text-sm mt-1">
            Hum a melody — get sheet music &amp; tablature instantly
          </p>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Browser-only warning */}
        <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg px-4 py-3 mb-6 text-yellow-200 text-sm flex gap-2">
          <span>⚠️</span>
          <span>
            Projects are saved in your browser only. Export to keep a permanent copy.
          </span>
        </div>

        {/* Create new project */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Your Projects</h2>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]"
            >
              + New Project
            </button>
          )}
        </div>

        {creating && (
          <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-purple-500">
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Project name..."
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-purple-500 focus:outline-none mb-3"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors min-h-[44px]"
              >
                Create
              </button>
              <button
                onClick={() => { setCreating(false); setNewName(''); }}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors min-h-[44px]"
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
            <p className="text-gray-400 text-lg mb-2">No projects yet</p>
            <p className="text-gray-500 text-sm">Create one to start recording your melody!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectList.map((project) => (
              <div
                key={project.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{project.name}</p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    Modified {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openProject(project.id)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors min-h-[44px]"
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
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(project.id)}
                      className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded text-sm transition-colors min-h-[44px]"
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
