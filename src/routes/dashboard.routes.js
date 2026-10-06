const { Router } = require('express');
const projects = require('../config/projects');
const { getAllProjectStats, getProjectStats } = require('../connectors');
const {
  listUsers,
  findUserById,
  setUserPasswordHash,
  UNCLASSIFIED_SEGMENT,
} = require('../connectors/mongoConnector');
const { generatePasswordResetLink } = require('../connectors/firebaseAdmin');
const { generateTempPassword, hashPassword } = require('../services/passwordGenerator');
const { sendMail, isConfigured: mailerConfigured } = require('../services/mailer');
const appStoreSales = require('../connectors/stores/appStoreSales');
const googlePlayReports = require('../connectors/stores/googlePlayReports');

const router = Router();

// Nunca se manda al navegador la config cruda de projects.js: tiene nombres
// de variables de entorno, condiciones de auth, rutas a credenciales, etc.
// Esto es solo lo que el SPA necesita para pintar la UI.
function toSafeProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    color: project.color,
    type: project.type,
    capabilities: project.capabilities,
    hasUsersTab: project.type === 'mongo',
    hasStoreMetrics: Boolean(project.store),
    segments: project.segments
      ? {
          options: [
            ...project.segments.options,
            {
              value: UNCLASSIFIED_SEGMENT,
              label: project.segments.unclassifiedLabel || 'Sin definir',
            },
          ],
        }
      : null,
  };
}

function conditionMatches(condition, user) {
  if (!condition) return true;
  return user[condition.field] === condition.equals;
}

// Determina que metodo de reset aplica a ESTE usuario en particular (un
// proyecto puede mezclar Firebase y contraseña propia, ej. FixRadar).
function resetMethodFor(project, user) {
  const auth = project.auth;
  if (!auth) return null;
  if (auth.firebase && conditionMatches(auth.firebase.condition, user)) return 'firebase';
  if (auth.bcrypt && conditionMatches(auth.bcrypt.condition, user)) return 'bcrypt';
  return null;
}

function summarize(statsByProject) {
  let totalUsers = 0;
  let connectedCount = 0;
  let activeSubscriptions = 0;

  for (const project of projects) {
    const stats = statsByProject[project.id];
    if (!stats || !stats.connected) continue;
    connectedCount += 1;
    totalUsers += stats.totalUsers || 0;
    if (stats.subscriptions) activeSubscriptions += stats.subscriptions.active || 0;
  }

  return { totalUsers, connectedCount, totalProjects: projects.length, activeSubscriptions };
}

// Metricas de tiendas: nunca deben tumbar la pagina del proyecto si fallan
// (dependen de credenciales externas que hoy no estan configuradas).
async function getStoreStats(project) {
  if (!project.store) return null;

  const month = new Date().toISOString().slice(0, 7).replace('-', ''); // YYYYMM

  const [appleResult, googleResult] = await Promise.allSettled([
    appStoreSales.getAppSalesSummary(project),
    googlePlayReports.getInstallsOverview(project, month),
  ]);

  return {
    apple:
      appleResult.status === 'fulfilled'
        ? appleResult.value
        : { supported: false, reason: appleResult.reason.message },
    google:
      googleResult.status === 'fulfilled'
        ? googleResult.value
        : { supported: false, reason: googleResult.reason.message },
  };
}

function findProject(id) {
  return projects.find((p) => p.id === id);
}

// --- Registro de proyectos + resumen general ---

router.get('/projects', (req, res) => {
  res.json(projects.map(toSafeProject));
});

router.get('/overview', async (req, res, next) => {
  try {
    const statsByProject = await getAllProjectStats(projects);
    res.json({ stats: statsByProject, summary: summarize(statsByProject) });
  } catch (err) {
    next(err);
  }
});

// --- Detalle de un proyecto ---

router.get('/projects/:id/stats', async (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  res.json(await getProjectStats(project));
});

router.get('/projects/:id/store-stats', async (req, res, next) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });
  try {
    res.json(await getStoreStats(project));
  } catch (err) {
    next(err);
  }
});

// --- Usuarios (solo proyectos Mongo con buscador + accion de reset) ---

router.get('/projects/:id/users', async (req, res) => {
  const project = findProject(req.params.id);
  if (!project || project.type !== 'mongo') return res.status(404).json({ error: 'No aplica a este proyecto' });

  const page = Math.max(1, Number(req.query.page) || 1);
  const search = (req.query.q || '').trim();
  const segment = (req.query.segment || '').trim();

  try {
    const { total, pageSize, users } = await listUsers(project, { page, search, segment });
    const usersWithFlags = users.map((u) => ({ ...u, resetMethod: resetMethodFor(project, u) }));

    res.json({
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      users: usersWithFlags,
    });
  } catch (err) {
    // Proyecto sin URI configurada (o Mongo caido): el frontend distingue
    // este caso por el campo "error" en vez de recibir un 500 generico.
    res.json({ total: 0, page: 1, pageSize: 25, totalPages: 1, users: [], error: err.message });
  }
});

router.post('/projects/:id/users/:userId/send-reset', async (req, res) => {
  const project = findProject(req.params.id);
  if (!project || !project.auth) return res.status(404).json({ ok: false, error: 'No aplica a este proyecto' });

  try {
    const user = await findUserById(project, req.params.userId);
    if (!user || !user.email) throw new Error('El usuario no tiene un email registrado');
    if (resetMethodFor(project, user) !== 'firebase') {
      throw new Error('Este usuario no usa Firebase Auth; usa el reset por contraseña temporal');
    }

    const link = await generatePasswordResetLink(project, user.email);

    if (mailerConfigured()) {
      await sendMail({
        to: user.email,
        subject: `${project.name}: restablece tu contraseña`,
        html: `
          <p>Hola${user.name ? ' ' + user.name : ''},</p>
          <p>Pediste restablecer tu contraseña en ${project.name}. Toca el siguiente enlace para elegir una nueva:</p>
          <p><a href="${link}">${link}</a></p>
          <p>Si no fuiste tú, ignora este correo.</p>
        `,
      });
      return res.json({ ok: true, mode: 'sent' });
    }

    // Sin SMTP configurado: devolvemos el link para que el admin lo mande a mano.
    return res.json({ ok: true, mode: 'link', link });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Reset "manual": genera una contraseña temporal y escribe su hash bcrypt
// directo en Mongo. No requiere tocar ni redesplegar el backend del proyecto
// -> el login de la app valida el hash nuevo con su bcrypt.compare de siempre.
router.post('/projects/:id/users/:userId/set-temp-password', async (req, res) => {
  const project = findProject(req.params.id);
  if (!project || !project.auth || !project.auth.bcrypt) {
    return res.status(404).json({ ok: false, error: 'No aplica a este proyecto' });
  }

  try {
    const user = await findUserById(project, req.params.userId);
    if (!user) throw new Error('Usuario no encontrado');
    if (resetMethodFor(project, user) !== 'bcrypt') {
      throw new Error('Este usuario no usa contraseña propia; no aplica el reset manual');
    }

    const tempPassword = generateTempPassword();
    const hash = await hashPassword(tempPassword);
    await setUserPasswordHash(project, req.params.userId, project.auth.bcrypt.field, hash);

    // Nunca se guarda la contraseña en texto plano en ningun lado: se
    // devuelve una sola vez para que el admin la copie desde la pantalla.
    res.json({ ok: true, mode: 'temp-password', password: tempPassword, email: user.email || null });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

module.exports = router;
