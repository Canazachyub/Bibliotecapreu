import type { Sheet, Document, LibraryDataRequest, LibraryDataResponse } from '@/types';

// URL del Web App de Google Apps Script
// Reemplazar con la URL real después de desplegar
const API_URL = import.meta.env.VITE_API_URL || 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';

// Función auxiliar para hacer peticiones a Google Apps Script
async function fetchGAS<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// API Client
export const api = {
  // Obtener lista de hojas (editoriales)
  async getSheets(): Promise<Sheet[]> {
    return fetchGAS<Sheet[]>('getSheets');
  },

  // Obtener documentos con filtros y paginación
  async getLibraryData(req: LibraryDataRequest): Promise<LibraryDataResponse> {
    return fetchGAS<LibraryDataResponse>('getLibraryData', {
      req: JSON.stringify(req),
    });
  },

  // Obtener un documento por ID
  async getById(sheet: string, id: string): Promise<Document | null> {
    return fetchGAS<Document | null>('getById', { sheet, id });
  },

  // Obtener carpetas únicas (distincts)
  async getFolders(sheet: string): Promise<string[]> {
    const response = await this.getLibraryData({
      sheet,
      distinct: 'folder',
      start: 0,
      limit: 1,
    });
    return response.distincts?.folder || [];
  },

  // Obtener subcarpetas únicas (distincts)
  async getSubfolders(sheet: string): Promise<string[]> {
    const response = await this.getLibraryData({
      sheet,
      distinct: 'subfolder',
      start: 0,
      limit: 1,
    });
    return response.distincts?.subfolder || [];
  },
};

export default api;
