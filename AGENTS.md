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
- Listados/paginación: `src/shared/components/EntityTable.vue` (columnas, slot scoped `#row="{ item, index }"`, paginación integrada `showPagination` + `previousUrl`/`nextUrl` + `@page-change`).
- Estados: `src/shared/components/Alert.vue` (props `type`, `title`, `message`, `dismissible`; emite `dismiss`). Toasts: `src/shared/composables/useToast.js`.
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