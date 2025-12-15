"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getApiBase } from "./config";

type UserRole = "admin" | "trainer" | "student";

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
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "spa_access_token";
const USER_KEY = "spa_user";
const apiUrl = getApiBase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const verifyToken = useCallback(async (authToken: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        clearAuth();
        return;
      }

      const userData = await res.json();
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error("Token verification failed:", error);
      clearAuth();
    }
  }, [clearAuth]);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as User;
          setToken(storedToken);
          setUser(parsedUser);
          await verifyToken(storedToken);
        }
      } catch (error) {
        console.error("Auth load error:", error);
        clearAuth();
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, [verifyToken, clearAuth]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Login failed" }));
        throw new Error(error.message || "Invalid credentials");
      }

      const data = await res.json();
      const accessToken = data.access_token;

      // Fetch user data
      const userRes = await fetch(`${apiUrl}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userRes.ok) {
        throw new Error("Failed to fetch user data");
      }

      const userData = await userRes.json();

      // Store auth state
      localStorage.setItem(TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      setToken(accessToken);
      setUser(userData);

      // Role-based redirect
      const roleRoutes: Record<UserRole, string> = {
        admin: "/admin",
        trainer: "/trainer",
        student: "/student",
      };

      router.push(roleRoutes[userData.role as UserRole] || "/");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
    router.push("/auth/login");
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
    throw new Error("useAuth must be used within an AuthProvider");
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
      router.push("/auth/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
      // Redirect to user's proper dashboard
      const roleRoutes: Record<UserRole, string> = {
        admin: "/admin",
        trainer: "/trainer",
        student: "/student",
      };
      router.push(roleRoutes[user.role as UserRole] || "/");
    }
  }, [user, isLoading, allowedRoles, router]);

  return { user, isLoading };
}
