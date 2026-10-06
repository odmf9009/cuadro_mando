# Cuadro de Mando

Dashboard central que se conecta a las bases de datos de tus otros proyectos
(`mios/habanera`, `mios/fitApp`, `mios/cubradar`, `mios/fixRadar`,
`mios/dealsnap_backend`, `mios/kambalache_backend`, `mios/Invoice-Snap`) y
muestra en un solo panel: usuarios totales, usuarios activos (cuando el
proyecto lo registra), suscripciones y suscriptores por plan/estado, ingresos
y plataforma (cuando el proyecto lo registra).

No se conecta directo a los backends en ejecución: lee las mismas bases de
datos (MongoDB / PostgreSQL) que ya usa cada proyecto, en modo solo lectura
de consultas de agregación (excepto las dos acciones de reset de contraseña,
que sí escriben — ver más abajo).

Es una aplicación de dos partes: una **API en Express** (`src/`) y un
**SPA en Vue 3** (`client/`) que la consume. Para el detalle de cada módulo
y componente, ver [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Requisitos

- Node.js 18+
- Acceso de red a las bases de datos de cada proyecto (las mismas URIs que
  ya usa cada backend en su propio `.env`)

## Instalación

```bash
npm install        # instala el backend Y el frontend (postinstall corre "npm install --prefix client")
cp .env.example .env
```

Edita `.env` y completa las variables de conexión. Cada backend original ya
tiene la cadena de conexión en su propio `.env`; solo cópiala:

| Proyecto      | Variable en `cuadro_mando/.env` | Sácala de                                              |
|---------------|----------------------------------|---------------------------------------------------------|
| Habanera      | `HABANERA_MONGO_URI`             | `mios/habanera/backend/.env` → `MONGO_URI`               |
| FitApp        | `FITAPP_MONGO_URI`               | (ese backend aún no tiene `.env`; créalo cuando lo tenga) |
| CurbRadar     | `CUBRADAR_MONGO_URI`             | `mios/cubradar/curbradar_backend/.env` → `MONGODB_URI`    |
| FixRadar      | `FIXRADAR_MONGO_URI`             | `mios/fixRadar/fixRadar_backend/.env` → `MONGODB_URI`     |
| DealSnap      | `DEALSNAP_MONGO_URI`             | (ese backend aún no tiene `.env`)                         |
| Kambalache    | `KAMBALACHE_MONGO_URI`           | `mios/kambalache_backend/.env` → `DB_CNN`                 |
| Invoice Snap  | `INVOICESNAP_DATABASE_URL`       | `mios/Invoice-Snap/backend/.env` → `DATABASE_URL`         |

Puedes dejar cualquiera vacía: esa tarjeta simplemente aparece como
"Desconectado" en vez de romper el resto del panel.

### Tunel SSH para Invoice Snap (Postgres)

Casi todos los backends corren en el servidor `2.24.77.82` (revisado por SSH:
`curbradar-backend`, `dealsnap_backend`, `fixradar-backend`,
`habanera-backend`, `invoicesnap-backend`, todos con PM2). MongoDB en ese
servidor escucha en todas las interfaces (`0.0.0.0:27017`), así que Habanera,
CurbRadar, FixRadar y DealSnap se conectan directo. Postgres de Invoice Snap
corre en Docker y **a propósito** solo escucha en `127.0.0.1` del servidor
(no en internet) — es la configuración correcta de seguridad, no un error.

Para llegar a esa base desde tu máquina hace falta un túnel SSH:

```bash
ssh -f -N -L 5433:127.0.0.1:5432 root@2.24.77.82
```

Con el túnel abierto, `INVOICESNAP_DATABASE_URL` usa `localhost:5433`. El
túnel no se reinicia solo: si reinicias tu Mac o se cae la conexión, hay que
volver a correr ese comando antes de que la tarjeta de Invoice Snap vuelva a
conectar. Alternativas más permanentes: `autossh` (reconecta solo) o mover
`cuadro_mando` a correr en el propio servidor `2.24.77.82` (ahí Postgres sí
es `localhost` de verdad).

**FitApp y Kambalache no están desplegados en `2.24.77.82`** — no encontré
sus procesos ni sus carpetas ahí. `KAMBALACHE_MONGO_URI` en este repo apunta
a tu Mongo local de desarrollo (vacío); `FITAPP_MONGO_URI` queda vacío hasta
que ese backend tenga una base de datos real en algún lado.

### Alternar entre local y remoto

`.env` trae las URIs de **producción** (servidor `2.24.77.82`) — es lo que
usa el dashboard por defecto (`DB_MODE=remote`). Si quieres que apunte a
backends que corres en tu propia Mac (para probar algo sin tocar datos
reales), no edites `.env` a mano cada vez: usa `.env.local`.

```bash
cp .env.local.example .env.local   # una sola vez; edita las URIs que necesites
```

Y en `.env`, cambia una sola línea:

```bash
DB_MODE=local     # carga .env y LE ENCIMA .env.local (solo las claves que pongas ahi)
DB_MODE=remote    # (o borra la linea) vuelve a usar solo .env, como siempre
```

`.env.local` solo necesita listar las variables que quieres **reemplazar**
— todo lo que no pongas ahí se queda con el valor remoto de `.env`, así que
nunca te quedas sin ver una tarjeta por accidente. Hoy ya trae de ejemplo
`CUBRADAR_MONGO_URI`, `FIXRADAR_MONGO_URI` y `KAMBALACHE_MONGO_URI`
apuntando a `localhost:27017` (requiere un `mongod` corriendo en tu Mac).

Reinicia el servidor después de cambiar `DB_MODE` — igual que con cualquier
cambio en `.env`, no se recarga solo (ver aviso más abajo en "Ejecutar").

## Ejecutar

**Desarrollo** (dos procesos, cada uno con su propio hot-reload):

```bash
npm run dev:api       # Express en :4000 (API, --watch)
npm run dev:client     # Vite en :5173 (SPA, HMR) — en otra terminal
```

Abre `http://localhost:5173`. Vite hace proxy de `/api/*` hacia `:4000`
(configurado en `client/vite.config.js`), así que la cookie de sesión
funciona igual que si fuera un solo origen — no hace falta CORS.

**Producción** (un solo proceso sirve todo):

```bash
npm run build     # compila client/ -> client/dist
npm start          # Express sirve la API y client/dist desde el mismo puerto
```

Abre `http://localhost:4000`. Sin sesión, cualquier ruta manda a `/login`
(lo decide el router de Vue, no el servidor).

**Usuario único (sin registro):** definido en `.env` como `ADMIN_USER` /
`ADMIN_PASS` (por defecto `admin` / `admin`). Cámbialo antes de exponer esto
fuera de tu máquina.

## Qué datos son reales y cuáles no (léelo antes de confiar en el panel)

Revisé el modelo de datos de cada backend antes de construir esto. Resultado:

- **Usuarios totales / nuevos por día**: reales, para todos los proyectos
  con marca de tiempo `createdAt` (todos menos Kambalache, cuyo modelo de
  usuario no guarda fecha de alta).
- **Usuarios activos (últimos 30 días)**: solo es un dato real en
  **CurbRadar** (`lastActive`) y **FixRadar** (`lastSeen`). El resto de
  proyectos no registra actividad reciente por usuario en su base de datos,
  así que el panel muestra "No disponible" en vez de inventar un número.
- **En línea ahora mismo**: CurbRadar (`isOnline`), FixRadar
  (`presenceStatus === 'online'`, lo mantiene su propio Socket.IO en tiempo
  real) y Kambalache (`online`, lo actualizan sus controladores REST). Se
  lee directo de Mongo — el dashboard no abre conexión de socket a nadie.
- **Suscripciones e ingresos**: solo **Invoice Snap** los tiene. Su tabla
  `subscriptions` la llena RevenueCat vía webhook (plan, estado, plataforma,
  si renueva) y `credit_purchases` guarda el precio pagado por compras de
  créditos. Ningún otro proyecto de tu carpeta `mios/` guarda pagos o
  suscripciones en su base de datos todavía (ninguno tiene `in_app_purchase`
  en su código Flutter, salvo Card-Alert, que no está en este dashboard).
- **Plataforma (Android/iPhone) por usuario**: ningún proyecto la guarda a
  nivel de usuario. En Invoice Snap se aproxima a partir del campo
  `platform` de cada suscripción activa (no es lo mismo que "instalaciones
  totales", que viene de las tiendas — ver más abajo).

## Reset de contraseña

Pestaña "Usuarios" en cada proyecto Mongo (buscador + paginación). El botón
de acción depende de cómo autentica ese usuario — nunca toca el backend del
proyecto ni requiere redeploy:

- **Firebase Auth** (CurbRadar completo; FixRadar solo `authProvider:
  'firebase'`): genera el link oficial de "restablecer contraseña" de
  Firebase (`generatePasswordResetLink`). Ese método **no envía nada por sí
  solo**, solo genera la URL — segura de probar contra un usuario real.
- **Contraseña propia / bcrypt** (Habanera, DealSnap, Kambalache, y FixRadar
  con `authProvider: 'email'`): genera una contraseña temporal aleatoria y
  escribe su hash bcrypt directo en el campo correspondiente
  (`passwordHash` o `password`). `bcrypt.compare()` en el login de la app
  valida cualquier hash bcrypt válido sin importar con qué rounds se generó,
  así que funciona de inmediato, sin tocar el backend. **Esto sí cambia la
  contraseña real del usuario al instante** — se pide confirmación antes de
  ejecutar y la contraseña en texto plano solo se muestra una vez en
  pantalla (nunca se guarda).

Envío automático por correo: si `RESET_EMAIL_SMTP_*` está vacío (por
defecto), el dashboard **no envía nada solo** — muestra el link/contraseña
para que tú decidas cómo mandarlo. Configúralo solo cuando tengas una cuenta
de correo dedicada a esto (no reutilices el remitente de otra app sin
querer, el usuario final vería un remitente inconsistente).

**Pendiente:** la clave de servicio de Firebase de FixRadar es rechazada por
Google (`invalid_grant: Invalid JWT Signature`) — hay que regenerarla en
Firebase Console (`fixradar-77067` → Configuración del proyecto → Cuentas de
servicio → Generar nueva clave privada) y reemplazar el archivo en
`secrets/fixradar-firebase-service-account.json`.

## Instalaciones desde Google Play / App Store

Implementado usando los mecanismos oficiales estables de cada tienda. Nada
de esto rompe la página si falla: los errores se capturan por proyecto.

**App Store ya está activo para FixRadar** (la única app publicada por
ahora) — credenciales reales probadas contra la API. Google Play sigue sin
credenciales (cada tarjeta muestra el motivo en vez de un número).

- **Google Play** (`src/connectors/stores/googlePlayReports.js`): Google no
  tiene una API REST simple de "instalaciones totales por app". El mecanismo
  estable es que Play Console exporte reportes CSV diarios a un bucket de
  Cloud Storage. Pasos:
  1. Play Console → tu cuenta de desarrollador → *Configuración* → *Descargar
     informes* → vincular/crear un bucket de Cloud Storage.
  2. Crea una cuenta de servicio de Google Cloud con rol *Storage Object
     Viewer* sobre ese bucket, descarga su JSON.
  3. En `.env`: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (ruta al JSON) y
     `GOOGLE_PLAY_REPORTS_BUCKET` (nombre del bucket, sin `gs://`).
  4. Los reportes tardan ~48h en aparecer la primera vez; hasta entonces la
     tarjeta muestra "aún no publicado".

- **App Store** (`src/connectors/stores/appStoreSales.js`): usa la **Sales
  Reports API** de App Store Connect (JWT ES256 firmado con una API Key).
  Pasos:
  1. App Store Connect → *Users and Access* → *Integrations* → *App Store
     Connect API* → genera una key con rol *Finance* o superior, descarga el
     `.p8`.
  2. En `.env`: `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`,
     `APP_STORE_CONNECT_PRIVATE_KEY_PATH` (ruta al `.p8`) y
     `APP_STORE_CONNECT_VENDOR_NUMBER` (en *Agreements, Tax, and Banking*).
  3. El conector pide el reporte **mensual** (no diario): con pocas
     descargas, un reporte de un solo día casi siempre da 0 porque Apple ni
     genera el archivo si no hubo actividad ese día. Si el mes en curso
     todavía no tiene datos, cae automáticamente al mes anterior.

Los identificadores de cada app (`androidPackageName`/`iosBundleId`) ya están
puestos en `src/config/projects.js`. `appleAppId` (el ID numérico de App
Store Connect) ya está completo para **FixRadar** (`6782331585`); para
CurbRadar/Habanera queda en `null` hasta que se publiquen — la misma API Key
(es una "clave de equipo", cubre todas las apps de la cuenta) sirve para
activarlas sin generar nada nuevo.

**Importante:** de tus apps, solo **Invoice Snap** vende algo dentro de la
app (`in_app_purchase` en su `pubspec.yaml`). Habanera, CurbRadar, FixRadar y
DealSnap no tienen compras integradas, así que sus reportes de ingresos
vendrán en $0 aunque actives las credenciales — lo único real que aportarán
ahí es instalaciones/desinstalaciones.

## Estructura y componentes

Ver [`ARCHITECTURE.md`](./ARCHITECTURE.md) para el árbol completo de
carpetas, la tecnología usada en cada parte, el contrato de la API
(`src/routes` ↔ `client/src/api`), y el detalle de cada módulo del backend y
cada componente/store/página del frontend de Vue.

## Agregar un proyecto nuevo

1. Agrega un objeto en `src/config/projects.js` (id, nombre, color, `type`,
   `envVar`, y qué `capabilities` puede mostrar honestamente).
2. Agrega esa variable de entorno a `.env`.
3. Si es MongoDB y su modelo de usuario usa nombres de campo distintos a
   `createdAt`, ajusta `fields` en esa misma entrada — no hace falta tocar
   el conector.
4. Si quieres reset de contraseña, agrega `auth.firebase` y/o `auth.bcrypt`
   (ver comentarios al inicio de `projects.js`).
5. Si quieres métricas de tienda, agrega `store` con los identificadores de
   la app.
6. El frontend no necesita cambios: `GET /api/projects` ya devuelve la lista
   actualizada y el sidebar/rutas se generan solos a partir de ella.
