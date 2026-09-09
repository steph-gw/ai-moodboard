import { useRef } from 'react';
import { Type, ImagePlus, Undo2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';

export function CanvasToolbar() {
  const {
    addTextElement,
    setShowSuggestionsPanel,
    showSuggestionsPanel,
    uploadAndAddImage,
    isUploading,
    undo,
    canUndo,
  } = useBoard();

  const { features } = useHost();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadAndAddImage(file);
    // Cleared so picking the same file twice still fires a change event.
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
        {features.pinterest && (
          <button
            type="button"
            className={`btn-ghost btn-sm ${showSuggestionsPanel ? 'active' : ''}`}
            onClick={() => setShowSuggestionsPanel(!showSuggestionsPanel)}
          >
            <ImagePlus size={13} strokeWidth={1.5} />
            Add image
          </button>
        )}
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading…' : 'Upload'}
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
