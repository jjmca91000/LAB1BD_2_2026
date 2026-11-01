import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import ListPage from './ListPage.jsx';

// pantalla de sedes: crear, renombrar y eliminar
export default function SedesPage() {
  const { session } = useAuth();
  const token = session.token;
  const [nombre, setNombre] = useState('');
  const [version, setVersion] = useState(0);

  // se hace la peticion para crear una sede
  async function crear(event) {
    event.preventDefault();
    try {
      await api('/sedes', { token, method: 'POST', body: { nombre } });
      setNombre('');
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  // se hace la peticion para cambiar el nombre de una sede
  async function renombrar(sede) {
    const nuevoNombre = window.prompt('Nuevo nombre de la sede:', sede.nombre);
    if (!nuevoNombre) return;
    try {
      await api(`/sedes/${sede.id}`, { token, method: 'PATCH', body: { nombre: nuevoNombre } });
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  // se hace la peticion para eliminar una sede
  async function eliminar(sede) {
    if (!window.confirm(`¿Eliminar la sede "${sede.nombre}"?`)) return;
    try {
      await api(`/sedes/${sede.id}`, { token, method: 'DELETE' });
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  return <>
    <section>
      <h2>Nueva sede</h2>
      <form onSubmit={crear}>
        <input required placeholder="Nombre de la sede" value={nombre} onChange={e => setNombre(e.target.value)} />
        <button>Crear sede</button>
      </form>
    </section>
    <ListPage key={version} title="Sedes" endpoint="/sedes" columns={[['nombre', 'Nombre']]}
      acciones={sede => <>
        <button onClick={() => renombrar(sede)}>Editar</button>
        <button onClick={() => eliminar(sede)}>Eliminar</button>
      </>} />
  </>;
}
