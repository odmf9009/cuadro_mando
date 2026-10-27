# CLAUDE.md — Cuadro de Mando

Panel de administración (Node/Express + Vue 3) que agrega datos REALES de las apps móviles del dueño
(Habanera, CurbRadar, FixRadar, SkillFix, Invoice Snap, CardAlert; DealSnap, Kambalache y ToFast están ocultos).
Producción: https://dashboard.krbusinessventures.org. Lee `ARCHITECTURE.md` antes de tocar código (estructura,
contratos de datos, catálogo de componentes) y `README.md` para instalación.

**Idioma**: responde y comenta en español (con tildes). Identificadores de código tal cual.

## Comandos

```
npm run dev:api        # Express en :4000 (DB_MODE=local usa .env.local)
npm run dev:client     # Vite con proxy de /api
cd client && npm run build   # genera client/dist (Express lo sirve en producción)
```

## Reglas que no se negocian

1. **Honestidad del dato**: nunca inventar ni suponer una cifra. Si no existe o no se puede leer, la UI lo dice y explica por
   qué (`unavailable` / `pending`). Dinero de prueba (Stripe test) lleva `PRUEBA`. Lo que la app declara sin verificar
   (plan premium de CardAlert) se etiqueta como tal y no entra en totales globales.
2. **Todo dato muestra su origen** (`SourceTag`: Apple, Google, Stripe/web, Firebase, base de datos de la app). Las cifras se
   agrupan por origen en `StoreCard` (App Store, Google Play, pagos propios). La lógica vive SOLO en
   `client/src/composables/useProjectSections.js`.
3. **Verifica contra datos reales antes de afirmar** (consulta la API/BD, mira el navegador). Muchas suposiciones de este
   proyecto resultaron falsas (ej. el "revenue" de Invoice Snap era Stripe en modo prueba).
4. **Secretos**: jamás commitear ni imprimir `.env`, `.env.local`, `secrets/`, `uploads/`, claves `.p8`/JSON ni contraseñas.
   No escribir credenciales en documentación, comentarios ni commits. Al mostrar variables, ocultar valores.
5. **Privacidad**: proyecciones y listas blancas de campos; no leer subcolecciones financieras de Firestore; no exponer al
   navegador variables de entorno ni identificadores internos (ver `toSafeProject`).
6. **Acciones reversibles y acotadas**: no borrar datos de producción; las acciones de escritura existentes son solo el reset de
   contraseña (con confirmación) y la subida de APK.

## Patrones del frontend (síguelos)

- **Componentes reutilizables y escalables**: `components/base/` es genérico (props y eventos, sin stores ni API). Compón en
  vez de duplicar: `StoreCard` + `MetricRow` + `SourceTag` + `StatusChip` + `BaseTable` + `StatCard`. Antes de crear un
  componente, revisa `base/`.
- **Config-driven**: capacidades por proyecto en `src/config/projects.js` (type `mongo|postgres|firestore|none`, `segments`,
  `userColumns`, `userActivity`, `store`, `apkDistribution`, `hidden`). El código es genérico; agregar un proyecto = agregar un objeto.
- **Datos → presentación**: conectores devuelven la forma normalizada (§5 de ARCHITECTURE.md); la UI no sabe de dónde vienen.
- **Estados de carga obligatorios**: estructura visible al instante con `SkeletonBlock`/`SkeletonLines` (efecto brillo+desenfoque) y
  `.reveal` al llegar los datos; pedir cada fuente por separado con guarda `loadToken`; jamás mostrar "Desconectado" o
  "No encontrado" mientras carga.
- **Navegación**: toda página usa `AppLayout` con `crumbs` (migas). El listado de usuarios va dentro de la página del proyecto
  (`#usuarios`); `/project/:id/users` solo redirige.
- Estilos: variables CSS de `style.css`; lo específico en `<style scoped>`. Respetar `prefers-reduced-motion`.

## Backend

- Un conector por tipo de fuente en `src/connectors/`; nunca lanzan hacia la API (`connectors/index.js` captura).
- Rutas a archivos siempre desde `__dirname` (no `process.cwd()`). `PORT` con `Number(process.env.PORT) || 4000`.
- MongoDB con el driver nativo (no Mongoose). Dinero en `numeric` hasta el último paso.
- Apple: informes MENSUALES (los diarios casi siempre vienen vacíos); estado de versión con `getAppStoreStatus`.
- Google Play: instalaciones por informes del bucket; las ganancias salen del ZIP de "Informes de ganancias" de Play Console, importado con el control de la página del proyecto (`POST /api/play-reports/earnings`) o, si algún día el bucket responde, de `earnings/`. Los cobros de suscripción NO son suscriptores activos (se dice en la UI).

## Herramientas de diseño y verificación (instaladas el 2026-10-27; úsalas en TODO trabajo de interfaz)

**Skills** en `.claude/skills/` (de terceros, MIT; procedencia y commits auditados en `.claude/THIRD_PARTY.md`):

- `design-taste-frontend` (Taste Skill v2): dirección de arte para páginas (portafolio, landing) **y** para pantallas de
  aplicación como este panel (ruta `--app`; lee `references/app-screens.md` entera antes de empezar). Sus scripts se
  ejecutan desde la RAÍZ del proyecto y escriben en `.taste-skill/` (gitignored): `draw.mjs` (reparte direcciones),
  `inspect.mjs` (mide y fotografía en Chrome real a 1440/768/390), `lint.mjs`, `assets.mjs` (imágenes con licencia; necesita
  red). `draw.mjs` guarda un historial en `~/.taste-skill/history.json` (fuera del repo; `TASTE_SKILL_HISTORY` lo mueve).
- Skills de Emil Kowalski: `emil-design-eng` (base: pulido de UI), `animate`, `animation-performance`, `animation-vocabulary`,
  `apple-design`, `break-ui` (probar con datos extremos), `find-animation-opportunities`, `improve-animations`,
  `review-animations`, `mobile-native` (que se sienta nativa en móvil), `pick-ui-library`, `prototype` (variantes).

**MCP** en `.mcp.json` (cada persona debe aprobarlos la primera vez que abre `claude` en el proyecto):

- `playwright` (oficial de Microsoft, versión fijada, perfil aislado): navegar, capturar y probar en un navegador real.
  Para responsive usa `browser_resize` a **320, 390, 768, 1024, 1440 y 1920** de ancho y mira cada captura. Guarda salidas en
  `.playwright-mcp/` (gitignored). Si existe un `playwright` a nivel de usuario, gana el del proyecto.
- `figma` (remoto): `/mcp` → figma → Authenticate (inicio de sesión en el navegador). `figma-desktop`: requiere la app de
  escritorio abierta, Dev Mode (`Shift+D` → "Enable desktop MCP server") y un asiento Dev/Full. Úsalos solo cuando exista un
  archivo de Figma con el diseño: el diseño de referencia manda sobre improvisar.

**Prioridad**: la estética nunca justifica romper las reglas de arriba. Sin cifras inventadas (Taste Skill también las
prohíbe en pantallas de aplicación), con el origen visible en cada dato, y con los componentes base y los estados de carga.

## Rediseño visual: PENDIENTE (no empezar sin la orden explícita del dueño)

Objetivo: remodelar el cuadro de mando y el portafolio público (`../porfolio`, proyecto hermano) para que sean lo más
modernos posible y **responsive a cualquier pantalla** (móvil 320–430, tablet 768, portátil 1024–1440, grande 1920+; sin scroll
horizontal; objetivos táctiles ≥ 44 px; respetar `prefers-reduced-motion`).

- **Punto de partida del panel**: el sidebar es fijo (`.sidebar { width: 250px }`) y `style.css` no tiene ninguna media query de
  ancho (solo `prefers-reduced-motion`; la única otra es la de la ficha de usuario), así que hoy no es usable en móvil.
- **El portafolio NO tiene git** (carpeta `mios/porfolio`). Antes de tocarlo: `git init` + commit inicial, o una copia de
  seguridad. Su contenido (proyectos, textos, capturas) vive en MongoDB y en `public/uploads/`; el rediseño no debe borrar datos.
- Flujo: skill → 2–3 direcciones para elegir → implementar → verificar con Playwright en todos los anchos → documentar en
  `ARCHITECTURE.md` → mostrárselo al dueño ANTES de desplegar.

## Despliegue (servidor propio, PM2)

```
git push origin main
# en el servidor (/var/www/cuadro_mando):
git pull origin main
cd client && npm run build && cd ..     # solo si cambió client/ (npm install antes si cambió package.json)
pm2 restart cuadro-mando
```

Tras desplegar, verifica en producción con el navegador o la API. `client/package-lock.json` está ignorado a propósito; si Vite
falla con "Cannot find native binding": `rm -rf client/node_modules client/package-lock.json && npm install`. El acceso SSH lo
proporciona el dueño; no está en el repo.

Commits: mensaje en inglés, enfocado en el porqué, con la línea `Co-Authored-By` que indique el entorno. Preferir commits nuevos
sobre `--amend` una vez hecho el push.

## Estado y pendientes (actualizar al avanzar)

- Hecho: tarjetas por origen, estado de Apple, atribución por origen (Invoice Snap), ficha de usuario FixRadar, CardAlert por
  Firebase, APK directo, skeletons, migas, listado en la página del proyecto.
- Hecho (fase 2): selector de periodo e historial de 6 meses de Apple (descargas/ingresos, `MiniBars`).
- Pendiente Apple: informe de suscripciones (`SUBSCRIPTION`); hoy responde "Invalid vendor number" aunque `SALES` funcione. No escribir el lector sin ver un informe real.
- Hecho (fase 3 parcial): ganancias de Google por importación manual del ZIP (lector verificado con un informe real de sep 2026).
  El acceso automático al bucket de Play sigue en 403 (la cuenta de servicio no obtiene permisos pese a estar invitada); cuando
  funcione, bajar su rol de Admin a solo lectura y confirmar la ruta `earnings/` del bucket.
- Herramientas de diseño (skills de Taste y Emil + MCP de Playwright y Figma) instaladas; falta que el dueño apruebe los MCP
  del proyecto y autentique Figma. El rediseño espera su luz verde (sección de arriba).
- Portafolio público (proyecto hermano `mios/porfolio`, Mongo `projects`): su estado/enlaces de tienda se mantienen a mano;
  verificar contra App Store Connect/Google Play antes de cambiar textos de estado.
