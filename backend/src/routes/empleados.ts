import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get all active employees (receptionists or mechanics)
// @route   GET /api/employees
// @access  Public (for filling dropdowns)
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { rol } = req.query;

  try {
    let sql = "SELECT id_empleado, ci, nombre, paterno, materno, telefono, rol FROM empleados WHERE estado = 'ACTIVO'";
    const params: any[] = [];

    if (rol) {
      sql += " AND rol = ?";
      params.push(rol);
    }

    sql += " ORDER BY nombre ASC";

    const [rows] = await pool.query(sql, params);
    
    // Formatear para que devuelva un nombre completo amigable para dropdowns
    const formatted = (rows as any[]).map((e) => ({
      id_empleado: e.id_empleado,
      ci: e.ci,
      nombre: e.nombre,
      paterno: e.paterno,
      materno: e.materno,
      telefono: e.telefono,
      rol: e.rol,
      nombre_completo: `${e.rol === "RECEPCIONISTA" ? "Receptor" : "Mec."} ${e.nombre} ${e.paterno}`,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar empleados", error: error.message });
  }
});

export default router;
