export type ServiceLine = {
  id: string;
  code?: string;
  description: string;
  qty: number;
  unitPrice: number;
  kind: "labor" | "part";
};

export type Proforma = {
  // Cliente
  clientName: string;
  clientPhone: string;
  clientDoc: string;
  // Vehículo
  plate: string;
  brand: string;
  model: string;
  year: string;
  color: string;
  mileage: string;
  fuel: string;
  vin: string;
  // Recepción
  receivedBy: string;
  entryDate: string;
  entryTime: string;
  fuelLevel: number;
  complaint: string;
  notes: string;
  lines: ServiceLine[];
  discount: number;
  taxRate: number;
};

export const SUGGESTED_SERVICES: Array<Omit<ServiceLine, "id">> = [
  { description: "Cambio de aceite y filtro", qty: 1, unitPrice: 320, kind: "labor" },
  { description: "Alineación y balanceo", qty: 1, unitPrice: 250, kind: "labor" },
  { description: "Pastillas de freno delanteras", qty: 2, unitPrice: 180, kind: "part" },
  { description: "Diagnóstico electrónico (scanner)", qty: 1, unitPrice: 150, kind: "labor" },
  { description: "Cambio de bujías", qty: 4, unitPrice: 65, kind: "part" },
  { description: "Revisión de suspensión", qty: 1, unitPrice: 200, kind: "labor" },
];

export const RECEPTIONISTS = [
  "Ing. Josue Avila",
  "Tec. Álvaro Vaca",
  "Tec. Daniel Rojas",
  "Sr. Javier Avila",
  "Sr. Alex Avila",
];

export const FUEL_TYPES = ["Gasolina", "Diésel", "GNV", "Híbrido", "Eléctrico"];

export const CHECKLIST = [
  "Llanta de auxilio",
  "Gata y llave de ruedas",
  "Botiquín",
  "Triángulos",
  "Radio / tablero",
  "Documentos del vehículo",
];

export const currency = (n: number) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const totals = (p: Proforma) => {
  const subtotal = p.lines.reduce((sum, l) => sum + l.qty * l.unitPrice, 0);
  const discount = (subtotal * p.discount) / 100;
  const taxable = subtotal - discount;
  const tax = (taxable * p.taxRate) / 100;
  return { subtotal, discount, tax, total: taxable + tax };
};
