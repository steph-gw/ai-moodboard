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
import type { GWMoodboardProps } from '../embed/types';

function MoodboardShell() {
  const { isPresenting } = useBoard();
  const { features } = useHost();

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
      <ExportSheet />
    </div>
  );
}

interface Props extends GWMoodboardProps {
  rootEl: HTMLElement;
  portalHost: HTMLElement;
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
