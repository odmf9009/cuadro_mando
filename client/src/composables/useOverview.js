import { computed, reactive, ref } from 'vue'
import { projectsApi } from '../api/projects'
import { useProjectsStore } from '../stores/projects'
import { formatMoney } from './useProjectSections'

// Lógica del RESUMEN (la página solo pinta): une el registro de apps, las estadísticas de cada
// base de datos (rápidas) y las métricas de tienda (APIs externas, lentas y pedidas aparte, tres a
// la vez) en el modelo de filas, KPI, gráfico y ranking que usa la pantalla.
//
// Honestidad del dato: cada celda es { state: 'loading' | 'ok' | 'na' | 'pending', ... }.
// "na" = no existe para esa app (con su motivo) y se pinta como guion gris; "pending" = existe
// pero aún no se puede leer. Nunca se rellena un hueco con una cifra supuesta. Las suscripciones
// que la propia app declara sin verificar NO entran en el total global.

const monthLabel = (period) => {
  const digits = String(period || '').replace(/\D/g, '')
  if (digits.length < 6) return ''
  return new Date(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)) - 1, 1).toLocaleDateString('es', { month: 'short', year: 'numeric' })
}

export function useOverview() {
  const registry = useProjectsStore()
  const stats = reactive({}) // id → estadísticas de la base de datos de la app
  const stores = reactive({}) // id → métricas de tienda (o { error })
  const summary = reactive({ totalUsers: 0, connectedCount: 0, totalProjects: 0, activeSubscriptions: 0 })
  const loading = ref(true)
  const updatedAt = ref(null)
  let token = 0

  async function load() {
    const t = ++token
    loading.value = true
    const registryReady = registry.load()
    try {
      const data = await projectsApi.overview()
      await registryReady
      if (t !== token) return
      for (const k of Object.keys(stats)) delete stats[k]
      Object.assign(stats, data.stats)
      Object.assign(summary, data.summary)
    } catch (err) {
      await registryReady.catch(() => {})
      if (t !== token) return
      for (const p of registry.items) stats[p.id] = { connected: false, error: err.message }
    }
    if (t !== token) return
    loading.value = false
    updatedAt.value = new Date()
    loadStores(t)
  }

  // Métricas de tienda de cada app, con un máximo de tres peticiones a la vez para no saturar
  // las APIs de Apple y Google. Cada fila se rellena en cuanto llega la suya.
  async function loadStores(t) {
    for (const k of Object.keys(stores)) delete stores[k]
    const ids = registry.items.filter((p) => p.hasStoreMetrics).map((p) => p.id)
    let next = 0
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++]
        try {
          const data = await projectsApi.storeStats(id)
          if (t === token) stores[id] = data
        } catch (err) {
          if (t === token) stores[id] = { error: err.message }
        }
      }
    }
    await Promise.all([worker(), worker(), worker()])
  }

  // ---- celdas ---------------------------------------------------------------

  function dbCell(s, value, reasonMissing) {
    if (loading.value || !s) return { state: 'loading' }
    if (!s.connected) return { state: 'na', reason: 'Sin conexión con la base de datos de la app' }
    if (s.noBackend) return { state: 'na', reason: 'Esta app no tiene base de datos propia' }
    if (value == null) return { state: 'na', reason: reasonMissing || 'Esta app no registra este dato' }
    return { state: 'ok', value }
  }

  function appleCell(p) {
    if (!p.hasStoreMetrics || !p.store?.hasAppleListing) return { state: 'na', reason: 'Sin ficha en App Store Connect' }
    const st = stores[p.id]
    if (!st) return { state: 'loading' }
    if (st.error || !st.apple) return { state: 'na', reason: st.error || 'No disponible' }
    const a = st.apple
    if (!a.supported) return { state: 'na', reason: a.reason || a.note || 'Sin datos todavía' }
    return { state: 'ok', status: a.status || null, units: a.units, proceeds: a.proceeds, month: a.month }
  }

  function googleCell(p) {
    if (!p.hasStoreMetrics || !p.store?.hasAndroidListing) return { state: 'na', reason: 'Esta app no tiene versión Android registrada' }
    const st = stores[p.id]
    if (!st) return { state: 'loading' }
    if (st.error || !st.google) return { state: 'na', reason: st.error || 'No disponible' }
    const g = st.google
    if (!g.supported) return { state: 'pending', reason: g.reason || g.note || 'Informes de Google Play sin acceso todavía' }
    const e = g.earnings
    if (e?.supported && e.net != null && !e.mixedCurrencies) {
      return { state: 'ok', net: e.net, money: formatMoney(e.net, e.currency || 'USD'), month: e.month }
    }
    return { state: 'pending', reason: 'Sin informe de ganancias importado para este mes' }
  }

  function googleInstallsCell(p) {
    if (!p.hasStoreMetrics || !p.store?.hasAndroidListing) return { state: 'na', reason: 'Esta app no tiene versión Android registrada' }
    const st = stores[p.id]
    if (!st) return { state: 'loading' }
    const g = st.google
    if (st.error || !g) return { state: 'na', reason: st.error || 'No disponible' }
    if (g.supported && g.totalInstalls != null) return { state: 'ok', value: g.totalInstalls }
    return { state: 'pending', reason: g.note || g.reason || 'Google Play aún no publicó el informe de instalaciones' }
  }

  function subsCell(s) {
    if (loading.value || !s) return { state: 'loading' }
    if (!s.connected || s.noBackend) return { state: 'na', reason: 'Sin datos de suscripciones' }
    const subs = s.subscriptions
    if (!subs) return { state: 'na', reason: 'Esta app no tiene suscripciones' }
    return { state: 'ok', value: subs.active, unverified: Boolean(subs.unverified), label: subs.activeLabel }
  }

  // ---- modelo de la pantalla -------------------------------------------------

  const rows = computed(() =>
    registry.items.map((p) => {
      const s = stats[p.id]
      const status = loading.value || !s ? 'loading' : !s.connected ? 'off' : s.noBackend ? 'nodb' : 'ok'
      return {
        id: p.id,
        name: p.name,
        color: p.color,
        description: p.description,
        to: `/project/${p.id}`,
        status,
        error: s?.error || '',
        users: dbCell(s, s?.totalUsers),
        new7: dbCell(s, s?.newUsers7d),
        new30: dbCell(s, s?.newUsers30d),
        active: { ...dbCell(s, s?.activeUsers), label: s?.activeLabel },
        subs: p.capabilities?.subscriptions ? subsCell(s) : { state: 'na', reason: 'No tiene suscripciones' },
        apple: appleCell(p),
        google: googleCell(p),
        installs: googleInstallsCell(p),
      }
    })
  )

  const live = computed(() => registry.items.map((p) => stats[p.id]).filter((s) => s?.connected && !s.noBackend))

  const sum = (key) => live.value.reduce((acc, s) => acc + (s[key] || 0), 0)

  const offNames = computed(() => rows.value.filter((r) => r.status === 'off').map((r) => r.name))
  const unverified = computed(() =>
    rows.value.filter((r) => r.subs.state === 'ok' && r.subs.unverified && r.subs.value).map((r) => ({ name: r.name, value: r.subs.value }))
  )

  const kpis = computed(() => ({
    users: summary.totalUsers,
    usersSub: `${live.value.length} ${live.value.length === 1 ? 'base de datos de app' : 'bases de datos de apps'}`,
    new7: sum('newUsers7d'),
    new30: sum('newUsers30d'),
    connected: `${summary.connectedCount} de ${summary.totalProjects}`,
    connectedSub: offNames.value.length ? `Sin conexión: ${offNames.value.join(', ')}` : 'Todas responden',
    subs: summary.activeSubscriptions,
    subsSub: unverified.value.length
      ? `${unverified.value.map((u) => `${u.name} declara ${u.value}`).join(', ')} sin verificar: no suman`
      : 'Verificadas con la tienda o con pagos',
  }))

  // Una frase con lo que más necesita atención.
  const finding = computed(() => {
    if (loading.value) return ''
    const parts = []
    if (offNames.value.length) parts.push(`${offNames.value.length === 1 ? 'Una app sin conexión' : `${offNames.value.length} apps sin conexión`}: ${offNames.value.join(', ')}.`)
    else parts.push('Todas las apps responden.')
    parts.push(`${summary.totalUsers.toLocaleString('es')} usuarios en total, ${sum('newUsers7d').toLocaleString('es')} nuevos esta semana.`)
    return parts.join(' ')
  })

  // Altas por día de todas las apps con base de datos propia.
  const chartSeries = computed(() => {
    const byDay = new Map()
    for (const s of live.value) for (const point of s.chartSeries || []) byDay.set(point.day, (byDay.get(point.day) || 0) + point.count)
    return [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([day, count]) => ({ day, count }))
  })

  const ranking = computed(() =>
    rows.value
      .filter((r) => r.new30.state === 'ok')
      .map((r) => ({ key: r.id, label: r.name, value: r.new30.value, display: r.new30.value.toLocaleString('es') }))
      .sort((a, b) => b.value - a.value)
  )

  const appleMonth = computed(() => monthLabel(rows.value.find((r) => r.apple.state === 'ok')?.apple.month))
  const googleMonth = computed(() => monthLabel(rows.value.find((r) => r.google.state === 'ok')?.google.month))

  return { rows, kpis, finding, chartSeries, ranking, appleMonth, googleMonth, loading, updatedAt, load }
}
