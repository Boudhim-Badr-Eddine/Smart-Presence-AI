'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getApiBase } from './config';
import { apiClient } from './api-client';

type UserRole = 'admin' | 'trainer' | 'student';

type User = {
  id: number;
  email: string;
  role: UserRole;
  last_login: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (accessToken: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'spa_access_token';
const USER_KEY = 'spa_user';
const apiUrl = getApiBase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const normalizeRole = useCallback((value: unknown): UserRole | null => {
    if (typeof value !== 'string') return null;
    const role = value.trim().toLowerCase();
    if (role === 'admin' || role === 'administrator' || role === 'superadmin') return 'admin';
    if (role === 'trainer' || role === 'teacher' || role === 'instructor') return 'trainer';
    if (role === 'student' || role === 'learner') return 'student';
    return null;
  }, []);

  const normalizeUser = useCallback(
    (raw: any): User => {
      const role = normalizeRole(raw?.role) ?? 'student';
      return {
        id: Number(raw?.id ?? 0),
        email: String(raw?.email ?? ''),
        role,
        last_login: raw?.last_login ?? null,
      };
    },
    [normalizeRole],
  );

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const verifyToken = useCallback(
    async (authToken: string): Promise<User | null> => {
      try {
        const userData = await apiClient<any>('/api/auth/me', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });
        const normalized = normalizeUser(userData);
        setUser(normalized);
        localStorage.setItem(USER_KEY, JSON.stringify(normalized));
        return normalized;
      } catch (error) {
        console.error('Token verification failed:', error);
        clearAuth();
        return null;
      }
    },
    [clearAuth, normalizeUser],
  );

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken) {
          setToken(storedToken);
          if (storedUser) {
            try {
              const parsedUser = normalizeUser(JSON.parse(storedUser));
              setUser(parsedUser);
            } catch {
              // ignore parse error and re-verify token
            }
          }
          await verifyToken(storedToken);
        }
      } catch (error) {
        console.error('Auth load error:', error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, [verifyToken, clearAuth, normalizeUser]);

  const loginWithToken = useCallback(
    async (accessToken: string) => {
      if (!accessToken) throw new Error('Missing access token');

      localStorage.setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);

      const userData = await verifyToken(accessToken);
      if (!userData) throw new Error('Login failed');

      const roleRoutes: Record<UserRole, string> = {
        admin: '/admin',
        trainer: '/trainer',
        student: '/student',
      };

      router.push(roleRoutes[userData.role] || '/');
    },
    [router, verifyToken],
  );

  const login = async (email: string, password: string) => {
    try {
      const data = await apiClient<{ access_token: string }>('/api/auth/login', {
        method: 'POST',
        data: { email, password },
      });

      const accessToken = data.access_token;
      if (!accessToken) {
        throw new Error('Login failed');
      }

      await loginWithToken(accessToken);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
    router.push('/auth/login');
  };

  const refreshUser = async () => {
    if (!token) return;
    await verifyToken(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        loginWithToken,
        logout,
        refreshUser,
      }}
    >
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

// Hook to protect routes
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
      // Redirect to user's proper dashboard
      const roleRoutes: Record<UserRole, string> = {
        admin: '/admin',
        trainer: '/trainer',
        student: '/student',
      };
      router.push(roleRoutes[user.role as UserRole] || '/');
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading };
}
