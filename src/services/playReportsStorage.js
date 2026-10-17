const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { readEarningsZip } = require('../connectors/stores/googleEarnings');

// Informes de ganancias de Google Play importados a mano (ZIP tal cual lo da
// Play Console). Sirven mientras la cuenta de servicio no pueda leer el bucket
// y siguen siendo validos despues. Nombre en disco = earnings_<AAAAMM>_<sufijo>
// con ambos validados por regex: nunca se usa texto del usuario como ruta.
const DIR = path.join(__dirname, '..', '..', 'uploads', 'play-reports');
const FILE_RE = /^earnings_(\d{6})_[A-Za-z0-9-]+\.zip$/;

function ensureDir() {
  fs.mkdirSync(DIR, { recursive: true });
}

// "earnings_earnings_202609_66049793-2 (1).zip" -> { month: "202609", suffix: "66049793-2" }
// El sufijo identifica cada parte del informe de un mes (hay una por perfil de
// pagos): subir otra vez la misma parte la REEMPLAZA, no la duplica.
function parseName(originalName) {
  const base = path
    .basename(String(originalName || ''))
    .replace(/\.zip$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '');
  const m = base.match(/(\d{6})_([A-Za-z0-9-]{1,40})$/);
  return m ? { month: m[1], suffix: m[2] } : null;
}

// Valida que sea de verdad un informe de ganancias antes de guardar nada.
function save(buffer, originalName) {
  const parsed = readEarningsZip(buffer);
  const named = parseName(originalName);
  const suffix =
    named && named.month === parsed.month
      ? named.suffix
      : crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 10);
  const file = `earnings_${parsed.month}_${suffix}.zip`;
  ensureDir();
  fs.writeFileSync(path.join(DIR, file), buffer);
  return { month: parsed.month, file, rows: parsed.rows.length };
}

function filesForMonth(month) {
  if (!/^\d{6}$/.test(month) || !fs.existsSync(DIR)) return [];
  return fs.readdirSync(DIR).filter((f) => {
    const m = f.match(FILE_RE);
    return m && m[1] === month;
  });
}

// Meses con informe importado, del mas reciente al mas antiguo.
function listMonths() {
  if (!fs.existsSync(DIR)) return [];
  const counts = {};
  for (const f of fs.readdirSync(DIR)) {
    const m = f.match(FILE_RE);
    if (m) counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([month, files]) => ({ month, files }))
    .sort((a, b) => b.month.localeCompare(a.month));
}

// Todas las filas de un mes (suma de todas sus partes). [] si no hay nada importado.
function readMonthRows(month) {
  const rows = [];
  for (const f of filesForMonth(month)) rows.push(...readEarningsZip(fs.readFileSync(path.join(DIR, f))).rows);
  return rows;
}

module.exports = { save, listMonths, readMonthRows };
