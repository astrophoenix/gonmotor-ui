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
 * Valores actuales: paleta de marca (navy + rojo automotriz).
 */
export const BRAND = {
  brand50: '#F3F6FA',
  brand100: '#E3E9F1',
  brand200: '#C5D0DF',
  brand300: '#94A6BF',
  brand400: '#5E7391',
  brand500: '#3A4F6E',
  brand600: '#26395A',
  brand700: '#1B2A44',
  brand800: '#162238',
  brand900: '#111C2E',
  brand950: '#0B1220',

  accent50: '#FEF2F3',
  accent100: '#FDE1E4',
  accent400: '#FF4D63',
  accent500: '#C8102E',
  accent600: '#B30D25',
  accent700: '#8F0A1E',

  // Neutros (alias de slate)
  ink: '#1E293B',
  inkSoft: '#475569',
  line: '#CBD5E1',
  surface: '#F8FAFC',
  muted: '#8493A8',

  // Rediseño de login (aliases de la paleta)
  navy: '#111C2E',
  red: '#C8102E',
  redHover: '#B30D25',
  coral: '#FF4D63',

  // Legacy Flowbite (azul) — remapeado a navy en la migración
  primary500: '#3A4F6E',

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
