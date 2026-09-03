import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Printer,
  Edit2,
  Trash2,
  FileText,
  User,
  Sparkles,
  ArrowLeft,
  Save,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { TemplateManagerModal, type DocumentTemplate } from "./TemplateManagerModal";
import { ReportDocument, type TechnicalReport } from "./ReportDocument";

interface Client {
  id_cliente: number;
  nombre: string;
  ci: string | null;
  nit: string | null;
  telefono: string | null;
}

interface Vehicle {
  id_vehiculo: number;
  id_cliente: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
}

export function ReportCRUD() {
  const { token, isReadOnly, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Tipo de documento: informe técnico (INF) o carta formal (CAR)
  const [docType, setDocType] = useState<"informe" | "carta">("informe");

  // Plantillas dinámicas cargadas desde la BD
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Editor mode (true when creating or editing)
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [editingReport, setEditingReport] = useState<TechnicalReport | null>(null);

  // Clients & Vehicles for smart autocomplete
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");

  // Form Fields
  const [numeroInforme, setNumeroInforme] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [ciudad, setCiudad] = useState("Santa Cruz");
  const [destinatarioNombre, setDestinatarioNombre] = useState("");
  const [destinatarioAtencion, setDestinatarioAtencion] = useState("");
  const [vehiculoDescripcion, setVehiculoDescripcion] = useState("");
  const [placa, setPlaca] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [referencia, setReferencia] = useState("");
  const [contenido, setContenido] = useState("");
  const [costoEstimado, setCostoEstimado] = useState("");
  const [conclusion, setConclusion] = useState("Es todo lo que puedo informar para los fines correspondientes.");
  const [firmanteNombre, setFirmanteNombre] = useState("IMAV MOTORS S.R.L.");
  const [firmanteCargo, setFirmanteCargo] = useState("Servicio Integral Automotriz");

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reports?query=${encodeURIComponent(search)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error("Error fetching reports:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch(`${API_URL}/templates`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (e) {
      console.error("Error fetching templates:", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    fetchReports();
    fetchTemplates();
  }, [search, token]);

  useEffect(() => {
    if (isEditorMode) {
      fetchClients();
    }
  }, [isEditorMode]);

  // When client changes, load client's vehicles and update recipient
  useEffect(() => {
    if (!selectedClientId) {
      setClientVehicles([]);
      return;
    }

    const client = clients.find((c) => c.id_cliente.toString() === selectedClientId);
    if (client && !editingReport) {
      setDestinatarioNombre(client.nombre);
    }

    const fetchVehicles = async () => {
      try {
        const res = await fetch(`${API_URL}/vehicles?id_cliente=${selectedClientId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setClientVehicles(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchVehicles();
  }, [selectedClientId, clients]);

  // When vehicle changes, auto-fill description and plate
  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    if (!vehicleId) return;

    const v = clientVehicles.find((veh) => veh.id_vehiculo.toString() === vehicleId);
    if (v) {
      setVehiculoDescripcion(`${v.marca} ${v.modelo}${v.anio ? ` (${v.anio})` : ""}`);
      setPlaca(v.placa);
    }
  };

  const handleOpenCreate = async (type: "informe" | "carta" = "informe") => {
    setDocType(type);
    setEditingReport(null);
    setSelectedClientId("");
    setSelectedVehicleId("");
    setDestinatarioNombre("");
    setDestinatarioAtencion("");
    setVehiculoDescripcion("");
    setPlaca("");
    setKilometraje("");
    setReferencia(type === "carta" ? "SOLICITUD / COMUNICACION DE TALLER" : "");
    setContenido("");
    setCostoEstimado("");
    setConclusion(
      type === "carta"
        ? "Sin otro particular, me despido con las consideraciones más distinguidas."
        : "Es todo lo que puedo informar para los fines correspondientes."
    );
    setFirmanteNombre("IMAV MOTORS S.R.L.");
    setFirmanteCargo("Servicio Integral Automotriz");
    setFecha(new Date().toISOString().slice(0, 10));
    setCiudad("Santa Cruz");

    // Fetch next sequential number according to document type (INF or CAR)
    const currentYear = new Date().getFullYear();
    const fallback = type === "carta" ? `CAR-${currentYear}-001` : `INF-${currentYear}-001`;
    try {
      const res = await fetch(`${API_URL}/reports/next-number?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const { nextNumber } = await res.json();
        setNumeroInforme(nextNumber);
      } else {
        setNumeroInforme(fallback);
      }
    } catch {
      setNumeroInforme(fallback);
    }

    setIsEditorMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (rep: TechnicalReport) => {
    const isLetter = rep.numero_informe?.toUpperCase().startsWith("CAR");
    setDocType(isLetter ? "carta" : "informe");
    setEditingReport(rep);
    setSelectedClientId(rep.id_cliente ? rep.id_cliente.toString() : "");
    setSelectedVehicleId(rep.id_vehiculo ? rep.id_vehiculo.toString() : "");
    setNumeroInforme(rep.numero_informe);
    setFecha(rep.fecha ? rep.fecha.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setCiudad(rep.ciudad || "Santa Cruz");
    setDestinatarioNombre(rep.destinatario_nombre);
    setDestinatarioAtencion(rep.destinatario_atencion || "");
    setVehiculoDescripcion(rep.vehiculo_descripcion);
    setPlaca(rep.placa);
    setKilometraje(rep.kilometraje ? rep.kilometraje.toString() : "");
    setReferencia(rep.referencia);
    setContenido(rep.contenido);
    setCostoEstimado(rep.costo_estimado ? rep.costo_estimado.toString() : "");
    setConclusion(
      rep.conclusion ||
        (isLetter
          ? "Sin otro particular, me despido con las consideraciones más distinguidas."
          : "Es todo lo que puedo informar para los fines correspondientes.")
    );
    setFirmanteNombre(rep.firmante_nombre || "IMAV MOTORS S.R.L.");
    setFirmanteCargo(rep.firmante_cargo || "Servicio Integral Automotriz");
    setIsEditorMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApplyTemplate = (tmpl: DocumentTemplate) => {
    setReferencia(tmpl.referencia);
    setContenido(tmpl.contenido);
    if (tmpl.costo_estimado && docType !== "carta") {
      setCostoEstimado(tmpl.costo_estimado.toString());
    }
    toast.success(`Plantilla aplicada: ${tmpl.titulo}`);
  };

  const handleSave = async (andPrint = false) => {
    if (!selectedClientId && !editingReport?.id_cliente) {
      toast.error("Por favor seleccione el cliente");
      return;
    }
    if (!destinatarioNombre.trim() || !placa.trim() || !vehiculoDescripcion.trim()) {
      toast.error("Complete los datos del destinatario, vehículo y placa");
      return;
    }
    if (!referencia.trim()) {
      toast.error(`Ingrese la referencia del ${docType === "carta" ? "documento" : "informe"} (REF)`);
      return;
    }
    if (!contenido.trim()) {
      toast.error(`Ingrese el contenido o cuerpo de la ${docType === "carta" ? "carta" : "informe"}`);
      return;
    }

    try {
      const payload = {
        id_cliente: selectedClientId ? parseInt(selectedClientId, 10) : editingReport?.id_cliente,
        id_vehiculo: selectedVehicleId ? parseInt(selectedVehicleId, 10) : editingReport?.id_vehiculo,
        numero_informe: numeroInforme,
        fecha,
        ciudad,
        destinatario_nombre: destinatarioNombre,
        destinatario_atencion: destinatarioAtencion || null,
        vehiculo_descripcion: vehiculoDescripcion,
        placa: placa.toUpperCase(),
        kilometraje: kilometraje ? parseInt(kilometraje, 10) : null,
        referencia,
        contenido,
        conclusion: conclusion || null,
        costo_estimado: docType === "carta" ? null : (costoEstimado ? parseFloat(costoEstimado) : null),
        firmante_nombre: firmanteNombre,
        firmante_cargo: firmanteCargo,
        estado: "EMITIDO",
      };

      const url = editingReport
        ? `${API_URL}/reports/${editingReport.id_informe}`
        : `${API_URL}/reports`;
      const method = editingReport ? "PUT" : "POST";

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
        toast.error(data.message || `Error al guardar ${docType === "carta" ? "la carta" : "el informe técnico"}`);
        return;
      }

      toast.success(
        editingReport
          ? `${docType === "carta" ? "Carta" : "Informe técnico"} actualizado`
          : `${docType === "carta" ? "Carta" : "Informe técnico"} creado exitosamente`
      );
      setIsEditorMode(false);
      fetchReports();

      if (andPrint && data.id_informe) {
        navigate({ to: `/report/${data.id_informe}` });
      }
    } catch (err: any) {
      toast.error("Error al conectar con el servidor: " + err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este informe técnico?")) return;

    try {
      const res = await fetch(`${API_URL}/reports/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        toast.success("Informe técnico eliminado");
        fetchReports();
      } else {
        const data = await res.json();
        toast.error(data.message || "Error al eliminar informe");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    }
  };

  // Live preview report object connected directly to form state
  const liveReport: TechnicalReport = {
    id_informe: editingReport?.id_informe,
    numero_informe: numeroInforme || "INF-2026-001",
    fecha: fecha || new Date().toISOString().slice(0, 10),
    ciudad: ciudad || "Santa Cruz",
    destinatario_nombre: destinatarioNombre || "Nombre del Cliente / Empresa",
    destinatario_atencion: destinatarioAtencion || undefined,
    vehiculo_descripcion: vehiculoDescripcion || "Descripción del Vehículo",
    placa: placa || "s/p",
    kilometraje: kilometraje ? parseInt(kilometraje, 10) : undefined,
    referencia: referencia || "TITULO O ASUNTO DEL INFORME TECNICO",
    contenido:
      contenido ||
      "Escriba aquí el detalle de la revisión técnica, diagnósticos encontrados, repuestos requeridos y trabajos efectuados...",
    conclusion: conclusion,
    costo_estimado: costoEstimado ? parseFloat(costoEstimado) : undefined,
    firmante_nombre: firmanteNombre || "IMAV MOTORS S.R.L.",
    firmante_cargo: firmanteCargo || "Servicio Integral Automotriz",
    estado: "EMITIDO",
  };

  return (
    <div className="space-y-6">
      {/* VISTA 1: EDITOR SPLIT-SCREEN CON VISTA PREVIA EN TIEMPO REAL */}
      {isEditorMode ? (
        <div className="space-y-6">
          {/* Header del Editor */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditorMode(false)}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" /> Volver a la Lista
              </Button>
              <div>
                <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                  <FileText className="size-5 text-primary" />
                  {editingReport
                    ? `Editar ${docType === "carta" ? "Carta" : "Informe"}: ${editingReport.numero_informe}`
                    : `Emisión de ${docType === "carta" ? "Nueva Carta Formal" : "Nuevo Informe Técnico"}`}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {docType === "carta"
                    ? "Redacte la carta formal a la izquierda y observe el documento membretado en tiempo real."
                    : "Complete los datos a la izquierda y observe el documento en tamaño Carta a la derecha."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditorMode(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleSave(false)}
                className="gap-2"
              >
                <Save className="size-4" /> {docType === "carta" ? "Guardar Carta" : "Guardar Informe"}
              </Button>
              <Button
                onClick={() => handleSave(true)}
                className="gap-2 shadow-sm"
              >
                <Printer className="size-4" /> {docType === "carta" ? "Guardar e Imprimir Carta" : "Guardar e Imprimir"}
              </Button>
            </div>
          </div>

          {/* Grid de 2 columnas: Formulario a la izquierda, Vista previa a la derecha */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Formulario */}
            <section className="panel p-6 lg:p-7 space-y-5 bg-card border rounded-2xl shadow-sm">
              {/* Plantillas Rápidas con Botón de Gestión */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="size-3.5" /> Plantillas de Redacción ({docType === "carta" ? "Cartas Formulares" : "Informes Técnicos"}):
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="h-6 px-2 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Settings className="size-3" /> Gestionar Plantillas
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {templates.filter((t) => (docType === "carta" ? t.tipo === "CARTA" : t.tipo === "INFORME")).length === 0 ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground italic py-1">
                      <span>No hay plantillas registradas para {docType === "carta" ? "cartas" : "informes"}.</span>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        onClick={() => setIsTemplateModalOpen(true)}
                        className="h-auto p-0 text-xs font-semibold text-primary underline"
                      >
                        Crear una plantilla
                      </Button>
                    </div>
                  ) : (
                    templates
                      .filter((t) => (docType === "carta" ? t.tipo === "CARTA" : t.tipo === "INFORME"))
                      .map((tmpl) => (
                        <Button
                          key={tmpl.id_plantilla}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs h-7 bg-background hover:bg-primary/10 shadow-xs"
                          onClick={() => handleApplyTemplate(tmpl)}
                          title={`REF: ${tmpl.referencia}`}
                        >
                          {tmpl.titulo}
                        </Button>
                      ))
                  )}
                </div>
              </div>

              {/* Fila 1: Correlativo, Fecha y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">
                    {docType === "carta" ? "Código / N° de Carta" : "Número de Informe"}
                  </Label>
                  <Input
                    value={numeroInforme}
                    onChange={(e) => setNumeroInforme(e.target.value)}
                    placeholder={docType === "carta" ? "CAR-2026-001" : "INF-2026-001"}
                    className="font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fecha</Label>
                  <Input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Ciudad</Label>
                  <Input
                    value={ciudad}
                    onChange={(e) => setCiudad(e.target.value)}
                    placeholder="Santa Cruz"
                  />
                </div>
              </div>

              {/* Fila 2: Selector de Cliente y Vehículo */}
              <div className="p-4 rounded-xl bg-muted/40 border space-y-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="size-3.5 text-primary" /> Selección de Cliente y Vehículo
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Client */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">1. Elegir Cliente Registrado</Label>
                    <Select
                      value={selectedClientId}
                      onValueChange={(val) => {
                        setSelectedClientId(val);
                        setSelectedVehicleId("");
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un cliente..." />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id_cliente} value={c.id_cliente.toString()}>
                            {c.nombre} {c.ci ? `(CI: ${c.ci})` : c.nit ? `(NIT: ${c.nit})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Select Vehicle */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">2. Elegir Vehículo del Cliente</Label>
                    <Select
                      value={selectedVehicleId}
                      onValueChange={handleSelectVehicle}
                      disabled={!selectedClientId || clientVehicles.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !selectedClientId
                              ? "Seleccione primero un cliente..."
                              : clientVehicles.length === 0
                              ? "El cliente no tiene vehículos guardados"
                              : "Elegir vehículo..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {clientVehicles.map((v) => (
                          <SelectItem key={v.id_vehiculo} value={v.id_vehiculo.toString()}>
                            {v.marca} {v.modelo} — [{v.placa}]
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Datos editables de destinatario y vehículo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Sres. (Nombre Cliente / Empresa)</Label>
                    <Input
                      value={destinatarioNombre}
                      onChange={(e) => setDestinatarioNombre(e.target.value)}
                      placeholder="BATEBOL S.A."
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Atención (Opcional)</Label>
                    <Input
                      value={destinatarioAtencion}
                      onChange={(e) => setDestinatarioAtencion(e.target.value)}
                      placeholder="Ing. Oscar Castillo"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Descripción del Vehículo</Label>
                    <Input
                      value={vehiculoDescripcion}
                      onChange={(e) => setVehiculoDescripcion(e.target.value)}
                      placeholder="Montacarga N.8 / Toyota Hilux"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Placa</Label>
                      <Input
                        value={placa}
                        onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                        placeholder="3412 ABC o s/p"
                        className="font-mono uppercase"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Kilometraje (Km)</Label>
                      <Input
                        value={kilometraje}
                        onChange={(e) => setKilometraje(e.target.value)}
                        placeholder="85000"
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Referencia (REF) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  {docType === "carta" ? "Referencia de la Carta (REF:)" : "Referencia del Informe (REF:)"}
                </Label>
                <Input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder={
                    docType === "carta"
                      ? "SOLICITUD DE APROBACION DE TRABAJOS MECANICOS"
                      : "INFORME PROBLEMA CAJA DE DIRECCION HIDRAULICA"
                  }
                  className="font-semibold uppercase tracking-wide"
                  required
                />
              </div>

              {/* Contenido / Cuerpo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">
                  {docType === "carta" ? "Contenido / Cuerpo de la Carta" : "Contenido del Informe Técnico"}
                </Label>
                <Textarea
                  rows={8}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder={
                    docType === "carta"
                      ? "Por medio de la presente, nos dirigimos a ustedes con el propósito de..."
                      : "Describa detalladamente el diagnóstico, anomalías encontradas, procedimientos efectuados y conclusiones..."
                  }
                  className="leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Costo estimado y Cierre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {docType !== "carta" ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Costo Estimado / Cotizado Bs. (Opcional)</Label>
                    <Input
                      value={costoEstimado}
                      onChange={(e) => setCostoEstimado(e.target.value)}
                      placeholder="7900"
                      inputMode="decimal"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Costo Estimado</Label>
                    <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-dashed flex items-center h-10">
                      En formato Carta no se incluye recuadro de costo ni cotización.
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs">Texto de Cierre</Label>
                  <Input
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder={
                      docType === "carta"
                        ? "Sin otro particular, me despido atentamente."
                        : "Es todo lo que puedo informar para los fines correspondientes."
                    }
                  />
                </div>
              </div>

              {/* Botones inferiores */}
              <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditorMode(false)}
                >
                  Cancelar
                </Button>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleSave(false)}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <Save className="size-4" /> {docType === "carta" ? "Guardar Carta" : "Guardar Informe"}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="flex-1 sm:flex-none gap-2 shadow-sm"
                  >
                    <Printer className="size-4" /> {docType === "carta" ? "Guardar e Imprimir Carta" : "Guardar e Imprimir"}
                  </Button>
                </div>
              </div>
            </section>

            {/* Vista Previa en Tiempo Real */}
            <section className="xl:sticky xl:top-24 xl:self-start">
              <div className="mb-3 px-1 flex items-center justify-between">
                <p className="label-caps text-xs flex items-center gap-1.5">
                  <FileText className="size-3.5 text-primary" /> Vista previa en vivo del documento
                </p>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted/60 px-2 py-0.5 rounded border">
                  Hoja Carta (8.5&quot; × 11.0&quot;)
                </span>
              </div>
              <div className="border border-border rounded-xl shadow-md overflow-hidden bg-card p-1 sm:p-2">
                <ReportDocument report={liveReport} />
              </div>
            </section>
          </div>
        </div>
      ) : (
        /* VISTA 2: TABLA DE INFORMES REGISTRADOS */
        <div className="space-y-4">
          {/* Barra de Búsqueda y Botón Nuevo */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, placa, N° o referencia..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => setIsTemplateModalOpen(true)}
                className="gap-1.5 border-primary/30 text-primary hover:bg-primary/5 font-medium"
              >
                <Sparkles className="size-4 text-primary" /> Plantillas
              </Button>
              <Button onClick={() => handleOpenCreate("informe")} disabled={isReadOnly}>
                <Plus className="size-4 mr-1.5" /> Nuevo Informe Técnico
              </Button>
              <Button
                onClick={() => handleOpenCreate("carta")}
                disabled={isReadOnly}
                variant="outline"
                className="border-primary/40 hover:bg-primary/5 text-primary font-semibold"
              >
                <Plus className="size-4 mr-1.5" /> Nueva Carta
              </Button>
            </div>
          </div>

          {/* Tabla de Informes y Cartas */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Documento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Destinatario (Cliente)</TableHead>
                  <TableHead>Vehículo / Placa</TableHead>
                  <TableHead>Referencia (Asunto)</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Cargando documentos...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <FileText className="size-8 mx-auto mb-2 opacity-30" />
                      No se encontraron informes técnicos ni cartas registradas.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((rep) => (
                    <TableRow key={rep.id_informe}>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-mono font-bold text-xs text-primary block">
                          {rep.numero_informe}
                        </span>
                        {rep.numero_informe?.toUpperCase().startsWith("CAR") ? (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25 mt-0.5">
                            Carta
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20 mt-0.5">
                            Informe
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {rep.fecha ? new Date(rep.fecha).toLocaleDateString("es-BO") : "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {rep.destinatario_nombre}
                        {rep.destinatario_atencion && (
                          <span className="block text-[11px] text-muted-foreground">
                            Atn: {rep.destinatario_atencion}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{rep.vehiculo_descripcion}</div>
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                          {rep.placa}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-xs font-semibold text-foreground/90" title={rep.referencia}>
                        {rep.referencia}
                      </TableCell>
                      <TableCell className="text-right space-x-1 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate({ to: `/report/${rep.id_informe}` })}
                          title="Ver e Imprimir en Pantalla Completa"
                        >
                          <Printer className="size-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(rep)}
                          disabled={isReadOnly}
                          title="Editar"
                        >
                          <Edit2 className="size-4 text-foreground/70" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => rep.id_informe && handleDelete(rep.id_informe)}
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
        </div>
      )}

      {/* Modal para Administrar Plantillas de Informes y Cartas */}
      <TemplateManagerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onTemplatesChanged={fetchTemplates}
        initialType={docType === "carta" ? "CARTA" : "INFORME"}
      />
    </div>
  );
}
