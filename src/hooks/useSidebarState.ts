import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'sidebar:collapsed';

export function useSidebarState() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        return stored === 'true';
      }
      // En móvil empieza colapsado
      return window.innerWidth <= 768;
    } catch {
      return false;
    }
  });

  // Sincronizar con localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // Ignorar errores de localStorage
    }
  }, [collapsed]);

  // Responder a cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && collapsed) {
        // En desktop, expandir si estaba colapsado
        // setCollapsed(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [collapsed]);

  const toggle = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  const expand = useCallback(() => {
    setCollapsed(false);
  }, []);

  const collapse = useCallback(() => {
    setCollapsed(true);
  }, []);

  return {
    collapsed,
    toggle,
    expand,
    collapse,
  };
}

export default useSidebarState;
