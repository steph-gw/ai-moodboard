import { useRef } from 'react';
import { Image as ImageIcon, ImagePlus, Type, Undo2 } from 'lucide-react';
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
    canEdit,
  } = useBoard();

  const { features, onError } = useHost();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files ?? [])];
    // Cleared so picking the same file twice still fires a change event.
    e.target.value = '';
    if (!files.length) return;

    // `accept` is a filter in the picker, not a rule — drag-and-drop and "All files" both
    // get past it, and a PDF uploaded as an image element renders as a broken box that
    // nothing explains.
    const images = files.filter((f) => f.type.startsWith('image/'));
    const rejected = files.length - images.length;
    if (rejected) {
      onError(
        rejected === files.length
          ? 'Only images can be added to a slide.'
          : `Skipped ${rejected} file${rejected === 1 ? '' : 's'} that ${rejected === 1 ? 'is' : 'are'} not an image.`
      );
    }

    // Sequential rather than parallel: each upload creates a Moodboard Image row and places
    // an element, and running them together would race over the same slide's elements.
    void (async () => {
      for (const file of images) await uploadAndAddImage(file);
    })();
  };

  // A client reviews; a locked slide is closed for redesign. The mutations are refused
  // either way, so what's left is not offering a row of buttons that do nothing.
  if (!canEdit) return null;

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
          <ImageIcon size={13} strokeWidth={1.5} />
          {isUploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleUpload}
        />
    </div>
  );
}
