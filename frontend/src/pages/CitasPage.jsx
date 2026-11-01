import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const COLUMNAS = [
  ['fecha_hora', 'Fecha y hora'], ['mascota', 'Mascota'], ['sede', 'Sede'],
  ['veterinario', 'Veterinario'], ['tipo_atencion', 'Tipo'], ['estado', 'Estado'],
];
const CITA_NUEVA = { id_mascota: '', id_sede: '', id_veterinario: '', fecha: '', fecha_hora: '', tipo_atencion: 'Sede', estado: 'Programada' };
// Completada no se elige a mano: una cita se completa al atenderla (procedimiento 1)
const ESTADOS = [{ id: 'Programada', nombre: 'Programada' }, { id: 'Cancelada', nombre: 'Cancelada' }];

// pantalla de citas: agendar, editar y la lista
export default function CitasPage() {
  const { session } = useAuth();
  const { token, usuario } = session;
  const esTutor = usuario.rol === 'Tutor';

  const [mostrarForm, setMostrarForm] = useState(false);
  const [citaElegida, setCitaElegida] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  // se cierran los formularios, se muestra el mensaje y se recarga la tabla
  function terminar(texto) {
    setMensaje(texto);
    setMostrarForm(false);
    setCitaElegida(null);
    setVersion(version + 1);
  }

  // se hace la peticion para agendar la cita
  async function agendar(form) {
    await api('/citas', { token, method: 'POST', body: datosCita(form) });
    terminar(`Cita agendada para el ${form.fecha_hora}.`);
  }

  // se hace la peticion para editar la cita, o para cancelarla si el estado es Cancelada
  async function editar(form) {
    if (form.estado === 'Cancelada') {
      await api(`/citas/${citaElegida.id}/cancelar`, { token, method: 'PATCH' });
      terminar('Cita cancelada.');
    } else {
      await api(`/citas/${citaElegida.id}`, { token, method: 'PATCH', body: datosCita(form) });
      terminar(`Cita actualizada para el ${form.fecha_hora}.`);
    }
  }

  // el veterinario y el admin pueden editar las citas programadas
  const acciones = esTutor ? null : cita => cita.estado === 'Programada' && (
    <button onClick={() => { setMostrarForm(false); setCitaElegida(cita); }}>Editar</button>
  );

  return <>
    <section>
      <button onClick={() => { setCitaElegida(null); setMostrarForm(!mostrarForm); }}>{mostrarForm ? 'Cancelar' : 'Agendar cita'}</button>
      {mostrarForm && <CitaForm inicial={CITA_NUEVA} conMascota alGuardar={agendar} textoBoton="Confirmar cita" />}
      {mensaje && <p>{mensaje}</p>}
    </section>

    {citaElegida && <section>
      <h2>Editar cita de {citaElegida.mascota}</h2>
      <CitaForm key={citaElegida.id} inicial={datosIniciales(citaElegida)} conEstado alGuardar={editar} textoBoton="Guardar cambios" />
      <button onClick={() => setCitaElegida(null)}>Volver</button>
    </section>}

    <ListPage key={version} title={esTutor ? 'Mis citas' : 'Citas'} endpoint="/citas" columns={COLUMNAS} acciones={acciones} />
  </>;
}

// formulario de una cita en el orden sede -> veterinario -> fecha -> hora (lo usan agendar y editar)
function CitaForm({ inicial, conMascota = false, conEstado = false, alGuardar, textoBoton }) {
  const { session } = useAuth();
  const { token, usuario } = session;

  const [mascotas, setMascotas] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [veterinarios, setVeterinarios] = useState([]);
  const [bloques, setBloques] = useState([]);
  // los valores con que se abrio el formulario
  const [original] = useState(inicial);
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState('');

  useEffect(() => {
    if (conMascota) api('/mascotas', { token }).then(setMascotas);
    api('/sedes', { token }).then(setSedes);
    api('/veterinarios', { token }).then(setVeterinarios);
  }, [token, conMascota]);

  useEffect(() => {
    setBloques([]);
    if (!form.id_veterinario || !form.fecha) return;
    api(`/veterinarios/${form.id_veterinario}/disponibilidad?fecha=${form.fecha}`, { token }).then(libres => {
      const horas = libres.map(b => ({ id: b.fecha_hora_exacta, hora: b.hora_disponible }));
      // al editar, la hora actual de la cita sale ocupada por ella misma, asi que se agrega a la lista
      const mismaAgenda = String(form.id_veterinario) === String(original.id_veterinario) && form.fecha === original.fecha;
      if (original.fecha_hora && mismaAgenda && !horas.some(h => h.id === original.fecha_hora)) {
        horas.push({ id: original.fecha_hora, hora: `${original.fecha_hora.slice(11)} (actual)` });
        horas.sort((a, b) => a.id.localeCompare(b.id));
      }
      setBloques(horas);
    });
  }, [form.id_veterinario, form.fecha, token, original]);

  // se actualiza un campo y se borran los pasos que dependen de el
  function cambiar(campo, valor) {
    const nuevo = { ...form, [campo]: valor };
    if (campo === 'id_sede') nuevo.id_veterinario = '';
    if (campo === 'id_sede' || campo === 'id_veterinario' || campo === 'fecha') nuevo.fecha_hora = '';
    setForm(nuevo);
  }

  // se guarda el formulario; si falla se muestra el error
  async function guardar(event) {
    event.preventDefault();
    setError('');
    try {
      await alGuardar(form);
    } catch (e) {
      setError(e.message);
    }
  }

  // solo los veterinarios de la sede elegida
  const veterinariosDeLaSede = veterinarios.filter(v => String(v.id_sede) === String(form.id_sede));
  // no se pueden elegir dias pasados
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <form onSubmit={guardar} noValidate={form.estado === 'Cancelada'}>
      {conMascota && <label>Mascota
        <Selector valor={form.id_mascota} opciones={mascotas}
          texto={m => (usuario.rol === 'Tutor' ? m.nombre : `${m.nombre} (${m.tutor})`)} alCambiar={v => cambiar('id_mascota', v)} />
      </label>}
      <label>Sede
        <Selector valor={form.id_sede} opciones={sedes} texto={s => s.nombre} alCambiar={v => cambiar('id_sede', v)} />
      </label>
      {form.id_sede && <label>Veterinario
        <Selector valor={form.id_veterinario} opciones={veterinariosDeLaSede} texto={v => v.nombre} alCambiar={v => cambiar('id_veterinario', v)} />
      </label>}
      {form.id_veterinario && <label>Fecha
        <input type="date" required min={hoy} value={form.fecha} onChange={e => cambiar('fecha', e.target.value)} />
      </label>}
      {form.id_veterinario && form.fecha && <label>Hora disponible
        <Selector valor={form.fecha_hora} opciones={bloques} texto={b => b.hora} alCambiar={v => cambiar('fecha_hora', v)} />
      </label>}
      <label>Tipo de atención
        <select value={form.tipo_atencion} onChange={e => cambiar('tipo_atencion', e.target.value)}>
          <option value="Sede">En la sede</option>
          <option value="Domicilio">A domicilio</option>
        </select>
      </label>
      {conEstado && <label>Estado
        <Selector valor={form.estado} opciones={ESTADOS} texto={e => e.nombre} alCambiar={v => cambiar('estado', v)} />
      </label>}
      {error && <p role="alert" className="error">{error}</p>}
      <button>{textoBoton}</button>
    </form>
  );
}

// datos de la cita que se mandan a la API
function datosCita(form) {
  return {
    id_mascota: form.id_mascota,
    id_sede: form.id_sede,
    id_veterinario: form.id_veterinario,
    tipo_atencion: form.tipo_atencion,
    fecha_hora: form.fecha_hora,
  };
}

// valores del formulario a partir de una fila de la tabla
function datosIniciales(cita) {
  return {
    id_mascota: cita.id_mascota,
    id_sede: String(cita.id_sede),
    id_veterinario: String(cita.id_veterinario),
    fecha: cita.fecha_hora.slice(0, 10),
    fecha_hora: cita.fecha_hora,
    tipo_atencion: cita.tipo_atencion,
    estado: cita.estado,
  };
}
