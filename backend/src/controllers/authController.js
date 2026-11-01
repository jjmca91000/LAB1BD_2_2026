import * as service from '../services/authService.js';

// se inicia sesion
export async function postLogin(req, res) {
  res.json(await service.login(req.body));
}

// se registra un tutor nuevo
export async function postRegistro(req, res) {
  res.status(201).json(await service.registrar(req.body));
}
