import { useRef } from 'react';
import { Image as ImageIcon, ImagePlus, Type, Undo2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { useHost } from '../embed/HostProvider';
import { AddElementsMenu } from './AddElementsMenu';
import { compressImage } from '../utils/compressImage';

/** Base64 inflates a file by about a third on the way to Bubble, so the real ceiling is
 *  lower than it looks. Anything near this is a photo that should have been resized. */
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const mb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

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
      for (const file of images) {
        const ready = await compressImage(file);
        // The cap is checked after compression, since that is what most oversized photos
        // need to get under it. What is still too big is genuinely too big.
        if (ready.size > MAX_UPLOAD_BYTES) {
          onError(
            `${file.name} is ${mb(ready.size)}MB, over the ${mb(MAX_UPLOAD_BYTES)}MB limit.`
          );
          continue;
        }
        await uploadAndAddImage(ready);
      }
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
        <AddElementsMenu />
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
