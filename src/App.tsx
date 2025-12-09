import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/services/api';
import { useFavorites, useInfiniteScroll, useDebounce } from '@/hooks';
import type { Sheet, Document, FilterState } from '@/types';
import '@/styles/globals.css';

const DEFAULT_COVER = 'https://cdn.pixabay.com/photo/2018/01/17/18/43/book-3088777_960_720.png';
const PAGE_SIZE = 120;

// Helper to remove file extension from name
const getDisplayName = (name: string) => {
  return name.replace(/\.(pdf|PDF|docx?|DOCX?|xlsx?|XLSX?|pptx?|PPTX?)$/i, '').trim();
};

// Check if cover is the default or empty
const isDefaultCover = (cover: string | undefined | null) => {
  if (!cover) return true;
  return cover.includes('book-3088777') || cover.includes('placeholder') || cover === DEFAULT_COVER;
};

// Icons
const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

function App() {
  // Theme
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'light' | 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // State
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [subfolders, setSubfolders] = useState<string[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    q: '',
    sheet: '',
    folder: '',
    subfolder: '',
    sort: 'relevance',
  });
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { isFavorite, toggleFavorite } = useFavorites();
  const debouncedQ = useDebounce(filters.q, 200);
  const reqSeqRef = useRef(0);

  // Load sheets
  useEffect(() => {
    api.getSheets()
      .then((data) => {
        setSheets(data);
        if (data.length > 0) {
          setFilters((f) => ({ ...f, sheet: data[0].name }));
        }
      })
      .catch(console.error);
  }, []);

  // Load folders and subfolders
  useEffect(() => {
    if (!filters.sheet) return;
    Promise.all([api.getFolders(filters.sheet), api.getSubfolders(filters.sheet)])
      .then(([f, s]) => { setFolders(f); setSubfolders(s); })
      .catch(console.error);
  }, [filters.sheet]);

  // Load documents
  useEffect(() => {
    if (!filters.sheet) return;

    setDocuments([]);
    setOffset(0);
    setHasMore(true);
    const seq = ++reqSeqRef.current;
    setLoading(true);

    api.getLibraryData({
      sheet: filters.sheet,
      q: debouncedQ || undefined,
      folder: filters.folder || undefined,
      subfolder: filters.subfolder || undefined,
      sort: filters.sort,
      start: 0,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (seq !== reqSeqRef.current) return;
        setDocuments(response.items || []);
        setOffset(response.items?.length || 0);
        setTotal(response.total || 0);
        setHasMore((response.items?.length || 0) < (response.total || 0));
      })
      .catch(console.error)
      .finally(() => {
        if (seq === reqSeqRef.current) setLoading(false);
      });
  }, [filters.sheet, filters.folder, filters.subfolder, filters.sort, debouncedQ]);

  // Load more
  const loadMore = useCallback(() => {
    if (loading || !hasMore || !filters.sheet) return;
    const seq = ++reqSeqRef.current;
    setLoading(true);

    api.getLibraryData({
      sheet: filters.sheet,
      q: debouncedQ || undefined,
      folder: filters.folder || undefined,
      subfolder: filters.subfolder || undefined,
      sort: filters.sort,
      start: offset,
      limit: PAGE_SIZE,
    })
      .then((response) => {
        if (seq !== reqSeqRef.current) return;
        setDocuments((prev) => [...prev, ...(response.items || [])]);
        setOffset((prev) => prev + (response.items?.length || 0));
        setHasMore(offset + (response.items?.length || 0) < (response.total || 0));
      })
      .catch(console.error)
      .finally(() => {
        if (seq === reqSeqRef.current) setLoading(false);
      });
  }, [filters, debouncedQ, offset, loading, hasMore]);

  const sentinelRef = useInfiniteScroll({ hasMore, loading, onLoadMore: loadMore });

  // Group documents
  const groupedDocs = useMemo(() => {
    const groups = new Map<string, Document[]>();
    documents.forEach((doc) => {
      const key = doc.subfolder || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    });
    return groups;
  }, [documents]);

  return (
    <div className="app-container">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-title">
          Biblioteca <span>Sinapsis</span>
        </div>

        <div className="search-container">
          <div className="search-box">
            <SearchIcon />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
            {filters.q && (
              <button
                className="search-clear visible"
                onClick={() => setFilters((f) => ({ ...f, q: '' }))}
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className="topbar-actions">
          <button
            className="theme-toggle"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="filter-section">
            <h3>Editorial</h3>
            <select
              className="filter-select"
              value={filters.sheet}
              onChange={(e) => setFilters((f) => ({ ...f, sheet: e.target.value, folder: '', subfolder: '' }))}
            >
              {sheets.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h3>Carpeta</h3>
            <select
              className="filter-select"
              value={filters.folder}
              onChange={(e) => setFilters((f) => ({ ...f, folder: e.target.value }))}
            >
              <option value="">Todas las carpetas</option>
              {folders.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div className="filter-section">
            <h3>Temas</h3>
            <div className="subfolder-list">
              <button
                className={`subfolder-item ${!filters.subfolder ? 'active' : ''}`}
                onClick={() => setFilters((f) => ({ ...f, subfolder: '' }))}
              >
                Todos los temas
              </button>
              {subfolders.map((sf) => (
                <button
                  key={sf}
                  className={`subfolder-item ${filters.subfolder === sf ? 'active' : ''}`}
                  onClick={() => setFilters((f) => ({ ...f, subfolder: sf }))}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="stats-bar">
            <div className="stats-count">
              <strong>{total.toLocaleString()}</strong> documentos encontrados
            </div>
            <div className="view-options">
              <select
                className="sort-select"
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value as 'relevance' | 'name' }))}
              >
                <option value="relevance">Relevancia</option>
                <option value="name">Nombre A-Z</option>
              </select>
            </div>
          </div>

          {loading && documents.length === 0 ? (
            <div className="loading-container">
              <div className="loading-spinner" />
              <div className="loading-text">Cargando documentos...</div>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <h3>No se encontraron documentos</h3>
              <p>Intenta con otros filtros o términos de búsqueda</p>
            </div>
          ) : (
            <>
              {Array.from(groupedDocs.entries()).map(([subfolder, docs]) => (
                <div key={subfolder} className="section-group">
                  <div className="section-header">
                    <h2 className="section-title">{subfolder}</h2>
                    <span className="section-count">{docs.length}</span>
                  </div>
                  <div className="documents-grid">
                    {docs.map((doc) => (
                      <article
                        key={doc.id}
                        className="doc-card"
                        onClick={() => setSelectedDocument(doc)}
                        tabIndex={0}
                      >
                        <div className="doc-cover">
                          <img
                            src={doc.cover || DEFAULT_COVER}
                            alt={doc.name}
                            loading="lazy"
                            onLoad={(e) => {
                              const img = e.currentTarget;
                              const overlay = img.parentElement?.querySelector('.cover-title-overlay') as HTMLElement;

                              // Si la imagen actual ES el default cover, mostrar overlay y salir
                              if (isDefaultCover(img.src)) {
                                if (overlay) overlay.classList.remove('hidden');
                                return;
                              }

                              // Si la imagen es muy pequeña, es un placeholder de Google
                              if (img.naturalWidth < 100 || img.naturalHeight < 100) {
                                img.src = DEFAULT_COVER;
                                // El cambio de src disparará otro onLoad que mostrará el overlay
                              } else {
                                // Thumbnail válido de Google cargó - ocultar overlay
                                if (overlay) overlay.classList.add('hidden');
                              }
                            }}
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_COVER;
                              const overlay = e.currentTarget.parentElement?.querySelector('.cover-title-overlay') as HTMLElement;
                              if (overlay) overlay.classList.remove('hidden');
                            }}
                          />
                          <div className="cover-title-overlay">
                            <span>{getDisplayName(doc.name)}</span>
                          </div>
                          <button
                            className={`doc-favorite ${isFavorite(doc.id) ? 'active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(doc.id); }}
                          >
                            <StarIcon filled={isFavorite(doc.id)} />
                          </button>
                        </div>
                        <div className="doc-info">
                          <h3 className="doc-title">{doc.name}</h3>
                          <div className="doc-meta">
                            {doc.folder && <span className="doc-tag">{doc.folder}</span>}
                          </div>
                          <div className="doc-actions">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="doc-open"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Abrir
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ))}

              <div ref={sentinelRef} style={{ height: 1 }} />

              {loading && (
                <div className="loading-container">
                  <div className="loading-spinner" />
                  <div className="loading-text">Cargando más...</div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      {selectedDocument && (
        <div className="modal-backdrop" onClick={() => setSelectedDocument(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{selectedDocument.name}</h2>
              <button className="modal-close" onClick={() => setSelectedDocument(null)}>
                <CloseIcon />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-cover">
                <img
                  src={selectedDocument.cover || DEFAULT_COVER}
                  alt={selectedDocument.name}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    const overlay = img.parentElement?.querySelector('.cover-title-overlay') as HTMLElement;

                    // Si la imagen actual ES el default cover, mostrar overlay y salir
                    if (isDefaultCover(img.src)) {
                      if (overlay) overlay.classList.remove('hidden');
                      return;
                    }

                    // Si la imagen es muy pequeña, es un placeholder de Google
                    if (img.naturalWidth < 100 || img.naturalHeight < 100) {
                      img.src = DEFAULT_COVER;
                      // El cambio de src disparará otro onLoad que mostrará el overlay
                    } else {
                      // Thumbnail válido de Google cargó - ocultar overlay
                      if (overlay) overlay.classList.add('hidden');
                    }
                  }}
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_COVER;
                    const overlay = e.currentTarget.parentElement?.querySelector('.cover-title-overlay') as HTMLElement;
                    if (overlay) overlay.classList.remove('hidden');
                  }}
                />
                <div className="cover-title-overlay modal-overlay">
                  <span>{getDisplayName(selectedDocument.name)}</span>
                </div>
              </div>
              <div className="modal-details">
                <div className="modal-tags">
                  {selectedDocument.folder && <span className="modal-tag">{selectedDocument.folder}</span>}
                  {selectedDocument.subfolder && <span className="modal-tag">{selectedDocument.subfolder}</span>}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <a
                href={selectedDocument.url}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-btn modal-btn-primary"
              >
                Abrir documento
              </a>
              <button
                className={`modal-btn modal-btn-favorite ${isFavorite(selectedDocument.id) ? 'active' : ''}`}
                onClick={() => toggleFavorite(selectedDocument.id)}
              >
                <StarIcon filled={isFavorite(selectedDocument.id)} />
                {isFavorite(selectedDocument.id) ? 'Guardado' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="app-footer">
        © 2025 Biblioteca Sinapsis
      </footer>
    </div>
  );
}

export default App;
