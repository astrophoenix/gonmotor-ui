# Especificación de marca — GonMotor UI

Documento de trabajo para el rediseño de logo y paleta. Recoge los tokens
vigentes, dónde se usan, qué assets hay que entregar y qué ficheros hay que
tocar al cambiar la marca.

> **Estado:** paleta **aplicada** en código (`style.css` + `branding.js`). Falta
> únicamente recibir los **assets de logo/iconos** (§5). §2 se conserva solo como
> referencia histórica.

---

## 1. Fuentes de verdad de la paleta

Hay **dos** ficheros que deben mantenerse en sincronía:

| Uso | Fichero | Qué contiene |
|---|---|---|
| Estilos generales (Tailwind) | `src/style.css` → bloque `@theme` | tokens `--color-*` |
| JS (ECharts, FullCalendar) | `src/shared/config/branding.js` | hex en `BRAND` |

El resto del sistema **no** debe tener hex de marca hardcodeados: si aparece
uno nuevo, muévelo a una de estas dos fuentes.

---

## 2. Paleta anterior (referencia histórica)

> Sustituida por la paleta final de §3. Se conserva solo para entender el
> origen de los tokens.

### Marca
| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#f2f5f7` | fondos suaves |
| `brand-100` | `#e1e7eb` | bordes/hover suave |
| `brand-400` | `#3d5a6b` | hover sidebar |
| `brand-500` | `#2B4352` | **base** (sidebar, navegación) |
| `brand-550` | `#274f63` | intermedio |
| `brand-600` | `#213440` | hover |
| `brand-700` | `#192630` | activo / is-current |
| `accent-50` | `#fef2f2` | fondos suaves |
| `accent-100` | `#fee2e2` | bordes suave |
| `accent-400` | `#ef4444` | variante clara |
| `accent-500` | `#D9011B` | **base** (alertas/acento, "motor") |
| `accent-600` | `#b50116` | hover |

### Login (rediseño)
| Token | Hex |
|---|---|
| `brand-navy` | `#111C2E` |
| `brand-ink` | `#1E293B` |
| `brand-ink-soft` | `#475569` |
| `brand-line` | `#CBD5E1` |
| `brand-surface` | `#F8FAFC` |
| `brand-muted` | `#8493A8` |
| `brand-subtitle` | `#B6C2D4` |

### Auxiliares / legacy
| Token | Hex | Nota |
|---|---|---|
| `primary-*` | azul `#2563EB` | legacy Flowbite, remapeado a navy (`brand-*`) |
| `primary-blue-*` | alias del anterior | temporal |

### Tipografía
- Cuerpo: **Inter** (`--font-sans` / `--font-body`).
- Marca / login: **Manrope** (`--font-brand`), alojada en `src/fonts/`.

---

## 3. Paleta final

### Marca — navy `brand`
| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#F3F6FA` | fondos suaves |
| `brand-100` | `#E3E9F1` | hover claro, bordes suaves |
| `brand-300` | `#94A6BF` | texto secundario sobre oscuro |
| `brand-500` | `#3A4F6E` | elementos intermedios |
| `brand-700` | `#1B2A44` | hover/activo en sidebar |
| `brand-800` | `#162238` | superficies del sidebar |
| `brand-900` | `#111C2E` | sidebar, login, botón primario |

### Acento — Rojo Gonmotor `accent` (único rojo de marca)
Un solo rojo en dos tonos según el fondo, como el isotipo (versión clara con
`#C8102E`, versión negativa con `#FF4D63`). Ningún hex sirve en los dos fondos:
`#C8102E` da 5,9:1 sobre blanco pero 2,9:1 sobre navy; `#FF4D63` da 5,3:1 sobre
navy pero 3,2:1 sobre blanco.

| Token | Hex | Uso |
|---|---|---|
| `accent-400` | `#FF4D63` | el rojo sobre navy/oscuro (sidebar, panel del login, `dark:`); nunca sobre blanco |
| `accent-500` | `#C8102E` | el rojo sobre fondos claros: logo claro, detalles, botón del login |
| `accent-600` | `#B30D25` | hover |
| `accent-700` | `#8F0A1E` | activo/presionado |

### Neutros y semánticos
- Neutros (alias sobre `slate`): `ink` slate-800, `ink-soft` slate-600,
  `line` slate-300, `surface` slate-50, `muted` `#8493A8`.
- Semánticos: success `#16A34A`, warning `#D97706`, info `#2563EB`,
  danger `#DC2626`.

**Regla rojo/peligro:** botón primario en navy (`brand-900`); el rojo de marca
(`accent-500`) solo en logo, indicador activo del sidebar y detalles.

> Nota: la escala incluye 50/100/300/500/700/800/900 (sin 200/400/600). Los
> usos de `brand-400`/`brand-600` ya se remapearon (400→300/500, 600→700) en la
> migración aplicada.

---

## 4. Qué tocar al cambiar la paleta (checklist)

1. `src/style.css` → bloque `@theme` (tokens `--color-brand-*`, `--color-accent-*`, login).
2. `src/shared/config/branding.js` → objeto `BRAND` (mismos hex).
3. `layouts/partials/favicons.html` → `color` del `mask-icon` y `theme-color`.
4. `static/site.webmanifest` → `theme_color`.
5. `static/images/mechanic_logo_icon.svg` → `fill` (hoy `#2B4352` hardcodeado).
6. `tailwind.config.js` → paleta duplicada **legacy**; Tailwind 4 usa `style.css`,
   este archivo probablemente ya no se usa. Revisar antes de borrar.
7. Migrar usos restantes de `gray-*` / `primary-*` a `brand-*` / `accent-*`.

> Nota: las gráficas y el calendario ya leen de `branding.js`, así que ese punto
> se resuelve solo actualizando ese fichero.

---

## 5. Assets de marca a entregar

| # | Asset | Tamaño / formato | Dónde se usa |
|---|---|---|---|
| 1 | **Isotipo** (icono) | SVG, cuadrado | sidebar, login, base de favicons |
| 2 | **Lockup horizontal** `logo.svg` | SVG, ~32px de alto | navbar y footer (¡hoy **falta**, refs rotas!) |
| 3 | `favicon.ico` | ICO multi-res 16+32+48 | pestaña |
| 4 | `favicon-16x16.png` | 16×16 PNG-32 | pestaña |
| 5 | `favicon-32x32.png` | 32×32 PNG-32 | pestaña |
| 6 | `apple-touch-icon.png` | 180×180 PNG **sin alfa** | iOS |
| 7 | `android-chrome-192x192.png` | 192×192 PNG-32 | PWA |
| 8 | `android-chrome-512x512.png` | 512×512 PNG-32 | PWA |
| 9 | `safari-pinned-tab.svg` | SVG **monocromo** (1 color, sin fondo) | Safari |
| 10 | `og-image.png` | 1200×630 PNG | redes (referenciado en `config.yml`, ¡hoy **falta**!) |

**No hace falta** regenerar (restos del template, sin referencias):
`favicon-96x96.png`, `manifest.json`, `android-icon-*`, `apple-icon-*`,
`ms-icon-*`, `mstile-150x150.png`.

Ubicación: `static/images/` para logo/isotipo y og-image; raíz de `static/` para
favicons. **Nunca** editar `public/` ni `_gh_pages/` (son salida de build).

---

## 6. Dónde aparece el logo (tamaños reales)

| Contexto | Fichero | Render | Fondo | Wordmark |
|---|---|---|---|---|
| Sidebar | `layouts/partials/sidebar.html:22` | isotipo pistón negativo `h-10` (40px) | navy `#111C2E` | texto `gon` blanco + `motor` `accent-400` (Manrope, igual que login) |
| Login | `src/modules/auth/components/LoginForm.vue:106` | caja blanca 44px, `p-1.5` → **~32px visibles** | navy `#111C2E` | texto `gon` blanco + `motor` coral |
| Navbar/footer | `navbar-main.html:6`, `navbar-stacked-layout.html:6`, `footer-main.html:6` | `h-8` (32px) | claro | — |

> El logotipo textual **no es imagen**: son `<span>` de HTML. Si el nuevo logo
> trae wordmark, decidir entre mantenerlo como texto (respeta Manrope en login)
> o sustituirlo por el lockup en imagen.

---

## 7. Reglas de diseño

- **Contraste dual:** el isotipo debe leerse sobre navy `#111C2E` (sidebar) y
  sobre blanco dentro de la caja del login. Evitar detalles finos y degradados.
- **Debe funcionar como silueta monocroma** para favicon de 16px y
  `safari-pinned-tab.svg`.
- **Margen interno ~10–15%:** Android recorta el icono en círculo.
- Entregar el isotipo con relleno editable (`currentColor` o color de marca) —
  el actual tiene `fill="#2B4352"` fijo y no se recolorea solo.

---

## 8. Checklist de cierre

- [x] Valores definitivos de paleta (§3).
- [x] `style.css` y `branding.js` actualizados y en sincronía.
- [ ] Assets §5 entregados y colocados en `static/`.
- [ ] `mechanic_logo_icon.svg` reemplazado (color editable).
- [ ] `logo.svg` y `og-image.png` creados (referencias hoy rotas).
- [ ] Favicons regenerados con el nuevo isotipo.
- [x] `favicons.html` + `site.webmanifest` con el nuevo `theme_color`/nombre.
- [x] Sin hex de marca hardcodeados fuera de `style.css` / `branding.js`.
- [ ] Migración `gray-*`/`primary-*` → `brand-*`/`accent-*` completada (los
  `primary-*` ya son navy; quedan mezclas de `gray-*` en los módulos).
