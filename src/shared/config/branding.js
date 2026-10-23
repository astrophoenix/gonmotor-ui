/**
 * Fuente única de la marca para el código JavaScript.
 *
 * Los tokens visuales canónicos viven en `src/style.css` (bloque `@theme`).
 * Este archivo existe porque las librerías basadas en canvas/SVG (ECharts,
 * FullCalendar) no pueden leer variables CSS de Tailwind directamente.
 *
 * ⚠️  Al cambiar la paleta de marca hay que actualizar DOS sitios en sincronía:
 *   1. `src/style.css`  → tokens `--color-*` (uso general en Tailwind)
 *   2. `src/shared/config/branding.js` → estos hex (uso en JS)
 *
 * Valores actuales: navy profundo de estructura, azul de acción, neutros fríos
 * y el Rojo Gonmotor.
 */
export const BRAND = {
  // Navy profundo: estructura (sidebar, panel del login, títulos).
  brand50: '#F2F5FA',
  brand100: '#E2E9F4',
  brand200: '#C5D2E6',
  brand300: '#97ABCB',
  brand400: '#6680A8',
  brand500: '#445F8C',
  brand600: '#2F4A78',
  brand700: '#1F3A68',
  brand800: '#172C52',
  brand900: '#0F2140',
  brand950: '#0A1628',

  // Azul de acción (primary-*): botones primarios, enlaces, foco y series de gráficos.
  primary50: '#EFF4FC',
  primary100: '#DDE7F8',
  primary200: '#BCD0F1',
  primary300: '#8FB0E6',
  primary400: '#6290D8',
  primary500: '#3D72C8',
  primary600: '#2C5BAE',
  primary700: '#244A8F',
  primary800: '#1E3C73',

  // Rojo Gonmotor: un solo rojo de marca. `accent500` sobre fondos claros;
  // `accent400` es su versión para fondos navy/oscuros (el #C8102E no se lee
  // sobre navy). Nunca `accent400` sobre blanco.
  accent50: '#FEF2F3',
  accent100: '#FDE1E4',
  accent400: '#FF4D63',
  accent500: '#C8102E',
  accent600: '#B30D25',
  accent700: '#8F0A1E',

  // Neutros fríos (gray-* de style.css)
  ink: '#222C3F',
  inkSoft: '#4D5970',
  line: '#C5CFDC',
  surface: '#F5F7FA',
  muted: '#97A3B6',

  navy: '#0F2140',

  // Semánticos
  info: '#2563EB',
  success: '#16A34A',
  warning: '#D97706',
  danger: '#DC2626',

  grayWorkshop: '#C6CCD4',
};

/** Rutas de assets de marca, para no dispersar strings por el código. */
export const BRAND_ASSETS = {
  icon: '/images/mechanic_logo_icon.svg',
  logo: '/images/logo.svg',
  favicon: '/favicon.ico',
};
