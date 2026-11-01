// se transforma cualquier error en una respuesta JSON con su codigo HTTP
export function manejarErrores(error, _req, res, _next) {
  // el body no es un JSON valido
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
  }

  // errores lanzados por los services con httpError
  if (error.status) {
    return res.status(error.status).json({ error: error.message });
  }

  // P0001: RAISE EXCEPTION de un procedimiento o trigger (su mensaje ya esta en espanol)
  if (error.code === 'P0001') {
    return res.status(400).json({ error: error.message });
  }
  // 23514: no se cumple un CHECK de la base (ej. stock negativo)
  if (error.code === '23514') {
    return res.status(400).json({ error: `No se cumple la regla ${error.constraint}.` });
  }
  // 23502: falta un dato NOT NULL
  if (error.code === '23502') {
    return res.status(400).json({ error: 'Falta un dato obligatorio.' });
  }
  // 23505: valor repetido en una columna UNIQUE
  if (error.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
  }
  // 23503: llave foranea (referencia a algo que no existe, o se borra algo en uso)
  if (error.code === '23503') {
    return res.status(409).json({ error: 'Hace referencia a un registro que no existe, o el registro está siendo usado por otros datos.' });
  }
  // familia 22: datos con formato invalido (fecha imposible, numero fuera de rango...)
  if (error.code?.startsWith('22')) {
    return res.status(400).json({ error: 'Algún dato tiene un formato inválido.' });
  }

  console.error(error);
  res.status(500).json({ error: 'Error interno del servidor.' });
}
