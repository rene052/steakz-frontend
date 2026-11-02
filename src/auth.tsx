import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setUnauthorizedHandler, tokenStore } from "./api";
import type { Role, User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/api/auth/me")
      .then(setUser)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>("/api/auth/register", { name, email, password });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** Where each role lands after logging in. */
export const homeFor: Record<Role, string> = {
  CUSTOMER: "/app/customer",
  CASHIER: "/app/cashier",
  CHEF: "/app/chef",
  BRANCH_MANAGER: "/app/manager",
  HQ_MANAGER: "/app/hq",
  ADMIN: "/app/admin",
};
