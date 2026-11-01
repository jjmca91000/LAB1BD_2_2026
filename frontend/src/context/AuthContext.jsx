import { createContext, useContext, useState } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);
// nombre con que se guarda la sesion en el navegador
const CLAVE = 'lab1bd_session';

// se guarda la sesion (token y usuario) y se comparte con todas las pantallas
export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CLAVE));
    } catch {
      return null;
    }
  });

  // se guarda la sesion en el navegador y en el estado
  function guardar(resultado) {
    localStorage.setItem(CLAVE, JSON.stringify(resultado));
    setSession(resultado);
  }

  // se inicia sesion
  async function login(correo, password) {
    guardar(await api('/auth/login', { method: 'POST', body: { correo, password } }));
  }

  // se registra un tutor y se inicia sesion
  async function registrar(nombre, correo, password) {
    guardar(await api('/auth/registro', { method: 'POST', body: { nombre, correo, password } }));
  }

  // se cierra la sesion
  function logout() {
    localStorage.removeItem(CLAVE);
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, login, registrar, logout }}>{children}</AuthContext.Provider>;
}

// se usa en cada pantalla para leer la sesion
export const useAuth = () => useContext(AuthContext);
