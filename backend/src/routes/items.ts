import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Search/list items (services/repuestos) from items_taller
// @route   GET /api/items
// @access  Private
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query, tipo_item, all } = req.query;

  try {
    let sql = `
      SELECT i.id_item, i.codigo, i.descripcion, i.tipo_item,
             COALESCE(s.precio_base, r.precio_venta, 0) as precio,
             r.stock_actual,
             ei.descripcion_detallada as detalle
      FROM items_taller i
      LEFT JOIN servicios s ON i.id_item = s.id_item
      LEFT JOIN repuestos r ON i.id_item = r.id_item
      LEFT JOIN explicaciones_items ei ON i.id_item = ei.id_item
      WHERE 1=1
    `;
    const params: any[] = [];

    if (tipo_item) {
      sql += " AND i.tipo_item = ?";
      params.push(tipo_item);
    }

    if (query) {
      sql += " AND (i.descripcion LIKE ? OR i.codigo LIKE ?)";
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += " ORDER BY i.descripcion ASC";

    if (all !== "true") {
      sql += " LIMIT 50";
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar items", error: error.message });
  }
});

// @desc    Get item by ID
// @route   GET /api/items/:id
// @access  Private
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT i.id_item, i.codigo, i.descripcion, i.tipo_item,
             COALESCE(s.precio_base, r.precio_venta, 0) as precio,
             r.stock_actual,
             ei.descripcion_detallada as detalle
      FROM items_taller i
      LEFT JOIN servicios s ON i.id_item = s.id_item
      LEFT JOIN repuestos r ON i.id_item = r.id_item
      LEFT JOIN explicaciones_items ei ON i.id_item = ei.id_item
      WHERE i.id_item = ?
    `;
    const [rows] = await pool.query(sql, [id]);
    const item = (rows as any[])[0];

    if (!item) {
      res.status(404).json({ message: "Item no encontrado" });
      return;
    }

    res.json(item);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener item", error: error.message });
  }
});

// @desc    Create an item
// @route   POST /api/items
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { codigo, descripcion, tipo_item, precio, stock_actual, detalle } = req.body;

    if (!codigo || !descripcion || !tipo_item || precio === undefined) {
      res.status(400).json({ message: "Código, descripción, tipo y precio son requeridos" });
      return;
    }

    if (tipo_item !== "REPUESTO" && tipo_item !== "SERVICIO") {
      res.status(400).json({ message: "Tipo de item inválido. Debe ser REPUESTO o SERVICIO" });
      return;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verificar si código ya existe
      const [existing] = await connection.query("SELECT id_item FROM items_taller WHERE codigo = ?", [codigo]);
      if ((existing as any[]).length > 0) {
        res.status(400).json({ message: "Ya existe un item con este código" });
        await connection.rollback();
        connection.release();
        return;
      }

      // 1. Insertar en items_taller
      const [itemResult] = await connection.query(
        "INSERT INTO items_taller (codigo, descripcion, tipo_item) VALUES (?, ?, ?)",
        [codigo, descripcion, tipo_item]
      );
      const newId = (itemResult as any).insertId;

      // 2. Insertar en tabla secundaria correspondiente
      if (tipo_item === "REPUESTO") {
        const stock = stock_actual !== undefined ? stock_actual : 0;
        await connection.query(
          "INSERT INTO repuestos (id_item, precio_venta, stock_actual) VALUES (?, ?, ?)",
          [newId, precio, stock]
        );
      } else {
        await connection.query(
          "INSERT INTO servicios (id_item, precio_base) VALUES (?, ?)",
          [newId, precio]
        );
      }

      // 3. Insertar explicación/detalle si se especificó
      if (detalle && String(detalle).trim()) {
        await connection.query(
          "INSERT INTO explicaciones_items (id_item, descripcion_detallada) VALUES (?, ?)",
          [newId, String(detalle).trim()]
        );
      }

      await connection.commit();
      connection.release();

      // Devolver item recién creado
      const [newRow] = await pool.query(
        `SELECT i.id_item, i.codigo, i.descripcion, i.tipo_item,
                COALESCE(s.precio_base, r.precio_venta, 0) as precio,
                r.stock_actual,
                ei.descripcion_detallada as detalle
         FROM items_taller i
         LEFT JOIN servicios s ON i.id_item = s.id_item
         LEFT JOIN repuestos r ON i.id_item = r.id_item
         LEFT JOIN explicaciones_items ei ON i.id_item = ei.id_item
         WHERE i.id_item = ?`,
        [newId]
      );

      res.status(201).json((newRow as any[])[0]);
    } catch (error: any) {
      await connection.rollback();
      connection.release();
      res.status(500).json({ message: "Error al crear item", error: error.message });
    }
  }
);

// @desc    Update an item
// @route   PUT /api/items/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { codigo, descripcion, tipo_item, precio, stock_actual, detalle } = req.body;

    if (!codigo || !descripcion || !tipo_item || precio === undefined) {
      res.status(400).json({ message: "Código, descripción, tipo y precio son requeridos" });
      return;
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Verificar si item existe
      const [existingItemRows] = await connection.query("SELECT * FROM items_taller WHERE id_item = ?", [id]);
      const oldItem = (existingItemRows as any[])[0];
      if (!oldItem) {
        res.status(404).json({ message: "Item no encontrado" });
        await connection.rollback();
        connection.release();
        return;
      }

      // Verificar si código ya existe excluyendo el actual
      const [existingCode] = await connection.query("SELECT id_item FROM items_taller WHERE codigo = ? AND id_item != ?", [codigo, id]);
      if ((existingCode as any[]).length > 0) {
        res.status(400).json({ message: "Ya existe otro item con este código" });
        await connection.rollback();
        connection.release();
        return;
      }

      // 1. Actualizar items_taller
      await connection.query(
        "UPDATE items_taller SET codigo = ?, descripcion = ?, tipo_item = ? WHERE id_item = ?",
        [codigo, descripcion, tipo_item, id]
      );

      // 2. Gestionar tablas secundarias
      if (oldItem.tipo_item === tipo_item) {
        // No cambió el tipo
        if (tipo_item === "REPUESTO") {
          const stock = stock_actual !== undefined ? stock_actual : 0;
          await connection.query(
            "INSERT INTO repuestos (id_item, precio_venta, stock_actual) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE precio_venta = ?, stock_actual = ?",
            [id, precio, stock, precio, stock]
          );
        } else {
          await connection.query(
            "INSERT INTO servicios (id_item, precio_base) VALUES (?, ?) ON DUPLICATE KEY UPDATE precio_base = ?",
            [id, precio, precio]
          );
        }
      } else {
        // Cambió el tipo (de REPUESTO a SERVICIO o viceversa)
        const [detalles] = await connection.query("SELECT COUNT(*) as count FROM detalles_proforma WHERE id_item = ?", [id]);
        if ((detalles as any)[0].count > 0) {
          res.status(400).json({ message: "No se puede cambiar el tipo de item porque está registrado en una o más proformas" });
          await connection.rollback();
          connection.release();
          return;
        }

        if (tipo_item === "REPUESTO") {
          // De SERVICIO a REPUESTO: borrar servicio, insertar repuesto
          await connection.query("DELETE FROM servicios WHERE id_item = ?", [id]);
          await connection.query(
            "INSERT INTO repuestos (id_item, precio_venta, stock_actual) VALUES (?, ?, ?)",
            [id, precio, stock_actual || 0]
          );
        } else {
          // De REPUESTO a SERVICIO: borrar repuesto, insertar servicio
          await connection.query("DELETE FROM repuestos WHERE id_item = ?", [id]);
          await connection.query(
            "INSERT INTO servicios (id_item, precio_base) VALUES (?, ?)",
            [id, precio]
          );
        }
      }

      // 3. Gestionar explicación / detalle extendido
      if (detalle !== undefined) {
        const trimmed = String(detalle).trim();
        if (trimmed) {
          await connection.query(
            "INSERT INTO explicaciones_items (id_item, descripcion_detallada) VALUES (?, ?) ON DUPLICATE KEY UPDATE descripcion_detallada = VALUES(descripcion_detallada)",
            [id, trimmed]
          );
        } else {
          await connection.query("DELETE FROM explicaciones_items WHERE id_item = ?", [id]);
        }
      }

      await connection.commit();
      connection.release();

      const [updatedRow] = await pool.query(
        `SELECT i.id_item, i.codigo, i.descripcion, i.tipo_item,
                COALESCE(s.precio_base, r.precio_venta, 0) as precio,
                r.stock_actual,
                ei.descripcion_detallada as detalle
         FROM items_taller i
         LEFT JOIN servicios s ON i.id_item = s.id_item
         LEFT JOIN repuestos r ON i.id_item = r.id_item
         LEFT JOIN explicaciones_items ei ON i.id_item = ei.id_item
         WHERE i.id_item = ?`,
        [id]
      );

      res.json((updatedRow as any[])[0]);
    } catch (error: any) {
      await connection.rollback();
      connection.release();
      res.status(500).json({ message: "Error al actualizar item", error: error.message });
    }
  }
);

// @desc    Delete an item
// @route   DELETE /api/items/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [itemRows] = await pool.query("SELECT * FROM items_taller WHERE id_item = ?", [id]);
      if ((itemRows as any[]).length === 0) {
        res.status(404).json({ message: "Item no encontrado" });
        return;
      }

      // Validar si tiene proformas asociadas
      const [detalles] = await pool.query("SELECT COUNT(*) as count FROM detalles_proforma WHERE id_item = ?", [id]);
      if ((detalles as any)[0].count > 0) {
        res.status(400).json({ message: "No se puede eliminar el item porque está registrado en una o más proformas" });
        return;
      }

      // Al borrar de items_taller se borrará de repuestos y servicios por CASCADE
      await pool.query("DELETE FROM items_taller WHERE id_item = ?", [id]);
      res.json({ message: "Item eliminado correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar item", error: error.message });
    }
  }
);

export default router;
