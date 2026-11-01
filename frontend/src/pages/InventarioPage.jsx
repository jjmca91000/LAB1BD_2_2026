import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import Selector from '../components/Selector.jsx';
import ListPage from './ListPage.jsx';

const COLUMNAS = [
  ['sede', 'Sede'], ['nombre_comercial', 'Medicamento'], ['principio_activo', 'Principio activo'], ['stock_actual', 'Stock'],
];
const STOCK_VACIO = { id_sede: '', id_medicamento: '', stock_actual: '' };
const MEDICAMENTO_VACIO = { nombre_comercial: '', principio_activo: '' };

// pantalla de inventario: agregar stock, crear medicamentos, cambiar stock y quitar
export default function InventarioPage() {
  const { session } = useAuth();
  const token = session.token;

  const [sedes, setSedes] = useState([]);
  const [medicamentos, setMedicamentos] = useState([]);
  const [formulario, setFormulario] = useState('');
  const [stock, setStock] = useState(STOCK_VACIO);
  const [medicamento, setMedicamento] = useState(MEDICAMENTO_VACIO);
  const [mensaje, setMensaje] = useState('');
  const [version, setVersion] = useState(0);

  // se cargan las sedes y los medicamentos (se recargan al crear un medicamento)
  useEffect(() => {
    api('/sedes', { token }).then(setSedes);
    api('/medicamentos', { token }).then(setMedicamentos);
  }, [token, version]);

  // se abre o se cierra uno de los dos formularios
  function abrir(cual) {
    setFormulario(formulario === cual ? '' : cual);
    setMensaje('');
  }

  // se hace la peticion para agregar al inventario (si ya estaba, se reemplaza el stock)
  async function agregarStock(event) {
    event.preventDefault();
    try {
      await api('/inventario', { token, method: 'POST', body: stock });
      setMensaje('Inventario actualizado.');
      setStock(STOCK_VACIO);
      setFormulario('');
      setVersion(version + 1);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  // se hace la peticion para crear un medicamento
  async function crearMedicamento(event) {
    event.preventDefault();
    try {
      await api('/medicamentos', { token, method: 'POST', body: medicamento });
      setMensaje(`${medicamento.nombre_comercial} creado. Ahora puedes agregarlo al inventario de una sede.`);
      setMedicamento(MEDICAMENTO_VACIO);
      setFormulario('');
      setVersion(version + 1);
    } catch (error) {
      setMensaje(error.message);
    }
  }

  // se hace la peticion para cambiar el stock de una fila
  async function cambiarStock(fila) {
    const nuevo = window.prompt(`Nuevo stock de ${fila.nombre_comercial} en ${fila.sede}:`, fila.stock_actual);
    if (nuevo === null) return;
    try {
      await api('/inventario', { token, method: 'POST', body: { id_sede: fila.id_sede, id_medicamento: fila.id_medicamento, stock_actual: nuevo } });
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  // se hace la peticion para quitar una fila del inventario
  async function quitar(fila) {
    if (!window.confirm(`¿Quitar ${fila.nombre_comercial} del inventario de ${fila.sede}?`)) return;
    try {
      await api(`/inventario/${fila.id}`, { token, method: 'DELETE' });
      setVersion(version + 1);
    } catch (error) {
      alert(error.message);
    }
  }

  return <>
    <section>
      <button onClick={() => abrir('stock')}>{formulario === 'stock' ? 'Cancelar' : 'Agregar al inventario'}</button>
      <button onClick={() => abrir('medicamento')}>{formulario === 'medicamento' ? 'Cancelar' : 'Nuevo medicamento'}</button>

      {formulario === 'stock' && <form onSubmit={agregarStock}>
        <label>Sede
          <Selector valor={stock.id_sede} opciones={sedes} texto={s => s.nombre} alCambiar={v => setStock({ ...stock, id_sede: v })} />
        </label>
        <label>Medicamento
          <Selector valor={stock.id_medicamento} opciones={medicamentos}
            texto={m => `${m.nombre_comercial} (${m.principio_activo})`} alCambiar={v => setStock({ ...stock, id_medicamento: v })} />
        </label>
        <label>Stock
          <input type="number" min="0" required value={stock.stock_actual} onChange={e => setStock({ ...stock, stock_actual: e.target.value })} />
        </label>
        <button>Guardar en el inventario</button>
      </form>}

      {formulario === 'medicamento' && <form onSubmit={crearMedicamento}>
        <label>Nombre comercial
          <input required value={medicamento.nombre_comercial} onChange={e => setMedicamento({ ...medicamento, nombre_comercial: e.target.value })} />
        </label>
        <label>Principio activo
          <input required value={medicamento.principio_activo} onChange={e => setMedicamento({ ...medicamento, principio_activo: e.target.value })} />
        </label>
        <button>Guardar medicamento</button>
      </form>}

      {mensaje && <p>{mensaje}</p>}
    </section>

    <ListPage key={version} title="Inventario de farmacia" endpoint="/inventario" columns={COLUMNAS}
      acciones={fila => <>
        <button onClick={() => cambiarStock(fila)}>Cambiar stock</button>
        <button onClick={() => quitar(fila)}>Quitar</button>
      </>} />
  </>;
}
