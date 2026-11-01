import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

// filas por pagina
const LIMITE = 10;

// tabla generica paginada: pide el endpoint de a una pagina y muestra una fila por registro
export default function ListPage({ title, endpoint, columns, acciones }) {
  const { session, logout } = useAuth();
  const [rows, setRows] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // si el endpoint ya trae parametros, la paginacion se agrega con &
  const separador = endpoint.includes('?') ? '&' : '?';

  // se piden los datos cada vez que cambia el endpoint o la pagina
  useEffect(() => {
    setLoading(true);
    setError('');
    api(`${endpoint}${separador}pagina=${pagina}&limite=${LIMITE}`, { token: session.token })
      .then(setRows)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint, separador, pagina, session.token]);

  let contenido;
  if (loading) {
    contenido = <p>Cargando…</p>;
  } else if (error) {
    contenido = <p role="alert" className="error">{error} {error.includes('Token') && <button onClick={logout}>Volver a ingresar</button>}</p>;
  } else if (rows.length === 0) {
    contenido = <p>Sin registros.</p>;
  } else {
    contenido = (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map(([campo, titulo]) => <th key={campo}>{titulo}</th>)}
              {acciones && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id ?? i}>
                {columns.map(([campo, , formato]) => (
                  <td key={campo}>{formato ? formato(row[campo]) : (row[campo] ?? '-')}</td>
                ))}
                {acciones && <td>{acciones(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // el boton Siguiente se apaga cuando llega una pagina incompleta (ya no hay mas registros)
  return (
    <section>
      <h2>{title}</h2>
      {contenido}
      <div className="paginacion">
        <button disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
        <span>Página {pagina}</span>
        <button disabled={rows.length < LIMITE} onClick={() => setPagina(pagina + 1)}>Siguiente</button>
      </div>
    </section>
  );
}
