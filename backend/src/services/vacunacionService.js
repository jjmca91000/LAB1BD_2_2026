import * as repository from '../repositories/vacunacionRepository.js';
import { getCitaById } from './clinicaService.js';
import { encontradoOrThrow, paginacion, requerirEntero, requerirId, requerirTexto } from '../utils/validar.js';

// se piden los planes de vacunacion
export function getPlanes(query) {
  return repository.findAllPlanes(paginacion(query));
}

// se busca un plan (404 si no existe)
export async function getPlanById(id) {
  const plan = await repository.findPlanById(requerirId(id, 'Id de plan'));
  return encontradoOrThrow(plan, 'Plan de vacunación no encontrado.');
}

// se valida y se crea un plan
export function createPlan(body) {
  const { idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo } = validarPlan(body);
  return repository.insertPlan(idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo);
}

// se valida y se actualiza un plan
export async function updatePlan(id, body) {
  const { idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo } = validarPlan(body);
  const plan = await repository.updatePlan(requerirId(id, 'Id de plan'), idEspecie, nombreVacuna, cantidadRefuerzo, diasRefuerzo);
  return encontradoOrThrow(plan, 'Plan de vacunación no encontrado.');
}

// se borra un plan (404 si no existe)
export async function deletePlan(id) {
  encontradoOrThrow(await repository.deletePlan(requerirId(id, 'Id de plan')), 'Plan de vacunación no encontrado.');
}

// se pide el historial de vacunas (el tutor solo el de sus mascotas)
export function getRegistros(query, user) {
  return repository.findAllRegistros(tutorDe(user), paginacion(query));
}

// se busca un registro de vacuna (404 si no existe o no es del tutor)
export async function getRegistroById(id, user) {
  const registro = await repository.findRegistroById(requerirId(id, 'Id de registro'), tutorDe(user));
  return encontradoOrThrow(registro, 'Registro de vacunación no encontrado.');
}

// se aplica una vacuna con el procedimiento 2 (el veterinario solo en sus citas)
export async function aplicarVacuna(body, user) {
  const { id: idCita } = await getCitaById(body.id_cita, user);
  const idVacuna = requerirId(body.id_vacuna, 'Id de plan de vacunación');
  await repository.aplicarVacuna(idCita, idVacuna);
  return { mensaje: 'Vacuna registrada. Si era la primera dosis, se agendaron las citas de refuerzo.' };
}

// se borra un registro de vacuna (404 si no existe)
export async function deleteRegistro(id) {
  encontradoOrThrow(await repository.deleteRegistro(requerirId(id, 'Id de registro')), 'Registro de vacunación no encontrado.');
}

// se piden las vacunas vencidas o por vencer en 30 dias
export function getVacunasPorVencer(query, user) {
  return repository.findVacunasPorVencer(tutorDe(user), paginacion(query));
}

// se validan los datos de un plan
function validarPlan(body) {
  return {
    idEspecie: requerirId(body.id_especie, 'Id de especie'),
    nombreVacuna: requerirTexto(body.nombre_vacuna, 'el nombre de la vacuna'),
    cantidadRefuerzo: requerirEntero(body.cantidad_refuerzo, 'La cantidad de refuerzos'),
    diasRefuerzo: requerirEntero(body.dias_refuerzo, 'Los días entre refuerzos'),
  };
}

// el tutor solo ve lo suyo (null = sin filtro)
function tutorDe(user) {
  return user.rol === 'Tutor' ? user.id_tutor : null;
}
