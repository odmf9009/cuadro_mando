const { getMongoProjectStats } = require('./mongoConnector');
const { getInvoiceSnapStats } = require('./invoiceSnapConnector');

const handlers = {
  mongo: getMongoProjectStats,
  postgres: getInvoiceSnapStats,
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
