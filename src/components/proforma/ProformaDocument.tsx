import { ReactNode, useRef, useState, useEffect } from "react";
import { currency, totals, type Proforma } from "./proforma";
import boschLogo from "@/assets/Bosch.png";
import gacLogo from "@/assets/gac.png";
import gwLogo from "@/assets/gw.png";

export function ProformaDocument({ data, code }: { data: Proforma; code: string }) {
  const t = totals(data);
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1056);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const updateDimensions = () => {
      const containerWidth = container.clientWidth;
      const targetWidth = 816; // 8.5in in pixels at 96dpi
      const currentScale = containerWidth < targetWidth ? containerWidth / targetWidth : 1;
      setScale(currentScale);

      const docHeight = inner.offsetHeight || 1056;
      setHeight(docHeight * currentScale);
    };

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      updateDimensions();
    });

    resizeObserver.observe(container);
    resizeObserver.observe(inner);

    return () => {
      resizeObserver.disconnect();
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative print:h-auto print:overflow-visible print:static"
      style={{ height: scale < 1 ? `${height}px` : 'auto' }}
    >
      <div
        ref={innerRef}
        className="print:!transform-none print:!static print:!w-auto print:!h-auto print:!overflow-visible origin-top-left flex flex-col justify-start"
        style={{
          transform: scale < 1 ? `scale(${scale})` : 'none',
          width: scale < 1 ? '816px' : '100%',
          position: scale < 1 ? 'absolute' : 'relative',
          left: 0,
          top: 0,
        }}
      >
        <div className="overflow-hidden rounded-xl bg-paper text-paper-foreground shadow-paper relative flex print:grid print:grid-cols-[1fr_3rem] print:overflow-visible print:rounded-none md:w-[8.5in] md:min-h-[11.0in] mx-auto flex-row w-full print:w-[8.5in] print:h-[11.0in] print:min-h-[11.0in]">
          {/* Estilos para impresión y visualización */}
          <style dangerouslySetInnerHTML={{
            __html: `
        @media screen {
          .proforma-table {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 11.0in !important;
            width: 100% !important;
          }
          .proforma-thead, .proforma-tbody, .proforma-tfoot {
            display: block !important;
            width: 100% !important;
          }
          .proforma-tbody {
            flex-grow: 1 !important;
          }
          .proforma-tr {
            display: block !important;
            width: 100% !important;
          }
          .proforma-td {
            display: block !important;
            width: 100% !important;
          }
        }
        @media print {
          @page {
            size: letter;
            margin: 0;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .proforma-table {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            width: 100% !important;
          }
          .proforma-thead, .proforma-tbody, .proforma-tfoot {
            display: block !important;
            width: 100% !important;
          }
          .proforma-tbody {
            flex-grow: 1 !important;
          }
          .proforma-tr {
            display: block !important;
            width: 100% !important;
          }
          .proforma-td {
            display: block !important;
            width: 100% !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />

          {/* Centro: Contenido principal de la proforma formateado como tabla */}
          <table className="proforma-table border-none border-collapse flex-1 min-w-0">
            <thead className="proforma-thead">
              <tr className="proforma-tr">
                <td className="proforma-td p-0 border-none">
                  {/* Header con colores de marca e informacion de la cotizacion */}
                  <div className="px-8 pt-8 pb-0 relative">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        <div className="font-display flex items-baseline gap-1.5 leading-none text-[#41424C]">
                          <span className="text-4xl font-black tracking-tighter" style={{ textShadow: "1px 0 0 #41424C, -1px 0 0 #41424C", fontWeight: 950 }}>IMAV</span>
                          <span className="text-lg font-black tracking-wider ml-1" style={{ textShadow: "0.5px 0 0 #41424C, -0.5px 0 0 #41424C", fontWeight: 950 }}>MOTOR S.R.L.</span>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-[#666666] font-bold mt-[2px] leading-none">
                          Autopartes y Servicios
                        </p>
                      </div>

                      <div className="w-28 h-[34px] shrink-0" />
                    </div>

                    {/* Las 2 líneas juntas que NO cubren los márgenes */}
                    <div className="mt-1 mb-0 flex flex-col gap-0 w-full" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                      <div className="h-[8px] w-full bg-[#41424C]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
                      <div className="h-[4px] w-full bg-[#B87333]" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }} />
                    </div>

                    {/* Logo Bosch posicionado de forma absoluta para calzar con las líneas */}
                    <div className="absolute right-7 bottom-0 z-10 flex items-end">
                      <img
                        src={boschLogo}
                        alt="Bosch"
                        className="h-[66px] w-auto object-contain translate-y-[17px]"
                      />
                    </div>
                  </div>

                  {/* Dirección y Fecha/Cotización */}
                  <div className="px-8 pt-5 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 text-paper-muted">
                    <p className="text-[10px] leading-[1.2] flex-1">
                      Av. 4to Anillo No 4135 entre 3 pasos al Frente y Radial 10
                      <br />
                      Telf: +591 75020160 · Santa Cruz - Bolivia
                      <br />
                      Servicio Integral Automotriz
                    </p>
                    <div className="text-right sm:text-right shrink-0 flex flex-col gap-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B87333] leading-none">
                        Cotización
                      </p>
                      <p className="font-mono text-base font-bold text-black leading-none">{code}</p>
                      <p className="text-[10px] font-mono text-paper-muted leading-none mt-[1px]">
                        Fecha Emisión: {data.entryDate || "—"}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </thead>

            <tbody className="proforma-tbody">
              <tr className="proforma-tr">
                <td className="proforma-td p-0 border-none">
                  {/* Fila 1: Cliente (Línea completa) */}
                  <div className="border-b border-paper-border px-8 py-2.5 print:py-2 avoid-break">
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-0.5">
                      Cliente
                    </p>
                    <p className="text-sm font-semibold text-paper-foreground">
                      {data.clientName}
                    </p>
                  </div>

                  {/* Fila 2: Datos del Vehículo */}
                  <div className="grid gap-4 sm:gap-6 px-8 py-2.5 print:py-2 sm:grid-cols-3 border-b border-paper-border/50 avoid-break">
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-0.5">
                        Placa
                      </p>
                      <p className="text-sm font-mono font-bold text-paper-foreground">
                        {data.plate.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-0.5">
                        Marca / Modelo
                      </p>
                      <p className="text-sm font-semibold text-paper-foreground">
                        {[data.brand, data.model].filter(Boolean).join(" ")}
                      </p>
                    </div>
                    {data.vin && (
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted mb-0.5">
                          VIN / Chasis
                        </p>
                        <p className="text-sm font-mono text-paper-foreground">
                          {data.vin}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tabla de ítems */}
                  <div className="px-8 mt-4">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-y border-paper-border text-[10px] uppercase tracking-[0.14em] text-paper-muted">
                          <th className="py-1.5 print:py-1 text-left font-medium">Descripción</th>
                          <th className="w-16 py-1.5 print:py-1 text-right font-medium">Cant.</th>
                          <th className="w-28 py-1.5 print:py-1 text-right font-medium">P. Unit.</th>
                          <th className="w-28 py-1.5 print:py-1 text-right font-medium">Importe</th>
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
                            <td className="py-1.5 print:py-1 pr-4 text-[11px] sm:text-xs print:text-[10px]">
                              <span className="font-mono font-bold text-paper-foreground mr-4">
                                {l.code || "S/C"}
                              </span>
                              <span className="text-paper-foreground">
                                {l.description || "—"}
                              </span>
                            </td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px]">{l.qty}</td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px]">{currency(l.unitPrice)}</td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px] font-medium">
                              {currency(l.qty * l.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Observaciones (si las hay) */}
                  {data.complaint && (
                    <div className="mx-8 mt-4 mb-2 rounded-lg border border-paper-border bg-paper-border/25 px-4 py-2 print:py-1.5 avoid-break">
                      <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-paper-muted">
                        Observaciones
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm leading-relaxed">{data.complaint}</p>
                    </div>
                  )}

                  {/* Literal y Totales */}
                  <div className="flex flex-col sm:flex-row justify-between items-start px-8 pt-5 gap-4 avoid-break">
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
                      <div className="mt-2 flex items-baseline justify-between border-t border-paper-foreground/20 pt-2.5">
                        <dt className="text-[11px] font-medium uppercase tracking-[0.16em]">Total Bs</dt>
                        <dd className="font-mono text-xl font-semibold">{currency(t.total)}</dd>
                      </div>
                    </dl>
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot className="proforma-tfoot">
              <tr className="proforma-tr">
                <td className="proforma-td p-0 border-none">
                  {/* Pie de página con especialidades */}
                  <div className="mt-8 border-t border-paper-border px-8 py-6 text-center avoid-break">
                    <p className="text-[10px] sm:text-[11px] leading-relaxed text-paper-muted max-w-4xl mx-auto font-medium">
                      Mecánica general — Mantenimiento preventivo y correctivo — Inyección electrónica — Electricidad automotriz
                      <br />
                      Diagnóstico computarizado — Alineación y Convergencia — Balanceo y Montaje — Frenos ABS/ESP — Suspensión — Transmisión — Tornería.
                    </p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

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
  { name: "Kia", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/kia.png" },
  { name: "Fiat", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/fiat.png" },
  { name: "Peugeot", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/peugeot.png" },
  { name: "Chery", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/chery.png" },
  { name: "Jac", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/jac.png" },
  { name: "Byd", logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/byd.png" },
  { name: "Gac", logo: gacLogo },
  { name: "Great wall", logo: gwLogo }
];
