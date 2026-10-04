const fs = require('fs');
const path = require('path');
// firebase-admin v13+ usa la API modular (antes era admin.credential.cert /
// admin.auth()). Ver https://firebase.google.com/docs/admin/migrate.
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Cada proyecto Firebase (CurbRadar, FixRadar) es una app de Firebase distinta
// -> hay que inicializar una instancia con nombre por proyecto, no la app
// "default" de firebase-admin (solo se puede inicializar una vez).
const apps = new Map();

// Igual que en server.js: anclado a __dirname, no a process.cwd(), para que
// las rutas relativas del .env (./secrets/...) funcionen sin importar desde
// donde se lance el proceso (terminal, Run Config de IDE, etc.).
const PROJECT_ROOT = path.join(__dirname, '..', '..');

function buildCredential(project) {
  const fb = project.auth && project.auth.firebase;
  if (!fb) return { error: 'Este proyecto no tiene configuración de Firebase Auth' };

  if (fb.serviceAccountPathEnv) {
    const rawPath = process.env[fb.serviceAccountPathEnv];
    if (!rawPath) return { error: `Falta configurar ${fb.serviceAccountPathEnv} en .env` };
    const resolved = path.isAbsolute(rawPath) ? rawPath : path.join(PROJECT_ROOT, rawPath);
    if (!fs.existsSync(resolved)) {
      return { error: `No se encontró el archivo de credenciales: ${resolved}` };
    }
    const serviceAccount = JSON.parse(fs.readFileSync(resolved, 'utf8'));
    return { credential: cert(serviceAccount) };
  }

  if (fb.firebaseEnv) {
    const projectId = process.env[fb.firebaseEnv.projectId];
    const clientEmail = process.env[fb.firebaseEnv.clientEmail];
    // La private key viene con \n literales en el .env; hay que convertirlos
    // a saltos de linea reales para que la libreria de JWT la acepte.
    const privateKey = (process.env[fb.firebaseEnv.privateKey] || '').replace(/\\n/g, '\n');
    if (!projectId || !clientEmail || !privateKey) {
      return { error: 'Faltan variables de entorno de Firebase para este proyecto' };
    }
    return { credential: cert({ projectId, clientEmail, privateKey }) };
  }

  return { error: 'Este proyecto no tiene configuración de Firebase Auth' };
}

function getFirebaseApp(project) {
  if (apps.has(project.id)) return apps.get(project.id);

  const { credential, error } = buildCredential(project);
  if (error) {
    apps.set(project.id, { error });
    return { error };
  }

  const app = initializeApp({ credential }, `cuadro-mando-${project.id}`);
  const result = { app };
  apps.set(project.id, result);
  return result;
}

// Genera el link oficial de "restablecer contraseña" de Firebase Auth para
// un email. No envia nada: solo devuelve la URL (la manda el llamador, por
// correo o mostrandola en pantalla). Firebase valida que el email exista.
async function generatePasswordResetLink(project, email) {
  const { app, error } = getFirebaseApp(project);
  if (error) throw new Error(error);
  return getAuth(app).generatePasswordResetLink(email);
}

module.exports = { generatePasswordResetLink };
