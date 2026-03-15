import { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { ProjectProvider, useProjectContext } from './context/ProjectContext';
import { RecordingProvider } from './context/RecordingContext';
import { PlaybackProvider } from './context/PlaybackContext';
import { ToastProvider } from './context/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ProjectDashboard } from './components/ProjectDashboard';
import { TopBar } from './components/layout/TopBar';
import { ControlsArea } from './components/layout/ControlsArea';
import { NotationDisplay } from './components/layout/NotationDisplay';
import { LayerPanel } from './components/layout/LayerPanel';
import { RecordButton } from './components/layout/RecordButton';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function Workspace() {
  const notationContainerRef = useRef<HTMLElement>(null);

  return (
    <RecordingProvider>
      <PlaybackProvider>
        <div className="min-h-screen bg-gray-900 flex flex-col">
          <TopBar notationContainerRef={notationContainerRef} />
          <ControlsArea />
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ minHeight: 0 }}>
            <NotationDisplay notationContainerRef={notationContainerRef} />
            <LayerPanel />
          </div>
          <RecordButton />
        </div>
      </PlaybackProvider>
    </RecordingProvider>
  );
}

function ProjectRoute() {
  const { id } = useParams<{ id: string }>();
  const { currentProject, openProject, isLoading } = useProjectContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    // Only load if we don't already have this project open
    if (currentProject?.id === id) return;
    openProject(id).catch(() => navigate('/', { replace: true }));
  }, [id]);

  if (isLoading || (id && !currentProject)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Project not found after loading is complete
  if (!currentProject) {
    return <Navigate to="/" replace />;
  }

  return <Workspace />;
}

function AppInner() {
  return (
    <Routes>
      <Route path="/" element={<ProjectDashboard />} />
      <Route path="/project/:id" element={<ProjectRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <ProjectProvider>
          <AppInner />
        </ProjectProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
