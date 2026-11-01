import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as controller from '../controllers/vacunacionController.js';

const soloAdmin = authorize('Administrador');
const veterinarioOAdmin = authorize('Veterinario', 'Administrador');

const router = Router();
// todas las rutas de este archivo piden token
router.use(authenticate);

// planes de vacunacion
router.get('/planes-vacunacion', veterinarioOAdmin, controller.getPlanes);
router.get('/planes-vacunacion/:id', veterinarioOAdmin, controller.getPlan);
router.post('/planes-vacunacion', soloAdmin, controller.postPlan);
router.patch('/planes-vacunacion/:id', soloAdmin, controller.patchPlan);
router.delete('/planes-vacunacion/:id', soloAdmin, controller.deletePlan);

// registros de vacunacion (el POST es el procedimiento 2)
router.get('/vacunaciones', controller.getRegistros);
// /por-vencer va antes que /:id para que Express no lo tome como un id
router.get('/vacunaciones/por-vencer', controller.getPorVencer);
router.get('/vacunaciones/:id', controller.getRegistro);
router.post('/vacunaciones', veterinarioOAdmin, controller.postVacunacion);
router.delete('/vacunaciones/:id', soloAdmin, controller.deleteRegistro);

export default router;
