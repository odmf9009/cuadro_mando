const { MongoClient, ObjectId } = require('mongodb');

// Reutilizamos una sola conexion por URI mientras el proceso vive, en vez de
// abrir una conexion nueva en cada request.
const clients = new Map();

async function getClient(uri) {
  if (clients.has(uri)) return clients.get(uri);
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  clients.set(uri, client);
  return client;
}

// Completa con 0 los dias sin registros para que el grafico no tenga huecos.
function buildDailySeries(rows, since, until) {
  const byDay = new Map(rows.map((r) => [r._id, r.count]));
  const series = [];
  const cursor = new Date(since);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(until);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({ day: key, count: byDay.get(key) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return series;
}

// Valor especial para "no tiene el campo definido" (ej. no termino el
// onboarding). Se trata como un segmento mas: tiene su propia tarjeta,
// cuenta y es filtrable igual que "client"/"technician".
const UNCLASSIFIED_SEGMENT = '__unclassified__';

// Conteo por cada segmento declarado + el de "sin definir".
async function countSegments(col, project) {
  const { field, options, unclassifiedLabel } = project.segments;
  const items = await Promise.all(
    options.map(async (o) => ({
      value: o.value,
      label: o.label,
      count: await col.countDocuments({ [field]: o.value }),
    }))
  );
  items.push({
    value: UNCLASSIFIED_SEGMENT,
    label: unclassifiedLabel || 'Sin definir',
    count: await col.countDocuments({ [field]: { $in: [null, ''] } }),
  });
  return { items };
}

async function getMongoProjectStats(project) {
  const uri = process.env[project.envVar];
  if (!uri) {
    return { connected: false, error: `Falta configurar ${project.envVar} en .env` };
  }

  const fields = project.fields || {};
  const collectionName = fields.collection || 'users';
  const createdAtField = fields.createdAtField || 'createdAt';

  try {
    const client = await getClient(uri);
    const db = client.db();
    const col = db.collection(collectionName);

    const totalUsers = await col.countDocuments();

    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let newUsers7d = null;
    let newUsers30d = null;
    let chartSeries = [];

    if (!fields.noTimestamps) {
      newUsers30d = await col.countDocuments({ [createdAtField]: { $gte: since30 } });
      newUsers7d = await col.countDocuments({ [createdAtField]: { $gte: since7 } });

      const rows = await col
        .aggregate([
          { $match: { [createdAtField]: { $gte: since30 } } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: `$${createdAtField}` } },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();
      chartSeries = buildDailySeries(rows, since30, now);
    }

    let activeUsers = null;
    if (fields.activeField) {
      activeUsers = await col.countDocuments({ [fields.activeField]: true });
    } else if (fields.lastActiveField) {
      activeUsers = await col.countDocuments({ [fields.lastActiveField]: { $gte: since30 } });
    }

    // "En linea ahora": leido de un campo de presencia que la propia app ya
    // mantiene (socket o ping periodico). No es una conexion nuestra al
    // servidor de sockets, es el ultimo valor que la app escribio en Mongo.
    let onlineUsers = null;
    if (fields.onlineField) {
      const wanted = fields.onlineValue === undefined ? true : fields.onlineValue;
      onlineUsers = await col.countDocuments({ [fields.onlineField]: wanted });
    }

    return {
      connected: true,
      totalUsers,
      newUsers7d,
      newUsers30d,
      activeUsers,
      activeLabel: fields.activeLabel || 'Activos (30 dias)',
      onlineUsers,
      onlineLabel: fields.onlineLabel || 'En linea ahora',
      chartSeries,
      subscriptions: null,
      platforms: null,
      segments: project.segments ? await countSegments(col, project) : null,
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

async function getCollection(project) {
  const uri = process.env[project.envVar];
  if (!uri) throw new Error(`Falta configurar ${project.envVar} en .env`);
  const client = await getClient(uri);
  const fields = project.fields || {};
  return client.db().collection(fields.collection || 'users');
}

// project.fields.idIsString: true para modelos cuyo _id es un String propio
// (ej. Firebase UID), en vez del ObjectId por defecto de Mongo.
function toId(project, rawId) {
  const fields = project.fields || {};
  return fields.idIsString ? rawId : new ObjectId(rawId);
}

// Filtro de segmento (ej. clientes vs profesionales). Solo acepta valores
// declarados en project.segments.options (+ el especial "sin definir") ->
// nunca se inyecta un filtro libre.
function segmentFilter(project, segment) {
  if (!segment || !project.segments) return {};
  if (segment === UNCLASSIFIED_SEGMENT) {
    return { [project.segments.field]: { $in: [null, ''] } };
  }
  const allowed = project.segments.options.map((o) => o.value);
  if (!allowed.includes(segment)) throw new Error('Segmento no valido');
  return { [project.segments.field]: segment };
}

// Lista usuarios para la pantalla de administracion (buscar por email/nombre
// y accionar sobre uno). Nunca proyecta campos de contraseña/tokens.

async function listUsers(project, { search = '', page = 1, pageSize = 25, segment = '' } = {}) {
  const col = await getCollection(project);
  const fields = project.fields || {};
  const createdAtField = fields.createdAtField || 'createdAt';

  const projection = {
    passwordHash: 0,
    password: 0,
    resetPasswordToken: 0,
    resetPasswordExpires: 0,
    fcmToken: 0,
  };

  const searchFilter = search
    ? {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { nombre: { $regex: search, $options: 'i' } },
        ],
      }
    : {};
  const filter = { ...searchFilter, ...segmentFilter(project, segment) };

  const sort = fields.noTimestamps ? { _id: -1 } : { [createdAtField]: -1 };

  const [total, users] = await Promise.all([
    col.countDocuments(filter),
    col
      .find(filter, { projection })
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  return { total, page, pageSize, users };
}

async function findUserById(project, userId) {
  const col = await getCollection(project);
  return col.findOne(
    { _id: toId(project, userId) },
    { projection: { passwordHash: 0, password: 0 } }
  );
}

// Escribe un hash bcrypt nuevo directo en el campo de contraseña del
// usuario. No pasa por el backend de la app -> no hace falta redeploy, y
// bcrypt.compare() en el login de la app valida cualquier hash bcrypt
// valido sin importar con que rounds/libreria se genero este.
async function setUserPasswordHash(project, userId, fieldName, hash) {
  const col = await getCollection(project);
  const result = await col.updateOne(
    { _id: toId(project, userId) },
    { $set: { [fieldName]: hash } }
  );
  if (result.matchedCount === 0) throw new Error('Usuario no encontrado');
}

module.exports = {
  getMongoProjectStats,
  listUsers,
  findUserById,
  setUserPasswordHash,
  UNCLASSIFIED_SEGMENT,
};
