import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import pool from "./db.js";

// Helper to check if database exists, create it, check if tables exist and seed default data
export async function dbInitAndSeed() {
  console.log("Iniciando verificación e inicialización de la base de datos...");
  let connection;
  try {
    // Primero, crear una conexión temporal sin base de datos para asegurar que existe la BD
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: parseInt(process.env.DB_PORT || "3306", 10),
    });

    const dbName = process.env.DB_NAME || "bd_imav";
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await tempConnection.end();
    console.log(`Base de datos '${dbName}' verificada/creada.`);

    connection = await pool.getConnection();

    // 1. Verificar si existen las tablas primarias. Si no, las creamos leyendo init..sql
    const [tables] = await connection.query("SHOW TABLES");
    const tableList = (tables as any[]).map((t) => Object.values(t)[0] as string);
    
    if (tableList.length === 0) {
      console.log("No se encontraron tablas. Creando estructura desde init..sql...");
      
      // Intentar leer init..sql
      // Buscamos en data_base/init..sql a nivel del proyecto
      const sqlPath = path.resolve("..", "data_base", "init..sql");
      if (fs.existsSync(sqlPath)) {
        const sqlContent = fs.readFileSync(sqlPath, "utf8");
        
        // Quitar comentarios y separar por punto y coma
        const sqlStatements = sqlContent
          .split("\n")
          // Quitar lineas que empiezan con -- o /*
          .filter((line) => !line.trim().startsWith("--") && !line.trim().startsWith("/*"))
          .join("\n")
          .split(";")
          .map((stmt) => stmt.trim())
          .filter((stmt) => stmt.length > 0);

        // Desactivar temporalmente la verificación de llaves foráneas para evitar problemas de orden al crear tablas
        await connection.query("SET FOREIGN_KEY_CHECKS = 0");
        for (const statement of sqlStatements) {
          try {
            await connection.query(statement);
          } catch (err: any) {
            // Omitir advertencias de dumps o SETs menores, pero loguear errores graves
            if (!statement.toLowerCase().startsWith("set ")) {
              console.warn(`Error ejecutando sentencia SQL: ${err.message}`);
            }
          }
        }
        await connection.query("SET FOREIGN_KEY_CHECKS = 1");
        console.log("Estructura de base de datos creada exitosamente.");
      } else {
        throw new Error(`No se encontró el archivo init..sql en la ruta: ${sqlPath}`);
      }
    } else {
      console.log("Estructura de tablas detectada correctamente.");
      if (!tableList.includes("usuarios")) {
        console.log("Falta la tabla 'usuarios'. Creándola...");
        await connection.query(`
          CREATE TABLE \`usuarios\` (
            \`id_usuario\` int NOT NULL AUTO_INCREMENT,
            \`username\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
            \`password\` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
            \`nombre_completo\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
            \`rol\` enum('ADMINISTRADOR','USUARIO','LECTURA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'LECTURA',
            \`id_empleado\` int DEFAULT NULL,
            PRIMARY KEY (\`id_usuario\`),
            UNIQUE KEY \`uq_username\` (\`username\`),
            KEY \`id_empleado\` (\`id_empleado\`),
            CONSTRAINT \`fk_usuario_empleado\` FOREIGN KEY (\`id_empleado\`) REFERENCES \`empleados\` (\`id_empleado\`) ON DELETE SET NULL ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        console.log("Tabla 'usuarios' creada.");
      }
    }

    // Asegurar que el nombre del cliente soporte nombres de empresa largos (de 150 a 500 caracteres)
    try {
      await connection.query("ALTER TABLE clientes MODIFY COLUMN nombre VARCHAR(500) NOT NULL");
    } catch (alterErr) {
      console.warn("No se pudo ejecutar ALTER TABLE para clientes.nombre:", alterErr);
    }

    // Asegurar que la tabla proformas tenga la columna numero_proforma para el reinicio anual
    try {
      const [columns] = await connection.query("SHOW COLUMNS FROM proformas LIKE 'numero_proforma'");
      if ((columns as any[]).length === 0) {
        console.log("Agregando la columna 'numero_proforma' a la tabla proformas...");
        await connection.query("ALTER TABLE proformas ADD COLUMN numero_proforma INT DEFAULT NULL");
        console.log("Columna 'numero_proforma' agregada con éxito.");
      }
    } catch (err: any) {
      console.warn("No se pudo verificar o agregar numero_proforma a la tabla proformas:", err.message);
    }

    // 2. Sembrar Empleados si no existen
    const [empleados] = await connection.query("SELECT COUNT(*) as count FROM empleados");
    if ((empleados as any)[0].count === 0) {
      console.log("Sembrando empleados por defecto...");
      const defaultEmployees = [
        { ci: "111111", nombre: "Josue", paterno: "Avila", materno: "", telefono: "75020160", rol: "RECEPCIONISTA" },
        { ci: "222222", nombre: "Álvaro", paterno: "Vaca", materno: "", telefono: "75020161", rol: "RECEPCIONISTA" },
        { ci: "333333", nombre: "Daniel", paterno: "Rojas", materno: "", telefono: "75020162", rol: "RECEPCIONISTA" },
        { ci: "444444", nombre: "Javier", paterno: "Avila", materno: "", telefono: "75020163", rol: "RECEPCIONISTA" },
        { ci: "555555", nombre: "Alex", paterno: "Avila", materno: "", telefono: "75020164", rol: "RECEPCIONISTA" },
        { ci: "666666", nombre: "Carlos", paterno: "Perez", materno: "Marquez", telefono: "75020165", rol: "MECANICO" },
        { ci: "777777", nombre: "Marcos", paterno: "Soliz", materno: "Ortiz", telefono: "75020166", rol: "MECANICO" },
      ];

      for (const emp of defaultEmployees) {
        await connection.query(
          "INSERT INTO empleados (ci, nombre, paterno, materno, telefono, rol, estado) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVO')",
          [emp.ci, emp.nombre, emp.paterno, emp.materno, emp.telefono, emp.rol]
        );
      }
      console.log("Empleados sembrados.");
    }

    // 3. Sembrar Usuarios si no existen
    const [usuariosCount] = await connection.query("SELECT COUNT(*) as count FROM usuarios");
    if ((usuariosCount as any)[0].count === 0) {
      console.log("Sembrando usuarios de prueba...");
      
      // Obtener el primer receptor para vincularlo (Josue Avila)
      const [receptores] = await connection.query("SELECT id_empleado FROM empleados WHERE ci = '111111'");
      const idEmpleado = (receptores as any)[0]?.id_empleado || null;

      const adminPasswordHash = await bcrypt.hash("admin123", 10);
      const editorPasswordHash = await bcrypt.hash("editor123", 10);

      // Insertar administrador
      await connection.query(
        "INSERT INTO usuarios (username, password, nombre_completo, rol, id_empleado) VALUES (?, ?, ?, ?, ?)",
        ["admin", adminPasswordHash, "Administrador IMAV", "ADMINISTRADOR", null]
      );

      // Insertar usuario editor
      await connection.query(
        "INSERT INTO usuarios (username, password, nombre_completo, rol, id_empleado) VALUES (?, ?, ?, ?, ?)",
        ["editor", editorPasswordHash, "Editor IMAV", "USUARIO", idEmpleado]
      );
      console.log("Usuarios sembrados: admin (admin123) y editor (editor123).");
    }

    // 4. Sembrar Items de taller (servicios sugeridos) si no existen
    const [itemsCount] = await connection.query("SELECT COUNT(*) as count FROM items_taller");
    if ((itemsCount as any)[0].count === 0) {
      console.log("Sembrando servicios y repuestos sugeridos...");
      const defaultItems = [
        { codigo: "SERV-ACEITE", descripcion: "Cambio de aceite y filtro", tipo: "SERVICIO", precio: 320 },
        { codigo: "SERV-ALINEACION", descripcion: "Alineación y balanceo", tipo: "SERVICIO", precio: 250 },
        { codigo: "REP-PASTILLAS", descripcion: "Pastillas de freno delanteras", tipo: "REPUESTO", precio: 180, stock: 50 },
        { codigo: "SERV-SCANNER", descripcion: "Diagnóstico electrónico (scanner)", tipo: "SERVICIO", precio: 150 },
        { codigo: "REP-BUJIAS", descripcion: "Cambio de bujías", tipo: "REPUESTO", precio: 65, stock: 100 },
        { codigo: "SERV-SUSPENSION", descripcion: "Revisión de suspensión", tipo: "SERVICIO", precio: 200 },
      ];

      for (const item of defaultItems) {
        const [result] = await connection.query(
          "INSERT INTO items_taller (codigo, descripcion, tipo_item) VALUES (?, ?, ?)",
          [item.codigo, item.descripcion, item.tipo]
        );
        const idItem = (result as any).insertId;

        if (item.tipo === "SERVICIO") {
          await connection.query(
            "INSERT INTO servicios (id_item, precio_base) VALUES (?, ?)",
            [idItem, item.precio]
          );
        } else {
          await connection.query(
            "INSERT INTO repuestos (id_item, precio_venta, stock_actual) VALUES (?, ?, ?)",
            [idItem, item.precio, item.stock || 0]
          );
        }
      }
      console.log("Items de taller (servicios/repuestos) sembrados.");
    }

    console.log("Verificación e inicialización de BD finalizada con éxito.");
  } catch (error) {
    console.error("Error durante la inicialización/siembra de base de datos:", error);
  } finally {
    if (connection) connection.release();
  }
}
