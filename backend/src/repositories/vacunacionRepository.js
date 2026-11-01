import { pool } from '../config/db.js';

// se buscan los planes de vacunacion (la llave de la tabla se llama id_vacuna)
export async function findAllPlanes(pagina) {
  const { rows } = await pool.query(
    `SELECT p.id_vacuna AS id, p.id_especie, e.nombre_especie AS especie,
            p.nombre_vacuna, p.cantidad_refuerzo, p.dias_refuerzo
     FROM "PLAN_VACUNACION" p
     JOIN "ESPECIE" e ON e.id_especie = p.id_especie
     ORDER BY p.id_vacuna
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un plan por su id
export async function findPlanById(id) {
  const { rows } = await pool.query(
    `SELECT p.id_vacuna AS id, p.id_especie, e.nombre_especie AS especie,
            p.nombre_vacuna, p.cantidad_refuerzo, p.dias_refuerzo
     FROM "PLAN_VACUNACION" p
     JOIN "ESPECIE" e ON e.id_especie = p.id_especie
     WHERE p.id_vacuna = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se inserta un plan
export async function insertPlan(idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo) {
  const { rows } = await pool.query(
    `INSERT INTO "PLAN_VACUNACION" (id_especie, nombre_vacuna, cantidad_refuerzo, dias_refuerzo)
     VALUES ($1, $2, $3, $4)
     RETURNING id_vacuna AS id, id_especie, nombre_vacuna, cantidad_refuerzo, dias_refuerzo`,
    [idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo],
  );
  return rows[0];
}

// se actualiza un plan
export async function updatePlan(id, idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo) {
  const { rows } = await pool.query(
    `UPDATE "PLAN_VACUNACION"
     SET id_especie = $2, nombre_vacuna = $3, cantidad_refuerzo = $4, dias_refuerzo = $5
     WHERE id_vacuna = $1
     RETURNING id_vacuna AS id, id_especie, nombre_vacuna, cantidad_refuerzo, dias_refuerzo`,
    [id, idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo],
  );
  return rows[0] ?? null;
}

// se borra un plan
export async function deletePlan(id) {
  const { rows } = await pool.query('DELETE FROM "PLAN_VACUNACION" WHERE id_vacuna = $1 RETURNING id_vacuna AS id', [id]);
  return rows[0] ?? null;
}

// se busca el historial de vacunas; idTutor = null trae el de todos
export async function findAllRegistros(idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT r.id_registro AS id, r.id_mascota, m.nombre_mascota AS mascota, t.nombre_tutor AS tutor,
            r.id_vacuna, p.nombre_vacuna, r.numero_refuerzo, p.cantidad_refuerzo,
            r.fecha_aplicacion::text, r.vencimiento_vacuna::text, r.id_cita
     FROM "REGISTRO_VACUNACION" r
     JOIN "MASCOTA" m ON m.id_mascota = r.id_mascota
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "PLAN_VACUNACION" p ON p.id_vacuna = r.id_vacuna
     WHERE ($1::int IS NULL OR m.id_tutor = $1)
     ORDER BY r.fecha_aplicacion DESC
     LIMIT $2 OFFSET $3`,
    [idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un registro de vacuna por su id
export async function findRegistroById(id, idTutor) {
  const { rows } = await pool.query(
    `SELECT r.id_registro AS id, r.id_mascota, m.nombre_mascota AS mascota, t.nombre_tutor AS tutor,
            r.id_vacuna, p.nombre_vacuna, r.numero_refuerzo, p.cantidad_refuerzo,
            r.fecha_aplicacion::text, r.vencimiento_vacuna::text, r.id_cita
     FROM "REGISTRO_VACUNACION" r
     JOIN "MASCOTA" m ON m.id_mascota = r.id_mascota
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "PLAN_VACUNACION" p ON p.id_vacuna = r.id_vacuna
     WHERE r.id_registro = $1 AND ($2::int IS NULL OR m.id_tutor = $2)`,
    [id, idTutor],
  );
  return rows[0] ?? null;
}

// se llama al procedimiento 2
export async function aplicarVacuna(idCita, idVacuna) {
  await pool.query('CALL sp_aplicar_vacuna($1, $2)', [idCita, idVacuna]);
}

// se borra un registro de vacuna
export async function deleteRegistro(id) {
  const { rows } = await pool.query('DELETE FROM "REGISTRO_VACUNACION" WHERE id_registro = $1 RETURNING id_registro AS id', [id]);
  return rows[0] ?? null;
}

// se buscan las vacunas vencidas o que vencen en los proximos 30 dias
export async function findVacunasPorVencer(idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT r.id_registro AS id, m.id_mascota, m.nombre_mascota AS mascota, e.nombre_especie AS especie,
            t.nombre_tutor AS tutor, u.email AS correo_tutor, p.nombre_vacuna,
            r.numero_refuerzo, p.cantidad_refuerzo, r.vencimiento_vacuna::text,
            r.vencimiento_vacuna - CURRENT_DATE AS dias_para_vencer,
            CASE WHEN r.vencimiento_vacuna < CURRENT_DATE THEN 'VENCIDA' ELSE 'POR VENCER' END AS estado
     FROM "REGISTRO_VACUNACION" r
     JOIN "MASCOTA" m ON m.id_mascota = r.id_mascota
     JOIN "ESPECIE" e ON e.id_especie = m.id_especie
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "USUARIO" u ON u.id_usuario = t.id_usuario
     JOIN "PLAN_VACUNACION" p ON p.id_vacuna = r.id_vacuna
     WHERE r.numero_refuerzo < p.cantidad_refuerzo
       AND r.vencimiento_vacuna <= CURRENT_DATE + 30
       -- solo la ultima dosis de cada plan: no existe otra dosis posterior
       AND NOT EXISTS (
         SELECT 1 FROM "REGISTRO_VACUNACION" posterior
         WHERE posterior.id_mascota = r.id_mascota
           AND posterior.id_vacuna = r.id_vacuna
           AND posterior.numero_refuerzo > r.numero_refuerzo
       )
       AND ($1::int IS NULL OR m.id_tutor = $1)
     ORDER BY r.vencimiento_vacuna
     LIMIT $2 OFFSET $3`,
    [idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}
