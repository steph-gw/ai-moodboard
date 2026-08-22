'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useBoard } from '../context/BoardContext';
import {
  PINTEREST_BOARDS,
  PINTEREST_PINS,
  type PinterestBoard,
  type PinterestPin,
} from '../data/pinterestPins';

function PinterestLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        fill="#E60023"
        d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.334 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.888-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.001 24c6.624 0 11.999-5.373 11.999-12C24 5.372 18.627.001 12 0z"
      />
    </svg>
  );
}

function PinCard({
  pin,
  onAdd,
  justAdded,
}: {
  pin: PinterestPin;
  onAdd: (pin: PinterestPin) => void;
  justAdded: boolean;
}) {
  return (
    <button
      type="button"
      className={`pinterest-pin pinterest-pin-${pin.height}`}
      onClick={() => onAdd(pin)}
      title={`Add “${pin.title}” to slide`}
    >
      <img src={pin.url} alt={pin.title} loading="lazy" />
      <div className="pinterest-pin-meta">
        <p className="pinterest-pin-title">{pin.title}</p>
        <p className="pinterest-pin-sub">
          {pin.boardName} · {pin.saves}
        </p>
      </div>
      {justAdded && <span className="pinterest-pin-added">Added</span>}
    </button>
  );
}

export function PinterestPicker() {
  const {
    showSuggestionsPanel,
    setShowSuggestionsPanel,
    addUploadedImage,
    activeSectionName,
  } = useBoard();

  const [query, setQuery] = useState('');
  const [board, setBoard] = useState<PinterestBoard>('all');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const pins = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PINTEREST_PINS.filter((pin) => {
      if (board !== 'all' && pin.board !== board) return false;
      if (!q) return true;
      return (
        pin.title.toLowerCase().includes(q) ||
        pin.boardName.toLowerCase().includes(q) ||
        pin.author.toLowerCase().includes(q) ||
        pin.board.includes(q)
      );
    });
  }, [board, query]);

  if (!showSuggestionsPanel) return null;

  const handleAdd = (pin: PinterestPin) => {
    addUploadedImage(pin.url, ['Pinterest', pin.boardName]);
    setJustAddedId(pin.id);
    window.setTimeout(() => setJustAddedId(null), 1200);
  };

  return (
    <>
      <button
        type="button"
        className="pinterest-drawer-backdrop"
        aria-label="Close Pinterest"
        onClick={() => setShowSuggestionsPanel(false)}
      />
      <aside className="pinterest-drawer" role="dialog" aria-label="Pinterest">
        <div className="pinterest-picker-header">
          <div className="pinterest-picker-brand">
            <PinterestLogo size={28} />
            <div>
              <p className="pinterest-picker-title">Pinterest</p>
              <p className="pinterest-picker-account">
                Connected as <strong>@ashworth.linden</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pinterest-picker-close"
            onClick={() => setShowSuggestionsPanel(false)}
            aria-label="Close Pinterest"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="pinterest-picker-search">
          <Search size={14} strokeWidth={1.8} className="pinterest-picker-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search pins for ${activeSectionName.toLowerCase()}…`}
            aria-label="Search Pinterest pins"
          />
        </div>

        <div className="pinterest-picker-boards" role="tablist" aria-label="Pinterest boards">
          {PINTEREST_BOARDS.map((b) => (
            <button
              key={b.id}
              type="button"
              role="tab"
              aria-selected={board === b.id}
              className={`pinterest-board-chip ${board === b.id ? 'active' : ''}`}
              onClick={() => setBoard(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>

        <div className="pinterest-picker-grid">
          {pins.length === 0 ? (
            <p className="pinterest-picker-empty">No pins match that search.</p>
          ) : (
            pins.map((pin) => (
              <PinCard
                key={pin.id}
                pin={pin}
                onAdd={handleAdd}
                justAdded={justAddedId === pin.id}
              />
            ))
          )}
        </div>
      </aside>
    </>
  );
}
