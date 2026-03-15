import { TopBar } from './components/layout/TopBar';
import { ControlsArea } from './components/layout/ControlsArea';
import { NotationDisplay } from './components/layout/NotationDisplay';
import { LayerPanel } from './components/layout/LayerPanel';
import { RecordButton } from './components/layout/RecordButton';

function App() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <TopBar />
      <ControlsArea />
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <NotationDisplay />
        <LayerPanel />
      </div>
      <RecordButton />
    </div>
  );
}

export default App;
