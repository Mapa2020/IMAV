import { useRef, useState, useEffect } from "react";
import { Phone, Mail } from "lucide-react";
import boschLogo from "@/assets/Bosch.png";
import gacLogo from "@/assets/gac.png";
import gwLogo from "@/assets/gw.png";
import kiaLogo from "@/assets/kia.png";

export interface TechnicalReport {
  id_informe?: number;
  id_vehiculo?: number;
  id_cliente?: number;
  id_ingreso?: number | null;
  id_empleado?: number | null;
  numero_informe: string;
  fecha: string;
  ciudad?: string;
  destinatario_nombre: string;
  destinatario_atencion?: string | null;
  vehiculo_descripcion: string;
  placa: string;
  kilometraje?: number | null;
  referencia: string;
  contenido: string;
  conclusion?: string | null;
  costo_estimado?: number | null;
  firmante_nombre?: string;
  firmante_cargo?: string;
  estado?: string;
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

function formatReportDate(dateString?: string, city = "Santa Cruz"): string {
  if (!dateString) {
    const today = new Date();
    const day = today.getDate();
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${city}, ${day} de ${months[today.getMonth()]} de ${today.getFullYear()}`;
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return `${city}, ${dateString}`;

  const day = d.getUTCDate();
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  const monthName = months[d.getUTCMonth()];
  const year = d.getUTCFullYear();

  return `${city}, ${day} de ${monthName} de ${year}`;
}

export function ReportDocument({ report }: { report: TechnicalReport }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(1056);

  const isLetter = report.numero_informe?.toUpperCase().startsWith("CAR");

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
  }, [report]);

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
          width: "816px",
          position: scale < 1 ? "absolute" : "relative",
          left: 0,
          top: 0,
        }}
      >
        <div className="report-table-wrapper overflow-hidden rounded-xl bg-paper text-paper-foreground shadow-paper relative flex print:overflow-visible print:rounded-none w-[816px] min-h-[1056px] mx-auto flex-row print:w-[8.5in] print:min-h-[11.0in]">
          {/* Estilos para impresión y visualización */}
          <style
            dangerouslySetInnerHTML={{
              __html: `
        @media screen {
          .report-table {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 1056px !important;
            width: 100% !important;
          }
          .report-thead, .report-tbody, .report-tfoot {
            display: block !important;
            width: 100% !important;
          }
          .report-tbody {
            flex-grow: 1 !important;
          }
          .report-tr {
            display: block !important;
            width: 100% !important;
          }
          .report-td {
            display: block !important;
            width: 100% !important;
          }
        }
        @media print {
          @page {
            size: letter portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .report-table-wrapper {
            display: flex !important;
            flex-direction: row !important;
            width: 8.5in !important;
            min-height: 11.0in !important;
            margin: 0 auto !important;
            padding: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          .report-table {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            min-height: 11.0in !important;
            height: 100% !important;
            width: calc(100% - 3rem) !important;
            flex: 1 1 0% !important;
          }
          .report-thead, .report-tbody, .report-tfoot {
            display: block !important;
            width: 100% !important;
          }
          .report-tbody {
            flex-grow: 1 !important;
          }
          .report-tr {
            display: block !important;
            width: 100% !important;
          }
          .report-td {
            display: block !important;
            width: 100% !important;
          }
          .report-brand-column {
            display: flex !important;
            flex-direction: column !important;
            width: 3rem !important;
            min-height: 11.0in !important;
            background-color: #ffffff !important;
            border-left: 1px solid #f1f5f9 !important;
            padding-top: 0.75rem !important;
            padding-bottom: 0.75rem !important;
            align-items: center !important;
            justify-content: space-between !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          tr, .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          [data-sonner-toaster], .sonner-toast, [class*="sonner-"], button, .print\\:hidden {
            display: none !important;
          }
        }
      `,
            }}
          />

          {/* Centro: Contenido principal formateado como tabla */}
          <table className="report-table border-none border-collapse flex-1 min-w-0">
            <thead className="report-thead">
              <tr className="report-tr">
                <td className="report-td p-0 border-none">
                  {/* Header corporativo */}
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

                    {/* Franjas de color corporativo */}
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

                    {/* Logo Bosch */}
                    <div className="absolute right-7 bottom-0 z-10 flex items-end">
                      <img
                        src={boschLogo}
                        alt="Bosch"
                        className="h-[66px] w-auto object-contain translate-y-[17px]"
                      />
                    </div>
                  </div>

                  {/* Dirección y Código del Informe */}
                  <div className="px-8 pt-5 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 text-slate-700">
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
                    {!isLetter && (
                      <div className="text-right sm:text-right shrink-0 flex flex-col gap-1">
                        <p className="text-lg font-bold uppercase tracking-[0.18em] text-[#B87333] leading-none">
                          Informe Técnico
                        </p>
                        <p className="font-mono text-sm font-bold text-slate-900 tracking-wider">
                          {report.numero_informe || "INF-2026-001"}
                        </p>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            </thead>

            {/* Cuerpo del Informe Técnico */}
            <tbody className="report-tbody">
              <tr className="report-tr">
                <td className="report-td px-8 py-2 border-none">
                  {/* Fecha */}
                  <div className="mb-5 text-sm text-slate-800 font-medium">
                    {formatReportDate(report.fecha, report.ciudad || "Santa Cruz")}
                  </div>

                  {/* Encabezado del Destinatario y Vehículo */}
                  <div className="space-y-1.5 text-sm text-slate-900 font-sans border-b border-slate-200 pb-4 mb-5">
                    <div className="flex items-start">
                      <span className="w-24 font-bold text-slate-800 shrink-0">
                        Sres.:
                      </span>
                      <span className="font-bold text-slate-950 uppercase tracking-wide">
                        {report.destinatario_nombre || "—"}
                      </span>
                    </div>

                    {report.destinatario_atencion && (
                      <div className="flex items-start">
                        <span className="w-24 font-semibold text-slate-700 shrink-0">
                          Atn.:
                        </span>
                        <span className="font-medium text-slate-800">
                          {report.destinatario_atencion}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start">
                      <span className="w-24 font-semibold text-slate-700 shrink-0">
                        Vehículo:
                      </span>
                      <span className="font-medium text-slate-900">
                        {report.vehiculo_descripcion || "—"}
                      </span>
                    </div>

                    <div className="flex items-start">
                      <span className="w-24 font-semibold text-slate-700 shrink-0">
                        Placa:
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {report.placa || "s/p"}
                      </span>
                      {report.kilometraje ? (
                        <span className="ml-6 text-xs text-slate-600 font-normal">
                          (Km: {report.kilometraje.toLocaleString()} km)
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Referencia */}
                  <div className="mb-5">
                    <p className="text-sm font-extrabold tracking-wide text-slate-950 uppercase underline decoration-2 underline-offset-4">
                      REF: {report.referencia}
                    </p>
                  </div>

                  {/* Contenido / Cuerpo Principal */}
                  <div className="text-[13.5px] leading-relaxed text-slate-800 space-y-4 text-justify font-sans whitespace-pre-line min-h-[220px]">
                    {report.contenido}
                  </div>

                  {/* Costo estimado si aplica (no se muestra en Cartas) */}
                  {!isLetter &&
                    report.costo_estimado !== undefined &&
                    report.costo_estimado !== null &&
                    report.costo_estimado > 0 && (
                      <div className="my-5 p-3.5 rounded-md bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900">
                        <span>Costo estimado / Cotizado: </span>
                        <span className="font-bold text-[#B87333] text-base font-mono">
                          Bs. {report.costo_estimado.toLocaleString("es-BO", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                  {/* Conclusión / Cierre */}
                  <div className="mt-6 mb-6 text-sm text-slate-800 font-medium">
                    {report.conclusion ? (
                      <p>{report.conclusion}</p>
                    ) : (
                      <p>Es todo lo que puedo informar para los fines correspondientes.</p>
                    )}
                  </div>

                  {/* Firma (con mayor espaciado para firma/sello) */}
                  <div className="mt-20 mb-6 flex flex-col items-center justify-center text-center">
                    <div className="w-64 border-t border-slate-400 pt-2.5 flex flex-col items-center">
                      <p className="font-bold text-xs uppercase tracking-wider text-slate-900">
                        {report.firmante_nombre || "IMAV MOTORS S.R.L."}
                      </p>
                      <p className="text-[10px] text-slate-600 tracking-wider mt-0.5">
                        {report.firmante_cargo || "Servicio Integral Automotriz"}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        NIT 353490023
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>

            {/* Pie de página oficial de especialidades */}
            <tfoot className="report-tfoot">
              <tr className="report-tr">
                <td className="report-td px-8 py-3 border-none">
                  <div
                    className="border-t border-slate-300 pt-2 text-center text-[8.5px] leading-tight text-slate-600 font-medium uppercase tracking-wide flex flex-col items-center justify-center gap-1"
                    style={{
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
                    }}
                  >
                    <p className="w-full text-center">
                      Mecánica general · Mantenimiento preventivo y correctivo ·
                      Inyección electrónica · Electricidad automotriz · Diagnóstico
                      computarizado
                    </p>
                    <p className="w-full text-center text-slate-500 font-normal">
                      Alineación y Convergencia · Balanceo y Montaje · Frenos
                      ABS/ESP · Suspensión · Transmisión · Tornería
                    </p>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Columna Derecha: Logos de Marcas */}
          <div
            className="report-brand-column w-12 bg-white flex flex-col items-center justify-between border-l border-slate-100 py-3 select-none shrink-0"
            style={{
              WebkitPrintColorAdjust: "exact",
              printColorAdjust: "exact",
            }}
          >
            {CAR_BRANDS.map((b) => (
              <div
                key={b.name}
                className="w-8 h-8 flex items-center justify-center grayscale hover:grayscale-0 opacity-80 transition-all p-0.5"
              >
                <img
                  src={b.logo}
                  alt={b.name}
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
