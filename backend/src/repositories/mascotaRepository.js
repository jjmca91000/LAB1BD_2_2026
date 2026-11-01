import { pool } from '../config/db.js';

// se buscan las mascotas; idTutor = null trae las de todos
export async function findAllMascotas(idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT m.id_mascota AS id, m.nombre_mascota AS nombre, m.id_especie, e.nombre_especie AS especie,
            m.id_tutor, t.nombre_tutor AS tutor
     FROM "MASCOTA" m
     JOIN "ESPECIE" e ON e.id_especie = m.id_especie
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     WHERE ($1::int IS NULL OR m.id_tutor = $1)
     ORDER BY m.id_mascota
     LIMIT $2 OFFSET $3`,
    [idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una mascota por su id (si viene idTutor, tiene que ser suya)
export async function findMascotaById(id, idTutor) {
  const { rows } = await pool.query(
    `SELECT m.id_mascota AS id, m.nombre_mascota AS nombre, m.id_especie, e.nombre_especie AS especie,
            m.id_tutor, t.nombre_tutor AS tutor
     FROM "MASCOTA" m
     JOIN "ESPECIE" e ON e.id_especie = m.id_especie
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     WHERE m.id_mascota = $1 AND ($2::int IS NULL OR m.id_tutor = $2)`,
    [id, idTutor],
  );
  return rows[0] ?? null;
}

// se inserta una mascota
export async function insertMascota(nombre, idEspecie, idTutor) {
  const { rows } = await pool.query(
    `INSERT INTO "MASCOTA" (nombre_mascota, id_especie, id_tutor) VALUES ($1, $2, $3)
     RETURNING id_mascota AS id, nombre_mascota AS nombre, id_especie, id_tutor`,
    [nombre, idEspecie, idTutor],
  );
  return rows[0];
}

// se actualiza una mascota (si viene idTutor, tiene que ser suya)
export async function updateMascota(id, nombre, idEspecie, idTutor) {
  const { rows } = await pool.query(
    `UPDATE "MASCOTA" SET nombre_mascota = $2, id_especie = $3
     WHERE id_mascota = $1 AND ($4::int IS NULL OR id_tutor = $4)
     RETURNING id_mascota AS id, nombre_mascota AS nombre, id_especie, id_tutor`,
    [id, nombre, idEspecie, idTutor],
  );
  return rows[0] ?? null;
}

// se borra una mascota
export async function deleteMascota(id) {
  const { rows } = await pool.query('DELETE FROM "MASCOTA" WHERE id_mascota = $1 RETURNING id_mascota AS id', [id]);
  return rows[0] ?? null;
}

// se buscan las alergias; idMascota e idTutor = null no filtran
export async function findAllAlergias(idMascota, idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT a.id_alergia AS id, a.id_mascota, m.nombre_mascota AS mascota, a.principio_activo
     FROM "ALERGIA_MASCOTA" a
     JOIN "MASCOTA" m ON m.id_mascota = a.id_mascota
     WHERE ($1::int IS NULL OR a.id_mascota = $1) AND ($2::int IS NULL OR m.id_tutor = $2)
     ORDER BY a.id_alergia
     LIMIT $3 OFFSET $4`,
    [idMascota, idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una alergia por su id (si viene idTutor, la mascota tiene que ser suya)
export async function findAlergiaById(id, idTutor) {
  const { rows } = await pool.query(
    `SELECT a.id_alergia AS id, a.id_mascota, m.nombre_mascota AS mascota, a.principio_activo
     FROM "ALERGIA_MASCOTA" a
     JOIN "MASCOTA" m ON m.id_mascota = a.id_mascota
     WHERE a.id_alergia = $1 AND ($2::int IS NULL OR m.id_tutor = $2)`,
    [id, idTutor],
  );
  return rows[0] ?? null;
}

// se inserta una alergia
export async function insertAlergia(idMascota, principioActivo) {
  const { rows } = await pool.query(
    `INSERT INTO "ALERGIA_MASCOTA" (id_mascota, principio_activo) VALUES ($1, $2)
     RETURNING id_alergia AS id, id_mascota, principio_activo`,
    [idMascota, principioActivo],
  );
  return rows[0];
}

// se actualiza una alergia
export async function updateAlergia(id, principioActivo) {
  const { rows } = await pool.query(
    `UPDATE "ALERGIA_MASCOTA" SET principio_activo = $2 WHERE id_alergia = $1
     RETURNING id_alergia AS id, id_mascota, principio_activo`,
    [id, principioActivo],
  );
  return rows[0] ?? null;
}

// se borra una alergia
export async function deleteAlergia(id) {
  const { rows } = await pool.query('DELETE FROM "ALERGIA_MASCOTA" WHERE id_alergia = $1 RETURNING id_alergia AS id', [id]);
  return rows[0] ?? null;
}
