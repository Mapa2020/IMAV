import { useRef, useState, useEffect } from "react";
import { Phone, Mail } from "lucide-react";
import { currency, totals, type Proforma, type ServiceLine } from "./proforma";
import boschLogo from "@/assets/Bosch.png";
import gacLogo from "@/assets/gac.png";
import gwLogo from "@/assets/gw.png";
import kiaLogo from "@/assets/kia.png";

// Alturas estimadas en píxeles para hoja Carta (Letter: 8.5in x 10.75in = 816px x 1032px a 96 DPI)
const PAGE_TOTAL_HEIGHT = 1032;
const HEADER_HEIGHT = 258;
const TABLE_HEADER_HEIGHT = 38;
const FOOTER_HEIGHT = 58;
const CONTINUATION_NOTE_HEIGHT = 24;
const TOTALS_AND_OBS_HEIGHT = 150;
const SAFETY_BUFFER = 24;

// Espacio vertical máximo disponible para filas de ítems
const MAX_ITEMS_HEIGHT_INTERMEDIATE =
  PAGE_TOTAL_HEIGHT -
  (HEADER_HEIGHT + TABLE_HEADER_HEIGHT + FOOTER_HEIGHT + CONTINUATION_NOTE_HEIGHT + SAFETY_BUFFER); // ~630px

const MAX_ITEMS_HEIGHT_LAST =
  PAGE_TOTAL_HEIGHT -
  (HEADER_HEIGHT + TABLE_HEADER_HEIGHT + TOTALS_AND_OBS_HEIGHT + FOOTER_HEIGHT + SAFETY_BUFFER); // ~504px

interface PageData {
  pageNumber: number;
  totalPages: number;
  lines: ServiceLine[];
  isLastPage: boolean;
}

function cleanDetalleText(detalle?: string | null): string {
  if (!detalle) return "";
  const str = String(detalle).trim();
  if (str.toLowerCase() === "null" || str.toLowerCase() === "undefined" || str.length === 0) {
    return "";
  }
  return str.replace(/^[↳↵\r\n\s]+/, "").trim();
}

function estimateItemHeight(l: ServiceLine): number {
  const base = 29; // Fila base con descripción, código, cantidad, precio e importe
  const clean = cleanDetalleText(l.detalle);
  if (!clean) return base;

  const explicitLines = clean.split("\n");
  let textLinesCount = 0;
  for (const expLine of explicitLines) {
    // La columna de descripción tiene aprox. 420px de ancho; ~52 caracteres por línea en tamaño 11px
    textLinesCount += Math.max(1, Math.ceil(expLine.length / 52));
  }
  const detailBoxHeight = 10 + textLinesCount * 16;
  return base + detailBoxHeight;
}

function paginateLines(lines: ServiceLine[]): PageData[] {
  if (lines.length === 0) {
    return [{ pageNumber: 1, totalPages: 1, lines: [], isLastPage: true }];
  }

  // Si todas las líneas caben cómodamente en una sola página con totales
  const totalSinglePageHeight = lines.reduce(
    (acc, l) => acc + estimateItemHeight(l),
    0,
  );
  if (totalSinglePageHeight <= MAX_ITEMS_HEIGHT_LAST) {
    return [{ pageNumber: 1, totalPages: 1, lines, isLastPage: true }];
  }

  // Si excede una página, paginamos progresivamente
  const pagesLines: ServiceLine[][] = [];
  let currentLines: ServiceLine[] = [];
  let currentHeight = 0;

  for (const item of lines) {
    const h = estimateItemHeight(item);

    if (
      currentLines.length > 0 &&
      currentHeight + h > MAX_ITEMS_HEIGHT_INTERMEDIATE
    ) {
      pagesLines.push(currentLines);
      currentLines = [item];
      currentHeight = h;
    } else {
      currentLines.push(item);
      currentHeight += h;
    }
  }

  if (currentLines.length > 0) {
    pagesLines.push(currentLines);
  }

  // Verificar si los ítems de la última página sobrepasan el espacio permitido con los totales
  const lastPageItems = pagesLines[pagesLines.length - 1];
  if (lastPageItems) {
    const lastPageHeight = lastPageItems.reduce(
      (acc, l) => acc + estimateItemHeight(l),
      0,
    );

    if (lastPageHeight > MAX_ITEMS_HEIGHT_LAST) {
      // Dividir los ítems finales en una página adicional
      pagesLines.pop();
      let subCurrent: ServiceLine[] = [];
      let subH = 0;
      for (const item of lastPageItems) {
        const h = estimateItemHeight(item);
        if (subCurrent.length > 0 && subH + h > MAX_ITEMS_HEIGHT_INTERMEDIATE) {
          pagesLines.push(subCurrent);
          subCurrent = [item];
          subH = h;
        } else {
          subCurrent.push(item);
          subH += h;
        }
      }
      if (subCurrent.length > 0) {
        if (
          subCurrent.reduce((acc, l) => acc + estimateItemHeight(l), 0) >
          MAX_ITEMS_HEIGHT_LAST
        ) {
          const half = Math.ceil(subCurrent.length / 2);
          pagesLines.push(subCurrent.slice(0, half));
          pagesLines.push(subCurrent.slice(half));
        } else {
          pagesLines.push(subCurrent);
        }
      }
    }
  }

  // Balancear si la última página quedó con solo 1 ítem y la anterior con bastantes
  if (pagesLines.length > 1) {
    const lastIdx = pagesLines.length - 1;
    const prevIdx = lastIdx - 1;
    const lastArr = pagesLines[lastIdx];
    const prevArr = pagesLines[prevIdx];
    if (lastArr && prevArr && lastArr.length <= 1 && prevArr.length > 4) {
      const borrowed = prevArr.splice(-2, 2);
      lastArr.unshift(...borrowed);
    }
  }

  const totalPages = pagesLines.length;
  return pagesLines.map((pLines, idx) => ({
    pageNumber: idx + 1,
    totalPages,
    lines: pLines,
    isLastPage: idx === totalPages - 1,
  }));
}

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
  const [height, setHeight] = useState(1032);

  const pages = paginateLines(data.lines);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const updateDimensions = () => {
      const containerWidth = container.clientWidth;
      const targetWidth = 816; // 8.5in en píxeles a 96 DPI
      const currentScale =
        containerWidth < targetWidth ? containerWidth / targetWidth : 1;
      setScale(currentScale);

      const docHeight = inner.offsetHeight || 1032;
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
  }, [data, pages.length]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden relative print:h-auto print:overflow-visible print:static print:m-0 print:p-0 print:bg-white print:block"
      style={{ height: scale < 1 ? `${height}px` : "auto" }}
    >
      <div
        ref={innerRef}
        className="print:!transform-none print:!static print:!w-auto print:!h-auto print:!overflow-visible print:!m-0 print:!p-0 origin-top-left flex flex-col justify-start print:block"
        style={{
          transform: scale < 1 ? `scale(${scale})` : "none",
          width: scale < 1 ? "816px" : "100%",
          position: scale < 1 ? "absolute" : "relative",
          left: 0,
          top: 0,
        }}
      >
        {/* Reglas de impresión y pantalla */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
        .proforma-document-container .font-mono,
        .proforma-page-sheet .font-mono {
          font-family: var(--font-sans), "DM Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-variant-numeric: tabular-nums lining-nums !important;
          font-feature-settings: "tnum" 1, "lnum" 1, "zero" 0 !important;
          letter-spacing: -0.01em;
        }
        @media screen {
          .proforma-page-sheet {
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
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
            background-color: #ffffff !important;
            overflow: visible !important;
            height: auto !important;
            min-height: 0 !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .proforma-document-container {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .proforma-page-sheet {
            margin: 0 auto !important;
            padding: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
            box-shadow: none !important;
            width: 8.5in !important;
            height: 10.75in !important;
            min-height: 10.75in !important;
            max-height: 10.75in !important;
            position: relative !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: row !important;
            border-radius: 0 !important;
          }
          .proforma-page-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .proforma-table-container {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            flex: 1 1 0% !important;
            min-width: 0 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
          }
          .proforma-brand-column {
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 3rem !important;
            min-width: 3rem !important;
            height: 100% !important;
            border-left: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            background-color: #ffffff !important;
          }
          tr, .avoid-break {
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

        {/* Contenedor de hojas de proforma */}
        <div className="proforma-document-container flex flex-col gap-8 print:gap-0 print:block w-full">
          {pages.map((page) => (
            <div
              key={page.pageNumber}
              className="proforma-page-sheet overflow-hidden rounded-xl bg-white text-paper-foreground shadow-paper relative flex flex-row w-full md:w-[8.5in] md:h-[10.75in] md:min-h-[10.75in] md:max-h-[10.75in] mx-auto print:w-[8.5in] print:h-[10.75in] print:min-h-[10.75in] print:max-h-[10.75in] print:shadow-none print:m-0 print:mx-auto print:rounded-none"
            >
              {/* Contenido principal de la hoja: Columna izquierda */}
              <div className="proforma-table-container flex flex-col justify-between flex-1 min-w-0 h-full">
                <div className="flex-1 flex flex-col justify-start">
                  {/* Encabezado completo en cada página */}
                  <div className="px-8 pt-7 pb-0 relative">
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

                    {/* Las 2 líneas de color que no cubren los márgenes */}
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

                    {/* Logo Bosch posicionado en la cabecera */}
                    <div className="absolute right-7 bottom-0 z-10 flex items-end">
                      <img
                        src={boschLogo}
                        alt="Bosch"
                        className="h-[66px] w-auto object-contain translate-y-[17px]"
                      />
                    </div>
                  </div>

                  {/* Dirección y Cotización */}
                  <div className="px-8 pt-4 pb-2.5 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 text-slate-700">
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
                    <div className="text-right sm:text-right shrink-0 flex flex-col gap-0.5">
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

                  {/* Fila 1: Cliente, Teléfono y CI/NIT */}
                  <div className="border-b border-slate-300 px-8 pt-2 pb-1.5 avoid-break flex justify-between items-end gap-4">
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
                          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                            Teléfono
                          </p>
                          <p className="text-xs sm:text-[13px] font-mono font-medium text-paper-foreground">
                            {data.clientPhone || "—"}
                          </p>
                        </div>
                      )}
                      {data.clientDoc && (
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                            CI / NIT
                          </p>
                          <p className="text-sm sm:text-base font-mono font-semibold text-paper-foreground">
                            {data.clientDoc || "—"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fila 2: Datos del Vehículo */}
                  <div className="grid gap-4 sm:gap-6 px-8 pt-1.5 pb-2 sm:grid-cols-3 border-b border-slate-300/80 avoid-break">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                        Placa
                      </p>
                      <p className="text-base sm:text-lg font-mono font-bold text-paper-foreground">
                        {(data.plate || "").toUpperCase() || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-0.5">
                        Marca / Modelo
                      </p>
                      <p className="text-base sm:text-lg font-bold text-paper-foreground leading-snug">
                        {[data.brand, data.model].filter(Boolean).join(" ") ||
                          "—"}
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

                  {/* Tabla de ítems para esta página */}
                  <div className="px-8 mt-3">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-y border-slate-300 text-[10px] uppercase tracking-[0.14em] text-slate-500 font-semibold">
                          <th className="py-1.5 text-left font-semibold">
                            Descripción
                          </th>
                          <th className="w-12 py-1.5 text-right font-semibold">
                            Cant.
                          </th>
                          <th className="w-20 py-1.5 text-right font-semibold">
                            P. Unit.
                          </th>
                          <th className="w-24 py-1.5 text-right font-semibold">
                            Importe
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {page.lines.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="py-8 text-center text-xs text-slate-500"
                            >
                              Aún no se han agregado servicios ni repuestos.
                            </td>
                          </tr>
                        )}
                        {page.lines.map((l) => (
                          <tr
                            key={l.id}
                            className="border-b border-slate-300/70 align-top"
                          >
                            <td className="py-1.5 pr-4 text-xs">
                              <div className="flex items-baseline">
                                <span className="font-mono font-bold text-paper-foreground mr-3 shrink-0">
                                  {l.code || "S/C"}
                                </span>
                                <span className="text-paper-foreground font-medium">
                                  {l.description || "—"}
                                </span>
                              </div>
                              {cleanDetalleText(l.detalle) && (
                                <div className="mt-1 ml-1 pl-2.5 border-l-2 border-slate-400 bg-slate-50/70 print:bg-transparent rounded-r py-0.5 pr-2 text-[11px] text-slate-600 print:text-black italic whitespace-pre-line">
                                  {cleanDetalleText(l.detalle)}
                                </div>
                              )}
                            </td>
                            <td className="py-1.5 text-right font-mono text-xs">
                              {l.qty !== "" &&
                              l.qty !== null &&
                              l.qty !== undefined
                                ? Number(l.qty)
                                : ""}
                            </td>
                            <td className="py-1.5 text-right font-mono text-xs">
                              {currency(Number(l.unitPrice) || 0)}
                            </td>
                            <td className="py-1.5 text-right font-mono text-xs font-medium">
                              {currency(
                                (Number(l.qty) || 0) *
                                  (Number(l.unitPrice) || 0),
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Nota de continuación en páginas intermedias */}
                  {!page.isLastPage && (
                    <div className="px-8 pt-2.5 pb-1 text-right text-[11px] text-slate-500 italic font-medium">
                      Continúa en la página siguiente (Pág. {page.pageNumber + 1}{" "}
                      de {page.totalPages})...
                    </div>
                  )}
                </div>

                {/* Sección inferior: Totales y Observaciones (solo en la última página) + Pie de Especialidades */}
                <div className="mt-auto">
                  {page.isLastPage && (
                    <>
                      {/* Literal y Totales */}
                      <div className="flex flex-col sm:flex-row justify-between items-start px-8 pt-4 gap-4 avoid-break">
                        {/* Literal en letras (a la izquierda) */}
                        <div className="text-[11px] text-paper-foreground font-semibold uppercase sm:mt-8 self-end max-w-md border-b border-slate-300 pb-1 w-full sm:w-auto">
                          {numberToWords(t.total)}
                        </div>

                        {/* Totales (a la derecha) */}
                        <dl className="w-full max-w-[16rem] space-y-1.5 text-sm">
                          <Total k="Subtotal" v={currency(t.subtotal)} />
                          {Number(data.discount) > 0 && (
                            <Total
                              k="Descuento (Bs.)"
                              v={`- ${currency(t.discount)}`}
                            />
                          )}
                          <div className="mt-2 flex items-baseline justify-between border-t border-slate-300 pt-2">
                            <dt className="text-[11px] font-medium uppercase tracking-[0.16em]">
                              Total Bs
                            </dt>
                            <dd className="font-mono text-xl font-semibold">
                              {currency(t.total)}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Observaciones (si las hay) */}
                      {(data.complaint || data.notes) && (
                        <div className="mx-8 mt-2.5 py-1 avoid-break">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Observaciones
                          </p>
                          <p className="mt-0.5 text-xs sm:text-sm leading-relaxed text-paper-foreground">
                            {data.complaint &&
                            data.notes &&
                            data.complaint !== data.notes
                              ? `${data.complaint} — ${data.notes}`
                              : data.complaint || data.notes}
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Pie de página con especialidades técnicas (idéntico en todas las páginas) */}
                  <div
                    className={`border-t border-slate-300 px-7 py-2.5 text-center avoid-break ${
                      page.isLastPage && (data.complaint || data.notes)
                        ? "mt-1.5"
                        : "mt-2.5"
                    }`}
                  >
                    <p className="text-[9px] sm:text-[9.5px] leading-tight text-slate-600 max-w-4xl mx-auto font-medium tracking-tight">
                      Mecánica General - Mantenimiento Preventivo y Correctivo -
                      Diagnóstico Computarizado - Inyección Electrónica -
                      Electricidad Automotriz
                      <br />
                      Reparación de Motores - Cajas de Transmisión - Suspensión
                      y Dirección - Frenos ABS/ESP - Alineación y Convergencia -
                      Balanceo y Montaje.
                    </p>
                  </div>
                </div>
              </div>

              {/* Lado Derecho: Columna vertical de marcas de autos (idéntica en cada página) */}
              <div className="proforma-brand-column w-12 border-l border-slate-300 bg-white print:bg-white flex flex-col items-center justify-between py-6 px-1.5 shrink-0">
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
          ))}
        </div>
      </div>
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
