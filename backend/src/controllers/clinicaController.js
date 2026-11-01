import * as service from '../services/clinicaService.js';

// se responde la lista de citas
export async function getCitas(req, res) {
  res.json(await service.getCitas(req.query, req.user));
}

// se responde una cita por su id
export async function getCita(req, res) {
  res.json(await service.getCitaById(req.params.id, req.user));
}

// se crea una cita
export async function postCita(req, res) {
  res.status(201).json(await service.createCita(req.body, req.user));
}

// se modifica una cita
export async function patchCita(req, res) {
  res.json(await service.updateCita(req.params.id, req.body, req.user));
}

// se cancela una cita
export async function patchCancelarCita(req, res) {
  res.json(await service.cancelarCita(req.params.id, req.user));
}

// se borra una cita
export async function deleteCita(req, res) {
  await service.deleteCita(req.params.id);
  res.status(204).end();
}

// se responden las horas libres de un veterinario en una fecha
export async function getDisponibilidad(req, res) {
  res.json(await service.getBloquesDisponibles(req.params.id, req.query));
}

// se responde la lista de fichas clinicas
export async function getFichas(req, res) {
  res.json(await service.getFichas(req.query, req.user));
}

// se responde una ficha por su id
export async function getFicha(req, res) {
  res.json(await service.getFichaById(req.params.id, req.user));
}

// se corrige el diagnostico de una ficha cerrada
export async function patchFicha(req, res) {
  res.json(await service.updateFicha(req.params.id, req.body, req.user));
}

// se registra una atencion (procedimiento 1)
export async function postAtencion(req, res) {
  res.status(201).json(await service.registrarAtencion(req.body, req.user));
}

// se responde la lista de recetas
export async function getRecetas(req, res) {
  res.json(await service.getRecetas(req.query, req.user));
}

// se responde una receta por su id
export async function getReceta(req, res) {
  res.json(await service.getRecetaById(req.params.id, req.user));
}

// se responde la lista de cambios auditados
export async function getAuditorias(req, res) {
  res.json(await service.getAuditorias(req.query));
}

// se responde un cambio auditado por su id
export async function getAuditoria(req, res) {
  res.json(await service.getAuditoriaById(req.params.id));
}

// se responden las estadisticas de la vista materializada
export async function getEstadisticas(req, res) {
  res.json(await service.getEstadisticas(req.query));
}

// se refresca la vista materializada
export async function postRefrescarEstadisticas(req, res) {
  res.json(await service.refrescarEstadisticas());
}
