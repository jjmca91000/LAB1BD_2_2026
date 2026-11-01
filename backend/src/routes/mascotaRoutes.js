import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as controller from '../controllers/mascotaController.js';

const soloAdmin = authorize('Administrador');
const tutorOAdmin = authorize('Tutor', 'Administrador');
const veterinarioOAdmin = authorize('Veterinario', 'Administrador');

const router = Router();
// todas las rutas de este archivo piden token
router.use(authenticate);

// mascotas
router.get('/mascotas', controller.getMascotas);
router.get('/mascotas/:id', controller.getMascota);
router.post('/mascotas', tutorOAdmin, controller.postMascota);
router.patch('/mascotas/:id', tutorOAdmin, controller.patchMascota);
router.delete('/mascotas/:id', soloAdmin, controller.deleteMascota);

// alergias (?id_mascota= filtra por mascota)
router.get('/alergias', controller.getAlergias);
router.get('/alergias/:id', controller.getAlergia);
router.post('/alergias', veterinarioOAdmin, controller.postAlergia);
router.patch('/alergias/:id', veterinarioOAdmin, controller.patchAlergia);
router.delete('/alergias/:id', veterinarioOAdmin, controller.deleteAlergia);

export default router;
