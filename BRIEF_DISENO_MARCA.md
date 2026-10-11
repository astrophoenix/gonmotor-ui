# Brief de diseño — Identidad de marca GonMotor

Documento **autocontenido** para el diseñador o herramienta de IA. Describe cómo
deben entregarse el isotipo, el logotipo y los iconos para encajar sin fricción
en la interfaz existente.

---

## 1. Contexto

**GonMotor** es un sistema de gestión para talleres mecánicos (clientes,
vehículos, recepciones, cotizaciones, órdenes, inventario, citas). La interfaz
es un panel de administración en español, con tema claro y oscuro.

El logotipo actual es el texto `gon` + `motor` (dos colores) y un isotipo
provisional. Se está renovando la identidad: **paleta ya definida** (ver §4) y
**logo por definir** (ver §5); falta asegurar que las piezas encajen en la
tipografía, fondos y tamaños reales del producto.

---

## 2. Objetivo

Producir un **juego de assets de marca listo para producción**, en las
dimensiones y formatos exactos que usa el sistema, funcionando en:

- Fondos claros (tarjetas blancas) y **navy `#111C2E`** (sidebar y login).
- Fondos oscuros (**navy `#111C2E`**) y modo oscuro del panel.
- Reducción extrema: **16 px** (favicon de pestaña), monocromo.

---

## 3. Dónde se usa cada pieza y a qué tamaño

| Uso | Pieza | Tamaño de render | Fondo |
|---|---|---|---|
| Sidebar (menú lateral) | **Isotipo** | **40 px de alto**, ancho libre | navy `#111C2E` |
| Pantalla de login | **Isotipo** | ~**32 px** dentro de caja blanca de 44×44 px | navy `#111C2E` |
| Barra superior y pie | **Lockup horizontal** | **32 px de alto**, ancho libre | claro |
| Pestaña del navegador | Favicon | 16 / 32 / 48 px | variable |
| iOS (inicio) | Apple touch icon | 180×180 px | relleno sólido |
| Android / PWA | Iconos de app | 192×192 y 512×512 px | relleno sólido |
| Vista previa social | OG image | 1200×630 px | a diseño |

> En la sidebar y el login el nombre `gon`+`motor` **no es imagen**: se escribe
> como texto. Por eso hay que entregar (a) el **isotipo** suelto y (b) el
> **lockup horizontal** de respaldo.

---

## 4. Paleta (final)

### Marca — navy `brand`
| Token | Hex | Uso |
|---|---|---|
| `brand-50` | `#F3F6FA` | fondos suaves, engranaje sobre oscuro |
| `brand-100` | `#E3E9F1` | hover claro, bordes suaves |
| `brand-300` | `#94A6BF` | texto secundario sobre oscuro |
| `brand-500` | `#3A4F6E` | elementos intermedios |
| `brand-700` | `#1B2A44` | hover/activo en sidebar |
| `brand-800` | `#162238` | superficies del sidebar |
| `brand-900` | `#111C2E` | **sidebar, login, botón primario** |

### Acento — rojo `accent`
| Token | Hex | Uso |
|---|---|---|
| `accent-400` | `#FF4D63` | acento sobre fondos oscuros |
| `accent-500` | `#C8102E` | **logo, indicador activo, acentos** |
| `accent-600` | `#B30D25` | hover |
| `accent-700` | `#8F0A1E` | activo/presionado |

### Neutros (alias sobre `slate`)
| Token | Valor | Uso |
|---|---|---|
| `ink` | slate-800 | texto principal |
| `ink-soft` | slate-600 | texto secundario |
| `line` | slate-300 | bordes |
| `surface` | slate-50 | fondos |
| `muted` | `#8493A8` | texto apagado |

### Semánticos
| Token | Hex |
|---|---|
| success | `#16A34A` |
| warning | `#D97706` |
| info | `#2563EB` |
| danger | `#DC2626` |

### Fondo de referencia obligatorio
- Navy de marca (header del sidebar y panel de login): `#111C2E`.

**Regla anti-conflicto rojo / peligro:** el **botón primario va en navy
(`brand-900`)**; el rojo de marca (`accent-500`) se reserva para **logo,
indicador activo del sidebar y detalles**. Así los botones de eliminar y los
errores (`danger`) no compiten con la marca.

**Contraste (AA):**
- texto/icono `brand-900` y `brand-500` sobre blanco.
- texto/icono blanco y `brand-300` sobre navy `#111C2E` (sidebar/login).
- texto blanco sobre `accent-500`.
- Si el logo va sobre fondo de color, entregar **versión en negativo**.

---

## 5. Logo (definir piezas)

Describir brevemente las piezas ya definidas para documentar el juego:

- **Concepto / símbolo:** ______________________
- **Wordmark:** ¿se conserva como texto `gon`+`motor` o pasa a imagen? ______
- **Proporción del isotipo:** cuadrado (obligatorio para iconos).

---

## 6. Entregables y especificaciones técnicas

### 6.1 Isotipo (icono cuadrado)
- **Formato:** SVG.
- `viewBox` cuadrado (p. ej. `0 0 512 512`), **sin fondo**, sin bordes.
- Relleno con **color editable** (no incrustar degradados ni sombras).
- **Área de respeto:** margen interno de **~10–15 %** del lado (evita que
  Android lo recorte en círculo).
- **Tamaño mínimo legible:** 16 px. Diseñar pensando en silueta.
- Versiones: **color**, **monocromo negro** y **monocromo blanco** (negativo).

### 6.2 Lockup horizontal (`logo.svg`)
- **Formato:** SVG, alto de diseño ~32 px (legible entre 24 y 40 px).
- No incluir fondo; respetar el área de respeto.

### 6.3 Favicons e iconos de app
| Archivo | Tamaño | Formato | Notas |
|---|---|---|---|
| `favicon.ico` | **16 + 32 + 48 en un solo .ico** | ICO multi-resolución | no un único 16×16 |
| `favicon-16x16.png` | 16×16 | PNG 32-bit (RGBA) | silueta, máximo contraste |
| `favicon-32x32.png` | 32×32 | PNG 32-bit (RGBA) | tamaño más visto |
| `apple-touch-icon.png` | 180×180 | PNG **sin transparencia** | fondo sólido; iOS añade negro si hay alfa |
| `android-chrome-192x192.png` | 192×192 | PNG 32-bit | icono PWA |
| `android-chrome-512x512.png` | 512×512 | PNG 32-bit | icono PWA / splash |
| `safari-pinned-tab.svg` | vectorial | SVG **monocromo** | **1 solo color plano, sin fondo**; el sistema lo tiñe |

### 6.4 Imagen social
- `og-image.png` — **1200×630 px**, con el lockup sobre fondo de marca.

---

## 7. Reglas de diseño (imprescindible)

**Sí:**
- Formas gruesas, alto contraste, legible a 16 px.
- Isotipo que funcione como **silueta monocroma**.
- Fondo de app sólido en iconos (que no dependan de transparencia).

**No:**
- Trazos finos, degradados, texturas o sombras en el isotipo.
- Texto dentro del isotipo (ilegible a tamaño pequeño).
- Detalles que se pierdan al recortar en círculo.
- Depender del color únicamente para distinguir la forma.

---

## 8. Checklist de aceptación

- [ ] Isotipo SVG cuadrado, sin fondo, relleno editable, margen 10–15 %.
- [ ] Versiones color, blanco/negro.
- [ ] Lockup horizontal SVG (~32 px alto).
- [ ] `.ico` multi-resolución (16/32/48).
- [ ] PNGs 16, 32, 180 (opaca), 192 y 512.
- [ ] `safari-pinned-tab.svg` monocromo.
- [ ] `og-image.png` 1200×630.
- [ ] Contraste AA en fondos blanco, navy `#111C2E` y modo oscuro.
- [ ] Nombres de archivo exactos (ver §6).
