# AGENTS.md — GonMotor UI

Convenciones y estándares del proyecto. El backend Django vive en `../gonmotor-api/` (repo aparte).

## Stack y comandos
- Vue 3 (`<script setup>`) + Vue loader/webpack + Pinia. Tailwind 4 / Flowbite se configuran en `src/style.css` (`@import "tailwindcss"` + `@theme`). No hay linter, typecheck ni tests en el frontend.
- Dev: `npm run start` — levanta Hugo server en :1313 y webpack en watch (un solo proceso, ambos; Ctrl+C detiene).
- Build prod: `npm run build` → webpack `--mode=production` (genera `static/app.bundle.js` + `app.css` desde `src/index.js`) y luego `hugo --destination=./public`. Vercel fija hugo_extended 0.154.5 (`vercel.json`).
- El backend maneja el término **Taller**; el frontend usa **Taller** en todo texto visible (una sucursal = un taller).

## Arquitectura de páginas (islas Vue)
- Vue NO es global: se monta **un app por placeholder** `#<x>-app` (ver `src/index.js`).
- Página nueva = 3 pasos: archivo Hugo (`content/crud/<modulo>.html`, frontmatter `layout: dashboard`, body solo `<div id="<x>-app"></div>`), bloque de montaje correspondiente en `src/index.js`, y enlace en `layouts/partials/sidebar.html` (hardcoded; `data/sidebar.json` es demo del template y se ignora).
- Layout por módulo: `src/modules/<name>/index.js` (exporta helpers `mount*`), `components/`, `composables/use<Name>.js`, `services/<name>Service.js`.

## Comunicación con el backend
- TODO el HTTP va por `src/shared/services/httpClient.js` (`request`): inyecta `Authorization` y `X-Empresa-ID`, auto-refresca el JWT y propaga errores en español. No usar `fetch` directo ni pasar `token`/`empresaId` por parámetro.
- Varios servicios conservan funciones legacy `fetch(token, empresaId, ...)` (ej. `recepcionesService.js`) — es código muerto, no extender ese patrón.
- `API_BASE_URL` se deriva del hostname en `src/shared/config/env.js`: localhost → `http://localhost:8000`, cualquier otro host → `https://gonmotor-api.onrender.com`.
- Composable para listados: estado `isLoading`/`errorMessage`/paginación `currentPage`+`nextUrl`+`previousUrl` (ej. `useClients.js`).

## Componentes compartidos (REUTILIZAR antes de crear)
- Encabezado de formularios crear/editar (flujo del taller y cualquier otra entidad): `src/shared/components/FormHeader.vue` — props `backHref`, `breadcrumb` (`[{ label, href? }]`), `entity`, `title`, `recordNumber`, `isEditMode`; slots `#badges` (estado/prioridad) y `#actions` (botones + `FormSaveActions`). Estructura: breadcrumb arriba a la izquierda, luego `[icono de acción] Título` (el icono es `+` para crear y lápiz para editar, NUNCA un icono de la entidad) y, en edición, una segunda línea con `número • badge de estado` alineada bajo el título. Fondo siempre neutro (`bg-white dark:bg-gray-800`); el color solo va en los iconos y en los badges de estado. El número y el estado SOLO se muestran si el registro ya está guardado (`isEditMode`). El `title` explícito ("Nueva recepción", "Editar orden de trabajo") evita tener que derivar el género gramatical dentro del componente; si se omite se deriva como `Nueva <entity>` / `Editar <entity>`.
- Listados/paginación: `src/shared/components/EntityTable.vue` (columnas, slot scoped `#row="{ item, index }"`, paginación integrada `showPagination` + `previousUrl`/`nextUrl` + `@page-change`).
- Encabezado de las vistas de detalle (`*Detail.vue`): NO tiene componente propio a propósito (cada detalle necesita botones distintos). Se estandariza copiando a mano la misma estructura de `FormHeader.vue`: contenedor `p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700`; `<nav aria-label="Breadcrumb">` con `<span aria-hidden="true">/</span>` como separador y el último `<li>` en `text-gray-500 dark:text-gray-400`; luego `flex flex-wrap items-start justify-between gap-x-4 gap-y-3` con `[icono de acción] Título` a la izquierda (`text-lg sm:text-xl font-semibold leading-8`, icono `w-5 h-5` con `mt-1.5` y `text-primary-blue-500 dark:text-primary-blue-100`) y las acciones a la derecha (`ml-auto`, `gap-2`, `px-5 py-2.5 text-sm font-medium rounded-base`). En detalle el icono de acción es `FolderOpen` (la acción es ver el registro) y el título es solo el nombre de la entidad; el número va en la segunda línea en `font-mono text-sm` junto a `•` y los badges (`size="md"`). No poner el número dentro del `<h1>` ni una flecha de "volver" (la navegación la da el breadcrumb).
- Estados: `src/shared/components/Alert.vue` (props `type`, `title`, `message`, `dismissible`; emite `dismiss`). Toasts: `src/shared/composables/useToast.js`.
- Estado de una entidad: un `Estado<Entidad>Badge.vue` por módulo (`EstadoRecepcionBadge`, `EstadoInspeccionBadge`, `EstadoCotizacionBadge`, `EstadoOrdenBadge`), alimentado por `constants/estados<Entidad>.js`. No recrear badges de estado ad-hoc dentro de un componente.
- Guardado: `FormSaveActions.vue` (props `isLoading`, `isEditMode`, `cancelHref`, `onSubmit`, `disabled`).
- Confirmaciones de borrado: `ConfirmModal.vue` (no volver a crear modales de eliminar).
- Selectores con búsqueda: `ClienteSearchSelect`, `VehiculoSearchSelect`, `EmpleadoSearchSelect`, `CatalogoSelect`.
- Fotos: `ImageField` (base de una sola imagen: valida formato/tamaño, drag-and-drop, preview y zoom) y sus wrappers `PhotoUploadGrid` (colección con descripciones y persistencia API), `PhotoSlotGrid` (N vistas obligatorias) y `VehicleImageField` / `PersonImageField`; acciones de fila: `EntityActionButtons`.

## Paleta visual
- Tokens definidos en `@theme` de `src/style.css`: `primary-*` (azul, legacy Flowbite), `brand-*` (azul corporativo `#2B4352`), `accent-*` (rojo `#D9011B`).
- La migración de paleta está EN CURSO: los módulos aún mezclan `gray-*`/`primary-*`. Código nuevo debe usar `brand-*`/`accent-*`.

## Mejora de texto con IA (REUTILIZABLE)

Cualquier campo de texto libre (motivos, observaciones, notas, etc.) puede ofrecer el botón "Mejorar texto" sin duplicar lógica:

- **Componente**: `src/shared/components/TextImprover.vue` — usa `v-model` sobre el campo y un prop `contexto` (pista del tipo de campo). Soporta scoped slot (`mejorar`, `restaurar`, `mejorando`, `error`, `mejorado`, `tieneOriginal`) para colocar el botón y los mensajes donde se prefiera.
- **Endpoint backend**: `POST /api/core/mejorar-texto/` con `{ texto, contexto? }` → `{ mejorado }` (ver `src/shared/services/textImproverService.js`). Genérico y autenticado; no enviar datos personales del cliente (solo el texto del campo).
- **Contrato del campo mejorado**: la mejora reemplaza el contenido del campo y se conserva el original para "Restaurar"; el usuario debe revisar antes de guardar. Si falla, el mensaje de error se muestra inline **sin perder** el texto escrito.

## Estándar de modales Crear / Editar (CONTRATO ACORDADO)

Todas las entidades (clientes, proveedores, vehículos, empleados, talleres, etc.) deben **crear y editar desde un modal** reutilizable, no con redirección a pantallas `agregar/`/`editar/`. Al finalizar, el listado se recarga **sin recarga de página** (re-llamada al API).

Contrato obligatorio:

1. `crear` y `editar` se abren en un modal (ancho completo `max-w-full` o `max-w-*` amplio para formularios pesados).
2. **Fallo** → el modal permanece abierto, muestra `Alert` de error dentro del modal y conserva todos los datos ingresados; los errores de backend se mapean a los campos correspondientes.
3. **Éxito** → el modal se cierra, se muestra `Alert` de success en el listado y se recargan los datos **preservando el contexto** (búsqueda, página, filtros activos).
4. **Cerrar con cambios sin guardar** → confirmar antes de descartar (no perder datos).
5. **Clic fuera del modal** → NO cierra el modal (evita pérdida de datos).
6. Al refrescar tras el éxito, mantener la página y búsqueda; resaltar/focalizar opcionalmente la fila recién creada/editada.

### Notas de implementación
- Cerrar el modal solo por acciones explícitas del usuario: botón X, botón Cancelar (con confirmación si hay datos sin guardar), o tras guardado exitoso.
- En el `submit` del modal: `catch` → `errorMessage` dentro del modal + mapeo de errores; éxito → `emit('created' | 'updated', data)`; el padre cierra el modal, muestra alerta de success y recarga el listado preservando contexto.
- Formularios muy grandes (recepción, inspección, vehículo) usan modal a ancho completo para no sacrificar legibilidad.