# AGENTS.md — GonMotor UI

Convenciones y estándares del proyecto.

## Stack
- Frontend: Vue 3 (`<script setup>`) + webpack. Build: `NODE_ENV=production npx webpack --mode=production --config ./webpack.config.js`.
- Backend: Django separado en `gonmotor-api/`. El backend maneja el término **Taller**; el frontend usa **Taller** en todo el texto visible (una sucursal = un taller).
- Paginación y tablas de listado: usar el componente reutilizable `src/shared/components/EntityTable.vue` (slots scoped `#row="{ item, index }"`, `@page-change`).
- UI de estados: componente `src/shared/components/Alert.vue` (props `type`, `title`, `message`, `dismissible`; emite `dismiss`).

## Mejora de texto con IA (REUTILIZABLE)

Cualquier campo de texto libre (motivos, observaciones, notas, etc.) puede ofrecer el botón "Mejorar texto" sin duplicar lógica:

- **Componente**: `src/shared/components/TextImprover.vue` — usa `v-model` sobre el campo y un prop `contexto` (pista del tipo de campo). Soporta scoped slot (`mejorar`, `restaurar`, `mejorando`, `error`, `mejorado`, `tieneOriginal`) para colocar el botón y los mensajes donde se prefiera.
- **Endpoint backend**: `POST /api/core/mejorar-texto/` con `{ texto, contexto? }` → `{ mejorado }`. Genérico y autenticado; no enviar datos personales del cliente (solo el texto del campo).
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
