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

interface Client {
  id_cliente: number;
  tipo_cliente: "NIT" | "CI" | "EXTRANJERO";
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  nit: string | null;
  ci: string | null;
  pasaporte: string | null;
  pais_origen: string | null;
}

export function ClientCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form State
  const [tipo, setTipo] = useState<"NIT" | "CI" | "EXTRANJERO">("CI");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [docVal, setDocVal] = useState("");
  const [pais, setPais] = useState("");

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients?query=${encodeURIComponent(search)}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search, token]);

  const handleOpenCreate = () => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingClient(null);
    setTipo("CI");
    setNombre("");
    setTelefono("");
    setDireccion("");
    setDocVal("");
    setPais("");
    setIsOpen(true);
  };

  const handleOpenEdit = (client: Client) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingClient(client);
    setTipo(client.tipo_cliente);
    setNombre(client.nombre);
    setTelefono(client.telefono || "");
    setDireccion(client.direccion || "");
    setPais(client.pais_origen || "");
    setDocVal(
      client.tipo_cliente === "CI"
        ? client.ci || ""
        : client.tipo_cliente === "NIT"
          ? client.nit || ""
          : client.pasaporte || ""
    );
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (tipo === "CI" && !docVal.trim()) {
      toast.error("El CI es requerido");
      return;
    }
    if (tipo === "NIT" && !docVal.trim()) {
      toast.error("El NIT es requerido");
      return;
    }
    if (tipo === "EXTRANJERO" && (!docVal.trim() || !pais.trim())) {
      toast.error("El pasaporte y país de origen son requeridos");
      return;
    }

    const bodyData = {
      tipo_cliente: tipo,
      nombre: nombre.trim(),
      telefono: telefono.trim() || null,
      direccion: direccion.trim() || null,
      ci: tipo === "CI" ? docVal.trim() : null,
      nit: tipo === "NIT" ? docVal.trim() : null,
      pasaporte: tipo === "EXTRANJERO" ? docVal.trim() : null,
      pais_origen: tipo === "EXTRANJERO" ? pais.trim() : null,
    };

    try {
      const url = editingClient
        ? `${API_URL}/clients/${editingClient.id_cliente}`
        : `${API_URL}/clients`;
      const method = editingClient ? "PUT" : "POST";

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
        toast.error(data.message || "Error al guardar el cliente");
        return;
      }

      toast.success(editingClient ? "Cliente actualizado" : "Cliente registrado");
      setIsOpen(false);
      fetchClients();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar clientes");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este cliente? Esto podría fallar si tiene vehículos asociados.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/clients/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar el cliente");
        return;
      }

      toast.success("Cliente eliminado correctamente");
      fetchClients();
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
            placeholder="Buscar por nombre, CI, NIT o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate} disabled={isReadOnly}>
          <Plus className="size-4 mr-2" /> Agregar Cliente
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre / Razón Social</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Cargando clientes...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  No se encontraron clientes.
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => {
                const doc =
                  client.tipo_cliente === "CI"
                    ? `${client.ci || "—"} (CI)`
                    : client.tipo_cliente === "NIT"
                      ? `${client.nit || "—"} (NIT)`
                      : `${client.pasaporte || "—"} (${client.pais_origen || "PAS"})`;

                return (
                  <TableRow key={client.id_cliente}>
                    <TableCell className="font-medium">{client.nombre}</TableCell>
                    <TableCell className="text-xs uppercase font-semibold text-muted-foreground">
                      {client.tipo_cliente}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{doc}</TableCell>
                    <TableCell>{client.telefono || "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{client.direccion || "—"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(client)}
                        disabled={isReadOnly}
                        title="Editar"
                      >
                        <Edit2 className="size-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(client.id_cliente)}
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

      {/* Client Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingClient ? "Editar Cliente" : "Registrar Cliente"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Cliente</Label>
              <Select
                value={tipo}
                onValueChange={(val: any) => setTipo(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CI">Cédula de Identidad (CI)</SelectItem>
                  <SelectItem value="NIT">NIT / Factura</SelectItem>
                  <SelectItem value="EXTRANJERO">Extranjero (Pasaporte)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-name">Nombre o Razón Social</Label>
              <Input
                id="c-name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Juan Pérez Rocha"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-doc">
                {tipo === "CI" ? "Cédula de Identidad (CI)" : tipo === "NIT" ? "NIT" : "Número de Pasaporte"}
              </Label>
              <Input
                id="c-doc"
                value={docVal}
                onChange={(e) => setDocVal(e.target.value)}
                placeholder={tipo === "CI" ? "1234567 SC" : tipo === "NIT" ? "1029384756" : "PE987654"}
              />
            </div>

            {tipo === "EXTRANJERO" && (
              <div className="space-y-2">
                <Label htmlFor="c-pais">País de Origen</Label>
                <Input
                  id="c-pais"
                  value={pais}
                  onChange={(e) => setPais(e.target.value)}
                  placeholder="Argentina"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="c-tel">Teléfono (WhatsApp)</Label>
              <Input
                id="c-tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="+591 70012345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="c-dir">Dirección</Label>
              <Input
                id="c-dir"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Av. Roca y Coronado, 3er Anillo"
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
