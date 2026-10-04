const path = require('path');
const dotenv = require('dotenv');

// Ancladas a __dirname (no a process.cwd()): si alguien lanza esto con un
// "working directory" distinto (ej. un Run Config de IDE apuntando a src/
// en vez de a la raiz del proyecto), igual encuentra el .env correcto.
const PROJECT_ROOT = path.join(__dirname, '..');

// .env siempre se carga (contiene lo comun: admin, SMTP, Firebase, y las
// URIs "por defecto", que hoy son las de produccion en 2.24.77.82).
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

// DB_MODE=local (puesto en .env) carga ADEMAS .env.local, que solo trae las
// URIs que se quieren reemplazar (override:true) -> no hace falta duplicar
// todo el archivo, solo las excepciones. Ver .env.local.example.
const dbMode = process.env.DB_MODE || 'remote';
if (dbMode === 'local') {
  const localEnvPath = path.join(PROJECT_ROOT, '.env.local');
  const result = dotenv.config({ path: localEnvPath, override: true });
  if (result.error) {
    console.warn(
      `[DB_MODE=local] no se pudo leer ${localEnvPath} (${result.error.message}). Copia .env.local.example -> .env.local`
    );
  } else {
    console.log(`[DB_MODE=local] conexiones locales cargadas desde ${localEnvPath}`);
  }
}

const app = require('./app');

// Number(...) en vez de solo "||" porque una variable de entorno heredada
// con valor "0" (string no vacío) pasaría el check de "||" y el server
// intentaria escuchar en el puerto 0.
const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`Cuadro de mando escuchando en http://localhost:${PORT}`);
});
