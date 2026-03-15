import { ProjectProvider, useProjectContext } from './context/ProjectContext';
import { RecordingProvider } from './context/RecordingContext';
import { PlaybackProvider } from './context/PlaybackContext';
import { ProjectDashboard } from './components/ProjectDashboard';
import { TopBar } from './components/layout/TopBar';
import { ControlsArea } from './components/layout/ControlsArea';
import { NotationDisplay } from './components/layout/NotationDisplay';
import { LayerPanel } from './components/layout/LayerPanel';
import { RecordButton } from './components/layout/RecordButton';

function Workspace() {
  return (
    <RecordingProvider>
      <PlaybackProvider>
        <div className="min-h-screen bg-gray-900 flex flex-col">
          <TopBar />
          <ControlsArea />
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden" style={{ minHeight: 0 }}>
            <NotationDisplay />
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
    <ProjectProvider>
      <AppInner />
    </ProjectProvider>
  );
}

export default App;
