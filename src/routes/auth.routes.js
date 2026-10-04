const { Router } = require('express');
const rateLimit = require('express-rate-limit');

const router = Router();

// API JSON consumida por el SPA de Vue (client/). No hay vistas server-side
// aqui: el frontend decide que renderizar segun estas respuestas.

// Limite de intentos de login: 10 intentos cada 15 min por IP. No cambia la
// contraseña (sigue siendo admin/admin a proposito), pero evita que un bot
// la adivine por fuerza bruta una vez el dashboard sea publico.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
});

router.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

router.post('/api/auth/login', loginLimiter, (req, res) => {
  const { username, password } = req.body || {};
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'admin';

  if (username === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    req.session.username = username;
    return res.json({ ok: true, username });
  }

  res.status(401).json({ ok: false, error: 'Usuario o contraseña incorrectos' });
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
