import * as service from '../services/vacunacionService.js';

// se responde la lista de planes de vacunacion
export async function getPlanes(req, res) {
  res.json(await service.getPlanes(req.query));
}

// se responde un plan de vacunacion por su id
export async function getPlan(req, res) {
  res.json(await service.getPlanById(req.params.id));
}

// se crea un plan de vacunacion
export async function postPlan(req, res) {
  res.status(201).json(await service.createPlan(req.body));
}

// se modifica un plan de vacunacion
export async function patchPlan(req, res) {
  res.json(await service.updatePlan(req.params.id, req.body));
}

// se borra un plan de vacunacion
export async function deletePlan(req, res) {
  await service.deletePlan(req.params.id);
  res.status(204).end();
}

// se responde el historial de vacunas
export async function getRegistros(req, res) {
  res.json(await service.getRegistros(req.query, req.user));
}

// se responde un registro de vacuna por su id
export async function getRegistro(req, res) {
  res.json(await service.getRegistroById(req.params.id, req.user));
}

// se aplica una vacuna (procedimiento 2)
export async function postVacunacion(req, res) {
  res.status(201).json(await service.aplicarVacuna(req.body, req.user));
}

// se borra un registro de vacuna
export async function deleteRegistro(req, res) {
  await service.deleteRegistro(req.params.id);
  res.status(204).end();
}

// se responden las vacunas vencidas o por vencer en 30 dias
export async function getPorVencer(req, res) {
  res.json(await service.getVacunasPorVencer(req.query, req.user));
}
