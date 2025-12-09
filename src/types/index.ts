// Documento de la biblioteca
export interface Document {
  id: string;
  name: string;
  url: string;
  folder: string;      // Editorial/Proceso
  subfolder: string;   // Curso/Tema
  cover: string;
}

// Hoja/Editorial del Google Sheets
export interface Sheet {
  name: string;
  id: number;
}

// Estado de los filtros
export interface FilterState {
  q: string;           // texto de búsqueda
  sheet: string;       // editorial seleccionada
  folder: string;      // carpeta padre
  subfolder: string;   // curso/tema
  sort: 'relevance' | 'name';
}

// Request para la API
export interface LibraryDataRequest {
  sheet: string;
  q?: string;
  folder?: string;
  subfolder?: string;
  sort?: 'relevance' | 'name';
  start?: number;
  limit?: number;
  distinct?: 'folder' | 'subfolder';
}

// Respuesta paginada de la API
export interface LibraryDataResponse {
  total: number;
  items: Document[];
  distincts?: {
    folder?: string[];
    subfolder?: string[];
  };
}

// Estado global de la aplicación
export interface AppState {
  sheets: Sheet[];
  filters: FilterState;
  documents: Document[];
  folders: string[];
  subfolders: string[];
  favorites: Set<string>;
  loading: boolean;
  hasMore: boolean;
  offset: number;
  total: number;
  sidebarCollapsed: boolean;
  selectedDocument: Document | null;
}

// Props comunes
export interface BaseProps {
  className?: string;
}
