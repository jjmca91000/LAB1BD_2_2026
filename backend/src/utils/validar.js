// se crea un error con su codigo HTTP
export function httpError(status, mensaje) {
  const error = new Error(mensaje);
  error.status = status;
  return error;
}

// se convierte a numero solo un numero de verdad (5 o '5'), asi true, '' o null no pasan como 1 o 0
function aNumero(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && /^-?\d+$/.test(valor.trim())) return Number(valor);
  return NaN;
}

// se valida un id: entero mayor que 0
export function requerirId(valor, nombre) {
  const numero = aNumero(valor);
  if (!Number.isInteger(numero) || numero <= 0) throw httpError(400, `${nombre} no es un número válido.`);
  return numero;
}

// igual que requerirId, pero si no viene devuelve null
export function opcionalId(valor, nombre) {
  if (valor === undefined || valor === null || valor === '') return null;
  return requerirId(valor, nombre);
}

// se valida un texto obligatorio y se le quitan los espacios de los extremos
export function requerirTexto(valor, nombre) {
  if (typeof valor !== 'string' || !valor.trim()) throw httpError(400, `Falta ${nombre}.`);
  return valor.trim();
}

// se valida un entero mayor o igual a 0
export function requerirEntero(valor, nombre) {
  const numero = aNumero(valor);
  if (!Number.isInteger(numero) || numero < 0) throw httpError(400, `${nombre} debe ser un entero mayor o igual a 0.`);
  return numero;
}

// si la busqueda no encontro nada se lanza 404
export function encontradoOrThrow(fila, mensaje) {
  if (!fila) throw httpError(404, mensaje);
  return fila;
}

// se leen ?pagina y ?limite; sin limite queda null y en PostgreSQL LIMIT NULL devuelve todo
export function paginacion(query) {
  const limite = opcionalId(query.limite, 'El límite');
  const pagina = opcionalId(query.pagina, 'La página') ?? 1;
  return { limite, offset: limite ? (pagina - 1) * limite : 0 };
}
