import type { Document } from '@/types';

const DEFAULT_COVER = 'https://cdn.pixabay.com/photo/2018/01/17/18/43/book-3088777_960_720.png';

interface CardProps {
  document: Document;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

export function Card({ document, isFavorite, onToggleFavorite, onClick }: CardProps) {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = DEFAULT_COVER;
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
  };

  return (
    <article
      className="card"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      data-id={document.id}
    >
      <div className="cover">
        <img
          src={document.cover || DEFAULT_COVER}
          alt={`Portada de ${document.name}`}
          loading="lazy"
          decoding="async"
          onError={handleImageError}
        />
        <div className="cover-title">{document.name}</div>
      </div>

      <div className="meta">
        <h3 className="title">{document.name}</h3>
        <div className="chips">
          {document.folder && <span className="chip">{document.folder}</span>}
          {document.subfolder && <span className="chip">{document.subfolder}</span>}
        </div>
        <div className="card-footer">
          <a
            href={document.url}
            target="_blank"
            rel="noopener noreferrer"
            className="open-link"
            onClick={handleOpenClick}
          >
            Abrir
          </a>
          <button
            className="btn"
            type="button"
            onClick={handleFavoriteClick}
          >
            {isFavorite ? '⭐ Guardado' : '☆ Guardar'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default Card;
