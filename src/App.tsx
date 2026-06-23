import { BoardProvider, useBoard } from './context/BoardContext';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { MainCanvas } from './components/MainCanvas';
import { CommentWidget } from './components/CommentWidget';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PresentOverlay } from './components/PresentOverlay';
import './styles/tokens.css';
import './styles/app.css';

function RoleToggle() {
  const { role, setRole } = useBoard();
  return (
    <div className="role-toggle">
      <span className="role-toggle-label">View as</span>
      <button
        type="button"
        className={role === 'planner' ? 'active' : ''}
        onClick={() => setRole('planner')}
      >
        Planner
      </button>
      <button
        type="button"
        className={role === 'client' ? 'active' : ''}
        onClick={() => setRole('client')}
      >
        Client
      </button>
    </div>
  );
}

function MoodboardApp() {
  const { isPresenting } = useBoard();

  return (
    <div className="app">
      <TopNav />
      <div className="app-body">
        <Sidebar />
        <MainCanvas />
      </div>
      {!isPresenting && <CommentWidget />}
      {!isPresenting && <RoleToggle />}
      {isPresenting && <PresentOverlay />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BoardProvider>
        <MoodboardApp />
      </BoardProvider>
    </ErrorBoundary>
  );
}
