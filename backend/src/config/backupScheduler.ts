import fs from "fs";
import path from "path";
import pool from "./db.js";

// Helper to generate SQL dump of the database
export async function generateBackupSQL(): Promise<string> {
  const connection = await pool.getConnection();
  try {
    let sqlDump = `-- IMAV MOTOR S.R.L. DATABASE BACKUP\n`;
    sqlDump += `-- Date: ${new Date().toISOString()}\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    const [tablesResult] = await connection.query("SHOW TABLES");
    const tables = (tablesResult as any[]).map(row => Object.values(row)[0] as string);

    for (const table of tables) {
      sqlDump += `-- Table structure for table \`${table}\`\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;

      const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${table}\``);
      const createTableSQL = (createTableResult as any[])[0]["Create Table"];
      sqlDump += `${createTableSQL};\n\n`;

      sqlDump += `-- Dumping data for table \`${table}\`\n`;
      const [rowsResult] = await connection.query(`SELECT * FROM \`${table}\``);
      const rows = rowsResult as any[];

      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map(col => `\`${col}\``).join(", ");
        sqlDump += `INSERT INTO \`${table}\` (${columns}) VALUES\n`;

        const valuesLines = rows.map(row => {
          const vals = Object.values(row).map(val => {
            if (val === null) return "NULL";
            if (typeof val === "number") return val;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            const escaped = String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
            return `'${escaped}'`;
          }).join(", ");
          return `(${vals})`;
        });

        sqlDump += valuesLines.join(",\n") + ";\n\n";
      } else {
        sqlDump += `-- No data found for \`${table}\`\n\n`;
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    return sqlDump;
  } finally {
    connection.release();
  }
}

// Function to run backup and then clean up old records
export async function runBackupAndCleanup() {
  console.log("Iniciando copia de seguridad y limpieza de base de datos...");
  const backupDir = path.resolve("backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Generate Backup SQL
  const sqlDump = await generateBackupSQL();
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `backup-${dateStr}-${Date.now()}.sql`;
  const filePath = path.join(backupDir, fileName);
  fs.writeFileSync(filePath, sqlDump, "utf8");
  console.log(`Copia de seguridad guardada en: ${filePath}`);

  // 2. Perform Cleanup (Delete records older than 365 days)
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [oldProformas] = await connection.query(
      "SELECT id_proforma, id_ingreso FROM proformas WHERE fecha_emision <= NOW() - INTERVAL 365 DAY"
    );
    const proformaIds = (oldProformas as any[]).map((p) => p.id_proforma);
    const ingresoIds = (oldProformas as any[]).map((p) => p.id_ingreso).filter(Boolean);

    let deletedCount = 0;
    if (proformaIds.length > 0) {
      // Delete details first
      await connection.query(
        `DELETE FROM detalles_proforma WHERE id_proforma IN (${proformaIds.join(",")})`
      );

      // Delete proformas
      const [profDeleteResult] = await connection.query(
        `DELETE FROM proformas WHERE id_proforma IN (${proformaIds.join(",")})`
      );
      deletedCount = (profDeleteResult as any).affectedRows || 0;

      // Delete ingresos
      if (ingresoIds.length > 0) {
        await connection.query(
          `DELETE FROM ingresos_taller WHERE id_ingreso IN (${ingresoIds.join(",")})`
        );
      }
    }

    await connection.commit();
    console.log(`Limpieza completada. Se eliminaron ${deletedCount} proformas antiguas.`);
    return { fileName, deletedCount };
  } catch (err: any) {
    await connection.rollback();
    console.error("Error durante la limpieza de la base de datos:", err.message);
    throw err;
  } finally {
    connection.release();
  }
}

// Persisted scheduler check
export async function checkAndRunScheduledCleanup() {
  try {
    const backupDir = path.resolve("backups");
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = fs.readdirSync(backupDir).filter(f => f.startsWith("backup-") && f.endsWith(".sql"));
    let shouldRun = false;

    if (files.length === 0) {
      console.log("No se encontraron respaldos previos. Programando respaldo inicial...");
      shouldRun = true;
    } else {
      let latestTime = 0;
      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtimeMs > latestTime) {
          latestTime = stats.mtimeMs;
        }
      }

      const diffMs = Date.now() - latestTime;
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      if (diffMs >= thirtyDaysMs) {
        console.log(`El último respaldo fue hace ${Math.round(diffMs / (24 * 60 * 60 * 1000))} días. Ejecutando respaldo automático...`);
        shouldRun = true;
      }
    }

    if (shouldRun) {
      await runBackupAndCleanup();
    }
  } catch (err: any) {
    console.error("Error en la ejecución programada de respaldos:", err.message);
  }
}

// Start the daily checker interval
export function startBackupScheduler() {
  // Run check on start
  checkAndRunScheduledCleanup();

  // Run check every 24 hours
  setInterval(() => {
    checkAndRunScheduledCleanup();
  }, 24 * 60 * 60 * 1000);
}
