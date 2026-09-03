import { ReactNode, useRef, useState, useEffect } from "react";
import { Phone, Mail } from "lucide-react";
import { currency, totals, type Proforma } from "./proforma";
import boschLogo from "@/assets/Bosch.png";
import gacLogo from "@/assets/gac.png";
import gwLogo from "@/assets/gw.png";
import kiaLogo from "@/assets/kia.png";

export function ProformaDocument({
  data,
  code,
}: {
  data: Proforma;
  code: string;
}) {
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
      const currentScale =
        containerWidth < targetWidth ? containerWidth / targetWidth : 1;
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
      style={{ height: scale < 1 ? `${height}px` : "auto" }}
    >
      <div
        ref={innerRef}
        className="print:!transform-none print:!static print:!w-auto print:!h-auto print:!overflow-visible origin-top-left flex flex-col justify-start"
        style={{
          transform: scale < 1 ? `scale(${scale})` : "none",
          width: scale < 1 ? "816px" : "100%",
          position: scale < 1 ? "absolute" : "relative",
          left: 0,
          top: 0,
        }}
      >
        <div className="overflow-hidden rounded-xl bg-paper text-paper-foreground shadow-paper relative flex print:grid print:grid-cols-[1fr_3rem] print:overflow-visible print:rounded-none md:w-[8.5in] md:min-h-[11.0in] mx-auto flex-row w-full print:w-[8.5in] print:h-[11.0in] print:min-h-[11.0in]">
          {/* Estilos para impresión y visualización */}
          <style
            dangerouslySetInnerHTML={{
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
          [data-sonner-toaster], .sonner-toast, [class*="sonner-"] {
            display: none !important;
          }
        }
      `,
            }}
          />

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
                          <span
                            className="text-4xl font-black tracking-wider"
                            style={{
                              textShadow: "1px 0 0 #41424C, -1px 0 0 #41424C",
                              fontWeight: 950,
                            }}
                          >
                            IMAV
                          </span>
                          <span
                            className="text-lg font-black tracking-wider ml-1"
                            style={{
                              textShadow:
                                "0.5px 0 0 #41424C, -0.5px 0 0 #41424C",
                              fontWeight: 950,
                            }}
                          >
                            MOTORS S.R.L.
                          </span>
                        </div>
                        <p className="text-[9px] uppercase tracking-widest text-[#666666] font-bold mt-[2px] leading-none">
                          Autopartes y Servicios
                        </p>
                      </div>

                      <div className="w-28 h-[34px] shrink-0" />
                    </div>

                    {/* Las 2 líneas juntas que NO cubren los márgenes */}
                    <div
                      className="mt-1 mb-0 flex flex-col gap-0 w-full"
                      style={{
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      <div
                        className="h-[8px] w-full bg-[#41424C]"
                        style={{
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      />
                      <div
                        className="h-[4px] w-full bg-[#B87333]"
                        style={{
                          WebkitPrintColorAdjust: "exact",
                          printColorAdjust: "exact",
                        }}
                      />
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
                  <div className="px-8 pt-5 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 text-slate-700">
                    <p className="text-[11px] leading-[1.4] flex-1 font-medium">
                      Av. 4to Anillo No 4135 entre 3 pasos al Frente y Radial 10
                      <br />
                      <span className="inline-flex items-center gap-1 align-middle">
                        <Phone className="size-3 text-[#B87333] shrink-0" />
                        <span>+591 75020160</span>
                      </span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span className="inline-flex items-center gap-1 align-middle">
                        <Mail className="size-3 text-[#B87333] shrink-0" />
                        <span>imavmotors@gmail.com</span>
                      </span>
                      <span className="mx-2 text-slate-400">·</span>
                      <span>Santa Cruz - Bolivia</span>
                      <br />
                      Servicio Integral Automotriz
                    </p>
                    <div className="text-right sm:text-right shrink-0 flex flex-col gap-1">
                      <p className="text-lg font-bold uppercase tracking-[0.2em] text-[#B87333] leading-none">
                        Cotización
                      </p>
                      <p className="font-mono text-lg font-bold text-black leading-none">
                        {code}
                      </p>
                      <p className="text-xs font-mono text-slate-700 leading-none mt-[2px]">
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
                  {/* Fila 1: Cliente, Teléfono y CI/NIT */}
                  <div className="border-b border-slate-300 px-8 pt-2.5 pb-1.5 print:pt-2 print:pb-1 avoid-break flex justify-between items-end gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                        Cliente
                      </p>
                      <p className="text-base sm:text-lg font-bold text-paper-foreground leading-snug">
                        {data.clientName || "—"}
                      </p>
                    </div>
                    <div className="flex gap-8">
                      {data.clientPhone && (
                        <div className="text-right sm:text-left">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                            Teléfono
                          </p>
                          <p className="text-sm sm:text-base font-mono font-semibold text-paper-foreground">
                            {data.clientPhone}
                          </p>
                        </div>
                      )}
                      {data.clientDoc && (
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                            CI / NIT
                          </p>
                          <p className="text-sm sm:text-base font-mono font-semibold text-paper-foreground">
                            {data.clientDoc}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Datos del Vehículo */}
                  <div className="grid gap-4 sm:gap-6 px-8 pt-2 pb-2.5 print:pt-1.5 print:pb-2 sm:grid-cols-3 border-b border-slate-300/80 avoid-break">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                        Placa
                      </p>
                      <p className="text-base sm:text-lg font-mono font-bold text-paper-foreground">
                        {data.plate.toUpperCase() || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                        Marca / Modelo
                      </p>
                      <p className="text-base sm:text-lg font-bold text-paper-foreground leading-snug">
                        {[data.brand, data.model].filter(Boolean).join(" ") || "—"}
                      </p>
                    </div>
                    {data.vin && (
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                          VIN / Chasis
                        </p>
                        <p className="text-sm sm:text-base font-mono font-medium text-paper-foreground">
                          {data.vin}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Tabla de ítems */}
                  <div className="px-8 mt-4">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-y border-slate-300 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                          <th className="py-1.5 print:py-1 text-left font-semibold">
                            Descripción
                          </th>
                          <th className="w-10 py-1.5 print:py-1 text-right font-semibold">
                            Cant.
                          </th>
                          <th className="w-18 py-1.5 print:py-1 text-right font-semibold">
                            P. Unit.
                          </th>
                          <th className="w-24 py-1.5 print:py-1 text-right font-semibold">
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lines.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-8 text-center text-xs text-slate-500"
                            >
                              Aún no se han agregado servicios ni repuestos.
                            </td>
                          </tr>
                        )}
                        {data.lines.map((l) => (
                          <tr
                            key={l.id}
                            className="border-b border-slate-300/70 align-top"
                          >
                            <td className="py-1.5 print:py-1 pr-4 text-[11px] sm:text-xs print:text-[10px]">
                              <div className="flex items-baseline">
                                <span className="font-mono font-bold text-paper-foreground mr-3 shrink-0">
                                  {l.code || "S/C"}
                                </span>
                                <span className="text-paper-foreground font-medium">
                                  {l.description || "—"}
                                </span>
                              </div>
                              {l.detalle && l.detalle.trim().length > 0 && (
                                <div className="mt-0.5 ml-2 pl-2 border-l-2 border-slate-350 text-[10px] sm:text-[11px] print:text-[9px] text-paper-foreground italic">
                                  ↳ {l.detalle}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px]">
                              {l.qty}
                            </td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px]">
                              {currency(l.unitPrice)}
                            </td>
                            <td className="py-1.5 print:py-1 text-right font-mono text-[11px] sm:text-xs print:text-[10px] font-medium">
                              {currency(l.qty * l.unitPrice)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Literal y Totales */}
                  <div className="flex flex-col sm:flex-row justify-between items-start px-8 pt-5 gap-4 avoid-break">
                    {/* Literal en letras (a la izquierda) */}
                    <div className="text-[11px] text-paper-foreground font-semibold uppercase sm:mt-10 self-end max-w-md border-b border-slate-350 pb-1 w-full sm:w-auto">
                      {numberToWords(t.total)}
                    </div>

                    {/* Totales (a la derecha) */}
                    <dl className="w-full max-w-[16rem] space-y-1.5 text-sm">
                      <Total k="Subtotal" v={currency(t.subtotal)} />
                      {data.discount > 0 && (
                        <Total
                          k={`Descuento (${data.discount}%)`}
                          v={`- ${currency(t.discount)}`}
                        />
                      )}
                      <div className="mt-2 flex items-baseline justify-between border-t border-slate-300 pt-2.5">
                        <dt className="text-[11px] font-medium uppercase tracking-[0.16em]">
                          Total Bs
                        </dt>
                        <dd className="font-mono text-xl font-semibold">
                          {currency(t.total)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot className="proforma-tfoot">
              <tr className="proforma-tr">
                <td className="proforma-td p-0 border-none">
                  {/* Observaciones (si las hay) */}
                  {data.complaint && (
                    <div className="mx-8 mt-4 rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 print:py-1.5 avoid-break">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Observaciones
                      </p>
                      <p className="mt-0.5 text-xs sm:text-sm leading-relaxed">
                        {data.complaint}
                      </p>
                    </div>
                  )}

                  {/* Pie de página con especialidades */}
                  <div
                    className={`border-t border-slate-300 px-7 py-6 text-center avoid-break ${data.complaint ? "mt-3" : "mt-8"
                      }`}
                  >
                    <p className="text-[8.5px] sm:text-[9.5px] print:text-[8.5px] leading-normal text-slate-600 max-w-4xl mx-auto font-medium tracking-tight">
                      Mecánica General - Mantenimiento Preventivo y Correctivo -
                      Diagnóstico Computarizado - Inyección Electrónica -
                      Electricidad Automotriz
                      <br />
                      Reparación de Motores - Cajas de Transmisión - Suspensión
                      y Dirección - Frenos ABS/ESP - Alineación y Convergencia -
                      Balanceo y Montaje.
                    </p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Lado Derecho: Columna vertical de logos de marcas de autos */}
          <div className="w-12 border-l border-slate-300 bg-paper flex flex-col items-center justify-between py-6 px-1.5 shrink-0 print:flex">
            {CAR_BRANDS.map((b) => (
              <img
                key={b.name}
                src={b.logo}
                alt={b.name}
                className="size-8 object-contain opacity-95 grayscale hover:grayscale-0 print:grayscale-0 print:opacity-100 transition-all duration-300"
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
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <dl className="space-y-1">{children}</dl>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v?: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <dt className="shrink-0 text-slate-500">{k}</dt>
      <dd
        className={`truncate text-right font-medium ${mono ? "font-mono" : ""}`}
      >
        {v || "—"}
      </dd>
    </div>
  );
}

function Total({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}

function numberToWords(num: number): string {
  if (num === 0) return "Son: CERO, 00/100 Bs.";

  const temp = Math.floor(num);
  const cents = Math.round((num - temp) * 100);
  const centsStr = ", " + String(cents).padStart(2, "0") + "/100 Bs.";

  const unidades = [
    "",
    "UN",
    "DOS",
    "TRES",
    "CUATRO",
    "CINCO",
    "SEIS",
    "SIETE",
    "OCHO",
    "NUEVE",
  ];
  const decenas = [
    "",
    "DIEZ",
    "VEINTE",
    "TREINTA",
    "CUARENTA",
    "CINCUENTA",
    "SESENTA",
    "SETENTA",
    "OCHENTA",
    "NOVENTA",
  ];
  const especiales = {
    11: "ONCE",
    12: "DOCE",
    13: "TRECE",
    14: "CATORCE",
    15: "QUINCE",
    16: "DIECISEIS",
    17: "DIECISIETE",
    18: "DIECIOCHO",
    19: "DIECINUEVE",
    21: "VEINTIUNO",
    22: "VEINTIDOS",
    23: "VEINTITRES",
    24: "VEINTICUATRO",
    25: "VEINTICINCO",
    26: "VEINTISEIS",
    27: "VEINTISIETE",
    28: "VEINTIOCHO",
    29: "VEINTINUEVE",
  };
  const centenas = [
    "",
    "CIENTO",
    "DOSCIENTOS",
    "TRESCIENTOS",
    "CUATROCIENTOS",
    "QUINIENTOS",
    "SEISCIENTOS",
    "SETECIENTOS",
    "OCHOCIENTOS",
    "NOVECIENTOS",
  ];

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

  return `Son: ${words.trim()}${centsStr}`;
}

const CAR_BRANDS = [
  {
    name: "Ford",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/ford.png",
  },
  {
    name: "Toyota",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/toyota.png",
  },
  {
    name: "Mazda",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/mazda.png",
  },
  {
    name: "Jeep",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/jeep.png",
  },
  {
    name: "Honda",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/honda.png",
  },
  {
    name: "Volkswagen",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/volkswagen.png",
  },
  {
    name: "Chevrolet",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/chevrolet.png",
  },
  {
    name: "Mitsubishi",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/mitsubishi.png",
  },
  {
    name: "Renault",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/renault.png",
  },
  {
    name: "Nissan",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/nissan.png",
  },
  {
    name: "Suzuki",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/suzuki.png",
  },
  {
    name: "Hyundai",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/hyundai.png",
  },
  { name: "Kia", logo: kiaLogo },
  {
    name: "Fiat",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/fiat.png",
  },
  {
    name: "Peugeot",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/peugeot.png",
  },
  {
    name: "Chery",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/chery.png",
  },
  {
    name: "Jac",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/jac.png",
  },
  {
    name: "Byd",
    logo: "https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset@master/logos/thumb/byd.png",
  },
  { name: "Gac", logo: gacLogo },
  { name: "Great wall", logo: gwLogo },
];
