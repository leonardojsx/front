import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';

const ProtectedRoute = () => {
  const { signed } = useAuth();

  // Se o usuário estiver logado ('signed' é true), permite o acesso à rota filha (Home).
  // Caso contrário, redireciona para a página de login.
  return signed ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;