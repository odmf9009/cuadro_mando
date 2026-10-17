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
- Google Play: instalaciones por informes del bucket; los ingresos están pendientes (ver abajo).

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
- Fase 2: informes de suscripciones de Apple + selector de periodo.
- Fase 3: ingresos de Google (bucket de informes). Bloqueado por 403 de Cloud Storage tras invitar a la cuenta de servicio de Play;
  cuando funcione, bajar su rol de Admin a solo lectura e inspeccionar los archivos reales ANTES de escribir el lector.
- Portafolio público (proyecto hermano `mios/porfolio`, Mongo `projects`): su estado/enlaces de tienda se mantienen a mano;
  verificar contra App Store Connect/Google Play antes de cambiar textos de estado.
