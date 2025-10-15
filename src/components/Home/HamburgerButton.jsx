import React from 'react';

export default function HamburgerButton({ open, onClick, title = 'Menu' }) {
  return (
    <button
      type="button"
      className={`hamburger-btn ${open ? 'is-open' : ''}`}
      onClick={onClick}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
      title={title}
    >
      <span className="bar bar-top" />
      <span className="bar bar-middle" />
      <span className="bar bar-bottom" />
    </button>
  );
}
