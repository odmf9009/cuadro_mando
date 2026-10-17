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

// El informe de ventas es del VENDOR (todas las apps a la vez): una sola
// descarga por mes sirve a todos los proyectos. Se cachea unos minutos para que
// abrir varias paginas (o cambiar de periodo) no vuelva a pedirlo a Apple.
const REPORT_TTL_MS = 10 * 60 * 1000;
const reportCache = new Map();

// frequency: 'DAILY' (reportDate = YYYY-MM-DD) | 'MONTHLY' (reportDate = YYYY-MM).
// Un reporte DIARIO de una app con pocas descargas da 0 casi siempre (Apple
// ni genera el archivo si no hubo actividad ese dia) -> getAppSalesSummary
// usa MONTHLY por defecto, que es un numero mucho mas representativo.
async function fetchSalesReport(frequency, reportDate) {
  if (!isConfigured()) {
    return { supported: false, reason: 'Faltan credenciales de App Store Connect en .env' };
  }

  const cacheKey = `${frequency}:${reportDate}`;
  const hit = reportCache.get(cacheKey);
  if (hit && Date.now() - hit.at < REPORT_TTL_MS) return hit.result;
  const result = await downloadSalesReport(frequency, reportDate);
  reportCache.set(cacheKey, { at: Date.now(), result });
  return result;
}

async function downloadSalesReport(frequency, reportDate) {
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
// month (YYYY-MM) opcional: con un mes explicito se informa ESE mes tal cual
// (sin caer al anterior); sin el, el comportamiento automatico de arriba.
async function getAppSalesSummary(project, month) {
  const appleAppId = project.store && project.store.appleAppId;
  if (!appleAppId) return { supported: false, reason: 'Este proyecto no tiene appleAppId configurado' };

  if (month) {
    const { supported, reason, rows } = await fetchSalesReport('MONTHLY', month);
    if (!supported) return { supported: false, reason };
    // Mes en curso sin informe: Apple lo publica al cerrar el mes -> no es "0 ventas".
    if (!rows.length && month === monthsAgo(0)) {
      return { supported: true, month, units: null, proceeds: null, note: 'Apple publica el informe del mes en curso cuando el mes cierra.' };
    }
    return { supported: true, month, ...sumAppRows(rows, appleAppId), ...(rows.length ? {} : { note: 'Sin actividad reportada en este mes' }) };
  }

  for (const month of [monthsAgo(0), monthsAgo(1)]) {
    const { supported, reason, rows } = await fetchSalesReport('MONTHLY', month);
    if (!supported) return { supported: false, reason };
    if (rows.length) {
      return { supported: true, month, ...sumAppRows(rows, appleAppId) };
    }
  }

  return { supported: true, month: monthsAgo(0), units: 0, proceeds: 0, note: 'Sin descargas en los últimos dos meses' };
}

// Descargas e ingresos de los ultimos N meses (el mes en curso incluido), de
// mas antiguo a mas reciente, para pintar la evolucion. Un mes que Apple no pudo
// devolver (o el mes en curso sin informe) queda con units/proceeds en null: no se inventa un 0.
async function getAppSalesHistory(project, months = 6) {
  const appleAppId = project.store && project.store.appleAppId;
  if (!appleAppId || !isConfigured()) return [];

  const list = Array.from({ length: months }, (_, i) => monthsAgo(months - 1 - i));
  const results = await Promise.allSettled(list.map((m) => fetchSalesReport('MONTHLY', m)));
  return list.map((month, i) => {
    const r = results[i];
    if (r.status !== 'fulfilled' || !r.value.supported) return { month, units: null, proceeds: null };
    // El informe mensual del mes en curso no existe hasta que Apple lo cierra:
    // vacio ahi significa "todavia sin informe", no "cero ventas".
    if (!r.value.rows.length && month === monthsAgo(0)) return { month, units: null, proceeds: null, pending: true };
    return { month, ...sumAppRows(r.value.rows, appleAppId) };
  });
}

// Estado de la app en App Store Connect (no necesita el vendor number: es la
// API de gestion, no la de informes). tone -> color del chip en la UI.
const STATE_INFO = {
  READY_FOR_SALE: { label: 'Publicada', tone: 'ok' },
  PENDING_DEVELOPER_RELEASE: { label: 'Aprobada, pendiente de publicar', tone: 'pending' },
  PENDING_APPLE_RELEASE: { label: 'Aprobada, pendiente de publicar', tone: 'pending' },
  PROCESSING_FOR_APP_STORE: { label: 'Procesando', tone: 'pending' },
  WAITING_FOR_REVIEW: { label: 'En cola de revisión', tone: 'pending' },
  IN_REVIEW: { label: 'En revisión', tone: 'pending' },
  PREPARE_FOR_SUBMISSION: { label: 'En preparación', tone: 'neutral' },
  REJECTED: { label: 'Rechazada', tone: 'error' },
  METADATA_REJECTED: { label: 'Metadatos rechazados', tone: 'error' },
  INVALID_BINARY: { label: 'Binario inválido', tone: 'error' },
  DEVELOPER_REJECTED: { label: 'Retirada por el desarrollador', tone: 'neutral' },
  REMOVED_FROM_SALE: { label: 'Retirada de la tienda', tone: 'error' },
};

function describeState(version) {
  const state = version.attributes.appStoreState;
  const info = STATE_INFO[state] || { label: state, tone: 'neutral' };
  return { state, label: info.label, tone: info.tone, version: version.attributes.versionString };
}

// Si hay una version publicada se informa esa (y, aparte, la mas nueva si va
// por otro estado: ej. 1.0.4 publicada y 1.0.5 en preparacion). Si no, la mas
// reciente. null = la app no tiene ficha en App Store Connect.
async function getAppStoreStatus(project) {
  const appleAppId = project.store && project.store.appleAppId;
  if (!appleAppId) return null;
  if (!process.env.APP_STORE_CONNECT_PRIVATE_KEY_PATH) throw new Error('Faltan credenciales de App Store Connect en .env');

  const params = new URLSearchParams({ limit: '10', 'fields[appStoreVersions]': 'versionString,appStoreState' });
  const res = await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${appleAppId}/appStoreVersions?${params}`, {
    headers: { Authorization: `Bearer ${buildToken()}` },
  });
  if (!res.ok) throw new Error(`App Store Connect respondio ${res.status}`);

  const versions = (await res.json()).data || [];
  if (!versions.length) return null;

  const latest = versions[0];
  const live = versions.find((v) => v.attributes.appStoreState === 'READY_FOR_SALE');
  const status = describeState(live || latest);
  if (live && live !== latest) {
    const next = describeState(latest);
    status.next = { version: next.version, label: next.label };
  }
  return status;
}

module.exports = { isConfigured, fetchSalesReport, getAppSalesSummary, getAppSalesHistory, getAppStoreStatus };
