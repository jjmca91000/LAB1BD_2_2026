import { Router } from 'express';
import * as controller from '../controllers/authController.js';

const router = Router();

// rutas publicas: no piden token porque son las que lo entregan
router.post('/login', controller.postLogin);
router.post('/registro', controller.postRegistro);

export default router;
