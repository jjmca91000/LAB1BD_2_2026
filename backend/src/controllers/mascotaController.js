import * as service from '../services/mascotaService.js';

// se responde la lista de mascotas
export async function getMascotas(req, res) {
  res.json(await service.getMascotas(req.query, req.user));
}

// se responde una mascota por su id
export async function getMascota(req, res) {
  res.json(await service.getMascotaById(req.params.id, req.user));
}

// se crea una mascota
export async function postMascota(req, res) {
  res.status(201).json(await service.createMascota(req.body, req.user));
}

// se modifica una mascota
export async function patchMascota(req, res) {
  res.json(await service.updateMascota(req.params.id, req.body, req.user));
}

// se borra una mascota
export async function deleteMascota(req, res) {
  await service.deleteMascota(req.params.id);
  res.status(204).end();
}

// se responde la lista de alergias
export async function getAlergias(req, res) {
  res.json(await service.getAlergias(req.query, req.user));
}

// se responde una alergia por su id
export async function getAlergia(req, res) {
  res.json(await service.getAlergiaById(req.params.id, req.user));
}

// se crea una alergia
export async function postAlergia(req, res) {
  res.status(201).json(await service.createAlergia(req.body));
}

// se modifica una alergia
export async function patchAlergia(req, res) {
  res.json(await service.updateAlergia(req.params.id, req.body));
}

// se borra una alergia
export async function deleteAlergia(req, res) {
  await service.deleteAlergia(req.params.id);
  res.status(204).end();
}
