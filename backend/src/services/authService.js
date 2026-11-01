import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as repository from '../repositories/authRepository.js';
import { createTutor } from './catalogoService.js';
import { httpError, requerirTexto } from '../utils/validar.js';

// se revisa el correo y la contrasena y se entrega un token
export async function login(body) {
  const correo = requerirTexto(body.correo, 'el correo');
  const password = requerirTexto(body.password, 'la contraseña');

  const usuario = await repository.findUsuarioByCorreo(correo);
  if (!usuario?.activo || !(await bcrypt.compare(password, usuario.password_hash))) {
    throw httpError(401, 'Credenciales incorrectas.');
  }

  // el token guarda el rol y los ids que se usan para filtrar por rol
  const token = jwt.sign(
    { sub: String(usuario.id), rol: usuario.rol, id_tutor: usuario.id_tutor, id_veterinario: usuario.id_veterinario, id_sede: usuario.id_sede },
    process.env.JWT_SECRET,
    { expiresIn: '8h' },
  );
  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      id_tutor: usuario.id_tutor,
      id_veterinario: usuario.id_veterinario,
      id_sede: usuario.id_sede,
    },
  };
}

// se crea una cuenta de tutor y se inicia sesion con ella
export async function registrar(body) {
  await createTutor(body);
  return login(body);
}
