import { Router, Response } from "express";
import fs from "fs";
import path from "path";
import { protect, authorize, AuthenticatedRequest } from "../middleware/authMiddleware.js";
import { runBackupAndCleanup } from "../config/backupScheduler.js";

const router = Router();

// @desc    Get all backups
// @route   GET /api/backups
// @access  Private (Admin only)
router.get("/", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const backupDir = path.resolve("backups");
    if (!fs.existsSync(backupDir)) {
      res.json([]);
      return;
    }

    const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".sql"));
    const backups = files.map(file => {
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      return {
        fileName: file,
        sizeBytes: stats.size,
        createdAt: stats.mtime,
      };
    });

    // Order by date descending
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ message: "Error al listar respaldos", error: error.message });
  }
});

// @desc    Download a backup file
// @route   GET /api/backups/download/:filename
// @access  Private (Admin only)
router.get("/download/:filename", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { filename } = req.params as { filename: string };
  try {
    const backupDir = path.resolve("backups");
    const filePath = path.join(backupDir, filename);

    // Prevent directory traversal vulnerability
    if (!filePath.startsWith(backupDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ message: "Archivo de respaldo no encontrado" });
      return;
    }

    res.download(filePath);
  } catch (error: any) {
    res.status(500).json({ message: "Error al descargar respaldo", error: error.message });
  }
});

// @desc    Trigger manual cleanup and backup
// @route   POST /api/backups/cleanup-and-backup
// @access  Private (Admin only)
router.post("/cleanup-and-backup", protect, authorize("ADMINISTRADOR"), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await runBackupAndCleanup();
    res.status(201).json({
      message: "Respaldo y limpieza ejecutados con éxito manualmente",
      ...result
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error al ejecutar respaldo y limpieza", error: error.message });
  }
});

export default router;
