import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// Helper to map 0-100 fuel level to enum('VACIO','1/4','1/2','3/4','LLENO')
export function mapPercentToFuelEnum(percent: number): "VACIO" | "1/4" | "1/2" | "3/4" | "LLENO" {
  if (percent <= 15) return "VACIO";
  if (percent <= 37) return "1/4";
  if (percent <= 62) return "1/2";
  if (percent <= 87) return "3/4";
  return "LLENO";
}

// Helper to map fuel enum to 0-100 percentage
export function mapFuelEnumToPercent(fuelEnum: string): number {
  switch (fuelEnum) {
    case "VACIO": return 0;
    case "1/4": return 25;
    case "1/2": return 50;
    case "3/4": return 75;
    case "LLENO": return 100;
    default: return 50;
  }
}

// @desc    Get all receptions with vehicle and client info
// @route   GET /api/receptions
// @access  Public
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    let sql = `
      SELECT i.*, 
             v.placa, v.marca, v.modelo, v.color, v.anio,
             c.nombre as nombre_cliente, c.telefono as telefono_cliente,
             er.nombre as nombre_receptor, er.paterno as paterno_receptor,
             em.nombre as nombre_mecanico, em.paterno as paterno_mecanico
      FROM ingresos_taller i
      JOIN vehiculos v ON i.id_vehiculo = v.id_vehiculo
      JOIN clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN empleados er ON i.id_empleado_receptor = er.id_empleado
      LEFT JOIN empleados em ON i.id_mecanico_asignado = em.id_empleado
    `;
    const params: any[] = [];

    if (query) {
      sql += ` WHERE v.placa LIKE ? OR c.nombre LIKE ? OR er.nombre LIKE ? OR i.falla_reportada LIKE ?`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY i.id_ingreso DESC";

    const [rows] = await pool.query(sql, params);
    
    // Mapear el nivel de combustible para devolver porcentaje numérico también
    const results = (rows as any[]).map(row => ({
      ...row,
      nivel_combustible_porcentaje: mapFuelEnumToPercent(row.nivel_combustible)
    }));

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar recepciones", error: error.message });
  }
});

// @desc    Get reception by ID
// @route   GET /api/receptions/:id
// @access  Public
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT i.*, 
             v.placa, v.marca, v.modelo, v.color, v.anio, v.id_cliente,
             c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.ci as ci_cliente, c.nit as nit_cliente, c.tipo_cliente,
             er.nombre as nombre_receptor, er.paterno as paterno_receptor,
             em.nombre as nombre_mecanico, em.paterno as paterno_mecanico
      FROM ingresos_taller i
      JOIN vehiculos v ON i.id_vehiculo = v.id_vehiculo
      JOIN clientes c ON v.id_cliente = c.id_cliente
      LEFT JOIN empleados er ON i.id_empleado_receptor = er.id_empleado
      LEFT JOIN empleados em ON i.id_mecanico_asignado = em.id_empleado
      WHERE i.id_ingreso = ?
      `,
      [id]
    );

    const reception = (rows as any[])[0];

    if (!reception) {
      res.status(404).json({ message: "Recepción no encontrada" });
      return;
    }

    res.json({
      ...reception,
      nivel_combustible_porcentaje: mapFuelEnumToPercent(reception.nivel_combustible)
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener recepción", error: error.message });
  }
});

// @desc    Create a reception
// @route   POST /api/receptions
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      id_vehiculo,
      id_empleado_receptor,
      id_mecanico_asignado,
      kilometraje,
      fuelLevel, // numérico de 0 a 100
      observaciones_estado,
      deja_accesorios, // string
      falla_reportada,
      estado_ingreso,
      fecha_ingreso, // opcional
    } = req.body;

    if (!id_vehiculo) {
      res.status(400).json({ message: "El vehículo es obligatorio" });
      return;
    }

    const receptorId = id_empleado_receptor && id_empleado_receptor !== "none" ? Number(id_empleado_receptor) : null;
    const mecanicoId = id_mecanico_asignado && id_mecanico_asignado !== "none" ? Number(id_mecanico_asignado) : null;
    const nivelCombustibleEnum = mapPercentToFuelEnum(Number(fuelLevel) || 0);
    const finalFalla = falla_reportada && typeof falla_reportada === "string" && falla_reportada.trim() !== "" ? falla_reportada.trim() : null;

    let cleanFechaIngreso: string | Date = new Date();
    if (fecha_ingreso) {
      cleanFechaIngreso = typeof fecha_ingreso === "string" && fecha_ingreso.includes("T")
        ? fecha_ingreso.replace("T", " ").slice(0, 19)
        : (typeof fecha_ingreso === "string" && fecha_ingreso.length === 10 ? `${fecha_ingreso} 12:00:00` : String(fecha_ingreso));
    }

    try {
      const [result] = await pool.query(
        `
        INSERT INTO ingresos_taller 
        (id_vehiculo, id_empleado_receptor, id_mecanico_asignado, kilometraje, nivel_combustible, observaciones_estado, deja_accesorios, falla_reportada, estado_ingreso, fecha_ingreso) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          id_vehiculo,
          receptorId,
          mecanicoId,
          Number(kilometraje) || 0,
          nivelCombustibleEnum,
          observaciones_estado || null,
          deja_accesorios || null,
          finalFalla,
          estado_ingreso || "EN_REVISION",
          cleanFechaIngreso,
        ]
      );

      const newReceptionId = (result as any).insertId;
      const [newReception] = await pool.query("SELECT * FROM ingresos_taller WHERE id_ingreso = ?", [newReceptionId]);

      res.status(201).json((newReception as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al registrar ingreso en taller", error: error.message });
    }
  }
);

// @desc    Update a reception
// @route   PUT /api/receptions/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
      id_vehiculo,
      id_empleado_receptor,
      id_mecanico_asignado,
      kilometraje,
      fuelLevel,
      observaciones_estado,
      deja_accesorios,
      falla_reportada,
      estado_ingreso,
      fecha_salida,
      fecha_ingreso,
    } = req.body;

    if (!id_vehiculo) {
      res.status(400).json({ message: "El vehículo es obligatorio" });
      return;
    }

    const receptorId = id_empleado_receptor && id_empleado_receptor !== "none" ? Number(id_empleado_receptor) : null;
    const mecanicoId = id_mecanico_asignado && id_mecanico_asignado !== "none" ? Number(id_mecanico_asignado) : null;
    const nivelCombustibleEnum = mapPercentToFuelEnum(Number(fuelLevel) || 0);
    const finalFalla = falla_reportada && typeof falla_reportada === "string" && falla_reportada.trim() !== "" ? falla_reportada.trim() : null;

    let cleanFechaIngreso: string | null = null;
    if (fecha_ingreso) {
      cleanFechaIngreso = typeof fecha_ingreso === "string" && fecha_ingreso.includes("T")
        ? fecha_ingreso.replace("T", " ").slice(0, 19)
        : (typeof fecha_ingreso === "string" && fecha_ingreso.length === 10 ? `${fecha_ingreso} 12:00:00` : String(fecha_ingreso));
    }

    try {
      const [receptionRows] = await pool.query("SELECT * FROM ingresos_taller WHERE id_ingreso = ?", [id]);
      if ((receptionRows as any[]).length === 0) {
        res.status(404).json({ message: "Recepción no encontrada" });
        return;
      }

      await pool.query(
        `
        UPDATE ingresos_taller SET 
          id_vehiculo = ?, 
          id_empleado_receptor = ?, 
          id_mecanico_asignado = ?, 
          kilometraje = ?, 
          nivel_combustible = ?, 
          observaciones_estado = ?, 
          deja_accesorios = ?, 
          falla_reportada = ?, 
          estado_ingreso = ?,
          fecha_salida = ?,
          fecha_ingreso = COALESCE(?, fecha_ingreso)
        WHERE id_ingreso = ?
        `,
        [
          id_vehiculo,
          receptorId,
          mecanicoId,
          Number(kilometraje) || 0,
          nivelCombustibleEnum,
          observaciones_estado || null,
          deja_accesorios || null,
          finalFalla,
          estado_ingreso || "EN_REVISION",
          fecha_salida ? new Date(fecha_salida) : null,
          cleanFechaIngreso,
          id,
        ]
      );

      const [updated] = await pool.query("SELECT * FROM ingresos_taller WHERE id_ingreso = ?", [id]);
      res.json((updated as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar recepción", error: error.message });
    }
  }
);

// @desc    Delete a reception
// @route   DELETE /api/receptions/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [receptionRows] = await pool.query("SELECT * FROM ingresos_taller WHERE id_ingreso = ?", [id]);
      if ((receptionRows as any[]).length === 0) {
        res.status(404).json({ message: "Recepción no encontrada" });
        return;
      }

      // Verificar si hay proformas asociadas a este ingreso
      const [proformas] = await pool.query("SELECT COUNT(*) as count FROM proformas WHERE id_ingreso = ?", [id]);
      if ((proformas as any)[0].count > 0) {
        res.status(400).json({ message: "No se puede eliminar la recepción porque tiene proformas asociadas" });
        return;
      }

      await pool.query("DELETE FROM ingresos_taller WHERE id_ingreso = ?", [id]);
      res.json({ message: "Recepción eliminada correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar recepción", error: error.message });
    }
  }
);

export default router;
