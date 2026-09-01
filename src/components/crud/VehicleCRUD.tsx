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
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { BrandModelCombobox } from "@/components/vehicle/BrandModelCombobox";

interface Vehicle {
  id_vehiculo: number;
  id_cliente: number;
  nombre_cliente: string;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
}

interface Client {
  id_cliente: number;
  nombre: string;
  ci: string | null;
  nit: string | null;
}

export function VehicleCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Form State
  const [idCliente, setIdCliente] = useState<string>("");
  const [placa, setPlaca] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [anio, setAnio] = useState("");
  const [color, setColor] = useState("");

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/vehicles?query=${encodeURIComponent(search)}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, token]);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  const handleOpenCreate = () => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingVehicle(null);
    setIdCliente("");
    setPlaca("");
    setMarca("");
    setModelo("");
    setAnio("");
    setColor("");
    setIsOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingVehicle(vehicle);
    setIdCliente(vehicle.id_cliente.toString());
    setPlaca(vehicle.placa);
    setMarca(vehicle.marca);
    setModelo(vehicle.modelo);
    setAnio(vehicle.anio?.toString() || "");
    setColor(vehicle.color || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCliente) {
      toast.error("Debe seleccionar un cliente");
      return;
    }
    if (!placa.trim() || !marca.trim() || !modelo.trim()) {
      toast.error("La placa, marca y modelo son requeridas");
      return;
    }

    const bodyData = {
      id_cliente: parseInt(idCliente),
      placa: placa.trim().toUpperCase(),
      marca: marca.trim(),
      modelo: modelo.trim(),
      anio: anio.trim() ? parseInt(anio.trim()) : null,
      color: color.trim() || null,
    };

    try {
      const url = editingVehicle
        ? `${API_URL}/vehicles/${editingVehicle.id_vehiculo}`
        : `${API_URL}/vehicles`;
      const method = editingVehicle ? "PUT" : "POST";

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
        toast.error(data.message || "Error al guardar el vehículo");
        return;
      }

      toast.success(editingVehicle ? "Vehículo actualizado" : "Vehículo registrado");
      setIsOpen(false);
      fetchVehicles();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar vehículos");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este vehículo? Esto podría fallar si tiene recepciones registradas.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/vehicles/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar el vehículo");
        return;
      }

      toast.success("Vehículo eliminado");
      fetchVehicles();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por placa, marca, modelo o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate} disabled={isReadOnly}>
          <Plus className="size-4 mr-2" /> Agregar Vehículo
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Cliente Propietario</TableHead>
              <TableHead>Marca</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Año</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Cargando vehículos...
                </TableCell>
              </TableRow>
            ) : vehicles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No se encontraron vehículos.
                </TableCell>
              </TableRow>
            ) : (
              vehicles.map((v) => (
                <TableRow key={v.id_vehiculo}>
                  <TableCell className="font-mono font-semibold text-xs uppercase tracking-wider bg-surface-2/45 px-2.5 py-1.5 rounded-md inline-block my-2 ml-4 border border-border">
                    {v.placa}
                  </TableCell>
                  <TableCell>{v.nombre_cliente}</TableCell>
                  <TableCell>{v.marca}</TableCell>
                  <TableCell>{v.modelo}</TableCell>
                  <TableCell>{v.anio || "—"}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(v)}
                      disabled={isReadOnly}
                      title="Editar"
                    >
                      <Edit2 className="size-4 text-primary" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(v.id_vehiculo)}
                      disabled={!isAdmin}
                      title={isAdmin ? "Eliminar" : "Eliminar (Solo Administrador)"}
                    >
                      <Trash2 className={`size-4 ${isAdmin ? "text-destructive" : "text-muted-foreground/40"}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Vehicle Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? "Editar Vehículo" : "Registrar Vehículo"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Propietario / Cliente</Label>
              <Select
                value={idCliente}
                onValueChange={(val) => setIdCliente(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione Propietario" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id_cliente} value={c.id_cliente.toString()}>
                      {c.nombre} ({c.ci || c.nit || "Inv"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="v-placa">Placa</Label>
              <Input
                id="v-placa"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="3412 ABC"
                className="font-mono uppercase"
              />
            </div>

            <BrandModelCombobox
              brand={marca}
              model={modelo}
              onBrandChange={setMarca}
              onModelChange={setModelo}
              token={token}
            />

            <div className="space-y-2">
              <Label htmlFor="v-anio">Año</Label>
              <Input
                id="v-anio"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
                placeholder="2020"
                inputMode="numeric"
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
