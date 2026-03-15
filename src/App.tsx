import { useRef } from 'react';
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

function AppInner() {
  const { currentProject } = useProjectContext();
  return currentProject ? <Workspace /> : <ProjectDashboard />;
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
