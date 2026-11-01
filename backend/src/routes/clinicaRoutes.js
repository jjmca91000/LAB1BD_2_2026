import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as controller from '../controllers/clinicaController.js';

const soloAdmin = authorize('Administrador');
const veterinarioOAdmin = authorize('Veterinario', 'Administrador');

const router = Router();
// todas las rutas de este archivo piden token
router.use(authenticate);

// citas y disponibilidad horaria
router.get('/citas', controller.getCitas);
router.get('/citas/:id', controller.getCita);
router.post('/citas', controller.postCita);
router.patch('/citas/:id', veterinarioOAdmin, controller.patchCita);
router.patch('/citas/:id/cancelar', veterinarioOAdmin, controller.patchCancelarCita);
router.delete('/citas/:id', soloAdmin, controller.deleteCita);
router.get('/veterinarios/:id/disponibilidad', controller.getDisponibilidad);

// fichas clinicas, atenciones (procedimiento 1) y recetas
router.get('/fichas', controller.getFichas);
router.get('/fichas/:id', controller.getFicha);
router.patch('/fichas/:id', veterinarioOAdmin, controller.patchFicha);
router.post('/atenciones', veterinarioOAdmin, controller.postAtencion);

router.get('/recetas', controller.getRecetas);
router.get('/recetas/:id', controller.getReceta);

// auditoria (trigger 2) y estadisticas (vista materializada)
router.get('/auditoria', soloAdmin, controller.getAuditorias);
router.get('/auditoria/:id', soloAdmin, controller.getAuditoria);
router.get('/estadisticas', soloAdmin, controller.getEstadisticas);
router.post('/estadisticas/refrescar', soloAdmin, controller.postRefrescarEstadisticas);

export default router;
