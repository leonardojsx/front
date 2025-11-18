import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Importações dos seus componentes
import Cadastro from './components/Cadastro/App.jsx';
import Login from './components/Login/App.jsx';
import Home from './components/Home/App.jsx';
import Treinamento from './components/Treinamento/App.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { SidebarProvider } from './contexts/SidebarContext.jsx';
import AuthLayout from './components/AuthLayout/AuthLayout.jsx';
import { ToastContainer } from 'react-toastify';

// CSS
import './global.css';
// ✅ A CORREÇÃO: Importe o CSS do React Toastify aqui
import 'react-toastify/dist/ReactToastify.css';

const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: "/register", element: <Cadastro /> },
      { path: "/login", element: <Login /> },
      { path: "/", element: <Login /> },
    ]
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: "/home", element: <Home /> },
      { path: "/treinamento", element: <Treinamento /> },
    ]
  },
]);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <SidebarProvider>
        <RouterProvider router={router} />
        <ToastContainer/>
      </SidebarProvider>
    </AuthProvider>
  </StrictMode>,
);