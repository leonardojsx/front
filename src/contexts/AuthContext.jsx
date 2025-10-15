import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  // ✅ ALTERADO: O estado agora é inicializado de forma síncrona a partir do localStorage.
  // Usamos uma função no useState para que isso rode apenas uma vez, na primeira renderização.
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('@App:token');
    const storedUser = localStorage.getItem('@App:user');

    if (token && storedUser) {
      // Se encontramos o token e os dados do usuário, já configuramos o Axios
      // e retornamos os dados do usuário como estado inicial.
      api.defaults.headers.Authorization = `Bearer ${token}`;
      return JSON.parse(storedUser);
    }

    // Se não, o estado inicial é null.
    return null;
  });

  async function login(email, senha) {
    try {
      const response = await api.post('/users/login', { email, senha });
      const { token, user: userData } = response.data;

      // Salvamos o token E os dados do usuário no localStorage
      localStorage.setItem('@App:token', token);
      localStorage.setItem('@App:user', JSON.stringify(userData));

      api.defaults.headers.Authorization = `Bearer ${token}`;
      setUser(userData);
      
      return true;
    } catch (error) {
      console.error('Erro no login:', error.response?.data?.message || error.message);
      
      // Limpar dados de autenticação em caso de erro
      localStorage.removeItem('@App:token');
      localStorage.removeItem('@App:user');
      api.defaults.headers.Authorization = undefined;
      setUser(null);
      
      return false;
    }
  }

  function logout() {
    // ✅ ALTERADO: Limpamos ambos os itens do localStorage.
    localStorage.removeItem('@App:token');
    localStorage.removeItem('@App:user');
    
    api.defaults.headers.Authorization = undefined;
    setUser(null);
  }

  return (
    // A lógica aqui continua a mesma, mas agora 'user' já começa preenchido se o usuário estiver logado.
    <AuthContext.Provider value={{ signed: !!user, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}