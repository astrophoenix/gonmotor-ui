# Auditoría de Identidad Visual — Gonmotor (UI/UX)

> Fecha: 2026-09-13 · Solo lectura: no se modificó ningún archivo durante la auditoría.

---

## 1. Resumen Ejecutivo

El frontend Gonmotor combina **Hugo (SSG)** para layout/navbar/sidebar y **Vue 3 islands** para pantallas CRUD, sobre **Tailwind CSS v4** (`@theme` en CSS) y **Flowbite 3**. Conviven **tres familias de color "primario"** sin unificar:

1. **`primary` / `brand`** (gris-pizarra azulada `#2B4352`) → sidebar, logo, textos de enlace, switchs, algo de botones viejos. `primary` y `brand` son **escalas duplicadas con los mismos valores**.
2. **`primary-blue`** (`#2461bf`) → botones de acción principal en los módulos nuevos (auth, clientes, recepciones, cotizaciones… ~21 archivos).
3. **`blue` por defecto de Tailwind** (`text-blue-600`, `border-blue-600`) → pestañas subrayadas de `RecepcionEdit.vue` y `ring-blue-300` en algunos checks.

Gráficos ApexCharts usan `#1A56DB` (azul Flowbite), distinto de ambos. Los estados usan la semántica Tailwind (green/red/yellow/blue) correctamente. Dark mode **está implementado y es funcional** (`@custom-variant dark`, miles de clases `dark:*`, toggle en navbar). La base visual es consistente en inputs (`p-2.5 bg-gray-50 border-gray-300 rounded-lg`), cards (`bg-white rounded-lg`), modales custom y toasts. El resultado visible es **"casi estándar, con 3 azules que se pelean"**.

**Recomendación**: unificar a **un solo primario azul (`#2563EB`)**, **sidebar azul marino (`#0F2747`)**, semántica success/warning/danger y fondo `#F8FAFC` + cards blancas, con **alias de tokens** para migración incremental sin regresiones.

---

## 2. Stack y configuración visual

| Área | Valor actual | Nota |
|---|---|---|
| CSS engine | Tailwind **v4** (`@tailwindcss/postcss`) vía `@tailwindcss/postcss` en postcss.config.js | `tailwind.config.js` es legacy (v3): ya no se lee a menos que exista `@config "…"` en el CSS. **No está referenciado → inactivo.** |
| Tokens de color | `src/style.css` → bloque `@theme` | Fuente activa real de la paleta. |
| Dark mode | `@custom-variant dark (&:where(.dark, .dark *))` en style.css + toggle en navbar (`dark-mode.js`) + script inline en `header.html` (localStorage `color-theme`) | `baseof.html` trae `class="dark"` hardcodeado en `<html>` (FOUC puntual antes del script). |
| Plugins | `@plugin "flowbite/plugin"` + `@source flowbite` y `flowbite-datepicker` | Flowbite CSS utilities + JS (`import 'flowbite/dist/flowbite.js'` en `index.js`, sin `initFlowbite` explícito). |
| Icons | `lucide-vue-next` (49 usos), `@tabler/icons-vue` (3: PDF/XLS), `@mdi/js`+`MdiIcon.vue` (solo testigos) | 3 librerías + SVG inline heredado del navbar. |
| Tipografía | Inter (Google Fonts, 300–800) vía `--font-sans`/`--font-body` | |
| Build | Webpack 5: `static/app.bundle.js` + `static/app.css` (MiniCssExtract); Hugo sirve ambos en `:1313` | Nunca editar artefactos a mano. |
| Tablas listado | `src/shared/components/EntityTable.vue` (reusable) + `simple-datatables@9` (páginas demo heredadas con `#default-table`) | |
| Charts | `src/charts.js` ApexCharts colores `#1A56DB`, `#FDBA8C`, `#17B0BD` | No coincide con la paleta de la app. |

---

## 3. Paleta actual (tokens `@theme` en `src/style.css`)

| Token | #50 | #100 | #200 | #300 | #400 | #500 | #550 | #600 | #700 | #800 | #900 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `primary` | f2f5f7 | e1e7eb | c5d1d9 | 9fb5c2 | 6b8b9b | **2B4352** | — | **213440** | 192630 | 121920 | 0c1014 |
| `primary-blue` | f0f5fb | dce6f6 | b8ccec | 8eb3e2 | 6499d8 | **2461bf** | — | 1d4f9f | 173d80 | 112b61 | 0a1942 |
| `brand` | f2f5f7 | e1e7eb | — | — | 3d5a6b | **2B4352** | 274f63 | **213440** | 192630 | — | — |
| `accent` | fef2f2 | fee2e2 | — | — | **ef4444** | **D9011B** | — | b50116 | — | — | — |
| `gray-workshop` | `#C6CCD4` (clase propia `.gray-workshop`) | | | | | | | | | | |
| Fonts | `--font-sans/_body` = Inter; `--font-mono` = ui-monospace | | | | | | | | | | |

- `primary` y `brand` son **la misma escala duplicada** (500/600/700 idénticos). `primary-blue` es la escala azul "oficial" de los módulos nuevos.
- `brand-550` y `primary-blue` **solo existen en `@theme`** (prueba de que la config legacy no aplica: `tailwind.config.js` no incluye `brand-550`).

---

## 4. Componentes Flowbite usados

| Componente | Mecanismo | Dónde | Estado visual |
|---|---|---|---|
| Toggles (collapse) | `data-collapse-toggle` (11 usos en sidebar) | `sidebar.html` (dropdowns operación/inventario/configuración…) | OK, funciona |
| Dropdowns | `data-dropdown-toggle` (37 usos) | navbar notificaciones, idioma, user-menu, filtros | Heredado demo (contenido "Bonnie Green…") |
| Tabs (legacy) | `data-tabs-toggle`/`data-tabs-target` (9 usos) | páginas demo/lista | Solo demo |
| Tooltips | `data-tooltip-target` (3) | bottom-menu sidebar, navbar | Demo |
| Modales HTML | `data-modal-target`/`data-modal-toggle` (3) | `content/crud/users.html` (demo admin) | Flowbite estándar |
| **Modales Vue** | **Custom** (`v-if` + `fixed inset-0 z-50` + overlay `bg-black/50`) | ConfirmModal, login empresas, ClientModal, VehicleModal, motivos… | Custom, conforme al contrato AGENTS.md (no cierra con clic fuera) |
| **Pestañas RecEdit** | **Custom** (`activeTab` + `border-b-2`, azul `text-blue-600`) | `RecepcionEdit.vue` (inspección/evidencias/autorización) | Custom, NO Flowbite |
| Toasts | Custom (`useToast` + `ToastContainer.vue`, scoped transitions) | Listados, exports | OK |
| Tablas | `EntityTable.vue` custom + simple-datatables en demo | Listados CRUD | Custom |
| Autocompletes | Custom (ClienteSearchSelect, CatalogoSelect) | Recepción | Custom |

**Hallazgo**: las pantallas modernas no usan modales/tabs de Flowbite sino componentes custom; Flowbite queda solo en sidebar/navbar/demo. Riesgo bajo de acoplamiento.

---

## 5. Clases Tailwind de color (frecuencia sobre 129 archivos `.vue`+`.html`)

**bg-** (top):

| Clase | # | Clase | # |
|---|---|---|---|
| bg-gray-700 | 812 | bg-brand-550 | 96 |
| bg-gray-100 | 425 | bg-primary-700 | 93 |
| bg-white | 379 | bg-brand-600 | 67 |
| bg-gray-50 | 370 | bg-gray-200 | 65 |
| bg-gray-800 | 289 | bg-primary-600 | 64 |
| bg-gray-600 | 255 | bg-primary-800 | 44 |
| bg-red-50 | 113 | bg-black | 43 |
| bg-red-100 / green-100 | 37 / 36 | bg-primary-blue-600 | 28 |
| bg-gray-900 | 48 | bg-primary-blue-700/500/50 | 17/17/20 |

**text-**: white 1970 · gray-400 1139 · gray-900 1113 · gray-500 822 · gray-700 226 · red-500 223 · gray-300 196 · red-600 158 · primary-600 146 (pizarra) · gray-600 122 · primary-blue-700 25 · green-400 84 · primary-500 91 · primary-700 89 · blue-600 16.

**border-**: gray-300 445 · gray-600 416 · gray-200 307 · red-500 198 · gray-700 196 · primary-500 172 (pizarra) · border-b 77 · border-dashed 69 · primary-blue-700/400 14/12.

**ring-** (focus): ring-4 205 · ring-primary-500 199 · ring-primary-300 126 (pizarra) · ring-primary-800 43 · ring-primary-600 41 · ring-offset 39 · ring-primary-blue-300 24 · ring-primary-blue-800 4.

**dark:***: dark:text 1053 · dark:bg 341 · dark:hover:bg 274 · dark:border 253 · dark:hover:text 183 · dark:focus:ring 114 · dark:placeholder 45 · dark:focus:border 43 · dark:divide 38.

**Tokens brand/accent**: 96× `bg-brand-550`, 67× `bg-brand-600`, 6× `bg-brand-500`, `text-brand-300/500`, `text-accent-500/400` → **solo sidebar + logo**.

**Conclusión de frecuencia**: fondo e inputs = grays estándar; semántica = red/green/yellow en chips y estados; la discordancia está en `primary` (pizarra, 90+ en acciones/focus) vs `primary-blue` (azul, botones nuevos) vs `blue-600` (pestañas).

---

## 6. Sidebar (`layouts/partials/sidebar.html`)

- Estructura: `<aside id="sidebar">` fijo, `w-64`, `hidden lg:flex`; colapsable en desktop a **4rem** (`html.sidebar-collapsed`, toggles en `sidebar.js`; el CSS de colapso/tooltips/flyout vive en `style.css`).
- Fondo: **`bg-brand-500` (pizarra `#2B4352`) tanto en light como en dark** (`dark:bg-brand-500`); items `text-white`, hover `bg-brand-550` (`#274f63`), activo `bg-brand-600` (`#213440`).
- Logo: imagen mecánico + wordmark "**gon**" (`text-brand-500`) + "**motor**" (`text-accent-500` = rojo `#D9011B`).
- Grupos: operación/citas·recepción·inspecciones·cotizaciones·órdenes, inventario (repuestos·servicios), clientes/proveedores/vehículos/notificaciones/empleados, configuración (empresa·talleres·usuarios·roles).
- **El usuario pidió explícitamente NO modificar este archivo**; solo se documenta.

---

## 7. Botones y acciones

| Variante | Clases típicas | Dónde |
|---|---|---|
| Primario **azul** | `bg-primary-blue-500 hover:bg-primary-blue-600 focus:ring-4 focus:ring-primary-blue-300 text-white font-semibold px-5 py-2.5 rounded-lg` | `FormSaveActions.vue` (Guardar), `EntityActionButtons` (Agregar, px-3 py-2), LoginForm, modales crear/editar |
| Primario **pizarra** | `bg-primary-600/700 hover:bg-primary-700/800 … dark:bg-primary-600/700` | ConfirmModal variante `primary`, RegisterForm, ImportExcelModal, EmpresaView, EnviarRecordatorioModal, EmployeeEdit/Modal, "Ingresar" del modal de empresas |
| Danger | `bg-red-600 hover:bg-red-700 focus:ring-red-300` | ConfirmModal `danger`, "Confirmar no aceptación" (RecEdit) |
| Success | `bg-green-600 hover:bg-green-700` | ConfirmModal `success` |
| Outline ticket | `border + color`, hover bg suave; PDF `text-red-600 border-red-600 hover:bg-red-50`; Excel `text-emerald-600 border-emerald-600 hover:bg-emerald-50`; azul `border-primary-blue-700 text-primary-blue-700 hover:bg-primary-blue-50` | EntityActionButtons, "Mejorar texto", ClienteSearchSelect |
| Ghost/Cancelar | `bg-white border-gray-300 text-gray-900 hover:bg-gray-100` (FormSaveActions/RecEdit); `bg-gray-200 hover:bg-gray-300` (login modal) | Bordes de formularios/modales |
| Icon button | `text-primary-700 border-primary-700 rounded-full hover:bg-primary-100` (paginación EntityTable) | Pagination |
| Switch | `peer-checked:bg-primary-600` (pizarra) | toggle "Ingresó en grúa", testigos |

**Inconsistencia**: el mismo rol "acción primaria" usa azul o pizarra según módulo; cancelar tiene 2 estilos (blanco-borde vs gris-200).

---

## 8. Estados y badges

Chip estándar: `inline-block px-2 py-1 rounded-full text-xs font-medium` con colores semánticos y dark.

- **Firma (RecepcionesList, `getEstadoFirmaBadge`)**: ACEPTADA → `bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`; NO_ACEPTADA → red; PENDIENTE → yellow.
- **Estado recepción (`getEstadoBadge`)**: Con cotización → yellow; Convertida a OT → green; Con diagnóstico → `bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`; Sin diagnóstico → gray.
- **Alertas (`Alert.vue`)**: info/success/warning/error con `*-50` bg + `*-800` texto (dark: gray-800 bg + color claro).
- **Toasts**: `bg-green-50/red-50/blue-50` + `border-*-200`.
- Inspecciones (estado firmado) y Recordatorios repiten el mismo patrón chip semántico.
- `TestigosTablero` usa `@mdi/js` con estados color por testigo.

**Semántica correcta y homogénea** en estados; es la parte más sana del diseño.

---

## 9. Inputs y formularios

- **Patrón estándar**: `block w-full p-2.5 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-<C> focus:border-<C>` donde `C` = `primary-300/500` (pizarra) en la mayoría; `focus:ring-4` extra en algunos modales.
- **Con icono prefijo**: `ps-9/pl-10` + icono absoluto (login, navbar search).
- **Estado error** (VehicleModal y modales): `bg-red-50 border-red-500 text-red-900 placeholder-red-700 dark:…`.
- **Selects**: `p-2.5 bg-gray-50 border-gray-300`; CSS global: `select option` bg `#f9fafb`/text `#111827` (dark `#374151`/white), `option:checked` usa `--color-primary-600` (**pizarra**, quedará azul marino al seleccionar).
- **Toggle**: `sr-only peer` + `w-11 h-6` + `peer-checked:bg-primary-600` (pizarra).
- **Checkbox**: `w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300` (login) o `ring-blue-300` en algunos.
- Autocompletes custom (ClienteSearchSelect/CatalogoSelect) usan el mismo input base + dropdown `absolute z-10` con debounce 250ms.

**Inconsistencia**: el focus ring de inputs es pizarra mientras los botones son azules → doble "color de atención".

---

## 10. Cards, tablas, tabs y modales

- **Cards**: shortcode `card.html` → `bg-white rounded-lg shadow p-4 sm:p-6 xl:p-8 dark:bg-gray-800` (**sin borde**); las cards nuevas de RecEdit → `rounded-lg border border-gray-200 shadow-sm` (**con borde** + `shadow-sm`). Dos convenciones conviven; la nueva (borde+sombra suave) es la que se recomienda generalizar.
- **Tablas**: `EntityTable.vue` → `table-fixed divide-y`, `thead bg-gray-200 uppercase` (dark:gray-900), `tbody bg-white`, paginación `sticky bottom-0` con botones círculo pizarra. Demo heredado: simple-datatables.
- **Tabs**: RecEdit → custom `border-b-2`, activo `text-blue-600 border-blue-600` (blue default) — **desalineado del primario de la app**.
- **Modales**: custom `fixed inset-0 z-50` + overlay `bg-black/50` (confirm `bg-black/50`; login empresas `bg-gray-900/75 backdrop-blur-sm` — 2 overlays distintos); cards `max-w-md`/formularios `max-w-full` (contrato AGENTS). Clic fuera cerrado (ConfirmModal) pero bloqueado en modales de formulario por contrato.

---

## 11. Iconografía

- Predominante **lucide-vue-next** (w-4~6 h-4~6, `text-gray-500`, color semántico para estados).
- `@tabler/icons-vue` solo PDF/XLS; `@mdi/js`+`MdiIcon.vue` solo testigos de tablero; SVG inline heredado (navbar hamburguer/search/bell, check icon).
- Librerías separadas = mantenimiento menor, no confusión visual (tamaño/estilo stroke parejo).

---

## 12. Inconsistencias (resumen priorizado)

| # | Inconsistencia | Impacto visual |
|---|---|---|
| 1 | **3 primarios** (pizarra `#2B4352` / azul `#2461bf` / blue-600 default) en acciones, focus rings, tabs, switchs | Alta: marca "inacabada" |
| 2 | `primary` y `brand` duplicados exactos | Mantenimiento confuso |
| 3 | `tailwind.config.js` legacy inactivo vs `@theme` activo | Docker de origen de paleta |
| 4 | Cards: con borde (`shadow-sm`) vs sin borde (`shadow`) | Media: recambio visual |
| 5 | Cancelar: 2 estilos (blanco-borde / gray-200) | Baja-media |
| 6 | Charts `#1A56DB`/`#FDBA8C` vs paleta app | Media (dashboard) |
| 7 | Overlay modal: `bg-black/50` vs `bg-gray-900/75 backdrop-blur` | Baja |
| 8 | `option:checked` con pizarra | Baja |
| 9 | Iconos 3 librerías + inline | Baja |
| 10 | FOUC dark (`class="dark"` hardcodeada en baseof) | Baja |
| 11 | Filtros/estado de listados usan chips propios de `getEstadoBadge` no centralizados (había backups viejos duplicando lógica) | Baja-media |
| 12 | Sidebar fija pizarra aunque el primario sea azul | Alta (es la decisión de marca principal) |

---

## 13. Nueva paleta recomendada (HEX)

| Rol | Token propuesto | HEX | Uso |
|---|---|---|---|
| Primos (acciones/focus/enlaces) | `primary-600` | `#1D4ED8` | hover/focus fuerte |
| | `primary-500` | `#2563EB` | base acciones |
| | `primary-400` | `#60A5FA` | hover claro/texto sobre oscuro |
| | `primary-100` | `#DBEAFE` | fondos/sombra hover |
| Sidebar | `sidebar` (nuevo) | `#0F2747` | fondo sidebar |
| | `sidebar-hover` | `#1B3A5F` | hover item (≈ brand-550) |
| | `sidebar-active` | `#16304F` | item activo (≈ brand-600) |
| Éxito | `success-*` | `#10B981` (bg `#ECFDF5`) | badges, confirm success |
| Advertencia | `warning-*` | `#F59E0B` (bg `#FFFBEB`) | pendientes, con cotización |
| Error/danger | `danger-*` | `#EF4444` (bg `#FEF2F2`) | errores, eliminar, sin firma |
| Info | `info` | `#2563EB` (bg `#EFF6FF`) | con diagnóstico |
| Neutros | background/fondo | `#F8FAFC` | main, body |
| | text | `#1E293B` | texto principal |
| | text secondary | `#64748B` | texto secundario |
| | border/divider | `#E2E8F0` | bordes, dividers |
| | disabled | `#94A3B8` | estados disabled |
| Tipografía | Inter | — | se mantiene |

Reglas: sustituir **primario** de TODA acción/focus/enlace/switch/pestaña por la escala azul; **sidebar** pasa a azul marino; **accent rojo** reduce su rol a logo/marca o se convierte en `#2563EB` para un logo monocromático azul (recomendado para SaaS B2B). Fondos de formularios siguen en gris claro + cards blancas (solo borde `#E2E8F0`+`shadow-sm`).

---

## 14. Mapeo ACTUAL → PROPUESTO

| Clase actual | Valor actual | Clase propuesta | Valor propuesto |
|---|---|---|---|
| `bg-primary-500/600/700` (acciones/focus/switch, pizarra) | 2B4352/213440/192630 | `bg-primary-500/600/700` (escala azul) | 2563EB/1D4ED8/1E40AF |
| `ring-primary-300/500` (focus inputs) | pizarra | `ring-primary-400/500` | 60A5FA/2563EB |
| `text-primary-500/600/700` (enlaces) | pizarra | `text-primary-600/700` | 1D4ED8/1E40AF |
| `text-blue-600/border-blue-600` (tabs activo) | blue default | `text-primary-600 border-primary-600` | 1D4ED8 |
| `bg-brand-500` (sidebar) | 2B4352 | `bg-sidebar` | 0F2747 |
| `hover:bg-brand-550` / `bg-brand-600` | 274f63 / 213440 | `hover:bg-sidebar-hover` / `bg-sidebar-active` | 1B3A5F / 16304F |
| `bg-primary-blue-500/600/300` (botones nuevos) | 2461bf/1d4f9f/8eb3e2 | `bg-primary-500/600` + `ring-primary-300` | 2563EB/1D4ED8/93C5FD |
| `bg-accent-500` (wordmark "motor") | D9011B | opcional: `text-primary-500` | 2563EB |
| Charts `#1A56DB` / `#FDBA8C` / `#17B0BD` | Flowbite | `#2563EB` / `#F59E0B` / `#10B981` | — |
| `select option:checked` | `--color-primary-600` (pizarra) | `--color-primary-600` (azul) | 1D4ED8 |
| `bg-gray-50` fondo | light F9FAFB | `bg-gray-50` (o `#F8FAFC`) | — |
| `option` bg (style.css) | f9fafb / 374151 (dark) | se mantiene (solo cambia el valor de `checked`) | — |

Para migrar **sin regresiones**: durante la transición mantener **alias** en `@theme`, p. ej. `--color-primary-blue-500: var(--color-primary-500)` y `--color-brand-500: #0F2747`… así las clases existentes siguen renderizando mientras se sustituyen módulo a módulo.

---

## 15. Componentes a modificar (Vue)

- `src/style.css` (tokens `@theme` + alias): **la palanca central**.
- `src/shared/components/FormSaveActions.vue` y `EntityActionButtons.vue` (usar tokens nuevos; ya son azules → solo renombrar a `primary-*`).
- `src/shared/components/ConfirmModal.vue` (variantes a semántica success/warning/danger + overlay unificado).
- `src/shared/components/EntityTable.vue` (thead/paginación a primario azul; borde/sombra card).
- `src/shared/components/Alert.vue` y `ToastContainer.vue` (alinear tons 50/200 a la semántica propuesta).
- `src/modules/recepciones/components/RecepcionEdit.vue` (tabs → `primary`, focus rings inputs → azul, switch grúa → azul) — **es el patrón de referencia**.
- Otros módulos con pizarra en acciones: `RegisterForm.vue`, `ClientEdit.vue`, `ImportExcelModal.vue`, `EmpresaView.vue`, `TallerModal.vue`, `EmpleadoEdit/Modal.vue`, `InspeccionDetail.vue`, `InspeccionesList.vue`, `EnviarRecordatorioModal.vue`, `RecordatoriosPanel.vue`, `RecepcionesList.vue`, `LoginForm.vue` (solo el "Ingresar" del modal).
- `src/charts.js` (paleta charts).
- **Nuevos componentes sugeridos** (para no duplicar): `AppButton.vue` (variantes), `AppTabs.vue`, `AppCard.vue`, `FieldInput.vue`, y mover el mapa de badges `getEstadoBadge` a `src/shared/utils/`. Implementar `useToast` full (pendiente en CLAUDE.md).

---

## 16. Archivos a modificar (rutas completas)

- `gonmotor-ui/src/style.css` — tokens `@theme`, alias, ajustes `option:checked` y overlays.
- `gonmotor-ui/src/shared/components/{FormSaveActions,EntityActionButtons,ConfirmModal,EntityTable,Alert,ToastContainer}.vue`
- `gonmotor-ui/src/shared/components/{ClienteSearchSelect,CatalogoSelect,TextImprover,VehicleImageField,PhotoUploadGrid}.vue` (si se propone renombrar `primary-blue`→`primary` de forma global: vía alias, sin tocar).
- `gonmotor-ui/src/modules/*/components/*.vue` listados en la sección 15 (los que tengan pizarra/tabs-azul).
- `gonmotor-ui/src/charts.js`
- `gonmotor-ui/layouts/partials/navbar-dashboard.html` (reemplazar el demo de notificaciones "Bonnie Green…", iconos heredados) — opcional.
- `gonmotor-ui/layouts/_default/baseof.html` (quitar `class="dark"` hardcodeada para evitar FOUC) — opcional/minor.

---

## 17. Archivos que NO modificar

- **`layouts/partials/sidebar.html`**: el usuario lo pidió explícitamente. Cualquier cambio de paleta del sidebar se coordinará en una segunda fase autorizada.
- `static/app.bundle.js`, `static/app.bundle.js.map`, `static/app.css`… (artefactos de build; se regeneran con webpack, jamás a mano).
- `_gh_pages/` y demás salidas de build.
- Backend `gonmotor-api/` (sin UI).
- Backups heredados `RecepcionEditBackup.vue` / `RecepcionEditOld.vue` (no tocar; candidatos a borrado separado).
- Assets públicos (`static/images/`, favicons, manifest, `mechanic_logo_icon.svg` salvo decisión de marca).
- `content/*` páginas demo Flowbite (candidatas a limpieza en P2, no urgente).

---

## 18. Plan P0 / P1 / P2

**P0 — Unificación primaria (riesgo medio, impacto alto, se hace con alias para no romper):**
1. Editar `@theme`: nueva escala `primary` azul (`#2563EB` base) + **alias** `primary-blue-*` → `primary-*`; `brand`/`accent` dejados como están salvo alias; ajustar `option:checked`.
2. Rebuild webpack + verificación visual: login, recepción (editar/listar), clientes, vehículos, inspección, cotización, OT, notificaciones, dark mode.
3. En `RecepcionEdit.vue`: tabs `text-blue-600`→`primary-600`, focus/switch → azul (armoniza con FormSaveActions).
4. Migrar botones pizarra restantes → azul (sección 15) usando los alias para un swap gradual.

**P1 — Cohesión de componentes y contexto:**
1. Crear `AppButton.vue`, `AppTabs.vue`, `AppCard.vue`, `FieldInput.vue`; refactor de RecEdit/InspeccionEdit/CotizacionEdit/OrdenEdit para reutilizarlos (card `border+shadow-sm` como estándar).
2. Centralizar badges de estado (`getEstadoBadge` → `src/shared/utils/`) y su uso en listas.
3. `charts.js` → nueva paleta; unificar overlay de modales; cancelar único.
4. FOUC dark en `baseof.html`.

**P2 — Limpieza y cierre:**
1. Eliminar/retirar `tailwind.config.js` legacy (y comentar en CLAUDE.md que la paleta vive en `@theme`).
2. Borrar backups `RecepcionEditOld/Backup.vue` y páginas demo Flowbite (products/users/playground) tras confirmación.
3. Logo monocromático azul `#2563EB` (decisión de marca) y pasar `MdiIcon/@tabler/lucide` a una sola lib si se desea.
4. Ajustar sidebar (solo con autorización del usuario): `bg-brand-500`→`bg-sidebar #0F2747`.

---

## 19. Riesgos

- **Regresiones por cambio de token**: mitigar con **alias en `@theme`** (nada deja de renderizar) y rebuild + revisión manual de pantallas clave. Los tokens `primary` pizarra y `primary-blue` conviven un tiempo.
- **Sidebar**: cualquier cambio afecta navegación en desktop+móvil+colapso; por eso está fuera de la fase 1. Los alias de `brand` deben conservar `brand-550` y los `dark:` duplicados.
- **Flowbite**: sus componentes inyectan sus propios colores; no asumir que un token global los repinta — revisar navbar/dropdowns por separado.
- **Dark mode**: cada nuevo tono semántico necesita su par `dark:*`; vigilar contraste WCAG (mín 4.5:1).
- **Artefactos de build**: regenerar `app.css`/`app.bundle.js` siempre tras cambios; no editar a mano.
- **Ámbito no-UI**: duplicados en `settings.py` (REST_FRAMEWORK) y `cotizacion_origen` en ordenes son del backend; NO entran en esta auditoría aunque quedan registrados.

---

## 20. Conclusión

El sistema está **bien estructurado y con una semántica de estados sólida** (chips green/red/yellow/blue consistentes, dark mode real, inputs homogéneos, modales y toasts custom con buen patrón). El problema de identidad visual es **acotado y de "doble primario"**: tres azules (pizarra `#2B4352`, `primary-blue #2461bf`, blue-600 default) + sidebar pizarra + charts Flowbite, sin un sistema de tokens único.

La vía de resolución de menor riesgo es **una sola escala primaria azul (`#2563EB`) con alias de tokens transitorios**, sidebar azul marino `#0F2747` en una fase autorizada, semántica success/warning/danger y estandarización de cards/botones/cancelar. Con el plan P0/P1/P2 secuenciado, la nueva línea SaaS/B2B se implementa de forma incremental, verificable build a build y sin tocar el sidebar hasta que el usuario lo autorice.

---

## Anexo — Comandos de verificación

```bash
# Build del bundle frontend (regenera static/app.bundle.js + static/app.css)
cd /home/garm/Escritorio/gonmotor/gonmotor-ui
NODE_ENV=production npx webpack --mode=production --config ./webpack.config.js --stats=errors-only

# Análisis de frecuencia de clases de color (reproducible)
VUE=$(find src -name '*.vue' -type f | tr '\n' ' '); FILES="$VUE $(find layouts content -name '*.html' -type f | tr '\n' ' ')"
grep -rhoE 'bg-[a-zA-Z0-9]+(-[0-9]+)?' $FILES | sort | uniq -c | sort -rn | head -40
```