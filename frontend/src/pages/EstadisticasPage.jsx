import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const COLUMNAS = [
  ['nombre_sede', 'Sede'], ['especie', 'Especie'], ['cantidad_atenciones', 'Atenciones'],
  ['diagnosticos_mas_frecuentes', 'Diagnósticos más frecuentes'],
];

// pantalla de estadisticas (vista materializada) con filtros por sede y especie
export default function EstadisticasPage() {
  const { session } = useAuth();
  const token = session.token;

  const [sedes, setSedes] = useState([]);
  const [especies, setEspecies] = useState([]);
  const [idSede, setIdSede] = useState('');
  const [idEspecie, setIdEspecie] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  // se cargan las sedes y especies para los filtros
  useEffect(() => {
    api('/sedes', { token }).then(setSedes);
    api('/especies', { token }).then(setEspecies);
  }, [token]);

  // se hace la peticion para refrescar la vista a mano (sin esperar al cron de las 03:00)
  async function refrescar() {
    try {
      const respuesta = await api('/estadisticas/refrescar', { token, method: 'POST' });
      setMensaje(respuesta.mensaje);
      setVersion(version + 1);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  // los filtros vacios no se mandan (Ninguno = todas)
  const filtros = new URLSearchParams();
  if (idSede) filtros.set('id_sede', idSede);
  if (idEspecie) filtros.set('id_especie', idEspecie);
  const endpoint = filtros.toString() ? `/estadisticas?${filtros}` : '/estadisticas';

  return <>
    <section>
      <button onClick={refrescar}>Refrescar ahora</button>
      {mensaje && <p>{mensaje}</p>}
      <label>Sede
        <Selector opcional valor={idSede} opciones={sedes} texto={s => s.nombre} alCambiar={setIdSede} />
      </label>
      <label>Especie
        <Selector opcional valor={idEspecie} opciones={especies} texto={e => e.nombre} alCambiar={setIdEspecie} />
      </label>
    </section>

    {/* el key hace que al cambiar un filtro o al refrescar la tabla se vuelva a cargar desde la pagina 1 */}
    <ListPage key={`${endpoint}-${version}`} title="Estadísticas de atención (últimos 12 meses)" endpoint={endpoint} columns={COLUMNAS} />
  </>;
}
