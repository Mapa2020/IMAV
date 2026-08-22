import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { dbInitAndSeed } from "./config/seed.js";
import authRoutes from "./routes/auth.js";
import clientRoutes from "./routes/clientes.js";
import vehicleRoutes from "./routes/vehiculos.js";
import receptionRoutes from "./routes/ingresos.js";
import proformaRoutes from "./routes/proformas.js";
import employeeRoutes from "./routes/empleados.js";
import itemRoutes from "./routes/items.js";
import backupRoutes from "./routes/backups.js";
import userRoutes from "./routes/usuarios.js";
import { startBackupScheduler } from "./config/backupScheduler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());

// Check and Seed Database
dbInitAndSeed();

// Start Backup Scheduler (Runs checks on startup and every 24h, doing backup/cleanup every 30 days)
startBackupScheduler();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/receptions", receptionRoutes);
app.use("/api/proformas", proformaRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/backups", backupRoutes);
app.use("/api/users", userRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled Error:", err.stack);
  res.status(500).json({
    message: "Ocurrió un error interno en el servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
