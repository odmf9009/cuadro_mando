const { getMongoProjectStats } = require('./mongoConnector');
const { getInvoiceSnapStats } = require('./invoiceSnapConnector');

// 'none': apps sin backend/base de datos propia (ej. SkillFix, que solo
// consume la API de YouTube del lado del cliente). No es un error de
// conexion -> "noBackend: true" en vez de "connected: false", para que el
// frontend muestre solo las metricas de tienda en vez del banner de error.
async function getNoBackendStats() {
  return { connected: true, noBackend: true };
}

const handlers = {
  mongo: getMongoProjectStats,
  postgres: getInvoiceSnapStats,
  none: getNoBackendStats,
};

// Nunca deja que un backend caido/mal configurado tumbe el resto del panel:
// cualquier excepcion se convierte en { connected: false, error }.
async function getProjectStats(project) {
  const handler = handlers[project.type];
  if (!handler) {
    return { connected: false, error: `Tipo de proyecto desconocido: ${project.type}` };
  }
  try {
    return await handler(project);
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

async function getAllProjectStats(projects) {
  const entries = await Promise.all(
    projects.map(async (project) => [project.id, await getProjectStats(project)])
  );
  return Object.fromEntries(entries);
}

module.exports = { getProjectStats, getAllProjectStats };
