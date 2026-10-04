const { Router } = require('express');

const router = Router();

// API JSON consumida por el SPA de Vue (client/). No hay vistas server-side
// aqui: el frontend decide que renderizar segun estas respuestas.

router.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  res.json({ authenticated: false });
});

router.post('/api/auth/login', (req, res) => {
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
