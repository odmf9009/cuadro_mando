const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getFirebaseApp } = require('./firebaseAdmin');
const { buildDailySeries, UNCLASSIFIED_SEGMENT } = require('./mongoConnector');

// Conector para apps SIN backend propio cuyos datos viven solo en Firebase
// (hoy: CardAlert). Los usuarios salen de Firebase Authentication (es la
// lista completa de cuentas) y el plan (free/premium) de Firestore
// users/{uid}.planType.
//
// PRIVACIDAD: cada users/{uid} cuelga de subcoleccion con las tarjetas y
// pagos del usuario (datos financieros). Aqui NUNCA se leen: el .select()
// de abajo trae solo el campo del plan del documento raiz.
//
// HONESTIDAD DEL DATO: planType lo escribe la propia app (cliente) desde su
// copia de seguridad en la nube; no esta verificado con Google Play/Apple y
// solo existe para quien activo esa copia. Por eso se informa como "segun la
// app" y se marca la suscripcion como unverified.

// Auth + Firestore son 2 llamadas a Google; el resumen general las pide por
// cada carga de pagina, asi que se reutilizan 60s.
const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

const PROVIDER_LABELS = { 'google.com': 'Google', 'apple.com': 'Apple', password: 'Email' };

async function loadSnapshot(project) {
  const hit = cache.get(project.id);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.rows;

  const { app, error } = getFirebaseApp(project);
  if (error) throw new Error(error);

  const authUsers = [];
  let pageToken;
  do {
    const page = await getAuth(app).listUsers(1000, pageToken);
    authUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  const fields = project.fields || {};
  const planField = fields.planField || 'planType';
  const docs = await getFirestore(app)
    .collection(fields.usersCollection || 'users')
    .select(planField)
    .get();
  const planByUid = new Map(docs.docs.map((d) => [d.id, d.get(planField) || null]));

  const complimentary = new Set(
    (process.env[fields.complimentaryEmailsEnv] || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const rows = authUsers.map((u) => {
    const plan = planByUid.get(u.uid) || null; // 'premium' | 'free' | null (sin doc)
    const email = u.email || '';
    const isComplimentary = plan === 'premium' && complimentary.has(email.toLowerCase());
    const providerId = u.providerData[0] && u.providerData[0].providerId;
    const lastActive = u.metadata.lastRefreshTime || u.metadata.lastSignInTime || null;
    return {
      _id: u.uid,
      name: u.displayName || '',
      email,
      provider: PROVIDER_LABELS[providerId] || providerId || '—',
      createdAt: u.metadata.creationTime ? new Date(u.metadata.creationTime).toISOString() : null,
      lastActive: lastActive ? new Date(lastActive).toISOString() : null,
      planValue: plan,
      isComplimentary,
      plan: isComplimentary ? 'Premium (cortesía)' : plan === 'premium' ? 'Premium' : plan === 'free' ? 'Gratis' : 'Sin dato',
    };
  });

  cache.set(project.id, { at: Date.now(), rows });
  return rows;
}

function matchesSegment(row, segment) {
  if (segment === UNCLASSIFIED_SEGMENT) return row.planValue === null;
  return row.planValue === segment;
}

async function getFirestoreProjectStats(project) {
  let rows;
  try {
    rows = await loadSnapshot(project);
  } catch (err) {
    return { connected: false, error: err.message };
  }

  const now = Date.now();
  const since7 = now - 7 * 24 * 60 * 60 * 1000;
  const since30 = now - 30 * 24 * 60 * 60 * 1000;
  const ts = (iso) => (iso ? new Date(iso).getTime() : 0);

  const byDay = new Map();
  for (const r of rows) {
    if (ts(r.createdAt) >= since30) {
      const day = r.createdAt.slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }
  }

  const count = (pred) => rows.filter(pred).length;
  const premiumApp = count((r) => r.planValue === 'premium' && !r.isComplimentary);
  const premiumComplimentary = count((r) => r.isComplimentary);

  // Cero se omite salvo "Premium", para que la tarjeta no se llene de filas vacias.
  const byPlan = { 'Premium (según la app)': premiumApp };
  const extras = [
    ['Premium de cortesía', premiumComplimentary],
    ['Gratis', count((r) => r.planValue === 'free')],
    ['Sin copia en la nube (plan desconocido)', count((r) => r.planValue === null)],
  ];
  for (const [label, n] of extras) if (n > 0) byPlan[label] = n;

  const segments = project.segments
    ? {
        items: [
          ...project.segments.options.map((o) => ({
            value: o.value,
            label: o.label,
            count: count((r) => r.planValue === o.value),
          })),
          {
            value: UNCLASSIFIED_SEGMENT,
            label: project.segments.unclassifiedLabel || 'Sin definir',
            count: count((r) => r.planValue === null),
          },
        ],
      }
    : null;

  return {
    connected: true,
    totalUsers: rows.length,
    newUsers7d: count((r) => ts(r.createdAt) >= since7),
    newUsers30d: count((r) => ts(r.createdAt) >= since30),
    activeUsers: count((r) => ts(r.lastActive) >= since30),
    activeLabel: 'Sesión reciente (30 días)',
    onlineUsers: null,
    onlineLabel: null,
    chartSeries: buildDailySeries(
      [...byDay.entries()].map(([_id, c]) => ({ _id, count: c })),
      new Date(since30),
      new Date(now)
    ),
    subscriptions: {
      active: premiumApp,
      activeLabel: 'premium según la app',
      unverified: true,
      byStatus: {},
      byPlan,
      revenueByPlan: [],
      notes: [
        'El plan lo guarda la propia app en Firestore, sin verificar con Google Play: puede incluir compras de prueba, y solo existe para quien activó la copia de seguridad en la nube.',
        'Mensual/anual y el dinero generado no se guardan en la app: hacen falta los informes de Google Play.',
      ],
    },
    platforms: null,
    segments,
  };
}

async function listFirestoreUsers(project, { search = '', page = 1, pageSize = 25, segment = '' } = {}) {
  let rows = await loadSnapshot(project);

  if (segment) {
    const allowed = (project.segments ? project.segments.options.map((o) => o.value) : []).concat(UNCLASSIFIED_SEGMENT);
    if (!allowed.includes(segment)) throw new Error('Segmento no valido');
    rows = rows.filter((r) => matchesSegment(r, segment));
  }

  const q = search.trim().toLowerCase();
  if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));

  const sorted = [...rows].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const users = sorted.slice((page - 1) * pageSize, page * pageSize);
  return { total: sorted.length, page, pageSize, users };
}

module.exports = { getFirestoreProjectStats, listFirestoreUsers };
