import jwt from 'jsonwebtoken';

// se revisa que la peticion traiga un token valido y se guardan sus datos en req.user
export function authenticate(req, res, next) {
  const encabezado = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!encabezado) return res.status(401).json({ error: 'Token requerido.' });
  try {
    const datos = jwt.verify(encabezado[1], process.env.JWT_SECRET);
    req.user = {
      id: Number(datos.sub),
      rol: datos.rol,
      id_tutor: datos.id_tutor,
      id_veterinario: datos.id_veterinario,
      id_sede: datos.id_sede,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o vencido.' });
  }
}

// se revisa que el rol del usuario este entre los permitidos para la ruta
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.rol)) return res.status(403).json({ error: 'Acceso denegado.' });
    next();
  };
}
