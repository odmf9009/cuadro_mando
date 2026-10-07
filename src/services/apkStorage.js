const fs = require('fs');
const path = require('path');

// Anclado a __dirname, no a process.cwd() (mismo motivo que en
// firebaseAdmin.js: debe funcionar sin importar desde donde se lance el
// proceso). Los archivos subidos NO van al repo (uploads/ esta en
// .gitignore): es contenido que se genera en cada servidor, no codigo.
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'apks');

function ensureDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function filePath(projectId) {
  return path.join(UPLOAD_DIR, `${projectId}.apk`);
}

function metaPath(projectId) {
  return path.join(UPLOAD_DIR, `${projectId}.meta.json`);
}

// Info publica/administrativa del APK actual (o null si nunca se subio uno).
function getInfo(projectId) {
  const apk = filePath(projectId);
  if (!fs.existsSync(apk)) return null;

  const stat = fs.statSync(apk);
  let meta = {};
  try {
    meta = JSON.parse(fs.readFileSync(metaPath(projectId), 'utf8'));
  } catch {
    // Sin metadata (ej. archivo subido a mano al disco) -> igual se sirve,
    // solo sin version/notas.
  }

  return {
    sizeBytes: stat.size,
    uploadedAt: meta.uploadedAt || stat.mtime.toISOString(),
    version: meta.version || null,
    notes: meta.notes || null,
    originalName: meta.originalName || null,
  };
}

// Guarda el buffer subido (reemplaza lo que hubiera) + su metadata.
function save(projectId, buffer, { version, notes, originalName }) {
  ensureDir();
  fs.writeFileSync(filePath(projectId), buffer);
  fs.writeFileSync(
    metaPath(projectId),
    JSON.stringify(
      {
        version: version || null,
        notes: notes || null,
        originalName: originalName || null,
        uploadedAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

module.exports = { getInfo, save, filePath, ensureDir };
