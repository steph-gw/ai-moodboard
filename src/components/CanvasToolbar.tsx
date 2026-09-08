import { useRef } from 'react';
import { Type, ImagePlus, Undo2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';

export function CanvasToolbar() {
  const {
    addTextElement,
    setShowSuggestionsPanel,
    showSuggestionsPanel,
    addUploadedImage,
    undo,
    canUndo,
  } = useBoard();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addUploadedImage(URL.createObjectURL(file));
    e.target.value = '';
  };

  return (
    <div className="canvas-toolbar">
        <button
          type="button"
          className="btn-ghost btn-sm btn-icon"
          onClick={undo}
          disabled={!canUndo}
          data-tooltip="Undo ⌘Z"
          aria-label="Undo"
        >
          <Undo2 size={13} strokeWidth={1.5} />
        </button>
        <button type="button" className="btn-ghost btn-sm" onClick={() => addTextElement()}>
          <Type size={13} strokeWidth={1.5} />
          Add text
        </button>
        <button
          type="button"
          className={`btn-ghost btn-sm ${showSuggestionsPanel ? 'active' : ''}`}
          onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
        >
          <ImagePlus size={13} strokeWidth={1.5} />
          Add image
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleUpload}
        />
    </div>
  );
}
