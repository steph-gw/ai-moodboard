import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmModalProps {
  eyebrow: string;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Narrow confirmation dialog for destructive actions. */
export function ConfirmModal({
  eyebrow,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal-card modal-card-narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
      >
        <div className="modal-head">
          <p className="modal-eyebrow is-danger">{eyebrow}</p>
          <h2 className="modal-title modal-title-sm" id="confirm-title">
            {title}
          </h2>
        </div>
        <div className="modal-body">
          <p className="modal-copy">{body}</p>
        </div>
        <div className="modal-foot">
          <button type="button" className="modal-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
