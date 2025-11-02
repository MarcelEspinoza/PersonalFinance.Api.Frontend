import { ReactNode, createContext, useContext, useEffect, useState } from "react";
import { authService } from "../services/authService";
import { AuthContextType, User } from "../types/auth";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario desde el backend si hay token
  useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    setLoading(false);
    return;
  }

  authService.getMe(token)
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

    // Obtener el usuario inmediatamente después del login
    const meResponse = await authService.getMe(data.token);
    setUser(meResponse.data);

    return { error: null };
  } catch (error) {
    return { error: error as Error };
  }
};


  const signOut = () => {
    localStorage.removeItem("token");
    setUser(null);
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
