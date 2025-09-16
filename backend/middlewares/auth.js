import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function authorizeRoles(...allowedRoles) {
  // Aplanar el array en caso de que se pase un array de roles
  const roles = allowedRoles.flat();
  
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' });
    
    // Verificar si el rol del usuario está en la lista de roles permitidos
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    next();
  };
}

export function signToken(user) {
  const payload = {
    id: user.id,
    role: user.role,
    email: user.email,
    nombre: user.nombre,
    sucursal: user.sucursal || null
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

// Alias for authenticate for backward compatibility
export const verificarToken = authenticate;

// Export all functions
export default {
  authenticate,
  authorizeRoles,
  signToken,
  verificarToken
};
