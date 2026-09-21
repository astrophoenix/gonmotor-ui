import { sanitizeBusqueda } from '../utils/sanitize';

/**
 * Directiva v-sanitize-search.
 *
 * Sanea el valor de un <input type="search"> mientras se escribe y sincroniza
 * el DOM de inmediato. Esto evita el bug de "carácter fantasma": al teclear un
 * carácter no permitido, el modelo no cambia (el valor saneado es igual al
 * anterior), Vue no vuelve a renderizar y el carácter inválido queda visible
 * hasta la siguiente pulsación, momento en que parece borrarse "el anterior".
 *
 * Uso:
 *   <input v-model="search" v-sanitize-search type="search" maxlength="100">
 *   <input v-model="search" v-sanitize-search="80" type="search" maxlength="80">
 *
 * Conserva la posición del cursor (caret) al eliminar caracteres inválidos.
 */
function sanear(el, max) {
  const raw = el.value;
  const clean = sanitizeBusqueda(raw, max);
  if (raw === clean) return;

  const caret = el.selectionStart ?? raw.length;
  const limpioAntesDelCaret = sanitizeBusqueda(raw.slice(0, caret), max);

  el.value = clean;
  const posicion = limpioAntesDelCaret.length;
  if (typeof el.setSelectionRange === 'function') {
    try {
      el.setSelectionRange(posicion, posicion);
    } catch {
      // Algunos navegadores no exponen la selección en type="search".
    }
  }

  // v-model escucha el evento input en el propio elemento; lo reemitimos para
  // que el modelo se actualice con el valor ya saneado.
  el.dispatchEvent(new Event('input'));
}

export const vSanitizeSearch = {
  mounted(el, binding) {
    const max = Number(binding.value) > 0 ? Number(binding.value) : 100;
    el._sanitizeSearchHandler = () => sanear(el, max);
    el.addEventListener('input', el._sanitizeSearchHandler);
  },
  unmounted(el) {
    if (el._sanitizeSearchHandler) {
      el.removeEventListener('input', el._sanitizeSearchHandler);
      delete el._sanitizeSearchHandler;
    }
  },
};
