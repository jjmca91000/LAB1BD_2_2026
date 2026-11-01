import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import * as controller from '../controllers/catalogoController.js';

const soloAdmin = authorize('Administrador');
const veterinarioOAdmin = authorize('Veterinario', 'Administrador');

const router = Router();
// todas las rutas de este archivo piden token
router.use(authenticate);

// roles (solo lectura)
router.get('/roles', soloAdmin, controller.getRoles);
router.get('/roles/:id', soloAdmin, controller.getRol);

// especies
router.get('/especies', controller.getEspecies);
router.get('/especies/:id', controller.getEspecie);
router.post('/especies', soloAdmin, controller.postEspecie);
router.patch('/especies/:id', soloAdmin, controller.patchEspecie);
router.delete('/especies/:id', soloAdmin, controller.deleteEspecie);

// sedes
router.get('/sedes', controller.getSedes);
router.get('/sedes/:id', controller.getSede);
router.post('/sedes', soloAdmin, controller.postSede);
router.patch('/sedes/:id', soloAdmin, controller.patchSede);
router.delete('/sedes/:id', soloAdmin, controller.deleteSede);

// medicamentos
router.get('/medicamentos', veterinarioOAdmin, controller.getMedicamentos);
router.get('/medicamentos/:id', veterinarioOAdmin, controller.getMedicamento);
router.post('/medicamentos', soloAdmin, controller.postMedicamento);
router.patch('/medicamentos/:id', soloAdmin, controller.patchMedicamento);
router.delete('/medicamentos/:id', soloAdmin, controller.deleteMedicamento);

// inventario (el POST crea o reemplaza el stock)
router.get('/inventario', veterinarioOAdmin, controller.getInventarios);
router.get('/inventario/:id', veterinarioOAdmin, controller.getInventario);
router.post('/inventario', soloAdmin, controller.postInventario);
router.delete('/inventario/:id', soloAdmin, controller.deleteInventario);

// tutores
router.get('/tutores', veterinarioOAdmin, controller.getTutores);
router.get('/tutores/:id', veterinarioOAdmin, controller.getTutor);
router.post('/tutores', soloAdmin, controller.postTutor);
router.patch('/tutores/:id', soloAdmin, controller.patchTutor);
router.delete('/tutores/:id', soloAdmin, controller.deleteTutor);

// veterinarios
router.get('/veterinarios', controller.getVeterinarios);
router.get('/veterinarios/:id', controller.getVeterinario);
router.post('/veterinarios', soloAdmin, controller.postVeterinario);
router.patch('/veterinarios/:id', soloAdmin, controller.patchVeterinario);
router.delete('/veterinarios/:id', soloAdmin, controller.deleteVeterinario);

// administradores
router.get('/administradores', soloAdmin, controller.getAdministradores);
router.get('/administradores/:id', soloAdmin, controller.getAdministrador);
router.post('/administradores', soloAdmin, controller.postAdministrador);
router.patch('/administradores/:id', soloAdmin, controller.patchAdministrador);
router.delete('/administradores/:id', soloAdmin, controller.deleteAdministrador);

export default router;
