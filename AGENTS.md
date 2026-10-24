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
- TODO el HTTP va por `src/shared/services/httpClient.js` (`request`): inyecta `Authorization` (el JWT lleva la empresa de la sesión; cambiar de empresa = nuevo token vía `select-company`) y `X-Taller-ID` (taller activo, leído de `localStorage`/`sessionStorage` con clave `gonmotor_taller_id`), auto-refresca el JWT y propaga errores en español. No usar `fetch` directo ni pasar `token`/`empresaId` por parámetro.
- Taller activo: el selector `src/shared/components/TallerSelect.vue` (icono, buscador debounced, máx. 5 visibles + «y N más») consulta `GET /api/auth/talleres/?search=` (solo talleres permitidos al rol/asignación). Se persiste con `authStore.setTaller({ id, nombre })`. En el login multiempresa los talleres llegan dentro de cada empresa de la respuesta de `/api/auth/login/`.
- Varios servicios conservan funciones legacy `fetch(token, empresaId, ...)` (ej. `recepcionesService.js`) — es código muerto, no extender ese patrón.
- `API_BASE_URL` se deriva del hostname en `src/shared/config/env.js`: localhost → `http://localhost:8000`, cualquier otro host → `https://gonmotor-api.onrender.com`.
- Composable para listados: estado `isLoading`/`errorMessage`/paginación `currentPage`+`nextUrl`+`previousUrl` (ej. `useClients.js`).

## Componentes compartidos (REUTILIZAR antes de crear)
- **Encabezado único de entidad** (listado, detalle y crear/editar): `src/shared/components/EntityHeader.vue` — props `mode` (`list` | `detail` | `edit` | `create`, default `list`), `breadcrumb` (`[{ label, href? }]`), `entity`, `title`, `recordNumber` e `icon` (componente; solo con `mode="list"`); slots `#badges` (estado/prioridad) y `#actions` (botones + `FormSaveActions`). Unifica el contenedor (`p-4 bg-white border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700`), el breadcrumb, `[icono] Título` y la línea secundaria `número • badges`. El icono representa la ACCIÓN, nunca la entidad (`create`→`FilePlusCorner`, `edit`→`FilePen`, `detail`→`FolderOpen`); en `mode="list"` es el icono de la entidad. El título se deriva de `entity` (`Nueva <entity>` / `Editar <entity>` / `<entity>`); usa `title` para mostrar el nombre propio del registro (p. ej. el nombre del cliente en un detalle). El número solo aparece si se pasa `recordNumber` y `mode !== 'create'`. **El `Alert` de los listados NO va dentro del componente: se renderiza justo debajo, fuera del contenedor con `border-b`, como `<div v-if="alert.message" class="px-4 pt-3"><Alert … /></div>`.**
- Listados/paginación: `src/shared/components/EntityTable.vue` (columnas, slot scoped `#row="{ item, index }"`, paginación integrada `showPagination` + `previousUrl`/`nextUrl` + `@page-change`).
- Filtros de listados: **se aplican al cambiar, sin botón "Buscar"**, con `src/shared/composables/useFiltrosReactivos.js` (`filtros` = borrador del panel, `busqueda`, `camposFecha` = refs a inputs con datepicker de Flowbite, `firma` y `aplicar`; devuelve `aplicarYa` para el Enter del buscador y `marcarAplicado` para llamar en "Limpiar" antes de recargar). El panel usa `FilterActions` con `:show-search="false"` (solo "Limpiar"). No pongas guardas `if (loading) return` en aplicar/limpiar: el composable del listado cancela la petición anterior (`createLatestRequest`). Excepción: Reportes conserva "Buscar" (consultas pesadas).
- Vistas de detalle (`*Detail.vue`): usan `EntityHeader` con `mode="detail"` (icono de acción `FolderOpen`). El título es el nombre propio del registro si existe (o la entidad como fallback) y el número va en `font-mono text-sm` junto a `•` y los badges (`size="md"`). Los botones propios (Editar, Reabrir, Generar orden, PDF…) van en el slot `#actions`. No añadir una flecha de "volver": la navegación la da el breadcrumb.
- Estados: `src/shared/components/Alert.vue` (props `type`, `title`, `message`, `dismissible`; emite `dismiss`). Toasts: `src/shared/composables/useToast.js`.
- Estado de una entidad: un `Estado<Entidad>Badge.vue` por módulo (`EstadoRecepcionBadge`, `EstadoInspeccionBadge`, `EstadoCotizacionBadge`, `EstadoOrdenBadge`), alimentado por `constants/estados<Entidad>.js`. No recrear badges de estado ad-hoc dentro de un componente. Para Activo/Inactivo de entidades simples (clientes, proveedores, talleres…) usar `src/shared/components/EstadoActivoBadge.vue` (prop `activo`; `femenino` para «Activa/Inactiva»).
- Historial de cambios de un documento: `HistorialCambios.vue` (props `endpoint` = `.../<id>/historial/`, `version` para recargar) va al final del `aside` del `*Detail.vue`, solo si `tieneAccion('historial_<recurso>')` de `usePermisos()`. Un guardado que hace varias peticiones (cabecera + líneas) va dentro de `enOperacion(async () => …)` de `httpClient.js` para que el historial lo agrupe.
- Indicadores del inicio: `modules/dashboard/components/KpiCard.vue` (tarjeta compacta: icono + título, cifra, línea de estado con punto `estado` = `neutro|ok|aviso|alerta`, `detalle` como tooltip e `ilustracion` inclinada en la esquina inferior derecha; con `href`, toda la tarjeta enlaza). Las ilustraciones son iconos lucide provisionales hasta tener los SVG propios.
- Guardado: `FormSaveActions.vue` (props `isLoading`, `isEditMode`, `cancelHref`, `onSubmit`, `disabled`).
- Confirmaciones de borrado: `ConfirmModal.vue` (no volver a crear modales de eliminar).
- Importación masiva desde Excel: `ImportWizardModal.vue` (asistente Prepara → Sube → Revisa → Listo; nada se guarda hasta confirmar en «Revisa»). Cada módulo pasa `config` (textos, columnas, reglas, cómo pintar una fila) y `servicio` (`descargarPlantilla`, `validar`, `importar`, `descargarErrores`); el backend debe aceptar `?validar=1` con el contrato de `gonmotor-api` («Importación masiva»). Ejemplo: `modules/clientes/constants/importacionClientes.js`.
- Editar / Eliminar de cada fila (columna «Acciones»): `EntityRowActions.vue` — props `entity` (singular, para `title`/`aria-label`), `showEdit`, `showDelete`, `deleteDisabled`; emite `edit` y `delete`. Renderiza solo los dos botones, sin contenedor: va dentro del `flex` de la celda junto a las demás acciones (reactivar, WhatsApp, `EntityActionsMenu`). No copiar los botones a mano.
- **Permisos en la UI (patrón «modo consulta»; referencia: módulo Clientes).** `usePermisos()` expone `puede(recurso, accion)`, `soloConsulta(recurso)`, `sinAcceso(recurso)` y `cargado`; en `onMounted` haz `await cargarPermisos().catch(() => {})` antes de pedir datos. Reglas:
  - Sin `ver`: el enlace del sidebar desaparece (`data-recurso`) y la página renderiza `SinAcceso.vue` (prop `seccion`) en lugar de su contenido, sin pedir datos.
  - Con `ver` sin `modificar`: se **ocultan** crear/editar/eliminar/reactivar/importar (nunca deshabilitarlos); `ModoConsultaChip.vue` (props `objeto`, `acciones`) va en el slot `#title-aside` de `EntityHeader`; en las filas, `EntityRowActions` con `:show-view="!puedeModificar"` y `view-href` a la ficha (o `@view` si no hay ficha) en lugar del lápiz. Sin página de ficha (repuestos, servicios), el modal de la entidad recibe `soloLectura`: título «Detalle de…», datos como texto con `FichaCampos.vue` (`campos: [{ etiqueta, valor, ancho? }]`) y solo el botón «Cerrar».
  - Sin banners ni candados ni textos tipo «tu rol no permite». Los estados vacíos no invitan a crear si no se puede.
  - Páginas `agregar/`/`editar/` sin `modificar`: `window.location.replace` a la ficha o al listado.
  - Restricciones por **estado** del registro (orden cerrada, cotización enviada) sí se muestran deshabilitadas con su motivo: son temporales.
- **Importación masiva desde Excel**: `ImportWizardModal.vue` (genérico) + un archivo de configuración por módulo (ej. `modules/clientes/constants/importacionClientes.js`) + `crearServicioImportacion(endpoint, nombre)` de `shared/services/importacionService.js` (las rutas `importar/`, `importar/errores/` e `importar/plantilla/` son iguales en todos los importadores del backend). El botón «Importar» va condicionado a `puede('<recurso>')`.
- Selectores con búsqueda: `ClienteSearchSelect`, `VehiculoSearchSelect`, `EmpleadoSearchSelect`, `CatalogoSelect`, `TallerSelect`. `CatalogoSelect` reabre sus opciones al escribir y cancela el cierre diferido al recuperar el foco. Para proveedores de subcontratos, reutilizar `modules/ordenes/components/ProveedorSubcontratoSelect.vue` (consulta debounced por nombre/identificación y permiso `proveedores/ver`).
- Fotos: `ImageField` (base de una sola imagen: valida formato/tamaño, drag-and-drop, preview y zoom) y sus wrappers `PhotoUploadGrid` (colección con descripciones y persistencia API), `PhotoSlotGrid` (N vistas obligatorias) y `VehicleImageField` / `PersonImageField`; acciones de fila: `EntityActionButtons`.
- Imágenes: `ImageField` comprime en el navegador antes de subir (`src/shared/utils/imagenes.js`) según su prop `perfil` (`evidencia`, `vehiculo`, `repuesto`, `avatar`, `logo`). Formatos, peso máximo y tamaños salen del backend (`GET /api/core/limites-imagenes/`, `src/shared/services/imagenesService.js`): **no escribir límites ni formatos a mano** (`maxSize`/`allowedTypes` solo para casos excepcionales). Las casillas y galerías muestran `miniatura` (`thumbUrl`, `loading="lazy"`) y el zoom la `imagen` completa. Las fotos nuevas de `PhotoUploadGrid` envían un `id` generado en el navegador para que un reintento no las duplique.

## Paleta visual
- Tokens canónicos en `@theme` de `src/style.css`; espejo en JS (`BRAND`) en `src/shared/config/branding.js` para canvas/SVG (ECharts, FullCalendar). Al cambiar la paleta hay que actualizar AMBOS.
- `brand-*` = **navy profundo** de estructura (`900 #0F2140`, `800 #172C52`, `700 #1F3A68`, `500 #445F8C`…): sidebar, panel del login, títulos y textos de marca. No es el color de los botones.
- `primary-*` (y su alias `primary-blue-*`) = **azul de acción** (`700 #244A8F`, `800 #1E3C73` hover, `300 #8FB0E6` anillo de foco, `50 #EFF4FC` fondos suaves). Es el único color de botón primario: `bg-primary-700 hover:bg-primary-800 focus:ring-primary-300 dark:bg-primary-600 dark:hover:bg-primary-500`. Los tokens de Flowbite (`bg-brand`, `focus:ring-brand`, `text-fg-brand`) apuntan a esta misma escala.
- `gray-*` está remapeado a **neutros fríos** (`50 #F5F7FA` … `200 #DFE5ED` bordes, `500 #6B778C` texto secundario, `900 #141C2C`); los tokens neutros de Flowbite (`bg-neutral-*`, `border-default`, `text-heading`, `text-body`) derivan de ellos.
- `accent-*` = **Rojo Gonmotor**, el único rojo de marca: `accent-500 #C8102E` sobre fondos claros y `accent-400 #FF4D63` solo sobre navy/oscuro (sidebar, panel del login, modo oscuro: `text-accent-500 dark:text-accent-400`). Nunca coral sobre blanco ni `accent-500` sobre navy. **Nunca en botones de crear o guardar**: solo logo, indicador activo del sidebar, asterisco de obligatorio y detalles de marca.
- Semánticos: `info #2563EB`, `success #16A34A`, `warning #D97706`, `danger #DC2626` (`danger`/`red-*` solo para errores y acciones destructivas).
- **Radios** (`style.css`): `rounded`, `rounded-md`, `rounded-lg` y `rounded-base` = 8 px (botones, campos y tarjetas), `rounded-xl` = 12 px (tarjetas destacadas y modales). `rounded-full` solo para avatares, puntos y chips, nunca para botones de texto.
- **Campos** (input, select, textarea, buscadores `*SearchSelect`/`CatalogoSelect`): fondo `bg-white dark:bg-gray-700`, borde `border-gray-300` (o `border-default-medium`), `p-2.5 text-sm`, foco `focus:ring-primary-*`/`focus:border-primary-500`. Error: `bg-red-50 border-red-500`. Sin rellenos grises.
- Pantallas de acceso (login, recuperar, restablecer): mismo azul de acción y radio 8 px que la app; el rojo queda para errores y detalles de marca.
- Botón secundario: blanco con borde neutro (`bg-white border border-gray-300 text-gray-900 hover:bg-gray-100`); navegación entre pasos «Siguiente: …» con borde `primary`; ambos con el mismo radio que el primario.

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
- Cabecera: siempre `ModalCabecera.vue` (props `icono`, `titulo`, `subtitulo`; emite `cerrar`; slot `#titulo` para badges junto al título). Rejilla de plano y tres piezas en línea azul (llave inglesa, engranaje, bujía), sin rojo; las piezas solo aparecen si el modal es ancho y el subtítulo se oculta en móvil. No volver a escribir cabeceras de modal a mano. Los formularios largos (clientes, vehículos, repuestos, servicios) usan `compacto` (menor alto); sus fotos van con `aspect="wide"` (2:1) en `ImageField`/`VehicleImageField`.
- Avisos dentro del modal: **uno a la vez**. Se renderizan con `v-if`/`v-else-if` y un `watch` descarta el anterior cuando aparece uno nuevo (p. ej. «Cambios sin guardar» limpia `errorMessage` y viceversa).

## Uso móvil en el patio (RF-09)

- Los montajes de Recepciones, Inspecciones y Órdenes añaden `patio-screen` al placeholder. `src/patio-mobile.css` adapta solo esas islas por debajo de 640 px: campos de 16 px, botones de al menos 44 px, cabeceras apiladas y tablas en bloques con etiquetas.
- `EntityTable` acepta `mobileCards` (opt-in). Cada `td` del slot `#row` debe llevar `data-label` con el nombre de su columna. Las fichas usan `mobile-records`; la edición de líneas de OT usa `mobile-work-edit`. Se conservan los encabezados para tecnologías de asistencia y las columnas ocultas por breakpoint.
- Los campos de cantidad/horas duplicados para móvil llevan un ID terminado en `-mobile`; al seleccionar catálogo, `focusInput` enfoca la variante visible. No enfocar un input oculto.
- Al modificar estas pantallas, revisar listado, alta, edición y ficha a 390 px, todas las pestañas, claro/oscuro y escritorio. Incluir descripciones largas, líneas de servicio/repuesto y selección de fotos; comprobar también scroll interno de tablas (no basta medir el ancho del documento).

## Productividad y comisiones (RF-15)

- `ProductividadView.vue` reutiliza EntityHeader, EntityTable, TallerSelect, Alert y SinAcceso. Conserva «Buscar» para aplicar filtros del reporte; `createLatestRequest` descarta respuestas obsoletas. Solo consulta tras cargar y comprobar `reportes/ver`.
- Las filas usan `data-label` y `mobileCards`, con estilos móviles locales al reporte (no depende de `patio-screen`). Las definiciones de cálculo vienen de la API, incluida la advertencia del porcentaje actual aplicado al histórico.
- `EmpleadoModal.vue` gestiona el porcentaje por empresa con el contrato normal de alta/edición, errores por campo y confirmación de descarte. Requiere API RF-15 y migración `authentication/0022` antes del frontend.

## Garantías (RF-16)

- Reutilizar `modules/ordenes/components/GarantiasVehiculo.vue` para avisar coberturas de un vehículo: props `vehiculoId`, `kilometraje`; emite `cargado` con `garantias` y `ordenes_origen`. Consulta por `ordenesService`/httpClient, debounce de 300 ms y cancelación. Errores inline; nunca interpreta la falta de respuesta como ausencia confirmada de cobertura.
- `ServicioModal` gestiona los días/km del catálogo con el contrato habitual de errores y descarte; `OrdenEdit` guarda las condiciones por línea y las incluye en la versión comercial de adicionales. Días/km en 0 no deben reponerse automáticamente con el catálogo al editar una línea existente.
- En una OT de garantía el precio y descuento al cliente son 0 y los costos permanecen editables. Las copias y selecciones de catálogo se normalizan también antes de guardar. La garantía original se elige entre OT entregadas accesibles del mismo vehículo; no se extiende con la nueva reparación.

## Despacho desde edición y caja vinculada

- `OrdenEdit.vue` reutiliza `DespachoRepuestoModal`; no crea un flujo paralelo de inventario. Mantener la copia `guardada` por repuesto: el modal opera con datos persistidos, no con borradores. No recargar toda la OT al despachar/devolver: actualizar solo almacén/aprobación para no perder cambios de cabecera u otras líneas. Despachar exige línea guardada y aprobada; devolver permite corregir cantidades antes de guardar. Convertir cantidades de almacén a Number al aplicar respuestas.
- Egresos de compras: el campo `anulable_desde_caja=false` oculta la acción de anular en Caja; la operación se realiza desde Compras, donde se revierte también el pago. Mostrar la aclaración de caja abierta/efectivo suficiente en compras de contado en efectivo.
- Excel del resumen usa httpClient y las utilidades de descarga, con filtros activos y errores inline. Mantiene el PDF existente.
