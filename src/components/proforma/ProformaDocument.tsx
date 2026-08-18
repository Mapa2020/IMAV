import type { ReactNode } from "react";
import { currency, totals, type Proforma } from "./proforma";

export function ProformaDocument({ data, code }: { data: Proforma; code: string }) {
  const t = totals(data);

  return (
    <div className="overflow-hidden rounded-xl bg-paper text-paper-foreground shadow-paper relative flex">
      {/* Centro: Contenido principal de la proforma */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header con colores de marca e informacion de la cotizacion */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="font-display flex items-baseline gap-1.5 leading-none">
                <span className="text-4xl font-black tracking-tighter text-[#005691]" style={{ textShadow: "0.5px 0 0 #005691, -0.5px 0 0 #005691" }}>IMAV</span>
                <span className="text-lg font-black tracking-wider text-[#005691]">MOTORS S.R.L.</span>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-[#0b2c5c] font-bold mt-1.5">
                Autopartes y Servicios
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#e50015]">
                Cotización
              </p>
              <p className="font-mono text-base font-bold text-black">{code}</p>
            </div>
          </div>

          {/* Las 2 líneas juntas que NO cubren los márgenes (alineadas con los textos) */}
          <div className="mt-1 mb-1.5 flex flex-col gap-0 w-full" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
            <div className="h-[8px] w-full bg-[#005691]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
            <div className="h-[4px] w-full bg-[#e50015]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
          </div>

          {/* Detalles por debajo de las líneas: Dirección a la izquierda y Fecha a la derecha */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 text-paper-muted">
            <p className="text-[10px] leading-relaxed">
              Av. 4to Anillo No 4135 entre 3 pasos al Frente y Radial 10
              <br />
              Telf: 591-3481461 · 75020160 · Santa Cruz - Bolivia
              <br />
              Servicio Integral Automotriz
            </p>
            <p className="text-[11px] font-mono sm:text-right">
              Fecha Emisión: {data.entryDate || "—"}
            </p>
          </div>
        </div>

      {/* Fila 1: Cliente (Línea completa) */}
      <div className="border-b border-paper-border px-8 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-1">
          Cliente
        </p>
        <p className="text-sm font-semibold text-paper-foreground">
          {data.clientName}
        </p>
      </div>

      {/* Fila 2: Datos del Vehículo */}
      <div className="grid gap-6 px-8 py-4 sm:grid-cols-3 border-b border-paper-border/50">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-1">
            Placa
          </p>
          <p className="text-sm font-mono font-bold text-paper-foreground">
            {data.plate.toUpperCase()}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-1">
            Marca / Modelo
          </p>
          <p className="text-sm font-semibold text-paper-foreground">
            {[data.brand, data.model].filter(Boolean).join(" ")}
          </p>
        </div>
        {data.vin && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-1">
              VIN / Chasis
            </p>
            <p className="text-sm font-mono text-paper-foreground">
              {data.vin}
            </p>
          </div>
        )}
      </div>

      {data.complaint && (
        <div className="mx-8 mb-6 rounded-lg border border-paper-border bg-paper-border/25 px-4 py-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted">
            Observaciones
          </p>
          <p className="mt-1 text-sm leading-relaxed">{data.complaint}</p>
        </div>
      )}

      <div className="px-8">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-paper-border text-[10px] uppercase tracking-[0.14em] text-paper-muted">
              <th className="py-2 text-left font-medium">Descripción</th>
              <th className="w-16 py-2 text-right font-medium">Cant.</th>
              <th className="w-28 py-2 text-right font-medium">P. Unit.</th>
              <th className="w-28 py-2 text-right font-medium">Importe</th>
            </tr>
          </thead>
          <tbody>
            {data.lines.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-xs text-paper-muted">
                  Aún no se han agregado servicios ni repuestos.
                </td>
              </tr>
            )}
            {data.lines.map((l) => (
              <tr key={l.id} className="border-b border-paper-border/70 align-top">
                <td className="py-2.5 pr-4 text-xs sm:text-sm">
                  <span className="font-mono font-bold text-paper-foreground mr-4">
                    {l.code || "S/C"}
                  </span>
                  <span className="text-paper-foreground">
                    {l.description || "—"}
                  </span>
                  <span className="text-paper-muted italic ml-1">
                    ; {l.kind === "labor" ? "Servicio" : "Repuesto"}
                  </span>
                </td>
                <td className="py-2.5 text-right font-mono text-xs">{l.qty}</td>
                <td className="py-2.5 text-right font-mono text-xs">{currency(l.unitPrice)}</td>
                <td className="py-2.5 text-right font-mono text-xs font-medium">
                  {currency(l.qty * l.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start px-8 pt-5 gap-4">
        {/* Literal en letras (a la izquierda) */}
        <div className="text-[11px] text-paper-foreground font-semibold uppercase sm:mt-10 self-end max-w-md border-b border-paper-border/80 pb-1 w-full sm:w-auto">
          {numberToWords(t.total)}
        </div>

        {/* Totales (a la derecha) */}
        <dl className="w-full max-w-[16rem] space-y-1.5 text-sm">
          <Total k="Subtotal" v={currency(t.subtotal)} />
          {data.discount > 0 && (
            <Total k={`Descuento (${data.discount}%)`} v={`- ${currency(t.discount)}`} />
          )}
          <Total k={`IVA (${data.taxRate}%)`} v={currency(t.tax)} />
          <div className="mt-2 flex items-baseline justify-between border-t border-paper-foreground/20 pt-2.5">
            <dt className="text-[11px] font-medium uppercase tracking-[0.16em]">Total Bs</dt>
            <dd className="font-mono text-xl font-semibold">{currency(t.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 flex flex-col gap-4 border-t border-paper-border px-8 py-6 text-[11px] leading-relaxed text-paper-muted sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-sm">
          Proforma válida por 15 días. Los repuestos están sujetos a disponibilidad en stock. No
          incluye trabajos adicionales no detallados en este documento.
        </p>
        <div className="text-center">
          <div className="h-10 w-44 border-b border-paper-foreground/30" />
          <p className="mt-1.5">{data.receivedBy || "Responsable de recepción"}</p>
        </div>
      </div>
      </div>

      {/* Lado Derecho: Columna vertical de logos de marcas de autos */}
      <div className="w-12 border-l border-paper-border bg-paper flex flex-col items-center justify-between py-6 px-1.5 shrink-0 print:flex">
        {CAR_BRANDS.map((b) => (
          <img
            key={b.name}
            src={b.logo}
            alt={b.name}
            className="size-6 object-contain opacity-90 grayscale hover:grayscale-0 transition-all duration-300"
            title={b.name}
          />
        ))}
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted">
        {title}
      </p>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v?: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="shrink-0 text-paper-muted">{k}</dt>
      <dd className={`truncate text-right font-medium ${mono ? "font-mono" : ""}`}>{v || "—"}</dd>
    </div>
  );
}

function Total({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <dt className="text-paper-muted">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return "Son: CERO 00/100 Bs.";
  
  const temp = Math.floor(num);
  const cents = Math.round((num - temp) * 100);
  const centsStr = String(cents).padStart(2, "0") + "/100 Bs.";
  
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = {
    11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO",
    29: "VEINTINUEVE"
  };
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  function convertirGrupo(n: number): string {
    let output = "";
    if (n >= 100) {
      const c = Math.floor(n / 100);
      if (n === 100) {
        output += "CIEN";
      } else {
        output += centenas[c];
      }
      n %= 100;
      if (n > 0) output += " ";
    }
    
    if (n > 0) {
      if (n < 10) {
        output += unidades[n];
      } else if (n in especiales) {
        output += especiales[n as keyof typeof especiales];
      } else {
        const d = Math.floor(n / 10);
        const u = n % 10;
        output += decenas[d];
        if (u > 0) {
          output += " Y " + unidades[u];
        }
      }
    }
    return output;
  }

  let words = "";
  let n = temp;
  
  if (n >= 1000000) {
    const millones = Math.floor(n / 1000000);
    if (millones === 1) {
      words += "UN MILLON";
    } else {
      words += convertirGrupo(millones) + " MILLONES";
    }
    n %= 1000000;
    if (n > 0) words += " ";
  }
  
  if (n >= 1000) {
    const miles = Math.floor(n / 1000);
    if (miles === 1) {
      words += "UN MIL";
    } else {
      words += convertirGrupo(miles) + " MIL";
    }
    n %= 1000;
    if (n > 0) words += " ";
  }
  
  if (n > 0) {
    words += convertirGrupo(n);
  }
  
  return `Son: ${words.trim()} ${centsStr}`;
}

const CAR_BRANDS = [
  { name: "Ford", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/ford.png" },
  { name: "Toyota", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/toyota.png" },
  { name: "Mazda", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/mazda.png" },
  { name: "Jeep", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/jeep.png" },
  { name: "Honda", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/honda.png" },
  { name: "Volkswagen", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/volkswagen.png" },
  { name: "Chevrolet", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/chevrolet.png" },
  { name: "Mitsubishi", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/mitsubishi.png" },
  { name: "Renault", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/renault.png" },
  { name: "Nissan", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/nissan.png" },
  { name: "Suzuki", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/suzuki.png" },
  { name: "Hyundai", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/hyundai.png" },
  { name: "Kia", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/kia.png" }
];
