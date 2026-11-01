import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

// cuentas que crea el admin (los tutores se registran solos)
const TIPOS = [
  { id: 'veterinarios', nombre: 'Veterinario' },
  { id: 'administradores', nombre: 'Administrador' },
];
const COLUMNAS_VETERINARIOS = [['nombre', 'Nombre'], ['sede', 'Sede'], ['correo', 'Correo']];
const COLUMNAS_ADMINISTRADORES = [['nombre', 'Nombre'], ['correo', 'Correo']];
const FORM_VACIO = { tipo: '', nombre: '', correo: '', password: '', id_sede: '' };

// pantalla de personal: crear y eliminar cuentas de veterinarios y administradores
export default function PersonalPage() {
  const { session } = useAuth();
  const token = session.token;

  const [sedes, setSedes] = useState([]);
  const [form, setForm] = useState(FORM_VACIO);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api('/sedes', { token }).then(setSedes);
  }, [token]);

  // se actualiza un campo del formulario
  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // se hace la peticion para crear la cuenta
  async function crear(event) {
    event.preventDefault();
    const { tipo, ...datos } = form;
    try {
      await api(`/${tipo}`, { token, method: 'POST', body: datos });
      setMensaje(`Cuenta de ${form.nombre} creada. Ya puede ingresar con ${form.correo}.`);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      setVersion(version + 1);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  // se hace la peticion para eliminar una cuenta
  async function eliminar(tipo, cuenta) {
    if (!window.confirm(`¿Eliminar la cuenta de ${cuenta.nombre}?`)) return;
    try {
      await api(`/${tipo}/${cuenta.id}`, { token, method: 'DELETE' });
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  return <>
    <section>
      <button onClick={() => setMostrarForm(!mostrarForm)}>{mostrarForm ? 'Cancelar' : 'Crear cuenta'}</button>
      {mostrarForm && <form onSubmit={crear}>
        <label>Tipo de cuenta
          <Selector valor={form.tipo} opciones={TIPOS} texto={t => t.nombre} alCambiar={v => cambiar('tipo', v)} />
        </label>
        <label>Nombre
          <input required value={form.nombre} onChange={e => cambiar('nombre', e.target.value)} />
        </label>
        <label>Correo
          <input type="email" required value={form.correo} onChange={e => cambiar('correo', e.target.value)} />
        </label>
        <label>Contraseña inicial
          <input type="password" required minLength={6} value={form.password} onChange={e => cambiar('password', e.target.value)} />
        </label>
        {form.tipo === 'veterinarios' && <label>Sede
          <Selector valor={form.id_sede} opciones={sedes} texto={s => s.nombre} alCambiar={v => cambiar('id_sede', v)} />
        </label>}
        <button>Guardar cuenta</button>
      </form>}
      {mensaje && <p>{mensaje}</p>}
    </section>

    <ListPage key={`veterinarios-${version}`} title="Veterinarios" endpoint="/veterinarios" columns={COLUMNAS_VETERINARIOS}
      acciones={cuenta => <button onClick={() => eliminar('veterinarios', cuenta)}>Eliminar</button>} />
    <ListPage key={`administradores-${version}`} title="Administradores" endpoint="/administradores" columns={COLUMNAS_ADMINISTRADORES}
      acciones={cuenta => <button onClick={() => eliminar('administradores', cuenta)}>Eliminar</button>} />
  </>;
}
