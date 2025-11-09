import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/authService";
import { AuthContextType, User } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Cargar usuario desde el backend si hay token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    // apiClient interceptor añade Authorization; llamamos getMe() sin token
    authService.getMe()
      .then(({ data }) => setUser(data))
      .catch((err) => {
        console.error("Error al obtener el usuario:", err);
        localStorage.removeItem("token");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await authService.register(email, password, fullName);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data } = await authService.login(email, password);
      localStorage.setItem("token", data.token);

      // Ahora llama getMe() sin pasar token
      const meResponse = await authService.getMe();
      setUser(meResponse.data);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

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