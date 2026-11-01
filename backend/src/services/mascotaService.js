import * as repository from '../repositories/mascotaRepository.js';
import { encontradoOrThrow, opcionalId, paginacion, requerirId, requerirTexto } from '../utils/validar.js';

// se piden las mascotas (el tutor solo las suyas)
export function getMascotas(query, user) {
  return repository.findAllMascotas(tutorDe(user), paginacion(query));
}

// se busca una mascota (404 si no existe o no es del tutor)
export async function getMascotaById(id, user) {
  const mascota = await repository.findMascotaById(requerirId(id, 'Id de mascota'), tutorDe(user));
  return encontradoOrThrow(mascota, 'Mascota no encontrada.');
}

// se valida y se crea una mascota; el tutor la crea a su nombre
export function createMascota(body, user) {
  const nombre = requerirTexto(body.nombre, 'el nombre');
  const idEspecie = requerirId(body.id_especie, 'Id de especie');
  const idTutor = user.rol === 'Tutor' ? user.id_tutor : requerirId(body.id_tutor, 'Id de tutor');
  return repository.insertMascota(nombre, idEspecie, idTutor);
}

// se valida y se actualiza una mascota
export async function updateMascota(id, body, user) {
  const nombre = requerirTexto(body.nombre, 'el nombre');
  const idEspecie = requerirId(body.id_especie, 'Id de especie');
  const mascota = await repository.updateMascota(requerirId(id, 'Id de mascota'), nombre, idEspecie, tutorDe(user));
  return encontradoOrThrow(mascota, 'Mascota no encontrada.');
}

// se borra una mascota (404 si no existe)
export async function deleteMascota(id) {
  encontradoOrThrow(await repository.deleteMascota(requerirId(id, 'Id de mascota')), 'Mascota no encontrada.');
}

// se piden las alergias, filtradas por mascota si viene ?id_mascota
export function getAlergias(query, user) {
  return repository.findAllAlergias(opcionalId(query.id_mascota, 'Id de mascota'), tutorDe(user), paginacion(query));
}

// se busca una alergia (404 si no existe o no es del tutor)
export async function getAlergiaById(id, user) {
  const alergia = await repository.findAlergiaById(requerirId(id, 'Id de alergia'), tutorDe(user));
  return encontradoOrThrow(alergia, 'Alergia no encontrada.');
}

// se valida y se crea una alergia
export function createAlergia(body) {
  const idMascota = requerirId(body.id_mascota, 'Id de mascota');
  const principioActivo = requerirTexto(body.principio_activo, 'el principio activo');
  return repository.insertAlergia(idMascota, principioActivo);
}

// se valida y se actualiza una alergia
export async function updateAlergia(id, body) {
  const principioActivo = requerirTexto(body.principio_activo, 'el principio activo');
  const alergia = await repository.updateAlergia(requerirId(id, 'Id de alergia'), principioActivo);
  return encontradoOrThrow(alergia, 'Alergia no encontrada.');
}

// se borra una alergia (404 si no existe)
export async function deleteAlergia(id) {
  encontradoOrThrow(await repository.deleteAlergia(requerirId(id, 'Id de alergia')), 'Alergia no encontrada.');
}

// el tutor solo ve lo suyo; veterinario y administrador ven todo (null = sin filtro)
function tutorDe(user) {
  return user.rol === 'Tutor' ? user.id_tutor : null;
}
