import axios from "axios";

const api = axios.create({
  baseURL: 'https://outros-sistemas-xamuel-app.nk9iqz.easypanel.host'
})

// Interceptor para adicionar token automaticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('@App:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para lidar com respostas de erro
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('@App:token');
      localStorage.removeItem('@App:user');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api