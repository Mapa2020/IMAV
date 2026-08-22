import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, Download, Printer, Send, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { ProformaDocument } from "@/components/proforma/ProformaDocument";
import { useAuth, API_URL } from "@/hooks/useAuth";
import { totals } from "@/components/proforma/proforma";
import logo from "@/assets/imav-logo.png";

export const Route = createFileRoute("/proforma/$id")({
  component: ProformaView,
});

function ProformaView() {
  const { id } = Route.useParams();
  const { isReadOnly, isEditor, token } = useAuth();
  const navigate = useNavigate();
  const [proforma, setProforma] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProforma = async () => {
    try {
      const headers: any = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const res = await fetch(`${API_URL}/proformas/${id}`, { headers });
      if (!res.ok) {
        throw new Error("No se pudo cargar la proforma");
      }
      const data = await res.json();
      setProforma(data);
    } catch (error) {
      toast.error("Error al cargar la proforma. Asegúrese de que el backend esté activo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProforma();
  }, [id, token]);

  useEffect(() => {
    if (proforma) {
      const year = new Date(proforma.fecha_emision).getFullYear();
      const padId = String(proforma.numero_proforma || proforma.id_proforma).padStart(4, "0");
      document.title = `IMAV_PF-${year}-${padId}`;
    }
    return () => {
      document.title = "IMAV Motor S.R.L.";
    };
  }, [proforma]);

  const updateStatus = async (newStatus: "APROBADA" | "RECHAZADA") => {
    try {
      const res = await fetch(`${API_URL}/proformas/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ estado: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar el estado");
      }

      toast.success(`Proforma ${newStatus === "APROBADA" ? "Aprobada" : "Rechazada"} exitosamente`);
      fetchProforma(); // recargar datos
    } catch (error) {
      toast.error("Error al actualizar el estado");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="size-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Cargando proforma...</p>
        </div>
      </div>
    );
  }

  if (!proforma) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <AlertTriangle className="mx-auto size-12 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Proforma no encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            No se pudo encontrar la proforma seleccionada en el sistema.
          </p>
          <Button className="mt-6" onClick={() => navigate({ to: "/" })}>
            Volver al Inicio
          </Button>
        </div>
      </div>
    );
  }

  // Convertir proforma al formato del documento
  const proformaData = {
    clientName: proforma.nombre_cliente,
    clientPhone: proforma.telefono_cliente,
    clientDoc: proforma.ci_cliente || proforma.nit_cliente || proforma.pasaporte_cliente || "",
    plate: proforma.placa,
    brand: proforma.marca,
    model: proforma.modelo,
    year: proforma.anio?.toString() || "",
    color: proforma.color || "",
    mileage: proforma.kilometraje?.toString() || "",
    fuel: proforma.nivel_combustible || "Gasolina",
    vin: proforma.vin || "",
    receivedBy: `${proforma.nombre_receptor} ${proforma.paterno_receptor}`,
    entryDate: proforma.fecha_ingreso ? (new Date(proforma.fecha_ingreso).toISOString().split("T")[0] || "") : "",
    entryTime: proforma.fecha_ingreso ? new Date(proforma.fecha_ingreso).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : "",
    fuelLevel: proforma.nivel_combustible_porcentaje || 50,
    complaint: proforma.falla_reportada || "",
    notes: proforma.observaciones || "",
    lines: proforma.lines || [],
    discount: proforma.discount || 0,
    taxRate: proforma.taxRate || 13,
  };

  const code = `PF-${new Date(proforma.fecha_emision).getFullYear()}-${String(proforma.numero_proforma || proforma.id_proforma).padStart(4, "0")}`;
  const t = totals(proformaData);

  // Enlaces de WhatsApp
  const frontendUrl = window.location.origin;
  const proformaUrl = `${frontendUrl}/proforma/${id}`;
  
  // WhatsApp del Gerente (Fijo según especificación)
  const managerPhone = "+59175020162";

  const handleSendToClient = () => {
    if (!proformaData.clientPhone) {
      toast.error("El cliente no tiene un teléfono registrado");
      return;
    }

    const message = `Estimado(a) *${proformaData.clientName}*, le enviamos la proforma *${code}* correspondiente a su vehículo *${proformaData.brand} ${proformaData.model}* (Placa: ${proformaData.plate}).
*Total:* Bs ${t.total.toFixed(2)}
Puede ver el documento e imprimirlo en el siguiente enlace:
${proformaUrl}

Muchas gracias por su preferencia. *IMAV Motors S.R.L.*`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = proformaData.clientPhone.replace(/\s+/g, "").replace(/\+/g, "");
    const phoneWithCountry = cleanPhone.startsWith("591") || cleanPhone.length > 8 ? cleanPhone : `591${cleanPhone}`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, "_blank");

    toast.info("Abriendo WhatsApp... Se abrirá el diálogo de impresión para generar el PDF.", { duration: 5000 });
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handleSendToManager = () => {
    const message = `Estimado Gerente, solicito su aprobación para la proforma *${code}* del cliente *${proformaData.clientName}* para el vehículo *${proformaData.brand} ${proformaData.model}* (Placa: ${proformaData.plate}).
*Total Estimado:* Bs ${t.total.toFixed(2)}
Por favor, revise y apruebe o rechace la proforma en el siguiente enlace:
${proformaUrl}`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = managerPhone.replace(/\s+/g, "").replace(/\+/g, "");
    const phoneWithCountry = cleanPhone.startsWith("591") || cleanPhone.length > 8 ? cleanPhone : `591${cleanPhone}`;

    window.open(`https://wa.me/${phoneWithCountry}?text=${encoded}`, "_blank");

    toast.info("Abriendo WhatsApp... Se abrirá el diálogo de impresión para generar el PDF.", { duration: 5000 });
    setTimeout(() => {
      window.print();
    }, 1000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background pb-12 print:bg-paper print:p-0">
      <Toaster position="top-center" />

      {/* Barra superior (se oculta al imprimir) */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            <span>Volver</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src={logo} alt="IMAV Motor" className="size-8" />
            <span className="font-display font-semibold tracking-wider text-sm">IMAV MOTOR S.R.L.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="size-4" /> <span className="hidden sm:inline ml-1">Imprimir</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto mt-6 max-w-4xl px-4 print:mt-0 print:max-w-none print:px-0">
        {/* Banner de Estado (se oculta al imprimir) */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 print:hidden">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Estado de Proforma:</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase ${
              proforma.estado === "APROBADA"
                ? "bg-success/15 text-success"
                : proforma.estado === "RECHAZADA"
                  ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning"
            }`}>
              {proforma.estado === "APROBADA" && <Check className="size-3" />}
              {proforma.estado === "RECHAZADA" && <X className="size-3" />}
              {proforma.estado}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Opciones de Aprobación para Gerente / Editor / Admin */}
            {isEditor && proforma.estado === "PENDIENTE" && (
              <>
                <Button variant="outline" className="text-destructive hover:bg-destructive/10" size="sm" onClick={() => updateStatus("RECHAZADA")}>
                  <X className="size-4 mr-1" /> Rechazar
                </Button>
                <Button className="bg-success text-success-foreground hover:bg-success/90" size="sm" onClick={() => updateStatus("APROBADA")}>
                  <Check className="size-4 mr-1" /> Aprobar Proforma
                </Button>
              </>
            )}

            {/* Si es lectura pero se accede a la proforma como el gerente, le permitimos aprobar también con un aviso */}
            {isReadOnly && proforma.estado === "PENDIENTE" && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground mr-1">¿Es el Gerente?</span>
                <Button variant="outline" className="text-destructive text-xs h-8" size="sm" onClick={() => updateStatus("RECHAZADA")}>
                  Rechazar
                </Button>
                <Button className="bg-success text-success-foreground hover:bg-success/90 text-xs h-8" size="sm" onClick={() => updateStatus("APROBADA")}>
                  Aprobar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Visualización del documento proforma */}
        <div className="shadow-lg border border-border rounded-xl bg-card print:shadow-none print:border-none print:rounded-none print:bg-transparent">
          <ProformaDocument data={proformaData} code={code} />
        </div>

        {/* Acciones de WhatsApp (se oculta al imprimir) */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 print:hidden">
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm">WhatsApp del Gerente</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviar solicitud de aprobación al Gerente al número <strong>{managerPhone}</strong>.
            </p>
            <Button
              className="mt-4 w-full bg-[#25D366] text-white hover:bg-[#20BA56]"
              onClick={handleSendToManager}
            >
              <Send className="size-4 mr-2" /> Enviar para Aprobación
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-sm">WhatsApp del Cliente</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviar proforma final directamente al cliente al número <strong>{proformaData.clientPhone || "Sin Registrar"}</strong>.
            </p>
            <Button
              className="mt-4 w-full bg-[#25D366] text-white hover:bg-[#20BA56]"
              onClick={handleSendToClient}
            >
              <Send className="size-4 mr-2" /> Enviar al Cliente
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
