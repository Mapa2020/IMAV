import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get next sequential report number (e.g., INF-2026-001)
// @route   GET /api/reports/next-number
// @access  Private
router.get("/next-number", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const currentYear = new Date().getFullYear();
    const type = ((req.query.type as string) || "informe").toLowerCase();
    const docPrefix = type === "carta" ? "CAR" : "INF";
    const prefix = `${docPrefix}-${currentYear}-`;

    const [rows] = await pool.query(
      "SELECT numero_informe FROM informes_tecnicos WHERE numero_informe LIKE ? ORDER BY id_informe DESC LIMIT 1",
      [`${prefix}%`]
    );

    let nextCorrelative = 1;
    if ((rows as any[]).length > 0) {
      const lastNumber = (rows as any[])[0].numero_informe;
      const parts = lastNumber.split("-");
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextCorrelative = parsed + 1;
        }
      }
    }

    const nextNumber = `${prefix}${String(nextCorrelative).padStart(3, "0")}`;
    res.json({ nextNumber });
  } catch (error: any) {
    res.status(500).json({ message: "Error al generar correlativo de informe o carta", error: error.message });
  }
});

// @desc    Get all technical reports
// @route   GET /api/reports
// @access  Private
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query, id_vehiculo, id_cliente } = req.query;

  try {
    let sql = `
      SELECT 
        inf.*,
        c.nombre AS nombre_cliente_actual,
        c.ci AS ci_cliente,
        c.nit AS nit_cliente,
        v.placa AS placa_actual,
        v.marca AS marca_vehiculo,
        v.modelo AS modelo_vehiculo,
        emp.nombre AS nombre_empleado,
        emp.paterno AS paterno_empleado
      FROM informes_tecnicos inf
      LEFT JOIN clientes c ON inf.id_cliente = c.id_cliente
      LEFT JOIN vehiculos v ON inf.id_vehiculo = v.id_vehiculo
      LEFT JOIN empleados emp ON inf.id_empleado = emp.id_empleado
      WHERE 1=1
    `;
    const params: any[] = [];

    if (id_vehiculo) {
      sql += " AND inf.id_vehiculo = ?";
      params.push(id_vehiculo);
    }

    if (id_cliente) {
      sql += " AND inf.id_cliente = ?";
      params.push(id_cliente);
    }

    if (query) {
      sql += ` AND (
        inf.numero_informe LIKE ? OR 
        inf.destinatario_nombre LIKE ? OR 
        inf.placa LIKE ? OR 
        inf.referencia LIKE ? OR 
        inf.vehiculo_descripcion LIKE ?
      )`;
      const term = `%${query}%`;
      params.push(term, term, term, term, term);
    }

    sql += " ORDER BY inf.fecha DESC, inf.id_informe DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar informes técnicos", error: error.message });
  }
});

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT 
        inf.*,
        c.nombre AS nombre_cliente_actual,
        c.ci AS ci_cliente,
        c.nit AS nit_cliente,
        c.telefono AS telefono_cliente,
        v.placa AS placa_actual,
        v.marca AS marca_vehiculo,
        v.modelo AS modelo_vehiculo,
        emp.nombre AS nombre_empleado,
        emp.paterno AS paterno_empleado
      FROM informes_tecnicos inf
      LEFT JOIN clientes c ON inf.id_cliente = c.id_cliente
      LEFT JOIN vehiculos v ON inf.id_vehiculo = v.id_vehiculo
      LEFT JOIN empleados emp ON inf.id_empleado = emp.id_empleado
      WHERE inf.id_informe = ?`,
      [id]
    );

    if ((rows as any[]).length === 0) {
      res.status(404).json({ message: "Informe técnico no encontrado" });
      return;
    }

    res.json((rows as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener informe técnico", error: error.message });
  }
});

// @desc    Create a new technical report
// @route   POST /api/reports
// @access  Private
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      id_vehiculo,
      id_cliente,
      id_ingreso,
      id_empleado,
      numero_informe,
      fecha,
      ciudad = "Santa Cruz",
      destinatario_nombre,
      destinatario_atencion,
      vehiculo_descripcion,
      placa,
      kilometraje,
      referencia,
      contenido,
      conclusion,
      costo_estimado,
      firmante_nombre = "IMAV MOTORS S.R.L.",
      firmante_cargo = "Servicio Integral Automotriz",
      estado = "EMITIDO",
    } = req.body;

    if (!id_vehiculo || !id_cliente || !destinatario_nombre || !placa || !referencia || !contenido) {
      res.status(400).json({
        message: "Vehículo, cliente, destinatario, placa, referencia y contenido son campos obligatorios",
      });
      return;
    }

    try {
      let finalNumber = numero_informe;
      if (!finalNumber) {
        const currentYear = new Date().getFullYear();
        const prefix = `INF-${currentYear}-`;
        const [numRows] = await pool.query(
          "SELECT numero_informe FROM informes_tecnicos WHERE numero_informe LIKE ? ORDER BY id_informe DESC LIMIT 1",
          [`${prefix}%`]
        );
        let nextCorrelative = 1;
        if ((numRows as any[]).length > 0) {
          const lastNumber = (numRows as any[])[0].numero_informe;
          const parts = lastNumber.split("-");
          if (parts.length === 3) {
            const parsed = parseInt(parts[2], 10);
            if (!isNaN(parsed)) {
              nextCorrelative = parsed + 1;
            }
          }
        }
        finalNumber = `${prefix}${String(nextCorrelative).padStart(3, "0")}`;
      }

      const reportDate = fecha ? new Date(fecha) : new Date();

      const [result] = await pool.query(
        `INSERT INTO informes_tecnicos (
          id_vehiculo,
          id_cliente,
          id_ingreso,
          id_empleado,
          numero_informe,
          fecha,
          ciudad,
          destinatario_nombre,
          destinatario_atencion,
          vehiculo_descripcion,
          placa,
          kilometraje,
          referencia,
          contenido,
          conclusion,
          costo_estimado,
          firmante_nombre,
          firmante_cargo,
          estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id_vehiculo,
          id_cliente,
          id_ingreso || null,
          id_empleado || null,
          finalNumber,
          reportDate,
          ciudad,
          destinatario_nombre.trim(),
          destinatario_atencion ? destinatario_atencion.trim() : null,
          vehiculo_descripcion.trim(),
          placa.trim().toUpperCase(),
          kilometraje ? parseInt(kilometraje, 10) : null,
          referencia.trim(),
          contenido.trim(),
          conclusion ? conclusion.trim() : null,
          costo_estimado !== undefined && costo_estimado !== null && costo_estimado !== "" ? parseFloat(costo_estimado) : null,
          firmante_nombre,
          firmante_cargo,
          estado,
        ]
      );

      const newId = (result as any).insertId;
      const [newReport] = await pool.query("SELECT * FROM informes_tecnicos WHERE id_informe = ?", [newId]);

      res.status(201).json((newReport as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al crear informe técnico", error: error.message });
    }
  }
);

// @desc    Update a technical report
// @route   PUT /api/reports/:id
// @access  Private
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const {
      id_vehiculo,
      id_cliente,
      id_ingreso,
      id_empleado,
      numero_informe,
      fecha,
      ciudad,
      destinatario_nombre,
      destinatario_atencion,
      vehiculo_descripcion,
      placa,
      kilometraje,
      referencia,
      contenido,
      conclusion,
      costo_estimado,
      firmante_nombre,
      firmante_cargo,
      estado,
    } = req.body;

    try {
      const [existing] = await pool.query("SELECT * FROM informes_tecnicos WHERE id_informe = ?", [id]);
      if ((existing as any[]).length === 0) {
        res.status(404).json({ message: "Informe técnico no encontrado" });
        return;
      }

      await pool.query(
        `UPDATE informes_tecnicos SET
          id_vehiculo = COALESCE(?, id_vehiculo),
          id_cliente = COALESCE(?, id_cliente),
          id_ingreso = ?,
          id_empleado = ?,
          numero_informe = COALESCE(?, numero_informe),
          fecha = COALESCE(?, fecha),
          ciudad = COALESCE(?, ciudad),
          destinatario_nombre = COALESCE(?, destinatario_nombre),
          destinatario_atencion = ?,
          vehiculo_descripcion = COALESCE(?, vehiculo_descripcion),
          placa = COALESCE(?, placa),
          kilometraje = ?,
          referencia = COALESCE(?, referencia),
          contenido = COALESCE(?, contenido),
          conclusion = ?,
          costo_estimado = ?,
          firmante_nombre = COALESCE(?, firmante_nombre),
          firmante_cargo = COALESCE(?, firmante_cargo),
          estado = COALESCE(?, estado)
        WHERE id_informe = ?`,
        [
          id_vehiculo,
          id_cliente,
          id_ingreso || null,
          id_empleado || null,
          numero_informe,
          fecha ? new Date(fecha) : null,
          ciudad,
          destinatario_nombre ? destinatario_nombre.trim() : null,
          destinatario_atencion ? destinatario_atencion.trim() : null,
          vehiculo_descripcion ? vehiculo_descripcion.trim() : null,
          placa ? placa.trim().toUpperCase() : null,
          kilometraje ? parseInt(kilometraje, 10) : null,
          referencia ? referencia.trim() : null,
          contenido ? contenido.trim() : null,
          conclusion ? conclusion.trim() : null,
          costo_estimado !== undefined && costo_estimado !== null && costo_estimado !== "" ? parseFloat(costo_estimado) : null,
          firmante_nombre,
          firmante_cargo,
          estado,
          id,
        ]
      );

      const [updated] = await pool.query("SELECT * FROM informes_tecnicos WHERE id_informe = ?", [id]);
      res.json((updated as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar informe técnico", error: error.message });
    }
  }
);

// @desc    Delete a technical report
// @route   DELETE /api/reports/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [existing] = await pool.query("SELECT * FROM informes_tecnicos WHERE id_informe = ?", [id]);
      if ((existing as any[]).length === 0) {
        res.status(404).json({ message: "Informe técnico no encontrado" });
        return;
      }

      await pool.query("DELETE FROM informes_tecnicos WHERE id_informe = ?", [id]);
      res.json({ message: "Informe técnico eliminado exitosamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar informe técnico", error: error.message });
    }
  }
);

export default router;
