# Plan de Migración: Biblioteca Sinapsis a React + TypeScript + API REST

## Resumen Ejecutivo

Migración de una aplicación monolítica (HTML/CSS/JS + Google Apps Script) a una arquitectura moderna con:
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** JSON files (para despliegue simple en GitHub Pages) o SQLite
- **Despliegue:** GitHub Pages (frontend) + alternativas para backend

---

## Fase 1: Configuración del Proyecto

### 1.1 Estructura de Carpetas
```
biblioteca-sinapsis/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── FilterBar/
│   │   │   ├── CardGrid/
│   │   │   ├── Card/
│   │   │   ├── Modal/
│   │   │   └── common/
│   │   ├── hooks/
│   │   │   ├── useDocuments.ts
│   │   │   ├── useFavorites.ts
│   │   │   ├── useFilters.ts
│   │   │   └── useInfiniteScroll.ts
│   │   ├── context/
│   │   │   └── AppContext.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── styles/
│   │   │   └── globals.css
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/                    # Backend Express (opcional para GitHub)
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── data/
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── data/                      # Datos JSON exportados
│   └── library.json
│
└── scripts/
    └── export-sheets.ts       # Script para exportar Google Sheets
```

### 1.2 Tecnologías y Dependencias

**Frontend (client/package.json):**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x"
  }
}
```

**Backend (server/package.json):**
```json
{
  "dependencies": {
    "express": "^4.18.x",
    "cors": "^2.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/express": "^4.x",
    "@types/node": "^20.x",
    "tsx": "^4.x"
  }
}
```

---

## Fase 2: Definición de Tipos TypeScript

### 2.1 Interfaces Principales (types/index.ts)
```typescript
// Documento de la biblioteca
export interface Document {
  id: string;
  name: string;
  url: string;
  folder: string;      // Editorial/Proceso
  subfolder: string;   // Curso/Tema
  cover: string;
}

// Hoja/Editorial
export interface Sheet {
  name: string;
  id: string;
}

// Estado de filtros
export interface FilterState {
  q: string;           // búsqueda
  sheet: string;       // editorial
  folder: string;      // carpeta padre
  subfolder: string;   // curso/tema
  sort: 'relevance' | 'name';
}

// Respuesta paginada
export interface PaginatedResponse<T> {
  total: number;
  items: T[];
  distincts?: {
    folder?: string[];
    subfolder?: string[];
  };
}

// Estado de la aplicación
export interface AppState {
  filters: FilterState;
  documents: Document[];
  favorites: Set<string>;
  loading: boolean;
  hasMore: boolean;
  offset: number;
  total: number;
  sidebarCollapsed: boolean;
}
```

---

## Fase 3: Backend API REST

### 3.1 Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/sheets` | Lista de editoriales |
| GET | `/api/documents` | Búsqueda con filtros y paginación |
| GET | `/api/documents/:id` | Detalle de un documento |
| GET | `/api/folders` | Lista de carpetas únicas |
| GET | `/api/subfolders` | Lista de subcarpetas únicas |

### 3.2 Parámetros de Query (GET /api/documents)
```
?sheet=Editorial1
&q=texto
&folder=Carpeta
&subfolder=Tema
&sort=relevance|name
&start=0
&limit=120
```

### 3.3 Implementación del Controlador
```typescript
// server/src/controllers/documents.ts
export const getDocuments = async (req: Request, res: Response) => {
  const { sheet, q, folder, subfolder, sort, start, limit } = req.query;

  let results = loadData(sheet as string);

  // Filtrar
  if (q) results = filterByQuery(results, q as string);
  if (folder) results = results.filter(d => d.folder === folder);
  if (subfolder) results = results.filter(d => d.subfolder === subfolder);

  // Ordenar
  results = sortDocuments(results, sort as string, q as string);

  // Paginar
  const total = results.length;
  const items = results.slice(
    Number(start) || 0,
    (Number(start) || 0) + (Number(limit) || 120)
  );

  res.json({ total, items });
};
```

### 3.4 Alternativa: JSON Estático para GitHub Pages
Si no se puede usar backend, crear archivos JSON estáticos:
```
data/
├── sheets.json
├── documents/
│   ├── editorial1.json
│   ├── editorial2.json
│   └── ...
└── metadata/
    ├── folders.json
    └── subfolders.json
```

El frontend cargará y filtrará estos archivos directamente.

---

## Fase 4: Componentes React

### 4.1 Header
```typescript
// components/Header/Header.tsx
const Header: React.FC = () => (
  <header className="appbar">
    <div className="appbar-inner">
      <div className="brand">
        <div className="logo">S</div>
        <div className="brand-text">
          <h1>Biblioteca Sinapsis</h1>
          <small>Formación justa, moderna y al alcance de todos</small>
        </div>
      </div>
    </div>
  </header>
);
```

### 4.2 Sidebar
```typescript
// components/Sidebar/Sidebar.tsx
interface SidebarProps {
  subfolders: string[];
  selected: string;
  collapsed: boolean;
  onSelect: (subfolder: string) => void;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  subfolders,
  selected,
  collapsed,
  onSelect,
  onToggle
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = subfolders.filter(sf =>
    sf.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="panel">
        <h3>Cursos/Temas</h3>
        <input
          type="search"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Filtrar cursos/temas..."
        />
        <div className="list">
          <button
            className={!selected ? 'active' : ''}
            onClick={() => onSelect('')}
          >
            Todos
          </button>
          {filtered.map(sf => (
            <button
              key={sf}
              className={sf === selected ? 'active' : ''}
              onClick={() => onSelect(sf)}
            >
              {sf}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
```

### 4.3 FilterBar
```typescript
// components/FilterBar/FilterBar.tsx
interface FilterBarProps {
  sheets: Sheet[];
  folders: string[];
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  sheets,
  folders,
  filters,
  onFilterChange
}) => (
  <section className="filters">
    <div className="field">
      <label htmlFor="q">Buscar</label>
      <input
        id="q"
        type="search"
        value={filters.q}
        onChange={e => onFilterChange('q', e.target.value)}
        placeholder="Nombre, Editorial o Curso/Tema..."
      />
    </div>

    <div className="field">
      <label htmlFor="sheet">Editorial</label>
      <select
        id="sheet"
        value={filters.sheet}
        onChange={e => onFilterChange('sheet', e.target.value)}
      >
        {sheets.map(s => (
          <option key={s.name} value={s.name}>{s.name}</option>
        ))}
      </select>
    </div>

    <div className="field">
      <label htmlFor="folder">Editorial/Proceso</label>
      <select
        id="folder"
        value={filters.folder}
        onChange={e => onFilterChange('folder', e.target.value)}
      >
        <option value="">Todos</option>
        {folders.map(f => (
          <option key={f} value={f}>{f}</option>
        ))}
      </select>
    </div>

    <div className="field">
      <label htmlFor="sort">Ordenar</label>
      <select
        id="sort"
        value={filters.sort}
        onChange={e => onFilterChange('sort', e.target.value as 'relevance' | 'name')}
      >
        <option value="relevance">Relevancia</option>
        <option value="name">Nombre (A→Z)</option>
      </select>
    </div>
  </section>
);
```

### 4.4 Card
```typescript
// components/Card/Card.tsx
interface CardProps {
  document: Document;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClick: () => void;
}

const Card: React.FC<CardProps> = ({
  document,
  isFavorite,
  onToggleFavorite,
  onClick
}) => (
  <article className="card" onClick={onClick} tabIndex={0}>
    <div className="cover">
      <img
        src={document.cover || DEFAULT_COVER}
        alt={`Portada de ${document.name}`}
        loading="lazy"
        onError={e => (e.currentTarget.src = DEFAULT_COVER)}
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
          rel="noopener"
          className="open-link"
          onClick={e => e.stopPropagation()}
        >
          Abrir
        </a>
        <button
          className="btn"
          onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
        >
          {isFavorite ? '⭐ Guardado' : '☆ Guardar'}
        </button>
      </div>
    </div>
  </article>
);
```

### 4.5 Modal
```typescript
// components/Modal/Modal.tsx
interface ModalProps {
  document: Document | null;
  isOpen: boolean;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
}

const Modal: React.FC<ModalProps> = ({
  document,
  isOpen,
  isFavorite,
  onClose,
  onToggleFavorite
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [isOpen]);

  if (!document) return null;

  return (
    <dialog ref={dialogRef}>
      <button className="dialog-close-btn" onClick={onClose}>×</button>
      <div className="dialog-body">
        <div className="dialog-cover">
          <img src={document.cover || DEFAULT_COVER} alt="Portada" />
        </div>
        <div className="dialog-content">
          <h3>{document.name}</h3>
          <div className="chips">
            {document.folder && <span className="chip">{document.folder}</span>}
            {document.subfolder && <span className="chip">{document.subfolder}</span>}
          </div>
          <p>{document.folder} / {document.subfolder}</p>
        </div>
      </div>
      <div className="dialog-actions">
        <a href={document.url} target="_blank" rel="noopener" className="btn primary">
          Abrir
        </a>
        <button className="btn" onClick={onToggleFavorite}>
          {isFavorite ? '⭐ Quitar de favoritos' : '⭐ Agregar a favoritos'}
        </button>
        <button className="btn" onClick={onClose}>Cerrar</button>
      </div>
    </dialog>
  );
};
```

---

## Fase 5: Custom Hooks

### 5.1 useDocuments
```typescript
// hooks/useDocuments.ts
export const useDocuments = (filters: FilterState) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchDocuments = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const start = reset ? 0 : offset;
    const response = await api.getDocuments({ ...filters, start, limit: 120 });

    setDocuments(prev => reset ? response.items : [...prev, ...response.items]);
    setTotal(response.total);
    setOffset(start + response.items.length);
    setHasMore(start + response.items.length < response.total);
    setLoading(false);
  }, [filters, offset, loading]);

  // Reset al cambiar filtros
  useEffect(() => {
    setDocuments([]);
    setOffset(0);
    setHasMore(true);
    fetchDocuments(true);
  }, [filters.sheet, filters.q, filters.folder, filters.subfolder, filters.sort]);

  return { documents, loading, total, hasMore, fetchMore: () => fetchDocuments(false) };
};
```

### 5.2 useFavorites
```typescript
// hooks/useFavorites.ts
const STORAGE_KEY = 'lib:favs';

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
};
```

### 5.3 useInfiniteScroll
```typescript
// hooks/useInfiniteScroll.ts
export const useInfiniteScroll = (callback: () => void, hasMore: boolean) => {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) callback();
      },
      { rootMargin: '1000px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, [callback, hasMore]);

  return sentinelRef;
};
```

---

## Fase 6: Servicio API

### 6.1 Cliente HTTP
```typescript
// services/api.ts
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = {
  async getSheets(): Promise<Sheet[]> {
    const res = await fetch(`${BASE_URL}/sheets`);
    return res.json();
  },

  async getDocuments(params: {
    sheet: string;
    q?: string;
    folder?: string;
    subfolder?: string;
    sort?: string;
    start?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Document>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    );
    const res = await fetch(`${BASE_URL}/documents?${query}`);
    return res.json();
  },

  async getDocument(sheet: string, id: string): Promise<Document | null> {
    const res = await fetch(`${BASE_URL}/documents/${id}?sheet=${sheet}`);
    return res.json();
  },

  async getFolders(sheet: string): Promise<string[]> {
    const res = await fetch(`${BASE_URL}/folders?sheet=${sheet}`);
    return res.json();
  },

  async getSubfolders(sheet: string): Promise<string[]> {
    const res = await fetch(`${BASE_URL}/subfolders?sheet=${sheet}`);
    return res.json();
  }
};
```

---

## Fase 7: App Principal

### 7.1 App.tsx
```typescript
// App.tsx
const App: React.FC = () => {
  // Estado
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [subfolders, setSubfolders] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    q: '', sheet: '', folder: '', subfolder: '', sort: 'relevance'
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);

  // Hooks
  const { documents, loading, total, hasMore, fetchMore } = useDocuments(filters);
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const sentinelRef = useInfiniteScroll(fetchMore, hasMore && !loading);

  // Inicialización
  useEffect(() => {
    api.getSheets().then(sheets => {
      setSheets(sheets);
      if (sheets[0]) {
        setFilters(f => ({ ...f, sheet: sheets[0].name }));
      }
    });
  }, []);

  // Cargar folders/subfolders al cambiar sheet
  useEffect(() => {
    if (filters.sheet) {
      api.getFolders(filters.sheet).then(setFolders);
      api.getSubfolders(filters.sheet).then(setSubfolders);
    }
  }, [filters.sheet]);

  // Handlers
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  // Agrupar documentos por subfolder
  const groupedDocs = useMemo(() => {
    const groups = new Map<string, Document[]>();
    documents.forEach(doc => {
      const key = doc.subfolder || '(Sin categoría)';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(doc);
    });
    return groups;
  }, [documents]);

  return (
    <div className="app">
      <Header />

      <button
        className={`sidebar-toggle ${sidebarCollapsed ? 'collapsed' : ''}`}
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
      >
        <ChevronIcon />
      </button>

      <div className="main-container">
        <Sidebar
          subfolders={subfolders}
          selected={filters.subfolder}
          collapsed={sidebarCollapsed}
          onSelect={sf => handleFilterChange('subfolder', sf)}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className={sidebarCollapsed ? 'expanded' : ''}>
          <FilterBar
            sheets={sheets}
            folders={folders}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          <div className="stats">
            <div>{total.toLocaleString('es-PE')} documentos</div>
            <div>Filtra y navega fácilmente</div>
          </div>

          <div className="sections">
            {Array.from(groupedDocs.entries()).map(([subfolder, docs]) => (
              <section key={subfolder} className="section">
                <h4>{subfolder}</h4>
                <div className="grid">
                  {docs.map(doc => (
                    <Card
                      key={doc.id}
                      document={doc}
                      isFavorite={isFavorite(doc.id)}
                      onToggleFavorite={() => toggleFavorite(doc.id)}
                      onClick={() => setSelectedDoc(doc)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div ref={sentinelRef} style={{ height: 1 }} />
          {loading && <div className="loading">Cargando...</div>}
        </main>
      </div>

      <Modal
        document={selectedDoc}
        isOpen={!!selectedDoc}
        isFavorite={selectedDoc ? isFavorite(selectedDoc.id) : false}
        onClose={() => setSelectedDoc(null)}
        onToggleFavorite={() => selectedDoc && toggleFavorite(selectedDoc.id)}
      />

      <footer>
        © 2025 BIBLIOTECA PREUNIVERSITARIA SINAPSIS
      </footer>
    </div>
  );
};
```

---

## Fase 8: Migración de Datos

### 8.1 Script de Exportación desde Google Sheets
```typescript
// scripts/export-sheets.ts
// Ejecutar con: npx tsx scripts/export-sheets.ts

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SPREADSHEET_ID = '1VIUokypL0QubdqgG3z9kMizF8R1OqOq3RFKuQ4ULny8';

async function exportData() {
  // Configurar autenticación (API Key o Service Account)
  const sheets = google.sheets({ version: 'v4', auth: API_KEY });

  // Obtener lista de hojas
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetList = spreadsheet.data.sheets?.map(s => ({
    name: s.properties?.title || '',
    id: s.properties?.sheetId || 0
  })) || [];

  // Guardar lista de hojas
  fs.writeFileSync('data/sheets.json', JSON.stringify(sheetList, null, 2));

  // Exportar cada hoja
  for (const sheet of sheetList) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheet.name}'!A:Z`
    });

    const rows = response.data.values || [];
    const documents = parseRows(rows);

    fs.writeFileSync(
      `data/documents/${sheet.name}.json`,
      JSON.stringify(documents, null, 2)
    );
  }

  console.log('Exportación completada');
}

function parseRows(rows: string[][]): Document[] {
  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.toLowerCase().trim());
  const nameIdx = findIndex(headers, ['nombre', 'name', 'archivo']);
  const urlIdx = findIndex(headers, ['url-archivo', 'url', 'enlace']);
  const folderIdx = findIndex(headers, ['carpeta padre', 'carpeta', 'folder']);
  const subfolderIdx = findIndex(headers, ['subcarpeta', 'subfolder']);

  return rows.slice(1).map(row => {
    const name = row[nameIdx] || '';
    const url = row[urlIdx] || '';
    const folder = row[folderIdx] || '';
    const subfolder = row[subfolderIdx] || '';

    return {
      id: hash(name + '|' + url),
      name,
      url,
      folder,
      subfolder,
      cover: guessPdfThumb(url)
    };
  }).filter(d => d.name && d.url);
}
```

---

## Fase 9: Estilos CSS

### 9.1 Migración de Estilos
- Copiar los estilos CSS actuales a `client/src/styles/globals.css`
- Mantener las variables CSS para temas claro/oscuro
- Los estilos ya están bien estructurados con CSS Grid y Flexbox

---

## Fase 10: Despliegue

### 10.1 Opción A: GitHub Pages (Solo Frontend + JSON Estático)
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: cd client && npm ci

      - name: Build
        run: cd client && npm run build

      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./client/dist
```

### 10.2 Opción B: Vercel/Netlify (Frontend + Serverless Functions)
- Configurar `vercel.json` o `netlify.toml`
- Usar functions para la API

### 10.3 Opción C: Railway/Render (Full Stack)
- Desplegar backend Express completo
- Base de datos PostgreSQL si es necesario

---

## Orden de Implementación

1. **Día 1:** Configurar proyecto (Vite + React + TypeScript)
2. **Día 2:** Crear tipos y servicios API
3. **Día 3:** Implementar componentes básicos (Header, Sidebar, Card)
4. **Día 4:** Implementar FilterBar y lógica de filtros
5. **Día 5:** Implementar scroll infinito y agrupación
6. **Día 6:** Implementar Modal y favoritos
7. **Día 7:** Migrar estilos CSS y ajustar responsive
8. **Día 8:** Crear backend Express o adaptar para JSON estático
9. **Día 9:** Script de exportación de datos
10. **Día 10:** Testing y despliegue

---

## Decisiones Pendientes

1. **Backend:** ¿Usar Express con servidor propio o JSON estático para GitHub Pages?
2. **Estado:** ¿Usar solo hooks locales o implementar Redux/Zustand para estado global?
3. **Datos:** ¿Exportar datos una vez o crear sincronización automática con Google Sheets?
4. **Autenticación:** ¿Agregar login para usuarios o mantener público?

---

## Resumen de Archivos a Crear

```
Total: ~25-30 archivos nuevos

client/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── types/index.ts
│   ├── services/api.ts
│   ├── hooks/useDocuments.ts
│   ├── hooks/useFavorites.ts
│   ├── hooks/useInfiniteScroll.ts
│   ├── components/Header/Header.tsx
│   ├── components/Sidebar/Sidebar.tsx
│   ├── components/FilterBar/FilterBar.tsx
│   ├── components/Card/Card.tsx
│   ├── components/CardGrid/CardGrid.tsx
│   ├── components/Modal/Modal.tsx
│   └── styles/globals.css

server/ (opcional)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── routes/documents.ts
│   └── services/dataService.ts

data/
├── sheets.json
└── documents/*.json
```
