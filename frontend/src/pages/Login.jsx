import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const FORM_VACIO = { nombre: '', correo: '', password: '' };

// pantalla de ingreso; con el boton de abajo cambia a crear cuenta de tutor
export default function Login() {
  const { login, registrar } = useAuth();

  const [registrando, setRegistrando] = useState(false);
  const [form, setForm] = useState(FORM_VACIO);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // se actualiza un campo del formulario
  function cambiar(campo, valor) {
    setForm({ ...form, [campo]: valor });
  }

  // se cambia entre ingresar y crear cuenta
  function cambiarModo() {
    setRegistrando(!registrando);
    setError('');
  }

  // se ingresa o se registra segun el modo
  async function enviar(event) {
    event.preventDefault();
    setError('');
    setCargando(true);
    try {
      if (registrando) {
        await registrar(form.nombre, form.correo, form.password);
      } else {
        await login(form.correo, form.password);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login">
      <h1>Red Veterinaria</h1>
      <p>{registrando ? 'Crea tu cuenta de tutor.' : 'Ingresa con tu cuenta.'}</p>
      <form onSubmit={enviar}>
        {registrando && <label>Nombre
          <input required value={form.nombre} onChange={e => cambiar('nombre', e.target.value)} />
        </label>}
        <label>Correo
          <input type="email" required value={form.correo} onChange={e => cambiar('correo', e.target.value)} />
        </label>
        <label>Contraseña
          <input type="password" required value={form.password} onChange={e => cambiar('password', e.target.value)} />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button disabled={cargando}>{registrando ? 'Crear cuenta' : 'Ingresar'}</button>
      </form>
      <button onClick={cambiarModo}>{registrando ? 'Ya tengo cuenta' : 'Crear una cuenta'}</button>
    </main>
  );
}
