import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get employees (with optional search and active filter)
// @route   GET /api/employees
// @access  Private (Registered users)
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query, activeOnly, rol } = req.query;

  try {
    let sql = "SELECT id_empleado, ci, nombre, paterno, materno, telefono, rol, estado FROM empleados WHERE 1=1";
    const params: any[] = [];

    if (activeOnly === "true") {
      sql += " AND estado = 'ACTIVO'";
    }

    if (rol) {
      sql += " AND rol = ?";
      params.push(rol);
    }

    if (query) {
      sql += " AND (nombre LIKE ? OR paterno LIKE ? OR materno LIKE ? OR ci LIKE ? OR telefono LIKE ?)";
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY nombre ASC, paterno ASC";

    const [rows] = await pool.query(sql, params);
    
    // Formatear para que devuelva un nombre completo amigable
    const formatted = (rows as any[]).map((e) => ({
      id_empleado: e.id_empleado,
      ci: e.ci,
      nombre: e.nombre,
      paterno: e.paterno,
      materno: e.materno,
      telefono: e.telefono,
      rol: e.rol,
      estado: e.estado,
      nombre_completo: `${e.rol === "RECEPCIONISTA" ? "Receptor" : e.rol === "MECANICO" ? "Mec." : "Admin"} ${e.nombre} ${e.paterno}`,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar empleados", error: error.message });
  }
});

// @desc    Get employee by ID
// @route   GET /api/employees/:id
// @access  Private
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query("SELECT * FROM empleados WHERE id_empleado = ?", [id]);
    const employee = (rows as any[])[0];

    if (!employee) {
      res.status(404).json({ message: "Empleado no encontrado" });
      return;
    }

    res.json(employee);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener empleado", error: error.message });
  }
});

// @desc    Create employee
// @route   POST /api/employees
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { ci, nombre, paterno, materno, telefono, rol, estado } = req.body;

    if (!ci || !nombre || !paterno || !rol) {
      res.status(400).json({ message: "CI, nombre, paterno y rol son requeridos" });
      return;
    }

    try {
      // Validar CI único
      const [existing] = await pool.query("SELECT id_empleado FROM empleados WHERE ci = ?", [ci]);
      if ((existing as any[]).length > 0) {
        res.status(400).json({ message: "Ya existe un empleado registrado con este CI" });
        return;
      }

      const [result] = await pool.query(
        "INSERT INTO empleados (ci, nombre, paterno, materno, telefono, rol, estado) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [ci, nombre, paterno, materno || null, telefono || null, rol, estado || "ACTIVO"]
      );

      const newId = (result as any).insertId;
      const [newRow] = await pool.query("SELECT * FROM empleados WHERE id_empleado = ?", [newId]);

      res.status(201).json((newRow as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al crear empleado", error: error.message });
    }
  }
);

// @desc    Update employee
// @route   PUT /api/employees/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { ci, nombre, paterno, materno, telefono, rol, estado } = req.body;

    if (!ci || !nombre || !paterno || !rol) {
      res.status(400).json({ message: "CI, nombre, paterno y rol son requeridos" });
      return;
    }

    try {
      const [employeeRows] = await pool.query("SELECT * FROM empleados WHERE id_empleado = ?", [id]);
      if ((employeeRows as any[]).length === 0) {
        res.status(404).json({ message: "Empleado no encontrado" });
        return;
      }

      // Validar CI único excluyendo el actual
      const [existing] = await pool.query("SELECT id_empleado FROM empleados WHERE ci = ? AND id_empleado != ?", [ci, id]);
      if ((existing as any[]).length > 0) {
        res.status(400).json({ message: "Ya existe otro empleado registrado con este CI" });
        return;
      }

      await pool.query(
        "UPDATE empleados SET ci = ?, nombre = ?, paterno = ?, materno = ?, telefono = ?, rol = ?, estado = ? WHERE id_empleado = ?",
        [ci, nombre, paterno, materno || null, telefono || null, rol, estado, id]
      );

      const [updatedRow] = await pool.query("SELECT * FROM empleados WHERE id_empleado = ?", [id]);
      res.json((updatedRow as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar empleado", error: error.message });
    }
  }
);

// @desc    Delete employee
// @route   DELETE /api/employees/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [employeeRows] = await pool.query("SELECT * FROM empleados WHERE id_empleado = ?", [id]);
      if ((employeeRows as any[]).length === 0) {
        res.status(404).json({ message: "Empleado no encontrado" });
        return;
      }

      // Validar si tiene ingresos asociados
      const [ingresosReceptor] = await pool.query("SELECT COUNT(*) as count FROM ingresos_taller WHERE id_empleado_receptor = ?", [id]);
      const [ingresosMecanico] = await pool.query("SELECT COUNT(*) as count FROM ingresos_taller WHERE id_mecanico_asignado = ?", [id]);
      const [usuariosAsociados] = await pool.query("SELECT COUNT(*) as count FROM usuarios WHERE id_empleado = ?", [id]);

      const countReceptor = (ingresosReceptor as any)[0].count;
      const countMecanico = (ingresosMecanico as any)[0].count;
      const countUsuarios = (usuariosAsociados as any)[0].count;

      if (countReceptor > 0 || countMecanico > 0 || countUsuarios > 0) {
        res.status(400).json({
          message: "No se puede eliminar el empleado porque tiene registros asociados (ingresos de taller o usuario). Le sugerimos cambiar su estado a INACTIVO.",
        });
        return;
      }

      await pool.query("DELETE FROM empleados WHERE id_empleado = ?", [id]);
      res.json({ message: "Empleado eliminado correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar empleado", error: error.message });
    }
  }
);

export default router;

