import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Search items (services/repuestos) from items_taller
// @route   GET /api/items
// @access  Public
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    let sql = `
      SELECT i.id_item, i.codigo, i.descripcion, i.tipo_item,
             COALESCE(s.precio_base, r.precio_venta, 0) as precio
      FROM items_taller i
      LEFT JOIN servicios s ON i.id_item = s.id_item
      LEFT JOIN repuestos r ON i.id_item = r.id_item
    `;
    const params: any[] = [];

    if (query) {
      sql += " WHERE i.descripcion LIKE ? OR i.codigo LIKE ?";
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm);
    }

    sql += " ORDER BY i.descripcion ASC LIMIT 20";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al buscar items", error: error.message });
  }
});

export default router;
