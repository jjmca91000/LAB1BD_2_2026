import * as service from '../services/catalogoService.js';

// se responde la lista de roles
export async function getRoles(req, res) {
  res.json(await service.getRoles(req.query));
}

// se responde un rol por su id
export async function getRol(req, res) {
  res.json(await service.getRolById(req.params.id));
}

// se responde la lista de especies
export async function getEspecies(req, res) {
  res.json(await service.getEspecies(req.query));
}

// se responde una especie por su id
export async function getEspecie(req, res) {
  res.json(await service.getEspecieById(req.params.id));
}

// se crea una especie
export async function postEspecie(req, res) {
  res.status(201).json(await service.createEspecie(req.body));
}

// se modifica una especie
export async function patchEspecie(req, res) {
  res.json(await service.updateEspecie(req.params.id, req.body));
}

// se borra una especie
export async function deleteEspecie(req, res) {
  await service.deleteEspecie(req.params.id);
  res.status(204).end();
}

// se responde la lista de sedes
export async function getSedes(req, res) {
  res.json(await service.getSedes(req.query));
}

// se responde una sede por su id
export async function getSede(req, res) {
  res.json(await service.getSedeById(req.params.id));
}

// se crea una sede
export async function postSede(req, res) {
  res.status(201).json(await service.createSede(req.body));
}

// se modifica una sede
export async function patchSede(req, res) {
  res.json(await service.updateSede(req.params.id, req.body));
}

// se borra una sede
export async function deleteSede(req, res) {
  await service.deleteSede(req.params.id);
  res.status(204).end();
}

// se responde la lista de medicamentos
export async function getMedicamentos(req, res) {
  res.json(await service.getMedicamentos(req.query));
}

// se responde un medicamento por su id
export async function getMedicamento(req, res) {
  res.json(await service.getMedicamentoById(req.params.id));
}

// se crea un medicamento
export async function postMedicamento(req, res) {
  res.status(201).json(await service.createMedicamento(req.body));
}

// se modifica un medicamento
export async function patchMedicamento(req, res) {
  res.json(await service.updateMedicamento(req.params.id, req.body));
}

// se borra un medicamento
export async function deleteMedicamento(req, res) {
  await service.deleteMedicamento(req.params.id);
  res.status(204).end();
}

// se responde el inventario (?id_sede= filtra por sede)
export async function getInventarios(req, res) {
  res.json(await service.getInventarios(req.query));
}

// se responde un registro del inventario por su id
export async function getInventario(req, res) {
  res.json(await service.getInventarioById(req.params.id));
}

// se agrega un medicamento a una sede o se reemplaza su stock
export async function postInventario(req, res) {
  res.json(await service.saveInventario(req.body));
}

// se quita un medicamento del inventario de una sede
export async function deleteInventario(req, res) {
  await service.deleteInventario(req.params.id);
  res.status(204).end();
}

// se responde la lista de tutores
export async function getTutores(req, res) {
  res.json(await service.getTutores(req.query));
}

// se responde un tutor por su id
export async function getTutor(req, res) {
  res.json(await service.getTutorById(req.params.id));
}

// se crea un tutor
export async function postTutor(req, res) {
  res.status(201).json(await service.createTutor(req.body));
}

// se modifica un tutor
export async function patchTutor(req, res) {
  res.json(await service.updateTutor(req.params.id, req.body));
}

// se borra un tutor
export async function deleteTutor(req, res) {
  await service.deleteTutor(req.params.id);
  res.status(204).end();
}

// se responde la lista de veterinarios
export async function getVeterinarios(req, res) {
  res.json(await service.getVeterinarios(req.query));
}

// se responde un veterinario por su id
export async function getVeterinario(req, res) {
  res.json(await service.getVeterinarioById(req.params.id));
}

// se crea un veterinario
export async function postVeterinario(req, res) {
  res.status(201).json(await service.createVeterinario(req.body));
}

// se modifica un veterinario
export async function patchVeterinario(req, res) {
  res.json(await service.updateVeterinario(req.params.id, req.body));
}

// se borra un veterinario
export async function deleteVeterinario(req, res) {
  await service.deleteVeterinario(req.params.id);
  res.status(204).end();
}

// se responde la lista de administradores
export async function getAdministradores(req, res) {
  res.json(await service.getAdministradores(req.query));
}

// se responde un administrador por su id
export async function getAdministrador(req, res) {
  res.json(await service.getAdministradorById(req.params.id));
}

// se crea un administrador
export async function postAdministrador(req, res) {
  res.status(201).json(await service.createAdministrador(req.body));
}

// se modifica un administrador
export async function patchAdministrador(req, res) {
  res.json(await service.updateAdministrador(req.params.id, req.body));
}

// se borra un administrador
export async function deleteAdministrador(req, res) {
  await service.deleteAdministrador(req.params.id);
  res.status(204).end();
}
