// El SPA de Vue llama a todo bajo /api con fetch, asi que la respuesta
// correcta a "no autenticado" es un 401 JSON (el router de Vue decide a
// donde navegar), no una redireccion HTTP.
function requireLogin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'No autenticado' });
}

module.exports = { requireLogin };
