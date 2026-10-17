import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
const AuthContext = createContext();
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!localStorage.getItem('pulse_token')) {
      setLoading(false);
      return;
    }
    api.get('/auth/me').then(response => setUser(response.data.user)).catch(() => localStorage.removeItem('pulse_token')).finally(() => setLoading(false));
  }, []);
  const login = async data => {
    const response = await api.post('/auth/login', data);
    localStorage.setItem('pulse_token', response.data.token);
    setUser(response.data.user);
  };
  const register = async data => {
    const response = await api.post('/auth/register', data);
    localStorage.setItem('pulse_token', response.data.token);
    setUser(response.data.user);
  };
  const logout = () => {
    localStorage.removeItem('pulse_token');
    setUser(null);
  };
  return <AuthContext.Provider value={{
    user,
    loading,
    login,
    register,
    logout,
    setUser
  }}>
      {children}
    </AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
