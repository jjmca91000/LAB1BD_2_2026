import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const FORM_VACIO = { nombre: '', id_especie: '', id_tutor: '' };
const ALERGIA_VACIA = { id_mascota: '', principio_activo: '' };

// pantalla de mascotas: lista, formulario para agregar una y sus alergias
export default function MascotasPage() {
  const { session } = useAuth();
  const { token, usuario } = session;
  const esTutor = usuario.rol === 'Tutor';
  const esAdmin = usuario.rol === 'Administrador';

  const [especies, setEspecies] = useState([]);
  const [tutores, setTutores] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  // se cargan las especies y, si es admin, los tutores
  useEffect(() => {
    api('/especies', { token }).then(setEspecies);
    if (esAdmin) api('/tutores', { token }).then(setTutores);
  }, [token, esAdmin]);

  // se actualiza un campo del formulario
  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // se hace la peticion para registrar la mascota
  async function agregar(event) {
    event.preventDefault();
    try {
      await api('/mascotas', { token, method: 'POST', body: form });
      setMensaje(`${form.nombre} quedó registrada.`);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      setVersion(version + 1);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  const puedeAgregar = usuario.rol !== 'Veterinario';
  // el tutor no ve la columna Tutor (siempre seria el)
  const columnas = esTutor
    ? [['nombre', 'Nombre'], ['especie', 'Especie'], ['alergias', 'Alergias']]
    : [['nombre', 'Nombre'], ['especie', 'Especie'], ['tutor', 'Tutor'], ['alergias', 'Alergias']];

  return <>
    {puedeAgregar && <section>
      <button onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : 'Agregar mascota'}</button>
      {mostrarForm && <form onSubmit={agregar}>
        <label>Nombre
          <input required value={form.nombre} onChange={e => cambiar('nombre', e.target.value)} />
        </label>
        <label>Especie
          <Selector valor={form.id_especie} opciones={especies} texto={e => e.nombre} alCambiar={v => cambiar('id_especie', v)} />
        </label>
        {esAdmin && <label>Tutor
          <Selector valor={form.id_tutor} opciones={tutores} texto={t => t.nombre} alCambiar={v => cambiar('id_tutor', v)} />
        </label>}
        <button>Guardar mascota</button>
      </form>}
      {mensaje && <p>{mensaje}</p>}
    </section>}

    <ListPage key={version} title={esTutor ? 'Mis mascotas' : 'Mascotas'} endpoint="/mascotas" columns={columnas} />

    {!esTutor && <AlergiasSection version={version} alCambiar={() => setVersion(version + 1)} />}
  </>;
}

// alergias de las mascotas (veterinario y admin): agregar, cambiar y quitar
// el trigger 1 de la base de datos usa esta tabla para impedir recetas a las que la mascota es alergica
function AlergiasSection({ version, alCambiar }) {
  const { session } = useAuth();
  const token = session.token;

  const [mascotas, setMascotas] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [form, setForm] = useState(ALERGIA_VACIA);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // se cargan las mascotas y los medicamentos (para sugerir los principios activos)
  useEffect(() => {
    api('/mascotas', { token }).then(setMascotas);
    api('/medicamentos', { token }).then(setMedicamentos);
  }, [token, version]);

  // se hace la peticion para registrar la alergia
  async function agregar(event) {
    event.preventDefault();
    try {
      await api('/alergias', { token, method: 'POST', body: form });
      setMensaje('Alergia registrada.');
      setForm(ALERGIA_VACIA);
      setMostrarForm(false);
      alCambiar();
    } catch (error) {
      setMensaje(error.message);
    }
  }

  // se hace la peticion para cambiar el principio activo de una alergia
  async function cambiar(fila) {
    const nuevo = window.prompt(`Nuevo principio activo para la alergia de ${fila.mascota}:`, fila.principio_activo);
    if (nuevo === null) return;
    try {
      await api(`/alergias/${fila.id}`, { token, method: 'PATCH', body: { principio_activo: nuevo } });
      alCambiar();
    } catch (error) {
      alert(error.message);
    }
  }

  // se hace la peticion para quitar una alergia
  async function quitar(fila) {
    if (!window.confirm(`¿Quitar la alergia de ${fila.mascota} a ${fila.principio_activo}?`)) return;
    try {
      await api(`/alergias/${fila.id}`, { token, method: 'DELETE' });
      alCambiar();
    } catch (error) {
      alert(error.message);
    }
  }

  // principios activos sin repetir, para la lista de sugerencias
  const principios = [...new Set(medicamentos.map(m => m.principio_activo))];

  return <>
    <section>
      <button onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : 'Agregar alergia'}</button>
      {mostrarForm && <form onSubmit={agregar}>
        <label>Mascota
          <Selector valor={form.id_mascota} opciones={mascotas} texto={m => `${m.nombre} (${m.tutor})`}
            alCambiar={v => setForm({ ...form, id_mascota: v })} />
        </label>
        <label>Principio activo
          <input required list="principios" value={form.principio_activo}
            onChange={e => setForm({ ...form, principio_activo: e.target.value })} />
          <datalist id="principios">
            {principios.map(p => <option key={p} value={p} />)}
          </datalist>
        </label>
        <button>Guardar alergia</button>
      </form>}
      {mensaje && <p>{mensaje}</p>}
    </section>

    <ListPage key={version} title="Alergias" endpoint="/alergias"
      columns={[['mascota', 'Mascota'], ['principio_activo', 'Principio activo']]}
      acciones={fila => <>
        <button onClick={() => cambiar(fila)}>Cambiar</button>
        <button onClick={() => quitar(fila)}>Quitar</button>
      </>} />
  </>;
}
