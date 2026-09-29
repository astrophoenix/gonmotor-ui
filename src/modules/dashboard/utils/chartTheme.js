/**
 * Paleta y tokens tipográficos compartidos por las gráficas del dashboard.
 * Se lee el modo oscuro en cada render porque el usuario puede cambiarlo
 * en caliente (el tema se aplica con la clase `dark` en <html>).
 */
export const PALETA_GRAFICAS = [
  '#2B4352', // brand-500
  '#D9011B', // accent-500
  '#2563EB', // primary-500
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
