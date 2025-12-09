interface SidebarToggleProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarToggle({ collapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      id="toggleSidebar"
      className={`sidebar-toggle ${collapsed ? 'collapsed' : ''}`}
      type="button"
      aria-label="Mostrar/Ocultar panel lateral"
      onClick={onToggle}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}

export default SidebarToggle;
