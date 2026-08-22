import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// Helper to find or create an item in items_taller
async function findOrCreateItem(connection: any, description: string, kind: "labor" | "part", price: number, code?: string): Promise<number> {
  const tipoItem = kind === "labor" ? "SERVICIO" : "REPUESTO";
  
  // Buscar primero por código si se proporciona
  if (code) {
    const [existingByCode] = await connection.query(
      "SELECT id_item FROM items_taller WHERE codigo = ?",
      [code]
    );
    if ((existingByCode as any[]).length > 0) {
      return (existingByCode as any[])[0].id_item;
    }
  }

  // Buscar si ya existe por descripción y tipo
  const [existing] = await connection.query(
    "SELECT id_item FROM items_taller WHERE descripcion = ? AND tipo_item = ?",
    [description, tipoItem]
  );
  
  if ((existing as any[]).length > 0) {
    return (existing as any[])[0].id_item;
  }
  
  // Si no existe, crear un nuevo item con código autogenerado
  const prefix = kind === "labor" ? "SERV" : "REP";
  const uniqueCode = code || `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const [itemResult] = await connection.query(
    "INSERT INTO items_taller (codigo, descripcion, tipo_item) VALUES (?, ?, ?)",
    [uniqueCode, description, tipoItem]
  );
  const idItem = (itemResult as any).insertId;
  
  // Insertar en la tabla hija correspondiente
  if (kind === "labor") {
    await connection.query(
      "INSERT INTO servicios (id_item, precio_base) VALUES (?, ?)",
      [idItem, price]
    );
  } else {
    await connection.query(
      "INSERT INTO repuestos (id_item, precio_venta, stock_actual) VALUES (?, ?, ?)",
      [idItem, price, 100] // stock por defecto
    );
  }
  
  return idItem;
}

// @desc    Get all proformas with income, client and vehicle details
// @route   GET /api/proformas
// @access  Public
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    let sql = `
      SELECT p.*, 
             i.fecha_ingreso, i.kilometraje, i.falla_reportada,
             v.placa, v.marca, v.modelo,
             c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.id_cliente
      FROM proformas p
      JOIN ingresos_taller i ON p.id_ingreso = i.id_ingreso
      JOIN vehiculos v ON i.id_vehiculo = v.id_vehiculo
      JOIN clientes c ON v.id_cliente = c.id_cliente
    `;
    const params: any[] = [];

    if (query) {
      let proformaIdSearch: number | null = null;
      const cleanQuery = String(query).trim().toUpperCase();
      
      const match = cleanQuery.match(/PF-\d{4}-(\d+)/) || cleanQuery.match(/^0*(\d+)$/);
      if (match) {
        proformaIdSearch = parseInt(match[1], 10);
      }

      sql += ` WHERE v.placa LIKE ? OR c.nombre LIKE ? OR p.estado LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ?`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);

      if (proformaIdSearch !== null && !isNaN(proformaIdSearch)) {
        sql += ` OR p.id_proforma = ?`;
        params.push(proformaIdSearch);
      }
    }

    sql += " ORDER BY p.id_proforma DESC";

    const [rows] = await pool.query(sql, params);
    
    // Formatear proformas
    const results = (rows as any[]).map(row => {
      let extraData = { discount: 0, taxRate: 13, text: row.observaciones || "" };
      try {
        if (row.observaciones && (row.observaciones.startsWith("{") || row.observaciones.startsWith("["))) {
          const parsed = JSON.parse(row.observaciones);
          extraData = {
            discount: parsed.discount ?? 0,
            taxRate: parsed.taxRate ?? 13,
            text: parsed.text ?? "",
          };
        }
      } catch (e) {
        // No es JSON, mantener como texto
      }

      return {
        ...row,
        discount: extraData.discount,
        taxRate: extraData.taxRate,
        observaciones_limpias: extraData.text,
      };
    });

    res.json(results);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar proformas", error: error.message });
  }
});

// @desc    Get proforma by ID with details
// @route   GET /api/proformas/:id
// @access  Public
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT p.*, 
             i.fecha_ingreso, i.kilometraje, i.falla_reportada, i.nivel_combustible, i.deja_accesorios, i.observaciones_estado,
             i.id_empleado_receptor, i.id_mecanico_asignado,
             v.placa, v.marca, v.modelo, v.color, v.anio, v.id_vehiculo,
             c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.ci as ci_cliente, c.nit as nit_cliente, c.pasaporte as pasaporte_cliente, c.tipo_cliente, c.direccion as direccion_cliente, c.id_cliente,
             er.nombre as nombre_receptor, er.paterno as paterno_receptor,
             em.nombre as nombre_mecanico, em.paterno as paterno_mecanico
      FROM proformas p
      JOIN ingresos_taller i ON p.id_ingreso = i.id_ingreso
      JOIN vehiculos v ON i.id_vehiculo = v.id_vehiculo
      JOIN clientes c ON v.id_cliente = c.id_cliente
      JOIN empleados er ON i.id_empleado_receptor = er.id_empleado
      JOIN empleados em ON i.id_mecanico_asignado = em.id_empleado
      WHERE p.id_proforma = ?
      `,
      [id]
    );

    const proforma = (rows as any[])[0];

    if (!proforma) {
      res.status(404).json({ message: "Proforma no encontrada" });
      return;
    }

    // Obtener detalles
    const [details] = await pool.query(
      `
      SELECT dp.*, it.descripcion, it.codigo, it.tipo_item
      FROM detalles_proforma dp
      JOIN items_taller it ON dp.id_item = it.id_item
      WHERE dp.id_proforma = ?
      `,
      [id]
    );

    // Mapear detalles al formato del frontend
    const lines = (details as any[]).map((d) => ({
      id: d.id_detalle.toString(),
      description: d.descripcion,
      code: d.codigo,
      qty: d.cantidad,
      unitPrice: Number(d.precio_unitario),
      kind: d.tipo_item === "SERVICIO" ? "labor" : "part",
    }));

    // Desestructurar observaciones JSON si aplica
    let extraData = { discount: 0, taxRate: 13, text: proforma.observaciones || "" };
    try {
      if (proforma.observaciones && (proforma.observaciones.startsWith("{") || proforma.observaciones.startsWith("["))) {
        const parsed = JSON.parse(proforma.observaciones);
        extraData = {
          discount: parsed.discount ?? 0,
          taxRate: parsed.taxRate ?? 13,
          text: parsed.text ?? "",
        };
      }
    } catch (e) {
      // No es JSON, mantener
    }

    res.json({
      ...proforma,
      discount: extraData.discount,
      taxRate: extraData.taxRate,
      observaciones: extraData.text,
      lines,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener proforma", error: error.message });
  }
});

// @desc    Create a proforma
// @route   POST /api/proformas
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id_ingreso, estado, lines, discount, taxRate, observaciones } = req.body;

    if (!id_ingreso || !lines || !Array.isArray(lines)) {
      res.status(400).json({ message: "El ID de ingreso y las líneas son requeridos" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Calcular monto total (subtotal, descuento, iva)
      const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
      const discountAmount = (subtotal * (Number(discount) || 0)) / 100;
      const taxable = subtotal - discountAmount;
      const taxAmount = (taxable * (Number(taxRate) || 0)) / 100;
      const totalAmount = taxable + taxAmount;

      // 2. Guardar observaciones como JSON para conservar discount y taxRate
      const obsJson = JSON.stringify({
        text: observaciones || "",
        discount: Number(discount) || 0,
        taxRate: Number(taxRate) || 0,
      });

      // 3. Obtener el número correlativo para el año actual
      const currentYear = new Date().getFullYear();
      const [maxNumResult] = await connection.query(
        "SELECT MAX(numero_proforma) as max_num FROM proformas WHERE YEAR(fecha_emision) = ?",
        [currentYear]
      );
      const nextNum = ((maxNumResult as any[])[0]?.max_num || 0) + 1;

      // 4. Insertar la proforma
      const [proformaResult] = await connection.query(
        "INSERT INTO proformas (id_ingreso, estado, monto_total, observaciones, numero_proforma) VALUES (?, ?, ?, ?, ?)",
        [id_ingreso, estado || "PENDIENTE", totalAmount, obsJson, nextNum]
      );
      const idProforma = (proformaResult as any).insertId;

      // 4. Guardar líneas de detalle
      for (const line of lines) {
        // Encontrar o crear el item en la BD
        const idItem = await findOrCreateItem(connection, line.description, line.kind, Number(line.unitPrice) || 0, line.code);

        await connection.query(
          "INSERT INTO detalles_proforma (id_proforma, id_item, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
          [idProforma, idItem, Number(line.qty) || 1, Number(line.unitPrice) || 0]
        );
      }

      await connection.commit();

      res.status(201).json({
        id_proforma: idProforma,
        message: "Proforma guardada correctamente",
      });
    } catch (error: any) {
      await connection.rollback();
      res.status(500).json({ message: "Error al crear proforma", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// @desc    Update a proforma
// @route   PUT /api/proformas/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { estado, lines, discount, taxRate, observaciones } = req.body;

    if (!lines || !Array.isArray(lines)) {
      res.status(400).json({ message: "Las líneas de detalle son requeridas" });
      return;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Verificar que exista la proforma
      const [existing] = await connection.query("SELECT id_proforma FROM proformas WHERE id_proforma = ?", [id]);
      if ((existing as any[]).length === 0) {
        res.status(404).json({ message: "Proforma no encontrada" });
        return;
      }

      // 1. Calcular monto total
      const subtotal = lines.reduce((sum: number, l: any) => sum + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
      const discountAmount = (subtotal * (Number(discount) || 0)) / 100;
      const taxable = subtotal - discountAmount;
      const taxAmount = (taxable * (Number(taxRate) || 0)) / 100;
      const totalAmount = taxable + taxAmount;

      const obsJson = JSON.stringify({
        text: observaciones || "",
        discount: Number(discount) || 0,
        taxRate: Number(taxRate) || 0,
      });

      // 2. Actualizar proforma
      if (estado) {
        await connection.query(
          "UPDATE proformas SET estado = ?, monto_total = ?, observaciones = ? WHERE id_proforma = ?",
          [estado, totalAmount, obsJson, id]
        );
      } else {
        await connection.query(
          "UPDATE proformas SET monto_total = ?, observaciones = ? WHERE id_proforma = ?",
          [totalAmount, obsJson, id]
        );
      }

      // 3. Eliminar detalles antiguos
      await connection.query("DELETE FROM detalles_proforma WHERE id_proforma = ?", [id]);

      // 4. Insertar detalles nuevos
      for (const line of lines) {
        const idItem = await findOrCreateItem(connection, line.description, line.kind, Number(line.unitPrice) || 0, line.code);

        await connection.query(
          "INSERT INTO detalles_proforma (id_proforma, id_item, cantidad, precio_unitario) VALUES (?, ?, ?, ?)",
          [id, idItem, Number(line.qty) || 1, Number(line.unitPrice) || 0]
        );
      }

      await connection.commit();
      res.json({ message: "Proforma actualizada correctamente" });
    } catch (error: any) {
      await connection.rollback();
      res.status(500).json({ message: "Error al actualizar proforma", error: error.message });
    } finally {
      connection.release();
    }
  }
);

// @desc    Update proforma status (Aprobada / Rechazada)
// @route   PUT /api/proformas/:id/status
// @access  Public (so the manager can approve via link, or restricted to editor/admin if needed, let's keep it protect for roles but also allow guest if token in query, we will verify)
router.put("/:id/status", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { estado } = req.body;

  if (!estado || !["PENDIENTE", "APROBADA", "RECHAZADA"].includes(estado)) {
    res.status(400).json({ message: "Estado inválido" });
    return;
  }

  try {
    const [result] = await pool.query(
      "UPDATE proformas SET estado = ? WHERE id_proforma = ?",
      [estado, id]
    );

    if ((result as any).affectedRows === 0) {
      res.status(404).json({ message: "Proforma no encontrada" });
      return;
    }

    res.json({ message: `Estado de la proforma actualizado a ${estado}` });
  } catch (error: any) {
    res.status(500).json({ message: "Error al actualizar estado", error: error.message });
  }
});

// @desc    Delete a proforma
// @route   DELETE /api/proformas/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [existing] = await pool.query("SELECT id_proforma FROM proformas WHERE id_proforma = ?", [id]);
      if ((existing as any[]).length === 0) {
        res.status(404).json({ message: "Proforma no encontrada" });
        return;
      }

      await pool.query("DELETE FROM proformas WHERE id_proforma = ?", [id]);
      res.json({ message: "Proforma eliminada correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar proforma", error: error.message });
    }
  }
);

export default router;
