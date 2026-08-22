import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Database,
  Trash2,
  Download,
  RefreshCw,
  Clock,
  FileSpreadsheet,
  Info,
  Calendar,
  AlertTriangle,
  HardDrive
} from "lucide-react";
import { toast } from "sonner";

interface BackupFile {
  fileName: string;
  sizeBytes: number;
  createdAt: string;
}

export function MaintenanceCRUD() {
  const { token, isAdmin } = useAuth();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/backups`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al obtener la lista de respaldos");
      const data = await res.json();
      setBackups(data);
    } catch (err: any) {
      toast.error("Error al obtener respaldos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAdmin) {
      fetchBackups();
    }
  }, [token, isAdmin]);

  const handleRunCleanup = async () => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/backups/cleanup-and-backup`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al ejecutar el proceso");
      const data = await res.json();
      toast.success(
        `Proceso completado. Se generó el respaldo "${data.fileName}" y se eliminaron ${data.deletedCount} proformas de más de 365 días.`
      );
      fetchBackups();
    } catch (err: any) {
      toast.error("Error al ejecutar respaldo y limpieza: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const res = await fetch(`${API_URL}/backups/download/${fileName}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Error al descargar el archivo");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Archivo de respaldo descargado correctamente.");
    } catch (err: any) {
      toast.error("Error al descargar el archivo: " + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
        <AlertTriangle className="size-8 text-destructive mx-auto mb-2" />
        <h3 className="text-lg font-semibold text-destructive">Acceso Denegado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Solo los administradores autorizados pueden gestionar el mantenimiento y respaldos de la base de datos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de información general */}
      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="panel p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Database className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-snug">Mantenimiento de Datos y Respaldos</h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                El sistema optimiza automáticamente el rendimiento y almacenamiento de la base de datos aplicando una política de retención.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary shrink-0" />
              <span>Ejecución automática cada 30 días</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="size-4 text-primary shrink-0" />
              <span>Clientes, vehículos y empleados permanecen siempre</span>
            </div>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="panel p-6 flex flex-col justify-between space-y-4">
          <div>
            <h4 className="font-semibold text-sm label-caps">Acción Manual</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Fuerza la creación inmediata de una copia de seguridad.
            </p>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground flex items-center justify-center gap-2 mt-4"
            onClick={handleRunCleanup}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <HardDrive className="size-4" />
            )}
            <span>Ejecutar Respaldo y Limpieza Ahora</span>
          </Button>
        </div>
      </div>

      {/* Historial de Respaldos */}
      <div className="panel overflow-hidden">
        <div className="border-b border-border bg-muted/20 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Historial de Copias de Seguridad (365 Días Activos)</h3>
          </div>
          <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre del Archivo</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Tamaño</TableHead>
              <TableHead className="w-20 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="size-5 animate-spin mx-auto mb-2" />
                  Cargando copias de seguridad...
                </TableCell>
              </TableRow>
            ) : backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No se han generado archivos de respaldo aún.
                </TableCell>
              </TableRow>
            ) : (
              backups.map((b) => (
                <TableRow key={b.fileName}>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {b.fileName}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(b.createdAt).toLocaleString("es-BO")}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs font-medium">
                    {formatSize(b.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-primary hover:bg-primary/10"
                      onClick={() => handleDownload(b.fileName)}
                      title="Descargar respaldo SQL"
                    >
                      <Download className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
