import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    List all brands or search by prefix/name
// @route   GET /api/brands
// @access  Public (protected with optional/token or protect)
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    let sql = `
      SELECT m.id_marca, m.nombre,
             COUNT(mod_v.id_modelo) as total_modelos
      FROM marcas_vehiculo m
      LEFT JOIN modelos_vehiculo mod_v ON m.id_marca = mod_v.id_marca
    `;
    const params: any[] = [];

    if (query && String(query).trim().length > 0) {
      sql += ` WHERE m.nombre LIKE ?`;
      params.push(`%${String(query).trim()}%`);
    }

    sql += ` GROUP BY m.id_marca, m.nombre ORDER BY m.nombre ASC`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar marcas", error: error.message });
  }
});

// @desc    Get models of a brand by brand ID
// @route   GET /api/brands/:id/models
// @access  Public
router.get("/:id/models", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT id_modelo, id_marca, nombre
       FROM modelos_vehiculo
       WHERE id_marca = ?
       ORDER BY nombre ASC`,
      [id]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar modelos de la marca", error: error.message });
  }
});

// @desc    Get models of a brand by brand name (case-insensitive)
// @route   GET /api/brands/by-name/:brandName/models
// @access  Public
router.get("/by-name/:brandName/models", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { brandName } = req.params;

  try {
    const cleanBrand = decodeURIComponent(String(brandName)).trim();
    const [rows] = await pool.query(
      `SELECT mod_v.id_modelo, mod_v.id_marca, mod_v.nombre
       FROM modelos_vehiculo mod_v
       JOIN marcas_vehiculo m ON mod_v.id_marca = m.id_marca
       WHERE LOWER(m.nombre) = LOWER(?)
       ORDER BY mod_v.nombre ASC`,
      [cleanBrand]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar modelos por nombre de marca", error: error.message });
  }
});

// @desc    Create a new brand
// @route   POST /api/brands
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { nombre } = req.body;

    if (!nombre || !String(nombre).trim()) {
      res.status(400).json({ message: "El nombre de la marca es requerido" });
      return;
    }

    const cleanNombre = String(nombre).trim();

    try {
      const [existing] = await pool.query("SELECT * FROM marcas_vehiculo WHERE LOWER(nombre) = LOWER(?)", [cleanNombre]);
      if ((existing as any[]).length > 0) {
        res.json((existing as any[])[0]);
        return;
      }

      const [result] = await pool.query("INSERT INTO marcas_vehiculo (nombre) VALUES (?)", [cleanNombre]);
      const newId = (result as any).insertId;

      res.status(201).json({ id_marca: newId, nombre: cleanNombre });
    } catch (error: any) {
      res.status(500).json({ message: "Error al registrar marca", error: error.message });
    }
  }
);

// @desc    Create a new model for a brand
// @route   POST /api/brands/:id/models
// @access  Private (Editor, Admin)
router.post(
  "/:id/models",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { nombre } = req.body;

    if (!nombre || !String(nombre).trim()) {
      res.status(400).json({ message: "El nombre del modelo es requerido" });
      return;
    }

    const cleanNombre = String(nombre).trim();

    try {
      const [brand] = await pool.query("SELECT * FROM marcas_vehiculo WHERE id_marca = ?", [id]);
      if ((brand as any[]).length === 0) {
        res.status(404).json({ message: "Marca no encontrada" });
        return;
      }

      const [existing] = await pool.query(
        "SELECT * FROM modelos_vehiculo WHERE id_marca = ? AND LOWER(nombre) = LOWER(?)",
        [id, cleanNombre]
      );
      if ((existing as any[]).length > 0) {
        res.json((existing as any[])[0]);
        return;
      }

      const [result] = await pool.query(
        "INSERT INTO modelos_vehiculo (id_marca, nombre) VALUES (?, ?)",
        [id, cleanNombre]
      );
      const newId = (result as any).insertId;

      res.status(201).json({ id_modelo: newId, id_marca: parseInt(String(id), 10), nombre: cleanNombre });
    } catch (error: any) {
      res.status(500).json({ message: "Error al registrar modelo", error: error.message });
    }
  }
);

export default router;
