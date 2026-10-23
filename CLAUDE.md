# CLAUDE.md — gonmotor-ui

> Las convenciones detalladas de UI (componentes compartidos, paleta, TextImprover, contrato de modales crear/editar) están en `AGENTS.md`. **Léelo antes de tocar componentes.** Este archivo da el mapa general.

## 1. Propósito

Frontend del SaaS **GonMotor** para talleres mecánicos: panel de administración donde cada empresa gestiona clientes, vehículos, citas, el flujo **Recepción → Inspección → Cotización → Orden de trabajo**, inventario, gastos, reportes, notificaciones WhatsApp y la configuración de empresa, talleres, usuarios y roles.

Es un sitio estático generado con **Hugo** (nació de la plantilla *Flowbite Admin Dashboard*) en el que cada página monta una o varias **islas Vue 3**. Consume la API Django de `../gonmotor-api/` (repo aparte). Se despliega en **Vercel**.

Vocabulario: el backend dice `sucursal` en muchos campos; en todo texto visible se usa **Taller**.

## 2. Mapa del repositorio

```
gonmotor-ui/
├── config.yml               # Config Hugo (idioma es, título "GonMotor Gestión")
├── package.json             # scripts start/build (el name/metadata siguen siendo los de la plantilla)
├── webpack.config.js        # entry src/index.js → static/app.bundle.js + app.css; alias '@' = src/
├── postcss.config.js        # @tailwindcss/postcss
├── vercel.json              # instala hugo_extended 0.154.5 y ejecuta npm run build → public/
├── content/                 # Páginas Hugo (frontmatter + placeholder <div id="x-app">)
│   ├── _index.html          # Dashboard (#dashboard-app)
│   ├── authentication/      # sign-in, sign-up, forgot/reset-password, profile-lock (públicas)
│   ├── crud/                # <modulo>.html (listado) y <modulo>/{agregar,editar,ver}.html
│   ├── configuracion/       # empresa, talleres, usuarios, roles
│   ├── reportes/  notificaciones.html  perfil.html  ...
│   └── pages/ layouts/ playground/   # restos de la plantilla
├── layouts/
│   ├── _default/dashboard.html   # navbar + sidebar + <main>{{ .Content }}</main>
│   ├── _default/baseof.html      # header, scripts, footer
│   └── partials/
│       ├── sidebar.html          # navegación HARDCODED (fuente real del menú)
│       ├── scripts.html          # carga /app.bundle.js + guard de sesión y logout inline
│       └── stylesheet.html       # carga /app.css
├── data/                    # sidebar.json / users.json / products.json: demo de la plantilla, IGNORAR
├── static/                  # favicons, imágenes; app.bundle.js/app.css son generados (gitignored)
├── src/
│   ├── index.js             # punto de entrada: monta cada isla Vue según el placeholder presente
│   ├── style.css            # Tailwind 4 (@import "tailwindcss" + @theme con tokens de marca)
│   ├── sidebar.js  dark-mode.js  charts.js  constants.js   # JS vanilla de la plantilla
│   ├── fonts/               # Manrope
│   ├── icons/               # iconos SVG propios (alias 'gonmotor-icons')
│   ├── modules/<modulo>/    # un directorio por dominio (ver abajo)
│   └── shared/
│       ├── components/      # EntityHeader, EntityTable, Alert, ConfirmModal, FormSaveActions,
│       │                    # *SearchSelect, TallerSelect, TextImprover, ImageField, PhotoUploadGrid,
│       │                    # RelacionesFlujo, FlowSteps, GlobalSearch, Topbar, UserMenu, ...
│       ├── composables/     # usePermisos, useToast, usePdfExport, useRolesOtorgables, useSucursalDocumento
│       ├── config/          # env.js (API_BASE_URL), branding.js, entityConfig.js, flujoPasos.js, ...
│       ├── services/        # httpClient.js, busquedaService, textImproverService, talleresDisponiblesService
│       ├── utils/           # format, datetime, impuestos, sanitize, download, relacionesFlujo, ...
│       └── directives/      # sanitizeSearch
├── tools/brand/             # generación de assets de marca
├── AGENTS.md                # convenciones de UI (OBLIGATORIO leer)
└── AUDITORIA_IDENTIDAD_VISUAL.md, BRIEF_DISENO_MARCA.md, ESPECIFICACION_MARCA.md   # documentos de marca
```

Salidas generadas (no editar, gitignored): `public/`, `_gh_pages/` (`publishDir` de `config.yml`; el build de producción usa `--destination=./public`), `resources/_gen/`, `static/*.js|*.css|*.map`.

### Módulos (`src/modules/`)

`auth`, `dashboard`, `dashboard-v2`, `clientes`, `vehiculos`, `proveedores`, `empleados`, `usuarios`, `citas`, `calendario` (vista de citas), `recepciones`, `inspecciones`, `cotizaciones`, `ordenes`, `inventario/{repuestos,servicios}` (kardex y ajuste de stock en `RepuestoKardexModal.vue`; aviso de stock bajo en el listado), `compras` (página `crud/compras/`: `ComprasList.vue`, `CompraModal.vue`, `CompraDetalleModal.vue`, cuentas por pagar), `gastos`, `caja` (página `crud/caja/`: apertura, resumen, ingresos/egresos, cierre e historial con PDF/reapertura), `pagos` (sección «Cobro» de la ficha de la orden: `OrdenPagos.vue`, `RegistrarPagoModal.vue`, `EstadoPagoBadge.vue`; el despacho de repuestos al almacén vive en `ordenes/components/DespachoRepuestoModal.vue`, columna «Almacén» de la ficha de la orden; página `crud/cuentas-por-cobrar/` con `CuentasPorCobrarList.vue`, `RecordarSaldoModal.vue` y `ExportarPagosModal.vue` (Excel de pagos por rango de fechas); `ClienteCuenta.vue` en la ficha del cliente; recibo PDF y `EnviarReciboModal.vue` por movimiento; `ComprobanteOrden.vue` para la factura o nota de venta externa), `reportes` (rentabilidad y «Resumen del negocio» en `reportes/resumen/`: `ResumenNegocioView.vue`, `FacturadoCobradoChart.vue`), `notificaciones`, `configuracion`.

Estructura de cada módulo:
```
src/modules/<nombre>/
├── index.js                     # exporta mount<Algo>(element, pinia)
├── components/                  # <X>List.vue, <X>Modal.vue, <X>Detail.vue, <X>Edit.vue, Estado<X>Badge.vue
├── composables/use<Nombre>.js   # estado del listado: isLoading, errorMessage, currentPage, nextUrl, previousUrl
├── services/<nombre>Service.js  # llamadas a la API vía httpClient.request
└── constants/                   # estados<Entidad>.js, etc. (si aplica)
```
`auth/` tiene además `stores/authStore.js` (store Pinia de sesión).

## 3. Tecnologías y dependencias

- **Hugo** (extended 0.154.5 en Vercel) como generador de sitio estático
- **Vue 3.5** con SFC `<script setup>` compilado por **webpack 5** + `vue-loader` + Babel
- **Pinia** (store de auth, compartido por todas las islas de una página)
- **Tailwind CSS 4** (`@tailwindcss/postcss`) + **Flowbite 4** (JS cargado globalmente en `index.js`)
- **FullCalendar 6** (citas/calendario), **ApexCharts** (gráficos), simple-datatables (CDN, legado de la plantilla)
- Iconos: `lucide-vue-next` (principal), `@tabler/icons-vue`, `@iconify/vue`, `@mdi/js`
- `npm-run-all` para encadenar el build
- **No hay** linter, typecheck ni tests configurados. Verifica los cambios con `npm run build` y en el navegador.

## 4. Reglas de arquitectura y flujos

### Islas Vue (no es una SPA)
- Cada URL es una página HTML independiente generada por Hugo. Vue **no** es global: `src/index.js` busca placeholders `#<x>-app` y, si existen, monta su app con `createApp(...).use(pinia).mount(el)`. Una sola instancia de Pinia se comparte entre las islas de la página.
- La navegación entre pantallas es por enlaces normales (recarga completa); no hay router de Vue. Los ids de registro van en la query string (p. ej. `crud/clientes/ver/?id=...`).
- `#topbar-app` (búsqueda global, selector de taller, menú de usuario) se monta en todas las páginas del dashboard.

**Añadir una página nueva requiere tres pasos:**
1. `content/crud/<modulo>.html` con frontmatter `layout: dashboard` (y `group` cuando aplique) y como cuerpo solo `<div id="<x>-app" class="w-full"></div>`.
2. Un bloque de montaje en `src/index.js` (`const el = document.getElementById('<x>-app'); if (el) mountX(el, pinia);`) y la función `mountX` en `src/modules/<modulo>/index.js`.
3. Un enlace en `layouts/partials/sidebar.html` (hardcoded; `data/sidebar.json` no se usa). Usa `data-recurso="<recurso>"` para que se oculte si el rol no tiene permiso `ver`.

### Sesión, tenant y taller
- **Guard de sesión** (inline en `layouts/partials/scripts.html`): sin token en `localStorage`/`sessionStorage` redirige a `/authentication/sign-in/` (salvo rutas públicas de `authentication/`); con token, el login redirige a `/`. Ahí está también el logout (`#signoutButton`).
- **`authStore`** guarda en `localStorage` («recordarme») o `sessionStorage` las claves `gonmotor_access_token`, `gonmotor_refresh_token`, `gonmotor_user`, `gonmotor_logged_in`, `gonmotor_empresa_id`, `gonmotor_taller_id`, `gonmotor_taller_nombre`. Login multiempresa: si el usuario tiene varias empresas, elige una (`/api/auth/select-company/`); los talleres llegan dentro de cada empresa.
- **Taller activo**: `TallerSelect.vue` → `authStore.setTaller({ id, nombre })`. `tallerId == null` significa «Todos los talleres» (solo roles administradores). El backend recorta los datos por taller según la cabecera.
- **Permisos**: `usePermisos.js` carga `/api/auth/me/` una vez (cacheado) y expone los permisos `{recurso: ['ver','modificar']}`; `iniciarPermisosGlobal()` elimina del sidebar los `<li>` cuyos `data-recurso` no tengan `ver`. Ocultar en UI es cosmética: la autorización real la hace el backend. Hoy llevan `data-recurso` Clientes, Proveedores, Vehículos, Inventario, Citas, Recepciones, Inspecciones, Cotizaciones, Órdenes, Empleados, Gastos, Notificaciones y Rentabilidad (una sección `data-sidebar-seccion` sin enlaces visibles se elimina con su etiqueta; Auditoría vive en el menú de configuración del topbar). El menú de configuración del topbar filtra sus enlaces con `usePermisos`.

### HTTP
- **Todo** pasa por `request()` de `src/shared/services/httpClient.js`: inyecta `Authorization: Bearer` (la empresa de la sesión viaja en la claim del JWT; no hay cabecera de empresa) y `X-Taller-ID`, ante un 401 refresca el JWT y reintenta, si el refresh falla limpia la sesión, y normaliza los errores DRF a mensajes en español.
- Nunca uses `fetch` directo ni pases `token`/`empresaId` como parámetros. Las funciones legacy `fetch(token, empresaId, ...)` que quedan en algunos servicios son código muerto.
- `API_BASE_URL` (`src/shared/config/env.js`): `localhost`/`127.0.0.1` → `http://localhost:8000`; cualquier otro host → `https://gonmotor-api.onrender.com`.
- Los IDs que devuelve la API son **opacos** (en migración a UUID): trátalos como string; nunca `Number(id)`/`parseInt(id)` ni `v-model.number` en selectores de registros.
- Los listados de la API paginan de 10 en 10 (`count`, `next`, `previous`, `results`); los composables guardan `nextUrl`/`previousUrl`.

### UI y componentes
- **Reutiliza antes de crear** (detalle en `AGENTS.md`): `EntityHeader` (cabecera única de listado/detalle/crear/editar), `EntityTable` (tabla + paginación), `Alert`, `useToast`, `ConfirmModal` (borrados), `FormSaveActions`, los `*SearchSelect`, `ImageField` y sus variantes, `TextImprover` (botón «Mejorar texto» con IA), `RelacionesFlujo`/`FlowSteps` (vínculos del flujo taller).
- **Crear/editar en modal** para entidades simples (`entityConfig.js` → `ENTITY_ADD_MODES`): si falla, el modal sigue abierto con los datos y los errores mapeados a los campos; si sale bien, se cierra, aparece un `Alert` de éxito y el listado se recarga conservando página, búsqueda y filtros. No se cierra al hacer clic fuera, y pide confirmación si hay cambios sin guardar. Recepciones, inspecciones y órdenes usan página propia (`agregar/`, `editar/`) por el tamaño del formulario.
- **Estados**: un `Estado<Entidad>Badge.vue` por módulo alimentado por `constants/estados<Entidad>.js`; no crear badges ad-hoc.
- **Paleta**: tokens en `@theme` de `src/style.css`, con espejo JS en `src/shared/config/branding.js` (para ECharts/FullCalendar/canvas); si cambias uno, cambia el otro. Código nuevo: `brand-*` (navy) y `accent-*` (rojo, solo para detalles); `danger` solo para acciones destructivas.
- Todo texto visible en español; dark mode con las variantes `dark:` de Tailwind.

## Comandos

```bash
npm install
npm run start     # Hugo server :1313 + webpack --watch (un solo proceso)
npm run build     # webpack production → hugo --destination=./public
```
Para desarrollo local, el backend debe correr en `http://localhost:8000` (ver `../gonmotor-api/CLAUDE.md`). Su CORS ya admite `localhost:1313`.
