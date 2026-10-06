// Registro central de proyectos. Cada entrada describe UNA app/backend real
// que vive en la carpeta mios/. Agregar un proyecto nuevo = agregar un objeto
// aqui (mas la variable de entorno correspondiente en .env).
//
// type: 'mongo' | 'postgres'
// envVar: nombre de la variable de entorno con la cadena de conexion
// color: acento visual de la tarjeta (ver public/css/styles.css)
//
// fields (solo para type 'mongo'):
//   collection      -> nombre de la coleccion (por defecto "users")
//   createdAtField  -> campo de fecha de alta (por defecto "createdAt")
//   noTimestamps    -> true si el modelo no tiene createdAt/updatedAt
//   activeField     -> campo boolean que indica "activo" (ej. isActive)
//   lastActiveField -> campo de fecha de ultima actividad (ej. lastActive)
//   activeLabel     -> texto a mostrar para la metrica de activos
//   onlineField     -> campo que indica presencia en vivo (ej. isOnline)
//   onlineValue     -> valor que cuenta como "en linea" (por defecto true;
//                      usar un string para campos tipo enum, ej. 'online')
//   onlineLabel     -> texto a mostrar para la metrica de "en linea ahora"
//
// capabilities: que metricas puede mostrar honestamente este proyecto.
// Si algo no esta soportado, la UI muestra "No disponible" en vez de
// inventar un dato.
//
// auth (opcional): habilita la pestaña "Usuarios" con acciones de reset de
// contraseña. Dos metodos, se puede tener uno o ambos a la vez:
//
//   auth.firebase = { serviceAccountPathEnv, condition? }
//     Genera el link oficial de "restablecer contraseña" de Firebase Auth.
//     No hace falta tocar el backend del proyecto, Firebase ya lo resuelve.
//
//   auth.bcrypt = { field, condition? }
//     Genera una contraseña temporal random y escribe su hash bcrypt
//     DIRECTO en el campo indicado (ej. "passwordHash" o "password").
//     bcrypt.compare() valida cualquier hash bcrypt valido sin importar
//     con que libreria/rounds se genero, asi que el login de la app sigue
//     funcionando igual, sin ningun cambio ni redeploy del backend.
//
//   condition = { field, equals } (opcional en ambos): solo aplica ese
//   metodo si user[field] === equals. Sirve para proyectos que mezclan
//   usuarios de Firebase y de contraseña propia (ej. FixRadar).
//
// segments (opcional): tarjetas clicables en el detalle del proyecto que
// filtran la pestaña Usuarios (ej. Clientes vs Profesionales). Siempre se
// agrega automaticamente una tarjeta mas para los que no tienen el campo
// definido (unclassifiedLabel, por defecto "Sin definir").
//   field   -> nombre del campo en Mongo (ej. 'userType')
//   options -> [{ value, label }], uno por tarjeta/segmento real
//
// store (opcional): identificadores para las metricas de Google Play / App
// Store (ver connectors/stores/*.js). androidPackageName y iosBundleId salen
// del propio codigo del proyecto (build.gradle / Info.plist), ya estan
// puestos. appleAppId es el ID NUMERICO de App Store Connect (no el bundle
// id) -> hay que copiarlo a mano desde ahi, no existe en el codigo.

module.exports = [
  {
    id: 'habanera',
    name: 'Habanera',
    description: 'Marketplace y rifas',
    type: 'mongo',
    envVar: 'HABANERA_MONGO_URI',
    color: '#f97316',
    fields: { createdAtField: 'createdAt' },
    capabilities: { activeUsers: false, subscriptions: false, platforms: false },
    auth: { bcrypt: { field: 'passwordHash' } },
    store: {
      androidPackageName: 'com.venturesflstudio.habanera',
      iosBundleId: 'com.venturesflstudio.habanera',
      appleAppId: null, // completar desde App Store Connect
    },
  },
  {
    id: 'fitapp',
    name: 'FitApp',
    description: 'Plan de entrenamiento y nutricion',
    type: 'mongo',
    envVar: 'FITAPP_MONGO_URI',
    color: '#22c55e',
    fields: { createdAtField: 'createdAt' },
    capabilities: { activeUsers: false, subscriptions: false, platforms: false },
  },
  {
    id: 'cubradar',
    name: 'CurbRadar',
    description: 'Deteccion y reporte de objetos en la calle',
    type: 'mongo',
    envVar: 'CUBRADAR_MONGO_URI',
    color: '#06b6d4',
    fields: {
      createdAtField: 'createdAt',
      // isActive = cuenta no deshabilitada (casi siempre true) -> NO sirve
      // como "actividad reciente". Para eso usamos lastActive (fecha real).
      lastActiveField: 'lastActive',
      activeLabel: 'Activos (ultimos 30 dias)',
      onlineField: 'isOnline',
      onlineLabel: 'En linea ahora',
      // _id es el ObjectId normal de Mongo. El Firebase UID vive aparte en
      // el campo "firebaseUid" (no es la clave primaria de este modelo).
    },
    capabilities: { activeUsers: true, subscriptions: false, platforms: false },
    auth: { firebase: { serviceAccountPathEnv: 'CURBRADAR_FIREBASE_SERVICE_ACCOUNT_PATH' } },
    store: {
      androidPackageName: 'com.venturesflstudio.curb_radar',
      iosBundleId: 'com.venturesflstudio.curbRadar',
      appleAppId: null,
    },
  },
  {
    id: 'fixradar',
    name: 'FixRadar',
    description: 'Contratacion de tecnicos/servicios',
    type: 'mongo',
    envVar: 'FIXRADAR_MONGO_URI',
    color: '#a855f7',
    fields: {
      createdAtField: 'createdAt',
      lastActiveField: 'lastSeen',
      activeLabel: 'Vistos activos (ultimos 30 dias)',
      // presenceStatus lo mantiene su propio socketManager.js en tiempo real
      // (se pone 'online' al conectar el socket, 'offline' al desconectar).
      onlineField: 'presenceStatus',
      onlineValue: 'online',
      onlineLabel: 'En linea ahora',
      idIsString: true, // _id = Firebase UID o UUID propio, no ObjectId
    },
    // Segmentos de usuarios: tarjetas con conteo + filtro en la pestaña Usuarios.
    // Los que tienen el campo vacio (no terminaron el onboarding) se cuentan aparte.
    segments: {
      field: 'userType',
      options: [
        { value: 'client', label: 'Clientes' },
        { value: 'technician', label: 'Profesionales' },
      ],
      unclassifiedLabel: 'Sin roles',
    },
    capabilities: { activeUsers: true, subscriptions: false, platforms: false },
    // FixRadar mezcla usuarios de Firebase (Google) y de contraseña propia.
    auth: {
      firebase: {
        serviceAccountPathEnv: 'FIXRADAR_FIREBASE_SERVICE_ACCOUNT_PATH',
        condition: { field: 'authProvider', equals: 'firebase' },
      },
      bcrypt: {
        field: 'password',
        condition: { field: 'authProvider', equals: 'email' },
      },
    },
    store: {
      androidPackageName: 'com.venturesflstudio.fixradar',
      iosBundleId: 'com.venturesflstudio.fixRadar',
      appleAppId: null,
    },
  },
  {
    id: 'dealsnap',
    name: 'DealSnap',
    description: 'Ofertas y seguimiento de precios',
    type: 'mongo',
    envVar: 'DEALSNAP_MONGO_URI',
    color: '#eab308',
    fields: { createdAtField: 'createdAt' },
    capabilities: { activeUsers: false, subscriptions: false, platforms: false },
    // DealSnap mezcla usuarios locales (password propio) y de Google (sin
    // password) -> el reset solo aplica a authProvider === 'local'.
    auth: { bcrypt: { field: 'password', condition: { field: 'authProvider', equals: 'local' } } },
  },
  {
    id: 'kambalache',
    name: 'Kambalache',
    description: 'Marketplace de locales y pedidos',
    type: 'mongo',
    envVar: 'KAMBALACHE_MONGO_URI',
    color: '#ec4899',
    fields: {
      collection: 'usuarios',
      noTimestamps: true,
      // Lo actualizan sus controladores REST (auth.js / pedido_controller.js),
      // no es un socket en vivo, pero es la mejor senal de presencia que guarda.
      onlineField: 'online',
      onlineLabel: 'En linea ahora',
    },
    capabilities: { activeUsers: false, subscriptions: false, platforms: false },
    auth: { bcrypt: { field: 'password' } },
  },
  {
    id: 'invoice-snap',
    name: 'Invoice Snap',
    description: 'Facturas y presupuestos con IA',
    type: 'postgres',
    envVar: 'INVOICESNAP_DATABASE_URL',
    color: '#3b82f6',
    capabilities: { activeUsers: false, subscriptions: true, platforms: true },
    store: {
      androidPackageName: 'com.venturesflstudio.invoice_snap',
      iosBundleId: 'com.venturesflstudio.invoicesnap.invoiceSnap',
      appleAppId: null,
    },
  },
];
