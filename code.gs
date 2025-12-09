/******************************************************
 * BIBLIOTECA PREUNIVERSITARIA SINAPSIS – Backend REST API
 *
 * Este archivo debe desplegarse en Google Apps Script
 * como Web App con acceso "Anyone" para funcionar como API REST
 *
 * Campos: Nombre | URL-archivo | Carpeta Padre | SubCarpeta
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Ir a Google Apps Script (script.google.com)
 * 2. Crear nuevo proyecto y pegar este código
 * 3. Deploy > New deployment > Web app
 * 4. Execute as: Me
 * 5. Who has access: Anyone
 * 6. Copiar la URL del deployment y usarla en VITE_API_URL
 ******************************************************/

const SPREADSHEET_ID = '1VIUokypL0QubdqgG3z9kMizF8R1OqOq3RFKuQ4ULny8';

// Cache
const CACHE_TTL_SEC = 600;     // 10 minutos
const CACHE_CHUNK   = 80000;   // 80KB por parte

// Límite defensivo para "distincts"
const DISTINCT_LIMIT = 2000;

/**
 * API REST Handler
 * Soporta las siguientes acciones via query parameter "action":
 * - getSheets: Lista de hojas (editoriales)
 * - getLibraryData: Búsqueda de documentos con filtros y paginación
 * - getById: Obtener un documento por ID
 */
function doGet(e) {
  const action = e?.parameter?.action || '';
  let result;

  try {
    switch (action) {
      case 'getSheets':
        result = getSheets();
        break;

      case 'getLibraryData':
        const reqParam = e?.parameter?.req;
        if (reqParam) {
          result = getLibraryData(JSON.parse(reqParam));
        } else {
          result = { error: 'Missing req parameter', total: 0, items: [] };
        }
        break;

      case 'getById':
        const sheet = e?.parameter?.sheet;
        const id = e?.parameter?.id;
        if (sheet && id) {
          result = getById(sheet, id);
        } else {
          result = { error: 'Missing sheet or id parameter' };
        }
        break;

      default:
        result = {
          error: 'Unknown action. Use: getSheets, getLibraryData, or getById',
          availableActions: ['getSheets', 'getLibraryData', 'getById']
        };
    }
  } catch (error) {
    result = { error: error.message || 'Internal server error' };
  }

  // Retornar JSON
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handler para solicitudes POST (alternativo)
 */
function doPost(e) {
  return doGet(e);
}

/** Listado de hojas (Editoriales) */
function getSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  return ss.getSheets().map(s => ({ name: s.getName(), id: s.getSheetId() }));
}

/**
 * Búsqueda de documentos con filtros y paginación
 *
 * req: {
 *   sheet: string,              // hoja = Editorial
 *   q?: string,                 // texto libre
 *   folder?: string,            // Carpeta Padre (Editorial/Proceso)
 *   subfolder?: string,         // SubCarpeta (Curso/Tema)
 *   sort?: 'relevance'|'name',
 *   start?: number,
 *   limit?: number,
 *   distinct?: 'folder'|'subfolder'
 * }
 */
function getLibraryData(req) {
  const rows = getSheetRows_(req.sheet);

  // Distintos para paneles/combos
  if (req.distinct === 'folder' || req.distinct === 'subfolder') {
    const key = req.distinct === 'folder' ? 'folder' : 'subfolder';
    const set = new Set();
    for (const o of rows) if (o[key]) set.add(o[key]);
    let arr = [...set].sort((a, b) => String(a).localeCompare(String(b)));
    if (arr.length > DISTINCT_LIMIT) arr = arr.slice(0, DISTINCT_LIMIT);
    return { total: arr.length, items: [], distincts: { [key]: arr } };
  }

  let result = rows;
  const q = (req.q || '').toString().trim().toLowerCase();

  // Filtros
  if (q) {
    result = result.filter(o =>
      (o.nameLc && o.nameLc.includes(q)) ||
      (o.folderLc && o.folderLc.includes(q)) ||
      (o.subLc && o.subLc.includes(q))
    );
  }
  if (req.folder) result = result.filter(o => o.folder === req.folder);
  if (req.subfolder) result = result.filter(o => o.subfolder === req.subfolder);

  // Orden
  const bySub = (a, b) => (a.subfolder || '').localeCompare(b.subfolder || '');
  const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
  const sort = req.sort || 'relevance';

  if (sort === 'name') {
    result.sort((a, b) => bySub(a, b) || byName(a, b));
  } else if (q) {
    result.sort((a, b) => score_(b, q) - score_(a, q) || bySub(a, b) || byName(a, b));
  } else {
    result.sort((a, b) => bySub(a, b) || byName(a, b));
  }

  // Paginación
  const total = result.length;
  const start = Math.max(0, req.start || 0);
  const end = Math.min(total, start + Math.max(1, req.limit || 60));
  const items = result.slice(start, end).map(stripPrivate_);

  return { total, items };
}

/** Devuelve un ítem por id */
function getById(sheetName, id) {
  const rows = getSheetRows_(sheetName);
  const o = rows.find(r => r.id === id);
  return o ? stripPrivate_(o) : null;
}

/* ===================== Cache y proyección ===================== */

function getSheetRows_(sheetName) {
  const cache = CacheService.getScriptCache();

  // 1) Intentar leer versión fragmentada
  const idxKey = `rows::${sheetName}::idx`;
  const idxRaw = cache.get(idxKey);
  if (idxRaw !== null) {
    const parts = parseInt(idxRaw, 10);
    if (Number.isFinite(parts) && parts > 0) {
      const chunks = [];
      for (let i = 0; i < parts; i++) {
        const part = cache.get(`rows::${sheetName}::part::${i}`);
        if (part === null) break;
        chunks.push(part);
      }
      if (chunks.length === parts) {
        try { return JSON.parse(chunks.join('')); } catch (_) {}
      }
    }
  }

  // 2) Intentar leer versión simple
  const simpleKey = `rows::${sheetName}`;
  const cached = cache.get(simpleKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }

  // 3) Construir desde la hoja
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(sheetName);
  if (!sh) return [];

  const data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  const { map } = headerMap_(data[0]);
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    if (isEmpty_(r)) continue;
    rows.push(rowToObj_(r, map));
  }

  // 4) Guardar en caché
  try {
    const json = JSON.stringify(rows);
    if (json.length <= CACHE_CHUNK) {
      cache.put(simpleKey, json, CACHE_TTL_SEC);
      cache.remove(idxKey);
    } else {
      cache.remove(simpleKey);
      const parts = Math.ceil(json.length / CACHE_CHUNK);
      for (let i = 0; i < parts; i++) {
        const slice = json.slice(i * CACHE_CHUNK, (i + 1) * CACHE_CHUNK);
        cache.put(`rows::${sheetName}::part::${i}`, slice, CACHE_TTL_SEC);
      }
      cache.put(idxKey, String(parts), CACHE_TTL_SEC);
    }
  } catch (e) {
    console.warn('Cache put skipped:', e && e.message || e);
  }

  return rows;
}

function stripPrivate_(o) {
  return {
    id: o.id,
    name: o.name,
    url: o.url,
    folder: o.folder,
    subfolder: o.subfolder,
    cover: o.cover
  };
}

/* ===================== Utilidades ===================== */

function headerMap_(headers) {
  const idx = Object.create(null);
  const norm = x => String(x || '').trim().toLowerCase();
  headers.forEach((h, i) => idx[norm(h)] = i);

  const getIdx = (keys) => { for (const k of keys) if (k in idx) return idx[k]; return -1; };

  const map = {
    name:      getIdx(['nombre', 'name', 'archivo', 'título', 'titulo']),
    url:       getIdx(['url-archivo', 'url', 'enlace', 'link', 'url-archive']),
    folder:    getIdx(['carpeta padre', 'carpeta', 'folder', 'editorial/proceso', 'editorial - proceso']),
    subfolder: getIdx(['subcarpeta', 'subfolder', 'sub-folder', 'curso/tema', 'curso - tema'])
  };
  return { map };
}

function rowToObj_(r, map) {
  const get = (k) => map[k] !== -1 ? r[map[k]] : '';

  const name = safe_(get('name'));
  const url = safe_(get('url'));
  const folder = safe_(get('folder'));
  const subfolder = safe_(get('subfolder'));

  const cover = guessPdfThumb_(url) || '';
  const id = hash_(name + '|' + url);

  return {
    id, name, url, folder, subfolder, cover,
    nameLc: name.toLowerCase(),
    folderLc: folder.toLowerCase(),
    subLc: subfolder.toLowerCase()
  };
}

function isEmpty_(arr) {
  return arr.every(v => v === null || v === undefined || String(v).trim() === '');
}

function safe_(v) {
  return v == null ? '' : String(v);
}

function hash_(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
  return 'b' + (h >>> 0).toString(36);
}

function score_(b, q) {
  let s = 0;
  if (b.nameLc && b.nameLc.includes(q)) s += 4;
  if (b.folderLc && b.folderLc.includes(q)) s += 2;
  if (b.subLc && b.subLc.includes(q)) s += 1;
  return s;
}

/**
 * Miniatura 1ª página de PDF (Drive)
 * Intenta múltiples métodos para obtener el thumbnail
 */
function guessPdfThumb_(url) {
  if (!url) return '';

  // Extraer File ID de diferentes formatos de URL
  let fileId = null;
  let m = url.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m) fileId = m[1];
  if (!fileId) {
    m = url.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m) fileId = m[1];
  }
  if (!fileId) {
    // Formato: drive.google.com/open?id=XXX
    m = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]{10,})/);
    if (m) fileId = m[1];
  }

  if (!fileId) return '';

  // Usar lh3.googleusercontent.com que tiene mejor compatibilidad
  // y funciona con más archivos
  return 'https://lh3.googleusercontent.com/d/' + fileId + '=w800';
}

/**
 * Función alternativa: obtener thumbnail via DriveApp (para archivos privados)
 * Usar solo si el método anterior falla y necesitas acceso a archivos privados
 */
function getThumbnailBase64_(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    const thumb = file.getThumbnail();
    if (thumb) {
      const base64 = Utilities.base64Encode(thumb.getBytes());
      const mimeType = thumb.getContentType() || 'image/png';
      return 'data:' + mimeType + ';base64,' + base64;
    }
  } catch (e) {
    console.warn('getThumbnailBase64_ error:', e.message);
  }
  return '';
}
