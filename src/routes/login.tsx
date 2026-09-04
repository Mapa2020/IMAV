import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "../hooks/useAuth";
import { KeyRound, User, Car, ArrowRight } from "lucide-react";
import logo from "@/assets/imav-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirigir al panel principal
  useEffect(() => {
    if (!isLoading && user) {
      navigate({ to: "/" });
    }
  }, [isLoading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Por favor, llene todos los campos");
      return;
    }

    setLoading(true);
    const success = await login(username, password);
    setLoading(false);

    if (success) {
      navigate({ to: "/" });
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      {/* Background Gradients */}
      <div className="absolute top-0 -left-4 size-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 -right-4 size-96 rounded-full bg-primary/8 blur-3xl" />

      <div className="z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logo} alt="IMAV Motor" className="mx-auto size-16" />
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            IMAV MOTORS S.R.L.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sistema de Recepción y Proformas
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/60 p-8 shadow-xl backdrop-blur-md">
          <h2 className="mb-6 font-display text-xl font-medium text-foreground">
            Iniciar Sesión
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="label-caps">Usuario</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <User className="size-4" />
                </span>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin o editor"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="label-caps">Contraseña</Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <KeyRound className="size-4" />
                </span>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 w-full"
            >
              {loading ? "Cargando..." : "Ingresar"}
              {!loading && <ArrowRight className="ml-2 size-4" />}
            </Button>
          </form>

          <div className="mt-6 rounded-lg bg-surface-2/40 p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">Cuentas de acceso:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Administrador: <code className="bg-muted px-1 rounded">admin</code> / <code className="bg-muted px-1 rounded">admin123</code></li>
              <li>Usuario Editor: <code className="bg-muted px-1 rounded">editor</code> / <code className="bg-muted px-1 rounded">editor123</code></li>
            </ul>
          </div>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          IMAV Motors S.R.L. · ParionaSoft © 2026
        </footer>
      </div>
    </div>
  );
}
