import { pool } from '../config/db.js';

// se buscan las citas; idTutor e idVeterinario = null no filtran
export async function findAllCitas(idTutor, idVeterinario, pagina) {
  const { rows } = await pool.query(
    `SELECT c.id_cita AS id, c.id_mascota, m.nombre_mascota AS mascota, t.nombre_tutor AS tutor,
            c.id_sede, s.nombre AS sede, c.id_veterinario, v.nombre_veterinario AS veterinario,
            c.tipo_atencion, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora, c.estado
     FROM "CITA_MEDICA" c
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "SEDE" s ON s.id_sede = c.id_sede
     JOIN "VETERINARIO" v ON v.id_veterinario = c.id_veterinario
     WHERE ($1::int IS NULL OR m.id_tutor = $1)
       AND ($2::int IS NULL OR c.id_veterinario = $2)
     ORDER BY c.fecha_hora DESC
     LIMIT $3 OFFSET $4`,
    [idTutor, idVeterinario, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una cita por su id, con los mismos filtros
export async function findCitaById(id, idTutor, idVeterinario) {
  const { rows } = await pool.query(
    `SELECT c.id_cita AS id, c.id_mascota, m.nombre_mascota AS mascota, t.nombre_tutor AS tutor,
            c.id_sede, s.nombre AS sede, c.id_veterinario, v.nombre_veterinario AS veterinario,
            c.tipo_atencion, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora, c.estado
     FROM "CITA_MEDICA" c
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "SEDE" s ON s.id_sede = c.id_sede
     JOIN "VETERINARIO" v ON v.id_veterinario = c.id_veterinario
     WHERE c.id_cita = $1
       AND ($2::int IS NULL OR m.id_tutor = $2)
       AND ($3::int IS NULL OR c.id_veterinario = $3)`,
    [id, idTutor, idVeterinario],
  );
  return rows[0] ?? null;
}

// se agenda la cita y se crea su ficha abierta en una sola sentencia
export async function insertCita(idMascota, idSede, idVeterinario, tipoAtencion, fechaHora, idTutor) {
  const { rows } = await pool.query(
    `WITH cita AS (
       INSERT INTO "CITA_MEDICA" (id_mascota, id_sede, id_veterinario, tipo_atencion, fecha_hora, estado)
       -- los ::int y ::timestamp van porque en un INSERT ... SELECT PostgreSQL no adivina el tipo de los parametros
       SELECT id_mascota, $2::int, $3::int, $4::varchar, $5::timestamp, 'Programada'
       FROM "MASCOTA"
       -- si la mascota no es del tutor no se inserta nada
       WHERE id_mascota = $1 AND ($6::int IS NULL OR id_tutor = $6)
       RETURNING *
     ), ficha AS (
       INSERT INTO "FICHA_CLINICA" (id_cita) SELECT id_cita FROM cita
     )
     SELECT id_cita AS id, id_mascota, id_sede, id_veterinario, tipo_atencion,
            to_char(fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora, estado
     FROM cita`,
    [idMascota, idSede, idVeterinario, tipoAtencion, fechaHora, idTutor],
  );
  return rows[0] ?? null;
}

// se revisa si el veterinario trabaja en esa sede
export async function veterinarioEstaEnSede(idVeterinario, idSede) {
  const { rows } = await pool.query(
    'SELECT EXISTS (SELECT 1 FROM "VETERINARIO" WHERE id_veterinario = $1 AND id_sede = $2) AS esta',
    [idVeterinario, idSede],
  );
  return rows[0].esta;
}

// se revisa si el veterinario ya tiene una cita no cancelada en esa misma hora
export async function existeCitaEnHora(idVeterinario, fechaHora, idCitaExcluida) {
  const { rows } = await pool.query(
    `SELECT EXISTS (
       SELECT 1 FROM "CITA_MEDICA"
       WHERE id_veterinario = $1 AND estado <> 'Cancelada'
         AND date_trunc('hour', fecha_hora) = date_trunc('hour', $2::timestamp)
         AND ($3::int IS NULL OR id_cita <> $3)
     ) AS ocupada`,
    [idVeterinario, fechaHora, idCitaExcluida],
  );
  return rows[0].ocupada;
}

// se reprograma una cita que todavia esta programada
export async function updateCita(id, idSede, idVeterinario, tipoAtencion, fechaHora) {
  const { rows } = await pool.query(
    `UPDATE "CITA_MEDICA" SET id_sede = $2, id_veterinario = $3, tipo_atencion = $4, fecha_hora = $5
     WHERE id_cita = $1 AND estado = 'Programada'
     RETURNING id_cita AS id, id_mascota, id_sede, id_veterinario, tipo_atencion,
               to_char(fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora, estado`,
    [id, idSede, idVeterinario, tipoAtencion, fechaHora],
  );
  return rows[0] ?? null;
}

// se cancela la cita y se borra su ficha abierta en una sola sentencia
export async function cancelarCita(id) {
  const { rows } = await pool.query(
    `WITH cita AS (
       UPDATE "CITA_MEDICA" SET estado = 'Cancelada'
       WHERE id_cita = $1 AND estado = 'Programada'
       RETURNING id_cita, estado
     ), ficha AS (
       DELETE FROM "FICHA_CLINICA" WHERE id_cita IN (SELECT id_cita FROM cita) AND estado = TRUE
     )
     SELECT id_cita AS id, estado FROM cita`,
    [id],
  );
  return rows[0] ?? null;
}

// se borra la cita y su ficha abierta; si la ficha ya esta cerrada, la llave foranea lo impide
export async function deleteCita(id) {
  const { rows } = await pool.query(
    `WITH ficha AS (
       DELETE FROM "FICHA_CLINICA" WHERE id_cita = $1 AND estado = TRUE
     )
     DELETE FROM "CITA_MEDICA" WHERE id_cita = $1
     RETURNING id_cita AS id`,
    [id],
  );
  return rows[0] ?? null;
}

// se calculan las horas libres: bloques de 09:00 a 17:00 sin citas de ese veterinario
export async function findBloquesDisponibles(idVeterinario, fecha, pagina) {
  const { rows } = await pool.query(
    `SELECT to_char(bloque, 'HH24:MI') AS hora_disponible,
            to_char(bloque, 'YYYY-MM-DD HH24:MI') AS fecha_hora_exacta
     -- generate_series crea una fila por cada hora del dia
     FROM generate_series($2::date + TIME '09:00', $2::date + TIME '17:00', INTERVAL '1 hour') AS bloque
     WHERE NOT EXISTS (
       SELECT 1 FROM "CITA_MEDICA" c
       WHERE c.id_veterinario = $1
         AND c.estado <> 'Cancelada'
         AND date_trunc('hour', c.fecha_hora) = bloque
     )
     ORDER BY bloque
     LIMIT $3 OFFSET $4`,
    [idVeterinario, fecha, pagina.limite, pagina.offset],
  );
  return rows;
}

// se buscan las fichas con sus recetas (json_agg las junta en una lista); idTutor = null trae todas
export async function findAllFichas(idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT f.id_ficha AS id, f.id_cita, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora,
            m.id_mascota, m.nombre_mascota AS mascota, e.nombre_especie AS especie, t.nombre_tutor AS tutor,
            v.nombre_veterinario AS veterinario, s.nombre AS sede,
            f.diagnostico, f.tratamiento, f.estado AS abierta,
            (SELECT COALESCE(json_agg(json_build_object(
                      'medicamento', med.nombre_comercial,
                      'cantidad', r.cantidad_entregada)), '[]')
             FROM "RECETA" r
             JOIN "MEDICAMENTO" med ON med.id_medicamento = r.id_medicamento
             WHERE r.id_ficha = f.id_ficha) AS recetas
     FROM "FICHA_CLINICA" f
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "ESPECIE" e ON e.id_especie = m.id_especie
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "VETERINARIO" v ON v.id_veterinario = c.id_veterinario
     JOIN "SEDE" s ON s.id_sede = c.id_sede
     WHERE ($1::int IS NULL OR m.id_tutor = $1)
     ORDER BY c.fecha_hora DESC
     LIMIT $2 OFFSET $3`,
    [idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una ficha por su id, con sus recetas
export async function findFichaById(id, idTutor) {
  const { rows } = await pool.query(
    `SELECT f.id_ficha AS id, f.id_cita, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora,
            m.id_mascota, m.nombre_mascota AS mascota, e.nombre_especie AS especie, t.nombre_tutor AS tutor,
            v.nombre_veterinario AS veterinario, s.nombre AS sede,
            f.diagnostico, f.tratamiento, f.estado AS abierta,
            (SELECT COALESCE(json_agg(json_build_object(
                      'medicamento', med.nombre_comercial,
                      'cantidad', r.cantidad_entregada)), '[]')
             FROM "RECETA" r
             JOIN "MEDICAMENTO" med ON med.id_medicamento = r.id_medicamento
             WHERE r.id_ficha = f.id_ficha) AS recetas
     FROM "FICHA_CLINICA" f
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "ESPECIE" e ON e.id_especie = m.id_especie
     JOIN "TUTOR" t ON t.id_tutor = m.id_tutor
     JOIN "VETERINARIO" v ON v.id_veterinario = c.id_veterinario
     JOIN "SEDE" s ON s.id_sede = c.id_sede
     WHERE f.id_ficha = $1 AND ($2::int IS NULL OR m.id_tutor = $2)`,
    [id, idTutor],
  );
  return rows[0] ?? null;
}

// se corrige el diagnostico de una ficha cerrada; el trigger 2 guarda el cambio
export async function updateFichaCerrada(id, diagnostico, tratamiento, idUsuario, idVeterinario) {
  const { rows } = await pool.query(
    `UPDATE "FICHA_CLINICA" f
     SET diagnostico = $2, tratamiento = $3, id_usuario_modificador = $4
     FROM "CITA_MEDICA" c
     WHERE f.id_ficha = $1 AND f.estado = FALSE AND c.id_cita = f.id_cita
       AND ($5::int IS NULL OR c.id_veterinario = $5)
     RETURNING f.id_ficha AS id, f.id_cita, f.diagnostico, f.tratamiento`,
    [id, diagnostico, tratamiento, idUsuario, idVeterinario],
  );
  return rows[0] ?? null;
}

// se llama al procedimiento 1 (si viene idVacuna, este llama al procedimiento 2)
export async function registrarAtencion(idCita, diagnostico, tratamiento, idUsuario, medicamentos, cantidades, idVacuna) {
  await pool.query(
    'CALL sp_registrar_atencion($1, $2, $3, $4, $5::int[], $6::int[], $7)',
    [idCita, diagnostico, tratamiento, idUsuario, medicamentos, cantidades, idVacuna],
  );
}

// se buscan las recetas; idTutor = null trae todas
export async function findAllRecetas(idTutor, pagina) {
  const { rows } = await pool.query(
    `SELECT r.id_receta AS id, r.id_ficha, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora,
            m.nombre_mascota AS mascota, med.nombre_comercial AS medicamento, med.principio_activo,
            r.cantidad_entregada
     FROM "RECETA" r
     JOIN "FICHA_CLINICA" f ON f.id_ficha = r.id_ficha
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "MEDICAMENTO" med ON med.id_medicamento = r.id_medicamento
     WHERE ($1::int IS NULL OR m.id_tutor = $1)
     ORDER BY c.fecha_hora DESC
     LIMIT $2 OFFSET $3`,
    [idTutor, pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca una receta por su id
export async function findRecetaById(id, idTutor) {
  const { rows } = await pool.query(
    `SELECT r.id_receta AS id, r.id_ficha, to_char(c.fecha_hora, 'YYYY-MM-DD HH24:MI') AS fecha_hora,
            m.nombre_mascota AS mascota, med.nombre_comercial AS medicamento, med.principio_activo,
            r.cantidad_entregada
     FROM "RECETA" r
     JOIN "FICHA_CLINICA" f ON f.id_ficha = r.id_ficha
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "MEDICAMENTO" med ON med.id_medicamento = r.id_medicamento
     WHERE r.id_receta = $1 AND ($2::int IS NULL OR m.id_tutor = $2)`,
    [id, idTutor],
  );
  return rows[0] ?? null;
}

// se buscan los cambios auditados por el trigger 2
export async function findAllAuditoria(pagina) {
  const { rows } = await pool.query(
    `SELECT a.id_auditoria AS id, a.id_ficha, m.nombre_mascota AS mascota,
            a.diagnostico_anterior, a.diagnostico_nuevo, u.email AS modificado_por,
            to_char(a.fecha_modificacion, 'YYYY-MM-DD HH24:MI') AS fecha_modificacion
     FROM "AUDITORIA" a
     JOIN "FICHA_CLINICA" f ON f.id_ficha = a.id_ficha
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "USUARIO" u ON u.id_usuario = a.id_usuario_modificador
     ORDER BY a.fecha_modificacion DESC
     LIMIT $1 OFFSET $2`,
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se busca un cambio auditado por su id
export async function findAuditoriaById(id) {
  const { rows } = await pool.query(
    `SELECT a.id_auditoria AS id, a.id_ficha, m.nombre_mascota AS mascota,
            a.diagnostico_anterior, a.diagnostico_nuevo, u.email AS modificado_por,
            to_char(a.fecha_modificacion, 'YYYY-MM-DD HH24:MI') AS fecha_modificacion
     FROM "AUDITORIA" a
     JOIN "FICHA_CLINICA" f ON f.id_ficha = a.id_ficha
     JOIN "CITA_MEDICA" c ON c.id_cita = f.id_cita
     JOIN "MASCOTA" m ON m.id_mascota = c.id_mascota
     JOIN "USUARIO" u ON u.id_usuario = a.id_usuario_modificador
     WHERE a.id_auditoria = $1`,
    [id],
  );
  return rows[0] ?? null;
}

// se leen las estadisticas desde la vista materializada
export async function findEstadisticas(pagina) {
  const { rows } = await pool.query(
    'SELECT * FROM mv_estadisticas_atencion ORDER BY nombre_sede, especie LIMIT $1 OFFSET $2',
    [pagina.limite, pagina.offset],
  );
  return rows;
}

// se refresca la vista materializada
export async function refrescarEstadisticas() {
  await pool.query('SELECT fn_refrescar_mv_estadisticas()');
}
