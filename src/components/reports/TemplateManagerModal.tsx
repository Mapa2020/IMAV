import { useState } from "react";
import { Plus, Trash2, Edit2, Sparkles, FileText, Mail, Save, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth, API_URL } from "@/hooks/useAuth";

export interface DocumentTemplate {
  id_plantilla: number;
  tipo: "INFORME" | "CARTA";
  titulo: string;
  referencia: string;
  contenido: string;
  costo_estimado: number | null;
  created_at?: string;
  updated_at?: string;
}

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: DocumentTemplate[];
  onTemplatesChanged: () => void;
  initialType?: "INFORME" | "CARTA";
}

export function TemplateManagerModal({
  isOpen,
  onClose,
  templates,
  onTemplatesChanged,
  initialType = "INFORME",
}: TemplateManagerModalProps) {
  const { token, isReadOnly } = useAuth();
  const [activeTab, setActiveTab] = useState<"ALL" | "INFORME" | "CARTA">(initialType);

  // Form states (null when not editing/creating)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields
  const [formTipo, setFormTipo] = useState<"INFORME" | "CARTA">("INFORME");
  const [formTitulo, setFormTitulo] = useState("");
  const [formReferencia, setFormReferencia] = useState("");
  const [formContenido, setFormContenido] = useState("");
  const [formCosto, setFormCosto] = useState("");
  const [saving, setSaving] = useState(false);

  const handleOpenNew = (type?: "INFORME" | "CARTA") => {
    setEditingId(null);
    setFormTipo(type || (activeTab === "ALL" ? "INFORME" : activeTab));
    setFormTitulo("");
    setFormReferencia("");
    setFormContenido("");
    setFormCosto("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (t: DocumentTemplate) => {
    setEditingId(t.id_plantilla);
    setFormTipo(t.tipo);
    setFormTitulo(t.titulo);
    setFormReferencia(t.referencia);
    setFormContenido(t.contenido);
    setFormCosto(t.costo_estimado ? String(t.costo_estimado) : "");
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitulo.trim() || !formReferencia.trim() || !formContenido.trim()) {
      toast.error("Por favor complete título, referencia y contenido");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo: formTipo,
        titulo: formTitulo.trim(),
        referencia: formReferencia.trim(),
        contenido: formContenido.trim(),
        costo_estimado: formTipo === "INFORME" && formCosto ? parseFloat(formCosto) : null,
      };

      const url = editingId ? `${API_URL}/templates/${editingId}` : `${API_URL}/templates`;
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Error al guardar plantilla");
      }

      toast.success(editingId ? "Plantilla actualizada con éxito" : "Nueva plantilla creada");
      handleCloseForm();
      onTemplatesChanged();
    } catch (err: any) {
      toast.error(err.message || "Error al conectar con el servidor");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, titulo: string) => {
    if (!confirm(`¿Está seguro de eliminar la plantilla "${titulo}"?`)) return;

    try {
      const res = await fetch(`${API_URL}/templates/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Error al eliminar plantilla");
      }

      toast.success("Plantilla eliminada correctamente");
      onTemplatesChanged();
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar plantilla");
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (activeTab === "ALL") return true;
    return t.tipo === activeTab;
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            Gestión de Plantillas de Redacción
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Administre textos modelo para emisión rápida de Informes Técnicos y Cartas Institucionales.
          </DialogDescription>
        </DialogHeader>

        {isFormOpen ? (
          /* FORMULARIO DE CREACIÓN / EDICIÓN */
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto py-3 space-y-4">
            <div className="flex items-center justify-between bg-muted/40 p-3 rounded-lg border">
              <span className="text-sm font-semibold">
                {editingId ? "Editar Plantilla" : "Nueva Plantilla de Redacción"}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCloseForm}
                className="h-7 text-xs"
              >
                <X className="size-3.5 mr-1" /> Volver al listado
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Tipo de Documento</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={formTipo === "INFORME" ? "default" : "outline"}
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => setFormTipo("INFORME")}
                  >
                    <FileText className="size-3.5" /> Informe Técnico
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={formTipo === "CARTA" ? "default" : "outline"}
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => setFormTipo("CARTA")}
                  >
                    <Mail className="size-3.5" /> Carta Formal
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Título del Botón / Nombre Corto</Label>
                <Input
                  value={formTitulo}
                  onChange={(e) => setFormTitulo(e.target.value)}
                  placeholder="Ej: Problema en Caja de Dirección"
                  className="h-9 text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px] gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Referencia Oficial (REF:)</Label>
                <Input
                  value={formReferencia}
                  onChange={(e) => setFormReferencia(e.target.value)}
                  placeholder="Ej: INFORME PROBLEMA CAJA DE DIRECCION HIDRAULICA"
                  className="h-9 text-sm uppercase font-semibold"
                  required
                />
              </div>

              {formTipo === "INFORME" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Costo Estimado Bs. (Opcional)</Label>
                  <div className="relative">
                    <DollarSign className="absolute inset-y-0 left-2.5 my-auto size-3.5 text-muted-foreground" />
                    <Input
                      value={formCosto}
                      onChange={(e) => setFormCosto(e.target.value)}
                      placeholder="0.00"
                      inputMode="decimal"
                      className="pl-8 h-9 text-sm font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Cotización</Label>
                  <div className="h-9 rounded-md border border-dashed bg-muted/20 px-3 flex items-center text-xs text-muted-foreground">
                    No aplica a Cartas
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Contenido o Cuerpo Predeterminado</Label>
              <Textarea
                rows={7}
                value={formContenido}
                onChange={(e) => setFormContenido(e.target.value)}
                placeholder="Escriba aquí el texto modelo que se cargará automáticamente al seleccionar esta plantilla..."
                className="text-sm font-sans leading-relaxed"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseForm}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || isReadOnly} className="gap-1.5 shadow-sm">
                <Save className="size-4" />
                {saving ? "Guardando..." : editingId ? "Actualizar Plantilla" : "Crear Plantilla"}
              </Button>
            </div>
          </form>
        ) : (
          /* LISTADO DE PLANTILLAS */
          <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
            {/* Barra de Filtros y Botón Nuevo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-1.5 bg-muted/60 p-1 rounded-lg w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("ALL")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === "ALL"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Todas ({templates.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("INFORME")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === "INFORME"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <FileText className="size-3 text-primary" /> Informes (
                  {templates.filter((t) => t.tipo === "INFORME").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("CARTA")}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                    activeTab === "CARTA"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Mail className="size-3 text-amber-600" /> Cartas (
                  {templates.filter((t) => t.tipo === "CARTA").length})
                </button>
              </div>

              <Button
                size="sm"
                onClick={() => handleOpenNew()}
                disabled={isReadOnly}
                className="gap-1.5 w-full sm:w-auto"
              >
                <Plus className="size-4" /> Nueva Plantilla
              </Button>
            </div>

            {/* Listado en Cards */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground border rounded-xl bg-muted/10">
                  <Sparkles className="size-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No hay plantillas registradas en esta categoría.</p>
                  <p className="text-xs mt-1">Cree una plantilla para agilizar la redacción con 1 solo clic.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenNew()}
                    className="mt-3 text-xs"
                  >
                    <Plus className="size-3.5 mr-1" /> Crear primera plantilla
                  </Button>
                </div>
              ) : (
                filteredTemplates.map((t) => (
                  <div
                    key={t.id_plantilla}
                    className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-primary/40 transition-colors shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                            t.tipo === "CARTA"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}
                        >
                          {t.tipo === "CARTA" ? "Carta" : "Informe"}
                        </span>
                        <h4 className="font-semibold text-sm text-foreground truncate">
                          {t.titulo}
                        </h4>
                        {t.costo_estimado && t.costo_estimado > 0 ? (
                          <span className="text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                            Bs. {t.costo_estimado.toLocaleString("es-BO")}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs font-medium text-muted-foreground truncate">
                        <strong className="text-foreground/80">REF:</strong> {t.referencia}
                      </p>
                      <p className="text-xs text-muted-foreground/80 line-clamp-2 italic">
                        &quot;{t.contenido}&quot;
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(t)}
                        disabled={isReadOnly}
                        className="h-8 px-2.5 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit2 className="size-3.5" /> Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(t.id_plantilla, t.titulo)}
                        disabled={isReadOnly}
                        className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                        title="Eliminar plantilla"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
