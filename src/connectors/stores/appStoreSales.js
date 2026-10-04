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

// reportDate en formato YYYY-MM-DD (reporte diario) o YYYY-MM (mensual).
async function fetchDailySalesReport(reportDate) {
  if (!isConfigured()) {
    return { supported: false, reason: 'Faltan credenciales de App Store Connect en .env' };
  }

  const token = buildToken();
  const params = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': process.env.APP_STORE_CONNECT_VENDOR_NUMBER,
    'filter[reportDate]': reportDate,
  });

  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/a-gzip' },
  });

  if (res.status === 404) {
    // Apple devuelve 404 cuando todavia no hay reporte para esa fecha
    // (los reportes diarios tardan ~24-48h en publicarse).
    return { supported: true, rows: [], note: `Sin reporte publicado todavia para ${reportDate}` };
  }
  if (!res.ok) {
    throw new Error(`App Store Connect respondio ${res.status}: ${await res.text()}`);
  }

  const gz = Buffer.from(await res.arrayBuffer());
  const tsv = zlib.gunzipSync(gz).toString('utf8');
  const rows = parse(tsv, { columns: true, delimiter: '\t', skip_empty_lines: true });
  return { supported: true, rows };
}

// Filtra el reporte (todas las apps del vendor) por un SKU/Apple ID concreto
// y resume unidades e ingresos. bundleIdOrAppleId es lo que se guarde en
// project.store.appleAppId (Apple ID numerico de la app en App Store Connect).
async function getAppSalesSummary(project, reportDate) {
  const appleAppId = project.store && project.store.appleAppId;
  if (!appleAppId) return { supported: false, reason: 'Este proyecto no tiene appleAppId configurado' };

  const { supported, reason, rows, note } = await fetchDailySalesReport(reportDate);
  if (!supported) return { supported: false, reason };

  const appRows = (rows || []).filter((r) => r['Apple Identifier'] === String(appleAppId));
  const units = appRows.reduce((sum, r) => sum + Number(r['Units'] || 0), 0);
  const proceeds = appRows.reduce((sum, r) => sum + Number(r['Developer Proceeds'] || 0) * Number(r['Units'] || 0), 0);

  return { supported: true, reportDate, units, proceeds, note: note || null };
}

module.exports = { isConfigured, fetchDailySalesReport, getAppSalesSummary };
