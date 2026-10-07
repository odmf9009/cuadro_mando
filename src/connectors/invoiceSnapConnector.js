const { Pool } = require('pg');

// Este conector es especifico de Invoice Snap porque es el unico proyecto
// con Postgres (Prisma) y el unico que hoy guarda suscripciones reales
// (tabla "subscriptions") y compras de creditos con precio (tabla
// "credit_purchases"). El pago real hoy es via Stripe (web) -> el monto NO
// esta en la tabla "subscriptions" (RevenueCat no reporta precio), asi que
// el ingreso por plan se saca del payload crudo de "webhook_events"
// (evento "checkout.session.completed" de Stripe, que si trae el precio).
const pools = new Map();

function getPool(uri) {
  if (pools.has(uri)) return pools.get(uri);
  const pool = new Pool({ connectionString: uri, max: 5, connectionTimeoutMillis: 5000 });
  pools.set(uri, pool);
  return pool;
}

function rowsToCountMap(rows, keyField) {
  const map = {};
  for (const row of rows) map[row[keyField] || 'desconocido'] = Number(row.count);
  return map;
}

async function getInvoiceSnapStats(project) {
  const uri = process.env[project.envVar];
  if (!uri) {
    return { connected: false, error: `Falta configurar ${project.envVar} en .env` };
  }

  const pool = getPool(uri);

  try {
    const [
      totalUsersRes,
      newUsers7dRes,
      newUsers30dRes,
      seriesRes,
      subsActiveRes,
      subsByStatusRes,
      subsByPlanRes,
      subsByPlatformRes,
      revenueRes,
      revenueByPlanRes,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM users WHERE "deletedAt" IS NULL`),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE "createdAt" >= NOW() - INTERVAL '7 days'`
      ),
      pool.query(
        `SELECT COUNT(*)::int AS count FROM users WHERE "createdAt" >= NOW() - INTERVAL '30 days'`
      ),
      pool.query(`
        SELECT to_char(d.day, 'YYYY-MM-DD') AS day, COALESCE(u.count, 0)::int AS count
        FROM generate_series(
          date_trunc('day', NOW() - INTERVAL '29 days'),
          date_trunc('day', NOW()),
          INTERVAL '1 day'
        ) AS d(day)
        LEFT JOIN (
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS count
          FROM users
          WHERE "createdAt" >= NOW() - INTERVAL '30 days'
          GROUP BY 1
        ) u ON u.day = d.day
        ORDER BY d.day ASC
      `),
      pool.query(`SELECT COUNT(*)::int AS count FROM subscriptions WHERE "isActive" = true`),
      pool.query(`SELECT status, COUNT(*)::int AS count FROM subscriptions GROUP BY status`),
      pool.query(
        `SELECT plan, COUNT(*)::int AS count FROM subscriptions WHERE "isActive" = true GROUP BY plan`
      ),
      pool.query(
        `SELECT platform, COUNT(*)::int AS count FROM subscriptions WHERE "isActive" = true GROUP BY platform`
      ),
      // "environment" (test/live) viene directo en la tabla -> mas
      // confiable que inferirlo de otro lado. Nunca se suma junto a "live"
      // en el mismo total, para no inflar ingresos reales con pruebas.
      pool.query(`
        SELECT currency, environment, COALESCE(SUM("pricePaid"), 0)::float AS total
        FROM credit_purchases
        WHERE status = 'COMPLETED'
        GROUP BY currency, environment
      `),
      // Ingreso por plan: el precio NO esta en "subscriptions" (RevenueCat
      // no lo reporta) -> se extrae del payload crudo de Stripe que si lo
      // trae. "mode = subscription" excluye las compras de creditos
      // (checkout.session.completed tambien se usa para esas).
      pool.query(`
        SELECT
          payload->'data'->'object'->'metadata'->>'plan' AS plan,
          payload->'data'->'object'->>'currency' AS currency,
          COALESCE((payload->'data'->'object'->>'livemode')::boolean, false) AS livemode,
          SUM((payload->'data'->'object'->>'amount_total')::numeric) / 100.0 AS total
        FROM webhook_events
        WHERE "eventType" = 'checkout.session.completed'
          AND payload->'data'->'object'->>'mode' = 'subscription'
        GROUP BY plan, currency, livemode
        ORDER BY plan
      `),
    ]);

    return {
      connected: true,
      totalUsers: totalUsersRes.rows[0].count,
      newUsers7d: newUsers7dRes.rows[0].count,
      newUsers30d: newUsers30dRes.rows[0].count,
      activeUsers: null, // Invoice Snap no registra "ultima actividad" del usuario
      activeLabel: null,
      onlineUsers: null, // no tiene un campo de presencia en vivo
      onlineLabel: null,
      chartSeries: seriesRes.rows,
      subscriptions: {
        active: subsActiveRes.rows[0].count,
        byStatus: rowsToCountMap(subsByStatusRes.rows, 'status'),
        byPlan: rowsToCountMap(subsByPlanRes.rows, 'plan'),
        // Por cada plan, cuanto genero y si ese pago fue real o modo prueba
        // de Stripe (livemode=false) -> nunca se mezclan en un solo numero,
        // para no hacer pasar dinero de prueba por ingresos reales.
        revenueByPlan: revenueByPlanRes.rows.map((r) => ({
          plan: r.plan || 'desconocido',
          currency: r.currency,
          total: Number(r.total),
          isTestMode: !r.livemode,
        })),
      },
      platforms: rowsToCountMap(subsByPlatformRes.rows, 'platform'),
      revenue: revenueRes.rows.map((r) => ({
        currency: r.currency,
        total: r.total,
        isTestMode: r.environment !== 'live',
      })),
    };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = { getInvoiceSnapStats };
