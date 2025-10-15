import React, { useEffect } from 'react';

export default function Sidebar({ open, onClose, onNavigate }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && open) onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">×</button>
        </div>
        <nav className="sidebar-nav">
          <button className="sidebar-link" onClick={() => { onNavigate?.('inicio'); onClose?.(); }}>Início</button>
          <button className="sidebar-link" onClick={() => { onNavigate?.('comissoes'); onClose?.(); }}>Comissões</button>
          <button className="sidebar-link" onClick={() => { onNavigate?.('pesquisar'); onClose?.(); }}>Pesquisar</button>
        </nav>
        <div className="sidebar-footer">
          <small>Comissões BMS</small>
        </div>
      </aside>
    </>
  );
}
