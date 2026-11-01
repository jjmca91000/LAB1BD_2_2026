import express from 'express';
import cors from 'cors';
import { manejarErrores } from './middleware/errores.js';
import authRoutes from './routes/authRoutes.js';
import catalogoRoutes from './routes/catalogoRoutes.js';
import mascotaRoutes from './routes/mascotaRoutes.js';
import clinicaRoutes from './routes/clinicaRoutes.js';
import vacunacionRoutes from './routes/vacunacionRoutes.js';

// se arma la aplicacion: cors, json, rutas y manejo de errores
export const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// si la peticion no trae body se deja un objeto vacio, asi los services no revisan undefined
app.use((req, _res, next) => {
  req.body ??= {};
  next();
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api', catalogoRoutes);
app.use('/api', mascotaRoutes);
app.use('/api', clinicaRoutes);
app.use('/api', vacunacionRoutes);

// cualquier ruta que no exista responde 404 en JSON
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use(manejarErrores);
