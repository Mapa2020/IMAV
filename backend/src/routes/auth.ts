import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { protect, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey_imav_motor_2026";

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post("/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ message: "Por favor, ingrese usuario y contraseña" });
    return;
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE username = ?",
      [username]
    );

    const user = (rows as any[])[0];

    if (user && (await bcrypt.compare(password, user.password))) {
      // Generar token JWT
      const token = jwt.sign(
        {
          id_usuario: user.id_usuario,
          username: user.username,
          rol: user.rol,
          nombre_completo: user.nombre_completo,
        },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      res.json({
        token,
        usuario: {
          id_usuario: user.id_usuario,
          username: user.username,
          rol: user.rol,
          nombre_completo: user.nombre_completo,
        },
      });
      return;
    } else {
      res.status(401).json({ message: "Usuario o contraseña incorrectos" });
      return;
    }
  } catch (error: any) {
    res.status(500).json({ message: "Error en el servidor", error: error.message });
    return;
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get("/me", protect, (req: AuthenticatedRequest, res: Response) => {
  res.json({ usuario: req.user });
});

export default router;
