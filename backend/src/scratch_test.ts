import pool from "./config/db.js";

async function test() {
  try {
    const id = 1; // test with id = 1 or any
    console.log("Running query for id:", id);
    const [rows] = await pool.query(
      `
      SELECT p.*, 
             i.fecha_ingreso, i.kilometraje, i.falla_reportada, i.nivel_combustible, i.deja_accesorios, i.observaciones_estado,
             i.id_empleado_receptor, i.id_mecanico_asignado,
             v.placa, v.marca, v.modelo, v.color, v.anio, v.vin, v.id_vehiculo,
             c.nombre as nombre_cliente, c.telefono as telefono_cliente, c.ci as ci_cliente, c.nit as nit_cliente, c.pasaporte as pasaporte_cliente, c.tipo_cliente, c.direccion as direccion_cliente, c.id_cliente,
             er.nombre as nombre_receptor, er.paterno as paterno_receptor,
             em.nombre as nombre_mecanico, em.paterno as paterno_mecanico
      FROM proformas p
      JOIN ingresos_taller i ON p.id_ingreso = i.id_ingreso
      JOIN vehiculos v ON i.id_vehiculo = v.id_vehiculo
      JOIN clientes c ON v.id_cliente = c.id_cliente
      JOIN empleados er ON i.id_empleado_receptor = er.id_empleado
      JOIN empleados em ON i.id_mecanico_asignado = em.id_empleado
      WHERE p.id_proforma = ?
      `,
      [id]
    );
    console.log("Query rows returned count:", (rows as any[]).length);
    if ((rows as any[]).length > 0) {
      console.log("Row 0 keys:", Object.keys((rows as any[])[0]));
    }
  } catch (err: any) {
    console.error("SQL ERROR:", err);
  } finally {
    process.exit(0);
  }
}

test();
