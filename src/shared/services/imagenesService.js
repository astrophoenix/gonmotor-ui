/**
 * Límites y perfiles de imagen publicados por el backend
 * (`GET /api/core/limites-imagenes/`).
 *
 * El backend es la fuente de verdad: los valores de `POR_DEFECTO` solo se usan
 * hasta que llega la respuesta (o si falla), para no bloquear la subida.
 */
import { ref } from 'vue';
import { request } from './httpClient';

const ENDPOINT = '/api/core/limites-imagenes/';
const MB = 1024 * 1024;

const POR_DEFECTO = {
  formatos_aceptados: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  perfiles: {
    evidencia: { lado_mayor: 1920, calidad: 0.8, sin_perdida: false, max_bytes: 15 * MB },
    vehiculo: { lado_mayor: 1600, calidad: 0.8, sin_perdida: false, max_bytes: 15 * MB },
    repuesto: { lado_mayor: 1200, calidad: 0.8, sin_perdida: false, max_bytes: 15 * MB },
    avatar: { lado_mayor: 512, calidad: 0.8, sin_perdida: false, max_bytes: 15 * MB },
    logo: { lado_mayor: 1024, calidad: 1, sin_perdida: true, max_bytes: 15 * MB },
  },
};

export const limitesImagenes = ref(POR_DEFECTO);

let pendiente = null;

/** Carga los límites una sola vez por página. */
export function cargarLimitesImagenes() {
  if (!pendiente) {
    pendiente = request(ENDPOINT)
      .then((datos) => {
        limitesImagenes.value = datos;
      })
      .catch(() => {
        // Sin sesión o sin red: se siguen usando los valores por defecto y
        // el backend valida igual al subir.
      });
  }
  return pendiente;
}

export function perfilImagen(nombre) {
  const perfiles = limitesImagenes.value.perfiles || {};
  return perfiles[nombre] || perfiles.evidencia || POR_DEFECTO.perfiles.evidencia;
}
