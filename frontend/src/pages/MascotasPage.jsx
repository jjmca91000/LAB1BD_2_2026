import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const FORM_VACIO = { nombre: '', id_especie: '', id_tutor: '' };

// pantalla de mascotas: lista y formulario para agregar una
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
    ? [['nombre', 'Nombre'], ['especie', 'Especie']]
    : [['nombre', 'Nombre'], ['especie', 'Especie'], ['tutor', 'Tutor']];

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
  </>;
}
