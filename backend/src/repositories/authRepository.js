import { pool } from '../config/db.js';

// se busca un usuario por correo (sin importar mayusculas) con su rol y su perfil
export async function findUsuarioByCorreo(correo) {
  const { rows } = await pool.query(
    `SELECT u.id_usuario AS id, u.email AS correo, u.password_hash, u.activo, r.nombre_rol AS rol,
            -- solo uno de los LEFT JOIN encuentra fila: el del perfil que corresponde a su rol
            COALESCE(a.nombre_administrador, v.nombre_veterinario, t.nombre_tutor) AS nombre,
            t.id_tutor, v.id_veterinario, v.id_sede
     FROM "USUARIO" u
     JOIN "ROL" r ON r.id_rol = u.id_rol
     LEFT JOIN "ADMINISTRADOR" a ON a.id_usuario = u.id_usuario
     LEFT JOIN "VETERINARIO" v ON v.id_usuario = u.id_usuario
     LEFT JOIN "TUTOR" t ON t.id_usuario = u.id_usuario
     WHERE lower(u.email) = lower($1)`,
    [correo],
  );
  return rows[0] ?? null;
}
