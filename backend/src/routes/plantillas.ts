import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

export interface PlantillaDocumento {
  id_plantilla: number;
  tipo: "INFORME" | "CARTA";
  titulo: string;
  referencia: string;
  contenido: string;
  costo_estimado: number | null;
  created_at: string;
  updated_at: string;
}

// @desc    List all templates (optionally filtered by tipo or query)
// @route   GET /api/templates
// @access  Private
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { tipo, query } = req.query;

  try {
    let sql = "SELECT * FROM plantillas_documentos WHERE 1=1";
    const params: any[] = [];

    if (tipo) {
      const tipoUpper = (tipo as string).toUpperCase();
      if (tipoUpper === "INFORME" || tipoUpper === "CARTA") {
        sql += " AND tipo = ?";
        params.push(tipoUpper);
      }
    }

    if (query) {
      sql += " AND (titulo LIKE ? OR referencia LIKE ? OR contenido LIKE ?)";
      const term = `%${query}%`;
      params.push(term, term, term);
    }

    sql += " ORDER BY tipo ASC, id_plantilla ASC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar plantillas de documentos", error: error.message });
  }
});

// @desc    Get single template by ID
// @route   GET /api/templates/:id
// @access  Private
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM plantillas_documentos WHERE id_plantilla = ?", [id]);
    if ((rows as any[]).length === 0) {
      res.status(404).json({ message: "Plantilla no encontrada" });
      return;
    }
    res.json((rows as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener la plantilla", error: error.message });
  }
});

// @desc    Create new template
// @route   POST /api/templates
// @access  Private
router.post("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { tipo, titulo, referencia, contenido, costo_estimado } = req.body;

  if (!titulo || !referencia || !contenido) {
    res.status(400).json({ message: "Título, referencia y contenido son campos obligatorios" });
    return;
  }

  const validTipo = tipo?.toUpperCase() === "CARTA" ? "CARTA" : "INFORME";
  const cost = validTipo === "INFORME" && costo_estimado ? parseFloat(costo_estimado) : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO plantillas_documentos (tipo, titulo, referencia, contenido, costo_estimado)
       VALUES (?, ?, ?, ?, ?)`,
      [validTipo, titulo.trim(), referencia.trim(), contenido.trim(), cost]
    );

    const insertId = (result as any).insertId;
    const [created] = await pool.query("SELECT * FROM plantillas_documentos WHERE id_plantilla = ?", [insertId]);

    res.status(201).json((created as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Error al crear plantilla de documento", error: error.message });
  }
});

// @desc    Update existing template
// @route   PUT /api/templates/:id
// @access  Private
router.put("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { tipo, titulo, referencia, contenido, costo_estimado } = req.body;

  if (!titulo || !referencia || !contenido) {
    res.status(400).json({ message: "Título, referencia y contenido son campos obligatorios" });
    return;
  }

  const validTipo = tipo?.toUpperCase() === "CARTA" ? "CARTA" : "INFORME";
  const cost = validTipo === "INFORME" && costo_estimado ? parseFloat(costo_estimado) : null;

  try {
    const [existing] = await pool.query("SELECT id_plantilla FROM plantillas_documentos WHERE id_plantilla = ?", [id]);
    if ((existing as any[]).length === 0) {
      res.status(404).json({ message: "Plantilla no encontrada" });
      return;
    }

    await pool.query(
      `UPDATE plantillas_documentos 
       SET tipo = ?, titulo = ?, referencia = ?, contenido = ?, costo_estimado = ?
       WHERE id_plantilla = ?`,
      [validTipo, titulo.trim(), referencia.trim(), contenido.trim(), cost, id]
    );

    const [updated] = await pool.query("SELECT * FROM plantillas_documentos WHERE id_plantilla = ?", [id]);
    res.json((updated as any[])[0]);
  } catch (error: any) {
    res.status(500).json({ message: "Error al actualizar plantilla", error: error.message });
  }
});

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private
router.delete("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [existing] = await pool.query("SELECT id_plantilla FROM plantillas_documentos WHERE id_plantilla = ?", [id]);
    if ((existing as any[]).length === 0) {
      res.status(404).json({ message: "Plantilla no encontrada" });
      return;
    }

    await pool.query("DELETE FROM plantillas_documentos WHERE id_plantilla = ?", [id]);
    res.json({ message: "Plantilla eliminada correctamente", id_plantilla: parseInt(id, 10) });
  } catch (error: any) {
    res.status(500).json({ message: "Error al eliminar plantilla", error: error.message });
  }
});

export default router;
