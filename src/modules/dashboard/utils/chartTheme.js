import { BRAND } from '../../../shared/config/branding';

/**
 * Paleta y tokens tipográficos compartidos por las gráficas del dashboard.
 * Se lee el modo oscuro en cada render porque el usuario puede cambiarlo
 * en caliente (el tema se aplica con la clase `dark` en <html>).
 */
export const PALETA_GRAFICAS = [
  BRAND.brand500,
  BRAND.accent500,
  BRAND.primary500,
  '#F59E0B',
  '#10B981',
  '#8B5CF6',
  '#64748B',
];

export function temaGrafica() {
  const oscuro = document.documentElement.classList.contains('dark');

  return {
    oscuro,
    foreColor: oscuro ? '#9CA3AF' : '#6B7280',
    gridColor: oscuro ? '#374151' : '#F3F4F6',
    etiquetaColor: oscuro ? '#D1D5DB' : '#374151',
    fontFamily: 'Inter, sans-serif',
  };
}
