import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get all vehicles with optional search/filtering
// @route   GET /api/vehicles
// @access  Public
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query, id_cliente } = req.query;

  try {
    let sql = `
      SELECT v.*, c.nombre as nombre_cliente, c.telefono as telefono_cliente 
      FROM vehiculos v 
      JOIN clientes c ON v.id_cliente = c.id_cliente
    `;
    const params: any[] = [];

    const conditions: string[] = [];

    if (id_cliente) {
      conditions.push("v.id_cliente = ?");
      params.push(id_cliente);
    }

    if (query) {
      conditions.push("(v.placa LIKE ? OR v.marca LIKE ? OR v.modelo LIKE ? OR c.nombre LIKE ?)");
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY v.id_vehiculo DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar vehículos", error: error.message });
  }
});

// @desc    Get vehicle by plate (fast lookup)
// @route   GET /api/vehicles/plate/:plate
// @access  Public
router.get("/plate/:plate", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { plate } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT v.*, c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.ci as ci_cliente, c.nit as nit_cliente, c.tipo_cliente
      FROM vehiculos v
      JOIN clientes c ON v.id_cliente = c.id_cliente
      WHERE v.placa = ?
      `,
      [plate]
    );

    const vehicle = (rows as any[])[0];

    if (!vehicle) {
      res.status(404).json({ message: "Vehículo no encontrado por placa" });
      return;
    }

    res.json(vehicle);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener vehículo por placa", error: error.message });
  }
});

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
// @access  Public
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `
      SELECT v.*, c.nombre as nombre_cliente, c.telefono as telefono_cliente 
      FROM vehiculos v 
      JOIN clientes c ON v.id_cliente = c.id_cliente
      WHERE v.id_vehiculo = ?
      `,
      [id]
    );

    const vehicle = (rows as any[])[0];

    if (!vehicle) {
      res.status(404).json({ message: "Vehículo no encontrado" });
      return;
    }

    res.json(vehicle);
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener vehículo", error: error.message });
  }
});

// @desc    Create a vehicle
// @route   POST /api/vehicles
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id_cliente, placa, marca, modelo, anio, color } = req.body;

    if (!id_cliente || !placa || !marca || !modelo) {
      res.status(400).json({ message: "Cliente, placa, marca y modelo son obligatorios" });
      return;
    }

    try {
      // Verificar si la placa ya está registrada
      const [existing] = await pool.query("SELECT id_vehiculo FROM vehiculos WHERE placa = ?", [placa]);
      if ((existing as any[]).length > 0) {
        res.status(400).json({ message: "Ya existe un vehículo registrado con esta placa" });
        return;
      }

      // Verificar que el cliente existe
      const [client] = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = ?", [id_cliente]);
      if ((client as any[]).length === 0) {
        res.status(400).json({ message: "Cliente asociado no existe" });
        return;
      }

      const [result] = await pool.query(
        "INSERT INTO vehiculos (id_cliente, placa, marca, modelo, anio, color) VALUES (?, ?, ?, ?, ?, ?)",
        [
          id_cliente,
          placa.toUpperCase(),
          marca,
          modelo,
          anio ? parseInt(anio) : null,
          color || null,
        ]
      );

      const newVehicleId = (result as any).insertId;
      const [newVehicle] = await pool.query("SELECT * FROM vehiculos WHERE id_vehiculo = ?", [newVehicleId]);

      res.status(201).json((newVehicle as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al registrar vehículo", error: error.message });
    }
  }
);

// @desc    Update a vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { id_cliente, placa, marca, modelo, anio, color } = req.body;

    if (!id_cliente || !placa || !marca || !modelo) {
      res.status(400).json({ message: "Cliente, placa, marca y modelo son obligatorios" });
      return;
    }

    try {
      const [vehicleRows] = await pool.query("SELECT * FROM vehiculos WHERE id_vehiculo = ?", [id]);
      if ((vehicleRows as any[]).length === 0) {
        res.status(404).json({ message: "Vehículo no encontrado" });
        return;
      }

      // Verificar que el cliente existe
      const [client] = await pool.query("SELECT id_cliente FROM clientes WHERE id_cliente = ?", [id_cliente]);
      if ((client as any[]).length === 0) {
        res.status(400).json({ message: "Cliente asociado no existe" });
        return;
      }

      await pool.query(
        "UPDATE vehiculos SET id_cliente = ?, placa = ?, marca = ?, modelo = ?, anio = ?, color = ? WHERE id_vehiculo = ?",
        [
          id_cliente,
          placa.toUpperCase(),
          marca,
          modelo,
          anio ? parseInt(anio) : null,
          color || null,
          id,
        ]
      );

      const [updatedVehicle] = await pool.query("SELECT * FROM vehiculos WHERE id_vehiculo = ?", [id]);
      res.json((updatedVehicle as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar vehículo", error: error.message });
    }
  }
);

// @desc    Delete a vehicle
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [vehicleRows] = await pool.query("SELECT * FROM vehiculos WHERE id_vehiculo = ?", [id]);
      if ((vehicleRows as any[]).length === 0) {
        res.status(404).json({ message: "Vehículo no encontrado" });
        return;
      }

      // Verificar si el vehículo tiene recepciones/ingresos asociados
      const [ingresos] = await pool.query("SELECT COUNT(*) as count FROM ingresos_taller WHERE id_vehiculo = ?", [id]);
      if ((ingresos as any)[0].count > 0) {
        res.status(400).json({ message: "No se puede eliminar el vehículo porque tiene ingresos registrados en el taller" });
        return;
      }

      await pool.query("DELETE FROM vehiculos WHERE id_vehiculo = ?", [id]);
      res.json({ message: "Vehículo eliminado correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar vehículo", error: error.message });
    }
  }
);

export default router;
