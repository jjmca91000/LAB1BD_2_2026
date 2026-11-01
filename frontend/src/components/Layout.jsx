import { useAuth } from '../context/AuthContext.jsx';

const TODOS = ['Administrador', 'Veterinario', 'Tutor'];

// botones del menu: [pagina, texto, roles que lo ven]
const LINKS = [
  ['inicio', 'Inicio', TODOS],
  ['mascotas', 'Mascotas', TODOS],
  ['citas', 'Citas Médicas', TODOS],
  ['fichas', 'Fichas Clínicas', TODOS],
  ['vacunas', 'Vacunas', TODOS],
  ['personal', 'Personal', ['Administrador']],
  ['sedes', 'Sedes', ['Administrador']],
  ['inventario', 'Inventario', ['Administrador']],
  ['auditoria', 'Auditoría', ['Administrador']],
  ['estadisticas', 'Estadísticas (MV)', ['Administrador']],
];

// se muestra el encabezado, el menu segun el rol y la pagina elegida
export default function Layout({ page, setPage, children }) {
  const { session, logout } = useAuth();
  const rol = session.usuario.rol;
  const linksVisibles = LINKS.filter(([, , roles]) => roles.includes(rol));

  return (
    <div className="shell">
      <header>
        <h1>Red Veterinaria</h1>
        <span>{session.usuario.nombre} · {rol}</span>
        <button onClick={logout}>Salir</button>
      </header>
      <nav>
        {linksVisibles.map(([id, texto]) => (
          <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}>{texto}</button>
        ))}
      </nav>
      <main>{children}</main>
    </div>
  );
}
