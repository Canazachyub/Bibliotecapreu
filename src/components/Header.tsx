interface HeaderProps {
  className?: string;
}

export function Header({ className = '' }: HeaderProps) {
  return (
    <header className={`appbar ${className}`} role="banner">
      <div className="appbar-inner">
        <div className="brand" aria-label="BIBLIOTECA PREUNIVERSITARIA SINAPSIS">
          <div className="logo">S</div>
          <div className="brand-text">
            <h1>Biblioteca Sinapsis</h1>
            <small>
              Formación justa, moderna y al alcance de todos • <strong>Yubert Canaza</strong> • WhatsApp: 900 266 810
            </small>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
