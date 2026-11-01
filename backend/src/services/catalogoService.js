import bcrypt from 'bcrypt';
import * as repository from '../repositories/catalogoRepository.js';
import { encontradoOrThrow, httpError, opcionalId, paginacion, requerirEntero, requerirId, requerirTexto } from '../utils/validar.js';

// se piden los roles
export function getRoles(query) {
  return repository.findAllRoles(paginacion(query));
}

// se busca un rol (404 si no existe)
export async function getRolById(id) {
  const fila = await repository.findRolById(requerirId(id, 'Id de rol'));
  return encontradoOrThrow(fila, 'Rol no encontrado.');
}

// se piden las especies
export function getEspecies(query) {
  return repository.findAllEspecies(paginacion(query));
}

// se busca una especie (404 si no existe)
export async function getEspecieById(id) {
  const fila = await repository.findEspecieById(requerirId(id, 'Id de especie'));
  return encontradoOrThrow(fila, 'Especie no encontrada.');
}

// se valida y se crea una especie
export function createEspecie(body) {
  return repository.insertEspecie(requerirTexto(body.nombre, 'el nombre'));
}

// se valida y se actualiza una especie
export async function updateEspecie(id, body) {
  const especie = await repository.updateEspecie(requerirId(id, 'Id de especie'), requerirTexto(body.nombre, 'el nombre'));
  return encontradoOrThrow(especie, 'Especie no encontrada.');
}

// se borra una especie (404 si no existe)
export async function deleteEspecie(id) {
  encontradoOrThrow(await repository.deleteEspecie(requerirId(id, 'Id de especie')), 'Especie no encontrada.');
}

// se piden las sedes
export function getSedes(query) {
  return repository.findAllSedes(paginacion(query));
}

// se busca una sede (404 si no existe)
export async function getSedeById(id) {
  const fila = await repository.findSedeById(requerirId(id, 'Id de sede'));
  return encontradoOrThrow(fila, 'Sede no encontrada.');
}

// se valida y se crea una sede
export function createSede(body) {
  return repository.insertSede(requerirTexto(body.nombre, 'el nombre'));
}

// se valida y se actualiza una sede
export async function updateSede(id, body) {
  const sede = await repository.updateSede(requerirId(id, 'Id de sede'), requerirTexto(body.nombre, 'el nombre'));
  return encontradoOrThrow(sede, 'Sede no encontrada.');
}

// se borra una sede (404 si no existe)
export async function deleteSede(id) {
  encontradoOrThrow(await repository.deleteSede(requerirId(id, 'Id de sede')), 'Sede no encontrada.');
}

// se piden los medicamentos
export function getMedicamentos(query) {
  return repository.findAllMedicamentos(paginacion(query));
}

// se busca un medicamento (404 si no existe)
export async function getMedicamentoById(id) {
  const fila = await repository.findMedicamentoById(requerirId(id, 'Id de medicamento'));
  return encontradoOrThrow(fila, 'Medicamento no encontrado.');
}

// se valida y se crea un medicamento
export function createMedicamento(body) {
  const nombreComercial = requerirTexto(body.nombre_comercial, 'el nombre comercial');
  const principioActivo = requerirTexto(body.principio_activo, 'el principio activo');
  return repository.insertMedicamento(nombreComercial, principioActivo);
}

// se valida y se actualiza un medicamento
export async function updateMedicamento(id, body) {
  const nombreComercial = requerirTexto(body.nombre_comercial, 'el nombre comercial');
  const principioActivo = requerirTexto(body.principio_activo, 'el principio activo');
  const medicamento = await repository.updateMedicamento(requerirId(id, 'Id de medicamento'), nombreComercial, principioActivo);
  return encontradoOrThrow(medicamento, 'Medicamento no encontrado.');
}

// se borra un medicamento (404 si no existe)
export async function deleteMedicamento(id) {
  encontradoOrThrow(await repository.deleteMedicamento(requerirId(id, 'Id de medicamento')), 'Medicamento no encontrado.');
}

// se pide el inventario, filtrado por sede si viene ?id_sede
export function getInventarios(query) {
  return repository.findAllInventario(opcionalId(query.id_sede, 'Id de sede'), paginacion(query));
}

// se busca un registro del inventario (404 si no existe)
export async function getInventarioById(id) {
  const fila = await repository.findInventarioById(requerirId(id, 'Id de inventario'));
  return encontradoOrThrow(fila, 'Registro de inventario no encontrado.');
}

// se valida y se guarda el stock de un medicamento en una sede
export function saveInventario(body) {
  const idSede = requerirId(body.id_sede, 'Id de sede');
  const idMedicamento = requerirId(body.id_medicamento, 'Id de medicamento');
  const stock = requerirEntero(body.stock_actual, 'El stock');
  return repository.upsertInventario(idSede, idMedicamento, stock);
}

// se quita un medicamento del inventario (404 si no existe)
export async function deleteInventario(id) {
  encontradoOrThrow(await repository.deleteInventario(requerirId(id, 'Id de inventario')), 'Registro de inventario no encontrado.');
}

// se piden los tutores
export function getTutores(query) {
  return repository.findAllTutores(paginacion(query));
}

// se busca un tutor (404 si no existe)
export async function getTutorById(id) {
  const fila = await repository.findTutorById(requerirId(id, 'Id de tutor'));
  return encontradoOrThrow(fila, 'Tutor no encontrado.');
}

// se valida y se crea la cuenta de un tutor
export async function createTutor(body) {
  const { correo, passwordHash, nombre } = await validarCuenta(body);
  return repository.insertTutor(correo, passwordHash, nombre);
}

// se actualiza el nombre de un tutor
export async function updateTutor(id, body) {
  const tutor = await repository.updateTutor(requerirId(id, 'Id de tutor'), requerirTexto(body.nombre, 'el nombre'));
  return encontradoOrThrow(tutor, 'Tutor no encontrado.');
}

// se borra un tutor y su usuario (404 si no existe)
export async function deleteTutor(id) {
  encontradoOrThrow(await repository.deleteTutor(requerirId(id, 'Id de tutor')), 'Tutor no encontrado.');
}

// se piden los veterinarios
export function getVeterinarios(query) {
  return repository.findAllVeterinarios(paginacion(query));
}

// se busca un veterinario (404 si no existe)
export async function getVeterinarioById(id) {
  const fila = await repository.findVeterinarioById(requerirId(id, 'Id de veterinario'));
  return encontradoOrThrow(fila, 'Veterinario no encontrado.');
}

// se valida y se crea la cuenta de un veterinario
export async function createVeterinario(body) {
  const { correo, passwordHash, nombre } = await validarCuenta(body);
  const idSede = requerirId(body.id_sede, 'Id de sede');
  return repository.insertVeterinario(correo, passwordHash, nombre, idSede);
}

// se actualiza el nombre y la sede de un veterinario
export async function updateVeterinario(id, body) {
  const nombre = requerirTexto(body.nombre, 'el nombre');
  const idSede = requerirId(body.id_sede, 'Id de sede');
  const veterinario = await repository.updateVeterinario(requerirId(id, 'Id de veterinario'), nombre, idSede);
  return encontradoOrThrow(veterinario, 'Veterinario no encontrado.');
}

// se borra un veterinario y su usuario (404 si no existe)
export async function deleteVeterinario(id) {
  encontradoOrThrow(await repository.deleteVeterinario(requerirId(id, 'Id de veterinario')), 'Veterinario no encontrado.');
}

// se piden los administradores
export function getAdministradores(query) {
  return repository.findAllAdministradores(paginacion(query));
}

// se busca un administrador (404 si no existe)
export async function getAdministradorById(id) {
  const fila = await repository.findAdministradorById(requerirId(id, 'Id de administrador'));
  return encontradoOrThrow(fila, 'Administrador no encontrado.');
}

// se valida y se crea la cuenta de un administrador
export async function createAdministrador(body) {
  const { correo, passwordHash, nombre } = await validarCuenta(body);
  return repository.insertAdministrador(correo, passwordHash, nombre);
}

// se crea el administrador del .env solo si todavia no hay ninguno (la primera vez que se inicia)
export async function crearAdministradorInicial() {
  if (await repository.existeAdministrador()) return;
  await createAdministrador({
    nombre: process.env.ADMIN_NOMBRE,
    correo: process.env.ADMIN_CORREO,
    password: process.env.ADMIN_PASSWORD,
  });
  console.log(`Administrador inicial creado: ${process.env.ADMIN_CORREO}`);
}

// se actualiza el nombre de un administrador
export async function updateAdministrador(id, body) {
  const administrador = await repository.updateAdministrador(requerirId(id, 'Id de administrador'), requerirTexto(body.nombre, 'el nombre'));
  return encontradoOrThrow(administrador, 'Administrador no encontrado.');
}

// se borra un administrador (no se puede borrar el ultimo)
export async function deleteAdministrador(id) {
  const administrador = await repository.deleteAdministrador(requerirId(id, 'Id de administrador'));
  encontradoOrThrow(administrador, 'Administrador no encontrado, o es el único que queda.');
}

// se validan los datos de una cuenta nueva; el correo queda en minusculas y la contrasena como hash bcrypt
async function validarCuenta(body) {
  const correo = requerirTexto(body.correo, 'el correo').toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) throw httpError(400, 'El correo no tiene un formato válido.');
  const password = requerirTexto(body.password, 'la contraseña');
  if (password.length < 6) throw httpError(400, 'La contraseña debe tener al menos 6 caracteres.');
  const nombre = requerirTexto(body.nombre, 'el nombre');
  return { correo, passwordHash: await bcrypt.hash(password, 10), nombre };
}
