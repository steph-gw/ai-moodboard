import { BoardProvider, useBoard } from '../context/BoardContext';
import { TopNav } from './TopNav';
import { SectionTabs } from './SectionTabs';
import { SlideStrip } from './SlideStrip';
import { MainCanvas } from './MainCanvas';
import { CommentWidget } from './CommentWidget';
import { ErrorBoundary } from './ErrorBoundary';
import { PresentOverlay } from './PresentOverlay';
import { PinterestPicker } from './PinterestPicker';
import { CommentDrawer } from './CommentDrawer';
import { ExportSheet } from './ExportSheet';
import { HostProvider, useHost } from '../embed/HostProvider';
import type { BoardRepo } from '../embed/boardRepo';
import type { GWMoodboardProps } from '../embed/types';

function MoodboardShell() {
  const { isPresenting, isLoading, exportTarget } = useBoard();
  const { features } = useHost();

  if (isLoading) {
    return (
      <div className="app app-loading">
        {/* The house palette, filling in one swatch at a time. Quieter than a spinner and
            it says what is coming — a board of colour — rather than just that something
            is happening. */}
        <div className="loading-swatches" aria-hidden>
          <span style={{ background: '#F6EFE0' }} />
          <span style={{ background: '#EDE5D8' }} />
          <span style={{ background: '#DED6C8' }} />
          <span style={{ background: '#B8935F' }} />
          <span style={{ background: '#6B645A' }} />
          <span style={{ background: '#2A2723' }} />
        </div>
        <span className="loading-label">Loading moodboard</span>
      </div>
    );
  }

  return (
    <div className="app">
      <TopNav />
      {!isPresenting && <SectionTabs />}
      <div className="app-body">
        {!isPresenting && <SlideStrip />}
        <MainCanvas />
        {!isPresenting && features.comments && <CommentDrawer />}
        {!isPresenting && features.pinterest && <PinterestPicker />}
      </div>
      {!isPresenting && features.comments && <CommentWidget />}
      {isPresenting && <PresentOverlay />}
      <ExportSheet target={exportTarget} />
    </div>
  );
}

interface Props extends GWMoodboardProps {
  rootEl: HTMLElement;
  portalHost: HTMLElement;
  /** Dev harness only — lets a local store stand in for Bubble. */
  repoOverride?: BoardRepo | null;
}

export function MoodboardApp(props: Props) {
  return (
    <ErrorBoundary>
      <HostProvider {...props}>
        <BoardProvider>
          <MoodboardShell />
        </BoardProvider>
      </HostProvider>
    </ErrorBoundary>
  );
}
