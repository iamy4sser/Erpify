import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import type { User } from '../types/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  googleLogin: (token: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await axios.get('http://localhost:3000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        }
      } catch (error) {
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email,
      password
    });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password,
      name
    });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
  };

  const logout = async () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await axios.post('http://localhost:3000/api/auth/forgot-password', { email });
  };

  const resetPassword = async (token: string, password: string) => {
    await axios.post('http://localhost:3000/api/auth/reset-password', {
      token,
      password
    });
  };

  const googleLogin = async (token: string) => {
    const response = await axios.post('http://localhost:3000/api/auth/google', {
      token
    });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      forgotPassword,
      resetPassword,
      googleLogin
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}