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
  id_empleado_receptor: number;
  nombre_receptor: string;
  paterno_receptor: string;
  id_mecanico_asignado: number;
  nombre_mecanico: string;
  paterno_mecanico: string;
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
    setIdReceptor(rec.id_empleado_receptor.toString());
    setIdMecanico(rec.id_mecanico_asignado.toString());
    setKilometraje(rec.kilometraje.toString());
    setFuelLevel(rec.nivel_combustible_porcentaje);
    setObsEstado(rec.observaciones_estado || "");
    setFalla(rec.falla_reportada);
    setEstado(rec.estado_ingreso);
    
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
    if (!idReceptor || !idMecanico || !falla.trim()) {
      toast.error("Por favor complete los campos obligatorios");
      return;
    }

    const bodyData = {
      id_vehiculo: editingRec?.id_vehiculo,
      id_empleado_receptor: parseInt(idReceptor),
      id_mecanico_asignado: parseInt(idMecanico),
      kilometraje: parseInt(kilometraje) || 0,
      fuelLevel,
      observaciones_estado: obsEstado.trim() || null,
      deja_accesorios: accessories.join(", ") || null,
      falla_reportada: falla.trim(),
      estado_ingreso: estado,
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
        toast.error(data.message || "Error al actualizar la recepción");
        return;
      }

      toast.success("Recepción actualizada");
      setIsOpen(false);
      fetchReceptions();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar recepciones");
      return;
    }

    if (!confirm("¿Está seguro de eliminar esta recepción? Esto fallará si tiene proformas asociadas.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/receptions/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar la recepción");
        return;
      }

      toast.success("Recepción eliminada");
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
                  Cargando recepciones...
                </TableCell>
              </TableRow>
            ) : receptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">
                  No se encontraron recepciones.
                </TableCell>
              </TableRow>
            ) : (
              receptions.map((r) => {
                const date = new Date(r.fecha_ingreso).toLocaleDateString("es-BO");
                return (
                  <TableRow key={r.id_ingreso}>
                    <TableCell>{date}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{r.placa}</TableCell>
                    <TableCell className="text-xs">{r.marca} {r.modelo}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{r.nombre_cliente}</TableCell>
                    <TableCell className="text-xs leading-normal">
                      <p>Rec: {r.nombre_receptor} {r.paterno_receptor}</p>
                      <p className="text-muted-foreground">Mec: {r.nombre_mecanico} {r.paterno_mecanico}</p>
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
            <DialogTitle>Editar Recepción — Placa {editingRec?.placa}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Recibido por (Receptor)</Label>
                <Select value={idReceptor} onValueChange={setIdReceptor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione receptor" />
                  </SelectTrigger>
                  <SelectContent>
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
                    <SelectValue placeholder="Seleccione mecánico" />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="space-y-2 col-span-2">
                <Label>Estado de Recepción</Label>
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
              <Label htmlFor="r-falla">Falla Reportada por el Cliente</Label>
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
