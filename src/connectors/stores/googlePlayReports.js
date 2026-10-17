const path = require('path');
const { Storage } = require('@google-cloud/storage');
const { parse } = require('csv-parse/sync');

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

module.exports = { isConfigured, getInstallsOverview };
