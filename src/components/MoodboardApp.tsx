'use client';

import { BoardProvider, useBoard } from '@/context/BoardContext';
import { TopNav } from '@/components/TopNav';
import { SectionTabs } from '@/components/SectionTabs';
import { SlideStrip } from '@/components/SlideStrip';
import { MainCanvas } from '@/components/MainCanvas';
import { CommentWidget } from '@/components/CommentWidget';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PresentOverlay } from '@/components/PresentOverlay';
import { PinterestPicker } from '@/components/PinterestPicker';
import { CommentDrawer } from '@/components/CommentDrawer';
import { ExportSheet } from '@/components/ExportSheet';

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

function MoodboardShell() {
  const { isPresenting } = useBoard();

  return (
    <div className="app">
      <TopNav />
      {!isPresenting && <SectionTabs />}
      <div className="app-body">
        {!isPresenting && <SlideStrip />}
        <MainCanvas />
        {!isPresenting && <CommentDrawer />}
        {!isPresenting && <PinterestPicker />}
      </div>
      {!isPresenting && <CommentWidget />}
      {!isPresenting && <RoleToggle />}
      {isPresenting && <PresentOverlay />}
      <ExportSheet />
    </div>
  );
}

export function MoodboardApp() {
  return (
    <ErrorBoundary>
      <BoardProvider>
        <MoodboardShell />
      </BoardProvider>
    </ErrorBoundary>
  );
}
