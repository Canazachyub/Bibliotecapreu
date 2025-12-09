import type { Sheet, FilterState } from '@/types';

interface FilterBarProps {
  sheets: Sheet[];
  folders: string[];
  filters: FilterState;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
}

export function FilterBar({ sheets, folders, filters, onFilterChange }: FilterBarProps) {
  return (
    <section className="filters" aria-label="Búsqueda y filtros">
      <div className="field">
        <label htmlFor="q">Buscar</label>
        <input
          type="search"
          id="q"
          placeholder="Nombre, Editorial/Proceso o Curso/Tema..."
          value={filters.q}
          onChange={(e) => onFilterChange('q', e.target.value)}
          autoComplete="off"
        />
      </div>

      <div className="field">
        <label htmlFor="sheetSel">Editorial</label>
        <select
          id="sheetSel"
          value={filters.sheet}
          onChange={(e) => onFilterChange('sheet', e.target.value)}
        >
          {sheets.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="folderSel">Editorial/Proceso</label>
        <select
          id="folderSel"
          value={filters.folder}
          onChange={(e) => onFilterChange('folder', e.target.value)}
        >
          <option value="">Todos</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="sortSel">Ordenar</label>
        <select
          id="sortSel"
          value={filters.sort}
          onChange={(e) => onFilterChange('sort', e.target.value as 'relevance' | 'name')}
        >
          <option value="relevance">Relevancia</option>
          <option value="name">Nombre (A→Z)</option>
        </select>
      </div>
    </section>
  );
}

export default FilterBar;
