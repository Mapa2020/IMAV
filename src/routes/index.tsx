import { useMemo, useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  ClipboardCheck,
  FileText,
  Plus,
  Trash2,
  User,
  Wrench,
  LogOut,
  LogIn,
  Search,
  Calendar,
  Package,
  Users,
  Database,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import logo from "@/assets/imav-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { ProformaDocument } from "@/components/proforma/ProformaDocument";
import { Stepper, type Step } from "@/components/proforma/Stepper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { ItemAutocomplete } from "@/components/proforma/ItemAutocomplete";
import { BrandModelCombobox } from "@/components/vehicle/BrandModelCombobox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import CRUDs
import { ClientCRUD } from "@/components/crud/ClientCRUD";
import { VehicleCRUD } from "@/components/crud/VehicleCRUD";
import { ReceptionCRUD } from "@/components/crud/ReceptionCRUD";
import { ProformaCRUD } from "@/components/crud/ProformaCRUD";
import { ItemCRUD } from "@/components/crud/ItemCRUD";
import { EmployeeCRUD } from "@/components/crud/EmployeeCRUD";
import { MaintenanceCRUD } from "@/components/crud/MaintenanceCRUD";
import { UserCRUD } from "@/components/crud/UserCRUD";
import { ReportCRUD } from "@/components/reports/ReportCRUD";

import {
  CHECKLIST,
  FUEL_TYPES,
  currency,
  totals,
  type Proforma,
  type ServiceLine,
} from "@/components/proforma/proforma";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IMAV Motor S.R.L." },
      {
        name: "description",
        content:
          "Ingreso de vehículos y generación de proformas profesionales para IMAV Motor S.R.L. Registro, checklist, detalle de servicios y envío al cliente por WhatsApp.",
      },
      { property: "og:title", content: "IMAV Motor S.R.L." },
      {
        property: "og:description",
        content:
          "Sistema de ingreso de vehículos y proformas para taller mecánico: registro, checklist y envío al cliente por WhatsApp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const STEPS: Step[] = [
  { id: 1, label: "Cliente", hint: "Datos de contacto" },
  { id: 2, label: "Vehículo", hint: "Ingreso y registro" },
  { id: 3, label: "Ingreso", hint: "Checklist y responsables" },
  { id: 4, label: "Proforma", hint: "Servicios y costos" },
];

const today = new Date();
const pad = (n: number) => String(n).padStart(2, "0");

const initial: Proforma = {
  clientName: "",
  clientPhone: "+591",
  clientDoc: "",
  plate: "",
  brand: "",
  model: "",
  year: "",
  color: "",
  mileage: "",
  fuel: "Gasolina",
  vin: "",
  receivedBy: "",
  entryDate: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`,
  entryTime: `${pad(today.getHours())}:${pad(today.getMinutes())}`,
  fuelLevel: 50,
  complaint: "",
  notes: "",
  lines: [],
  discount: 0,
  taxRate: 0,
};

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

interface Vehicle {
  id_vehiculo: number;
  id_cliente: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number | null;
  color: string | null;
}

interface Employee {
  id_empleado: number;
  nombre: string;
  paterno: string;
  rol: "RECEPCIONISTA" | "MECANICO";
  nombre_completo: string;
}

function Index() {
  const { user, token, logout, isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("proforma-flow");

  // Form states
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Proforma>(initial);
  const [checked, setChecked] = useState<string[]>([]);
  const [docType, setDocType] = useState<"CI" | "NIT" | "EXTRANJERO">("CI");
  const [country, setCountry] = useState("");

  // Autocomplete / Search client
  const [clientSearchText, setClientSearchText] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Client vehicles state
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isNewVehicle, setIsNewVehicle] = useState(true);

  // Reception employees dropdowns
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [receptionistId, setReceptionistId] = useState("");
  const [mechanicId, setMechanicId] = useState("");

  const set = <K extends keyof Proforma>(key: K, value: Proforma[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const code = "PF-NUEVA";
  const t = totals(data);

  // Cargar receptores y mecánicos del backend
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_URL}/employees`, { headers });
        if (res.ok) {
          const data = await res.json();
          setEmployees(data);

          // Pre-seleccionar el primer receptor si hay
          const receptor = data.find((e: any) => e.rol === "RECEPCIONISTA");
          if (receptor) {
            setReceptionistId(receptor.id_empleado.toString());
            set("receivedBy", `${receptor.nombre} ${receptor.paterno}`);
          }

          // Pre-seleccionar el primer mecánico
          const mecanico = data.find((e: any) => e.rol === "MECANICO");
          if (mecanico) {
            setMechanicId(mecanico.id_empleado.toString());
          }
        }
      } catch (err) {
        console.error("Error al cargar empleados", err);
      }
    };
    fetchEmployees();
  }, [token]);

  // Buscar cliente en tiempo real
  useEffect(() => {
    if (!clientSearchText.trim() || selectedClient) {
      setClientSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_URL}/clients?query=${encodeURIComponent(clientSearchText)}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (res.ok) {
          const results = await res.json();
          setClientSearchResults(results);
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [clientSearchText, selectedClient, token]);

  const selectClient = async (client: Client) => {
    setSelectedClient(client);
    setClientSearchResults([]);
    setClientSearchText(client.nombre);

    // Auto-completar datos del cliente
    set("clientName", client.nombre);

    // WhatsApp format with +591
    let phoneVal = client.telefono || "";
    if (phoneVal) {
      const cleanPhone = phoneVal.replace(/\s+/g, "").replace(/\+/g, "");
      phoneVal = cleanPhone.startsWith("591")
        ? `+${cleanPhone}`
        : `+591${cleanPhone}`;
    } else {
      phoneVal = "+591";
    }
    set("clientPhone", phoneVal);
    set("clientDoc", client.ci || client.nit || client.pasaporte || "");
    setDocType(client.tipo_cliente);
    setCountry(client.pais_origen || "");

    // Cargar los vehículos registrados de este cliente
    try {
      const res = await fetch(
        `${API_URL}/vehicles?id_cliente=${client.id_cliente}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (res.ok) {
        const vehicles = await res.json();
        setClientVehicles(vehicles);
        if (vehicles.length > 0) {
          setIsNewVehicle(false);
          selectVehicle(vehicles[0]);
        } else {
          setIsNewVehicle(true);
          setSelectedVehicle(null);
          clearVehicleFields();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    set("plate", vehicle.placa);
    set("brand", vehicle.marca);
    set("model", vehicle.modelo);
    set("year", vehicle.anio?.toString() || "");
    set("color", vehicle.color || "");
  };

  const clearVehicleFields = () => {
    set("plate", "");
    set("brand", "");
    set("model", "");
    set("year", "");
    set("color", "");
    set("vin", "");
  };

  const addLine = (preset?: Omit<ServiceLine, "id">) =>
    setData((d) => ({
      ...d,
      lines: [
        ...d.lines,
        {
          id: Math.random().toString(),
          description: preset?.description ?? "",
          qty: preset?.qty ?? 1,
          unitPrice: preset?.unitPrice ?? 0,
          kind: preset?.kind ?? "labor",
          detalle: preset?.detalle ?? "",
        },
      ],
    }));

  const updateLine = (id: string, patch: Partial<ServiceLine>) =>
    setData((d) => ({
      ...d,
      lines: d.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));

  const removeLine = (id: string) =>
    setData((d) => ({ ...d, lines: d.lines.filter((l) => l.id !== id) }));

  // Finalizar y Guardar Proforma en Base de Datos
  const handleSaveAll = async () => {
    if (isReadOnly) {
      toast.error(
        "Debe iniciar sesión para poder guardar registros en el sistema",
      );
      navigate({ to: "/login" });
      return;
    }

    if (!data.clientName || !data.clientDoc) {
      toast.error(
        "Por favor, ingrese el nombre y documento del cliente (Paso 1)",
      );
      setStep(1);
      return;
    }
    if (!data.plate || !data.brand || !data.model) {
      toast.error("Por favor, llene los datos del vehículo (Paso 2)");
      setStep(2);
      return;
    }
    if (!receptionistId) {
      toast.error(
        "Por favor, seleccione la persona que recibe el vehículo (Paso 3)",
      );
      setStep(3);
      return;
    }
    if (!mechanicId) {
      toast.error("Por favor, seleccione el mecánico asignado (Paso 3)");
      setStep(3);
      return;
    }

    if (!data.complaint) {
      toast.error(
        "Por favor, ingrese la falla reportada por el cliente (Paso 3)",
      );
      setStep(3);
      return;
    }
    if (data.lines.length === 0) {
      toast.error(
        "La proforma debe contener al menos un servicio o repuesto (Paso 4)",
      );
      setStep(4);
      return;
    }

    toast.loading("Guardando registro en la base de datos...", {
      id: "save-proforma",
    });

    try {
      let finalClientId = selectedClient?.id_cliente;

      // 1. Guardar cliente si es nuevo o no estaba seleccionado
      if (!finalClientId) {
        const docText = data.clientDoc.trim();
        const clientRes = await fetch(`${API_URL}/clients`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tipo_cliente: docType,
            nombre: data.clientName,
            telefono: data.clientPhone || null,
            direccion: null,
            ci: docType === "CI" ? docText : null,
            nit: docType === "NIT" ? docText : null,
            pasaporte: docType === "EXTRANJERO" ? docText : null,
            pais_origen:
              docType === "EXTRANJERO" ? country.trim() || "Extranjero" : null,
          }),
        });

        if (!clientRes.ok) {
          const err = await clientRes.json();
          throw new Error(err.message || "Error al crear cliente");
        }
        const newClient = await clientRes.json();
        finalClientId = newClient.id_cliente;
      }

      // 2. Guardar vehículo si es nuevo o no estaba seleccionado
      let finalVehicleId = selectedVehicle?.id_vehiculo;
      if (isNewVehicle || !finalVehicleId) {
        const vehicleRes = await fetch(`${API_URL}/vehicles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id_cliente: finalClientId,
            placa: data.plate,
            marca: data.brand,
            modelo: data.model,
            anio: data.year || null,
            color: data.color || null,
          }),
        });

        if (!vehicleRes.ok) {
          const err = await vehicleRes.json();
          throw new Error(
            err.message || "Error al crear vehículo (Verifique la placa)",
          );
        }
        const newVehicle = await vehicleRes.json();
        finalVehicleId = newVehicle.id_vehiculo;
      }

      // 3. Registrar Recepción / Ingreso en taller
      const accText = checked.join(", ");
      const recRes = await fetch(`${API_URL}/receptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_vehiculo: finalVehicleId,
          id_empleado_receptor: parseInt(receptionistId),
          id_mecanico_asignado: parseInt(mechanicId),
          kilometraje: parseInt(data.mileage) || 0,
          fuelLevel: data.fuelLevel,
          observaciones_estado: data.notes || null,
          deja_accesorios: accText || null,
          falla_reportada: data.complaint,
          estado_ingreso: "EN_REVISION",
        }),
      });

      if (!recRes.ok) {
        const err = await recRes.json();
        throw new Error(err.message || "Error al registrar ingreso en taller");
      }
      const newRec = await recRes.json();
      const finalIngresoId = newRec.id_ingreso;

      // 4. Registrar Proforma
      const proformaRes = await fetch(`${API_URL}/proformas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id_ingreso: finalIngresoId,
          estado: "PENDIENTE",
          lines: data.lines,
          discount: data.discount,
          taxRate: data.taxRate,
          observaciones: data.notes,
        }),
      });

      if (!proformaRes.ok) {
        const err = await proformaRes.json();
        throw new Error(err.message || "Error al generar proforma");
      }
      const newProforma = await proformaRes.json();

      toast.success("¡Proforma guardada exitosamente en la base de datos!", {
        id: "save-proforma",
      });

      // Limpiar formulario y redireccionar a vista individual
      setData(initial);
      setChecked([]);
      setSelectedClient(null);
      setSelectedVehicle(null);

      navigate({ to: `/proforma/${newProforma.id_proforma}` });
    } catch (error: any) {
      toast.error(error.message || "Ocurrió un error inesperado al guardar", {
        id: "save-proforma",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />

      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1650px] items-center justify-between gap-6 px-5 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt="IMAV Motor"
              width={40}
              height={40}
              className="size-[40px]"
            />
            <div className="leading-tight">
              <p className="font-display text-lg font-semibold tracking-[0.14em]">
                IMAV MOTOR S.R.L.
              </p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Servicio Automotriz
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold">
                    {user.nombre_completo}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-primary font-bold">
                    {user.rol}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  title="Cerrar Sesión"
                >
                  <LogOut className="size-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="size-4 mr-2" /> Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1650px] px-5 py-8 lg:px-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
            <div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">
                Panel de Gestión de Taller
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ingreso, estimaciones y control de servicios.
              </p>
            </div>
            <TabsList className="bg-muted/70 p-1 flex-wrap h-auto gap-y-1">
              <TabsTrigger value="proforma-flow">Nueva Proforma</TabsTrigger>
              <TabsTrigger value="proformas">Proformas</TabsTrigger>
              <TabsTrigger value="reports">Informes</TabsTrigger>
              <TabsTrigger value="receptions">Ingresos</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="vehicles">Vehículos</TabsTrigger>

              <div className="w-[1px] h-5 bg-border mx-1 shrink-0 self-center hidden xs:block" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="items" className="px-2.5">
                      <Package className="size-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    Gestión de Items (Repuestos y Servicios)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TabsTrigger value="employees" className="px-2.5">
                      <Users className="size-4" />
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Gestión de Empleados</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {user?.rol === "ADMINISTRADOR" && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="maintenance" className="px-2.5">
                          <Database className="size-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Mantenimiento y Respaldos</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <TabsTrigger value="users" className="px-2.5">
                          <UserCog className="size-4" />
                        </TabsTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        Gestión de Usuarios del Sistema
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </TabsList>
          </div>

          {/* TAB 1: Stepper Flow (Crear Proforma) */}
          <TabsContent value="proforma-flow">
            <div className="hairline-grid mb-8 rounded-2xl border border-border p-6">
              <span className="label-caps">Paso Actual</span>
              <div className="mt-4">
                <Stepper steps={STEPS} current={step} onSelect={setStep} />
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              {/* Formulario */}
              <section className="panel p-6 lg:p-7">
                {step === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold leading-tight flex items-center gap-2">
                        <User className="size-4 text-primary" /> Datos del
                        cliente
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Busque un cliente registrado por su nombre/documento o
                        digite uno nuevo.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2 relative">
                        <Label className="label-caps">
                          Buscar Cliente Existente (Autocompletar)
                        </Label>
                        <div className="relative mt-2">
                          <Search className="absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground" />
                          <Input
                            placeholder="Escriba nombre, CI o NIT para buscar..."
                            value={clientSearchText}
                            onChange={(e) => {
                              setClientSearchText(e.target.value);
                              if (selectedClient) {
                                setSelectedClient(null);
                                setSelectedVehicle(null);
                                setClientVehicles([]);
                                set("clientName", e.target.value);
                              } else {
                                set("clientName", e.target.value);
                              }
                            }}
                            className="pl-9"
                          />
                        </div>

                        {clientSearchResults.length > 0 && (
                          <div className="absolute z-40 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg max-h-60 overflow-y-auto">
                            <ul className="p-1">
                              {clientSearchResults.map((c) => (
                                <li key={c.id_cliente}>
                                  <button
                                    type="button"
                                    onClick={() => selectClient(c)}
                                    className="w-full rounded px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                  >
                                    <p className="font-medium">{c.nombre}</p>
                                    <p className="text-xs text-muted-foreground">
                                      CI: {c.ci || "—"} | NIT: {c.nit || "—"} |
                                      Tel: {c.telefono || "—"}
                                    </p>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {selectedClient && (
                        <div className="sm:col-span-2 rounded-lg bg-primary/10 border border-primary/20 p-3 text-xs text-primary flex justify-between items-center">
                          <span>
                            Cliente seleccionado:{" "}
                            <strong>{selectedClient.nombre}</strong>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setSelectedClient(null);
                              setClientSearchText("");
                              setSelectedVehicle(null);
                              setClientVehicles([]);
                              setData(initial);
                            }}
                          >
                            Limpiar
                          </Button>
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <Label className="label-caps">
                          Nombre o Razón Social
                        </Label>
                        <Input
                          value={data.clientName}
                          onChange={(e) => set("clientName", e.target.value)}
                          placeholder="Juan Pérez Rocha"
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label className="label-caps">
                          WhatsApp del Cliente
                        </Label>
                        <Input
                          value={data.clientPhone}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (!val.startsWith("+591")) {
                              if (val.length < 4) {
                                val = "+591";
                              } else {
                                val = "+591" + val.replace(/^\+?591?/, "");
                              }
                            }
                            set("clientPhone", val);
                          }}
                          placeholder="+591 70012345"
                          className="mt-2 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border/10 pt-4 mt-2">
                        <div>
                          <Label className="label-caps">Tipo Documento</Label>
                          <Select
                            value={docType}
                            onValueChange={(
                              val: "CI" | "NIT" | "EXTRANJERO",
                            ) => {
                              setDocType(val);
                            }}
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Seleccione Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="CI">
                                Cédula de Identidad (CI)
                              </SelectItem>
                              <SelectItem value="NIT">NIT / Factura</SelectItem>
                              <SelectItem value="EXTRANJERO">
                                Pasaporte (Extranjero)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="label-caps">
                            {docType === "CI"
                              ? "Nro. CI"
                              : docType === "NIT"
                                ? "Nro. NIT"
                                : "Nro. Pasaporte"}
                          </Label>
                          <Input
                            value={data.clientDoc}
                            onChange={(e) => set("clientDoc", e.target.value)}
                            placeholder={
                              docType === "CI"
                                ? "1234567 SC"
                                : docType === "NIT"
                                  ? "1029384756"
                                  : "PE987654"
                            }
                            className="mt-2 font-mono"
                          />
                        </div>

                        {docType === "EXTRANJERO" && (
                          <div>
                            <Label className="label-caps">País de Origen</Label>
                            <Input
                              value={country}
                              onChange={(e) => setCountry(e.target.value)}
                              placeholder="Argentina"
                              className="mt-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold leading-tight flex items-center gap-2">
                        <Car className="size-4 text-primary" /> Registro del
                        vehículo
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Identificación técnica del vehículo.
                      </p>
                    </div>

                    {selectedClient && clientVehicles.length > 0 && (
                      <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
                        <Label className="label-caps">
                          Vehículos Registrados del Cliente
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {clientVehicles.map((v) => (
                            <button
                              key={v.id_vehiculo}
                              type="button"
                              onClick={() => {
                                setIsNewVehicle(false);
                                selectVehicle(v);
                              }}
                              className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${!isNewVehicle &&
                                selectedVehicle?.id_vehiculo === v.id_vehiculo
                                ? "border-primary bg-primary/10 text-foreground font-semibold"
                                : "border-border text-muted-foreground hover:bg-surface-2"
                                }`}
                            >
                              {v.marca} {v.modelo} [{v.placa}]
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => {
                              setIsNewVehicle(true);
                              setSelectedVehicle(null);
                              clearVehicleFields();
                            }}
                            className={`rounded-lg border border-dashed px-3 py-2 text-xs transition-colors ${isNewVehicle
                              ? "border-primary bg-primary/10 text-foreground font-semibold"
                              : "border-border text-muted-foreground hover:bg-surface-2"
                              }`}
                          >
                            + Registrar Nuevo Vehículo
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="label-caps">Placa</Label>
                        <Input
                          value={data.plate}
                          onChange={(e) =>
                            set("plate", e.target.value.toUpperCase())
                          }
                          placeholder="3412 ABC"
                          className="font-mono uppercase mt-2"
                          disabled={!isNewVehicle}
                        />
                      </div>

                      <div>
                        <Label className="label-caps">Año</Label>
                        <Input
                          value={data.year}
                          onChange={(e) => set("year", e.target.value)}
                          placeholder="2019"
                          inputMode="numeric"
                          className="mt-2"
                          disabled={!isNewVehicle}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <BrandModelCombobox
                          brand={data.brand}
                          model={data.model}
                          onBrandChange={(val) => set("brand", val)}
                          onModelChange={(val) => set("model", val)}
                          disabled={!isNewVehicle}
                          token={token}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="label-caps">
                          Chasis / VIN (Opcional)
                        </Label>
                        <Input
                          value={data.vin}
                          onChange={(e) =>
                            set("vin", e.target.value.toUpperCase())
                          }
                          placeholder="MR0FZ29G50123456"
                          className="font-mono uppercase mt-2"
                          disabled={!isNewVehicle}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold leading-tight flex items-center gap-2">
                        <ClipboardCheck className="size-4 text-primary" />{" "}
                        Ingreso en taller
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Quién recibe, qué mecánico se asigna y estado general de
                        ingreso.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="label-caps">
                          Recibido por (Receptor)
                        </Label>
                        <Select
                          value={receptionistId}
                          onValueChange={(val) => {
                            setReceptionistId(val);
                            const emp = employees.find(
                              (e) => e.id_empleado.toString() === val,
                            );
                            if (emp)
                              set("receivedBy", `${emp.nombre} ${emp.paterno}`);
                          }}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Seleccione receptor" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees
                              .filter((e) => e.rol === "RECEPCIONISTA")
                              .map((emp) => (
                                <SelectItem
                                  key={emp.id_empleado}
                                  value={emp.id_empleado.toString()}
                                >
                                  {emp.nombre} {emp.paterno}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="label-caps">Mecánico Asignado</Label>
                        <Select
                          value={mechanicId}
                          onValueChange={setMechanicId}
                        >
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Seleccione mecánico asignado" />
                          </SelectTrigger>
                          <SelectContent>
                            {employees
                              .filter((e) => e.rol === "MECANICO")
                              .map((emp) => (
                                <SelectItem
                                  key={emp.id_empleado}
                                  value={emp.id_empleado.toString()}
                                >
                                  {emp.nombre} {emp.paterno}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="label-caps">Fecha de ingreso</Label>
                        <div className="relative mt-2">
                          <Input
                            id="entry-date-input"
                            type="date"
                            value={data.entryDate}
                            onChange={(e) => set("entryDate", e.target.value)}
                            className="pl-10"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(
                                "entry-date-input",
                              ) as HTMLInputElement;
                              if (el && typeof el.showPicker === "function") {
                                try {
                                  el.showPicker();
                                } catch (err) {
                                  console.warn("showPicker failed:", err);
                                }
                              }
                            }}
                            className="absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground hover:text-foreground"
                            title="Seleccionar fecha"
                          >
                            <Calendar className="size-4" />
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="label-caps">
                          Falla reportada por el cliente (Problema)
                        </Label>
                        <Textarea
                          value={data.complaint}
                          onChange={(e) => set("complaint", e.target.value)}
                          placeholder="Ruido metálico en suspensión delantera al pasar badenes."
                          rows={3}
                          className="mt-2"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <Label className="label-caps">
                          Observaciones de estado (Rayones, golpes, etc.)
                        </Label>
                        <Textarea
                          value={data.notes}
                          onChange={(e) => set("notes", e.target.value)}
                          placeholder="Rayón leve en puerta trasera derecha."
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg font-semibold leading-tight flex items-center gap-2">
                        <Wrench className="size-4 text-primary" /> Detalle de la
                        proforma
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Costo estimado de mano de obra y repuestos.
                      </p>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="hidden gap-3 px-1 sm:grid sm:grid-cols-[5fr_1fr_1.2fr_1.4fr_0.4fr]">
                        <span className="label-caps text-xs">Descripción</span>
                        <span className="label-caps text-xs text-right">
                          Cant.
                        </span>
                        <span className="label-caps text-xs text-right">
                          P. Unit.
                        </span>
                        <span className="label-caps text-xs">Tipo</span>
                        <span />
                      </div>

                      {data.lines.length === 0 && (
                        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          Sin ítems agregados. Agregue uno manual o use los
                          sugeridos.
                        </p>
                      )}

                      {data.lines.map((l) => (
                        <div
                          key={l.id}
                          className="p-3 rounded-lg border border-border/80 bg-surface-2/20 space-y-2.5"
                        >
                          <div className="grid gap-3 sm:grid-cols-[5fr_1fr_1.2fr_1.4fr_0.4fr] sm:items-center">
                            <ItemAutocomplete
                              value={l.description}
                              token={token}
                              placeholder="Descripción del servicio o repuesto"
                              onChange={(desc, code, price, kind, detalle) => {
                                if (code) {
                                  const existingLine = data.lines.find(
                                    (line) =>
                                      line.id !== l.id && line.code === code,
                                  );
                                  if (existingLine) {
                                    updateLine(existingLine.id, {
                                      qty: existingLine.qty + l.qty,
                                    });
                                    removeLine(l.id);
                                    toast.info(
                                      `El ítem "${desc}" ya estaba en la proforma. Se incrementó su cantidad.`,
                                    );
                                    return;
                                  }
                                  updateLine(l.id, {
                                    description: desc,
                                    code: code,
                                    unitPrice: price,
                                    kind: kind,
                                    detalle: detalle || l.detalle || "",
                                  });
                                } else {
                                  updateLine(l.id, { description: desc });
                                }
                              }}
                            />
                            <Input
                              type="number"
                              value={l.qty}
                              onChange={(e) =>
                                updateLine(l.id, {
                                  qty: Number(e.target.value) || 0,
                                })
                              }
                              className="text-right px-2"
                            />
                            <Input
                              type="number"
                              value={l.unitPrice}
                              onChange={(e) =>
                                updateLine(l.id, {
                                  unitPrice: Number(e.target.value) || 0,
                                })
                              }
                              className="text-right"
                            />
                            <Select
                              value={l.kind}
                              onValueChange={(val: "labor" | "part") =>
                                updateLine(l.id, { kind: val })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="labor">
                                  Servicio
                                </SelectItem>
                                <SelectItem value="part">Repuesto</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(l.id)}
                              className="text-destructive hover:bg-destructive/10 shrink-0 mx-auto"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          {/* Campo para Explicación del item seleccionado */}
                          <div className="flex items-center gap-2 pl-1 pt-1 border-t border-border/40">
                            <span className="text-[11px] font-semibold text-foreground/80 shrink-0">
                              ↳ Explicación:
                            </span>
                            <Input
                              value={l.detalle || ""}
                              onChange={(e) =>
                                updateLine(l.id, { detalle: e.target.value })
                              }
                              placeholder="Explicación o mayor detalle del ítem (opcional)..."
                              className="h-8 text-xs bg-background/50 text-foreground placeholder:text-muted-foreground/60"
                            />
                          </div>
                        </div>
                      ))}

                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => addLine()}
                          className="w-full sm:w-auto"
                        >
                          <Plus className="size-4 mr-1" /> Agregar línea de ítem
                        </Button>
                      </div>
                    </div>

                    <div className="border-t border-border pt-5">
                      <div className="max-w-xs">
                        <Label className="label-caps">Descuento (%)</Label>
                        <Input
                          type="number"
                          value={data.discount}
                          onChange={(e) =>
                            set("discount", Number(e.target.value) || 0)
                          }
                          className="font-mono mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                  <Button
                    variant="ghost"
                    onClick={() => setStep((s) => Math.max(1, s - 1))}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="size-4 mr-1" /> Atrás
                  </Button>
                  {step < 4 ? (
                    <Button onClick={() => setStep((s) => Math.min(4, s + 1))}>
                      Continuar <ArrowRight className="size-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSaveAll} disabled={isReadOnly}>
                      <FileText className="size-4 mr-2" /> Guardar y Generar
                      Proforma
                    </Button>
                  )}
                </div>
                {isReadOnly && step === 4 && (
                  <p className="text-center text-[11px] text-destructive font-medium mt-3">
                    * Debe iniciar sesión para poder guardar esta proforma.
                  </p>
                )}
              </section>

              {/* Vista previa en tiempo real */}
              <section className="xl:sticky xl:top-24 xl:self-start">
                <div className="mb-3 px-1">
                  <p className="label-caps text-xs">
                    Vista previa del documento en tiempo real
                  </p>
                </div>
                <div className="border border-border rounded-xl shadow-md overflow-hidden bg-card">
                  <ProformaDocument data={data} code={code} />
                </div>
              </section>
            </div>
          </TabsContent>

          {/* TAB 2: Proformas */}
          <TabsContent value="proformas">
            <ProformaCRUD />
          </TabsContent>

          {/* TAB: Informes Técnicos */}
          <TabsContent value="reports">
            <ReportCRUD />
          </TabsContent>

          {/* TAB 3: Recepciones */}
          <TabsContent value="receptions">
            <ReceptionCRUD />
          </TabsContent>

          {/* TAB 4: Clientes */}
          <TabsContent value="clients">
            <ClientCRUD />
          </TabsContent>

          {/* TAB 5: Vehículos */}
          <TabsContent value="vehicles">
            <VehicleCRUD />
          </TabsContent>

          {/* TAB 6: Items de Taller */}
          <TabsContent value="items">
            <ItemCRUD />
          </TabsContent>

          {/* TAB 7: Empleados */}
          <TabsContent value="employees">
            <EmployeeCRUD />
          </TabsContent>

          {/* TAB 8: Mantenimiento y Respaldos (Solo Administrador) */}
          {user?.rol === "ADMINISTRADOR" && (
            <TabsContent value="maintenance">
              <MaintenanceCRUD />
            </TabsContent>
          )}

          {/* TAB 9: Usuarios (Solo Administrador) */}
          {user?.rol === "ADMINISTRADOR" && (
            <TabsContent value="users">
              <UserCRUD />
            </TabsContent>
          )}
        </Tabs>
      </main>

      <footer className="mt-16 border-t border-border py-6 text-center text-xs text-muted-foreground">
        IMAV Motor S.R.L. · Santa Cruz, Bolivia · ParionaSoft. Todos los
        derechos Reservados
      </footer>
    </div>
  );
}
