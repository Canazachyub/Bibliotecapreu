interface StatsProps {
  total: number;
  sheet: string;
  folder: string;
  subfolder: string;
  loading: boolean;
}

export function Stats({ total, sheet, folder, subfolder, loading }: StatsProps) {
  const filters = [sheet, folder, subfolder].filter(Boolean);
  const filterText = filters.length ? ` • ${filters.join(' • ')}` : '';

  return (
    <section className="stats" aria-live="polite">
      <div id="resultCount">
        {loading ? 'Cargando...' : `${total.toLocaleString('es-PE')} documentos${filterText}`}
      </div>
      <div id="tips">Filtra y navega fácilmente</div>
    </section>
  );
}

export default Stats;
