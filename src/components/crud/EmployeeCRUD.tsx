import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Search, Edit2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface Employee {
  id_empleado: number;
  ci: string;
  nombre: string;
  paterno: string;
  materno: string | null;
  telefono: string | null;
  rol: "RECEPCIONISTA" | "MECANICO" | "ADMINISTRADOR";
  estado: "ACTIVO" | "INACTIVO";
}

export function EmployeeCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State
  const [ci, setCi] = useState("");
  const [nombre, setNombre] = useState("");
  const [paterno, setPaterno] = useState("");
  const [materno, setMaterno] = useState("");
  const [telefono, setTelefono] = useState("");
  const [rol, setRol] = useState<"RECEPCIONISTA" | "MECANICO" | "ADMINISTRADOR">("MECANICO");
  const [estado, setEstado] = useState<"ACTIVO" | "INACTIVO">("ACTIVO");

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/employees?query=${encodeURIComponent(search)}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [search, token]);

  const handleOpenCreate = () => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingEmployee(null);
    setCi("");
    setNombre("");
    setPaterno("");
    setMaterno("");
    setTelefono("");
    setRol("MECANICO");
    setEstado("ACTIVO");
    setIsOpen(true);
  };

  const handleOpenEdit = (emp: Employee) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingEmployee(emp);
    setCi(emp.ci);
    setNombre(emp.nombre);
    setPaterno(emp.paterno);
    setMaterno(emp.materno || "");
    setTelefono(emp.telefono || "");
    setRol(emp.rol);
    setEstado(emp.estado);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!ci.trim()) {
      toast.error("El CI es requerido");
      return;
    }
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }
    if (!paterno.trim()) {
      toast.error("El apellido paterno es requerido");
      return;
    }

    const bodyData = {
      ci: ci.trim(),
      nombre: nombre.trim(),
      paterno: paterno.trim(),
      materno: materno.trim() || null,
      telefono: telefono.trim() || null,
      rol,
      estado,
    };

    try {
      const url = editingEmployee
        ? `${API_URL}/employees/${editingEmployee.id_empleado}`
        : `${API_URL}/employees`;
      const method = editingEmployee ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al guardar el empleado");
        return;
      }

      toast.success(editingEmployee ? "Empleado actualizado" : "Empleado registrado");
      setIsOpen(false);
      fetchEmployees();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar empleados");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este empleado?")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/employees/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar el empleado");
        return;
      }

      toast.success("Empleado eliminado correctamente");
      fetchEmployees();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, CI o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {isEditor && (
          <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
            <Plus className="size-4 mr-2" /> Nuevo Empleado
          </Button>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 font-semibold">
              <TableHead className="w-[120px]">CI</TableHead>
              <TableHead>Nombre Completo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="w-[100px]">Estado</TableHead>
              {isEditor && <TableHead className="w-[100px] text-center">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cargando empleados...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron empleados registrados.
                </TableCell>
              </TableRow>
            ) : (
              employees.map((emp) => (
                <TableRow key={emp.id_empleado} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs">{emp.ci}</TableCell>
                  <TableCell className="font-medium">
                    {emp.nombre} {emp.paterno} {emp.materno || ""}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      emp.rol === "ADMINISTRADOR" 
                        ? "bg-purple-400/10 text-purple-400 ring-purple-400/20" 
                        : emp.rol === "RECEPCIONISTA"
                        ? "bg-blue-400/10 text-blue-400 ring-blue-400/20"
                        : "bg-amber-400/10 text-amber-400 ring-amber-400/20"
                    }`}>
                      {emp.rol}
                    </span>
                  </TableCell>
                  <TableCell>{emp.telefono || "-"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      emp.estado === "ACTIVO" 
                        ? "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20" 
                        : "bg-red-400/10 text-red-400 ring-red-400/20"
                    }`}>
                      {emp.estado}
                    </span>
                  </TableCell>
                  {isEditor && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(emp)}
                          className="size-8"
                          title="Editar"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(emp.id_empleado)}
                            className="size-8 text-destructive hover:bg-destructive/10"
                            title="Eliminar"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        ) : (
                          <span className="size-8 inline-flex items-center justify-center text-muted-foreground opacity-30" title="Requiere ser Administrador para eliminar">
                            <ShieldAlert className="size-3.5" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Agregar / Editar */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Editar Empleado" : "Registrar Nuevo Empleado"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ci">Documento de Identidad (CI)*</Label>
                <Input
                  id="ci"
                  placeholder="Ej. 1234567"
                  value={ci}
                  onChange={(e) => setCi(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="Ej. 76543210"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre(s)*</Label>
              <Input
                id="nombre"
                placeholder="Nombres del empleado"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paterno">Apellido Paterno*</Label>
                <Input
                  id="paterno"
                  placeholder="Apellido Paterno"
                  value={paterno}
                  onChange={(e) => setPaterno(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materno">Apellido Materno</Label>
                <Input
                  id="materno"
                  placeholder="Apellido Materno (Opcional)"
                  value={materno}
                  onChange={(e) => setMaterno(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rol">Rol en Taller*</Label>
                <Select
                  value={rol}
                  onValueChange={(val: any) => setRol(val)}
                >
                  <SelectTrigger id="rol">
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MECANICO">MECÁNICO</SelectItem>
                    <SelectItem value="RECEPCIONISTA">RECEPCIONISTA / RECEPTOR</SelectItem>
                    <SelectItem value="ADMINISTRADOR">ADMINISTRADOR</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado*</Label>
                <Select
                  value={estado}
                  onValueChange={(val: any) => setEstado(val)}
                >
                  <SelectTrigger id="estado">
                    <SelectValue placeholder="Seleccione el estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                    <SelectItem value="INACTIVO">INACTIVO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border mt-4">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Guardar Cambios</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
