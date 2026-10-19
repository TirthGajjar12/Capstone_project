import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { encryptPassword, clearCachedPublicKey } from '../utils/crypto';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string, role?: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate and restore session from localStorage on mount
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        api.setToken(savedToken);
        try {
          const profileResponse = await api.get<User>('/auth/me');
          setUser(profileResponse.data);
          setToken(savedToken);
          localStorage.setItem('user', JSON.stringify(profileResponse.data));
        } catch {
          // Token is expired or invalid: purge storage and reset
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          api.clearToken();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);
      // Asymmetrically encrypt password with RSA-OAEP before network transmission
      const securePassword = await encryptPassword(password);

      // FastAPI OAuth2PasswordRequestForm expects form-urlencoded (username & password)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', securePassword);

      let response;
      try {
        response = await api.post('/auth/login', formData, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
      } catch (postErr: any) {
        const detail = postErr?.response?.data?.detail;
        if (postErr?.response?.status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('rsa')) {
          clearCachedPublicKey();
          const freshPassword = await encryptPassword(password);
          formData.set('password', freshPassword);
          response = await api.post('/auth/login', formData, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          });
        } else {
          throw postErr;
        }
      }

      const { access_token } = response.data;
      setToken(access_token);
      localStorage.setItem('token', access_token);
      api.setToken(access_token);

      // Fetch the logged-in user profile from /auth/me
      const profileResponse = await api.get<User>('/auth/me');
      const loggedInUser = profileResponse.data;
      setUser(loggedInUser);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed. Please check your credentials.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, password: string, role: string = 'EMPLOYEE') => {
    try {
      setError(null);
      setLoading(true);
      // Asymmetrically encrypt password with RSA-OAEP before network transmission
      const securePassword = await encryptPassword(password);

      // Register new user via POST /auth/register
      try {
        await api.post('/auth/register', { full_name: fullName, email, password: securePassword, role });
      } catch (postErr: any) {
        const detail = postErr?.response?.data?.detail;
        if (postErr?.response?.status === 400 && typeof detail === 'string' && detail.toLowerCase().includes('rsa')) {
          clearCachedPublicKey();
          const freshPassword = await encryptPassword(password);
          await api.post('/auth/register', { full_name: fullName, email, password: freshPassword, role });
        } else {
          throw postErr;
        }
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Registration failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    api.clearToken();
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, register, logout, loading, error, setError }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRole() {
  const { user } = useAuth();
  return user?.role || null;
}

export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}