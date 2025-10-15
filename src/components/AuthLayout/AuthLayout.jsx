import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css'; // Vamos criar este CSS a seguir

const AuthLayout = () => {
  // <Outlet /> renderizará o componente Login ou Register
  return (
    <div className="auth-container">
      <Outlet />
    </div>
  );
};

export default AuthLayout;