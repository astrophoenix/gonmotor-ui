/**
 * Utilidades compartidas para búsquedas de listados.
 *
 * Objetivo: reducir carga en el backend y evitar respuestas obsoletas.
 * - Debounce: no se llama al API en cada tecleo, solo al pausar.
 * - Longitud mínima: evita consultas `icontains` amplísimas con 1-2 caracteres.
 * - "Última petición gana": aborta la anterior y descarta respuestas viejas.
 */

export const SEARCH_DEBOUNCE_MS = 300;

export const MIN_SEARCH_LENGTH = 3;

/**
 * ¿Vale la pena disparar la búsqueda? Vacío = listar todo; menos de 3
 * caracteres = esperar (el índice GIN trigram del backend exige ≥3).
 */
export function isSearchable(term) {
  const value = (term ?? '').trim();
  return value.length === 0 || value.length >= MIN_SEARCH_LENGTH;
}

/**
 * Controlador de peticiones de listado con semántica "última gana".
 *
 * @returns {{
 *   begin: () => { signal: AbortSignal, id: number },
 *   isCurrent: (id: number) => boolean,
 *   cancel: () => void
 * }}
 */
export function createLatestRequest() {
  let controller = null;
  let latestId = 0;

  return {
    begin() {
      if (controller) controller.abort();
      controller = new AbortController();
      const id = ++latestId;
      return { signal: controller.signal, id };
    },
    isCurrent(id) {
      return id === latestId;
    },
    cancel() {
      if (controller) controller.abort();
      controller = null;
      latestId += 1;
    },
  };
}

export function isAbortError(error) {
  return error?.name === 'AbortError';
}
