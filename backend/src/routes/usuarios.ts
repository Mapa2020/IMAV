import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get all users with linked employee details
// @route   GET /api/users
// @access  Private (Admin only)
router.get("/", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query(
      `
      SELECT u.id_usuario, u.username, u.nombre_completo, u.rol, u.id_empleado,
             e.nombre as nombre_empleado, e.paterno as paterno_empleado, e.rol as rol_empleado
      FROM usuarios u
      LEFT JOIN empleados e ON u.id_empleado = e.id_empleado
      ORDER BY u.id_usuario DESC
      `
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener usuarios", error: error.message });
  }
});

// @desc    Create a user
// @route   POST /api/users
// @access  Private (Admin only)
router.post("/", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { username, password, nombre_completo, rol, id_empleado } = req.body;

  if (!username || !password || !nombre_completo || !rol) {
    res.status(400).json({ message: "Por favor complete los campos obligatorios (usuario, contraseña, nombre completo, rol)" });
    return;
  }

  try {
    // Check if username already exists
    const [existing] = await pool.query("SELECT id_usuario FROM usuarios WHERE username = ?", [username]);
    if ((existing as any[]).length > 0) {
      res.status(400).json({ message: "El nombre de usuario ya está registrado" });
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      "INSERT INTO usuarios (username, password, nombre_completo, rol, id_empleado) VALUES (?, ?, ?, ?, ?)",
      [username, hashedPassword, nombre_completo, rol, id_empleado || null]
    );

    res.status(201).json({
      id_usuario: (result as any).insertId,
      message: "Usuario creado exitosamente",
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error al crear usuario", error: error.message });
  }
});

// @desc    Update a user
// @route   PUT /api/users/:id
// @access  Private (Admin only)
router.put("/:id", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { username, password, nombre_completo, rol, id_empleado } = req.body;

  if (!username || !nombre_completo || !rol) {
    res.status(400).json({ message: "Por favor complete los campos obligatorios (usuario, nombre completo, rol)" });
    return;
  }

  try {
    // Check if user exists
    const [userRows] = await pool.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ?", [id]);
    if ((userRows as any[]).length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    // Check if new username conflicts with another user
    const [existing] = await pool.query("SELECT id_usuario FROM usuarios WHERE username = ? AND id_usuario != ?", [username, id]);
    if ((existing as any[]).length > 0) {
      res.status(400).json({ message: "El nombre de usuario ya está en uso por otro registro" });
      return;
    }

    let query = "UPDATE usuarios SET username = ?, nombre_completo = ?, rol = ?, id_empleado = ?";
    const params = [username, nombre_completo, rol, id_empleado || null];

    // If password is changed, hash and update it
    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ", password = ?";
      params.push(hashedPassword);
    }

    query += " WHERE id_usuario = ?";
    params.push(id as any);

    await pool.query(query, params);
    res.json({ message: "Usuario actualizado exitosamente" });
  } catch (error: any) {
    res.status(500).json({ message: "Error al actualizar usuario", error: error.message });
  }
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
router.delete("/:id", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const currentUser = req.user;

  if (currentUser && currentUser.id_usuario === parseInt(id, 10)) {
    res.status(400).json({ message: "No puedes eliminar tu propia cuenta de usuario en sesión" });
    return;
  }

  try {
    const [existing] = await pool.query("SELECT id_usuario FROM usuarios WHERE id_usuario = ?", [id]);
    if ((existing as any[]).length === 0) {
      res.status(404).json({ message: "Usuario no encontrado" });
      return;
    }

    await pool.query("DELETE FROM usuarios WHERE id_usuario = ?", [id]);
    res.json({ message: "Usuario eliminado exitosamente" });
  } catch (error: any) {
    res.status(500).json({ message: "Error al eliminar usuario", error: error.message });
  }
});

export default router;
