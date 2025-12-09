import { useState, useMemo } from 'react';
import { useDebounce } from '@/hooks';

interface SidebarProps {
  subfolders: string[];
  selected: string;
  collapsed: boolean;
  onSelect: (subfolder: string) => void;
}

export function Sidebar({ subfolders, selected, collapsed, onSelect }: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 160);

  const filteredSubfolders = useMemo(() => {
    if (!debouncedSearch) return subfolders;
    const q = debouncedSearch.toLowerCase();
    return subfolders.filter(sf =>
      String(sf || '').toLowerCase().includes(q)
    );
  }, [subfolders, debouncedSearch]);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar">
      <div className="panel">
        <h3>Cursos/Temas</h3>
        <div className="sub-search">
          <input
            type="search"
            placeholder="Filtrar cursos/temas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="list" aria-label="Lista de Cursos/Temas">
          <button
            className={!selected ? 'active' : ''}
            onClick={() => onSelect('')}
          >
            Todos
          </button>
          {filteredSubfolders.map((sf) => (
            <button
              key={sf}
              className={sf === selected ? 'active' : ''}
              onClick={() => onSelect(sf)}
            >
              {sf || '(Sin categoría)'}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
