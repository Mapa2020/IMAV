import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { toast } from "sonner";

export interface User {
  id_usuario: number;
  username: string;
  rol: "ADMINISTRADOR" | "USUARIO" | "LECTURA";
  nombre_completo: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
  isEditor: boolean;
  isReadOnly: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const API_URL = "http://localhost:5000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restaurar sesión desde localStorage
    const savedToken = localStorage.getItem("imav_token");
    const savedUser = localStorage.getItem("imav_user");

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem("imav_token");
        localStorage.removeItem("imav_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al iniciar sesión");
        setIsLoading(false);
        return false;
      }

      setToken(data.token);
      setUser(data.usuario);
      localStorage.setItem("imav_token", data.token);
      localStorage.setItem("imav_user", JSON.stringify(data.usuario));
      toast.success(`Bienvenido, ${data.usuario.nombre_completo}`);
      setIsLoading(false);
      return true;
    } catch (error) {
      toast.error("Error de conexión con el servidor");
      setIsLoading(false);
      return false;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("imav_token");
    localStorage.removeItem("imav_user");
    toast.info("Sesión cerrada");
  };

  const isAdmin = user?.rol === "ADMINISTRADOR";
  const isEditor = user?.rol === "ADMINISTRADOR" || user?.rol === "USUARIO";
  const isReadOnly = !user || user.rol === "LECTURA";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        isAdmin,
        isEditor,
        isReadOnly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
