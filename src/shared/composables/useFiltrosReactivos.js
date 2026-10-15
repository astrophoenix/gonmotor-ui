import { onBeforeUnmount, watch } from 'vue';
import { SEARCH_DEBOUNCE_MS, isSearchable } from '../utils/search';

/**
 * Filtros de listado que se aplican al cambiar, sin botón "Buscar".
 *
 * - Selects/checkboxes (`filtros`) y texto libre (`busqueda`) se aplican tras
 *   una pausa corta (`esperaMs`): cambiar varios filtros seguidos produce una
 *   sola petición. La petición anterior la cancela el composable del listado
 *   (`createLatestRequest`), así que una respuesta lenta no pisa a la nueva.
 * - El texto libre solo se aplica vacío o con `MIN_SEARCH_LENGTH` caracteres.
 * - Las fechas de Flowbite se escriben en el DOM sin eventos de Vue: se
 *   escuchan `changeDate` (al elegir en el calendario) y `change` (al salir
 *   del campo tras escribirla a mano).
 * - Si el estado (`firma`) no cambió desde la última aplicación, no recarga.
 *
 * @param {object} opciones
 * @param {import('vue').WatchSource} opciones.filtros - Borrador del panel; se observa en profundidad.
 * @param {import('vue').Ref<string>} [opciones.busqueda] - Texto libre del buscador.
 * @param {import('vue').Ref<HTMLInputElement|null>[]} [opciones.camposFecha] - Inputs con datepicker de Flowbite.
 * @param {() => unknown} opciones.firma - Estado completo de los filtros (serializable).
 * @param {() => void} opciones.aplicar - Pasa el borrador a los filtros aplicados y recarga la página 1.
 * @param {number} [opciones.esperaMs]
 * @returns {{ aplicarYa: () => void, marcarAplicado: () => void }}
 */
export function useFiltrosReactivos({
  filtros,
  busqueda = null,
  camposFecha = [],
  firma,
  aplicar,
  esperaMs = SEARCH_DEBOUNCE_MS,
}) {
  let temporizador = null;
  const firmaActual = () => JSON.stringify(firma());
  let ultimaFirma = firmaActual();

  /** Aplica ya (p. ej. Enter en el buscador) si algo cambió. */
  function aplicarYa() {
    clearTimeout(temporizador);
    if (busqueda && !isSearchable(busqueda.value)) return;
    const actual = firmaActual();
    if (actual === ultimaFirma) return;
    ultimaFirma = actual;
    aplicar();
  }

  function programar() {
    clearTimeout(temporizador);
    temporizador = setTimeout(aplicarYa, esperaMs);
  }

  /** Da por aplicado el estado actual: tras un "Limpiar" que ya recargó. */
  function marcarAplicado() {
    clearTimeout(temporizador);
    ultimaFirma = firmaActual();
  }

  watch(filtros, programar, { deep: true });
  if (busqueda) watch(busqueda, programar);

  const eventosFecha = ['changeDate', 'change'];
  camposFecha.forEach((campo) => {
    watch(campo, (elemento, anterior) => {
      eventosFecha.forEach((evento) => {
        anterior?.removeEventListener(evento, programar);
        elemento?.addEventListener(evento, programar);
      });
    }, { immediate: true, flush: 'post' });
  });

  onBeforeUnmount(() => {
    clearTimeout(temporizador);
    camposFecha.forEach((campo) => {
      eventosFecha.forEach((evento) => campo.value?.removeEventListener(evento, programar));
    });
  });

  return { aplicarYa, marcarAplicado };
}
