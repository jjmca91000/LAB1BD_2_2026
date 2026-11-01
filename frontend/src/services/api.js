const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// se hace la peticion a la API con el token y se devuelve el JSON; si falla, se lanza el error del backend
export async function api(endpoint, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // un 204 (borrado exitoso) no trae cuerpo
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.error || `Error ${response.status}`);
  return data;
}
