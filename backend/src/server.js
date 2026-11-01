import 'dotenv/config';
import cron from 'node-cron';
import { app } from './app.js';
import { pool } from './config/db.js';
import { crearAdministradorInicial } from './services/catalogoService.js';

// sin la clave JWT no se pueden firmar los tokens, asi que no se inicia
if (!process.env.JWT_SECRET) {
  throw new Error('Configura JWT_SECRET en backend/.env antes de iniciar.');
}

// la primera vez que se inicia el sistema se crea el administrador de backend/.env
await crearAdministradorInicial();

// todos los dias a las 03:00 se refresca la vista materializada de estadisticas
cron.schedule('0 3 * * *', async () => {
  try {
    await pool.query('SELECT fn_refrescar_mv_estadisticas();');
    console.log('[CRON] Vista materializada mv_estadisticas_atencion actualizada.');
  } catch (error) {
    console.error('[CRON] Error al refrescar vista materializada:', error.message);
  }
});

// se inicia el servidor
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API disponible en http://localhost:${port}`));