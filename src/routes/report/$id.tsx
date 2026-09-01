import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Printer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ReportDocument, type TechnicalReport } from "@/components/reports/ReportDocument";
import { useAuth, API_URL } from "@/hooks/useAuth";
import logo from "@/assets/imav-logo.png";

export const Route = createFileRoute("/report/$id")({
  component: ReportView,
});

function ReportView() {
  const { id } = Route.useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [report, setReport] = useState<TechnicalReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    try {
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/reports/${id}`, { headers });
      if (!res.ok) {
        throw new Error("No se pudo cargar el informe técnico");
      }
      const data = await res.json();
      setReport(data);
    } catch (error) {
      toast.error("Error al cargar el informe técnico");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [id, token]);

  useEffect(() => {
    if (report) {
      document.title = `${report.numero_informe} - IMAV Motor`;
    }
    return () => {
      document.title = "IMAV Motor S.R.L.";
    };
  }, [report]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando informe...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Informe no encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No se pudo encontrar el informe técnico solicitado en el sistema.
          </p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/" })}
              className="gap-2"
            >
              <ArrowLeft className="size-4" /> Volver al Panel
            </Button>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <img src={logo} alt="IMAV" className="size-6 object-contain" />
              <span className="font-semibold text-sm">
                {report.numero_informe}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2 shadow-sm">
              <Printer className="size-4" /> Imprimir Informe
            </Button>
          </div>
        </div>
      </header>

      {/* Main Document Content */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 print:m-0 print:p-0 print:w-full print:max-w-none">
        <div className="flex justify-center print:block print:w-full">
          <ReportDocument report={report} />
        </div>
      </main>
    </div>
  );
}
