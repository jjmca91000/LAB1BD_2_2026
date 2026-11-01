import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const COLUMNAS = [
  ['fecha_hora', 'Fecha'], ['mascota', 'Mascota'], ['veterinario', 'Veterinario'],
  ['diagnostico', 'Diagnóstico'], ['tratamiento', 'Tratamiento'],
  ['recetas', 'Recetas', recetas => recetas.map(r => `${r.medicamento} x${r.cantidad}`).join(', ') || '-'],
  ['abierta', 'Estado', abierta => (abierta ? 'Abierta' : 'Cerrada')],
];

// pantalla de fichas clinicas: atender las abiertas y corregir las cerradas
export default function FichasPage() {
  const { session } = useAuth();
  const [fichaElegida, setFichaElegida] = useState(null);
  const [version, setVersion] = useState(0);

  // se cierra el formulario y se recarga la tabla
  function terminar() {
    setFichaElegida(null);
    setVersion(version + 1);
  }

  const puedeEditar = session.usuario.rol !== 'Tutor';
  const acciones = ficha => (
    <button onClick={() => setFichaElegida(ficha)}>{ficha.abierta ? 'Atender' : 'Corregir'}</button>
  );

  return <>
    {fichaElegida && <AtencionForm ficha={fichaElegida} alTerminar={terminar} />}
    <ListPage key={version} title="Fichas clínicas" endpoint="/fichas" columns={COLUMNAS} acciones={puedeEditar ? acciones : null} />
  </>;
}

// formulario de una ficha: abierta = registrar atencion, cerrada = corregir diagnostico
function AtencionForm({ ficha, alTerminar }) {
  const { session } = useAuth();
  const token = session.token;

  const [medicamentos, setMedicamentos] = useState([]);
  const [planes, setPlanes] = useState([]);
  const [form, setForm] = useState({
    diagnostico: ficha.diagnostico ?? '', tratamiento: ficha.tratamiento ?? '',
    id_medicamento: '', cantidad: 1, id_vacuna: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ficha.abierta) return;
    api('/medicamentos', { token }).then(setMedicamentos);
    // solo los planes de la especie de la mascota
    api('/planes-vacunacion', { token }).then(todos => setPlanes(todos.filter(p => p.especie === ficha.especie)));
  }, [ficha, token]);

  // se actualiza un campo del formulario
  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // se hace la peticion para registrar la atencion o corregir el diagnostico
  async function guardar(event) {
    event.preventDefault();
    try {
      if (ficha.abierta) {
        await api('/atenciones', {
          token, method: 'POST',
          body: {
            id_cita: ficha.id_cita,
            diagnostico: form.diagnostico,
            tratamiento: form.tratamiento,
            medicamentos: form.id_medicamento ? [form.id_medicamento] : [],
            cantidades: form.id_medicamento ? [form.cantidad] : [],
            id_vacuna: form.id_vacuna || null,
          },
        });
      } else {
        await api(`/fichas/${ficha.id}`, {
          token, method: 'PATCH',
          body: { diagnostico: form.diagnostico, tratamiento: form.tratamiento },
        });
      }
      alTerminar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <section>
      <h2>{ficha.abierta ? 'Registrar atención' : 'Corregir diagnóstico'} - {ficha.mascota} ({ficha.fecha_hora})</h2>
      <form onSubmit={guardar}>
        <label>Diagnóstico
          <input required value={form.diagnostico} onChange={e => cambiar('diagnostico', e.target.value)} />
        </label>
        <label>Tratamiento
          <input required value={form.tratamiento} onChange={e => cambiar('tratamiento', e.target.value)} />
        </label>

        {ficha.abierta && <>
          <label>Medicamento recetado (opcional)
            <Selector opcional valor={form.id_medicamento} opciones={medicamentos}
              texto={m => `${m.nombre_comercial} (${m.principio_activo})`} alCambiar={v => cambiar('id_medicamento', v)} />
          </label>
          {form.id_medicamento && <label>Cantidad
            <input type="number" min="1" required value={form.cantidad} onChange={e => cambiar('cantidad', e.target.value)} />
          </label>}
          <label>Vacuna aplicada (opcional)
            <Selector opcional valor={form.id_vacuna} opciones={planes}
              texto={p => p.nombre_vacuna} alCambiar={v => cambiar('id_vacuna', v)} />
          </label>
        </>}

        {error && <p role="alert" className="error">{error}</p>}
        <button>Guardar</button>
        <button type="button" onClick={alTerminar}>Volver</button>
      </form>
    </section>
  );
}
