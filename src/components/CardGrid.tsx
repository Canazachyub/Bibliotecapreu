import type { Document } from '@/types';
import { Card } from './Card';
import { useMemo } from 'react';

interface CardGridProps {
  documents: Document[];
  isFavorite: (id: string) => boolean;
  onToggleFavorite: (id: string) => void;
  onCardClick: (document: Document) => void;
}

export function CardGrid({ documents, isFavorite, onToggleFavorite, onCardClick }: CardGridProps) {
  // Agrupar documentos por subfolder
  const groupedDocs = useMemo(() => {
    const groups = new Map<string, Document[]>();

    documents.forEach((doc) => {
      const key = doc.subfolder || '(Sin categoría)';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(doc);
    });

    return groups;
  }, [documents]);

  if (documents.length === 0) {
    return (
      <div className="empty-state" style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
        No se encontraron documentos
      </div>
    );
  }

  return (
    <div id="sections">
      {Array.from(groupedDocs.entries()).map(([subfolder, docs]) => (
        <section key={subfolder} className="section">
          <h4>{subfolder}</h4>
          <div className="grid">
            {docs.map((doc) => (
              <Card
                key={doc.id}
                document={doc}
                isFavorite={isFavorite(doc.id)}
                onToggleFavorite={() => onToggleFavorite(doc.id)}
                onClick={() => onCardClick(doc)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default CardGrid;
