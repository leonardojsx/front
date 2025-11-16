import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaSignOutAlt, FaUser } from 'react-icons/fa';

// Constante para o tempo de animação do sidebar
const SIDEBAR_ANIMATION_DURATION = 320;

export default function Sidebar({ open, onClose, onNavigate, currentPage = null }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape' && open) onClose?.();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Função utilitária para navegação com animação suave
  const navigateWithDelay = (navigationFn) => {
    onClose?.();
    setTimeout(navigationFn, SIDEBAR_ANIMATION_DURATION);
  };

  const handleTrainingClick = () => {
    if (currentPage === 'treinamento') {
      onClose?.();
    } else {
      navigateWithDelay(() => navigate('/treinamento'));
    }
  };

  const handleNavigationClick = (view) => {
    if (currentPage === 'treinamento') {
      // Se estamos na página de treinamento, navegar com delay
      navigateWithDelay(() => onNavigate?.(view));
    } else {
      // Se estamos na Home, usar navegação normal
      onNavigate?.(view);
      onClose?.();
    }
  };

  const handleLogout = () => {
    logout();
    onClose?.();
    navigate('/login');
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'visible' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="sidebar-header">
          <h2>Menu</h2>
          <button className="sidebar-close" onClick={onClose} aria-label="Fechar menu">×</button>
        </div>
        
        {user && (
          <div className="sidebar-user-info">
            <div className="user-avatar">
              <FaUser />
            </div>
            <div className="user-details">
              <span className="user-name">{user.nome}</span>
              <span className="user-role">{user.role === 'admin' ? 'Administrador' : 'Sup'}</span>
            </div>
          </div>
        )}
        
        <nav className="sidebar-nav">
          <button 
            className={`sidebar-link ${currentPage === 'inicio' ? 'active' : ''}`}
            onClick={() => handleNavigationClick('inicio')}
          >
            Início
          </button>
          <button 
            className={`sidebar-link ${currentPage === 'treinamento' ? 'active' : ''}`}
            onClick={handleTrainingClick}
          >
            Treinamento
          </button>
          <button 
            className={`sidebar-link ${currentPage === 'comissoes' ? 'active' : ''}`}
            onClick={() => handleNavigationClick('comissoes')}
          >
            Comissões
          </button>
          <button 
            className={`sidebar-link ${currentPage === 'pesquisar' ? 'active' : ''}`}
            onClick={() => handleNavigationClick('pesquisar')}
          >
            Pesquisar
          </button>
        </nav>
        
        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Sair do Sistema</span>
          </button>
          <small>Comissões BMS</small>
        </div>
      </aside>
    </>
  );
}
