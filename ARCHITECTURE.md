# Arquitectura de Cuadro de Mando

Documento técnico de referencia: stack, estructura, contratos de datos, patrones de
diseño y catálogo de componentes. El `README.md` cubre instalación y uso; el
`CLAUDE.md` resume las reglas de trabajo; este documento cubre "cómo está hecho y por qué".

## 1. Resumen

```
┌──────────────────────┐   HTTP (fetch, cookie de sesión)   ┌───────────────────────┐
│  client/ (Vue 3 SPA)  │ ─────────────────────────────────▶│  src/ (Express)        │
│  estáticos en prod    │◀───────────────────────────────── │  API JSON + sesión     │
└──────────────────────┘              JSON                  └───────────┬───────────┘
                                                                         │ lee (y, en reset de contraseña, escribe)
        MongoDB (Habanera, CurbRadar, FixRadar, DealSnap, Kambalache) · PostgreSQL (Invoice Snap)
        Firebase Auth + Firestore (CardAlert) · App Store Connect API · informes de Google Play
```

- **Backend** (`src/`): Express. API JSON bajo `/api/*`, sesión por cookie, descarga pública de APK en `/downloads/:id.apk`. No genera HTML.
- **Frontend** (`client/`): Vue 3 + Vite, SPA con Vue Router y Pinia. En producción Express sirve `client/dist` y la API desde el mismo puerto (mismo origen, sin CORS). En desarrollo Vite hace proxy de `/api`.
- **Auth**: sesión de servidor (`express-session`, `httpOnly`). El SPA no guarda tokens; al arrancar pregunta `GET /api/auth/me`.
- **Idea central**: el panel muestra datos reales de cada app **agrupados por su ORIGEN** (Apple, Google, pagos propios) y cada cifra dice de dónde sale (ver §7).

## 2. Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| API | Express 4 | Simple y suficiente |
| Sesión | `express-session` (memoria) | Un solo admin; sin Redis |
| MongoDB | driver nativo `mongodb` (sin Mongoose) | Cada app tiene su esquema; el driver nativo permite consultas genéricas por nombre de campo sin duplicar modelos |
| PostgreSQL | `pg` (SQL crudo) | Solo Invoice Snap (su esquema es Prisma, aquí solo se lee) |
| Firebase | `firebase-admin` v14 (API modular) + `@google-cloud/firestore` | Auth (links de reset, lista de usuarios) y Firestore (plan de CardAlert) |
| Contraseñas | `bcryptjs` | Compatible con el login de las apps (bcrypt.compare valida cualquier hash válido) |
| Email | `nodemailer` (opcional) | Sin SMTP el link/contraseña se muestra en pantalla |
| Google Play | `@google-cloud/storage` + `csv-parse` | Informes CSV que Play Console exporta a un bucket |
| App Store | `jsonwebtoken` (JWT ES256) + `fetch` | Sales Reports API y gestión de versiones de App Store Connect |
| Subida de APK | `multer` (memoria, 300 MB) | Distribución directa fuera de Google Play |
| Frontend | Vue 3 `<script setup>`, Vite, Vue Router 4, Pinia, Chart.js | Composición de componentes pequeños y reutilizables |
| Estilos | CSS plano con variables (`:root`) + `<style scoped>` | Tema oscuro, sin UI kit |

## 3. Estructura de carpetas

```
cuadro_mando/
├── CLAUDE.md / ARCHITECTURE.md / README.md
├── .env / .env.local (gitignored)   .env.example   secrets/ (gitignored)   uploads/ (gitignored)
│
├── src/                              # ---------- BACKEND ----------
│   ├── server.js                      # entry: carga .env (+ .env.local si DB_MODE=local)
│   ├── app.js                         # Express: sesión, /downloads/:id.apk (público), /api, sirve client/dist
│   ├── config/projects.js             # REGISTRO CENTRAL de proyectos (ver §4.1)
│   ├── connectors/
│   │   ├── index.js                    # despacha por project.type; un error nunca tumba la API
│   │   ├── mongoConnector.js           # stats, listUsers, getUserActivity, setUserPasswordHash
│   │   ├── invoiceSnapConnector.js     # Postgres: suscripciones y compras atribuidas por origen
│   │   ├── firestoreConnector.js       # Firebase Auth + Firestore (CardAlert)
│   │   ├── firebaseAdmin.js            # apps de firebase-admin por proyecto, links de reset
│   │   └── stores/
│   │       ├── appStoreSales.js        # ventas/proceeds + estado de la app en App Store Connect
│   │       └── googlePlayReports.js    # instalaciones desde el bucket de informes de Play
│   ├── services/ (mailer, passwordGenerator, apkStorage)
│   ├── middleware/auth.js              # requireLogin
│   └── routes/ (auth.routes.js, dashboard.routes.js)
│
└── client/src/                       # ---------- FRONTEND ----------
    ├── main.js · App.vue · style.css
    ├── router/index.js                # rutas + guard + scrollBehavior (#anclas)
    ├── stores/ (auth.js, projects.js)
    ├── api/ (http.js, auth.js, projects.js)
    ├── composables/
    │   ├── useConfirm.js
    │   ├── useDebounce.js             # useDebounceFn
    │   └── useProjectSections.js      # LÓGICA de "qué cifra va en qué tarjeta y de dónde sale"
    ├── components/
    │   ├── base/                      # genéricos, sin lógica de negocio (ver §8.1)
    │   ├── layout/ (AppLayout, Sidebar, Topbar)
    │   ├── ProjectCard.vue            # tarjeta del resumen general
    │   ├── StoreCard.vue              # tarjeta de UN origen (Apple / Google / propios)
    │   ├── ProjectUsers.vue           # listado de usuarios de un proyecto (buscador, segmentos, acciones)
    │   └── RequestStatusBadge.vue     # estados de una incidencia de FixRadar
    └── pages/ (LoginPage, OverviewPage, ProjectDetailPage, UserDetailPage, NotFoundPage)
```

## 4. Backend

### 4.1 `src/config/projects.js` — registro central

Única fuente de verdad de "qué proyectos existen y cómo tratarlos". Ningún conector ni componente
tiene el nombre de un proyecto escrito: todos reciben el objeto y obedecen sus campos.
**Agregar un proyecto = agregar un objeto aquí** (+ su variable en `.env`); el frontend se alimenta de `GET /api/projects`.

```js
{
  id, name, description, color,
  type: 'mongo' | 'postgres' | 'firestore' | 'none',   // 'none' = app sin backend propio
  hidden: true,                  // sigue declarado pero se filtra al exportar (no sale en ningún sitio)
  envVar: 'X_MONGO_URI',         // mongo/postgres: variable con la cadena de conexión
  fields: { ... },               // mongo: collection, createdAtField, lastActiveField, onlineField, idIsString...
                                 // firestore: usersCollection, planField, complimentaryEmailsEnv
  capabilities: { activeUsers, subscriptions, platforms },
  segments: { field, options: [{value,label}], unclassifiedLabel },  // tarjetas clicables que filtran usuarios
  userColumns: [{ key, label }], // columnas extra en la tabla de usuarios
  userActivity: {...},           // mongo: habilita la ficha de usuario (incidencias/trabajos), ver §4.2
  auth: { firebase?, bcrypt? },  // reset de contraseña (por usuario, con `condition` opcional)
  firebase: { serviceAccountPathEnv },   // firestore: credenciales para LEER datos
  store: { androidPackageName, iosBundleId, appleAppId },   // métricas y estado de tienda
  apkDistribution: { enabled: true },    // subir APK y servir /downloads/<id>.apk
}
```

Tipos: `mongo` (Habanera, CurbRadar, FixRadar, DealSnap*, Kambalache*), `postgres` (Invoice Snap),
`firestore` (CardAlert), `none` (SkillFix, ToFast*). *Ocultos hoy: DealSnap, Kambalache, ToFast.

### 4.2 Conectores

Contrato común: `getProjectStats(project)` → ver §5.2. Un conector nunca lanza hacia la API: `connectors/index.js`
convierte cualquier excepción en `{ connected:false, error }`.

- **`mongoConnector.js`**: una conexión cacheada por URI. `getMongoProjectStats`, `listUsers` (proyección que
  excluye contraseñas/tokens; si hay `userActivity` añade `postedCount`/`jobsCount` por usuario con DOS consultas
  agrupadas sobre los ids de la página), `getUserActivity` (ficha: incidencias publicadas y, si es técnico, trabajos
  completados; lista blanca de campos del usuario), `findUserById`, `setUserPasswordHash`.
- **`invoiceSnapConnector.js`**: SQL en paralelo. Atribuye por `provider` (`app_store`→apple, `google_play`→google,
  `stripe`→web, `manual`→other): `subscriptions.bySource`, `revenue[].source`. El precio de las suscripciones NO está
  en la BD: el "generado por plan" sale del payload crudo de Stripe en `webhook_events`, y siempre marca `isTestMode`.
  Dinero en `numeric` hasta el último paso (`Number()` una sola vez).
- **`firestoreConnector.js`**: usuarios desde Firebase Auth, plan desde `users/{uid}.planType`. NUNCA lee las
  subcolecciones de tarjetas/pagos. El plan lo escribe la propia app: se marca `unverified` y no se suma al total global.
- **`firebaseAdmin.js`**: una app de firebase-admin por proyecto; `getFirebaseApp(project)` acepta `project.firebase`
  o `project.auth.firebase`.
- **`stores/appStoreSales.js`**: `getAppSalesSummary(project, month?)` (informe MENSUAL; sin `month` cae al mes anterior si
  el actual está vacío), `getAppSalesHistory` (6 meses) y `getAppStoreStatus` (estado de la versión: si hay una publicada se
  informa esa y, aparte, la más nueva). El informe es del VENDOR (todas las apps): se cachea 10 min y una descarga por mes sirve
  a todos los proyectos.
- **`stores/googlePlayReports.js`**: instalaciones desde `installs/installs_<pkg>_<YYYYMM>_overview.csv`. Un 403 de
  Cloud Storage se traduce a un mensaje claro (no se muestran rutas internas ni correos).

### 4.3 `routes/dashboard.routes.js`

Además de las rutas (§5.1) contiene `toSafeProject` (qué ve el navegador de cada proyecto; nunca variables de entorno,
rutas ni identificadores de tienda: solo `store.hasAppleListing/hasAndroidListing`), `resetMethodFor` (Firebase, bcrypt o
ninguno, por usuario) y `getStoreStats` (Apple + Google + estado de Apple en `Promise.allSettled`: una tienda caída no
tumba a la otra).

### 4.4 `app.js` y `server.js`

Orden en `app.js`: json/urlencoded → sesión → `/downloads/:id.apk` (público) → `authRoutes` → `requireLogin` + `/api` →
estáticos de `client/dist` + catch-all para Vue Router. `server.js` carga `.env` y, si `DB_MODE=local`, encima `.env.local`
con `override:true` (solo las claves que traiga). Todas las rutas a archivos se anclan a `__dirname`, nunca a `process.cwd()`.

## 5. Contratos

### 5.1 API (todas salvo login/me y `/downloads` exigen sesión; 401 JSON si no)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/auth/me` · POST `/api/auth/login` · POST `/api/auth/logout` | Sesión |
| GET | `/api/projects` | Proyectos "seguros" (sidebar y decisiones de UI) |
| GET | `/api/overview` | `{ stats:{porId}, summary }` |
| GET | `/api/projects/:id/stats` | Stats del proyecto (§5.2) |
| GET | `/api/projects/:id/store-stats?month=YYYY-MM` | Apple + Google (§5.3) o `null`; `month` opcional (formato exacto; sin él, mes en curso con respaldo al anterior) |
| GET | `/api/projects/:id/users?page=&q=&segment=` | Lista paginada (mongo y firestore) + `resetMethod` |
| GET | `/api/projects/:id/users/:userId/activity` | Ficha: incidencias y trabajos (solo con `userActivity`) |
| POST | `/api/projects/:id/users/:userId/send-reset` · `/set-temp-password` | Reset de contraseña |
| GET/POST | `/api/projects/:id/apk` | Info / subida del APK (solo con `apkDistribution`) |
| GET | `/downloads/:id.apk` | Descarga pública del último APK subido (URL estable) |

`toSafeProject`: `id, name, description, color, type, capabilities, hasUsersTab, userColumns, hasPasswordReset,
hasStoreMetrics, store:{hasAppleListing,hasAndroidListing}, hasApkDistribution, hasUserActivity, segments`.

### 5.2 Forma de `stats` (normalizada; los conectores solo rellenan lo que saben)

```
{ connected, error?, noBackend?,
  totalUsers, newUsers7d, newUsers30d, activeUsers, activeLabel, onlineUsers, onlineLabel,
  chartSeries:[{day,count}], segments?:{items:[{value,label,count}]},
  subscriptions?: { active, activeLabel?, byStatus, byPlan,
                    bySource?: { apple|google|web|other: { active, byPlan } },   // solo si el conector sabe quién cobró
                    revenueByPlan:[{plan,currency,total,isTestMode}],
                    sourceLabel?, unverified?, notes? },
  revenue?: [{ currency, total, purchases, source, isTestMode }] }
```

### 5.3 Forma de `store-stats`

```
{ apple:  { supported, month, units, proceeds, history?: [{month,units,proceeds,pending?}], status?: {state,label,tone,version,next?} | null | undefined, reason?, note? },
  google: { supported, month, totalInstalls, totalUninstalls, reason?, note? } }
```
`status: null` = la app no tiene ficha en App Store Connect; `undefined` = no se pudo consultar.
`history` = últimos 6 meses (antiguo→reciente); `units/proceeds: null` = sin informe todavía (el mes en curso no existe hasta que Apple lo cierra: no es un cero). Un mes explícito devuelve `units:null` + `note` si es el mes en curso.

## 6. Frontend: núcleo

- **Router**: `/login` (pública), `/`, `/project/:id`, `/project/:id/users/:userId` y catch-all. `/project/:id/users` **redirige**
  a `/project/:id#usuarios` conservando `?segment=` (el listado vive dentro de la página del proyecto). `scrollBehavior`
  baja suave a los `#hash`. Un único `beforeEach` comprueba la sesión.
- **Stores**: `auth` (`username`, `checked`) y `projects` (`items`, `loaded`; `load()` idempotente, `byId`).
- **API**: `http.js` (fetch con cookie, errores normalizados en `ApiError`, `postFormData`) y una función por endpoint en
  `api/projects.js`. Ningún componente llama a `fetch` directo.

## 7. Modelo de datos por ORIGEN (la regla de diseño más importante)

Toda cifra pertenece a un origen y se muestra con su etiqueta (`SourceTag`): **Apple**, **Google**, **Stripe/web**, **Firebase** o
**base de datos de la app**. La página de proyecto muestra una `StoreCard` por origen, siempre en el mismo orden y con las
mismas filas: *App Store*, *Google Play* y, solo si hay pagos que no pasan por una tienda, *Web y otros pagos* (Invoice Snap)
o *Datos de la app* (CardAlert).

`composables/useProjectSections.js` es el ÚNICO sitio donde se decide qué cifra va en qué tarjeta:
`buildSections(project, stats, storeStats)` → `[{ id, kind, title, status, statusFallback, rows, footer }]`. Cada fila es
`{ id, label, state, value, hint, reason, source:{kind,label}, tag, details, note }` con `state`:
`loading` (bloque de carga) · `ok` · `unavailable` (no existe, `reason` dice por qué) · `pending` (existe pero falta acceso).
Las páginas y `StoreCard` solo pintan lo que reciben. **Para añadir un origen nuevo se añade una función de sección ahí.**

Reglas de honestidad (no negociables): nunca inventar un dato; si no se puede atribuir/leer, la fila lo dice y explica por qué;
el dinero de prueba (Stripe test) lleva la marca `PRUEBA`; lo que la propia app declara sin verificar se etiqueta como tal y
no entra en totales globales.

## 8. Componentes

### 8.1 `components/base/` (genéricos: solo props/eventos, sin stores ni API)

| Componente | Para qué |
|---|---|
| `BaseButton`, `BaseInput`, `BaseSelect` | Formularios |
| `BaseCard` | Panel (`title?`) |
| `BaseTable` | `columns`, `rows`, `rowKey`, `clickable` (emite `row-click`), `loading` + `skeletonRows`; slots `#cell-<key>` y `#actions` (el slot de acciones no dispara el clic de fila) |
| `Pagination` | `page`, `totalPages` → `update:page` |
| `StatCard` | KPI; `loading`, `to` (RouterLink), `live` |
| `StatusBadge` (binario) · `StatusChip` (`tone`: ok/pending/neutral/error) | Estados |
| `SourceTag` | Etiqueta de origen (`kind`: apple/google/web/firebase/db, `label?`) |
| `MetricRow` | Fila etiqueta → valor con `state`, `source`, `hint`, `tag`, `details`, `note`, `reason`, `series` (barras) |
| `Breadcrumbs` | `items:[{label,to?}]`; un item sin label pinta un bloque de carga |
| `SkeletonBlock`, `SkeletonLines` | Estados de carga |
| `MiniBars` | Barras pequeñas de una evolución corta (`items:[{label,value}]`, `value:null` = sin dato); la usa `MetricRow` vía `series` |
| `AlertBanner`, `BreakdownList`, `LiveDot`, `LineChart` (alto fijo `height`) | Utilidades |

### 8.2 Compuestos y layout

`StoreCard` (presentación pura de una sección), `ProjectUsers` (listado completo de usuarios, reutilizable para cualquier
proyecto con usuarios), `ProjectCard`, `RequestStatusBadge`; `AppLayout` (props `heading`, `subheading`, `crumbs`),
`Sidebar` (con esqueleto mientras carga el registro), `Topbar` (migas + título).

### 8.3 Páginas

- `OverviewPage`: KPIs globales + `ProjectCard` por proyecto.
- `ProjectDetailPage`: migas → KPIs de usuarios y segmentos (cada uno filtra la lista) → `StoreCard`s por origen → gráfico
  de altas y distribución de APK → `ProjectUsers` (`#usuarios`).
- `UserDetailPage`: ficha (solo proyectos con `userActivity`): perfil, incidencias publicadas y trabajos realizados.
- `LoginPage`, `NotFoundPage`.

## 9. Patrones de diseño aplicados

1. **Config-driven**: capacidades por proyecto en `projects.js`; el código es genérico.
2. **Conectores aislados + contrato normalizado**: cada fuente se traduce a la forma de §5.2/§5.3; la UI no sabe de dónde viene.
3. **Separación datos → presentación**: `useProjectSections` (lógica) → `StoreCard`/`MetricRow` (pintura).
4. **Base components sin dominio**: `base/` nunca importa stores ni API.
5. **Carga progresiva (skeleton + reveal)**: la estructura aparece al instante con bloques que brillan (`.skeleton`) y cada
   bloque "se enfoca" (`.reveal`) al llegar sus datos. Cada fuente se pide por separado con guarda `loadToken` contra
   respuestas obsoletas. Nunca se muestra un estado falso ("Desconectado", "No encontrado") mientras carga.
6. **Degradación honesta**: ante falta de datos/credenciales, `unavailable`/`pending` con motivo; nunca un error que tumbe la página.
7. **Privacidad por defecto**: proyecciones/listas blancas; no se leen subcolecciones financieras; no se exponen variables
   de entorno ni identificadores internos.
8. **Navegación**: migas en toda página, enlaces con `#ancla`, una sola página de proyecto con todo.

## 10. Estilos

`client/src/style.css`: variables en `:root` (`--bg --card --border --text --muted --primary --danger --ok`) y clases
compartidas (`.kpi-card`, `.panel`, `.data-table`, `.store-grid`, `.skeleton`, `.reveal`...). Lo muy propio de un componente va
en `<style scoped>`. `prefers-reduced-motion` desactiva las animaciones de carga.

## 11. Despliegue

Servidor Ubuntu con PM2 (proceso `cuadro-mando`), nginx como proxy inverso + Let's Encrypt, en
`https://dashboard.krbusinessventures.org`, código en `/var/www/cuadro_mando` (git, rama `main`). Flujo:

```
git pull origin main
cd client && npm run build && cd ..        # solo si cambió client/ (o package.json -> npm install antes)
pm2 restart cuadro-mando
```

Notas: `client/package-lock.json` está en `.gitignore` a propósito (binarios nativos distintos en macOS y Linux); si falla
Rollup/Vite con "Cannot find native binding": `rm -rf client/node_modules client/package-lock.json && npm install`.
Nunca se versionan `.env`, `.env.local`, `secrets/` ni `uploads/`. Las credenciales de acceso al servidor las da el dueño del
proyecto; no están en el repositorio.

## 12. Estado y pendientes

- **Hecho**: tarjetas por origen, estado de la app en Apple, atribución por origen en Invoice Snap, ficha de usuario de FixRadar,
  CardAlert vía Firebase, distribución de APK, estados de carga, migas, listado dentro del proyecto.
- **Hecho en fase 2**: selector de periodo (mes) para las métricas de tienda e historial de 6 meses de Apple (descargas e ingresos).
- **Pendiente (Apple)**: informe de SUSCRIPCIONES (`SUBSCRIPTION`/`SUBSCRIBER`). Hoy Apple responde "Invalid vendor number" para esos tipos aunque `SALES` funcione (probable falta de actividad real de suscripciones en la cuenta); no escribir el lector hasta poder inspeccionar un informe real.
- **Fase 3**: ingresos y suscripciones de Google desde los informes de ganancias del bucket. Bloqueado hoy por 403 de Cloud
  Storage (la cuenta de servicio `cuadro-mando-play` está invitada en Play Console; esperar propagación y luego bajar su rol
  de Admin a solo lectura). Antes de escribir el lector, inspeccionar los archivos reales del bucket.
- **Datos de Google Play** (estado de publicación de cada app): pendiente, requiere permiso de gestión de versiones.

## 13. Cómo extender

- **Proyecto nuevo**: objeto en `projects.js` + variable en `.env`. Si su origen de datos es nuevo, un conector que devuelva la forma §5.2.
- **Origen nuevo (tercera tienda, pasarela)**: función de sección en `useProjectSections.js`; la UI no cambia.
- **Componente base nuevo**: en `components/base/`, sin importar stores/API; documentar props aquí.
- **Página nueva**: archivo en `pages/`, ruta en `router/index.js`, función en `api/projects.js` y endpoint en `dashboard.routes.js`; usar `AppLayout` con `crumbs` y estados de carga.
