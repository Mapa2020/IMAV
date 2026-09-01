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
} from "lucide-react";
import { toast } from "sonner";
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

const TEMPLATES = [
  {
    title: "Problema en Caja de Dirección",
    ref: "INFORME PROBLEMA CAJA DE DIRECCION HIDRAULICA",
    content: `Informamos que lamentablemente los daños que se originaron internamente en la caja de dirección no tienen arreglo.

Dicho repuesto o caja de dirección no se encuentra disponible como pieza nueva estándar.

La solución recomendada es adaptar una caja de dirección nueva compatible modificando las bases de los conductos de entrada y salida de aceite hidráulico. El trabajo se entregaría debidamente calibrado y garantizado.

Solicitamos su aprobación para proceder con la provisión y el trabajo respectivo.`,
    cost: "7900",
  },
  {
    title: "Diagnóstico Electrónico e Inyección",
    ref: "INFORME DE DIAGNOSTICO COMPUTARIZADO Y SISTEMA DE INYECCION",
    content: `Se procedió con el escaneo computarizado del sistema electrónico de motor (OBD-II), detectando códigos de falla relacionados con la presión de combustible y lectura errática en sensores de oxígeno.

Se realizaron las siguientes pruebas en banco:
1. Verificación de presión en riel de inyección.
2. Limpieza ultrasónica y calibración de inyectores.
3. Comprobación del sensor MAF y cuerpo de aceleración.

Se recomienda el cambio de filtro de combustible y sustitución de sensor defectuoso para restablecer el rendimiento óptimo del motor.`,
    cost: "1450",
  },
  {
    title: "Sistema de Frenos y Suspensión",
    ref: "INFORME TECNICO REVISION DE FRENOS Y TREN DELANTERO",
    content: `En la inspección técnica del sistema de suspensión y frenos se evidenció un desgaste severo en pastillas de freno delanteras y bujes de meseta con holgura excesiva.

Trabajos recomendados para garantizar la seguridad del vehículo:
- Rectificado de discos de freno y reemplazo de pastillas cerámicas.
- Cambio de amortiguadores delanteros y bujes de barra estabilizadora.
- Alineación computarizada y balanceo de neumáticos.`,
    cost: "2200",
  },
  {
    title: "Mantenimiento Preventivo Integral",
    ref: "INFORME DE MANTENIMIENTO PREVENTIVO Y SERVICIO GENERAL",
    content: `Se completó satisfactoriamente el servicio de mantenimiento programado del vehículo, habiendo ejecutado los siguientes puntos de control:

1. Cambio de aceite de motor y filtros (aceite, aire y cabina).
2. Revisión de niveles de fluidos (frenos, dirección, refrigerante).
3. Calibración de bujías y revisión del sistema de encendido.
4. Ajuste de frenos y engrase de crucetas/tren motriz.

El vehículo se encuentra en óptimas condiciones de funcionamiento.`,
    cost: "950",
  },
];

export function ReportCRUD() {
  const { token, isReadOnly, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<TechnicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const handleOpenCreate = async () => {
    setEditingReport(null);
    setSelectedClientId("");
    setSelectedVehicleId("");
    setDestinatarioNombre("");
    setDestinatarioAtencion("");
    setVehiculoDescripcion("");
    setPlaca("");
    setKilometraje("");
    setReferencia("");
    setContenido("");
    setCostoEstimado("");
    setConclusion("Es todo lo que puedo informar para los fines correspondientes.");
    setFirmanteNombre("IMAV MOTORS S.R.L.");
    setFirmanteCargo("Servicio Integral Automotriz");
    setFecha(new Date().toISOString().slice(0, 10));
    setCiudad("Santa Cruz");

    // Fetch next sequential number
    try {
      const res = await fetch(`${API_URL}/reports/next-number`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const { nextNumber } = await res.json();
        setNumeroInforme(nextNumber);
      } else {
        setNumeroInforme(`INF-${new Date().getFullYear()}-001`);
      }
    } catch {
      setNumeroInforme(`INF-${new Date().getFullYear()}-001`);
    }

    setIsEditorMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenEdit = (rep: TechnicalReport) => {
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
    setConclusion(rep.conclusion || "Es todo lo que puedo informar para los fines correspondientes.");
    setFirmanteNombre(rep.firmante_nombre || "IMAV MOTORS S.R.L.");
    setFirmanteCargo(rep.firmante_cargo || "Servicio Integral Automotriz");
    setIsEditorMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setReferencia(tmpl.ref);
    setContenido(tmpl.content);
    if (tmpl.cost) setCostoEstimado(tmpl.cost);
    toast.success(`Plantilla aplicada: ${tmpl.title}`);
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
      toast.error("Ingrese la referencia del informe (REF)");
      return;
    }
    if (!contenido.trim()) {
      toast.error("Ingrese el contenido o cuerpo del informe");
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
        costo_estimado: costoEstimado ? parseFloat(costoEstimado) : null,
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
        toast.error(data.message || "Error al guardar el informe técnico");
        return;
      }

      toast.success(editingReport ? "Informe técnico actualizado" : "Informe técnico creado exitosamente");
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
                    ? `Editar Informe: ${editingReport.numero_informe}`
                    : "Emisión de Nuevo Informe Técnico"}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Complete los datos a la izquierda y observe el documento en tamaño Carta a la derecha.
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
                <Save className="size-4" /> Guardar Informe
              </Button>
              <Button
                onClick={() => handleSave(true)}
                className="gap-2 shadow-sm"
              >
                <Printer className="size-4" /> Guardar e Imprimir
              </Button>
            </div>
          </div>

          {/* Grid de 2 columnas: Formulario a la izquierda, Vista previa a la derecha */}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
            {/* Formulario */}
            <section className="panel p-6 lg:p-7 space-y-5 bg-card border rounded-2xl shadow-sm">
              {/* Plantillas Rápidas */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-2">
                  <Sparkles className="size-3.5" /> Plantillas de Redacción Rápida (1 Clic):
                </div>
                <div className="flex flex-wrap gap-2">
                  {TEMPLATES.map((tmpl, idx) => (
                    <Button
                      key={idx}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 bg-background hover:bg-primary/10"
                      onClick={() => handleApplyTemplate(tmpl)}
                    >
                      {tmpl.title}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Fila 1: Correlativo, Fecha y Ciudad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Número de Informe</Label>
                  <Input
                    value={numeroInforme}
                    onChange={(e) => setNumeroInforme(e.target.value)}
                    placeholder="INF-2026-001"
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
                <Label className="text-xs font-bold">Referencia del Informe (REF:)</Label>
                <Input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="INFORME PROBLEMA CAJA DE DIRECCION HIDRAULICA"
                  className="font-semibold uppercase tracking-wide"
                  required
                />
              </div>

              {/* Contenido / Cuerpo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contenido del Informe Técnico</Label>
                <Textarea
                  rows={8}
                  value={contenido}
                  onChange={(e) => setContenido(e.target.value)}
                  placeholder="Describa detalladamente el diagnóstico, anomalías encontradas, procedimientos efectuados y conclusiones..."
                  className="leading-relaxed font-sans"
                  required
                />
              </div>

              {/* Costo estimado y Cierre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Costo Estimado / Cotizado Bs. (Opcional)</Label>
                  <Input
                    value={costoEstimado}
                    onChange={(e) => setCostoEstimado(e.target.value)}
                    placeholder="7900"
                    inputMode="decimal"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Texto de Cierre</Label>
                  <Input
                    value={conclusion}
                    onChange={(e) => setConclusion(e.target.value)}
                    placeholder="Es todo lo que puedo informar para los fines correspondientes."
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
                    <Save className="size-4" /> Guardar Informe
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSave(true)}
                    className="flex-1 sm:flex-none gap-2 shadow-sm"
                  >
                    <Printer className="size-4" /> Guardar e Imprimir
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
            <Button onClick={handleOpenCreate} disabled={isReadOnly}>
              <Plus className="size-4 mr-2" /> Nuevo Informe Técnico
            </Button>
          </div>

          {/* Tabla de Informes */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Informe</TableHead>
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
                      Cargando informes técnicos...
                    </TableCell>
                  </TableRow>
                ) : reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      <FileText className="size-8 mx-auto mb-2 opacity-30" />
                      No se encontraron informes técnicos registrados.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((rep) => (
                    <TableRow key={rep.id_informe}>
                      <TableCell className="font-mono font-bold text-xs text-primary">
                        {rep.numero_informe}
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
    </div>
  );
}
