import jwt from 'jsonwebtoken';
export function auth(req, res, next) {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  if (!token) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      message: 'Invalid or expired session'
    });
  }
}
export function admin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      message: 'Admin permission required'
    });
  }
  next();
}
export function sign(user) {
  return jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role
  }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
}
