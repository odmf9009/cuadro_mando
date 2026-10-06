const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const jwt = require('jsonwebtoken');
const { parse } = require('csv-parse/sync');

// App Store Connect Sales Reports API (estable desde hace años, la misma
// que usa Apple para el panel de "Ventas y tendencias"). Auth: JWT ES256
// firmado con una API Key generada en App Store Connect -> Users and Access
// -> Integrations -> App Store Connect API.
// Docs: https://developer.apple.com/documentation/appstoreconnectapi/download_sales_and_trends_reports

// Igual que firebaseAdmin.js: anclado a __dirname, no a process.cwd().
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

function resolvePrivateKeyPath() {
  const raw = process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH;
  return path.isAbsolute(raw) ? raw : path.join(PROJECT_ROOT, raw);
}

function isConfigured() {
  return Boolean(
    process.env.APP_STORE_CONNECT_ISSUER_ID &&
      process.env.APP_STORE_CONNECT_KEY_ID &&
      process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH &&
      process.env.APP_STORE_CONNECT_VENDOR_NUMBER
  );
}

function buildToken() {
  const privateKey = fs.readFileSync(resolvePrivateKeyPath(), 'utf8');
  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    issuer: process.env.APP_STORE_CONNECT_ISSUER_ID,
    audience: 'appstoreconnect-v1',
    expiresIn: '20m', // Apple rechaza tokens con vida > 20 minutos
    keyid: process.env.APP_STORE_CONNECT_KEY_ID,
  });
}

// frequency: 'DAILY' (reportDate = YYYY-MM-DD) | 'MONTHLY' (reportDate = YYYY-MM).
// Un reporte DIARIO de una app con pocas descargas da 0 casi siempre (Apple
// ni genera el archivo si no hubo actividad ese dia) -> getAppSalesSummary
// usa MONTHLY por defecto, que es un numero mucho mas representativo.
async function fetchSalesReport(frequency, reportDate) {
  if (!isConfigured()) {
    return { supported: false, reason: 'Faltan credenciales de App Store Connect en .env' };
  }

  const token = buildToken();
  const params = new URLSearchParams({
    'filter[frequency]': frequency,
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': process.env.APP_STORE_CONNECT_VENDOR_NUMBER,
    'filter[reportDate]': reportDate,
  });

  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
  });

  if (res.status === 404) {
    // Apple devuelve 404 cuando no hay NADA que reportar en ese periodo
    // (cero transacciones), no necesariamente porque falte publicar.
    return { supported: true, rows: [], note: `Sin actividad reportada para ${reportDate}` };
  }
  if (!res.ok) {
    throw new Error(`App Store Connect respondio ${res.status}: ${await res.text()}`);
  }

  const gz = Buffer.from(await res.arrayBuffer());
  const tsv = zlib.gunzipSync(gz).toString('utf8');
  const rows = parse(tsv, { columns: true, delimiter: '\t', skip_empty_lines: true });
  return { supported: true, rows };
}

function sumAppRows(rows, appleAppId) {
  const appRows = (rows || []).filter((r) => r['Apple Identifier'] === String(appleAppId));
  const units = appRows.reduce((sum, r) => sum + Number(r['Units'] || 0), 0);
  // "Developer Proceeds" es el monto POR UNIDAD de esa fila (no el total).
  const proceeds = appRows.reduce((sum, r) => sum + Number(r['Developer Proceeds'] || 0) * Number(r['Units'] || 0), 0);
  return { units, proceeds };
}

function monthsAgo(n) {
  const d = new Date();
  d.setUTCDate(1); // evita que un mes mas corto desplace el mes al restar
  d.setUTCMonth(d.getUTCMonth() - n);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

// Descargas/ingresos del mes. Si el mes actual todavia no tiene reporte
// (recien empezo, o la app no tuvo actividad este mes) cae al mes anterior,
// para no mostrar "0" solo por mala suerte de fecha.
async function getAppSalesSummary(project) {
  const appleAppId = project.store && project.store.appleAppId;
  if (!appleAppId) return { supported: false, reason: 'Este proyecto no tiene appleAppId configurado' };

  for (const month of [monthsAgo(0), monthsAgo(1)]) {
    const { supported, reason, rows } = await fetchSalesReport('MONTHLY', month);
    if (!supported) return { supported: false, reason };
    if (rows.length) {
      return { supported: true, month, ...sumAppRows(rows, appleAppId) };
    }
  }

  return { supported: true, month: monthsAgo(0), units: 0, proceeds: 0, note: 'Sin descargas en los últimos dos meses' };
}

module.exports = { isConfigured, fetchSalesReport, getAppSalesSummary };
