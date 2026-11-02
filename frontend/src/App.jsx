import { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ListPage from './pages/ListPage.jsx';
import MascotasPage from './pages/MascotasPage.jsx';
import CitasPage from './pages/CitasPage.jsx';
import FichasPage from './pages/FichasPage.jsx';
import VacunasPage from './pages/VacunasPage.jsx';
import PersonalPage from './pages/PersonalPage.jsx';
import SedesPage from './pages/SedesPage.jsx';
import InventarioPage from './pages/InventarioPage.jsx';
import EstadisticasPage from './pages/EstadisticasPage.jsx';

// se muestra el login o, si hay sesion, el menu con la pagina elegida
export default function App() {
  const { session } = useAuth();
  const [page, setPage] = useState('inicio');

  // cada vez que alguien entra o sale, se vuelve al inicio
  useEffect(() => {
    setPage('inicio');
  }, [session]);

  if (!session) return <Login />;

  // el key={page} hace que cada pagina empiece de cero (por ejemplo, en la pagina 1 de su tabla)
  return (
    <Layout page={page} setPage={setPage}>
      <Page key={page} page={page} />
    </Layout>
  );
}

// se elige que pantalla mostrar segun el boton del menu
function Page({ page }) {
  if (page === 'mascotas') return <MascotasPage />;
  if (page === 'citas') return <CitasPage />;
  if (page === 'fichas') return <FichasPage />;
  if (page === 'vacunas') return <VacunasPage />;
  if (page === 'personal') return <PersonalPage />;
  if (page === 'sedes') return <SedesPage />;
  if (page === 'inventario') return <InventarioPage />;
  if (page === 'auditoria') {
    return <ListPage title="Auditoría de fichas cerradas" endpoint="/auditoria" columns={[
      ['fecha_modificacion', 'Fecha'], ['mascota', 'Mascota'], ['diagnostico_anterior', 'Diagnóstico anterior'],
      ['diagnostico_nuevo', 'Diagnóstico nuevo'], ['modificado_por', 'Modificado por'],
    ]} />;
  }
  if (page === 'estadisticas') return <EstadisticasPage />;
  return <Dashboard />;
}
