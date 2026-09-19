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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { currency, type Proforma as ProformaDocType } from "../proforma/proforma";
import { ProformaDocument } from "../proforma/ProformaDocument";
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
  numero_proforma?: number | null;
}

interface ServiceLine {
  id: string;
  code?: string;
  description: string;
  qty: number | "";
  unitPrice: number | "";
  kind: "labor" | "part";
  detalle?: string;
}

export function ProformaCRUD() {
  const { token, isReadOnly, isAdmin, isEditor } = useAuth();
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);

  // Modal edit state
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProformaData, setEditingProformaData] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lines, setLines] = useState<ServiceLine[]>([]);
  const [discount, setDiscount] = useState<number | "">(0);
  const [taxRate, setTaxRate] = useState<number>(13);
  const [obsText, setObsText] = useState<string>("");
  const [fechaEmision, setFechaEmision] = useState<string>("");

  const fetchProformas = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/proformas`;
      if (search.trim()) {
        url += `?query=${encodeURIComponent(search.trim())}`;
      }
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setProformas(data);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar proformas");
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
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/proformas/${prof.id_proforma}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      setEditingId(prof.id_proforma);
      setEditingProformaData({ ...prof, ...data });
      setDiscount(data.discount || 0);
      setTaxRate(data.taxRate || 13);
      setObsText(data.observaciones || "");
      const rawDate = data.fecha_emision || prof.fecha_emision;
      setFechaEmision(rawDate ? String(rawDate).slice(0, 10) : new Date().toISOString().slice(0, 10));

      const loadedLines = (data.lines || []).map((l: ServiceLine) => {
        const raw = l.detalle !== null && l.detalle !== undefined ? String(l.detalle).trim() : "";
        const clean = raw.toLowerCase() !== "null" && raw.toLowerCase() !== "undefined" ? raw : "";
        return {
          ...l,
          detalle: clean,
        };
      });
      setLines(loadedLines);
      setIsOpen(true);
    } catch (e) {
      toast.error("Error al cargar detalles de proforma");
    } finally {
      setLoading(false);
    }
  };

  const addLine = (preset?: Partial<ServiceLine>) => {
    setLines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        description: preset?.description ?? "",
        qty: preset?.qty ?? "",
        unitPrice: preset?.unitPrice ? preset.unitPrice : "",
        kind: preset?.kind ?? "labor",
        detalle: preset?.detalle ?? "",
      },
    ]);
  };

  const updateLine = (id: string, patch: Partial<ServiceLine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
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

    if (lines.some((l) => !l.qty || Number(l.qty) <= 0)) {
      toast.error("Por favor, ingrese una cantidad válida para todos los ítems");
      return;
    }

    const bodyData = {
      lines: lines.map((l) => {
        const raw = l.detalle !== null && l.detalle !== undefined ? String(l.detalle).trim() : "";
        const clean = raw.toLowerCase() !== "null" && raw.toLowerCase() !== "undefined" ? raw : "";
        return {
          code: l.code,
          description: l.description,
          qty: Number(l.qty) || 1,
          unitPrice: Number(l.unitPrice) || 0,
          kind: l.kind,
          detalle: clean,
        };
      }),
      discount: Number(discount) || 0,
      taxRate: 0,
      observaciones: obsText,
      fecha_emision: fechaEmision ? `${fechaEmision} 12:00:00` : null,
    };

    try {
      const res = await fetch(`${API_URL}/proformas/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

    if (
      !confirm("¿Está seguro de eliminar esta proforma de forma permanente?")
    ) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/proformas/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
            placeholder="Buscar por código, placa, cliente, marca, modelo o estado..."
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
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  Cargando proformas...
                </TableCell>
              </TableRow>
            ) : proformas.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-6 text-muted-foreground"
                >
                  No se encontraron proformas.
                </TableCell>
              </TableRow>
            ) : (
              proformas.map((p) => {
                const date = new Date(p.fecha_emision);
                const code = `PF-${String(p.numero_proforma || p.id_proforma).padStart(4, "0")}`;
                return (
                  <TableRow key={p.id_proforma}>
                    <TableCell className="font-mono font-medium text-xs text-primary">
                      {code}
                    </TableCell>
                    <TableCell>{date.toLocaleDateString("es-BO")}</TableCell>
                    <TableCell className="font-semibold text-sm sm:text-base text-foreground whitespace-normal">
                      {p.nombre_cliente}
                    </TableCell>
                    <TableCell className="font-mono text-sm sm:text-base font-bold text-foreground whitespace-normal">
                      {p.placa} <span className="font-sans text-xs font-normal text-muted-foreground block sm:inline">({p.marca} {p.modelo})</span>
                    </TableCell>
                    <TableCell className="font-mono font-medium text-xs sm:text-sm">
                      Bs {currency(Number(p.monto_total))}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          p.estado === "APROBADA"
                            ? "bg-success/15 text-success"
                            : p.estado === "RECHAZADA"
                              ? "bg-destructive/15 text-destructive"
                              : "bg-warning/15 text-warning"
                        }`}
                      >
                        {p.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          navigate({ to: `/proforma/${p.id_proforma}` })
                        }
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
                        title={
                          isAdmin ? "Eliminar" : "Eliminar (Solo Administrador)"
                        }
                      >
                        <Trash2
                          className={`size-4 ${isAdmin ? "text-destructive" : "text-muted-foreground/40"}`}
                        />
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
        <DialogContent className="max-w-6xl w-[96vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Editar Detalles e Ítems de Proforma</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-lg border border-border bg-surface-2/40">
              <div className="flex items-center gap-3">
                <Label className="label-caps text-xs font-bold whitespace-nowrap">Fecha de Emisión:</Label>
                <Input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="h-9 w-44 font-medium text-sm"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="label-caps text-xs font-bold">
                  Detalle de Líneas de Estimación
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addLine()}
                  >
                    <Plus className="size-4 mr-1" /> Agregar Ítem
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5 border border-border p-3.5 rounded-lg bg-surface-2/30">
                {lines.length > 0 && (
                  <div className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_58px_105px_115px_38px] gap-2.5 px-[13px] mb-1.5 text-muted-foreground font-semibold items-center">
                    <span className="text-xs font-bold label-caps truncate">
                      Descripción del Ítem / Servicio
                    </span>
                    <span className="text-xs font-bold label-caps text-center">
                      Cant.
                    </span>
                    <span className="text-xs font-bold label-caps text-right pr-2">
                      P. Unit.
                    </span>
                    <span className="text-xs font-bold label-caps pl-1">
                      Tipo
                    </span>
                    <span />
                  </div>
                )}
                {lines.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No hay líneas registradas en esta proforma
                  </p>
                )}
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className="p-3 rounded-md border border-border/70 bg-card/50 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_58px_105px_115px_38px] gap-2.5 items-center">
                      <ItemAutocomplete
                        value={l.description}
                        token={token}
                        placeholder="Describa el servicio o repuesto..."
                        onChange={(desc, code, price, kind, detalle) => {
                          if (code) {
                            const existingLine = lines.find(
                              (line) => line.id !== l.id && line.code === code,
                            );
                            if (existingLine) {
                              updateLine(existingLine.id, {
                                qty:
                                  (Number(existingLine.qty) || 1) +
                                  (Number(l.qty) || 1),
                              });
                              removeLine(l.id);
                              toast.info(
                                `El ítem "${desc}" ya estaba en la proforma. Se incrementó su cantidad.`,
                              );
                              return;
                            }
                            const cleanDet = detalle && detalle.trim().toLowerCase() !== "null" ? detalle.trim() : (l.detalle && l.detalle.trim().toLowerCase() !== "null" ? l.detalle.trim() : "");
                            updateLine(l.id, {
                              description: desc,
                              code: code,
                              unitPrice: price > 0 ? price : "",
                              kind: kind,
                              detalle: cleanDet,
                              qty: l.qty && l.qty !== 1 ? l.qty : "",
                            });
                          } else {
                            updateLine(l.id, { description: desc });
                          }
                        }}
                      />
                      <Input
                        type="number"
                        step="any"
                        value={l.qty === 0 || l.qty === "" ? "" : l.qty}
                        placeholder=""
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLine(l.id, {
                            qty: val === "" ? "" : Number(val),
                          });
                        }}
                        className="text-center px-1 text-sm sm:text-base font-medium h-10"
                      />
                      <Input
                        type="number"
                        step="any"
                        value={
                          l.unitPrice === 0 || l.unitPrice === ""
                            ? ""
                            : l.unitPrice
                        }
                        placeholder=""
                        onChange={(e) => {
                          const val = e.target.value;
                          updateLine(l.id, {
                            unitPrice: val === "" ? "" : Number(val),
                          });
                        }}
                        className="text-right px-2 text-sm sm:text-base font-medium font-mono h-10"
                      />
                      <Select
                        value={l.kind}
                        onValueChange={(val: "labor" | "part") =>
                          updateLine(l.id, { kind: val })
                        }
                      >
                        <SelectTrigger className="h-10 text-xs sm:text-sm px-2.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="labor" className="text-sm">Servicio</SelectItem>
                          <SelectItem value="part" className="text-sm">Repuesto</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(l.id)}
                        className="text-destructive hover:bg-destructive/10 shrink-0 mx-auto h-10 w-9 sm:w-full flex items-center justify-center"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="size-4 sm:size-5" />
                      </Button>
                    </div>

                    {/* Explicación del item */}
                    <div className="flex items-center gap-2.5 pt-2 border-t border-border/40">
                      <span className="label-caps text-xs font-bold text-muted-foreground shrink-0">
                        Explicación:
                      </span>
                      <Input
                        value={l.detalle && l.detalle.trim().toLowerCase() !== "null" ? l.detalle : ""}
                        onChange={(e) =>
                          updateLine(l.id, { detalle: e.target.value })
                        }
                        placeholder="Explicación o mayor detalle del ítem (opcional)..."
                        className="h-9 text-sm bg-background/50 text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                  </div>
                ))}

                {/* Botón inferior para añadir un nuevo ítem sin tener que subir al inicio */}
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addLine()}
                    className="w-full border-dashed border-border/80 hover:border-primary hover:text-primary py-2.5 font-medium transition-colors"
                  >
                    <Plus className="size-4 mr-1.5" /> Agregar Ítem al Final
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="p-desc">Descuento (Bs.)</Label>
              <Input
                id="p-desc"
                type="number"
                value={discount === 0 || discount === "" ? "" : discount}
                placeholder="0.00"
                onChange={(e) =>
                  setDiscount(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                className="max-w-xs font-mono"
              />
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

            <DialogFooter className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPreviewOpen(true)}
                className="w-full sm:w-auto text-primary hover:text-primary/90 border-primary/30 hover:border-primary"
              >
                <Eye className="size-4 mr-1.5" /> Previsualizar
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Guardar Cambios</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Previsualización en Vivo de la Proforma */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] overflow-y-auto p-2 sm:p-6 bg-slate-900/50 backdrop-blur-sm">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold">
              Vista Previa del Documento de Proforma
            </DialogTitle>
          </DialogHeader>
          <div className="border border-border rounded-xl shadow-lg overflow-hidden bg-card mx-auto w-full">
            {editingProformaData && (
              <ProformaDocument
                data={{
                  clientName: editingProformaData.nombre_cliente || "",
                  clientPhone: editingProformaData.telefono_cliente || "",
                  clientDoc:
                    editingProformaData.ci_cliente ||
                    editingProformaData.nit_cliente ||
                    editingProformaData.pasaporte_cliente ||
                    "",
                  plate: editingProformaData.placa || "",
                  brand: editingProformaData.marca || "",
                  model: editingProformaData.modelo || "",
                  year: editingProformaData.anio?.toString() || "",
                  color: editingProformaData.color || "",
                  mileage: editingProformaData.kilometraje?.toString() || "",
                  fuel: editingProformaData.nivel_combustible || "Gasolina",
                  vin: editingProformaData.vin || "",
                  receivedBy: editingProformaData.nombre_receptor
                    ? `${editingProformaData.nombre_receptor} ${editingProformaData.paterno_receptor || ""}`.trim()
                    : "",
                  entryDate: fechaEmision || "",
                  entryTime: "",
                  fuelLevel: editingProformaData.nivel_combustible_porcentaje || 50,
                  complaint: editingProformaData.falla_reportada || "",
                  notes: obsText || "",
                  lines: lines.map((l) => ({
                    ...l,
                    qty: Number(l.qty) || 1,
                    unitPrice: Number(l.unitPrice) || 0,
                  })),
                  discount: Number(discount) || 0,
                  taxRate: Number(taxRate) || 0,
                }}
                code={`PF-${String(editingProformaData.numero_proforma || editingProformaData.id_proforma || "").padStart(4, "0")}`}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
