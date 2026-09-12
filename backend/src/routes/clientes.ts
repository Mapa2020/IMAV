import { Router, Response } from "express";
import pool from "../config/db.js";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";

const router = Router();

// @desc    Get all clients with optional search
// @route   GET /api/clients
// @access  Public
router.get("/", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { query } = req.query;

  try {
    let sql = "SELECT * FROM clientes";
    const params: any[] = [];

    if (query) {
      sql += " WHERE nombre LIKE ? OR ci LIKE ? OR nit LIKE ? OR pasaporte LIKE ? OR telefono LIKE ?";
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    sql += " ORDER BY id_cliente DESC";

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar clientes", error: error.message });
  }
});

// @desc    Get client by ID with their vehicles
// @route   GET /api/clients/:id
// @access  Public
router.get("/:id", protect, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const [clientRows] = await pool.query(
      "SELECT * FROM clientes WHERE id_cliente = ?",
      [id]
    );

    const client = (clientRows as any[])[0];

    if (!client) {
      res.status(404).json({ message: "Cliente no encontrado" });
      return;
    }

    // Obtener los vehículos del cliente
    const [vehicleRows] = await pool.query(
      "SELECT * FROM vehiculos WHERE id_cliente = ?",
      [id]
    );

    res.json({
      ...client,
      vehiculos: vehicleRows,
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error al obtener cliente", error: error.message });
  }
});

// @desc    Create a client
// @route   POST /api/clients
// @access  Private (Editor, Admin)
router.post(
  "/",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { tipo_cliente, nombre, telefono, direccion, nit, ci, pasaporte, pais_origen } = req.body;

    if (!nombre || !String(nombre).trim()) {
      res.status(400).json({ message: "El nombre del cliente es obligatorio" });
      return;
    }

    const cleanTipoCliente = tipo_cliente || "CI";
    const cleanNombre = String(nombre).trim();
    const cleanTelefono = telefono && String(telefono).trim() && String(telefono).trim() !== "+591" ? String(telefono).trim() : null;
    const cleanDireccion = direccion && String(direccion).trim() ? String(direccion).trim() : null;
    const cleanNit = nit && String(nit).trim() ? String(nit).trim() : null;
    const cleanCi = ci && String(ci).trim() ? String(ci).trim() : null;
    const cleanPasaporte = pasaporte && String(pasaporte).trim() ? String(pasaporte).trim() : null;
    const cleanPaisOrigen = pais_origen && String(pais_origen).trim() ? String(pais_origen).trim() : null;

    try {
      // Verificar si ya existe CI / NIT / Pasaporte (solo si se ingresó un documento no nulo)
      if (cleanCi) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE ci = ?", [cleanCi]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe un cliente registrado con este CI" });
          return;
        }
      }
      if (cleanNit) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE nit = ?", [cleanNit]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe un cliente registrado con este NIT" });
          return;
        }
      }
      if (cleanPasaporte) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE pasaporte = ?", [cleanPasaporte]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe un cliente registrado con este Pasaporte" });
          return;
        }
      }

      const [result] = await pool.query(
        "INSERT INTO clientes (tipo_cliente, nombre, telefono, direccion, nit, ci, pasaporte, pais_origen) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          cleanTipoCliente,
          cleanNombre,
          cleanTelefono,
          cleanDireccion,
          cleanNit,
          cleanCi,
          cleanPasaporte,
          cleanPaisOrigen,
        ]
      );

      const newClientId = (result as any).insertId;
      const [newClient] = await pool.query("SELECT * FROM clientes WHERE id_cliente = ?", [newClientId]);

      res.status(201).json((newClient as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al crear cliente", error: error.message });
    }
  }
);

// @desc    Update a client
// @route   PUT /api/clients/:id
// @access  Private (Editor, Admin)
router.put(
  "/:id",
  protect,
  authorize("ADMINISTRADOR", "USUARIO"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;
    const { tipo_cliente, nombre, telefono, direccion, nit, ci, pasaporte, pais_origen } = req.body;

    if (!nombre || !String(nombre).trim()) {
      res.status(400).json({ message: "El nombre del cliente es obligatorio" });
      return;
    }

    const cleanTipoCliente = tipo_cliente || "CI";
    const cleanNombre = String(nombre).trim();
    const cleanTelefono = telefono && String(telefono).trim() && String(telefono).trim() !== "+591" ? String(telefono).trim() : null;
    const cleanDireccion = direccion && String(direccion).trim() ? String(direccion).trim() : null;
    const cleanNit = nit && String(nit).trim() ? String(nit).trim() : null;
    const cleanCi = ci && String(ci).trim() ? String(ci).trim() : null;
    const cleanPasaporte = pasaporte && String(pasaporte).trim() ? String(pasaporte).trim() : null;
    const cleanPaisOrigen = pais_origen && String(pais_origen).trim() ? String(pais_origen).trim() : null;

    try {
      const [clientRows] = await pool.query("SELECT * FROM clientes WHERE id_cliente = ?", [id]);
      if ((clientRows as any[]).length === 0) {
        res.status(404).json({ message: "Cliente no encontrado" });
        return;
      }

      // Verificar si ya existe CI / NIT / Pasaporte en otro cliente distinto
      if (cleanCi) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE ci = ? AND id_cliente != ?", [cleanCi, id]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe otro cliente registrado con este CI" });
          return;
        }
      }
      if (cleanNit) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE nit = ? AND id_cliente != ?", [cleanNit, id]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe otro cliente registrado con este NIT" });
          return;
        }
      }
      if (cleanPasaporte) {
        const [existing] = await pool.query("SELECT id_cliente FROM clientes WHERE pasaporte = ? AND id_cliente != ?", [cleanPasaporte, id]);
        if ((existing as any[]).length > 0) {
          res.status(400).json({ message: "Ya existe otro cliente registrado con este Pasaporte" });
          return;
        }
      }

      await pool.query(
        "UPDATE clientes SET tipo_cliente = ?, nombre = ?, telefono = ?, direccion = ?, nit = ?, ci = ?, pasaporte = ?, pais_origen = ? WHERE id_cliente = ?",
        [
          cleanTipoCliente,
          cleanNombre,
          cleanTelefono,
          cleanDireccion,
          cleanNit,
          cleanCi,
          cleanPasaporte,
          cleanPaisOrigen,
          id,
        ]
      );

      const [updatedClient] = await pool.query("SELECT * FROM clientes WHERE id_cliente = ?", [id]);
      res.json((updatedClient as any[])[0]);
    } catch (error: any) {
      res.status(500).json({ message: "Error al actualizar cliente", error: error.message });
    }
  }
);

// @desc    Delete a client
// @route   DELETE /api/clients/:id
// @access  Private (Admin only)
router.delete(
  "/:id",
  protect,
  authorize("ADMINISTRADOR"),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
      const [clientRows] = await pool.query("SELECT * FROM clientes WHERE id_cliente = ?", [id]);
      if ((clientRows as any[]).length === 0) {
        res.status(404).json({ message: "Cliente no encontrado" });
        return;
      }

      // Verificar si el cliente tiene vehículos asociados
      const [vehicles] = await pool.query("SELECT COUNT(*) as count FROM vehiculos WHERE id_cliente = ?", [id]);
      if ((vehicles as any)[0].count > 0) {
        res.status(400).json({ message: "No se puede eliminar el cliente porque tiene vehículos asociados" });
        return;
      }

      await pool.query("DELETE FROM clientes WHERE id_cliente = ?", [id]);
      res.json({ message: "Cliente eliminado correctamente" });
    } catch (error: any) {
      res.status(500).json({ message: "Error al eliminar cliente", error: error.message });
    }
  }
);

export default router;
