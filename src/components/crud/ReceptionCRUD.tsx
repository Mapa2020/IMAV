import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CHECKLIST } from "../proforma/proforma";

interface Reception {
  id_ingreso: number;
  id_vehiculo: number;
  placa: string;
  marca: string;
  modelo: string;
  nombre_cliente: string;
  id_empleado_receptor?: number | null;
  nombre_receptor?: string | null;
  paterno_receptor?: string | null;
  id_mecanico_asignado?: number | null;
  nombre_mecanico?: string | null;
  paterno_mecanico?: string | null;
  fecha_ingreso: string;
  kilometraje: number;
  nivel_combustible: string;
  nivel_combustible_porcentaje: number;
  observaciones_estado: string | null;
  deja_accesorios: string | null;
  falla_reportada: string;
  estado_ingreso: string;
}

interface Employee {
  id_empleado: number;
  nombre: string;
  paterno: string;
  rol: "RECEPCIONISTA" | "MECANICO";
  nombre_completo: string;
}

export function ReceptionCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const [receptions, setReceptions] = useState<Reception[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Reception | null>(null);

  // Form State
  const [idReceptor, setIdReceptor] = useState("");
  const [idMecanico, setIdMecanico] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [fuelLevel, setFuelLevel] = useState(50);
  const [obsEstado, setObsEstado] = useState("");
  const [falla, setFalla] = useState("");
  const [estado, setEstado] = useState("EN_REVISION");
  const [accessories, setAccessories] = useState<string[]>([]);
  const [fechaIngreso, setFechaIngreso] = useState("");

  const fetchReceptions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/receptions?query=${encodeURIComponent(search)}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReceptions(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar recepciones");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${API_URL}/employees`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchReceptions();
  }, [search, token]);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen]);

  const handleOpenEdit = (rec: Reception) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingRec(rec);
    setIdReceptor(rec.id_empleado_receptor ? rec.id_empleado_receptor.toString() : "none");
    setIdMecanico(rec.id_mecanico_asignado ? rec.id_mecanico_asignado.toString() : "none");
    setKilometraje(rec.kilometraje.toString());
    setFuelLevel(rec.nivel_combustible_porcentaje);
    setObsEstado(rec.observaciones_estado || "");
    setFalla(rec.falla_reportada);
    setEstado(rec.estado_ingreso);
    setFechaIngreso(rec.fecha_ingreso ? String(rec.fecha_ingreso).slice(0, 10) : "");
    
    // Parse accessories string to array
    const accList = rec.deja_accesorios
      ? rec.deja_accesorios.split(",").map((a) => a.trim())
      : [];
    setAccessories(accList);
    
    setIsOpen(true);
  };

  const toggleAccessory = (item: string) => {
    setAccessories((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bodyData = {
      id_vehiculo: editingRec?.id_vehiculo,
      id_empleado_receptor: idReceptor && idReceptor !== "none" ? parseInt(idReceptor) : null,
      id_mecanico_asignado: idMecanico && idMecanico !== "none" ? parseInt(idMecanico) : null,
      kilometraje: parseInt(kilometraje) || 0,
      fuelLevel,
      observaciones_estado: obsEstado.trim() || null,
      deja_accesorios: accessories.join(", ") || null,
      falla_reportada: falla.trim() || null,
      estado_ingreso: estado,
      fecha_ingreso: fechaIngreso ? `${fechaIngreso} 12:00:00` : null,
    };

    try {
      const res = await fetch(`${API_URL}/receptions/${editingRec?.id_ingreso}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al actualizar el ingreso");
        return;
      }

      toast.success("Ingreso actualizado");
      setIsOpen(false);
      fetchReceptions();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar ingresos");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este ingreso? Esto fallará si tiene proformas asociadas.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/receptions/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar el ingreso");
        return;
      }

      toast.success("Ingreso eliminado");
      fetchReceptions();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const receptores = employees.filter((e) => e.rol === "RECEPCIONISTA");
  const mecanicos = employees.filter((e) => e.rol === "MECANICO");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, cliente o falla..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha Ingreso</TableHead>
              <TableHead>Placa</TableHead>
              <TableHead>Vehículo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Responsables</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  Cargando ingresos...
                </TableCell>
              </TableRow>
            ) : receptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No se encontraron ingresos.
                </TableCell>
              </TableRow>
            ) : (
              receptions.map((r) => {
                const date = new Date(r.fecha_ingreso).toLocaleDateString("es-BO");
                return (
                  <TableRow key={r.id_ingreso}>
                    <TableCell>{date}</TableCell>
                    <TableCell className="font-mono text-sm font-bold text-foreground">{r.placa || "S/P"}</TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-normal">{[r.marca, r.modelo].filter(Boolean).join(" ") || "—"}</TableCell>
                    <TableCell className="text-sm sm:text-base font-semibold text-foreground max-w-[240px] whitespace-normal">{r.nombre_cliente}</TableCell>
                    <TableCell className="text-xs leading-normal">
                      <p>Rec: {r.nombre_receptor ? `${r.nombre_receptor} ${r.paterno_receptor || ""}` : "Sin asignar"}</p>
                      <p className="text-muted-foreground">Mec: {r.nombre_mecanico ? `${r.nombre_mecanico} ${r.paterno_mecanico || ""}` : "Sin asignar"}</p>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        r.estado_ingreso === "ENTREGADO"
                          ? "bg-success/15 text-success"
                          : r.estado_ingreso === "TERMINADO"
                            ? "bg-primary/15 text-primary"
                            : "bg-warning/15 text-warning"
                      }`}>
                        {r.estado_ingreso.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(r)}
                        disabled={isReadOnly}
                        title="Editar"
                      >
                        <Edit2 className="size-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(r.id_ingreso)}
                        disabled={!isAdmin}
                        title={isAdmin ? "Eliminar" : "Eliminar (Solo Administrador)"}
                      >
                        <Trash2 className={`size-4 ${isAdmin ? "text-destructive" : "text-muted-foreground/40"}`} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Reception Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Datos Taller — Placa {editingRec?.placa || "S/P"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recibido por (Receptor)</Label>
                <Select value={idReceptor} onValueChange={setIdReceptor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione receptor (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sin asignar (opcional) --</SelectItem>
                    {receptores.map((emp) => (
                      <SelectItem key={emp.id_empleado} value={emp.id_empleado.toString()}>
                        {emp.nombre} {emp.paterno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mecánico Asignado</Label>
                <Select value={idMecanico} onValueChange={setIdMecanico}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione mecánico (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-- Sin asignar (opcional) --</SelectItem>
                    {mecanicos.map((emp) => (
                      <SelectItem key={emp.id_empleado} value={emp.id_empleado.toString()}>
                        {emp.nombre} {emp.paterno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Ingreso</Label>
                <Input
                  type="date"
                  value={fechaIngreso}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                  className="h-10 text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado de Ingreso</Label>
                <Select value={estado} onValueChange={setEstado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                    <SelectItem value="EN_TRABAJO">En Trabajo</SelectItem>
                    <SelectItem value="TERMINADO">Trabajo Terminado</SelectItem>
                    <SelectItem value="ENTREGADO">Vehículo Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>



            <div className="space-y-2">
              <Label htmlFor="r-falla">Falla Reportada por el Cliente (Opcional)</Label>
              <Textarea
                id="r-falla"
                value={falla}
                onChange={(e) => setFalla(e.target.value)}
                placeholder="Detalle de fallas"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="r-obs">Observaciones Internas / Estado del Vehículo</Label>
              <Textarea
                id="r-obs"
                value={obsEstado}
                onChange={(e) => setObsEstado(e.target.value)}
                placeholder="Detalles sobre rayones, golpes, accesorios faltantes..."
                rows={2}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
