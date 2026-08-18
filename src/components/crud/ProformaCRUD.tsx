import { useState, useEffect } from "react";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Search, Eye, Edit2, Trash2, Plus, Trash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { currency } from "../proforma/proforma";
import { ItemAutocomplete } from "../proforma/ItemAutocomplete";

interface Proforma {
  id_proforma: number;
  id_ingreso: number;
  fecha_emision: string;
  estado: "PENDIENTE" | "APROBADA" | "RECHAZADA";
  monto_total: string;
  observaciones: string;
  placa: string;
  marca: string;
  modelo: string;
  nombre_cliente: string;
  discount: number;
  taxRate: number;
}

interface ServiceLine {
  id: string;
  code?: string;
  description: string;
  qty: number;
  unitPrice: number;
  kind: "labor" | "part";
}

export function ProformaCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(13);
  const [obsText, setObsText] = useState("");

  const fetchProformas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/proformas?query=${encodeURIComponent(search)}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProformas(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProformas();
  }, [search, token]);

  const handleOpenEdit = async (prof: Proforma) => {
    if (!isEditor) {
      toast.error("Debe iniciar sesión para realizar cambios");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/proformas/${prof.id_proforma}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setEditingId(prof.id_proforma);
      setDiscount(data.discount || 0);
      setTaxRate(data.taxRate || 13);
      setObsText(data.observaciones || "");
      setLines(data.lines || []);
      setIsOpen(true);
    } catch (e) {
      toast.error("Error al cargar detalles de proforma");
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        description: "",
        qty: 1,
        unitPrice: 0,
        kind: "labor",
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<ServiceLine>) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      toast.error("La proforma debe contener al menos un ítem");
      return;
    }

    if (lines.some((l) => !l.description.trim())) {
      toast.error("Todos los ítems deben tener una descripción");
      return;
    }

    const bodyData = {
      lines: lines.map((l) => ({
        description: l.description,
        qty: l.qty,
        unitPrice: l.unitPrice,
        kind: l.kind,
      })),
      discount,
      taxRate,
      observaciones: obsText,
    };

    try {
      const res = await fetch(`${API_URL}/proformas/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al actualizar la proforma");
        return;
      }

      toast.success("Proforma actualizada correctamente");
      setIsOpen(false);
      fetchProformas();
    } catch (err) {
      toast.error("Error al conectar con el servidor");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      toast.error("Solo el administrador puede eliminar proformas");
      return;
    }

    if (!confirm("¿Está seguro de eliminar esta proforma de forma permanente?")) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/proformas/${id}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {},
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error al eliminar la proforma");
        return;
      }

      toast.success("Proforma eliminada");
      fetchProformas();
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
            placeholder="Buscar por código, placa, cliente o estado..."
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
              <TableHead>Código</TableHead>
              <TableHead>Fecha Emisión</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vehículo (Placa)</TableHead>
              <TableHead>Monto Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && proformas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  Cargando proformas...
                </TableCell>
              </TableRow>
            ) : proformas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  No se encontraron proformas.
                </TableCell>
              </TableRow>
            ) : (
              proformas.map((p) => {
                const date = new Date(p.fecha_emision);
                const code = `PF-${date.getFullYear()}-${String(p.id_proforma).padStart(4, "0")}`;
                return (
                  <TableRow key={p.id_proforma}>
                    <TableCell className="font-mono font-medium text-xs text-primary">
                      {code}
                    </TableCell>
                    <TableCell>{date.toLocaleDateString("es-BO")}</TableCell>
                    <TableCell>{p.nombre_cliente}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{p.placa} ({p.marca} {p.modelo})</TableCell>
                    <TableCell className="font-mono font-medium text-xs">
                      Bs {currency(Number(p.monto_total))}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        p.estado === "APROBADA"
                          ? "bg-success/15 text-success"
                          : p.estado === "RECHAZADA"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                      }`}>
                        {p.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate({ to: `/proforma/${p.id_proforma}` })}
                        title="Ver Documento"
                      >
                        <Eye className="size-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(p)}
                        disabled={isReadOnly}
                        title="Editar Características e Ítems"
                      >
                        <Edit2 className="size-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(p.id_proforma)}
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

      {/* Proforma Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Detalles e Ítems de Proforma</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="label-caps">Detalle de Líneas de Estimación</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="size-4 mr-1" /> Agregar Línea
                </Button>
              </div>

              <div className="space-y-2 border border-border p-3 rounded-lg bg-surface-2/30">
                <div className="hidden sm:grid sm:grid-cols-[2fr_1fr_1fr_1.5fr_0.5fr] gap-3 mb-1 px-1">
                  <span className="text-[10px] font-semibold label-caps">Descripción</span>
                  <span className="text-[10px] font-semibold label-caps text-right">Cant.</span>
                  <span className="text-[10px] font-semibold label-caps text-right">P. Unit.</span>
                  <span className="text-[10px] font-semibold label-caps">Tipo</span>
                  <span />
                </div>
                {lines.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-4">No hay líneas registradas en esta proforma</p>
                )}
                {lines.map((l) => (
                  <div key={l.id} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_1.5fr_0.5fr] gap-2 items-center border-b border-border sm:border-0 pb-3 sm:pb-0">
                    <ItemAutocomplete
                      value={l.description}
                      token={token}
                      placeholder="Describa el servicio o repuesto..."
                      onChange={(desc, code, price, kind) => {
                        if (code) {
                          updateLine(l.id, {
                            description: desc,
                            code: code,
                            unitPrice: price,
                            kind: kind,
                          });
                        } else {
                          updateLine(l.id, { description: desc });
                        }
                      }}
                    />
                    <Input
                      type="number"
                      value={l.qty}
                      onChange={(e) => updateLine(l.id, { qty: Number(e.target.value) || 0 })}
                      className="text-right"
                    />
                    <Input
                      type="number"
                      value={l.unitPrice}
                      onChange={(e) => updateLine(l.id, { unitPrice: Number(e.target.value) || 0 })}
                      className="text-right"
                    />
                    <Select
                      value={l.kind}
                      onValueChange={(val: any) => updateLine(l.id, { kind: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="labor">Servicio</SelectItem>
                        <SelectItem value="part">Repuesto</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(l.id)}
                      className="text-destructive"
                    >
                      <Trash className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-desc">Descuento (%)</Label>
                <Input
                  id="p-desc"
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="p-iva">IVA (%)</Label>
                <Input
                  id="p-iva"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-obs">Observaciones Internas</Label>
              <Textarea
                id="p-obs"
                value={obsText}
                onChange={(e) => setObsText(e.target.value)}
                placeholder="Observaciones de la estimación..."
                rows={3}
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
