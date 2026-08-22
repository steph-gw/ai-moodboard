import { useRef } from 'react';
import { Type, ImagePlus, Trash2 } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import { TextFormatBar } from './TextFormatBar';

export function CanvasToolbar() {
  const {
    addTextElement,
    selectedElementId,
    activeSlideId,
    activeSlide,
    deleteElement,
    setShowSuggestionsPanel,
    showSuggestionsPanel,
    addUploadedImage,
  } = useBoard();

  const selectedIsText =
    activeSlide?.elements.find((el) => el.id === selectedElementId)?.type === 'text';

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    addUploadedImage(URL.createObjectURL(file));
    e.target.value = '';
  };

  return (
    <div className="canvas-toolbar-wrap">
      <div className="canvas-toolbar">
        <button type="button" className="btn-ghost btn-sm" onClick={addTextElement}>
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
        {selectedElementId && activeSlideId && (
          <button
            type="button"
            className="btn-ghost btn-sm canvas-toolbar-delete"
            onClick={() => deleteElement(activeSlideId, selectedElementId)}
          >
            <Trash2 size={13} strokeWidth={1.5} />
            Delete
          </button>
        )}
      </div>
      {selectedIsText && <TextFormatBar />}
    </div>
  );
}
