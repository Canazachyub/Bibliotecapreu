import { useEffect, useRef } from 'react';
import type { Document } from '@/types';

const DEFAULT_COVER = 'https://cdn.pixabay.com/photo/2018/01/17/18/43/book-3088777_960_720.png';

interface ModalProps {
  document: Document | null;
  isOpen: boolean;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}

export function Modal({ document, isOpen, isFavorite, onClose, onToggleFavorite }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = DEFAULT_COVER;
  };

  // Cerrar al hacer clic fuera del contenido
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!document) return null;

  return (
    <dialog
      ref={dialogRef}
      id="itemDialog"
      aria-label="Detalles del documento"
      onClick={handleBackdropClick}
    >
      <button
        className="dialog-close-btn"
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
      >
        ×
      </button>

      <div className="dialog-body">
        <div className="dialog-cover">
          <img
            src={document.cover || DEFAULT_COVER}
            alt="Portada"
            loading="lazy"
            onError={handleImageError}
          />
        </div>
        <div className="dialog-content">
          <h3>{document.name}</h3>
          <div className="chips">
            {document.folder && <span className="chip">{document.folder}</span>}
            {document.subfolder && <span className="chip">{document.subfolder}</span>}
          </div>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            {document.folder || ''}{document.subfolder ? ` / ${document.subfolder}` : ''}
          </p>
        </div>
      </div>

      <div className="dialog-actions">
        <a
          className="btn primary"
          href={document.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir
        </a>
        <button className="btn" type="button" onClick={onToggleFavorite}>
          {isFavorite ? '⭐ Quitar de favoritos' : '⭐ Agregar a favoritos'}
        </button>
        <button className="btn" type="button" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </dialog>
  );
}

export default Modal;
