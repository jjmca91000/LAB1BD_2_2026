import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const COLUMNAS_POR_VENCER = [
  ['mascota', 'Mascota'], ['tutor', 'Tutor'], ['nombre_vacuna', 'Vacuna'], ['numero_refuerzo', 'Última dosis'],
  ['vencimiento_vacuna', 'Próxima dosis'], ['dias_para_vencer', 'Días'], ['estado', 'Estado'],
];
const COLUMNAS_REGISTROS = [
  ['fecha_aplicacion', 'Fecha'], ['mascota', 'Mascota'], ['nombre_vacuna', 'Vacuna'],
  ['numero_refuerzo', 'Dosis', numero => (numero === 0 ? 'Primera' : `Refuerzo ${numero}`)],
  ['vencimiento_vacuna', 'Próxima dosis'],
];
const COLUMNAS_PLANES = [
  ['nombre_vacuna', 'Vacuna'], ['especie', 'Especie'], ['cantidad_refuerzo', 'Refuerzos'], ['dias_refuerzo', 'Días entre dosis'],
];
const PLAN_NUEVO = { id_especie: '', nombre_vacuna: '', cantidad_refuerzo: '0', dias_refuerzo: '0' };

// pantalla de vacunas: por vencer, historial y planes (los planes solo veterinario y admin)
export default function VacunasPage() {
  const { session } = useAuth();
  const { token, usuario } = session;
  const esTutor = usuario.rol === 'Tutor';
  const esAdmin = usuario.rol === 'Administrador';

  const [mostrarForm, setMostrarForm] = useState(false);
  const [planElegido, setPlanElegido] = useState(null);
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  // se cierran los formularios, se muestra el mensaje y se recarga la tabla de planes
  function terminar(texto) {
    setMensaje(texto);
    setMostrarForm(false);
    setPlanElegido(null);
    setVersion(version + 1);
  }

  // se hace la peticion para agregar un plan
  async function agregarPlan(form) {
    await api('/planes-vacunacion', { token, method: 'POST', body: form });
    terminar(`Plan ${form.nombre_vacuna} agregado.`);
  }

  // se hace la peticion para editar un plan
  async function editarPlan(form) {
    await api(`/planes-vacunacion/${planElegido.id}`, { token, method: 'PATCH', body: form });
    terminar(`Plan ${form.nombre_vacuna} actualizado.`);
  }

  // se hace la peticion para eliminar un plan
  async function eliminarPlan(plan) {
    if (!window.confirm(`¿Eliminar el plan ${plan.nombre_vacuna}?`)) return;
    try {
      await api(`/planes-vacunacion/${plan.id}`, { token, method: 'DELETE' });
      terminar(`Plan ${plan.nombre_vacuna} eliminado.`);
    } catch (error) {
      alert(error.message);
    }
  }

  const columnasPorVencer = esTutor ? COLUMNAS_POR_VENCER.filter(([campo]) => campo !== 'tutor') : COLUMNAS_POR_VENCER;
  const accionesPlan = esAdmin ? plan => <>
    <button onClick={() => { setMostrarForm(false); setPlanElegido(plan); }}>Editar</button>
    <button onClick={() => eliminarPlan(plan)}>Eliminar</button>
  </> : null;

  return <>
    <ListPage title="Vacunas vencidas o por vencer (30 días)" endpoint="/vacunaciones/por-vencer" columns={columnasPorVencer} />
    <ListPage title={esTutor ? 'Historial de vacunas de mis mascotas' : 'Historial de vacunas'} endpoint="/vacunaciones" columns={COLUMNAS_REGISTROS} />

    {esAdmin && <section>
      <button onClick={() => { setPlanElegido(null); setMostrarForm(!mostrarForm); }}>{mostrarForm ? 'Cancelar' : 'Agregar plan'}</button>
      {mostrarForm && <PlanForm inicial={PLAN_NUEVO} alGuardar={agregarPlan} textoBoton="Guardar plan" />}
      {planElegido && <>
        <h2>Editar plan {planElegido.nombre_vacuna}</h2>
        <PlanForm key={planElegido.id} inicial={datosPlan(planElegido)} alGuardar={editarPlan} textoBoton="Guardar cambios" />
        <button onClick={() => setPlanElegido(null)}>Volver</button>
      </>}
      {mensaje && <p>{mensaje}</p>}
    </section>}

    {!esTutor && <ListPage key={version} title="Planes de vacunación" endpoint="/planes-vacunacion" columns={COLUMNAS_PLANES} acciones={accionesPlan} />}
  </>;
}

// formulario de un plan de vacunacion (lo usan agregar y editar)
function PlanForm({ inicial, alGuardar, textoBoton }) {
  const { session } = useAuth();

  const [especies, setEspecies] = useState([]);
  const [form, setForm] = useState(inicial);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/especies', { token: session.token }).then(setEspecies);
  }, [session.token]);

  // se actualiza un campo del formulario
  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
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

  return (
    <form onSubmit={guardar}>
      <label>Especie
        <Selector valor={form.id_especie} opciones={especies} texto={e => e.nombre} alCambiar={v => cambiar('id_especie', v)} />
      </label>
      <label>Nombre de la vacuna
        <input required value={form.nombre_vacuna} onChange={e => cambiar('nombre_vacuna', e.target.value)} />
      </label>
      <label>Cantidad de refuerzos (0 = dosis única)
        <input type="number" min="0" required value={form.cantidad_refuerzo} onChange={e => cambiar('cantidad_refuerzo', e.target.value)} />
      </label>
      <label>Días entre dosis
        <input type="number" min="0" required value={form.dias_refuerzo} onChange={e => cambiar('dias_refuerzo', e.target.value)} />
      </label>
      {error && <p role="alert" className="error">{error}</p>}
      <button>{textoBoton}</button>
    </form>
  );
}

// valores del formulario a partir de una fila de la tabla de planes
function datosPlan(plan) {
  return {
    id_especie: String(plan.id_especie),
    nombre_vacuna: plan.nombre_vacuna,
    cantidad_refuerzo: String(plan.cantidad_refuerzo),
    dias_refuerzo: String(plan.dias_refuerzo),
  };
}
