import { computed } from 'vue'

// Convierte los datos de un proyecto (stats de su BD + metricas de tienda) en
// las TARJETAS POR ORIGEN de la pagina de proyecto: App Store, Google Play y,
// si el proyecto tiene pagos que no pasan por una tienda, "Web y otros pagos"
// o "Datos de la app". Toda la logica de "que cifra va en que tarjeta y de
// donde sale" vive aqui; las paginas y StoreCard solo pintan lo que reciben.
//
// Cada fila lleva su origen (SourceTag) y un state: loading | ok | unavailable
// | pending. Mientras un dato no llega, su fila esta en "loading" (la tarjeta
// se ve desde el primer momento); si no existe, dice por que en vez de inventar.

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€' }

export function formatMoney(amount, currency = 'USD') {
  const code = String(currency).toUpperCase()
  const n = amount.toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return CURRENCY_SYMBOLS[code] ? `${CURRENCY_SYMBOLS[code]}${n}` : `${n} ${code}`
}

const fmtInt = (n) => n.toLocaleString('es')

// "2026-09" (Apple) o "202609" (Google) -> "sep 2026".
function formatPeriod(period) {
  const digits = String(period || '').replace(/\D/g, '')
  if (digits.length < 6) return ''
  return new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, 1).toLocaleDateString('es', {
    month: 'short',
    year: 'numeric',
  })
}
const entriesOf = (obj) => Object.entries(obj || {})
const toDetails = (obj) => entriesOf(obj).map(([label, count]) => ({ label, value: fmtInt(count) }))

const SRC = {
  appleReport: { kind: 'apple', label: 'Informe de ventas de Apple' },
  googleReport: { kind: 'google', label: 'Informes de Google Play' },
  db: { kind: 'db', label: 'Base de datos de la app' },
}

const PENDING_TEST_HINT = 'Pago en modo prueba, no es dinero real'

// ---- filas reutilizables por ambas tiendas ---------------------------------

// Suscripciones activas atribuidas a una tienda (solo si el conector sabe
// quien cobro: ver subscriptions.bySource de Invoice Snap).
function subscriptionsRow(project, stats, sourceKey) {
  const base = { id: 'subs', label: 'Suscripciones activas' }
  if (!project.capabilities?.subscriptions) return { ...base, state: 'unavailable', reason: 'No tiene suscripciones' }
  if (!stats) return { ...base, state: 'loading', source: SRC.db }
  if (!stats.connected) return { ...base, state: 'unavailable', reason: 'Sin conexión con la base de datos del proyecto' }

  const bySource = stats.subscriptions?.bySource
  if (!bySource) {
    return { ...base, state: 'unavailable', reason: 'No se puede atribuir a una tienda (ver "Datos de la app")' }
  }
  const mine = bySource[sourceKey] || { active: 0, byPlan: {} }
  return { ...base, state: 'ok', value: fmtInt(mine.active), source: SRC.db, details: toDetails(mine.byPlan) }
}

// Compras dentro de la app registradas en la BD del proyecto y atribuidas a
// una tienda. Solo existe para conectores que informan "revenue" (Invoice Snap).
function purchasesRows(stats, sourceKeys) {
  if (!stats?.connected || !Array.isArray(stats.revenue)) return []
  const mine = stats.revenue.filter((r) => sourceKeys.includes(r.source))
  if (!mine.length) {
    return [{ id: 'purchases', label: 'Compras de créditos', state: 'ok', value: formatMoney(0), source: SRC.db }]
  }
  return mine.map((r, i) => ({
    id: `purchases-${i}`,
    label: 'Compras de créditos',
    state: 'ok',
    value: formatMoney(r.total, r.currency),
    tag: r.isTestMode ? 'PRUEBA' : '',
    tagTitle: r.isTestMode ? PENDING_TEST_HINT : '',
    source: SRC.db,
  }))
}

// ---- App Store -------------------------------------------------------------

function appleSection(project, stats, storeStats) {
  const hasListing = Boolean(project.store?.hasAppleListing)
  const apple = storeStats?.apple

  const report = (id, label, pick) => {
    if (!hasListing) return { id, label, state: 'unavailable', reason: 'Esta app todavía no tiene ficha en App Store Connect' }
    if (!storeStats) return { id, label, state: 'loading', source: SRC.appleReport }
    if (apple.supported && apple.units != null) {
      return { id, label, state: 'ok', source: SRC.appleReport, hint: formatPeriod(apple.month), ...pick(apple) }
    }
    return { id, label, state: 'unavailable', reason: apple.reason || apple.note || 'Sin datos todavía', source: SRC.appleReport }
  }

  let status = null
  let statusFallback = ''
  if (!hasListing) statusFallback = 'Sin ficha en App Store Connect'
  else if (storeStats) {
    if (apple.status) status = apple.status
    else statusFallback = apple.status === null ? 'Sin ficha en App Store Connect' : 'Estado no disponible'
  }

  return {
    id: 'apple',
    kind: 'apple',
    title: 'App Store',
    status,
    statusFallback,
    rows: [
      report('downloads', 'Descargas', (a) => ({ value: fmtInt(a.units), note: a.note })),
      report('revenue', 'Ingresos netos', (a) => ({ value: formatMoney(a.proceeds) })),
      subscriptionsRow(project, stats, 'apple'),
      ...purchasesRows(stats, ['apple']),
    ],
    footer: 'Fuente: App Store Connect. Los ingresos son netos para el desarrollador (tras la comisión de Apple).',
  }
}

// ---- Google Play -----------------------------------------------------------

function googleSection(project, stats, storeStats) {
  const hasListing = Boolean(project.store?.hasAndroidListing)
  const google = storeStats?.google

  let installs
  if (!hasListing) {
    installs = { state: 'unavailable', reason: 'Esta app no tiene versión Android registrada' }
  } else if (!storeStats) {
    installs = { state: 'loading', source: SRC.googleReport }
  } else if (google.supported && google.totalInstalls != null) {
    installs = {
      state: 'ok',
      value: fmtInt(google.totalInstalls),
      hint: formatPeriod(google.month),
      note: `${fmtInt(google.totalUninstalls)} desinstalaciones en el mismo periodo`,
      source: SRC.googleReport,
    }
  } else {
    installs = { state: 'unavailable', reason: google.note || google.reason || 'Sin datos todavía', source: SRC.googleReport }
  }

  let revenue
  if (!hasListing) revenue = { state: 'unavailable', reason: 'Esta app no tiene versión Android registrada' }
  else if (!storeStats) revenue = { state: 'loading', source: SRC.googleReport }
  else if (google.revenue != null) revenue = { state: 'ok', value: formatMoney(google.revenue), hint: formatPeriod(google.month), source: SRC.googleReport }
  else {
    revenue = {
      state: 'pending',
      reason: google.supported ? 'Pendiente de leer los informes de ganancias' : 'Pendiente de acceso a los informes de Google Play',
      source: SRC.googleReport,
    }
  }

  return {
    id: 'google',
    kind: 'google',
    title: 'Google Play',
    status: null,
    statusFallback: hasListing ? 'Estado de publicación: sin conectar' : 'Sin versión Android',
    rows: [
      { id: 'installs', label: 'Instalaciones', ...installs },
      { id: 'revenue', label: 'Ingresos netos', ...revenue },
      subscriptionsRow(project, stats, 'google'),
      ...purchasesRows(stats, ['google']),
    ],
    footer: 'Fuente: informes de Google Play Console. Los ingresos serán netos tras la comisión de Google.',
  }
}

// ---- Pagos que no pasan por una tienda -------------------------------------

function ownSection(stats) {
  if (!stats?.connected) return null
  const subs = stats.subscriptions
  const rows = []
  const attributed = Boolean(subs?.bySource)

  if (subs && !attributed) {
    // Sin atribucion por tienda (ej. CardAlert): el plan lo guarda la propia app.
    rows.push({
      id: 'own-subs',
      label: 'Suscripciones activas',
      state: 'ok',
      value: fmtInt(subs.active),
      hint: subs.activeLabel,
      source: { kind: 'firebase', label: subs.sourceLabel || 'Firebase' },
      details: toDetails(subs.byPlan),
    })
  }

  if (attributed) {
    const mine = ['web', 'other'].map((k) => subs.bySource[k]).filter(Boolean)
    if (mine.length) {
      const byPlan = {}
      for (const m of mine) for (const [plan, n] of entriesOf(m.byPlan)) byPlan[plan] = (byPlan[plan] || 0) + n
      rows.push({
        id: 'web-subs',
        label: 'Suscripciones activas',
        state: 'ok',
        value: fmtInt(mine.reduce((sum, m) => sum + m.active, 0)),
        source: { kind: 'web', label: 'Stripe y manuales' },
        details: toDetails(byPlan),
      })
    }
    if (entriesOf(subs.byStatus).length) {
      rows.push({
        id: 'subs-status',
        label: 'Suscripciones por estado',
        state: 'ok',
        value: fmtInt(entriesOf(subs.byStatus).reduce((sum, [, n]) => sum + n, 0)),
        hint: 'todas las tiendas',
        source: SRC.db,
        details: toDetails(subs.byStatus),
      })
    }
  }

  for (const [i, r] of (subs?.revenueByPlan || []).entries()) {
    rows.push({
      id: `plan-revenue-${i}`,
      label: `Ingresos · ${r.plan}`,
      state: 'ok',
      value: formatMoney(r.total, r.currency),
      tag: r.isTestMode ? 'PRUEBA' : '',
      tagTitle: r.isTestMode ? 'Pago en modo prueba de Stripe, no es dinero real' : '',
      source: { kind: 'web', label: 'Stripe' },
    })
  }

  if (Array.isArray(stats.revenue)) {
    stats.revenue
      .filter((r) => r.source === 'web' || r.source === 'other')
      .forEach((r, i) =>
        rows.push({
          id: `own-purchases-${i}`,
          label: 'Compras de créditos',
          state: 'ok',
          value: formatMoney(r.total, r.currency),
          tag: r.isTestMode ? 'PRUEBA' : '',
          tagTitle: r.isTestMode ? PENDING_TEST_HINT : '',
          source: SRC.db,
        })
      )
  }

  if (!rows.length) return null
  return {
    id: 'own',
    kind: attributed ? 'web' : 'firebase',
    title: attributed ? 'Web y otros pagos' : 'Datos de la app',
    status: null,
    statusFallback: '',
    rows,
    footer: attributed
      ? 'Pagos que no pasan por Apple ni por Google.'
      : (subs?.notes || []).join(' ') || 'Datos que guarda la propia app, sin verificar con ninguna tienda.',
  }
}

export function buildSections(project, stats, storeStats) {
  const sections = []
  if (project.hasStoreMetrics) {
    sections.push(appleSection(project, stats, storeStats), googleSection(project, stats, storeStats))
  }
  const own = ownSection(stats)
  if (own) sections.push(own)
  return sections
}

export function useProjectSections(projectRef, statsRef, storeStatsRef) {
  return computed(() => (projectRef.value ? buildSections(projectRef.value, statsRef.value, storeStatsRef.value) : []))
}
