const fs = require('fs');
const path = require('path');
const express = require('express');
const session = require('express-session');

const { requireLogin } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const projects = require('./config/projects');
const apkStorage = require('./services/apkStorage');

const app = express();
const CLIENT_DIST = path.join(__dirname, '..', 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(CLIENT_DIST, 'index.html'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'cambia-esto',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }, // 8 horas
  })
);

// Login/logout, accesibles sin sesion.
app.use(authRoutes);

// Descarga publica del APK (sin sesion a proposito: la visita cualquiera
// desde el portafolio, no solo el admin). La URL es estable -> el portafolio
// la enlaza una sola vez, el contenido cambia con cada subida desde el
// dashboard (ver dashboard.routes.js -> POST /api/projects/:id/apk).
app.get('/downloads/:id.apk', (req, res) => {
  const project = projects.find((p) => p.id === req.params.id);
  if (!project || !project.apkDistribution || !project.apkDistribution.enabled) {
    return res.status(404).send('No encontrado');
  }
  const info = apkStorage.getInfo(project.id);
  if (!info) return res.status(404).send('Todavía no se subió ningún APK para este proyecto.');

  res.download(apkStorage.filePath(project.id), `${project.name.replace(/\s+/g, '')}.apk`);
});

// Todo lo demas bajo /api requiere haber iniciado sesion.
app.use('/api', requireLogin, dashboardRoutes);

if (hasClientBuild) {
  // Produccion: Express sirve el build del SPA de Vue (client/dist) desde el
  // mismo origen que la API -> sin CORS, la cookie de sesion funciona igual
  // que en cualquier request normal.
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else {
  // Desarrollo: el SPA corre aparte con "npm run dev" en client/ (Vite en
  // :5173), que hace proxy de /api hacia este servidor. Aqui no hay nada
  // que servir en "/".
  app.get('/', (req, res) => {
    res.type('text/plain').send(
      'API de Cuadro de Mando corriendo. El frontend vive en client/ (npm run dev) o compila con "npm run build" dentro de client/.'
    );
  });
}

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor. Revisa la consola.' });
});

module.exports = app;
