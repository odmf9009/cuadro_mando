const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { parse } = require('csv-parse/sync');
const { readEarningsZip, summarizeEarnings } = require('./googleEarnings');
const playReportsStorage = require('../../services/playReportsStorage');

// Google Play no tiene una API REST simple para "instalaciones totales por
// app": el mecanismo oficial estable es vincular un bucket de Cloud Storage
// en Play Console (Configuracion -> Descargar informes -> vincular cuenta
// de Cloud Storage) y Google deja ahi CSVs diarios automaticamente:
//   gs://pubsite_prod_rev_<id>/installs/installs_<packageName>_<YYYYMM>_overview.csv
//   gs://pubsite_prod_rev_<id>/financial/...
// Docs: https://support.google.com/googleplay/android-developer/answer/6135870

// Igual que firebaseAdmin.js: anclado a __dirname, no a process.cwd(), para
// que una ruta relativa en .env (./secrets/...) funcione sin importar desde
// donde se lance el proceso (terminal, Run Config de IDE, etc.).
const PROJECT_ROOT = path.join(__dirname, '..', '..', '..');

let storageClient = null;
function getStorage() {
  if (storageClient) return storageClient;
  const keyFile = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!keyFile) return null;
  const resolved = path.isAbsolute(keyFile) ? keyFile : path.join(PROJECT_ROOT, keyFile);
  storageClient = new Storage({ keyFilename: resolved });
  return storageClient;
}

function isConfigured() {
  return Boolean(process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_PLAY_REPORTS_BUCKET);
}

// El 403 de Cloud Storage trae rutas internas y el correo de la cuenta de
// servicio (y es muy largo): se reemplaza por un mensaje accionable. Suele
// pasar justo despues de invitar a la cuenta en Play Console, hasta que
// Google propaga el acceso al bucket.
function friendlyStorageError(err) {
  if (err && err.code === 403) {
    return new Error(
      'Google Play todavía no da acceso a los informes a la cuenta de servicio. ' +
        'Suele resolverse solo en unas horas tras invitarla en Play Console (Usuarios y permisos).'
    );
  }
  return err;
}

// month en formato YYYYMM (ej. "202609").
async function getInstallsOverview(project, month) {
  const packageName = project.store && project.store.androidPackageName;
  if (!packageName) return { supported: false, reason: 'Este proyecto no tiene androidPackageName configurado' };
  if (!isConfigured()) {
    return { supported: false, reason: 'Faltan GOOGLE_PLAY_SERVICE_ACCOUNT_JSON / GOOGLE_PLAY_REPORTS_BUCKET en .env' };
  }

  const storage = getStorage();
  const bucket = storage.bucket(process.env.GOOGLE_PLAY_REPORTS_BUCKET);
  const filePath = `installs/installs_${packageName}_${month}_overview.csv`;
  const file = bucket.file(filePath);

  let exists;
  try {
    [exists] = await file.exists();
  } catch (err) {
    throw friendlyStorageError(err);
  }
  if (!exists) {
    return { supported: true, rows: [], note: `Google aun no publico el reporte de ${month} (${filePath})` };
  }

  // Estos CSV vienen en UTF-16LE con BOM (particularidad conocida de los
  // reportes de Play Console).
  let buffer;
  try {
    [buffer] = await file.download();
  } catch (err) {
    throw friendlyStorageError(err);
  }
  const text = buffer.toString('utf16le').replace(/^﻿/, '');
  const rows = parse(text, { columns: true, skip_empty_lines: true });

  const totalInstalls = rows.reduce((sum, r) => sum + Number(r['Daily Device Installs'] || 0), 0);
  const totalUninstalls = rows.reduce((sum, r) => sum + Number(r['Daily Device Uninstalls'] || 0), 0);

  return { supported: true, month, totalInstalls, totalUninstalls, days: rows.length };
}

// ---- Ganancias (informes de ganancias de Play Console) ----------------------
// Fuente 1: ZIP importado a mano (playReportsStorage). Fuente 2: el bucket de
// informes (earnings/earnings_AAAAMM_*.zip; esa ruta se infirio del nombre de
// archivo que descarga Play Console y esta pendiente de confirmar con acceso
// real). Se cachea para no repetir descargas ni 403 en cada carga de pagina.
const EARNINGS_TTL_MS = 10 * 60 * 1000;
const bucketCache = new Map();

async function readBucketEarningsRows(month) {
  const hit = bucketCache.get(month);
  if (hit && Date.now() - hit.at < EARNINGS_TTL_MS) {
    if (hit.error) throw hit.error;
    return hit.rows;
  }

  try {
    const [files] = await getStorage()
      .bucket(process.env.GOOGLE_PLAY_REPORTS_BUCKET)
      .getFiles({ prefix: `earnings/earnings_${month}_` });
    const rows = [];
    for (const file of files.filter((f) => f.name.endsWith('.zip'))) {
      const [buffer] = await file.download();
      rows.push(...readEarningsZip(buffer).rows);
    }
    bucketCache.set(month, { at: Date.now(), rows });
    return rows;
  } catch (err) {
    const friendly = friendlyStorageError(err);
    bucketCache.set(month, { at: Date.now(), error: friendly });
    throw friendly;
  }
}

function monthKey(offset) {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - offset);
  return d.toISOString().slice(0, 7).replace('-', ''); // AAAAMM
}

// month = AAAAMM; sin el, el ultimo de los 3 meses recientes que tenga informe
// (el del mes en curso no existe hasta que Google lo cierra).
async function getEarnings(project, month = '') {
  const packageName = project.store && project.store.androidPackageName;
  if (!packageName) return { supported: false, reason: 'Este proyecto no tiene androidPackageName configurado' };

  let bucketReason = null;
  for (const m of month ? [month] : [monthKey(0), monthKey(1), monthKey(2)]) {
    let rows = playReportsStorage.readMonthRows(m);
    let source = 'manual';
    if (!rows.length && isConfigured()) {
      try {
        rows = await readBucketEarningsRows(m);
        source = 'bucket';
      } catch (err) {
        bucketReason = err.message;
      }
    }
    if (rows.length) {
      const summary = summarizeEarnings(rows, packageName);
      // Hay informe del mes pero esta app no tuvo movimientos: es un cero real.
      return {
        supported: true,
        month: m,
        source,
        ...(summary || { currency: 'USD', gross: 0, fees: 0, net: 0, charges: 0, refunds: 0, bySku: {}, types: [] }),
      };
    }
  }

  return {
    supported: false,
    reason:
      bucketReason ||
      'Todavía no hay informes de ganancias: descarga el del mes en Play Console e impórtalo aquí.',
  };
}

// Neto por mes de los ultimos N meses (de mas antiguo a mas reciente);
// null = sin informe de ese mes (no es un cero).
async function getEarningsHistory(project, months = 6) {
  const list = Array.from({ length: months }, (_, i) => monthKey(months - 1 - i));
  const results = await Promise.allSettled(list.map((m) => getEarnings(project, m)));
  return list.map((month, i) => {
    const r = results[i];
    return { month, net: r.status === 'fulfilled' && r.value.supported ? r.value.net : null };
  });
}

module.exports = { isConfigured, getInstallsOverview, getEarnings, getEarningsHistory };
