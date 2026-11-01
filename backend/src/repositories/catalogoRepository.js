import { pool } from '../config/db.js';

// se buscan los roles
export async function findAllRoles(pagina) {
  const { rows } = await pool.query(
    'SELECT id_rol AS id, nombre_rol AS nombre FROM "ROL" ORDER BY id_rol LIMIT $1 OFFSET $2',
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un rol por su id
export async function findRolById(id) {
  const { rows } = await pool.query('SELECT id_rol AS id, nombre_rol AS nombre FROM "ROL" WHERE id_rol = $1', [id]);
  return rows[0] ?? null;
}

// se buscan las especies
export async function findAllEspecies(pagina) {
  const { rows } = await pool.query(
    'SELECT id_especie AS id, nombre_especie AS nombre FROM "ESPECIE" ORDER BY id_especie LIMIT $1 OFFSET $2',
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una especie por su id
export async function findEspecieById(id) {
  const { rows } = await pool.query('SELECT id_especie AS id, nombre_especie AS nombre FROM "ESPECIE" WHERE id_especie = $1', [id]);
  return rows[0] ?? null;
}

// se inserta una especie
export async function insertEspecie(nombre) {
  const { rows } = await pool.query(
    'INSERT INTO "ESPECIE" (nombre_especie) VALUES ($1) RETURNING id_especie AS id, nombre_especie AS nombre',
    [nombre],
  );
  return rows[0];
}

// se actualiza una especie
export async function updateEspecie(id, nombre) {
  const { rows } = await pool.query(
    'UPDATE "ESPECIE" SET nombre_especie = $2 WHERE id_especie = $1 RETURNING id_especie AS id, nombre_especie AS nombre',
    [id, nombre],
  );
  return rows[0] ?? null;
}

// se borra una especie
export async function deleteEspecie(id) {
  const { rows } = await pool.query('DELETE FROM "ESPECIE" WHERE id_especie = $1 RETURNING id_especie AS id', [id]);
  return rows[0] ?? null;
}

// se buscan las sedes
export async function findAllSedes(pagina) {
  const { rows } = await pool.query(
    'SELECT id_sede AS id, nombre FROM "SEDE" ORDER BY id_sede LIMIT $1 OFFSET $2',
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una sede por su id
export async function findSedeById(id) {
  const { rows } = await pool.query('SELECT id_sede AS id, nombre FROM "SEDE" WHERE id_sede = $1', [id]);
  return rows[0] ?? null;
}

// se inserta una sede
export async function insertSede(nombre) {
  const { rows } = await pool.query('INSERT INTO "SEDE" (nombre) VALUES ($1) RETURNING id_sede AS id, nombre', [nombre]);
  return rows[0];
}

// se actualiza una sede
export async function updateSede(id, nombre) {
  const { rows } = await pool.query(
    'UPDATE "SEDE" SET nombre = $2 WHERE id_sede = $1 RETURNING id_sede AS id, nombre',
    [id, nombre],
  );
  return rows[0] ?? null;
}

// se borra una sede
export async function deleteSede(id) {
  const { rows } = await pool.query('DELETE FROM "SEDE" WHERE id_sede = $1 RETURNING id_sede AS id', [id]);
  return rows[0] ?? null;
}

// se buscan los medicamentos
export async function findAllMedicamentos(pagina) {
  const { rows } = await pool.query(
    `SELECT id_medicamento AS id, nombre_comercial, principio_activo
     FROM "MEDICAMENTO"
     ORDER BY id_medicamento
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un medicamento por su id
export async function findMedicamentoById(id) {
  const { rows } = await pool.query(
    'SELECT id_medicamento AS id, nombre_comercial, principio_activo FROM "MEDICAMENTO" WHERE id_medicamento = $1',
    [id],
  );
  return rows[0] ?? null;
}

// se inserta un medicamento
export async function insertMedicamento(nombreComercial, principioActivo) {
  const { rows } = await pool.query(
    `INSERT INTO "MEDICAMENTO" (nombre_comercial, principio_activo) VALUES ($1, $2)
     RETURNING id_medicamento AS id, nombre_comercial, principio_activo`,
    [nombreComercial, principioActivo],
  );
  return rows[0];
}

// se actualiza un medicamento
export async function updateMedicamento(id, nombreComercial, principioActivo) {
  const { rows } = await pool.query(
    `UPDATE "MEDICAMENTO" SET nombre_comercial = $2, principio_activo = $3 WHERE id_medicamento = $1
     RETURNING id_medicamento AS id, nombre_comercial, principio_activo`,
    [id, nombreComercial, principioActivo],
  );
  return rows[0] ?? null;
}

// se borra un medicamento
export async function deleteMedicamento(id) {
  const { rows } = await pool.query('DELETE FROM "MEDICAMENTO" WHERE id_medicamento = $1 RETURNING id_medicamento AS id', [id]);
  return rows[0] ?? null;
}

// se busca el inventario; idSede = null trae todas las sedes
export async function findAllInventario(idSede, pagina) {
  const { rows } = await pool.query(
    `SELECT i.id_inventario AS id, i.id_sede, s.nombre AS sede,
            i.id_medicamento, m.nombre_comercial, m.principio_activo, i.stock_actual
     FROM "INVENTARIO" i
     JOIN "SEDE" s ON s.id_sede = i.id_sede
     JOIN "MEDICAMENTO" m ON m.id_medicamento = i.id_medicamento
     WHERE ($1::int IS NULL OR i.id_sede = $1)
     ORDER BY i.id_sede, m.nombre_comercial
     LIMIT $2 OFFSET $3`,
    [idSede, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un registro del inventario por su id
export async function findInventarioById(id) {
  const { rows } = await pool.query(
    `SELECT i.id_inventario AS id, i.id_sede, s.nombre AS sede,
            i.id_medicamento, m.nombre_comercial, m.principio_activo, i.stock_actual
     FROM "INVENTARIO" i
     JOIN "SEDE" s ON s.id_sede = i.id_sede
     JOIN "MEDICAMENTO" m ON m.id_medicamento = i.id_medicamento
     WHERE i.id_inventario = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se agrega el medicamento a la sede, o si ya estaba se reemplaza su stock (UPSERT)
export async function upsertInventario(idSede, idMedicamento, stock) {
  const { rows } = await pool.query(
    `INSERT INTO "INVENTARIO" (id_sede, id_medicamento, stock_actual) VALUES ($1, $2, $3)
     ON CONFLICT (id_sede, id_medicamento) DO UPDATE SET stock_actual = EXCLUDED.stock_actual
     RETURNING id_inventario AS id, id_sede, id_medicamento, stock_actual`,
    [idSede, idMedicamento, stock],
  );
  return rows[0];
}

// se quita un registro del inventario
export async function deleteInventario(id) {
  const { rows } = await pool.query('DELETE FROM "INVENTARIO" WHERE id_inventario = $1 RETURNING id_inventario AS id', [id]);
  return rows[0] ?? null;
}

// se buscan los tutores con su correo
export async function findAllTutores(pagina) {
  const { rows } = await pool.query(
    `SELECT t.id_tutor AS id, t.nombre_tutor AS nombre, u.email AS correo
     FROM "TUTOR" t
     JOIN "USUARIO" u ON u.id_usuario = t.id_usuario
     ORDER BY t.id_tutor
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un tutor por su id
export async function findTutorById(id) {
  const { rows } = await pool.query(
    `SELECT t.id_tutor AS id, t.nombre_tutor AS nombre, u.email AS correo
     FROM "TUTOR" t
     JOIN "USUARIO" u ON u.id_usuario = t.id_usuario
     WHERE t.id_tutor = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se crea el usuario y su perfil de tutor en una sola sentencia (si falla uno, no queda ninguno)
export async function insertTutor(correo, passwordHash, nombre) {
  const { rows } = await pool.query(
    `WITH usuario AS (
       INSERT INTO "USUARIO" (id_rol, email, password_hash)
       SELECT id_rol, $1, $2 FROM "ROL" WHERE nombre_rol = 'Tutor'
       RETURNING id_usuario
     )
     INSERT INTO "TUTOR" (id_usuario, nombre_tutor)
     SELECT id_usuario, $3 FROM usuario
     RETURNING id_tutor AS id, nombre_tutor AS nombre`,
    [correo, passwordHash, nombre],
  );
  return rows[0];
}

// se actualiza el nombre de un tutor
export async function updateTutor(id, nombre) {
  const { rows } = await pool.query(
    'UPDATE "TUTOR" SET nombre_tutor = $2 WHERE id_tutor = $1 RETURNING id_tutor AS id, nombre_tutor AS nombre',
    [id, nombre],
  );
  return rows[0] ?? null;
}

// se borra el perfil del tutor y su usuario en una sola sentencia
export async function deleteTutor(id) {
  const { rows } = await pool.query(
    `WITH tutor AS (DELETE FROM "TUTOR" WHERE id_tutor = $1 RETURNING id_usuario)
     DELETE FROM "USUARIO" WHERE id_usuario IN (SELECT id_usuario FROM tutor)
     RETURNING id_usuario AS id`,
    [id],
  );
  return rows[0] ?? null;
}

// se buscan los veterinarios con su sede y correo
export async function findAllVeterinarios(pagina) {
  const { rows } = await pool.query(
    `SELECT v.id_veterinario AS id, v.nombre_veterinario AS nombre, v.id_sede, s.nombre AS sede, u.email AS correo
     FROM "VETERINARIO" v
     JOIN "SEDE" s ON s.id_sede = v.id_sede
     JOIN "USUARIO" u ON u.id_usuario = v.id_usuario
     ORDER BY v.id_veterinario
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un veterinario por su id
export async function findVeterinarioById(id) {
  const { rows } = await pool.query(
    `SELECT v.id_veterinario AS id, v.nombre_veterinario AS nombre, v.id_sede, s.nombre AS sede, u.email AS correo
     FROM "VETERINARIO" v
     JOIN "SEDE" s ON s.id_sede = v.id_sede
     JOIN "USUARIO" u ON u.id_usuario = v.id_usuario
     WHERE v.id_veterinario = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se crea el usuario y su perfil de veterinario en una sola sentencia
export async function insertVeterinario(correo, passwordHash, nombre, idSede) {
  const { rows } = await pool.query(
    `WITH usuario AS (
       INSERT INTO "USUARIO" (id_rol, email, password_hash)
       SELECT id_rol, $1, $2 FROM "ROL" WHERE nombre_rol = 'Veterinario'
       RETURNING id_usuario
     )
     INSERT INTO "VETERINARIO" (id_usuario, nombre_veterinario, id_sede)
     SELECT id_usuario, $3, $4::int FROM usuario
     RETURNING id_veterinario AS id, nombre_veterinario AS nombre, id_sede`,
    [correo, passwordHash, nombre, idSede],
  );
  return rows[0];
}

// se actualiza el nombre y la sede de un veterinario
export async function updateVeterinario(id, nombre, idSede) {
  const { rows } = await pool.query(
    `UPDATE "VETERINARIO" SET nombre_veterinario = $2, id_sede = $3 WHERE id_veterinario = $1
     RETURNING id_veterinario AS id, nombre_veterinario AS nombre, id_sede`,
    [id, nombre, idSede],
  );
  return rows[0] ?? null;
}

// se borra el perfil del veterinario y su usuario en una sola sentencia
export async function deleteVeterinario(id) {
  const { rows } = await pool.query(
    `WITH veterinario AS (DELETE FROM "VETERINARIO" WHERE id_veterinario = $1 RETURNING id_usuario)
     DELETE FROM "USUARIO" WHERE id_usuario IN (SELECT id_usuario FROM veterinario)
     RETURNING id_usuario AS id`,
    [id],
  );
  return rows[0] ?? null;
}

// se buscan los administradores con su correo
export async function findAllAdministradores(pagina) {
  const { rows } = await pool.query(
    `SELECT a.id_administrador AS id, a.nombre_administrador AS nombre, u.email AS correo
     FROM "ADMINISTRADOR" a
     JOIN "USUARIO" u ON u.id_usuario = a.id_usuario
     ORDER BY a.id_administrador
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un administrador por su id
export async function findAdministradorById(id) {
  const { rows } = await pool.query(
    `SELECT a.id_administrador AS id, a.nombre_administrador AS nombre, u.email AS correo
     FROM "ADMINISTRADOR" a
     JOIN "USUARIO" u ON u.id_usuario = a.id_usuario
     WHERE a.id_administrador = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se revisa si ya existe algun administrador
export async function existeAdministrador() {
  const { rows } = await pool.query('SELECT EXISTS (SELECT 1 FROM "ADMINISTRADOR") AS existe');
  return rows[0].existe;
}

// se crea el usuario y su perfil de administrador en una sola sentencia
export async function insertAdministrador(correo, passwordHash, nombre) {
  const { rows } = await pool.query(
    `WITH usuario AS (
       INSERT INTO "USUARIO" (id_rol, email, password_hash)
       SELECT id_rol, $1, $2 FROM "ROL" WHERE nombre_rol = 'Administrador'
       RETURNING id_usuario
     )
     INSERT INTO "ADMINISTRADOR" (id_usuario, nombre_administrador)
     SELECT id_usuario, $3 FROM usuario
     RETURNING id_administrador AS id, nombre_administrador AS nombre`,
    [correo, passwordHash, nombre],
  );
  return rows[0];
}

// se actualiza el nombre de un administrador
export async function updateAdministrador(id, nombre) {
  const { rows } = await pool.query(
    `UPDATE "ADMINISTRADOR" SET nombre_administrador = $2 WHERE id_administrador = $1
     RETURNING id_administrador AS id, nombre_administrador AS nombre`,
    [id, nombre],
  );
  return rows[0] ?? null;
}

// se borra un administrador y su usuario, salvo que sea el ultimo
export async function deleteAdministrador(id) {
  const { rows } = await pool.query(
    `WITH administrador AS (
       DELETE FROM "ADMINISTRADOR"
       WHERE id_administrador = $1 AND (SELECT COUNT(*) FROM "ADMINISTRADOR") > 1
       RETURNING id_usuario
     )
     DELETE FROM "USUARIO" WHERE id_usuario IN (SELECT id_usuario FROM administrador)
     RETURNING id_usuario AS id`,
    [id],
  );
  return rows[0] ?? null;
}
