import * as repository from '../repositories/clinicaRepository.js';
import { encontradoOrThrow, httpError, opcionalId, paginacion, requerirId, requerirTexto } from '../utils/validar.js';

// se piden las citas: el tutor las de sus mascotas, el veterinario las suyas y el admin todas
export function getCitas(query, user) {
  return repository.findAllCitas(tutorDe(user), veterinarioDe(user), paginacion(query));
}

// se busca una cita; si no es del usuario da 404, asi tambien sirve para revisar permisos
export async function getCitaById(id, user) {
  const cita = await repository.findCitaById(requerirId(id, 'Id de cita'), tutorDe(user), veterinarioDe(user));
  return encontradoOrThrow(cita, 'Cita no encontrada.');
}

// se valida y se agenda una cita (con su ficha abierta)
export async function createCita(body, user) {
  const idMascota = requerirId(body.id_mascota, 'Id de mascota');
  const { idSede, idVeterinario, tipoAtencion, fechaHora } = validarDatosCita(body);
  await validarVeterinarioEnSede(idVeterinario, idSede);
  await validarHoraLibre(idVeterinario, fechaHora, null);
  const cita = await repository.insertCita(idMascota, idSede, idVeterinario, tipoAtencion, fechaHora, tutorDe(user));
  return encontradoOrThrow(cita, 'Mascota no encontrada.');
}

// se valida y se reprograma una cita
export async function updateCita(id, body, user) {
  const cita = await getCitaById(id, user);
  const { idSede, idVeterinario, tipoAtencion, fechaHora } = validarDatosCita(body);
  await validarVeterinarioEnSede(idVeterinario, idSede);
  await validarHoraLibre(idVeterinario, fechaHora, cita.id);
  const actualizada = await repository.updateCita(cita.id, idSede, idVeterinario, tipoAtencion, fechaHora);
  return encontradoOrThrow(actualizada, 'La cita ya no está programada.');
}

// se cancela una cita programada
export async function cancelarCita(id, user) {
  const cita = await getCitaById(id, user);
  const cancelada = await repository.cancelarCita(cita.id);
  return encontradoOrThrow(cancelada, 'La cita ya no está programada.');
}

// se borra una cita (404 si no existe)
export async function deleteCita(id) {
  encontradoOrThrow(await repository.deleteCita(requerirId(id, 'Id de cita')), 'Cita no encontrada.');
}

// se piden las horas libres de un veterinario en una fecha
export function getBloquesDisponibles(idVeterinario, query) {
  const id = requerirId(idVeterinario, 'Id de veterinario');
  const fecha = requerirTexto(query.fecha, 'la fecha');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw httpError(400, 'La fecha debe tener el formato AAAA-MM-DD.');
  return repository.findBloquesDisponibles(id, fecha, paginacion(query));
}

// se piden las fichas (el tutor solo las de sus mascotas)
export function getFichas(query, user) {
  return repository.findAllFichas(tutorDe(user), paginacion(query));
}

// se busca una ficha (404 si no existe o no es del tutor)
export async function getFichaById(id, user) {
  const ficha = await repository.findFichaById(requerirId(id, 'Id de ficha'), tutorDe(user));
  return encontradoOrThrow(ficha, 'Ficha no encontrada.');
}

// se corrige el diagnostico de una ficha cerrada (el trigger 2 lo audita)
export async function updateFicha(id, body, user) {
  const diagnostico = requerirTexto(body.diagnostico, 'el diagnóstico');
  const tratamiento = requerirTexto(body.tratamiento, 'el tratamiento');
  const ficha = await repository.updateFichaCerrada(requerirId(id, 'Id de ficha'), diagnostico, tratamiento, user.id, veterinarioDe(user));
  return encontradoOrThrow(ficha, 'Ficha no encontrada o todavía abierta (las fichas abiertas se cierran registrando la atención).');
}

// se valida y se registra una atencion con el procedimiento 1
export async function registrarAtencion(body, user) {
  const { id: idCita } = await getCitaById(body.id_cita, user);
  const diagnostico = requerirTexto(body.diagnostico, 'el diagnóstico');
  const tratamiento = requerirTexto(body.tratamiento, 'el tratamiento');
  const medicamentos = Array.isArray(body.medicamentos) ? body.medicamentos.map(id => requerirId(id, 'Id de medicamento')) : [];
  const cantidades = Array.isArray(body.cantidades) ? body.cantidades.map(cantidad => requerirId(cantidad, 'La cantidad')) : [];
  const idVacuna = opcionalId(body.id_vacuna, 'Id de plan de vacunación');

  await repository.registrarAtencion(idCita, diagnostico, tratamiento, user.id, medicamentos, cantidades, idVacuna);
  return { mensaje: 'Atención registrada: ficha cerrada, recetas creadas e inventario descontado.' };
}

// se piden las recetas (el tutor solo las de sus mascotas)
export function getRecetas(query, user) {
  return repository.findAllRecetas(tutorDe(user), paginacion(query));
}

// se busca una receta (404 si no existe o no es del tutor)
export async function getRecetaById(id, user) {
  const receta = await repository.findRecetaById(requerirId(id, 'Id de receta'), tutorDe(user));
  return encontradoOrThrow(receta, 'Receta no encontrada.');
}

// se piden los cambios auditados
export function getAuditorias(query) {
  return repository.findAllAuditoria(paginacion(query));
}

// se busca un cambio auditado (404 si no existe)
export async function getAuditoriaById(id) {
  const registro = await repository.findAuditoriaById(requerirId(id, 'Id de auditoría'));
  return encontradoOrThrow(registro, 'Registro de auditoría no encontrado.');
}

// se piden las estadisticas de la vista materializada, filtradas por ?id_sede y ?id_especie si vienen
export function getEstadisticas(query) {
  const idSede = opcionalId(query.id_sede, 'Id de sede');
  const idEspecie = opcionalId(query.id_especie, 'Id de especie');
  return repository.findEstadisticas(idSede, idEspecie, paginacion(query));
}

// se refresca la vista materializada
export async function refrescarEstadisticas() {
  await repository.refrescarEstadisticas();
  return { mensaje: 'Estadísticas actualizadas.' };
}

// el tutor solo ve lo suyo (null = sin filtro)
function tutorDe(user) {
  return user.rol === 'Tutor' ? user.id_tutor : null;
}

// el veterinario solo trabaja sobre sus citas (null = sin filtro)
function veterinarioDe(user) {
  return user.rol === 'Veterinario' ? user.id_veterinario : null;
}

// se revisa que el veterinario trabaje en la sede elegida
async function validarVeterinarioEnSede(idVeterinario, idSede) {
  if (!(await repository.veterinarioEstaEnSede(idVeterinario, idSede))) {
    throw httpError(400, 'El veterinario elegido no atiende en esa sede.');
  }
}

// se revisa que el veterinario no tenga otra cita a esa hora (al reprogramar no cuenta la misma cita)
async function validarHoraLibre(idVeterinario, fechaHora, idCitaActual) {
  if (await repository.existeCitaEnHora(idVeterinario, fechaHora, idCitaActual)) {
    throw httpError(409, 'El veterinario ya tiene una cita a esa hora.');
  }
}

// se validan los datos que se piden al agendar y al reprogramar
function validarDatosCita(body) {
  return {
    idSede: requerirId(body.id_sede, 'Id de sede'),
    idVeterinario: requerirId(body.id_veterinario, 'Id de veterinario'),
    tipoAtencion: requerirTexto(body.tipo_atencion, 'el tipo de atención'),
    fechaHora: validarFechaFutura(requerirTexto(body.fecha_hora, 'la fecha y hora')),
  };
}

// se revisa que la fecha no sea un dia pasado (se comparan los textos AAAA-MM-DD)
function validarFechaFutura(fechaHora) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (fechaHora.slice(0, 10) < hoy) throw httpError(400, 'No se pueden agendar citas en días pasados.');
  return fechaHora;
}
