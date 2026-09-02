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
    // Intentar conectar con reintentos para asegurar que MySQL esté listo al arrancar en Docker
    let tempConnection;
    let retries = 12;
    while (retries > 0) {
      try {
        tempConnection = await mysql.createConnection({
          host: process.env.DB_HOST || "localhost",
          user: process.env.DB_USER || "root",
          password: process.env.DB_PASSWORD || "",
          port: parseInt(process.env.DB_PORT || "3306", 10),
        });
        break;
      } catch (connErr: any) {
        retries--;
        if (retries === 0) throw connErr;
        console.log(`Esperando a que la base de datos esté lista para aceptar conexiones... (${retries} reintentos restantes)`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const dbName = process.env.DB_NAME || "bd_imav";
    await tempConnection!.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    await tempConnection!.end();
    console.log(`Base de datos '${dbName}' verificada/creada.`);

    connection = await pool.getConnection();

    // 1. Verificar si existen las tablas primarias. Si no, las creamos leyendo init..sql
    const [tables] = await connection.query("SHOW TABLES");
    const tableList = (tables as any[]).map((t) => Object.values(t)[0] as string);
    
    if (tableList.length === 0) {
      console.log("No se encontraron tablas. Creando estructura desde init..sql...");
      
      // Buscamos en data_base/init.sql o init..sql a nivel del proyecto o local
      const sqlPaths = [
        path.resolve("..", "data_base", "init.sql"),
        path.resolve("..", "data_base", "init..sql"),
        path.resolve(".", "data_base", "init.sql"),
        path.resolve(".", "init.sql"),
      ];
      const sqlPath = sqlPaths.find((p) => fs.existsSync(p));
      if (sqlPath) {
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
        throw new Error(`No se encontró el archivo init.sql en ninguna de las rutas: ${sqlPaths.join(", ")}`);
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

    // Asegurar que la tabla explicaciones_items exista (entidad débil para descripción extendida de items_taller)
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`explicaciones_items\` (
          \`id_explicacion\` int NOT NULL AUTO_INCREMENT,
          \`id_item\` int NOT NULL,
          \`descripcion_detallada\` text COLLATE utf8mb4_unicode_ci NOT NULL,
          PRIMARY KEY (\`id_explicacion\`),
          UNIQUE KEY \`uq_item_explicacion\` (\`id_item\`),
          CONSTRAINT \`fk_explicacion_item\` FOREIGN KEY (\`id_item\`) REFERENCES \`items_taller\` (\`id_item\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("Tabla 'explicaciones_items' verificada/creada con éxito.");
    } catch (err: any) {
      console.warn("No se pudo verificar o crear explicaciones_items:", err.message);
    }

    // Asegurar tablas de marcas y modelos de vehiculo
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`marcas_vehiculo\` (
          \`id_marca\` int NOT NULL AUTO_INCREMENT,
          \`nombre\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          PRIMARY KEY (\`id_marca\`),
          UNIQUE KEY \`uq_marca_nombre\` (\`nombre\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`modelos_vehiculo\` (
          \`id_modelo\` int NOT NULL AUTO_INCREMENT,
          \`id_marca\` int NOT NULL,
          \`nombre\` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
          PRIMARY KEY (\`id_modelo\`),
          UNIQUE KEY \`uq_marca_modelo\` (\`id_marca\`, \`nombre\`),
          CONSTRAINT \`fk_modelos_marca\` FOREIGN KEY (\`id_marca\`) REFERENCES \`marcas_vehiculo\` (\`id_marca\`) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("Tablas 'marcas_vehiculo' y 'modelos_vehiculo' verificadas/creadas.");

      // Sembrar marcas y modelos si está vacía
      const [marcasCount] = await connection.query("SELECT COUNT(*) as count FROM marcas_vehiculo");
      if ((marcasCount as any)[0].count === 0) {
        console.log("Sembrando catálogo de marcas y modelos de vehículos...");
        const defaultBrandsWithModels = [
          {
            marca: "Toyota",
            modelos: ["Hilux", "Land Cruiser", "Prado", "RAV4", "Corolla", "Yaris", "Fortuner", "4Runner", "Tacoma", "Rush", "Etios", "Hiace"]
          },
          {
            marca: "Suzuki",
            modelos: ["Grand Vitara", "Jimny", "Swift", "Vitara", "Celerio", "Baleno", "Ertiga", "S-Presso", "Alto", "Carry"]
          },
          {
            marca: "Nissan",
            modelos: ["Frontier", "Patrol", "Pathfinder", "X-Trail", "Sentra", "Kicks", "Versa", "Navara", "Tiida", "March"]
          },
          {
            marca: "Ford",
            modelos: ["Ranger", "F-150", "Explorer", "Escape", "EcoSport", "Everest", "Expedition", "Bronco"]
          },
          {
            marca: "Mitsubishi",
            modelos: ["Montero", "Montero Sport", "L200", "Outlander", "ASX", "Pajero", "Eclipse Cross"]
          },
          {
            marca: "Hyundai",
            modelos: ["Tucson", "Santa Fe", "Creta", "Accent", "Elantra", "Grand i10", "H-1", "Venue", "Kona"]
          },
          {
            marca: "Kia",
            modelos: ["Sportage", "Sorento", "Rio", "Cerato", "Picanto", "Seltos", "Sonet", "Soul", "Soluto"]
          },
          {
            marca: "Chevrolet",
            modelos: ["Silverado", "Colorado", "Tracker", "S10", "Trailblazer", "Cruze", "Aveo", "Onix", "Captiva", "D-Max"]
          },
          {
            marca: "Jeep",
            modelos: ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Renegade", "Gladiator"]
          },
          {
            marca: "Honda",
            modelos: ["CR-V", "Civic", "HR-V", "Pilot", "Fit", "Accord", "City"]
          },
          {
            marca: "Volkswagen",
            modelos: ["Gol", "Amarok", "Tiguan", "Saveiro", "Voyage", "Taos", "T-Cross", "Polo", "Golf"]
          },
          {
            marca: "Renault",
            modelos: ["Duster", "Kwid", "Sandero", "Stepway", "Logan", "Koleos", "Oroch", "Captur"]
          },
          {
            marca: "Chery",
            modelos: ["Tiggo 2", "Tiggo 3", "Tiggo 4", "Tiggo 7", "Tiggo 8", "QQ", "Arrizo 5"]
          },
          {
            marca: "JAC",
            modelos: ["S2", "S3", "S4", "T6", "T8", "JS2", "JS4", "JS6"]
          },
          {
            marca: "BYD",
            modelos: ["Song Plus", "Yuan Plus", "Tang", "Han", "Dolphin", "Seagull", "F3"]
          },
          {
            marca: "GAC",
            modelos: ["GS3", "GS4", "GS8", "Emzoom", "Empow"]
          },
          {
            marca: "Great Wall",
            modelos: ["Poer", "Wingle 5", "Wingle 7", "Haval H6", "Haval Jolion", "Haval H9", "Tank 300"]
          },
          {
            marca: "Mazda",
            modelos: ["BT-50", "CX-5", "CX-3", "CX-30", "CX-9", "Mazda 3", "Mazda 2", "Mazda 6"]
          },
          {
            marca: "Fiat",
            modelos: ["Uno", "Strada", "Palio", "Cronos", "Mobi", "Toro", "Fiorino"]
          },
          {
            marca: "Peugeot",
            modelos: ["206", "207", "208", "301", "2008", "3008", "5008", "Partner"]
          },
          {
            marca: "BMW",
            modelos: ["X1", "X3", "X5", "X6", "Serie 3", "Serie 5", "Serie 1"]
          },
          {
            marca: "Mercedes-Benz",
            modelos: ["Clase C", "Clase E", "Clase A", "GLC", "GLE", "GLA", "Sprinter"]
          },
          {
            marca: "Audi",
            modelos: ["A3", "A4", "A6", "Q3", "Q5", "Q7"]
          },
          {
            marca: "Subaru",
            modelos: ["Forester", "Outback", "XV", "Impreza", "Legacy"]
          }
        ];

        for (const item of defaultBrandsWithModels) {
          const [mResult] = await connection.query(
            "INSERT INTO marcas_vehiculo (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)",
            [item.marca]
          );
          let brandId = (mResult as any).insertId;
          if (!brandId) {
            const [bRow] = await connection.query("SELECT id_marca FROM marcas_vehiculo WHERE nombre = ?", [item.marca]);
            brandId = (bRow as any)[0]?.id_marca;
          }
          if (brandId) {
            for (const mod of item.modelos) {
              await connection.query(
                "INSERT INTO modelos_vehiculo (id_marca, nombre) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)",
                [brandId, mod]
              );
            }
          }
        }
        console.log("Catálogo de marcas y modelos sembrado con éxito.");
      }
    } catch (err: any) {
      console.warn("No se pudo verificar o sembrar marcas/modelos:", err.message);
    }

    // Asegurar tabla de informes técnicos
    try {
      await connection.query(`
        CREATE TABLE IF NOT EXISTS \`informes_tecnicos\` (
          \`id_informe\` int NOT NULL AUTO_INCREMENT,
          \`id_vehiculo\` int NOT NULL,
          \`id_cliente\` int NOT NULL,
          \`id_ingreso\` int DEFAULT NULL,
          \`id_empleado\` int DEFAULT NULL,
          \`numero_informe\` varchar(30) NOT NULL,
          \`fecha\` date NOT NULL,
          \`ciudad\` varchar(50) NOT NULL DEFAULT 'Santa Cruz',
          \`destinatario_nombre\` varchar(255) NOT NULL,
          \`destinatario_atencion\` varchar(150) DEFAULT NULL,
          \`vehiculo_descripcion\` varchar(150) NOT NULL,
          \`placa\` varchar(20) NOT NULL,
          \`kilometraje\` int DEFAULT NULL,
          \`referencia\` varchar(255) NOT NULL,
          \`contenido\` text NOT NULL,
          \`conclusion\` text DEFAULT NULL,
          \`costo_estimado\` decimal(10,2) DEFAULT NULL,
          \`firmante_nombre\` varchar(150) NOT NULL DEFAULT 'IMAV MOTORS S.R.L.',
          \`firmante_cargo\` varchar(100) NOT NULL DEFAULT 'Servicio Integral Automotriz',
          \`estado\` enum('BORRADOR','EMITIDO','ANULADO') NOT NULL DEFAULT 'EMITIDO',
          \`created_at\` timestamp DEFAULT CURRENT_TIMESTAMP,
          \`updated_at\` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id_informe\`),
          KEY \`fk_informe_vehiculo\` (\`id_vehiculo\`),
          KEY \`fk_informe_cliente\` (\`id_cliente\`),
          KEY \`fk_informe_ingreso\` (\`id_ingreso\`),
          KEY \`fk_informe_empleado\` (\`id_empleado\`),
          CONSTRAINT \`fk_inf_vehiculo\` FOREIGN KEY (\`id_vehiculo\`) REFERENCES \`vehiculos\` (\`id_vehiculo\`) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT \`fk_inf_cliente\` FOREIGN KEY (\`id_cliente\`) REFERENCES \`clientes\` (\`id_cliente\`) ON DELETE RESTRICT ON UPDATE CASCADE,
          CONSTRAINT \`fk_inf_ingreso\` FOREIGN KEY (\`id_ingreso\`) REFERENCES \`ingresos_taller\` (\`id_ingreso\`) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT \`fk_inf_empleado\` FOREIGN KEY (\`id_empleado\`) REFERENCES \`empleados\` (\`id_empleado\`) ON DELETE SET NULL ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("Tabla 'informes_tecnicos' verificada/creada.");
    } catch (err: any) {
      console.warn("No se pudo verificar o crear la tabla 'informes_tecnicos':", err.message);
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
