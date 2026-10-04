# Arquitectura de Cuadro de Mando

Documento técnico de referencia: stack, estructura de carpetas, y qué hace
cada módulo del backend y cada componente/store/página del frontend. El
`README.md` cubre instalación y uso; este documento cubre "cómo está hecho".

## 1. Resumen de la arquitectura

```
┌─────────────────────┐        HTTP (fetch, cookie de sesión)       ┌──────────────────────┐
│   client/  (Vue 3)   │ ───────────────────────────────────────────▶│   src/  (Express)     │
│   SPA servida como   │◀─────────────────────────────────────────── │   API JSON + sesión   │
│   archivos estáticos │              JSON                            │                       │
└─────────────────────┘                                              └──────────┬────────────┘
                                                                                  │
                                                                    lee/escribe   │
                                                                                  ▼
                                                        MongoDB / PostgreSQL de cada proyecto
                                                        (Habanera, CurbRadar, FixRadar, DealSnap,
                                                         Kambalache, Invoice Snap) + Firebase Auth
                                                         + reportes de Google Play / App Store
```

- **Backend** (`src/`): Express. Expone una API JSON bajo `/api/*` y las
  rutas de sesión (`/api/auth/*`). No genera HTML — eso lo hace el SPA.
- **Frontend** (`client/`): Vue 3 + Vite. Aplicación de una sola página
  (SPA) con enrutado propio (Vue Router), estado compartido (Pinia) y una
  librería de componentes reutilizables.
- **Comunicación**: fetch con `credentials: 'include'`. En desarrollo, Vite
  hace de proxy de `/api` hacia Express (mismo origen efectivo, sin CORS).
  En producción, Express sirve el build de Vue y la API desde el mismo
  puerto — son literalmente el mismo origen.
- **Autenticación**: sesión de servidor (`express-session`, cookie
  `httpOnly`). El SPA no guarda ningún token; en cada arranque pregunta
  `GET /api/auth/me` para saber si la cookie todavía es válida.

## 2. Stack tecnológico

| Capa | Tecnología | Por qué |
|---|---|---|
| Servidor HTTP / API | Express 4 | Ya estaba, simple, suficiente para una API JSON pequeña |
| Sesión | `express-session` (memoria) | Un solo usuario admin, sin necesidad de un store externo (Redis, etc.) |
| MongoDB | driver nativo `mongodb` (sin Mongoose) | Cada proyecto tiene su propio esquema Mongoose; conectarse con el driver nativo evita duplicar/pisar esos modelos y permite consultas genéricas por nombre de campo |
| PostgreSQL | `pg` (SQL crudo) | Solo lo usa Invoice Snap; no vale la pena traer Prisma solo para leer |
| Firebase Auth | `firebase-admin` (API modular v13+) | Generar links de "restablecer contraseña" sin tocar el backend de cada app |
| Hash de contraseñas | `bcryptjs` | Mismo algoritmo que ya usan Habanera/DealSnap/Kambalache/FixRadar — el hash generado aquí es compatible con su login sin cambiar nada allá |
| Email saliente | `nodemailer` | Opcional; si no hay SMTP configurado, el link/contraseña se muestra en pantalla en vez de enviarse |
| Métricas Google Play | `@google-cloud/storage` + `csv-parse` | Lee los reportes CSV que Play Console exporta a un bucket (no hay API REST simple de instalaciones) |
| Métricas App Store | `jsonwebtoken` (JWT ES256) + `fetch` | Sales Reports API de App Store Connect |
| **Frontend** | **Vue 3** (`<script setup>`) | Composition API, componentes pequeños y tipados por props |
| Build tool | **Vite** | Dev server con HMR instantáneo, build de producción optimizado |
| Enrutado | **Vue Router 4** | Rutas por proyecto (`/project/:id`), guard de autenticación |
| Estado global | **Pinia** | Store de sesión (`auth`) y de catálogo de proyectos (`projects`), evita pedir lo mismo dos veces |
| Gráficos | **Chart.js** (`chart.js/auto`) | Igual que antes, ahora envuelto en un componente Vue reutilizable |
| Estilos | CSS plano con variables (`:root { --bg, --card, ... }`) | Mismo tema oscuro de siempre, portado tal cual — sin Tailwind/UI kit para no añadir una dependencia grande a un dashboard interno pequeño |

## 3. Estructura de carpetas

```
cuadro_mando/
├── package.json              # scripts raíz (start, dev:api, dev:client, build)
├── .env / .env.example
├── secrets/                  # credenciales de Firebase (gitignored)
│
├── src/                       # ---------- BACKEND (Express) ----------
│   ├── server.js               # entry point: carga .env, arranca app.js
│   ├── app.js                   # configura Express: sesión, rutas, sirve client/dist en prod
│   ├── config/
│   │   └── projects.js           # registro central: un objeto por proyecto (ver §4.1)
│   ├── connectors/
│   │   ├── index.js               # despacha por project.type, nunca deja que un error tumbe la API
│   │   ├── mongoConnector.js       # stats + listUsers + setUserPasswordHash (genérico, Mongo)
│   │   ├── invoiceSnapConnector.js  # stats de Invoice Snap (Postgres, con suscripciones/ingresos)
│   │   ├── firebaseAdmin.js         # genera el link de reset de contraseña de Firebase Auth
│   │   └── stores/
│   │       ├── googlePlayReports.js  # instalaciones desde reportes CSV en Cloud Storage
│   │       └── appStoreSales.js       # ventas/unidades desde App Store Connect Sales Reports API
│   ├── services/
│   │   ├── mailer.js               # SMTP opcional (nodemailer)
│   │   └── passwordGenerator.js     # contraseña temporal random + hash bcrypt
│   ├── middleware/
│   │   └── auth.js                # requireLogin: 401 JSON si no hay sesión
│   └── routes/
│       ├── auth.routes.js          # /api/auth/me, /login, /logout
│       └── dashboard.routes.js      # todo lo demás bajo /api (ver §5, contrato de la API)
│
└── client/                    # ---------- FRONTEND (Vue 3 + Vite) ----------
    ├── index.html
    ├── vite.config.js           # proxy de /api -> :4000 en dev
    ├── dist/                     # build de producción (generado, gitignored)
    └── src/
        ├── main.js                 # createApp + Pinia + Router + estilos globales
        ├── App.vue                  # shell raíz: espera a checkSession() antes de pintar
        ├── style.css                 # tema oscuro (variables CSS, clases compartidas)
        ├── router/
        │   └── index.js               # rutas + guard de autenticación (ver §6.1)
        ├── stores/                   # Pinia (ver §6.2)
        │   ├── auth.js
        │   └── projects.js
        ├── api/                      # capa HTTP (ver §6.3)
        │   ├── http.js
        │   ├── auth.js
        │   └── projects.js
        ├── composables/
        │   └── useConfirm.js          # confirmación antes de acciones sensibles
        ├── components/
        │   ├── base/                  # ---- LIBRERÍA DE COMPONENTES REUTILIZABLES (ver §7) ----
        │   │   ├── BaseButton.vue
        │   │   ├── BaseInput.vue
        │   │   ├── BaseSelect.vue
        │   │   ├── BaseCard.vue
        │   │   ├── BaseTable.vue
        │   │   ├── Pagination.vue
        │   │   ├── StatCard.vue
        │   │   ├── StatusBadge.vue
        │   │   ├── LiveDot.vue
        │   │   ├── AlertBanner.vue
        │   │   ├── BreakdownList.vue
        │   │   └── LineChart.vue
        │   ├── layout/                # AppLayout, Sidebar, Topbar (ver §8)
        │   │   ├── AppLayout.vue
        │   │   ├── Sidebar.vue
        │   │   └── Topbar.vue
        │   └── ProjectCard.vue        # componente compuesto (usa StatusBadge + LiveDot)
        └── pages/                     # una por ruta (ver §9)
            ├── LoginPage.vue
            ├── OverviewPage.vue
            ├── ProjectDetailPage.vue
            ├── UsersPage.vue
            └── NotFoundPage.vue
```

## 4. Backend en detalle

### 4.1 `src/config/projects.js` — el registro central

Es la única fuente de verdad sobre "qué proyectos existen y cómo tratarlos".
Cada entrada es un objeto plano (no hay clases) con esta forma:

```js
{
  id, name, description, color,   // identidad + estética (el color pinta el borde de la tarjeta)
  type: 'mongo' | 'postgres',
  envVar: 'HABANERA_MONGO_URI',    // que variable de .env tiene la cadena de conexión
  fields: { ... },                 // solo Mongo: nombres de campo (createdAt, isOnline, etc.)
  capabilities: { activeUsers, subscriptions, platforms }, // que puede mostrar honestamente
  auth: { firebase?, bcrypt? },    // opcional: habilita reset de contraseña
  store: { androidPackageName, iosBundleId, appleAppId },  // opcional: métricas de tienda
}
```

Ningún conector tiene hardcodeado el nombre de un proyecto: todos reciben
este objeto y actúan según sus campos. Agregar un proyecto nuevo = agregar
un objeto aquí, no tocar código de conectores ni del frontend.

### 4.2 Conectores (`src/connectors/`)

- **`mongoConnector.js`**: el más usado. Abre (y cachea) una conexión
  `MongoClient` por URI. Expone:
  - `getMongoProjectStats(project)` → totales, altas por día, activos,
    "en línea ahora" — todo opcional según `project.fields`.
  - `listUsers(project, {search, page, pageSize})` → para la pestaña
    Usuarios, nunca proyecta campos de contraseña.
  - `findUserById(project, id)`, `setUserPasswordHash(project, id, field, hash)`
    → usados por el flujo de reset de contraseña "bcrypt".
- **`invoiceSnapConnector.js`**: siete queries SQL en paralelo (usuarios,
  altas, serie de 30 días, suscripciones activas por estado/plan,
  plataformas, ingresos). Es el único proyecto con datos reales de
  suscripciones/ingresos, así que no intenta ser genérico.
- **`firebaseAdmin.js`**: inicializa una app de `firebase-admin` con nombre
  por proyecto (dos proyectos Firebase distintos = dos apps), usando o bien
  un archivo de cuenta de servicio (`serviceAccountPathEnv`) o credenciales
  sueltas (`firebaseEnv`). Expone `generatePasswordResetLink(project, email)`.
- **`stores/googlePlayReports.js`** y **`stores/appStoreSales.js`**: cada
  uno resuelve `{ supported: false, reason }` si faltan credenciales, sin
  lanzar excepción — así una tarjeta sin configurar nunca rompe la página.
- **`index.js`**: `getProjectStats(project)` elige el conector según
  `project.type` y envuelve cualquier excepción en
  `{ connected: false, error }`. Es el único punto por el que pasan todas
  las lecturas de stats.

### 4.3 `src/routes/dashboard.routes.js` — la API

Contiene también dos funciones de dominio que no ameritan su propio
archivo: `resetMethodFor(project, user)` (decide si a un usuario le aplica
reset por Firebase, por bcrypt, o ninguno — soporta proyectos mixtos como
FixRadar) y `toSafeProject(project)` (filtra la config antes de mandarla al
navegador: nunca se exponen nombres de variables de entorno, rutas a
credenciales, etc.).

### 4.4 `src/app.js` — cableado de Express

Orden de middleware (importa el orden):
1. `express.json()` / `express.urlencoded()`
2. `express-session`
3. `authRoutes` (login/logout, sin exigir sesión)
4. `requireLogin` + `dashboardRoutes` montados en `/api`
5. Si existe `client/dist/index.html` → sirve el build de Vue + catch-all
   `app.get('*', ...)` para que el enrutado de Vue Router funcione al
   recargar la página en cualquier ruta (ej. `/project/habanera`).
6. Si no existe el build (desarrollo) → responde un texto plano en `/`
   recordando correr `client` aparte.

### 4.5 `src/server.js` — entry point y `DB_MODE`

Antes de requerir `app.js`, carga el entorno en dos pasadas con `dotenv`:

```js
dotenv.config();                                    // .env (base: hoy, produccion)
if (process.env.DB_MODE === 'local') {
  dotenv.config({ path: '.env.local', override: true }); // encima, solo las claves que traiga
}
```

Esto permite tener un solo `.env` "de verdad" (con las URIs de producción)
y un `.env.local` chiquito que solo lista las excepciones que querés
apuntar a tu máquina — sin duplicar el archivo completo ni tener que
recordar qué valor iba en cada lado. Ver README → "Alternar entre local y
remoto".

## 5. Contrato de la API

Todas las rutas salvo `login`/`me` exigen sesión (401 JSON si no la hay).

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/auth/me` | `{ authenticated, username }` — para saber si la cookie sigue viva |
| POST | `/api/auth/login` | `{ username, password }` → `{ ok, username }` o 401 |
| POST | `/api/auth/logout` | Destruye la sesión |
| GET | `/api/projects` | Lista de proyectos "seguros" (sin secretos) — alimenta el sidebar |
| GET | `/api/overview` | `{ stats: {porId}, summary }` — el resumen general |
| GET | `/api/projects/:id/stats` | Stats de un proyecto (usuarios, gráfico, suscripciones...) |
| GET | `/api/projects/:id/store-stats` | Instalaciones/ventas de Google Play / App Store (o `null` si no aplica) |
| GET | `/api/projects/:id/users?page=&q=` | Lista paginada de usuarios + `resetMethod` por usuario |
| POST | `/api/projects/:id/users/:userId/send-reset` | Genera (y opcionalmente envía) el link de Firebase |
| POST | `/api/projects/:id/users/:userId/set-temp-password` | Genera contraseña temporal + hash bcrypt |

## 6. Frontend — núcleo de la aplicación

### 6.1 Router (`client/src/router/index.js`)

Cinco rutas: `login` (pública), `overview`, `project/:id`, `project/:id/users`,
y un catch-all `not-found`. Un único `router.beforeEach` hace de guard:
llama `checkSession()` la primera vez que se necesita, y redirige a `login`
si la ruta no es pública y no hay sesión (o al revés, si ya hay sesión y se
intenta entrar a `login`).

### 6.2 Stores de Pinia (`client/src/stores/`)

- **`auth.js`**: `{ username, checked }`. `checked` evita el parpadeo de
  "se ve el login un instante" mientras se resuelve la primera llamada a
  `/api/auth/me`. Acciones: `checkSession`, `login`, `logout`.
- **`projects.js`**: `{ items, loaded }`. Se carga una sola vez
  (`load()` es idempotente) y la comparten el sidebar y todas las páginas
  vía `byId(id)`.

### 6.3 Capa de API (`client/src/api/`)

- **`http.js`**: wrapper sobre `fetch`. Siempre manda `credentials:
  'include'` (para que viaje la cookie de sesión), serializa/deserializa
  JSON, y normaliza errores en una clase `ApiError` con `.status` —así los
  componentes solo hacen `catch (err) { err.message }`.
- **`auth.js`** / **`projects.js`**: una función por endpoint de la tabla
  del §5. Ningún componente llama a `fetch` directo, siempre pasa por aquí.

## 7. Librería de componentes base (`client/src/components/base/`)

Esto es lo que pediste explícitamente: componentes genéricos, sin lógica de
negocio, que no saben qué es un "proyecto" ni una "suscripción" — solo
reciben datos por props y emiten eventos. Se reutilizan en todas las
páginas.

| Componente | Props principales | Uso |
|---|---|---|
| **BaseButton** | `type`, `size` (`normal`/`small`), `variant` (`solid`/`ghost`), `disabled` | Cualquier botón de la app (login, buscar, acciones de tabla, logout) |
| **BaseInput** | `modelValue`, `label`, `type`, `placeholder`, `required` | Campos de texto/contraseña con `v-model` (login, buscador de usuarios) |
| **BaseSelect** | `modelValue`, `label`, `options: [{value,label}]` | Select genérico con `v-model`, listo para futuros filtros |
| **BaseCard** | `title?` | Contenedor "panel" (fondo/borde estándar) — usado en cada panel de detalle |
| **BaseTable** | `columns: [{key,label,formatter?}]`, `rows`, `rowKey`, `emptyMessage` | Tabla genérica. Columnas con formato custom vía slot `#cell-<key>`; acciones vía slot `#actions` |
| **Pagination** | `page`, `totalPages` | Anterior/Siguiente genérico, emite `update:page` |
| **StatCard** | `label`, `value`, `fallback`, `live` | Tarjeta KPI (usuarios totales, activos, en línea...) |
| **StatusBadge** | `ok`, `okLabel`, `offLabel` | Badge binario (Conectado/Desconectado, o cualquier otro estado sí/no) |
| **LiveDot** | — | El puntito verde pulsante de "dato en vivo" |
| **AlertBanner** | `type` (`ok`/`error`) | Banner de aviso, contenido libre por slot |
| **BreakdownList** | `data: {clave: numero}` | Lista "etiqueta → número" (suscripciones por plan, plataformas...) |
| **LineChart** | `series: [{day,count}]`, `color`, `label` | Envuelve Chart.js; se reconstruye solo si cambian los datos |

**Cómo se logra la reutilización real** (no solo "están en la misma
carpeta"): cada uno recibe únicamente tipos primitivos/objetos planos por
props y emite eventos `update:*` — ninguno importa un store de Pinia ni sabe
de la API. `BaseTable`, por ejemplo, no tiene ni idea de que existen
"usuarios": solo sabe pintar `columns` + `rows` y delegar el contenido de
cada celda a quien lo use.

## 8. Componentes de layout (`client/src/components/layout/`)

- **`AppLayout.vue`**: envoltorio de toda página autenticada (`.layout` con
  Sidebar + Topbar + `<slot />`). Evita repetir esa estructura en las 4
  páginas.
- **`Sidebar.vue`**: lee `useProjectsStore()` para pintar la lista de
  proyectos (con su color), resalta el activo comparando con
  `route.params.id`, y tiene el botón de logout.
- **`Topbar.vue`**: título + subtítulo (por props) + nombre/avatar del
  usuario (leído de `useAuthStore()`, no hace falta pasarlo).

`ProjectCard.vue` (en `components/`, no en `base/`, porque sí conoce el
dominio) es el único componente "compuesto": arma la tarjeta del resumen
general combinando `StatusBadge` y `LiveDot`.

## 9. Páginas (`client/src/pages/`)

Cada página es responsable de: pedir sus propios datos (en `onMounted` /
`watch`), y componer los `base/*` para pintarlos. No hay lógica de
fetching duplicada entre páginas — todas pasan por `api/projects.js`.

- **`LoginPage.vue`**: formulario con `BaseInput` + `BaseButton`, llama
  `authStore.login()`, redirige a `route.query.redirect` o `/`.
- **`OverviewPage.vue`**: `StatCard` ×3 (KPIs) + grid de `ProjectCard`.
- **`ProjectDetailPage.vue`**: la más grande. KPIs (`StatCard`), gráfico
  (`LineChart`), y hasta 6 `BaseCard` (suscripciones, plataformas,
  ingresos, Google Play, App Store) que se muestran u ocultan según
  `project.capabilities` / `project.hasStoreMetrics`.
- **`UsersPage.vue`**: buscador (`BaseInput` + `BaseButton`), `BaseTable`
  con slot de acciones (botón distinto según `resetMethod` de cada fila),
  `Pagination`, y `AlertBanner` con el resultado de la última acción
  (correo enviado / link generado / contraseña temporal / error).
- **`NotFoundPage.vue`**: página 404 simple, reutiliza las clases de
  `.login-card` para no crear estilos nuevos.

## 10. Estilos

Un solo archivo global, `client/src/style.css` — el mismo tema oscuro que
ya existía (variables CSS en `:root`: `--bg`, `--card`, `--primary`,
`--border`, etc.). Los componentes usan esas clases compartidas
(`.kpi-card`, `.data-table`, `.status-badge`...) en vez de reinventar
estilos por componente; cuando un componente necesita algo muy propio (ej.
`BaseButton`'s variante `ghost`), usa `<style scoped>` para no filtrar esas
reglas al resto de la app.

## 11. Cómo extender

- **Nuevo proyecto**: ver el paso a paso al final del `README.md` — el
  frontend no necesita ningún cambio, se alimenta solo de
  `GET /api/projects`.
- **Nuevo componente base**: agregarlo a `components/base/`, sin imports de
  stores/API, documentando sus props igual que los de la tabla del §7.
- **Nueva página**: agregar el archivo en `pages/`, la entrada en
  `router/index.js`, y (si hace falta) el endpoint correspondiente en
  `api/projects.js` + `src/routes/dashboard.routes.js`.
