// src/contexts/AuthContext.tsx
import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { AuthContextType, User } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🟢 Cargar usuario desde el backend si hay token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // getMe ya usa apiClient con Authorization
    authService
      .getMe()
      .then(({ user, error }) => {
        if (error) throw error;
        if (user) setUser(user);
      })
      .catch((err) => {
        console.error("Error al obtener el usuario:", err);
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // 🟢 Registro
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await authService.register(email, password, fullName);
    if (error && !(error instanceof Error)) {
      return { error: new Error(error.message) };
    }
    return { error: error || null };
  };

  // 🟢 Login
  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const { user, token, error } = await authService.login(email, password);

    if (error) {
      // If error is already an Error instance, return it directly
      if (error instanceof Error) {
        return { error };
      }
      // Otherwise, convert to Error
      return { error: new Error(error.message || "Unknown error") };
    }

    if (token) localStorage.setItem("token", token);
    if (user) setUser(user);
    else {
      // Si el backend no envía user, lo obtenemos manualmente
      const { user: meUser, error: meError } = await authService.getMe();
      if (!meError && meUser) setUser(meUser);
    }

    return { error: null };
  };

  // 🟢 Logout
  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
    try {
      navigate("/login");
    } catch {
      window.location.href = "/login";
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
