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
import { currency } from "@/components/proforma/proforma";

interface Item {
  id_item: number;
  codigo: string;
  descripcion: string;
  tipo_item: "REPUESTO" | "SERVICIO";
  precio: number;
  stock_actual: number | null;
  detalle?: string | null;
}

export function ItemCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Form State
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [tipo, setTipo] = useState<"REPUESTO" | "SERVICIO">("SERVICIO");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [detalle, setDetalle] = useState("");

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/items?all=true&query=${encodeURIComponent(search)}`;
      if (filterType !== "todos") {
        url += `&tipo_item=${filterType}`;
      }
      
      const res = await fetch(url, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar items de taller");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [search, filterType, token]);

  const handleOpenCreate = () => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingItem(null);
    setCodigo("");
    setDescripcion("");
    setTipo("SERVICIO");
    setPrecio("");
    setStock("0");
    setDetalle("");
    setIsOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setEditingItem(item);
    setCodigo(item.codigo);
    setDescripcion(item.descripcion);
    setTipo(item.tipo_item);
    setPrecio(item.precio.toString());
    setStock(item.stock_actual?.toString() || "0");
    setDetalle(item.detalle || "");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      toast.error("El código es requerido");
      return;
    }
    if (!descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }
    if (precio === "" || isNaN(Number(precio)) || Number(precio) < 0) {
      toast.error("El precio debe ser un número válido mayor o igual a cero");
      return;
    }
    if (tipo === "REPUESTO" && (stock === "" || isNaN(Number(stock)) || Number(stock) < 0)) {
      toast.error("El stock debe ser un número válido mayor o igual a cero");
      return;
    }

    const bodyData = {
      codigo: codigo.trim().toUpperCase(),
      descripcion: descripcion.trim(),
      tipo_item: tipo,
      precio: Number(precio),
      stock_actual: tipo === "REPUESTO" ? Number(stock) : null,
      detalle: detalle.trim() || null,
    };

    try {
      const url = editingItem
        ? `${API_URL}/items/${editingItem.id_item}`
        : `${API_URL}/items`;
      const method = editingItem ? "PUT" : "POST";

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
        toast.error(data.message || "Error al guardar el item");
        return;
      }

      toast.success(editingItem ? "Item actualizado" : "Item registrado");
      setIsOpen(false);
      fetchItems();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar items");
      return;
    }

    if (!confirm("¿Está seguro de eliminar este item? Esto fallará si está usado en alguna proforma.")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/items/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar el item");
        return;
      }

      toast.success("Item eliminado correctamente");
      fetchItems();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por descripción o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full sm:w-[180px]">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los Tipos</SelectItem>
                <SelectItem value="REPUESTO">Solo Repuestos</SelectItem>
                <SelectItem value="SERVICIO">Solo Servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {isEditor && (
          <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
            <Plus className="size-4 mr-2" /> Nuevo Item
          </Button>
        )}
      </div>

      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 font-semibold">
              <TableHead className="w-[140px]">Código</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[120px] text-right">Precio</TableHead>
              <TableHead className="w-[120px] text-right">Stock</TableHead>
              {isEditor && <TableHead className="w-[100px] text-center">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Cargando items...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron items registrados.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id_item} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs font-semibold">{item.codigo}</TableCell>
                  <TableCell className="font-medium">
                    <div>{item.descripcion}</div>
                    {item.detalle && (
                      <div className="text-[11px] text-foreground/80 italic mt-0.5">
                        ↳ {item.detalle}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                      item.tipo_item === "REPUESTO" 
                        ? "bg-sky-400/10 text-sky-400 ring-sky-400/20" 
                        : "bg-emerald-400/10 text-emerald-400 ring-emerald-400/20"
                    }`}>
                      {item.tipo_item}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {currency(item.precio)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {item.tipo_item === "REPUESTO" ? (
                      <span className={item.stock_actual && item.stock_actual > 0 ? "text-foreground" : "text-destructive font-bold"}>
                        {item.stock_actual ?? 0} u.
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-sans italic">no aplica</span>
                    )}
                  </TableCell>
                  {isEditor && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(item)}
                          className="size-8"
                          title="Editar"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        {isAdmin ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id_item)}
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
              {editingItem ? "Editar Item de Taller" : "Registrar Nuevo Item"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código*</Label>
                <Input
                  id="codigo"
                  placeholder="Ej. REP-001, SER-002"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  disabled={editingItem !== null} // Bloqueamos cambio de código al editar para mayor seguridad
                  className="font-mono uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Item*</Label>
                <Select
                  value={tipo}
                  onValueChange={(val: any) => setTipo(val)}
                  disabled={editingItem !== null} // Evitamos cambiar tipo directo para evitar corrupción de proformas previas
                >
                  <SelectTrigger id="tipo">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVICIO">SERVICIO (Mano de obra)</SelectItem>
                    <SelectItem value="REPUESTO">REPUESTO (Material/Producto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción*</Label>
              <Input
                id="descripcion"
                placeholder="Ej. Cambio de Aceite Sintético 5W30, Pastilla de Freno Delantera"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="detalle">Explicación / Detalle extendido (Opcional)</Label>
              <Input
                id="detalle"
                placeholder="Ej. Incluye cambio de arandela y revisión de niveles"
                value={detalle}
                onChange={(e) => setDetalle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precio">
                  {tipo === "REPUESTO" ? "Precio Venta (Bs.)*" : "Precio Base / Costo (Bs.)*"}
                </Label>
                <Input
                  id="precio"
                  type="number"
                  step="0.01"
                  placeholder="Ej. 150.00"
                  value={precio}
                  onChange={(e) => setPrecio(e.target.value)}
                />
              </div>

              {tipo === "REPUESTO" && (
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Inicial (unidades)*</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="Ej. 10"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                  />
                </div>
              )}
            </div>

            {editingItem && (
              <p className="text-[11px] text-muted-foreground italic mt-2 text-center">
                * Para cambiar el código o tipo del item, debe crear uno nuevo.
              </p>
            )}

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
